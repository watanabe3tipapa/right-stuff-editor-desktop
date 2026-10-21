import React, { useEffect, useState } from "react";
import { desktop } from "@/utils/desktop";
import type { DocumentVersion } from "@shared/types";
import { useEditorStore } from "@/stores/editorStore";

interface VersionHistoryModalProps {
  isOpen: boolean;
  docUuid: string | null;
  onClose: () => void;
  onRestore?: (content: string) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  docUuid,
  onClose,
  onRestore,
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const { saveDocument, setContent } = useEditorStore();

  useEffect(() => {
    if (!isOpen || !docUuid) return;
    void (async () => {
      const rows = await desktop.versionsList(docUuid, 10);
      setVersions(rows);
    })();
  }, [isOpen, docUuid]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-100">下書き履歴（直近10件）</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto divide-y divide-gray-700">
          {versions.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">履歴がありません</div>
          ) : (
            versions.map((v) => (
              <div key={v.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-xs text-gray-400">
                    {new Date(v.savedAt).toLocaleString("ja-JP")}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm text-gray-200">
                    {v.content.slice(0, 120).replace(/\n/g, " ")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (onRestore) onRestore(v.content);
                    else setContent(v.content);
                    void saveDocument();
                    onClose();
                  }}
                  className="shrink-0 rounded-lg bg-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-600"
                >
                  この版を復元
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;
