import React, { useEffect, useRef } from "react";
import { useShortcutStore } from "@/stores/shortcutStore";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryLabels: Record<string, string> = {
  editor: "エディタ",
  view: "表示",
  file: "ファイル",
  ai: "AI",
};

const categoryOrder = ["file", "editor", "view", "ai"];

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { shortcuts, getShortcut } = useShortcutStore();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]',
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

  if (!isOpen) return null;

  const categories = categoryOrder
    .map((category) => ({
      category,
      items: shortcuts.filter((shortcut) => shortcut.category === category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl outline-none max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-300">Help & About</p>
            <h1 id="help-modal-title" className="text-xl font-semibold text-white mt-1">
              ショートカット一覧
            </h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {categories.map(({ category, items }) => (
            <div key={category}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {categoryLabels[category] ?? category}
              </h2>
              <div className="rounded-lg overflow-hidden border border-gray-700">
                {items.map((shortcut, index) => (
                  <div
                    key={shortcut.id}
                    className={`flex items-center justify-between px-3 py-2 text-sm ${
                      index > 0 ? "border-t border-gray-800" : ""
                    }`}
                  >
                    <span className="text-gray-300">{shortcut.label}</span>
                    <kbd className="px-2 py-0.5 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200 font-mono">
                      {getShortcut(shortcut.action) ?? shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-lg border border-gray-700 p-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              About
            </h2>
            <p className="text-sm text-gray-300">Right-Stuff Editor Dash v0.5.0</p>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              リッチテキストと Markdown を切り替えながら、端末内に自動保存できる軽量エディタです。
              AIの補完・変換・チャット、文体プロファイル、スキル管理、ターミナル、Gist 連携などを統合しています。
            </p>
            <a
              href="https://github.com/watanabe3tipapa/right-stuff-editor-dash"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              GitHub リポジトリ（使い方・変更履歴）
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HelpModal;