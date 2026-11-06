import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownPreview } from "./MarkdownPreview";

describe("MarkdownPreview diagram blocks", () => {
  it("renders mermaid fences as diagram cards without a pre wrapper", () => {
    const html = renderToStaticMarkup(
      React.createElement(MarkdownPreview, {
        content: "```mermaid\ngraph TD\n  A --> B\n```",
      }),
    );
    expect(html).toContain("diagram-card");
    expect(html).toContain("Mermaid");
    expect(html).not.toMatch(/<pre[^>]*>\s*<figure/);
  });

  it("renders plantuml fences as diagram cards", () => {
    const html = renderToStaticMarkup(
      React.createElement(MarkdownPreview, {
        content: "```plantuml\n@startuml\nA -> B\n@enduml\n```",
      }),
    );
    expect(html).toContain("diagram-card");
    expect(html).toContain("PlantUML");
  });

  it("renders archify fences as diagram cards", () => {
    const html = renderToStaticMarkup(
      React.createElement(MarkdownPreview, {
        content: "```archify\ndiagrams/flow.html\n```",
        workspaceRoot: "/work",
        documentPath: "notes/a.md",
      }),
    );
    expect(html).toContain("diagram-card");
    expect(html).toContain("Archify");
  });

  it("keeps ordinary code blocks in a pre element", () => {
    const html = renderToStaticMarkup(
      React.createElement(MarkdownPreview, {
        content: "```ts\nconst a = 1;\n```",
      }),
    );
    expect(html).toMatch(/<pre[^>]*>/);
    expect(html).not.toContain("diagram-card");
  });
});
