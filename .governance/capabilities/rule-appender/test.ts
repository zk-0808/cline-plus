// rule-appender 自测——使用临时文件,不污染仓库根 HANDOFF.md
// 运行: node --experimental-strip-types test.ts

import { ruleAppender } from "./index.ts";
import { promises as fs, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const tmpDir = join(tmpdir(), `rule-appender-test-${Date.now()}`);
await fs.mkdir(tmpDir, { recursive: true });
const tmpHandoff = join(tmpDir, "HANDOFF.md");

// 模板:复刻仓库根 HANDOFF.md 的结构(精简)
const TEMPLATE = `# Handoff — 会话交接

---

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
|（待填）|

## 待沉淀经验

> 此区由 rule-appender 自动追加,人工 review 后晋升到 rules/ 或删除。
> 晋升流程见 .governance/rules/lifecycle.md。

| id | 经验 | 来源 | 沉淀日期 | 状态 |
|----|------|------|---------|------|
|（空,rule-appender 追加）|

## 新会话首动作

1. 读 constitution
2. 读 HANDOFF
`;

let pass = 0;
let fail = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    console.error(`  ✗ ${msg}`);
  }
}

const baseInput = {
  context: {
    cwd: tmpDir,
    gitDirtyCount: 0,
    sessionId: "test-session",
    startedAt: new Date().toISOString(),
    loadedRules: [],
    compactCount: 0,
    recentDecisions: [],
    pendingTodos: [],
  },
  trigger: { type: "PostToolUse" as const, timestamp: new Date().toISOString() },
};

async function cleanup(): Promise<void> {
  try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
}

