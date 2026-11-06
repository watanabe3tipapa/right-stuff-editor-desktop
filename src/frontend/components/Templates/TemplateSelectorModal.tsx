import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTemplateStore, applyTemplate } from "@/stores/templateStore";
import { useEditorStore } from "@/stores/editorStore";
import { MarkdownPreview } from "@/components/Preview/MarkdownPreview";
import type { DocumentTemplate } from "@/types";

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

const ALL_CATEGORIES = "すべて";

const stripFrontmatter = (content: string) =>
  content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const { templates, load } = useTemplateStore();
  const { createDocument, openDocument } = useEditorStore();
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [previewMode, setPreviewMode] = useState<"preview" | "source">("preview");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    void load();
    setFilter("");
    setCategory(ALL_CATEGORIES);
    setSelectedId(null);
    setTitle("");
    setPreviewMode("preview");
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, load]);

  const categories = useMemo(() => {
    const seen: string[] = [];
    templates.forEach((t) => {
      const c = t.category || "その他";
      if (!seen.includes(c)) seen.push(c);
    });
    return seen;
  }, [templates]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return templates.filter((t) => {
      const inCategory =
        category === ALL_CATEGORIES || (t.category || "その他") === category;
      if (!inCategory) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q)
      );
    });
  }, [templates, filter, category]);

  const grouped = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, DocumentTemplate[]>();
    filtered.forEach((t) => {
      const c = t.category || "その他";
      if (!map.has(c)) {
        map.set(c, []);
        order.push(c);
      }
      map.get(c)!.push(t);
    });
    return order.map((c) => ({ category: c, items: map.get(c)! }));
  }, [filtered]);

  const selected = useMemo(
    () => filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  useEffect(() => {
    if (selected) setTitle(selected.name);
  }, [selected?.id]);

  const previewContent = useMemo(() => {
    if (!selected) return "";
    return applyTemplate(selected.content, {
      title: title.trim() || selected.name,
    });
  }, [selected, title]);

  const moveSelection = useCallback(
    (delta: number) => {
      if (filtered.length === 0) return;
      const current = filtered.findIndex((t) => t.id === selected?.id);
      const base = current < 0 ? 0 : current;
      const next = (base + delta + filtered.length) % filtered.length;
      setSelectedId(filtered[next]?.id ?? null);
    },
    [filtered, selected?.id],
  );

  const createFrom = useCallback(
    async (template: DocumentTemplate | null, titleOverride?: string) => {
      const docTitle =
        titleOverride?.trim() || title.trim() || template?.name || "Untitled";
      const content = template
        ? applyTemplate(template.content, { title: docTitle })
        : "";
      onClose();
      const doc = await createDocument(docTitle, content);
      openDocument(doc.id);
    },
    [createDocument, onClose, openDocument, title],
  );

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      void createFrom(selected);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-xl border border-gray-700 bg-gray-800 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="テンプレートから作成"
      >
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">テンプレートから作成</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              内容を確認して、文書名を決めてから作成できます。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="flex min-h-0 flex-col" aria-label="テンプレート一覧">
            <input
              ref={searchRef}
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="テンプレートを検索…（↑↓ / Enter）"
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="テンプレートを検索"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[ALL_CATEGORIES, ...categories].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={
                    c === category
                      ? "rounded-full bg-blue-600 px-2.5 py-0.5 text-xs text-white"
                      : "rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-gray-300 hover:bg-gray-600"
                  }
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-lg border border-gray-700">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  該当するテンプレートがありません
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.category}>
                    <div className="sticky top-0 z-10 bg-gray-900/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 backdrop-blur">
                      {group.category}
                    </div>
                    {group.items.map((t) => {
                      const active = selected?.id === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedId(t.id)}
                          onDoubleClick={() =>
                            void createFrom(t, t.id === selected?.id ? undefined : t.name)
                          }
                          aria-selected={active}
                          className={`block w-full border-l-2 px-4 py-3 text-left transition-colors ${
                            active
                              ? "border-blue-500 bg-blue-600/10"
                              : "border-transparent hover:bg-gray-700/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-gray-100">
                              {t.name}
                            </span>
                            {t.builtin && (
                              <span className="shrink-0 rounded bg-gray-600 px-1.5 py-0.5 text-[10px] text-gray-300">
                                組み込み
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 line-clamp-2 text-xs text-gray-400">
                            {t.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col" aria-label="テンプレートのプレビュー">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-gray-100">
                        {selected.name}
                      </h3>
                      {selected.category && (
                        <span className="shrink-0 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300">
                          {selected.category}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">
                      {selected.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 rounded-lg border border-gray-600 p-0.5">
                    {(["preview", "source"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPreviewMode(mode)}
                        className={`rounded px-2 py-0.5 text-[11px] ${
                          previewMode === mode
                            ? "bg-gray-600 text-white"
                            : "text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        {mode === "preview" ? "プレビュー" : "ソース"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-2 min-h-0 flex-1 overflow-auto rounded-lg border border-gray-700 bg-gray-900/50 p-4">
                  {previewMode === "preview" ? (
                    <MarkdownPreview
                      content={stripFrontmatter(previewContent)}
                      className="text-sm"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-gray-300">
                      {previewContent}
                    </pre>
                  )}
                </div>

                <label className="mt-3 block text-xs font-medium text-gray-400">
                  文書名
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void createFrom(selected);
                      }
                    }}
                    placeholder={selected.name}
                    className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void createFrom(selected)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    このテンプレートで作成
                  </button>
                  <button
                    type="button"
                    onClick={() => void createFrom(null)}
                    className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
                  >
                    白紙から作成
                  </button>
                  {onOpenSettings && (
                    <button
                      type="button"
                      onClick={onOpenSettings}
                      className="ml-auto text-xs text-gray-400 underline-offset-2 hover:text-gray-200 hover:underline"
                    >
                      設定で管理
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-700 text-sm text-gray-500">
                <span>テンプレートを選択してください</span>
                <button
                  type="button"
                  onClick={() => void createFrom(null)}
                  className="rounded-lg border border-gray-600 px-3 py-1.5 text-gray-200 hover:bg-gray-700"
                >
                  白紙から作成
                </button>
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-gray-700 px-4 py-2 text-xs text-gray-500">
          <span>↑↓ 選択 / Enter 作成 / Esc 閉じる</span>
          <span>ダブルクリックでも作成できます</span>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelectorModal;
