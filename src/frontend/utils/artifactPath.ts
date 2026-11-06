/** POSIX 風のパスを正規化する（. と .. を解決し、重複スラッシュを除去）。 */
export function normalizePosixPath(path: string): string {
  const absolute = path.startsWith("/");
  const parts = path.split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      resolved.pop();
      continue;
    }
    resolved.push(part);
  }
  return `${absolute ? "/" : ""}${resolved.join("/")}`;
}

/**
 * Markdown 内で指定された Archify HTML のパスを絶対パスへ解決する。
 * - `/` 始まりは絶対パスとして扱う
 * - `./` `../` は現在の文書からの相対パス
 * - それ以外はワークスペースからの相対パス
 * - ワークスペース外へ出るパスは拒否する
 */
export function resolveArtifactPath(
  input: string,
  workspaceRoot: string | null,
  documentPath: string | null,
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return null;
  if (trimmed.startsWith("/")) return normalizePosixPath(trimmed);
  if (!workspaceRoot) return null;

  const root = normalizePosixPath(workspaceRoot);
  const documentDir = documentPath?.includes("/")
    ? documentPath.slice(0, documentPath.lastIndexOf("/"))
    : "";
  const base = trimmed.startsWith("./") || trimmed.startsWith("../") ? documentDir : "";
  const combined = normalizePosixPath(`${root}/${base ? `${base}/` : ""}${trimmed}`);
  if (combined !== root && !combined.startsWith(`${root}/`)) return null;
  return combined;
}

export function isHtmlSource(value: string): boolean {
  return /^\s*</.test(value);
}
