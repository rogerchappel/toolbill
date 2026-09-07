# ToolBill

ToolBill is a local-first CLI that turns coding-agent logs and git changes into
a compact bill of materials. It is meant for PR review, handoff notes, and local
audit trails when an agent touched a repo.

## Status

This repository is early-stage. The MVP parser handles simple OpenClaw/Codex-like
text logs and JSONL event streams. It does not call vendor APIs, upload logs, or
estimate token costs unless those values are already present in the input.

## Install

```sh
npm install
npm run build
```

## Use

Render a markdown bill from a text log:

```sh
npm exec -- toolbill summarize fixtures/openclaw-text.log
```

Emit machine-readable JSON from JSONL:

```sh
npm exec -- toolbill json fixtures/codex-jsonl.log
```

JSONL detection tolerates real-world partial logs. If at least one non-empty
line is a JSON object, valid object records are retained. Unsupported typed
objects become `note` events containing their stable JSON content and original
line number; malformed JSON and JSON values that are not objects become `note`
events identifying their original line numbers. Leading and trailing blank
lines are ignored. Inputs with no JSON object records continue through the
text-log parser.

For JSON object records, a recognized `type` (or `kind`/`event`) determines the
event even when the record also contains incidental fields such as `path` or
`file`. Untyped records may still be inferred as command or file events.
Verification results accept JSON booleans, numeric `1`/`0`, and the exact
strings `true`/`false`, `pass`/`fail`, or `passed`/`failed`. Any other or missing
verification result is retained as an unparsed `note`; it is never coerced by
JavaScript truthiness into a reported pass or failure.

`Network-like actions` counts both explicit network events and commands that
perform a recognized remote operation. This includes `git clone`, `fetch`,
`pull`, and `push`, plus supported `npm`, `pnpm`, and `yarn` operations such as
`install`, `add`, `update`, and `publish`; `npm ci` is also counted because it
installs locked dependencies from the registry. Those commands keep their useful
`git` or `package` category; local operations such as `git status` and
`npm pack` do not increment the network total. Each input record is one
observable action, so an explicit network event and a network-performing
command are counted separately even when they name the same target. JSON and
Markdown reports use the same total, while `byCategory` remains the mutually
exclusive command-category breakdown.

Summarize the current repo since a ref:

```sh
npm exec -- toolbill git --since origin/main
```

Git summaries classify each changed path as `added`, `deleted`, `modified`, or
`renamed` while retaining its numstat addition and deletion counts. Renames use
an explicit `old/path => new/path` form, including changes that Git internally
abbreviates with braces. Representative file output looks like:

```md
- added `docs/guide.md` (+24/-0)
- deleted `docs/legacy.md` (+0/-18)
- modified `README.md` (+6/-2)
- renamed `src/old.ts => src/new.ts` (+0/-0)
```

### CLI contract

- `summarize` and `json` each accept exactly one log-file argument and no
  command-specific options.
- `git` requires `--since <ref>`, optionally accepts `--repo <path>`, and does
  not accept positional arguments.
- `--help` (or `-h`) prints usage and exits successfully. Unknown options,
  missing option operands, missing required arguments, and extra positional
  arguments print a usage error to stderr and exit with status 1.

## Sample PR Comment

```md
# ToolBill Summary: openclaw-text.log

Parser: `text`

## Totals

- Commands: 2
- Files touched: 2
- Network-like actions: 1
- Model invocations: 1
- Tool invocations: 1
- Verification commands: 1
- Elapsed time: not recorded

## Command Classes

- read: 1
- write: 1
- test: 0
- network: 0
- git: 0
- package: 0
- unknown: 0
```

## Verify

Run the release check before opening a pull request:

```sh
npm run release:check
```

For repository hygiene checks, run:

```sh
bash scripts/validate.sh
```

For npm package contents, run:

```sh
npm run package:smoke
```

The package smoke builds the CLI, runs `npm pack --dry-run --json`, and fails if
the tarball is missing the CLI runtime, type declarations, fixtures, support
docs, or repository policy files expected by users.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes
should be small, reviewable, and verified before review.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## Limitations

- ToolBill summarizes observable log and git-change evidence; it does not prove
  that every command, file, or model action from a run was captured.
- Parsers intentionally avoid vendor APIs and remote lookups, so token costs,
  elapsed time, and model names are reported only when present in the input.
- Generated bills are review aids for maintainers. Treat them as release or PR
  evidence to inspect, not as an automatic approval signal.

## License

MIT
