/**
 * capability-cli.test.mjs — 手动入口（scripts/governance-capability.mjs）
 *
 * 这里盯的是"权限边界"而不是"功能好不好用"：
 *  - 默认干跑绝不落盘
 *  - 可写目标被限制在白名单内，权威文件区一律拒绝
 *  - 落盘前必须有备份
 *  - 跑不起来的模块要如实报原因，不假装成功
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, ok, eq, makeFixture } from './harness.mjs';
import {
  REGISTRY, listCapabilities, guardTarget, runCapability, diffStat, DEFAULT_REPO,
} from '../../scripts/governance-capability.mjs';

const REPO = DEFAULT_REPO;
const REAL_CAP = path.join(REPO, '.governance/capabilities/rule-appender/index.ts');
const abs = (repo, rel) => path.join(repo, ...rel.split('/'));

/** 把真实的 rule-appender 实现拷进 fixture，测的是真实现而不是仿写 */
function capFixture(handoff) {
  const impl = fs.readFileSync(REAL_CAP, 'utf8');
  const files = { '.governance/capabilities/rule-appender/index.ts': impl };
  if (handoff !== undefined) files['HANDOFF.md'] = handoff;
  return makeFixture(files);
}

const HANDOFF = [
  '# Handoff — 会话交接',
  '',
  '## 待沉淀经验',
  '',
  '> 此区由 rule-appender 自动追加,人工 review 后晋升到 rules/ 或删除。',
  '',
  '| id | 经验 | 来源 | 沉淀日期 | 状态 | ttl(天) | 最后验证 | 权重 |',
  '|----|------|------|---------|------|---------|---------|------|',
  '',
].join('\n');

test('C01 登记表：rule-appender 可执行，staleness-sweeper 如实报不可执行', async () => {
  const list = listCapabilities();
  const ra = list.find((c) => c.id === 'rule-appender');
  const ss = list.find((c) => c.id === 'staleness-sweeper');
  ok(ra, '登记表里应有 rule-appender');
  eq(ra.runnable, true, 'rule-appender 应可执行');
  eq(ra.writable, ['HANDOFF.md'], '可写目标应只有 HANDOFF.md');
  eq(ss.runnable, false, 'staleness-sweeper 当前不可执行');
  ok(ss.reason && ss.reason.includes('.js'), `应说明真实原因（.js 值导入），实际：${ss.reason}`);
  ok(ra.ruleRef.includes('constitution'), '每条登记应能指回规则出处');
});

test('C02 安全边界：权威文件区与越界路径一律拒绝', async () => {
  eq(guardTarget(REPO, 'HANDOFF.md').ok, true, 'HANDOFF.md 允许');
  for (const bad of ['.governance/core/constitution.md', '.governance/rules/lifecycle.md', '.governance/hooks/config.json']) {
    const g = guardTarget(REPO, bad);
    eq(g.ok, false, `${bad} 必须被拒`);
    ok(g.message.includes('权威文件区'), `${bad} 的拒绝理由要说清是权威文件区`);
  }
  eq(guardTarget(REPO, '../../etc/passwd').ok, false, '越界路径必须被拒');
  eq(guardTarget(REPO, 'docs/../HANDOFF.md').ok, true, '归一化后仍在根内的相对路径允许');
});

test('C03 未知 Capability 与空经验都被参数校验挡住', async () => {
  const repo = capFixture(HANDOFF);
  const r1 = await runCapability({ repoRoot: repo, name: 'no-such-cap', experience: '随便写点什么' });
  eq(r1.ok, false, '未知 Capability 必须失败');
  ok(r1.error.includes('未知 Capability'), `应说明是未知项，实际：${r1.error}`);

  const r2 = await runCapability({ repoRoot: repo, name: 'rule-appender', experience: 'ok' });
  eq(r2.ok, false, '过短的经验内容应被拒');
  ok(r2.error.includes('至少要 4 个字符'), `应说明长度下限，实际：${r2.error}`);

  const r3 = await runCapability({ repoRoot: repo, name: 'staleness-sweeper' });
  eq(r3.ok, false, '不可执行的模块必须失败');
  ok(r3.error.includes('不可直接执行'), `应说明不可执行，实际：${r3.error}`);
});

