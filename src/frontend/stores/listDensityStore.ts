import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ListDensity } from "@/types";

interface DensityStore {
  density: ListDensity;
  setDensity: (d: ListDensity) => void;
}

export const useListDensityStore = create<DensityStore>()(
  persist(
    (set) => ({
      density: "standard",
      setDensity: (density) => set({ density }),
    }),
    {
      name: "right-stuff-editor-dash-density",
      partialize: (s) => ({ density: s.density }),
    },
  ),
);

export default useListDensityStore;
