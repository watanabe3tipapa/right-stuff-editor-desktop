import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DocumentFilter, ListDensity } from "@/types";

interface FilterState {
  filter: DocumentFilter;
  density: ListDensity;
  setFilter: (f: DocumentFilter) => void;
  setDensity: (d: ListDensity) => void;
}

export const useDocumentFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      filter: "all",
      density: "standard",
      setFilter: (filter) => set({ filter }),
      setDensity: (density) => set({ density }),
    }),
    {
      name: "right-stuff-editor-dash-filter",
    },
  ),
);

export default useDocumentFilterStore;
