// index.ts — snapshot-writer Capability 实现 (GV-6 §三)
// PreCompact hook 调用:把会话关键状态写入 snapshot.json,供下次 SessionStart 读取。
// 借鉴 context-snapshot/src/snapshot-writer.ts 设计,新造为配置驱动 + 提取器模式。

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { readFile } from "node:fs/promises";
import type {
  SnapshotWriterInput,
  SnapshotWriterResult,
  SnapshotData,
  SnapshotExtractor,
  DecisionRef,
  TodoRef,
} from "./types.js";

export * from "./types.js";

// ── 默认提取器 ──

const decisionsExtractor: SnapshotExtractor = {
  name: "decisions",
  async extract(ctx) {
    return ctx.recentDecisions.map((d: DecisionRef) => ({
      id: d.id,
      summary: d.id, // SessionContext 的 DecisionRef 没有 summary,用 id 代替
      confidence: d.confidence,
    }));
  },
};

const todosExtractor: SnapshotExtractor = {
  name: "todos",
  async extract(ctx) {
    return ctx.pendingTodos
      .filter((t: TodoRef) => t.status !== "completed")
      .map((t: TodoRef) => ({
        id: t.id,
        summary: t.summary,
        status: t.status,
      }));
  },
};

const filesChangedExtractor: SnapshotExtractor = {
  name: "files_changed",
  async extract(ctx) {
    // 从 ctx 不可得完整文件列表;留空,由 Hook 层补充
    return [] as string[];
  },
};

const nextActionsExtractor: SnapshotExtractor = {
  name: "next_actions",
  async extract(_ctx) {
    // 尝试从 HANDOFF.md 解析"新会话首动作"段
    // 简化实现:返回空数组,由 handoff-provider 在下次 SessionStart 时直接读 HANDOFF.md
    return [] as string[];
  },
};

/** 默认提取器清单 */
export const DEFAULT_EXTRACTORS: SnapshotExtractor[] = [
  decisionsExtractor,
  todosExtractor,
  filesChangedExtractor,
  nextActionsExtractor,
];

// ── 主函数 ──

export async function snapshotWriter(input: SnapshotWriterInput): Promise<SnapshotWriterResult> {
  const { ctx, args } = input;
  const extractors = args.extractors.length > 0 ? args.extractors : DEFAULT_EXTRACTORS;
  const extractorErrors: string[] = [];
  const fieldsWritten: string[] = [];

  // 1. 遍历提取器
  const extracted: Record<string, unknown> = {};
  for (const ext of extractors) {
    try {
      extracted[ext.name] = await ext.extract(ctx, input.event);
      fieldsWritten.push(ext.name);
    } catch (err) {
      extractorErrors.push(
        `${ext.name}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // 2. 聚合到 SnapshotData
  const snapshot: SnapshotData = {
    schema_version: "1.0",
    session_id: ctx.sessionId,
    compacted_at: new Date().toISOString(),
    ...extracted,
  };

  // 3. 写入文件
  const snapshotPath = args.snapshotPath;
  let content: string;
  try {
    content = JSON.stringify(snapshot, null, 2);
  } catch (err) {
    return {
      intent: "pass",
      metadata: {
        writeError: `JSON stringify failed: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }

  try {
    // 确保父目录存在
    const dir = dirname(snapshotPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(snapshotPath, content, "utf-8");
  } catch (err) {
    // 写入失败 → 不阻断 compact
    return {
      intent: "pass",
      metadata: {
        writeError: err instanceof Error ? err.message : String(err),
        ...(extractorErrors.length > 0 ? { extractorErrors } : {}),
      },
    };
  }

  const metadata: NonNullable<SnapshotWriterResult["metadata"]> = {};
  if (extractorErrors.length > 0) metadata.extractorErrors = extractorErrors;

  return {
    intent: "pass",
    data: {
      snapshotPath,
      bytesWritten: Buffer.byteLength(content, "utf-8"),
      fieldsWritten,
    },
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

// ── 辅助:从 HANDOFF.md 解析"新会话首动作" ──

export async function parseNextActionsFromHandoff(handoffPath: string): Promise<string[]> {
  try {
    const content = await readFile(handoffPath, "utf-8");
    const lines = content.split("\n");
    const startIdx = lines.findIndex((l) => /^#+\s*(新会话首动作|Next Session Actions)/i.test(l));
    if (startIdx === -1) return [];

    const actions: string[] = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      // 遇到下一个同级或更高级标题 → 结束
      if (/^#+\s/.test(line) && i > startIdx) break;
      // 匹配 "1. ..." 或 "- ..." 列表项
      const match = line.match(/^\s*(?:\d+\.|-)\s+(.+)/);
      if (match) actions.push(match[1].trim());
    }
    return actions;
  } catch {
    return [];
  }
}
