import { describe, expect, it } from "vitest";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type LexicalEditor,
} from "lexical";
import { $isHeadingNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import {
  $createListItemNode,
  $createListNode,
  ListNode,
  ListItemNode,
  registerList,
} from "@lexical/list";
import { moveBlock, setBlockType, toggleList } from "./blockOperations";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function createTestEditor(): LexicalEditor {
  const editor = createEditor({
    namespace: "block-operations-test",
    nodes: [HeadingNode, QuoteNode, CodeNode, CodeHighlightNode, ListNode, ListItemNode],
    onError: (error) => {
      throw error;
    },
  });
  registerList(editor);
  return editor;
}

function appendParagraph(editor: LexicalEditor, text: string) {
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      const textNode = $createTextNode(text);
      paragraph.append(textNode);
      $getRoot().append(paragraph);
      textNode.select(0, 0);
    },
    { discrete: true },
  );
}

function firstBlock(editor: LexicalEditor) {
  return editor.getEditorState().read(() => $getRoot().getFirstChild());
}

describe("block operations", () => {
  it("converts a paragraph to a heading", async () => {
    const editor = createTestEditor();
    appendParagraph(editor, "hello");

    setBlockType(editor, "h2");
    await flush();

    const block = firstBlock(editor);
    expect(block?.getType()).toBe("heading");
    expect(
      editor.getEditorState().read(() => {
        const node = $getRoot().getFirstChild();
        return $isHeadingNode(node) ? node.getTag() : null;
      }),
    ).toBe("h2");
  });

  it("removes a list before converting to a quote", async () => {
    const editor = createTestEditor();
    editor.update(
      () => {
        const list = $createListNode("bullet");
        const item = $createListItemNode();
        const text = $createTextNode("item");
        item.append(text);
        list.append(item);
        $getRoot().append(list);
        text.select(0, 0);
      },
      { discrete: true },
    );

    setBlockType(editor, "quote");
    await flush();

    const block = firstBlock(editor);
    expect(block?.getType()).toBe("quote");
    expect(
      editor.getEditorState().read(() => $getRoot().getFirstChild()?.getParent()?.getType()),
    ).toBe("root");
  });

  it("toggles a bullet list on and off", async () => {
    const editor = createTestEditor();
    appendParagraph(editor, "item");

    toggleList(editor, "bullet");
    await flush();
    expect(firstBlock(editor)?.getType()).toBe("list");

    toggleList(editor, "bullet");
    await flush();
    expect(firstBlock(editor)?.getType()).toBe("paragraph");
  });

  it("moves the current block up and down", async () => {
    const editor = createTestEditor();
    appendParagraph(editor, "first");
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode("second");
        paragraph.append(text);
        $getRoot().append(paragraph);
        text.select(0, 0);
      },
      { discrete: true },
    );

    moveBlock(editor, -1);
    await flush();
    expect(
      editor.getEditorState().read(() => $getRoot().getFirstChild()?.getTextContent()),
    ).toBe("second");

    moveBlock(editor, 1);
    await flush();
    expect(
      editor.getEditorState().read(() => $getRoot().getLastChild()?.getTextContent()),
    ).toBe("second");
  });
});
