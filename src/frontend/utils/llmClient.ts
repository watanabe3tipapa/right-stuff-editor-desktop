import { useLLMStore } from "@/stores/llmStore";
import { SARASHINA_MAX_OUTPUT_TOKENS } from "./llmConstants";
import { getActiveProfile } from "@/stores/styleStore";
import { buildEntityContext } from "@/stores/entityStore";

export interface LLMConfig {
  endpoint: string;
  apiKey?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export type LLMProvider =
  | "ollama"
  | "anythingllm"
  | "openai"
  | "lmstudio"
  | "foundrylocal"
  | "unsloth"
  | "applefm"
  | "anthropic"
  | "gemini"
  | "groq"
  | "deepseek"
  | "mistral"
  | "together"
  | "openrouter"
  | "perplexity"
  | "xai"
  | "huggingface"
  | "sarashina"
  | "custom";

export const APPLEFM_DEFAULT_PORT = 8765;

export {
  SARASHINA_CHAT_MODELS,
  SARASHINA_DEFAULT_ENDPOINT,
  SARASHINA_MAX_OUTPUT_TOKENS,
} from "./llmConstants";

export const applefmBaseUrl = (endpoint: string): string =>
  endpoint
    .replace(/\/chat\/completions$/, "")
    .replace(/\/v1$/, "")
    .replace(/\/$/, "");

export interface AppleFMHealth {
  status: string;
  model: string;
  available: boolean;
  reason?: string | null;
  detail?: string | null;
  platform?: string;
  osVersion?: string;
  version?: string;
}

export const checkAppleFMHealth = async (endpoint: string): Promise<AppleFMHealth> => {
  const response = await fetch(`${applefmBaseUrl(endpoint)}/health`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  return data as AppleFMHealth;
};


export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  /** Sarashina API は max_tokens ではなく max_completion_tokens を使う */
  max_completion_tokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export const defaultLLMConfig: LLMConfig = {
  endpoint: "http://localhost:11434/v1/chat/completions",
  model: "qwen3.5:latest",
  temperature: 0.7,
  maxTokens: 2048,
};

export const getLLMConfig = (): LLMConfig => {
  try {
    return useLLMStore.getState().config;
  } catch {
    return defaultLLMConfig;
  }
};

export const getLLMProvider = (): LLMProvider => {
  try {
    return useLLMStore.getState().provider;
  } catch {
    return "ollama";
  }
};

/**
 * Sarashina API は CORS ヘッダーを返さないため、ブラウザの fetch では
 * 遮断される。tiny.fetch はバックエンド（ネイティブ層）経由でリクエストを
 * 送るため、CORS/CSP の制限を受けない。
 */
type TinyFetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: HeadersInit;
    body?: string;
    stream?: boolean;
  },
) => Promise<Response>;

const getTinyFetch = (): TinyFetchLike | null => {
  const scope = globalThis as { tiny?: { fetch?: TinyFetchLike } };
  return scope.tiny?.fetch ?? null;
};

/** Sarashina のように CORS を許可しない API 只能用 isomorphic な経路を使う */
export const shouldProxyFetch = (provider: LLMProvider): boolean =>
  provider === "sarashina" && getTinyFetch() !== null;

/**
 * リクエスト送信の共通入口。Sarashina の場合はバックエンド経由の
 * tiny.fetch、それ以外は通常の fetch を使う。
 */
const llmFetch = async (
  url: string,
  init: RequestInit,
  options?: { streamBody?: boolean },
): Promise<Response> => {
  if (shouldProxyFetch(getLLMProvider())) {
    const tinyFetch = getTinyFetch();
    if (tinyFetch) {
      const { signal: _signal, ...rest } = init;
      return tinyFetch(url, {
        method: rest.method,
        headers: rest.headers,
        body: typeof rest.body === "string" ? rest.body : undefined,
        stream: options?.streamBody === true,
      });
    }
  }
  return fetch(url, init);
};

/**
 * プロバイダごとのリクエストボディを作る。
 * Sarashina API は未サポートのフィールドを含むと 400 になるため、
 * max_tokens を渡さず max_completion_tokens を使う。
 */
