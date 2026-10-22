import React, { useEffect, useRef, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  $createHeadingNode,
  $createQuoteNode,
  HeadingNode,
  QuoteNode,
} from "@lexical/rich-text";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import { CodeHighlightNode, CodeNode, $createCodeNode } from "@lexical/code";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { AutoLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import {
  HorizontalRuleNode,
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
} from "@lexical/react/LexicalHorizontalRuleNode";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
  type ElementTransformer,
  type TextMatchTransformer,
} from "@lexical/markdown";
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
  $setBlocksType,
} from "@lexical/selection";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  EditorState,
  FORMAT_TEXT_COMMAND,
  PASTE_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { useEditorStore } from "@/stores/editorStore";
import { registerLexicalEditor } from "@/utils/editorBridge";
import { ImageNode, $createImageNode, $isImageNode } from "./ImageNode";
import { TypewriterPlugin } from "./TypewriterPlugin";
import { GhostTextNode } from "./GhostTextNode";
import { GhostTextPlugin } from "./GhostTextPlugin";
import { SlashCommandPlugin } from "./SlashCommandPlugin";
import { InlineAIPlugin } from "./InlineAIPlugin";

interface LexicalEditorProps {
  className?: string;
  initialContent: string;
}

const editorStyles = `
  .editor-wrapper { height: 100%; overflow: auto; background-color: #1e1e1e; }
  .editor-inner { height: 100%; display: flex; flex-direction: column; }
  .editor-content { position: relative; flex: 1; padding: 1rem; overflow: auto; }
  .editor-input { min-height: 100%; outline: none; background-color: transparent; color: #d4d4d4; font-family: 'Inter', system-ui, sans-serif; font-size: 16px; line-height: 1.7; }
  .editor-input p:first-child { margin-top: 0; }
  .editor-input h1 { font-size: 2em; font-weight: 700; margin: .67em 0; color: #e5e7eb; }
  .editor-input h2 { font-size: 1.5em; font-weight: 600; margin: .83em 0; color: #e5e7eb; }
  .editor-input h3 { font-size: 1.25em; font-weight: 600; margin: 1em 0; color: #e5e7eb; }
  .editor-input p { margin: 1em 0; }
  .editor-input ul, .editor-input ol { margin: 1em 0; padding-left: 2em; }
  .editor-input li { margin: .25em 0; }
  .editor-input blockquote { margin: 1em 0; padding-left: 1em; border-left: 4px solid #569cd6; color: #d9edff; }
  .editor-input pre { background-color: #2d2d2d; padding: 1em; border-radius: .375rem; overflow-x: auto; margin: 1em 0; }
  .editor-input code { background-color: #2d2d2d; padding: .2em .4em; border-radius: .25rem; font-family: 'Fira Code', Consolas, monospace; font-size: .9em; color: #f4c7ab; }
  .editor-input pre code { background-color: transparent; padding: 0; color: #d4d4d4; }
  .editor-input a { color: #93c5fd; text-decoration: underline; }
  .editor-input hr { border: none; border-top: 1px solid #3e3e3e; margin: 2em 0; }
  .editor-input img { max-width: 100%; height: auto; border-radius: .375rem; }
  .editor-input .rd-image-container { display: inline-block; max-width: 100%; }
  .rd-ghost-text-inner { color: #6b7280; font-style: italic; pointer-events: none; user-select: none; opacity: .75; }

  .rd-slash-menu {
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 8px;
    padding: 4px;
    min-width: 220px;
    max-height: 320px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }
  .rd-slash-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: #e5e7eb;
    cursor: pointer;
    border-radius: 6px;
    text-align: left;
  }
  .rd-slash-item:hover,
  .rd-slash-item.selected {
    background: #374151;
  }
  .rd-slash-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: #4b5563;
    color: #d1d5db;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .rd-slash-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .rd-slash-label {
    font-size: 14px;
    font-weight: 500;
    color: #f9fafb;
  }
  .rd-slash-desc {
    font-size: 12px;
    color: #9ca3af;
  }

  .rd-inline-ai-button {
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
  }
  .rd-inline-ai-button:hover {
    background: #1d4ed8;
  }
  .rd-inline-ai-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .rd-inline-ai-menu {
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 8px;
    padding: 4px;
    min-width: 200px;
    max-height: 360px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }
  .rd-inline-ai-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: #e5e7eb;
    cursor: pointer;
    border-radius: 6px;
    text-align: left;
  }
  .rd-inline-ai-item:hover {
    background: #374151;
  }
  .rd-inline-ai-item.selected {
    background: #2563eb33;
  }
  .rd-inline-ai-label {
    font-size: 14px;
    font-weight: 500;
    color: #f9fafb;
  }
  .rd-inline-ai-desc {
    font-size: 12px;
    color: #9ca3af;
  }
  .editor-input table { border-collapse: collapse; margin: 1em 0; width: 100%; }
  .editor-input th, .editor-input td { border: 1px solid #3e3e3e; padding: .5em 1em; text-align: left; }
  .editor-input th { background-color: #2d2d2d; font-weight: 600; }
  .placeholder { color: #9ca3af; pointer-events: none; position: absolute; top: 1rem; left: 1rem; }
  .lexical-toolbar { display: flex; align-items: center; gap: 4px; padding: 8px 12px; background-color: #252526; border-bottom: 1px solid #3e3e3e; overflow-x: auto; flex-shrink: 0; }
  .toolbar-btn { display: flex; align-items: center; justify-content: center; width: 34px; min-width: 34px; height: 34px; border: none; border-radius: 4px; background-color: transparent; color: #e5e7eb; cursor: pointer; transition: all .15s; font-size: 12px; font-weight: 600; }
  .toolbar-btn:hover { background-color: #3e3e3e; color: #fff; }
  .toolbar-btn:active { background-color: #2563eb; }
  .toolbar-btn:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }
  .toolbar-btn-active { background-color: #2563eb; color: #fff; }
  .toolbar-btn:disabled { opacity: .35; cursor: default; }
  .toolbar-btn:disabled:hover { background-color: transparent; color: #e5e7eb; }
  .toolbar-divider { width: 1px; min-width: 1px; height: 20px; background-color: #3e3e3e; margin: 0 6px; }
  .toolbar-popover { position: fixed; z-index: 100; min-width: 240px; background-color: #2d2d2d; border: 1px solid #3e3e3e; border-radius: 8px; padding: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, .4); }
  .toolbar-popover label { display: block; font-size: 11px; color: #9ca3af; margin-bottom: 4px; }
  .toolbar-popover input { width: 100%; padding: 6px 8px; background-color: #1e1e1e; border: 1px solid #3e3e3e; border-radius: 4px; color: #d4d4d4; font-size: 13px; box-sizing: border-box; }
  .toolbar-popover input:focus { outline: none; border-color: #2563eb; }
  .toolbar-popover-row { display: flex; gap: 8px; margin-bottom: 8px; }
  .toolbar-popover-row .field { flex: 1; }
  .toolbar-popover-actions { display: flex; gap: 8px; margin-top: 10px; }
  .toolbar-popover-actions button { flex: 1; padding: 6px 0; border: none; border-radius: 4px; font-size: 13px; cursor: pointer; transition: all .15s; }
  .toolbar-popover-actions .primary { background-color: #2563eb; color: #fff; }
  .toolbar-popover-actions .primary:hover { background-color: #1d4ed8; }
  .toolbar-popover-actions .secondary { background-color: #3e3e3e; color: #e5e7eb; }
  .toolbar-popover-actions .secondary:hover { background-color: #4b4b4b; }
  .colour-picker { display: flex; align-items: center; justify-content: center; position: relative; }
  .colour-picker input[type="color"] { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
  .colour-swatch { width: 16px; height: 16px; border-radius: 50%; border: 1px solid #3e3e3e; }
  .toolbar-select { height: 30px; padding: 0 6px; background-color: #1e1e1e; border: 1px solid #3e3e3e; border-radius: 4px; color: #e5e7eb; font-size: 12px; cursor: pointer; }
  .toolbar-select:focus-visible { outline: 2px solid #60a5fa; outline-offset: 1px; }
  @media (max-width: 767px) {
    .lexical-toolbar .toolbar-btn { width: 44px; min-width: 44px; height: 44px; }
    .lexical-toolbar .colour-picker { width: 44px; min-width: 44px; height: 44px; }
    .toolbar-select { height: 40px; }
  }
`;

