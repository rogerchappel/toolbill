# ToolBill Orchestration

ToolBill is intentionally local-first. The normal workflow is a developer or
agent running the CLI against local logs and the current git repository, then
copying the generated summary into a PR or handoff note.

## Local Flow

1. Capture an agent run log as text or JSONL.
2. Run `toolbill summarize <log-file>` for a markdown bill.
3. Run `toolbill json <log-file>` when another tool needs structured output.
4. Run `toolbill git --since <ref>` to summarize commits and changed files.
5. Attach the useful output to the PR, issue, or handoff document.

## Release Flow

1. Run `npm run release:check`.
2. Run `bash scripts/validate.sh`.
3. Open a PR from a release-candidate branch.
4. Let CI run repository hygiene and ReleaseBox dry-run checks.
5. Tag reviewed releases from `main`.

## Boundaries

- No network calls are made by the CLI except the user-invoked `git` executable
  reading local repository state.
- No logs are uploaded.
- No hidden telemetry is collected.
- Publishing is disabled by default in `releasebox.config.json`.
