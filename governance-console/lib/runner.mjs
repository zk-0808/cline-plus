/**
 * runner.mjs — 受控脚本执行。
 *
 * 只有这张白名单里的任务能被触发；客户端**不能**传任意命令。
 * 每条都写明：它跑什么、会不会破坏状态、超时多久。
 *
 * `recordsGate: true` 的任务是「记录型门禁」：它的结论无法由健康面板重算，
 * 只能靠"某个时刻真的跑过一次"。跑完把结论追加到 runtime/gate-log.jsonl，
 * 健康面板才有资格显示"上次运行结果"。没有记录就显示未运行 —— 未运行不等于通过。
 */
import { execFile } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import { appendGateLog } from './health.mjs';

export const TASKS = {
  'sync-plugin': {
    label: '同步 governance 插件到 Cline',
    hint: '把 .governance/plugin 与 capabilities 复制到 ~/.cline/plugins/installed/local/governance，并修好 hooks 的相对 import 路径。脚本自身会先清空目标目录。',
    file: 'scripts/sync-governance-plugin.ps1',
    shell: 'pwsh',
    timeoutMs: 180000,
    destructive: false,
    confirm: null,
  },
  'reset-plugin': {
    label: '重置安装（先删除再重装）',
    hint: '删除本地插件副本后重新同步。用于插件行为异常、或想确认「干净安装」也能跑通时。',
    file: 'scripts/cleanup-and-reinstall-plugin.ps1',
    shell: 'pwsh',
    timeoutMs: 240000,
    destructive: true,
    confirm: '会删掉 ~/.cline/plugins/installed/local/governance 整个目录再重建，确认？',
  },
  'gate-links': {
    label: '运行引用完整性门禁',
    hint: '全仓扫描 Markdown 链接与锚点（dev-rules §1.17）。退出码 0 = 非归档树零失效。结果会记进 runtime/gate-log.jsonl。',
    file: 'scripts/check_links_anchors.py',
    shell: 'python',
    timeoutMs: 180000,
    destructive: false,
    confirm: null,
    recordsGate: true,
    gateRef: 'docs/dev-rules.md §1.17 规范性引用完整性门控',
  },
  'verify-plugin': {
    label: '插件逻辑自检（50 项断言）',
    hint: '跑 .governance/plugin/verify-governance.ts：config 加载、handoff 注入、git-checker、pre-tool skip 逻辑、compaction 检测、snapshot 写入、分发聚合。**只验证插件逻辑**，不等于 Cline 真的触发了 hook（那要 CLI 集成测试）。结果记进 gate-log.jsonl。',
    file: '.governance/plugin/verify-governance.ts',
    shell: 'node',
    nodeFlags: ['--import', 'scripts/ts-js-resolve.mjs'],
    timeoutMs: 120000,
    destructive: false,
    confirm: null,
    recordsGate: true,
    gateRef: '.governance/plugin/verify-governance.ts（脚本自带断言集）',
  },
  'capability-list': {
    label: '列出手动可调用的 Capability',
    hint: '读 scripts/governance-capability.mjs 的登记表：哪些模块有真实调用路径、哪些没有以及原因。只读，不改任何文件。真正追加经验要自己跑 `node scripts/governance-capability.mjs rule-appender --experience "…" --apply`。',
    file: 'scripts/governance-capability.mjs',
    shell: 'node',
    args: ['list'],
    timeoutMs: 60000,
    destructive: false,
    confirm: null,
  },
  'trace-stats': {
    label: '统计 hook 轨迹',
    hint: '读 .governance/runtime/traces.jsonl，输出各 hook 的调用次数与耗时。',
    file: 'scripts/trace-stats.js',
    shell: 'node',
    timeoutMs: 60000,
    destructive: false,
    confirm: null,
  },
};

export function listTasks() {
  return Object.entries(TASKS).map(([id, t]) => ({
    id,
    label: t.label,
    hint: t.hint,
    destructive: t.destructive,
    confirm: t.confirm,
    timeoutMs: t.timeoutMs,
    file: t.file,
    recordsGate: !!t.recordsGate,
  }));
}

