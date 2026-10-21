import { parseMarkdown, serializeMarkdown, titleFromPath } from "./markdown.ts";
import { addVersion, deleteVersions, getSetting, setSetting } from "./db.ts";
import type {
  SaveDocumentInput,
  SaveDocumentResult,
  WorkspaceDocument,
} from "../shared/types.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MD_EXTENSION = /\.(md|markdown|txt)$/i;

let root = "";

export class WorkspaceError extends Error {
  constructor(
    message: string,
    readonly code: "CONFLICT" | "NOT_FOUND" | "INVALID_PATH" | "IO",
    readonly current?: WorkspaceDocument,
  ) {
    super(message);
    this.name = "WorkspaceError";
  }
}

export async function initWorkspace(app: TinyApp): Promise<string> {
  const paths = await app.paths();
  const configured = getSetting<string | null>("workspaceRoot", null);
  root = configured || `${paths.documents}/Right-Stuff`;
  await tjs.makeDir(root, { recursive: true });
  await tjs.makeDir(`${root}/.right-stuff/trash`, { recursive: true });
  await tjs.makeDir(`${root}/.right-stuff/backups`, { recursive: true });
  setSetting("workspaceRoot", root);
  return root;
}

export function getRoot(): string {
  if (!root) throw new Error("workspace is not initialized");
  return root;
}

export async function setRoot(next: string): Promise<string> {
  const normalized = next.replace(/\/+$/, "");
  const stat = await tjs.stat(normalized);
  if (!stat || !(stat as { isDirectory?: boolean }).isDirectory) {
    throw new WorkspaceError("not a folder", "IO");
  }
  root = normalized;
  await tjs.makeDir(`${root}/.right-stuff/trash`, { recursive: true });
  await tjs.makeDir(`${root}/.right-stuff/backups`, { recursive: true });
  setSetting("workspaceRoot", root);
  return root;
}

function relative(input: string): string {
  const cleaned = input.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
  const parts = cleaned.split("/").filter((part) => part && part !== ".");
  if (
    !parts.length ||
    parts.some((part) => part === ".." || part === ".right-stuff" || part.includes("\0"))
  ) {
    throw new WorkspaceError("invalid path", "INVALID_PATH");
  }
  return parts.join("/");
}

function absolute(path: string): string {
  return `${getRoot()}/${relative(path)}`;
}

