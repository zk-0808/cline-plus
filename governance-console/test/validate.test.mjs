/**
 * validate.test.mjs — P0 配置门禁的用例
 *
 * 每个用例在独立 fixture 里构造一种状态，断言**具体某条检查**的状态与阻断策略，
 * 而不是只看整体 pass/fail —— 否则"哪条漏了"看不出来。
 */
import fs from 'node:fs';
import path from 'node:path';

import { test, ok, eq, makeFixture, BASE_FILES } from './harness.mjs';
import { deriveContract } from '../lib/contract.mjs';
import { validateState } from '../lib/validate.mjs';
import { proposeState, LAYERS, PRESETS, CONFIG_REL, CONSTITUTION_REL } from '../lib/governance.mjs';

const read = (repo, rel) => fs.readFileSync(path.join(repo, ...rel.split('/')), 'utf8');
const write = (repo, rel, text) => {
  const abs = path.join(repo, ...rel.split('/'));
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, 'utf8');
};

async function check(repo, opts = {}) {
  const proposed = await proposeState(repo, opts.changes ?? []);
  return validateState({
    opKind: opts.opKind ?? 'readonly',
    opSummary: opts.opSummary ?? '测试用拟议状态',
    configText: opts.configText !== undefined ? opts.configText : proposed.configText,
    constText: opts.constText !== undefined ? opts.constText : proposed.constText,
    presence: { ...proposed.presence, ...(opts.presence ?? {}) },
    layers: LAYERS,
    presets: PRESETS,
    presetId: opts.presetId ?? null,
  }, deriveContract(repo));
}

const one = (v, id) => {
  const c = v.checks.filter((x) => x.id === id);
  ok(c.length === 1, `期望正好 1 条 ${id}，实际 ${c.length} 条`);
  return c[0];
};

const noFails = (v) => {
  const fails = v.checks.filter((c) => c.status === 'fail');
  ok(fails.length === 0, `不该有 fail，却有：${fails.map((f) => `${f.id}(${f.observed})`).join('; ')}`);
  ok(v.blocking === false, '不该阻断，却 blocking=true');
};

// ────────────────────────────────────────────────────────────── 正例

test('T01 完整、已知有效的标准配置 → 全部 pass，不阻断', async () => {
  const repo = makeFixture();
  const v = await check(repo);
  noFails(v);
  eq(v.counts.warn ?? 0, 0, '基线不该产生 warn');
  eq(v.checks.length, 15, '检查项数量（新增检查后需同步更新此数）');
  ok(v.checks.filter((c) => c.status === 'not_applicable').length === 1, '只有 PRESET_CONTRACT 不适用');
});

test('T13 用户新增合法的自定义 Capability（声明+接线+实现齐备）→ pass', async () => {
  const repo = makeFixture();

  // 1) 实现目录
  write(repo, '.governance/capabilities/custom-lint/index.ts', 'export const customLint = () => 1;\n');

  // 2) types.ts 里声明 —— 这才是本框架的"注册机制"
  const types = BASE_FILES['.governance/plugin/types.ts'].replace(
    `  "pre-tool": {
    enabled: true,
    skipTools: ["readFile", "read_file", "search"],
    capabilities: {
      gitChecker: {
        enabled: true,
        args: {
          threshold: 5,
          excludePatterns: ["node_modules/"],
        },
      },
    },
  },`,
    `  "pre-tool": {
    enabled: true,
    skipTools: ["readFile", "read_file", "search"],
    capabilities: {
      gitChecker: {
        enabled: true,
        args: {
          threshold: 5,
          excludePatterns: ["node_modules/"],
        },
      },
      customLint: {
        enabled: true,
        args: {
          maxWarnings: 3,
        },
      },
    },
  },`,
  );
  ok(types.includes('customLint'), 'fixture 构造失败：types.ts 未插入 customLint');
  write(repo, '.governance/plugin/types.ts', types);

  // 3) 分发器里读取
  write(repo, '.governance/plugin/index.ts', read(repo, '.governance/plugin/index.ts')
    .replace(
      'import { loadConfig } from "./config-loader.js";',
      'import { loadConfig } from "./config-loader.js";\nimport { customLint } from "../capabilities/custom-lint/index.js";',
    )
    .replace(
      '  if (preToolConfig.capabilities.gitChecker.enabled) { gitChecker(); }',
      '  if (preToolConfig.capabilities.gitChecker.enabled) { gitChecker(); }\n  if (preToolConfig.capabilities.customLint.enabled) { customLint(); }',
    ));

  // 4) config.json 里启用
  const cfg = JSON.parse(read(repo, CONFIG_REL));
  cfg['pre-tool'].capabilities.customLint = { enabled: true, args: { maxWarnings: 3 } };
  write(repo, CONFIG_REL, JSON.stringify(cfg, null, 2) + '\n');

  const v = await check(repo);
  noFails(v);
  eq(one(v, 'CAP_KEY_UNDISPATCHED').status, 'pass', '自定义 Capability 被正确识别为可分发');
  eq(one(v, 'CAP_ORPHAN').status, 'pass', '自定义 Capability 不该被判成孤儿');
  eq(one(v, 'CAP_IMPL_BROKEN').status, 'pass', '自定义 Capability 的静态导入应可解析');
});

