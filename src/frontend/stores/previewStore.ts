import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PLANTUML_SERVER } from "@/utils/diagramEncoding";

export const MIN_PREVIEW_ZOOM = 0.5;
export const MAX_PREVIEW_ZOOM = 2;
export const PREVIEW_ZOOM_STEP = 0.1;

const clampZoom = (zoom: number) =>
  Math.min(MAX_PREVIEW_ZOOM, Math.max(MIN_PREVIEW_ZOOM, Math.round(zoom * 100) / 100));

interface PreviewStore {
  zoom: number;
  plantUmlEnabled: boolean;
  plantUmlServer: string;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setPlantUmlEnabled: (enabled: boolean) => void;
  setPlantUmlServer: (server: string) => void;
}

export const usePreviewStore = create<PreviewStore>()(
  persist(
    (set) => ({
      zoom: 1,
      plantUmlEnabled: true,
      plantUmlServer: DEFAULT_PLANTUML_SERVER,

      setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

      zoomIn: () => set((state) => ({ zoom: clampZoom(state.zoom + PREVIEW_ZOOM_STEP) })),

      zoomOut: () => set((state) => ({ zoom: clampZoom(state.zoom - PREVIEW_ZOOM_STEP) })),

      resetZoom: () => set({ zoom: 1 }),

      setPlantUmlEnabled: (enabled) => set({ plantUmlEnabled: enabled }),

      setPlantUmlServer: (server) =>
        set({ plantUmlServer: server.trim() || DEFAULT_PLANTUML_SERVER }),
    }),
    {
      name: "right-stuff-editor-dash-preview",
      partialize: (state) => ({
        zoom: state.zoom,
        plantUmlEnabled: state.plantUmlEnabled,
        plantUmlServer: state.plantUmlServer,
      }),
    },
  ),
);

export default usePreviewStore;
