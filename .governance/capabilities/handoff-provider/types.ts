// types.ts — 共用类型(GV-6 §一 + handoff-provider §四)。由 index.ts re-export。

export interface DecisionRef {
  id: string;
  confidence: "Verified" | "Likely" | "Hypothesis";
}

export interface TodoRef {
  id: string;
  summary: string;
  status: "pending" | "in_progress" | "completed";
}

/** 会话状态——Capability 调用时的运行时上下文(只读) */
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

/** Hook 事件——触发 Capability 调用的来源 */
export interface HookEvent {
  type: "SessionStart" | "PreToolUse" | "PostToolUse" | "PreCompact";
  timestamp: string;
  toolName?: string;
  toolArgs?: unknown;
  additionalContext?: string;
}

/** 所有 Capability Input 的基类 */
export interface CapabilityInput {
  ctx: SessionContext;
  event: HookEvent;
}

export interface HandoffProviderInput extends CapabilityInput {
  args: {
    handoffPath: string;
    snapshotPath: string;
    constitutionPath: string;
    rulesDir: string;
  };
}

export interface HandoffProviderResult {
  intent: "inject";
  data: {
    additionalContext: string;
    sources: string[];
  };
  metadata?: {
    handoffMissing?: boolean;
    snapshotMissing?: boolean;
    parseErrors?: string[];
  };
}

// snapshot.json 运行时形状(松校验,字段缺失或类型不符即跳过渲染)
export interface SnapshotDecision {
  id: string;
  summary: string;
  confidence: string;
  depends_on?: string[];
}
export interface SnapshotTodo {
  id: string;
  summary: string;
  status?: string;
}
export interface SnapshotData {
  schema_version?: string;
  session_id?: string;
  compacted_at?: string;
  decisions?: unknown;
  active_todos?: unknown;
  files_changed?: string[];
  next_actions?: unknown;
}
