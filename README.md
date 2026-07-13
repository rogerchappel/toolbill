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

Summarize the current repo since a ref:

```sh
npm exec -- toolbill git --since origin/main
```

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
