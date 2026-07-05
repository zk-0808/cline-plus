// hooks/pre-tool.ts — PreToolUse hook dispatcher
// 在 beforeTool() 中调用,负责:
// 1. 调用 git-checker 检测未 commit 文件堆积 → block/pass

import { gitChecker } from "../../capabilities/git-checker/index.js";
import type {
  SessionContext,
  HookEvent,
  PreToolHookConfig,
} from "../types.js";

export interface PreToolResult {
  /** 是否跳过工具调用 */
  skip: boolean;
  /** 跳过理由 (skip=true 时填充) */
  reason?: string;
  /** 诊断信息 */
  errors: string[];
}

export async function dispatchPreTool(
  ctx: SessionContext,
  config: PreToolHookConfig,
  toolName: string,
  toolArgs?: unknown,
): Promise<PreToolResult> {
  const errors: string[] = [];

  // skipTools 白名单
  if (config.skipTools?.includes(toolName)) {
    return { skip: false, errors };
  }

  // git-checker (PreToolUse → block/pass)
  if (config.capabilities.gitChecker.enabled) {
    try {
      const event: HookEvent = {
        type: "PreToolUse",
        timestamp: new Date().toISOString(),
        toolName,
        toolArgs,
      };

      const result = await gitChecker({
        ctx,
        event,
        args: config.capabilities.gitChecker.args,
      });

      if (result.intent === "block" && result.data?.reason) {
        return { skip: true, reason: result.data.reason, errors };
      }
    } catch (err) {
      errors.push(
        `git-checker: ${err instanceof Error ? err.message : String(err)}`,
      );
      // 失败不阻断 (避免误伤)
    }
  }

  return { skip: false, errors };
}
