import type { ASMSkill } from "@/types";

// Toggle this for browser testing without Electron.
// 本番では Web版で ASM を表示しないため false。開発時のみ true に切り替える。
export const USE_MOCK = false;

export const isElectron = (): boolean => false;

export const isAsmAvailable = (): boolean => USE_MOCK;

const mockSkills: ASMSkill[] = [
  { name: "code-reviewer", description: "Automated code review and linting for multiple languages", version: "1.2.0", author: "asm-core", tags: ["code", "review", "lint"], installed: true },
  { name: "web-fetcher", description: "Fetch and process web content for context-aware agent responses", version: "0.9.1", author: "asm-core", tags: ["web", "fetch", "tools"], installed: false },
  { name: "file-system", description: "Safe file system operations with path validation", version: "2.0.0", author: "asm-core", tags: ["fs", "file", "io"], installed: true },
  { name: "terminal-executor", description: "Execute terminal commands with sandbox restrictions", version: "1.1.3", author: "asm-community", tags: ["terminal", "exec", "sandbox"], installed: false },
  { name: "search-engine", description: "Web search integration for real-time information gathering", version: "0.8.0", author: "asm-community", tags: ["search", "web", "info"], installed: false },
  { name: "git-manager", description: "Git operations: commit, branch, merge, and status checks", version: "1.3.0", author: "asm-core", tags: ["git", "version-control", "dev"], installed: false },
  { name: "db-query", description: "Database query execution with support for SQL and NoSQL", version: "0.7.2", author: "asm-labs", tags: ["database", "sql", "nosql"], installed: false },
  { name: "api-tester", description: "Test and debug REST and GraphQL APIs from the editor", version: "1.0.0", author: "asm-community", tags: ["api", "rest", "graphql", "test"], installed: false },
  { name: "doc-generator", description: "Generate documentation from code comments and structure", version: "0.6.0", author: "asm-core", tags: ["docs", "generation", "code"], installed: false },
  { name: "package-manager", description: "Manage npm, pip, cargo dependencies with vulnerability scanning", version: "0.5.1", author: "asm-labs", tags: ["package", "dependency", "security"], installed: false },
];

const filterMockSkills = (query: string): ASMSkill[] => {
  if (!query) return mockSkills;
  const q = query.toLowerCase();
  return mockSkills.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
  );
};

export const execAsm = async (args: string[]): Promise<string> => {
  if (USE_MOCK) {
    // Mock mode for browser testing
    const cmd = args[0];
    const subcmd = args[1];
    const query = args[2] || args[1] || "";
    if (cmd === "index" && subcmd === "search") {
      return JSON.stringify(filterMockSkills(query));
    }
    if (cmd === "search") {
      return JSON.stringify(filterMockSkills(query));
    }
    if (cmd === "list") {
      return JSON.stringify(mockSkills.filter((s) => s.installed));
    }
    if (cmd === "install" || cmd === "uninstall") {
      return `Success: ${cmd} ${query}`;
    }
    return "";
  }
  throw new Error("ASM is not available");
};

const parseSkillsFromOutput = (output: string): ASMSkill[] => {
  try {
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed)) {
      return parsed.map((item: Record<string, unknown>) => ({
        name: String(item.name || ""),
        description: String(item.description || ""),
        version: String(item.version || ""),
        author: String(item.author || ""),
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
        installed: Boolean(item.installed),
      }));
    }
  } catch {
    // If not JSON, try line-by-line parsing
  }

  // Strip header lines like "Installed skills matching ".":"
  const lines = output
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.includes("skills matching") && !l.startsWith("---"));

  if (lines.length === 0) return [];

  // Try parsing as NAME - DESCRIPTION format (common in CLI tools)
  return lines.map((line) => {
    const separator = line.search(/[\s]{2,}| - /);
    if (separator > 0) {
      return {
        name: line.slice(0, separator).trim(),
        description: line.slice(separator).replace(/^[\s-]+/, "").trim(),
        version: "",
        author: "",
        tags: [],
        installed: false,
      };
    }
    return {
      name: line,
      description: "",
      version: "",
      author: "",
      tags: [],
      installed: false,
    };
  });
};

export const searchSkills = async (query: string): Promise<ASMSkill[]> => {
  const output = await execAsm(["index", "search", query, "--json"]);
  return parseSkillsFromOutput(output);
};

export const installSkill = async (name: string): Promise<string> => {
  return execAsm(["install", name]);
};

export const listInstalledSkills = async (): Promise<ASMSkill[]> => {
  const output = await execAsm(["list"]);
  return parseSkillsFromOutput(output);
};

export const auditSkills = async (): Promise<string> => {
  return execAsm(["audit"]);
};

export const uninstallSkill = async (name: string): Promise<string> => {
  return execAsm(["uninstall", name]);
};

export const fetchCatalog = async (): Promise<ASMSkill[]> => {
  const output = await execAsm(["index", "search", ".", "--json"]);
  return parseSkillsFromOutput(output);
};
