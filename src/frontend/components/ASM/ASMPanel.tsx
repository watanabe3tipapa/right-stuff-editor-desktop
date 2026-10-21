import React, { useState, useEffect } from "react";
import { useASMStore } from "@/stores/asmStore";
import { isAsmAvailable } from "@/utils/asmClient";
import { ASMSearch } from "./ASMSearch";
import { ASMSkillList } from "./ASMSkillList";
import { ASMDetail } from "./ASMDetail";
import type { ASMSkill, ASMViewMode } from "@/types";

interface ASMPanelProps {
  className?: string;
}

export const ASMPanel: React.FC<ASMPanelProps> = ({ className = "" }) => {
  const {
    viewMode,
    setViewMode,
    fetchCatalog,
    listInstalled,
    error,
    clearError,
  } = useASMStore();

  const [selectedSkill, setSelectedSkill] = useState<ASMSkill | null>(null);

  useEffect(() => {
    if (!isAsmAvailable()) return;
    if (viewMode === "catalog") {
      fetchCatalog();
    } else {
      listInstalled();
    }
  }, []);

  if (!isAsmAvailable()) {
    return (
      <div
        className={`flex flex-col h-full bg-gray-900 text-gray-100 ${className}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="font-semibold text-lg">Agent Skill Manager</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <svg
            className="w-16 h-16 text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <p className="text-lg font-medium text-gray-400 mb-2">
            Not Available in Browser
          </p>
          <p className="text-sm text-gray-500 max-w-xs">
            ASM (agent-skill-manager) requires Electron runtime.
            Please use the desktop application to manage skills.
          </p>
        </div>
      </div>
    );
  }

  const viewModes: { label: string; value: ASMViewMode }[] = [
    { label: "Catalog", value: "catalog" },
    { label: "Installed", value: "installed" },
  ];

  return (
    <div className={`flex flex-col h-full bg-gray-900 text-gray-100 ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="font-semibold text-lg">Agent Skill Manager</h2>
      </div>

      <div className="px-4 py-2 border-b border-gray-700">
        <ASMSearch />
      </div>

      <div className="px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
          {viewModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value)}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode.value
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-2 px-3 py-2 bg-red-900/30 border border-red-700/50 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-300">{error}</span>
          <button
            onClick={clearError}
            className="p-1 hover:bg-red-800/30 rounded transition-colors"
          >
            <svg
              className="w-4 h-4 text-red-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <ASMSkillList onSelect={setSelectedSkill} />
      </div>

      {selectedSkill && (
        <ASMDetail
          skill={selectedSkill}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </div>
  );
};

export default ASMPanel;
