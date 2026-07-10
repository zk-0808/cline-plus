// smoke-tracing.ts — Phase 1 Tracing smoke test
// Mock 3 hook events, verify traces.jsonl, run trace-stats.js
//
// Run: npx tsx docs/experiments/smoke-tracing.ts

import { traceSync, estTokens } from "../../.governance/capabilities/tracer/index.js";
import { readFileSync, existsSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const workspacePath = process.cwd();
const tracePath = ".governance/runtime/smoke-traces.jsonl";
const fullPath = join(workspacePath, tracePath);

// Clean previous test file
if (existsSync(fullPath)) unlinkSync(fullPath);
// Ensure dir exists
const dir = dirname(fullPath);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

console.log("=== Smoke Test: Tracing (Phase 1) ===\n");
console.log("Mocking 3 hook events via traceSync()...\n");

// ── Event 1: session-start / handoffProvider / inject ──
traceSync({
  session_id: "smoke-tracing-session",
  hook: "session-start",
  capability: "handoffProvider",
  event: "inject",
  metrics: { chars: 5000, tokens: estTokens(5000) },
  workspacePath,
  tracePath,
});

// ── Event 2: pre-tool / gitChecker / block ──
traceSync({
  session_id: "smoke-tracing-session",
  hook: "pre-tool",
  capability: "gitChecker",
  event: "block",
  metrics: { blocked_count: 1 },
  note: "write_to_file",
  workspacePath,
  tracePath,
});

// ── Event 3: pre-compact / snapshotWriter / snapshot ──
traceSync({
  session_id: "smoke-tracing-session",
  hook: "pre-compact",
  capability: "snapshotWriter",
  event: "snapshot",
  workspacePath,
  tracePath,
});

// ── Verify traces.jsonl ──
console.log("Verifying traces.jsonl...\n");

if (!existsSync(fullPath)) {
  console.error("FAIL: traces.jsonl not created!");
  process.exit(1);
}

const raw = readFileSync(fullPath, "utf8");
const lines = raw.trim().split("\n");
console.log(`Records written: ${lines.length} (expected: 3)\n`);

const expected = [
  { hook: "session-start", capability: "handoffProvider", event: "inject" },
  { hook: "pre-tool",      capability: "gitChecker",     event: "block" },
  { hook: "pre-compact",   capability: "snapshotWriter", event: "snapshot" },
];

let allPass = true;
for (let i = 0; i < lines.length; i++) {
  const record = JSON.parse(lines[i]);
  const exp = expected[i];
  const hookOk   = record.hook === exp.hook;
  const capOk    = record.capability === exp.capability;
  const eventOk  = record.event === exp.event;
  const sidOk    = record.session_id === "smoke-tracing-session";
  const tsOk     = typeof record.ts === "string" && record.ts.length > 0;
  const pass     = hookOk && capOk && eventOk && sidOk && tsOk;
  if (!pass) allPass = false;

  const metricsStr = record.metrics ? " " + JSON.stringify(record.metrics) : "";
  console.log(
    `  [${i + 1}] ${record.hook}/${record.capability}/${record.event}${metricsStr}` +
    ` → ${pass ? "PASS" : "FAIL"}` +
    (!pass
      ? ` (hook:${hookOk} cap:${capOk} evt:${eventOk} sid:${sidOk} ts:${tsOk})`
      : "")
  );
}

const countPass = lines.length === 3;
console.log(`\nCount check: ${lines.length === 3 ? "PASS" : `FAIL (got ${lines.length})`}`);

const finalPass = allPass && countPass;
console.log(`\n=== Result: ${finalPass ? "ALL PASS ✅" : "FAILURES ❌"} ===`);

process.exit(finalPass ? 0 : 1);
