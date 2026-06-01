import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { summarizeGit } from "../src/git.js";

test("summarizes commits and changed files since a ref", () => {
  const repo = mkdtempSync(join(tmpdir(), "toolbill-git-"));
  git(repo, "init");
  git(repo, "config", "user.email", "test@example.com");
  git(repo, "config", "user.name", "ToolBill Test");

  writeFileSync(join(repo, "README.md"), "# demo\n");
  git(repo, "add", "README.md");
  git(repo, "commit", "-m", "initial");
  const base = git(repo, "rev-parse", "HEAD").trim();

  writeFileSync(join(repo, "README.md"), "# demo\n\nchanged\n");
  writeFileSync(join(repo, "src.txt"), "new\n");
  git(repo, "add", ".");
  git(repo, "commit", "-m", "agent changes");

  const summary = summarizeGit(base, { cwd: repo });

  assert.equal(summary.totals.commits, 1);
  assert.equal(summary.commits[0]?.subject, "agent changes");
  assert.equal(summary.totals.filesChanged, 2);
  assert.equal(summary.totals.additions, 3);
  assert.equal(summary.files.some((file) => file.path === "README.md"), true);
  assert.equal(summary.files.some((file) => file.path === "src.txt"), true);
});

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}
