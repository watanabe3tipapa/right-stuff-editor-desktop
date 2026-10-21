import type { LexicalEditor } from "lexical";
import { $getRoot, $createParagraphNode, $createTextNode } from "lexical";

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
