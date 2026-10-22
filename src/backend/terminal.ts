const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PTY_BRIDGE = String.raw`
import glob, os, pty, select, struct, fcntl, termios, signal, sys

shell = os.environ.get("SHELL", "/bin/zsh")
size_file = os.environ.get("PTY_SIZE_FILE", "")
input_glob = os.environ.get("PTY_INPUT_GLOB", "")

def apply_size():
    if not size_file:
        return
    try:
        with open(size_file) as fh:
            cols, rows = (int(part) for part in fh.read().split()[:2])
        fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
    except Exception:
        pass

pid, fd = pty.fork()
if pid == 0:
    os.environ.setdefault("TERM", "xterm-256color")
    os.execvp(shell, [shell, "-i"])

apply_size()
last_size = os.stat(size_file).st_mtime_ns if size_file else 0

while True:
    try:
        readable, _, _ = select.select([fd], [], [], 0.05)
    except InterruptedError:
        continue
    if size_file:
        try:
            mtime = os.stat(size_file).st_mtime_ns
            if mtime != last_size:
                last_size = mtime
                apply_size()
        except OSError:
            pass
    if input_glob:
        for path in sorted(glob.glob(input_glob)):
            try:
                with open(path, "rb") as fh:
                    pending = fh.read()
                if pending:
                    os.write(fd, pending)
                os.unlink(path)
            except OSError:
                pass
    if fd in readable:
        try:
            data = os.read(fd, 65536)
        except OSError:
            break
        if not data:
            break
        os.write(1, data)

try:
    os.waitpid(pid, 0)
except Exception:
    pass
`;

interface TerminalSession {
  process: {
    pid: number;
    stdin: { getWriter(): { write(chunk: Uint8Array): Promise<void>; close(): Promise<void> } };
    stdout: { getReader(): { read(): Promise<{ value?: Uint8Array; done: boolean }> } };
    stderr: { getReader(): { read(): Promise<{ value?: Uint8Array; done: boolean }> } };
    kill(signal?: string): void;
    wait(): Promise<{ exit_status: number }>;
  };
  app: TinyApp;
  closed: boolean;
  cols: number;
  rows: number;
  sizeFile: string;
  inputPrefix: string;
  inputSeq: number;
  writeChain: Promise<void>;
}

let session: TerminalSession | null = null;
let generation = 0;

const streamToApp = async (
  stream: { getReader(): { read(): Promise<{ value?: Uint8Array; done: boolean }> } },
  app: TinyApp,
  child: TerminalSession["process"],
  onFirstData?: () => void,
) => {
  const reader = stream.getReader();
  let first = true;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    if (session?.process !== child) break;
    if (first) {
      first = false;
      onFirstData?.();
    }
    app.push("terminal:data", decoder.decode(value, { stream: true }));
  }
};

const writeSizeFile = async (sizeFile: string, cols: number, rows: number) => {
  await tjs.writeFile(sizeFile, encoder.encode(`${cols} ${rows}`));
};

const cleanupInputs = async (inputPrefix: string) => {
  const slash = inputPrefix.lastIndexOf("/");
  const dir = inputPrefix.slice(0, slash);
  const base = inputPrefix.slice(slash + 1);
  try {
    for await (const entry of await tjs.readDir(dir)) {
      const name = typeof entry === "string" ? entry : entry.name;
      if (!name.startsWith(base)) continue;
      await tjs.remove(`${dir}/${name}`).catch(() => undefined);
    }
  } catch {
    // tmp dir may already be gone
  }
};

