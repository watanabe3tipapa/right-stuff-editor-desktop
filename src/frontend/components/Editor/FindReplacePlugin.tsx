import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
} from "lexical";
import { OPEN_FIND_COMMAND } from "./editorCommands";

interface Match {
  nodeKey: string;
  start: number;
  end: number;
}

const isMod = (event: KeyboardEvent) => event.metaKey || event.ctrlKey;

function collectMatches(query: string, caseSensitive: boolean): Match[] {
  if (!query) return [];
  const needle = caseSensitive ? query : query.toLowerCase();
  const matches: Match[] = [];
  for (const node of $getRoot().getAllTextNodes()) {
    const text = node.getTextContent();
    const haystack = caseSensitive ? text : text.toLowerCase();
    let from = 0;
    while (from <= haystack.length - needle.length) {
      const index = haystack.indexOf(needle, from);
      if (index < 0) break;
      matches.push({
        nodeKey: node.getKey(),
        start: index,
        end: index + needle.length,
      });
      from = index + needle.length;
    }
  }
  return matches;
}

function selectMatch(editor: LexicalEditor, match: Match) {
  editor.update(() => {
    const node = $getNodeByKey(match.nodeKey);
    if ($isTextNode(node)) {
      node.select(match.start, match.end);
    }
  });
  editor.getElementByKey(match.nodeKey)?.scrollIntoView({
    block: "center",
    behavior: "smooth",
  });
}

export const FindReplacePlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const matchesRef = useRef<Match[]>([]);
  const hasSelectedRef = useRef(false);
  const queryInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(
    (preferredIndex = 0, shouldSelect = false) => {
      const matches = editor.getEditorState().read(() =>
        collectMatches(query, caseSensitive),
      );
      matchesRef.current = matches;
      setMatchCount(matches.length);
      const index = matches.length
        ? Math.min(Math.max(preferredIndex, 0), matches.length - 1)
        : 0;
      setCurrentIndex(index);
      if (shouldSelect && matches.length) {
        selectMatch(editor, matches[index]);
        hasSelectedRef.current = true;
      }
      return matches;
    },
    [caseSensitive, editor, query],
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
    editor.focus();
  }, [editor]);

  const go = useCallback(
    (delta: number) => {
      const matches = matchesRef.current;
      if (!matches.length) return;
      const next = hasSelectedRef.current
        ? (currentIndex + delta + matches.length) % matches.length
        : currentIndex;
      setCurrentIndex(next);
      selectMatch(editor, matches[next]);
      hasSelectedRef.current = true;
    },
    [currentIndex, editor],
  );

  const replaceOne = useCallback(() => {
    const match = matchesRef.current[currentIndex];
    if (!match) return;
    editor.update(() => {
      const node = $getNodeByKey(match.nodeKey);
      if (!$isTextNode(node)) return;
      node.select(match.start, match.end);
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertText(replacement);
      }
    });
    refresh(currentIndex, true);
  }, [currentIndex, editor, refresh, replacement]);

  const replaceAll = useCallback(() => {
    if (!query) return;
    editor.update(() => {
      const matches = collectMatches(query, caseSensitive);
      const byNode = new Map<string, Match[]>();
      for (const match of matches) {
        const list = byNode.get(match.nodeKey);
        if (list) {
          list.push(match);
        } else {
          byNode.set(match.nodeKey, [match]);
        }
      }
      for (const [nodeKey, list] of byNode) {
        const node = $getNodeByKey(nodeKey);
        if (!$isTextNode(node)) continue;
        let text = node.getTextContent();
        for (const match of [...list].sort((a, b) => b.start - a.start)) {
          text = `${text.slice(0, match.start)}${replacement}${text.slice(match.end)}`;
        }
        node.setTextContent(text);
      }
    });
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
    if (!open) return;
    hasSelectedRef.current = false;
    refresh(0, false);
  }, [open, query, caseSensitive, refresh]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      queryInputRef.current?.focus();
      queryInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

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
