import type { DocumentMeta, DocumentStatus } from "../shared/types.ts";

export interface ParsedMarkdown {
  meta: DocumentMeta;
  body: string;
}

const META_KEYS = new Set([
  "title",
  "createdAt",
  "updatedAt",
  "status",
  "summary",
  "tags",
  "gistId",
  "gistUpdatedAt",
]);

function parseValue(raw: string): unknown {
  const value = raw.trim();
  if (!value) return "";
  if (value.startsWith('"') || value.startsWith("[") || value.startsWith("{")) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function titleFromBody(body: string): string {
  const heading = body.match(/^\s*#\s+(.+?)\s*$/m);
  if (heading) return heading[1].trim();
  const firstLine = body.split("\n").find((line) => line.trim());
  return firstLine ? firstLine.replace(/^#+\s*/, "").slice(0, 80) : "Untitled";
}

export function titleFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.(md|markdown|txt)$/i, "") || "Untitled";
}

export function parseMarkdown(raw: string, path: string): ParsedMarkdown {
  const text = raw.replace(/^\uFEFF/, "");
  const lines = text.split("\n");
  let body = text;
  const values: Record<string, unknown> = {};

  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
    if (end > 0) {
      for (const line of lines.slice(1, end)) {
        const match = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);
        if (match) values[match[1]] = parseValue(match[2]);
      }
      body = lines.slice(end + 1).join("\n").replace(/^\n+/, "");
    }
  }

  const meta: DocumentMeta = {
    title:
      typeof values.title === "string" && values.title.trim()
        ? values.title.trim()
        : titleFromBody(body) || titleFromPath(path),
    createdAt: typeof values.createdAt === "string" ? values.createdAt : "",
    updatedAt: typeof values.updatedAt === "string" ? values.updatedAt : "",
    status:
      values.status === "draft" || values.status === "done"
        ? (values.status as DocumentStatus)
        : undefined,
    summary: typeof values.summary === "string" ? values.summary : undefined,
    tags: Array.isArray(values.tags)
      ? values.tags.filter((tag): tag is string => typeof tag === "string")
      : undefined,
    gistId: typeof values.gistId === "string" ? values.gistId : undefined,
    gistUpdatedAt:
      typeof values.gistUpdatedAt === "string" ? values.gistUpdatedAt : undefined,
  };

  return { meta, body };
}

export function serializeMarkdown(
  meta: DocumentMeta,
  body: string,
  extra: Record<string, unknown> = {},
): string {
  const values: Record<string, unknown> = {
    ...extra,
    title: meta.title,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    status: meta.status,
    summary: meta.summary,
    tags: meta.tags?.length ? meta.tags : undefined,
    gistId: meta.gistId,
    gistUpdatedAt: meta.gistUpdatedAt,
  };

  const lines: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (!META_KEYS.has(key) || value === undefined || value === null || value === "") {
      continue;
    }
    lines.push(`${key}: ${JSON.stringify(value)}`);
  }

  const normalizedBody = body.replace(/\r\n/g, "\n").replace(/\s+$/, "");
  return `---\n${lines.join("\n")}\n---\n\n${normalizedBody}\n`;
}
