import { sendNonStreamRequest, buildSystemMessages } from "./llmClient";
import { markdownToPlainText } from "./markdown";

export interface DocumentAISummary {
  summary: string;
  tags: string[];
}

const extractJson = (text: string): DocumentAISummary | null => {
  // LLM が ```json ブロックや前後の説明を含める場合があるため、JSON 部分を抽出
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.summary === "string" && Array.isArray(parsed.tags)) {
      return {
        summary: parsed.summary,
        tags: parsed.tags.map((t: unknown) => String(t)).slice(0, 6),
      };
    }
  } catch {
    return null;
  }
  return null;
};

export const generateDocumentSummary = async (
  title: string,
  content: string,
): Promise<DocumentAISummary> => {
  const plain = markdownToPlainText(content).slice(0, 4000);
  const systemMessages = buildSystemMessages(undefined, "");
  const messages = [
    ...systemMessages,
    {
      role: "system" as const,
      content:
        "あなたは文書の整理アシスタントです。与えられた文書の要約(150字以内の日本語)と、内容を表す短いタグ(最大6つ、日本語または英語)を、次の JSON 形式のみで出力してください:\n" +
        '{"summary": "...", "tags": ["...", "..."]}',
    },
    {
      role: "user" as const,
      content: `タイトル: ${title || "Untitled"}\n\n本文:\n${plain}`,
    },
  ];
  const raw = await sendNonStreamRequest(messages);
  const parsed = extractJson(raw);
  if (parsed) return parsed;
  // フォールバック: 先頭150字を要約として扱う
  return { summary: plain.slice(0, 150), tags: [] };
};
