import { describe, expect, it } from "vitest";
import { $getRoot, createEditor, type LexicalEditor } from "lexical";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  CHECK_LIST,
  TRANSFORMERS,
} from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellNode,
  TableNode,
  TableRowNode,
} from "@lexical/table";
import { TABLE_TRANSFORMER } from "./tableTransformer";

const transformers = [...TRANSFORMERS, CHECK_LIST, TABLE_TRANSFORMER];

function createTestEditor(): LexicalEditor {
  return createEditor({
    namespace: "table-transformer-test",
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableRowNode,
      TableCellNode,
      LinkNode,
    ],
    onError: (error) => {
      throw error;
    },
  });
}

function importMarkdown(editor: LexicalEditor, markdown: string) {
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, transformers);
    },
    { discrete: true },
  );
}

function exportMarkdown(editor: LexicalEditor) {
  return editor.getEditorState().read(() =>
    $convertToMarkdownString(transformers),
  );
}

function readTable(editor: LexicalEditor) {
  return editor.getEditorState().read(() => {
    const table = $getRoot().getFirstChild();
    if (!$isTableNode(table)) return null;
    const rows = table.getChildren().filter($isTableRowNode).map((row) =>
      row.getChildren().filter($isTableCellNode).map((cell) => cell.getTextContent()),
    );
    return { table, rows };
  });
}

describe("Markdown table transformer", () => {
  it("imports a Markdown table as Lexical table nodes", () => {
    const editor = createTestEditor();
    importMarkdown(
      editor,
      ["| Name | Value |", "| --- | --- |", "| alpha | 1 |", "| beta | 2 |"].join(
        "\n",
      ),
    );

    const table = readTable(editor);
    expect(table).not.toBeNull();
    expect(table?.rows).toEqual([
      ["Name", "Value"],
      ["alpha", "1"],
      ["beta", "2"],
    ]);
  });

  it("round-trips a table through Markdown", () => {
    const editor = createTestEditor();
    const markdown = [
      "| Name | Value |",
      "| --- | --- |",
      "| alpha | 1 |",
      "| beta | 2 |",
    ].join("\n");
    importMarkdown(editor, markdown);

    expect(exportMarkdown(editor)).toBe(markdown);
  });

  it("preserves escaped pipes inside cells", () => {
    const editor = createTestEditor();
    const markdown = ["| Expression | Result |", "| --- | --- |", "| a \\| b | 1 |"].join(
      "\n",
    );
    importMarkdown(editor, markdown);

    expect(readTable(editor)?.rows[1]).toEqual(["a | b", "1"]);
    expect(exportMarkdown(editor)).toBe(markdown);
  });

  it("preserves line breaks and empty cells", () => {
    const editor = createTestEditor();
    const markdown = ["| A | B |", "| --- | --- |", "| a<br>b |  |"].join("\n");
    importMarkdown(editor, markdown);

    expect(readTable(editor)?.rows[1]).toEqual(["a\nb", ""]);
    expect(exportMarkdown(editor)).toBe(markdown);
  });

  it("accepts alignment separators and rows without outer pipes", () => {
    const editor = createTestEditor();
    importMarkdown(
      editor,
      ["Name | Value", ":--- | ---:", "alpha | 1"].join("\n"),
    );

    expect(readTable(editor)?.rows).toEqual([
      ["Name", "Value"],
      ["alpha", "1"],
    ]);
    expect(exportMarkdown(editor)).toBe(
      ["| Name | Value |", "| --- | --- |", "| alpha | 1 |"].join("\n"),
    );
  });

  it("leaves non-table paragraphs unchanged", () => {
    const editor = createTestEditor();
    importMarkdown(editor, "A paragraph without a table.");

    expect(readTable(editor)).toBeNull();
    expect(exportMarkdown(editor)).toBe("A paragraph without a table.");
  });
});
