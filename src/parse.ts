import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { classifyCommand } from "./classify.js";
import type { Bill, CommandCategory, ToolBillEvent, Totals } from "./types.js";

const CATEGORY_ORDER: CommandCategory[] = [
  "read",
  "write",
  "test",
  "network",
  "git",
  "package",
  "unknown"
];

export async function parseLogFile(filePath: string): Promise<Bill> {
  const content = await readFile(filePath, "utf8");
  return parseLog(content, filePath);
}

export function parseLog(content: string, source = "stdin"): Bill {
  const parser = looksLikeJsonl(content) ? "jsonl" : "text";
  const events = parser === "jsonl" ? parseJsonl(content) : parseTextLog(content);

  return {
    source,
    parser,
    events,
    totals: calculateTotals(events)
  };
}

export function parseJsonl(content: string): ToolBillEvent[] {
  const events: ToolBillEvent[] = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return;
    }

    try {
      const value = JSON.parse(trimmed) as Record<string, unknown>;
      const event = normalizeJsonEvent(value, index + 1);
      if (event) {
        events.push(event);
      }
    } catch {
      events.push({
        kind: "note",
        message: `Unparsed JSONL line ${index + 1}`,
        sourceLine: index + 1
      });
    }
  });

  return events;
}

export function parseTextLog(content: string): ToolBillEvent[] {
  const events: ToolBillEvent[] = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const sourceLine = index + 1;
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return;
    }

    const command = matchCommand(trimmed);
    if (command) {
      events.push({
        kind: "command",
        command: command.value,
        category: classifyCommand(command.value),
        sourceLine
      });
      return;
    }

    const file = matchFile(trimmed);
    if (file) {
      events.push({
        kind: "file",
        path: file.path,
        action: file.action,
        sourceLine
      });
      return;
    }

    const tool = matchTool(trimmed);
    if (tool) {
      events.push({
        kind: "tool",
        name: tool,
        sourceLine
      });
      return;
    }

    const model = matchModel(trimmed);
    if (model) {
      events.push({
        kind: "model",
        model,
        sourceLine
      });
      return;
    }

    const network = matchNetwork(trimmed);
    if (network) {
      events.push({
        kind: "network",
        target: network,
        sourceLine
      });
      return;
    }

    const verification = matchVerification(trimmed);
    if (verification) {
      events.push({
        kind: "verification",
        command: verification.command,
        passed: verification.passed,
        sourceLine
      });
    }
  });

  return events;
}

export function calculateTotals(events: ToolBillEvent[]): Totals {
  const byCategory = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, 0])) as Record<
    CommandCategory,
    number
  >;
  const files = new Set<string>();
  let elapsedMs = 0;

  for (const event of events) {
    if (event.kind === "command") {
      byCategory[event.category] += 1;
      elapsedMs += event.elapsedMs ?? 0;
    }

    if (event.kind === "file") {
      files.add(event.path);
    }
  }

  return {
    commands: events.filter((event) => event.kind === "command").length,
    filesTouched: files.size,
    networkActions: events.filter((event) => event.kind === "network").length,
    modelInvocations: events.filter((event) => event.kind === "model").length,
    toolInvocations: events.filter((event) => event.kind === "tool").length,
    verificationCommands: events.filter((event) => event.kind === "verification").length,
    elapsedMs,
    byCategory
  };
}

function looksLikeJsonl(content: string): boolean {
  const nonEmpty = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return nonEmpty.length > 0 && nonEmpty.every((line) => line.startsWith("{") && line.endsWith("}"));
}

