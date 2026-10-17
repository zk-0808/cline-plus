/**
 * docs.mjs — 规则文档索引与读取。
 *
 * 目的：治理规则散在 .governance/ 与 docs/ 的多个目录里，逐个文件夹翻找既慢也看不出结构。
 * 这里把"有哪些规则文档、它们在第几层、章节目录、被谁引用、条款判据是什么"机械抽出来，
 * 供控制台做导航 —— **只做聚合与抽取，不改写任何文档内容，不作为新的权威源**。
 *
 * 安全：读取路径必须落在白名单前缀内，且解析后不得越出仓库根。
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

/** 可读取的前缀白名单（仓库相对、正斜杠） */
const ALLOW_PREFIX = ['.governance/', 'docs/', 'governance-console/'];
const ALLOW_EXACT = new Set(['HANDOFF.md', '.clinerules', 'README.md']);

const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.git']);

/** 分组定义：按治理层级归类，与 README「框架结构」的 L1–L5 对齐 */
const GROUPS = [
  { id: 'L1', label: 'L1 宪法', note: '跨项目通用元规则，变更频率 年/月', match: (r) => r.startsWith('.governance/core/') },
  { id: 'L2', label: 'L2 规则（薄入口）', note: '装好即生效的入口规则，变更频率 周', match: (r) => r.startsWith('.governance/rules/') },
  { id: 'L3', label: 'L3 能力模块', note: '「怎么做」的代码与其说明', match: (r) => r.startsWith('.governance/capabilities/') },
  { id: 'L4', label: 'L4 Hook', note: '「什么时候调用」的事件定义', match: (r) => r.startsWith('.governance/hooks/') },
  { id: 'EX', label: '参考包 examples', note: '可选样板，对着改', match: (r) => r.startsWith('.governance/examples/') },
  { id: 'DR', label: '决策记录', note: 'ADR 与框架自身的决策', match: (r) => r.startsWith('.governance/decisions/') || r.startsWith('docs/decisions/') },
  { id: 'MR', label: '元规则（项目级完整版）', note: 'dev-rules / evidence-governance / reviewer-personas / 开发提纲', match: (r) => /^docs\/(dev-rules|evidence-governance|reviewer-personas|PROJECT_DEV_OUTLINE)\.md$/.test(r) },
  { id: 'RT', label: '运行期与入口', note: '.clinerules / HANDOFF.md / README / 控制台说明', match: (r) => ALLOW_EXACT.has(r) || r === 'governance-console/README.md' },
  { id: 'OT', label: '其它项目文档', note: '未被上面的分组收走的 docs/ 文档', match: () => true },
];

const TITLE_RE = /^#\s+(.+?)\s*$/m;
const HEADING_RE = /^(#{2,4})\s+(.+?)\s*#*\s*$/;
const LIFESPAN_RE = /^>\s*\*\*生命周期\*\*[：:]\s*(.+?)\s*$/m;
const LINK_RE = /\[([^\]]*)\]\(\s*<?([^)\s>#]+)[^)]*\)/g;

/** 归一化成仓库相对正斜杠路径；不合法则返回 null */
export function normalizeRel(rel) {
  if (typeof rel !== 'string' || !rel) return null;
  const cleaned = rel.replace(/\\/g, '/').replace(/^\.\//, '');
  if (cleaned.includes('\0')) return null;
  const norm = path.posix.normalize(cleaned);
  if (norm.startsWith('..') || path.posix.isAbsolute(norm)) return null;
  if (ALLOW_EXACT.has(norm)) return norm;
  if (!ALLOW_PREFIX.some((p) => norm.startsWith(p))) return null;
  if (!norm.toLowerCase().endsWith('.md') && norm !== '.clinerules') return null;
  return norm;
}

export function resolveAbs(repo, rel) {
  const norm = normalizeRel(rel);
  if (!norm) return null;
  const abs = path.resolve(repo, norm);
  const root = path.resolve(repo) + path.sep;
  if (!abs.startsWith(root)) return null;
  return abs;
}

function walkMd(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (SKIP_DIR.has(e.name)) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else if (e.name.toLowerCase().endsWith('.md')) out.push(abs);
    }
  };
  walk(root);
  return out;
}

function headingsOf(text) {
  const out = [];
  const lines = text.split('\n');
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = line.match(HEADING_RE);
    if (m) out.push({ level: m[1].length, text: cleanInline(m[2]), line: i + 1 });
  }
  return out;
}

function cleanInline(s) {
  return s
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .trim();
}

function groupOf(rel) {
  for (const g of GROUPS) if (g.match(rel)) return g;
  return GROUPS[GROUPS.length - 1];
}

