export interface FileInfo {
  name: string;
  path?: string;
  content: string;
}

export interface SaveResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface OpenResult {
  success: boolean;
  file?: FileInfo;
  error?: string;
}

export interface AppleFMProcessResult {
  success: boolean;
  running?: boolean;
  pid?: number;
  port?: number;
  error?: string;
}

export interface PtyStartResult {
  success: boolean;
  shell?: string;
  cwd?: string;
  error?: string;
}

import { markdownToHtml } from "./markdown";

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      openFile: () => Promise<OpenResult>;
      saveFile: (content: string, defaultName: string) => Promise<SaveResult>;
      exportHtml: (htmlContent: string, defaultName: string) => Promise<SaveResult>;
      openExternal: (url: string) => Promise<void>;
      exec?: (command: string) => Promise<{ stdout: string; stderr: string }>;
      openTerminal?: () => Promise<void>;
      launchMdv?: (targetPath: string) => Promise<{ success: boolean; url?: string; port?: number; error?: string }>;
      closeMdv?: () => Promise<{ success: boolean }>;
      startAppleFM?: (port?: number) => Promise<AppleFMProcessResult>;
      stopAppleFM?: () => Promise<{ success: boolean }>;
      startPty?: (cols: number, rows: number, cwd?: string) => Promise<PtyStartResult>;
      writePty?: (data: string) => Promise<{ success: boolean; error?: string }>;
      resizePty?: (cols: number, rows: number) => Promise<{ success: boolean }>;
      stopPty?: () => Promise<{ success: boolean }>;
      onPtyData?: (callback: (data: string) => void) => () => void;
      onPtyExit?: (callback: (exitCode: number) => void) => () => void;
    };
    showOpenFilePicker?: (options?: {
      multiple?: boolean;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<unknown[]>;
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<unknown>;
  }
}

interface FileSystemFileHandle {
  name?: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
  queryPermission?: (opts?: { mode: string }) => Promise<"granted" | "denied" | "prompt">;
  requestPermission?: (opts?: { mode: string }) => Promise<"granted" | "denied" | "prompt">;
  isSameEntry?: (other: FileSystemFileHandle) => Promise<boolean>;
}

let activeFileHandle: FileSystemFileHandle | null = null;
let activeFileName: string | null = null;
let activeFilePath: string | null = null;

export const getActiveFileInfo = (): { name: string | null; path: string | null; hasHandle: boolean } => ({
  name: activeFileName,
  path: activeFilePath,
  hasHandle: !!activeFileHandle,
});

export const setActiveFileHandle = (
  handle: FileSystemFileHandle | null,
  name: string | null,
  filePath?: string | null,
) => {
  activeFileHandle = handle;
  activeFileName = name;
  activeFilePath = filePath ?? activeFilePath;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("local-file-changed", { detail: { name, hasHandle: !!handle } }));
  }
};

export const clearActiveFileHandle = () => {
  activeFileHandle = null;
  activeFileName = null;
};

export const hasActiveFile = (): boolean => !!activeFileHandle;

export const saveToActiveFile = async (content: string): Promise<SaveResult> => {
  if (!activeFileHandle) {
    return { success: false, error: "No active file" };
  }

  if (window.electronAPI) {
    return window.electronAPI.saveFile(content, activeFileName ?? "document.md");
  }

  try {
    if (activeFileHandle.createWritable) {
      const writable = await activeFileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return {
        success: true,
        filePath: activeFileName ?? undefined,
      };
    }
    return { success: false, error: "file handle not writable" };
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return { success: false, error: "Cancelled" };
    }
    return { success: false, error: (error as Error).message };
  }
};

