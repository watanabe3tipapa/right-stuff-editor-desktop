import React, { useEffect, useRef, useState } from "react";
import { markdownToSafeHtml } from "@/utils/markdown";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * LLM の応答を Markdown として描画する。
 * 既存のプレビューと同じパイプライン（remark + rehype-sanitize + highlight）を使い、
 * 生の HTML はサニタイズしてから innerHTML へ渡す。
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = "",
}) => {
  const [html, setHtml] = useState("");
  // 過去の応答内容が再描画で書き換わらないように、同一内容の結果は保持する
  const renderedRef = useRef<{ source: string; html: string } | null>(null);

  useEffect(() => {
    if (renderedRef.current?.source === content) {
      setHtml(renderedRef.current.html);
      return;
    }

    let cancelled = false;
    void markdownToSafeHtml(content).then((result) => {
      if (cancelled) return;
      renderedRef.current = { source: content, html: result };
      setHtml(result);
    });

    return () => {
      cancelled = true;
    };
  }, [content]);

  // HTML の生成待ち、または変換結果が空のときはプレーンテキストで表示する
  if (!html) {
    return (
      <pre
        className={`whitespace-pre-wrap break-words font-sans bg-transparent p-0 m-0 ${className}`}
      >
        {content}
      </pre>
    );
  }

  return (
    <div
      className={`chat-markdown break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownContent;