export const buildLLMRequest = (
  config: LLMConfig,
  messages: LLMMessage[],
  options?: { stream?: boolean; maxTokens?: number; temperature?: number },
): LLMRequest => {
  const stream = options?.stream ?? false;
  const temperature = options?.temperature ?? config.temperature;
  const maxTokens = options?.maxTokens ?? config.maxTokens;

  if (getLLMProvider() === "sarashina") {
    const capped = Math.min(
      Math.max(1, maxTokens ?? SARASHINA_MAX_OUTPUT_TOKENS),
      SARASHINA_MAX_OUTPUT_TOKENS,
    );
    return {
      model: config.model,
      messages,
      temperature,
      max_completion_tokens: capped,
      stream,
    };
  }

  return {
    model: config.model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream,
  };
};

/** 性能面の理由から、LLM に渡す文書は文字数で打ち切る */
export const DOCUMENT_CONTEXT_LIMIT = 6000;

/** 打ち切る場合は先頭 2/3 と末尾 1/3 を残す（末尾に執筆中の内容が多いため） */
const DOCUMENT_HEAD_RATIO = 0.66;

/**
 * 文体プロファイル + エンティティメモリのコンテキストを組み立てる。
 * AI アクション・ゴースト補完・チャットのいずれからも呼ばれる。
 */
export const buildAIContext = (): string => {
  const parts: string[] = [];
  try {
    const profile = getActiveProfile();
    if (profile?.systemPrompt.trim()) {
      parts.push(`文体プロファイル「${profile.name}」:\n${profile.systemPrompt.trim()}`);
    }
  } catch {
    // store not ready
  }
  try {
    const entityContext = buildEntityContext();
    if (entityContext) {
      parts.push(entityContext);
    }
  } catch {
    // store not ready
  }
  return parts.join("\n\n");
};

export const buildDocumentContext = (markdown: string): string => {
  const body = markdown.trim();
  if (!body) return "";
  if (body.length <= DOCUMENT_CONTEXT_LIMIT) return body;
  const head = Math.floor(DOCUMENT_CONTEXT_LIMIT * DOCUMENT_HEAD_RATIO);
  const tail = DOCUMENT_CONTEXT_LIMIT - head;
  const omitted = body.length - DOCUMENT_CONTEXT_LIMIT;
  return (
    `${body.slice(0, head)}\n\n` +
    `[中略 ${omitted.toLocaleString("ja-JP")} 文字]\n\n` +
    `${body.slice(-tail)}`
  );
};

/**
 * チャット送信用の system メッセージを組み立てる。
 * ユーザー指定の systemPrompt を先頭に、文書コンテキストをその後に置く。
 */
export const buildSystemMessages = (
  systemPrompt: string | undefined,
  documentMarkdown: string | undefined,
  options?: { selection?: string },
): LLMMessage[] => {
  const messages: LLMMessage[] = [];
  const custom = systemPrompt?.trim();
  if (custom) {
    messages.push({ role: "system", content: custom });
  }
  const aiContext = buildAIContext();
  if (aiContext) {
    messages.push({ role: "system", content: aiContext });
  }
  const selection = options?.selection?.trim();
  if (selection) {
    messages.push({
      role: "system",
      content: `以下は、ユーザーが編集中のテキストで選択した部分です。この部分について、質問や指示に対応した回答をしてください。\n\n---\n${selection}\n---`,
    });
  }
  const document = documentMarkdown ? buildDocumentContext(documentMarkdown) : "";
  if (document) {
    messages.push({
      role: "system",
      content: `以下は、ユーザーが現在編集中の文書（Markdown）です。これに基づいて回答や提案をしてください。\n\n---\n${document}\n---`,
    });
  }
  return messages;
};

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const text = await response.text();
    if (!text) return `HTTP error! status: ${response.status}`;
    try {
      const parsed = JSON.parse(text);
      const message = parsed?.error?.message ?? parsed?.message;
      if (typeof message === "string" && message) return message;
    } catch {
      // fall through to raw text
    }
    return text.slice(0, 500);
  } catch {
    return `HTTP error! status: ${response.status}`;
  }
};

