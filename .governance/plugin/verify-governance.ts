/**
 * Governance Plugin — 核心逻辑验证脚本
 *
 * 不依赖 Cline CLI,直接测试 Capability + Hook dispatcher 逻辑。
 * 借鉴 context-snapshot/verify-hook-injection.cjs 模式。
 *
 * Run: node --import ./scripts/ts-js-resolve.mjs .governance/plugin/verify-governance.ts
 */

import { loadConfig } from "./config-loader.ts";
import { dispatchSessionStart } from "./hooks/session-start.ts";
import { dispatchPreTool } from "./hooks/pre-tool.ts";
import { detectCompaction, dispatchPreCompact } from "./hooks/pre-compact.ts";
import { handoffProvider } from "../capabilities/handoff-provider/index.ts";
import { gitChecker } from "../capabilities/git-checker/index.ts";
import { snapshotWriter, DEFAULT_EXTRACTORS } from "../capabilities/snapshot-writer/index.ts";
import type { SessionContext, HookEvent } from "./types.ts";
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

const WORKSPACE = process.argv[2] ?? process.cwd();
let pass = 0;
let fail = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.error(`  ✗ ${msg}`); }
}

function section(title: string): void {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
}

function makeCtx(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    cwd: WORKSPACE,
    gitDirtyCount: 0,
    sessionId: "verify-session",
    startedAt: new Date().toISOString(),
    loadedRules: [],
    compactCount: 0,
    recentDecisions: [],
    pendingTodos: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────
// T1: config-loader
// ─────────────────────────────────────────────────────────
section("T1: config-loader — 加载 + 深合并");

const config = loadConfig(WORKSPACE);
assert(config["session-start"]?.enabled === true, "session-start.enabled = true");
assert(config["session-start"]?.capabilities?.handoffProvider?.enabled === true, "handoffProvider.enabled = true");
assert(config["session-start"]?.capabilities?.handoffProvider?.args?.handoffPath === "HANDOFF.md", "handoffPath = HANDOFF.md");
assert(config["pre-tool"]?.enabled === true, "pre-tool.enabled = true");
assert(config["pre-tool"]?.capabilities?.gitChecker?.args?.threshold === 5, "gitChecker threshold = 5");
assert(config["pre-tool"]?.skipTools?.includes("readFile") === true, "skipTools contains readFile");
assert(config["pre-compact"]?.enabled === true, "pre-compact.enabled = true");
assert(config["post-tool"]?.enabled === false, "post-tool.enabled = false");

// ─────────────────────────────────────────────────────────
// T2: handoff-provider — 异步 API
// ─────────────────────────────────────────────────────────
section("T2: handoff-provider — 读取 constitution + rules + handoff + snapshot");

const hpResult = await handoffProvider({
  ctx: makeCtx(),
  event: { type: "SessionStart", timestamp: new Date().toISOString() },
  args: {
    handoffPath: join(WORKSPACE, "HANDOFF.md"),
    snapshotPath: join(WORKSPACE, ".governance", "runtime", "snapshot.json"),
    constitutionPath: join(WORKSPACE, ".governance", "core", "constitution.md"),
    rulesDir: join(WORKSPACE, ".governance", "rules"),
  },
});
assert(hpResult.intent === "inject", "intent = inject");
assert(hpResult.data.additionalContext.length > 0, "additionalContext 非空");
assert(hpResult.data.additionalContext.includes("Core Constitution"), "含 Constitution 段");
assert(hpResult.data.additionalContext.includes("Active Rules"), "含 Active Rules 段");
assert(hpResult.data.sources.length > 0, "sources 非空");
assert(hpResult.data.sources.some((s) => s.includes("constitution.md")), "sources 含 constitution.md");

// ─────────────────────────────────────────────────────────
// T3: git-checker — 仓库检测 + dirty count + 阈值逻辑
// ─────────────────────────────────────────────────────────
section("T3: git-checker — 仓库检测 + dirty count");

const gcEvent: HookEvent = { type: "SessionStart", timestamp: new Date().toISOString() };
const gcResult = await gitChecker({
  ctx: makeCtx(),
  event: gcEvent,
  args: { threshold: 5, excludePatterns: ["node_modules/", "dist/", ".git/"] },
});
assert(gcResult.intent === "inject" || gcResult.intent === "pass", `intent = ${gcResult.intent} (inject 或 pass)`);

if (gcResult.intent === "inject") {
  assert(gcResult.data!.dirtyCount >= 0, `dirtyCount = ${gcResult.data!.dirtyCount} ≥ 0`);
  assert(gcResult.data!.threshold === 5, "threshold = 5");
  if (gcResult.metadata?.gitBranch) {
    assert(typeof gcResult.metadata.gitBranch === "string", `gitBranch = ${gcResult.metadata.gitBranch}`);
  }
}

// 非 git 仓库降级测试
const tmpNonGit = join(tmpdir(), `gov-nongit-${Date.now()}`);
mkdirSync(tmpNonGit, { recursive: true });
const gcNonGit = await gitChecker({
  ctx: makeCtx({ cwd: tmpNonGit }),
  event: gcEvent,
  args: { threshold: 5 },
});
assert(gcNonGit.intent === "pass", "非 git 仓库 → pass (不阻断)");
rmSync(tmpNonGit, { recursive: true, force: true });

// ─────────────────────────────────────────────────────────
// T4: pre-tool dispatcher — skipTools 白名单 + block 逻辑
// ─────────────────────────────────────────────────────────
section("T4: pre-tool dispatcher — skipTools + block 逻辑");

const preToolConfig = config["pre-tool"]!;

// readFile 在 skipTools 白名单 → 不 skip
const skipResult = await dispatchPreTool(
  makeCtx(), preToolConfig, "readFile",
);
assert(skipResult.skip === false, "readFile 在白名单 → skip = false");

// write_to_file 不在白名单 → 是否阻断取决于 dirty 数与阈值。
// ⚠️ 必须用**独立临时 git 仓库**构造确定的 dirty 数，不能读当前工作区：
//    早先这条断言直接跑在仓库里，结果随"有没有未提交改动"变化 ——
//    工作区干净时过、脏时挂，等于把门禁做成了环境的函数。
const dirtyRepo = join(tmpdir(), `gov-dirty-${Date.now()}`);
mkdirSync(dirtyRepo, { recursive: true });
execSync("git init -q", { cwd: dirtyRepo });
execSync("git config user.email t@example.invalid", { cwd: dirtyRepo });
execSync("git config user.name test", { cwd: dirtyRepo });
for (let i = 0; i < 10; i++) writeFileSync(join(dirtyRepo, `f${i}.txt`), "x");

// 10 个未跟踪文件 ≥ 阈值 5 → 应阻断
const blockedResult = await dispatchPreTool(
  makeCtx({ cwd: dirtyRepo }), preToolConfig, "write_to_file",
);
assert(blockedResult.skip === true, `dirty(10) ≥ threshold(5) → skip = true (实际 ${blockedResult.skip})`);

// 同一份 dirty，阈值拉到 999 → 不阻断
const highThresholdConfig = { ...preToolConfig, capabilities: { gitChecker: { enabled: true, args: { threshold: 999 } } } };
const highResult = await dispatchPreTool(
  makeCtx({ cwd: dirtyRepo }), highThresholdConfig, "write_to_file",
);
assert(highResult.skip === false, "threshold=999 → skip = false (永不阻断)");

rmSync(dirtyRepo, { recursive: true, force: true });

// ─────────────────────────────────────────────────────────
// T5: detectCompaction — 纯函数,多种场景
// ─────────────────────────────────────────────────────────
section("T5: detectCompaction — 长度突变检测");

assert(detectCompaction(null, []) === false, "null preMessages → false");
assert(detectCompaction([], []) === false, "空 preMessages → false");
assert(detectCompaction([1, 2, 3], [1]) === false, "preMessages ≤ 4 → false (太短不判定)");
assert(detectCompaction([1, 2, 3, 4, 5], [1, 2]) === true, "5→2 (<50%) → true");
assert(detectCompaction([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 2, 3, 4]) === true, "10→4 (<50%) → true");
assert(detectCompaction([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 2, 3, 4, 5, 6]) === false, "10→6 (≥50%) → false");
assert(detectCompaction([1, 2, 3, 4, 5], [1, 2, 3]) === false, "5→3 (≥50%) → false");

// ─────────────────────────────────────────────────────────
// T6: snapshot-writer — 写入临时文件验证
// ─────────────────────────────────────────────────────────
section("T6: snapshot-writer — 写入 snapshot.json");

const tmpSnapDir = join(tmpdir(), `gov-snap-${Date.now()}`);
mkdirSync(tmpSnapDir, { recursive: true });
const tmpSnapPath = join(tmpSnapDir, "snapshot.json");

const swResult = await snapshotWriter({
  ctx: makeCtx({ sessionId: "snap-test", recentDecisions: [{ id: "d1", confidence: "Verified" }] }),
  event: { type: "PreCompact", timestamp: new Date().toISOString() },
  args: { snapshotPath: tmpSnapPath, extractors: DEFAULT_EXTRACTORS },
});
assert(swResult.intent === "pass", "intent = pass (永不阻断)");
assert(swResult.data?.bytesWritten !== undefined, `bytesWritten = ${swResult.data?.bytesWritten}`);
assert(swResult.data?.fieldsWritten.includes("decisions"), "fieldsWritten 含 decisions");
assert(swResult.data?.fieldsWritten.includes("todos"), "fieldsWritten 含 todos");
assert(existsSync(tmpSnapPath), "snapshot.json 已创建");

const snapContent = JSON.parse(readFileSync(tmpSnapPath, "utf8"));
assert(snapContent.schema_version === "1.0", "schema_version = 1.0");
assert(snapContent.session_id === "snap-test", "session_id = snap-test");
assert(typeof snapContent.compacted_at === "string", "compacted_at 是字符串");
assert(Array.isArray(snapContent.decisions), "decisions 是数组");
assert(snapContent.decisions.length === 1, `decisions.length = ${snapContent.decisions.length}`);
assert(snapContent.decisions[0].id === "d1", "decisions[0].id = d1");

// 写入失败测试:不可创建的路径 (Windows 下用保留设备名)
const badResult = await snapshotWriter({
  ctx: makeCtx(),
  event: { type: "PreCompact", timestamp: new Date().toISOString() },
  args: { snapshotPath: "Z:\\nonexistent_drive\\snap.json", extractors: [] },
});
assert(badResult.intent === "pass", "写入失败 → intent 仍 = pass (不阻断)");
assert(!!badResult.metadata?.writeError, `writeError 已填充: ${badResult.metadata?.writeError ?? "(无)"}`);

rmSync(tmpSnapDir, { recursive: true, force: true });

// ─────────────────────────────────────────────────────────
// T7: session-start dispatcher — 聚合注入内容
// ─────────────────────────────────────────────────────────
section("T7: session-start dispatcher — 聚合 injection");

const ssConfig = config["session-start"]!;
const ssResult = await dispatchSessionStart(makeCtx(), ssConfig, WORKSPACE);
assert(ssResult.ruleContent.length > 0, "ruleContent 非空");
assert(ssResult.ruleContent.includes("Core Constitution") || ssResult.ruleContent.includes("Session Context"), "含 Constitution 或 Session Context");
assert(ssResult.sources.length > 0, `sources 非空 (${ssResult.sources.length} 项)`);

// ─────────────────────────────────────────────────────────
// T8: pre-compact dispatcher — 完整流程
// ─────────────────────────────────────────────────────────
section("T8: pre-compact dispatcher — compaction 检测 + snapshot 写入");

const pcConfig = config["pre-compact"]!;
const tmpPcDir = join(tmpdir(), `gov-pc-${Date.now()}`);
mkdirSync(tmpPcDir, { recursive: true });
const tmpPcSnapPath = join(tmpPcDir, "snapshot.json");

// 修改 config:用相对路径 (dispatchPreCompact 会 join(workspacePath, snapshotPath))
const pcConfigTmp = {
  ...pcConfig,
  capabilities: {
    snapshotWriter: {
      ...pcConfig.capabilities.snapshotWriter,
      args: { snapshotPath: "snapshot.json" }, // 相对路径,join(tmpPcDir, "snapshot.json")
    },
  },
};

// 正常场景:无 compaction
const pcNoCompact = await dispatchPreCompact(
  makeCtx(), pcConfigTmp, null, [1, 2, 3], tmpPcDir,
);
assert(pcNoCompact.compacted === false, "无 preMessages → compacted = false");
assert(pcNoCompact.snapshotWritten === false, "无 compaction → snapshotWritten = false");

// compaction 场景
const pcCompacted = await dispatchPreCompact(
  makeCtx({ sessionId: "pc-test" }),
  pcConfigTmp,
  Array.from({ length: 10 }, (_, i) => ({ role: "user", content: `msg ${i}` })),
  [1, 2], // 10→2, <50%
  tmpPcDir,
);
assert(pcCompacted.compacted === true, "10→2 → compacted = true");
assert(pcCompacted.snapshotWritten === true, "snapshot 已写入");
assert(existsSync(tmpPcSnapPath), "snapshot.json 已创建");

rmSync(tmpPcDir, { recursive: true, force: true });

// ─────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────
console.log(`\n${"═".repeat(60)}`);
console.log("  SUMMARY");
console.log(`${"═".repeat(60)}`);
console.log(`  ${pass} passed, ${fail} failed`);
console.log(`\n  OVERALL: ${fail === 0 ? "✅ ALL PASSED" : "❌ HAS FAILURES"}`);
console.log(`\n  注: Plugin 加载 / hook 触发 / rule 注入需 CLI 集成测试（见 runtime-test-plan.md）`);
process.exit(fail === 0 ? 0 : 1);
