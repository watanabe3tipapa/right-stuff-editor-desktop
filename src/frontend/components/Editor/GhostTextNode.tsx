import type {
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { DecoratorNode } from "lexical";

export type SerializedGhostTextNode = Spread<
  {
    suggestion: string;
  },
  SerializedLexicalNode
>;

export class GhostTextNode extends DecoratorNode<JSX.Element> {
  __suggestion: string;

  static getType(): string {
    return "ghost-text";
  }

  static clone(node: GhostTextNode): GhostTextNode {
    return new GhostTextNode(node.__suggestion, node.__key);
  }

  constructor(suggestion: string, key?: NodeKey) {
    super(key);
    this.__suggestion = suggestion;
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "rd-ghost-text";
    return span;
  }

  updateDOM(): false {
    return false;
  }

  static importJSON(serializedNode: SerializedGhostTextNode): GhostTextNode {
    return $createGhostTextNode(serializedNode.suggestion);
  }

  exportJSON(): SerializedGhostTextNode {
    return {
      ...super.exportJSON(),
      type: "ghost-text",
      suggestion: this.__suggestion,
      version: 1,
    };
  }

  getSuggestion(): string {
    return this.getLatest().__suggestion;
  }

  isInline(): boolean {
    return true;
  }

  isIsolated(): boolean {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <span
        className="rd-ghost-text-inner"
        contentEditable={false}
        aria-label={`AI候補: ${this.__suggestion}`}
        title="Tab で採用 · Esc で破棄"
      >
        {this.__suggestion}
      </span>
    );
  }
}

export function $createGhostTextNode(suggestion: string): GhostTextNode {
  return new GhostTextNode(suggestion);
}

export function $isGhostTextNode(
  node: LexicalNode | null | undefined,
): node is GhostTextNode {
  return node instanceof GhostTextNode;
}