/** 全量索引：文档清单 + 标题 + 生命周期 + 反向引用 */
export async function buildIndex(repo) {
  const roots = ['.governance', 'docs'].map((r) => path.join(repo, r)).filter((p) => fs.existsSync(p));
  const absList = roots.flatMap(walkMd);

  // 全仓（限白名单）收集链接，建反向引用表
  const inbound = new Map(); // targetRel -> [{from, line, text}]
  const files = [];
  for (const abs of absList) {
    const rel = path.relative(repo, abs).replace(/\\/g, '/');
    if (!normalizeRel(rel)) continue;
    files.push({ abs, rel });
  }
  // 精确文件（HANDOFF.md / .clinerules / README.md）
  for (const rel of ALLOW_EXACT) {
    const abs = path.join(repo, rel);
    if (fs.existsSync(abs)) files.push({ abs, rel });
  }

  const texts = new Map();
  await Promise.all(files.map(async (f) => {
    try { texts.set(f.rel, await fsp.readFile(f.abs, 'utf8')); } catch { texts.set(f.rel, ''); }
  }));

  for (const f of files) {
    const text = texts.get(f.rel) ?? '';
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      LINK_RE.lastIndex = 0;
      let m;
      while ((m = LINK_RE.exec(lines[i])) !== null) {
        const raw = m[2].replace(/\\/g, '/').replace(/^\.\//, '');
        if (/^[a-z]+:/i.test(raw)) continue;
        const targetDir = path.posix.dirname(f.rel);
        const resolved = path.posix.normalize(path.posix.join(targetDir, raw));
        const norm = normalizeRel(resolved);
        if (!norm) continue;
        if (!inbound.has(norm)) inbound.set(norm, []);
        inbound.get(norm).push({ from: f.rel, line: i + 1, text: cleanInline(m[1]).slice(0, 60) });
      }
    }
  }

  const docs = files.map((f) => {
    const text = texts.get(f.rel) ?? '';
    const titleM = text.match(TITLE_RE);
    const lifeM = text.match(LIFESPAN_RE);
    const heads = headingsOf(text);
    const refs = inbound.get(f.rel) ?? [];
    return {
      rel: f.rel,
      title: titleM ? cleanInline(titleM[1]) : path.posix.basename(f.rel, '.md'),
      lifespan: lifeM ? cleanInline(lifeM[1]).slice(0, 120) : null,
      bytes: Buffer.byteLength(text, 'utf8'),
      lines: text ? text.split('\n').length : 0,
      headings: heads.slice(0, 400),
      h1Count: heads.filter((h) => h.level === 1).length,
      inboundCount: refs.length,
      inboundFrom: [...new Set(refs.map((r) => r.from))].length,
      group: groupOf(f.rel).id,
    };
  });

  const groups = GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    note: g.note,
    docs: docs.filter((d) => d.group === g.id).sort((a, b) => a.rel.localeCompare(b.rel)),
  })).filter((g) => g.docs.length);

  // 未被任何文档引用的治理文档 —— 审计意义上的孤儿
  const orphans = docs
    .filter((d) => d.inboundCount === 0 && d.group !== 'RT' && d.group !== 'OT')
    .map((d) => d.rel);

  const missingLifespan = docs
    .filter((d) => !d.lifespan && ['L1', 'L2', 'L3', 'L4', 'EX', 'MR'].includes(d.group))
    .map((d) => d.rel);

  return {
    groups,
    stats: {
      total: docs.length,
      bytes: docs.reduce((a, d) => a + d.bytes, 0),
      groups: groups.length,
      orphans: orphans.length,
      missingLifespan: missingLifespan.length,
    },
    orphans,
    missingLifespan,
    docs: docs.map(({ headings, ...rest }) => rest),
  };
}

/** 单篇文档：正文 + 章节树 + 出/入链 */
export async function readDoc(repo, rel) {
  const norm = normalizeRel(rel);
  if (!norm) return { error: 'PATH_NOT_ALLOWED', message: `不在可读白名单内：${rel}` };
  const abs = resolveAbs(repo, norm);
  if (!abs || !fs.existsSync(abs)) return { error: 'NOT_FOUND', message: `文件不存在：${norm}` };

  const text = await fsp.readFile(abs, 'utf8');
  const titleM = text.match(TITLE_RE);
  const lifeM = text.match(LIFESPAN_RE);
  const headings = headingsOf(text);

  // 出链
  const outbound = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    LINK_RE.lastIndex = 0;
    let m;
    while ((m = LINK_RE.exec(lines[i])) !== null) {
      const raw = m[2].replace(/\\/g, '/').replace(/^\.\//, '');
      if (/^[a-z]+:/i.test(raw)) { outbound.push({ line: i + 1, text: cleanInline(m[1]), target: raw, external: true }); continue; }
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(norm), raw));
      outbound.push({ line: i + 1, text: cleanInline(m[1]).slice(0, 60), target: resolved, external: false, readable: !!normalizeRel(resolved) });
    }
  }

  return {
    rel: norm,
    title: titleM ? cleanInline(titleM[1]) : path.posix.basename(norm, '.md'),
    lifespan: lifeM ? cleanInline(lifeM[1]) : null,
    bytes: Buffer.byteLength(text, 'utf8'),
    lines: lines.length,
    headings,
    text,
    outbound: outbound.slice(0, 200),
  };
}

// ---------------------------------------------------------------- 条款抽取

