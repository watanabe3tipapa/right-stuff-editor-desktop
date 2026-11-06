import React, { useEffect, useMemo, useState } from "react";
import { DiagramCard, type DiagramAction } from "./DiagramCard";
import { isHtmlSource, resolveArtifactPath } from "@/utils/artifactPath";
import { desktop, isDesktop } from "@/utils/desktop";

interface ArchifyEmbedProps {
  source: string;
  workspaceRoot: string | null;
  documentPath: string | null;
}

export const ArchifyEmbed: React.FC<ArchifyEmbedProps> = ({
  source,
  workspaceRoot,
  documentPath,
}) => {
  const [html, setHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [frameLoading, setFrameLoading] = useState(true);

  const inlineHtml = isHtmlSource(source);
  const targetPath = useMemo(
    () => (inlineHtml ? null : resolveArtifactPath(source, workspaceRoot, documentPath)),
    [inlineHtml, source, workspaceRoot, documentPath],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFrameLoading(true);

    if (inlineHtml) {
      setHtml(source);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (!targetPath) {
      setError("Archify HTML のパスを解決できませんでした。");
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (!isDesktop()) {
      setError("Archify の埋め込みはデスクトップ版でのみ利用できます。");
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    void desktop
      .fileRead(targetPath)
      .then((result) => {
        if (cancelled) return;
        setHtml(result.content);
        setLoading(false);
      })
      .catch((readError: unknown) => {
        if (cancelled) return;
        setError(
          `Archify HTML を読み込めませんでした: ${
            readError instanceof Error ? readError.message : String(readError)
          }`,
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [inlineHtml, source, targetPath, retryKey]);

  const blobUrl = useMemo(() => {
    if (!html) return null;
    return URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  }, [html]);

  useEffect(
    () => () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    },
    [blobUrl],
  );

  const actions: DiagramAction[] = html
    ? [
        {
          label: "別ウィンドウで開く",
          onClick: () => {
            if (blobUrl) window.open(blobUrl, "_blank", "noopener,noreferrer");
          },
        },
        {
          label: expanded ? "縮小" : "拡大",
          onClick: () => setExpanded((value) => !value),
        },
      ]
    : [];

  const label = inlineHtml
    ? "埋め込み Archify HTML"
    : (targetPath?.split("/").pop() ?? "Archify HTML");

  return (
    <DiagramCard
      kind="archify"
      label={label}
      source={inlineHtml ? source : targetPath ?? source}
      loading={loading}
      error={error}
      errorHint={
        "Archify の HTML をワークスペース内に保存し、コードブロックにパスを書くと埋め込めます。\n例:\n```archify\n.archify/system/diagram.html\n```"
      }
      onRetry={() => setRetryKey((key) => key + 1)}
      actions={actions}
      note={
        targetPath ? (
          <span className="font-mono">{targetPath}</span>
        ) : (
          "Markdown に直接貼り付けた HTML を sandbox 付き iframe で表示しています。"
        )
      }
      bodyClassName="p-0"
    >
      <div className={`relative w-full ${expanded ? "h-[85vh]" : "h-[520px]"}`}>
        {frameLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-gray-900/80 text-xs text-gray-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            Archify を読み込んでいます…
          </div>
        )}
        {html && (
          <iframe
            key={`${targetPath ?? "inline"}-${retryKey}-${expanded ? "expanded" : "normal"}`}
            title={label}
            srcDoc={html}
            sandbox="allow-scripts allow-popups allow-forms allow-modals"
            className="h-full w-full border-0 bg-white"
            onLoad={() => setFrameLoading(false)}
          />
        )}
      </div>
    </DiagramCard>
  );
};

export default ArchifyEmbed;
