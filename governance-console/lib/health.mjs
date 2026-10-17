/**
 * health.mjs — P1 健康面板的后端
 *
 * 与 validate.mjs 的分工：
 *   validate.mjs  判"这次写入能不能落盘"，有阻断权，只看拟议状态。
 *   health.mjs    判"仓库此刻处于什么状态"，无阻断权，只看磁盘现状。
 * 两者共用同一套状态词表（pass / fail / warn / unknown / not_applicable），
 * 但健康检查**没有** blocking —— 它不拦任何操作，所以不给它这个字段，避免误用。
 *
 * 三条纪律：
 *  1. 每条检查都必须带能落地的 `ruleRef`（仓库里的文件 + 章节/行）。写不出出处的检查不该存在，
 *     否则面板就在发明标准。
 *  2. `unknown` 不是 `pass`。解析不到就报 unknown，并说明"缺什么导致读不出"。
 *  3. 需要"跑过一次"才有结论的项（如链接锚点脚本）单独归入「记录型门禁」——
 *     没记录就显示未运行，不能显示成通过。
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { deriveContract } from './contract.mjs';
import { PARAM_RULES, parseParamRows } from './validate.mjs';

export const HEALTH_LAYERS = [
  { id: 'L1', label: 'L1 Core 宪法', note: '跨项目通用治理原则；改这里影响所有判定动作' },
  { id: 'L2', label: 'L2 Rules 规则', note: '装好即生效的薄入口' },
  { id: 'L3', label: 'L3 Capabilities 能力', note: '「怎么做」的代码模块' },
  { id: 'L4', label: 'L4 Hooks 事件', note: '「什么时候调用」＋加载入口' },
  { id: 'L5', label: 'L5 Runtime 状态', note: '活状态文件' },
  { id: 'DR', label: 'DR 决策记录', note: 'ADR / 决策的时效与取代关系' },
  { id: 'GATE', label: 'GATE 记录型门禁', note: '需要"实际跑过一次"才有结论的检查' },
];

/**
 * 记录型门禁清单。每条都要写清**范围**：跑通它证明了什么、没证明什么。
 * 没有记录 → unknown；有记录 → 只看退出码。中间的"我觉得应该没问题"不算证据。
 */
export const RECORDED_GATES = [
  {
    task: 'gate-links',
    id: 'GATE-LINKS',
    title: '链接与锚点门控（scripts/check_links_anchors.py）',
    ruleRef: 'docs/dev-rules.md §1.17 规范性引用完整性门控',
    expected: '最近一次运行退出码为 0（非归档树零失效链接/锚点）',
    scope: '全仓 Markdown 的相对链接与标题锚点',
    action: '运行链接门控',
    cli: 'python scripts/check_links_anchors.py',
    fixOnFail: '按输出里的 must_fix 清单逐条修；归档区残留按 §1.17 不适用范围豁免。',
    limitation: null,
  },
  {
    task: 'verify-plugin',
    id: 'GATE-VERIFY',
    title: '插件逻辑自检（.governance/plugin/verify-governance.ts）',
    ruleRef: '.governance/plugin/verify-governance.ts 自带断言集（50 项）',
    expected: '最近一次运行退出码为 0',
    scope: '插件分发逻辑：config 加载与深合并、handoff 注入、git-checker、pre-tool skip、compaction 检测、snapshot 写入、分发聚合',
    action: '运行插件自检',
    cli: 'node --import ./scripts/ts-js-resolve.mjs .governance/plugin/verify-governance.ts',
    fixOnFail: '按输出里 ✗ 的断言逐条修；它们对应真实的分发行为，不是笔误。',
    limitation: '它直接调 Capability 函数，**不经过 Cline**；通过 ≠ Cline 真的触发了 hook，那需要 CLI 集成测试。',
  },
];

const read = async (abs) => { try { return await fsp.readFile(abs, 'utf8'); } catch { return null; } };
const exists = (abs) => fs.existsSync(abs);
const p = (repo, rel) => path.join(repo, ...rel.split('/'));
/** 按仓库相对路径读。分开一个函数，避免把 (repo, rel) 误传给只吃绝对路径的 read()。 */
const readRel = (repo, rel) => read(p(repo, rel));

