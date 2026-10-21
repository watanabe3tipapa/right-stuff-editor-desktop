import React, { useState, useRef, useEffect, useCallback } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useEditorStore } from "@/stores/editorStore";
import { useLLMStore } from "@/stores/llmStore";
import { buildSystemMessages, DOCUMENT_CONTEXT_LIMIT, sendChatRequest } from "@/utils/llmClient";
import { appendTextToLexical } from "@/utils/editorBridge";
import { MarkdownContent } from "./MarkdownContent";
import type { Message } from "@/types";

interface ChatPanelProps {
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ className = "" }) => {
  const {
    messages,
    isStreaming,
    sendMessage,
    cancelStream,
    clearMessages,
    sessions,
    createSession,
    switchSession,
    deleteSession,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isStreaming) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: input.trim(),
        timestamp: new Date(),
      };

      const assistantMessageId = crypto.randomUUID();

      setInput("");
      setError(null);
      sendMessage(userMessage, assistantMessageId);

      const messages = useChatStore
        .getState()
        .messages.filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      messages.push({ role: "user", content: input.trim() });

      const { includeDocument } = useChatStore.getState();
      const systemMessages = buildSystemMessages(
        useLLMStore.getState().config.systemPrompt,
        includeDocument ? useEditorStore.getState().content : undefined,
      );

      sendChatRequest([...systemMessages, ...messages], {
        onChunk: (chunk) => {
          const currentMsg = useChatStore
            .getState()
            .messages.find((m) => m.id === assistantMessageId);
          if (currentMsg) {
            useChatStore
              .getState()
              .updateStreamingMessage(
                assistantMessageId,
                currentMsg.content + chunk,
              );
          }
        },
        onComplete: () => {
          useChatStore.getState().setStreaming(false, null);
        },
        onError: (streamError) => {
          console.error("LLM Error:", streamError);
          useChatStore.getState().setStreaming(false, null);
          const message = streamError.message || "Failed to reach the LLM endpoint.";
          const current = useChatStore
            .getState()
            .messages.find((m) => m.id === assistantMessageId);
          if (current && !current.content.trim()) {
            useChatStore.getState().updateStreamingMessage(assistantMessageId, message);
          } else {
            setError(message);
          }
        },
      });
    },
    [input, isStreaming, sendMessage],
  );

  const handleCancel = () => {
    cancelStream();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const promptTemplates = [
    { label: "Continue", template: "Continue writing from where I left off" },
    { label: "Summarize", template: "Summarize the current document" },
    { label: "Improve", template: "Improve the writing style and clarity" },
    { label: "HTML", template: "Convert this to HTML format" },
    { label: "Examples", template: "Add relevant examples to this section" },
  ];

  // 文字数表示のためだけに文書本文を購読すると入力のたびに再描画されるため、長さだけを購読する
  const documentLength = useEditorStore((state) => state.content.trim().length);
  const includeDocument = useChatStore((state) => state.includeDocument);
  const setIncludeDocument = useChatStore((state) => state.setIncludeDocument);
  const truncated = documentLength > DOCUMENT_CONTEXT_LIMIT;

  return (
    <div
      className={`flex flex-col h-full bg-gray-900 text-gray-100 ${className}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Toggle sidebar"
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
          <h2 className="font-semibold text-lg">AI Assistant</h2>
        </div>
        <button
          onClick={clearMessages}
          className="p-1.5 hover:bg-gray-700 rounded transition-colors"
          title="Clear chat"
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

      {sidebarOpen && (
        <div className="border-b border-gray-700 p-3 bg-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Sessions</span>
            <button
              onClick={createSession}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              + New
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {sessions.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No sessions yet</p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50 group"
                >
                  <button
                    onClick={() => switchSession(session.id)}
                    className="text-sm text-left truncate flex-1"
                  >
                    {session.title}
                  </button>
                  <button
                    onClick={() => deleteSession(session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
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

      <div className="max-h-[80vh] overflow-y-auto p-3 space-y-3 pb-5">
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
            <p className="text-lg font-medium mb-2">Start a conversation</p>
            <p className="text-sm text-center max-w-xs">
              Ask me anything about your document.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-100"}`}
              >
                <div className="flex items-center justify-between text-xs font-medium mb-1 opacity-70">
                  <span>{message.role === "user" ? "You" : "Assistant"}</span>
                  {message.role === "assistant" && (
                    <button
                      type="button"
                      onClick={() => {
                        const { mode } = useEditorStore.getState();
                        if (mode === "rich") {
                          const ok = appendTextToLexical(message.content);
                          if (!ok) {
                            useEditorStore.getState().appendContent(message.content);
                          }
                        } else {
                          useEditorStore.getState().appendContent(message.content);
                        }
                      }}
                      className="ml-2 text-blue-300 hover:text-blue-200 transition-colors"
                      title="Copy to Editor"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </button>
                  )}
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
                <div className="text-xs opacity-50 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-700 p-2">
        {error && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-700 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            <span className="mt-0.5 flex-1 break-words">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 text-red-400 hover:text-red-200"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {promptTemplates.map((item) => (
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
              {documentLength.toLocaleString()} 文字{truncated ? `（先頭 ${DOCUMENT_CONTEXT_LIMIT.toLocaleString()} 文字を送信）` : ""}
            </span>
          )}
        </label>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isStreaming}
            />
          </div>
          {isStreaming ? (
            <button
              type="button"
              onClick={handleCancel}
              className="p-2.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              title="Cancel"
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
            <span>Generating...</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatPanel;
