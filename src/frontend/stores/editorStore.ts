import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EditorDocument, EditorState } from "@/types";
import {
  deleteDocument as dbDeleteDocument,
  getAllDocuments,
  saveDocument as dbSaveDocument,
} from "@/utils/db";

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
  setContent: (content: string) => void;
  appendContent: (text: string) => void;
  setMode: (mode: "rich" | "markdown") => void;
  setDirty: (isDirty: boolean) => void;
  markSaved: () => void;
  createDocument: (title?: string, content?: string) => EditorDocument;
  openDocument: (id: string) => void;
  saveDocument: () => Promise<void>;
  deleteDocument: (id: string) => void;
  duplicateDocument: (id: string) => void;
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
}

const generateId = () => crypto.randomUUID();

const welcomeContent = `# Welcome to Right-Stuff Editor Dash

**書くことに集中できる、軽量で拡張可能なエディタです。**

- 左の「＋」から文書を追加
- 上部でリッチテキストと Markdown を切り替え
- 変更内容は端末内に自動保存
- AIアシスタントとスキル管理は、必要なときだけ開く

## まずはここから

この文章を書き換えるか、新しい文書を作成して始めましょう。`;

const createDefaultDocument = (): EditorDocument => ({
  id: generateId(),
  title: "Welcome",
  content: welcomeContent,
  createdAt: new Date(),
  updatedAt: new Date(),
  status: "draft",
});

const initialDocument = createDefaultDocument();

const toEditorDocuments = (
  docs: Awaited<ReturnType<typeof getAllDocuments>>,
): EditorDocument[] =>
  docs.map((doc) => ({
    id: doc.uuid,
    title: doc.title,
    content: doc.content,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    status: doc.status,
    summary: doc.summary,
    tags: doc.tags,
    gistId: doc.gistId,
    gistUpdatedAt: doc.gistUpdatedAt,
  }));

