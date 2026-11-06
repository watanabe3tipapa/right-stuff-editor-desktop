import { describe, expect, it } from "vitest";
import {
  BUILTIN_TEMPLATES,
  BUILTIN_TEMPLATE_CATEGORIES,
  applyTemplate,
} from "./templateStore";

const fixedDate = new Date(2026, 10, 6, 9, 5);

describe("applyTemplate", () => {
  it("{{date}} / {{time}} / {{datetime}} / {{weekday}} を置換する", () => {
    const result = applyTemplate(
      "date={{date}} time={{time}} datetime={{datetime}} weekday={{weekday}}",
      { date: fixedDate },
    );
    expect(result).toBe(
      "date=2026-11-06 time=09:05 datetime=2026-11-06T09:05 weekday=金曜日",
    );
  });

  it("{{title}} を文書タイトルに置換する", () => {
    expect(applyTemplate("# {{title}}", { title: "議事録" })).toBe("# 議事録");
  });

  it("タイトル未指定のとき {{title}} は空文字になる", () => {
    expect(applyTemplate("{{title}}")).toBe("");
  });

  it("旧形式のプレースホルダも置換する", () => {
    const result = applyTemplate(
      "YYYY-MM-DDTHH:MM / YYYY-MM-DD / HH:MM",
      { date: fixedDate },
    );
    expect(result).toBe("2026-11-06T09:05 / 2026-11-06 / 09:05");
  });

  it("未知のプレースホルダはそのまま残す", () => {
    expect(applyTemplate("{{unknown}}")).toBe("{{unknown}}");
  });

  it("複数回出現するプレースホルダをすべて置換する", () => {
    expect(applyTemplate("{{date}}/{{date}}", { date: fixedDate })).toBe(
      "2026-11-06/2026-11-06",
    );
  });
});

describe("BUILTIN_TEMPLATES", () => {
  it("id が重複しない", () => {
    const ids = BUILTIN_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("すべてのテンプレートに名前・説明・本文がある", () => {
    BUILTIN_TEMPLATES.forEach((t) => {
      expect(t.name.trim().length).toBeGreaterThan(0);
      expect(t.description.trim().length).toBeGreaterThan(0);
      expect(t.content.trim().length).toBeGreaterThan(0);
      expect(t.builtin).toBe(true);
    });
  });

  it("カテゴリは定義済みの一覧に含まれる", () => {
    const known = new Set<string>(BUILTIN_TEMPLATE_CATEGORIES);
    BUILTIN_TEMPLATES.forEach((t) => {
      expect(t.category).toBeDefined();
      expect(known.has(t.category as string)).toBe(true);
    });
  });

  it("追加した実用テンプレートが含まれる", () => {
    const ids = new Set(BUILTIN_TEMPLATES.map((t) => t.id));
    [
      "builtin-meeting-notes",
      "builtin-weekly-report",
      "builtin-project-plan",
      "builtin-blog-outline",
      "builtin-book-review",
      "builtin-reading-notes",
      "builtin-learning-plan",
      "builtin-incident-review",
    ].forEach((id) => expect(ids.has(id)).toBe(true));
  });

  it("タイトル変数を含むテンプレートは作成時にタイトルが入る", () => {
    const meeting = BUILTIN_TEMPLATES.find((t) => t.id === "builtin-meeting-notes");
    expect(meeting).toBeDefined();
    const rendered = applyTemplate(meeting!.content, {
      title: "定例ミーティング",
      date: fixedDate,
    });
    expect(rendered).toContain("# 定例ミーティング");
    expect(rendered).toContain("2026-11-06");
    expect(rendered).not.toContain("{{title}}");
  });
});
