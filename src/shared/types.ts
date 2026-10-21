export type DocumentStatus = "draft" | "done";

export interface DocumentMeta {
  title: string;
  createdAt: string;
  updatedAt: string;
  status?: DocumentStatus;
  summary?: string;
  tags?: string[];
  gistId?: string;
  gistUpdatedAt?: string;
}

export interface WorkspaceDocument extends DocumentMeta {
  /** Path relative to the workspace root, using forward slashes. */
  path: string;
  content: string;
  mtimeMs: number;
  hash: string;
}

export interface WorkspaceState {
  root: string;
  documents: WorkspaceDocument[];
}

export interface SaveDocumentInput {
  path?: string;
  title: string;
  content: string;
  status?: DocumentStatus;
  summary?: string;
  tags?: string[];
  gistId?: string;
  gistUpdatedAt?: string;
  expectedMtimeMs?: number | null;
  expectedHash?: string | null;
}

export interface SaveDocumentResult {
  document: WorkspaceDocument;
  conflict?: false;
}

export interface ConflictResult {
  conflict: true;
  current: WorkspaceDocument;
}

export interface WorkspaceSettings {
  autoSaveEnabled: boolean;
  autoSaveIntervalMs: number;
}

export interface DocumentVersion {
  id: number;
  path: string;
  title: string;
  content: string;
  savedAt: string;
}

export interface WritingStat {
  date: string;
  charsWritten: number;
  focusMs: number;
}

export interface NotesFolder {
  account: string;
  name: string;
  noteCount: number;
}

export interface NotesNote {
  id: string;
  account: string;
  folder: string;
  title: string;
  snippet: string;
  modifiedAt: string;
  readOnly: boolean;
  readOnlyReason?: string;
}

export interface NotesDocument extends NotesNote {
  kind: "notes";
  content: string;
  html: string;
}
