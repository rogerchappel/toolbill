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

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);

  if (!args.command || args.command === "help" || args.flags.has("help")) {
    process.stdout.write(usage());
    return;
  }

  if (args.command === "summarize") {
    const filePath = requiredPositional(args, 0, "Missing log file.");
    const bill = await parseLogFile(filePath);
    process.stdout.write(renderMarkdownBill(bill));
    return;
  }

  if (args.command === "json") {
    const filePath = requiredPositional(args, 0, "Missing log file.");
    const bill = await parseLogFile(filePath);
    process.stdout.write(`${JSON.stringify(bill, null, 2)}\n`);
    return;
  }

  if (args.command === "git") {
    const since = args.flags.get("since");
    if (!since) {
      throw new Error("Missing required --since <ref>.");
    }

    const repo = args.flags.get("repo");
    const summary = summarizeGit(since, repo ? { cwd: repo } : {});
    process.stdout.write(renderMarkdownGitSummary(summary));
    return;
  }

  throw new Error(`Unknown command: ${args.command}\n\n${usage()}`);
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

    if (token.startsWith("--")) {
      const [rawName, inlineValue] = token.slice(2).split(/=(.*)/s, 2);
      const expectsValue = rawName === "since" || rawName === "repo";
      const value = inlineValue ?? (expectsValue ? rest[index + 1] : "true");
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

function requiredPositional(args: ParsedArgs, index: number, message: string): string {
  const value = args.positionals[index];
  if (!value) {
    throw new Error(message);
  }

  return value;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