// ────────────────────────────────────────────────────────────── 必阻断

test('T02 config.json 语法错误 → CONFIG_PARSE fail 且阻断', async () => {
  const repo = makeFixture({ [CONFIG_REL]: '{ "pre-tool": { enabled: true, },, }' });
  const v = await check(repo, { opKind: 'hook.toggle' });
  const c = one(v, 'CONFIG_PARSE');
  eq(c.status, 'fail', 'CONFIG_PARSE 应为 fail');
  eq(c.blocking, true, 'CONFIG_PARSE 应阻断');
  ok(c.fix.includes('DEFAULT_CONFIG'), 'fix 应点明坏配置会静默回落默认值');
  ok(v.blocking === true, '整体应阻断');
});

test('T03 enabled Hook 引用了分发器不解析的 Capability → fail 且阻断', async () => {
  const repo = makeFixture();
  const cfg = JSON.parse(read(repo, CONFIG_REL));
  cfg['pre-tool'].capabilities.ghostChecker = { enabled: true, args: {} };
  write(repo, CONFIG_REL, JSON.stringify(cfg, null, 2) + '\n');

  const v = await check(repo, { opKind: 'cap.toggle' });
  const c = one(v, 'CAP_KEY_UNDISPATCHED');
  eq(c.status, 'fail', '启用状态下引用不可分发的 Capability 应为 fail');
  eq(c.blocking, true, '应阻断');
  ok(c.observed.includes('ghostChecker'), 'observed 应点出具体键');
  ok(v.blocking === true, '整体应阻断');
});

test('T04 同一个未接线 Capability 但 Hook 关闭 → warn 且不阻断', async () => {
  const repo = makeFixture();
  const cfg = JSON.parse(read(repo, CONFIG_REL));
  cfg['post-tool'].capabilities = { ghostChecker: { enabled: true, args: {} } };
  write(repo, CONFIG_REL, JSON.stringify(cfg, null, 2) + '\n');

  const v = await check(repo);
  const c = one(v, 'CAP_KEY_UNDISPATCHED');
  eq(c.status, 'warn', 'Hook 关闭时同一条应为 warn');
  eq(c.blocking, false, '不应阻断');
  ok(v.blocking === false, '整体不阻断');
});

test('T05 静态导入的实现文件缺失 → CAP_IMPL_BROKEN fail 且阻断', async () => {
  const repo = makeFixture({ '.governance/capabilities/git-checker/index.ts': null });
  const v = await check(repo);
  const c = one(v, 'CAP_IMPL_BROKEN');
  eq(c.status, 'fail', '实现文件缺失应为 fail');
  eq(c.blocking, true, '应阻断');
  ok(c.observed.includes('git-checker'), 'observed 应点出缺失的模块');
});

