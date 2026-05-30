export type CommandCategory =
  | "read"
  | "write"
  | "test"
  | "network"
  | "git"
  | "package"
  | "unknown";

export type EventKind =
  | "command"
  | "file"
  | "network"
  | "model"
  | "tool"
  | "verification"
  | "note";

export interface CommandEvent {
  kind: "command";
  command: string;
  category: CommandCategory;
  exitCode?: number;
  elapsedMs?: number;
  sourceLine?: number;
}

export interface FileEvent {
  kind: "file";
  path: string;
  action: "read" | "write" | "delete" | "touch" | "unknown";
  sourceLine?: number;
}

export interface NetworkEvent {
  kind: "network";
  target: string;
  action?: string;
  sourceLine?: number;
}

export interface ModelEvent {
  kind: "model";
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  sourceLine?: number;
}

export interface ToolEvent {
  kind: "tool";
  name: string;
  input?: unknown;
  sourceLine?: number;
}

export interface VerificationEvent {
  kind: "verification";
  command: string;
  passed: boolean;
  sourceLine?: number;
}

export interface NoteEvent {
  kind: "note";
  message: string;
  sourceLine?: number;
}

export type ToolBillEvent =
  | CommandEvent
  | FileEvent
  | NetworkEvent
  | ModelEvent
  | ToolEvent
  | VerificationEvent
  | NoteEvent;

export interface Totals {
  commands: number;
  filesTouched: number;
  networkActions: number;
  modelInvocations: number;
  toolInvocations: number;
  verificationCommands: number;
  elapsedMs: number;
  byCategory: Record<CommandCategory, number>;
}

export interface Bill {
  source: string;
  parser: "jsonl" | "text";
  events: ToolBillEvent[];
  totals: Totals;
}

export interface GitSummary {
  since: string;
  commits: Array<{
    hash: string;
    subject: string;
    authorName: string;
    authorDate: string;
  }>;
  files: Array<{
    path: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
  totals: {
    commits: number;
    filesChanged: number;
    additions: number;
    deletions: number;
  };
}