const theme = {
  paragraph: "editor-paragraph",
  heading: {
    h1: "editor-heading-h1",
    h2: "editor-heading-h2",
    h3: "editor-heading-h3",
    h4: "editor-heading-h4",
    h5: "editor-heading-h5",
    h6: "editor-heading-h6",
  },
  text: {
    bold: "editor-text-bold",
    italic: "editor-text-italic",
    underline: "editor-text-underline",
    strikethrough: "editor-text-strikethrough",
    underlineStrikethrough: "editor-text-underline-strikethrough",
    code: "editor-text-code",
  },
  list: {
    ul: "editor-list-ul",
    ol: "editor-list-ol",
    listitem: "editor-listitem",
    listitemChecked: "editor-listitem-checked",
    listitemUnchecked: "editor-listitem-unchecked",
  },
  quote: "editor-quote",
  code: "editor-code",
  link: "editor-link",
  table: "editor-table",
  tableCell: "editor-table-cell",
  tableCellHeader: "editor-table-cell-header",
};

const IMAGE_TRANSFORMER: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (!$isImageNode(node)) return null;
    return `![${node.getAltText()}](${node.getSrc()})`;
  },
  importRegExp: /^(?:!\[)(.*?)(?:\])(?:\(([^)]+)\))$/,
  regExp: /^(?:!\[)(.*?)(?:\])(?:\(([^)]+)\))$/,
  replace: (textNode, match) => {
    const [, altText, src] = match;
    const imageNode = $createImageNode({ src: src ?? "", altText: altText ?? "" });
    textNode.replace(imageNode);
  },
  trigger: ")",
  type: "text-match",
};

