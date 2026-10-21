import React, { useState, useEffect, useRef, useMemo } from "react";
import { useGistStore } from "@/stores/gistStore";
import { useEditorStore } from "@/stores/editorStore";
import type { GistItem } from "@/types";

interface GistViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterMode = "all" | "public" | "secret";

export const GistViewer: React.FC<GistViewerProps> = ({ isOpen, onClose }) => {
  const { gists, loading, error, loadGists, token } = useGistStore();
  const { setContent } = useEditorStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [previewGist, setPreviewGist] = useState<GistItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importConfirm, setImportConfirm] = useState<GistItem | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && token) {
      void loadGists();
    }
  }, [isOpen, token, loadGists]);

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (previewGist) {
          setPreviewGist(null);
          setPreviewContent(null);
        } else if (importConfirm) {
          setImportConfirm(null);
        } else {
          onClose();
        }
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, previewGist, importConfirm]);

  const filteredGists = useMemo(() => {
    return gists
      .filter((g) => {
        if (filter === "public") return g.isPublic;
        if (filter === "secret") return !g.isPublic;
        return true;
      })
      .filter((g) => {
        const q = searchQuery.toLowerCase();
        return (
          g.description.toLowerCase().includes(q) ||
          g.files.some((f) => f.filename.toLowerCase().includes(q))
        );
      });
  }, [gists, filter, searchQuery]);

  const handlePreview = async (gist: GistItem) => {
    setPreviewGist(gist);
    setPreviewLoading(true);
    setPreviewContent(null);
    try {
      const { gistService } = await import("@/services/gistService");
      gistService.setToken(token!);
      const detail = await gistService.getGist(gist.id);
      const firstFile = Object.values(detail.files as Record<string, { content?: string }>)[0];
      setPreviewContent(firstFile?.content ?? "(empty)");
    } catch {
      setPreviewContent("プレビューの読み込みに失敗しました。");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImport = async (gist: GistItem) => {
    try {
      const { gistService } = await import("@/services/gistService");
      gistService.setToken(token!);
      const detail = await gistService.getGist(gist.id);
      const firstFile = Object.values(detail.files as Record<string, { content?: string }>)[0];
      if (firstFile?.content) {
        setContent(firstFile.content);
      }
      // Gist と文書を紐付け、更新日時を同期
      const { currentDocumentId, updateDocumentMeta } = useEditorStore.getState();
      if (currentDocumentId) {
        await updateDocumentMeta(currentDocumentId, {
          gistId: gist.id,
          gistUpdatedAt: detail.updated_at ?? gist.updatedAt,
        });
      }
      setImportConfirm(null);
      onClose();
    } catch {
      alert("インポートに失敗しました。");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "たった今";
    if (diffMins < 60) return `${diffMins}分前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}時間前`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString("ja-JP");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gist-viewer-title"
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-gray-700 bg-gray-800 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <h2 id="gist-viewer-title" className="text-lg font-semibold text-white">
            My Gists
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 transition-colors hover:bg-gray-700"
            aria-label="閉じる"
          >
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3 border-b border-gray-700 px-6 py-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search gists..."
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            {(["all", "public", "secret"] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === mode
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {mode === "all" ? "All" : mode === "public" ? "Public" : "Secret"}
              </button>
            ))}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => void loadGists()}
              disabled={loading}
              className="text-xs text-gray-400 hover:text-white disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {error && (
            <div className="mb-3 rounded-lg border border-red-600/30 bg-red-600/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading && gists.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">
              <div className="mx-auto mb-3 h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              Gist を読み込み中...
            </div>
          )}

          {!loading && filteredGists.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">
              {gists.length === 0 ? "Gist がありません。" : "一致する Gist がありません。"}
            </div>
          )}

          <div className="space-y-2">
            {filteredGists.map((gist) => (
              <div
                key={gist.id}
                className="rounded-lg border border-gray-700 bg-gray-750 p-3 transition-colors hover:border-gray-600 hover:bg-gray-700/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-white">
                        {gist.files[0]?.filename || "(no file)"}
                      </span>
                      <span
                        className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          gist.isPublic
                            ? "bg-green-600/20 text-green-400"
                            : "bg-yellow-600/20 text-yellow-400"
                        }`}
                      >
                        {gist.isPublic ? "PUBLIC" : "SECRET"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-400">
                      {gist.description}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">
                      {formatDate(gist.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handlePreview(gist)}
                    className="rounded border border-gray-600 px-2.5 py-1 text-xs text-gray-300 transition-colors hover:bg-gray-600"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportConfirm(gist)}
                    className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Import
                  </button>
                  <a
                    href={gist.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-gray-600 px-2.5 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-600 hover:text-white"
                    title="GitHub で開く"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-700 px-6 py-3">
          <span className="text-xs text-gray-500">
            {filteredGists.length} / {gists.length} gists
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {previewGist && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewGist(null);
              setPreviewContent(null);
            }
          }}
        >
          <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {previewGist.files[0]?.filename}
                </h3>
                <p className="text-xs text-gray-400">{previewGist.description}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewGist(null);
                  setPreviewContent(null);
                }}
                className="rounded p-1 transition-colors hover:bg-gray-700"
              >
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {previewLoading ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  <div className="mx-auto mb-3 h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  読み込み中...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-300">
                  {previewContent}
                </pre>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-700 px-6 py-3">
              <button
                type="button"
                onClick={() => {
                  setPreviewGist(null);
                  setPreviewContent(null);
                }}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewGist(null);
                  setPreviewContent(null);
                  setImportConfirm(previewGist);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Confirm Modal */}
      {importConfirm && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setImportConfirm(null);
          }}
        >
          <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
            <div className="px-6 py-4">
              <h3 className="text-base font-semibold text-white">Import Gist</h3>
              <p className="mt-2 text-sm text-gray-400">
                インポートすると現在の文書の内容が上書きされます。未保存の変更は失われます。
              </p>
              <div className="mt-3 rounded-lg border border-gray-700 bg-gray-900 p-3">
                <p className="text-sm font-medium text-white">
                  {importConfirm.files[0]?.filename}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {importConfirm.description}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-700 px-6 py-3">
              <button
                type="button"
                onClick={() => setImportConfirm(null)}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleImport(importConfirm)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