/** 今天（本地日期，YYYY-MM-DD）。用日期串比较，避免时区把"当天到期"算成过期。 */
function todayStr() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function daysBetween(fromStr, toStr) {
  const a = Date.parse(`${fromStr}T00:00:00`);
  const b = Date.parse(`${toStr}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

// ---------------------------------------------------------------- ADR 生命周期
// 判定口径（三正交维度 + 一个派生显示态）：
//
//   expiry        valid / expired / unknown       —— 只看 expires_if_unchanged 与今天
//   supersession  none / partial / full / unknown —— 只看 Status 与 Superseded-by
//   review        done / pending / not_required / unknown
//                 整体被取代(full) → not_required（取代它的那份已经接管了结论，
//                 再去复查一份已作废的文件没有意义 —— 这是唯一允许豁免复查的情形）
//                 其余已过期      → pending
//
// 三个维度正交，所以「已被取代」不会掩盖「已过期」，两者能同时显示。
// 派生显示态互斥且有优先级：superseded > expired > due > current > unknown。
//
// 字段两种写法都认：§15 模板的 YAML snake_case，与实际文档用的 Markdown 粗体标签。
// 只认一种会把"格式不一致"误报成"字段缺失"（这是本项目踩过的坑）。

const FIELD_PATTERNS = {
  status: [/- \*\*Status\*\*:\s*(.+)/i, /^status:\s*(.+)$/im],
  supersededBy: [/- \*\*Superseded-by\*\*:\s*(.+)/i, /^superseded_by:\s*(.+)$/im],
  supersedes: [/- \*\*Supersedes\*\*:\s*(.+)/i, /^supersedes:\s*(.+)$/im],
  evidenceAsOf: [/- \*\*Evidence as of\*\*:\s*(.+)/i, /^evidence_as_of:\s*(.+)$/im],
  expires: [/- \*\*Expires if unchanged\*\*:\s*(.+)/i, /^expires_if_unchanged:\s*(.+)$/im],
  sourceKind: [/- \*\*Evidence source kind\*\*:\s*(.+)/i, /^evidence_source_kind:\s*(.+)$/im],
};

function pickField(text, key) {
  for (const re of FIELD_PATTERNS[key]) {
    const m = text.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

const DATE_RE = /(\d{4}-\d{2}-\d{2})/;

function parseAdr(repo, abs) {
  const rel = path.relative(repo, abs).split(path.sep).join('/');
  let text = '';
  try { text = fs.readFileSync(abs, 'utf8'); } catch { /* 留空 */ }

  const rawStatus = pickField(text, 'status');
  const rawSupersededBy = pickField(text, 'supersededBy');
  const rawSupersedes = pickField(text, 'supersedes');
  const rawAsOf = pickField(text, 'evidenceAsOf');
  const rawExpires = pickField(text, 'expires');
  const rawKind = pickField(text, 'sourceKind');

  const asOf = rawAsOf?.match(DATE_RE)?.[1] ?? null;
  const expires = rawExpires?.match(DATE_RE)?.[1] ?? null;
  const today = todayStr();

  // --- expiry
  let expiry = 'unknown';
  let ageDays = null;
  let remainDays = null;
  if (expires) {
    ageDays = daysBetween(expires, today);
    remainDays = daysBetween(today, expires);
    expiry = remainDays != null && remainDays < 0 ? 'expired' : 'valid';
  }

  // --- supersession：只描述"这份文件自己的命运"。
  //     出边的 Supersedes（我取代了谁）是另一件事，不能拿它判断我是否被取代 ——
  //     ADR-006 写着 "Supersedes: ADR-005 中…的部分"，但它自己完全是 Accepted，没有被取代。
  //     `Supersedes: 无` 等于没有，不能因为字段存在就算"有取代关系"。
  const statusText = rawStatus ?? '';
  const supersedesList = !rawSupersedes || /^\s*无/.test(rawSupersedes)
    ? []
    : (rawSupersedes.match(/ADR-\d{3}/g) ?? []);

  let supersession = 'unknown';
  if (rawStatus == null) {
    supersession = 'unknown';
  } else if (/部分被|局部被/.test(statusText) && /supersed|取代/i.test(statusText)) {
    // "拆分原则保留；实现方式部分被 [ADR-006] Supersede" —— 主体仍在，只被取代了一部分
    supersession = 'partial';
  } else if (/^\s*superseded/i.test(statusText)) {
    supersession = 'full';
  } else {
    supersession = 'none';
  }

  // --- review：整体被取代是**唯一**允许豁免复查的情形（取代它的那份已接管结论）
  let review = 'unknown';
  if (supersession === 'full') review = 'not_required';
  else if (expiry === 'unknown') review = 'unknown';
  else if (expiry === 'expired') {
    // 过期后是否重新取过证据：evidence_as_of 晚于 expires 才算"复查过"
    review = asOf && expires && daysBetween(expires, asOf) > 0 ? 'done' : 'pending';
  } else {
    review = 'done';
  }

  // --- 依赖：只从正文里抓"依赖 ADR-xxx"这种明写，抓不到就不编
  const deps = [...text.matchAll(/依赖\s*(ADR-\d{3}(?:\s*(?:\/|、|,|和|与)\s*ADR-\d{3})*)/g)]
    .flatMap((m) => m[1].match(/ADR-\d{3}/g) ?? []);

  const id = (path.basename(rel).match(/ADR-\d{3}/) ?? ['ADR-???'])[0];
  const title = (text.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(rel)).replace(/^ADR-\d{3}:\s*/, '');

  return {
    id, title, rel,
    expiry, supersession, review,
    asOf, expires, ageDays, remainDays,
    sourceKind: rawKind,
    statusText: rawStatus,
    supersededBy: rawSupersededBy ? (rawSupersededBy.match(/ADR-\d{3}/)?.[0] ?? rawSupersededBy) : null,
    supersedesList,
    deps: [...new Set(deps)],
    hasAsOfField: rawAsOf != null,
    hasExpiresField: rawExpires != null,
  };
}

/** 只看这份文件自己的三个维度，先给一个基础态 */
function baseState(a) {
  if (a.supersession === 'full') return 'superseded';
  if (a.supersession === 'unknown' || a.expiry === 'unknown') return 'unknown';
  if (a.expiry === 'expired') return 'expired';
  if (a.remainDays != null && a.remainDays <= 7) return 'due';
  return 'current';
}

/**
 * 第二遍：加上"上游联动"，得到最终显示态。
 * 这就是「决策仍然有效，但需要重新核实」——自己的日期还没到，但它依赖的决策已经过期或被取代。
 * 排除"是我自己取代了它"的上游（ADR-005 取代了 ADR-004，不能反过来因为 ADR-004 被取代而标记 ADR-005）。
 */
function finalizeAdrStates(adrs) {
  const byId = new Map(adrs.map((a) => [a.id, a]));
  for (const a of adrs) a.baseState = baseState(a);
  for (const a of adrs) {
    a.upstream = (a.deps ?? [])
      .map((d) => byId.get(d))
      .filter(Boolean)
      .filter((up) => up.id !== a.id && up.supersededBy !== a.id)
      .map((up) => ({ id: up.id, baseState: up.baseState }))
      .filter((up) => up.baseState !== 'current' && up.baseState !== 'due');
    const needsReverify = a.upstream.length > 0;
    a.state = (a.baseState === 'current' || a.baseState === 'due') && needsReverify
      ? 'reverify'
      : a.baseState;
  }
  return adrs;
}

const ADR_STATE_TEXT = {
  superseded: '已被整体取代',
  expired: '已过期，待复查',
  reverify: '自身未过期，但上游已变，需重新核实',
  due: '7 天内到期',
  current: '在时效内',
  unknown: '字段读不出',
};

function adrCheck(adr) {
  const status = {
    superseded: 'pass',   // 已被取代 = 状态明确、结论已移交，不是缺陷
    expired: 'fail',
    reverify: 'warn',
    due: 'warn',
    current: 'pass',
    unknown: 'unknown',
  }[adr.state];

  const obs = [
    `显示态：${ADR_STATE_TEXT[adr.state]}`,
    `时效：${adr.expiry}${adr.expires ? `（expires ${adr.expires}，${adr.remainDays < 0 ? `已过 ${-adr.remainDays} 天` : `剩 ${adr.remainDays} 天`}）` : '（无日期）'}`,
    `取代：${adr.supersession}${adr.supersededBy ? `（被 ${adr.supersededBy} 取代）` : ''}`,
    `复查义务：${adr.review}`,
    adr.upstream?.length ? `上游变动：${adr.upstream.map((u) => `${u.id}(${ADR_STATE_TEXT[u.baseState]})`).join('、')}` : '',
  ].filter(Boolean).join(' · ');

  const fix = {
    superseded: `无需复查。引用时用取代它的 ${adr.supersededBy ?? '那份'}，不要引这份。`,
    expired: adr.review === 'pending'
      ? '按 §15 超期处置：复查通过就更新 evidence_as_of 与 expires_if_unchanged；复查失败就降级为 Hypothesis 并登记 Conflict Registry。复查之前，它的结论不得作为新决策的论据。'
      : '确认复查结论并更新日期字段。',
    reverify: `自身日期还没到，但它依赖的 ${adr.upstream.map((u) => u.id).join('、')} 已经过期或被取代。引用本决策前先核实上游变化是否影响其结论。`,
    due: '排入本月复查（§19.5 批量复查节奏）。',
    current: null,
    unknown: '补齐 Status / Evidence as of / Expires if unchanged 三个字段（两种写法都认：YAML 或 Markdown 粗体标签）。字段读不出时不能当作有效。',
  }[adr.state];

  return {
    id: adr.id,
    layer: 'DR',
    group: 'ADR 生命周期',
    title: adr.title,
    ruleRef: 'docs/evidence-governance.md §15 结论时效性模型 · 超期处置 1–4',
    status,
    observed: obs,
    expected: 'Status / Evidence as of / Expires if unchanged 可读；未过期且未被取代的才能作为新决策论据',
    fix,
    detail: adr,
  };
}

// ---------------------------------------------------------------- 检查主体

export async function readHealth(repo, opts = {}) {
  const at = new Date().toISOString();
  const today = todayStr();
  const checks = [];
  const push = (c) => checks.push({ checkedAt: at, ...c, layer: c.layer, group: c.group ?? null });

  const contract = deriveContract(repo);
  const constText = await readRel(repo, '.governance/core/constitution.md');
  const configText = await readRel(repo, '.governance/hooks/config.json');

  // ============================== L1 Core
  {
    const rows = parseParamRows(constText);
    const bad = [];
    const missing = [];
    for (const [name, rule] of Object.entries(PARAM_RULES)) {
      const row = rows.get(name);
      if (!row) { missing.push(name); continue; }
      const n = Number(row.value);
      if (!Number.isFinite(n)) bad.push(`${name}=${row.value}（不是数字）`);
      else if (rule.integer && !Number.isInteger(n)) bad.push(`${name}=${row.value}（须整数）`);
      else if (n < rule.min) bad.push(`${name}=${row.value}（<${rule.min}）`);
      else if (rule.max != null && n > rule.max) bad.push(`${name}=${row.value}（>${rule.max}）`);
    }
    push({
      id: 'L1-PARAMS', layer: 'L1', title: '宪法可调参数齐备且在语义边界内',
      ruleRef: '.governance/core/constitution.md · 项目可调参数',
      status: bad.length ? 'fail' : missing.length ? 'warn' : constText ? 'pass' : 'unknown',
      observed: constText == null ? 'constitution.md 不存在'
        : bad.length ? bad.join('；')
        : missing.length ? `缺 ${missing.join('、')}`
        : `${Object.keys(PARAM_RULES).length} 个参数齐备且在边界内`,
      expected: '8 个参数都在表中，且落在各自语义允许的区间',
      fix: bad.length || missing.length ? '在控制台「宪法参数」里改，或直接编辑该表。' : null,
      detail: { bad, missing },
    });

    const coreFiles = ['.governance/core/constitution.md', '.governance/core/rubric.md'];
    const gone = coreFiles.filter((f) => !exists(p(repo, f)));
    push({
      id: 'L1-FILES', layer: 'L1', title: 'Core 必备文件存在',
      ruleRef: 'docs/decisions/delivery-framework-design.md §四 · .governance/core/',
      status: gone.length ? 'fail' : 'pass',
      observed: gone.length ? `缺失：${gone.join('、')}` : 'constitution.md 与 rubric.md 都在',
      expected: 'core/ 下宪法与评分细则都存在',
      fix: gone.length ? '从 git 恢复。' : null,
    });

    // token 上限没有权威分词器就不编数字：明确报 unknown 并说明原因
    if (constText != null) {
      const chars = [...constText].length;
      push({
        id: 'L1-SIZE', layer: 'L1', title: '宪法篇幅 ≤800 token',
        ruleRef: 'docs/decisions/delivery-framework-design.md §四 · .governance/core/「存什么」',
        status: 'unknown',
        observed: `宪法 ${chars} 字符；仓库未引入分词器，无法给出权威 token 数`,
        expected: '≤800 token（跨项目通用治理原则）',
        fix: '需要权威判定时装一个分词器，或把该约定改成可机械核对的字符上限——现在这条约定是不可测量的。',
        detail: { chars },
      });
    }
  }

  // ============================== L2 Rules
  {
    const rulesDir = p(repo, '.governance/rules');
    let files = [];
    try { files = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md')); } catch { /* 不存在 */ }
    const lineCounts = files.map((f) => {
      const t = fs.readFileSync(path.join(rulesDir, f), 'utf8');
      return { f, lines: t.split('\n').length };
    });
    const fat = lineCounts.filter((x) => x.lines > 50);
    push({
      id: 'L2-PRESENT', layer: 'L2', title: '入口规则存在',
      ruleRef: 'docs/decisions/delivery-framework-design.md §四 · .governance/rules/',
      status: !exists(rulesDir) ? 'not_applicable' : files.length ? 'pass' : 'fail',
      observed: !exists(rulesDir) ? 'rules/ 已停用（当前装配不含该层）'
        : `${files.length} 份入口规则`,
      expected: '若保留该层，至少有一份装好即生效的入口规则',
      fix: !exists(rulesDir) ? null : files.length ? null : '从 git 恢复 rules/，或改用不含该层的装配。',
      detail: { files: lineCounts },
    });
    if (exists(rulesDir) && files.length) {
      push({
        id: 'L2-THIN', layer: 'L2', title: '入口规则保持薄入口（≤50 行）',
        ruleRef: 'docs/decisions/delivery-framework-design.md §四 · 薄度量化',
        status: fat.length ? 'warn' : 'pass',
        observed: fat.length ? `超过 50 行：${fat.map((x) => `${x.f}(${x.lines})`).join('、')}`
          : `最长的 ${Math.max(...lineCounts.map((x) => x.lines))} 行`,
        expected: '每份入口规则 ≤50 行，只含路径引用 + 触发条件 + 一句话机制说明',
        fix: fat.length ? '把完整内容移到 examples/，入口只留指针。' : null,
        detail: { lineCounts },
      });
    }
  }

  // ============================== L3 Capabilities
  {
    const capsPresent = exists(p(repo, '.governance/capabilities'));
    if (!capsPresent) {
      push({
        id: 'L3-IMPL', layer: 'L3', title: '分发器的静态导入可解析',
        ruleRef: '.governance/plugin/*.ts · from "../capabilities/<dir>/index.js"',
        status: 'not_applicable',
        observed: 'capabilities/ 已停用（当前装配不含该层）',
        expected: '不适用', fix: null,
      });
    } else {
      const broken = contract.imports.filter((i) => !i.target);
      push({
        id: 'L3-IMPL', layer: 'L3', title: '分发器的静态导入可解析',
        ruleRef: '.governance/plugin/*.ts · from "../capabilities/<dir>/index.js"',
        status: broken.length ? 'fail' : contract.imports.length ? 'pass' : 'unknown',
        observed: broken.length ? broken.map((b) => `${b.from} → ${b.spec} 不存在`).join('；')
          : contract.imports.length ? `${contract.imports.length} 处导入全部可解析` : '分发器里没有对 capabilities/ 的导入',
        expected: '每处静态导入都指向磁盘上存在的文件（否则插件加载直接失败）',
        fix: broken.length ? '恢复缺失的实现文件，或从分发器移除该导入。' : null,
        detail: { imports: contract.imports },
      });
      push({
        id: 'L3-ORPHAN', layer: 'L3', title: '没有无分发者的 Capability 目录',
        ruleRef: '.governance/capabilities/ ＋ 分发器导入 ＋ config 读取点 ＋ scripts/governance-capability.mjs 登记表',
        status: contract.orphans.length ? 'warn' : 'pass',
        observed: contract.orphans.length
          ? contract.orphans.map((d) => (contract.manualBrokenDirs.includes(d)
            ? `${d}（登记了手动入口但标为不可执行：${contract.manualEntries.find((e) => e.dir === d)?.reason ?? '原因未登记'}）`
            : `${d}（完全没有调用路径）`)).join('；')
          : `${contract.capDirs.length} 个目录都有调用路径` +
            (contract.manualEntries.length ? `（其中 ${contract.manualEntries.filter((e) => e.runnable).length} 个走手动入口）` : ''),
        expected: '每个目录都能被某条调用路径用到；否则它不会被调用',
        fix: contract.orphans.length
          ? '登记进 scripts/governance-capability.mjs 并让它真的可执行（或用 hook 分发），否则删掉。留着会被误认为已生效。'
          : null,
        detail: { orphans: contract.orphans, dirs: contract.capDirs, manual: contract.manualEntries },
      });
    }
  }

  // ============================== L4 Hooks + 入口
  {
    const clinerules = await readRel(repo, '.clinerules');
    push({
      id: 'L4-CLINERULES', layer: 'L4', title: '.clinerules 是有效加载入口',
      ruleRef: 'docs/decisions/delivery-framework-design.md §四 · .clinerules',
      status: clinerules == null ? 'fail' : /\.governance/.test(clinerules) ? 'pass' : 'warn',
      observed: clinerules == null ? '.clinerules 不存在'
        : /\.governance/.test(clinerules) ? '存在且指向 .governance/' : '存在但没有指向 .governance/',
      expected: '根部 .clinerules 存在，内容指向 .governance/core/ 与 .governance/rules/',
      fix: clinerules == null ? '从 git 恢复——它是 Cline 加载链的起点，缺了整套机制不生效。'
        : /\.governance/.test(clinerules) ? null : '补上指向 .governance/ 的入口说明。',
    });

    let config = null;
    let configErr = null;
    if (configText == null) configErr = 'config.json 不存在';
    else { try { config = JSON.parse(configText); } catch (e) { configErr = `解析失败：${e.message}`; } }
    push({
      id: 'L4-CONFIG', layer: 'L4', title: 'hooks/config.json 可解析',
      ruleRef: '.governance/plugin/config-loader.ts · loadConfig',
      status: configErr ? (configText == null ? 'not_applicable' : 'fail') : 'pass',
      observed: configErr ?? '合法 JSON 对象',
      expected: '合法 JSON 对象',
      fix: configErr && configText != null
        ? '修好语法。注意 loadConfig 遇到坏配置不报错，而是静默回落到 DEFAULT_CONFIG（全部按默认开着）。'
        : null,
    });

    const enabledHooks = config ? Object.entries(config).filter(([, v]) => v && v.enabled === true).map(([k]) => k) : [];
    if (config && !contract.ok) {
      push({
        id: 'L4-DISPATCH', layer: 'L4', title: '启用的 Capability 能被分发器解析',
        ruleRef: '.governance/plugin/types.ts · DEFAULT_CONFIG ＋ plugin 源码读取点',
        status: 'unknown',
        observed: `分发契约读不出：${contract.problems.join('；')}`,
        expected: '配置里启用的 Capability 都能在分发器里找到读取点',
        fix: '恢复 types.ts / index.ts。读不出契约时无法确认任何 Capability 会执行。',
      });
    } else if (config) {
      const bad = [];
      for (const [hk, hv] of Object.entries(config)) {
        const caps = hv && typeof hv === 'object' && hv.capabilities ? hv.capabilities : null;
        if (!caps) continue;
        for (const [ck, cv] of Object.entries(caps)) {
          if (!cv || cv.enabled === false) continue;
          if (hv.enabled !== true) continue;
          if (!contract.consumed[ck]?.length && !contract.declared[hk]?.[ck]) bad.push(`${hk}.${ck}`);
        }
      }
      push({
        id: 'L4-DISPATCH', layer: 'L4', title: '启用的 Capability 能被分发器解析',
        ruleRef: '.governance/plugin/types.ts · DEFAULT_CONFIG ＋ plugin 源码读取点',
        status: bad.length ? 'fail' : 'pass',
        observed: bad.length ? `启用但无人读取：${bad.join('、')}` : '启用的 Capability 都有读取点',
        expected: '配置里启用的 Capability 都能在分发器里找到读取点',
        fix: bad.length ? '在 types.ts 声明 + 在 hooks/*.ts 里读取；只改 config 不会让它被执行。' : null,
        detail: { bad },
      });
    }

    const home = process.env.USERPROFILE || process.env.HOME || '';
    const installedDir = path.join(home, '.cline/plugins/installed/local/governance');
    const installed = exists(installedDir);
    push({
      id: 'L4-PLUGIN', layer: 'L4', title: '插件已安装到 Cline 发现路径',
      ruleRef: 'scripts/sync-governance-plugin.ps1（把 .governance/plugin 同步到 Cline 插件目录）',
      status: installed ? 'pass' : enabledHooks.length ? 'fail' : 'warn',
      observed: installed ? `已安装：${installedDir}` : `未安装（${installedDir} 不存在）；config.json 里启用着 ${enabledHooks.length} 个 hook`,
      expected: '启用了 hook 就要有进程执行它',
      fix: installed ? null : enabledHooks.length ? '点「一键安装 · 同步插件」，或把 hook 全关掉。' : '确定不用就保持未安装；要用先安装。',
      detail: { installedDir, enabledHooks },
    });

    const markerAbs = p(repo, '.governance/runtime/plugin-loaded.marker');
    if (exists(markerAbs)) {
      const st = fs.statSync(markerAbs);
      const age = Math.floor((Date.now() - st.mtimeMs) / 86400000);
      push({
        id: 'L4-MARKER', layer: 'L4', title: 'SessionStart 近期真的跑过',
        ruleRef: '.governance/runtime/plugin-loaded.marker（SessionStart hook 写入）',
        status: age <= 7 ? 'pass' : 'warn',
        observed: `marker ${age} 天前写入（${(await read(markerAbs) ?? '').trim()}）`,
        expected: '≤7 天内有刷新',
        fix: age > 7 ? '启动一次 `cline -i` 看 marker 是否刷新；不刷新说明 SessionStart 没跑到。' : null,
        detail: { ageDays: age },
      });
    } else {
      push({
        id: 'L4-MARKER', layer: 'L4', title: 'SessionStart 近期真的跑过',
        ruleRef: '.governance/runtime/plugin-loaded.marker（SessionStart hook 写入）',
        status: 'unknown',
        observed: 'marker 不存在：无法证明 SessionStart 跑过（也可能只是从没在这里启动过 cline）',
        expected: '≤7 天内有刷新',
        fix: '启动一次 `cline -i`，看 marker 是否生成。',
      });
    }
  }

  // ============================== L5 Runtime
  {
    const tracesAbs = p(repo, '.governance/runtime/traces.jsonl');
    const tracesText = (await read(tracesAbs)) ?? '';
    const lines = tracesText.split('\n').filter(Boolean);
    let lastAt = null;
    for (let i = lines.length - 1; i >= 0 && lastAt == null; i--) {
      // 实际字段名是 ts（见 .governance/runtime/traces.jsonl 的真实内容），
      // 顺手也认 at / timestamp，免得写法一变就静默读不出。
      try {
        const j = JSON.parse(lines[i]);
        lastAt = j.ts ?? j.at ?? j.timestamp ?? null;
      } catch { /* 跳过坏行 */ }
    }
    const traceAge = lastAt ? Math.floor((Date.now() - Date.parse(lastAt)) / 86400000) : null;

    // 快照的"生产者"有没有真的跑过：按 hook/capability 找最近的 pre-compact 记录。
    // 这一项是给 L5-SNAPSHOT 的 not_applicable 兜底的 —— 文件按设计可以不存在，
    // 但"生成链路到底跑没跑过"不能因此变成盲区（否则 hook 静默失效就永远看不见）。
    let preCompactLastAt = null;
    for (const line of lines) {
      try {
        const j = JSON.parse(line);
        const hook = String(j.hook ?? j.capability ?? '').toLowerCase();
        if (hook.includes('pre-compact') || hook.includes('precompact') || hook.includes('snapshotwriter')) {
          const ts = j.ts ?? j.at ?? j.timestamp ?? null;
          if (ts && (!preCompactLastAt || ts > preCompactLastAt)) preCompactLastAt = ts;
        }
      } catch { /* 跳过坏行 */ }
    }
    const preCompactAge = preCompactLastAt ? Math.floor((Date.now() - Date.parse(preCompactLastAt)) / 86400000) : null;
    const producerNote = preCompactLastAt
      ? `traces 里最近的 pre-compact 在 ${preCompactAge} 天前`
      : lines.length
        ? 'traces 里有记录但没有 pre-compact 条目，生成链路未验证'
        : '没有 traces 记录，生成链路未验证';
    push({
      id: 'L5-TRACES', layer: 'L5', title: 'Hook 调用轨迹有近期记录',
      ruleRef: '.governance/runtime/traces.jsonl（tracing 开启时各 hook 写入）',
      status: !exists(tracesAbs) ? 'not_applicable' : lines.length === 0 ? 'unknown' : traceAge != null && traceAge > 7 ? 'warn' : 'pass',
      observed: !exists(tracesAbs) ? 'traces.jsonl 不存在（tracing 可能从未开启）'
        : `${lines.length} 条记录${lastAt ? `，最后一条在 ${traceAge} 天前` : '，最后一条时间戳读不出'}`,
      expected: '开启 tracing 时，≤7 天内有记录',
      fix: !exists(tracesAbs) ? null : traceAge != null && traceAge > 7 ? '确认 tracing 是否仍开着，以及 hook 是否真的被调用。' : null,
      detail: { lines: lines.length, lastAt, traceAge },
    });

    const snapText = await read(p(repo, '.governance/runtime/snapshot.json'));
    let snapJson = null;
    let snapErr = null;
    if (snapText) { try { snapJson = JSON.parse(snapText); } catch (e) { snapErr = String(e.message ?? e); } }

    // 该路径同时是读写路径：snapshot-writer 往这里写实例，handoff-provider 从这里读实例。
    // 若这里放的是一份 JSON Schema 定义（含 $schema / properties / required），
    // 读取方会把它当成快照实例解析 —— 不报错，只是 decisions / active_todos 都取不到，Snapshot 段静默变空。
    const looksLikeSchema = snapJson
      && typeof snapJson === 'object'
      && (snapJson.$schema || (snapJson.properties && snapJson.type))
      && typeof snapJson.schema_version !== 'string';

    push({
      id: 'L5-SNAPSHOT', layer: 'L5', title: 'snapshot.json 是快照实例，可解析且带 schema_version',
      ruleRef: '.governance/runtime/snapshot.json（PreCompact hook 写、SessionStart hook 读）',
      // 不存在按设计可以不适用；但若"生产者最近刚跑过"却没有产出，那就是链路断了，必须报出来
      status: !snapText
        ? (preCompactAge != null && preCompactAge <= 7 ? 'warn' : 'not_applicable')
        : snapErr ? 'fail'
        : looksLikeSchema ? 'warn'
        : typeof snapJson?.schema_version === 'string' ? 'pass' : 'warn',
      observed: !snapText
        ? `runtime/snapshot.json 不存在（生成物不入库；本机尚未被 PreCompact 写过）· ${producerNote}`
        : snapErr ? `JSON 解析失败：${snapErr}`
        : looksLikeSchema
          ? `该路径上是 JSON Schema 定义（顶层键 ${Object.keys(snapJson).join('/')}），不是快照实例：schema_version 为 undefined，decisions / active_todos 取不到`
          : `schema_version=${snapJson?.schema_version ?? '(缺)'}`,
      expected: '该路径只放快照实例：含字符串型 schema_version，以及可选的 decisions / active_todos',
      fix: !snapText
        ? (preCompactAge != null && preCompactAge <= 7
          ? `PreCompact 在 ${preCompactAge} 天前跑过，却没有产出 runtime/snapshot.json —— 链路断了（权限？路径被改？写入被吞？）。查 snapshot-writer 的 metadata.writeError。`
          : '该文件由 PreCompact hook 生成、不入库，所以"不存在"本身是正常的。结构定义在 .governance/capabilities/snapshot-writer/snapshot.schema.json；要验证生成链路就跑一次 cline 会话触发压缩。')
        : snapErr ? '文件损坏：删除后由 hook 重新生成，或从备份恢复。'
        : looksLikeSchema
          ? '把 schema 移到 .governance/capabilities/snapshot-writer/snapshot.schema.json，该路径只留实例。现在 SessionStart 读到的是 schema，Snapshot 段会渲染成空——不报错，所以这个缺陷一直隐身。'
          : typeof snapJson?.schema_version === 'string' ? null : '补字符串型 schema_version，读方不知道按哪版结构解析。',
      detail: {
        schemaVersion: snapJson?.schema_version ?? null,
        looksLikeSchema,
        topKeys: snapJson && typeof snapJson === 'object' ? Object.keys(snapJson) : null,
      },
    });
  }

  // ============================== DR 决策记录
  {
    const adrDir = p(repo, 'docs/decisions/adr');
    let files = [];
    try { files = fs.readdirSync(adrDir).filter((f) => f.endsWith('.md')).sort(); } catch { /* 无 */ }
    const adrs = finalizeAdrStates(files.map((f) => parseAdr(repo, path.join(adrDir, f))));

    for (const adr of adrs) push(adrCheck(adr));

    if (adrs.length) {
      const noKind = adrs.filter((a) => !a.sourceKind);
      push({
        id: 'DR-SOURCE-KIND', layer: 'DR', title: 'ADR 声明了时效类别（evidence_source_kind）',
        ruleRef: 'docs/evidence-governance.md §15 结论时效性模型 · ADR frontmatter 强制字段',
        // §15 原文：新增 ADR 必填，存量 ADR 在下次 Update 时补 —— 存量缺失是规则允许的宽限，不是违规
        status: noKind.length === adrs.length ? 'warn' : noKind.length ? 'warn' : 'pass',
        observed: `${noKind.length}/${adrs.length} 份没有该字段${noKind.length ? `：${noKind.map((a) => a.id).join('、')}` : ''}（时效类别目前只写在「Expires if unchanged」的括号说明里，不可机读）`,
        expected: '§15 要求 evidence_as_of / expires_if_unchanged / evidence_source_kind 三字段；但同一条也写了「新增 ADR 必填，存量 ADR 在下次 Update 时补」',
        fix: '存量不违规，可在下次改动时补成显式字段（source-snapshot-main / ecosystem / doc-release），好让"到期该按 7/14/30 天算"可机读。',
        detail: { missing: noKind.map((a) => a.id) },
      });

      const counts = adrs.reduce((a, x) => { a[x.state] = (a[x.state] ?? 0) + 1; return a; }, {});
      push({
        id: 'DR-SUMMARY', layer: 'DR', title: '决策记录总体时效状况',
        ruleRef: 'docs/evidence-governance.md §15 · docs/dev-rules.md §1.13 结论时效性门控',
        status: (counts.expired ?? 0) > 0 ? 'fail'
          : (counts.reverify ?? 0) > 0 ? 'warn'
          : (counts.due ?? 0) > 0 ? 'warn'
          : (counts.unknown ?? 0) > 0 ? 'unknown' : 'pass',
        observed: `${adrs.length} 份 ADR：` + ['current', 'due', 'reverify', 'expired', 'superseded', 'unknown']
          .filter((k) => counts[k]).map((k) => `${ADR_STATE_TEXT[k]} ${counts[k]}`).join('，'),
        expected: '没有过期的仍在效决策；被取代的单独归类，不占用复查义务',
        fix: (counts.expired ?? 0) > 0
          ? `今天 ${today}：${adrs.filter((a) => a.state === 'expired').map((a) => a.id).join('、')} 已过复查期，复查前其结论不得作为新决策论据（dev-rules §1.13）。`
          : null,
        detail: {
          counts,
          adrs: adrs.map((a) => ({
            id: a.id, state: a.state, baseState: a.baseState,
            expiry: a.expiry, supersession: a.supersession, review: a.review,
            expires: a.expires, upstream: a.upstream,
          })),
        },
      });
    }
  }

  // ============================== GATE 记录型门禁
  // 这些检查的结论**无法由面板重算**：只能证明"某个时刻真的跑过一次"。
  // 所以一律读 gate-log.jsonl 的最后一条；没有记录就是 unknown，绝不显示成通过。
  const gateLog = await readGateLog(repo);
  for (const g of RECORDED_GATES) {
    const runs = gateLog.filter((r) => r.task === g.task);
    const last = runs.at(-1) ?? null;
    push({
      id: g.id, layer: 'GATE', title: g.title,
      ruleRef: g.ruleRef,
      status: !last ? 'unknown' : last.exit === 0 ? 'pass' : 'fail',
      observed: !last
        ? `没有运行记录 —— 未运行不等于通过。范围：${g.scope}`
        : `上次运行 ${last.at}（commit ${last.commit ?? '?'}）退出码 ${last.exit}`
          + `${last.summary ? ` · ${last.summary}` : ''}。范围：${g.scope}`,
      expected: g.expected,
      fix: !last
        ? `在健康页点「${g.action}」，或命令行 \`${g.cli}\`；结果会记进 .governance/runtime/gate-log.jsonl。`
        : last.exit !== 0 ? g.fixOnFail : g.limitation,
      detail: { last, runs: runs.length, scope: g.scope, limitation: g.limitation },
    });
  }

  // ---------------------------------------------------- 汇总
  const byLayer = HEALTH_LAYERS.map((l) => ({
    ...l,
    checks: checks.filter((c) => c.layer === l.id),
  })).filter((l) => l.checks.length);

  const summary = checks.reduce((a, c) => { a[c.status] = (a[c.status] ?? 0) + 1; return a; }, {});
  const blockingish = checks.filter((c) => c.status === 'fail' || c.status === 'unknown');

  return {
    at,
    today,
    commit: opts.commit ?? null,
    layerGroups: byLayer,
    checks,
    summary,
    // 面板顶部的"要不要现在处理"一句话结论。注意 unknown 也算"还没数"，
    // 不能因为"没有 fail"就说健康。
    verdict: (summary.fail ?? 0) > 0 ? 'attention'
      : (summary.unknown ?? 0) > 0 ? 'incomplete'
      : (summary.warn ?? 0) > 0 ? 'warnings'
      : 'ok',
    attention: blockingish.map((c) => ({ id: c.id, status: c.status, title: c.title })),
    sources: {
      timeliness: 'docs/evidence-governance.md §15 结论时效性模型',
      timelinessGate: 'docs/dev-rules.md §1.13 结论时效性门控',
      reviewCadence: 'docs/evidence-governance.md §19.5 复查节奏',
      linkGate: 'docs/dev-rules.md §1.17 规范性引用完整性门控',
      layerContract: 'docs/decisions/delivery-framework-design.md §四',
      presetMatrix: 'docs/decisions/delivery-framework-design.md §五',
    },
  };
}

// ---------------------------------------------------------------- 记录型门禁的日志

export const GATE_LOG_REL = '.governance/runtime/gate-log.jsonl';

/**
 * 读门禁运行记录。文件不存在 = 从没跑过 → 返回空数组，
 * 上层据此报 unknown（"未运行不等于通过"）。
 * 放在 runtime/*.jsonl 下，因此本来就在 .gitignore 里：
 * 它是**本机运行记录**，不是仓库事实。
 */
export async function readGateLog(repo) {
  const text = await read(p(repo, GATE_LOG_REL));
  if (!text) return [];
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* 坏行跳过 */ }
  }
  return out;
}

export async function appendGateLog(repo, entry) {
  const abs = p(repo, GATE_LOG_REL);
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  await fsp.appendFile(abs, `${JSON.stringify(entry)}\n`, 'utf8');
  return entry;
}
