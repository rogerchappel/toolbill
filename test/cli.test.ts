import assert from "node:assert/strict";
import { execFile } from "node:child_process";
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
