import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ViewStore {
  zenMode: boolean;
  typewriterMode: boolean;
  setZenMode: (enabled: boolean) => void;
  toggleZenMode: () => void;
  setTypewriterMode: (enabled: boolean) => void;
  toggleTypewriterMode: () => void;
}

export const useViewStore = create<ViewStore>()(
  persist(
    (set) => ({
      zenMode: false,
      typewriterMode: false,

      setZenMode: (enabled) => set({ zenMode: enabled }),

      toggleZenMode: () =>
        set((state) => ({ zenMode: !state.zenMode })),

      setTypewriterMode: (enabled) => set({ typewriterMode: enabled }),

      toggleTypewriterMode: () =>
        set((state) => ({ typewriterMode: !state.typewriterMode })),
    }),
    {
      name: "right-stuff-editor-dash-view",
      partialize: (state) => ({
        zenMode: state.zenMode,
        typewriterMode: state.typewriterMode,
      }),
    }
  )
);

export default useViewStore;
