import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ASMSkill, ASMViewMode } from "@/types";
import {
  isAsmAvailable,
  searchSkills as asmSearch,
  installSkill as asmInstall,
  listInstalledSkills as asmListInstalled,
  uninstallSkill as asmUninstall,
  fetchCatalog as asmFetchCatalog,
} from "@/utils/asmClient";

interface ASMStore {
  skills: ASMSkill[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  viewMode: ASMViewMode;

  search: (query: string) => Promise<void>;
  listInstalled: () => Promise<void>;
  install: (name: string) => Promise<void>;
  uninstall: (name: string) => Promise<void>;
  fetchCatalog: () => Promise<void>;
  setViewMode: (mode: ASMViewMode) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
}

export const useASMStore = create<ASMStore>()(
  persist(
    (set, get) => ({
      skills: [],
      isLoading: false,
      error: null,
      searchQuery: "",
      viewMode: "catalog",

      search: async (query: string) => {
        if (!isAsmAvailable()) {
          set({ error: "ASM is only available in Electron" });
          return;
        }
        set({ isLoading: true, error: null, searchQuery: query });
        try {
          const skills = await asmSearch(query);
          set({ skills, isLoading: false });
        } catch (err) {
          set({
            error: (err as Error).message,
            isLoading: false,
          });
        }
      },

      listInstalled: async () => {
        if (!isAsmAvailable()) {
          set({ error: "ASM is only available in Electron" });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const installed = await asmListInstalled();
          const updatedSkills = installed.map((s) => ({ ...s, installed: true }));
          set({ skills: updatedSkills, isLoading: false, viewMode: "installed" });
        } catch (err) {
          set({
            error: (err as Error).message,
            isLoading: false,
          });
        }
      },

      install: async (name: string) => {
        if (!isAsmAvailable()) {
          set({ error: "ASM is only available in Electron" });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          await asmInstall(name);
          const { skills } = get();
          set({
            skills: skills.map((s) =>
              s.name === name ? { ...s, installed: true } : s
            ),
            isLoading: false,
          });
        } catch (err) {
          set({
            error: (err as Error).message,
            isLoading: false,
          });
        }
      },

      uninstall: async (name: string) => {
        if (!isAsmAvailable()) {
          set({ error: "ASM is only available in Electron" });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          await asmUninstall(name);
          const { skills } = get();
          set({
            skills: skills.map((s) =>
              s.name === name ? { ...s, installed: false } : s
            ),
            isLoading: false,
          });
        } catch (err) {
          set({
            error: (err as Error).message,
            isLoading: false,
          });
        }
      },

      fetchCatalog: async () => {
        if (!isAsmAvailable()) {
          set({ error: "ASM is only available in Electron" });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const catalog = await asmFetchCatalog();
          set({ skills: catalog, isLoading: false, viewMode: "catalog" });
        } catch (err) {
          set({
            error: (err as Error).message,
            isLoading: false,
          });
        }
      },

      setViewMode: (mode: ASMViewMode) => {
        set({ viewMode: mode });
        if (mode === "installed") {
          get().listInstalled();
        } else {
          get().fetchCatalog();
        }
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "right-stuff-editor-dash-asm-storage",
      partialize: (state) => ({
        viewMode: state.viewMode,
        searchQuery: state.searchQuery,
      }),
    }
  )
);

export default useASMStore;
