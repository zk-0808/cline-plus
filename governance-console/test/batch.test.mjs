/**
 * batch.test.mjs — P2 变更批次与还原（含路径基准不一致的回归）
 *
 * 每个预设用**独立的干净 fixture**，避免"测试顺序决定测试结果"。
 * 四个会改状态的预设走完整闭环；`full` 是 no-op，只验它真的什么都不做。
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  test, ok, eq, makeFixture, snapshotTree, gitStatus, listEmptyDirs, readJson, exists,
} from './harness.mjs';
import { buildPlan, applyPlan, listBatches, restoreBatch } from '../lib/governance.mjs';

const RUNTIME = '.governance/runtime';
const DISABLED = '.governance/runtime/console-disabled';
const BATCHES = '.governance/runtime/console-batches';

const abs = (repo, rel) => path.join(repo, ...rel.split('/'));

const roundTrip = (presetId, label) => test(`T20-${presetId} 「${label}」→ 计划/应用/可还原/还原/仓库干净`, async () => {
  const repo = makeFixture();
  const govBefore = snapshotTree(abs(repo, '.governance'));

  const plan = await buildPlan(repo, { op: 'preset.apply', preset: presetId });
  ok(!plan.error, `生成计划失败：${plan.error} ${plan.message ?? ''}`);
  eq(plan.validation?.blocking, false, '预设计划不该被门禁阻断');
  ok(plan.changes.length > 0, '计划不该为空');

  // ① 移动目标目录名必须与批次标识一致（这就是被修掉的 bug）
  const moves = plan.changes.filter((c) => c.kind === 'move');
  for (const c of moves) {
    eq(c.toRel, path.posix.join(DISABLED, plan.batch, path.posix.basename(c.rel)), `${c.rel} 的移动目标应落在同名批次目录下`);
    ok(c.digest?.digest, '移动项应带源目录指纹');
  }

  const applied = await applyPlan(repo, plan.id);
  ok(applied.ok, `应用失败：${applied.error} ${applied.message ?? ''}`);
  eq(applied.ops, plan.changes.length, '应用的操作数应与计划一致');

  // ② 不留空目录（含 console-disabled 与批次备份目录）
  eq(listEmptyDirs(abs(repo, DISABLED)), [], 'console-disabled 下不该有空目录');

  // ③ 清单记录齐备
  const manifest = readJson(abs(repo, `${BATCHES}/${plan.batch}.json`));
  eq(manifest.preset, presetId, '清单应记录预设 id');
  eq(manifest.opKind, 'preset.apply', '清单应记录操作类型');
  ok(manifest.at && !Number.isNaN(Date.parse(manifest.at)), '清单应有时间戳');
  ok(manifest.layersBefore && manifest.layersAfter, '清单应记录应用前后的层装配');
  eq(manifest.validation?.blocking, false, '清单应记录门禁结论');

  // ④ 可还原性必须判对（之前这里会被误判成不可还原）
  const listed = (await listBatches(repo)).find((b) => b.batch === plan.batch);
  ok(listed, '批次清单里应能找到这个批次');
  eq(listed.restorable, true, 'restorable 必须为 true');
  eq(listed.restored, false, '尚未还原');
  eq(listed.missingBackup, [], '不该有缺失的备份');

  // ⑤ 还原
  const restored = await restoreBatch(repo, plan.batch);
  ok(restored.ok, '还原失败');
  eq(restored.skipped, [], '还原不该有跳过项');
  eq(snapshotTree(abs(repo, '.governance')), govBefore, '还原后 .governance 的内容应与应用前完全一致');
  eq(gitStatus(repo), [], 'git 工作区应干净');
  ok(!exists(abs(repo, DISABLED)), 'console-disabled 应被清掉，不留残骸');

  // ⑥ 清单作为审计记录保留，但状态改标"已还原"
  const afterListed = (await listBatches(repo)).find((b) => b.batch === plan.batch);
  ok(afterListed, '还原后清单仍应保留（这是审计记录）');
  eq(afterListed.restored, true, '应标记为已还原');
  eq(afterListed.restorable, false, '已还原的不该再显示可还原');
});

roundTrip('own-rules', '自建规则');
roundTrip('minimal', '最小安装');
roundTrip('no-hooks', '不用 Hook');
roundTrip('constitution-only', '只用宪法');

test('T21 「完整示例」是 no-op：不建批次、不移动、不改任何文件', async () => {
  const repo = makeFixture();
  const before = snapshotTree(repo);
  const plan = await buildPlan(repo, { op: 'preset.apply', preset: 'full' });
  eq(plan.error, 'NOOP', 'full 应直接返回 NOOP');
  ok(!exists(abs(repo, BATCHES)), '不该创建批次目录');
  ok(!exists(abs(repo, DISABLED)), '不该创建停用目录');
  eq(snapshotTree(repo), before, '不该改变任何文件');
});

test('T22 门禁阻断时零副作用（不是靠前端禁用按钮）', async () => {
  // 弄坏实现文件 → 任何计划的拟议状态都会被 CAP_IMPL_BROKEN 阻断
  const repo = makeFixture({ '.governance/capabilities/git-checker/index.ts': null });
  const before = snapshotTree(repo);
  const cfgBefore = fs.readFileSync(abs(repo, '.governance/hooks/config.json'), 'utf8');

  const plan = await buildPlan(repo, { op: 'hook.toggle', hook: 'pre-tool', enabled: false });
  ok(!plan.error, `计划不该生成失败：${plan.error ?? ''}`);
  eq(plan.validation.blocking, true, '计划应自带"会被阻断"的标记，前端才能先劝退');

  const res = await applyPlan(repo, plan.id);
  eq(res.error, 'BLOCKED', '应用应被拒绝');
  ok(res.validation?.blocking === true, '拒绝结果里应带上校验详情');
  eq(fs.readFileSync(abs(repo, '.governance/hooks/config.json'), 'utf8'), cfgBefore, 'config.json 内容不该变');
  eq(snapshotTree(repo), before, '整棵仓库树不该有任何变化');
  ok(!exists(abs(repo, BATCHES)), '不该创建批次目录');
  ok(!exists(abs(repo, DISABLED)), '不该创建停用目录');
  eq(gitStatus(repo), [], 'git 应干净');
});

test('T23 计划生成后目录内容被改 → STALE_PLAN_MOVE，不做任何移动', async () => {
  const repo = makeFixture();
  const plan = await buildPlan(repo, { op: 'preset.apply', preset: 'minimal' });
  ok(!plan.error, '计划应生成成功');

  // 计划生成之后，往要搬走的目录里加一个文件
  fs.writeFileSync(abs(repo, '.governance/examples/injected.md'), '# 计划生成后新增\n', 'utf8');

  const before = snapshotTree(repo);
  const res = await applyPlan(repo, plan.id);
  eq(res.error, 'STALE_PLAN_MOVE', '应因源目录变化而作废计划');
  ok(res.message.includes('内容在生成计划后发生变化'), `message 应说清原因，实际：${res.message}`);
  eq(snapshotTree(repo), before, '不该发生任何移动');
  ok(exists(abs(repo, '.governance/examples')), '源目录应原样不动');
});

test('T24 老清单（批次名与目录名不一致）仍能正确判可还原并还原', async () => {
  const repo = makeFixture();

  // 手工造一份旧格式批次：目录名用 preset-*，清单里 batch 是 batch-*（早期实现的写法）
  const oldDir = `${DISABLED}/preset-legacy-xyz`;
  fs.mkdirSync(abs(repo, oldDir), { recursive: true });
  fs.renameSync(abs(repo, '.governance/examples'), abs(repo, `${oldDir}/examples`));
  fs.mkdirSync(abs(repo, BATCHES), { recursive: true });
  fs.writeFileSync(abs(repo, `${BATCHES}/batch-legacy-xyz.json`), JSON.stringify({
    batch: 'batch-legacy-xyz',
    at: new Date().toISOString(),
    summary: '老格式批次',
    ops: [{ kind: 'move', rel: '.governance/examples', movedTo: `${oldDir}/examples` }],
  }, null, 2), 'utf8');

  const listed = (await listBatches(repo)).find((b) => b.batch === 'batch-legacy-xyz');
  eq(listed.restorable, true, '老清单也该用 movedTo 判可还原，而不是用 batch 名去拼路径');

  const res = await restoreBatch(repo, 'batch-legacy-xyz');
  ok(res.ok, '还原应成功');
  eq(res.skipped, [], '不该有跳过项');
  ok(exists(abs(repo, '.governance/examples/dev-rules.md')), 'examples 应回到原位');
  eq(gitStatus(repo), [], 'git 应干净');
});
