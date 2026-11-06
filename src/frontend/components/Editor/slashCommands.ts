import type { LexicalEditor } from "lexical";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { setBlockType, toggleList } from "./blockOperations";
import {
  OPEN_FIND_COMMAND,
  OPEN_IMAGE_POPOVER_COMMAND,
  OPEN_LINK_POPOVER_COMMAND,
} from "./editorCommands";

export type SlashGroupId = "basic" | "insert";

export const SLASH_GROUPS: Record<SlashGroupId, string> = {
  basic: "基本",
  insert: "挿入",
};

export interface SlashCommandDefinition {
  id: string;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
  group: SlashGroupId;
  shortcut?: string;
  onSelect: (editor: LexicalEditor) => void;
}

export const SLASH_COMMANDS: SlashCommandDefinition[] = [
  {
    id: "text",
    label: "本文",
    description: "通常の段落に戻す",
    icon: "¶",
    keywords: ["text", "paragraph", "本文", "段落", "p"],
    group: "basic",
    shortcut: "⌘⌥0",
    onSelect: (editor) => setBlockType(editor, "paragraph"),
  },
  {
    id: "h1",
    label: "見出し 1",
    description: "大きな見出し",
    icon: "H1",
    keywords: ["h1", "heading", "見出し", "大見出し"],
    group: "basic",
    shortcut: "⌘⌥1",
    onSelect: (editor) => setBlockType(editor, "h1"),
  },
  {
    id: "h2",
    label: "見出し 2",
    description: "中見出し",
    icon: "H2",
    keywords: ["h2", "heading", "見出し"],
    group: "basic",
    shortcut: "⌘⌥2",
    onSelect: (editor) => setBlockType(editor, "h2"),
  },
  {
    id: "h3",
    label: "見出し 3",
    description: "小見出し",
    icon: "H3",
    keywords: ["h3", "heading", "見出し"],
    group: "basic",
    shortcut: "⌘⌥3",
    onSelect: (editor) => setBlockType(editor, "h3"),
  },
  {
    id: "h4",
    label: "見出し 4",
    description: "さらに小さな見出し",
    icon: "H4",
    keywords: ["h4", "heading", "見出し"],
    group: "basic",
    shortcut: "⌘⌥4",
    onSelect: (editor) => setBlockType(editor, "h4"),
  },
  {
    id: "h5",
    label: "見出し 5",
    description: "細かい見出し",
    icon: "H5",
    keywords: ["h5", "heading", "見出し"],
    group: "basic",
    shortcut: "⌘⌥5",
    onSelect: (editor) => setBlockType(editor, "h5"),
  },
  {
    id: "h6",
    label: "見出し 6",
    description: "最小の見出し",
    icon: "H6",
    keywords: ["h6", "heading", "見出し"],
    group: "basic",
    shortcut: "⌘⌥6",
    onSelect: (editor) => setBlockType(editor, "h6"),
  },
  {
    id: "bullet",
    label: "箇条書き",
    description: "箇条書きリスト",
    icon: "•",
    keywords: ["list", "bullet", "unordered", "箇条書き", "リスト"],
    group: "basic",
    shortcut: "⌘⇧8",
    onSelect: (editor) => toggleList(editor, "bullet"),
  },
  {
    id: "numbered",
    label: "番号付きリスト",
    description: "番号付きリスト",
    icon: "1.",
    keywords: ["list", "number", "ordered", "番号", "リスト"],
    group: "basic",
    shortcut: "⌘⇧7",
    onSelect: (editor) => toggleList(editor, "number"),
  },
  {
    id: "check",
    label: "チェックリスト",
    description: "チェックボックス付きリスト",
    icon: "☑",
    keywords: ["check", "todo", "task", "チェック", "タスク"],
    group: "basic",
    shortcut: "⌘⌥T",
    onSelect: (editor) => toggleList(editor, "check"),
  },
  {
    id: "quote",
    label: "引用",
    description: "引用ブロック",
    icon: "❝",
    keywords: ["quote", "cite", "引用"],
    group: "basic",
    shortcut: "⌘⇧.",
    onSelect: (editor) => setBlockType(editor, "quote"),
  },
  {
    id: "code",
    label: "コードブロック",
    description: "シンタックスハイライト付きコード",
    icon: "</>",
    keywords: ["code", "pre", "コード"],
    group: "basic",
    shortcut: "⌘⌥C",
    onSelect: (editor) => setBlockType(editor, "code"),
  },
  {
    id: "table",
    label: "表",
    description: "3×3 の表を挿入",
    icon: "⊞",
    keywords: ["table", "grid", "表", "テーブル"],
    group: "insert",
    shortcut: "⌘⌥A",
    onSelect: (editor) => {
      editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: "3", rows: "3" });
    },
  },
  {
    id: "divider",
    label: "水平線",
    description: "区切り線を挿入",
    icon: "—",
    keywords: ["hr", "horizontal", "divider", "水平線", "区切り"],
    group: "insert",
    shortcut: "⌘⌥S",
    onSelect: (editor) => {
      editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
    },
  },
  {
    id: "link",
    label: "リンク",
    description: "選択範囲にリンクを設定",
    icon: "🔗",
    keywords: ["link", "url", "リンク"],
    group: "insert",
    shortcut: "⌘⌥K",
    onSelect: (editor) => {
      editor.dispatchCommand(OPEN_LINK_POPOVER_COMMAND, undefined);
    },
  },
  {
    id: "image",
    label: "画像",
    description: "URL から画像を挿入",
    icon: "🖼",
    keywords: ["image", "picture", "画像", "写真"],
    group: "insert",
    onSelect: (editor) => {
      editor.dispatchCommand(OPEN_IMAGE_POPOVER_COMMAND, undefined);
    },
  },
  {
    id: "find",
    label: "検索",
    description: "文書内を検索",
    icon: "🔍",
    keywords: ["find", "search", "検索"],
    group: "insert",
    shortcut: "⌘F",
    onSelect: (editor) => {
      editor.dispatchCommand(OPEN_FIND_COMMAND, {});
    },
  },
  {
    id: "replace",
    label: "検索と置換",
    description: "文書内を検索して置換",
    icon: "⇄",
    keywords: ["replace", "find", "置換", "検索"],
    group: "insert",
    shortcut: "⌘⌥F",
    onSelect: (editor) => {
      editor.dispatchCommand(OPEN_FIND_COMMAND, { replace: true });
    },
  },
];

const rank = (command: SlashCommandDefinition, query: string): number => {
  const label = command.label.toLowerCase();
  const keywords = command.keywords.map((keyword) => keyword.toLowerCase());
  if (label.startsWith(query)) return 0;
  if (keywords.some((keyword) => keyword.startsWith(query))) return 1;
  if (label.includes(query)) return 2;
  if (keywords.some((keyword) => keyword.includes(query))) return 3;
  return 4;
};

/** 前方一致 → キーワード前方一致 → 部分一致 の順に並べる。 */
export function filterSlashCommands(
  commands: SlashCommandDefinition[],
  query: string,
): SlashCommandDefinition[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return commands;
  return commands
    .map((command, index) => ({ command, index, score: rank(command, normalized) }))
    .filter((entry) => entry.score < 4)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.command);
}
