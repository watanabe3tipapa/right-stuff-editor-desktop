import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface KeyboardShortcut {
  id: string;
  label: string;
  keys: string;
  action: string;
  category: "editor" | "view" | "file" | "ai";
}

export const defaultShortcuts: KeyboardShortcut[] = [
  { id: "save", label: "Save", keys: "Ctrl+S", action: "saveDocument", category: "file" },
  { id: "open", label: "Open File", keys: "Ctrl+O", action: "openFile", category: "file" },
  { id: "togglePreview", label: "Toggle Preview", keys: "Ctrl+Shift+P", action: "togglePreview", category: "view" },
  { id: "toggleSidebar", label: "Toggle Sidebar", keys: "Ctrl+B", action: "toggleSidebar", category: "view" },
  { id: "toggleChat", label: "Toggle AI Chat", keys: "Ctrl+Shift+C", action: "toggleChat", category: "ai" },
  { id: "settings", label: "Open Settings", keys: "Ctrl+,", action: "openSettings", category: "editor" },
  { id: "newDocument", label: "New Document", keys: "Ctrl+N", action: "newDocument", category: "file" },
  { id: "toggleMode", label: "Toggle Editor Mode", keys: "Ctrl+Shift+M", action: "toggleMode", category: "editor" },
  { id: "toggleTerminal", label: "Toggle Terminal", keys: "Ctrl+`", action: "toggleTerminal", category: "view" },
  { id: "toggleAsm", label: "Toggle Agent Skill Manager", keys: "Ctrl+Shift+A", action: "toggleAsm", category: "ai" },
  { id: "toggleHelp", label: "Toggle Help", keys: "Ctrl+/", action: "toggleHelp", category: "editor" },
  { id: "toggleZen", label: "Toggle Zen Mode", keys: "Ctrl+Shift+Z", action: "toggleZen", category: "view" },
  { id: "toggleTypewriter", label: "Toggle Typewriter Mode", keys: "Ctrl+Shift+T", action: "toggleTypewriter", category: "view" },
  { id: "openCommandPalette", label: "Open Command Palette / Search", keys: "Ctrl+K", action: "openCommandPalette", category: "view" },
  { id: "openCommandPaletteSlash", label: "Search (slash)", keys: "/", action: "openCommandPaletteSlash", category: "view" },
];

interface ShortcutStore {
  shortcuts: KeyboardShortcut[];
  customShortcuts: Record<string, string>;
  setShortcut: (id: string, keys: string) => void;
  resetShortcuts: () => void;
  getShortcut: (action: string) => string | undefined;
}

export const useShortcutStore = create<ShortcutStore>()(
  persist(
    (set, get) => ({
      shortcuts: defaultShortcuts,
      customShortcuts: {},

      setShortcut: (id: string, keys: string) => {
        set((state) => ({
          customShortcuts: { ...state.customShortcuts, [id]: keys },
        }));
      },

      resetShortcuts: () => {
        set({ customShortcuts: {} });
      },

      getShortcut: (action: string) => {
        const shortcut = get().shortcuts.find((s) => s.action === action);
        if (!shortcut) return undefined;
        return get().customShortcuts[shortcut.id] || shortcut.keys;
      },
    }),
    {
      name: "right-stuff-editor-dash-shortcuts",
    }
  )
);

export const parseKeyEvent = (e: KeyboardEvent): string => {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.key && !["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
    parts.push(e.key.toUpperCase());
  }
  return parts.join("+");
};

export const matchesShortcut = (e: KeyboardEvent, shortcut: string): boolean => {
  const parts = shortcut.split("+");
  const key = parts[parts.length - 1].toUpperCase();
  const modifiers = parts.slice(0, -1);

  const hasCtrl = (e.ctrlKey || e.metaKey) && modifiers.includes("Ctrl");
  const hasAlt = e.altKey && modifiers.includes("Alt");
  const hasShift = e.shiftKey && modifiers.includes("Shift");

  return (
    e.key.toUpperCase() === key &&
    hasCtrl === modifiers.includes("Ctrl") &&
    hasAlt === modifiers.includes("Alt") &&
    hasShift === modifiers.includes("Shift")
  );
};

export default useShortcutStore;