export const openFile = async (): Promise<OpenResult> => {
  if (window.electronAPI) {
    const result = await window.electronAPI.openFile();
    if (result.success && result.file) {
      setActiveFileHandle(null, result.file.name, result.file.path);
    }
    return result;
  }

  try {
    if (window.showOpenFilePicker) {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: "Markdown files",
            accept: {
              "text/markdown": [".md", ".markdown"],
              "text/plain": [".txt"],
            },
          },
        ],
      }) as FileSystemFileHandle[];
      const file = await fileHandle.getFile();
      const content = await file.text();
      setActiveFileHandle(fileHandle, file.name);
      return {
        success: true,
        file: {
          name: file.name,
          content,
        },
      };
    } else {
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".md,.markdown,.txt,text/markdown,text/plain";
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            resolve({ success: false, error: "No file selected" });
            return;
          }
          const content = await file.text();
          setActiveFileHandle(null, file.name);
          resolve({
            success: true,
            file: {
              name: file.name,
              content,
            },
          });
        };
        input.click();
      });
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return { success: false, error: "Cancelled" };
    }
    return { success: false, error: (error as Error).message };
  }
};

export const saveFile = async (
  content: string,
  suggestedName: string = "document.md",
): Promise<SaveResult> => {
  if (window.electronAPI) {
    const result = await window.electronAPI.saveFile(content, suggestedName);
    if (result.success && result.filePath) {
      setActiveFileHandle(null, suggestedName, result.filePath);
    }
    return result;
  }

  try {
    if (window.showSaveFilePicker) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "Markdown files",
            accept: { "text/markdown": [".md"] },
          },
          {
            description: "HTML files",
            accept: { "text/html": [".html"] },
          },
        ],
      }) as FileSystemFileHandle;
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      setActiveFileHandle(fileHandle, suggestedName);
      return { success: true, filePath: suggestedName };
    } else {
      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedName;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true, filePath: suggestedName };
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return { success: false, error: "Cancelled" };
    }
    return { success: false, error: (error as Error).message };
  }
};

export const exportAsHtml = async (
  htmlContent: string,
  suggestedName: string = "document.html",
): Promise<SaveResult> => {
  if (window.electronAPI) {
    return window.electronAPI.exportHtml(htmlContent, suggestedName);
  }

  try {
    if (window.showSaveFilePicker) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "HTML files",
            accept: { "text/html": [".html"] },
          },
        ],
      }) as FileSystemFileHandle;
      const writable = await fileHandle.createWritable();
      await writable.write(htmlContent);
      await writable.close();
      return { success: true, filePath: suggestedName };
    } else {
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedName;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true, filePath: suggestedName };
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return { success: false, error: "Cancelled" };
    }
    return { success: false, error: (error as Error).message };
  }
};

export const exportAsPdf = async (
  htmlContent: string,
  suggestedName: string = "document.pdf",
): Promise<SaveResult> => {
  try {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      return { success: false, error: "Could not open print window" };
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${suggestedName}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
    
    return { success: true, filePath: suggestedName };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

export const exportAsJson = async (
  content: string,
  suggestedName: string = "document.json",
): Promise<SaveResult> => {
  const jsonContent = JSON.stringify({ content, exportedAt: new Date().toISOString() }, null, 2);
  
  try {
    if (window.showSaveFilePicker) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "JSON files",
            accept: { "application/json": [".json"] },
          },
        ],
      }) as FileSystemFileHandle;
      const writable = await fileHandle.createWritable();
      await writable.write(jsonContent);
      await writable.close();
      return { success: true, filePath: suggestedName };
    } else {
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedName;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true, filePath: suggestedName };
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return { success: false, error: "Cancelled" };
    }
    return { success: false, error: (error as Error).message };
  }
};

export const exportAsTxt = async (
  content: string,
  suggestedName: string = "document",
): Promise<SaveResult> => {
  try {
    if (window.showSaveFilePicker) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "Text files",
            accept: { "text/plain": [".txt"] },
          },
          {
            description: "All files",
            accept: { "*/*": [] },
          },
        ],
      }) as FileSystemFileHandle;
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return { success: true, filePath: suggestedName };
    } else {
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedName;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true, filePath: suggestedName };
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return { success: false, error: "Cancelled" };
    }
    return { success: false, error: (error as Error).message };
  }
};

