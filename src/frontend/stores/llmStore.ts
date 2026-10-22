import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LLMConfig, LLMProvider } from "@/utils/llmClient";

const APPLEFM_DEFAULT_PORT = 8765;

interface LLMStore {
  provider: LLMProvider;
  config: LLMConfig;
  setProvider: (provider: LLMProvider) => void;
  setConfig: (config: Partial<LLMConfig>) => void;
  getModels: () => Promise<string[]>;
}

const defaultConfigs: Record<LLMProvider, LLMConfig> = {
  ollama: {
    endpoint: "http://localhost:11434/v1/chat/completions",
    model: "llama3.2",
    temperature: 0.7,
    maxTokens: 2048,
  },
  anythingllm: {
    endpoint: "http://localhost:3001/api/v1/chat",
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 2048,
  },
  lmstudio: {
    endpoint: "http://localhost:1234/v1/chat/completions",
    model: "",
    temperature: 0.7,
    maxTokens: 2048,
  },
  foundrylocal: {
    endpoint: "http://localhost:8080/v1/chat/completions",
    model: "qwen2.5-0.5b",
    temperature: 0.7,
    maxTokens: 2048,
  },
  unsloth: {
    endpoint: "http://127.0.0.1:8888/v1/chat/completions",
    model: "",
    temperature: 0.7,
    maxTokens: 2048,
  },
  applefm: {
    endpoint: `http://127.0.0.1:${APPLEFM_DEFAULT_PORT}/v1/chat/completions`,
    model: "apple-foundation-model",
    temperature: 0.7,
    maxTokens: 1024,
  },
  openai: {
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 2048,
  },
  custom: {
    endpoint: "",
    model: "",
    temperature: 0.7,
    maxTokens: 2048,
  },
  anthropic: {
    endpoint: "https://api.anthropic.com/v1/chat/completions",
    model: "claude-sonnet-4-20250514",
    temperature: 0.7,
    maxTokens: 2048,
  },
  gemini: {
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-2.5-flash",
    temperature: 0.7,
    maxTokens: 2048,
  },
  groq: {
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    maxTokens: 2048,
  },
  deepseek: {
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
    temperature: 0.7,
    maxTokens: 2048,
  },
  mistral: {
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    model: "mistral-large-latest",
    temperature: 0.7,
    maxTokens: 2048,
  },
  together: {
    endpoint: "https://api.together.xyz/v1/chat/completions",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    temperature: 0.7,
    maxTokens: 2048,
  },
  openrouter: {
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model: "openrouter/auto",
    temperature: 0.7,
    maxTokens: 2048,
  },
  perplexity: {
    endpoint: "https://api.perplexity.ai/chat/completions",
    model: "sonar",
    temperature: 0.7,
    maxTokens: 2048,
  },
  xai: {
    endpoint: "https://api.x.ai/v1/chat/completions",
    model: "grok-3",
    temperature: 0.7,
    maxTokens: 2048,
  },
  huggingface: {
    endpoint: "https://router.huggingface.co/v1/chat/completions",
    model: "meta-llama/Llama-3.3-70B-Instruct",
    temperature: 0.7,
    maxTokens: 2048,
  },
};

export const useLLMStore = create<LLMStore>()(
  persist(
    (set, get) => ({
      provider: "ollama",
      config: defaultConfigs.ollama,

      setProvider: (provider: LLMProvider) => {
        set({
          provider,
          config: defaultConfigs[provider],
        });
      },

      setConfig: (config: Partial<LLMConfig>) => {
        set((state) => ({
          config: { ...state.config, ...config },
        }));
      },

      getModels: async () => {
        const { provider, config } = get();

        try {
          if (provider === "ollama") {
            const response = await fetch("http://localhost:11434/api/tags");
            if (!response.ok) return [];
            const data = await response.json();
            return data.models?.map((m: { name: string }) => m.name) || [];
          }

          if (provider === "anythingllm" || provider === "lmstudio" || provider === "foundrylocal") {
            return [config.model];
          }

          if (provider === "applefm") {
            const baseUrl = config.endpoint
              .replace(/\/chat\/completions$/, "")
              .replace(/\/$/, "");
            const response = await fetch(`${baseUrl}/models`, {
              headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.data?.map((m: { id: string }) => m.id) || [];
          }

          if (provider === "openai" && config.apiKey) {
            const response = await fetch("https://api.openai.com/v1/models", {
              headers: {
                Authorization: `Bearer ${config.apiKey}`,
              },
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.data?.map((m: { id: string }) => m.id) || [];
          }

          if (provider === "unsloth") {
            const baseUrl = config.endpoint
              .replace(/\/chat\/completions$/, "")
              .replace(/\/$/, "");
            const response = await fetch(`${baseUrl}/models`, {
              headers: {
                "Content-Type": "application/json",
                ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
              },
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.data?.map((m: { id: string }) => m.id) || [];
          }

          // OpenAI 互換 API の /models エンドポイントを持つプロバイダ
          const openAICompat: LLMProvider[] = [
            "anthropic", "gemini", "groq", "deepseek", "mistral",
            "together", "openrouter", "perplexity", "xai", "huggingface",
          ];
          if (openAICompat.includes(provider) && config.endpoint) {
            const baseUrl = config.endpoint
              .replace(/\/chat\/completions$/, "")
              .replace(/\/$/, "");
            const response = await fetch(`${baseUrl}/models`, {
              headers: {
                "Content-Type": "application/json",
                ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
              },
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.data?.map((m: { id: string }) => m.id) || [];
          }
        } catch {
          return [];
        }

        return [];
      },
    }),
    {
      name: "right-stuff-editor-dash-llm-storage",
    }
  )
);

export default useLLMStore;
