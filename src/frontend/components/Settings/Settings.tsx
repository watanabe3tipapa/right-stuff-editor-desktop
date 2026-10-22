import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLLMStore } from "@/stores/llmStore";
import { useThemeStore, type Theme } from "@/stores/themeStore";
import { useGistStore } from "@/stores/gistStore";
import { useGhostStore } from "@/stores/ghostStore";
import { useStyleStore, type WritingStyleProfile } from "@/stores/styleStore";
import { useEntityStore, ENTITY_TYPE_LABELS, type EntityType } from "@/stores/entityStore";
import { useTimeTrackingStore } from "@/stores/timeTrackingStore";
import { useBackupSettingsStore } from "@/stores/backupSettingsStore";
import { useTemplateStore, BUILTIN_TEMPLATE_CATEGORIES } from "@/stores/templateStore";
import { useEditorStore } from "@/stores/editorStore";
import type { LLMProvider } from "@/utils/llmClient";
import { APPLEFM_DEFAULT_PORT, checkAppleFMHealth, type AppleFMHealth } from "@/utils/llmClient";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = "general" | "ai" | "memory" | "gist" | "templates";

const TAB_LABELS: Record<SettingsTab, string> = {
  general: "一般",
  ai: "AI",
  memory: "文体・メモリ",
  gist: "Gist",
  templates: "テンプレート",
};

const providerLabels: Record<LLMProvider, string> = {
  ollama: "Ollama",
  anythingllm: "AnythingLLM",
  openai: "OpenAI",
  lmstudio: "LM Studio",
  foundrylocal: "Foundry Local",
  unsloth: "Unsloth",
  applefm: "Apple FM",
  anthropic: "Anthropic",
  gemini: "Gemini",
  groq: "Groq",
  deepseek: "DeepSeek",
  mistral: "Mistral",
  together: "Together",
  openrouter: "OpenRouter",
  perplexity: "Perplexity",
  xai: "xAI",
  huggingface: "Hugging Face",
  sarashina: "Sarashina（国産LLM）",
  custom: "Custom",
};

const defaultEndpoints: Record<LLMProvider, string> = {
  ollama: "http://localhost:11434/v1/chat/completions",
  anythingllm: "http://localhost:3001/api/v1/chat",
  openai: "https://api.openai.com/v1/chat/completions",
  lmstudio: "http://localhost:1234/v1/chat/completions",
  foundrylocal: "http://localhost:8080/v1/chat/completions",
  unsloth: "http://127.0.0.1:8888/v1/chat/completions",
  applefm: `http://127.0.0.1:${APPLEFM_DEFAULT_PORT}/v1/chat/completions`,
  anthropic: "https://api.anthropic.com/v1/chat/completions",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  deepseek: "https://api.deepseek.com/v1/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
  together: "https://api.together.xyz/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  perplexity: "https://api.perplexity.ai/chat/completions",
  xai: "https://api.x.ai/v1/chat/completions",
  huggingface: "https://router.huggingface.co/v1/chat/completions",
  sarashina: "https://api.sarashina.ai/v1/chat/completions",
  custom: "",
};

// API キーが必要なクラウドプロバイダ
const PROVIDERS_REQUIRING_API_KEY: LLMProvider[] = [
  "openai", "anthropic", "gemini", "groq", "deepseek", "mistral",
  "together", "openrouter", "perplexity", "xai", "huggingface", "sarashina",
  "custom",
];

const themeLabels: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

const inputClass =
  "w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "mb-2 block text-sm font-medium text-gray-300";
