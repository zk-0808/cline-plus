// hooks/pre-compact.ts — PreCompact hook dispatcher
// 在 beforeModel() 中调用(通过长度突变检测 compaction),负责:
// 1. 检测 compaction 发生(messages 长度骤减)
// 2. 调用 snapshot-writer 写入 snapshot.json

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
