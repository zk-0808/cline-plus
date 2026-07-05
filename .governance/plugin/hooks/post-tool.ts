// hooks/post-tool.ts — PostToolUse hook dispatcher (占位)
// 本次交付:纯占位,无可跑 Capability。
// 未来:接入 rule-appender 自动判断经验沉淀。

import type { SessionContext } from "../types.js";

export interface PostToolResult {
  errors: string[];
}

export async function dispatchPostTool(
  _ctx: SessionContext,
  _toolName: string,
  _isError: boolean,
): Promise<PostToolResult> {
  // 占位——未来接入 rule-appender
  return { errors: [] };
}
