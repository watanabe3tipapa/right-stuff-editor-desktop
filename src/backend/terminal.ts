const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PTY_BRIDGE = String.raw`
import os, pty, select, struct, fcntl, termios, signal, sys

shell = os.environ.get("SHELL", "/bin/zsh")
size_file = os.environ.get("PTY_SIZE_FILE", "")
input_file = os.environ.get("PTY_INPUT_FILE", "")

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
input_offset = 0

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
    if input_file:
        try:
            size = os.stat(input_file).st_size
            if size < input_offset:
                input_offset = 0
            if size > input_offset:
                with open(input_file, "rb") as fh:
                    fh.seek(input_offset)
                    pending = fh.read()
                    input_offset = fh.tell()
                if pending:
                    os.write(fd, pending)
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
  inputFile: string;
  input: Uint8Array;
  writeChain: Promise<void>;
}

let session: TerminalSession | null = null;

const streamToApp = async (
  stream: { getReader(): { read(): Promise<{ value?: Uint8Array; done: boolean }> } },
  app: TinyApp,
) => {
  const reader = stream.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    app.push("terminal:data", decoder.decode(value, { stream: true }));
  }
};

const writeSizeFile = async (sizeFile: string, cols: number, rows: number) => {
  await tjs.writeFile(sizeFile, encoder.encode(`${cols} ${rows}`));
};

export async function startTerminal(
  app: TinyApp,
  options: { cols?: number; rows?: number; cwd?: string | null },
): Promise<{ shell: string; cwd: string }> {
  await stopTerminal().catch(() => undefined);

  if (!tiny.system.isMacOS()) {
    throw new Error("アプリ内ターミナルは現在 macOS のみ対応しています");
  }
  if (!(await tjs.stat("/usr/bin/python3").then(() => true).catch(() => false))) {
    throw new Error("アプリ内ターミナルには /usr/bin/python3 が必要です");
  }

  const shell = tjs.env.SHELL || "/bin/zsh";
  const cwd = options.cwd || tjs.cwd();
  const cols = options.cols ?? 80;
  const rows = options.rows ?? 24;
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const sizeFile = `${tjs.tmpDir}/right-stuff-term-${stamp}.size`;
  const inputFile = `${tjs.tmpDir}/right-stuff-term-${stamp}.in`;

  await writeSizeFile(sizeFile, cols, rows);
  await tjs.writeFile(inputFile, new Uint8Array());

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
      PTY_INPUT_FILE: inputFile,
    },
  }) as TerminalSession["process"];

  session = {
    process: child,
    app,
    closed: false,
    cols,
    rows,
    sizeFile,
    inputFile,
    input: new Uint8Array(),
    writeChain: Promise.resolve(),
  };

  void streamToApp(child.stdout, app).catch(() => undefined);
  void streamToApp(child.stderr, app).catch(() => undefined);

  void child.wait().then(({ exit_status }) => {
    if (session?.process !== child) return;
    session = null;
    void tjs.remove(sizeFile).catch(() => undefined);
    void tjs.remove(inputFile).catch(() => undefined);
    app.push("terminal:exit", exit_status);
  });

  return { shell, cwd };
}

export async function writeTerminal(data: string): Promise<boolean> {
  if (!session) throw new Error("ターミナルは起動していません");
  const current = session;
  const write = current.writeChain.then(async () => {
    const chunk = encoder.encode(data);
    const merged = new Uint8Array(current.input.length + chunk.length);
    merged.set(current.input, 0);
    merged.set(chunk, current.input.length);
    current.input = merged;
    await tjs.writeFile(current.inputFile, current.input);
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

export async function stopTerminal(): Promise<boolean> {
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
  await tjs.remove(current.inputFile).catch(() => undefined);
  return true;
}
