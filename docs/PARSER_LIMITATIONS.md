# Parser limitations

ToolBill is a best-effort local log summarizer, not a lossless importer. Its
fixtures are synthetic, privacy-safe examples; they do not reproduce real user
sessions or contain credentials, personal paths, or project-specific data.

## Structured JSONL

The parser recognizes the normalized event types `command`, `file`, `network`,
`model`, `tool`, `verification`, and `note`. Other event names (including
provider envelopes such as `session_meta`, `response_item`, and `reasoning`)
are ignored. Nested provider-specific payloads are not recursively decoded.
Use normalized records when exact command and file totals matter:

```json
{"type":"command","command":"npm test","exit_code":0,"elapsed_ms":37}
{"type":"file","path":"src/parse.ts","action":"read"}
```

## Text logs

Text parsing recognizes only the documented line prefixes used by the parser,
such as `$ command`, `exec: command`, `read: path`, `tool_call: name`, and
`verification: pass - command`. Timestamps, free-form assistant prose,
multiline tool payloads, and unrecognized provider metadata are not inferred.
A failed verification is recorded as a verification event; parser coverage does
not imply that the underlying command was actually run.

See `fixtures/codex-jsonl-edge-cases.log` and
`fixtures/openclaw-text-edge-cases.log` for synthetic examples of ignored
records and recognized events. Totals describe recognized records only, not a
complete accounting of a provider session.