test('C04 默认干跑：给出差异预览，但绝不落盘', async () => {
  const repo = capFixture(HANDOFF);
  const before = fs.readFileSync(abs(repo, 'HANDOFF.md'), 'utf8');

  const r = await runCapability({ repoRoot: repo, name: 'rule-appender', experience: '健康面板的 not_applicable 必须带生成链路证据', id: 'exp-t1' });
  ok(r.ok, `干跑应成功：${r.error ?? ''}`);
  eq(r.mode, 'dry-run', '默认必须是干跑');
  eq(r.appended, true, '干跑也应算出"会追加"');
  ok(r.after.includes('not_applicable 必须带生成链路证据'), '预览里应能看到经验文本');
  eq(fs.readFileSync(abs(repo, 'HANDOFF.md'), 'utf8'), before, '干跑之后 HANDOFF.md 必须一字不动');
  ok(!fs.existsSync(abs(repo, '.governance/runtime/console-batches')), '干跑不该创建备份目录');

  const d = diffStat(r.before, r.after);
  ok(d.added >= 1, `差异统计应有新增行，实际：${JSON.stringify(d)}`);
});

test('C05 --apply：落盘 + 写前备份，且备份就是原内容', async () => {
  const repo = capFixture(HANDOFF);
  const before = fs.readFileSync(abs(repo, 'HANDOFF.md'), 'utf8');

  const r = await runCapability({ repoRoot: repo, name: 'rule-appender', experience: '落盘路径要能被备份还原', id: 'exp-t2', apply: true });
  ok(r.ok, `apply 应成功：${r.error ?? ''}`);
  eq(r.mode, 'apply', '模式应为 apply');
  const after = fs.readFileSync(abs(repo, 'HANDOFF.md'), 'utf8');
  ok(after !== before, 'apply 之后内容应有变化');
  ok(after.includes('落盘路径要能被备份还原'), '新内容里应有这条经验');
  ok(r.backupDir && r.backupDir.startsWith('.governance/runtime/console-batches/manual-'), `应落在 manual- 备份目录，实际：${r.backupDir}`);
  const bak = fs.readFileSync(abs(repo, `${r.backupDir}/HANDOFF.md`), 'utf8');
  eq(bak, before, '备份内容必须与应用前完全一致（这是可还原的前提）');
});

test('C06 重复 id 不重复追加（appended=false 且报出 duplicateId）', async () => {
  const repo = capFixture(HANDOFF);
  const first = await runCapability({ repoRoot: repo, name: 'rule-appender', experience: '第一次追加这条经验', id: 'exp-dup', apply: true });
  ok(first.ok && first.appended, '第一次应追加成功');

  const second = await runCapability({ repoRoot: repo, name: 'rule-appender', experience: '第二次用同一个 id', id: 'exp-dup', apply: true });
  ok(second.ok, '第二次不该报错');
  eq(second.appended, false, '第二次应判重复、不追加');
  eq(second.result?.data?.duplicateId, 'exp-dup', '应报出重复的 id');
});

test('C07 真实仓库：HANDOFF.md 是唯一可写目标，登记表与磁盘一致', async () => {
  for (const [id, entry] of Object.entries(REGISTRY)) {
    const modPath = abs(REPO, entry.module);
    ok(fs.existsSync(modPath), `${id} 登记的模块 ${entry.module} 在磁盘上不存在`);
    if (entry.runnable) {
      const src = fs.readFileSync(modPath, 'utf8');
      ok(src.includes(`export async function ${entry.exportName}`), `${entry.module} 里找不到 export async function ${entry.exportName}`);
      eq(entry.writable.length, 1, `${id} 的可写白名单应只有一个目标`);
    }
  }
});
