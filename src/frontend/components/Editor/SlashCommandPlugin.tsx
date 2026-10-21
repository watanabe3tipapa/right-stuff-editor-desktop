import { useCallback, useMemo, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import {
  $createHeadingNode,
  $createQuoteNode,
} from "@lexical/rich-text";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { $createCodeNode } from "@lexical/code";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { $setBlocksType } from "@lexical/selection";
import {
  $getSelection,
  $isRangeSelection,
  type LexicalEditor,
} from "lexical";
import { $createListNode, $createListItemNode } from "@lexical/list";

interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
  onSelect: (editor: LexicalEditor) => void;
}

const BLOCK_COMMANDS: SlashCommand[] = [
  {
    id: "h1",
    label: "見出し 1",
    description: "大きな見出し",
    icon: "H1",
    keywords: ["h1", "heading", "見出し"],
    onSelect: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode("h1"));
        }
      });
    },
  },
  {
    id: "h2",
    label: "見出し 2",
    description: "中見出し",
    icon: "H2",
    keywords: ["h2", "heading", "見出し"],
    onSelect: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode("h2"));
        }
      });
    },
  },
  {
    id: "h3",
    label: "見出し 3",
    description: "小見出し",
    icon: "H3",
    keywords: ["h3", "heading", "見出し"],
    onSelect: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode("h3"));
        }
      });
    },
  },
  {
    id: "quote",
    label: "引用",
    description: "引用ブロック",
    icon: "❝",
    keywords: ["quote", "引用"],
    onSelect: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      });
    },
  },
  {
    id: "bullet",
    label: "箇条書き",
    description: "箇条書きリスト",
    icon: "•",
    keywords: ["list", "bullet", "箇条書き"],
    onSelect: (editor) => {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    },
  },
  {
    id: "numbered",
    label: "番号付きリスト",
    description: "番号付きリスト",
    icon: "1.",
    keywords: ["list", "numbered", "番号"],
    onSelect: (editor) => {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    },
  },
  {
    id: "check",
    label: "チェックリスト",
    description: "チェックボックス付きリスト",
    icon: "☐",
    keywords: ["check", "todo", "チェック"],
    onSelect: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => {
            const list = $createListNode("check");
            const item = $createListItemNode();
            list.append(item);
            return list;
          });
        }
      });
    },
  },
  {
    id: "code",
    label: "コードブロック",
    description: "シンタックスハイライト付きコード",
    icon: "</>",
    keywords: ["code", "コード"],
    onSelect: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createCodeNode());
        }
      });
    },
  },
  {
    id: "table",
    label: "表",
    description: "3x3の表を挿入",
    icon: "⊞",
    keywords: ["table", "表"],
    onSelect: (editor) => {
      editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        columns: "3",
        rows: "3",
      });
    },
  },
  {
    id: "hr",
    label: "水平線",
    description: "区切り線を挿入",
    icon: "—",
    keywords: ["hr", "horizontal", "水平線", "line"],
    onSelect: (editor) => {
      editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
    },
  },
];

class SlashCommandOption extends MenuOption {
  command: SlashCommand;
  constructor(command: SlashCommand) {
    super(command.id);
    this.command = command;
  }
}

export const SlashCommandPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  const triggerMatch = useBasicTypeaheadTriggerMatch("/", {
    minLength: 0,
  });

  const options = useMemo(() => {
    const commands = queryString
      ? BLOCK_COMMANDS.filter((cmd) => {
          const query = queryString.toLowerCase();
          return (
            cmd.label.toLowerCase().includes(query) ||
            cmd.keywords.some((k) => k.toLowerCase().includes(query))
          );
        })
      : BLOCK_COMMANDS;
    return commands.map((cmd) => new SlashCommandOption(cmd));
  }, [queryString]);

  const onSelectOption = useCallback(
    (
      selectedOption: SlashCommandOption,
      textNodeContainingQuery: { remove: () => void } | null,
      closeMenu: () => void,
    ) => {
      selectedOption.command.onSelect(editor);
      closeMenu();
      textNodeContainingQuery?.remove();
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<SlashCommandOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={triggerMatch}
      options={options}
      menuRenderFn={(anchorElementRef, itemProps) => {
        if (!anchorElementRef.current || options.length === 0) return null;
        return (
          <div
            className="rd-slash-menu"
            style={{
              position: "absolute",
              top: anchorElementRef.current.getBoundingClientRect().bottom + 4,
              left: anchorElementRef.current.getBoundingClientRect().left,
            }}
          >
            {options.map((option, index) => (
              <button
                key={option.key}
                type="button"
                className={`rd-slash-item ${
                  index === itemProps.selectedIndex ? "selected" : ""
                }`}
                onClick={() => {
                  itemProps.selectOptionAndCleanUp(option);
                }}
                onMouseEnter={() => {
                  itemProps.setHighlightedIndex(index);
                }}
              >
                <span className="rd-slash-icon">{option.command.icon}</span>
                <span className="rd-slash-content">
                  <span className="rd-slash-label">{option.command.label}</span>
                  <span className="rd-slash-desc">{option.command.description}</span>
                </span>
              </button>
            ))}
          </div>
        );
      }}
    />
  );
};

export default SlashCommandPlugin;
