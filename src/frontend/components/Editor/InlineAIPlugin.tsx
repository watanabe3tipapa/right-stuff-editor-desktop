import { useCallback, useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
} from "lexical";
import { AI_ACTIONS, runAIAction, type AIAction } from "@/utils/aiActions";

interface FloatingPosition {
  top: number;
  left: number;
}

export const InlineAIPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const [showButton, setShowButton] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [position, setPosition] = useState<FloatingPosition>({ top: 0, left: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const getSelectedText = useCallback((): string | null => {
    let text: string | null = null;
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && !selection.isCollapsed()) {
        text = selection.getTextContent();
      }
    });
    return text;
  }, [editor]);

  const updatePosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setPosition({
      top: rect.top - 36,
      left: rect.left + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    const handler = () => {
      const text = getSelectedText();
      if (text && text.trim().length > 0) {
        updatePosition();
        setShowButton(true);
      } else {
        setShowButton(false);
        setShowMenu(false);
      }
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [getSelectedText, updatePosition]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const replaceSelection = useCallback(
    (newText: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(newText);
        }
      });
    },
    [editor],
  );

  const handleAction = useCallback(
    async (action: AIAction) => {
      const text = getSelectedText();
      if (!text) return;

      setIsProcessing(true);
      setSelectedActionId(action.id);
      setShowMenu(false);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await runAIAction(action, text, controller.signal);
        if (!controller.signal.aborted && result.trim()) {
          replaceSelection(result.trim());
        }
      } catch {
        // Ignore errors silently
      } finally {
        setIsProcessing(false);
        setSelectedActionId(null);
        abortRef.current = null;
      }
    },
    [getSelectedText, replaceSelection],
  );

  if (!showButton) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="rd-inline-ai-button"
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
          transform: "translateX(-50%)",
        }}
        onClick={() => setShowMenu(!showMenu)}
        title="AI アクション"
        aria-label="AI アクション"
        disabled={isProcessing}
      >
        {isProcessing ? "⏳" : "✨ AI"}
      </button>

      {showMenu && (
        <div
          ref={menuRef}
          className="rd-inline-ai-menu"
          style={{
            position: "fixed",
            top: position.top + 32,
            left: position.left,
            transform: "translateX(-50%)",
          }}
        >
          {AI_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`rd-inline-ai-item ${
                selectedActionId === action.id ? "selected" : ""
              }`}
              onClick={() => handleAction(action)}
              disabled={isProcessing}
            >
              <span className="rd-inline-ai-label">{action.label}</span>
              <span className="rd-inline-ai-desc">{action.description}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default InlineAIPlugin;
