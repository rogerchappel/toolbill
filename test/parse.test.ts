import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parseLog } from "../src/parse.js";

test("parses OpenClaw-like text logs into a bill", async () => {
  const content = await readFile("fixtures/openclaw-text.log", "utf8");
  const bill = parseLog(content, "fixtures/openclaw-text.log");

  assert.equal(bill.parser, "text");
  assert.equal(bill.totals.commands, 2);
  assert.equal(bill.totals.filesTouched, 2);
  assert.equal(bill.totals.networkActions, 1);
  assert.equal(bill.totals.modelInvocations, 1);
  assert.equal(bill.totals.toolInvocations, 1);
  assert.equal(bill.totals.verificationCommands, 1);
  assert.equal(bill.totals.byCategory.read, 1);
  assert.equal(bill.totals.byCategory.write, 1);
});

test("parses Codex-like JSONL logs into typed events", async () => {
  const content = await readFile("fixtures/codex-jsonl.log", "utf8");
  const bill = parseLog(content, "fixtures/codex-jsonl.log");

  assert.equal(bill.parser, "jsonl");
  assert.equal(bill.totals.commands, 1);
  assert.equal(bill.totals.filesTouched, 1);
  assert.equal(bill.totals.modelInvocations, 1);
  assert.equal(bill.totals.toolInvocations, 1);
  assert.equal(bill.totals.verificationCommands, 1);
  assert.equal(bill.totals.elapsedMs, 1420);
  assert.equal(bill.totals.byCategory.test, 1);
});

test("recovers valid events from partially malformed JSONL", async () => {
  const content = await readFile("fixtures/partial-jsonl.log", "utf8");
  const bill = parseLog(content, "fixtures/partial-jsonl.log");

  assert.equal(bill.parser, "jsonl");
  assert.equal(bill.totals.commands, 1);
  assert.deepEqual(
    bill.events.map((event) => [event.kind, event.sourceLine]),
    [
      ["command", 2],
      ["note", 3],
      ["note", 4]
    ]
  );
  assert.equal(bill.events[1]?.kind === "note" && bill.events[1].message, "Unparsed JSONL line 3");
  assert.equal(bill.events[2]?.kind === "note" && bill.events[2].message, "Unparsed JSONL line 4");
});

test("keeps wholly textual logs on the text parser", () => {
  const bill = parseLog("command: npm test\nplain diagnostic text\n");

  assert.equal(bill.parser, "text");
  assert.equal(bill.totals.commands, 1);
});
