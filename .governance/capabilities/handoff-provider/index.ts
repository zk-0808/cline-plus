// index.ts — handoff-provider Capability 实现(GV-6 §四)
// SessionStart hook 调用:聚合 HANDOFF.md + snapshot.json + constitution + rules/ 注入会话上下文。

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  HandoffProviderInput,
  HandoffProviderResult,
  SnapshotData,
  SnapshotDecision,
  SnapshotTodo,
} from "./types.js";

export * from "./types.js";

const HANDOFF_MISSING_PROMPT = [
  "> HANDOFF.md 不存在。建议:",
  "> 1. 创建 HANDOFF.md(参考 .governance/examples/handoff-example.md)",
  "> 2. 按 .governance/rules/handoff-entry.md 执行读取门控",
].join("\n");

/** 读文件,异常时记录到 errors 并返回 null(不抛出) */
async function readTextSafe(path: string, errors: string[]): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    errors.push(path);
    return null;
  }
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function renderDecisions(decisions: SnapshotDecision[]): string {
  if (!decisions.length) return "_(无)_";
  const rows = decisions.map((d) => `| ${d.id} | ${d.summary} | ${d.confidence} |`);
  return ["| id | summary | confidence |", "|----|---------|-----------|", ...rows].join("\n");
}

function renderTodos(todos: SnapshotTodo[]): string {
  if (!todos.length) return "_(无)_";
  const rows = todos.map((t) => `| ${t.id} | ${t.summary} |`);
  return ["| id | summary |", "|----|---------|", ...rows].join("\n");
}

function renderActions(actions: string[]): string {
  if (!actions.length) return "_(无)_";
  return actions.map((a, i) => `${i + 1}. ${a}`).join("\n");
}

function renderSnapshot(snap: SnapshotData): string {
  return [
    `- compacted_at: ${snap.compacted_at ?? "_(缺失)_"}`,
    `- session_id: ${snap.session_id ?? "_(缺失)_"}`,
    "- decisions:",
    renderDecisions(asArray<SnapshotDecision>(snap.decisions)),
    "- active_todos:",
    renderTodos(asArray<SnapshotTodo>(snap.active_todos)),
    "- next_actions:",
    renderActions(asArray<string>(snap.next_actions)),
  ].join("\n");
}

export async function handoffProvider(
  input: HandoffProviderInput
): Promise<HandoffProviderResult> {
  const { args } = input;
  const sources: string[] = [];
  const parseErrors: string[] = [];
  const metadata: NonNullable<HandoffProviderResult["metadata"]> = {};

  // 1. constitution(必读,作为永久上下文)
  const constitution = await readTextSafe(args.constitutionPath, parseErrors);
  if (constitution !== null) sources.push(args.constitutionPath);

  // 2. rules 目录下所有 .md(按字典序聚合,每个文件加 ### 文件名 子标题)
  let rulesSection = "";
  try {
    const entries = await readdir(args.rulesDir);
    const mdFiles = entries.filter((f) => f.endsWith(".md")).sort();
    const blocks: string[] = [];
    for (const f of mdFiles) {
      const full = join(args.rulesDir, f);
      const content = await readTextSafe(full, parseErrors);
      if (content !== null) {
        blocks.push(`### ${f}\n\n${content}`);
        sources.push(full);
      }
    }
    rulesSection = blocks.join("\n\n");
  } catch {
    parseErrors.push(args.rulesDir);
  }

  // 3. handoff(不存在则注入空白模板提示,handoffMissing=true)
  let handoffSection: string;
  const handoffContent = await readTextSafe(args.handoffPath, parseErrors);
  if (handoffContent === null) {
    metadata.handoffMissing = true;
    handoffSection = HANDOFF_MISSING_PROMPT;
  } else {
    sources.push(args.handoffPath);
    handoffSection = handoffContent;
  }

  // 4. snapshot(解析失败则跳过 snapshot 段,记录 parseErrors)
  let snapshotSection = "";
  const snapshotRaw = await readTextSafe(args.snapshotPath, parseErrors);
  if (snapshotRaw === null) {
    metadata.snapshotMissing = true;
  } else {
    sources.push(args.snapshotPath);
    try {
      snapshotSection = renderSnapshot(JSON.parse(snapshotRaw) as SnapshotData);
    } catch {
      parseErrors.push(`${args.snapshotPath}: JSON parse failed`);
    }
  }

  if (parseErrors.length) metadata.parseErrors = parseErrors;

  // 5. 聚合 markdown
  const md: string[] = ["# Session Context (auto-injected by handoff-provider)", ""];
  md.push("## Core Constitution", constitution ?? "_(读取失败)_", "");
  md.push("## Active Rules", rulesSection || "_(无规则文件)_", "");
  md.push("## Handoff", handoffSection, "");
  md.push("## Snapshot", snapshotSection || "_(无快照)_");

  return {
    intent: "inject",
    data: { additionalContext: md.join("\n"), sources },
    metadata: Object.keys(metadata).length ? metadata : undefined,
  };
}
