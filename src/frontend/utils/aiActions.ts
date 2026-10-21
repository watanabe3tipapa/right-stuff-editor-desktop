import { sendNonStreamRequest, buildAIContext, type LLMMessage } from "./llmClient";

export interface AIAction {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  systemPrompt: string;
}

export const AI_ACTIONS: AIAction[] = [
  {
    id: "proofread",
    label: "校正",
    description: "誤字脱字・文法を修正",
    keywords: ["proofread", "校正", "proof", "check"],
    systemPrompt:
      "あなたはプロの校正者です。与えられたテキストの誤字脱字・文法・表記を修正してください。" +
      "元の文体と意味は維持し、修正されたテキストのみを返してください。",
  },
  {
    id: "rewrite",
    label: "書き直し",
    description: "表現を改善して書き直す",
    keywords: ["rewrite", "書き直し", "improve", "polish"],
    systemPrompt:
      "あなたはプロのライターです。与えられたテキストをより読みやすく自然な表現に書き直してください。" +
      "意味は維持し、書き直されたテキストのみを返してください。",
  },
  {
    id: "simplify",
    label: "シンプルに",
    description: "分かりやすく簡潔に",
    keywords: ["simplify", "シンプル", "short", "brief"],
    systemPrompt:
      "あなたはプロのライターです。与えられたテキストを誰にでも分かるように簡潔に書き直してください。" +
      "簡潔になったテキストのみを返してください。",
  },
  {
    id: "expand",
    label: "詳しく",
    description: "内容を拡充する",
    keywords: ["expand", "詳しく", "detail", "elaborate"],
    systemPrompt:
      "あなたはプロのライターです。与えられたテキストの内容を詳しく拡充してください。" +
      "拡充されたテキストのみを返してください。",
  },
  {
    id: "summary",
    label: "要約",
    description: "要点をまとめる",
    keywords: ["summary", "要約", "summarize", "digest"],
    systemPrompt:
      "あなたはプロの要約者です。与えられたテキストを3文以内に要約してください。" +
      "要約のみを返してください。",
  },
  {
    id: "translate_en",
    label: "英訳",
    description: "英語に翻訳",
    keywords: ["translate", "英訳", "english", "en"],
    systemPrompt:
      "あなたはプロの翻訳者です。与えられたテキストを自然な英語に翻訳してください。" +
      "翻訳されたテキストのみを返してください。",
  },
  {
    id: "translate_ja",
    label: "和訳",
    description: "日本語に翻訳",
    keywords: ["translate", "和訳", "japanese", "ja"],
    systemPrompt:
      "あなたはプロの翻訳者です。与えられたテキストを自然な日本語に翻訳してください。" +
      "翻訳されたテキストのみを返してください。",
  },
  {
    id: "tone_formal",
    label: "フォーマルに",
    description: "改まった表現に",
    keywords: ["formal", "フォーマル", "business", "丁寧"],
    systemPrompt:
      "あなたはプロのライターです。与えられたテキストをビジネス文書向けのフォーマルな表現に書き直してください。" +
      "書き直されたテキストのみを返してください。",
  },
  {
    id: "tone_casual",
    label: "カジュアルに",
    description: "気軽な表現に",
    keywords: ["casual", "カジュアル", "friendly", "friendly"],
    systemPrompt:
      "あなたはプロのライターです。与えられたテキストをカジュアルで親しみやすい表現に書き直してください。" +
      "書き直されたテキストのみを返してください。",
  },
  {
    id: "bullet",
    label: "箇条書きに",
    description: "リスト形式に変換",
    keywords: ["bullet", "箇条書き", "list", "points"],
    systemPrompt:
      "あなたはプロのライターです。与えられたテキストの要点を箇条書き（- 形式）に変換してください。" +
      "箇条書きのみを返してください。",
  },
];

export const runAIAction = async (
  action: AIAction,
  text: string,
  signal?: AbortSignal,
): Promise<string> => {
  const aiContext = buildAIContext();
  const systemParts = [action.systemPrompt];
  if (aiContext) {
    systemParts.push(aiContext);
  }
  const messages: LLMMessage[] = [
    { role: "system", content: systemParts.join("\n\n") },
    { role: "user", content: text },
  ];
  return sendNonStreamRequest(messages, signal);
};
