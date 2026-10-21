import Dexie, { Table } from "dexie";

export type DocumentStatus = "draft" | "done";

export interface DBDocument {
  id?: number;
  uuid: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  status?: DocumentStatus;
  summary?: string;
  tags?: string[];
  gistId?: string;
  gistUpdatedAt?: string;
}

export interface DBChatSession {
  id?: number;
  uuid: string;
  title: string;
  messages: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBSetting {
  key: string;
  value: unknown;
}

export interface DBTemplate {
  id?: number;
  uuid: string;
  name: string;
  description: string;
  content: string;
  category?: string;
  builtin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBDocumentVersion {
  id?: number;
  docUuid: string;
  title: string;
  content: string;
  savedAt: Date;
}

export interface DBWritingStat {
  /** YYYY-MM-DD */
  date: string;
  /** その日の正の文字数差分合計 */
  charsWritten: number;
  /** その日のエディタ集中時間（ミリ秒） */
  focusMs: number;
}

class RightStuffDashDB extends Dexie {
  documents!: Table<DBDocument>;
  chatSessions!: Table<DBChatSession>;
  settings!: Table<DBSetting>;
  templates!: Table<DBTemplate>;
  documentVersions!: Table<DBDocumentVersion>;
  writingStats!: Table<DBWritingStat>;

  constructor() {
    super("RightStuffEditorDashDB");
    this.version(1).stores({
      documents: "++id, uuid, title, updatedAt",
      chatSessions: "++id, uuid, updatedAt",
      settings: "key",
    });
    this.version(2).stores({
      documents: "++id, uuid, title, updatedAt",
      chatSessions: "++id, uuid, updatedAt",
      settings: "key",
      templates: "++id, uuid, name, updatedAt",
      documentVersions: "++id, docUuid, savedAt",
      writingStats: "date",
    });
  }
}

export const db = new RightStuffDashDB();

export const saveDocument = async (doc: Omit<DBDocument, "id">): Promise<number> => {
  const existing = await db.documents.where("uuid").equals(doc.uuid).first();

  if (existing) {
    await db.documents.update(existing.id!, {
      title: doc.title,
      content: doc.content,
      updatedAt: doc.updatedAt,
      status: doc.status,
      summary: doc.summary,
      tags: doc.tags,
      gistId: doc.gistId,
      gistUpdatedAt: doc.gistUpdatedAt,
    });
    return existing.id!;
  } else {
    return await db.documents.add(doc);
  }
};

export const getDocument = async (uuid: string): Promise<DBDocument | undefined> => {
  return await db.documents.where("uuid").equals(uuid).first();
};

export const getAllDocuments = async (): Promise<DBDocument[]> => {
  return await db.documents.orderBy("updatedAt").reverse().toArray();
};

export const deleteDocument = async (uuid: string): Promise<void> => {
  await db.documents.where("uuid").equals(uuid).delete();
  await db.documentVersions.where("docUuid").equals(uuid).delete();
};

export const saveSetting = async (key: string, value: unknown): Promise<void> => {
  await db.settings.put({ key, value });
};

export const getSetting = async <T>(key: string, defaultValue: T): Promise<T> => {
  const setting = await db.settings.get(key);
  return setting ? (setting.value as T) : defaultValue;
};

// --- Templates ---

export const getAllTemplates = async (): Promise<DBTemplate[]> => {
  return await db.templates.orderBy("updatedAt").reverse().toArray();
};

// --- Document versions ---

export const listVersions = async (docUuid: string, limit = 10): Promise<DBDocumentVersion[]> => {
  return await db.documentVersions
    .where("docUuid")
    .equals(docUuid)
    .reverse()
    .sortBy("savedAt")
    .then((rows) => rows.slice(0, limit));
};

export const pruneVersions = async (docUuid: string, keep = 10): Promise<void> => {
  const rows = await db.documentVersions.where("docUuid").equals(docUuid).sortBy("savedAt");
  if (rows.length <= keep) return;
  const stale = rows.slice(0, rows.length - keep).map((row) => row.id!);
  await db.documentVersions.bulkDelete(stale);
};

// --- Writing stats ---

export const bumpWritingStat = async (
  date: string,
  deltaChars: number,
  deltaFocusMs: number,
): Promise<void> => {
  const existing = await db.writingStats.get(date);
  const next: DBWritingStat = {
    date,
    charsWritten: Math.max(0, (existing?.charsWritten ?? 0) + Math.max(0, deltaChars)),
    focusMs: Math.max(0, (existing?.focusMs ?? 0) + Math.max(0, deltaFocusMs)),
  };
  await db.writingStats.put(next);
};

export const getWritingStats = async (days: number): Promise<DBWritingStat[]> => {
  const all = await db.writingStats.orderBy("date").reverse().toArray();
  return all.slice(0, days);
};
