// smoke-staleness.ts — Phase 2 Staleness smoke test
// Test calcStalenessWeight() + processStaleness() with age=30/60/95/185 days
//
// Run: npx tsx docs/experiments/smoke-staleness.ts

import { calcStalenessWeight, processStaleness } from "../../.governance/plugin/staleness-utils.js";

const now = Date.now();
const dayMs = 86400000; // 1000 * 60 * 60 * 24
const ttl = 90; // default TTL

console.log("=== Smoke Test: Staleness (Phase 2) ===\n");
console.log(`TTL = ${ttl} days`);
console.log(`Tier boundaries: fresh < ${ttl * 0.5}d | aging < ${ttl}d | stale >= ${ttl}d | expired >= ${ttl * 2}d\n`);

// ── Part 1: calcStalenessWeight() unit tests ──
console.log("--- 1. calcStalenessWeight() ---\n");

const testCases = [
  { age: 30,  expected: 1.0, label: "fresh   (age < ttl*0.5 = 45)" },
  { age: 60,  expected: 0.5, label: "aging   (ttl*0.5 <= age < ttl)" },
  { age: 95,  expected: 0.1, label: "stale   (age >= ttl)" },
  { age: 185, expected: 0.1, label: "expired (age >= ttl*2, weight floor = 0.1)" },
];

let weightPass = true;
for (const tc of testCases) {
  const dateStr = new Date(now - tc.age * dayMs).toISOString();
  const weight = calcStalenessWeight(dateStr, ttl, dateStr);
  const pass = weight === tc.expected;
  if (!pass) weightPass = false;
  console.log(
    `  age=${String(tc.age).padStart(3)}d → weight=${weight} (expected ${tc.expected}) ` +
    `${pass ? "✅ PASS" : "❌ FAIL"}  [${tc.label}]`
  );
}

// ── Part 2: processStaleness() integration test ──
console.log("\n--- 2. processStaleness() ---\n");

const iso = (days: number) => new Date(now - days * dayMs).toISOString();
const dateOnly = (days: number) => iso(days).slice(0, 10);

const mockHandoff = `# Handoff - Test

## Pending Experience

> Auto-appended by rule-appender, promote to rules/ or delete after review.

| id | experience | source | date | status | ttl(days) | last_validated | weight |
|----|------|------|---------|------|---------|---------|------|
| exp-fresh   | fresh 30d entry   | test | ${dateOnly(30)}  | pending review | 90 | ${iso(30)}  | 1.0 |
| exp-aging   | aging 60d entry   | test | ${dateOnly(60)}  | pending review | 90 | ${iso(60)}  | 1.0 |
| exp-stale   | stale 95d entry   | test | ${dateOnly(95)}  | pending review | 90 | ${iso(95)}  | 1.0 |
| exp-expired | expired 185d entry| test | ${dateOnly(185)} | pending review | 90 | ${iso(185)} | 1.0 |
`;

const result = processStaleness(mockHandoff);

const expectedStale = 2;  // 95d + 185d
const expectedAging = 1;  // 60d
const expectedFresh = 1;  // 30d (not explicitly counted but implied)

console.log(`  staleCount:    ${result.staleCount}  (expected: ${expectedStale} → 95d + 185d)`);
console.log(`  agingCount:    ${result.agingCount}  (expected: ${expectedAging} → 60d)`);
console.log(`  filteredCount: ${result.filteredCount}  (expected: 0 — annotation mode, no deletion)`);

const countPass =
  result.staleCount === expectedStale &&
  result.agingCount === expectedAging;
console.log(`  → ${countPass ? "✅ PASS" : "❌ FAIL"}`);

// Show annotated output
console.log("\n  Annotated table rows:");
for (const line of result.content.split("\n")) {
  if (line.startsWith("| exp-") || line.includes("STALENESS WARNING")) {
    console.log(`  ${line}`);
  }
}

// ── Part 3: Edge case — negative age (future date) ──
console.log("\n--- 3. Edge case: future date ---\n");
const futureDate = new Date(now + 10 * dayMs).toISOString();
const futureWeight = calcStalenessWeight(futureDate, ttl, undefined);
const futurePass = futureWeight === 1.0;
console.log(`  future date (+10d) → weight=${futureWeight} (expected 1.0) ${futurePass ? "✅ PASS" : "❌ FAIL"}`);

// ── Part 4: Edge case — missing last_validated ──
console.log("\n--- 4. Edge case: missing last_validated ---\n");
const noValDate = new Date(now - 95 * dayMs).toISOString().slice(0, 10);
const noValWeight = calcStalenessWeight(noValDate, ttl, undefined);
const noValPass = noValWeight === 0.1;
console.log(`  95d, no last_validated → weight=${noValWeight} (expected 0.1) ${noValPass ? "✅ PASS" : "❌ FAIL"}`);

// ── Summary ──
const finalPass = weightPass && countPass && futurePass && noValPass;
console.log(`\n=== Result: ${finalPass ? "ALL PASS ✅" : "FAILURES ❌"} ===`);

process.exit(finalPass ? 0 : 1);