function normalizeJsonEvent(value: Record<string, unknown>, sourceLine: number): ToolBillEvent | null {
  const type = stringValue(value.type) ?? stringValue(value.kind) ?? stringValue(value.event);
  const command = stringValue(value.command) ?? stringValue(value.cmd);

  if (type === "command" || (!type && command)) {
    const text = command ?? stringValue(value.message) ?? "";
    const event: ToolBillEvent = {
      kind: "command",
      command: text,
      category: classifyCommand(text),
      sourceLine
    };
    const exitCode = numberValue(value.exitCode) ?? numberValue(value.exit_code);
    const elapsedMs = numberValue(value.elapsedMs) ?? numberValue(value.elapsed_ms);
    if (exitCode !== undefined) {
      event.exitCode = exitCode;
    }
    if (elapsedMs !== undefined) {
      event.elapsedMs = elapsedMs;
    }
    return event;
  }

  const filePath = stringValue(value.path) ?? stringValue(value.file);
  if (type === "file" || filePath) {
    return {
      kind: "file",
      path: filePath ?? "unknown",
      action: fileActionValue(value.action),
      sourceLine
    };
  }

  if (type === "network") {
    const event: ToolBillEvent = {
      kind: "network",
      target: stringValue(value.target) ?? stringValue(value.url) ?? "unknown",
      sourceLine
    };
    const action = stringValue(value.action);
    if (action !== undefined) {
      event.action = action;
    }
    return event;
  }

  if (type === "model") {
    const event: ToolBillEvent = {
      kind: "model",
      sourceLine
    };
    const model = stringValue(value.model);
    const tokensIn = numberValue(value.tokensIn) ?? numberValue(value.tokens_in);
    const tokensOut = numberValue(value.tokensOut) ?? numberValue(value.tokens_out);
    if (model !== undefined) {
      event.model = model;
    }
    if (tokensIn !== undefined) {
      event.tokensIn = tokensIn;
    }
    if (tokensOut !== undefined) {
      event.tokensOut = tokensOut;
    }
    return event;
  }

  if (type === "tool") {
    return {
      kind: "tool",
      name: stringValue(value.name) ?? stringValue(value.tool) ?? "unknown",
      input: value.input,
      sourceLine
    };
  }

  if (type === "verification") {
    return {
      kind: "verification",
      command: command ?? stringValue(value.name) ?? "verification",
      passed: Boolean(value.passed ?? value.ok ?? value.success),
      sourceLine
    };
  }

  if (type === "note" || stringValue(value.message)) {
    return {
      kind: "note",
      message: stringValue(value.message) ?? JSON.stringify(value),
      sourceLine
    };
  }

  return null;
}

function matchCommand(line: string): { value: string } | null {
  const patterns = [
    /^\$ (?<command>.+)$/,
    /^>\s*(?<command>.+)$/,
    /^command:\s*(?<command>.+)$/i,
    /^(?:exec|shell|bash|zsh)(?:_command)?:\s*(?<command>.+)$/i,
    /^cmd=\s*(?<command>.+)$/i
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    const command = match?.groups?.command?.trim();
    if (command) {
      return { value: command };
    }
  }

  return null;
}

function matchFile(line: string): { path: string; action: "read" | "write" | "delete" | "touch" | "unknown" } | null {
  const match = line.match(/^(?<action>read|wrote|write|edited|deleted|created|touched|file):\s*(?<path>.+)$/i);
  if (!match?.groups?.path) {
    return null;
  }

  const action = match.groups.action.toLowerCase();
  return {
    path: match.groups.path.trim(),
    action:
      action === "read"
        ? "read"
        : action === "deleted"
          ? "delete"
          : action === "touched"
            ? "touch"
            : action === "file"
              ? "unknown"
              : "write"
  };
}

function matchTool(line: string): string | null {
  return line.match(/^tool(?:_call)?:\s*(?<tool>[\w.-]+)/i)?.groups?.tool ?? null;
}

function matchModel(line: string): string | null {
  return line.match(/^model:\s*(?<model>[\w.-]+)/i)?.groups?.model ?? null;
}

function matchNetwork(line: string): string | null {
  return line.match(/^(?:network|url|fetch):\s*(?<target>\S+)/i)?.groups?.target ?? null;
}

function matchVerification(line: string): { command: string; passed: boolean } | null {
  const match = line.match(/^verification:\s*(?<state>pass|passed|fail|failed)\s*[-:]\s*(?<command>.+)$/i);
  if (!match?.groups?.command || !match.groups.state) {
    return null;
  }

  return {
    command: match.groups.command.trim(),
    passed: /^pass/i.test(match.groups.state)
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function fileActionValue(value: unknown): "read" | "write" | "delete" | "touch" | "unknown" {
  if (value === "read" || value === "write" || value === "delete" || value === "touch") {
    return value;
  }

  return "unknown";
}

export function displaySource(source: string): string {
  return source === "stdin" ? source : basename(source);
}
