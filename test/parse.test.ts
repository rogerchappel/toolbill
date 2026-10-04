import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parseLog } from "../src/parse.js";
import { renderMarkdownBill } from "../src/report.js";

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

test("prefers recognized JSONL event types over incidental file fields", async () => {
  const content = await readFile("fixtures/jsonl-normalization.log", "utf8");
  const bill = parseLog(content, "fixtures/jsonl-normalization.log");

  assert.deepEqual(
    bill.events.slice(0, 3).map((event) => event.kind),
    ["model", "network", "tool"]
  );
  assert.equal(bill.totals.filesTouched, 0);
});

test("normalizes supported verification booleans without truthiness inversion", async () => {
  const content = await readFile("fixtures/jsonl-normalization.log", "utf8");
  const bill = parseLog(content, "fixtures/jsonl-normalization.log");

  assert.deepEqual(
    bill.events.slice(3, 7).map((event) => event.kind === "verification" && event.passed),
    [false, false, false, true]
  );
  assert.deepEqual(bill.events[7], {
    kind: "note",
    message: "Unparsed JSONL line 8",
    sourceLine: 8
  });
  assert.equal(bill.totals.verificationCommands, 4);
});

test("retains unsupported typed JSONL objects beside recognized events", () => {
  const bill = parseLog([
    '{"type":"future_event","detail":"kept evidence"}',
    '{"type":"note","message":"known"}'
  ].join("\n"));

  assert.deepEqual(bill.events, [
    {
      kind: "note",
      message: 'Unparsed JSONL line 1: {"type":"future_event","detail":"kept evidence"}',
      sourceLine: 1
    },
    {
      kind: "note",
      message: "known",
      sourceLine: 2
    }
  ]);
});

test("keeps wholly textual logs on the text parser", () => {
  const bill = parseLog("command: npm test\nplain diagnostic text\n");

  assert.equal(bill.parser, "text");
  assert.equal(bill.totals.commands, 1);
});

test("counts network-performing commands without replacing their useful category", async () => {
  const content = await readFile("fixtures/network-actions-text.log", "utf8");
  const bill = parseLog(content, "fixtures/network-actions-text.log");

  assert.equal(bill.parser, "text");
  assert.equal(bill.totals.byCategory.network, 1);
  assert.equal(bill.totals.byCategory.git, 2);
  assert.equal(bill.totals.byCategory.package, 2);
  assert.equal(bill.totals.networkActions, 4);
  assert.match(renderMarkdownBill(bill), /- Network-like actions: 4/);
  assert.match(renderMarkdownBill(bill), /- git: 2/);
  assert.match(renderMarkdownBill(bill), /- package: 2/);
});

test("counts explicit and command network actions independently in JSONL", async () => {
  const content = await readFile("fixtures/network-actions-jsonl.log", "utf8");
  const bill = parseLog(content, "fixtures/network-actions-jsonl.log");

  assert.equal(bill.parser, "jsonl");
  assert.equal(bill.totals.byCategory.network, 1);
  assert.equal(bill.totals.byCategory.git, 2);
  assert.equal(bill.totals.byCategory.package, 2);
  assert.equal(bill.totals.networkActions, 4);
  assert.match(renderMarkdownBill(bill), /- Network-like actions: 4/);
});

test("counts npm ci as a package command that performs one network action", () => {
  const bill = parseLog('{"type":"command","command":"npm ci"}\n');

  assert.equal(bill.parser, "jsonl");
  assert.equal(bill.totals.byCategory.package, 1);
  assert.equal(bill.totals.networkActions, 1);
  assert.match(renderMarkdownBill(bill), /- Network-like actions: 1/);
  assert.match(renderMarkdownBill(bill), /- package: 1/);
});

test("ignores provider-specific JSONL envelopes while retaining normalized events", async () => {
  const content = await readFile("fixtures/codex-jsonl-edge-cases.log", "utf8");
  const bill = parseLog(content);

  assert.equal(bill.parser, "jsonl");
  assert.equal(bill.events.length, 6);
  assert.equal(bill.totals.commands, 1);
  assert.equal(bill.totals.filesTouched, 1);
  assert.equal(bill.totals.verificationCommands, 1);
  assert.equal(bill.totals.toolInvocations, 0);
});

test("recognizes supported text prefixes without inferring free-form lines", async () => {
  const content = await readFile("fixtures/openclaw-text-edge-cases.log", "utf8");
  const bill = parseLog(content);

  assert.equal(bill.parser, "text");
  assert.equal(bill.totals.commands, 1);
  assert.equal(bill.totals.filesTouched, 1);
  assert.equal(bill.totals.verificationCommands, 1);
  assert.equal(bill.events.find((event) => event.kind === "verification")?.passed, false);
});
