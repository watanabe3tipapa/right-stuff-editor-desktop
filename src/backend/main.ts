import {
  addVersion,
  bumpWritingStat,
  clearRecovery,
  deleteChatSession,
  deleteTemplate,
  getSetting,
  getWritingStats,
  initDatabase,
  listChatSessions,
  latestRecovery,
  listTemplates,
  listVersions,
  saveRecovery,
  setSetting,
  upsertChatSession,
  upsertTemplate,
} from "./db.ts";
import { createNote, listFolders, listNotes, readNote, saveNote } from "./notes-bridge.ts";
import {
  resizeTerminal,
  startTerminal,
  stopTerminal,
  writeTerminal,
} from "./terminal.ts";
import {
  WorkspaceError,
  backupWorkspace,
  createDocument,
  deleteDocument,
  getDocument,
  getRoot,
  initWorkspace,
  listDocuments,
  saveDocument,
  setRoot,
} from "./workspace.ts";

let dataDir = "";

export const api: Record<string, TinyApiHandler> = {
  appInfo: async (_params, app) => {
    const paths = await app.paths();
    return {
      name: "Right-Stuff Editor Desktop",
      version: "0.1.0",
      dataDir,
      workspaceRoot: getRoot(),
      paths,
    };
  },

  clientLog: async ({
    level,
    message,
    detail,
  }: {
    level: "info" | "warn" | "error";
    message: string;
    detail?: string;
  }) => {
    const line = `[client:${level}] ${message}${detail ? `\n${detail}` : ""}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
    return true;
  },

  terminalStart: async (
    {
      cols,
      rows,
      cwd,
    }: { cols?: number; rows?: number; cwd?: string | null },
    app,
  ) => {
    try {
      const result = await startTerminal(app, { cols, rows, cwd });
      return { success: true, ...result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  terminalWrite: async ({ data }: { data: string }) => {
    try {
      await writeTerminal(data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  terminalResize: async ({ cols, rows }: { cols: number; rows: number }) => {
    await resizeTerminal(cols, rows);
    return { success: true };
  },

  terminalStop: async () => {
    await stopTerminal();
    return { success: true };
  },

  notesHealth: async (_params, app) => {
    const permission = await app.permissions.check("automation:com.apple.Notes");
    let accounts: string[] | null = null;
    let error: string | null = null;
    try {
      const raw = await app.macos.applescript(
        'tell application "Notes" to get name of every account',
      );
      accounts = raw ? raw.split(", ") : [];
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
    return { permission, accounts, error };
  },

  notesFolders: async (_params, app) => listFolders(app),
  notesList: async (
    input: { account: string; folder: string; limit?: number },
    app,
  ) => listNotes(app, input),
  notesRead: async ({ id }: { id: string }, app) => readNote(app, id),
  notesSave: async (
    input: { id: string; title: string; html: string },
    app,
  ) => saveNote(app, input),
  notesCreate: async (
    input: { account: string; folder: string; title: string; html: string },
    app,
  ) => createNote(app, input),

  workspaceState: async () => ({
    root: getRoot(),
    documents: await listDocuments(),
  }),

  workspaceList: async () => listDocuments(),

  workspaceGet: async ({ path }: { path: string }) => getDocument(path),

  workspaceCreate: async (input: { title: string; content: string }) =>
    createDocument(input),

  workspaceSave: async (input: Parameters<typeof saveDocument>[0]) => {
    try {
      return await saveDocument(input);
    } catch (error) {
      if (error instanceof WorkspaceError && error.code === "CONFLICT" && error.current) {
        return { conflict: true, current: error.current };
      }
      throw error;
    }
  },

  workspaceDelete: async ({ path }: { path: string }) => {
    await deleteDocument(path);
    return true;
  },

  fileRead: async ({ path }: { path: string }) => {
    const raw = await tjs.readFile(path);
    return {
      path,
      name: path.split("/").pop() ?? path,
      content: new TextDecoder().decode(raw),
    };
  },

  fileWrite: async ({ path, content }: { path: string; content: string }) => {
    await tjs.writeFile(path, new TextEncoder().encode(content));
    return true;
  },

  workspaceBackup: async ({ format }: { format: "json" | "markdown" }) =>
    backupWorkspace(format),

  workspaceReveal: async ({ path }: { path?: string }, app) => {
    const target = path ? `${getRoot()}/${path}` : getRoot();
    await app.shell.reveal(target);
    return true;
  },

  workspaceChooseRoot: async ({ path }: { path: string }, app) => {
    const next = await setRoot(path);
    await app.shell.reveal(next);
    return { root: next, documents: await listDocuments() };
  },

  settingsGet: async ({ key, fallback }: { key: string; fallback?: unknown }) =>
    getSetting(key, fallback ?? null),

  settingsSet: async ({ key, value }: { key: string; value: unknown }) => {
    setSetting(key, value);
    return true;
  },

  versionsList: async ({ path, limit }: { path: string; limit?: number }) =>
    listVersions(path, limit),

  versionsAdd: async ({
    path,
    title,
    content,
  }: {
    path: string;
    title: string;
    content: string;
  }) => {
    addVersion(path, title, content);
    return true;
  },

  statsBump: async ({
    date,
    deltaChars,
    deltaFocusMs,
  }: {
    date: string;
    deltaChars: number;
    deltaFocusMs: number;
  }) => {
    bumpWritingStat(date, deltaChars, deltaFocusMs);
    return true;
  },

  statsGet: async ({ days }: { days: number }) => getWritingStats(days),

  recoverySave: async ({
    path,
    title,
    content,
  }: {
    path: string | null;
    title: string;
    content: string;
  }) => saveRecovery(path, title, content),

  recoveryLatest: async ({ path }: { path: string | null }) =>
    latestRecovery(path),

  recoveryClear: async ({ path }: { path: string | null }) => {
    clearRecovery(path);
    return true;
  },

  templatesList: async () => listTemplates(),

  templatesUpsert: async (input: Parameters<typeof upsertTemplate>[0]) => {
    upsertTemplate(input);
    return true;
  },

  templatesDelete: async ({ uuid }: { uuid: string }) => {
    deleteTemplate(uuid);
    return true;
  },

  chatList: async () => listChatSessions(),

  chatUpsert: async (input: Parameters<typeof upsertChatSession>[0]) => {
    upsertChatSession(input);
    return true;
  },

  chatDelete: async ({ uuid }: { uuid: string }) => {
    deleteChatSession(uuid);
    return true;
  },
};

export async function init(app: TinyApp) {
  app.setTitle("Right-Stuff Editor Desktop");
  const paths = await app.paths();
  dataDir = paths.data;
  await initDatabase(dataDir);
  await initWorkspace(app);

}

export function onWindowClosed() {
  void stopTerminal();
}