export const exportAsDocx = async (
  content: string,
  suggestedName: string = "document.docx",
): Promise<SaveResult> => {
  try {
    const htmlContent = await markdownToHtml(content);
    const docxContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${suggestedName}</title>
<style>
body { font-family: 'Times New Roman', serif; font-size: 12pt; }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    
    const blob = new Blob([docxContent], { type: "application/vnd.ms-word" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true, filePath: suggestedName };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

export const exportAsModelfile = async (
  _content: string,
  suggestedName: string = "Modelfile",
): Promise<SaveResult> => {
  const modelfileContent = `# Modelfile generated by Right-Stuff Editor Dash
# Created: ${new Date().toISOString()}

# ベースモデル
FROM gemma4:e4b

# 実行パラメータ（一貫性と保守性を優先）
PARAMETER temperature 0.15
PARAMETER seed 2026
PARAMETER num_ctx 8192
PARAMETER repeat_penalty 1.25
PARAMETER top_k 20
PARAMETER top_p 0.4
PARAMETER repeat_last_n 256
PARAMETER stop "<|eot_id|>"

# システムメッセージ（厳格な編集者の振る舞い）
SYSTEM """あなたは厳格な編集者です。常に以下を守って編集・校正を行ってください：
- 正確性：事実や用語は検証可能な形で提示し、出典がない場合は『要出典』と明記する。
- 明瞭性：文章を簡潔にし、不要な語や曖昧さを排除する。冗長な文は一文で要約して示す。
- 一貫性：用語、時制、声（能動/受動）は文書全体で統一する。差分があれば一覧で示す。
- スタイル：指定されたスタイルガイド（例: APA, Chicago, 独自スタイル）があればそれに準拠し、主要なスタイル違反を指摘・修正する。
- 事前条件の明示：変更が機能的に影響する場合（API署名、インターフェース、スキーマ等）、互換性への影響を必ず評価する。
- 具体的修正：原文の問題点を示した上で、（1）短く改善案、（2）完全な修正文の両方を提示する。
- 重要度評価：各指摘に対し、優先度（Critical / High / Medium / Low）を付ける。
- 変更ログ：提案した全変更を簡潔な差分（前→後）で出力する。"""

# テンプレート（会話形式）
TEMPLATE """{{ if .System }}<|start_header_id|>system<|end_header_id|>

{{ .System }}<|eot_id|>{{ end }}{{ if .Prompt }}<|start_header_id|>user<|end_header_id|>

{{ .Prompt }}<|eot_id|>{{ end }}<|start_header_id|>assistant<|end_header_id|>

{{ .Response }}<|eot_id|>"""

# 例示メッセージ（編集タスクの模範）
MESSAGE user 次のテキストを編集してください：「この関数は多くの処理を行うため、時折失敗する可能性があり、より適切なエラー処理が必要です。」
MESSAGE assistant 指摘：1) スペルミス 『alot』→『a lot』（High）；2) 曖昧な表現 『might fails sometimes』→ 『may fail intermittently』（Medium）；3) 要求されるエラー処理の具体性が欠如している（Critical）。
MESSAGE assistant 修正文（短）： 「This function performs significant work and may fail intermittently; implement explicit error handling and retries.」
MESSAGE assistant 修正文（完全）： "This function performs substantial processing and may fail intermittently. エラーを分類した構造化されたエラー処理、最大3回までの指数関数的バックオフによる再試行、および失敗事例の集中ログ記録を追加してください。」
MESSAGE assistant 変更ログ: 「1) 『alot』 → 『a lot』; 2) 『does alot of work』 → 『performs substantial processing』; 3) 『might fails sometimes and needs better error handling』 → 実行可能な手順を含む完全な段落。」

# ライセンス
LICENSE """
CC BY-NC-SA 4.0
"""

# 必要最小バージョン
REQUIRES 0.20.0
`;

  try {
    if (window.showSaveFilePicker) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "Ollama Modelfile",
            accept: { "text/plain": [".txt", ""] },
          },
          {
            description: "All files",
            accept: { "*/*": [] },
          },
        ],
      }) as FileSystemFileHandle;
      const writable = await fileHandle.createWritable();
      await writable.write(modelfileContent);
      await writable.close();
      return { success: true, filePath: suggestedName };
    } else {
      const blob = new Blob([modelfileContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedName;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true, filePath: suggestedName };
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return { success: false, error: "Cancelled" };
    }
    return { success: false, error: (error as Error).message };
  }
};