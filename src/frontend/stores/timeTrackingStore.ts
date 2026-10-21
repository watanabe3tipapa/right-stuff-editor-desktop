import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TimeTrackingState {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

export const useTimeTrackingStore = create<TimeTrackingState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: "right-stuff-editor-dash-time-tracking",
    },
  ),
);

export default useTimeTrackingStore;
