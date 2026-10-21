import { useLLMStore } from "@/stores/llmStore";
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
  | "custom";

export const APPLEFM_DEFAULT_PORT = 8765;

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

/** 性能面の理由から、LLM に渡す文書は先頭優先で末尾を切り捨てる */
export const DOCUMENT_CONTEXT_LIMIT = 6000;

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
  return `${body.slice(0, DOCUMENT_CONTEXT_LIMIT)}\n\n[文書は文字数制限によりここで省略しています]`;
};

/**
 * チャット送信用の system メッセージを組み立てる。
 * ユーザー指定の systemPrompt を先頭に、文書コンテキストをその後に置く。
 */
export const buildSystemMessages = (
  systemPrompt: string | undefined,
  documentMarkdown: string | undefined,
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
): Promise<AbortController> => {
  const config = getLLMConfig();
  const controller = new AbortController();

  const requestBody: LLMRequest = {
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    stream: true,
  };

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

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
  }

  return controller;
};

export const sendNonStreamRequest = async (
  messages: LLMMessage[],
  signal?: AbortSignal,
): Promise<string> => {
  const config = getLLMConfig();

  const requestBody: LLMRequest = {
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    stream: false,
  };

  const response = await fetch(config.endpoint, {
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

  const requestBody: LLMRequest = {
    model: config.model,
    messages,
    temperature: 0.3,
    max_tokens: options?.maxTokens ?? 60,
    stream: false,
  };

  const response = await fetch(config.endpoint, {
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
