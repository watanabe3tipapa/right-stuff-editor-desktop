import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "./stores/editorStore";
import { useThemeStore, applyTheme } from "./stores/themeStore";
import { useShortcutStore, matchesShortcut } from "./stores/shortcutStore";
import { useViewStore } from "./stores/viewStore";
import { useSystemStatus, formatBytes } from "./hooks/useSystemStatus";
import { useCommandPaletteStore } from "./stores/commandPaletteStore";
import { useBackupSettingsStore } from "./stores/backupSettingsStore";
import { CommandPalette } from "./components/CommandPalette";
import { TemplateSelectorModal } from "./components/Templates";
import { VersionHistoryModal } from "./components/History";
import { BulkExportModal } from "./components/BulkExport";
import { desktop } from "./utils/desktop";
import { LexicalEditor } from "./components/Editor/LexicalEditor";
import { MarkdownPreview } from "./components/Preview/MarkdownPreview";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { ChatPanel } from "./components/Chat/ChatPanel";
import { ASMPanel } from "./components/ASM/ASMPanel";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { Settings } from "./components/Settings/Settings";
import { WTermTerminal } from "./components/Terminal/WTermTerminal";
import { GistUploadModal } from "./components/Gist/GistUploadModal";
import { NotesBrowser } from "./components/Notes/NotesBrowser";
import { GistViewer } from "./components/Gist/GistViewer";
import { HelpModal } from "./components/Help/HelpModal";
import { launchMdv } from "./utils/mdvConnection";
import { supportsAsm } from "./utils/capabilities";
import { useFocusTimeTracker } from "./hooks/useFocusTimeTracker";

type ViewMode = "split" | "editor" | "preview" | "chat";

const ONBOARDING_KEY = "right-stuff-editor-dash-onboarding-complete";

