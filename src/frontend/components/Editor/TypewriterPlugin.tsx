import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useViewStore } from "@/stores/viewStore";

const BLOCK_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "BLOCKQUOTE",
  "PRE",
  "TD",
  "TH",
  "FIGURE",
  "HR",
]);

const findScrollableAncestor = (start: Element): HTMLElement | null => {
  let current: HTMLElement | null = start.parentElement;
  while (current) {
    const { overflowY } = window.getComputedStyle(current);
    if (overflowY === "auto" || overflowY === "scroll") {
      return current;
    }
    current = current.parentElement;
  }
  return null;
};

const findBlockElement = (node: Node | null): HTMLElement | null => {
  let element: HTMLElement | null =
    node instanceof HTMLElement ? node : (node?.parentElement ?? null);
  while (element && element.tagName !== "BODY") {
    if (BLOCK_TAGS.has(element.tagName)) return element;
    element = element.parentElement;
  }
  return null;
};

export const TypewriterPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const typewriterMode = useViewStore((state) => state.typewriterMode);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!typewriterMode) {
      return;
    }

    const scheduleScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const anchorNode = selection.anchorNode;
        if (!anchorNode) return;
        const container =
          anchorNode instanceof Element
            ? findScrollableAncestor(anchorNode)
            : anchorNode.parentElement
              ? findScrollableAncestor(anchorNode.parentElement)
              : null;
        if (!container) return;
        const block = findBlockElement(anchorNode);
        if (!block) return;
        const containerRect = container.getBoundingClientRect();
        const blockRect = block.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;
        const blockCenter = blockRect.top + blockRect.height / 2;
        const delta = blockCenter - containerCenter;
        if (Math.abs(delta) < 2) return;
        container.scrollBy({ top: delta, behavior: "smooth" });
      });
    };

    const removeUpdateListener = editor.registerUpdateListener(() => {
      scheduleScroll();
    });

    scheduleScroll();

    return () => {
      removeUpdateListener();
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [editor, typewriterMode]);

  return null;
};

export default TypewriterPlugin;
