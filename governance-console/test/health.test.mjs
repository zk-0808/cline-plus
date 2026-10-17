/**
 * health.test.mjs — 健康面板的判定口径
 *
 * 重点不在"能不能渲染"，而在：
 *   · 四种"看起来都该复查"的情形被分开（过期 / 未复查 / 已被取代 / 上游已变需重核）
 *   · 整体被取代是唯一允许豁免复查义务的情形
 *   · 读不出字段时是 unknown，不是 pass
 *   · 存量 ADR 缺 evidence_source_kind 是规则允许的宽限，只能 warn
 */
import fs from 'node:fs';
import path from 'node:path';

import { test, ok, eq, makeFixture, readJson } from './harness.mjs';
import { readHealth, readGateLog, appendGateLog, GATE_LOG_REL } from '../lib/health.mjs';
import { runTask } from '../lib/runner.mjs';

const abs = (repo, rel) => path.join(repo, ...rel.split('/'));
const ADR_DIR = 'docs/decisions/adr';

function day(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function adr({ id, title, status, asOf, expires, supersededBy, supersedes, kind, extra = '' }) {
  const lines = [`# ${id}: ${title}`, '', '## Context', '', `${id} 的测试上下文。`, ''];
  if (status !== undefined) lines.push(`- **Status**: ${status}`);
  if (supersededBy) lines.push(`- **Superseded-by**: [${supersededBy}](${supersededBy}.md)`);
  if (supersedes) lines.push(`- **Supersedes**: ${supersedes}`);
  if (asOf) lines.push(`- **Evidence as of**: ${asOf}`);
  if (expires) lines.push(`- **Expires if unchanged**: ${expires}（官方文档/版本号类，30 天）`);
  if (kind) lines.push(`- **Evidence source kind**: ${kind}`);
  lines.push('', extra, '');
  return lines.join('\n');
}

/** 一份带 4 种 ADR 情形的 fixture */
function adrFixture() {
  return makeFixture({
    [`${ADR_DIR}/ADR-101-old-decision.md`]: adr({
      id: 'ADR-101', title: '已过期的决策', status: 'Accepted',
      asOf: day(-70), expires: day(-40),
    }),
    [`${ADR_DIR}/ADR-102-replaced.md`]: adr({
      id: 'ADR-102', title: '被整体取代的决策', status: 'superseded（原 deferred）',
      asOf: day(-70), expires: day(-40), supersededBy: 'ADR-103',
    }),
    [`${ADR_DIR}/ADR-103-replacement.md`]: adr({
      id: 'ADR-103', title: '取代者，仍在时效内', status: 'Accepted',
      asOf: day(-10), expires: day(20), supersedes: 'ADR-102 全部',
    }),
    [`${ADR_DIR}/ADR-104-downstream.md`]: adr({
      id: 'ADR-104', title: '自身未过期，但依赖已过期的 ADR-101', status: 'Accepted',
      asOf: day(-10), expires: day(20),
      extra: '本决策依赖 ADR-101 的结论。',
    }),
  });
}

const byId = (h, id) => {
  const c = h.checks.find((x) => x.id === id);
  ok(c, `找不到检查 ${id}`);
  return c;
};

test('H01 四种情形被分开判定，不被合并成一种', async () => {
  const repo = adrFixture();
  const h = await readHealth(repo);

  const a101 = byId(h, 'ADR-101');
  eq(a101.detail.state, 'expired', '过期且未被取代 → expired');
  eq(a101.detail.review, 'pending', '过期后没有重新取证据 → 复查义务 pending');
  eq(a101.status, 'fail', '过期仍是有效决策 → fail');

  const a102 = byId(h, 'ADR-102');
  eq(a102.detail.state, 'superseded', '整体被取代 → superseded');
  eq(a102.detail.review, 'not_required', '整体被取代是唯一豁免复查义务的情形');
  eq(a102.status, 'pass', '已被取代不是缺陷，不该报 fail');

  const a103 = byId(h, 'ADR-103');
  eq(a103.detail.state, 'current', '取代者自身在时效内 → current');
  eq(a103.detail.supersession, 'none', '它取代了别人，不等于它自己被取代');
  eq(a103.status, 'pass', '在时效内 → pass');

  const a104 = byId(h, 'ADR-104');
  eq(a104.detail.state, 'reverify', '自身日期未到但上游已过期 → reverify');
  eq(a104.detail.baseState, 'current', '它的基础态仍是 current');
  ok(a104.detail.upstream.some((u) => u.id === 'ADR-101'), '上游变动应点出 ADR-101');
  eq(a104.status, 'warn', 'reverify 是告警，不是硬失败');
});

test('H02 不因为"我取代了它"而反过来把上游标成问题', async () => {
  const repo = makeFixture({
    [`${ADR_DIR}/ADR-201-upstream.md`]: adr({
      id: 'ADR-201', title: '被下游取代的上游', status: 'superseded',
      asOf: day(-70), expires: day(-40), supersededBy: 'ADR-202',
    }),
    [`${ADR_DIR}/ADR-202-downstream.md`]: adr({
      id: 'ADR-202', title: '取代者，且声明依赖上游', status: 'Accepted',
      asOf: day(-10), expires: day(20), supersedes: 'ADR-201',
      extra: '本决策依赖 ADR-201 的环境结论。',
    }),
  });
  const h = await readHealth(repo);
  const a202 = byId(h, 'ADR-202');
  eq(a202.detail.state, 'current', 'ADR-202 不该因为"上游被自己取代"而需要重核');
  eq(a202.detail.upstream, [], '上游是它自己取代的，应被排除');
});

test('H03 字段两种写法都认（YAML 与 Markdown 粗体）', async () => {
  const repo = makeFixture({
    [`${ADR_DIR}/ADR-301-bold.md`]: adr({ id: 'ADR-301', title: 'Markdown 粗体写法', status: 'Accepted', asOf: day(-5), expires: day(25) }),
    [`${ADR_DIR}/ADR-302-yaml.md`]: [
      '---', 'title: ADR-302 YAML 写法', 'status: Accepted',
      `evidence_as_of: ${day(-5)}`, `expires_if_unchanged: ${day(25)}`,
      'evidence_source_kind: doc-release', '---', '', '# ADR-302: YAML 写法', '',
    ].join('\n'),
  });
  const h = await readHealth(repo);
  for (const id of ['ADR-301', 'ADR-302']) {
    const c = byId(h, id);
    eq(c.detail.state, 'current', `${id} 的字段应被解析到`);
    eq(c.status, 'pass', `${id} 应判 pass`);
  }
});

test('H04 字段读不出 → unknown，绝不折成 pass', async () => {
  const repo = makeFixture({
    [`${ADR_DIR}/ADR-401-broken.md`]: '# ADR-401: 没有状态与日期字段\n\n只有正文。\n',
  });
  const h = await readHealth(repo);
  const c = byId(h, 'ADR-401');
  eq(c.detail.state, 'unknown', '缺字段 → unknown');
  eq(c.status, 'unknown', '状态必须是 unknown，不能算通过');
  ok(c.fix.includes('补齐'), 'fix 应说明补什么');
  eq(h.verdict, 'attention', '有 unknown 时总体结论不能是 ok');
});

test('H05 存量缺 evidence_source_kind 只能 warn（§15 自己给了宽限）', async () => {
  const repo = adrFixture();
  const h = await readHealth(repo);
  const c = byId(h, 'DR-SOURCE-KIND');
  eq(c.status, 'warn', '存量缺该字段是规则允许的宽限，不是违规');
  ok(c.observed.includes('4/4'), '应报出缺失比例');
  ok(c.expected.includes('新增 ADR 必填'), 'expected 应引用 §15 的宽限条款原文');
});

test('H06 上游已过期的 ADR 不会因为"整体被取代"而豁免复查', async () => {
  const repo = makeFixture({
    [`${ADR_DIR}/ADR-501-partial.md`]: adr({
      id: 'ADR-501', title: '部分被取代，主体仍在', status: 'Accepted（主体保留；实现方式部分被 ADR-502 Supersede）',
      asOf: day(-70), expires: day(-40),
    }),
    [`${ADR_DIR}/ADR-502-newer.md`]: adr({
      id: 'ADR-502', title: '取代了别人一部分', status: 'Accepted', asOf: day(-5), expires: day(25),
    }),
  });
  const h = await readHealth(repo);
  const a501 = byId(h, 'ADR-501');
  eq(a501.detail.supersession, 'partial', '部分取代 → partial');
  eq(a501.detail.state, 'expired', '部分取代不解除时效要求');
  eq(a501.detail.review, 'pending', '部分取代后仍需复查');
});

test('H15 ADR 分散在两棵目录树：都要扫、要标来源、重复要报', async () => {
  const dupBody = adr({ id: 'ADR-101', title: '同时存在于两棵树', status: 'Accepted', asOf: day(-5), expires: day(25) });
  const repo = makeFixture({
    [`${ADR_DIR}/ADR-101-both.md`]: dupBody,
    '.governance/decisions/adr/ADR-101-both.md': dupBody,
    '.governance/decisions/adr/ADR-102-only-here.md': adr({ id: 'ADR-102', title: '只在第二棵树', status: 'Accepted', asOf: day(-2), expires: day(20) }),
  });
  const h = await readHealth(repo);

  // 只扫 docs/ 一棵树会漏掉 ADR-102（真实仓库的 ADR-008 就是这样被漏掉的）
  const a102 = byId(h, 'ADR-102');
  eq(a102.status, 'pass', '第二棵树里的 ADR 必须被发现且判 pass');
  eq(a102.detail.sourceDir, '.governance/decisions/adr', '必须标出它来自哪棵树');

  const a101 = byId(h, 'ADR-101');
  ok(a101.observed.includes('来源：docs/decisions/adr'), `每份都要写明来源目录，实际：${a101.observed}`);

  const dup = byId(h, 'DR-DUPLICATE');
  eq(dup.status, 'warn', '同一编号两份 → 告警');
  ok(dup.observed.includes('ADR-101'), '要指出是哪个编号重复了');

  const summary = byId(h, 'DR-SUMMARY');
  ok(summary.observed.includes('按目录'), `汇总要按目录拆分，实际：${summary.observed}`);
  ok(summary.observed.includes('ADR-101 重复'), '汇总要点出重复的编号');
});

test('H16 只在第二棵树里的 ADR 也参与时效判定（ADR-008 那种情况）', async () => {
  const repo = makeFixture({
    '.governance/decisions/adr/ADR-201-fresh.md': adr({ id: 'ADR-201', title: '有效期到明年', status: 'Accepted', asOf: day(-30), expires: day(90) }),
  });
  const h = await readHealth(repo);
  const c = byId(h, 'ADR-201');
  eq(c.detail.state, 'current', '未过期 → current');
  eq(c.status, 'pass', '不该判 fail');
  const summary = byId(h, 'DR-SUMMARY');
  eq(summary.status, 'pass', '只有一份未过期的 ADR 时，汇总应 pass');
});

test('H17 每条检查都有可落地的 ruleRef，且状态在五态之内', async () => {
  const repo = adrFixture();
  const h = await readHealth(repo);
  const ALLOWED = new Set(['pass', 'fail', 'warn', 'unknown', 'not_applicable']);
  ok(h.checks.length > 10, `检查项太少：${h.checks.length}`);
  for (const c of h.checks) {
    ok(c.ruleRef && c.ruleRef.trim().length > 4, `${c.id} 缺少 ruleRef —— 没出处的检查不该存在`);
    ok(ALLOWED.has(c.status), `${c.id} 的状态 ${c.status} 不在五态之内`);
    ok(c.checkedAt, `${c.id} 缺少 checkedAt`);
    ok(c.title, `${c.id} 缺少 title`);
    ok(!('blocking' in c), `${c.id} 不该有 blocking —— 健康检查没有阻断权`);
  }
});

test('H08 snapshot.json 放的是 schema 而不是实例时要点明', async () => {
  const asSchema = makeFixture({
    '.governance/runtime/snapshot.json': JSON.stringify({
      $schema: 'https://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: { schema_version: { type: 'string', const: '1.0' } },
      required: ['schema_version'],
    }, null, 2),
  });
  const c1 = byId(await readHealth(asSchema), 'L5-SNAPSHOT');
  eq(c1.status, 'warn', 'schema 冒充实例应告警');
  ok(c1.observed.includes('JSON Schema'), 'observed 应点明它是 schema');
  ok(c1.observed.includes('undefined'), 'observed 应说明 schema_version 取不到');

  const asInstance = makeFixture({
    '.governance/runtime/snapshot.json': JSON.stringify({
      schema_version: '1.0', session_id: 's1', compacted_at: new Date().toISOString(),
      decisions: [], active_todos: [],
    }, null, 2),
  });
  const c2 = byId(await readHealth(asInstance), 'L5-SNAPSHOT');
  eq(c2.status, 'pass', '真正的实例应 pass');

  // 该文件是 hook 写的生成物、不入库：不存在是设计如此，不能算"通过"，也不必算缺陷
  const absent = makeFixture({ '.governance/runtime/snapshot.json': null });
  const c3 = byId(await readHealth(absent), 'L5-SNAPSHOT');
  eq(c3.status, 'not_applicable', '生成物不存在 → 不适用，而不是 pass 或 fail');
  ok(c3.fix.includes('snapshot.schema.json'), 'fix 应指向 schema 的真实位置');
  ok(c3.fix.includes('不入库'), 'fix 应说明该文件不入库');
  // 「不适用」不能变成盲区：要带上生成链路的证据
  ok(c3.observed.includes('生成链路'), `observed 应说明生产者跑没跑过，实际：${c3.observed}`);

  const withProducer = makeFixture({
    '.governance/runtime/snapshot.json': null,
    '.governance/runtime/traces.jsonl': [
      JSON.stringify({ ts: new Date(Date.now() - 3 * 86400000).toISOString(), hook: 'pre-compact', capability: 'snapshotWriter', event: 'snapshot' }),
    ].join('\n') + '\n',
  });
  const c4 = byId(await readHealth(withProducer), 'L5-SNAPSHOT');
  // 生产者刚跑过却没产出 → 链路断了，必须从"不适用"升级为告警
  eq(c4.status, 'warn', '生产者 3 天前跑过但文件缺失 → 应报警，不能继续判不适用');
  ok(c4.observed.includes('最近的 pre-compact 在 3 天前'), `应报出生产者最近一次运行，实际：${c4.observed}`);
  ok(c4.fix.includes('链路断了'), `fix 应点明链路断了，实际：${c4.fix}`);
});

test('H09 记录型门禁：没有记录是 unknown，跑过之后才按结果判定', async () => {
  const repo = adrFixture();
  const h1 = await readHealth(repo);
  const g1 = byId(h1, 'GATE-LINKS');
  eq(g1.status, 'unknown', '没有运行记录 → unknown，不能算通过');
  ok(g1.observed.includes('未运行不等于通过'), 'observed 要把这条说清楚');

  await appendGateLog(repo, { at: new Date().toISOString(), task: 'gate-links', exit: 0, commit: 'abc1234', summary: 'PASS' });
  const g2 = byId(await readHealth(repo), 'GATE-LINKS');
  eq(g2.status, 'pass', '最近一次 exit 0 → pass');
  ok(g2.observed.includes('abc1234'), 'observed 应带 commit');

  await appendGateLog(repo, { at: new Date().toISOString(), task: 'gate-links', exit: 1, commit: 'def5678', summary: 'FAIL（3 处须修）' });
  const g3 = byId(await readHealth(repo), 'GATE-LINKS');
  eq(g3.status, 'fail', '最近一次非 0 → fail');
  ok(g3.observed.includes('FAIL'), 'observed 应带脚本结论');
});

test('H10 运行 gate-links 会把结论写进 gate-log.jsonl（含中文不乱码）', async () => {
  const repo = makeFixture({
    'scripts/check_links_anchors.py': [
      'import json',
      'print(json.dumps({"root": ".", "scanned_md": 12, "links_checked": 34, "resolvable": 34, "must_fix": 0, "exempt_archive_residue": 0}))',
      'print("")',
      'print("结果：PASS（非归档树 0 失效）")',
    ].join('\n'),
  });

  const out = await runTask(repo, 'gate-links');
  ok(out.ok, `任务应成功：${out.error ?? ''}`);
  eq(out.gateRecord.exit, 0, '记录里应有退出码');
  ok(out.gateRecord.commit, '记录里应有 commit');
  eq(out.gateRecord.counts.must_fix, 0, '应从脚本的 JSON 摘要里取到 must_fix');
  eq(out.gateRecord.counts.files, 12, '应取到扫描文件数');
  ok(out.gateRecord.summary.includes('PASS'), `摘要应是结论行，实际：${out.gateRecord.summary}`);
  // 编码回归：Windows 上 Python 默认按区域代码页输出，节点按 UTF-8 解码就会成乱码
  ok(out.gateRecord.summary.includes('失效'), `中文不该乱码，实际摘要：${out.gateRecord.summary}`);
  ok(!/\uFFFD/.test(out.gateRecord.summary), '摘要里不该出现替换字符 U+FFFD');

  const log = await readGateLog(repo);
  eq(log.length, 1, 'gate-log 应有一条记录');
  ok(fs.existsSync(abs(repo, GATE_LOG_REL)), '日志文件应真的落盘');

  const g = byId(await readHealth(repo), 'GATE-LINKS');
  eq(g.status, 'pass', '跑完之后面板才显示通过');
});

test('H11 结论行不会被 JSON 里的字段名带偏', async () => {
  const repo = makeFixture({
    'scripts/check_links_anchors.py': [
      'import json',
      'print(json.dumps({"must_fix": 2, "scanned_md": 5, "links_checked": 9, "resolvable": 7, "exempt_archive_residue": 0}))',
      'print("")',
      'print("结果：FAIL（2 处须修）")',
      'raise SystemExit(1)',
    ].join('\n'),
  });
  const out = await runTask(repo, 'gate-links');
  eq(out.exitCode, 1, '脚本退出码应为 1');
  ok(out.gateRecord.summary.includes('FAIL'), `摘要不该是 "must_fix": 2 那一行，实际：${out.gateRecord.summary}`);
  eq(out.gateRecord.counts.must_fix, 2, '数值仍应取到');
});

// ────────────────────────────────────────────────────────────── 记录型门禁（多条）

test('H12 loader 只把"相对路径 + .js"改成 .ts，不碰包名与真 .js', async () => {
  const { rewriteSpecifier } = await import('../../scripts/ts-js-resolve.mjs');
  eq(rewriteSpecifier('./types.js'), './types.ts', '相对 .js 应改写');
  eq(rewriteSpecifier('../../plugin/staleness-utils.js'), '../../plugin/staleness-utils.ts', '多级相对路径应改写');
  eq(rewriteSpecifier('node:fs'), 'node:fs', 'node: 前缀不动');
  eq(rewriteSpecifier('chalk'), 'chalk', '包名不动');
  eq(rewriteSpecifier('./styles.css'), './styles.css', '非 .js 不动');
  eq(rewriteSpecifier('./index.js'), './index.ts', '相对 .js 一律改写（解析失败时才真正生效）');
});

test('H13 verify-plugin 任务在真实仓库上跑通，并把结果记进 gate-log', async () => {
  const { DEFAULT_REPO } = await import('../../scripts/governance-capability.mjs');
  const out = await runTask(DEFAULT_REPO, 'verify-plugin');
  eq(out.ok, true, `插件自检应通过：${(out.stderr || '').slice(0, 300)}`);
  eq(out.exitCode, 0, '退出码应为 0');
  ok(out.gateRecord, '应产生 gate 记录');
  eq(out.gateRecord.task, 'verify-plugin', '记录应标明任务名');
  ok(out.gateRecord.summary.includes('PASSED'), `摘要应取到 OVERALL 行，实际：${out.gateRecord.summary}`);
  const log = await readGateLog(DEFAULT_REPO);
  ok(log.some((r) => r.task === 'verify-plugin'), 'gate-log 里应有 verify-plugin 记录');
});

test('H14 GATE-VERIFY 与 GATE-LINKS 各自独立判定，互不顶替', async () => {
  // 只有 verify 的记录、没有 links 的记录
  const repo = makeFixture({
    '.governance/runtime/gate-log.jsonl': JSON.stringify({
      at: new Date().toISOString(), task: 'verify-plugin', exit: 0, commit: 'abc1234',
      summary: 'OVERALL: ✅ ALL PASSED',
    }) + '\n',
  });
  const h = await readHealth(repo);
  const verify = h.checks.find((c) => c.id === 'GATE-VERIFY');
  const links = h.checks.find((c) => c.id === 'GATE-LINKS');
  eq(verify.status, 'pass', '有 exit 0 记录 → pass');
  ok(verify.observed.includes('abc1234'), 'observed 应带 commit');
  eq(links.status, 'unknown', '没有 links 记录 → 仍是 unknown，不能被另一条记录顶替');
  ok(verify.detail.limitation.includes('不经过 Cline'), '必须写明"通过 ≠ Cline 真的触发"这条边界');

  // 再追加一条失败的 verify 记录 → 以最后一条为准
  await appendGateLog(repo, { at: new Date().toISOString(), task: 'verify-plugin', exit: 1, summary: 'HAS FAILURES' });
  const h2 = await readHealth(repo);
  eq(h2.checks.find((c) => c.id === 'GATE-VERIFY').status, 'fail', '最后一条是失败 → fail');
});
