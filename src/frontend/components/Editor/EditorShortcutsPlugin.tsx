import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  COMMAND_PRIORITY_HIGH,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
} from "lexical";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { moveBlock, setBlockType, toggleList, type BlockKind } from "./blockOperations";
import { OPEN_LINK_POPOVER_COMMAND } from "./editorCommands";

const isMod = (event: KeyboardEvent) => event.metaKey || event.ctrlKey;

const isComposing = (event: KeyboardEvent) =>
  event.isComposing || (event as KeyboardEvent & { keyCode?: number }).keyCode === 229;

const isBlockShortcut = (event: KeyboardEvent) =>
  isMod(event) && event.altKey && !event.shiftKey;

const isListShortcut = (event: KeyboardEvent) =>
  isMod(event) && event.shiftKey && !event.altKey;

export const EditorShortcutsPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const remove = editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (isComposing(event)) return false;

        if (isBlockShortcut(event)) {
          if (event.code === "Digit0") {
            event.preventDefault();
            setBlockType(editor, "paragraph");
            return true;
          }
          if (/^Digit[1-6]$/.test(event.code)) {
            event.preventDefault();
            const level = event.code.slice(-1) as "1" | "2" | "3" | "4" | "5" | "6";
            setBlockType(editor, `h${level}` as BlockKind);
            return true;
          }
          if (event.code === "KeyT") {
            event.preventDefault();
            toggleList(editor, "check");
            return true;
          }
          if (event.code === "KeyC") {
            event.preventDefault();
            setBlockType(editor, "code");
            return true;
          }
          if (event.code === "KeyS") {
            event.preventDefault();
            editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
            return true;
          }
          if (event.code === "KeyA") {
            event.preventDefault();
            editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: "3", rows: "3" });
            return true;
          }
          if (event.code === "KeyK") {
            event.preventDefault();
            editor.dispatchCommand(OPEN_LINK_POPOVER_COMMAND, undefined);
            return true;
          }
        }

        if (isListShortcut(event)) {
          if (event.code === "Digit7") {
            event.preventDefault();
            toggleList(editor, "number");
            return true;
          }
          if (event.code === "Digit8") {
            event.preventDefault();
            toggleList(editor, "bullet");
            return true;
          }
          if (event.code === "Period") {
            event.preventDefault();
            setBlockType(editor, "quote");
            return true;
          }
          if (event.code === "ArrowUp") {
            event.preventDefault();
            moveBlock(editor, -1);
            return true;
          }
          if (event.code === "ArrowDown") {
            event.preventDefault();
            moveBlock(editor, 1);
            return true;
          }
        }

        if (isMod(event) && !event.altKey && !event.shiftKey && event.code === "KeyE") {
          event.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
    return remove;
  }, [editor]);

  return null;
};

export default EditorShortcutsPlugin;
