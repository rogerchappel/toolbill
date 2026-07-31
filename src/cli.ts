#!/usr/bin/env node
import { parseLogFile } from "./parse.js";
import { renderMarkdownBill, renderMarkdownGitSummary } from "./report.js";
import { summarizeGit } from "./git.js";

function usage(): string {
  return `toolbill - local bill of materials for agent runs

Usage:
  toolbill summarize <log-file>
  toolbill json <log-file>
  toolbill git --since <ref> [--repo <path>]

Options:
  --since <ref>  Git ref to compare against.
  --repo <path>  Repository path for git summaries. Defaults to cwd.
  --help         Show this help.
`;
}

interface ParsedArgs {
  command?: string;
  positionals: string[];
  flags: Map<string, string>;
}

class UsageError extends Error {}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);

  if (!args.command || args.command === "help" || args.command === "--help" || args.command === "-h" || args.flags.has("help")) {
    process.stdout.write(usage());
    return;
  }

  if (args.command === "summarize") {
    validateCommand(args, { positionals: 1 });
    const filePath = requiredPositional(args, 0, "Missing log file.");
    const bill = await parseLogFile(filePath);
    process.stdout.write(renderMarkdownBill(bill));
    return;
  }

  if (args.command === "json") {
    validateCommand(args, { positionals: 1 });
    const filePath = requiredPositional(args, 0, "Missing log file.");
    const bill = await parseLogFile(filePath);
    process.stdout.write(`${JSON.stringify(bill, null, 2)}\n`);
    return;
  }

  if (args.command === "git") {
    validateCommand(args, { flags: ["since", "repo"], positionals: 0 });
    const since = args.flags.get("since");
    if (!since) {
      throw new UsageError("Missing required --since <ref>.");
    }

    const repo = args.flags.get("repo");
    const summary = summarizeGit(since, repo ? { cwd: repo } : {});
    process.stdout.write(renderMarkdownGitSummary(summary));
    return;
  }

  throw new UsageError(`Unknown command: ${args.command}`);
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const flags = new Map<string, string>();
  const positionals: string[] = [];

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token) {
      continue;
    }

    if (token === "-h") {
      flags.set("help", "true");
    } else if (token.startsWith("--")) {
      const [rawName, inlineValue] = token.slice(2).split(/=(.*)/s, 2);
      const expectsValue = rawName === "since" || rawName === "repo";
      const nextValue = rest[index + 1];
      const value = inlineValue ?? (expectsValue ? nextValue : "true");
      if (expectsValue && (!value || value.startsWith("--"))) {
        throw new UsageError(`Missing operand for --${rawName}.`);
      }
      if (expectsValue && inlineValue === undefined) {
        index += 1;
      }
      flags.set(rawName, value ?? "");
    } else {
      positionals.push(token);
    }
  }

  return { command, positionals, flags };
}

function validateCommand(
  args: ParsedArgs,
  contract: { flags?: string[]; positionals: number },
): void {
  const allowedFlags = new Set(["help", ...(contract.flags ?? [])]);
  for (const flag of args.flags.keys()) {
    if (!allowedFlags.has(flag)) {
      throw new UsageError(`Unsupported option for ${args.command}: --${flag}`);
    }
  }

  if (args.positionals.length > contract.positionals) {
    throw new UsageError(`Too many arguments for ${args.command}.`);
  }
}

function requiredPositional(args: ParsedArgs, index: number, message: string): string {
  const value = args.positionals[index];
  if (!value) {
    throw new UsageError(message);
  }

  return value;
}

main().catch((error: unknown) => {
  const detail = error instanceof Error ? error.message : String(error);
  const message = error instanceof UsageError ? `${detail}\n\n${usage()}` : detail;
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
