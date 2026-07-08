// index.ts — Governance Plugin 入口
// 框架 CLI 端运行时:配置驱动 + Capability 静态导入 + Hook 分发。
//
// 架构决策 (runtime-plugin-newbuild):
//   Q1 单一/多 plugin → 单一 plugin,所有 hooks 在一个入口
//   Q2 dynamic/static → 静态导入 + config.json 驱动分发
//   Q3 预编译方式    → Raw TypeScript,Cline CLI 原生加载
//   Q4 目录位置      → .governance/plugin/
//
// 借鉴 context-snapshot/src/index.ts 的 hook 注册模式,但架构不同:
//   - context-snapshot: 直接内联逻辑
//   - 框架: 配置驱动 + Capability 模块化 + Hook dispatcher 分离

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { loadConfig } from "./config-loader.js";
import { detectCompaction, dispatchPreCompact } from "./hooks/pre-compact.js";
import { traceSync, estTokens } from "../capabilities/tracer/index.js";
import { processStaleness } from "./staleness-utils.js";
import type { PluginState, SessionContext, HooksConfig } from "./types.js";

const PLUGIN_NAME = "governance";

// ── Plugin 全局状态 ──
const state: PluginState = {
  workspacePath: process.cwd(),
  sessionId: randomUUID(),
  startedAt: new Date().toISOString(),
  config: {} as HooksConfig,
  lastFullMessages: null,
  compactCount: 0,
  toolCallCount: 0,
  tracePath: ".governance/runtime/traces.jsonl",
  traceEnabled: true,
};

// ── 预加载内容 (setup 同步完成,content() 只读) ──
let sessionContextContent = "";

// ── 写入类工具名(只在写入类工具后检查 git,降低开销) ──
const WRITE_TOOL_NAMES = new Set([
  "write_to_file",
  "replace_in_file",
  "execute_command",
  "insert_content",
  "search_and_replace",
  "editor",
  "applyPatch",
  "run_commands",
  "bash",
  "write",
  "edit",
  "multi_edit",
]);

// ── 构造 SessionContext ──
function buildSessionContext(): SessionContext {
  return {
    cwd: state.workspacePath,
    gitDirtyCount: 0,
    sessionId: state.sessionId,
    startedAt: state.startedAt,
    loadedRules: [],
    compactCount: state.compactCount,
    recentDecisions: [],
    pendingTodos: [],
  };
}

