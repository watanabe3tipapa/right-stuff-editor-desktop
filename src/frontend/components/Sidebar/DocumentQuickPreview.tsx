import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { extractSummary } from "@/utils/markdown";

interface DocumentQuickPreviewProps {
  title: string;
  content: string;
  visible: boolean;
  anchorRef?: React.RefObject<HTMLElement>;
}

export const DocumentQuickPreview: React.FC<DocumentQuickPreviewProps> = ({
  title,
  content,
  visible,
}) => {
  if (!visible) return null;
  const preview = extractSummary(content, 400);
  return (
    <div
      className="pointer-events-none absolute left-full top-2 z-50 ml-2 w-80 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-xl"
      role="tooltip"
    >
      <div className="mb-2 text-sm font-semibold text-gray-100">{title || "Untitled"}</div>
      <div className="prose prose-sm max-h-72 overflow-auto prose-invert">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw, rehypeSanitize]}
        >
          {preview}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default DocumentQuickPreview;
