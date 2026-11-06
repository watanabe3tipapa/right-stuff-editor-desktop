import React, { useEffect, useRef, useState } from "react";
import { DiagramCard, type DiagramAction } from "./DiagramCard";

interface MermaidDiagramProps {
  code: string;
  theme?: "light" | "dark" | "system";
}

let mermaidSequence = 0;

const errorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const downloadSvg = (svg: string) => {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mermaid-diagram.svg";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code, theme = "light" }) => {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const idRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-diagram-${++mermaidSequence}`;
    idRef.current = id;
    setLoading(true);
    setError(null);

    const render = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          suppressErrorRendering: true,
          theme: theme === "dark" ? "dark" : "default",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif',
          flowchart: { htmlLabels: true, useMaxWidth: true },
          sequence: { useMaxWidth: true },
          gantt: { useMaxWidth: true },
        });
        const result = await mermaid.render(id, code.trim());
        if (cancelled) return;
        setSvg(result.svg);
      } catch (renderError) {
        if (cancelled) return;
        document.getElementById(id)?.remove();
        document.getElementById(`d${id}`)?.remove();
        setError(errorMessage(renderError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void render();
    return () => {
      cancelled = true;
      document.getElementById(id)?.remove();
      document.getElementById(`d${id}`)?.remove();
    };
  }, [code, theme, retryKey]);

  const actions: DiagramAction[] = svg
    ? [{ label: "SVG を保存", onClick: () => downloadSvg(svg) }]
    : [];

  return (
    <DiagramCard
      kind="mermaid"
      label="Mermaid ダイアグラム"
      source={code}
      loading={loading}
      error={error}
      errorHint="構文エラーがある場合は、図のソースを確認してください。Mermaid の記法はバージョンによって異なることがあります。"
      onRetry={() => setRetryKey((key) => key + 1)}
      actions={actions}
    >
      <div
        className="mermaid-output flex justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full"
        // mermaid.render() が生成した SVG。securityLevel: strict でサニタイズ済み。
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </DiagramCard>
  );
};

export default MermaidDiagram;