export async function startTerminal(
  app: TinyApp,
  options: { cols?: number; rows?: number; cwd?: string | null },
): Promise<{ shell: string; cwd: string }> {
  const token = ++generation;
  await stopSession().catch(() => undefined);
  if (token !== generation) throw new Error("ターミナル起動はキャンセルされました");

  if (!app.system.isMacOS()) {
    throw new Error("アプリ内ターミナルは現在 macOS のみ対応しています");
  }
  if (!(await tjs.stat("/usr/bin/python3").then(() => true).catch(() => false))) {
    throw new Error("アプリ内ターミナルには /usr/bin/python3 が必要です");
  }
  if (token !== generation) throw new Error("ターミナル起動はキャンセルされました");

  const shell = tjs.env.SHELL || "/bin/zsh";
  const cwd = options.cwd || tjs.cwd;
  const cols = options.cols ?? 80;
  const rows = options.rows ?? 24;
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const sizeFile = `${tjs.tmpDir}/right-stuff-term-${stamp}.size`;
  const inputPrefix = `${tjs.tmpDir}/right-stuff-term-${stamp}.in`;

  await writeSizeFile(sizeFile, cols, rows);

  if (token !== generation) {
    await tjs.remove(sizeFile).catch(() => undefined);
    throw new Error("ターミナル起動はキャンセルされました");
  }

  const child = tjs.spawn(["/usr/bin/python3", "-c", PTY_BRIDGE], {
    cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...tjs.env,
      TERM: "xterm-256color",
      COLUMNS: String(cols),
      LINES: String(rows),
      PTY_SIZE_FILE: sizeFile,
      PTY_INPUT_GLOB: `${inputPrefix}-*.cmd`,
    },
  }) as TerminalSession["process"];

  if (token !== generation) {
    try {
      child.kill("SIGTERM");
    } catch {
      // already gone
    }
    await tjs.remove(sizeFile).catch(() => undefined);
    await cleanupInputs(inputPrefix);
    throw new Error("ターミナル起動はキャンセルされました");
  }

  session = {
    process: child,
    app,
    closed: false,
    cols,
    rows,
    sizeFile,
    inputPrefix,
    inputSeq: 0,
    writeChain: Promise.resolve(),
  };

  let markReady: (() => void) | null = null;
  let quietTimer: ReturnType<typeof setTimeout> | null = null;
  let maxTimer: ReturnType<typeof setTimeout> | null = null;
  const firstOutput = new Promise<void>((resolve) => {
    markReady = resolve;
  });
  const finishReady = () => {
    if (quietTimer) {
      clearTimeout(quietTimer);
      quietTimer = null;
    }
    if (maxTimer) {
      clearTimeout(maxTimer);
      maxTimer = null;
    }
    markReady?.();
    markReady = null;
  };
  const notifyFirstOutput = () => {
    if (!markReady) return;
    if (quietTimer) clearTimeout(quietTimer);
    quietTimer = setTimeout(finishReady, 250);
  };
  maxTimer = setTimeout(finishReady, 5000);

  void streamToApp(child.stdout, app, child, notifyFirstOutput).catch(() => undefined);
  void streamToApp(child.stderr, app, child, notifyFirstOutput).catch(() => undefined);

  void child.wait().then(({ exit_status }) => {
    if (session?.process !== child) return;
    session = null;
    void tjs.remove(sizeFile).catch(() => undefined);
    void cleanupInputs(inputPrefix);
    app.push("terminal:exit", exit_status);
  });

  await firstOutput;
  if (token !== generation) throw new Error("ターミナル起動はキャンセルされました");

  return { shell, cwd };
}

export async function writeTerminal(data: string): Promise<boolean> {
  if (!session) throw new Error("ターミナルは起動していません");
  const current = session;
  const write = current.writeChain.then(async () => {
    if (session !== current) throw new Error("ターミナルは終了しました");
    const seq = String(current.inputSeq++).padStart(8, "0");
    const suffix = `${seq}-${Math.random().toString(36).slice(2)}`;
    const tmpPath = `${current.inputPrefix}-${suffix}.tmp`;
    const chunkPath = `${current.inputPrefix}-${suffix}.cmd`;
    await tjs.writeFile(tmpPath, encoder.encode(data));
    await tjs.rename(tmpPath, chunkPath);
  });
  current.writeChain = write.catch(() => undefined);
  try {
    await write;
  } catch (error) {
    throw new Error(`write failed: ${String(error)}`);
  }
  return true;
}

export async function resizeTerminal(cols: number, rows: number): Promise<boolean> {
  const current = session;
  if (!current) return true;
  current.cols = cols;
  current.rows = rows;
  await writeSizeFile(current.sizeFile, cols, rows);
  return true;
}

const stopSession = async (): Promise<boolean> => {
  const current = session;
  session = null;
  if (!current || current.closed) return true;
  current.closed = true;
  try {
    current.process.kill("SIGTERM");
  } catch {
    // already gone
  }
  await tjs.remove(current.sizeFile).catch(() => undefined);
  await cleanupInputs(current.inputPrefix);
  return true;
};

export async function stopTerminal(): Promise<boolean> {
  generation++;
  return stopSession();
}
