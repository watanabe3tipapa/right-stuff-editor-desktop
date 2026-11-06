import React, { useState } from "react";

export interface DiagramAction {
  label: string;
  onClick: () => void;
}

interface DiagramCardProps {
  kind: "mermaid" | "plantuml" | "archify";
  label: string;
  source: string;
  loading?: boolean;
  error?: string | null;
  errorHint?: string;
  onRetry?: () => void;
  actions?: DiagramAction[];
  note?: React.ReactNode;
  bodyClassName?: string;
  children?: React.ReactNode;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(area);
      return copied;
    } catch {
      return false;
    }
  }
}

const kindLabels: Record<DiagramCardProps["kind"], string> = {
  mermaid: "Mermaid",
  plantuml: "PlantUML",
  archify: "Archify",
};

export const DiagramCard: React.FC<DiagramCardProps> = ({
  kind,
  label,
  source,
  loading = false,
  error = null,
  errorHint,
  onRetry,
  actions = [],
  note,
  bodyClassName = "",
  children,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(source);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <figure className="diagram-card my-4 overflow-hidden rounded-xl border border-gray-700 bg-gray-900/70">
      <figcaption className="flex flex-wrap items-center gap-2 border-b border-gray-700/80 bg-gray-800/60 px-3 py-2 text-xs text-gray-400">
        <span className="rounded bg-gray-700/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-gray-300">
          {kindLabels[kind]}
        </span>
        <span className="font-medium text-gray-300">{label}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded px-2 py-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
            title="図のソースをコピー"
          >
            {copied ? "コピーしました" : "ソースをコピー"}
          </button>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="rounded px-2 py-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
            >
              {action.label}
            </button>
          ))}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded px-2 py-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              title="再描画"
            >
              再描画
            </button>
          )}
        </div>
      </figcaption>

      <div className={`diagram-card-body px-4 py-4 ${bodyClassName}`}>
        {error ? (
          <div className="space-y-3" role="alert">
            <p className="text-sm text-amber-300">{error}</p>
            {errorHint && (
              <p className="whitespace-pre-line text-xs leading-5 text-gray-400">{errorHint}</p>
            )}
            <pre className="max-h-64 overflow-auto rounded-lg bg-gray-950/80 p-3 text-xs leading-5 text-gray-300">
              <code>{source}</code>
            </pre>
          </div>
        ) : (
          <div className="relative">
            {children}
            {loading && (
              <div
                className="absolute inset-0 z-10 flex min-h-[120px] items-center justify-center gap-2 bg-gray-900/80 text-xs text-gray-400"
                role="status"
              >
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                図を描画しています…
              </div>
            )}
          </div>
        )}
      </div>

      {note && (
        <div className="border-t border-gray-800/80 px-3 py-1.5 text-[11px] leading-4 text-gray-500">
          {note}
        </div>
      )}
    </figure>
  );
};

export default DiagramCard;
