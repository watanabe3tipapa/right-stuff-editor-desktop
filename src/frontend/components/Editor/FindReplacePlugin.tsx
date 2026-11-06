import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
} from "lexical";
import { OPEN_FIND_COMMAND } from "./editorCommands";
import {
  $collectFindMatches,
  applyFindHighlights,
  clearFindHighlights,
  replaceAllFindMatches,
  replaceFindMatch,
  selectFindMatch,
  type FindMatch,
} from "./findReplace";

const isMod = (event: KeyboardEvent) => event.metaKey || event.ctrlKey;

export const FindReplacePlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const matchesRef = useRef<FindMatch[]>([]);
  const currentIndexRef = useRef(0);
  const hasSelectedRef = useRef(false);
  const highlightFrameRef = useRef<number | null>(null);
  const queryInputRef = useRef<HTMLInputElement>(null);

  const cancelHighlights = useCallback(() => {
    if (highlightFrameRef.current !== null) {
      window.cancelAnimationFrame(highlightFrameRef.current);
      highlightFrameRef.current = null;
    }
  }, []);

  const scheduleHighlights = useCallback(
    (matches: FindMatch[], index: number) => {
      cancelHighlights();
      if (!open) {
        clearFindHighlights();
        return;
      }
      highlightFrameRef.current = window.requestAnimationFrame(() => {
        highlightFrameRef.current = null;
        applyFindHighlights(editor, matches, index);
      });
    },
    [cancelHighlights, editor, open],
  );

  const refresh = useCallback(
    (preferredIndex = 0, shouldSelect = false) => {
      const matches = editor.getEditorState().read(() =>
        $collectFindMatches(query, caseSensitive),
      );
      matchesRef.current = matches;
      setMatchCount(matches.length);
      const index = matches.length
        ? Math.min(Math.max(preferredIndex, 0), matches.length - 1)
        : 0;
      currentIndexRef.current = index;
      setCurrentIndex(index);
      scheduleHighlights(matches, index);
      if (shouldSelect && matches.length) {
        selectFindMatch(editor, matches[index]);
        hasSelectedRef.current = true;
      }
      return matches;
    },
    [caseSensitive, editor, query, scheduleHighlights],
  );

  const openFind = useCallback(
    (replace = false) => {
      let seed = "";
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && !selection.isCollapsed()) {
          const text = selection.getTextContent();
          if (text && !text.includes("\n")) seed = text;
        }
      });
      if (seed) setQuery(seed);
      setReplaceMode(replace);
      hasSelectedRef.current = false;
      setOpen(true);
    },
    [editor],
  );

  const close = useCallback(() => {
    setOpen(false);
    cancelHighlights();
    clearFindHighlights();
    editor.focus();
  }, [cancelHighlights, editor]);

  const go = useCallback(
    (delta: number) => {
      const matches = matchesRef.current;
      if (!matches.length) return;
      const next = hasSelectedRef.current
        ? (currentIndexRef.current + delta + matches.length) % matches.length
        : currentIndexRef.current;
      currentIndexRef.current = next;
      setCurrentIndex(next);
      selectFindMatch(editor, matches[next]);
      hasSelectedRef.current = true;
      scheduleHighlights(matches, next);
    },
    [editor, scheduleHighlights],
  );

  const replaceOne = useCallback(() => {
    const match = matchesRef.current[currentIndexRef.current];
    if (!match) return;
    replaceFindMatch(editor, match, replacement);
    refresh(currentIndexRef.current, true);
  }, [editor, refresh, replacement]);

  const replaceAll = useCallback(() => {
    if (!query) return;
    replaceAllFindMatches(editor, query, caseSensitive, replacement);
    hasSelectedRef.current = false;
    refresh(0, false);
  }, [caseSensitive, editor, query, refresh, replacement]);

  useEffect(() => {
    const remove = editor.registerCommand(
      OPEN_FIND_COMMAND,
      (payload) => {
        openFind(Boolean(payload?.replace));
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    return remove;
  }, [editor, openFind]);

  useEffect(() => {
    const remove = editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (!isMod(event) || event.code !== "KeyF") return false;
        if (event.shiftKey) return false;
        event.preventDefault();
        openFind(event.altKey);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    return remove;
  }, [editor, openFind]);

  useEffect(() => {
    if (!open) {
      clearFindHighlights();
      return;
    }
    hasSelectedRef.current = false;
    refresh(0, false);
  }, [open, query, caseSensitive, refresh]);

  useEffect(() => {
    if (!open) return;
    return editor.registerUpdateListener(() => {
      const matches = editor.getEditorState().read(() =>
        $collectFindMatches(query, caseSensitive),
      );
      matchesRef.current = matches;
      setMatchCount(matches.length);
      const index = matches.length
        ? Math.min(currentIndexRef.current, matches.length - 1)
        : 0;
      currentIndexRef.current = index;
      setCurrentIndex(index);
      scheduleHighlights(matches, index);
    });
  }, [caseSensitive, editor, open, query, scheduleHighlights]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      queryInputRef.current?.focus();
      queryInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(
    () => () => {
      cancelHighlights();
      clearFindHighlights();
    },
    [cancelHighlights],
  );

  const status = !query
    ? "検索語を入力"
    : matchCount === 0
      ? "一致なし"
      : `${currentIndex + 1} / ${matchCount}`;

  const handleQueryKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      go(event.shiftKey ? -1 : 1);
    }
  };

  const handleReplaceKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      replaceOne();
    }
  };

  if (!open) return null;

  return (
    <div className="rd-find-bar" role="dialog" aria-label="検索と置換">
      <div className="rd-find-row">
        <input
          ref={queryInputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleQueryKeyDown}
          placeholder="検索"
          aria-label="検索語"
        />
        <span className="rd-find-count" aria-live="polite">
          {status}
        </span>
        <button type="button" onClick={() => go(-1)} title="前へ (Shift+Enter)" aria-label="前の一致">
          ↑
        </button>
        <button type="button" onClick={() => go(1)} title="次へ (Enter)" aria-label="次の一致">
          ↓
        </button>
        <button
          type="button"
          className={replaceMode ? "active" : ""}
          onClick={() => setReplaceMode((value) => !value)}
          aria-pressed={replaceMode}
          title="置換を表示"
          aria-label="置換を表示"
        >
          ⇄
        </button>
        <button type="button" onClick={close} title="閉じる (Esc)" aria-label="検索を閉じる">
          ×
        </button>
      </div>

      {replaceMode && (
        <div className="rd-find-row">
          <input
            type="text"
            value={replacement}
            onChange={(event) => setReplacement(event.target.value)}
            onKeyDown={handleReplaceKeyDown}
            placeholder="置換後"
            aria-label="置換後の文字列"
          />
          <button type="button" onClick={replaceOne} disabled={!matchCount}>
            置換
          </button>
          <button type="button" onClick={replaceAll} disabled={!matchCount}>
            すべて置換
          </button>
        </div>
      )}

      <label className="rd-find-case">
        <input
          type="checkbox"
          checked={caseSensitive}
          onChange={(event) => setCaseSensitive(event.target.checked)}
        />
        大文字と小文字を区別
      </label>
    </div>
  );
};

export default FindReplacePlugin;
