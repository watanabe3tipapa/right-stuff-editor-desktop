// Editor Types
export type DocumentStatus = 'draft' | 'done';

export interface EditorState {
  content: string;
  mode: 'rich' | 'markdown';
  isDirty: boolean;
  lastSaved: Date | null;
}

export interface EditorDocument {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  status?: DocumentStatus;
  summary?: string;
  tags?: string[];
  gistId?: string;
  gistUpdatedAt?: string;
  mtimeMs?: number;
  hash?: string;
  source?: 'workspace' | 'notes';
  notesId?: string;
  notesAccount?: string;
  notesFolder?: string;
  readOnly?: boolean;
  readOnlyReason?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category?: string;
  builtin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentVersion {
  id: number;
  docUuid: string;
  title: string;
  content: string;
  savedAt: Date;
}

export interface WritingStat {
  /** YYYY-MM-DD */
  date: string;
  charsWritten: number;
  focusMs: number;
}

export type ListDensity = 'compact' | 'standard' | 'comfortable';

export type DocumentFilter =
  | 'all'
  | 'recent'
  | 'done'
  | 'gist'
  | 'draft-only';

export type BackupFormat = 'json' | 'markdown';

export interface BackupSettings {
  enabled: boolean;
  intervalMinutes: number;
  format: BackupFormat;
  lastBackupAt: string | null;
}

export interface TimeTrackingSettings {
  enabled: boolean;
}

// Chat Types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  currentId: string | null;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// LLM Types
export interface LLMRequest {
  prompt: string;
  sessionId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  id: string;
  content: string;
  done: boolean;
  error?: string;
}

export interface StreamChunk {
  id: string;
  chunk: string;
  done: boolean;
  error?: string;
}

// UI Types
export interface ViewMode {
  mode: 'split' | 'editor' | 'preview' | 'chat';
  sidebarOpen: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: string;
  autoSave: boolean;
  autoSaveInterval: number;
  spellCheck: boolean;
  lineNumbers: boolean;
  wordWrap: boolean;
}

// File Types
export interface FileOperation {
  type: 'open' | 'save' | 'export';
  filePath?: string;
  format: 'markdown' | 'html' | 'pdf' | 'json';
}

// Toolbar Types
export interface ToolbarAction {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
}

// Export Types
export interface ExportOptions {
  format: 'markdown' | 'html' | 'pdf' | 'docx' | 'json';
  includeMetadata: boolean;
  syntaxHighlighting: boolean;
}

// ASM Types
export interface ASMSkill {
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  installed: boolean;
}

export type ASMViewMode = 'catalog' | 'installed';

export interface ASMState {
  skills: ASMSkill[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  viewMode: ASMViewMode;
}

// Gist Types
export interface GistFile {
  filename: string;
  language: string | null;
  rawUrl: string;
  content?: string;
  size?: number;
}

export interface GistItem {
  id: string;
  description: string;
  htmlUrl: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  files: GistFile[];
  owner?: {
    login: string;
    avatarUrl: string;
  };
}

export interface CreateGistParams {
  filename: string;
  content: string;
  description: string;
  isPublic: boolean;
}

export interface UpdateGistParams {
  filename: string;
  content: string;
  description: string;
}

export interface GistUploadResult {
  gistId: string;
  htmlUrl: string;
  isNew: boolean;
}
