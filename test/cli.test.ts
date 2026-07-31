import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { test } from "node:test";

const execFileAsync = promisify(execFile);

test("CLI help and JSON output are usable from the built package", async () => {
  const help = await execFileAsync("node", ["dist/src/cli.js", "--help"]);
  assert.match(help.stdout, /toolbill summarize <log-file>/);

  const { stdout } = await execFileAsync("node", ["dist/src/cli.js", "json", "fixtures/codex-jsonl.log"]);
  const bill = JSON.parse(stdout) as { parser: string; totals: { commands: number } };

  assert.equal(bill.parser, "jsonl");
  assert.equal(bill.totals.commands, 1);
});

function runCli(args: string[]) {
  return spawnSync("node", ["dist/src/cli.js", ...args], { encoding: "utf8" });
}

test("summarize and json reject unsupported options and excess arguments", () => {
  for (const command of ["summarize", "json"]) {
    const unsupported = runCli([command, "fixtures/openclaw-text.log", "--bogus"]);
    assert.equal(unsupported.status, 1);
    assert.match(unsupported.stderr, new RegExp(`Unsupported option for ${command}: --bogus`));
    assert.match(unsupported.stderr, /Usage:/);

    const excess = runCli([command, "fixtures/openclaw-text.log", "extra"]);
    assert.equal(excess.status, 1);
    assert.match(excess.stderr, new RegExp(`Too many arguments for ${command}`));
    assert.match(excess.stderr, /Usage:/);
  }
});

test("git validates options, positionals, and option operands before invoking git", () => {
  const unsupported = runCli(["git", "--since", "HEAD", "--bogus"]);
  assert.equal(unsupported.status, 1);
  assert.match(unsupported.stderr, /Unsupported option for git: --bogus/);

  const excess = runCli(["git", "--since", "HEAD", "extra"]);
  assert.equal(excess.status, 1);
  assert.match(excess.stderr, /Too many arguments for git/);

  for (const args of [
    ["git", "--since"],
    ["git", "--since="],
    ["git", "--since", "--repo", "."],
    ["git", "--since", "HEAD", "--repo"],
    ["git", "--since", "HEAD", "--repo="],
  ]) {
    const result = runCli(args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing operand for --(?:since|repo)/);
    assert.match(result.stderr, /Usage:/);
    assert.doesNotMatch(result.stderr, /fatal:/);
  }
});

test("command help and valid invocations remain supported", () => {
  for (const command of ["summarize", "json", "git"]) {
    const help = runCli([command, "--help"]);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /Usage:/);
  }

  const git = runCli(["git", "--since", "HEAD", "--repo", "."]);
  assert.equal(git.status, 0);
  assert.match(git.stdout, /ToolBill Git Summary/);
});
