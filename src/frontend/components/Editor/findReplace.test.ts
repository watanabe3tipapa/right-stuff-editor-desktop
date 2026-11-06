import { describe, expect, it } from "vitest";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type LexicalEditor,
  type ParagraphNode,
} from "lexical";
import { $createLinkNode, LinkNode } from "@lexical/link";
import {
  $collectFindMatches,
  replaceAllFindMatches,
  replaceFindMatch,
} from "./findReplace";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function createTestEditor(): LexicalEditor {
  return createEditor({
    namespace: "find-replace-test",
    nodes: [LinkNode],
    onError: (error) => {
      throw error;
    },
  });
}

function setParagraph(
  editor: LexicalEditor,
  build: (paragraph: ParagraphNode) => void,
) {
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      build(paragraph);
      $getRoot().append(paragraph);
    },
    { discrete: true },
  );
}

function readMatches(
  editor: LexicalEditor,
  query: string,
  caseSensitive = false,
) {
  return editor.getEditorState().read(() =>
    $collectFindMatches(query, caseSensitive),
  );
}

function readText(editor: LexicalEditor) {
  return editor.getEditorState().read(() => $getRoot().getTextContent());
}

describe("find and replace", () => {
  it("finds a match inside a single text node", () => {
    const editor = createTestEditor();
    setParagraph(editor, (paragraph) => {
      paragraph.append($createTextNode("Hello world"));
    });

    const matches = readMatches(editor, "world");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.segments).toHaveLength(1);
    expect(matches[0]?.segments[0]).toMatchObject({ start: 6, end: 11 });
  });

  it("matches across adjacent formatted text nodes", () => {
    const editor = createTestEditor();
    setParagraph(editor, (paragraph) => {
      paragraph.append(
        $createTextNode("Hello "),
        $createTextNode("world").setFormat("bold"),
        $createTextNode("!"),
      );
    });

    const matches = readMatches(editor, "Hello world");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.segments).toHaveLength(2);
    expect(matches[0]?.segments[0]).toMatchObject({ start: 0, end: 6 });
    expect(matches[0]?.segments[1]).toMatchObject({ start: 0, end: 5 });
  });

  it("matches text inside an inline link", () => {
    const editor = createTestEditor();
    setParagraph(editor, (paragraph) => {
      paragraph.append($createTextNode("See "));
      const link = $createLinkNode("https://example.com");
      link.append($createTextNode("the docs"));
      paragraph.append(link);
      paragraph.append($createTextNode(" now"));
    });

    const matches = readMatches(editor, "See the docs now");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.segments).toHaveLength(3);
  });

  it("does not match across block or line-break boundaries", () => {
    const editor = createTestEditor();
    editor.update(
      () => {
        const first = $createParagraphNode();
        first.append($createTextNode("foo"));
        const second = $createParagraphNode();
        second.append($createTextNode("bar"));
        $getRoot().append(first, second);
      },
      { discrete: true },
    );

    expect(readMatches(editor, "foobar")).toHaveLength(0);

    editor.update(
      () => {
        $getRoot().clear();
        const paragraph = $createParagraphNode();
        paragraph.append(
          $createTextNode("foo"),
          $createLineBreakNode(),
          $createTextNode("bar"),
        );
        $getRoot().append(paragraph);
      },
      { discrete: true },
    );

    expect(readMatches(editor, "foobar")).toHaveLength(0);
  });

  it("respects case sensitivity", () => {
    const editor = createTestEditor();
    setParagraph(editor, (paragraph) => {
      paragraph.append($createTextNode("Hello HELLO hello"));
    });

    expect(readMatches(editor, "hello", false)).toHaveLength(3);
    expect(readMatches(editor, "hello", true)).toHaveLength(1);
  });

  it("replaces a match that spans multiple text nodes", async () => {
    const editor = createTestEditor();
    setParagraph(editor, (paragraph) => {
      paragraph.append(
        $createTextNode("Hello "),
        $createTextNode("world").setFormat("bold"),
      );
    });

    const match = readMatches(editor, "Hello world")[0];
    expect(match).toBeDefined();
    replaceFindMatch(editor, match!, "Hi");
    await flush();

    expect(readText(editor)).toBe("Hi");
  });

  it("replaces all cross-node matches in reverse order", async () => {
    const editor = createTestEditor();
    setParagraph(editor, (paragraph) => {
      paragraph.append(
        $createTextNode("alpha "),
        $createTextNode("beta").setFormat("bold"),
        $createTextNode(" gamma "),
        $createTextNode("beta").setFormat("italic"),
        $createTextNode(" omega"),
      );
    });

    expect(readMatches(editor, "alpha beta")).toHaveLength(1);
    replaceAllFindMatches(editor, "beta", false, "B");
    await flush();

    expect(readText(editor)).toBe("alpha B gamma B omega");
    expect(readMatches(editor, "beta")).toHaveLength(0);
  });

  it("replaces all matches within one text node without shifting offsets", async () => {
    const editor = createTestEditor();
    setParagraph(editor, (paragraph) => {
      paragraph.append($createTextNode("foo foo foo"));
    });

    replaceAllFindMatches(editor, "foo", false, "bar");
    await flush();

    expect(readText(editor)).toBe("bar bar bar");
  });
});
