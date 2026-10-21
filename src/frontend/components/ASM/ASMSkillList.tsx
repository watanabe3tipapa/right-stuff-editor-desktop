import React from "react";
import { useASMStore } from "@/stores/asmStore";
import type { ASMSkill } from "@/types";

interface ASMSkillListProps {
  className?: string;
  onSelect?: (skill: ASMSkill) => void;
}

export const ASMSkillList: React.FC<ASMSkillListProps> = ({
  className = "",
  onSelect,
}) => {
  const { skills, isLoading, install, uninstall, viewMode } = useASMStore();

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="flex items-center gap-2 text-gray-400">
          <svg
            className="w-5 h-5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm">Loading skills...</span>
        </div>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <svg
          className="w-12 h-12 text-gray-600 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="text-sm text-gray-500">
          {viewMode === "installed"
            ? "No installed skills"
            : "No skills found. Try a different search."}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {skills.map((skill) => (
        <div
          key={skill.name}
          className="bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors cursor-pointer"
          onClick={() => onSelect?.(skill)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-gray-100 truncate">
                  {skill.name}
                </h3>
                {skill.version && (
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    v{skill.version}
                  </span>
                )}
                {skill.installed && (
                  <span className="text-xs text-green-400 flex-shrink-0">
                    installed
                  </span>
                )}
              </div>
              {skill.description && (
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                  {skill.description}
                </p>
              )}
              {skill.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {skill.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              {skill.installed ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    uninstall(skill.name);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition-colors"
                >
                  Uninstall
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    install(skill.name);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-green-400 border border-green-400/30 rounded-lg hover:bg-green-400/10 transition-colors"
                >
                  Install
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ASMSkillList;
