import React, { useEffect, useMemo, useState } from "react";
import { desktop } from "@/utils/desktop";
import { htmlToMarkdown } from "@/utils/htmlToMarkdown";
import type { NotesFolder, NotesNote } from "@shared/types";

interface NotesBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNote: (input: {
    notesId: string;
    title: string;
    content: string;
    account: string;
    folder: string;
    readOnly?: boolean;
    readOnlyReason?: string;
  }) => void;
}

export const NotesBrowser: React.FC<NotesBrowserProps> = ({
  isOpen,
  onClose,
  onOpenNote,
}) => {
  const [folders, setFolders] = useState<NotesFolder[]>([]);
  const [selected, setSelected] = useState<NotesFolder | null>(null);
  const [notes, setNotes] = useState<NotesNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<string>("unknown");
  const [query, setQuery] = useState("");

  const loadFolders = async () => {
    setLoading(true);
    setError(null);
    try {
      const health = await desktop.notesHealth();
      setPermission(health.permission);
      if (health.error) setError(health.error);
      const result = await desktop.notesFolders();
      setFolders(result);
      const preferred =
        result.find((folder) => folder.name === "Notes") ??
        result.find((folder) => folder.name === "Right-Stuff Test") ??
        result[0] ??
        null;
      setSelected((current) => current ?? preferred);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (folders.length) return;
    void loadFolders();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selected) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void desktop
      .notesList(selected.account, selected.name, 300)
      .then((result) => {
        if (!cancelled) setNotes(result);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((note) => note.title.toLowerCase().includes(q));
  }, [notes, query]);

  const openNote = async (note: NotesNote) => {
    setOpeningId(note.id);
    setError(null);
    try {
      const result = await desktop.notesRead(note.id);
      onOpenNote({
        notesId: note.id,
        title: result.note.title,
        content: htmlToMarkdown(result.html),
        account: note.account,
        folder: note.folder,
        readOnly: result.note.readOnly,
        readOnlyReason: result.note.readOnlyReason,
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setOpeningId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <section
        className="flex h-[80vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Apple Notes"
      >
        <aside className="flex w-64 flex-col border-r border-gray-700 bg-gray-800">
          <header className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Apple Notes</h2>
            <button
              type="button"
              onClick={() => void loadFolders()}
              className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
              title="再読み込み"
            >
              ↻
            </button>
          </header>
          <div className="flex-1 overflow-auto p-2">
            {folders.map((folder) => (
              <button
                key={`${folder.account}/${folder.name}`}
                type="button"
                onClick={() => setSelected(folder)}
                className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                  selected?.account === folder.account && selected?.name === folder.name
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                <span className="truncate">{folder.name}</span>
                <span className="ml-2 text-xs opacity-70">{folder.noteCount}</span>
              </button>
            ))}
            {!folders.length && !loading && (
              <p className="px-2 py-4 text-xs leading-5 text-gray-400">
                フォルダがありません。Notes へのアクセスを許可してください。
              </p>
            )}
          </div>
          {permission !== "granted" && (
            <div className="border-t border-gray-700 p-3">
              <p className="mb-2 text-xs text-amber-300">
                Notes の自動化権限: {permission}
              </p>
              <button
                type="button"
                onClick={() => void desktop.requestNotesPermission().then(loadFolders)}
                className="w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-500"
              >
                アクセスを許可
              </button>
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-gray-700 px-4 py-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white">
                {selected ? selected.name : "ノートを選択"}
              </h3>
              <p className="text-xs text-gray-400">
                {selected ? `${selected.account} · 最新 ${notes.length} 件` : "iCloud"}
              </p>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ノートを検索"
              className="ml-auto w-48 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800"
            >
              閉じる
            </button>
          </header>

          {error && (
            <div className="border-b border-red-900/60 bg-red-950/40 px-4 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-auto">
            {loading && <p className="p-4 text-sm text-gray-400">読み込み中…</p>}
            {!loading && !filtered.length && (
              <p className="p-4 text-sm text-gray-400">ノートがありません。</p>
            )}
            {filtered.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => void openNote(note)}
                disabled={openingId !== null}
                className="flex w-full items-start gap-3 border-b border-gray-800 px-4 py-3 text-left hover:bg-gray-800/70 disabled:opacity-60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-100">
                    {note.title || "(無題)"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {note.modifiedAt}
                  </p>
                </div>
                {openingId === note.id && (
                  <span className="text-xs text-blue-300">開いています…</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
