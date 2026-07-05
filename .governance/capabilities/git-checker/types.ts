// types.ts — git-checker Capability 类型定义 (GV-6 §二)
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

/** 会话状态——Capability 调用时的运行时上下文(只读)。 */
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

/** Hook 事件——触发 Capability 调用的来源。 */
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

export interface GitCheckerInput extends CapabilityInput {
  args: {
    threshold: number;
    excludePatterns?: string[];
  };
}

export interface GitCheckerResult {
  intent: "pass" | "block" | "inject";
  data?: {
    dirtyCount: number;
    dirtyFiles?: string[];
    threshold: number;
    reason?: string;
  };
  metadata?: {
    gitBranch?: string;
    lastCommitHash?: string;
    error?: string;
  };
}
