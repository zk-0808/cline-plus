/**
 * governance.mjs — 控制台的全部"知识与写操作"集中在这里。
 *
 * 设计约束（与仓库自身治理纪律一致）：
 *  1. 只读写**既有权威文件**：`.governance/hooks/config.json` 与
 *     `.governance/core/constitution.md` 的「项目可调参数」表。不引入任何新配置文件。
 *  2. 任何写操作必须先出**计划**（含行级 diff），再由客户端确认应用。
 *  3. 应用前把原文件/原目录整体移入 `runtime/console-batches/<batch>/`，
 *     因此"停用"与"备份"是同一套机制 —— 还原 = 移回去。
 *  4. 计划里记录每个文件的 `before` 内容哈希；应用时若磁盘内容已变，
 *     计划作废并要求重新生成（乐观并发控制），绝不静默覆盖。
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';

import { deriveContract } from './contract.mjs';
import { validateState, PARAM_RULES } from './validate.mjs';

// ---------------------------------------------------------------- 常量

export const CONFIG_REL = '.governance/hooks/config.json';
export const CONSTITUTION_REL = '.governance/core/constitution.md';
const BATCH_DIR_REL = '.governance/runtime/console-batches';
const DISABLED_REL = '.governance/runtime/console-disabled';

/** Hook 定义：config.json 的顶层键 + 中文说明 + 触发时机 */
export const HOOKS = [
  {
    id: 'session-start',
    key: 'session-start',
    label: 'SessionStart',
    when: '会话启动时一次',
    does: '调用 handoff-provider 读 HANDOFF.md 与 snapshot.json，注入为 additionalContext',
    source: 'delivery-framework-design.md §四 · 第 3 步',
  },
  {
    id: 'pre-tool',
    key: 'pre-tool',
    label: 'PreToolUse',
    when: '每次工具调用前',
    does: '调用 git-checker 统计未提交文件，达阈值则阻断（宪法 §4 触发器 b）',
    source: 'delivery-framework-design.md §四 · 第 5 步',
  },
  {
    id: 'post-tool',
    key: 'post-tool',
    label: 'PostToolUse',
    when: '每次工具调用后',
    does: '当前为纯占位，无可跑 Capability；用户可自加 lint/test',
    source: 'delivery-framework-design.md §四 · 第 6 步',
  },
  {
    id: 'pre-compact',
    key: 'pre-compact',
    label: 'PreCompact',
    when: '会话压缩前',
    does: '调用 snapshot-writer 写 .governance/runtime/snapshot.json',
    source: 'delivery-framework-design.md §四 · 第 8 步',
  },
  {
    id: 'tracing',
    key: 'tracing',
    label: 'Tracing',
    when: '全流程',
    does: '把 hook 调用轨迹写入 runtime/traces.jsonl（诊断用，关闭不影响治理动作）',
    source: 'hooks/config.json · tracing',
  },
];

/** 层定义：与 delivery-framework-design.md 的目录契约一一对应 */
export const LAYERS = [
  { id: 'clinerules', label: '.clinerules', layer: '入口', path: '.clinerules', kind: 'file', mustKeep: true,
    note: 'Cline 加载入口（薄入口，指向 .governance/）。删除即整套失效，不可停用。' },
  { id: 'core', label: 'L1 Core', layer: 'L1', path: '.governance/core', kind: 'dir', mustKeep: true,
    note: '通用宪法 + 评分细则。所有预设都保留。' },
  { id: 'rules', label: 'L2 Rules', layer: 'L2', path: '.governance/rules', kind: 'dir',
    note: '装好即生效的薄入口规则。停用后会话不再自动读交接门控。' },
  { id: 'capabilities', label: 'L3 Capabilities', layer: 'L3', path: '.governance/capabilities', kind: 'dir',
    note: '「怎么做」的代码模块。停用后 rule-appender / git-checker / snapshot-writer 一并消失。' },
  { id: 'hooks', label: 'L4 Hooks', layer: 'L4', path: '.governance/hooks', kind: 'dir',
    note: '「什么时候调用」的事件定义（含 config.json）。停用即整套自动化停摆。' },
  { id: 'examples', label: 'examples（参考包）', layer: 'L4', path: '.governance/examples', kind: 'dir',
    note: '可选参考实现包。停用不影响机制，只是少一份可抄的样板。' },
  { id: 'runtime', label: 'L5 Runtime State', layer: 'L5', path: '.governance/runtime', kind: 'dir', mustKeep: true,
    note: '活状态文件（snapshot / traces / 本控制台的备份）。停用会让备份无处可放，故不可停用。' },
];

/** 删除矩阵（delivery-framework-design.md §五）→ 预设 */
export const PRESETS = [
  { id: 'full', label: '完整示例', recommended: true, disable: [],
    result: '全部保留，照着 examples/ 改', sideEffect: null },
  { id: 'own-rules', label: '自建规则', disable: ['rules'],
    result: '骨架 + 自建 rules/（用户自己放入口规则）', sideEffect: '停用后 Cline 不再自动加载 rules/，需另建等同的 .clinerules 指向。' },
  { id: 'minimal', label: '最小安装', disable: ['examples'],
    result: '纯骨架，用户自建规则', sideEffect: null },
  { id: 'no-hooks', label: '不用 Hook', disable: ['hooks', 'capabilities'],
    result: '纯文档治理，无自动化', sideEffect: 'rule-appender 随 capabilities/ 消失，HANDOFF.md 待沉淀区退化为纯手工表格；同时会把 config.json 里 5 个 hook 全部置为 enabled:false。' },
  { id: 'constitution-only', label: '只用宪法', disable: ['rules', 'examples', 'capabilities', 'hooks'],
    result: '一页纸治理（.clinerules + core/constitution.md）', sideEffect: '除宪法外全部停用；同「不用 Hook」的副作用，并失去 rules/ 门控。' },
];

