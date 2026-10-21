import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

turndown.remove(["script", "style"]);
turndown.keep(["table", "thead", "tbody", "tr", "th", "td", "img", "object"]);
turndown.addRule("lineBreaks", {
  filter: "br",
  replacement: () => "\n",
});

export function htmlToMarkdown(html: string): string {
  const prepared = html.replace(
    /(<object\b[^>]*>)\s*(<\/object>)/gi,
    "$1\u200b$2",
  );
  return turndown
    .turndown(prepared)
    .replace(/\u200b/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
