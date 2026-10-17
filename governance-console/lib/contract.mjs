/**
 * contract.mjs — 从**插件源码**推导「配置契约」，不维护任何手写白名单。
 *
 * 为什么必须推导而不是硬编码：
 *   框架明确允许用户新增 Capability（delivery-framework-design.md §四 · capabilities 一节
 *   "可删? ❌ 不可删（Hook 依赖）；可扩展（用户加自己的 Capability）"）。
 *   若校验器里存一份 capability 名称白名单，那么「加了自己的 Capability」这件事
 *   会被判成配置错误 —— 那把扩展性误判成了缺陷，比漏判更糟。
 *
 * 所以契约的唯一来源是**分发器自己**：
 *
 *   S1  types.ts  `interface HooksConfig`    → 有哪些合法顶层 Hook 键
 *   S2  types.ts  `const DEFAULT_CONFIG`     → 每个 Hook 声明了哪些 Capability、各自声明了哪些参数
 *   S3  plugin/**\/*.ts  代码里 `*.capabilities.<key>` 的真实读取点 → 哪些键真的会被消费
 *   S4  plugin/**\/*.ts  `from "../capabilities/<dir>/index.js"`   → 哪些实现**必须存在于磁盘**
 *   S5  capabilities/<dir>/                  → 磁盘上的实现目录（用于发现"无分发者的孤儿模块"）
 *
 * 关键事实（2026-10-17 复核）：本框架的 Capability 分发是**静态导入**，
 * 不是运行期扫描目录。因此"往 capabilities/ 里放一个目录"**不会**让它被调用；
 * 必须同时在 types.ts 声明、在 hooks/*.ts 里读取。校验器把这个事实如实报告，
 * 而不是假装目录存在就等于接线完成。
 */
import fs from 'node:fs';
import path from 'node:path';

export const PLUGIN_DIR_REL = '.governance/plugin';
export const CAPS_DIR_REL = '.governance/capabilities';

/** 分发器源码：排除 verify-governance.ts（它是验证脚本，不是分发器） */
const DISPATCHER_EXCLUDE = new Set(['verify-governance.ts']);

/** 手动入口脚本：它登记过的模块也算「有调用路径」，否则面板会把已接线的模块误报成孤儿 */
export const MANUAL_ENTRY_REL = 'scripts/governance-capability.mjs';

/**
 * 从手动入口的 REGISTRY 里摘出登记项。
 * 只认这个文件自己的固定写法（`'<id>': { … module: '…/capabilities/<dir>/index.ts' … }`）。
 * 解析不出就返回空数组：宁可少认一条入口，也不编造"已接线"。
 */
function parseManualEntries(repo) {
  let text = null;
  try { text = fs.readFileSync(path.join(repo, MANUAL_ENTRY_REL), 'utf8'); } catch { return []; }
  const out = [];
  const re = /'([a-z0-9-]+)':\s*\{([\s\S]*?)\n  \},/g;
  for (const m of text.matchAll(re)) {
    const body = m[2];
    const mod = body.match(/module:\s*'([^']+)'/)?.[1] ?? null;
    if (!mod) continue;
    const dir = mod.match(/capabilities\/([^/]+)\/index\.(?:ts|js)/)?.[1] ?? null;
    if (!dir) continue;
    out.push({
      id: m[1],
      dir,
      module: mod,
      runnable: /runnable:\s*true/.test(body),
      reason: body.match(/reason:\s*\n?\s*'([^']*)'/)?.[1]
        ?? body.match(/reason:\s*"([^"]*)"/)?.[1]
        ?? null,
    });
  }
  return out;
}

// ---------------------------------------------------------------- 微型扫描器
// 只需要处理本仓库这两种固定写法：TS 对象字面量（键可带引号/不带引号）与 import 语句。
// 不引第三方解析器，也不假装是通用 TS 解析器 —— 解析失败就返回 null，让上层报 unknown。

/** 从 openIdx 处的 '{' 开始，返回配对的块体（跳过字符串内的括号） */
function blockAt(text, openIdx) {
  if (text[openIdx] !== '{') return null;
  let depth = 0;
  let quote = null;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { body: text.slice(openIdx + 1, i), end: i };
    }
  }
  return null;
}