const App: React.FC = () => {
  const {
    mode: editorMode,
    content,
    autoSaveEnabled,
    autoSaveInterval,
    lastAutoSaved,
    lastSaved,
    isAutoSaving,
    isDirty,
    saveError,
    saveStatus,
    isInitialized,
    initialize,
    triggerAutoSave,
    saveDocument,
    setMode,
    createDocument,
    currentDocumentId,
    documents,
    openNotesDocument,
    setContent,
  } = useEditorStore();
  const { resolvedTheme } = useThemeStore();
  const { getShortcut } = useShortcutStore();
  const { zenMode, toggleZenMode, toggleTypewriterMode } = useViewStore();
  const { isOnline, storage } = useSystemStatus();
  const { isOpen: paletteOpen, open: openPalette, close: closePalette } = useCommandPaletteStore();
  useFocusTimeTracker();
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [asmOpen, setAsmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [gistUploadOpen, setGistUploadOpen] = useState(false);
  const [gistViewerOpen, setGistViewerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [versionHistoryDocId, setVersionHistoryDocId] = useState<string | null>(null);
  const [bulkExportOpen, setBulkExportOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [gistToast, setGistToast] = useState<{ url: string; isNew: boolean } | null>(null);
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [mdvStatus, setMdvStatus] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => {
      setIsMobile(mediaQuery.matches);
      if (mediaQuery.matches) setSidebarOpen(false);
    };
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (isInitialized && window.localStorage.getItem(ONBOARDING_KEY) !== "true") {
      setShowOnboarding(true);
    }
  }, [isInitialized]);

  const completeOnboarding = () => {
    window.localStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
  };

  const handleCreateFirstDocument = () => {
    createDocument("My first note");
    completeOnboarding();
  };

  const handleOpenMdv = async () => {
    const outcome = await launchMdv();
    if (outcome.ok && outcome.url) {
      await desktop.openExternal(outcome.url);
      setMdvStatus("mdv プレビューを開きました");
    } else {
      setMdvStatus(outcome.error ?? "mdv を起動できませんでした");
    }
    setTimeout(() => setMdvStatus(null), 5000);
  };

  const handleKeyAction = useCallback(
    (action: string) => {
      switch (action) {
        case "saveDocument":
          void saveDocument();
          break;
        case "togglePreview":
          setViewMode((previous) => (previous === "preview" ? "split" : "preview"));
          break;
        case "toggleSidebar":
          setSidebarOpen((previous) => !previous);
          break;
        case "toggleChat":
          setChatOpen((previous) => !previous);
          break;
        case "toggleAsm":
          if (supportsAsm()) setAsmOpen((previous) => !previous);
          break;
        case "openSettings":
          setSettingsOpen(true);
          break;
        case "toggleMode":
          setMode(editorMode === "rich" ? "markdown" : "rich");
          break;
        case "newDocument":
          createDocument();
          break;
        case "toggleTerminal":
          setTerminalOpen((previous) => !previous);
          break;
        case "toggleHelp":
          setHelpOpen((previous) => !previous);
          break;
        case "toggleZen":
          toggleZenMode();
          break;
        case "toggleTypewriter":
          toggleTypewriterMode();
          break;
        case "openCommandPalette":
          openPalette();
          break;
        default:
          break;
      }
    },
    [createDocument, editorMode, saveDocument, setMode, toggleZenMode, toggleTypewriterMode, openPalette],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      const shortcuts = [
        "saveDocument",
        "togglePreview",
        "toggleSidebar",
        "toggleChat",
        "toggleAsm",
        "openSettings",
        "toggleMode",
        "newDocument",
        "toggleTerminal",
        "toggleHelp",
        "toggleZen",
        "toggleTypewriter",
        "openCommandPalette",
      ];
      for (const action of shortcuts) {
        const shortcut = getShortcut(action);
        if (shortcut && matchesShortcut(event, shortcut)) {
          event.preventDefault();
          handleKeyAction(action);
          return;
        }
      }

      // "/" focuses the sidebar search (or opens the palette if not typing)
      if (event.key === "/" && !isTyping && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        openPalette();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [getShortcut, handleKeyAction, openPalette]);

  useEffect(() => {
    if (!zenMode) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        toggleZenMode();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [zenMode, toggleZenMode]);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const handleGistUploadSuccess = (event: CustomEvent<{ htmlUrl: string; isNew: boolean }>) => {
      setGistToast({ url: event.detail.htmlUrl, isNew: event.detail.isNew });
      setTimeout(() => setGistToast(null), 5000);
    };
    window.addEventListener("gist-upload-success", handleGistUploadSuccess as EventListener);
    return () => window.removeEventListener("gist-upload-success", handleGistUploadSuccess as EventListener);
  }, []);

  useEffect(() => {
    const handleLocalFileChange = (event: Event) => {
      const detail = (event as CustomEvent<{ name: string | null }>).detail;
      setLocalFileName(detail.name);
    };
    window.addEventListener("local-file-changed", handleLocalFileChange as EventListener);
    return () => window.removeEventListener("local-file-changed", handleLocalFileChange as EventListener);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (useEditorStore.getState().isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!autoSaveEnabled || isAutoSaving) return undefined;
    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setInterval(() => {
      if (useEditorStore.getState().isDirty) void triggerAutoSave();
    }, autoSaveInterval);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [autoSaveEnabled, autoSaveInterval, isAutoSaving, triggerAutoSave]);

  // 未保存内容のリカバリスナップショット
  useEffect(() => {
    const snapshot = () => {
      const state = useEditorStore.getState();
      if (!state.isDirty || !state.currentDocumentId) return;
      const doc = state.documents.find((item) => item.id === state.currentDocumentId);
      void desktop
        .recoverySave(state.currentDocumentId, doc?.title ?? "", state.content)
        .catch(() => undefined);
    };
    const timer = window.setInterval(snapshot, 15000);
    window.addEventListener("beforeunload", snapshot);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("beforeunload", snapshot);
    };
  }, []);

  useEffect(() => {
    if (!isInitialized || !currentDocumentId) return;
    const key = `recovery-checked:${currentDocumentId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void (async () => {
      const snapshot = await desktop.recoveryLatest(currentDocumentId).catch(() => null);
      if (!snapshot) return;
      if (snapshot.content === useEditorStore.getState().content) {
        await desktop.recoveryClear(currentDocumentId).catch(() => undefined);
        return;
      }
      const restore = window.confirm(
        "前回の未保存内容が見つかりました。復元しますか？\n（キャンセルすると破棄されます）",
      );
      if (restore) {
        setContent(snapshot.content);
      } else {
        await desktop.recoveryClear(currentDocumentId).catch(() => undefined);
      }
    })();
  }, [isInitialized, currentDocumentId, setContent]);

  // 執筆統計（文字数差分）を日次で記録
  useEffect(() => {
    const unsub = useEditorStore.subscribe((state, prev) => {
      if (state.content.length === prev.content.length) return;
      const delta = state.content.length - prev.content.length;
      if (delta <= 0) return;
      const today = new Date().toISOString().slice(0, 10);
      void desktop.statsBump(today, delta, 0).catch(() => {});
    });
    return unsub;
  }, []);

  // 自動バックアップ
  const backupEnabled = useBackupSettingsStore((state) => state.enabled);
  const backupInterval = useBackupSettingsStore((state) => state.intervalMinutes);
  useEffect(() => {
    if (!backupEnabled) return undefined;
    const run = async () => {
      const s = useBackupSettingsStore.getState();
      await desktop.workspaceBackup(s.format).catch(() => undefined);
      useBackupSettingsStore.getState().markBackup();
    };
    const timer = window.setInterval(() => void run(), backupInterval * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [backupEnabled, backupInterval]);

  const formatLastSaved = (date: Date | null) => {
    if (!date) return "未保存";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "たった今";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分前`;
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };

  const currentDocument = documents.find((document) => document.id === currentDocumentId);

  const renderEditorView = () => {
    if (!zenMode && viewMode === "preview") return null;
    if (currentDocument?.readOnly) {
      return (
        <section className="flex flex-1 min-w-0 flex-col" aria-label="読み取り専用のノート">
          <div className="border-b border-amber-800/60 bg-amber-950/40 px-4 py-2 text-xs text-amber-200">
            読み取り専用: {currentDocument.readOnlyReason ?? "このノートは直接編集できません"}
          </div>
          <textarea
            value={content}
            readOnly
            className="flex-1 w-full resize-none bg-gray-900 p-4 font-mono text-sm leading-6 text-gray-300 focus:outline-none"
          />
        </section>
      );
    }
    return (
      <section className="flex-1 flex flex-col min-w-0" aria-label="編集領域">
        {editorMode === "markdown" ? (
          <div className="flex-1 p-3 md:p-4">
            <label className="sr-only" htmlFor="markdown-editor">Markdown エディタ</label>
            <textarea
              id="markdown-editor"
              value={content}
              onChange={(event) => useEditorStore.getState().setContent(event.target.value)}
              className="w-full h-full min-h-[50vh] bg-gray-900 text-gray-100 p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-6"
              placeholder="Markdown を書き始める…"
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <LexicalEditor key={currentDocumentId ?? "new-document"} initialContent={content} />
          </div>
        )}
      </section>
    );
  };

  const renderPreviewView = () => {
    if (!zenMode && viewMode === "editor") return null;
    if (zenMode) return null;
    const isSplitView = viewMode === "split";
    return (
      <section className={`${isSplitView ? "hidden md:flex" : "flex"} flex-1 flex-col min-w-0 border-l border-gray-700`} aria-label="プレビュー">
        <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
          <span className="text-sm font-medium text-gray-300">Preview</span>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-900">
          <MarkdownPreview content={content} theme={resolvedTheme} />
        </div>
      </section>
    );
  };

  // ASM は Electron のみ。Web版では表示しない。
  const asmVisible = supportsAsm() && asmOpen;

  if (!isInitialized) {
    return (
      <main className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-6">
        <div className="text-center" role="status" aria-live="polite">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-300">保存済みの文書を読み込んでいます…</p>
        </div>
      </main>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-gray-900 text-gray-100 overflow-hidden">
      {isMobile && sidebarOpen && !zenMode && (
        <button type="button" className="fixed inset-0 z-30 cursor-default bg-black/60" aria-label="サイドバーを閉じる" onClick={() => setSidebarOpen(false)} />
      )}

      {sidebarOpen && !zenMode && (
        <aside className={isMobile ? "fixed top-0 left-0 z-40 w-72 h-dvh border-r border-gray-700 shadow-2xl" : "w-64 flex-shrink-0 border-r border-gray-700"} aria-label="文書一覧">
          <Sidebar
            onOpenTemplateSelector={() => setTemplateSelectorOpen(true)}
            onOpenVersionHistory={(id) => setVersionHistoryDocId(id)}
            onOpenBulkExport={() => setBulkExportOpen(true)}
            onToggleAsm={() => setAsmOpen((previous) => !previous)}
          />
        </aside>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        {!zenMode && (
          <header className="h-14 md:h-12 border-b border-gray-700 bg-gray-800 flex-shrink-0">
            <Toolbar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen((previous) => !previous)}
              chatOpen={chatOpen}
              onToggleChat={() => setChatOpen((previous) => !previous)}
              asmOpen={asmOpen}
              onToggleAsm={() => setAsmOpen((previous) => !previous)}
              terminalOpen={terminalOpen}
              onToggleTerminal={() => setTerminalOpen((previous) => !previous)}
              onOpenNotes={() => setNotesOpen(true)}
              onOpenGistUpload={() => setGistUploadOpen(true)}
              onOpenGistViewer={() => setGistViewerOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenMdv={() => void handleOpenMdv()}
            />
          </header>
        )}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {renderEditorView()}
          {renderPreviewView()}
        </div>
        {!zenMode && (
          <footer className="shrink-0 min-h-6 bg-gray-800 border-t border-gray-700 flex items-center gap-3 px-3 md:px-4 text-xs text-gray-400">
          <div className="flex min-w-0 items-center gap-2 md:gap-4" aria-live="polite">
            <span className="hidden sm:inline">{editorMode === "markdown" ? "Markdown" : "Rich Text"}</span>
            <span>{content.length.toLocaleString("ja-JP")}文字</span>
            <span className="hidden sm:inline">{content.split(/\s+/).filter(Boolean).length.toLocaleString("ja-JP")}語</span>
            {localFileName && (
              <span className="flex items-center gap-1 text-gray-300" title="ローカルファイル">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0zM9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1zM5 6h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1zm0 2.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1zm0 2.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1z"/></svg>
                <span className="truncate max-w-[160px]">{localFileName}</span>
              </span>
            )}
            {saveStatus === "saving" || isAutoSaving ? <span className="text-blue-300">保存中…</span> : saveStatus === "error" ? (
              <span className="flex items-center gap-2 text-red-300" role="alert"><span className="flex items-center gap-1"><svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span>{saveError ?? "保存に失敗しました。"}</span></span><button type="button" onClick={() => void saveDocument()} className="underline underline-offset-2 hover:text-white">再試行</button></span>
            ) : isDirty ? <span className="flex items-center gap-1 text-yellow-300"><svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg><span>未保存</span></span> : <span className="flex items-center gap-1 text-green-300"><svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg><span>保存済み · {formatLastSaved(lastAutoSaved ?? lastSaved)}</span></span>}
            {!isOnline && (
              <span className="flex items-center gap-1 text-amber-300" role="status" title="オフライン: Gist連携などのオンライン機能は利用できません">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M10.707 2.293a1 1 0 0 0-1.414 0l-7 7a1 1 0 0 0 1.414 1.414L4 10.414V13.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-2.586l2.293 2.293a1 1 0 0 0 1.414 0l7-7a1 1 0 0 0 0-1.414l-7-7zM4.5 9.914V13.5a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5V9.914l-3-3-3 3z"/></svg>
                <span>オフライン</span>
              </span>
            )}
            {storage.supported && (
              <span
                className={`hidden md:flex items-center gap-1 ${storage.ratio > 0.8 ? "text-amber-300" : ""}`}
                title={`ローカルストレージ使用量 (残り ${formatBytes(storage.quotaBytes - storage.usageBytes)})`}
              >
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3a.5.5 0 0 0 0 1H3v1.5h-.5a.5.5 0 0 0 0 1H3V8h-.5a.5.5 0 0 0 0 1H3v1.5h-.5a.5.5 0 0 0 0 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h.5zm6.5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5V4h.5a1 1 0 0 1 1 1v1.5h.5a.5.5 0 0 1 0 1H11V9h.5a.5.5 0 0 1 0 1H11v1.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h.5zM4 4.5A1.5 1.5 0 0 1 5.5 3h5A1.5 1.5 0 0 1 12 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 4 11.5v-7z"/></svg>
                <span>{formatBytes(storage.usageBytes)} / {formatBytes(storage.quotaBytes)}</span>
              </span>
            )}
            {mdvStatus && (
              <span className="flex items-center gap-2 text-blue-300" role="status">
                <span>✓</span>
                <span className="truncate max-w-[260px]">{mdvStatus}</span>
              </span>
            )}
            {gistToast && (
              <span className="flex items-center gap-2 text-green-300">
                <span>✓</span>
                <span>{gistToast.isNew ? " Uploaded" : " Updated"}</span>
                <a href={gistToast.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white truncate max-w-[200px]">
                  {gistToast.url.replace("https://gist.github.com/", "")}
                </a>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(gistToast.url)}
                  className="text-gray-400 hover:text-white"
                  title="URL をコピー"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={() => setHelpOpen(true)} className="flex items-center justify-center w-5 h-5 rounded-full border border-gray-600 text-xs font-semibold text-gray-300 hover:text-white hover:border-gray-400 transition-colors" aria-label="ショートカット一覧とヘルプを開く" title="ショートカット一覧とヘルプ (Ctrl+/)">
              ?
            </button>
            <button type="button" onClick={() => setSettingsOpen(true)} className="rounded p-1 text-gray-300 hover:text-white" aria-label="設定を開く" title="Settings (Ctrl+,)">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.421-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/></svg>
            </button>
            <span className="hidden sm:inline">Right-Stuff Editor Desktop</span>
          </div>
          </footer>
        )}
      </main>

      {!zenMode && (chatOpen || asmVisible) && (
        <aside className={isMobile ? "fixed inset-y-0 right-0 z-40 w-full max-w-sm border-l border-gray-700 bg-gray-900 shadow-2xl" : "border-l border-gray-700 flex-shrink-0"} aria-label="補助パネル">
          {chatOpen && asmVisible ? (
            <div className={isMobile ? "flex h-full flex-col overflow-auto" : "flex h-full flex-row"}>
              <div className={isMobile ? "min-h-[50%]" : "w-[350px]"}><ChatPanel /></div>
              <div className={isMobile ? "min-h-[50%] border-t border-gray-700" : "w-[350px] border-l border-gray-700"}><ASMPanel /></div>
            </div>
          ) : chatOpen ? <div className="h-full w-[350px] max-w-full"><ChatPanel /></div> : <div className="h-full w-[350px] max-w-full"><ASMPanel /></div>}
        </aside>
      )}

      {!zenMode && (
        <div className="absolute bottom-6 left-0 right-0 h-64 border-t border-gray-700 bg-gray-900" hidden={!terminalOpen}>
          <WTermTerminal isOpen={terminalOpen} onClose={() => setTerminalOpen(false)} />
        </div>
      )}


      {zenMode && (
        <button
          type="button"
          onClick={toggleZenMode}
          className="fixed top-4 right-4 z-50 rounded-full bg-gray-800/80 px-3 py-1.5 text-xs text-gray-300 shadow-lg backdrop-blur transition-colors hover:bg-gray-700 hover:text-white"
          title="Zen モードを解除 (Esc)"
          aria-label="Zen モードを解除"
        >
          Zen 解除 (Esc)
        </button>
      )}

      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <section className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
            <p className="mb-2 text-sm font-semibold text-blue-300">Right-Stuff Editor Dash</p>
            <h1 id="onboarding-title" className="text-2xl font-semibold text-white">書くことに集中できるワークスペース</h1>
            <p className="mt-3 leading-7 text-gray-300">リッチテキストと Markdown を切り替えながら、変更を端末内に自動保存できます。必要なときだけAIチャットやスキル管理を開き、まずは新しい文書を作るか、用意された案内文を編集して始めてください。</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={handleCreateFirstDocument} className="rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-500">最初の文書を作成</button>
              <button type="button" onClick={completeOnboarding} className="rounded-lg border border-gray-600 px-4 py-3 font-medium text-gray-200 transition-colors hover:bg-gray-700">案内文から始める</button>
            </div>
            <p className="mt-4 text-xs leading-5 text-gray-400">ショートカット: Ctrl/Cmd + S で保存、Ctrl/Cmd + , で設定を開けます。</p>
          </section>
        </div>
      )}

      <NotesBrowser
        isOpen={notesOpen}
        onClose={() => setNotesOpen(false)}
        onOpenNote={(input) => openNotesDocument(input)}
      />
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <GistUploadModal isOpen={gistUploadOpen} onClose={() => setGistUploadOpen(false)} />
      <GistViewer isOpen={gistViewerOpen} onClose={() => setGistViewerOpen(false)} />
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      <CommandPalette
        isOpen={paletteOpen}
        onClose={closePalette}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <TemplateSelectorModal
        isOpen={templateSelectorOpen}
        onClose={() => setTemplateSelectorOpen(false)}
      />
      <VersionHistoryModal
        isOpen={versionHistoryDocId !== null}
        docUuid={versionHistoryDocId}
        onClose={() => setVersionHistoryDocId(null)}
      />
      <BulkExportModal
        isOpen={bulkExportOpen}
        onClose={() => setBulkExportOpen(false)}
      />
    </div>
  );
};

export default App;
