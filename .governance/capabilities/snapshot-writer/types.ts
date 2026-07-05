// types.ts — snapshot-writer Capability 类型定义 (GV-6 §三)
// 零依赖,仅 TypeScript 类型导出。

export interface DecisionRef {
  id: string;
  confidence: "Verified" | "Likely" | "Hypothesis";
}

export interface TodoRef {
  id: string;
  summary: string;
  status: "pending" | "in_progress" | "completed";
}

export interface SessionContext {
  cwd: string;
  gitBranch?: string;
  gitDirtyCount: number;
  sessionId: string;
  startedAt: string;
  loadedRules: string[];
  compactCount: number;
  recentDecisions: DecisionRef[];
  pendingTodos: TodoRef[];
}

export interface HookEvent {
  type: "SessionStart" | "PreToolUse" | "PostToolUse" | "PreCompact";
  timestamp: string;
  toolName?: string;
  toolArgs?: unknown;
  additionalContext?: string;
}

export interface CapabilityInput {
  ctx: SessionContext;
  event: HookEvent;
}

/** 提取器接口——从会话状态提取快照字段 */
export interface SnapshotExtractor {
  name: string;
  extract: (ctx: SessionContext, event: HookEvent) => Promise<unknown>;
}

export interface SnapshotWriterInput extends CapabilityInput {
  args: {
    snapshotPath: string;
    extractors: SnapshotExtractor[];
  };
}

export interface SnapshotWriterResult {
  intent: "pass"; // 永不阻断 compact
  data?: {
    snapshotPath: string;
    bytesWritten: number;
    fieldsWritten: string[];
  };
  metadata?: {
    writeError?: string;
    extractorErrors?: string[];
  };
}

/** snapshot.json 运行时形状 */
export interface SnapshotData {
  schema_version: string;
  session_id: string;
  compacted_at: string;
  decisions?: unknown;
  active_todos?: unknown;
  files_changed?: string[];
  next_actions?: string[];
}