/** 按顶层逗号切分对象体（字符串与嵌套括号内的逗号不算） */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let cur = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quote) {
      cur += ch;
      if (ch === '\\') { cur += body[++i] ?? ''; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; cur += ch; continue; }
    if (ch === '{' || ch === '[' || ch === '(') depth++;
    else if (ch === '}' || ch === ']' || ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

const KEY_RE = /^\s*(?:"([^"]*)"|'([^']*)'|([A-Za-z0-9_$]+))\s*:/;

function splitEntry(part) {
  const m = part.match(KEY_RE);
  if (!m) return null;
  const key = m[1] ?? m[2] ?? m[3];
  return { key, value: part.slice(m[0].length).trim() };
}

/** 对象体 → [{key, value}]；value 是 '{' 开头时附带 body */
function entries(body) {
  return splitTopLevel(body)
    .map(splitEntry)
    .filter(Boolean)
    .map((e) => (e.value.startsWith('{') ? { ...e, body: blockAt(e.value, 0)?.body ?? null } : e));
}

/** 找到 `export const DEFAULT_CONFIG ... = {` 之后的对象体 */
function findDefaultConfig(text) {
  const at = text.search(/export\s+const\s+DEFAULT_CONFIG\b[^=]*=\s*\{/);
  if (at < 0) return null;
  const brace = text.indexOf('{', at);
  return blockAt(text, brace)?.body ?? null;
}

/** 找到 `interface HooksConfig {` 的块体 */
function findHooksConfigInterface(text) {
  const at = text.search(/interface\s+HooksConfig\b[^{]*\{/);
  if (at < 0) return null;
  const brace = text.indexOf('{', at);
  return blockAt(text, brace)?.body ?? null;
}

// ---------------------------------------------------------------- 命名与推导

/** config 里的 camelCase 键 → capabilities/ 下的目录名。仅作为候选之一，不当作唯一契约。 */
export function kebab(key) {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
}

function listDirs(abs) {
  try {
    return fs.readdirSync(abs, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  } catch { return []; }
}

function listTsFiles(dir) {
  const out = [];
  const walk = (d) => {
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx|mts|js|mjs)$/.test(e.name)) out.push(p);
    }
  };
  walk(dir);
  return out;
}

/** 相对 import 路径 → 真实存在的文件（.js 写法的 TS 源码要换回 .ts 再试） */
function resolveImport(repoAbs, fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const cands = [base, base.replace(/\.js$/, '.ts'), base.replace(/\.mjs$/, '.mts'), `${base}.ts`, `${base}.d.ts`];
  for (const c of cands) {
    try { if (fs.statSync(c).isFile()) return c; } catch { /* 继续 */ }
  }
  return null;
}

/**
 * 推导契约。
 * @returns {{
 *   ok: boolean, sources: object, problems: string[],
 *   hookKeys: string[],
 *   declared: Record<string, Record<string, {args: string[]}>>,
 *   consumed: Record<string, string[]>,     // capKey -> 读取点（文件:行）
 *   imports: Array<{from: string, spec: string, target: string|null, capDir: string|null}>,
 *   capDirs: string[],
 *   orphans: string[],
 * }}
 */
export function deriveContract(repo) {
  const pluginDir = path.join(repo, PLUGIN_DIR_REL);
  const capsDir = path.join(repo, CAPS_DIR_REL);
  const typesAbs = path.join(pluginDir, 'types.ts');
  const problems = [];

  const read = (abs) => { try { return fs.readFileSync(abs, 'utf8'); } catch { return null; } };

  // --- S1/S2 types.ts
  const typesText = read(typesAbs);
  let hookKeys = [];
  const declared = {};
  if (typesText == null) {
    problems.push('缺少 .governance/plugin/types.ts，无法推出 Hook/Capability 契约');
  } else {
    const iface = findHooksConfigInterface(typesText);
    if (iface == null) problems.push('types.ts 里找不到 `interface HooksConfig`，无法确认合法 Hook 键');
    else hookKeys = [...iface.matchAll(/"([A-Za-z][\w-]*)"\??\s*:/g)].map((m) => m[1]);

    const defBody = findDefaultConfig(typesText);
    if (defBody == null) problems.push('types.ts 里找不到 `DEFAULT_CONFIG` 对象字面量，无法确认 Capability 声明');
    else {
      for (const hookEntry of entries(defBody)) {
        if (!hookEntry.body) continue;
        const capsEntry = entries(hookEntry.body).find((e) => e.key === 'capabilities');
        const caps = {};
        if (capsEntry?.body) {
          for (const capEntry of entries(capsEntry.body)) {
            const argsEntry = capEntry.body ? entries(capEntry.body).find((e) => e.key === 'args') : null;
            caps[capEntry.key] = { args: argsEntry?.body ? entries(argsEntry.body).map((e) => e.key) : [] };
          }
        }
        declared[hookEntry.key] = caps;
        if (!hookKeys.includes(hookEntry.key)) hookKeys.push(hookEntry.key);
      }
    }
  }

  // --- S3/S4 plugin 源码里的真实读取点与静态导入
  const consumed = {};
  const imports = [];
  const dispatcherFiles = listTsFiles(pluginDir).filter((f) => !DISPATCHER_EXCLUDE.has(path.basename(f)));
  for (const file of dispatcherFiles) {
    const text = read(file) ?? '';
    const rel = path.relative(repo, file).split(path.sep).join('/');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/[A-Za-z0-9_$]*[cC]onfig\.capabilities\.([A-Za-z0-9_$]+)/g)) {
        const key = m[1];
        (consumed[key] ??= []).push(`${rel}:${i + 1}`);
      }
      for (const m of line.matchAll(/\bfrom\s+["'](\.[^"']*capabilities\/[^"']+)["']/g)) {
        const spec = m[1];
        const target = resolveImport(repo, file, spec);
        const capMatch = spec.match(/capabilities\/([^/]+)/);
        imports.push({
          from: `${rel}:${i + 1}`,
          spec,
          target: target ? path.relative(repo, target).split(path.sep).join('/') : null,
          capDir: capMatch ? capMatch[1] : null,
        });
      }
    });
  }

  // --- 工具名清单：skipTools 的"已知名称"只能来自仓库自己的出处，不能由校验器发明
  const defaultSkipTools = (() => {
    const m = typesText?.match(/skipTools\s*:\s*\[([^\]]*)\]/);
    if (!m) return [];
    return [...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]);
  })();

  const writeTools = (() => {
    const idx = dispatcherFiles.find((f) => path.basename(f) === 'index.ts');
    const text = idx ? read(idx) ?? '' : '';
    const m = text.match(/WRITE_TOOL_NAMES\s*=\s*new Set\(\s*\[([^\]]*)\]/);
    if (!m) return [];
    return [...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]);
  })();

  // --- S5 实现目录
  const capDirs = listDirs(capsDir);

  // --- 孤儿：既没有被静态导入，也不对应任何已声明的 Capability 键
  const declaredDirs = new Set(Object.values(declared).flatMap((caps) => Object.keys(caps)).map(kebab));
  const importedDirs = new Set(imports.map((i) => i.capDir).filter(Boolean));

  // 手动入口登记的模块也算"有调用路径"，但只有 runnable 的才算真能跑
  const manualEntries = parseManualEntries(repo);
  const manualRunnableDirs = new Set(manualEntries.filter((e) => e.runnable).map((e) => e.dir));
  const manualBrokenDirs = new Set(manualEntries.filter((e) => !e.runnable).map((e) => e.dir));

  const orphans = capDirs.filter((d) => !importedDirs.has(d) && !declaredDirs.has(d) && !manualRunnableDirs.has(d));

  return {
    ok: problems.length === 0,
    problems,
    sources: {
      hookKeys: `${PLUGIN_DIR_REL}/types.ts · interface HooksConfig`,
      declared: `${PLUGIN_DIR_REL}/types.ts · DEFAULT_CONFIG`,
      consumed: `${PLUGIN_DIR_REL}/**/*.ts · \`*.capabilities.<key>\` 读取点（已排除 verify-governance.ts）`,
      imports: `${PLUGIN_DIR_REL}/**/*.ts · from "../capabilities/<dir>/index.js"`,
      capDirs: `${CAPS_DIR_REL}/`,
    },
    hookKeys,
    declared,
    consumed,
    imports,
    capDirs,
    orphans,
    manualEntries,
    manualBrokenDirs: [...manualBrokenDirs],
    toolNames: {
      skipDefaults: defaultSkipTools,
      writeTools,
      source: `${PLUGIN_DIR_REL}/types.ts · DEFAULT_CONFIG.skipTools ＋ ${PLUGIN_DIR_REL}/index.ts · WRITE_TOOL_NAMES`,
    },
  };
}
