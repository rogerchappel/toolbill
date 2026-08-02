import { execFileSync } from "node:child_process";
import type { GitSummary } from "./types.js";

export interface GitSummaryOptions {
  cwd?: string;
}

export function summarizeGit(since: string, options: GitSummaryOptions = {}): GitSummary {
  const cwd = options.cwd ?? process.cwd();
  const commits = gitLines(["log", `${since}..HEAD`, "--format=%H%x1f%s%x1f%an%x1f%aI"], cwd).map((line) => {
    const [hash = "", subject = "", authorName = "", authorDate = ""] = line.split("\x1f");
    return {
      hash: hash.slice(0, 12),
      subject,
      authorName,
      authorDate
    };
  });

  const statuses = new Map(
    gitLines(["diff", "--name-status", "--find-renames", since, "HEAD"], cwd).map((line) => {
      const [code = "M", firstPath = "", secondPath] = line.split(/\t/);
      const path = secondPath === undefined ? firstPath : `${firstPath} => ${secondPath}`;
      return [path, statusFromCode(code)] as const;
    })
  );

  const files = gitLines(["diff", "--numstat", "--find-renames", since, "HEAD"], cwd).map((line) => {
    const [additions = "0", deletions = "0", path = ""] = line.split(/\t/);
    const normalizedPath = normalizeNumstatPath(path);
    return {
      path: normalizedPath,
      status: statuses.get(normalizedPath) ?? "modified",
      additions: parseCount(additions),
      deletions: parseCount(deletions)
    };
  });

  return {
    since,
    commits,
    files,
    totals: {
      commits: commits.length,
      filesChanged: files.length,
      additions: files.reduce((total, file) => total + file.additions, 0),
      deletions: files.reduce((total, file) => total + file.deletions, 0)
    }
  };
}

function gitLines(args: string[], cwd: string): string[] {
  const output = execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  return output.split(/\r?\n/).filter(Boolean);
}

function parseCount(value: string): number {
  return /^\d+$/.test(value) ? Number(value) : 0;
}

function normalizeNumstatPath(path: string): string {
  const rename = path.match(/^(.*)\{(.+) => (.+)\}(.*)$/);
  if (rename) {
    const [, prefix = "", oldPart = "", newPart = "", suffix = ""] = rename;
    return `${prefix}${oldPart}${suffix} => ${prefix}${newPart}${suffix}`;
  }

  return path;
}

function statusFromCode(code: string): "added" | "deleted" | "modified" | "renamed" {
  switch (code[0]) {
    case "A":
      return "added";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    default:
      return "modified";
  }
}
