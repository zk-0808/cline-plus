// hooks/session-start.ts — SessionStart hook dispatcher
// 在 setup() 中调用,负责:
// 1. 调用 handoff-provider 读取 HANDOFF.md + snapshot.json + constitution + rules/ → 注入
// 2. 调用 git-checker 检测 dirty count → 注入感知

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { handoffProvider } from "../../capabilities/handoff-provider/index.js";
import { gitChecker } from "../../capabilities/git-checker/index.js";
import type {
  SessionContext,
  HookEvent,
  HooksConfig,
  SessionStartHookConfig,
} from "../types.js";

export interface SessionStartResult {
  /** 注入到 registerRule 的内容 */
  ruleContent: string;
  /** 注入来源列表 */
  sources: string[];
  /** 诊断信息 */
  errors: string[];
}

export async function dispatchSessionStart(
  ctx: SessionContext,
  config: SessionStartHookConfig,
  workspacePath: string,
): Promise<SessionStartResult> {
  const errors: string[] = [];
  const ruleParts: string[] = [];
  const sources: string[] = [];
  const event: HookEvent = {
    type: "SessionStart",
    timestamp: new Date().toISOString(),
  };

  // 1. handoff-provider
  if (config.capabilities.handoffProvider.enabled) {
    try {
      const args = config.capabilities.handoffProvider.args;
      const result = await handoffProvider({
        ctx,
        event,
        args: {
          handoffPath: join(workspacePath, args.handoffPath),
          snapshotPath: join(workspacePath, args.snapshotPath),
          constitutionPath: join(workspacePath, args.constitutionPath),
          rulesDir: join(workspacePath, args.rulesDir),
        },
      });

      if (result.intent === "inject" && result.data.additionalContext) {
        ruleParts.push(result.data.additionalContext);
        sources.push(...result.data.sources);
      }

      if (result.metadata?.parseErrors?.length) {
        errors.push(...result.metadata.parseErrors.map((e) => `handoff-provider: ${e}`));
      }
    } catch (err) {
      errors.push(
        `handoff-provider: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // 2. git-checker (SessionStart → inject)
  if (config.capabilities.gitChecker.enabled) {
    try {
      const result = await gitChecker({
        ctx,
        event,
        args: config.capabilities.gitChecker.args,
      });

      if (result.intent === "inject" && result.data) {
        const d = result.data;
        ruleParts.push(
          `## Git Status\n\n- Branch: ${result.metadata?.gitBranch ?? "_(unknown)_"}\n- Last commit: ${result.metadata?.lastCommitHash ?? "_(unknown)_"}\n- Uncommitted files: ${d.dirtyCount} (threshold: ${d.threshold})\n${d.dirtyCount > 0 ? `- Files: ${(d.dirtyFiles ?? []).slice(0, 10).join(", ")}${d.dirtyCount > 10 ? ` ... and ${d.dirtyCount - 10} more` : ""}` : ""}`,
        );
      }
    } catch (err) {
      errors.push(
        `git-checker: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return {
    ruleContent: ruleParts.join("\n\n---\n\n"),
    sources,
    errors,
  };
}
