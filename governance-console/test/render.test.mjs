/**
 * render.test.mjs — 前端渲染器（无浏览器）
 *
 * 这台机器上 headless Chrome 打不开 127.0.0.1，截图靠不住；但"渲染函数会不会崩、
 * 明细列对不对"是可以离线验证的：public/app.js 是普通 script，顶部只有函数声明，
 * 因此放进 vm 上下文后 `renderDetail` 会挂到全局，可以直接调用。
 *
 * 这组用例守的是「明细不是第二套判定」：它只展开 status 背后那些可核对的原始值，
 * 且必须把英文枚举翻成人话——否则面板上出现的就是 `expiry=expired`，
 * 而"我该按哪个维度判定"恰恰是这套模型最容易误读的地方。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import { test, ok, eq } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_JS = path.join(HERE, '..', 'public', 'app.js');

// ---------------------------------------------------------------- 最小 DOM

function mkNode(tag) {
  return {
    tagName: String(tag).toUpperCase(),
    nodeType: 1,
    className: '',
    textContent: '',
    innerHTML: '',
    hidden: false,
    disabled: false,
    dataset: {},
    style: {},
    attrs: {},
    children: [],
    classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    removeAttribute() {},
    remove() {},
    closest() { return null; },
    focus() {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
  };
}

/** 载入 app.js，返回 vm 上下文（renderDetail 等函数声明会挂到上下文上） */
function bootApp() {
  const ids = new Map();
  const document = {
    createElement: mkNode,
    createTextNode: (t) => ({ nodeType: 3, textContent: String(t), children: [] }),
    getElementById(id) {
      if (!ids.has(id)) ids.set(id, mkNode('div'));
      return ids.get(id);
    },
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener() {},
    activeElement: { tagName: 'BODY' },
    documentElement: { dataset: {} },
  };
  const sandbox = {
    document,
    window: { __CONSOLE_TOKEN__: 'test-token' },
    location: { search: '', href: 'http://127.0.0.1:0/' },
    localStorage: { getItem: () => null, setItem() {} },
    URLSearchParams,
    setTimeout,
    clearTimeout,
    console,
    // 初始 load() 会去取状态；测试不关心它，给个永不 settle 的 promise
    fetch: () => new Promise(() => {}),
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(APP_JS, 'utf8'), sandbox, { filename: 'app.js' });
  return sandbox;
}

/** 节点的可读轮廓：折叠成「标签.类名 "文本"（子节点）」 */
function outline(n) {
  if (n == null) return '';
  if (n.nodeType === 3) return n.textContent;
  const cls = n.className ? `.${n.className.split(' ').join('.')}` : '';
  const kids = (n.children ?? []).map(outline).filter(Boolean).join(' ');
  const own = n.textContent || '';
  const body = [own, kids].filter(Boolean).join(' ');
  return `<${n.tagName.toLowerCase()}${cls}>${body}</${n.tagName.toLowerCase()}>`;
}

function textOf(n) {
  if (n == null) return '';
  if (n.nodeType === 3) return n.textContent;
  return [n.textContent ?? '', ...(n.children ?? []).map(textOf)].filter(Boolean).join(' ');
}

/** 取出所有表格的表头，用来钉住列顺序（列太多就没人看了，所以顺序是有意选的） */
function headers(n, out = []) {
  if (n == null || n.nodeType === 3) return out;
  if (n.tagName === 'TABLE' && n.children[0]?.children[0]?.children?.length) {
    out.push(n.children[0].children[0].children.map((th) => th.textContent));
  }
  for (const k of n.children ?? []) headers(k, out);
  return out;
}

function rowCount(n, out = { n: 0 }) {
  if (n == null || n.nodeType === 3) return out;
  if (n.tagName === 'TBODY') out.n += n.children.length;
  for (const k of n.children ?? []) rowCount(k, out);
  return out;
}

// ---------------------------------------------------------------- 夹具

const ADR_101 = {
  id: 'ADR-101', title: '已过期的决策', status: 'fail',
  observed: '显示态：已过期，待复查', expected: '字段可读且未过期', fix: '按 §15 复查',
  ruleRef: 'docs/evidence-governance.md §15',
  detail: {
    id: 'ADR-101',
    title: '已过期的决策',
    rel: 'docs/decisions/adr/ADR-101-old.md',
    sourceDir: 'docs/decisions/adr',
    expiry: 'expired',
    supersession: 'none',
    review: 'pending',
    asOf: '2026-08-01',
    expires: '2026-09-01',
    ageDays: 78,
    remainDays: -30,
    sourceKind: null,
    statusText: 'Accepted',
    supersededBy: null,
    supersedesList: [],
    deps: ['ADR-100'],
    hasAsOfField: true,
    hasExpiresField: true,
    baseState: 'expired',
    upstream: [],
    state: 'expired',
  },
};

const DR_SUMMARY = {
  id: 'DR-SUMMARY', title: '决策记录总体时效状况', status: 'fail',
  observed: '7 份 ADR', expected: '没有过期的仍在效决策', fix: null,
  ruleRef: 'docs/evidence-governance.md §15',
  detail: {
    counts: { expired: 4, current: 2, superseded: 1 },
    adrs: [
      { id: 'ADR-101', state: 'expired', baseState: 'expired', expiry: 'expired', supersession: 'none', review: 'pending', expires: '2026-09-01', upstream: [] },
      { id: 'ADR-102', state: 'superseded', baseState: 'superseded', expiry: 'expired', supersession: 'full', review: 'not_required', expires: '2026-09-01', upstream: [] },
    ],
  },
};

