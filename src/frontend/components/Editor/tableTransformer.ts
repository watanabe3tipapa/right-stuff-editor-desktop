import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  type ElementNode,
  type LexicalNode,
} from "lexical";
import type { MultilineElementTransformer } from "@lexical/markdown";
import {
  $createTableNodeWithDimensions,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellNode,
  TableNode,
  TableRowNode,
} from "@lexical/table";

const TABLE_START_REGEX = /^\s*.*\|.*$/;
const TABLE_SEPARATOR_CELL = /^:?-{3,}:?$/;

function unescapeCell(value: string): string {
  let result = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "\\" && index + 1 < value.length) {
      result += value[index + 1];
      index += 1;
    } else {
      result += char;
    }
  }
  return result;
}

function escapeCell(value: string): string {
  let result = "";
  for (const char of value) {
    if (char === "\\") {
      result += "\\\\";
    } else if (char === "|") {
      result += "\\|";
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Splits a Markdown table row into cells. Leading and trailing pipes are
 * optional, and `\|` escapes a literal pipe inside a cell.
 */
export function splitMarkdownTableRow(line: string): string[] {
  let body = line.trim();
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|") && !body.endsWith("\\|")) body = body.slice(0, -1);

  const cells: string[] = [];
  let current = "";
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char === "\\" && index + 1 < body.length) {
      current += char + body[index + 1];
      index += 1;
    } else if (char === "|") {
      cells.push(unescapeCell(current).trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(unescapeCell(current).trim());
  return cells;
}

export function isMarkdownTableSeparator(line: string): boolean {
  if (!line.includes("|")) return false;
  const cells = splitMarkdownTableRow(line);
  return cells.length > 0 && cells.every((cell) => TABLE_SEPARATOR_CELL.test(cell));
}

function looksLikeTableRow(line: string): boolean {
  if (!line.includes("|")) return false;
  const trimmed = line.trim();
  if (trimmed.startsWith("|") || trimmed.endsWith("|")) return true;
  return splitMarkdownTableRow(line).length > 1;
}

function formatTableRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

function exportTableCell(
  cell: TableCellNode,
  traverseChildren: (node: ElementNode) => string,
): string {
  const content = traverseChildren(cell).trim();
  return escapeCell(content).replace(/\r?\n/g, "<br>");
}

function exportTable(
  node: LexicalNode,
  traverseChildren: (node: ElementNode) => string,
): string | null {
  if (!$isTableNode(node)) return null;
  const rows = node.getChildren().filter($isTableRowNode);
  if (rows.length === 0) return null;

  const matrix = rows.map((row) =>
    row
      .getChildren()
      .filter($isTableCellNode)
      .map((cell) => exportTableCell(cell, traverseChildren)),
  );
  const columnCount = Math.max(1, ...matrix.map((row) => row.length));
  const normalized = matrix.map((row) => {
    const cells = [...row];
    while (cells.length < columnCount) cells.push("");
    return cells;
  });

  const header = normalized[0] ?? [];
  const separator = header.map(() => "---");
  const lines = [
    formatTableRow(header),
    formatTableRow(separator),
    ...normalized.slice(1).map(formatTableRow),
  ];
  return lines.join("\n");
}

function fillTableCell(cell: TableCellNode, value: string) {
  cell.clear();
  const paragraph = $createParagraphNode();
  const parts = value.split(/<br\s*\/?>/i);
  parts.forEach((part, index) => {
    if (index > 0) paragraph.append($createLineBreakNode());
    if (part) paragraph.append($createTextNode(part));
  });
  if (paragraph.getChildrenSize() === 0) {
    paragraph.append($createTextNode(""));
  }
  cell.append(paragraph);
}

function importTable({
  lines,
  rootNode,
  startLineIndex,
}: {
  lines: string[];
  rootNode: ElementNode;
  startLineIndex: number;
}): [boolean, number] | null {
  const headerLine = lines[startLineIndex];
  const separatorLine = lines[startLineIndex + 1];
  if (!headerLine || !separatorLine) return null;
  if (!isMarkdownTableSeparator(separatorLine)) return null;

  const header = splitMarkdownTableRow(headerLine);
  if (header.length === 0) return null;

  const body: string[][] = [];
  let end = startLineIndex + 1;
  while (
    end + 1 < lines.length &&
    looksLikeTableRow(lines[end + 1] ?? "") &&
    !isMarkdownTableSeparator(lines[end + 1] ?? "")
  ) {
    end += 1;
    body.push(splitMarkdownTableRow(lines[end] ?? ""));
  }

  const allRows = [header, ...body];
  const columnCount = Math.max(
    1,
    ...allRows.map((row) => row.length),
  );
  const table = $createTableNodeWithDimensions(allRows.length, columnCount, {
    rows: true,
    columns: false,
  });
  const tableRows = table.getChildren().filter($isTableRowNode);

  tableRows.forEach((row, rowIndex) => {
    const cells = row.getChildren().filter($isTableCellNode);
    cells.forEach((cell, columnIndex) => {
      fillTableCell(cell, allRows[rowIndex]?.[columnIndex] ?? "");
    });
  });

  rootNode.append(table);
  return [true, end];
}

export const TABLE_TRANSFORMER: MultilineElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node, traverseChildren) => exportTable(node, traverseChildren),
  // Tables are imported through handleImportAfterStartMatch. A non-optional
  // regExpEnd keeps this transformer out of the typing shortcuts.
  regExpStart: TABLE_START_REGEX,
  regExpEnd: /$^/,
  replace: () => false,
  handleImportAfterStartMatch: importTable,
  type: "multiline-element",
};
