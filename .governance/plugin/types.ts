// types.ts — Plugin 运行时共享类型
// 定义配置结构 + 统一 Capability 调用接口。
// 注意:现有 handoff-provider 用 ctx/event,rule-appender 用 context/trigger。
// 本文件定义统一接口,dispatchers 负责适配。

// ── 会话上下文 (与 GV-6 §一一致) ──

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

// ── 配置类型 (对应 hooks/config.json) ──

export interface HandoffProviderConfig {
  enabled: boolean;
  args: {
    handoffPath: string;
    snapshotPath: string;
    constitutionPath: string;
    rulesDir: string;
  };
}

export interface GitCheckerConfig {
  enabled: boolean;
  args: {
    threshold: number;
    excludePatterns?: string[];
  };
}

export interface SnapshotWriterConfig {
  enabled: boolean;
  args: {
    snapshotPath: string;
    extractors?: string[]; // 提取器名列表,空则用默认
  };
}

export interface SessionStartHookConfig {
  enabled: boolean;
  capabilities: {
    handoffProvider: HandoffProviderConfig;
    gitChecker: GitCheckerConfig;
  };
}

export interface PreToolHookConfig {
  enabled: boolean;
  capabilities: {
    gitChecker: GitCheckerConfig;
  };
  skipTools?: string[];
}

export interface PostToolHookConfig {
  enabled: boolean;
  customChecks?: unknown[];
}

export interface PreCompactHookConfig {
  enabled: boolean;
  capabilities: {
    snapshotWriter: SnapshotWriterConfig;
  };
}

export interface HooksConfig {
  "session-start"?: SessionStartHookConfig;
  "pre-tool"?: PreToolHookConfig;
  "post-tool"?: PostToolHookConfig;
  "pre-compact"?: PreCompactHookConfig;
}

// ── 默认配置 ──

export const DEFAULT_CONFIG: HooksConfig = {
  "session-start": {
    enabled: true,
    capabilities: {
      handoffProvider: {
        enabled: true,
        args: {
          handoffPath: "HANDOFF.md",
          snapshotPath: ".governance/runtime/snapshot.json",
          constitutionPath: ".governance/core/constitution.md",
          rulesDir: ".governance/rules/",
        },
      },
      gitChecker: {
        enabled: true,
        args: {
          threshold: 5,
          excludePatterns: ["node_modules/", "dist/", ".git/"],
        },
      },
    },
  },
  "pre-tool": {
    enabled: true,
    skipTools: ["read_file", "list_dir", "read_file", "grep_search", "codebase_search"],
    capabilities: {
      gitChecker: {
        enabled: true,
        args: {
          threshold: 5,
          excludePatterns: ["node_modules/", "dist/", ".git/"],
        },
      },
    },
  },
  "post-tool": {
    enabled: false,
  },
  "pre-compact": {
    enabled: true,
    capabilities: {
      snapshotWriter: {
        enabled: true,
        args: {
          snapshotPath: ".governance/runtime/snapshot.json",
        },
      },
    },
  },
};

// ── Plugin 内部状态 ──

export interface PluginState {
  workspacePath: string;
  sessionId: string;
  startedAt: string;
  config: HooksConfig;
  // compaction 检测状态
  lastFullMessages: unknown[] | null;
  compactCount: number;
  // git-checker 频率控制
  toolCallCount: number;
}
