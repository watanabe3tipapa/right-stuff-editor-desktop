import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Message, ChatState, ChatSession } from "@/types";

interface ChatStore extends ChatState {
  // Session management
  sessions: ChatSession[];
  currentSessionId: string | null;

  // LLM context
  includeDocument: boolean;
  setIncludeDocument: (include: boolean) => void;

  // Actions
  sendMessage: (message: Message, assistantMessageId: string) => void;
  updateStreamingMessage: (id: string, content: string) => void;
  cancelStream: () => void;
  clearMessages: () => void;
  setStreaming: (isStreaming: boolean, currentId: string | null) => void;

  // Session actions
  createSession: () => ChatSession;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  updateSessionTitle: (id: string, title: string) => void;
}

const generateId = () => crypto.randomUUID();

/**
 * localStorage 経由で復元された日付は文字列になるため、Date へ戻す。
 * ここを怠ると描画時に toLocaleTimeString が例外になり画面が真っ白になる。
 */
const reviveDate = (value: Date | string): Date =>
  value instanceof Date ? value : new Date(value);

const reviveMessages = (messages: Message[]): Message[] =>
  messages.map((message) => ({
    ...message,
    timestamp: reviveDate(message.timestamp),
  }));

const reviveSessions = (sessions: ChatSession[]): ChatSession[] =>
  sessions.map((session) => ({
    ...session,
    createdAt: reviveDate(session.createdAt),
    updatedAt: reviveDate(session.updatedAt),
    messages: reviveMessages(session.messages),
  }));

const createDefaultSession = (): ChatSession => ({
  id: generateId(),
  title: "New Chat",
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: [],
      isStreaming: false,
      currentId: null,
      sessions: [createDefaultSession()],
      currentSessionId: null,
      includeDocument: true,

      setIncludeDocument: (include) => set({ includeDocument: include }),

      sendMessage: (message: Message, assistantMessageId: string) => {
        const { currentSessionId, sessions } = get();

        // Create assistant placeholder message
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        };

        set((state) => {
          const updatedMessages = [...state.messages, message, assistantMessage];

          // Update current session's messages
          const updatedSessions = sessions.map((session) => {
            if (session.id === currentSessionId) {
              return {
                ...session,
                messages: updatedMessages,
                updatedAt: new Date(),
              };
            }
            return session;
          });

          return {
            messages: updatedMessages,
            sessions: updatedSessions,
            isStreaming: true,
            currentId: assistantMessageId,
          };
        });
      },

      updateStreamingMessage: (id: string, content: string) => {
        set((state) => {
          const updatedMessages = state.messages.map((msg) =>
            msg.id === id ? { ...msg, content } : msg
          );

          const updatedSessions = state.sessions.map((session) => {
            if (session.id === state.currentSessionId) {
              return {
                ...session,
                messages: updatedMessages,
                updatedAt: new Date(),
              };
            }
            return session;
          });

          return {
            messages: updatedMessages,
            sessions: updatedSessions,
          };
        });
      },

      cancelStream: () => {
        set({ isStreaming: false, currentId: null });
      },

      clearMessages: () => {
        const { currentSessionId, sessions } = get();
        set({
          messages: [],
          isStreaming: false,
          currentId: null,
          sessions: sessions.map((session) =>
            session.id === currentSessionId
              ? { ...session, messages: [], updatedAt: new Date() }
              : session
          ),
        });
      },

      setStreaming: (isStreaming: boolean, currentId: string | null) => {
        set({ isStreaming, currentId });
      },

      createSession: () => {
        const newSession = createDefaultSession();
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id,
          messages: [],
          isStreaming: false,
          currentId: null,
        }));
        return newSession;
      },

      switchSession: (id: string) => {
        const session = get().sessions.find((s) => s.id === id);
        if (session) {
          set({
            currentSessionId: id,
            messages: reviveMessages(session.messages),
            isStreaming: false,
            currentId: null,
          });
        }
      },

      deleteSession: (id: string) => {
        const { sessions, currentSessionId } = get();
        const filteredSessions = sessions.filter((s) => s.id !== id);

        if (filteredSessions.length === 0) {
          // Create a new session if all are deleted
          const newSession = createDefaultSession();
          set({
            sessions: [newSession],
            currentSessionId: newSession.id,
            messages: [],
            isStreaming: false,
            currentId: null,
          });
          return;
        }

        set({ sessions: filteredSessions });

        if (currentSessionId === id) {
          const firstSession = filteredSessions[0];
          set({
            currentSessionId: firstSession.id,
            messages: reviveMessages(firstSession.messages),
            isStreaming: false,
            currentId: null,
          });
        }
      },

      updateSessionTitle: (id: string, title: string) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id
              ? { ...session, title, updatedAt: new Date() }
              : session
          ),
        }));
      },
    }),
    {
      name: "right-stuff-editor-dash-chat-storage",
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        includeDocument: state.includeDocument,
      }),
      // 復元時は currentSessionId だけが残り messages は空になるため、
      // 選択中のセッションの本文を滞りなく読み戻す
      onRehydrateStorage: () => (state) => {
        if (!state?.currentSessionId) return;
        const session = state.sessions.find((s) => s.id === state.currentSessionId);
        if (session) state.switchSession(state.currentSessionId);
      },
      // localStorage からは日付が文字列で返るため、復元時に Date へ戻す
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ChatStore> | undefined;
        return {
          ...currentState,
          ...persisted,
          sessions: persisted?.sessions ? reviveSessions(persisted.sessions) : currentState.sessions,
        };
      },
    }
  )
);

export default useChatStore;
