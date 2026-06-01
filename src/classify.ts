import type { CommandCategory } from "./types.js";

const TEST_COMMANDS = new Set([
  "ava",
  "cargo",
  "go",
  "jest",
  "mocha",
  "node",
  "npm",
  "pnpm",
  "pytest",
  "tox",
  "vitest",
  "yarn"
]);

const READ_COMMANDS = new Set([
  "awk",
  "cat",
  "find",
  "grep",
  "head",
  "jq",
  "less",
  "ls",
  "nl",
  "pwd",
  "rg",
  "sed",
  "tail",
  "wc"
]);

const WRITE_COMMANDS = new Set([
  "apply_patch",
  "chmod",
  "cp",
  "mkdir",
  "mv",
  "perl",
  "python",
  "python3",
  "rm",
  "rmdir",
  "tee",
  "touch",
  "truncate"
]);

const NETWORK_COMMANDS = new Set([
  "curl",
  "gh",
  "git",
  "npm",
  "npx",
  "pnpm",
  "ssh",
  "wget",
  "yarn"
]);

const PACKAGE_COMMANDS = new Set([
  "bun",
  "cargo",
  "composer",
  "gem",
  "go",
  "npm",
  "npx",
  "pip",
  "pip3",
  "pnpm",
  "uv",
  "yarn"
]);

export function classifyCommand(command: string): CommandCategory {
  const normalized = command.trim();
  if (normalized.length === 0) {
    return "unknown";
  }

  const executable = normalized.split(/\s+/)[0]?.replace(/^['"]|['"]$/g, "") ?? "";
  const words = normalized.split(/\s+/);

  if (executable === "git") {
    return "git";
  }

  if (isTestCommand(executable, words)) {
    return "test";
  }

  if (isPackageCommand(executable, words)) {
    return "package";
  }

  if (isNetworkCommand(executable, words)) {
    return "network";
  }

  if (WRITE_COMMANDS.has(executable) || />{1,2}\s*\S+/.test(normalized)) {
    return "write";
  }

  if (READ_COMMANDS.has(executable)) {
    return "read";
  }

  return "unknown";
}

function isTestCommand(executable: string, words: string[]): boolean {
  if (!TEST_COMMANDS.has(executable)) {
    return false;
  }

  const joined = words.join(" ");
  return /\b(test|tests|check|lint|typecheck|build|pytest|vitest|jest|mocha)\b/.test(joined);
}

function isPackageCommand(executable: string, words: string[]): boolean {
  if (!PACKAGE_COMMANDS.has(executable)) {
    return false;
  }

  const joined = words.join(" ");
  return /\b(add|ci|install|pack|publish|remove|update|upgrade)\b/.test(joined);
}

function isNetworkCommand(executable: string, words: string[]): boolean {
  if (!NETWORK_COMMANDS.has(executable)) {
    return false;
  }

  const joined = words.join(" ");
  return /\b(clone|fetch|pull|push|release|repo|api|curl|wget|ssh)\b/.test(joined);
}