/** 在这些文件里按标题层级抽"条款"，并抽 bold 标签字段 */
const CLAUSE_SOURCES = [
  { rel: '.governance/core/constitution.md', levels: [2], kind: '宪法' },
  { rel: 'docs/dev-rules.md', levels: [3], kind: '执行门控' },
  { rel: 'docs/evidence-governance.md', levels: [2, 3], kind: '证据治理' },
  { rel: 'docs/PROJECT_DEV_OUTLINE.md', levels: [2], kind: '工程纪律' },
  { rel: '.governance/rules/handoff-entry.md', levels: [2, 3], kind: '薄入口' },
  { rel: '.governance/rules/lifecycle.md', levels: [2, 3], kind: '薄入口' },
];

const LABEL_RE = /^\*\*([^*]{2,20})\*\*\s*[：:]\s*(.*)$/;
const ID_IN_TITLE = /^(\d+(?:\.\d+)*)[\s.、]*/;

function stripMd(s) {
  return s
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/^\s*>\s?/, '')
    .trim();
}

export async function extractClauses(repo) {
  const out = [];
  for (const src of CLAUSE_SOURCES) {
    const abs = resolveAbs(repo, src.rel);
    if (!abs || !fs.existsSync(abs)) continue;
    const text = await fsp.readFile(abs, 'utf8');
    const lines = text.split('\n');
    const marks = [];
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*(```|~~~)/.test(lines[i])) { inFence = !inFence; continue; }
      if (inFence) continue;
      const m = lines[i].match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (m && src.levels.includes(m[1].length)) marks.push({ idx: i, raw: m[2], level: m[1].length });
    }

    for (let k = 0; k < marks.length; k++) {
      const start = marks[k].idx;
      const end = k + 1 < marks.length ? marks[k + 1].idx : lines.length;
      const body = lines.slice(start + 1, end);

      // 先剥编号，再剥「子条款：」前缀 —— 顺序反了会把前缀留在标题里
      let title = cleanInline(marks[k].raw);
      const idM = title.match(ID_IN_TITLE);
      const id = idM ? idM[1] : '';
      title = title.replace(ID_IN_TITLE, '').replace(/^[、.\s]+/, '');
      title = title.replace(/^子条款[：:]\s*/, '').trim();

      const labels = {};
      const bullets = [];
      let firstPara = '';
      for (const ln of body) {
        const t = ln.trim();
        if (!t) continue;
        const lm = t.match(LABEL_RE);
        if (lm) {
          const key = lm[1].replace(/[（(].*?[)）]/g, '').trim();
          const val = stripMd(lm[2]);
          if (val) labels[key] = (labels[key] ? labels[key] + ' / ' : '') + val.slice(0, 220);
          continue;
        }
        if (/^\s*[-*+]\s+/.test(ln) || /^\s*\d+\.\s+/.test(ln)) { bullets.push(stripMd(t).slice(0, 160)); continue; }
        if (t.startsWith('>')) continue;
        if (!firstPara) firstPara = stripMd(t).slice(0, 200);
      }

      const priority = ['判据', '执行门控', '执行要求', '违反时', '禁止', '不适用范围', '源由'];
      const summaryKey = priority.find((p) => labels[p]);
      const summary = summaryKey ? labels[summaryKey] : (firstPara || bullets[0] || '');

      out.push({
        kind: src.kind,
        id,
        title,
        summary: summary.slice(0, 260),
        summaryFrom: summaryKey || (firstPara ? '首段' : (bullets.length ? '首条' : '')),
        labels,
        bullets: bullets.slice(0, 6),
        file: src.rel,
        line: start + 1,
        loc: `${src.rel}:${start + 1}`,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- 检索

export async function searchDocs(repo, q, limit = 80) {
  const needle = String(q || '').trim();
  if (needle.length < 2) return { hits: [], message: '至少输入 2 个字符。' };
  const lower = needle.toLowerCase();

  const roots = ['.governance', 'docs'].map((r) => path.join(repo, r)).filter((p) => fs.existsSync(p));
  const files = roots.flatMap(walkMd).map((abs) => path.relative(repo, abs).replace(/\\/g, '/'))
    .filter((rel) => normalizeRel(rel));
  for (const rel of ALLOW_EXACT) if (fs.existsSync(path.join(repo, rel))) files.push(rel);

  const hits = [];
  for (const rel of files) {
    const abs = path.join(repo, rel);
    let text;
    try { text = await fsp.readFile(abs, 'utf8'); } catch { continue; }
    if (!lower.split(/\s+/).every((w) => text.toLowerCase().includes(w))) continue;
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const lt = lines[i].toLowerCase();
      if (!lt.includes(lower.split(/\s+/)[0])) continue;
      if (!lower.split(/\s+/).every((w) => lt.includes(w))) continue;
      hits.push({ rel, line: i + 1, text: stripMd(lines[i]).slice(0, 180) || '(空行)' });
      if (hits.length >= limit) return { hits, truncated: true };
    }
  }
  return { hits, truncated: false };
}
