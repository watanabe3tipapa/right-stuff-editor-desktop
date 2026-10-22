import { create } from "zustand";
import type { EditorDocument, EditorState } from "@/types";
import { desktop } from "@/utils/desktop";
import { markdownToHtml } from "@/utils/markdown";
import type { WorkspaceDocument } from "@shared/types";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface EditorStore extends EditorState {
  documents: EditorDocument[];
  currentDocumentId: string | null;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  lastAutoSaved: Date | null;
  isAutoSaving: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  isInitialized: boolean;
  workspaceRoot: string | null;
  setContent: (content: string) => void;
  appendContent: (text: string) => void;
  replaceMarkdownSelection: (text: string) => boolean;
  setMode: (mode: "rich" | "markdown") => void;
  setDirty: (isDirty: boolean) => void;
  markSaved: () => void;
  createDocument: (title?: string, content?: string) => Promise<EditorDocument>;
  openDocument: (id: string) => void;
  openNotesDocument: (input: {
    notesId: string;
    title: string;
    content: string;
    account: string;
    folder: string;
    readOnly?: boolean;
    readOnlyReason?: string;
  }) => void;
  saveDocument: () => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  duplicateDocument: (id: string) => Promise<void>;
  updateDocumentTitle: (id: string, title: string) => void;
  updateDocumentMeta: (
    id: string,
    meta: Partial<
      Pick<
        EditorDocument,
        "status" | "summary" | "tags" | "gistId" | "gistUpdatedAt"
      >
    >,
  ) => Promise<void>;
  setAutoSave: (enabled: boolean, interval?: number) => void;
  triggerAutoSave: () => Promise<void>;
  loadFromDB: () => Promise<void>;
  initialize: () => Promise<void>;
  reloadFromDisk: () => Promise<void>;
}

let initializePromise: Promise<void> | null = null;

const CURRENT_DOC_KEY = "right-stuff-current-document";
const AUTO_SAVE_KEY = "editor.autoSave";

const lastPersistedContent = new Map<string, string>();
const seedPersistedContent = (documents: EditorDocument[]) => {
  for (const document of documents) {
    lastPersistedContent.set(document.id, document.content);
  }
};

const welcomeContent = `# Welcome to Right-Stuff Editor

**書くことに集中できる、軽量で拡張可能なエディタです。**

- 左の「＋」から文書を追加
- 上部でリッチテキストと Markdown を切り替え
- 文書はワークスペースの Markdown ファイルとして保存されます
- AI アシスタントとスキル管理は、必要なときだけ開く

## まずはここから

この文章を書き換えるか、新しい文書を作成して始めましょう。`;

const toEditorDocument = (doc: WorkspaceDocument): EditorDocument => ({
  id: doc.path,
  title: doc.title,
  content: doc.content,
  createdAt: new Date(doc.createdAt),
  updatedAt: new Date(doc.updatedAt),
  status: doc.status,
  summary: doc.summary,
  tags: doc.tags,
  gistId: doc.gistId,
  gistUpdatedAt: doc.gistUpdatedAt,
  mtimeMs: doc.mtimeMs,
  hash: doc.hash,
});

const resolveCurrent = (
  documents: EditorDocument[],
  currentId: string | null,
): EditorDocument | null => {
  if (!documents.length) return null;
  return documents.find((document) => document.id === currentId) ?? documents[0];
};

const saveDocumentToDisk = async (document: EditorDocument): Promise<EditorDocument> => {
  if (document.source === "notes") {
    if (!document.notesId) throw new Error("Apple Notes のノート ID がありません");
    if (document.readOnly) {
      throw new Error(document.readOnlyReason ?? "このノートは読み取り専用です");
    }
    const html = await markdownToHtml(document.content);
    const saved = await desktop.notesSave(document.notesId, document.title, html);
    return {
      ...document,
      updatedAt: new Date(),
      mtimeMs: undefined,
      hash: undefined,
      notesId: saved.id,
    };
  }
  const result = await desktop.workspaceSave({
    path: document.id,
    title: document.title,
    content: document.content,
    status: document.status,
    summary: document.summary,
    tags: document.tags,
    gistId: document.gistId,
    gistUpdatedAt: document.gistUpdatedAt,
    expectedMtimeMs: document.mtimeMs ?? null,
    expectedHash: document.hash ?? null,
  });
  if ("conflict" in result && result.conflict) {
    throw new Error(
      "ファイルが外部のアプリで変更されています。再読み込みしてから保存してください。",
    );
  }
  return toEditorDocument(result.document);
};

