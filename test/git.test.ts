import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { summarizeGit } from "../src/git.js";

test("summarizes commits and changed files since a ref", () => {
  const repo = mkdtempSync(join(tmpdir(), "toolbill-git-"));
  git(repo, "init");
  git(repo, "config", "user.email", "test@example.com");
  git(repo, "config", "user.name", "ToolBill Test");

  writeFileSync(join(repo, "modified.txt"), "before\n");
  writeFileSync(join(repo, "deleted.txt"), "deleted\n");
  writeFileSync(join(repo, "legacy.txt"), "ordinary rename\n");
  mkdirSync(join(repo, "src"));
  writeFileSync(join(repo, "src", "brace-old.txt"), "brace rename\n");
  git(repo, "add", ".");
  git(repo, "commit", "-m", "initial");
  const base = git(repo, "rev-parse", "HEAD").trim();

  writeFileSync(join(repo, "modified.txt"), "before\nafter\n");
  writeFileSync(join(repo, "added.txt"), "new\n");
  rmSync(join(repo, "deleted.txt"));
  git(repo, "mv", "legacy.txt", "replacement.md");
  git(repo, "mv", "src/brace-old.txt", "src/brace-new.txt");
  git(repo, "add", ".");
  git(repo, "commit", "-m", "agent changes");

  const summary = summarizeGit(base, { cwd: repo });

  assert.equal(summary.totals.commits, 1);
  assert.equal(summary.commits[0]?.subject, "agent changes");
  assert.equal(summary.totals.filesChanged, 5);
  assert.equal(summary.totals.additions, 2);
  assert.equal(summary.totals.deletions, 1);
  assert.deepEqual(summary.files, [
    { path: "added.txt", status: "added", additions: 1, deletions: 0 },
    { path: "deleted.txt", status: "deleted", additions: 0, deletions: 1 },
    { path: "modified.txt", status: "modified", additions: 1, deletions: 0 },
    { path: "legacy.txt => replacement.md", status: "renamed", additions: 0, deletions: 0 },
    { path: "src/brace-old.txt => src/brace-new.txt", status: "renamed", additions: 0, deletions: 0 }
  ]);
});

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}