// 宪法参数的语义边界集中在 lib/validate.mjs 的 PARAM_RULES —— 门禁与计划生成读同一份，
// 避免"计划放行了、门禁却不认"这类两处取值分叉。

// ---------------------------------------------------------------- 小工具

const slug = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);

async function readText(abs) {
  try { return await fsp.readFile(abs, 'utf8'); } catch { return null; }
}

function sha(text) { return crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16); }

function countFiles(abs) {
  try {
    const st = fs.statSync(abs);
    if (st.isFile()) return 1;
    let n = 0;
    const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else n++;
    } };
    walk(abs);
    return n;
  } catch { return 0; }
}

/**
 * 目录/文件内容指纹：相对路径 + 内容一起哈希。
 * 用途是"计划生成后源目录有没有被改过"，所以必须覆盖内容，不能只看文件数。
 * 跳过 node_modules / dist（同步进插件时它们的变动与我们无关）。
 */
function dirDigest(abs) {
  try {
    const st = fs.statSync(abs);
    if (st.isFile()) {
      return { kind: 'file', fileCount: 1, digest: sha(fs.readFileSync(abs).toString('base64')), bytes: st.size };
    }
    const files = [];
    let bytes = 0;
    const walk = (d, rel) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === 'dist') continue;
        const p = path.join(d, e.name);
        const r = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) walk(p, r);
        else if (e.isFile()) { files.push(r); bytes += fs.statSync(p).size; }
      }
    };
    walk(abs, '');
    files.sort();
    const h = crypto.createHash('sha256');
    for (const r of files) {
      h.update(r).update('\0');
      h.update(fs.readFileSync(path.join(abs, ...r.split('/')))).update('\0');
    }
    return { kind: 'dir', fileCount: files.length, digest: h.digest('hex').slice(0, 16), bytes };
  } catch { return null; }
}

/** 行级 LCS diff —— 文件都不大（<200 行），DP 足够 */
export function lineDiff(beforeText, afterText) {
  const A = (beforeText ?? '').split('\n');
  const B = (afterText ?? '').split('\n');
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0, no = 1, nn = 1;
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push({ t: ' ', text: A[i], no: no++ }); nn++; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: '-', text: A[i], no: no++ }); i++; }
    else { out.push({ t: '+', text: B[j], no: nn++ }); j++; }
  }
  while (i < n) out.push({ t: '-', text: A[i++], no: no++ });
  while (j < m) out.push({ t: '+', text: B[j++], no: nn++ });
  return out;
}

// ---------------------------------------------------------------- 读状态