/** 从脚本输出里摘一行摘要，别把整段塞进日志 */
function summarizeRun(stdout, exitCode) {
  const lines = String(stdout ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
  // 先找结论行（PASS / FAIL / ALL PASSED / HAS FAILURES），不要被 JSON 里的 "must_fix" 字段名带偏
  const verdict = [...lines].reverse().find((l) => /\bPASS(ED)?\b|\bFAIL(URES?)?\b|通过|失败/.test(l));
  if (verdict) return verdict.replace(/\s+/g, ' ').slice(0, 200);
  return exitCode === 0 ? '退出码 0' : `退出码 ${exitCode}`;
}

/** 从输出里摘第一个可解析的 JSON 对象（脚本约定：先打一份机读摘要） */
function extractJson(stdout) {
  const text = String(stdout ?? '');
  const start = text.indexOf('{');
  if (start < 0) return null;
  for (let end = text.indexOf('}', start); end !== -1; end = text.indexOf('}', end + 1)) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { /* 继续找闭合 */ }
  }
  return null;
}

async function readCommit(repo) {
  return new Promise((resolve) => {
    execFile('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, windowsHide: true, timeout: 8000 },
      (err, stdout) => resolve(err ? null : String(stdout).trim()));
  });
}

export function runTask(repo, taskId) {
  const t = TASKS[taskId];
  if (!t) return Promise.resolve({ error: 'UNKNOWN_TASK', message: `未在白名单中的任务：${taskId}` });

  const abs = path.join(repo, t.file);
  if (!fs.existsSync(abs)) {
    return Promise.resolve({ error: 'TASK_FILE_MISSING', message: `${t.file} 不存在，无法执行。` });
  }

  const started = Date.now();
  // node 任务要支持前置旗标（如 --import loader）：它们必须排在脚本路径之前。
  // Windows 上 `--import` 的取值必须是 file:// URL，裸绝对路径会报 ERR_UNSUPPORTED_ESM_URL_SCHEME。
  const argv = t.shell === 'pwsh'
    ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', abs]
    : [
      ...(t.nodeFlags ?? []).flatMap((f) => (f.startsWith('scripts/') ? [pathToFileURL(path.join(repo, f)).href] : [f])),
      abs,
      ...(t.args ?? []),
    ];

  // Windows 上 Python 把中文打进管道时默认用区域代码页（简中机器是 GBK），
  // 而 Node 按 UTF-8 解码 —— 结论行会变成乱码。强制子进程用 UTF-8，从源头对齐编码。
  const env = t.shell === 'python'
    ? { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
    : process.env;

  return new Promise((resolve) => {
    execFile(
      t.shell,
      argv,
      { cwd: repo, env, timeout: t.timeoutMs, windowsHide: true, maxBuffer: 8 * 1024 * 1024, shell: false },
      async (err, stdout, stderr) => {
        const exitCode = err?.code ?? 0;
        const out = {
          ok: !err,
          taskId,
          label: t.label,
          file: t.file,
          exitCode,
          durationMs: Date.now() - started,
          stdout: (stdout ?? '').slice(-20000),
          stderr: (stderr ?? '').slice(-8000),
          error: err?.killed ? `超时（>${t.timeoutMs} ms）` : (err?.message ?? null),
        };

        if (t.recordsGate) {
          out.gateRecord = await appendGateLog(repo, {
            at: new Date().toISOString(),
            task: taskId,
            file: t.file,
            ruleRef: t.gateRef ?? null,
            exit: exitCode,
            durationMs: out.durationMs,
            commit: await readCommit(repo),
            summary: summarizeRun(stdout, exitCode),
            // 结构化数据（数值型的 must_fix / links / files）交给脚本自己打 JSON；
            // 打不出就只留摘要，不编数字。
            counts: (() => {
              const j = extractJson(stdout);
              if (!j) return null;
              return {
                files: j.scanned_md ?? null,
                links: j.links_checked ?? null,
                must_fix: j.must_fix ?? null,
                archived: j.exempt_archive_residue ?? null,
              };
            })(),
          });
        }
        resolve(out);
      }
    );
  });
}
