import { useCallback, useMemo, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import {
  filterSlashCommands,
  SLASH_COMMANDS,
  SLASH_GROUPS,
  type SlashCommandDefinition,
} from "./slashCommands";

class SlashCommandOption extends MenuOption {
  command: SlashCommandDefinition;
  constructor(command: SlashCommandDefinition) {
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

  const options = useMemo(
    () =>
      filterSlashCommands(SLASH_COMMANDS, queryString ?? "").map(
        (command) => new SlashCommandOption(command),
      ),
    [queryString],
  );

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
        const rect = anchorElementRef.current.getBoundingClientRect();
        return (
          <div
            className="rd-slash-menu"
            style={{
              position: "fixed",
              top: rect.bottom + 4,
              left: rect.left,
            }}
          >
            {options.map((option, index) => {
              const previous = options[index - 1];
              const showGroup =
                !previous || previous.command.group !== option.command.group;
              return (
                <div key={option.key}>
                  {showGroup && (
                    <div className="rd-slash-group">
                      {SLASH_GROUPS[option.command.group]}
                    </div>
                  )}
                  <button
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
                    {option.command.shortcut && (
                      <kbd className="rd-slash-shortcut">{option.command.shortcut}</kbd>
                    )}
                  </button>
                </div>
              );
            })}
            <div className="rd-slash-footer">
              ↑↓ で移動 · Enter で決定 · Esc で閉じる
            </div>
          </div>
        );
      }}
    />
  );
};

export default SlashCommandPlugin;
