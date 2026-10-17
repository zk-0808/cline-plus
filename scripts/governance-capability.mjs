#!/usr/bin/env node
/**
 * governance-capability.mjs — Capability 的统一**手动入口**
 *
 * 为什么需要它：`.governance/capabilities/rule-appender/` 与 `staleness-sweeper/`
 * 都写着「可手动触发 / Can be run manually」，但它们既没有 hook 分发，scripts/ 里也没有
 * 任何调用入口 —— 文档按「已生效」描述，实际无法执行。这个文件把那条承诺变成可执行命令。
 *
 *   node scripts/governance-capability.mjs list
 *   node scripts/governance-capability.mjs rule-appender --experience "把 X 记下来" [--apply]
 *
 * 设计约束（对应评审点出的"参数校验或权限边界不足会误改治理文件"）：
 *  1. **白名单**：只认 REGISTRY 里登记过的模块，客户端不能指定任意路径去 import。
 *  2. **默认 dry-run**：不带 `--apply` 时在临时副本上跑，只打印差异，绝不写仓库。
 *  3. **写入白名单**：目标路径必须逐字等于该 Capability 声明的可写文件（rule-appender 只有
 *     `HANDOFF.md`），且解析后必须落在仓库根内；`.governance/core/`、`.governance/rules/`
 *     这类权威文件一律拒绝，双保险。
 *  4. **写前备份**：`--apply` 先备份到 `.governance/runtime/console-batches/manual-<ts>/`，
 *     与控制台的「变更批次」共用同一个还原区。
 *  5. 跑不起来的模块**如实报告原因**，不假装成功（例如 staleness-sweeper 的 `.js` 值导入）。
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO = path.resolve(HERE, '..');

/** 权威文件区：任何手动入口都不得写入 */
const PROTECTED_PREFIXES = ['.governance/core/', '.governance/rules/', '.governance/hooks/'];

export const REGISTRY = {
  'rule-appender': {
    label: '经验追加到 HANDOFF.md 待沉淀区',
    module: '.governance/capabilities/rule-appender/index.ts',
    exportName: 'ruleAppender',
    runnable: true,
    writable: ['HANDOFF.md'],
    requires: ['experience'],
    ruleRef: '.governance/capabilities/README.md §五；.governance/core/constitution.md §5',
  },
  'staleness-sweeper': {
    label: '更新待沉淀区权重列（可选物理删除过期项）',
    module: '.governance/capabilities/staleness-sweeper/index.ts',
    exportName: 'stalenessSweeper',
    runnable: false,
    // 必须是单行字符串字面量：控制台的契约推导逐个字段正则解析登记表，拼接会截断
    reason: "该模块用值导入 `../../plugin/staleness-utils.js`，而磁盘上只有 .ts；Node 的原生类型剥离只擦除类型、不会把 .js 说明符改写成 .ts，所以在没有构建步骤时加载即失败。要启用它：把该导入改成 .ts 并让构建侧开 rewriteRelativeImportExtensions，或补一个 tsc 构建产物。",
    writable: ['HANDOFF.md'],
    requires: [],
    ruleRef: 'docs/developer-guide/staleness-internals.md',
  },
};

export function listCapabilities() {
  return Object.entries(REGISTRY).map(([id, r]) => ({
    id,
    label: r.label,
    runnable: !!r.runnable,
    reason: r.reason ?? null,
    writable: r.writable,
    module: r.module,
    ruleRef: r.ruleRef,
  }));
}

/** 目标路径必须在仓库根内，且不得落在权威文件区 */
export function guardTarget(repoRoot, rel) {
  const root = path.resolve(repoRoot);
  const abs = path.resolve(root, rel);
  const back = path.relative(root, abs).split(path.sep).join('/');
  if (back.startsWith('..') || path.isAbsolute(back)) {
    return { ok: false, message: `目标路径越出仓库根：${rel}` };
  }
  if (PROTECTED_PREFIXES.some((p) => back.startsWith(p))) {
    return { ok: false, message: `${back} 属于权威文件区（${PROTECTED_PREFIXES.join(' / ')}），手动入口不得写入` };
  }
  return { ok: true, abs, rel: back };
}

function normalizeArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--quiet') out.quiet = true;
    else if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[key] = val;
    } else out._.push(a);
  }
  return out;
}

function todayStr() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/**
 * 跑一个 Capability。
 * @returns {Promise<{ok:boolean, mode:'dry-run'|'apply', target?:string, appended?:boolean,
 *   backupDir?:string|null, before?:string|null, after?:string|null,
 *   result?:any, error?:string}>}
 */
