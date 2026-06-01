import { displaySource } from "./parse.js";
import type { Bill, CommandCategory, GitSummary, ToolBillEvent } from "./types.js";

const CATEGORY_ORDER: CommandCategory[] = [
  "read",
  "write",
  "test",
  "network",
  "git",
  "package",
  "unknown"
];

export function renderMarkdownBill(bill: Bill): string {
  const lines = [
    `# ToolBill Summary: ${displaySource(bill.source)}`,
    "",
    `Parser: \`${bill.parser}\``,
    "",
    "## Totals",
    "",
    `- Commands: ${bill.totals.commands}`,
    `- Files touched: ${bill.totals.filesTouched}`,
    `- Network-like actions: ${bill.totals.networkActions}`,
    `- Model invocations: ${bill.totals.modelInvocations}`,
    `- Tool invocations: ${bill.totals.toolInvocations}`,
    `- Verification commands: ${bill.totals.verificationCommands}`,
    `- Elapsed time: ${formatElapsed(bill.totals.elapsedMs)}`,
    "",
    "## Command Classes",
    ""
  ];

  for (const category of CATEGORY_ORDER) {
    lines.push(`- ${category}: ${bill.totals.byCategory[category]}`);
  }

  const commands = bill.events.filter((event) => event.kind === "command");
  if (commands.length > 0) {
    lines.push("", "## Commands", "");
    for (const event of commands) {
      lines.push(`- \`${event.command}\` (${event.category})`);
    }
  }

  const files = uniqueEvents(bill.events, "file", (event) => event.path);
  if (files.length > 0) {
    lines.push("", "## Files", "");
    for (const event of files) {
      lines.push(`- ${event.action}: \`${event.path}\``);
    }
  }

  const verifications = bill.events.filter((event) => event.kind === "verification");
  if (verifications.length > 0) {
    lines.push("", "## Verification Evidence", "");
    for (const event of verifications) {
      lines.push(`- ${event.passed ? "PASS" : "FAIL"}: \`${event.command}\``);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function renderMarkdownGitSummary(summary: GitSummary): string {
  const lines = [
    `# ToolBill Git Summary: ${summary.since}`,
    "",
    "## Totals",
    "",
    `- Commits: ${summary.totals.commits}`,
    `- Files changed: ${summary.totals.filesChanged}`,
    `- Additions: ${summary.totals.additions}`,
    `- Deletions: ${summary.totals.deletions}`,
    "",
    "## Commits",
    ""
  ];

  if (summary.commits.length === 0) {
    lines.push("- None");
  } else {
    for (const commit of summary.commits) {
      lines.push(`- ${commit.hash} ${commit.subject} (${commit.authorName}, ${commit.authorDate})`);
    }
  }

  lines.push("", "## Files", "");
  if (summary.files.length === 0) {
    lines.push("- None");
  } else {
    for (const file of summary.files) {
      lines.push(`- ${file.status} \`${file.path}\` (+${file.additions}/-${file.deletions})`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function uniqueEvents<K extends ToolBillEvent["kind"]>(
  events: ToolBillEvent[],
  kind: K,
  key: (event: Extract<ToolBillEvent, { kind: K }>) => string
): Array<Extract<ToolBillEvent, { kind: K }>> {
  const seen = new Set<string>();
  const result: Array<Extract<ToolBillEvent, { kind: K }>> = [];

  for (const event of events) {
    if (event.kind !== kind) {
      continue;
    }

    const typed = event as Extract<ToolBillEvent, { kind: K }>;
    const value = key(typed);
    if (!seen.has(value)) {
      seen.add(value);
      result.push(typed);
    }
  }

  return result;
}

function formatElapsed(elapsedMs: number): string {
  if (elapsedMs <= 0) {
    return "not recorded";
  }

  if (elapsedMs < 1000) {
    return `${elapsedMs}ms`;
  }

  return `${(elapsedMs / 1000).toFixed(1)}s`;
}
