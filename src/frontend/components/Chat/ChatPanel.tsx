import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatStore, type ContextMode } from "@/stores/chatStore";
import { useEditorStore } from "@/stores/editorStore";
import { useLLMStore } from "@/stores/llmStore";
import {
  buildSystemMessages,
  DOCUMENT_CONTEXT_LIMIT,
  probeLLMEndpoint,
  sendChatRequest,
  type LLMMessage,
} from "@/utils/llmClient";
import {
  appendTextToLexical,
  getSelectedText,
  replaceSelectionWithText,
} from "@/utils/editorBridge";
import { AI_ACTIONS, runAIAction, type AIAction } from "@/utils/aiActions";
import { MarkdownContent } from "./MarkdownContent";
import type { Message } from "@/types";

interface ChatPanelProps {
  className?: string;
  onOpenSettings?: () => void;
}

type ModelStatus = "idle" | "checking" | "ok" | "ng";

const PROVIDER_LABELS: Record<string, string> = {
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
  together: "Together AI",
  openrouter: "OpenRouter",
  perplexity: "Perplexity",
  xai: "xAI",
  huggingface: "Hugging Face",
  custom: "カスタム",
};

const PROMPT_TEMPLATES = [
  { label: "続きを書く", template: "これまでの文章の続きを書いてください" },
  { label: "要約", template: "この文書の内容を要約してください" },
  { label: "推敲", template: "この文章の表現を推敲して、より明確にしてください" },
  { label: "例を追加", template: "このセクションに適切な例を追加してください" },
  { label: "質問を作る", template: "この文書について聞きたい質問を作ってください" },
];

const toRequestMessages = (messages: Message[]): LLMMessage[] =>
  messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));