test('T06 宪法参数越界 → PARAM_RANGE fail 且阻断', async () => {
  const repo = makeFixture();
  write(repo, CONSTITUTION_REL, read(repo, CONSTITUTION_REL)
    .replace('| `context_pressure_ratio` | 0.7 |', '| `context_pressure_ratio` | 1.5 |')
    .replace('| `uncommitted_file_threshold` | 5 |', '| `uncommitted_file_threshold` | 0 |'));
  const v = await check(repo, { opKind: 'param.set' });
  const c = one(v, 'PARAM_RANGE');
  eq(c.status, 'fail', '越界参数应为 fail');
  eq(c.blocking, true, '应阻断');
  ok(c.observed.includes('context_pressure_ratio') && c.observed.includes('uncommitted_file_threshold'),
    'observed 应同时点出两个越界参数');
});

test('T11 必需层在拟议状态中消失 → MUST_KEEP_MISSING fail 且阻断', async () => {
  const repo = makeFixture();
  const v = await check(repo, { opKind: 'preset.apply', presence: { runtime: false } });
  const c = one(v, 'MUST_KEEP_MISSING');
  eq(c.status, 'fail', '必需层缺失应为 fail');
  eq(c.blocking, true, '应阻断');
  ok(c.observed.includes('runtime'), 'observed 应点出 runtime');
});

test('T10 预设没有履行自己的删除契约 → PRESET_CONTRACT fail 且阻断', async () => {
  const repo = makeFixture();
  // 「只用宪法」应停用 rules/，这里谎称它还在
  const v = await check(repo, { opKind: 'preset.apply', presetId: 'constitution-only', presence: { rules: true } });
  const c = one(v, 'PRESET_CONTRACT');
  eq(c.status, 'fail', '预设未履约应为 fail');
  eq(c.blocking, true, '应阻断');
  ok(c.observed.includes('.governance/rules'), 'observed 应点出仍存在的层');
});

// ────────────────────────────────────────────────────────────── 只告警

test('T07 threshold 与宪法分叉 → PARAM_DIVERGENCE warn 且不阻断', async () => {
  const repo = makeFixture();
  const cfg = JSON.parse(read(repo, CONFIG_REL));
  cfg['pre-tool'].capabilities.gitChecker.args.threshold = 9;
  cfg['session-start'].capabilities.gitChecker.args.threshold = 9;
  write(repo, CONFIG_REL, JSON.stringify(cfg, null, 2) + '\n');

  const v = await check(repo, { opKind: 'cap.arg' });
  const c = one(v, 'PARAM_DIVERGENCE');
  eq(c.status, 'warn', '两处取值分叉只应告警');
  eq(c.blocking, false, '不应阻断');
  ok(v.blocking === false, '整体不阻断');
});

test('T12 skipTools 含仓库清单里没有的工具名 → warn 且不阻断', async () => {
  const repo = makeFixture();
  const cfg = JSON.parse(read(repo, CONFIG_REL));
  cfg['pre-tool'].skipTools = ['readFile', 'not_a_real_tool'];
  write(repo, CONFIG_REL, JSON.stringify(cfg, null, 2) + '\n');

  const v = await check(repo);
  const c = one(v, 'SKIPTOOLS_UNKNOWN');
  eq(c.status, 'warn', '未知工具名只应告警');
  eq(c.blocking, false, '不应阻断');
  ok(c.observed.includes('not_a_real_tool'), 'observed 应点出具体名称');
  ok(c.fix.includes('DEFAULT_CONFIG'), 'fix 应指出需要同步的出处');
});

test('T14 同一 Capability 在多个 Hook 上参数分叉 → warn 且不阻断', async () => {
  const repo = makeFixture();
  const cfg = JSON.parse(read(repo, CONFIG_REL));
  cfg['session-start'].capabilities.gitChecker.args.threshold = 7; // pre-tool 仍是 5
  write(repo, CONFIG_REL, JSON.stringify(cfg, null, 2) + '\n');

  const v = await check(repo);
  const c = one(v, 'CAP_SHARED_ARGS_DIVERGE');
  eq(c.status, 'warn', '跨 Hook 参数分叉只应告警');
  eq(c.blocking, false, '不应阻断');
});