async function main(): Promise<void> {
  // ── 场景 1:文件不存在 → 创建模板后追加 ──
  console.log("场景 1:文件不存在,自动创建模板");
  const nonexistent = join(tmpDir, "nested", "missing.md");
  const r1 = await ruleAppender({
    ...baseInput,
    args: {
      handoffPath: nonexistent,
      experience: { id: "exp-new", content: "经验 A", source: "src-1" },
    },
  });
  assert(r1.intent === "pass", "intent = pass");
  assert(r1.data?.appended === true, "appended = true");
  assert(existsSync(nonexistent), "模板文件已创建");
  const c1 = await fs.readFile(nonexistent, "utf-8");
  assert(c1.includes("## 待沉淀经验"), "模板含目标 section");
  assert(c1.includes("| exp-new |"), "新行已写入");

  // ── 场景 2:section 已存在,追加新经验 ──
  console.log("场景 2:section 存在,追加新经验");
  await fs.writeFile(tmpHandoff, TEMPLATE, "utf-8");
  const r2 = await ruleAppender({
    ...baseInput,
    args: {
      handoffPath: tmpHandoff,
      experience: {
        id: "exp-001",
        content: "推论需配边界条件,X 优于 Y 仅在 N≥100 时成立",
        source: "benchmark-run-1",
      },
    },
  });
  assert(r2.data?.appended === true, "appended = true");
  assert(r2.data?.appendedId === "exp-001", "appendedId = exp-001");
  const c2 = await fs.readFile(tmpHandoff, "utf-8");
  assert(c2.includes("## 本会话决策"), "本会话决策 section 保留");
  assert(c2.includes("## 新会话首动作"), "新会话首动作 section 保留");
  assert(c2.includes("|（待填）|"), "原 placeholder 行未被动到(决策表)");
  assert(c2.includes("| exp-001 |"), "新经验行已追加");
  assert(c2.includes("待 review"), "新行含状态列");
  assert(c2.includes("benchmark-run-1"), "新行含 source");
  const idxExp = c2.indexOf("| exp-001 |");
  const idxNext = c2.indexOf("## 新会话首动作");
  const idxSection = c2.indexOf("## 待沉淀经验");
  assert(idxSection < idxExp && idxExp < idxNext, "新行位于待沉淀经验 section 内");

  // ── 场景 3:重复 id 且 overwrite=false → 返回 duplicateId ──
  console.log("场景 3:重复 id 且 overwrite=false");
  const r3 = await ruleAppender({
    ...baseInput,
    args: {
      handoffPath: tmpHandoff,
      experience: { id: "exp-001", content: "试图重复", source: "src-2" },
    },
  });
  assert(r3.data?.appended === false, "appended = false");
  assert(r3.data?.duplicateId === "exp-001", "duplicateId = exp-001");
  const c3 = await fs.readFile(tmpHandoff, "utf-8");
  assert(!c3.includes("试图重复"), "未写入重复内容");
  assert(!c3.includes("src-2"), "未写入新 source");

  // ── 场景 4:重复 id 且 overwrite=true → 替换该行 ──
  console.log("场景 4:重复 id 且 overwrite=true,替换");
  const r4 = await ruleAppender({
    ...baseInput,
    args: {
      handoffPath: tmpHandoff,
      experience: { id: "exp-001", content: "更新后的内容", source: "src-3" },
      overwrite: true,
    },
  });
  assert(r4.data?.appended === true, "appended = true(覆盖成功)");
  const c4 = await fs.readFile(tmpHandoff, "utf-8");
  assert(c4.includes("更新后的内容"), "新内容已写入");
  assert(c4.includes("src-3"), "新 source 已写入");
  const occurrences = (c4.match(/exp-001/g) || []).length;
  assert(occurrences === 1, `exp-001 仅出现 1 次(实际 ${occurrences})`);

  // ── 场景 5:section 不存在 → 自动追加 section ──
  console.log("场景 5:section 不存在,自动追加");
  const noSection = join(tmpDir, "nosection.md");
  await fs.writeFile(noSection, "# Some Doc\n\nSome content.\n", "utf-8");
  const r5 = await ruleAppender({
    ...baseInput,
    args: {
      handoffPath: noSection,
      experience: { id: "exp-no-sec", content: "无 section 时的追加", source: "src-5" },
    },
  });
  assert(r5.data?.appended === true, "appended = true");
  const c5 = await fs.readFile(noSection, "utf-8");
  assert(c5.includes("## 待沉淀经验"), "section 已追加");
  assert(c5.includes("| exp-no-sec |"), "新行已写入");
  assert(c5.includes("Some content."), "原内容保留");

  // ── 场景 6:非法 id 含 | → 返回 parseError ──
  console.log("场景 6:非法 id 含 | 字符");
  const r6 = await ruleAppender({
    ...baseInput,
    args: {
      handoffPath: tmpHandoff,
      experience: { id: "bad|id", content: "x", source: "y" },
    },
  });
  assert(r6.data?.appended === false, "appended = false");
  assert(!!r6.metadata?.parseError, "metadata.parseError 已填充");
  assert(r6.metadata?.parseError?.includes("非法字符"), "parseError 含说明");

  // ── 场景 7:换行符 id 拒绝 ──
  console.log("场景 7:换行符 id 拒绝");
  const r7 = await ruleAppender({
    ...baseInput,
    args: {
      handoffPath: tmpHandoff,
      experience: { id: "a\nb", content: "x", source: "y" },
    },
  });
  assert(r7.data?.appended === false, "appended = false");
  assert(!!r7.metadata?.parseError, "metadata.parseError 已填充");

  // ── 场景 8:content 含 | 字符 → 转义 ──
  console.log("场景 8:content 含 | 字符转义");
  const r8 = await ruleAppender({
    ...baseInput,
    args: {
      handoffPath: tmpHandoff,
      experience: { id: "exp-pipe", content: "a|b|c", source: "src-8" },
    },
  });
  assert(r8.data?.appended === true, "appended = true");
  const c8 = await fs.readFile(tmpHandoff, "utf-8");
  assert(c8.includes("a\\|b\\|c"), "| 已转义为 \\|");

  console.log(`\n汇总: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}

main().catch(async (e) => {
  console.error("FATAL:", e);
  await cleanup();
  process.exit(1);
}).then(() => cleanup());