const persistDocument = async (document: EditorDocument) => {
  await dbSaveDocument({
    uuid: document.id,
    title: document.title,
    content: document.content,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    status: document.status,
    summary: document.summary,
    tags: document.tags,
    gistId: document.gistId,
    gistUpdatedAt: document.gistUpdatedAt,
  });
};

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      content: initialDocument.content,
      mode: "rich",
      isDirty: false,
      lastSaved: initialDocument.updatedAt,
      documents: [initialDocument],
      currentDocumentId: initialDocument.id,
      autoSaveEnabled: true,
      autoSaveInterval: 30000,
      lastAutoSaved: null,
      isAutoSaving: false,
      saveStatus: "saved",
      saveError: null,
      isInitialized: false,

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

      createDocument: (title = "Untitled", content = "# New document\n\nStart writing here…") => {
        const newDocument: EditorDocument = {
          id: generateId(),
          title,
          content,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "draft",
        };
        set((state) => ({
          documents: [newDocument, ...state.documents],
          currentDocumentId: newDocument.id,
          content: newDocument.content,
          isDirty: false,
          lastSaved: newDocument.updatedAt,
          saveStatus: "saved",
          saveError: null,
        }));
        void persistDocument(newDocument).catch((error) => {
          console.error("Failed to create document:", error);
          set({
            saveStatus: "error",
            saveError: "新しい文書を端末に保存できませんでした。",
          });
        });
        return newDocument;
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
        };
        // View Transitions API で画面遷移をなめらかに（非対応環境はフォールバック）
        const globalDoc = globalThis.document as Document & {
          startViewTransition?: (cb: () => void) => void;
        };
        if (typeof globalDoc?.startViewTransition === "function") {
          globalDoc.startViewTransition(apply);
        } else {
          apply();
        }
      },

      saveDocument: async () => {
        const { currentDocumentId, documents, content } = get();
        const currentDocument = documents.find(
          (document) => document.id === currentDocumentId,
        );
        if (!currentDocument) return;

        const savedDocument: EditorDocument = {
          ...currentDocument,
          content,
          updatedAt: new Date(),
        };

        set({ saveStatus: "saving", saveError: null });
        try {
          await persistDocument(savedDocument);
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
        } catch (error) {
          console.error("Failed to save document:", error);
          set({
            saveStatus: "error",
            saveError: "保存に失敗しました。もう一度お試しください。",
          });
        }
      },

      deleteDocument: (id) => {
        const { documents, currentDocumentId } = get();
        const remainingDocuments = documents.filter((document) => document.id !== id);
        const fallbackDocument =
          remainingDocuments[0] ?? createDefaultDocument();
        const nextDocuments =
          remainingDocuments.length > 0 ? remainingDocuments : [fallbackDocument];
        const nextDocument =
          currentDocumentId === id
            ? fallbackDocument
            : nextDocuments.find((document) => document.id === currentDocumentId) ??
              fallbackDocument;

        set({
          documents: nextDocuments,
          currentDocumentId: nextDocument.id,
          content: nextDocument.content,
          isDirty: false,
          lastSaved: nextDocument.updatedAt,
          saveStatus: "saved",
          saveError: null,
        });
        void dbDeleteDocument(id).catch((error) => {
          console.error("Failed to delete document:", error);
          set({
            saveStatus: "error",
            saveError: "文書を端末から削除できませんでした。",
          });
        });
        if (remainingDocuments.length === 0) {
          void persistDocument(fallbackDocument).catch((error) => {
            console.error("Failed to restore welcome document:", error);
          });
        }
      },

      updateDocumentTitle: (id, title) => {
        const updatedAt = new Date();
        const updatedDocument = get().documents.find((document) => document.id === id);
        if (!updatedDocument) return;
        const nextDocument = { ...updatedDocument, title, updatedAt };
        set((state) => ({
          documents: state.documents.map((document) =>
            document.id === id ? nextDocument : document,
          ),
        }));
        void persistDocument(nextDocument).catch((error) => {
          console.error("Failed to rename document:", error);
          set({
            saveStatus: "error",
            saveError: "文書名を保存できませんでした。",
          });
        });
      },

      updateDocumentMeta: async (id, meta) => {
        const target = get().documents.find((document) => document.id === id);
        if (!target) return;
        const nextDocument: EditorDocument = { ...target, ...meta };
        set((state) => ({
          documents: state.documents.map((document) =>
            document.id === id ? nextDocument : document,
          ),
        }));
        await persistDocument(nextDocument).catch((error) => {
          console.error("Failed to update document meta:", error);
          set({
            saveStatus: "error",
            saveError: "文書のメタデータを保存できませんでした。",
          });
        });
      },

      duplicateDocument: (id) => {
        const source = get().documents.find((document) => document.id === id);
        if (!source) return;
        const now = new Date();
        const duplicate: EditorDocument = {
          id: generateId(),
          title: `${source.title || "Untitled"} (copy)`,
          content: source.content,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          documents: [duplicate, ...state.documents],
          currentDocumentId: duplicate.id,
          content: duplicate.content,
          isDirty: false,
          lastSaved: now,
          saveStatus: "saved",
          saveError: null,
        }));
        void persistDocument(duplicate).catch((error) => {
          console.error("Failed to duplicate document:", error);
          set({
            saveStatus: "error",
            saveError: "文書の複製を端末に保存できませんでした。",
          });
        });
      },

      setAutoSave: (enabled, interval) =>
        set({
          autoSaveEnabled: enabled,
          autoSaveInterval: interval ?? get().autoSaveInterval,
        }),

      triggerAutoSave: async () => {
        const { isAutoSaving, autoSaveEnabled, isDirty } = get();
        if (!autoSaveEnabled || isAutoSaving || !isDirty) return;
        set({ isAutoSaving: true });
        await get().saveDocument();
        set({ isAutoSaving: false });
      },

      loadFromDB: async () => {
        const storedDocuments = await getAllDocuments();
        if (storedDocuments.length === 0) return;
        const documents = toEditorDocuments(storedDocuments);
        const currentId = get().currentDocumentId;
        const currentDocument =
          documents.find((document) => document.id === currentId) ?? documents[0];
        set({
          documents,
          currentDocumentId: currentDocument.id,
          content: currentDocument.content,
          isDirty: false,
          lastSaved: currentDocument.updatedAt,
          saveStatus: "saved",
        });
      },

      initialize: async () => {
        if (get().isInitialized) return;
        try {
          await get().loadFromDB();
        } catch (error) {
          console.error("Failed to load saved documents:", error);
          set({
            saveStatus: "error",
            saveError: "保存済みの文書を読み込めませんでした。",
          });
        } finally {
          set({ isInitialized: true });
        }
      },
    }),
    {
      name: "right-stuff-editor-dash-storage",
      partialize: (state) => ({
        documents: state.documents,
        currentDocumentId: state.currentDocumentId,
        mode: state.mode,
        autoSaveEnabled: state.autoSaveEnabled,
        autoSaveInterval: state.autoSaveInterval,
      }),
    },
  ),
);

export default useEditorStore;