export const sendChatRequest = async (
  messages: LLMMessage[],
  callbacks: StreamCallbacks,
  externalSignal?: AbortSignal,
): Promise<AbortController> => {
  const config = getLLMConfig();
  const controller = new AbortController();
  const signal = externalSignal ?? controller.signal;
  const abortFromExternal = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", abortFromExternal);
  }

  const requestBody = buildLLMRequest(config, messages, { stream: true });

  try {
    const response = await llmFetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(requestBody),
      signal,
    }, { streamBody: true });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completed = false;

    // tiny.fetch には AbortSignal を渡せないため、リーダーを停止して中断する
    if (shouldProxyFetch(getLLMProvider())) {
      const cancel = () => {
        void reader.cancel().catch(() => undefined);
      };
      if (signal.aborted) cancel();
      else signal.addEventListener("abort", cancel, { once: true });
    }

    const complete = () => {
      if (completed) return;
      completed = true;
      callbacks.onComplete();
    };

    const handleLine = (line: string): boolean => {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) return false;

      const data = trimmed.slice(6);
      if (data === "[DONE]") {
        complete();
        return true;
      }

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        const content = delta?.content || "";
        const reasoning = delta?.reasoning || "";
        if (content) {
          callbacks.onChunk(content);
        }
        if (reasoning) {
          callbacks.onChunk(reasoning);
        }
      } catch {
        // Skip invalid JSON
      }
      return false;
    };

    const readChunk = async () => {
      const { done, value } = await reader.read();

      if (value) {
        buffer += decoder.decode(value, { stream: true });
      }

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (handleLine(line)) {
          await reader.cancel().catch(() => undefined);
          return;
        }
      }

      if (done) {
        if (buffer.trim()) handleLine(buffer);
        complete();
        return;
      }

      readChunk();
    };

    void readChunk();
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      callbacks.onError(error as Error);
    }
  } finally {
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }

  return controller;
};

/** エンドポイントへ到達できるかの軽量チェック（HTTP 応答があれば到達可能とみなす） */
export const probeLLMEndpoint = async (
  endpoint: string,
): Promise<{ ok: boolean; detail: string }> => {
  const base = endpoint
    .replace(/\/chat\/completions$/, "")
    .replace(/\/v1$/, "")
    .replace(/\/$/, "");
  if (!base) return { ok: false, detail: "エンドポイントが未設定です" };
  try {
    const response = await llmFetch(base, { method: "GET" });
    return { ok: true, detail: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, detail: (error as Error).message || "接続できませんでした" };
  }
};

export const sendNonStreamRequest = async (
  messages: LLMMessage[],
  signal?: AbortSignal,
): Promise<string> => {
  const config = getLLMConfig();

  const requestBody = buildLLMRequest(config, messages, { stream: false });

  const response = await llmFetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify(requestBody),
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data: LLMResponse = await response.json();
  return data.choices[0]?.message?.content || "";
};

/**
 * ゴーストテキスト補完用のリクエスト。
 * カーソル位置までの行テキストから続きを予測する。
 */
export const requestGhostSuggestion = async (
  lineContext: string,
  options?: { maxTokens?: number; signal?: AbortSignal },
): Promise<string> => {
  const config = getLLMConfig();

  const aiContext = buildAIContext();
  const systemParts = [
    "あなたはテキストエディタの補完アシスタントです。" +
    "ユーザーが書いている文章の続きを、1文だけ簡潔に予測してください。" +
    "前置き・説明・引用符・改行は一切含めず、補完テキストのみを返してください。" +
    "文脈が不足している場合は空文字を返してください。",
  ];
  if (aiContext) {
    systemParts.push(aiContext);
  }

  const messages: LLMMessage[] = [
    {
      role: "system",
      content: systemParts.join("\n\n"),
    },
    {
      role: "user",
      content: `次の文章の続きを予測してください:\n\n${lineContext}`,
    },
  ];

  const requestBody = buildLLMRequest(config, messages, {
    stream: false,
    temperature: 0.3,
    maxTokens: options?.maxTokens ?? 60,
  });

  const response = await llmFetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify(requestBody),
    ...(options?.signal ? { signal: options.signal } : {}),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data: LLMResponse = await response.json();
  const raw = data.choices[0]?.message?.content || "";
  return raw.replace(/^["'\s]+|["'\s]+$/g, "");
};
