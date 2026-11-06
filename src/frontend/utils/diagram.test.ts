import { describe, expect, it } from "vitest";
import { buildPlantUmlUrl, encodePlantUmlHex, isPlantUmlLanguage, normalizePlantUmlServer } from "./diagramEncoding";
import { isHtmlSource, normalizePosixPath, resolveArtifactPath } from "./artifactPath";

describe("PlantUML encoding", () => {
  it("encodes ASCII source as hex", () => {
    expect(encodePlantUmlHex("@startuml\nA -> B\n@enduml")).toBe(
      "407374617274756d6c0a41202d3e20420a40656e64756d6c",
    );
  });

  it("encodes UTF-8 source as hex bytes", () => {
    expect(encodePlantUmlHex("あ")).toBe("e38182");
  });

  it("builds a ~h URL and trims trailing slashes", () => {
    expect(buildPlantUmlUrl("https://example.com/plantuml/", "@startuml\n@enduml")).toBe(
      "https://example.com/plantuml/svg/~h407374617274756d6c0a40656e64756d6c",
    );
  });

  it("falls back to the default server when empty", () => {
    expect(normalizePlantUmlServer("  ")).toBe("https://www.plantuml.com/plantuml");
  });

  it("recognizes plantuml aliases", () => {
    expect(isPlantUmlLanguage("plantuml")).toBe(true);
    expect(isPlantUmlLanguage("PUML")).toBe(true);
    expect(isPlantUmlLanguage("mermaid")).toBe(false);
  });
});

describe("Archify artifact paths", () => {
  it("normalizes . and .. segments", () => {
    expect(normalizePosixPath("/a//b/./c/../d")).toBe("/a/b/d");
  });

  it("resolves workspace-relative paths", () => {
    expect(resolveArtifactPath("diagrams/flow.html", "/work", "notes/a.md")).toBe(
      "/work/diagrams/flow.html",
    );
  });

  it("resolves document-relative paths", () => {
    expect(resolveArtifactPath("./flow.html", "/work", "notes/a.md")).toBe(
      "/work/notes/flow.html",
    );
    expect(resolveArtifactPath("../flow.html", "/work", "notes/deep/a.md")).toBe(
      "/work/notes/flow.html",
    );
  });

  it("keeps absolute paths", () => {
    expect(resolveArtifactPath("/tmp/flow.html", "/work", "notes/a.md")).toBe("/tmp/flow.html");
  });

  it("rejects paths escaping the workspace", () => {
    expect(resolveArtifactPath("../../etc/passwd", "/work", "notes/a.md")).toBeNull();
  });

  it("rejects remote URLs and missing workspace roots", () => {
    expect(resolveArtifactPath("https://example.com/flow.html", "/work", "notes/a.md")).toBeNull();
    expect(resolveArtifactPath("flow.html", null, "notes/a.md")).toBeNull();
  });

  it("detects inline HTML", () => {
    expect(isHtmlSource("<!DOCTYPE html><html></html>")).toBe(true);
    expect(isHtmlSource("  <svg></svg>")).toBe(true);
    expect(isHtmlSource("diagrams/flow.html")).toBe(false);
  });
});
