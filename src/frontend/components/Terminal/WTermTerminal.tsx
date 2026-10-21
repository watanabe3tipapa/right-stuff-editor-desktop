import React, { useCallback, useEffect, useRef, useState } from "react";
import { Terminal, type TerminalHandle } from "@wterm/react";
import TerminalMock from "./Terminal";
import { getActiveFileInfo } from "@/utils/fileOperations";

interface WTermTerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

const isElectron = (): boolean => {
  return typeof window !== "undefined" && !!window.electronAPI?.isElectron;
};

/** 編集中のファイルがあるならそのディレクトリを、なければ undefined を返す。 */
const resolveCwd = (): string | undefined => {
  const { path } = getActiveFileInfo();
  if (!path) return undefined;
  const idx = path.lastIndexOf("/");
  return idx > 0 ? path.slice(0, idx) : undefined;
};

/**
 * アプリ内ターミナル。
 * - Electron版: node-pty で OS シェルを起動し、wterm（WASM 製 xterm 系）で描画する
 * - ブラウザ版: PTY を持てないため従来のモックターミナルにフォールバックする
 */
export const WTermTerminal: React.FC<WTermTerminalProps> = ({ isOpen, onClose }) => {
  const termRef = useRef<TerminalHandle>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "running" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [shellName, setShellName] = useState<string | null>(null);
  const [size, setSize] = useState({ cols: 80, rows: 24 });

  const isDesktop = isElectron();

  // wterm の初期化は非同期なので、準備完了前の出力はバッファしておく
  const readyRef = useRef(false);
  const pendingRef = useRef<string[]>([]);

  const write = useCallback((data: string) => {
    if (readyRef.current) {
      termRef.current?.write(data);
      return;
    }
    pendingRef.current.push(data);
  }, []);

  // React 18 では @wterm/react の callback ref の cleanup が呼ばれないため、破棄は自前で行う
  useEffect(() => {
    if (isOpen) return;
    readyRef.current = false;
    pendingRef.current = [];
    try {
      termRef.current?.instance?.destroy();
    } catch {
      // 破棄済みなら無視
    }
  }, [isOpen]);

  // PTY の起動と出力の購読。パネルが開いている間だけシェルを起動したままにする。
  useEffect(() => {
    if (!isOpen || !isDesktop) return;

    const api = window.electronAPI;
    if (!api?.startPty) {
      setStatus("error");
      setError("この環境ではアプリ内ターミナルを利用できません。");
      return;
    }

    let disposed = false;
    const unsubscribes: Array<() => void> = [];

    setStatus("starting");
    setError(null);

    // 出力の購読を先に登録してから起動し、初期プロンプトの取りこぼしを防ぐ
    if (api.onPtyData) {
      unsubscribes.push(api.onPtyData(write));
    }
    if (api.onPtyExit) {
      unsubscribes.push(
        api.onPtyExit((exitCode) => {
          write(`\r\n[process exited with code ${exitCode}]\r\n`);
          setStatus("idle");
        }),
      );
    }

    void api
      .startPty(size.cols, size.rows, resolveCwd())
      .then((result) => {
        if (disposed) return;
        if (!result.success) {
          setStatus("error");
          setError(result.error ?? "シェルを起動できませんでした。");
          return;
        }
        setShellName(result.shell ?? null);
        setStatus("running");
      })
      .catch((err) => {
        if (disposed) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      disposed = true;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      void api.stopPty?.();
    };
    // size は起動時のみ参照し、リサイズでは再起動しない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isDesktop, write]);

  // サイズ変化を PTY へ通知する
  useEffect(() => {
    if (!isOpen || !isDesktop || status !== "running") return;
    void window.electronAPI?.resizePty?.(size.cols, size.rows);
  }, [size.cols, size.rows, isOpen, isDesktop, status]);

  if (!isOpen) return null;

  // ブラウザ版はPTYが無いので既存のモック実装を使う
  if (!isDesktop) {
    return <TerminalMock isOpen={isOpen} onClose={onClose} />;
  }

  return (
    <div className="flex h-full flex-col bg-[#0d1117] text-[#c9d1d9]">
      <div className="flex items-center gap-3 border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-xs">
        <span className="text-gray-400">Terminal</span>
        {status === "running" && <span className="text-green-400">● {shellName ?? "shell"}</span>}
        {status === "starting" && <span className="text-gray-500">起動中...</span>}
        {status === "error" && <span className="text-red-400">! {error}</span>}
        {status === "idle" && <span className="text-gray-500">停止中</span>}
        <button
          type="button"
          onClick={onClose}
          aria-label="ターミナルを閉じる"
          className="ml-auto rounded px-2 py-1 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 p-2">
        <Terminal
          ref={termRef}
          wasmUrl="/wterm.wasm"
          autoResize
          cursorBlink
          theme="dark"
          style={{ height: "100%", width: "100%" }}
          onData={(data) => {
            void window.electronAPI?.writePty?.(data);
          }}
          onResize={(cols, rows) => {
            setSize({ cols, rows });
          }}
          onReady={() => {
            readyRef.current = true;
            const buffered = pendingRef.current;
            pendingRef.current = [];
            buffered.forEach((chunk) => termRef.current?.write(chunk));
          }}
          onError={(err) => {
            setStatus("error");
            setError(err instanceof Error ? err.message : String(err));
          }}
        />
      </div>
    </div>
  );
};

export default WTermTerminal;
