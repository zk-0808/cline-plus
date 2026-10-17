/**
 * runner.mjs — 受控脚本执行。
 *
 * 只有这张白名单里的任务能被触发；客户端**不能**传任意命令。
 * 每条都写明：它跑什么、会不会破坏状态、超时多久。
 */
import { execFile } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

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
    hint: '全仓扫描 Markdown 链接与锚点（dev-rules §1.17）。退出码 0 = 非归档树零失效。',
    file: 'scripts/check_links_anchors.py',
    shell: 'python',
    timeoutMs: 180000,
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
  }));
}

export function runTask(repo, taskId) {
  const t = TASKS[taskId];
  if (!t) return Promise.resolve({ error: 'UNKNOWN_TASK', message: `未在白名单中的任务：${taskId}` });

  const abs = path.join(repo, t.file);
  if (!fs.existsSync(abs)) {
    return Promise.resolve({ error: 'TASK_FILE_MISSING', message: `${t.file} 不存在，无法执行。` });
  }

  const started = Date.now();
  const argv = t.shell === 'pwsh'
    ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', abs]
    : [abs];

  return new Promise((resolve) => {
    execFile(
      t.shell,
      argv,
      { cwd: repo, timeout: t.timeoutMs, windowsHide: true, maxBuffer: 8 * 1024 * 1024, shell: false },
      (err, stdout, stderr) => {
        resolve({
          ok: !err,
          taskId,
          label: t.label,
          file: t.file,
          exitCode: err?.code ?? 0,
          durationMs: Date.now() - started,
          stdout: (stdout ?? '').slice(-20000),
          stderr: (stderr ?? '').slice(-8000),
          error: err?.killed ? `超时（>${t.timeoutMs} ms）` : (err?.message ?? null),
        });
      }
    );
  });
}
