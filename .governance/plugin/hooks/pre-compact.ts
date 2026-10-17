// hooks/pre-compact.ts — PreCompact hook dispatcher
// 在 beforeModel() 中调用(通过长度突变检测 compaction),负责:
// 1. 检测 compaction 发生(messages 长度骤减)
// 2. 调用 snapshot-writer 写入 snapshot.json
//
// ⚠️ 待答复的决策-实现缺口（2026-10-17 记）：
//    ADR-005 的 Status 写的是「compact-observer 改为 hook 原生 condense 事件，不做自研 token 判断」，
//    但下面 detectCompaction() 并没有读任何原生 condense 信号 —— 它按消息条数比例自己推断压缩是否发生。
//    这不是已被否掉的那种错误（自研 token 估算 / COMPACT_AT_RATIO 阈值都不在了），但仍属于
//    ADR-006 §0 元规则自检第 1 条点名的「自研压缩逻辑」。
//    要修必须先回答：beforeModel 的上下文里能否拿到原生 condense 事件？
//    详见 docs/decisions/adr/REVIEW-QUEUE.md 的「ADR-006 的本地自查结果」一节。

import { join } from "node:path";
import { snapshotWriter, DEFAULT_EXTRACTORS } from "../../capabilities/snapshot-writer/index.js";
import type {
  SessionContext,
  HookEvent,
  PreCompactHookConfig,
} from "../types.js";

export interface PreCompactResult {
  /** compaction 是否被检测到 */
  compacted: boolean;
  /** snapshot 是否写入成功 */
  snapshotWritten: boolean;
  /** 诊断信息 */
  errors: string[];
}

/**
 * 检测 compaction 是否发生
 * 方案 A (借鉴 context-snapshot):messages 长度骤减到 <50%
 */
export function detectCompaction(
  preMessages: unknown[] | null,
  postMessages: unknown[],
): boolean {
  if (!preMessages) return false;
  if (preMessages.length <= 4) return false;
  return postMessages.length < preMessages.length * 0.5;
}

export async function dispatchPreCompact(
  ctx: SessionContext,
  config: PreCompactHookConfig,
  preMessages: unknown[] | null,
  postMessages: unknown[],
  workspacePath: string,
): Promise<PreCompactResult> {
  const errors: string[] = [];
  const compacted = detectCompaction(preMessages, postMessages);

  if (!compacted) {
    return { compacted: false, snapshotWritten: false, errors };
  }

  // compaction 检测到 → 调用 snapshot-writer
  if (!config.capabilities.snapshotWriter.enabled) {
    return { compacted: true, snapshotWritten: false, errors };
  }

  try {
    const event: HookEvent = {
      type: "PreCompact",
      timestamp: new Date().toISOString(),
    };

    const result = await snapshotWriter({
      ctx: { ...ctx, compactCount: ctx.compactCount + 1 },
      event,
      args: {
        snapshotPath: join(workspacePath, config.capabilities.snapshotWriter.args.snapshotPath),
        extractors: DEFAULT_EXTRACTORS,
      },
    });

    if (result.metadata?.writeError) {
      errors.push(`snapshot-writer: ${result.metadata.writeError}`);
    }
    if (result.metadata?.extractorErrors?.length) {
      errors.push(...result.metadata.extractorErrors.map((e) => `extractor: ${e}`));
    }

    return {
      compacted: true,
      snapshotWritten: result.data?.bytesWritten !== undefined,
      errors,
    };
  } catch (err) {
    errors.push(`snapshot-writer: ${err instanceof Error ? err.message : String(err)}`);
    return { compacted: true, snapshotWritten: false, errors };
  }
}