export async function readState(repo) {
  const configAbs = path.join(repo, CONFIG_REL);
  const constAbs = path.join(repo, CONSTITUTION_REL);

  const configText = await readText(configAbs);
  const constText = await readText(constAbs);

  let config = null, configError = null;
  if (configText == null) configError = 'config.json 不存在';
  else {
    try { config = JSON.parse(configText); } catch (e) { configError = `config.json 解析失败：${e.message}`; }
  }

  // --- hooks
  const hooks = HOOKS.map((h) => {
    const node = config?.[h.key];
    const caps = [];
    if (node?.capabilities) {
      for (const [name, c] of Object.entries(node.capabilities)) {
        caps.push({
          name,
          enabled: c?.enabled !== false,
          args: c?.args ?? {},
          sourceDirExists: fs.existsSync(path.join(repo, '.governance/capabilities', name.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()))),
        });
      }
    }
    return {
      ...h,
      enabled: node?.enabled === true,
      present: node !== undefined,
      skipTools: node?.skipTools ?? null,
      capabilities: caps,
    };
  });

  // --- layers
  const layers = LAYERS.map((l) => {
    const abs = path.join(repo, l.path);
    const exists = fs.existsSync(abs);
    return { ...l, present: exists, fileCount: exists ? countFiles(abs) : 0 };
  });

  // --- preset detection
  const present = new Set(layers.filter((l) => l.present && !l.mustKeep).map((l) => l.id));
  const matched = PRESETS.filter((p) => {
    const dis = new Set(p.disable);
    const expectPresent = ['rules', 'examples', 'capabilities', 'hooks'].filter((id) => !dis.has(id));
    const allExpectedInPlace = expectPresent.every((id) => present.has(id));
    const allDisabledAbsent = p.disable.every((id) => !present.has(id));
    return allExpectedInPlace && allDisabledAbsent;
  });
  const preset = matched.length === 1
    ? { id: matched[0].id, label: matched[0].label, detected: true }
    : { id: 'custom', label: '自定义装配', detected: false };

  // --- constitution params
  const params = [];
  if (constText) {
    const lines = constText.split('\n');
    lines.forEach((line, idx) => {
      const m = line.match(/^\|\s*`([a-z_]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*$/);
      if (!m || !PARAM_RULES[m[1]]) return;
      params.push({
        name: m[1],
        value: m[2].trim(),
        spec: m[3].trim(),
        line: idx + 1,
        rule: PARAM_RULES[m[1]],
      });
    });
  }

  // --- artifacts
  const rt = path.join(repo, '.governance/runtime');
  const markerAbs = path.join(rt, 'plugin-loaded.marker');
  const markerStat = fs.existsSync(markerAbs) ? fs.statSync(markerAbs) : null;
  const tracesAbs = path.join(rt, 'traces.jsonl');
  const tracesText = (await readText(tracesAbs)) ?? '';
  const snapAbs = path.join(rt, 'snapshot.json');
  const snapStat = fs.existsSync(snapAbs) ? fs.statSync(snapAbs) : null;

  const artifacts = {
    marker: markerStat
      ? { exists: true, mtime: markerStat.mtime.toISOString(), ageDays: Math.floor((Date.now() - markerStat.mtimeMs) / 86400000), content: ((await readText(markerAbs)) ?? '').trim() }
      : { exists: false },
    traces: { lines: tracesText ? tracesText.trim().split('\n').filter(Boolean).length : 0, bytes: tracesText.length },
    snapshot: snapStat ? { bytes: snapStat.size, mtime: snapStat.mtime.toISOString() } : null,
  };

  // --- git
  const git = await readGit(repo);

  // --- plugin installed?
  const userHome = process.env.USERPROFILE || process.env.HOME || '';
  const installedDir = path.join(userHome, '.cline/plugins/installed/local/governance');
  const pluginInstalled = fs.existsSync(installedDir);

  // --- warnings
  const warnings = [];
  const constThreshold = params.find((p) => p.name === 'uncommitted_file_threshold');
  const cfgThresholds = HOOKS.flatMap((h) => (config?.[h.key]?.capabilities?.gitChecker?.args?.threshold != null
    ? [{ hook: h.id, value: config[h.key].capabilities.gitChecker.args.threshold }] : []));
  if (constThreshold && cfgThresholds.length) {
    const diverge = cfgThresholds.filter((c) => String(c.value) !== String(constThreshold.value));
    warnings.push(diverge.length
      ? { level: 'warn', code: 'PARAM_DIVERGENCE',
          msg: `gitChecker.threshold（${diverge.map((d) => `${d.hook}=${d.value}`).join(', ')}）与宪法 \`uncommitted_file_threshold\`=${constThreshold.value} 不一致；同一事实存在两处取值。`,
          fix: '两处都在本页可直接改；改完请提交，避免下次会话读到分叉的值。' }
      : { level: 'ok', code: 'PARAM_ALIGNED',
          msg: `gitChecker.threshold 与宪法 \`uncommitted_file_threshold\` 一致（均为 ${constThreshold.value}）。` });
  }
  if (configError) warnings.push({ level: 'error', code: 'CONFIG_BROKEN', msg: configError, fix: '修好 config.json 才能用开关；本页的其它信息仍可信。' });
  const hooksEnabled = hooks.filter((h) => h.enabled).map((h) => h.id);
  if (hooksEnabled.length && !pluginInstalled) {
    warnings.push({ level: 'error', code: 'PLUGIN_NOT_INSTALLED',
      msg: `config.json 启用了 ${hooksEnabled.length} 个 hook，但 ${installedDir} 不存在——这些 hook 不会被任何进程执行。`,
      fix: '点上方「一键安装 · 同步插件」把 .governance/plugin 同步到 Cline 的插件发现路径。' });
  }
  if (!hooksEnabled.length && pluginInstalled) {
    warnings.push({ level: 'warn', code: 'PLUGIN_INSTALLED_BUT_IDLE',
      msg: '插件已安装，但 config.json 里所有 hook 都是关闭的——插件会加载但什么都不做。',
      fix: '如需生效，开启对应 hook；如确定不用，可点「重置安装」移除本地插件副本。' });
  }
  if (artifacts.marker.exists && artifacts.marker.ageDays > 7) {
    warnings.push({ level: 'warn', code: 'MARKER_STALE',
      msg: `plugin-loaded.marker 是 ${artifacts.marker.ageDays} 天前写的（${artifacts.marker.content}）。`,
      fix: '启动一次 `cline -i` 看 marker 是否刷新；不刷新说明 SessionStart 没跑到。' });
  }
  for (const l of layers) {
    if (l.mustKeep && !l.present) {
      warnings.push({ level: 'error', code: 'MUST_KEEP_MISSING', msg: `必需层缺失：${l.path}`, fix: '从 git 恢复该路径。' });
    }
  }
  for (const h of hooks) {
    if (h.present && !h.enabled) continue;
    if (h.enabled && !h.capabilities.length && h.id !== 'post-tool' && h.id !== 'tracing') {
      warnings.push({ level: 'warn', code: 'HOOK_NO_CAPABILITY', msg: `${h.label} 已启用但未挂任何 Capability，执行时为空转。`, fix: '确认是否符合预期。' });
    }
  }
  for (const h of hooks) {
    for (const c of h.capabilities) {
      if (c.enabled && !c.sourceDirExists) {
        warnings.push({ level: 'warn', code: 'CAP_SOURCE_MISSING',
          msg: `${h.label} → ${c.name} 已启用，但 .governance/capabilities/ 下找不到对应源码目录。`,
          fix: '插件同步时会缺这个模块，运行期会报错。' });
      }
    }
  }

  return {
    repo,
    ok: !configError,
    git,
    layers,
    preset,
    hooks,
    params,
    artifacts,
    warnings,
    plugin: { installed: pluginInstalled, dir: installedDir },
    sources: {
      config: CONFIG_REL,
      constitution: CONSTITUTION_REL,
      presetMatrix: 'docs/decisions/delivery-framework-design.md §五',
      hookOrder: 'docs/decisions/delivery-framework-design.md §四',
    },
  };
}

