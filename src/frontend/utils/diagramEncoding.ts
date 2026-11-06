export const DEFAULT_PLANTUML_SERVER = "https://www.plantuml.com/plantuml";

/** PlantUML サーバーが受け付ける 16 進エンコード（~h 形式）を作る。 */
export function encodePlantUmlHex(source: string): string {
  const bytes = new TextEncoder().encode(source);
  let encoded = "";
  for (const byte of bytes) {
    encoded += byte.toString(16).padStart(2, "0");
  }
  return encoded;
}

export function normalizePlantUmlServer(server: string): string {
  const trimmed = server.trim();
  if (!trimmed) return DEFAULT_PLANTUML_SERVER;
  return trimmed.replace(/\/+$/, "");
}

/** PlantUML の SVG URL を組み立てる。 */
export function buildPlantUmlUrl(
  server: string,
  source: string,
  format: "svg" | "png" = "svg",
): string {
  return `${normalizePlantUmlServer(server)}/${format}/~h${encodePlantUmlHex(source)}`;
}

export function isPlantUmlLanguage(language: string): boolean {
  const normalized = language.toLowerCase();
  return normalized === "plantuml" || normalized === "puml";
}