export async function runCapability(opts) {
  const { repoRoot = DEFAULT_REPO, name, experience, source = 'manual', id, apply = false } = opts;
  const entry = REGISTRY[name];
  if (!entry) {
    return { ok: false, error: `未知 Capability：${name}。可用：${Object.keys(REGISTRY).join('、')}` };
  }
  if (!entry.runnable) {
    return { ok: false, error: `${name} 当前不可直接执行：${entry.reason}` };
  }
  if (entry.requires.includes('experience')) {
    const text = String(experience ?? '').trim();
    if (text.length < 4) {
      return { ok: false, error: '--experience 至少要 4 个字符（空内容没有沉淀价值）' };
    }
    if (/[\r\n]{2,}/.test(text)) {
      return { ok: false, error: '--experience 不能含连续空行（表格单元格只承载一行）' };
    }
  }

  const targetRel = entry.writable[0];
  const guard = guardTarget(repoRoot, targetRel);
  if (!guard.ok) return { ok: false, error: guard.message };

  const mod = await import(pathToFileURL(path.join(repoRoot, entry.module)).href);
  const fn = mod[entry.exportName];
  if (typeof fn !== 'function') {
    return { ok: false, error: `${entry.module} 没有导出 ${entry.exportName}()，模块与登记表不一致` };
  }

  const exp = {
    id: String(id ?? `exp-${Date.now().toString(36)}`),
    content: String(experience ?? '').trim(),
    source: String(source),
  };

  const ctx = {
    cwd: repoRoot, gitDirtyCount: 0, sessionId: `manual-${Date.now()}`,
    startedAt: new Date().toISOString(), loadedRules: [], compactCount: 0,
    recentDecisions: [], pendingTodos: [],
  };
  const event = { type: 'PostToolUse', timestamp: new Date().toISOString(), toolName: 'governance-capability.mjs' };

  const before = fs.existsSync(guard.abs) ? await fsp.readFile(guard.abs, 'utf8') : null;

  // ---- dry-run：在临时副本上跑，完全不碰仓库
  if (!apply) {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'govcap-'));
    const tmpPath = path.join(tmpDir, 'HANDOFF.md');
    try {
      if (before != null) await fsp.writeFile(tmpPath, before, 'utf8');
      const result = await fn({ ctx, event, args: { handoffPath: tmpPath, experience: exp } });
      const after = fs.existsSync(tmpPath) ? await fsp.readFile(tmpPath, 'utf8') : null;
      return {
        ok: true, mode: 'dry-run', target: guard.rel, appended: !!result?.data?.appended,
        backupDir: null, before, after, result,
      };
    } finally {
      await fsp.rm(tmpDir, { recursive: true, force: true });
    }
  }

  // ---- apply：先备份，再真写
  let backupDir = null;
  if (before != null) {
    backupDir = path.posix.join('.governance/runtime/console-batches', `manual-${Date.now().toString(36)}`);
    const bakAbs = path.join(repoRoot, backupDir, guard.rel);
    await fsp.mkdir(path.dirname(bakAbs), { recursive: true });
    await fsp.writeFile(bakAbs, before, 'utf8');
  }
  const result = await fn({ ctx, event, args: { handoffPath: guard.abs, experience: exp } });
  const after = await fsp.readFile(guard.abs, 'utf8');

  return {
    ok: !result?.metadata?.writeError,
    mode: 'apply', target: guard.rel, appended: !!result?.data?.appended,
    backupDir, before, after, result,
    error: result?.metadata?.writeError ? String(result.metadata.writeError) : undefined,
  };
}

/** 逐行差异摘要（只给行数，不打印全文，避免把 HANDOFF.md 塞进 stdout） */
export function diffStat(before, after) {
  const a = (before ?? '').split('\n');
  const b = (after ?? '').split('\n');
  const bSet = new Map();
  for (const l of b) bSet.set(l, (bSet.get(l) ?? 0) + 1);
  let removed = 0;
  for (const l of a) {
    const n = bSet.get(l) ?? 0;
    if (n === 0) removed++;
    else bSet.set(l, n - 1);
  }
  let added = 0;
  for (const n of bSet.values()) added += n;
  return { added, removed, linesBefore: a.length, linesAfter: b.length };
}

// ---------------------------------------------------------------- CLI

function usage() {
  return `用法：
  node scripts/governance-capability.mjs list
  node scripts/governance-capability.mjs rule-appender --experience "一句话经验" [--source <出处>] [--id <id>] [--apply]

规则：
  · 默认 dry-run：只在临时副本上跑并打印差异，不写任何文件
  · --apply 才落盘，落盘前把原 HANDOFF.md 备份到 .governance/runtime/console-batches/manual-<ts>/
  · 可写目标逐字限制在 Capability 声明的白名单内（rule-appender 只有 HANDOFF.md）
  · .governance/core/ · .governance/rules/ · .governance/hooks/ 一律拒绝写入`;
}

async function main(argv) {
  const args = normalizeArgs(argv);
  const cmd = args._[0];

  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log(usage());
    return 0;
  }

  if (cmd === 'list') {
    for (const c of listCapabilities()) {
      console.log(`${c.runnable ? '✓ 可执行' : '✗ 不可执行'}  ${c.id}  —  ${c.label}`);
      console.log(`           模块：${c.module}`);
      if (!c.runnable) console.log(`           原因：${c.reason}`);
      console.log(`           可写：${c.writable.join('、')}`);
    }
    return 0;
  }

  const r = await runCapability({
    name: cmd,
    experience: args.experience,
    source: args.source,
    id: args.id,
    apply: !!args.apply,
  });

  if (!r.ok) {
    console.error(`[失败] ${r.error}`);
    return 1;
  }

  if (!r.appended) {
    const dup = r.result?.data?.duplicateId;
    console.error(dup ? `[跳过] 该经验已存在（重复 id：${dup}）` : '[跳过] 未追加（人工 review 后重试）');
    return 2;
  }

  const d = diffStat(r.before, r.after);
  console.log(`[${r.mode}] ${r.target}：+${d.added} 行 / -${d.removed} 行（${d.linesBefore} → ${d.linesAfter}）`);
  if (r.mode === 'dry-run') {
    console.log('干跑，未写入。确认无误后加 --apply 落盘。');
  } else if (r.backupDir) {
    console.log(`已备份到 ${r.backupDir}；撤回：把该目录里的 ${r.target} 拷回原位。`);
  }
  return 0;
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  // 用 exitCode 而不是 process.exit()：后者在 Windows 上会在 libuv 句柄未收尾时断言失败，
  // 往 stderr 吐一行 c 层断言，看起来像出错其实只是退出太早。
  main(process.argv.slice(2))
    .then((code) => { process.exitCode = code; })
    .catch((e) => { console.error(`[错误] ${e?.stack ?? e}`); process.exitCode = 1; });
}
