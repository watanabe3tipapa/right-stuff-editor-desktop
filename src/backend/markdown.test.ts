import { describe, expect, it } from "vitest";
import { parseMarkdown, serializeMarkdown, titleFromPath } from "./markdown";

describe("parseMarkdown", () => {
  it("frontmatter の値を読み取る", () => {
    const raw = [
      "---",
      'title: "テスト"',
      'createdAt: "2026-01-01T00:00:00.000Z"',
      "status: draft",
      'tags: ["a", "b"]',
      "---",
      "",
      "# 本文",
    ].join("\n");

    const { meta, body } = parseMarkdown(raw, "/tmp/test.md");

    expect(meta.title).toBe("テスト");
    expect(meta.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(meta.status).toBe("draft");
    expect(meta.tags).toEqual(["a", "b"]);
    expect(body).toContain("# 本文");
  });

  it("frontmatter が無ければ本文をそのまま返す", () => {
    const { meta, body } = parseMarkdown("本文だけ\n", "/tmp/test.md");
    expect(body).toBe("本文だけ\n");
    expect(meta.title).toBe("本文だけ");
  });

  it("見出しからタイトルを補う", () => {
    const { meta } = parseMarkdown("# 見出しタイトル\n\n本文", "/tmp/test.md");
    expect(meta.title).toBe("見出しタイトル");
  });

  it("BOM を除去する", () => {
    const { body } = parseMarkdown("\uFEFF# 見出し\n", "/tmp/test.md");
    expect(body.startsWith("\uFEFF")).toBe(false);
  });

  it("未知のキーは無視する", () => {
    const raw = ["---", "unknownKey: 1", 'title: "有効"', "---", "本文"].join("\n");
    const { meta } = parseMarkdown(raw, "/tmp/test.md");
    expect(meta.title).toBe("有効");
  });
});

describe("serializeMarkdown", () => {
  it("frontmatter 付きで書き出す", () => {
    const output = serializeMarkdown(
      {
        title: "題名",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "",
        status: "done",
        summary: "要約",
        tags: ["x"],
        gistId: "",
        gistUpdatedAt: "",
      },
      "# 本文\n",
    );

    expect(output.startsWith("---\n")).toBe(true);
    expect(output).toContain('title: "題名"');
    expect(output).toContain('status: "done"');
    expect(output).toContain('tags: ["x"]');
    expect(output.endsWith("# 本文\n")).toBe(true);
  });

  it("空の値は frontmatter に含めない", () => {
    const output = serializeMarkdown(
      {
        title: "題名",
        createdAt: "",
        updatedAt: "",
        summary: "",
        tags: [],
        gistId: "",
        gistUpdatedAt: "",
      },
      "本文",
    );
    expect(output).not.toContain("createdAt");
    expect(output).not.toContain("tags");
    expect(output).not.toContain("gistId");
  });

  it("parse → serialize → parse で往復できる", () => {
    const raw = ["---", 'title: "往復"', "---", "", "本文テキスト"].join("\n");
    const first = parseMarkdown(raw, "/tmp/roundtrip.md");
    const serialized = serializeMarkdown(first.meta, first.body);
    const second = parseMarkdown(serialized, "/tmp/roundtrip.md");

    expect(second.meta.title).toBe(first.meta.title);
    expect(second.body.trim()).toBe(first.body.trim());
  });
});

describe("titleFromPath", () => {
  it("拡張子を外してタイトルにする", () => {
    expect(titleFromPath("/tmp/foo.md")).toBe("foo");
    expect(titleFromPath("/tmp/foo.markdown")).toBe("foo");
    expect(titleFromPath("/tmp/foo.txt")).toBe("foo");
  });

  it("拡張子が無ければそのまま使う", () => {
    expect(titleFromPath("/tmp/foo")).toBe("foo");
  });
});
