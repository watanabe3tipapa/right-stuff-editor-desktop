import { hasActiveFile } from "./fileOperations";

export interface MdvLaunchOutcome {
  ok: boolean;
  url?: string;
  error?: string;
}

export const isElectron = (): boolean => false;

export async function launchMdv(): Promise<MdvLaunchOutcome> {
  return {
    ok: false,
    error: "mdv 連携は現在のデスクトップ版では未対応です。",
  };
}

export function requireActiveFile(): boolean {
  return hasActiveFile();
}

export async function closeMdv(): Promise<void> {
  return;
}
