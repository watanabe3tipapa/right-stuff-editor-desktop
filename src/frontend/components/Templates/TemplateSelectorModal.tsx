import React, { useEffect, useMemo, useState } from "react";
import { useTemplateStore, applyTemplate } from "@/stores/templateStore";
import { useEditorStore } from "@/stores/editorStore";
import type { DocumentTemplate } from "@/types";

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_CATEGORIES = "すべて";

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { templates, load } = useTemplateStore();
  const { createDocument, openDocument } = useEditorStore();
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);

  useEffect(() => {
    if (!isOpen) return;
    void load();
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
    const q = filter.toLowerCase();
    return templates.filter((t) => {
      const inCategory = category === ALL_CATEGORIES || (t.category || "その他") === category;
      if (!inCategory) return false;
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-xl border border-gray-700 bg-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-100">テンプレートから作成</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <div className="px-4 py-3">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="テンプレートを検索…"
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </div>
        <div className="max-h-[60vh] overflow-auto divide-y divide-gray-700">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">該当するテンプレートがありません</div>
          ) : (
            grouped.map((group) => (
              <div key={group.category}>
                <div className="bg-gray-900/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {group.category}
                </div>
                {group.items.map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-100">{t.name}</div>
                      <div className="mt-0.5 text-xs text-gray-400 line-clamp-2">{t.description}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const doc = createDocument(t.name, applyTemplate(t.content));
                        onClose();
                        openDocument(doc.id);
                      }}
                      className="shrink-0 rounded-lg bg-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-600"
                    >
                      このテンプレートで作成
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateSelectorModal;