const btnClass =
  "rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50";

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const { provider, config, setProvider, setConfig } = useLLMStore();
  const { theme, setTheme } = useThemeStore();
  const {
    username: gistUsername,
    isAuthenticated: gistAuthenticated,
    loading: gistLoading,
    error: gistError,
    verifyToken: gistVerifyToken,
    disconnect: gistDisconnect,
  } = useGistStore();
  const {
    enabled: ghostEnabled,
    delayMs: ghostDelayMs,
    maxTokens: ghostMaxTokens,
    setEnabled: setGhostEnabled,
    setDelayMs: setGhostDelayMs,
    setMaxTokens: setGhostMaxTokens,
  } = useGhostStore();
  const {
    profiles,
    activeProfileId,
    addProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
  } = useStyleStore();
  const {
    entities,
    addEntity,
    updateEntity,
    deleteEntity,
  } = useEntityStore();
  const {
    enabled: timeTrackingEnabled,
    setEnabled: setTimeTrackingEnabled,
  } = useTimeTrackingStore();
  const {
    enabled: backupEnabled,
    intervalMinutes: backupInterval,
    format: backupFormat,
    lastBackupAt,
    setEnabled: setBackupEnabled,
    setInterval: setBackupInterval,
    setFormat: setBackupFormat,
  } = useBackupSettingsStore();
  const {
    templates,
    load: loadTemplates,
    add: addTemplate,
    remove: removeTemplate,
    update: updateTemplate,
  } = useTemplateStore();
  const { content: currentContent, currentDocumentId, documents } = useEditorStore();

  // Template editing state
  const [tmplName, setTmplName] = useState("");
  const [tmplDescription, setTmplDescription] = useState("");
  const [tmplContent, setTmplContent] = useState("");
  const [tmplCategory, setTmplCategory] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [patInput, setPatInput] = useState("");
  const [showPat, setShowPat] = useState(false);
  const [appleFMHealth, setAppleFMHealth] = useState<AppleFMHealth | null>(null);
  const [appleFMChecking, setAppleFMChecking] = useState(false);
  const [appleFMError, setAppleFMError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Style profile editing state
  const [styleName, setStyleName] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);

  // Entity editing state
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("other");
  const [entityNotes, setEntityNotes] = useState("");
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === "templates") {
      void loadTemplates();
    }
  }, [isOpen, activeTab, loadTemplates]);

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const modelList = await useLLMStore.getState().getModels();
        setModels(modelList);
      } catch {
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    };
    void loadModels();
  }, [isOpen, provider, config.endpoint]);

  const handleProviderChange = (newProvider: LLMProvider) => {
    if (newProvider === provider) {
      setAppleFMHealth(null);
      setAppleFMError(null);
      if (newProvider === "applefm") {
        void checkAppleFM();
      }
      return;
    }
    setProvider(newProvider);
    setConfig({ endpoint: defaultEndpoints[newProvider] });
    setAppleFMHealth(null);
    setAppleFMError(null);
  };

  const checkAppleFM = useCallback(async () => {
    setAppleFMChecking(true);
    setAppleFMError(null);
    try {
      const health = await checkAppleFMHealth(config.endpoint);
      setAppleFMHealth(health);
    } catch {
      setAppleFMHealth(null);
      setAppleFMError(
        `サーバーに接続できません（127.0.0.1:${APPLEFM_DEFAULT_PORT}）。npm run applefm で起動してください。`,
      );
    } finally {
      setAppleFMChecking(false);
    }
  }, [config.endpoint]);

  useEffect(() => {
    if (!isOpen || provider !== "applefm") return;
    void checkAppleFM();
  }, [isOpen, provider, checkAppleFM]);

  const startEditStyle = (profile: WritingStyleProfile) => {
    setEditingStyleId(profile.id);
    setStyleName(profile.name);
    setStylePrompt(profile.systemPrompt);
  };

  const saveStyle = () => {
    if (!styleName.trim()) return;
    if (editingStyleId) {
      updateProfile(editingStyleId, {
        name: styleName.trim(),
        systemPrompt: stylePrompt,
      });
    } else {
      addProfile(styleName.trim(), stylePrompt);
    }
    setStyleName("");
    setStylePrompt("");
    setEditingStyleId(null);
  };

  const cancelEditStyle = () => {
    setStyleName("");
    setStylePrompt("");
    setEditingStyleId(null);
  };

  const startEditEntity = (id: string) => {
    const entity = entities.find((e) => e.id === id);
    if (!entity) return;
    setEditingEntityId(id);
    setEntityName(entity.name);
    setEntityType(entity.type);
    setEntityNotes(entity.notes);
  };

  const saveEntity = () => {
    if (!entityName.trim()) return;
    if (editingEntityId) {
      updateEntity(editingEntityId, {
        name: entityName.trim(),
        type: entityType,
        notes: entityNotes,
      });
    } else {
      addEntity(entityName.trim(), entityType, entityNotes);
    }
    setEntityName("");
    setEntityType("other");
    setEntityNotes("");
    setEditingEntityId(null);
  };

  const cancelEditEntity = () => {
    setEntityName("");
    setEntityType("other");
    setEntityNotes("");
    setEditingEntityId(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-lg border border-gray-700 bg-gray-800 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <h2 id="settings-title" className="text-lg font-semibold text-white">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 transition-colors hover:bg-gray-700"
            aria-label="設定を閉じる"
            title="Close settings"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-gray-700 px-2 pt-2">
          {(Object.keys(TAB_LABELS) as SettingsTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              aria-pressed={activeTab === tab}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-blue-500 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "general" && (
            <div className="space-y-6">
              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-gray-300">Theme</legend>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(themeLabels) as Theme[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTheme(item)}
                      aria-pressed={theme === item}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        theme === item ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {themeLabels[item]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-gray-300">執筆時間トラッキング（オプトイン）</legend>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={timeTrackingEnabled}
                    onChange={(e) => setTimeTrackingEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  エディタにフォーカスしている時間を記録する
                </label>
                <p className="mt-1 text-xs text-gray-500">ローカルにのみ記録され、外部に送信されません。</p>
              </fieldset>

              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-gray-300">自動バックアップ</legend>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={backupEnabled}
                    onChange={(e) => setBackupEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  定期的にバックアップをダウンロードする
                </label>
                <div className="mt-2 flex items-center gap-3 text-sm text-gray-300">
                  <label className="flex items-center gap-1">
                    間隔
                    <select
                      value={backupInterval}
                      onChange={(e) => setBackupInterval(Number(e.target.value))}
                      className="rounded-lg border border-gray-600 bg-gray-700 px-2 py-1 text-gray-100"
                    >
                      <option value={15}>15分</option>
                      <option value={30}>30分</option>
                      <option value={60}>1時間</option>
                      <option value={180}>3時間</option>
                      <option value={720}>12時間</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-1">
                    形式
                    <select
                      value={backupFormat}
                      onChange={(e) => setBackupFormat(e.target.value as "json" | "markdown")}
                      className="rounded-lg border border-gray-600 bg-gray-700 px-2 py-1 text-gray-100"
                    >
                      <option value="json">JSON</option>
                      <option value="markdown">Markdown</option>
                    </select>
                  </label>
                </div>
                {lastBackupAt && (
                  <p className="mt-1 text-xs text-gray-500">最終バックアップ: {new Date(lastBackupAt).toLocaleString("ja-JP")}</p>
                )}
              </fieldset>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-6">
              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-gray-300">LLM Provider</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(Object.keys(providerLabels) as LLMProvider[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleProviderChange(item)}
                      aria-pressed={provider === item}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        provider === item ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      <span className="flex flex-col items-center gap-1">
                        <span>{providerLabels[item]}</span>
                        {item === "applefm" && (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-normal ${
                            provider === item ? "bg-blue-500/40 text-blue-50" : "bg-amber-500/20 text-amber-300"
                          }`}>
                            要サーバ起動
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="llm-endpoint" className={labelClass}>Endpoint</label>
                <input
                  id="llm-endpoint"
                  type="url"
                  value={config.endpoint}
                  onChange={(event) => setConfig({ endpoint: event.target.value })}
                  placeholder={defaultEndpoints[provider]}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="llm-model" className={labelClass}>Model</label>
                {loadingModels ? (
                  <div className="text-sm text-gray-400">Loading models...</div>
                ) : models.length > 0 ? (
                  <select
                    id="llm-model"
                    value={config.model}
                    onChange={(event) => setConfig({ model: event.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select a model</option>
                    {models.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="llm-model"
                    type="text"
                    value={config.model}
                    onChange={(event) => setConfig({ model: event.target.value })}
                    placeholder="Enter model name"
                    className={inputClass}
                  />
                )}
              </div>

              {PROVIDERS_REQUIRING_API_KEY.includes(provider) && (
                <div>
                  <label htmlFor="llm-api-key" className={labelClass}>API Key</label>
                  <input
                    id="llm-api-key"
                    type="password"
                    value={config.apiKey || ""}
                    onChange={(event) => setConfig({ apiKey: event.target.value })}
                    placeholder={
                      provider === "unsloth" ? "sk-unsloth-..." :
                      provider === "anthropic" ? "sk-ant-..." :
                      provider === "sarashina" ? "Sarashina API Key" :
                      "sk-..."
                    }
                    autoComplete="off"
                    className={inputClass}
                  />
                  {provider === "unsloth" && (
                    <p className="mt-1 text-xs text-gray-400">Unsloth のローカルAPIが発行するキー（`sk-unsloth-...`）を入力します。</p>
                  )}
                  {provider === "sarashina" && (
                    <p className="mt-1 text-xs text-gray-400">
                      Sarashina の API キーを入力します（chat.sarashina.ai/dashboard/api-keys で発行）。
                      日本国内からの利用が必要です。
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="llm-temperature" className={labelClass}>Temperature</label>
                  <input
                    id="llm-temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={config.temperature ?? 0.7}
                    onChange={(event) => setConfig({ temperature: parseFloat(event.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="llm-max-tokens" className={labelClass}>Max Tokens</label>
                  <input
                    id="llm-max-tokens"
                    type="number"
                    min="1"
                    max="8192"
                    value={config.maxTokens ?? 2048}
                    onChange={(event) => setConfig({ maxTokens: parseInt(event.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="llm-system-prompt" className={labelClass}>System Prompt</label>
                <textarea
                  id="llm-system-prompt"
                  rows={3}
                  value={config.systemPrompt ?? ""}
                  onChange={(event) => setConfig({ systemPrompt: event.target.value })}
                  placeholder="すべてのリクエストに付与する指示（例: 日本語で簡潔に、具体例を交えて説明する）"
                  className={`${inputClass} resize-y`}
                />
                <p className="mt-1 text-xs text-gray-500">未入力の場合はLLMの既定の指示が使われます。</p>
              </div>

              {provider === "applefm" && (
                <fieldset className="rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                  <legend className="px-1 text-sm font-medium text-gray-300">Apple Foundation Models</legend>
                  <p className="mb-3 text-xs text-gray-400">
                    オンデバイスモデル（Apple Intelligence）を OpenAI 互換APIとして公開します。macOS 26 以降 + Apple Silicon が必要です。
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Status</span>
                      {appleFMChecking ? (
                        <span className="text-sm text-gray-400">Checking...</span>
                      ) : appleFMHealth ? (
                        <span className={`text-sm ${appleFMHealth.available ? "text-green-400" : "text-amber-400"}`}>
                          {appleFMHealth.available ? "✓ Running" : `! ${appleFMHealth.reason ?? "unavailable"}`}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Not checked</span>
                      )}
                    </div>
                    {appleFMHealth && !appleFMHealth.available && appleFMHealth.detail && (
                      <p className="text-xs text-amber-300/90">{appleFMHealth.detail}</p>
                    )}
                    {appleFMError && <p className="text-xs text-red-400">{appleFMError}</p>}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={checkAppleFM} disabled={appleFMChecking} className={btnClass}>
                        状態を確認
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      別ターミナルで <code className="text-gray-400">npm run applefm</code> を実行してサーバーを起動してください。
                    </p>
                  </div>
                </fieldset>
              )}

              <fieldset className="border-t border-gray-700 pt-6">
                <legend className="mb-2 block text-sm font-medium text-gray-300">AI 補完（ゴーストテキスト）</legend>
                <p className="mb-3 text-xs text-gray-400">入力を止めると AI が続きを候補として表示します。Tab で採用、Esc で破棄。</p>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={ghostEnabled}
                      onChange={(event) => setGhostEnabled(event.target.checked)}
                      className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">AI 補完を有効にする</span>
                  </label>
                  {ghostEnabled && (
                    <>
                      <div>
                        <label htmlFor="ghost-delay" className="mb-1 block text-xs text-gray-400">
                          待機時間（ミリ秒）: {ghostDelayMs}
                        </label>
                        <input
                          id="ghost-delay"
                          type="range"
                          min={200}
                          max={3000}
                          step={100}
                          value={ghostDelayMs}
                          onChange={(event) => setGhostDelayMs(Number(event.target.value))}
                          className="w-full accent-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="ghost-tokens" className="mb-1 block text-xs text-gray-400">
                          最大候補トークン数: {ghostMaxTokens}
                        </label>
                        <input
                          id="ghost-tokens"
                          type="range"
                          min={8}
                          max={256}
                          step={8}
                          value={ghostMaxTokens}
                          onChange={(event) => setGhostMaxTokens(Number(event.target.value))}
                          className="w-full accent-blue-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </fieldset>
            </div>
          )}

          {activeTab === "memory" && (
            <div className="space-y-8">
              {/* Writing style profiles */}
              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-gray-300">文体プロファイル</legend>
                <p className="mb-3 text-xs text-gray-400">
                  AI の出力の文体を制御します。有効なプロファイルはすべての AI リクエスト（補完・アクション・チャット）に適用されます。
                </p>

                {profiles.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {profiles.map((profile) => (
                      <div
                        key={profile.id}
                        className={`flex items-center justify-between rounded-lg border p-3 ${
                          activeProfileId === profile.id
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-gray-700"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveProfile(activeProfileId === profile.id ? null : profile.id)}
                          className="flex-1 text-left"
                          title={activeProfileId === profile.id ? "無効にする" : "有効にする"}
                        >
                          <div className="flex items-center gap-2">
                            <span className={activeProfileId === profile.id ? "text-blue-400" : "text-gray-500"}>
                              {activeProfileId === profile.id ? "●" : "○"}
                            </span>
                            <span className="text-sm font-medium text-white">{profile.name}</span>
                          </div>
                          {profile.systemPrompt && (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-400">{profile.systemPrompt}</p>
                          )}
                        </button>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEditStyle(profile)}
                            className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-white"
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProfile(profile.id)}
                            className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-red-600/20 hover:text-red-400"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3 rounded-lg border border-gray-700 p-3">
                  <div>
                    <label htmlFor="style-name" className="mb-1 block text-xs text-gray-400">名前</label>
                    <input
                      id="style-name"
                      type="text"
                      value={styleName}
                      onChange={(event) => setStyleName(event.target.value)}
                      placeholder="例: 技術文書、カジュアルブログ"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="style-prompt" className="mb-1 block text-xs text-gray-400">システムプロンプト</label>
                    <textarea
                      id="style-prompt"
                      rows={3}
                      value={stylePrompt}
                      onChange={(event) => setStylePrompt(event.target.value)}
                      placeholder="例: です・ます調で、専門用語には説明を添える"
                      className={`${inputClass} resize-y`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveStyle}
                      disabled={!styleName.trim()}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      {editingStyleId ? "更新" : "追加"}
                    </button>
                    {editingStyleId && (
                      <button type="button" onClick={cancelEditStyle} className={btnClass}>
                        キャンセル
                      </button>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Entity memory */}
              <fieldset className="border-t border-gray-700 pt-6">
                <legend className="mb-2 block text-sm font-medium text-gray-300">エンティティメモリ</legend>
                <p className="mb-3 text-xs text-gray-400">
                  よく使う固有名詞を登録すると、AI が一貫した表記で回答します。
                </p>

                {entities.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {entities.map((entity) => (
                      <div key={entity.id} className="flex items-center justify-between rounded-lg border border-gray-700 p-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{entity.name}</span>
                            <span className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400">
                              {ENTITY_TYPE_LABELS[entity.type]}
                            </span>
                          </div>
                          {entity.notes && (
                            <p className="mt-1 text-xs text-gray-400">{entity.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEditEntity(entity.id)}
                            className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-white"
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEntity(entity.id)}
                            className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-red-600/20 hover:text-red-400"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3 rounded-lg border border-gray-700 p-3">
                  <div>
                    <label htmlFor="entity-name" className="mb-1 block text-xs text-gray-400">名前</label>
                    <input
                      id="entity-name"
                      type="text"
                      value={entityName}
                      onChange={(event) => setEntityName(event.target.value)}
                      placeholder="例: 山田太郎、Textus プロジェクト"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="entity-type" className="mb-1 block text-xs text-gray-400">種類</label>
                    <select
                      id="entity-type"
                      value={entityType}
                      onChange={(event) => setEntityType(event.target.value as EntityType)}
                      className={inputClass}
                    >
                      {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map((t) => (
                        <option key={t} value={t}>{ENTITY_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="entity-notes" className="mb-1 block text-xs text-gray-400">メモ</label>
                    <textarea
                      id="entity-notes"
                      rows={2}
                      value={entityNotes}
                      onChange={(event) => setEntityNotes(event.target.value)}
                      placeholder="例: プロジェクトリード。敬称は「さん」で統一。"
                      className={`${inputClass} resize-y`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEntity}
                      disabled={!entityName.trim()}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      {editingEntityId ? "更新" : "追加"}
                    </button>
                    {editingEntityId && (
                      <button type="button" onClick={cancelEditEntity} className={btnClass}>
                        キャンセル
                      </button>
                    )}
                  </div>
                </div>
              </fieldset>
            </div>
          )}

          {activeTab === "gist" && (
            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-gray-300">GitHub Gist</legend>
              <p className="mb-3 text-xs text-gray-400">文書を GitHub Gist に保存・同期できます。</p>

              {gistAuthenticated ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-300">
                      認証済み: <span className="font-medium text-white">{gistUsername}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={gistDisconnect}
                    className="rounded-lg border border-red-600 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/20"
                  >
                    切断
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="gist-pat" className="mb-1 block text-xs text-gray-400">Personal Access Token</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          id="gist-pat"
                          type={showPat ? "text" : "password"}
                          value={patInput}
                          onChange={(event) => setPatInput(event.target.value)}
                          placeholder="ghp_xxxxxxxxxxxx"
                          autoComplete="off"
                          className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 pr-10 text-white font-mono text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPat(!showPat)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                          title={showPat ? "隠す" : "表示"}
                        >
                          {showPat ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (patInput) {
                            await gistVerifyToken(patInput);
                            if (useGistStore.getState().isAuthenticated) {
                              setPatInput("");
                            }
                          }
                        }}
                        disabled={!patInput || gistLoading}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {gistLoading ? "検証中…" : "検証"}
                      </button>
                    </div>
                  </div>
                  {gistError && <p className="text-xs text-red-400">{gistError}</p>}
                  <p className="text-xs text-gray-500">
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-gray-300"
                    >
                      GitHub Settings
                    </a>
                    {" > Developer settings > Personal access tokens > Tokens (classic)"} から発行できます。scope は <code className="rounded bg-gray-700 px-1">gist</code> のみ選択してください。
                  </p>
                </div>
              )}
            </fieldset>
          )}

          {activeTab === "templates" && (
            <div className="space-y-6">
              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-gray-300">テンプレートの管理</legend>
                <p className="mb-3 text-xs text-gray-400">
                  文書の型（逆説日報・思考の分岐記録など）を保存しておき、サイドバーの「テンプレート」から呼び出せます。
                </p>

                <div className="mb-4 rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                  <div className="mb-2 text-xs font-semibold text-gray-300">
                    {editingTemplateId ? "テンプレートを編集" : "新規テンプレート"}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={tmplName}
                      onChange={(e) => setTmplName(e.target.value)}
                      placeholder="テンプレート名"
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={tmplDescription}
                      onChange={(e) => setTmplDescription(e.target.value)}
                      placeholder="説明"
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={tmplCategory}
                      onChange={(e) => setTmplCategory(e.target.value)}
                      placeholder="カテゴリ (例: 思考記録)"
                      list="template-category-options"
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="template-category-options">
                      {BUILTIN_TEMPLATE_CATEGORIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    <textarea
                      value={tmplContent}
                      onChange={(e) => setTmplContent(e.target.value)}
                      placeholder="テンプレート内容 (Markdown)"
                      rows={5}
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 font-mono text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!tmplName.trim()) return;
                          if (editingTemplateId) {
                            await updateTemplate(editingTemplateId, {
                              name: tmplName.trim(),
                              description: tmplDescription.trim(),
                              content: tmplContent,
                              category: tmplCategory.trim() || undefined,
                            });
                          } else {
                            await addTemplate({
                              name: tmplName.trim(),
                              description: tmplDescription.trim(),
                              content: tmplContent,
                              category: tmplCategory.trim() || undefined,
                            });
                          }
                          setTmplName("");
                          setTmplDescription("");
                          setTmplContent("");
                          setTmplCategory("");
                          setEditingTemplateId(null);
                        }}
                        disabled={!tmplName.trim()}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {editingTemplateId ? "更新" : "追加"}
                      </button>
                      {editingTemplateId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTemplateId(null);
                            setTmplName("");
                            setTmplDescription("");
                            setTmplContent("");
                            setTmplCategory("");
                          }}
                          className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
                        >
                          キャンセル
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const currentDoc = documents.find((d) => d.id === currentDocumentId);
                          if (!currentDoc) return;
                          setTmplName(currentDoc.title || "Untitled");
                          setTmplDescription("");
                          setTmplContent(currentContent);
                          setTmplCategory("");
                          setEditingTemplateId(null);
                        }}
                        className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
                      >
                        現在の文書から作成
                      </button>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-700">
                  {templates.map((t) => (
                    <div key={t.id} className="flex items-start justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-100">
                          {t.name}
                          {t.builtin && (
                            <span className="ml-2 rounded bg-gray-600 px-1.5 py-0.5 text-[10px] text-gray-300">組み込み</span>
                          )}
                          {t.category && (
                            <span className="ml-2 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300">{t.category}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">{t.description}</div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTemplateId(t.id);
                            setTmplName(t.name);
                            setTmplDescription(t.description);
                            setTmplContent(t.content);
                            setTmplCategory(t.category ?? "");
                          }}
                          className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600"
                        >
                          編集
                        </button>
                        {!t.builtin && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`テンプレート「${t.name}」を削除しますか？`)) {
                                void removeTemplate(t.id);
                              }
                            }}
                            className="rounded bg-gray-700 px-2 py-1 text-xs text-red-400 hover:bg-gray-600"
                          >
                            削除
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-700 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
