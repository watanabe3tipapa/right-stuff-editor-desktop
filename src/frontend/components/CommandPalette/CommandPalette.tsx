import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useTemplateStore, applyTemplate } from "@/stores/templateStore";
import { extractSummary } from "@/utils/markdown";
import { cosineSimilarityTexts } from "@/utils/similarity";

interface Command {
  id: string;
  label: string;
  group: "document" | "command" | "template";
  description?: string;
  snippet?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const { documents, currentDocumentId, openDocument, createDocument } =
    useEditorStore();
  const { templates } = useTemplateStore();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, commands.length - 1)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        commands[activeIndex]?.onSelect();
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeIndex, onClose]);

  const commands: Command[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: Command[] = [];

    // Commands
    out.push({
      id: "cmd-new",
      label: "新規文書",
      group: "command",
      onSelect: () => {
        createDocument();
        onClose();
      },
    });
    if (onOpenSettings) {
      out.push({
        id: "cmd-settings",
        label: "設定を開く",
        group: "command",
        onSelect: () => {
          onOpenSettings();
          onClose();
        },
      });
    }

    // Templates
    templates.slice(0, 5).forEach((t) => {
      out.push({
        id: `tpl-${t.id}`,
        label: `テンプレート: ${t.name}`,
        group: "template",
        description: t.description,
        onSelect: () => {
          const doc = createDocument(t.name || "テンプレート", applyTemplate(t.content));
          onClose();
          openDocument(doc.id);
        },
      });
    });

    // Documents
    let docs = documents.slice();
    if (q) {
      docs = docs
        .map((d) => ({
          d,
          score:
            cosineSimilarityTexts(q, d.title + "\n" + d.content) +
            (d.title.toLowerCase().includes(q) ? 0.2 : 0),
        }))
        .sort((a, b) => b.score - a.score)
        .filter(
          (x) =>
            x.score > 0 ||
            x.d.title.toLowerCase().includes(q) ||
            x.d.content.toLowerCase().includes(q),
        )
        .map((x) => x.d);
    } else {
      docs = docs.slice(0, 10);
    }
    docs.forEach((d) => {
      const isActive = d.id === currentDocumentId;
      out.push({
        id: `doc-${d.id}`,
        label: isActive ? `${d.title || "Untitled"} (開いている)` : d.title || "Untitled",
        group: "document",
        description: extractSummary(d.content, 60),
        onSelect: () => {
          if (!isActive) openDocument(d.id);
          onClose();
        },
      });
    });

    return out.slice(0, 30);
  }, [query, documents, templates, currentDocumentId, createDocument, openDocument, onClose, onOpenSettings]);

  useEffect(() => {
    if (activeIndex >= commands.length) setActiveIndex(Math.max(0, commands.length - 1));
  }, [commands.length, activeIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[10vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-gray-700 bg-gray-800 shadow-2xl">
        <div className="border-b border-gray-700 px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="検索・コマンド (/ でフォーカス、Ctrl+K)"
            className="w-full bg-transparent px-2 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
            aria-label="コマンドパレット検索"
          />
        </div>
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-auto py-2"
          role="listbox"
          aria-label="コマンド候補"
        >
          {commands.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">候補がありません</div>
          ) : (
            commands.map((cmd, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={cmd.onSelect}
                  className={`flex w-full items-start gap-3 px-4 py-2 text-left text-sm transition-colors ${
                    active ? "bg-gray-700/80" : "hover:bg-gray-700/60"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-100 truncate">{cmd.label}</span>
                      {cmd.group === "command" && (
                        <span className="text-xs text-gray-500">コマンド</span>
                      )}
                      {cmd.group === "template" && (
                        <span className="text-xs text-gray-500">テンプレート</span>
                      )}
                    </div>
                    {cmd.description && (
                      <p className="mt-0.5 truncate text-xs text-gray-400">
                        {cmd.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t border-gray-700 px-4 py-2 text-xs text-gray-500">
          <span>↑↓ 選択 / Enter 実行 / Esc 閉じる</span>
          <span>Ctrl+K / / で開く</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
