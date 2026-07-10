// smoke-refresh-entry.ts — 测 refreshEntry 功能（随 P0-1 修复后一并验证）
// 对应 P0-1 的一部分：验证刷新后 sweeper 能感知到 last_validated 变化
//
// Run: npx tsx docs/experiments/smoke-refresh-entry.ts

import { calcStalenessWeight, refreshEntry } from "../../.governance/plugin/staleness-utils.js";

const now = Date.now();
const dayMs = 86400000;
const ttl = 90;

console.log("=== Smoke Test: refreshEntry (随 P0-1 验证权重基准统一) ===\n");
console.log("验证目标：1) 找到并刷新 2) 未找到 3) 刷新后 stale → fresh (通过 sweeper 感知 last_validated)\n");

const dd = (days: number) => new Date(now - days * dayMs).toISOString().slice(0, 10);
const iso = (days: number) => new Date(now - days * dayMs).toISOString();
const nowIso = new Date().toISOString();

// ── 测试 1: 正常刷新 → found=true，last_validated 更新 ──
console.log("--- Test 1: 正常刷新 exp-stale-95d ---\n");

const handoff1 = `# Handoff

## Pending Experience

| id | experience | source | date | status | ttl(days) | last_validated | weight |
|----|------|------|---------|------|---------|---------|------|
| exp-stale-95d | stale entry | test | ${dd(95)} | pending | 90 | ${iso(95)} | 1.0 |
| exp-stale-185d | expired entry | test | ${dd(185)} | pending | 90 | ${iso(185)} | 1.0 |
`;

const result1 = refreshEntry(handoff1, "exp-stale-95d");

console.log(`found: ${result1.found} (expected true)`);
const nowSeen = result1.content.includes(nowIso.slice(0, 19));
console.log(`last_validated 更新为当前时间 = ${nowSeen} ${nowSeen ? "✅" : "❌"}`);
const test1Pass = result1.found && nowSeen;
console.log(`${test1Pass ? "✅ PASS" : "❌ FAIL"}: 正常刷新\n`);

// ── 测试 2: 未找到 → found=false，内容不变 ──
console.log("--- Test 2: 刷新不存在的条目 exp-xyz ---\n");

const result2 = refreshEntry(handoff1, "exp-xyz");

console.log(`found: ${result2.found} (expected false)`);
const unchanged = result2.content === handoff1;
console.log(`内容未变 = ${unchanged} ${unchanged ? "✅" : "❌"}`);
const test2Pass = !result2.found && unchanged;
console.log(`${test2Pass ? "✅ PASS" : "❌ FAIL"}: 未找到\n`);

// ── 测试 3: 刷新后 stale → fresh (通过 sweeper 的 calcStalenessWeight 验证) ──
console.log("--- Test 3: 刷新 95d 条目，验证权重从 stale → fresh ---\n");

// 刷新前：95d ago，last_validated 也是 95d ago
const oldDate = iso(95);
const oldWeight = calcStalenessWeight(oldDate, ttl, oldDate);
console.log(`刷新前 weight = ${oldWeight} (expected 0.1 - stale)`);

// 刷新后：创建日期仍是 95d ago，但 last_validated 变成 now
const refreshedDate = new Date().toISOString();
const newWeight = calcStalenessWeight(oldDate, ttl, refreshedDate);
console.log(`刷新后 weight = ${newWeight} (expected 1.0 - fresh，因为 Math.max(created, validated)=now)`);

const test3Pass = oldWeight === 0.1 && newWeight === 1.0;
console.log(`${test3Pass ? "✅ PASS" : "❌ FAIL"}: 刷新后 stale → fresh\n`);

// ── 测试 4: 刷新 30d 条目（已经是 fresh），权重不变 ──
console.log("--- Test 4: 刷新 fresh 条目，权重保持 fresh ---\n");

const freshDate = iso(30);
const beforeWeight = calcStalenessWeight(freshDate, ttl, freshDate);
const afterWeight = calcStalenessWeight(freshDate, ttl, refreshedDate);
console.log(`刷新前 weight = ${beforeWeight}, 刷新后 weight = ${afterWeight}`);
console.log(`(均为 1.0，因为 age < ttl*0.5=45)`);

const test4Pass = beforeWeight === 1.0 && afterWeight === 1.0;
console.log(`${test4Pass ? "✅ PASS" : "❌ FAIL"}: fresh 条目刷新后仍为 fresh\n`);

// ── 总结论 ──
const allPass = test1Pass && test2Pass && test3Pass && test4Pass;

console.log("\n=== 总结论 ===\n");
console.log(`1. 正常刷新: ${test1Pass ? "✅" : "❌"}`);
console.log(`2. 未找到: ${test2Pass ? "✅" : "❌"}`);
console.log(`3. 刷新后 stale → fresh: ${test3Pass ? "✅" : "❌"}`);
console.log(`4. fresh 刷新后仍 fresh: ${test4Pass ? "✅" : "❌"}`);
console.log(`\n${allPass ? "=== ALL PASS ✅ ===" : "=== FAILURES ❌ ==="}\n`);

if (allPass) {
  console.log("面试话术（结合 P0-1 sweeper 修复）：");
  console.log("- refreshEntry 能刷新 last_validated，让经验续期");
  console.log("- sweeper 修复后统一用 calcStalenessWeight，能感知到 last_validated 变化");
  console.log("- 刷新后，权重基准从 created 切换到 last_validated，实现经验续期机制");
  console.log("- 这是 '权重基准统一' bug 修复后的完整闭环");
}

process.exit(allPass ? 0 : 1);