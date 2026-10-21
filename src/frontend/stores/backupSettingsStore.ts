import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BackupFormat } from "@/types";

interface BackupSettingsState {
  enabled: boolean;
  intervalMinutes: number;
  format: BackupFormat;
  lastBackupAt: string | null;
  setEnabled: (v: boolean) => void;
  setInterval: (m: number) => void;
  setFormat: (f: BackupFormat) => void;
  markBackup: (iso?: string) => void;
}

export const useBackupSettingsStore = create<BackupSettingsState>()(
  persist(
    (set) => ({
      enabled: false,
      intervalMinutes: 60,
      format: "json",
      lastBackupAt: null,
      setEnabled: (enabled) => set({ enabled }),
      setInterval: (intervalMinutes) => set({ intervalMinutes }),
      setFormat: (format) => set({ format }),
      markBackup: (iso) => set({ lastBackupAt: iso ?? new Date().toISOString() }),
    }),
    {
      name: "right-stuff-editor-dash-backup-settings",
    },
  ),
);

export default useBackupSettingsStore;
