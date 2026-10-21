import type { NotesFolder, NotesNote } from "../shared/types.ts";

const READ_ONLY_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /<object\b/i, reason: "添付ファイルまたは表が含まれています" },
  { pattern: /<table\b/i, reason: "表が含まれています" },
  { pattern: /<img\b/i, reason: "画像が含まれています" },
  { pattern: /<input\b/i, reason: "チェックリストが含まれています" },
  { pattern: /checklist/i, reason: "チェックリストが含まれています" },
  { pattern: /checkbox/i, reason: "チェックリストが含まれています" },
  { pattern: /<(video|audio|iframe|embed)\b/i, reason: "埋め込みコンテンツが含まれています" },
];

export interface NotesReadResult {
  note: NotesNote;
  html: string;
}

export interface NotesSaveResult {
  id: string;
  title: string;
  modifiedAt: string;
}

function escapeAppleScript(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readOnlyReason(html: string): string | null {
  for (const { pattern, reason } of READ_ONLY_PATTERNS) {
    if (pattern.test(html)) return reason;
  }
  return null;
}

function normalizeNotesHtml(html: string): string {
  return html
    .replace(/&lt/g, "<")
    .replace(/&gt/g, ">")
    .replace(/&quot/g, '"')
    .replace(/&apos/g, "'")
    .replace(/&nbsp/g, " ")
    .replace(/&amp/g, "&");
}

function parseNoteName(body: string): string | null {
  const match = body.match(/^<div>(.*?)<\/div>/is);
  if (!match) return null;
  return match[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

export async function listFolders(app: TinyApp): Promise<NotesFolder[]> {
  const script = `
tell application "Notes"
  set out to ""
  repeat with a in accounts
    set accountName to name of a
    repeat with f in folders of a
      set out to out & accountName & tab & (name of f) & tab & (count of notes of f) & linefeed
    end repeat
  end repeat
  return out
end tell`;
  const raw = (await app.macos.applescript(script)) ?? "";
  return raw
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter(Boolean)
    .map((line) => {
      const [account, name, count] = line.split("\t");
      return { account, name, noteCount: Number(count) || 0 };
    })
    .filter((folder) => folder.name && folder.name !== "Recently Deleted");
}

export async function listNotes(
  app: TinyApp,
  input: { account: string; folder: string; limit?: number },
): Promise<NotesNote[]> {
  const limit = Math.max(1, Math.min(input.limit ?? 300, 1000));
  const account = escapeAppleScript(input.account);
  const folder = escapeAppleScript(input.folder);
  const script = `
with timeout of 300 seconds
tell application "Notes"
  set f to folder "${folder}" of account "${account}"
  set nIds to id of every note of f
  set nNames to name of every note of f
  set nMods to modification date of every note of f
  set total to count of nIds
  if total > ${limit} then set total to ${limit}
  set out to ""
  repeat with i from 1 to total
    set nName to item i of nNames
    set AppleScript's text item delimiters to {tab, linefeed, return}
    set nName to (text items of nName) as string
    set AppleScript's text item delimiters to ""
    set out to out & (item i of nIds) & tab & nName & tab & ((item i of nMods) as string) & linefeed
  end repeat
  return out
end tell
end timeout`;
  const raw = (await app.macos.applescript(script)) ?? "";
  return raw
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter(Boolean)
    .map((line) => {
      const [id, title, modified] = line.split("\t");
      return {
        id,
        account: input.account,
        folder: input.folder,
        title: title || "(無題)",
        snippet: "",
        modifiedAt: modified || "",
        readOnly: false,
      } satisfies NotesNote;
    });
}

export async function readNote(app: TinyApp, id: string): Promise<NotesReadResult> {
  const safeId = escapeAppleScript(id);
  const script = `
with timeout of 120 seconds
tell application "Notes"
  set n to note id "${safeId}"
  set nName to name of n
  set nBody to body of n
  set nMod to (modification date of n) as string
  set nProtected to password protected of n
  set nShared to shared of n
  return my json(nName, nBody, nMod, nProtected, nShared)
end tell
end timeout

on json(nName, nBody, nMod, nProtected, nShared)
  set protectedText to "false"
  if nProtected then set protectedText to "true"
  set sharedText to "false"
  if nShared then set sharedText to "true"
  return "{\\"name\\":\\"" & my esc(nName) & "\\",\\"body\\":\\"" & my esc(nBody) & "\\",\\"modified\\":\\"" & my esc(nMod) & "\\",\\"protected\\":" & protectedText & ",\\"shared\\":" & sharedText & "}"
end json

on esc(txt)
  set txt to my replaceText(txt, "\\\\", "\\\\\\\\")
  set txt to my replaceText(txt, "\\"", "\\\\\\"")
  set txt to my replaceText(txt, return, "\\\\n")
  set txt to my replaceText(txt, linefeed, "\\\\n")
  set txt to my replaceText(txt, tab, "\\\\t")
  return txt
end esc

on replaceText(theText, searchString, replacementString)
  set AppleScript's text item delimiters to searchString
  set theTextItems to every text item of theText
  set AppleScript's text item delimiters to replacementString
  set theText to theTextItems as string
  set AppleScript's text item delimiters to ""
  return theText
end replaceText`;
  const raw = (await app.macos.applescript(script)) ?? "{}";
  const parsed = JSON.parse(raw) as {
    name: string;
    body: string;
    modified: string;
    protected: boolean;
    shared: boolean;
  };
  const body = normalizeNotesHtml(parsed.body ?? "");
  const html = body.replace(/^<div>.*?<\/div>/is, "").replace(/^\s+/, "");
  const reason = parsed.protected
    ? "ロックされたノートは編集できません"
    : parsed.shared
      ? "共有ノートは安全のため読み取り専用です"
      : readOnlyReason(body);
  return {
    note: {
      id,
      account: "",
      folder: "",
      title: parsed.name || parseNoteName(body) || "(無題)",
      snippet: body
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120),
      modifiedAt: parsed.modified || "",
      readOnly: !!reason,
      readOnlyReason: reason ?? undefined,
    },
    html,
  };
}

export async function saveNote(
  app: TinyApp,
  input: { id: string; title: string; html: string },
): Promise<NotesSaveResult> {
  const id = escapeAppleScript(input.id);
  const title = escapeHtml(input.title);
  const body = `<div>${title}</div>${input.html}`;
  const script = `
with timeout of 120 seconds
tell application "Notes"
  set n to note id "${id}"
  set body of n to "${escapeAppleScript(body)}"
  delay 0.2
  set n2 to note id "${id}"
  return (modification date of n2) as string
end tell
end timeout`;
  const modified = (await app.macos.applescript(script)) ?? "";
  return { id: input.id, title: input.title, modifiedAt: modified };
}

export async function createNote(
  app: TinyApp,
  input: { account: string; folder: string; title: string; html: string },
): Promise<NotesSaveResult> {
  const account = escapeAppleScript(input.account);
  const folder = escapeAppleScript(input.folder);
  const title = escapeHtml(input.title);
  const body = `<div>${title}</div>${input.html}`;
  const script = `
with timeout of 120 seconds
tell application "Notes"
  set f to folder "${folder}" of account "${account}"
  set n to make new note at f with properties {body:"${escapeAppleScript(body)}"}
  return (id of n) & tab & ((modification date of n) as string)
end tell
end timeout`;
  const raw = (await app.macos.applescript(script)) ?? "";
  const [id, modified] = raw.split("\t");
  return { id, title: input.title, modifiedAt: modified ?? "" };
}
