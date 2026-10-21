import React, { useState, useEffect, useRef } from "react";
import { useGistStore } from "@/stores/gistStore";
import { useEditorStore } from "@/stores/editorStore";

interface GistUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GistUploadModal: React.FC<GistUploadModalProps> = ({ isOpen, onClose }) => {
  const { uploadGist, gists, isAuthenticated, loadGists } = useGistStore();
  const { content, currentDocumentId, documents, updateDocumentMeta } = useEditorStore();
  const [filename, setFilename] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingGistId, setExistingGistId] = useState<string>("");
  const dialogRef = useRef<HTMLDivElement>(null);

  const currentDocument = documents.find((d) => d.id === currentDocumentId);

  useEffect(() => {
    if (isOpen && currentDocument) {
      const safeTitle = currentDocument.title
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();
      setFilename(`${safeTitle}.md`);
      setDescription(currentDocument.title);
      setExistingGistId(currentDocument.gistId ?? "");
    }
  }, [isOpen, currentDocument]);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      void loadGists();
    }
  }, [isOpen, isAuthenticated, loadGists]);

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled])'
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
  }, [isOpen, onClose]);

  const handleUpload = async () => {
    if (!filename.trim()) {
      setError("ファイル名を入力してください。");
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadGist(
        {
          filename: filename.trim(),
          content,
          description: description.trim() || filename.trim(),
          isPublic,
        },
        existingGistId || undefined,
      );
      if (currentDocumentId) {
        await updateDocumentMeta(currentDocumentId, {
          gistId: result.gistId,
          gistUpdatedAt: new Date().toISOString(),
        });
      }
      window.dispatchEvent(
        new CustomEvent("gist-upload-success", {
          detail: { htmlUrl: result.htmlUrl, isNew: result.isNew },
        })
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました。");
    } finally {
      setIsUploading(false);
    }
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
        aria-labelledby="gist-upload-title"
        className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <h2 id="gist-upload-title" className="text-lg font-semibold text-white">
            Upload to Gist
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

        <div className="space-y-4 p-6">
          <div>
            <label htmlFor="gist-mode" className="mb-1 block text-sm font-medium text-gray-300">
              アップロード先
            </label>
            <select
              id="gist-mode"
              value={existingGistId}
              onChange={(event) => setExistingGistId(event.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">新規 Gist を作成</option>
              {gists.map((g) => (
                <option key={g.id} value={g.id}>
                  上書き: {g.description} ({g.isPublic ? "public" : "secret"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="gist-filename" className="mb-1 block text-sm font-medium text-gray-300">
              Filename
            </label>
            <input
              id="gist-filename"
              type="text"
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              placeholder="my-document.md"
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 font-mono text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="gist-description" className="mb-1 block text-sm font-medium text-gray-300">
              Description
            </label>
            <input
              id="gist-description"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Notes from Right-Stuff Editor Dash"
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                isPublic ? "bg-blue-600" : "bg-gray-600"
              }`}
              role="switch"
              aria-checked={isPublic}
              aria-label="公開設定"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  isPublic ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-sm text-gray-300">この Gist を公開する</span>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-700 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || !filename.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
};
