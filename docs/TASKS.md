# ToolBill Tasks

Status: active

## MVP Complete

- TypeScript CLI package scaffold.
- Text and JSONL log parsing.
- Command classification for read, write, test, network, git, package, and unknown commands.
- Markdown and JSON log bill output.
- Git summary output for commits and changed files since a ref.
- Fixture-backed parser and git summary tests.
- Release check, smoke check, and npm package dry run.

## Next

- Add more real-world fixtures from Codex, OpenClaw, and other local coding-agent logs.
- Improve git file status detection beyond aggregate numstat output.
- Add optional redaction helpers for paths or values users do not want in PR comments.
- Document parser limitations with examples as new fixtures are added.

## Later

- Compare multiple agent runs for the same task.
- Add configurable output sections for PR templates.
- Support additional structured log formats without introducing telemetry or vendor API calls.
