import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GhostStore {
  enabled: boolean;
  delayMs: number;
  maxTokens: number;
  setEnabled: (enabled: boolean) => void;
  setDelayMs: (delayMs: number) => void;
  setMaxTokens: (maxTokens: number) => void;
}

export const useGhostStore = create<GhostStore>()(
  persist(
    (set) => ({
      enabled: false,
      delayMs: 1000,
      maxTokens: 60,

      setEnabled: (enabled) => set({ enabled }),

      setDelayMs: (delayMs) =>
        set({ delayMs: Math.max(200, Math.min(5000, delayMs)) }),

      setMaxTokens: (maxTokens) =>
        set({ maxTokens: Math.max(8, Math.min(256, maxTokens)) }),
    }),
    {
      name: "right-stuff-editor-dash-ghost",
    }
  )
);

export default useGhostStore;
