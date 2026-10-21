import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "./htmlToMarkdown";
import { markdownToHtml } from "./markdown";

describe("Notes HTML/Markdown round-trip", () => {
  it("preserves tables", async () => {
    const html = await markdownToHtml("| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>1</td>");
    expect(htmlToMarkdown(html)).toContain("<table>");
  });

  it("preserves Notes attachment objects", async () => {
    const html = await markdownToHtml('<p>before</p><object data="attachment-id"></object>');
    expect(html).toContain('<object data="attachment-id">');
    expect(htmlToMarkdown(html)).toContain('<object data="attachment-id">');
  });

  it("strips scripts and event handlers", async () => {
    const html = await markdownToHtml('<script>alert(1)</script><p onclick="x()">safe</p>');
    expect(html).not.toContain("script");
    expect(html).not.toContain("onclick");
    expect(html).toContain("safe");
  });
});
