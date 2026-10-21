import { create } from "zustand";
import { persist } from "zustand/middleware";
import { gistService } from "@/services/gistService";
import type { GistItem, CreateGistParams, GistUploadResult } from "@/types";

interface GistStore {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  gists: GistItem[];
  loading: boolean;
  error: string | null;
  verifyToken: (token: string) => Promise<boolean>;
  disconnect: () => void;
  loadGists: () => Promise<void>;
  uploadGist: (params: CreateGistParams, existingGistId?: string) => Promise<GistUploadResult>;
}

export const useGistStore = create<GistStore>()(
  persist(
    (set, get) => ({
      token: null,
      username: null,
      isAuthenticated: false,
      gists: [],
      loading: false,
      error: null,

      verifyToken: async (token: string) => {
        set({ loading: true, error: null });
        try {
          const user = await gistService.verifyToken(token);
          set({
            token,
            username: user.login,
            isAuthenticated: true,
            loading: false,
          });
          return true;
        } catch {
          set({
            token: null,
            username: null,
            isAuthenticated: false,
            loading: false,
            error: "トークンの検証に失敗しました。",
          });
          return false;
        }
      },

      disconnect: () => {
        set({
          token: null,
          username: null,
          isAuthenticated: false,
          gists: [],
          error: null,
        });
      },

      loadGists: async () => {
        const { token } = get();
        if (!token) return;
        set({ loading: true, error: null });
        try {
          gistService.setToken(token);
          const data = await gistService.listGists();
          const gists: GistItem[] = data.map((g: Record<string, unknown>) => ({
            id: g.id as string,
            description: (g.description as string) || "(no description)",
            htmlUrl: g.html_url as string,
            isPublic: g.public as boolean,
            createdAt: g.created_at as string,
            updatedAt: g.updated_at as string,
            files: Object.values(g.files as Record<string, Record<string, unknown>>).map(
              (f) => ({
                filename: f.filename as string,
                language: f.language as string | null,
                rawUrl: f.raw_url as string,
              })
            ),
          }));
          set({ gists, loading: false });
        } catch {
          set({ loading: false, error: "Gist の読み込みに失敗しました。" });
        }
      },

      uploadGist: async (params: CreateGistParams, existingGistId?: string) => {
        const { token } = get();
        if (!token) throw new Error("認証が必要です。");
        gistService.setToken(token);
        const result = existingGistId
          ? await gistService.updateGist(existingGistId, params)
          : await gistService.createGist(params);
        return {
          gistId: result.id,
          htmlUrl: result.html_url,
          isNew: !existingGistId,
        };
      },
    }),
    {
      name: "right-stuff-editor-dash-gist",
      partialize: (state) => ({
        token: state.token,
        username: state.username,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
