import React, { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { usePreviewStore } from "@/stores/previewStore";
import { isPlantUmlLanguage } from "@/utils/diagramEncoding";
import { MermaidDiagram } from "./MermaidDiagram";
import { PlantUmlDiagram } from "./PlantUmlDiagram";
import { ArchifyEmbed } from "./ArchifyEmbed";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  theme?: "light" | "dark" | "system";
  workspaceRoot?: string | null;
  documentPath?: string | null;
}

interface AlertBlock {
  type: string;
}

const alertStyles: Record<string, { label: string; border: string; background: string; text: string }> = {
  NOTE: { label: "Note", border: "border-blue-500", background: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300" },
  TIP: { label: "Tip", border: "border-emerald-500", background: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300" },
  IMPORTANT: { label: "Important", border: "border-violet-500", background: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300" },
  WARNING: { label: "Warning", border: "border-amber-500", background: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300" },
  CAUTION: { label: "Caution", border: "border-red-500", background: "bg-red-500/10", text: "text-red-700 dark:text-red-300" },
};

const DIAGRAM_LANGUAGE = /language-(mermaid|plantuml|puml|archify)\b/;

function firstTextValue(node: any): string {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (!node.children || node.children.length === 0) return "";
  return firstTextValue(node.children[0]);
}

function parseAlertNode(node: unknown): AlertBlock | null {
  const blockquote = node as { children?: unknown[] } | null;
  if (!blockquote?.children) return null;
  const paragraph = blockquote.children.find(
    (child): child is { children?: unknown[] } =>
      typeof child === "object" &&
      child !== null &&
      (child as { type?: string }).type === "element" &&
      (child as { tagName?: string }).tagName === "p",
  );
  if (!paragraph) return null;
  const text = firstTextValue(paragraph.children?.[0]);
  const match = text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
  if (!match) return null;
  return { type: match[1].toUpperCase() };
}

function stripAlertMarker(type: string, children: React.ReactNode): React.ReactNode {
  const regex = new RegExp(`^\\[!${type}\\]\\s*`, "i");
  const childrenArr = React.Children.toArray(children);
  const strip = (nodes: React.ReactNode[]): React.ReactNode[] =>
    nodes.map((child, index) => {
      if (index > 0) return child;
      if (typeof child === "string") return child.replace(regex, "");
      if (React.isValidElement(child)) {
        const newChildren = strip(React.Children.toArray(child.props.children));
        return React.cloneElement(child, { children: newChildren } as never);
      }
      return child;
    });
  return strip(childrenArr);
}

function AlertBlockComponent({ block, children }: { block: AlertBlock; children?: React.ReactNode }) {
  const style = alertStyles[block.type] ?? alertStyles.NOTE;
  return (
    <div className={`my-4 rounded-md border-l-4 ${style.border} ${style.background} p-3`} role="note">
      <p className={`mb-1 text-xs font-bold uppercase tracking-wide ${style.text}`}>
        {style.label}
      </p>
      <div className="prose prose-sm prose-invert max-w-none [&>p:first-child]:mt-0">
        {stripAlertMarker(block.type, children)}
      </div>
    </div>
  );
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  className = "",
  theme = "light",
  workspaceRoot = null,
  documentPath = null,
}) => {
  const plantUmlEnabled = usePreviewStore((state) => state.plantUmlEnabled);
  const plantUmlServer = usePreviewStore((state) => state.plantUmlServer);

  const components = useMemo<Components>(() => ({
    pre: ({ node: _node, children, ...props }) => {
      const child = React.Children.toArray(children)[0];
      if (React.isValidElement(child)) {
        const childClassName = (child.props as { className?: string }).className ?? "";
        if (DIAGRAM_LANGUAGE.test(childClassName)) {
          return <>{children}</>;
        }
      }
      return (
        <pre className="my-4 overflow-x-auto rounded-lg bg-gray-950/80 p-4 text-sm" {...props}>
          {children}
        </pre>
      );
    },
    blockquote: ({ node, children, ...props }) => {
      const block = parseAlertNode(node);
      if (block) {
        return <AlertBlockComponent block={block}>{children}</AlertBlockComponent>;
      }
      return (
        <blockquote
          className="my-4 border-l-4 border-gray-500 bg-gray-700/30 pl-4 py-1 text-gray-300"
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    code: ({ node: _node, className: codeClassName, children, ...props }) => {
      const match = /language-([\w-]+)/.exec(codeClassName || "");
      const language = match?.[1]?.toLowerCase();
      const source = String(children).replace(/\n$/, "");

      if (language === "mermaid") {
        return <MermaidDiagram code={source} theme={theme} />;
      }
      if (language && isPlantUmlLanguage(language)) {
        return (
          <PlantUmlDiagram
            code={source}
            server={plantUmlServer}
            enabled={plantUmlEnabled}
          />
        );
      }
      if (language === "archify") {
        return (
          <ArchifyEmbed
            source={source}
            workspaceRoot={workspaceRoot}
            documentPath={documentPath}
          />
        );
      }
      if (codeClassName) {
        return (
          <code className={codeClassName} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code
          className="rounded bg-gray-700/60 px-1.5 py-0.5 text-[0.85em] text-pink-300"
          {...props}
        >
          {children}
        </code>
      );
    },
  }), [theme, workspaceRoot, documentPath, plantUmlEnabled, plantUmlServer]);

  return (
    <div className={`markdown-preview prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
          [rehypeKatex, { throwOnError: false, strict: false }],
        ]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownPreview;
