/** Sarashina（SB Intuitions の国産 LLM）の既定エンドポイント */
export const SARASHINA_DEFAULT_ENDPOINT =
  "https://api.sarashina.ai/v1/chat/completions";

/** Sarashina のチャット対応モデル */
export const SARASHINA_CHAT_MODELS = ["sarashina3-mini", "sarashina3-nano"];

/** Sarashina API の 1 リクエストあたりの出力上限（max_completion_tokens） */
export const SARASHINA_MAX_OUTPUT_TOKENS = 8000;
