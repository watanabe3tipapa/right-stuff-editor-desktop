import {
  $createRangeSelection,
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  $isTextNode,
  $setSelection,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { createDOMRange } from "@lexical/selection";

export interface TextSegment {
  nodeKey: string;
  start: number;
  end: number;
}

export interface FindMatch {
  segments: TextSegment[];
  text: string;
}

interface RunEntry {
  nodeKey: string;
  text: string;
  start: number;
}

interface TextRun {
  entries: RunEntry[];
  text: string;
}

const MATCH_HIGHLIGHT = "rd-find-match";
const CURRENT_HIGHLIGHT = "rd-find-current";

type HighlightRegistry = {
  set(name: string, highlight: unknown): void;
  delete(name: string): void;
};

type HighlightConstructor = new (...ranges: Range[]) => unknown;

function getHighlightSupport(): {
  registry: HighlightRegistry;
  Highlight: HighlightConstructor;
} | null {
  const css = (globalThis as unknown as { CSS?: { highlights?: HighlightRegistry } })
    .CSS;
  const Highlight = (globalThis as unknown as { Highlight?: HighlightConstructor })
    .Highlight;
  if (!css?.highlights || !Highlight) return null;
  return { registry: css.highlights, Highlight };
}

function collectInlineEntries(node: LexicalNode, out: RunEntry[]) {
  if ($isTextNode(node)) {
    out.push({ nodeKey: node.getKey(), text: node.getTextContent(), start: 0 });
    return;
  }
  if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      collectInlineEntries(child, out);
    }
  }
}

/**
 * Collects contiguous runs of inline text. Block boundaries, line breaks and
 * non-text inline nodes (images, decorators) split a run so that a query never
 * matches across them. Inline elements such as links stay inside the run.
 */
export function $collectTextRuns(): TextRun[] {
  const runs: TextRun[] = [];

  const appendRun = (entries: RunEntry[]) => {
    if (entries.length === 0) return;
    let offset = 0;
    const normalized = entries.map((entry) => {
      const item = { ...entry, start: offset };
      offset += entry.text.length;
      return item;
    });
    runs.push({
      entries: normalized,
      text: normalized.map((entry) => entry.text).join(""),
    });
  };

  const visit = (node: LexicalNode) => {
    if ($isTextNode(node) || !$isElementNode(node)) return;
    let pending: RunEntry[] = [];
    const flush = () => {
      appendRun(pending);
      pending = [];
    };

    for (const child of (node as ElementNode).getChildren()) {
      if ($isTextNode(child)) {
        pending.push({
          nodeKey: child.getKey(),
          text: child.getTextContent(),
          start: 0,
        });
      } else if (child.isInline()) {
        if ($isElementNode(child)) {
          collectInlineEntries(child, pending);
        } else {
          flush();
        }
      } else {
        flush();
        visit(child);
      }
    }
    flush();
  };

  visit($getRoot());
  return runs;
}

function sliceRun(run: TextRun, start: number, end: number): TextSegment[] {
  const segments: TextSegment[] = [];
  for (const entry of run.entries) {
    const entryEnd = entry.start + entry.text.length;
    const segmentStart = Math.max(start, entry.start);
    const segmentEnd = Math.min(end, entryEnd);
    if (segmentStart < segmentEnd) {
      segments.push({
        nodeKey: entry.nodeKey,
        start: segmentStart - entry.start,
        end: segmentEnd - entry.start,
      });
    }
  }
  return segments;
}

export function $collectFindMatches(
  query: string,
  caseSensitive: boolean,
): FindMatch[] {
  if (!query) return [];
  const needle = caseSensitive ? query : query.toLowerCase();
  const matches: FindMatch[] = [];

  for (const run of $collectTextRuns()) {
    const haystack = caseSensitive ? run.text : run.text.toLowerCase();
    let from = 0;
    while (from <= haystack.length - needle.length) {
      const index = haystack.indexOf(needle, from);
      if (index < 0) break;
      matches.push({
        segments: sliceRun(run, index, index + needle.length),
        text: run.text.slice(index, index + needle.length),
      });
      from = index + needle.length;
    }
  }
  return matches;
}

