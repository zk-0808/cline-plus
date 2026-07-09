// 类型定义——抽取自 .governance/capabilities/README.md §一(共用类型)与 §五(rule-appender)
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

/** rule-appender 输入。见 capabilities/README.md §五。 */
export interface RuleAppenderInput extends CapabilityInput {
  args: {
    handoffPath: string;
    experience: { id: string; content: string; source: string };
    overwrite?: boolean; // 默认 false
  };
}

/** rule-appender 输出。intent 永为 "pass"。 */
export interface RuleAppenderResult {
  intent: "pass";
  data?: {
    appended: boolean;
    targetPath: string;
    appendedId: string;
    duplicateId?: string;
  };
  metadata?: {
    parseError?: string;
    writeError?: string;
  };
}
