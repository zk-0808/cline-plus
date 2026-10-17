/**
 * contract.test.mjs — 契约推导对**真实仓库**的锚定
 *
 * 别的用例都在合成 fixture 里跑，只有这里拿真实仓库当基准。
 * 作用：防止"fixture 与校验器一起错"的自洽式假通过 ——
 * 如果契约推导在真实仓库上站不住，那 fixture 里的 pass 不算数。
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, ok, eq } from './harness.mjs';
import { deriveContract } from '../lib/contract.mjs';
import { validateState, POLICY } from '../lib/validate.mjs';
import { proposeState, LAYERS, PRESETS, readGate, publicPlan, buildPlan } from '../lib/governance.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('T30 真实仓库的分发契约能从源码推出来（不是手写白名单）', async () => {
  const c = deriveContract(REPO);
  eq(c.ok, true, `推导失败：${c.problems.join('；')}`);
  eq(c.hookKeys, ['session-start', 'pre-tool', 'post-tool', 'pre-compact'], 'HooksConfig 声明的 Hook 键');
  eq(Object.keys(c.consumed).sort(), ['gitChecker', 'handoffProvider', 'snapshotWriter'], '分发器真正读取的 Capability 键');
  eq(c.imports.every((i) => i.target), true, '每处静态导入都应能解析到实现文件');
  // tracer / staleness-sweeper 由分发器导入；rule-appender 没有任何分发路径
  ok(c.orphans.includes('rule-appender'), 'rule-appender 应被识别为无分发者的孤儿模块');
});

test('T31 真实仓库当前状态通过门禁，且已知的 3 个问题以 warn 形式露出', async () => {
  const proposed = await proposeState(REPO, []);
  const v = validateState({
    opKind: 'readonly',
    opSummary: '只读校验当前状态',
    configText: proposed.configText,
    constText: proposed.constText,
    presence: proposed.presence,
    layers: LAYERS,
    presets: PRESETS,
    presetId: null,
  }, deriveContract(REPO));

  eq(v.blocking, false, '当前仓库状态不该被阻断');
  eq(v.checks.filter((c) => c.status === 'fail'), [], '不该有 fail');

  const byId = (id) => v.checks.find((c) => c.id === id);
  eq(byId('CONFIG_PARSE').status, 'pass', 'config.json 可解析');
  eq(byId('PARAM_RANGE').status, 'pass', '宪法参数都在边界内');
  eq(byId('MUST_KEEP_MISSING').status, 'pass', '必需层齐全');
  eq(byId('CAP_IMPL_BROKEN').status, 'pass', '静态导入全部可解析');

  // 这三条是真实存在的待办，不是测试造出来的
  eq(byId('HOOK_KEY_UNDECLARED').status, 'warn', 'config.json 的 tracing 块不在 HooksConfig 里');
  ok(byId('HOOK_KEY_UNDECLARED').observed.includes('tracing'), 'observed 应点出 tracing');
  ok(byId('CAP_ORPHAN').observed.includes('rule-appender'), '孤儿模块里应有 rule-appender');
  eq(byId('CAP_ORPHAN').status, 'warn', '孤儿模块只告警，不阻断');
});

test('T32 前端消费的字段，服务端必须都提供（UI 契约）', async () => {
  // public/app.js 的 renderGate / renderGateChip 读的就是这些字段。
  // 这里不启浏览器，只钉住"UI 读的字段后端一定有"，避免上线后整块面板空白。
  const v = await readGate(REPO);
  for (const k of ['blocking', 'counts', 'checks', 'generatedAt', 'op', 'contract']) {
    ok(k in v, `gate 缺少字段 ${k}`);
  }
  ok(Array.isArray(v.checks) && v.checks.length > 0, 'checks 应是非空数组');
  const ALLOWED = new Set(['pass', 'fail', 'warn', 'unknown', 'not_applicable']);
  for (const c of v.checks) {
    for (const k of ['id', 'title', 'ruleRef', 'status', 'blocking', 'observed', 'expected', 'fix']) {
      ok(k in c, `${c.id} 缺少字段 ${k}`);
    }
    ok(ALLOWED.has(c.status), `${c.id} 的状态 ${c.status} 不在五态之内`);
    ok(typeof c.blocking === 'boolean', `${c.id} 的 blocking 必须是布尔`);
    ok(POLICY[c.id], `${c.id} 未在 POLICY 表登记`);
  }

  // 计划下发前必须剥掉内部全文，否则客户端会拿到"应用后的完整文件内容"
  const plan = await buildPlan(REPO, { op: 'preset.apply', preset: 'minimal' });
  ok(!plan.error, `生成计划失败：${plan.error ?? ''}`);
  const pub = publicPlan(plan);
  ok(pub.changes.every((c) => !('_after' in c) || c._after === undefined), '下发视图不该带 _after');
  ok(pub.changes.every((c) => c.kind !== 'move' || (c.digest && c.digest.digest)), '移动项应带内容指纹');
  ok(pub.validation?.checks?.length > 0, '计划应自带校验结论');
});
