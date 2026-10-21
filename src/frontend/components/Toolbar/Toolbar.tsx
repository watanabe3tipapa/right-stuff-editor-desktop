import React, { useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useGistStore } from "@/stores/gistStore";
import { useViewStore } from "@/stores/viewStore";
import { useGhostStore } from "@/stores/ghostStore";
import { openFile, saveFile, saveToActiveFile, hasActiveFile, getActiveFileInfo, exportAsHtml, exportAsPdf, exportAsJson, exportAsTxt, exportAsDocx, exportAsModelfile } from "@/utils/fileOperations";
import { markdownToHtml } from "@/utils/markdown";
import { supportsAsm, supportsMdv, supportsFileSystemAccess } from "@/utils/capabilities";

type ViewMode = "split" | "editor" | "preview" | "chat";

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  asmOpen?: boolean;
  onToggleAsm?: () => void;
  terminalOpen: boolean;
  onToggleTerminal: () => void;
  onOpenGistUpload?: () => void;
  onOpenGistViewer?: () => void;
  onOpenSettings?: () => void;
  onOpenMdv?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  onViewModeChange,
  sidebarOpen,
  onToggleSidebar,
  chatOpen,
  onToggleChat,
  asmOpen,
  onToggleAsm,
  terminalOpen,
  onToggleTerminal,
  onOpenGistUpload,
  onOpenGistViewer,
  onOpenSettings,
  onOpenMdv,
}) => {
  const { mode: editorMode, setMode, saveDocument, isDirty, content, setContent } = useEditorStore();
  const { isAuthenticated: gistAuthenticated } = useGistStore();
  const { zenMode, toggleZenMode, typewriterMode, toggleTypewriterMode } = useViewStore();
  const { enabled: ghostEnabled, setEnabled: setGhostEnabled } = useGhostStore();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleOpen = async () => {
    const result = await openFile();
    if (result.success && result.file) {
      setContent(result.file.content);
      useEditorStore.getState().markSaved();
    }
  };

  const handleSave = async () => {
    if (hasActiveFile()) {
      const result = await saveToActiveFile(content);
      if (result.success) {
        useEditorStore.getState().markSaved();
      }
    } else {
      const info = getActiveFileInfo();
      const suggested = info.name || "document.md";
      await saveFile(content, suggested);
      useEditorStore.getState().markSaved();
    }
  };

  const handleExport = async (format: string) => {
    setShowExportMenu(false);
    
    switch (format) {
      case "markdown":
        await saveFile(content, "document.md");
        break;
      case "html":
        const htmlContent = await markdownToHtml(content);
        await exportAsHtml(htmlContent, "document.html");
        break;
      case "pdf":
        const pdfHtml = await markdownToHtml(content);
        await exportAsPdf(pdfHtml, "document.pdf");
        break;
      case "json":
        await exportAsJson(content, "document.json");
        break;
      case "txt":
        await exportAsTxt(content, "document");
        break;
      case "docx":
        await exportAsDocx(content, "document");
        break;
      case "modelfile":
        await exportAsModelfile(content, "Modelfile");
        break;
    }
  };

  return (
    <div className="header-toolbar flex items-center h-full px-2 overflow-x-auto scrollbar-hide">
      {/* Left section - Navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded hover:bg-gray-700 transition-colors ${
            sidebarOpen ? "bg-gray-700 text-blue-400" : "text-gray-400"
          }`}
          title="Toggle sidebar"
          aria-label="サイドバーを切り替え"
          aria-pressed={sidebarOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
        </button>
      </div>

      <div className="w-px h-6 bg-gray-700 mx-2" />

      {/* Center section - Editor controls */}
      <div className="flex items-center gap-1">
        {/* View mode toggles */}
        <div className="flex items-center bg-gray-700 rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange("editor")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "editor"
                ? "bg-gray-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
            title="Editor only"
            aria-label="エディタのみ表示"
            aria-pressed={viewMode === "editor"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange("split")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "split"
                ? "bg-gray-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
            title="Split view"
            aria-label="分割表示"
            aria-pressed={viewMode === "split"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange("preview")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "preview"
                ? "bg-gray-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
            title="Preview only"
            aria-label="プレビューのみ表示"
            aria-pressed={viewMode === "preview"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="w-px h-6 bg-gray-700 mx-2" />

      {/* Editor mode toggle */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setMode("rich")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            editorMode === "rich"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
          title="Rich text mode"
          aria-pressed={editorMode === "rich"}
        >
          Rich Text
        </button>
        <button
          onClick={() => setMode("markdown")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            editorMode === "markdown"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
          title="Markdown mode"
          aria-pressed={editorMode === "markdown"}
        >
          Markdown
        </button>
      </div>

      <div className="w-px h-6 bg-gray-700 mx-2" />

      {/* Writing mode toggles */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleZenMode}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            zenMode
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
          title="Zen mode (Ctrl+Shift+Z)"
          aria-label="Zen モードを切り替え"
          aria-pressed={zenMode}
        >
          Zen
        </button>
        <button
          onClick={toggleTypewriterMode}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            typewriterMode
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
          title="Typewriter mode (Ctrl+Shift+T)"
          aria-label="タイプライターモードを切り替え"
          aria-pressed={typewriterMode}
        >
          Typewriter
        </button>
        <button
          onClick={() => setGhostEnabled(!ghostEnabled)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            ghostEnabled
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
          title={ghostEnabled ? "AI 補完: 有効 (Tabで採用 / Escで破棄)" : "AI 補完: 無効"}
          aria-label="AI 補完を切り替え"
          aria-pressed={ghostEnabled}
        >
          {ghostEnabled ? "AI補完 ●" : "AI補完 ○"}
        </button>
      </div>

      <div className="flex-1" />

      {/* Right section - Actions */}
      <div className="flex items-center gap-1">
        {/* Open button (File System Access API 対応ブラウザのみ) */}
        {supportsFileSystemAccess() && (
          <button
            onClick={handleOpen}
            className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Open file"
            aria-label="ファイルを開く"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
          </button>
        )}

        {/* Save button */}
        <button
          onClick={saveDocument}
          className={`p-2 rounded transition-colors ${
            isDirty
              ? "hover:bg-gray-700 text-red-400"
              : "text-green-400"
          }`}
          title={isDirty ? "Save (Ctrl+S)" : "All changes saved"}
          aria-label={isDirty ? "文書を保存" : "すべて保存済み"}
          disabled={!isDirty}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isDirty ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            )}
          </svg>
        </button>

        {/* Save As button (File System Access API 対応ブラウザのみ) */}
        {supportsFileSystemAccess() && (
          <button
            onClick={handleSave}
            className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Save as..."
            aria-label="名前を付けて保存"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4M5 3a2 2 0 00-2 2v1h14V5a2 2 0 00-2-2H5z" />
            </svg>
          </button>
        )}

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Export"
            aria-label="エクスポート形式を選択"
            aria-expanded={showExportMenu}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 z-50">
              <button
                onClick={() => handleExport("markdown")}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-700 transition-colors text-left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Markdown (.md)
              </button>
              <button
                onClick={() => handleExport("html")}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-700 transition-colors text-left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                HTML (.html)
              </button>
              <button
                onClick={() => handleExport("pdf")}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-700 transition-colors text-left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF (.pdf)
              </button>
              <div className="border-t border-gray-700 my-1" />
              <button
                onClick={() => handleExport("txt")}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-700 transition-colors text-left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Text (.txt)
              </button>
              <button
                onClick={() => handleExport("docx")}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-700 transition-colors text-left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Word (.docx)
              </button>
              <button
                onClick={() => handleExport("modelfile")}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-700 transition-colors text-left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Ollama Modelfile
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-700 mx-1" />

        {/* Gist Upload button */}
        <button
          onClick={gistAuthenticated ? onOpenGistUpload : onOpenSettings}
          className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title={gistAuthenticated ? "Upload to Gist" : "Gist 認証が必要 (Settings)"}
          aria-label={gistAuthenticated ? "Gist にアップロード" : "Gist 認証が必要"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </button>

        {/* My Gists button */}
        <button
          onClick={gistAuthenticated ? onOpenGistViewer : onOpenSettings}
          className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title={gistAuthenticated ? "My Gists" : "Gist 認証が必要 (Settings)"}
          aria-label={gistAuthenticated ? "Gist 一覧を表示" : "Gist 認証が必要"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>

        {/* Open in mdv button (Electron のみ) */}
        {supportsMdv() && (
          <button
            onClick={onOpenMdv}
            className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Open in mdv"
            aria-label="mdv でプレビューを開く"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}

        <div className="w-px h-6 bg-gray-700 mx-1" />

        {/* Terminal toggle */}
        <button
          onClick={onToggleTerminal}
          className={`p-2 rounded transition-colors ${
            terminalOpen ? "bg-blue-600 text-white" : "hover:bg-gray-700 text-gray-400 hover:text-white"
          }`}
          title="Toggle Terminal (Ctrl+`)"
          aria-label="ターミナルを切り替え"
          aria-pressed={terminalOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {/* ASM toggle (Electron のみ) */}
        {supportsAsm() && (
          <>
            <div className="w-px h-6 bg-gray-700 mx-1" />
            <button
              onClick={onToggleAsm}
              className={`p-2 rounded transition-colors ${
                asmOpen ? "bg-blue-600 text-white" : "hover:bg-gray-700 text-gray-400 hover:text-white"
              }`}
              title="Toggle Agent Skill Manager (Ctrl+Shift+A)"
              aria-label="スキル管理を切り替え"
              aria-pressed={asmOpen}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          </>
        )}

        <div className="w-px h-6 bg-gray-700 mx-1" />

        {/* Chat toggle */}
        <button
          onClick={onToggleChat}
          className={`p-2 rounded transition-colors ${
            chatOpen ? "bg-blue-600 text-white" : "hover:bg-gray-700 text-gray-400 hover:text-white"
          }`}
          title="Toggle AI chat"
          aria-label="AIチャットを切り替え"
          aria-pressed={chatOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