const L3_IMPL = {
  id: 'L3-IMPL', title: '分发器的静态导入可解析', status: 'pass',
  observed: '5 处导入全部可解析', expected: '每处都指向存在的文件', fix: null,
  ruleRef: '.governance/plugin/*.ts',
  detail: {
    imports: [
      { from: '.governance/plugin/hooks/pre-compact.ts:15', spec: '../../capabilities/snapshot-writer/index.js', target: '.governance/capabilities/snapshot-writer/index.ts', capDir: 'snapshot-writer' },
      { from: '.governance/plugin/index.ts:3', spec: '../capabilities/git-checker/index.js', target: '.governance/capabilities/git-checker/index.ts', capDir: 'git-checker' },
    ],
  },
};

const GATE_LINKS = {
  id: 'GATE-LINKS', title: '链接与锚点门禁（记录型）', status: 'pass',
  observed: '上次运行退出码 0', expected: '退出码 0', fix: null,
  ruleRef: 'docs/dev-rules.md §1.17',
  detail: {
    last: { at: '2026-10-18T06:25:15.236Z', task: 'gate-links', exit: 0, commit: '259e16e', summary: 'PASS', counts: { files: 200, links: 1199, must_fix: 0, archived: 185 } },
    runs: 8,
    scope: '全仓 Markdown 链接与锚点',
    limitation: '只证明脚本在某一刻通过',
    logKept: 49,
    logSince: '2026-10-17T14:40:36.530Z',
    retention: { max: 400, keep: 200 },
  },
};

// ---------------------------------------------------------------- 用例

test('F01 ADR 明细：四维取值翻成人话，英文枚举留在括号里', () => {
  const app = bootApp();
  const node = app.renderDetail(ADR_101);
  ok(node, '有 detail 的检查应产出展开块');
  eq(node.tagName, 'DETAILS', '应折叠，别把判定行撑开');
  const text = textOf(node);
  ok(text.includes('结构化明细'), `摘要应写明是结构化明细，实际：${text.slice(0, 120)}`);
  ok(text.includes('expired（已过期，待复查）'), `显示态要翻成人话，实际：${text}`);
  ok(text.includes('none（无）'), `取代维度要翻成人话，实际：${text}`);
  ok(text.includes('pending（待复查）'), `复查义务要翻成人话，实际：${text}`);
  ok(text.includes('Status 原文'), '原始 Status 行要露出来，否则无法核对解析对不对');
  ok(text.includes('是'), '读到字段的布尔值应显示为是');
  ok(!text.includes('sourceKind'), 'null 字段应跳过，不该出现键名空转');
  ok(!text.includes('supersededBy'), 'null 字段应跳过');
  ok(text.includes('ADR-100'), '依赖数组应展开成编号');
  ok(outline(node).includes('<details.gate-det>'), '应带 gate-det 类名（两套主题都靠它取样式）');
});

test('F02 明细表格：列顺序按判定需要裁剪，行数等于数据条数', () => {
  const app = bootApp();
  const sum = app.renderDetail(DR_SUMMARY);
  const [adrCols] = headers(sum);
  eq(adrCols, ['编号', '显示态', '时效', '取代', '复查义务', '到期日'], 'ADR 表只留判定要用的列');
  eq(rowCount(sum).n, 2, '两行 ADR 数据');
  const sumText = textOf(sum);
  ok(sumText.includes('已被整体取代'), '被取代的 ADR 也要翻成人话');
  ok(!sumText.includes('本体态'), 'baseState 不在裁剪后的列里（避免表格宽到没人看）');
  ok(sumText.includes('各状态计数'), 'counts 应作为键值对出现');

  const impl = app.renderDetail(L3_IMPL);
  eq(headers(impl)[0], ['来源文件', '导入路径', '解析到'], 'imports 表三列');
  eq(rowCount(impl).n, 2, '两处导入');
  ok(textOf(impl).includes('snapshot-writer/index.ts'), '解析目标要露出来，否则无法核对导入指向哪');
});

test('F03 记录型门禁的明细带上保留策略，日志条数不说成总计', () => {
  const app = bootApp();
  const node = app.renderDetail(GATE_LINKS);
  const text = textOf(node);
  ok(text.includes('日志中保留'), `应报出日志里还留着几条，实际：${text}`);
  ok(text.includes('49'), '条数要显示');
  ok(text.includes('400') && text.includes('200'), '保留上限与压实目标都要给出');
  ok(text.includes('本任务记录条数'), '本任务条数与日志总条数必须分开，否则会被读成"跑过几次"');
  ok(text.includes('范围限制'), '记录型门禁必须带"没证明什么"');
});

test('F04 没有明细就不造假折叠块；未知字段用键名兜底而不是崩掉', () => {
  const app = bootApp();
  eq(app.renderDetail({ id: 'L1-FILES', status: 'pass' }), null, '没有 detail 应返回 null，不产生空壳');
  eq(app.renderDetail({ id: 'X', detail: {} }), null, '空 detail 同理');
  eq(app.renderDetail({ id: 'X', detail: { bad: [], missing: [] } }), null, '全是空数组也算没有明细');

  const weird = app.renderDetail({
    id: 'X',
    detail: { someUnknownKey: 'v', state: 'brand-new-state', retention: { max: 1, keep: 1 } },
  });
  const text = textOf(weird);
  ok(text.includes('someUnknownKey'), '未登记的字段直接用键名，不吞掉');
  ok(text.includes('brand-new-state'), '未登记的枚举值原样显示，不猜含义');
});
