import React, { useEffect, useRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  theme?: "light" | "dark" | "system";
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

const components: Components = {
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
  code: ({ node: _node, className, children, ...props }) => {
    const isBlock = Boolean(className);
    const match = /language-(\w+)/.exec(className || "");
    if (isBlock && match && match[1] === "mermaid") {
      return (
        <div className="my-4 overflow-x-auto rounded-lg bg-gray-900 p-4 flex justify-center">
          <pre className="mermaid">{String(children)}</pre>
        </div>
      );
    }
    if (isBlock) {
      return (
        <code className={className} {...props}>
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
};

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, className = "", theme = "light" }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const runMermaid = async () => {
      if (typeof window === "undefined") return;
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: theme === "dark" ? "dark" : "default",
      });
      const elements = container.querySelectorAll("pre.mermaid");
      if (elements.length === 0) return;
      try {
        await mermaid.run({ nodes: Array.from(elements) as HTMLElement[] });
      } catch {
        // ignore render failure (invalid diagram)
      }
    };

    void runMermaid();
  }, [content, theme]);

  return (
    <div
      ref={containerRef}
      className={`markdown-preview prose prose-invert max-w-none ${className}`}
    >
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