function createMatchSelection(first: TextSegment, last: TextSegment) {
  const firstNode = $getNodeByKey(first.nodeKey);
  const lastNode = $getNodeByKey(last.nodeKey);
  if (!$isTextNode(firstNode) || !$isTextNode(lastNode)) return null;
  const selection = $createRangeSelection();
  selection.anchor.set(firstNode.getKey(), first.start, "text");
  selection.focus.set(lastNode.getKey(), last.end, "text");
  $setSelection(selection);
  return { selection, firstNode, lastNode };
}

export function selectFindMatch(editor: LexicalEditor, match: FindMatch) {
  const first = match.segments[0];
  const last = match.segments[match.segments.length - 1];
  if (!first || !last) return;

  let targetKey: string | null = null;
  editor.update(
    () => {
      const nodes = createMatchSelection(first, last);
      if (!nodes) return;
      targetKey =
        nodes.firstNode.getTopLevelElement()?.getKey() ??
        nodes.firstNode.getParent()?.getKey() ??
        null;
    },
    { discrete: true },
  );

  if (targetKey) {
    editor.getElementByKey(targetKey)?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }
}

export function replaceFindMatch(
  editor: LexicalEditor,
  match: FindMatch,
  replacement: string,
) {
  const first = match.segments[0];
  const last = match.segments[match.segments.length - 1];
  if (!first || !last) return;
  editor.update(
    () => {
      const nodes = createMatchSelection(first, last);
      nodes?.selection.insertText(replacement);
    },
    { discrete: true },
  );
}

export function replaceAllFindMatches(
  editor: LexicalEditor,
  query: string,
  caseSensitive: boolean,
  replacement: string,
) {
  if (!query) return;
  editor.update(
    () => {
      const matches = $collectFindMatches(query, caseSensitive);
      // Replace from the end so earlier offsets and node keys stay valid.
      for (let index = matches.length - 1; index >= 0; index -= 1) {
        const match = matches[index];
        if (!match) continue;
        const first = match.segments[0];
        const last = match.segments[match.segments.length - 1];
        if (!first || !last) continue;
        const nodes = createMatchSelection(first, last);
        nodes?.selection.insertText(replacement);
      }
    },
    { discrete: true },
  );
}

export function createFindDOMRanges(
  editor: LexicalEditor,
  matches: FindMatch[],
): Array<Range | null> {
  const ranges: Array<Range | null> = [];
  editor.getEditorState().read(() => {
    for (const match of matches) {
      const first = match.segments[0];
      const last = match.segments[match.segments.length - 1];
      if (!first || !last) {
        ranges.push(null);
        continue;
      }
      const firstNode = $getNodeByKey(first.nodeKey);
      const lastNode = $getNodeByKey(last.nodeKey);
      if (!$isTextNode(firstNode) || !$isTextNode(lastNode)) {
        ranges.push(null);
        continue;
      }
      try {
        ranges.push(
          createDOMRange(editor, firstNode, first.start, lastNode, last.end),
        );
      } catch {
        // The DOM may not be mounted yet (for example during headless tests).
        ranges.push(null);
      }
    }
  });
  return ranges;
}

export function applyFindHighlights(
  editor: LexicalEditor,
  matches: FindMatch[],
  currentIndex: number,
): boolean {
  const support = getHighlightSupport();
  if (!support) return false;

  const ranges = createFindDOMRanges(editor, matches);
  const validRanges = ranges.filter((range): range is Range => range !== null);
  if (validRanges.length === 0) {
    support.registry.delete(MATCH_HIGHLIGHT);
    support.registry.delete(CURRENT_HIGHLIGHT);
    return true;
  }

  const safeIndex =
    currentIndex >= 0 && currentIndex < ranges.length ? currentIndex : 0;
  const currentRange = ranges[safeIndex] ?? validRanges[0];
  const otherRanges = ranges.filter(
    (range, index): range is Range => range !== null && index !== safeIndex,
  );

  support.registry.set(MATCH_HIGHLIGHT, new support.Highlight(...otherRanges));
  support.registry.set(
    CURRENT_HIGHLIGHT,
    currentRange ? new support.Highlight(currentRange) : new support.Highlight(),
  );
  return true;
}

export function clearFindHighlights() {
  const support = getHighlightSupport();
  if (!support) return;
  support.registry.delete(MATCH_HIGHLIGHT);
  support.registry.delete(CURRENT_HIGHLIGHT);
}
