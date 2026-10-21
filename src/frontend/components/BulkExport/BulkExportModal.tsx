import React, { useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { exportAsHtml, exportAsJson, exportAsTxt } from "@/utils/fileOperations";
import { markdownToHtml } from "@/utils/markdown";

interface BulkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BulkExportModal: React.FC<BulkExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { documents } = useEditorStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState<"json" | "markdown" | "html">("json");
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAll = () => setSelected(documents.map((d) => d.id));
  const clearAll = () => setSelected([]);

  const handleExport = async () => {
    setBusy(true);
    try {
      if (format === "json") {
        const payload = documents.filter((d) => selected.includes(d.id));
        await exportAsJson(JSON.stringify(payload, null, 2), "documents.json");
      } else if (format === "markdown") {
        for (const d of documents.filter((d) => selected.includes(d.id))) {
          await exportAsTxt(d.content, (d.title || "untitled").replace(/[^a-zA-Z0-9-_]/g, "-"));
        }
      } else if (format === "html") {
        for (const d of documents.filter((d) => selected.includes(d.id))) {
          const html = await markdownToHtml(d.content);
          await exportAsHtml(html, (d.title || "untitled").replace(/[^a-zA-Z0-9-_]/g, "-") + ".html");
        }
      }
    } catch (err) {
      console.error("bulk export failed", err);
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-xl border border-gray-700 bg-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-100">一括エクスポート</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <div className="flex items-center gap-3 border-b border-gray-700 px-4 py-2 text-xs text-gray-300">
          <button type="button" onClick={selectAll} className="rounded bg-gray-700 px-2 py-1 hover:bg-gray-600">全選択</button>
          <button type="button" onClick={clearAll} className="rounded bg-gray-700 px-2 py-1 hover:bg-gray-600">選択解除</button>
          <span className="ml-auto text-gray-500">{selected.length} / {documents.length} 件選択</span>
        </div>
        <div className="max-h-[50vh] overflow-auto divide-y divide-gray-700">
          {documents.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">文書がありません</div>
          ) : (
            documents.map((d) => {
              const id = d.id;
              const checked = selected.includes(id);
              return (
                <label key={id} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700/60">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(id)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{d.title || "Untitled"}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {new Date(d.updatedAt).toLocaleDateString("ja-JP")}
                  </span>
                </label>
              );
            })
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-700 px-4 py-3 text-sm">
          <label className="flex items-center gap-2 text-gray-300">
            <span>形式</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
              className="rounded-lg border border-gray-600 bg-gray-700 px-2 py-1 text-gray-100"
            >
              <option value="json">JSON（一括）</option>
              <option value="markdown">Markdown（個別）</option>
              <option value="html">HTML（個別）</option>
            </select>
          </label>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-600 px-3 py-1.5 text-gray-300 hover:bg-gray-700"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={busy || selected.length === 0}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "エクスポート中…" : "エクスポート"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkExportModal;
