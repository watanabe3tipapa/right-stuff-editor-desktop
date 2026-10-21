import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WritingStyleProfile {
  id: string;
  name: string;
  systemPrompt: string;
}

interface StyleStore {
  profiles: WritingStyleProfile[];
  activeProfileId: string | null;
  addProfile: (name: string, systemPrompt: string) => void;
  updateProfile: (id: string, updates: Partial<Omit<WritingStyleProfile, "id">>) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;
}

const generateId = (): string =>
  `style_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useStyleStore = create<StyleStore>()(
  persist(
    (set) => ({
      profiles: [],
      activeProfileId: null,
      addProfile: (name, systemPrompt) => {
        const id = generateId();
        set((state) => ({
          profiles: [...state.profiles, { id, name, systemPrompt }],
          activeProfileId: id,
        }));
      },
      updateProfile: (id, updates) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        }));
      },
      deleteProfile: (id) => {
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
          activeProfileId:
            state.activeProfileId === id ? null : state.activeProfileId,
        }));
      },
      setActiveProfile: (id) => {
        set({ activeProfileId: id });
      },
    }),
    { name: "right-stuff-editor-dash-style" },
  ),
);

export const getActiveProfile = (): WritingStyleProfile | null => {
  const { profiles, activeProfileId } = useStyleStore.getState();
  if (!activeProfileId) return null;
  return profiles.find((p) => p.id === activeProfileId) ?? null;
};
