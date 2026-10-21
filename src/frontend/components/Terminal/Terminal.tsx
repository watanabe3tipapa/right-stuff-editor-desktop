import React, { useState, useEffect, useRef } from "react";

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

const isElectron = (): boolean => {
  return typeof window !== "undefined" && !!window.electronAPI?.isElectron;
};

const mockCommands: Record<string, string> = {
  help: "Available commands: help, echo, date, clear, version, whoami, ls, pwd, main, open, neo, beos, osx, qe, te",
  echo: "Usage: echo <message>",
  date: "Returns current date and time",
  version: "Right-Stuff Editor Dash v0.5.0",
  whoami: "user",
  ls: "Documents  Downloads  Desktop  code",
  pwd: "/home/user",
  clear: "Terminal cleared",
  main: "Opening https://watanabe3ti.com...",
  open: "Usage: open <url>",
  neo: "Opening https://watanabe3ti.com/neo/...",
  beos: "Opening https://watanabe3ti.com/beos/...",
  osx: "Opening https://watanabe3ti-osx.vercel.app...",
  qe: "Opening https://quarto-editor-pe.vercel.app...",
  te: "Opening https://toolsmith-editor.vercel.app...",
};

const terminalStyles = `
.terminal-wrapper {
  height: 100%;
  background-color: #0d1117;
  color: #c9d1d9;
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  display: flex;
  flex-direction: column;
}

.terminal-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #161b22;
  border-bottom: 1px solid #30363d;
}

.terminal-title {
  flex: 1;
  font-size: 12px;
  color: #8b949e;
}

.terminal-close {
  background: none;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 16px;
}

.terminal-close:hover {
  color: #c9d1d9;
}

.terminal-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  max-height: calc(100% - 50px);
}

.terminal-line {
  margin: 2px 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.terminal-prompt {
  color: #7ee787;
}

.terminal-command {
  color: #c9d1d9;
}

.terminal-output {
  color: #8b949e;
}

.terminal-error {
  color: #f85149;
}

.terminal-input-wrapper {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #161b22;
  border-top: 1px solid #30363d;
}

.terminal-input-prompt {
  color: #7ee787;
  margin-right: 8px;
}

.terminal-input {
  flex: 1;
  background: none;
  border: none;
  color: #c9d1d9;
  font-family: inherit;
  font-size: inherit;
  outline: none;
}
`;

export const Terminal: React.FC<TerminalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([
    "Right-Stuff-Editor Terminal",
    isElectron()
      ? "Connected to system terminal (Terminal.app)"
      : "Type 'help' for available commands",
    "",
  ]);
  const [electronLaunched, setElectronLaunched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (isElectron() && !electronLaunched) {
        window.electronAPI?.openTerminal?.();
        setElectronLaunched(true);
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, electronLaunched]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase();
    
    if (trimmedCmd === "") {
      return "";
    }
    
    if (trimmedCmd === "clear") {
      setHistory([]);
      return "";
    }
    
    if (trimmedCmd === "help") {
      return mockCommands.help;
    }
    
    if (trimmedCmd === "echo") {
      return "echo: missing argument";
    }
    
    if (trimmedCmd.startsWith("echo ")) {
      return cmd.substring(5);
    }
    
    if (trimmedCmd === "date") {
      return new Date().toISOString();
    }

    if (trimmedCmd === "relaunch" && isElectron()) {
      window.electronAPI?.openTerminal?.();
      return "Terminal relaunched.";
    }
    
    if (trimmedCmd === "main") {
      window.open("https://watanabe3ti.com", "_blank");
      return mockCommands.main;
    }
    
    if (trimmedCmd === "neo") {
      window.open("https://watanabe3ti.com/neo/", "_blank");
      return mockCommands.neo;
    }
    
    if (trimmedCmd === "beos") {
      window.open("https://watanabe3ti.com/beos/", "_blank");
      return mockCommands.beos;
    }
    
    if (trimmedCmd === "osx") {
      window.open("https://watanabe3ti-osx.vercel.app", "_blank");
      return mockCommands.osx;
    }
    
    if (trimmedCmd === "qe") {
      window.open("https://quarto-editor-pe.vercel.app", "_blank");
      return mockCommands.qe;
    }
    
    if (trimmedCmd === "te") {
      window.open("https://toolsmith-editor.vercel.app", "_blank");
      return mockCommands.te;
    }
    
    if (trimmedCmd.startsWith("open ")) {
      const url = cmd.substring(5).trim();
      if (url) {
        window.open(url, "_blank");
        return `Opening ${url}...`;
      }
      return mockCommands.open;
    }
    
    if (mockCommands[trimmedCmd]) {
      return mockCommands[trimmedCmd];
    }
    
    return `command not found: ${trimmedCmd}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const output = executeCommand(input);
    const newHistory = [...history, `$ ${input}`];
    
    if (output) {
      newHistory.push(output);
    }
    
    newHistory.push("");
    setHistory(newHistory);
    setInput("");
  };

  const handleRelaunch = () => {
    if (isElectron()) {
      window.electronAPI?.openTerminal?.();
      const newHistory = [...history, "$ relaunch", "Terminal relaunched.", ""];
      setHistory(newHistory);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="terminal-wrapper">
      <style>{terminalStyles}</style>
      <div className="terminal-header">
        <span className="terminal-title">
          {isElectron() ? "Terminal (System)" : "Terminal (Mock)"}
        </span>
        <div className="flex items-center gap-2">
          {isElectron() && (
            <button
              onClick={handleRelaunch}
              className="text-xs px-2 py-0.5 bg-[#21262d] hover:bg-[#30363d] rounded text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
              title="Relaunch system terminal"
            >
              ↻
            </button>
          )}
          <button className="terminal-close" onClick={onClose} title="Close">
            ×
          </button>
        </div>
      </div>
      <div className="terminal-content" ref={contentRef}>
        {history.map((line, index) => (
          <div key={index} className="terminal-line">
            {line}
          </div>
        ))}
        {isElectron() && (
          <div className="terminal-line terminal-output" style={{ marginTop: "8px", padding: "8px", border: "1px solid #30363d", borderRadius: "4px", backgroundColor: "#161b22" }}>
            <div style={{ color: "#7ee787", fontWeight: 600, marginBottom: "4px" }}>● System Terminal Active</div>
            <div style={{ color: "#8b949e", fontSize: "11px" }}>
              Terminal.app has been launched as a separate window.<br />
              Use the system terminal for shell commands.<br />
              Type <span style={{ color: "#c9d1d9" }}>relaunch</span> to open a new terminal window.
            </div>
          </div>
        )}
      </div>
      <form className="terminal-input-wrapper" onSubmit={handleSubmit}>
        <span className="terminal-input-prompt">$</span>
        <input
          ref={inputRef}
          type="text"
          className="terminal-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isElectron() ? "Type 'relaunch' to open terminal..." : "Enter command..."}
          autoComplete="off"
        />
      </form>
    </div>
  );
};

export default Terminal;