export const useEditorStore = create<EditorStore>()((set, get) => ({
  content: "",
  mode: "rich",
  isDirty: false,
  lastSaved: null,
  documents: [],
  currentDocumentId: null,
  autoSaveEnabled: true,
  autoSaveInterval: 30000,
  lastAutoSaved: null,
  isAutoSaving: false,
  saveStatus: "saved",
  saveError: null,
  isInitialized: false,
  workspaceRoot: null,

  setContent: (content) => {
    const { currentDocumentId, documents } = get();
    const updatedAt = new Date();
    set({
      content,
      isDirty: true,
      saveStatus: "unsaved",
      saveError: null,
      documents: documents.map((document) =>
        document.id === currentDocumentId
          ? { ...document, content, updatedAt }
          : document,
      ),
    });
  },

  replaceMarkdownSelection: (text) => {
    const area = document.getElementById("markdown-editor") as HTMLTextAreaElement | null;
    if (!area) return false;
    const { selectionStart, selectionEnd, value } = area;
    if (selectionStart === selectionEnd) return false;
    get().setContent(`${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`);
    return true;
  },

  appendContent: (text) => {
    const separator = get().content.trim() ? "\n\n" : "";
    get().setContent(`${get().content}${separator}${text}`);
  },

  setMode: (mode) => set({ mode }),

  setDirty: (isDirty) =>
    set({ isDirty, saveStatus: isDirty ? "unsaved" : "saved" }),

  markSaved: () => {
    const { currentDocumentId, documents, content } = get();
    const savedAt = new Date();
    set({
      isDirty: false,
      lastSaved: savedAt,
      saveStatus: "saved",
      saveError: null,
      documents: documents.map((document) =>
        document.id === currentDocumentId
          ? { ...document, content, updatedAt: savedAt }
          : document,
      ),
    });
  },

  createDocument: async (
    title = "Untitled",
    content = "# New document\n\nStart writing here…",
  ) => {
    const created = await desktop.workspaceCreate({ title, content });
    const document = toEditorDocument(created);
    lastPersistedContent.set(document.id, document.content);
    set((state) => ({
      documents: [document, ...state.documents],
      currentDocumentId: document.id,
      content: document.content,
      isDirty: false,
      lastSaved: document.updatedAt,
      saveStatus: "saved",
      saveError: null,
    }));
    localStorage.setItem(CURRENT_DOC_KEY, document.id);
    return document;
  },

  openDocument: (id) => {
    const found = get().documents.find((item) => item.id === id);
    if (!found) return;
    const apply = () => {
      set({
        currentDocumentId: id,
        content: found.content,
        isDirty: false,
        lastSaved: found.updatedAt,
        saveStatus: "saved",
        saveError: null,
      });
      localStorage.setItem(CURRENT_DOC_KEY, id);
    };
    const globalDoc = globalThis.document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (typeof globalDoc?.startViewTransition === "function") {
      globalDoc.startViewTransition(apply);
    } else {
      apply();
    }
  },

  openNotesDocument: (input) => {
    const id = `notes:${input.notesId}`;
    const document: EditorDocument = {
      id,
      title: input.title,
      content: input.content,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: "notes",
      notesId: input.notesId,
      notesAccount: input.account,
      notesFolder: input.folder,
      readOnly: input.readOnly,
      readOnlyReason: input.readOnlyReason,
    };
    set((state) => {
      const exists = state.documents.some((item) => item.id === id);
      return {
        documents: exists
          ? state.documents.map((item) => (item.id === id ? document : item))
          : [document, ...state.documents],
        currentDocumentId: id,
        content: document.content,
        isDirty: false,
        lastSaved: document.updatedAt,
        saveStatus: "saved",
        saveError: null,
      };
    });
    lastPersistedContent.set(id, document.content);
    localStorage.setItem(CURRENT_DOC_KEY, id);
  },

  saveDocument: async () => {
    const { currentDocumentId, documents, content } = get();
    const currentDocument = documents.find(
      (document) => document.id === currentDocumentId,
    );
    if (!currentDocument) return;

    const draft: EditorDocument = {
      ...currentDocument,
      content,
      updatedAt: new Date(),
    };

    const previousContent = lastPersistedContent.get(currentDocument.id);
    set({ saveStatus: "saving", saveError: null });
    try {
      const savedDocument = await saveDocumentToDisk(draft);
      if (
        previousContent !== undefined &&
        previousContent !== savedDocument.content
      ) {
        await desktop
          .versionsAdd(
            currentDocument.id,
            currentDocument.title,
            previousContent,
          )
          .catch(() => undefined);
      }
      lastPersistedContent.set(savedDocument.id, savedDocument.content);
      set((state) => ({
        documents: state.documents.map((document) =>
          document.id === savedDocument.id ? savedDocument : document,
        ),
        content: savedDocument.content,
        isDirty: false,
        lastSaved: savedDocument.updatedAt,
        lastAutoSaved: savedDocument.updatedAt,
        saveStatus: "saved",
      }));
      await desktop.recoveryClear(savedDocument.id).catch(() => undefined);
    } catch (error) {
      console.error("Failed to save document:", error);
      set({
        saveStatus: "error",
        saveError:
          error instanceof Error
            ? error.message
            : "保存に失敗しました。もう一度お試しください。",
      });
    }
  },

  deleteDocument: async (id) => {
    const notesDoc = get().documents.find((document) => document.id === id);
    if (notesDoc?.source === "notes") {
      const remaining = get().documents.filter((document) => document.id !== id);
      const next = resolveCurrent(remaining, get().currentDocumentId);
      set({
        documents: remaining,
        currentDocumentId: next?.id ?? null,
        content: next?.content ?? "",
        isDirty: false,
        lastSaved: next?.updatedAt ?? null,
        saveStatus: "saved",
        saveError: null,
      });
      return;
    }
    try {
      await desktop.workspaceDelete(id);
    } catch (error) {
      console.error("Failed to delete document:", error);
      set({
        saveStatus: "error",
        saveError: "文書を削除できませんでした。",
      });
      return;
    }

    const { documents, currentDocumentId } = get();
    let remaining = documents.filter((document) => document.id !== id);
    if (remaining.length === 0) {
      const created = await desktop.workspaceCreate({
        title: "Welcome",
        content: welcomeContent,
      });
      remaining = [toEditorDocument(created)];
    }
    const nextDocument =
      currentDocumentId === id
        ? remaining[0]
        : resolveCurrent(remaining, currentDocumentId) ?? remaining[0];

    set({
      documents: remaining,
      currentDocumentId: nextDocument.id,
      content: nextDocument.content,
      isDirty: false,
      lastSaved: nextDocument.updatedAt,
      saveStatus: "saved",
      saveError: null,
    });
    localStorage.setItem(CURRENT_DOC_KEY, nextDocument.id);
  },

  updateDocumentTitle: (id, title) => {
    const updatedAt = new Date();
    const state = get();
    const target = state.documents.find((document) => document.id === id);
    if (!target) return;
    const nextDocument = {
      ...target,
      title,
      content: state.currentDocumentId === id ? state.content : target.content,
      updatedAt,
    };
    set({
      documents: state.documents.map((document) =>
        document.id === id ? nextDocument : document,
      ),
    });
    void saveDocumentToDisk(nextDocument)
      .then((saved) => {
        set((current) => ({
          documents: current.documents.map((document) =>
            document.id === id ? { ...saved, content: document.content } : document,
          ),
        }));
      })
      .catch((error) => {
        console.error("Failed to rename document:", error);
        set({
          saveStatus: "error",
          saveError: "文書名を保存できませんでした。",
        });
      });
  },

  updateDocumentMeta: async (id, meta) => {
    const state = get();
    const target = state.documents.find((document) => document.id === id);
    if (!target) return;
    const nextDocument: EditorDocument = {
      ...target,
      ...meta,
      content: state.currentDocumentId === id ? state.content : target.content,
    };
    set({
      documents: state.documents.map((document) =>
        document.id === id ? nextDocument : document,
      ),
    });
    try {
      const saved = await saveDocumentToDisk(nextDocument);
      set((current) => ({
        documents: current.documents.map((document) =>
          document.id === id ? { ...saved, content: document.content } : document,
        ),
      }));
    } catch (error) {
      console.error("Failed to update document meta:", error);
      set({
        saveStatus: "error",
        saveError: "文書のメタデータを保存できませんでした。",
      });
    }
  },

  duplicateDocument: async (id) => {
    const source = get().documents.find((document) => document.id === id);
    if (!source) return;
    try {
      const created = await desktop.workspaceCreate({
        title: `${source.title || "Untitled"} (copy)`,
        content: source.content,
      });
      const duplicate = toEditorDocument(created);
      lastPersistedContent.set(duplicate.id, duplicate.content);
      set((state) => ({
        documents: [duplicate, ...state.documents],
        currentDocumentId: duplicate.id,
        content: duplicate.content,
        isDirty: false,
        lastSaved: duplicate.updatedAt,
        saveStatus: "saved",
        saveError: null,
      }));
      localStorage.setItem(CURRENT_DOC_KEY, duplicate.id);
    } catch (error) {
      console.error("Failed to duplicate document:", error);
      set({
        saveStatus: "error",
        saveError: "文書の複製を保存できませんでした。",
      });
    }
  },

  setAutoSave: (enabled, interval) => {
    const autoSaveInterval = interval ?? get().autoSaveInterval;
    set({ autoSaveEnabled: enabled, autoSaveInterval });
    void desktop
      .settingsSet(AUTO_SAVE_KEY, { enabled, interval: autoSaveInterval })
      .catch(() => undefined);
  },

  triggerAutoSave: async () => {
    const { isAutoSaving, autoSaveEnabled, isDirty } = get();
    if (!autoSaveEnabled || isAutoSaving || !isDirty) return;
    set({ isAutoSaving: true });
    await get().saveDocument();
    set({ isAutoSaving: false });
  },

  loadFromDB: async () => {
    const [workspace, autoSave] = await Promise.all([
      desktop.workspaceState(),
      desktop
        .settingsGet<{ enabled: boolean; interval: number }>(AUTO_SAVE_KEY, {
          enabled: true,
          interval: 30000,
        })
        .catch(() => ({ enabled: true, interval: 30000 })),
    ]);

    let documents = workspace.documents.map(toEditorDocument);
    if (documents.length === 0) {
      const created = await desktop.workspaceCreate({
        title: "Welcome",
        content: welcomeContent,
      });
      documents = [toEditorDocument(created)];
    }

    seedPersistedContent(documents);
    const storedId = localStorage.getItem(CURRENT_DOC_KEY);
    const currentDocument = resolveCurrent(documents, storedId);

    set({
      documents,
      workspaceRoot: workspace.root,
      currentDocumentId: currentDocument?.id ?? null,
      content: currentDocument?.content ?? "",
      isDirty: false,
      lastSaved: currentDocument?.updatedAt ?? null,
      saveStatus: "saved",
      autoSaveEnabled: autoSave.enabled,
      autoSaveInterval: autoSave.interval,
    });
  },

  reloadFromDisk: async () => {
    const workspace = await desktop.workspaceState();
    const documents = workspace.documents.map(toEditorDocument);
    seedPersistedContent(documents);
    const currentDocument = resolveCurrent(documents, get().currentDocumentId);
    set({
      documents,
      workspaceRoot: workspace.root,
      currentDocumentId: currentDocument?.id ?? null,
      content: currentDocument?.content ?? "",
      isDirty: false,
      lastSaved: currentDocument?.updatedAt ?? null,
      saveStatus: "saved",
      saveError: null,
    });
  },

  initialize: async () => {
    if (get().isInitialized) return;
    if (initializePromise) return initializePromise;
    initializePromise = (async () => {
      try {
        await get().loadFromDB();
      } catch (error) {
        console.error("Failed to load workspace:", error);
        set({
          saveStatus: "error",
          saveError: "ワークスペースを読み込めませんでした。",
        });
      } finally {
        set({ isInitialized: true });
        initializePromise = null;
      }
    })();
    return initializePromise;
  },
}));

export default useEditorStore;
