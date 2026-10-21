import { useCallback, useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  COMMAND_PRIORITY_HIGH,
  type LexicalNode,
} from "lexical";
import { $createGhostTextNode, $isGhostTextNode } from "./GhostTextNode";
import { requestGhostSuggestion } from "@/utils/llmClient";
import { useGhostStore } from "@/stores/ghostStore";

const MIN_CONTEXT_LENGTH = 2;
const MAX_CONTEXT_LENGTH = 500;

const getTextUpToCursor = (editor: {
  getEditorState: () => { read: (cb: () => void) => void };
}): string => {
  let result = "";
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
    const anchorNode = selection.anchor.getNode();
    if ($isTextNode(anchorNode)) {
      const text = anchorNode.getTextContent();
      result = text.slice(0, selection.anchor.offset);
    }
  });
  return result;
};

const findGhostNode = (editor: {
  getEditorState: () => { read: (cb: () => void) => void };
}): LexicalNode | null => {
  let found: LexicalNode | null = null;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const anchorNode = selection.anchor.getNode();
    const parent = anchorNode.getParent();
    if (!parent) return;
    const children = parent.getChildren();
    for (const child of children) {
      if ($isGhostTextNode(child)) {
        found = child;
        return;
      }
    }
  });
  return found;
};

export const GhostTextPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const { enabled, delayMs, maxTokens } = useGhostStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const ghostKeyRef = useRef<string | null>(null);
  const suppressClearRef = useRef(false);
  const enabledRef = useRef(enabled);
  const maxTokensRef = useRef(maxTokens);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    maxTokensRef.current = maxTokens;
  }, [maxTokens]);

  const clearGhost = useCallback(() => {
    if (ghostKeyRef.current) {
      const key = ghostKeyRef.current;
      ghostKeyRef.current = null;
      editor.update(() => {
        const node = $getNodeByKey(key);
        if (node && $isGhostTextNode(node)) {
          node.remove();
        }
      });
    }
  }, [editor]);

  const insertGhost = useCallback(
    (suggestion: string) => {
      if (!suggestion.trim()) return;
      suppressClearRef.current = true;
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
        const anchorNode = selection.anchor.getNode();
        const parent = anchorNode.getParent();
        if (!parent) return;
        const children = parent.getChildren();
        for (const child of children) {
          if ($isGhostTextNode(child)) {
            child.remove();
          }
        }
        const ghostNode = $createGhostTextNode(suggestion);
        anchorNode.insertAfter(ghostNode);
        ghostKeyRef.current = ghostNode.getKey();
      });
    },
    [editor]
  );

  // Debounced suggestion trigger on editor updates
  useEffect(() => {
    if (!enabled) {
      clearGhost();
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      return;
    }

    const removeUpdateListener = editor.registerUpdateListener(() => {
      // Skip when the update was caused by our own ghost insertion
      if (suppressClearRef.current) {
        suppressClearRef.current = false;
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      clearGhost();

      timerRef.current = setTimeout(() => {
        const context = getTextUpToCursor(editor);
        if (context.trim().length < MIN_CONTEXT_LENGTH) return;
        if (context.length > MAX_CONTEXT_LENGTH) return;

        const controller = new AbortController();
        abortRef.current = controller;

        void requestGhostSuggestion(context, {
          maxTokens: maxTokensRef.current,
          signal: controller.signal,
        })
          .then((suggestion) => {
            if (controller.signal.aborted) return;
            if (!enabledRef.current) return;
            if (!suggestion.trim()) return;
            const currentContext = getTextUpToCursor(editor);
            if (currentContext !== context) return;
            insertGhost(suggestion);
          })
          .catch(() => {
            // Ignore cancellation and network errors silently
          });
      }, delayMs);
    });

    return () => {
      removeUpdateListener();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [editor, enabled, delayMs, clearGhost, insertGhost]);

  // Tab to accept, Escape to dismiss
  useEffect(() => {
    const removeTab = editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        const ghostNode = findGhostNode(editor);
        if (!ghostNode || !$isGhostTextNode(ghostNode)) return false;
        const suggestion = ghostNode.getSuggestion();
        suppressClearRef.current = true;
        editor.update(() => {
          const node = $getNodeByKey(ghostNode.getKey());
          if (node && $isGhostTextNode(node)) {
            node.remove();
          }
          ghostKeyRef.current = null;
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertText(suggestion);
          }
        });
        event?.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_HIGH
    );

    const removeEscape = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        const ghostNode = findGhostNode(editor);
        if (!ghostNode || !$isGhostTextNode(ghostNode)) return false;
        suppressClearRef.current = true;
        clearGhost();
        return true;
      },
      COMMAND_PRIORITY_HIGH
    );

    return () => {
      removeTab();
      removeEscape();
    };
  }, [editor, clearGhost]);

  return null;
};

export default GhostTextPlugin;
