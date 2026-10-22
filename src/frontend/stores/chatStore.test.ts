import { beforeEach, describe, expect, it } from "vitest";
import { useChatStore } from "./chatStore";

const reset = () => {
  const store = useChatStore.getState();
  store.clearMessages();
  const sessions = useChatStore.getState().sessions;
  for (const session of sessions.slice(1)) {
    useChatStore.getState().deleteSession(session.id);
  }
  useChatStore.getState().switchSession(useChatStore.getState().sessions[0].id);
};

const sendUserMessage = (content: string) => {
  const assistantId = crypto.randomUUID();
  useChatStore.getState().sendMessage(
    { id: crypto.randomUUID(), role: "user", content, timestamp: new Date() },
    assistantId,
  );
  return assistantId;
};

describe("chatStore", () => {
  beforeEach(() => {
    reset();
  });

  it("最初の発言からセッション名を自動生成する", () => {
    sendUserMessage("国立公園の音について書く");
    const session = useChatStore
      .getState()
      .sessions.find((s) => s.id === useChatStore.getState().currentSessionId);
    expect(session?.title).toBe("国立公園の音について書く");
  });

  it("長いセッション名は 28 文字で省略する", () => {
    sendUserMessage("あ".repeat(40));
    const session = useChatStore
      .getState()
      .sessions.find((s) => s.id === useChatStore.getState().currentSessionId);
    expect(session?.title).toBe(`${"あ".repeat(28)}…`);
  });

  it("2 回目以降の発言でセッション名は変わらない", () => {
    sendUserMessage("最初の質問");
    const before = useChatStore.getState().sessions[0].title;
    sendUserMessage("次の質問");
    expect(useChatStore.getState().sessions[0].title).toBe(before);
  });

  it("発言はセッションにも保存される", () => {
    sendUserMessage("保存されるか");
    const session = useChatStore
      .getState()
      .sessions.find((s) => s.id === useChatStore.getState().currentSessionId);
    expect(session?.messages.some((m) => m.content === "保存されるか")).toBe(true);
  });

  it("removeMessage で該当のメッセージだけが消える", () => {
    const assistantId = sendUserMessage("消すテスト");
    expect(useChatStore.getState().messages).toHaveLength(2);

    useChatStore.getState().removeMessage(assistantId);
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].role).toBe("user");
  });

  it("appendAssistantMessage で完了済みの応答を追加できる", () => {
    const id = useChatStore.getState().appendAssistantMessage("校正結果");
    const message = useChatStore.getState().messages.find((m) => m.id === id);
    expect(message?.role).toBe("assistant");
    expect(message?.content).toBe("校正結果");
  });

  it("cancelStream は保持中のリクエストを abort する", () => {
    const controller = new AbortController();
    useChatStore.getState().setAbortController(controller);

    useChatStore.getState().cancelStream();

    expect(controller.signal.aborted).toBe(true);
    expect(useChatStore.getState().isStreaming).toBe(false);
    expect(useChatStore.getState().abortController).toBeNull();
  });

  it("clearMessages は保持中のリクエストも abort する", () => {
    const controller = new AbortController();
    useChatStore.getState().setAbortController(controller);

    useChatStore.getState().clearMessages();

    expect(controller.signal.aborted).toBe(true);
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it("セッションを切り替えると、その会話が復元される", () => {
    sendUserMessage("最初の会話");
    const second = useChatStore.getState().createSession();
    expect(useChatStore.getState().messages).toHaveLength(0);

    useChatStore.getState().switchSession(useChatStore.getState().sessions[1].id);
    expect(useChatStore.getState().messages.some((m) => m.content === "最初の会話")).toBe(
      true,
    );
    expect(second.title).toBeTruthy();
  });

  it("文脈モードを切り替えられる", () => {
    useChatStore.getState().setContextMode("selection");
    expect(useChatStore.getState().contextMode).toBe("selection");
    useChatStore.getState().setContextMode("auto");
    expect(useChatStore.getState().contextMode).toBe("auto");
  });
});
