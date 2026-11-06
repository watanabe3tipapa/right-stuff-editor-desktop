import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $createCodeNode } from "@lexical/code";
import {
  $removeList,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  ListNode,
} from "@lexical/list";
import { $setBlocksType } from "@lexical/selection";
import { $getNearestNodeOfType } from "@lexical/utils";

export type BlockKind =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "quote"
  | "code";

export type ListKind = "bullet" | "number" | "check";

export function setBlockType(editor: LexicalEditor, kind: BlockKind) {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    const anchor = selection.anchor.getNode();
    if ($getNearestNodeOfType(anchor, ListNode)) {
      // リスト内から見出しなどへ変えるときは、先にリストを解除する。
      $removeList();
    }

    if (kind === "paragraph") {
      $setBlocksType(selection, () => $createParagraphNode());
      return;
    }
    if (kind === "quote") {
      $setBlocksType(selection, () => $createQuoteNode());
      return;
    }
    if (kind === "code") {
      $setBlocksType(selection, () => $createCodeNode());
      return;
    }
    $setBlocksType(selection, () => $createHeadingNode(kind));
  });
}

export function currentListType(editor: LexicalEditor): ListKind | null {
  let type: ListKind | null = null;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const list = $getNearestNodeOfType(selection.anchor.getNode(), ListNode);
    if (!list) return;
    const listType = list.getListType();
    if (listType === "bullet" || listType === "number" || listType === "check") {
      type = listType;
    }
  });
  return type;
}

export function toggleList(editor: LexicalEditor, type: ListKind) {
  if (currentListType(editor) === type) {
    editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    return;
  }
  if (type === "bullet") {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    return;
  }
  if (type === "number") {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    return;
  }
  editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
}

function topLevelNode(node: LexicalNode): LexicalNode {
  let current = node;
  while (current.getParent() && !$isRootNode(current.getParent()!)) {
    current = current.getParent()!;
  }
  return current;
}

export function moveBlock(editor: LexicalEditor, direction: -1 | 1) {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const node = topLevelNode(selection.anchor.getNode());
    const parent = node.getParent();
    if (!parent || !$isRootNode(parent)) return;
    const sibling = direction < 0 ? node.getPreviousSibling() : node.getNextSibling();
    if (!sibling) return;
    if (direction < 0) {
      sibling.insertBefore(node);
    } else {
      sibling.insertAfter(node);
    }
  });
}