export const ChatPanel: React.FC<ChatPanelProps> = ({
  className = "",
  onOpenSettings,
}) => {
  const {
    messages,
    isStreaming,
    cancelStream,
    clearMessages,
    sessions,
    createSession,
    switchSession,
    deleteSession,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [modelDetail, setModelDetail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [selectionText, setSelectionText] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamBufferRef = useRef("");
  const lastRequestRef = useRef<{ messages: LLMMessage[]; assistantId: string } | null>(
    null,
  );

  const provider = useLLMStore((state) => state.provider);
  const model = useLLMStore((state) => state.config.model);
  const includeDocument = useChatStore((state) => state.includeDocument);
  const setIncludeDocument = useChatStore((state) => state.setIncludeDocument);
  const contextMode = useChatStore((state) => state.contextMode);
  const setContextMode = useChatStore((state) => state.setContextMode);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!isStreaming) {
      setElapsed(0);
      return undefined;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => window.clearInterval(timer);
  }, [isStreaming]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 2000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // 選択範囲の変化を追跡して、送信する文脈を事前に提示する
  useEffect(() => {
    const update = () => {
      const text = getSelectedText().trim();
      setSelectionText((previous) => (previous === text ? previous : text));
    };
    document.addEventListener("selectionchange", update);
    document.addEventListener("input", update);
    update();
    return () => {
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("input", update);
    };
  }, []);

  const probeModel = useCallback(async () => {
    setModelStatus("checking");
    const endpoint = useLLMStore.getState().config.endpoint;
    const result = await probeLLMEndpoint(endpoint);
    setModelStatus(result.ok ? "ok" : "ng");
    setModelDetail(result.detail);
  }, []);

  useEffect(() => {
    void probeModel();
  }, [probeModel]);

  /** 現在の設定から、実際に送信する文脈（文書 / 選択範囲）を決める */
  const resolveContext = useCallback((): { document: string; selection: string } => {
    const { contextMode: mode } = useChatStore.getState();
    const document = useEditorStore.getState().content;
    const selection = getSelectedText().trim();
    if (mode === "none") return { document: "", selection: "" };
    if (mode === "selection") return { document: "", selection };
    if (mode === "document") return { document, selection: "" };
    // auto: 選択があれば選択範囲、なければ文書全体
    return selection ? { document: "", selection } : { document, selection: "" };
  }, []);

  const runRequest = useCallback(
    async (requestMessages: LLMMessage[], assistantMessageId: string) => {
      const { includeDocument: withDocument } = useChatStore.getState();
      const context = resolveContext();
      const systemMessages = buildSystemMessages(
        useLLMStore.getState().config.systemPrompt,
        withDocument ? context.document : undefined,
        { selection: context.selection },
      );

      const controller = new AbortController();
      useChatStore.getState().setAbortController(controller);
      streamBufferRef.current = "";
      lastRequestRef.current = { messages: requestMessages, assistantId: assistantMessageId };
      setError(null);

      await sendChatRequest(
        [...systemMessages, ...requestMessages],
        {
          onChunk: (chunk) => {
            streamBufferRef.current += chunk;
            useChatStore
              .getState()
              .updateStreamingMessage(assistantMessageId, streamBufferRef.current);
          },
          onComplete: () => {
            useChatStore.getState().setStreaming(false, null);
            useChatStore.getState().setAbortController(null);
            setModelStatus("ok");
          },
          onError: (streamError) => {
            useChatStore.getState().setStreaming(false, null);
            useChatStore.getState().setAbortController(null);
            setModelStatus("ng");
            setModelDetail(streamError.message);
            const text =
              streamError.message || "LLM エンドポイントに接続できませんでした。";
            const current = useChatStore
              .getState()
              .messages.find((message) => message.id === assistantMessageId);
            if (current && !current.content.trim()) {
              useChatStore
                .getState()
                .updateStreamingMessage(assistantMessageId, text);
            } else {
              setError(text);
            }
          },
        },
        controller.signal,
      );
    },
    [resolveContext],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const text = input.trim();
      if (!text || isStreaming) return;

      // 送信前の履歴を先に控えておく。sendMessage 後に読むと直前の発言が二重に送られる
      const history = toRequestMessages(useChatStore.getState().messages);
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      const assistantMessageId = crypto.randomUUID();

      setInput("");
      setError(null);
      useChatStore.getState().sendMessage(userMessage, assistantMessageId);

      await runRequest(
        [...history, { role: "user", content: text }],
        assistantMessageId,
      );
    },
    [input, isStreaming, runRequest],
  );

  const handleRegenerate = useCallback(
    async (assistantMessageId: string) => {
      if (isStreaming) return;
      const all = useChatStore.getState().messages;
      const index = all.findIndex((message) => message.id === assistantMessageId);
      if (index < 0) return;

      let userIndex = -1;
      for (let i = index - 1; i >= 0; i -= 1) {
        if (all[i].role === "user") {
          userIndex = i;
          break;
        }
      }
      if (userIndex < 0) return;

      const history = toRequestMessages(all.slice(0, userIndex));
      const userMessage = all[userIndex];
      const newAssistantId = crypto.randomUUID();

      useChatStore.getState().removeMessage(assistantMessageId);
      useChatStore.getState().startAssistantReply(newAssistantId);

      await runRequest(
        [...history, { role: "user", content: userMessage.content }],
        newAssistantId,
      );
    },
    [isStreaming, runRequest],
  );

  const handleRetry = useCallback(async () => {
    const last = lastRequestRef.current;
    if (!last || isStreaming) return;
    useChatStore.getState().removeMessage(last.assistantId);
    useChatStore.getState().startAssistantReply(last.assistantId);
    await runRequest(last.messages, last.assistantId);
  }, [isStreaming, runRequest]);

  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setNotice("クリップボードにコピーしました");
    } catch {
      setNotice("コピーに失敗しました");
    }
  }, []);

  const handleInsert = useCallback((content: string) => {
    const { mode } = useEditorStore.getState();
    if (mode === "rich") {
      const ok = appendTextToLexical(content);
      if (!ok) {
        useEditorStore.getState().appendContent(content);
      }
    } else {
      useEditorStore.getState().appendContent(content);
    }
    setNotice("編集末尾に挿入しました");
  }, []);

  const handleReplace = useCallback((content: string) => {
    const { mode, replaceMarkdownSelection } = useEditorStore.getState();
    if (mode === "rich") {
      if (replaceSelectionWithText(content)) {
        setNotice("選択範囲を置き換えました");
      } else {
        setNotice("選択範囲がありません");
      }
      return;
    }
    if (replaceMarkdownSelection(content)) {
      setNotice("選択範囲を置き換えました");
    } else {
      setNotice("Markdown モードでは選択範囲がありません");
    }
  }, []);

  const handleAttachSelection = useCallback(() => {
    const text = getSelectedText().trim();
    if (!text) {
      setNotice("テキストが選択されていません");
      return;
    }
    setContextMode("selection");
    setNotice(`選択範囲 ${text.length.toLocaleString("ja-JP")} 文字を文脈に含めます`);
    inputRef.current?.focus();
  }, [setContextMode]);

  const handleRunAction = useCallback(
    async (action: AIAction) => {
      if (actionBusy) return;
      const selection = getSelectedText().trim();
      const document = useEditorStore.getState().content.trim();
      const target = selection || document.slice(0, 4000);
      if (!target) {
        setNotice("処理するテキストがありません");
        return;
      }
      setActionBusy(action.id);
      try {
        const result = await runAIAction(action, target);
        if (!result.trim()) {
          setNotice("結果が空でした");
          return;
        }
        useChatStore.getState().appendAssistantMessage(`**${action.label}**\n\n${result.trim()}`);
        setNotice(`${action.label} を実行しました`);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : `${action.label} の実行に失敗しました`,
        );
      } finally {
        setActionBusy(null);
      }
    },
    [actionBusy],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const native = event.nativeEvent as KeyboardEvent;
      // IME 変換中の Enter は確定操作なので送信しない
      if (native.isComposing || native.keyCode === 229) return;
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void handleSubmit(event);
      }
    },
    [handleSubmit],
  );

  // 文字数表示のためだけに文書本文を購読すると入力のたびに再描画されるため、長さだけを購読する
  const documentLength = useEditorStore((state) => state.content.trim().length);
  const truncated = documentLength > DOCUMENT_CONTEXT_LIMIT;

  const documentTruncated = documentLength > DOCUMENT_CONTEXT_LIMIT;
  const documentOmitted = documentTruncated ? documentLength - DOCUMENT_CONTEXT_LIMIT : 0;
  const contextSummary = useMemo(() => {
    if (contextMode === "none") return "文脈は送りません";
    if (contextMode === "selection") {
      return selectionText
        ? `選択範囲 ${selectionText.length.toLocaleString("ja-JP")} 文字`
        : "選択範囲が未選択です";
    }
    if (contextMode === "document") {
      return documentTruncated
        ? `文書 ${DOCUMENT_CONTEXT_LIMIT.toLocaleString("ja-JP")} 文字（先頭と末尾、中略 ${documentOmitted.toLocaleString("ja-JP")} 文字）`
        : `文書 ${documentLength.toLocaleString("ja-JP")} 文字`;
    }
    return selectionText
      ? `選択範囲 ${selectionText.length.toLocaleString("ja-JP")} 文字`
      : documentTruncated
        ? `文書 ${DOCUMENT_CONTEXT_LIMIT.toLocaleString("ja-JP")} 文字（先頭と末尾、中略 ${documentOmitted.toLocaleString("ja-JP")} 文字）`
        : `文書 ${documentLength.toLocaleString("ja-JP")} 文字`;
  }, [contextMode, selectionText, documentLength, documentTruncated, documentOmitted]);

  const providerLabel = PROVIDER_LABELS[provider] ?? provider;
  const statusDotClass =
    modelStatus === "ok"
      ? "bg-green-400"
      : modelStatus === "ng"
        ? "bg-red-400"
        : modelStatus === "checking"
          ? "bg-amber-400 animate-pulse"
          : "bg-gray-500";
  const statusLabel =
    modelStatus === "ok"
      ? "接続OK"
      : modelStatus === "ng"
        ? "接続失敗"
        : modelStatus === "checking"
          ? "確認中"
          : "未確認";

  return (
    <div
      className={`flex flex-col h-full min-h-0 bg-gray-900 text-gray-100 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((previous) => !previous)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="セッション一覧"
            aria-label="セッション一覧"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h2 className="font-semibold text-base whitespace-nowrap">AI アシスタント</h2>
        </div>
        <div className="flex items-center gap-1">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 rounded hover:bg-gray-700 transition-colors"
              title="LLM 設定を開く"
            >
              設定
            </button>
          )}
          <button
            type="button"
            onClick={clearMessages}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="会話を消去"
            aria-label="会話を消去"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void probeModel()}
        className="flex items-center gap-2 border-b border-gray-800 px-4 py-1.5 text-[11px] text-gray-400 hover:bg-gray-800/60 transition-colors text-left"
        title={`${providerLabel} / ${model || "モデル未設定"}\n${modelDetail || "クリックで接続を確認します"}`}
      >
        <span className={`w-2 h-2 shrink-0 rounded-full ${statusDotClass}`} />
        <span className="truncate">{model || "モデル未設定"}</span>
        <span className="text-gray-600">·</span>
        <span className="shrink-0 text-gray-500">{providerLabel}</span>
        <span className="ml-auto shrink-0 text-gray-500">{statusLabel}</span>
      </button>

      {sidebarOpen && (
        <div className="border-b border-gray-700 p-3 bg-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">セッション</span>
            <button
              type="button"
              onClick={() => {
                createSession();
                setSidebarOpen(false);
              }}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              + 新規
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {sessions.length === 0 ? (
              <p className="text-sm text-gray-500 italic">セッションがありません</p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50 group"
                >
                  <button
                    type="button"
                    onClick={() => {
                      switchSession(session.id);
                      setSidebarOpen(false);
                    }}
                    className="text-sm text-left truncate flex-1 hover:text-white"
                    title={session.title}
                  >
                    {session.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSession(session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                    title="セッションを削除"
                    aria-label="セッションを削除"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 pb-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <svg
              className="w-16 h-16 mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-lg font-medium mb-2">会話を始めましょう</p>
            <p className="text-sm text-center max-w-xs">
              編集中の文書について何でも質問できます。
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const canRegenerate = messages[index - 1]?.role === "user";
            return (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 ${message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-100"}`}
              >
                <div className="flex items-center justify-between text-xs font-medium mb-1 opacity-70">
                  <span>{message.role === "user" ? "あなた" : "アシスタント"}</span>
                  <span className="ml-2">{new Date(message.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="prose prose-invert prose-sm max-w-none">
                  {message.role === "assistant" ? (
                    <MarkdownContent content={message.content} />
                  ) : (
                    <pre className="whitespace-pre-wrap break-words font-sans bg-transparent p-0 m-0">
                      {message.content}
                    </pre>
                  )}
                </div>
                {message.role === "assistant" && message.content.trim() && (
                  <div className="mt-2 flex items-center gap-1 border-t border-white/10 pt-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => void handleCopy(message.content)}
                      className="px-1.5 py-0.5 rounded text-blue-200 hover:bg-white/10 transition-colors"
                    >
                      コピー
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsert(message.content)}
                      className="px-1.5 py-0.5 rounded text-blue-200 hover:bg-white/10 transition-colors"
                      title="編集末尾に挿入"
                    >
                      挿入
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReplace(message.content)}
                      className="px-1.5 py-0.5 rounded text-blue-200 hover:bg-white/10 transition-colors"
                      title="選択範囲を置き換え"
                    >
                      置換
                    </button>
                    {canRegenerate && (
                      <button
                        type="button"
                        onClick={() => void handleRegenerate(message.id)}
                        disabled={isStreaming}
                        className="px-1.5 py-0.5 rounded text-blue-200 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="同じ質問で再生成"
                      >
                        再生成
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }))}
        <div ref={messagesEndRef} />
      </div>

      {notice && (
        <div className="mx-3 mb-2 rounded border border-emerald-700 bg-emerald-950/40 px-3 py-1.5 text-xs text-emerald-300">
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-gray-700 p-2">
        {error && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-700 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            <span className="mt-0.5 flex-1 break-words">{error}</span>
            <button
              type="button"
              onClick={() => void handleRetry()}
              className="shrink-0 rounded border border-red-700 px-1.5 py-0.5 hover:bg-red-900/40"
            >
              再試行
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 text-red-400 hover:text-red-200"
              aria-label="エラーを閉じる"
            >
              ×
            </button>
          </div>
        )}
        <div className="mb-2 flex items-center gap-2 flex-wrap text-xs text-gray-400">
          <label className="flex items-center gap-1.5">
            <span className="text-gray-500">文脈</span>
            <select
              value={contextMode}
              onChange={(event) => setContextMode(event.target.value as ContextMode)}
              className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="LLM に渡す文脈"
            >
              <option value="auto">自動（選択範囲があれば優先）</option>
              <option value="document">文書全体</option>
              <option value="selection">選択範囲のみ</option>
              <option value="none">文脈を送らない</option>
            </select>
          </label>
          <button
            type="button"
            onClick={handleAttachSelection}
            className="rounded border border-gray-600 px-2 py-1 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            title="エディタで選択したテキストを文脈として添えます"
          >
            選択範囲を添えて質問
          </button>
          <span className="text-gray-500">{contextSummary}</span>
        </div>

        <div className="mb-2">
          <button
            type="button"
            onClick={() => setActionsOpen((previous) => !previous)}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
            aria-expanded={actionsOpen}
          >
            {actionsOpen ? "▾" : "▸"} AI アクション（選択範囲または文書に適用）
          </button>
          {actionsOpen && (
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              {AI_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => void handleRunAction(action)}
                  disabled={actionBusy !== null}
                  title={action.description}
                  className="rounded bg-gray-700 px-2 py-1 text-left text-xs text-gray-200 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionBusy === action.id ? "実行中…" : action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {PROMPT_TEMPLATES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setInput(item.template);
                inputRef.current?.focus();
              }}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
        <label
          className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-gray-400 hover:text-gray-300"
          title="編集中の文書（Markdown）を LLM に渡します"
        >
          <input
            type="checkbox"
            checked={includeDocument}
            onChange={(event) => setIncludeDocument(event.target.checked)}
            className="h-3.5 w-3.5 accent-blue-500"
          />
          <span>現在の文書を含める</span>
          {includeDocument && documentLength > 0 && (
            <span className={truncated ? "text-amber-400/80" : "text-gray-500"}>
              {documentLength.toLocaleString()} 文字
              {truncated
                ? `（先頭 ${DOCUMENT_CONTEXT_LIMIT.toLocaleString()} 文字を送信）`
                : ""}
            </span>
          )}
        </label>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="文書について質問…（Enter で送信 / Shift+Enter で改行）"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isStreaming}
            />
          </div>
          {isStreaming ? (
            <button
              type="button"
              onClick={cancelStream}
              className="p-2.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              title="生成を停止"
              aria-label="生成を停止"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              title="送信"
              aria-label="送信"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          )}
        </div>
        {isStreaming && (
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
            <div className="animate-pulse">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span>生成中… {elapsed > 0 && `${elapsed}秒`}</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatPanel;
