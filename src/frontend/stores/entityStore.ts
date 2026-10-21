import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EntityType = "person" | "project" | "term" | "place" | "other";

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  notes: string;
}

interface EntityStore {
  entities: Entity[];
  addEntity: (name: string, type: EntityType, notes: string) => void;
  updateEntity: (id: string, updates: Partial<Omit<Entity, "id">>) => void;
  deleteEntity: (id: string) => void;
}

const generateId = (): string =>
  `entity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useEntityStore = create<EntityStore>()(
  persist(
    (set) => ({
      entities: [],
      addEntity: (name, type, notes) => {
        const id = generateId();
        set((state) => ({
          entities: [...state.entities, { id, name, type, notes }],
        }));
      },
      updateEntity: (id, updates) => {
        set((state) => ({
          entities: state.entities.map((e) =>
            e.id === id ? { ...e, ...updates } : e,
          ),
        }));
      },
      deleteEntity: (id) => {
        set((state) => ({
          entities: state.entities.filter((e) => e.id !== id),
        }));
      },
    }),
    { name: "right-stuff-editor-dash-entities" },
  ),
);

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  person: "人物",
  project: "プロジェクト",
  term: "用語",
  place: "場所",
  other: "その他",
};

export const buildEntityContext = (): string => {
  const { entities } = useEntityStore.getState();
  if (entities.length === 0) return "";
  const lines = entities.map((e) => {
    const typeLabel = ENTITY_TYPE_LABELS[e.type];
    const notes = e.notes.trim();
    return notes ? `- ${e.name}（${typeLabel}）: ${notes}` : `- ${e.name}（${typeLabel}）`;
  });
  return `ユーザーが扱っている固有名詞・エンティティ一覧です。回答ではこれらの名前・表記を一貫して使用してください。\n${lines.join("\n")}`;
};
