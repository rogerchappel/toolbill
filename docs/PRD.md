# ToolBill PRD

Status: in-progress

## Summary

ToolBill is a local-first CLI that turns agent run logs into a compact bill of materials: commands run, files touched, network-like actions, model/tool invocations, elapsed time, and verification evidence. It helps developers understand what a coding-agent session actually did before they merge, share, or rerun it.

## Why now

Terminal-native coding agents and multi-agent workflows are mainstream in 2026. Developers are delegating more work but still need clear accounting for changes, tests, and tool use. Survey and landscape reports repeatedly point at agent observability and "what did each agent do?" as an operational pain.

Sources/inspiration:

- 2026 developer-agent survey snippet on tracking multiple agents: https://ivern.ai/blog/state-of-ai-agents-developer-survey-2026
- Terminal-agent ecosystem surveys noting Claude Code, Codex CLI, OpenCode, Aider, Goose, and others as common local workflows.
- Existing local-first repo garden tools such as `runledger` and `envreceipt`; ToolBill is narrower: a per-run bill of materials from logs and git state.

## Users

- Developers reviewing autonomous agent work.
- Maintainers who want a concise local audit artifact in PRs.
- Agent operators comparing multiple runs on the same task.

## MVP

- CLI commands:
  - `toolbill summarize <log-file>` renders markdown.
  - `toolbill json <log-file>` emits machine-readable events and totals.
  - `toolbill git --since <ref>` summarizes changed files and commits.
- Parsers for simple OpenClaw/Codex-like text logs and JSONL events.
- Classify commands as read, write, test, network, git, package, or unknown.
- Fixture-backed tests for log parsing and git summary output.
- README with sample PR comment output.

## Non-goals

- No vendor API calls.
- No secret upload or telemetry.
- No attempt to infer token costs without explicit input.

## Success criteria

- A user can feed fixture logs and get a useful local markdown summary.
- Git summary works in a temporary repo during tests.
- Release notes explain current parser limitations.

