import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  PASTE_COMMAND,
} from "lexical";

/**
 * Cmd/Ctrl+Shift+V で書式を捨て、プレーンテキストだけを挿入する。
 * paste イベント自体は shiftKey を持たないため、直前の keydown を覚えておく。
 */
export const PlainTextPastePlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const plainPasteRef = useRef(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        !event.altKey &&
        event.code === "KeyV"
      ) {
        plainPasteRef.current = true;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift" || event.code === "KeyV") {
        plainPasteRef.current = false;
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, []);

  useEffect(() => {
    const remove = editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent | InputEvent) => {
        if (!plainPasteRef.current) return false;
        plainPasteRef.current = false;
        if (!(event instanceof ClipboardEvent)) return false;
        const text = event.clipboardData?.getData("text/plain");
        if (!text) return false;
        event.preventDefault();
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertText(text);
          }
        });
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    return remove;
  }, [editor]);

  return null;
};

export default PlainTextPastePlugin;