async function statOrNull(path: string): Promise<{ mtimeMs: number; createdAt: string } | null> {
  try {
    const stat = await tjs.stat(path);
    const s = stat as { mtim: Date; birthtim: Date };
    return {
      mtimeMs: s.mtim.getTime(),
      createdAt: s.birthtim?.toISOString() ?? s.mtim.toISOString(),
    };
  } catch {
    return null;
  }
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

async function readDocument(path: string): Promise<WorkspaceDocument> {
  const abs = absolute(path);
  const stat = await statOrNull(abs);
  if (!stat) throw new WorkspaceError("not found", "NOT_FOUND");
  const raw = decoder.decode(await tjs.readFile(abs));
  const parsed = parseMarkdown(raw, path);
  return {
    ...parsed.meta,
    title: parsed.meta.title || titleFromPath(path),
    createdAt: parsed.meta.createdAt || stat.createdAt,
    updatedAt: parsed.meta.updatedAt || new Date(stat.mtimeMs).toISOString(),
    path,
    content: parsed.body,
    mtimeMs: stat.mtimeMs,
    hash: hashText(raw),
  };
}

async function walk(dir: string, prefix: string, out: string[]): Promise<void> {
  for await (const entry of await tjs.readDir(dir)) {
    const name = (entry as { name: string }).name;
    if (!name || name.startsWith(".") || name === "node_modules") continue;
    const rel = prefix ? `${prefix}/${name}` : name;
    const isDirectory = (entry as { isDirectory?: boolean }).isDirectory;
    if (isDirectory) {
      await walk(`${dir}/${name}`, rel, out);
    } else if (MD_EXTENSION.test(name)) {
      out.push(rel);
    }
  }
}

export async function listDocuments(): Promise<WorkspaceDocument[]> {
  const paths: string[] = [];
  await walk(getRoot(), "", paths);
  paths.sort((a, b) => a.localeCompare(b, "ja"));
  const docs: WorkspaceDocument[] = [];
  for (const path of paths) {
    try {
      docs.push(await readDocument(path));
    } catch (error) {
      console.warn(`[workspace] skipping ${path}:`, error);
    }
  }
  return docs;
}

export async function getDocument(path: string): Promise<WorkspaceDocument> {
  return readDocument(relative(path));
}

function safeFileName(title: string): string {
  const name = title
    .replace(/[\\/:*?"<>|\n\r\t]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return name || "Untitled";
}

async function uniquePath(title: string): Promise<string> {
  const base = safeFileName(title);
  let candidate = `${base}.md`;
  let index = 2;
  while (await statOrNull(absolute(candidate))) {
    candidate = `${base} ${index}.md`;
    index += 1;
  }
  return candidate;
}

export async function createDocument(input: {
  title: string;
  content: string;
}): Promise<WorkspaceDocument> {
  const path = await uniquePath(input.title);
  const result = await saveDocument({ ...input, path, expectedMtimeMs: null });
  return result.document;
}

export async function saveDocument(input: SaveDocumentInput): Promise<SaveDocumentResult> {
  const path = input.path ? relative(input.path) : await uniquePath(input.title);
  const abs = absolute(path);
  const existingStat = await statOrNull(abs);
  let existing: WorkspaceDocument | null = null;

  if (existingStat) {
    existing = await readDocument(path);
    const hashChanged =
      input.expectedHash != null && input.expectedHash !== existing.hash;
    const mtimeChanged =
      input.expectedMtimeMs != null &&
      Math.abs(existing.mtimeMs - input.expectedMtimeMs) > 1;
    if (hashChanged || mtimeChanged) {
      throw new WorkspaceError("file changed on disk", "CONFLICT", existing);
    }
    addVersion(path, existing.title, existing.content);
  }

  const now = new Date().toISOString();
  const meta = {
    title: input.title,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    status: input.status,
    summary: input.summary,
    tags: input.tags,
    gistId: input.gistId,
    gistUpdatedAt: input.gistUpdatedAt,
  };

  const text = serializeMarkdown(meta, input.content);
  const tmp = `${abs}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    await tjs.writeFile(tmp, encoder.encode(text));
    await tjs.rename(tmp, abs);
  } catch (error) {
    try {
      await tjs.remove(tmp);
    } catch {
      /* ignore */
    }
    throw new WorkspaceError(`write failed: ${String(error)}`, "IO");
  }

  return { document: await readDocument(path) };
}

export async function deleteDocument(path: string): Promise<void> {
  const rel = relative(path);
  const abs = absolute(rel);
  const stat = await statOrNull(abs);
  if (!stat) throw new WorkspaceError("not found", "NOT_FOUND");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = `${getRoot()}/.right-stuff/trash/${stamp}-${rel.replace(/\//g, "_")}`;
  await tjs.makeDir(`${getRoot()}/.right-stuff/trash`, { recursive: true });
  await tjs.rename(abs, target);
  deleteVersions(rel);
}

export async function backupWorkspace(
  format: "json" | "markdown",
): Promise<{ path: string; count: number }> {
  const documents = await listDocuments();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = `${getRoot()}/.right-stuff/backups/${stamp}-${format}`;
  await tjs.makeDir(dir, { recursive: true });

  if (format === "json") {
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        documents: documents.map((document) => ({
          path: document.path,
          title: document.title,
          content: document.content,
          status: document.status,
          summary: document.summary,
          tags: document.tags,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        })),
      },
      null,
      2,
    );
    const path = `${dir}/workspace.json`;
    await tjs.writeFile(path, encoder.encode(payload));
    return { path, count: documents.length };
  }

  for (const document of documents) {
    const target = `${dir}/${document.path}`;
    const slash = target.lastIndexOf("/");
    if (slash > 0) await tjs.makeDir(target.slice(0, slash), { recursive: true });
    await tjs.writeFile(
      target,
      encoder.encode(
        serializeMarkdown(
          {
            title: document.title,
            createdAt: document.createdAt,
            updatedAt: document.updatedAt,
            status: document.status,
            summary: document.summary,
            tags: document.tags,
            gistId: document.gistId,
            gistUpdatedAt: document.gistUpdatedAt,
          },
          document.content,
        ),
      ),
    );
  }
  return { path: dir, count: documents.length };
}

export async function pathForExternalFile(filePath: string): Promise<string | null> {
  const normalizedRoot = getRoot().replace(/\/+$/, "");
  if (!filePath.startsWith(`${normalizedRoot}/`)) return null;
  return filePath.slice(normalizedRoot.length + 1);
}