const HR_TRANSFORMER: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node) => {
    if (!$isHorizontalRuleNode(node)) return null;
    return "---";
  },
  regExp: /^(?:---|\*\*\*|___)\s*$/,
  replace: (parentNode) => {
    const node = $createHorizontalRuleNode();
    parentNode.replace(node);
  },
  type: "element",
};

const markdownTransformers = [...TRANSFORMERS, IMAGE_TRANSFORMER, HR_TRANSFORMER];

type PopoverKind = "link" | "table" | "image";
type Popover = { kind: PopoverKind; left: number; top: number } | null;

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [activeFontSize, setActiveFontSize] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [popover, setPopover] = useState<Popover>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [tableRows, setTableRows] = useState(3);
  const [tableColumns, setTableColumns] = useState(3);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  useEffect(() => {
    const refreshToolbar = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        const formats: Record<string, boolean> = {};
        if ($isRangeSelection(selection)) {
          formats.bold = selection.hasFormat("bold");
          formats.italic = selection.hasFormat("italic");
          formats.underline = selection.hasFormat("underline");
          formats.strikethrough = selection.hasFormat("strikethrough");
          const color = $getSelectionStyleValueForProperty(selection, "color", "");
          setActiveColor(color || null);
          const highlight = $getSelectionStyleValueForProperty(selection, "background-color", "");
          setActiveHighlight(highlight || null);
          const fontSize = $getSelectionStyleValueForProperty(selection, "font-size", "");
          setActiveFontSize(fontSize || "");
        }
        setActiveFormats(formats);
      });
    };

    const removeUpdate = editor.registerUpdateListener(refreshToolbar);
    const removeSelection = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        refreshToolbar();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    const removeUndo = editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    const removeRedo = editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    return () => {
      removeUpdate();
      removeSelection();
      removeUndo();
      removeRedo();
    };
  }, [editor]);

  useEffect(() => {
    if (!popover) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".toolbar-popover") && !target.closest("[data-toolbar-trigger]")) {
        setPopover(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopover(null);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [popover]);

  const openPopover = (kind: PopoverKind) => {
    const trigger = document.querySelector(`[data-toolbar-trigger="${kind}"]`);
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      setPopover({ kind, left: rect.left, top: rect.bottom + 6 });
    } else {
      setPopover({ kind, left: 0, top: 0 });
    }
  };

  const setBlock = (type: "h1" | "h2" | "h3" | "quote" | "code") => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      if (type === "quote") {
        $setBlocksType(selection, () => $createQuoteNode());
        return;
      }
      if (type === "code") {
        $setBlocksType(selection, () => $createCodeNode());
        return;
      }
      $setBlocksType(selection, () => $createHeadingNode(type));
    });
  };

  const applyColor = (color: string | null) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      $patchStyleText(selection, { color: color ?? null });
    });
  };

  const insertLink = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, trimmed);
  };

  const insertTable = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      columns: String(tableColumns),
      rows: String(tableRows),
    });
  };

  const insertImage = (src: string, altText: string) => {
    const trimmed = src.trim();
    if (!trimmed) return;
    editor.update(() => {
      const selection = $getSelection();
      const imageNode = $createImageNode({ src: trimmed, altText: altText.trim() });
      if ($isRangeSelection(selection)) {
        selection.insertNodes([imageNode]);
      } else {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        paragraph.append(imageNode);
        root.append(paragraph);
      }
    });
  };

  const closePopover = () => {
    setPopover(null);
    setLinkUrl("");
    setTableRows(3);
    setTableColumns(3);
    setImageUrl("");
    setImageAlt("");
  };

  return (
    <>
      <div className="lexical-toolbar" role="toolbar" aria-label="書式ツールバー">
        <button type="button" className="toolbar-btn" data-toolbar-trigger="undo-redo" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} aria-label="元に戻す" title="元に戻す (Ctrl+Z)" disabled={!canUndo}>
          ↶
        </button>
        <button type="button" className="toolbar-btn" data-toolbar-trigger="undo-redo" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} aria-label="やり直す" title="やり直す (Ctrl+Y / Ctrl+Shift+Z)" disabled={!canRedo}>
          ↷
        </button>
        <span className="toolbar-divider" aria-hidden="true" />
        {[
          { label: "見出し 1", content: "H1", action: () => setBlock("h1") },
          { label: "見出し 2", content: "H2", action: () => setBlock("h2") },
          { label: "見出し 3", content: "H3", action: () => setBlock("h3") },
        ].map((item) => (
          <button key={item.label} type="button" className="toolbar-btn" onClick={item.action} aria-label={item.label} title={item.label}>
            {item.content}
          </button>
        ))}
        <span className="toolbar-divider" aria-hidden="true" />
        <button type="button" className={`toolbar-btn ${activeFormats.bold ? "toolbar-btn-active" : ""}`} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")} aria-label="太字" title="太字 (Ctrl+B)" aria-pressed={activeFormats.bold}>
          <strong>B</strong>
        </button>
        <button type="button" className={`toolbar-btn ${activeFormats.italic ? "toolbar-btn-active" : ""}`} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")} aria-label="斜体" title="斜体 (Ctrl+I)" aria-pressed={activeFormats.italic}>
          <em>I</em>
        </button>
        <button type="button" className={`toolbar-btn ${activeFormats.underline ? "toolbar-btn-active" : ""}`} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")} aria-label="下線" title="下線 (Ctrl+U)" aria-pressed={activeFormats.underline}>
          <u>U</u>
        </button>
        <button type="button" className={`toolbar-btn ${activeFormats.strikethrough ? "toolbar-btn-active" : ""}`} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")} aria-label="取り消し線" title="取り消し線" aria-pressed={activeFormats.strikethrough}>
          <s>S</s>
        </button>
        <select
          className="toolbar-select"
          value={activeFontSize}
          onChange={(event) => {
            const value = event.target.value;
            editor.update(() => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              $patchStyleText(selection, { "font-size": value || null });
            });
          }}
          aria-label="フォントサイズ"
          title="フォントサイズ"
        >
          <option value="">サイズ</option>
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="20px">20</option>
          <option value="24px">24</option>
          <option value="32px">32</option>
        </select>
        <span className="colour-picker toolbar-btn" title="文字色">
          <span className="colour-swatch" style={{ backgroundColor: activeColor ?? "#e5e7eb" }} aria-hidden="true" />
          <input
            type="color"
            value={activeColor ?? "#e5e7eb"}
            onChange={(event) => applyColor(event.target.value)}
            aria-label="文字色を選択"
          />
        </span>
        {activeColor && (
          <button type="button" className="toolbar-btn" onClick={() => applyColor(null)} aria-label="文字色をリセット" title="文字色をリセット">
            ×
          </button>
        )}
        <span className="colour-picker toolbar-btn" title="文字の背景色（ハイライト）">
          <span className="colour-swatch" style={{ backgroundColor: activeHighlight ?? "#3e3e3e" }} aria-hidden="true" />
          <input
            type="color"
            value={activeHighlight ?? "#3e3e3e"}
            onChange={(event) => {
              const value = event.target.value;
              editor.update(() => {
                const selection = $getSelection();
                if (!$isRangeSelection(selection)) return;
                $patchStyleText(selection, { "background-color": value });
              });
            }}
            aria-label="文字の背景色を選択"
          />
        </span>
        {activeHighlight && (
          <button type="button" className="toolbar-btn" onClick={() => {
            editor.update(() => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              $patchStyleText(selection, { "background-color": null });
            });
          }} aria-label="文字の背景色をリセット" title="文字の背景色をリセット">
            ×
          </button>
        )}
        <span className="toolbar-divider" aria-hidden="true" />
        <button type="button" className="toolbar-btn" data-toolbar-trigger="link" onClick={() => openPopover("link")} aria-label="リンクを挿入" title="リンクを挿入" aria-expanded={popover?.kind === "link"}>
          🔗
        </button>
        <button type="button" className="toolbar-btn" data-toolbar-trigger="image" onClick={() => openPopover("image")} aria-label="画像を挿入" title="画像を挿入 (URL)" aria-expanded={popover?.kind === "image"}>
          🖼
        </button>
        <span className="toolbar-divider" aria-hidden="true" />
        <button type="button" className="toolbar-btn" data-toolbar-trigger="table" onClick={() => openPopover("table")} aria-label="表を挿入" title="表を挿入" aria-expanded={popover?.kind === "table"}>
          ▦
        </button>
        <button type="button" className="toolbar-btn" onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)} aria-label="水平線を挿入" title="水平線を挿入">
          ―
        </button>
        <span className="toolbar-divider" aria-hidden="true" />
        <button type="button" className="toolbar-btn" onClick={() => setBlock("quote")} aria-label="引用" title="引用">
          “
        </button>
        <button type="button" className="toolbar-btn" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} aria-label="箇条書き" title="箇条書き">
          •
        </button>
        <button type="button" className="toolbar-btn" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} aria-label="番号付きリスト" title="番号付きリスト">
          1.
        </button>
        <button type="button" className="toolbar-btn" onClick={() => setBlock("code")} aria-label="コードブロック" title="コードブロック">
          &lt;&gt;
        </button>
      </div>

      {popover?.kind === "link" && (
        <div className="toolbar-popover" style={{ left: popover.left, top: popover.top }} role="dialog" aria-label="リンクを挿入">
          <label htmlFor="link-url-input">URL</label>
          <input
            id="link-url-input"
            type="url"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                insertLink(linkUrl);
                closePopover();
              }
            }}
            placeholder="https://example.com"
            autoFocus
          />
          <div className="toolbar-popover-actions">
            <button type="button" className="primary" onClick={() => { insertLink(linkUrl); closePopover(); }}>挿入</button>
            <button type="button" className="secondary" onClick={closePopover}>キャンセル</button>
          </div>
        </div>
      )}

      {popover?.kind === "table" && (
        <div className="toolbar-popover" style={{ left: popover.left, top: popover.top }} role="dialog" aria-label="表を挿入">
          <div className="toolbar-popover-row">
            <div className="field">
              <label htmlFor="table-rows-input">行数</label>
              <input
                id="table-rows-input"
                type="number"
                min={1}
                max={20}
                value={tableRows}
                onChange={(event) => setTableRows(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
              />
            </div>
            <div className="field">
              <label htmlFor="table-columns-input">列数</label>
              <input
                id="table-columns-input"
                type="number"
                min={1}
                max={20}
                value={tableColumns}
                onChange={(event) => setTableColumns(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
              />
            </div>
          </div>
          <div className="toolbar-popover-actions">
            <button type="button" className="primary" onClick={() => { insertTable(); closePopover(); }}>挿入</button>
            <button type="button" className="secondary" onClick={closePopover}>キャンセル</button>
          </div>
        </div>
      )}

      {popover?.kind === "image" && (
        <div className="toolbar-popover" style={{ left: popover.left, top: popover.top }} role="dialog" aria-label="画像を挿入">
          <div className="toolbar-popover-row">
            <div className="field">
              <label htmlFor="image-url-input">画像URL</label>
              <input
                id="image-url-input"
                type="url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    insertImage(imageUrl, imageAlt);
                    closePopover();
                  }
                }}
                placeholder="https://example.com/image.png"
                autoFocus
              />
            </div>
          </div>
          <div className="toolbar-popover-row">
            <div className="field">
              <label htmlFor="image-alt-input">代替テキスト（省略可）</label>
              <input
                id="image-alt-input"
                type="text"
                value={imageAlt}
                onChange={(event) => setImageAlt(event.target.value)}
                placeholder="画像の説明"
              />
            </div>
          </div>
          <div className="toolbar-popover-actions">
            <button type="button" className="primary" onClick={() => { insertImage(imageUrl, imageAlt); closePopover(); }}>挿入</button>
            <button type="button" className="secondary" onClick={closePopover}>キャンセル</button>
          </div>
        </div>
      )}
    </>
  );
}

function EditorRegistrationPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    registerLexicalEditor(editor);
    return () => registerLexicalEditor(null);
  }, [editor]);
  return null;
}

function ImagesPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const insertImageDataUrl = (dataUrl: string, altText: string) => {
      editor.update(() => {
        const selection = $getSelection();
        const imageNode = $createImageNode({ src: dataUrl, altText });
        if ($isRangeSelection(selection)) {
          selection.insertNodes([imageNode]);
        } else {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          paragraph.append(imageNode);
          root.append(paragraph);
        }
      });
    };

    const readImageFile = (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          insertImageDataUrl(reader.result, file.name);
        }
      };
      reader.readAsDataURL(file);
    };

    const pickImageFiles = (dataTransfer: DataTransfer | null): File[] => {
      if (!dataTransfer) return [];
      return Array.from(dataTransfer.files).filter((file) =>
        file.type.startsWith("image/"),
      );
    };

    const removePaste = editor.registerCommand(
      PASTE_COMMAND,
      (payload) => {
        const dataTransfer =
          payload instanceof DataTransfer
            ? payload
            : (payload as InputEvent).dataTransfer ?? null;
        const files = pickImageFiles(dataTransfer);
        if (files.length === 0) return false;
        files.forEach(readImageFile);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    const removeDragOver = editor.registerCommand(
      DRAGOVER_COMMAND,
      (event) => {
        const types = event.dataTransfer?.types;
        if (!types || !Array.from(types).includes("Files")) return false;
        event.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    const removeDrop = editor.registerCommand(
      DROP_COMMAND,
      (event) => {
        const files = pickImageFiles(event.dataTransfer);
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach(readImageFile);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    return () => {
      removePaste();
      removeDragOver();
      removeDrop();
    };
  }, [editor]);

  return null;
}

function InitialContentPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    editor.update(() => {
      $convertFromMarkdownString(content, markdownTransformers);
    });
  }, [content, editor]);

  return null;
}

