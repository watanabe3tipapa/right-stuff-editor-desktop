import React from "react";
import type { ASMSkill } from "@/types";

interface ASMDetailProps {
  skill: ASMSkill;
  onClose: () => void;
}

export const ASMDetail: React.FC<ASMDetailProps> = ({ skill, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">{skill.name}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <svg
              className="w-5 h-5"
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

        <div className="p-6 space-y-4">
          {skill.version && (
            <div>
              <span className="text-xs text-gray-500">Version</span>
              <p className="text-sm text-gray-100">v{skill.version}</p>
            </div>
          )}

          {skill.author && (
            <div>
              <span className="text-xs text-gray-500">Author</span>
              <p className="text-sm text-gray-100">{skill.author}</p>
            </div>
          )}

          {skill.description && (
            <div>
              <span className="text-xs text-gray-500">Description</span>
              <p className="text-sm text-gray-100 mt-1">{skill.description}</p>
            </div>
          )}

          {skill.tags.length > 0 && (
            <div>
              <span className="text-xs text-gray-500">Tags</span>
              <div className="flex gap-1 flex-wrap mt-1">
                {skill.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="text-xs text-gray-500">Status</span>
            <p className="text-sm mt-1">
              {skill.installed ? (
                <span className="text-green-400">Installed</span>
              ) : (
                <span className="text-gray-400">Not installed</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ASMDetail;
