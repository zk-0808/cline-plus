// smoke-stale-injection.ts — 验证 weight=0.1 条目是"注入并标注"而非"过滤"
// 对应 P0-3: 对齐代码注释、lifecycle.md、简历三处口径
//
// Run: npx tsx docs/experiments/smoke-stale-injection.ts

import { processStaleness } from "../../.governance/plugin/staleness-utils.js";

const now = Date.now();
const dayMs = 86400000;
const ttl = 90;

console.log("=== Smoke Test: Stale Injection Policy (P0-3) ===\n");
console.log("验证目标：weight=0.1 的 stale 条目是 '注入并打标注'，而非 '过滤删除'\n");

// 构造 4 条经验，覆盖 fresh/aging/stale/expired 四档
const iso = (days: number) => new Date(now - days * dayMs).toISOString();
const dd = (days: number) => iso(days).slice(0, 10);

const handoffContent = `# Handoff

## Pending Experience

| id | experience | source | date | status | ttl(days) | last_validated | weight |
|----|------|------|---------|------|---------|---------|------|
| exp-fresh   | fresh entry   | test | ${dd(30)}  | pending review | 90 | ${iso(30)}  | 1.0 |
| exp-aging   | aging entry   | test | ${dd(60)}  | pending review | 90 | ${iso(60)}  | 1.0 |
| exp-stale   | stale entry   | test | ${dd(95)}  | pending review | 90 | ${iso(95)}  | 1.0 |
| exp-expired | expired entry  | test | ${dd(185)} | pending review | 90 | ${iso(185)} | 1.0 |
`;

console.log("输入：4 条经验 (30d/60d/95d/185d)\n");

const result = processStaleness(handoffContent);

// 核心验证点
console.log("--- 核心验证 ---\n");

// 1. filteredCount 必须为 0（不过滤）
const filterPass = result.filteredCount === 0;
console.log(`1. filteredCount = ${result.filteredCount} (expected 0) ${filterPass ? "✅ PASS" : "❌ FAIL"}`);
console.log(`   → ${filterPass ? "证明：stale/expired 条目未被过滤删除" : "错误：代码行为与注释矛盾"}\n`);

// 2. staleCount=2, agingCount=1
const countPass = result.staleCount === 2 && result.agingCount === 1;
console.log(`2. staleCount = ${result.staleCount} (expected 2) ${result.staleCount === 2 ? "✅" : "❌"}`);
console.log(`   agingCount = ${result.agingCount} (expected 1) ${result.agingCount === 1 ? "✅" : "❌"}\n`);

// 3. 验证 4 条记录都保留在输出中（无删除）
const outputLines = result.content.split("\n").filter(l => l.startsWith("| exp-"));
const allEntriesPresent = outputLines.length === 4;
console.log(`3. 输出中保留的条目数 = ${outputLines.length} (expected 4) ${allEntriesPresent ? "✅ PASS" : "❌ FAIL"}`);
console.log(`   → ${allEntriesPresent ? "证明：所有条目均被注入（含 stale/expired）" : "错误：条目被删除"}\n`);

// 4. 验证标注格式
const hasStaleAnno = result.content.includes("<!-- STALE weight=0.1 -->");
const hasAgingAnno = result.content.includes("<!-- AGING weight=0.5 -->");
const hasWarning = result.content.includes("STALENESS WARNING");

console.log("4. 标注检查:");
console.log(`   ${hasStaleAnno ? "✅" : "❌"} stale 条目有 <!-- STALE --> 标注`);
console.log(`   ${hasAgingAnno ? "✅" : "❌"} aging 条目有 <!-- AGING --> 标注`);
console.log(`   ${hasWarning ? "✅" : "❌"} 有 STALENESS WARNING 警告块\n`);

// 5. 验证 fresh 条目无标注
const freshLine = outputLines.find(l => l.includes("exp-fresh"));
const freshNoAnno = freshLine && !freshLine.includes("<!-- ") && !freshLine.includes("-->");
console.log(`5. fresh 条目无标注 = ${freshNoAnno} ${freshNoAnno ? "✅ PASS" : "❌ FAIL"}\n`);

// 总体结论
const allPass = filterPass && countPass && allEntriesPresent && hasStaleAnno && hasAgingAnno && freshNoAnno;
console.log(`=== 结论：${allPass ? "策略验证通过 ✅" : "失败 ❌"} ===`);
console.log();
if (allPass) {
  console.log("设计策略：weight=0.1 的 stale 条目被注入并打 <!-- STALE --> 标注，");
  console.log("不删除也不过滤。理由：保留边缘信息但降权提示，避免误删有价值经验。");
} else {
  console.log("错误：代码行为与注释 'INJECTED WITH ANNOTATION (not filtered)' 不符！");
}

process.exit(allPass ? 0 : 1);