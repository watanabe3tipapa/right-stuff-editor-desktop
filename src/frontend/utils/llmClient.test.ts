import { describe, expect, it } from "vitest";
import { useLLMStore } from "@/stores/llmStore";
import {
  buildDocumentContext,
  buildLLMRequest,
  buildSystemMessages,
  DOCUMENT_CONTEXT_LIMIT,
  SARASHINA_MAX_OUTPUT_TOKENS,
} from "./llmClient";

describe("buildDocumentContext", () => {
  it("前後の空白を落として返す", () => {
    expect(buildDocumentContext("  hello  ")).toBe("hello");
  });

  it("空の文書は空文字", () => {
    expect(buildDocumentContext("   \n  ")).toBe("");
  });

  it("上限以下の文書はそのまま通す", () => {
    const body = "A".repeat(DOCUMENT_CONTEXT_LIMIT);
    expect(buildDocumentContext(body)).toBe(body);
    expect(buildDocumentContext(body)).not.toContain("中略");
  });

  it("上限を超えたら先頭と末尾を残して中略を明示する", () => {
    const head = "A".repeat(4000);
    const tail = "B".repeat(4000);
    const result = buildDocumentContext(head + tail);

    expect(result).toContain("[中略 2,000 文字]");
    expect(result.startsWith(head.slice(0, 32))).toBe(true);
    expect(result.endsWith(tail.slice(-32))).toBe(true);
    expect(result.length).toBeLessThan(head.length + tail.length);
  });

  it("中略文字数は原文の超過分に一致する", () => {
    const body = "x".repeat(DOCUMENT_CONTEXT_LIMIT + 123);
    expect(buildDocumentContext(body)).toContain("[中略 123 文字]");
  });
});

describe("buildSystemMessages", () => {
  it("ユーザー指定の systemPrompt を先頭に置く", () => {
    const messages = buildSystemMessages("MY PROMPT", undefined);
    expect(messages[0]?.role).toBe("system");
    expect(messages[0]?.content).toBe("MY PROMPT");
  });

  it("文書が無いときは文書用の system メッセージを加えない", () => {
    const messages = buildSystemMessages(undefined, undefined);
    expect(messages.some((m) => m.content.includes("編集中の文書"))).toBe(false);
  });

  it("選択範囲は文書より前に置く", () => {
    const messages = buildSystemMessages(undefined, "本文データ", {
      selection: "選択された部分",
    });
    const contents = messages.map((m) => m.content);
    const selectionIndex = contents.findIndex((c) => c.includes("選択された部分"));
    const documentIndex = contents.findIndex((c) => c.includes("本文データ"));

    expect(selectionIndex).toBeGreaterThanOrEqual(0);
    expect(documentIndex).toBeGreaterThanOrEqual(0);
    expect(selectionIndex).toBeLessThan(documentIndex);
  });

  it("空白だけの選択範囲は無視する", () => {
    const messages = buildSystemMessages(undefined, undefined, { selection: "   " });
    expect(messages.some((m) => m.content.includes("選択した部分"))).toBe(false);
  });

  it("文書は文字数制限の形式で切り詰める", () => {
    const body = "A".repeat(4000) + "B".repeat(4000);
    const messages = buildSystemMessages(undefined, body);
    const document = messages.find((m) => m.content.includes("編集中の文書"));
    expect(document?.content).toContain("[中略 2,000 文字]");
  });
});

describe("buildLLMRequest", () => {
  const config = {
    endpoint: "https://api.sarashina.ai/v1/chat/completions",
    model: "sarashina3-mini",
    temperature: 0.7,
    maxTokens: 2048,
  };
  const messages = [{ role: "user" as const, content: "こんにちは" }];

  it("Sarashina は max_tokens ではなく max_completion_tokens を使う", () => {
    useLLMStore.getState().setProvider("sarashina");
    const body = buildLLMRequest(config, messages, { stream: true });

    expect(body.max_completion_tokens).toBe(2048);
    expect(body.max_tokens).toBeUndefined();
    expect(body.stream).toBe(true);
  });

  it("Sarashina の出力上限は 8000 トークンで頭打ちになる", () => {
    useLLMStore.getState().setProvider("sarashina");
    const body = buildLLMRequest(config, messages, { maxTokens: 999999 });

    expect(body.max_completion_tokens).toBe(SARASHINA_MAX_OUTPUT_TOKENS);
  });

  it("その他のプロバイダは max_tokens を使う", () => {
    useLLMStore.getState().setProvider("openai");
    const body = buildLLMRequest(config, messages, { stream: false });

    expect(body.max_tokens).toBe(2048);
    expect(body.max_completion_tokens).toBeUndefined();
  });
});
