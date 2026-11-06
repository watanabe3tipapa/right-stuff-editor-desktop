import { createCommand } from "lexical";

/** 固定ツールバーのリンク入力を開く。 */
export const OPEN_LINK_POPOVER_COMMAND = createCommand<void>(
  "OPEN_LINK_POPOVER_COMMAND",
);

/** 固定ツールバーの画像入力を開く。 */
export const OPEN_IMAGE_POPOVER_COMMAND = createCommand<void>(
  "OPEN_IMAGE_POPOVER_COMMAND",
);

/** 検索・置換バーを開く。 */
export const OPEN_FIND_COMMAND = createCommand<{ replace?: boolean }>(
  "OPEN_FIND_COMMAND",
);