test('T15 分发契约读不出来（types.ts 缺失）→ CONTRACT_UNREADABLE unknown，改 Hook 时阻断', async () => {
  const repo = makeFixture({ '.governance/plugin/types.ts': null });
  const v1 = await check(repo, { opKind: 'cap.toggle' });
  const c1 = one(v1, 'CONTRACT_UNREADABLE');
  eq(c1.status, 'unknown', '契约读不出应是 unknown，不能折成 pass');
  eq(c1.blocking, true, '牵涉 Hook 时必须阻断');
  ok(v1.blocking === true, '整体应阻断');

  // 与分发无关的操作（改宪法参数）不该被牵连
  const v2 = await check(repo, { opKind: 'param.set' });
  const c2 = one(v2, 'CONTRACT_UNREADABLE');
  eq(c2.status, 'unknown', '仍是 unknown');
  eq(c2.blocking, false, '与分发无关的操作不应阻断');
  ok(v2.blocking === false, '改宪法参数不该被契约问题挡住');
});

// ────────────────────────────────────────────────────────────── 预设必须 pass

test('T08 应用「不用 Hook」之后的状态 → pass（合法装配）', async () => {
  const repo = makeFixture();
  const v = await check(repo, {
    opKind: 'preset.apply', presetId: 'no-hooks',
    presence: { hooks: false, capabilities: false },
    configText: null, // config.json 随 hooks/ 一起停用
  });
  noFails(v);
  eq(one(v, 'PRESET_CONTRACT').status, 'pass', '预设应履行自己的契约');
  eq(one(v, 'CONFIG_PARSE').status, 'not_applicable', 'config 随 hooks/ 停用 → 不适用，而不是判失败');
  eq(one(v, 'CAP_IMPL_BROKEN').status, 'not_applicable', 'capabilities/ 停用 → 静态导入检查不适用');
  ok(one(v, 'MUST_KEEP_MISSING').status === 'pass', 'core/runtime/.clinerules 仍在');
});

test('T09 应用「只用宪法」之后的状态 → pass（停用项都停用，必需项都还在）', async () => {
  const repo = makeFixture();
  const v = await check(repo, {
    opKind: 'preset.apply', presetId: 'constitution-only',
    presence: { rules: false, examples: false, capabilities: false, hooks: false },
    configText: null,
  });
  noFails(v);
  const pc = one(v, 'PRESET_CONTRACT');
  eq(pc.status, 'pass', '预设应履行自己的契约');
  ok(pc.observed.includes('.governance/rules') && pc.observed.includes('.governance/examples'),
    'observed 应列出被停用的层');
  // 这一条是评审指出的：不能描述成"只剩 core + .clinerules"
  const mk = one(v, 'MUST_KEEP_MISSING');
  ok(mk.observed.includes('.governance/runtime'), 'runtime/ 是必需层，必须仍在');
  ok(mk.observed.includes('.clinerules'), '.clinerules 是必需层，必须仍在');
});

// ────────────────────────────────────────────────────────────── 策略表自检

test('T16 每条检查的 blocking 与 POLICY 表一致（策略不散落在代码里）', async () => {
  const { POLICY } = await import('../lib/validate.mjs');
  const repo = makeFixture({ [CONFIG_REL]: 'not json' });
  const v = await check(repo, { opKind: 'hook.toggle' });
  for (const c of v.checks) {
    const policy = POLICY[c.id];
    ok(policy, `${c.id} 没有在 POLICY 表里登记`);
    // pass 结构上永不阻断
    if (c.status === 'pass') {
      eq(c.blocking, false, `${c.id}/pass 不该阻断`);
      continue;
    }
    const declared = policy[c.status];
    if (declared === 'ctx') continue; // 由该项的适用条件决定，跳过一致性比对
    if (declared === undefined) {
      // 未登记的状态必须默认"不阻断"：漏登记不能悄悄变成拦截
      eq(c.blocking, false, `${c.id}/${c.status} 未登记策略，默认必须不阻断`);
      continue;
    }
    eq(c.blocking, !!declared, `${c.id}/${c.status} 的 blocking 与 POLICY 不一致`);
  }
  // 反向：POLICY 里登记为阻断的状态，在本次运行里必须真的被触发过至少一次
  const triggered = new Set(v.checks.filter((c) => c.blocking).map((c) => `${c.id}/${c.status}`));
  ok(triggered.size > 0, '这次运行本该触发至少一处阻断（坏 config）');
});
