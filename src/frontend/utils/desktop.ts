import type {
  DocumentVersion,
  SaveDocumentInput,
  SaveDocumentResult,
  WorkspaceDocument,
  WorkspaceState,
  WritingStat,
} from "@shared/types";

export function isDesktop(): boolean {
  return typeof tiny !== "undefined" && typeof tiny.api?.call === "function";
}

export async function call<T>(method: string, params?: unknown): Promise<T> {
  if (!isDesktop()) {
    throw new Error("Right-Stuff Editor Desktop backend is not available");
  }
  return (await tiny.api.call(method, params)) as T;
}

export interface AppInfo {
  name: string;
  version: string;
  dataDir: string;
  workspaceRoot: string;
  paths: Record<string, string | null>;
}

export const desktop = {
  appInfo: () => call<AppInfo>("appInfo"),

  notesFolders: () => call<import("@shared/types").NotesFolder[]>("notesFolders"),
  notesList: (account: string, folder: string, limit?: number) =>
    call<import("@shared/types").NotesNote[]>("notesList", { account, folder, limit }),
  notesRead: (id: string) =>
    call<{ note: import("@shared/types").NotesNote; html: string }>("notesRead", { id }),
  notesSave: (id: string, title: string, html: string) =>
    call<{ id: string; title: string; modifiedAt: string }>("notesSave", { id, title, html }),
  notesCreate: (account: string, folder: string, title: string, html: string) =>
    call<{ id: string; title: string; modifiedAt: string }>("notesCreate", {
      account,
      folder,
      title,
      html,
    }),
  notesHealth: () =>
    call<{
      permission: string;
      accounts: string[] | null;
      error: string | null;
    }>("notesHealth"),

  terminalStart: (cols: number, rows: number, cwd?: string | null) =>
    call<{ success: boolean; shell?: string; cwd?: string; error?: string }>(
      "terminalStart",
      { cols, rows, cwd },
    ),
  terminalWrite: (data: string) =>
    call<{ success: boolean; error?: string }>("terminalWrite", { data }),
  terminalResize: (cols: number, rows: number) =>
    call<true>("terminalResize", { cols, rows }),
  terminalStop: () => call<true>("terminalStop"),
  onTerminalData: (listener: (data: string) => void) =>
    tiny.api.on("terminal:data", (data) => listener(String(data ?? ""))),
  onTerminalExit: (listener: (code: number) => void) =>
    tiny.api.on("terminal:exit", (code) => listener(Number(code ?? 0))),

  workspaceState: () => call<WorkspaceState>("workspaceState"),
  workspaceList: () => call<WorkspaceDocument[]>("workspaceList"),
  workspaceGet: (path: string) => call<WorkspaceDocument>("workspaceGet", { path }),
  workspaceCreate: (input: { title: string; content: string }) =>
    call<WorkspaceDocument>("workspaceCreate", input),
  workspaceSave: (input: SaveDocumentInput) =>
    call<SaveDocumentResult | { conflict: true; current: WorkspaceDocument }>(
      "workspaceSave",
      input,
    ),
  workspaceDelete: (path: string) => call<true>("workspaceDelete", { path }),
  workspaceBackup: (format: "json" | "markdown") =>
    call<{ path: string; count: number }>("workspaceBackup", { format }),

  workspaceReveal: (path?: string) => call<true>("workspaceReveal", { path }),
  workspaceChooseRoot: (path: string) =>
    call<{ root: string; documents: WorkspaceDocument[] }>("workspaceChooseRoot", { path }),

  settingsGet: <T>(key: string, fallback: T) =>
    call<T>("settingsGet", { key, fallback }),
  settingsSet: (key: string, value: unknown) =>
    call<true>("settingsSet", { key, value }),

  versionsList: (path: string, limit = 10) =>
    call<DocumentVersion[]>("versionsList", { path, limit }),
  versionsAdd: (path: string, title: string, content: string) =>
    call<true>("versionsAdd", { path, title, content }),

  statsBump: (date: string, deltaChars: number, deltaFocusMs: number) =>
    call<true>("statsBump", { date, deltaChars, deltaFocusMs }),
  statsGet: (days: number) => call<WritingStat[]>("statsGet", { days }),

  recoverySave: (path: string | null, title: string, content: string) =>
    call<number>("recoverySave", { path, title, content }),
  recoveryLatest: (path: string | null) =>
    call<{
      id: number;
      path: string | null;
      title: string;
      content: string;
      createdAt: string;
    } | null>("recoveryLatest", { path }),
  recoveryClear: (path: string | null) => call<true>("recoveryClear", { path }),

  templatesList: () => call<unknown[]>("templatesList"),
  templatesUpsert: (input: unknown) => call<true>("templatesUpsert", input),
  templatesDelete: (uuid: string) => call<true>("templatesDelete", { uuid }),

  chatList: () => call<unknown[]>("chatList"),
  chatUpsert: (input: unknown) => call<true>("chatUpsert", input),
  chatDelete: (uuid: string) => call<true>("chatDelete", { uuid }),

  openExternal: async (url: string) => {
    await tiny.app.shell.open(url);
  },
  requestNotesPermission: () =>
    tiny.app.permissions.request("automation:com.apple.Notes"),
  fileRead: (path: string) =>
    call<{ path: string; name: string; content: string }>("fileRead", { path }),
  fileWrite: (path: string, content: string) =>
    call<true>("fileWrite", { path, content }),
  pickFolder: () => tiny.dialog.pickFolder(),
  pickFiles: () => tiny.dialog.openFiles({ types: ["md", "markdown", "txt"] }),
};