function run(cmd, args, cwd, timeoutMs = 15000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout: timeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => resolve({ ok: !err, stdout: stdout ?? '', stderr: stderr ?? '', error: err?.message ?? null }));
  });
}

async function readGit(repo) {
  const isRepo = fs.existsSync(path.join(repo, '.git'));
  if (!isRepo) return { isRepo: false };
  const [branch, head, status] = await Promise.all([
    run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], repo),
    run('git', ['log', '-1', '--format=%h|%ad|%s', '--date=short'], repo),
    run('git', ['status', '--porcelain'], repo),
  ]);
  const [sha, date, subject] = (head.stdout || '').trim().split('|');
  const dirtyLines = (status.stdout || '').split('\n').filter((l) => l.trim());
  return {
    isRepo: true,
    branch: (branch.stdout || '').trim() || '(detached)',
    head: sha ?? '', headDate: date ?? '', headSubject: subject ?? '',
    dirty: dirtyLines.length,
    dirtySample: dirtyLines.slice(0, 8),
  };
}

// ---------------------------------------------------------------- 计划

const planStore = new Map(); // planId -> plan
const PLAN_TTL_MS = 10 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [id, p] of planStore) if (now - p.createdAt > PLAN_TTL_MS) planStore.delete(id);
}

/**
 * 生成变更计划。op 取值：
 *   { op:'hook.toggle',    hook, enabled }
 *   { op:'cap.toggle',     hook, cap, enabled }
 *   { op:'cap.arg',        hook, cap, arg, value }
 *   { op:'param.set',      name, value }
 *   { op:'preset.apply',   preset }
 */
