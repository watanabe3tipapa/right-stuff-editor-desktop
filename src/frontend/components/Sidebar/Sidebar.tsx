import React, { useEffect, useMemo, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useTemplateStore } from "@/stores/templateStore";
import { useDocumentFilterStore } from "@/stores/documentFilterStore";
import { useCommandPaletteStore } from "@/stores/commandPaletteStore";
import { useGistStore } from "@/stores/gistStore";
import { useASMStore } from "@/stores/asmStore";
import { extractSummary } from "@/utils/markdown";
import { cosineSimilarityTexts } from "@/utils/similarity";
import { generateDocumentSummary } from "@/utils/documentAI";
import { supportsAsm } from "@/utils/capabilities";
import { WritingStatsWidget } from "@/components/Stats";
import { DocumentQuickPreview } from "./DocumentQuickPreview";
import type { EditorDocument } from "@/types";

interface SidebarProps {
  className?: string;
  onOpenTemplateSelector?: () => void;
  onOpenVersionHistory?: (docUuid: string) => void;
  onOpenBulkExport?: () => void;
  onToggleAsm?: () => void;
}

const HOUR = 60 * 60 * 1000;

export const Sidebar: React.FC<SidebarProps> = ({
  className = "",
  onOpenTemplateSelector,
  onOpenVersionHistory,
  onOpenBulkExport,
  onToggleAsm,
}) => {
  const {
    documents,
    currentDocumentId,
    createDocument,
    openDocument,
    deleteDocument,
    duplicateDocument,
    updateDocumentTitle,
    updateDocumentMeta,
  } = useEditorStore();
  const { load: loadTemplates } = useTemplateStore();
  const { filter, density, setFilter } = useDocumentFilterStore();
  const { open: openCommandPalette } = useCommandPaletteStore();
  const { gists, isAuthenticated, loadGists } = useGistStore();
  const { skills: asmSkills, listInstalled: asmListInstalled } = useASMStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("updatedDesc");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [aiBusyId, setAiBusyId] = useState<string | null>(null);
  const [asmExpanded, setAsmExpanded] = useState(false);

  const asmSupported = useMemo(() => supportsAsm(), []);
  const installedSkills = useMemo(
    () => asmSkills.filter((s) => s.installed),
    [asmSkills],
  );

  useEffect(() => {
    if (!asmSupported) return;
    void asmListInstalled();
  }, [asmSupported, asmListInstalled]);

  const currentDoc = documents.find((d) => d.id === currentDocumentId);

  const isRecent = (doc: EditorDocument) =>
    Date.now() - new Date(doc.updatedAt).getTime() <= 24 * HOUR;

  const recentDocs = useMemo(
    () =>
      documents
        .filter(isRecent)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3),
    [documents],
  );

  const filteredDocuments = useMemo(() => {
    let list = documents.slice();

    if (filter === "recent") list = list.filter(isRecent);
    else if (filter === "done") list = list.filter((d) => d.status === "done");
    else if (filter === "gist") list = list.filter((d) => !!d.gistId);
    else if (filter === "draft-only") list = list.filter((d) => d.status !== "done");

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (doc) =>
          (doc.title || "Untitled").toLowerCase().includes(query) ||
          doc.content.toLowerCase().includes(query),
      );
    }

    return list.sort((a, b) => {
      switch (sortBy) {
        case "updatedAsc":
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case "createdDesc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "createdAsc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "titleAsc":
          return (a.title || "Untitled").localeCompare(b.title || "Untitled");
        case "titleDesc":
          return (b.title || "Untitled").localeCompare(a.title || "Untitled");
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [documents, filter, searchQuery, sortBy]);

  const relatedDocs = useMemo(() => {
    if (!currentDoc) return [];
    const target = currentDoc.title + "\n" + currentDoc.content;
    return documents
      .filter((d) => d.id !== currentDoc.id)
      .map((d) => ({
        d,
        score: cosineSimilarityTexts(target, d.title + "\n" + d.content),
      }))
      .filter((x) => x.score > 0.01)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [currentDoc, documents]);

  const densityClass = useMemo(() => {
    switch (density) {
      case "compact":
        return { card: "p-1.5", title: "text-[11px]", summary: "text-[10px] line-clamp-1", date: "text-[9px]" };
      case "comfortable":
        return { card: "p-4", title: "text-sm", summary: "text-xs line-clamp-2", date: "text-xs" };
      default:
        return { card: "p-3", title: "text-sm", summary: "text-xs line-clamp-2", date: "text-xs" };
    }
  }, [density]);

  const handleCreateDocument = () => {
    if (newDocTitle.trim()) {
      createDocument(newDocTitle.trim());
      setNewDocTitle("");
      setIsCreating(false);
    }
  };

  const handleStartEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const handleSaveEdit = () => {
    if (editingId && editingTitle.trim()) {
      updateDocumentTitle(editingId, editingTitle.trim());
      setEditingId(null);
      setEditingTitle("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: "create" | "edit") => {
    if (e.key === "Enter") {
      if (action === "create") {
        handleCreateDocument();
      } else {
        handleSaveEdit();
      }
    }
    if (e.key === "Escape") {
      setIsCreating(false);
      setEditingId(null);
      setNewDocTitle("");
      setEditingTitle("");
    }
  };

  const openTemplateSelector = () => {
    void loadTemplates();
    onOpenTemplateSelector?.();
  };

  const handleGistSync = async (doc: EditorDocument) => {
    if (!isAuthenticated) {
      void loadGists();
      window.alert("Gist連携には設定画面での認証が必要です。");
      return;
    }
    void loadGists();
    const target = gists.find((g) => g.id === doc.gistId);
    if (!target) {
      window.alert("この文書に紐づくGistが見つかりません。先に Gist にアップロードしてください。");
      return;
    }
    if (!window.confirm(`既存のGist「${target.description}」を上書き更新しますか？`)) return;
    try {
      const result = await useGistStore.getState().uploadGist(
        {
          filename: target.files[0]?.filename ?? "document.md",
          content: doc.content,
          description: doc.title || "Untitled",
          isPublic: target.isPublic,
        },
        doc.gistId,
      );
      await updateDocumentMeta(doc.id, {
        gistId: result.gistId,
        gistUpdatedAt: new Date().toISOString(),
      });
      window.dispatchEvent(
        new CustomEvent("gist-upload-success", {
          detail: { htmlUrl: result.htmlUrl, isNew: false },
        }),
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Gist同期に失敗しました。");
    }
  };

  const handleAiSummarize = async (doc: EditorDocument) => {
    setAiBusyId(doc.id);
    try {
      const result = await generateDocumentSummary(doc.title, doc.content);
      await updateDocumentMeta(doc.id, {
        summary: result.summary,
        tags: result.tags,
      });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "AI要約に失敗しました。LLMの設定を確認してください。");
    } finally {
      setAiBusyId(null);
    }
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden bg-gray-800 ${className}`}>
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-100">Documents</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
              title="新しい文書"
              aria-label="新しい文書を作成"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="rounded bg-gray-700/80 px-2 py-1.5 text-gray-200 hover:bg-gray-600"
          >
            ＋ 新規
          </button>
          <button
            type="button"
            onClick={() => {
              if (recentDocs.length > 0) openDocument(recentDocs[0].id);
              else createDocument();
            }}
            className="rounded bg-gray-700/80 px-2 py-1.5 text-gray-200 hover:bg-gray-600"
            title="直近24時間に編集した文書を開く"
          >
            続きから
          </button>
          <button
            type="button"
            onClick={openTemplateSelector}
            className="rounded bg-gray-700/80 px-2 py-1.5 text-gray-200 hover:bg-gray-600"
          >
            テンプレート
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="p-3 border-b border-gray-700">
          <input
            type="text"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "create")}
            onBlur={() => {
              if (!newDocTitle.trim()) {
                setIsCreating(false);
              }
            }}
            placeholder="文書名を入力"
            aria-label="新しい文書の名前"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCreateDocument}
              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewDocTitle("");
              }}
              className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="p-3 border-b border-gray-700 space-y-2">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="文書を検索…（Ctrl+K）"
            aria-label="文書を検索"
            className="w-full pl-8 pr-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="文書の並び替え"
          className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="updatedDesc">更新日（新しい順）</option>
          <option value="updatedAsc">更新日（古い順）</option>
          <option value="createdDesc">作成日（新しい順）</option>
          <option value="createdAsc">作成日（古い順）</option>
          <option value="titleAsc">タイトル（昇順）</option>
          <option value="titleDesc">タイトル（降順）</option>
        </select>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["all", "すべて"],
              ["recent", "24h"],
              ["done", "完了"],
              ["gist", "Gist"],
              ["draft-only", "執筆中"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${
                filter === key ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {recentDocs.length > 0 && (
          <div className="border-b border-gray-700 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              続きから書く
            </div>
            <div className="space-y-1">
              {recentDocs.map((doc) => (
                <button
                  key={`recent-${doc.id}`}
                  type="button"
                  onClick={() => openDocument(doc.id)}
                  className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                    doc.id === currentDocumentId ? "bg-gray-700 text-white" : "hover:bg-gray-700/60 text-gray-200"
                  }`}
                >
                  <div className="truncate">{doc.title || "Untitled"}</div>
                  <div className="text-[10px] text-gray-500">
                    更新 {new Date(doc.updatedAt).toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <svg
              className="w-12 h-12 mb-3 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm text-center">No documents yet</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-2 text-sm text-blue-400 hover:text-blue-300"
            >
              Create your first document
            </button>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <p className="text-sm text-center">検索結果が見つかりませんでした</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setFilter("all");
              }}
              className="mt-2 text-sm text-blue-400 hover:text-blue-300"
            >
              検索をクリア
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`group relative rounded-lg transition-colors ${
                  doc.id === currentDocumentId
                    ? "bg-gray-700 border border-gray-600"
                    : "hover:bg-gray-700/50 border border-transparent"
                }`}
                onMouseEnter={() => {
                  setHoveredId(doc.id);
                }}
                onMouseLeave={() => {
                  if (hoveredId === doc.id) setHoveredId(null);
                }}
              >
                {editingId === doc.id ? (
                  <div className="p-3">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, "edit")}
                      onBlur={handleSaveEdit}
                      className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="文書名を変更"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`block w-full text-left ${densityClass.card}`}
                    onClick={() => openDocument(doc.id)}
                    onKeyDown={(e) => {
                      if (e.key === " ") {
                        e.preventDefault();
                        setHoveredId(doc.id);
                      }
                    }}
                    aria-current={doc.id === currentDocumentId ? "page" : undefined}
                    aria-label={`文書を開く: ${doc.title || "Untitled"}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className={`${densityClass.title} font-medium text-gray-100 truncate`}>
                          {doc.title || "Untitled"}
                        </h3>
                        {doc.summary ? (
                          <p className={`${densityClass.summary} text-blue-200/80 mt-1`}>
                            {doc.summary}
                          </p>
                        ) : (
                          <p className={`${densityClass.summary} text-gray-500 mt-1`}>
                            {extractSummary(doc.content, 80)}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {doc.tags.slice(0, 2).map((t) => (
                                <span key={t} className="rounded bg-gray-600 px-1.5 py-0.5 text-[9px] text-gray-200">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          {doc.status === "done" && (
                            <span className="rounded bg-green-600/30 px-1.5 py-0.5 text-[9px] text-green-300">完了</span>
                          )}
                          {doc.gistId && (
                            <span className="rounded bg-blue-600/30 px-1.5 py-0.5 text-[9px] text-blue-300">Gist</span>
                          )}
                          {doc.id === currentDocumentId && (
                            <span className="text-[9px] text-gray-500">（編集中）</span>
                          )}
                          <p className={`${densityClass.date} text-gray-600 ml-auto`} title="最終更新日時">
                            更新 {new Date(doc.updatedAt).toLocaleDateString("ja-JP")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                {editingId !== doc.id && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleAiSummarize(doc);
                      }}
                      disabled={aiBusyId === doc.id}
                      className="p-1 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                      title="AIで要約・タグ付け"
                      aria-label="AIで要約・タグ付け"
                    >
                      {aiBusyId === doc.id ? (
                        <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void updateDocumentMeta(doc.id, {
                          status: doc.status === "done" ? "draft" : "done",
                        });
                      }}
                      className="p-1 hover:bg-gray-600 rounded transition-colors"
                      title={doc.status === "done" ? "執筆中に戻す" : "完了にする"}
                      aria-label={doc.status === "done" ? "執筆中に戻す" : "完了にする"}
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenVersionHistory?.(doc.id);
                      }}
                      className="p-1 hover:bg-gray-600 rounded transition-colors"
                      title="履歴から復元"
                      aria-label="履歴から復元"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    {doc.gistId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleGistSync(doc);
                        }}
                        className="p-1 hover:bg-gray-600 rounded transition-colors"
                        title="Gistと同期"
                        aria-label="Gistと同期"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateDocument(doc.id);
                      }}
                      className="p-1 hover:bg-gray-600 rounded transition-colors"
                      title="複製"
                      aria-label={`文書を複製: ${doc.title || "Untitled"}`}
                    >
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(doc.id, doc.title);
                      }}
                      className="p-1 hover:bg-gray-600 rounded transition-colors"
                      title="名前を変更"
                      aria-label={`文書名を変更: ${doc.title || "Untitled"}`}
                    >
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `Are you sure you want to delete "${doc.title || "Untitled"}"?`,
                          )
                        ) {
                          deleteDocument(doc.id);
                        }
                      }}
                      className="p-1 hover:bg-gray-600 rounded transition-colors"
                      title="削除"
                      aria-label={`文書を削除: ${doc.title || "Untitled"}`}
                    >
                      <svg
                        className="w-4 h-4 text-gray-400 hover:text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                )}
                {hoveredId === doc.id && (
                  <DocumentQuickPreview
                    title={doc.title}
                    content={doc.content}
                    visible
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {relatedDocs.length > 0 && (
          <div className="border-t border-gray-700 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              関連文書
            </div>
            <div className="space-y-1">
              {relatedDocs.map(({ d, score }) => (
                <button
                  key={`related-${d.id}`}
                  type="button"
                  onClick={() => openDocument(d.id)}
                  className="block w-full rounded px-2 py-1 text-left text-xs text-gray-300 hover:bg-gray-700/60"
                >
                  <span className="truncate">{d.title || "Untitled"}</span>
                  <span className="ml-1 text-[9px] text-gray-500">{Math.round(score * 100)}%</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {asmSupported && installedSkills.length > 0 && (
          <div className="border-t border-gray-700 p-3">
            <button
              type="button"
              onClick={() => setAsmExpanded((v) => !v)}
              aria-expanded={asmExpanded}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                スキル ({installedSkills.length})
              </span>
              <span className="text-gray-500">{asmExpanded ? "▲" : "▼"}</span>
            </button>
            {asmExpanded && (
              <div className="mt-2 space-y-1">
                {installedSkills.map((skill) => (
                  <div
                    key={skill.name}
                    className="flex items-center justify-between rounded px-2 py-1 text-xs text-gray-300 hover:bg-gray-700/60"
                  >
                    <span className="truncate">{skill.name}</span>
                    <span className="ml-2 text-[9px] text-gray-500">v{skill.version}</span>
                  </div>
                ))}
                {onToggleAsm && (
                  <button
                    type="button"
                    onClick={onToggleAsm}
                    className="mt-1 w-full rounded bg-gray-700 px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-600"
                  >
                    管理パネルを開く
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-700 p-3">
          <WritingStatsWidget />
        </div>
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-gray-700 text-xs text-gray-500 flex items-center justify-between">
        <p>
          {searchQuery.trim()
            ? `${filteredDocuments.length} / ${documents.length}`
            : documents.length}{" "}
          document{documents.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenBulkExport}
            className="rounded bg-gray-700 px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-600"
          >
            一括出力
          </button>
          <button
            type="button"
            onClick={openCommandPalette}
            className="rounded bg-gray-700 px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-600"
            title="検索・コマンド (Ctrl+K)"
          >
            ⌘K
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
