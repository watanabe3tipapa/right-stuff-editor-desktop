// 環境・機能の検出を一元管理するモジュール。
// 各コンポーネントが個別に isElectron() を定義していたのを整理し、
// 「Web版で機能しないものは表示しない」方針の判定をここに集約する。

export const isElectron = (): boolean =>
  typeof window !== "undefined" && !!window.electronAPI?.isElectron;

export const isWeb = (): boolean => !isElectron();

// File System Access API（Chrome / Edge 系）。
// Firefox / Safari では showOpenFilePicker / showSaveFilePicker が無く、
// ダウンロード型の保存にフォールバックする。
export const supportsFileSystemAccess = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.showOpenFilePicker === "function" &&
  typeof window.showSaveFilePicker === "function";

// Agent Skill Manager は Electron のランタイム（agent-skill-manager バイナリ）が必要。
export const supportsAsm = (): boolean => isElectron();

// mdv連携は Electron メインプロセス経由でローカルの mdv サーバを起動する。
export const supportsMdv = (): boolean =>
  typeof window !== "undefined" && !!window.electronAPI?.launchMdv;

// 実（PTY）ターミナルは Electron の node-pty が必要。ブラウザではモックにフォールバック。
export const supportsRealTerminal = (): boolean => isElectron();

// Apple Foundation Models はローカルサーバ（127.0.0.1:8765）が必須。
// Electron はアプリ内起動、ブラウザは `npm run applefm` で手動起動する必要がある。
export const APPLEFM_SERVER_REQUIRED = true;
