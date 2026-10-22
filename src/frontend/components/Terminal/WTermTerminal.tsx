import React, { useCallback, useEffect, useRef, useState } from "react";
import { Terminal, type TerminalHandle } from "@wterm/react";
import TerminalMock from "./Terminal";
import { getActiveFileInfo } from "@/utils/fileOperations";
import { desktop } from "@/utils/desktop";
import { isDesktop as isDesktopEnvironment } from "@/utils/capabilities";

interface WTermTerminalProps {
  isOpen: boolean;
  onClose: () => void;
}



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
  const [cwd, setCwd] = useState<string | null>(null);
  const [size, setSize] = useState({ cols: 80, rows: 24 });

  const isDesktop = isDesktopEnvironment();

  // wterm の初期化は非同期なので、準備完了前の出力はバッファしておく
  const readyRef = useRef(false);
  const pendingRef = useRef<string[]>([]);
  const statusRef = useRef(status);
  const sizeRef = useRef(size);
  const runIdRef = useRef(0);
  const scrolledUpRef = useRef(false);
  const scrollCleanupRef = useRef<(() => void) | null>(null);
  statusRef.current = status;
  sizeRef.current = size;

  const write = useCallback((data: string) => {
    if (!readyRef.current) {
      pendingRef.current.push(data);
      return;
    }
    const element = termRef.current?.instance?.element;
    const stickToBottom = !scrolledUpRef.current;
    termRef.current?.write(data);
    if (element && stickToBottom) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          element.scrollTop = element.scrollHeight;
        });
      });
    }
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

  const startSession = useCallback(async () => {
    const runId = ++runIdRef.current;
    setStatus("starting");
    setError(null);
    setCwd(null);
    setShellName(null);
    termRef.current?.write("\x1b[2J\x1b[3J\x1b[H");

    try {
      const result = await desktop.terminalStart(sizeRef.current.cols, sizeRef.current.rows, resolveCwd());
      if (runId !== runIdRef.current) return;
      if (!result.success) {
        setStatus("error");
        setError(result.error ?? "シェルを起動できませんでした。");
        return;
      }
      setShellName(result.shell ?? null);
      setCwd(result.cwd ?? null);
      setStatus("running");
    } catch (err) {
      if (runId !== runIdRef.current) return;
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // PTY の起動と出力の購読。パネルが開いている間だけシェルを起動したままにする。
  useEffect(() => {
    if (!isOpen || !isDesktop) return;

    const unsubscribes: Array<() => void> = [];

    // 出力の購読を先に登録してから起動し、初期プロンプトの取りこぼしを防ぐ
    unsubscribes.push(desktop.onTerminalData(write));
    unsubscribes.push(
      desktop.onTerminalExit((exitCode) => {
        write(`\r\n[process exited with code ${exitCode}]\r\n`);
        setStatus("idle");
      }),
    );

    void startSession();

    return () => {
      runIdRef.current++;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      void desktop.terminalStop();
    };
  }, [isOpen, isDesktop, write, startSession]);

  // サイズ変化を PTY へ通知する
  useEffect(() => {
    if (!isOpen || !isDesktop || status !== "running") return;
    void desktop.terminalResize(size.cols, size.rows);
  }, [size.cols, size.rows, isOpen, isDesktop, status]);

  useEffect(() => {
    if (!isOpen || status !== "running") return;
    termRef.current?.focus();
  }, [isOpen, status]);

  const send = useCallback((data: string) => {
    if (statusRef.current !== "running") return;
    void desktop.terminalWrite(data).catch((err) => {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    });
  }, []);

  const clear = useCallback(() => {
    termRef.current?.write("\x1b[2J\x1b[3J\x1b[H");
    if (statusRef.current === "running") {
      void desktop.terminalWrite("\x0c").catch(() => undefined);
    }
  }, []);

  const restart = useCallback(() => {
    void startSession();
  }, [startSession]);

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
        {cwd && (
          <span className="max-w-[40%] truncate text-gray-500" title={cwd}>
            {cwd.split("/").filter(Boolean).slice(-2).join("/")}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={clear}
            disabled={status !== "running"}
            className="rounded px-2 py-1 text-gray-400 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-40"
          >
            クリア
          </button>
          <button
            type="button"
            onClick={restart}
            disabled={status === "starting"}
            className="rounded px-2 py-1 text-gray-400 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-40"
          >
            再起動
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="ターミナルを閉じる"
            className="rounded px-2 py-1 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-2">
        <Terminal
          ref={termRef}
          wasmUrl={`${import.meta.env.BASE_URL}wterm.wasm`}
          autoResize
          cursorBlink
          theme="dark"
          style={{ height: "100%", width: "100%" }}
          onData={send}
          onResize={(cols, rows) => {
            setSize({ cols, rows });
          }}
          onReady={() => {
            readyRef.current = true;
            const buffered = pendingRef.current;
            pendingRef.current = [];
            const element = termRef.current?.instance?.element;
            if (element) {
              scrollCleanupRef.current?.();
              const onScroll = () => {
                scrolledUpRef.current = element.scrollHeight - element.scrollTop - element.clientHeight >= 30;
              };
              element.addEventListener("scroll", onScroll, { passive: true });
              scrollCleanupRef.current = () => element.removeEventListener("scroll", onScroll);
            }
            buffered.forEach((chunk) => write(chunk));
            if (element) element.scrollTop = element.scrollHeight;
            termRef.current?.focus();
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