export async function buildPlan(repo, op) {
  prune();
  const state = await readState(repo);
  const changes = [];
  const warnings = [];

  // 一个批次只对应一个目录：文本备份与目录移动都落在 console-disabled/<batch>/ 下。
  // 早先移动用的是另一个名字（preset-<id>-<ts>），导致 listBatches 拼出的路径与
  // restoreBatch 实际用的路径不是同一个 —— 还原按钮被误禁用。此处统一基址。
  const batchId = `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const pendingMoves = [];

  const configAbs = path.join(repo, CONFIG_REL);
  const configText = await readText(configAbs);

  const needConfig = ['hook.toggle', 'cap.toggle', 'cap.arg', 'preset.apply'].includes(op.op);
  if (needConfig && configText == null) {
    return { error: 'CONFIG_MISSING', message: `${CONFIG_REL} 不存在，无法生成计划。` };
  }

  let newConfigText = configText;
  let configDirty = false;

  const cloneConfig = () => JSON.parse(configText);

  if (op.op === 'hook.toggle') {
    const h = HOOKS.find((x) => x.id === op.hook);
    if (!h) return { error: 'UNKNOWN_HOOK', message: `未知 hook：${op.hook}` };
    const cfg = cloneConfig();
    if (!cfg[h.key]) return { error: 'HOOK_NOT_IN_CONFIG', message: `config.json 里没有 "${h.key}" 节点。` };
    cfg[h.key].enabled = !!op.enabled;
    newConfigText = stringifyConfig(cfg, configText);
    configDirty = true;
    if (h.key === 'tracing' && !op.enabled) {
      warnings.push({ level: 'info', code: 'TRACING_OFF', msg: '关闭 tracing 后，hooks 轨迹不再写入 traces.jsonl；已有关闭前的记录不会被删除。' });
    }
    if (op.enabled && h.id !== 'post-tool' && !(cfg[h.key].capabilities && Object.keys(cfg[h.key].capabilities).length)) {
      warnings.push({ level: 'warn', code: 'HOOK_NO_CAPABILITY', msg: `${h.label} 没有挂 Capability，开启后会空转。` });
    }
  }

  if (op.op === 'cap.toggle' || op.op === 'cap.arg') {
    const h = HOOKS.find((x) => x.id === op.hook);
    if (!h) return { error: 'UNKNOWN_HOOK', message: `未知 hook：${op.hook}` };
    const cfg = cloneConfig();
    const node = cfg[h.key]?.capabilities?.[op.cap];
    if (!node) return { error: 'CAP_NOT_IN_CONFIG', message: `${h.key}.capabilities.${op.cap} 不存在。` };
    if (op.op === 'cap.toggle') {
      node.enabled = !!op.enabled;
    } else {
      if (!(op.arg in (node.args ?? {}))) return { error: 'ARG_NOT_FOUND', message: `${op.cap} 没有参数 ${op.arg}。` };
      const num = Number(op.value);
      if (!Number.isFinite(num) || num < 1 || !Number.isInteger(num)) {
        return { error: 'BAD_VALUE', message: `${op.arg} 必须是 ≥1 的整数（当前输入：${op.value}）。` };
      }
      node.args[op.arg] = num;
    }
    newConfigText = stringifyConfig(cfg, configText);
    configDirty = true;
  }

  if (op.op === 'param.set') {
    const constAbs = path.join(repo, CONSTITUTION_REL);
    const constText = await readText(constAbs);
    if (constText == null) return { error: 'CONSTITUTION_MISSING', message: `${CONSTITUTION_REL} 不存在。` };
    const rule = PARAM_RULES[op.name];
    if (!rule) return { error: 'UNKNOWN_PARAM', message: `未知参数：${op.name}` };
    const raw = String(op.value).trim();
    const num = Number(raw);
    if (!Number.isFinite(num)) return { error: 'BAD_VALUE', message: `必须是数字（当前输入：${raw}）。下界理由：${rule.why}` };
    if (rule.integer && !Number.isInteger(num)) return { error: 'BAD_VALUE', message: `必须是整数（当前输入：${raw}）。` };
    if (num < rule.min) return { error: 'BAD_VALUE', message: `不得小于 ${rule.min}。理由：${rule.why}` };
    if (rule.max != null && num > rule.max) return { error: 'BAD_VALUE', message: `不得大于 ${rule.max}。理由：${rule.why}` };

    const lines = constText.split('\n');
    let hit = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(new RegExp('^\\|\\s*`' + op.name + '`\\s*\\|'))) { hit = i; break; }
    }
    if (hit < 0) return { error: 'PARAM_ROW_NOT_FOUND', message: `宪法参数表里找不到 ${op.name} 那一行。` };
    const oldLine = lines[hit];
    lines[hit] = oldLine.replace(/^(\|\s*`[a-z_]+`\s*\|\s*)([^|]+?)(\s*\|)/, (mm, a, _b, c) => a + String(num) + c);
    const newConstText = lines.join('\n');
    changes.push(textChange(repo, CONSTITUTION_REL, constText, newConstText));
    // 参数改了，指向同一事实的另一处取值若分叉则提示
    const cfgThresholds = HOOKS.flatMap((h2) => {
      const v = JSON.parse(configText ?? '{}')?.[h2.key]?.capabilities?.gitChecker?.args?.threshold;
      return v != null ? [{ hook: h2.id, value: v }] : [];
    });
    if (op.name === 'uncommitted_file_threshold') {
      for (const c of cfgThresholds) {
        if (String(c.value) !== String(num)) {
          warnings.push({ level: 'warn', code: 'PARAM_DIVERGENCE_AFTER',
            msg: `改完后 gitChecker.threshold（${c.hook}=${c.value}）仍与宪法 ${num} 不一致。`,
            fix: '建议顺手把 config.json 里的 threshold 也改成同值，或在下面「Capability 参数」里改。' });
        }
      }
    }
  }

  if (op.op === 'preset.apply') {
    const p = PRESETS.find((x) => x.id === op.preset);
    if (!p) return { error: 'UNKNOWN_PRESET', message: `未知预设：${op.preset}` };
    if (!p.disable.length) return { error: 'NOOP', message: '「完整示例」不产生任何变更。' };

    const cfg = cloneConfig();
    const dirs = [];
    for (const id of p.disable) {
      const layer = LAYERS.find((l) => l.id === id);
      if (!layer || layer.mustKeep) continue;
      const abs = path.join(repo, layer.path);
      if (!fs.existsSync(abs)) { warnings.push({ level: 'info', code: 'ALREADY_ABSENT', msg: `${layer.path} 已不存在，跳过。` }); continue; }
      dirs.push({ layer, entries: countFiles(abs) });
    }
    if (!dirs.length) return { error: 'NOOP', message: '该预设对应的目录都已停用，无变更可做。' };

    // 停用 hooks/ 或 capabilities/ 时，把 config.json 的 hook 全关，避免"配置声称有、目录却没有"
    if (p.disable.includes('hooks') || p.disable.includes('capabilities')) {
      for (const h of HOOKS) {
        if (cfg[h.key]) cfg[h.key].enabled = false;
      }
      newConfigText = stringifyConfig(cfg, configText);
      configDirty = true;
    }
    if (p.sideEffect) warnings.push({ level: 'warn', code: 'PRESET_SIDE_EFFECT', msg: p.sideEffect });
    warnings.push({ level: 'info', code: 'GIT_EFFECT',
      msg: `本次会移动 ${dirs.length} 个目录（共 ${dirs.reduce((a, d) => a + d.entries, 0)} 个文件）到 ${DISABLED_REL}/，git 会把这些文件记为删除，未提交变更数将增加。`,
      fix: '应用后建议立即提交，否则 handoff 触发器 b（未提交文件堆积）会被触发。' });
    pendingMoves.push(...dirs);
  }

  if (configDirty && newConfigText !== configText) {
    changes.push(textChange(repo, CONFIG_REL, configText, newConfigText));
  }

  for (const d of pendingMoves) {
    const from = path.join(repo, d.layer.path);
    changes.push({
      kind: 'move',
      rel: d.layer.path,
      toRel: path.posix.join(DISABLED_REL, batchId, path.posix.basename(d.layer.path)),
      batch: batchId,
      entries: d.entries,
      // 计划生成时的源目录指纹；应用前要复核，防止"计划期间目录被改过还照搬"
      digest: dirDigest(from),
      label: `${d.layer.label} 停用 → ${DISABLED_REL}/${batchId}/${path.posix.basename(d.layer.path)}`,
    });
  }

  if (!changes.length) return { error: 'NOOP', message: '该操作不产生任何文件变更。' };

  // ---------------------------------------------------- 配置门禁：校验拟议状态
  // 注意校验对象是"应用之后的样子"，不是单个输入值：预设会同时改文本和搬目录，
  // 只看单个值的校验会漏掉"目录没了但配置还声称有"这类组合故障。
  const proposed = await proposeState(repo, changes);
  const contract = deriveContract(repo);
  const validation = validateState({
    opKind: op.op,
    opSummary: summarize(op),
    configText: proposed.configText,
    constText: proposed.constText,
    presence: proposed.presence,
    layers: LAYERS,
    presets: PRESETS,
    presetId: op.op === 'preset.apply' ? op.preset : null,
  }, contract);

  const plan = {
    id: slug(JSON.stringify(op) + Date.now() + Math.random()),
    batch: batchId,
    op,
    createdAt: Date.now(),
    summary: summarize(op),
    changes,
    warnings,
    validation,
  };
  planStore.set(plan.id, plan);
  return plan;
}

/**
 * 从计划推出"应用之后的完整状态"。文本取每条变更的 _after；层存在性 = 现状 − 被移走的层。
 * buildPlan 与 applyPlan 共用它，保证"生成计划时校验的"和"落盘前复核的"是同一件事。
 */
export async function proposeState(repo, changes) {
  const afterOf = (rel) => changes.find((c) => c.kind === 'text' && c.rel === rel)?._after;
  const movedRels = new Set(changes.filter((c) => c.kind === 'move').map((c) => c.rel));
  const presence = {};
  for (const l of LAYERS) {
    presence[l.id] = !movedRels.has(l.path) && fs.existsSync(path.join(repo, l.path));
  }
  const configAfter = afterOf(CONFIG_REL);
  const constAfter = afterOf(CONSTITUTION_REL);
  return {
    configText: configAfter !== undefined ? configAfter : await readText(path.join(repo, CONFIG_REL)),
    constText: constAfter !== undefined ? constAfter : await readText(path.join(repo, CONSTITUTION_REL)),
    presence,
  };
}

function summarize(op) {
  switch (op.op) {
    case 'hook.toggle': return `${op.enabled ? '启用' : '关闭'} hook：${op.hook}`;
    case 'cap.toggle': return `${op.enabled ? '启用' : '关闭'} capability：${op.hook}.${op.cap}`;
    case 'cap.arg': return `修改参数：${op.hook}.${op.cap}.${op.arg} → ${op.value}`;
    case 'param.set': return `修改宪法参数：${op.name} → ${op.value}`;
    case 'preset.apply': return `应用装配预设：${PRESETS.find((p) => p.id === op.preset)?.label ?? op.preset}`;
    default: return op.op;
  }
}

function textChange(repo, rel, before, after) {
  return {
    kind: 'text',
    rel,
    beforeHash: sha(before ?? ''),
    diff: lineDiff(before, after),
    added: lineDiff(before, after).filter((d) => d.t === '+').length,
    removed: lineDiff(before, after).filter((d) => d.t === '-').length,
    _after: after,
  };
}

function stringifyConfig(obj, originalText) {
  const s = JSON.stringify(obj, null, 2);
  return originalText.endsWith('\n') ? s + '\n' : s;
}

/** 给客户端的计划视图：剥掉 _after（不下发全文，避免误用） */
export function publicPlan(plan) {
  return {
    ...plan,
    changes: plan.changes.map((c) => ({ ...c, _after: undefined })),
  };
}

// ---------------------------------------------------------------- 应用 / 还原

/** 批次清单里"备份基线"的位置：新清单显式记 backupRoot，老清单回落到 batch 名 */
function backupRootOf(m) {
  return m.backupRoot ?? path.posix.join(DISABLED_REL, m.batch);
}

/**
 * 删掉空的运行期目录（自下而上），只往上清到 console-disabled/ 为止。
 * 目的：不留下"批次目录还在、里面什么都没有"的假象。
 */
async function pruneEmptyDirs(startAbs, stopAtAbs) {
  let cur = path.resolve(startAbs);
  const stop = path.resolve(stopAtAbs);
  const removed = [];
  while (cur.startsWith(stop) && cur !== path.dirname(cur)) {
    try {
      const left = await fsp.readdir(cur);
      if (left.length) break;
      await fsp.rmdir(cur);
      removed.push(path.relative(stopAtAbs, cur).split(path.sep).join('/') || '.');
      if (cur === stop) break;
      cur = path.dirname(cur);
    } catch { break; }
  }
  return removed;
}

/**
 * 自下而上删掉一棵子树里的空目录（含根自身）。
 * 备份目录按仓库相对路径镜像（如 <batch>/.governance/hooks/config.json），
 * 删掉备份文件后会留下多层空目录，只往上 prune 是够不着的。
 */
async function pruneEmptyTree(rootAbs) {
  const walk = async (d) => {
    let ents;
    try { ents = await fsp.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) if (e.isDirectory()) await walk(path.join(d, e.name));
    try {
      if ((await fsp.readdir(d)).length === 0) await fsp.rmdir(d);
    } catch { /* 非空或不可删，忽略 */ }
  };
  await walk(rootAbs);
}

export async function applyPlan(repo, planId) {
  prune();
  const plan = planStore.get(planId);
  if (!plan) return { error: 'PLAN_GONE', message: '计划不存在或已超时（10 分钟），请重新生成。' };

  // ---- 1. 配置门禁：在**任何写操作之前**复核拟议状态。
  //     被阻断时必须零副作用：这里返回时磁盘、目录、批次清单都还没被碰过。
  const proposed = await proposeState(repo, plan.changes);
  const validation = validateState({
    opKind: plan.op?.op,
    opSummary: plan.summary,
    configText: proposed.configText,
    constText: proposed.constText,
    presence: proposed.presence,
    layers: LAYERS,
    presets: PRESETS,
    presetId: plan.op?.op === 'preset.apply' ? plan.op.preset : null,
  }, deriveContract(repo));
  plan.validation = validation;
  if (validation.blocking) {
    return {
      error: 'BLOCKED',
      message: '配置门禁阻断：拟议状态不满足硬约束，未写入任何文件、未移动任何目录。',
      validation,
    };
  }

  // ---- 2. 文本乐观并发：确认磁盘内容仍是生成计划时的样子
  for (const c of plan.changes) {
    if (c.kind !== 'text') continue;
    const cur = await readText(path.join(repo, c.rel));
    if (sha(cur ?? '') !== c.beforeHash) {
      return { error: 'STALE_PLAN', message: `${c.rel} 在生成计划后被改动过，计划作废。请重新生成。` };
    }
  }

  // ---- 3. 目录移动也要复核：源不存在、或内容在计划后被改过，都不能照搬
  for (const c of plan.changes) {
    if (c.kind !== 'move') continue;
    const from = path.join(repo, c.rel);
    if (!fs.existsSync(from)) {
      return { error: 'STALE_PLAN_MOVE', message: `${c.rel} 在生成计划后已被移走或删除，计划作废。请重新生成。` };
    }
    const now = dirDigest(from);
    if (c.digest && now && now.digest !== c.digest.digest) {
      return {
        error: 'STALE_PLAN_MOVE',
        message: `${c.rel} 的内容在生成计划后发生变化（计划时 ${c.digest.fileCount} 个文件 / ${c.digest.bytes} 字节，现在 ${now.fileCount} 个 / ${now.bytes} 字节），计划作废。请重新生成。`,
        detail: { planned: c.digest, now },
      };
    }
  }

  // ---- 4. 目标路径冲突
  for (const c of plan.changes) {
    if (c.kind !== 'move') continue;
    if (fs.existsSync(path.join(repo, c.toRel))) {
      return { error: 'TARGET_EXISTS', message: `停用目标已存在：${c.toRel}` };
    }
  }

  // ---- 5. 落盘。批次目录按需创建：纯目录移动不需要（也不该）留下空备份目录。
  const batchRootAbs = path.join(repo, DISABLED_REL, plan.batch);
  let batchRootMade = false;
  const ensureBatchRoot = async () => {
    if (!batchRootMade) { await fsp.mkdir(batchRootAbs, { recursive: true }); batchRootMade = true; }
    return batchRootAbs;
  };

  const manifest = {
    batch: plan.batch,
    at: new Date().toISOString(),
    summary: plan.summary,
    opKind: plan.op?.op ?? null,
    preset: plan.op?.op === 'preset.apply' ? (plan.op.preset ?? null) : null,
    backupRoot: path.posix.join(DISABLED_REL, plan.batch),
    layersBefore: Object.fromEntries(LAYERS.map((l) => [l.id, fs.existsSync(path.join(repo, l.path))])),
    layersAfter: Object.fromEntries(LAYERS.map((l) => [l.id, proposed.presence[l.id]])),
    validation: { blocking: validation.blocking, at: validation.generatedAt, counts: validation.counts },
    ops: [],
  };

  for (const c of plan.changes) {
    if (c.kind === 'text') {
      const root = await ensureBatchRoot();
      const abs = path.join(repo, c.rel);
      const bakAbs = path.join(root, c.rel);
      await fsp.mkdir(path.dirname(bakAbs), { recursive: true });
      await fsp.copyFile(abs, bakAbs);
      const bakText = await readText(bakAbs);
      manifest.ops.push({ kind: 'text', rel: c.rel, backup: c.rel, backupHash: sha(bakText ?? '') });
      await fsp.writeFile(abs, c._after, 'utf8');
    }
    if (c.kind === 'move') {
      const from = path.join(repo, c.rel);
      const to = path.join(repo, c.toRel);
      await fsp.mkdir(path.dirname(to), { recursive: true });
      await fsp.rename(from, to);
      manifest.ops.push({ kind: 'move', rel: c.rel, movedTo: c.toRel, fileCount: c.digest?.fileCount ?? null });
    }
  }

  const batchesDir = path.join(repo, BATCH_DIR_REL);
  await fsp.mkdir(batchesDir, { recursive: true });
  await fsp.writeFile(path.join(batchesDir, `${plan.batch}.json`), JSON.stringify(manifest, null, 2), 'utf8');
  planStore.delete(planId);

  return {
    ok: true,
    batch: plan.batch,
    summary: plan.summary,
    ops: manifest.ops.length,
    backupDir: path.posix.join(DISABLED_REL, plan.batch),
    validation,
  };
}

/**
 * 批次可还原性判定。`restoreBatch` 与这里用**同一个**路径来源（每条 op 自己的 movedTo /
 * manifest 的 backupRoot），不再用 `batch 名 + basename` 去猜 —— 那正是之前还原按钮被误禁用的原因。
 */
function batchStatus(repo, m) {
  const root = backupRootOf(m);
  const moves = m.ops.filter((o) => o.kind === 'move');
  const texts = m.ops.filter((o) => o.kind === 'text');
  const moveSource = moves.filter((o) => o.movedTo && fs.existsSync(path.join(repo, o.movedTo)));
  const moveTargetPresent = moves.filter((o) => fs.existsSync(path.join(repo, o.rel)));
  const textBackup = texts.filter((o) => fs.existsSync(path.join(repo, root, o.backup)));
  const restored = m.ops.length > 0 && moveSource.length === 0 && textBackup.length === 0 && moveTargetPresent.length === moves.length;
  return {
    ops: m.ops.length,
    moves: moves.length,
    texts: texts.length,
    // 只要还有可移回的东西就算可还原；已还原的单独标 restored
    restorable: !restored && (moveSource.length > 0 || textBackup.length > 0),
    restored,
    missingBackup: [...moves.filter((o) => !moveSource.includes(o)).map((o) => o.rel),
      ...texts.filter((o) => !textBackup.includes(o)).map((o) => o.rel)],
  };
}

export async function listBatches(repo) {
  const dir = path.join(repo, BATCH_DIR_REL);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const m = JSON.parse(await readText(path.join(dir, f)));
      out.push({
        batch: m.batch, at: m.at, summary: m.summary,
        opKind: m.opKind ?? null,
        preset: m.preset ?? null,
        layersBefore: m.layersBefore ?? null,
        layersAfter: m.layersAfter ?? null,
        backupRoot: backupRootOf(m),
        ...batchStatus(repo, m),
      });
    } catch { /* 忽略坏文件 */ }
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}

export async function restoreBatch(repo, batch) {
  const dir = path.join(repo, BATCH_DIR_REL);
  const manPath = path.join(dir, `${batch}.json`);
  const txt = await readText(manPath);
  if (!txt) return { error: 'BATCH_NOT_FOUND', message: `找不到批次 ${batch} 的清单。` };
  const m = JSON.parse(txt);
  const batchRoot = path.join(repo, backupRootOf(m));
  const done = [], skipped = [];

  // 顺序很重要：先移回目录，再覆盖文本。
  // 因为停用 hooks/ 时 config.json 是被改过之后才随目录搬走的，
  // 先移回会把"改过的"带回来，随后由文本还原覆盖成原始内容。
  const moves = m.ops.filter((o) => o.kind === 'move');
  const texts = m.ops.filter((o) => o.kind === 'text');

  for (const o of moves) {
    const from = path.join(repo, o.movedTo);
    const to = path.join(repo, o.rel);
    if (!fs.existsSync(from)) { skipped.push(`${o.rel}：停用副本已缺失`); continue; }
    if (fs.existsSync(to)) { skipped.push(`${o.rel}：目标已存在，不覆盖`); continue; }
    await fsp.mkdir(path.dirname(to), { recursive: true });
    await fsp.rename(from, to);
    done.push(`恢复 ${o.rel}`);
    // 移回后清掉留下的空目录（含 console-disabled/<batch> 与 console-disabled 本身）
    await pruneEmptyDirs(path.dirname(from), path.join(repo, DISABLED_REL));
  }

  for (const o of texts) {
    const bakAbs = path.join(batchRoot, o.backup);
    if (!fs.existsSync(bakAbs)) { skipped.push(`${o.rel}：备份缺失`); continue; }
    const dest = path.join(repo, o.rel);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.copyFile(bakAbs, dest);
    done.push(`还原 ${o.rel}`);
  }

  // 全部还原成功 = 这一轮已经走完闭环：文本备份与空目录一并清掉。
  // 有跳过时保留一切，避免"备份被删、故障还在"。
  if (!skipped.length) {
    for (const o of texts) {
      try { await fsp.rm(path.join(batchRoot, o.backup), { force: true }); } catch { /* 忽略 */ }
    }
    await pruneEmptyTree(batchRoot);
    const disabledAbs = path.join(repo, DISABLED_REL);
    await pruneEmptyDirs(disabledAbs, disabledAbs);
  }
  const emptied = !fs.existsSync(batchRoot) ? path.posix.join(DISABLED_REL, path.basename(batchRoot)) : null;

  return { ok: true, done, skipped, emptiedDirs: emptied ? [emptied] : [] };
}

/**
 * 只读门禁：校验"此刻磁盘上的状态"。
 * 与 buildPlan 里那次校验共用 proposeState + validateState，避免出现"计划说能过、
 * 状态页说不能过"两份判断。
 */
export async function readGate(repo) {
  const proposed = await proposeState(repo, []);
  return validateState({
    opKind: 'readonly',
    opSummary: '校验当前状态',
    configText: proposed.configText,
    constText: proposed.constText,
    presence: proposed.presence,
    layers: LAYERS,
    presets: PRESETS,
    presetId: null,
  }, deriveContract(repo));
}

// ---------------------------------------------------------------- 环境

export async function readEnv(repo) {
  const cline = await run('cline', ['--version'], repo, 20000);
  const node = process.version;
  return {
    node,
    platform: process.platform,
    python: await (async () => {
      const r = await run('python', ['--version'], repo, 8000);
      return (r.stdout || r.stderr || '').trim() || null;
    })(),
    cline: cline.ok
      ? { ok: true, version: (cline.stdout || cline.stderr || '').trim().split('\n')[0] }
      : { ok: false, error: cline.error || 'cline 不在 PATH' },
  };
}