// ── 同步预加载:读取 constitution + rules + handoff + snapshot + git status ──
function preloadSessionContext(workspacePath: string): void {
  const config = state.config["session-start"];
  if (!config?.enabled) return;

  const parts: string[] = [];
  const errors: string[] = [];

  // 1. handoff-provider (同步版) — 带行为指令前缀
  //    借鉴 context-snapshot ADR-007 实测经验：
  //    - 不加行为指令 → cline 训练偏好压过注入，模型先 search/read 文件
  //    - 加 "DO NOT RE-READ" 指令 → 模型直接引用注入内容
  if (config.capabilities.handoffProvider.enabled) {
    const args = config.capabilities.handoffProvider.args;
    // Behavioral instruction prefix — validated by Round 2 prefix decomposition (n=10)
    // R2-A1 (factual only):   100% tool call rate, 100% redundant read rate
    // R2-A2 (imperative only): 100% tool call rate, 100% redundant read rate
    // R2-A3 (both = this):     20% tool call rate, 10% redundant read rate
    // KEY FINDING: Synergistic effect — neither component alone is effective.
    // The combination creates a phase transition. DO NOT simplify by removing either.
    const md: string[] = [
      "# GOVERNANCE SESSION CONTEXT (AUTO-INJECTED — DO NOT RE-READ FILES)",
      "",
      "The following project context is auto-loaded by the governance plugin.",
      "When answering questions about project state, constitution, rules, handoff, git status, or snapshots:",
      "1. USE the information below DIRECTLY — do NOT call readFile/search/run_commands to re-read these files",
      "2. If the user asks about constitution rules, quote from the 'Core Constitution' section below",
      "3. If the user asks about git status, quote from the 'Git Status' section below",
      "4. If the user asks about handoff or pending todos, quote from the 'Handoff' section below",
      "5. Only call tools if the requested information is NOT in the context below",
      "",
      "--- CONTEXT START ---",
      "",
    ];

    // constitution (必读)
    try {
      const constitutionPath = join(workspacePath, args.constitutionPath);
      const constitution = readFileSync(constitutionPath, "utf8");
      md.push("## Core Constitution", constitution, "");
    } catch (err) {
      errors.push(`constitution: ${err instanceof Error ? err.message : String(err)}`);
    }

    // rules 目录下所有 .md
    try {
      const rulesDir = join(workspacePath, args.rulesDir);
      const entries = readdirSync(rulesDir);
      const mdFiles = entries.filter((f) => f.endsWith(".md")).sort();
      const blocks: string[] = [];
      for (const f of mdFiles) {
        try {
          const content = readFileSync(join(rulesDir, f), "utf8");
          blocks.push(`### ${f}\n\n${content}`);
        } catch {
          // 跳过单个文件读取失败
        }
      }
      md.push("## Active Rules", blocks.join("\n\n") || "_(无规则文件)_", "");
    } catch (err) {
      errors.push(`rules dir: ${err instanceof Error ? err.message : String(err)}`);
    }

    // HANDOFF.md
    try {
      const handoffPath = join(workspacePath, args.handoffPath);
      let handoff = readFileSync(handoffPath, "utf8");
      // P0: process staleness
      const stalenessResult = processStaleness(handoff);
      handoff = stalenessResult.content;
      if (stalenessResult.staleCount > 0 || stalenessResult.agingCount > 0) {
        handoff += "\n\n> **[Staleness Summary]** " + stalenessResult.staleCount + " stale, " + stalenessResult.agingCount + " aging entries detected.";
      }
      // P1: trace staleness metrics
      if (state.traceEnabled) {
        traceSync({
          session_id: state.sessionId,
          hook: "session-start",
          capability: "stalenessSweeper",
          event: "sweep",
          metrics: { stale_count: stalenessResult.staleCount, filtered_count: stalenessResult.filteredCount },
          workspacePath: state.workspacePath,
          tracePath: state.tracePath,
        });
      }
md.push("## Handoff", handoff, "");
    } catch {
      md.push(
        "## Handoff",
        "> HANDOFF.md 不存在。建议创建(参考 .governance/examples/handoff-example.md)",
        "",
      );
    }

    // snapshot.json
    try {
      const snapshotPath = join(workspacePath, args.snapshotPath);
      const snapshotRaw = readFileSync(snapshotPath, "utf8");
      const snap = JSON.parse(snapshotRaw);
      const snapLines: string[] = ["## Snapshot", ""];
      snapLines.push(`- compacted_at: ${snap.compacted_at ?? "_(缺失)_"}`);
      snapLines.push(`- session_id: ${snap.session_id ?? "_(缺失)_"}`);
      if (Array.isArray(snap.decisions) && snap.decisions.length > 0) {
        snapLines.push("- decisions:");
        for (const d of snap.decisions) {
          snapLines.push(`  - ${d.id}: ${d.confidence ?? "?"}`);
        }
      }
      if (Array.isArray(snap.active_todos) && snap.active_todos.length > 0) {
        snapLines.push("- active_todos:");
        for (const t of snap.active_todos) {
          snapLines.push(`  - ${t.id}: ${t.summary ?? ""}`);
        }
      }
      if (Array.isArray(snap.next_actions) && snap.next_actions.length > 0) {
        snapLines.push("- next_actions:");
        snap.next_actions.forEach((a: string, i: number) => snapLines.push(`  ${i + 1}. ${a}`));
      }
      md.push(snapLines.join("\n"), "");
    } catch {
      // snapshot 不存在或解析失败 → 跳过
    }

    md.push("--- CONTEXT END ---");
    parts.push(md.join("\n"));
  }

  // 2. git-checker (SessionStart → inject, 同步版)
  if (config.capabilities.gitChecker.enabled) {
    try {
      const cwd = workspacePath;
      if (existsSync(join(cwd, ".git"))) {
        const output = execSync("git status --porcelain", {
          cwd,
          encoding: "utf-8",
          timeout: 5000,
          stdio: ["pipe", "pipe", "pipe"],
        });
        const lines = output.trim().split("\n").filter((l) => l.length > 0);
        const excludePatterns = config.capabilities.gitChecker.args.excludePatterns ?? [];
        const filteredLines = lines.filter((line) => {
          const filePath = line.slice(3).trim().replace(/^"(.*)"$/, "$1");
          return !excludePatterns.some((p) => filePath.startsWith(p));
        });
        const dirtyCount = filteredLines.length;

        let branch = "_(unknown)_";
        let lastCommit = "_(unknown)_";
        try {
          branch = execSync("git rev-parse --abbrev-ref HEAD", {
            cwd, encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"],
          }).trim();
        } catch { /* ignore */ }
        try {
          lastCommit = execSync("git rev-parse --short HEAD", {
            cwd, encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"],
          }).trim();
        } catch { /* ignore */ }

        const gitLines: string[] = [
          "## Git Status",
          "",
          `- Branch: ${branch}`,
          `- Last commit: ${lastCommit}`,
          `- Uncommitted files: ${dirtyCount} (threshold: ${config.capabilities.gitChecker.args.threshold})`,
        ];
        if (dirtyCount > 0) {
          const files = filteredLines.slice(0, 10).map((l) => l.slice(3).trim());
          gitLines.push(`- Files: ${files.join(", ")}${dirtyCount > 10 ? ` ... and ${dirtyCount - 10} more` : ""}`);
        }
        parts.push(gitLines.join("\n"));
      }
    } catch (err) {
      errors.push(`git-checker: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  sessionContextContent = parts.join("\n\n---\n\n");

  if (errors.length) {
    console.warn(`[${PLUGIN_NAME}] preload errors: ${errors.join("; ")}`);
  }
  console.log(`[${PLUGIN_NAME}] session context preloaded (${sessionContextContent.length} chars)`);
  // P1 tracing: record injection metrics
  if (state.traceEnabled) {
    traceSync({
      session_id: state.sessionId,
      hook: "session-start",
      capability: "handoffProvider",
      event: "inject",
      metrics: { chars: sessionContextContent.length, tokens: estTokens(sessionContextContent.length) },
      workspacePath: state.workspacePath,
      tracePath: state.tracePath,
    });
  }
}

// ── Plugin 定义 ──

export const plugin = {
  name: PLUGIN_NAME,
  manifest: {
    capabilities: ["messageBuilders", "rules", "hooks"],
  },

  setup(api: any, ctx?: any) {
    console.log(`[${PLUGIN_NAME}] setup() called`);

    // 1. 初始化状态
    state.workspacePath = ctx?.workspaceInfo?.rootPath ?? process.cwd();
    state.config = loadConfig(state.workspacePath);

    // 2. Marker file (plugin health check)
    try {
      const runtimeDir = join(state.workspacePath, ".governance", "runtime");
      if (!existsSync(runtimeDir)) {
        mkdirSync(runtimeDir, { recursive: true });
      }
      writeFileSync(
        join(runtimeDir, "plugin-loaded.marker"),
        `loaded at ${new Date().toISOString()}`,
        "utf-8",
      );
    } catch (error) {
      console.error(`[${PLUGIN_NAME}] marker setup failed: ${String(error)}`);
    }

    // 3. 同步预加载 session context (constitution + rules + handoff + snapshot + git)
    preloadSessionContext(state.workspacePath);

    // 4. registerRule:注入 session context
    //    content() 只在 session 启动时求值一次 (ADR-007 验证)
    api.registerRule({
      id: "governance:session-context",
      content: () => sessionContextContent,
    });

    // 5. registerMessageBuilder:保存 compaction 前的完整 messages
    //    借鉴 context-snapshot 的 "snapshot-source-saver" 模式
    api.registerMessageBuilder({
      name: "governance:pre-compact-saver",
      build(messages: unknown[]) {
        state.lastFullMessages = messages;
        return messages;
      },
    });

    console.log(`[${PLUGIN_NAME}] setup() done — capabilities: messageBuilders, rules, hooks`);
  },

  // ── Hooks ──
  // 契约 (agent.d.ts): each hook receives a single `context` object.
  //   beforeTool(context: AgentBeforeToolContext) → { skip?, reason? }
  //   beforeModel(context: AgentBeforeModelContext) → undefined (不修改 messages)
  //   afterTool(context: AgentAfterToolContext) → undefined
  hooks: {
    // PreToolUse:git-checker commit guard (同步,因为 beforeTool 需同步返回 skip)
    beforeTool(context: any) {
      const toolName = context?.toolCall?.toolName ?? "(unknown)";
      const preToolConfig = state.config["pre-tool"];

      if (!preToolConfig?.enabled) return undefined;

      // skipTools 白名单
      const skipTools = preToolConfig.skipTools ?? [];
      if (skipTools.includes(toolName)) return undefined;

      // 只在写入类工具调用时检查
      if (!WRITE_TOOL_NAMES.has(toolName)) return undefined;

      // git-checker (同步,因为 beforeTool 需同步返回 skip)
      if (!preToolConfig.capabilities.gitChecker.enabled) return undefined;

      const cwd = state.workspacePath;
      if (!existsSync(join(cwd, ".git"))) return undefined;

      try {
        const output = execSync("git status --porcelain", {
          cwd,
          encoding: "utf-8",
          timeout: 5000,
          stdio: ["pipe", "pipe", "pipe"],
        });
        const lines = output.trim().split("\n").filter((l: string) => l.length > 0);
        const excludePatterns = preToolConfig.capabilities.gitChecker.args.excludePatterns ?? [];
        const filteredLines = lines.filter((line: string) => {
          const filePath = line.slice(3).trim().replace(/^"(.*)"$/, "$1");
          return !excludePatterns.some((p) => filePath.startsWith(p));
        });
        const dirtyCount = filteredLines.length;
        const threshold = preToolConfig.capabilities.gitChecker.args.threshold;

        if (dirtyCount >= threshold) {
          const reason =
            `未 commit 文件 ≥ ${threshold}（当前 ${dirtyCount} 个）。\n` +
            `请先写 handoff + commit，再继续工具调用。\n` +
            `(tool=${toolName}, blocked by governance pre-tool hook)`;
          console.warn(`[${PLUGIN_NAME}] COMMIT GUARD: ${reason}`);

          // P1 tracing: record block
          if (state.traceEnabled) {
            traceSync({
              session_id: state.sessionId,
              hook: "pre-tool",
              capability: "gitChecker",
              event: "block",
              metrics: { blocked_count: 1 },
              note: toolName,
              workspacePath: state.workspacePath,
              tracePath: state.tracePath,
            });
          }
          return { skip: true, reason };
        }
      } catch {
        // git 失败不阻断 (避免误伤)
      }

      return undefined;
    },

    // PreCompact:检测 compaction + 写 snapshot (异步 fire-and-forget)
    beforeModel(context: any) {
      const currentMessages: unknown[] = context?.request?.messages ?? [];
      const preCompactConfig = state.config["pre-compact"];

      if (!preCompactConfig?.enabled) return undefined;

      // 长度突变检测 (方案 A,借鉴 context-snapshot)
      if (detectCompaction(state.lastFullMessages, currentMessages)) {
        console.log(
          `[${PLUGIN_NAME}] compaction detected — ` +
          `${state.lastFullMessages?.length ?? 0} msgs (pre) → ${currentMessages.length} msgs (post)`,
        );

        state.compactCount++;

        // 异步写 snapshot (不阻塞 beforeModel)
        const sessionCtx = buildSessionContext();
        dispatchPreCompact(
          sessionCtx,
          preCompactConfig,
          state.lastFullMessages,
          currentMessages,
          state.workspacePath,
        )
          .then((result) => {
            if (result.snapshotWritten) {
              console.log(`[${PLUGIN_NAME}] snapshot written successfully`);
              // P1 tracing: record snapshot
              if (state.traceEnabled) {
                traceSync({
                  session_id: state.sessionId,
                  hook: "pre-compact",
                  capability: "snapshotWriter",
                  event: "snapshot",
                  workspacePath: state.workspacePath,
                  tracePath: state.tracePath,
                });
              }
            }
            if (result.errors.length) {
              console.warn(`[${PLUGIN_NAME}] pre-compact errors: ${result.errors.join("; ")}`);
            }
          })
          .catch((err) => {
            console.error(`[${PLUGIN_NAME}] pre-compact failed: ${String(err)}`);
          });

        // 重置,避免重复触发
        state.lastFullMessages = null;
      }

      return undefined; // 不修改 messages (codec bug 规避:返回 undefined)
    },

    // PostToolUse:占位
    afterTool(_context: any) {
      const postToolConfig = state.config["post-tool"];
      if (!postToolConfig?.enabled) return undefined;
      // 占位——未来接入 rule-appender
      return undefined;
    },
  },
};

export default plugin;
