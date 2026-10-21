import { getActiveFileInfo, hasActiveFile } from "./fileOperations";

export interface MdvLaunchOutcome {
  ok: boolean;
  url?: string;
  error?: string;
}

export const isElectron = (): boolean => !!window.electronAPI?.isElectron;

export async function launchMdv(targetPath?: string): Promise<MdvLaunchOutcome> {
  if (!window.electronAPI?.launchMdv) {
    return {
      ok: false,
      error: "mdv連携はデスクトップ版（Electron）でのみ利用できます。ブラウザ版では強化プレビューをご利用ください。",
    };
  }

  const file = getActiveFileInfo();
  const relativeTarget = targetPath ?? file.path ?? file.name;
  if (!relativeTarget) {
    return { ok: false, error: "保存先ファイル（パス）が取得できません。" };
  }

  const result = await window.electronAPI.launchMdv(relativeTarget);
  if (!result.success) {
    return { ok: false, error: result.error ?? "mdv の起動に失敗しました。mdv がインストールされているか確認してください。" };
  }
  return { ok: true, url: result.url };
}

export function requireActiveFile(): boolean {
  return hasActiveFile();
}

export async function closeMdv(): Promise<void> {
  if (window.electronAPI?.closeMdv) {
    await window.electronAPI.closeMdv();
  }
}