function EditorPlugins() {
  const { setContent } = useEditorStore();
  const isInitialChange = useRef(true);

  const onChange = (editorState: EditorState) => {
    if (isInitialChange.current) {
      isInitialChange.current = false;
      return;
    }
    editorState.read(() => {
      setContent($convertToMarkdownString(markdownTransformers));
    });
  };

  return (
    <>
      <HistoryPlugin />
      <ListPlugin />
      <CheckListPlugin />
      <TablePlugin />
      <LinkPlugin />
      <HorizontalRulePlugin />
      <AutoFocusPlugin />
      <OnChangePlugin onChange={onChange} ignoreSelectionChange />
      <ImagesPlugin />
      <EditorRegistrationPlugin />
      <TypewriterPlugin />
      <GhostTextPlugin />
      <SlashCommandPlugin />
      <InlineAIPlugin />
    </>
  );
}

export const LexicalEditor: React.FC<LexicalEditorProps> = ({
  className = "",
  initialContent,
}) => {
  const initialConfig = {
    namespace: "RightStuffEditorDash",
    theme,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableRowNode,
      TableCellNode,
      LinkNode,
      AutoLinkNode,
      HorizontalRuleNode,
      ImageNode,
      GhostTextNode,
    ],
    onError: (error: Error) => console.error("Lexical editor error:", error),
  };

  return (
    <div className={`editor-wrapper ${className}`}>
      <style>{editorStyles}</style>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="editor-inner">
          <ToolbarPlugin />
          <RichTextPlugin
            contentEditable={
              <div className="editor-content">
                <ContentEditable
                  className="editor-input"
                  role="textbox"
                  ariaLabel="リッチテキストエディタ"
                  ariaMultiline="true"
                />
              </div>
            }
            placeholder={<div className="placeholder">書き始める…</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <InitialContentPlugin content={initialContent} />
          <EditorPlugins />
        </div>
      </LexicalComposer>
    </div>
  );
};

export default LexicalEditor;
