import type { LexicalEditor } from "lexical";
import { $getRoot, $createParagraphNode, $createTextNode, $getSelection, $isRangeSelection } from "lexical";

let lexicalEditorInstance: LexicalEditor | null = null;

export function registerLexicalEditor(editor: LexicalEditor | null) {
  lexicalEditorInstance = editor;
}

export function appendTextToLexical(text: string) {
  if (!lexicalEditorInstance) return false;
  lexicalEditorInstance.update(() => {
    const root = $getRoot();
    const paragraph = $createParagraphNode();
    paragraph.append($createTextNode(text));
    root.append(paragraph);
  });
  return true;
}

/** Markdown モードのテキストエリア */
const getMarkdownArea = (): HTMLTextAreaElement | null =>
  document.getElementById("markdown-editor") as HTMLTextAreaElement | null;

/** 現在選択されているテキストを返す（Rich Text / Markdown モード） */
export function getSelectedText(): string {
  const area = getMarkdownArea();
  if (area && area.selectionStart !== area.selectionEnd) {
    return area.value.slice(area.selectionStart, area.selectionEnd);
  }
  if (!lexicalEditorInstance) return "";
  let text = "";
  lexicalEditorInstance.getEditorState().read(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection) && !selection.isCollapsed()) {
      text = selection.getTextContent();
    }
  });
  return text;
}

/** 選択範囲をテキストで置き換える。選択が無ければ false を返す。 */
export function replaceSelectionWithText(text: string): boolean {
  if (!lexicalEditorInstance) return false;
  let replaced = false;
  lexicalEditorInstance.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection) && !selection.isCollapsed()) {
      selection.insertText(text);
      replaced = true;
    }
  });
  return replaced;
}
