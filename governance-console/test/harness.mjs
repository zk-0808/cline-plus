/**
 * harness.mjs — 零依赖测试脚手架
 *
 * 每个用例在**独立的临时 git 仓库**里跑，互不影响。
 * 这不是洁癖：四个会改状态的预设想互不干扰，`full` 本身是 no-op，
 * 在同一个工作区连跑五次会让"测试顺序"决定"测试结果"。
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const ROOT = path.join(os.tmpdir(), `govconsole-test-${process.pid}-${Date.now().toString(36)}`);
const created = [];

// ---------------------------------------------------------------- 断言

export class AssertionError extends Error {}

export function ok(cond, msg) {
  if (!cond) throw new AssertionError(msg);
}

export function eq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new AssertionError(`${msg}\n      期望: ${e}\n      实际: ${a}`);
}

// ---------------------------------------------------------------- 测试注册

const registry = [];

export function test(name, fn) {
  registry.push({ name, fn });
}

export async function runAll() {
  let pass = 0;
  const failures = [];
  console.log('');
  for (const { name, fn } of registry) {
    const t0 = Date.now();
    try {
      await fn();
      pass++;
      console.log(`  \u2713 ${name}  (${Date.now() - t0}ms)`);
    } catch (err) {
      failures.push({ name, err });
      console.log(`  \u2717 ${name}`);
      console.log(`      ${String(err?.message ?? err).split('\n').join('\n      ')}`);
    }
  }
  cleanup();
  console.log('');
  console.log(`  ${pass} passed, ${failures.length} failed, ${registry.length} total`);
  return failures.length === 0;
}

function cleanup() {
  for (const d of created) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* 忽略 */ }
  }
}

// ---------------------------------------------------------------- 基线 fixture

const CONSTITUTION = `# Core Constitution — 测试用最小宪法

## 4. handoff 触发器

| 参数 | 本仓库取值 | 含义 |
|------|-----------|------|
| \`independent_evidence_count\` | 2 | 关键结论独立证据类型最小数 |
| \`negative_conclusion_evidence_count\` | 3 | "无 X"类结论独立证据最小数 |
| \`uncommitted_file_threshold\` | 5 | handoff 触发器 b 文件堆积阈值 |
| \`long_session_turns\` | 8 | handoff 触发器 c 对话轮次阈值 |
| \`context_pressure_ratio\` | 0.7 | handoff 触发器 c 上下文占用阈值 |
| \`proposition_flip_threshold\` | 2 | 核心命题翻转审查阈值 |
| \`rule_stale_months\` | 6 | 规则长期未触发退役判据月数 |
| \`rule_retire_keep_days\` | 30 | 退役规则物理删除保留期 |

## 引用

见 .governance/rules/。
`;

const TYPES_TS = `// 测试用分发契约
export interface SessionStartHookConfig {
  enabled: boolean;
  capabilities: {
    handoffProvider: HandoffProviderConfig;
    gitChecker: GitCheckerConfig;
  };
}

export interface HooksConfig {
  "session-start"?: SessionStartHookConfig;
  "pre-tool"?: PreToolHookConfig;
  "post-tool"?: PostToolHookConfig;
  "pre-compact"?: PreCompactHookConfig;
}

export const DEFAULT_CONFIG: HooksConfig = {
  "session-start": {
    enabled: true,
    capabilities: {
      handoffProvider: {
        enabled: true,
        args: {
          handoffPath: "HANDOFF.md",
          snapshotPath: ".governance/runtime/snapshot.json",
        },
      },
      gitChecker: {
        enabled: true,
        args: {
          threshold: 5,
          excludePatterns: ["node_modules/"],
        },
      },
    },
  },
  "pre-tool": {
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
  },
  "post-tool": {
    enabled: false,
  },
  "pre-compact": {
    enabled: true,
    capabilities: {
      snapshotWriter: {
        enabled: true,
        args: {
          snapshotPath: ".governance/runtime/snapshot.json",
        },
      },
    },
  },
};
`;

const INDEX_TS = `// 测试用分发器：静态导入 + 配置驱动
import { snapshotWriter } from "../capabilities/snapshot-writer/index.js";
import { gitChecker } from "../capabilities/git-checker/index.js";
import { handoffProvider } from "../capabilities/handoff-provider/index.js";
import { loadConfig } from "./config-loader.js";

const WRITE_TOOL_NAMES = new Set([
  "write_to_file",
  "replace_in_file",
  "execute_command",
]);

export function setup(workspacePath: string) {
  const config = loadConfig(workspacePath);
  if (config.capabilities.handoffProvider.enabled) { handoffProvider(); }
  if (config.capabilities.gitChecker.enabled) { gitChecker(); }

  const preToolConfig = config["pre-tool"]!;
  if (preToolConfig.capabilities.gitChecker.enabled) { gitChecker(); }

  const preCompactConfig = config["pre-compact"]!;
  if (preCompactConfig.capabilities.snapshotWriter.enabled) { snapshotWriter(); }
}
`;

const CONFIG_JSON = `{
  "session-start": {
    "enabled": true,
    "capabilities": {
      "handoffProvider": {
        "enabled": true,
        "args": {
          "handoffPath": "HANDOFF.md",
          "snapshotPath": ".governance/runtime/snapshot.json"
        }
      },
      "gitChecker": {
        "enabled": true,
        "args": {
          "threshold": 5,
          "excludePatterns": [
            "node_modules/"
          ]
        }
      }
    }
  },
  "pre-tool": {
    "enabled": true,
    "skipTools": [
      "readFile",
      "read_file",
      "search"
    ],
    "capabilities": {
      "gitChecker": {
        "enabled": true,
        "args": {
          "threshold": 5,
          "excludePatterns": [
            "node_modules/"
          ]
        }
      }
    }
  },
  "post-tool": {
    "enabled": false,
    "customChecks": []
  },
  "pre-compact": {
    "enabled": true,
    "capabilities": {
      "snapshotWriter": {
        "enabled": true,
        "args": {
          "snapshotPath": ".governance/runtime/snapshot.json"
        }
      }
    }
  }
}
`;

/** 基线：完整且已知有效 —— 校验必须判 pass */
export const BASE_FILES = {
  '.gitignore': [
    '.governance/runtime/console-batches/',
    '.governance/runtime/console-disabled/',
    '',
  ].join('\n'),
  '.clinerules': '# 入口\n读 .governance/core/constitution.md、.governance/rules/。\n',
  'HANDOFF.md': '# HANDOFF\n\n## 待沉淀经验\n\n| id | 经验 | 状态 |\n|---|---|---|\n',
  'README.md': '# 测试仓库\n',
  '.governance/core/constitution.md': CONSTITUTION,
  '.governance/rules/handoff-entry.md': '# handoff 入口\n触发条件：会话启动。\n',
  '.governance/rules/lifecycle.md': '# 生命周期\n',
  '.governance/examples/dev-rules.md': '# 示例规则\n',
  '.governance/examples/evidence-governance.md': '# 示例：证据治理\n',
  '.governance/examples/reviewer-personas.md': '# 示例：审阅视角\n',
  '.governance/runtime/.gitkeep': '',
  '.governance/runtime/snapshot.json': '{\n  "schema_version": "1.0"\n}\n',
  '.governance/hooks/config.json': CONFIG_JSON,
  '.governance/plugin/types.ts': TYPES_TS,
  '.governance/plugin/index.ts': INDEX_TS,
  '.governance/plugin/config-loader.ts': 'export function loadConfig(p: string) { return {} as any; }\n',
  '.governance/plugin/hooks/pre-tool.ts': 'export function dispatchPreTool() { return {}; }\n',
  '.governance/capabilities/handoff-provider/index.ts': 'export const handoffProvider = () => 1;\n',
  '.governance/capabilities/git-checker/index.ts': 'export const gitChecker = () => 1;\n',
  '.governance/capabilities/snapshot-writer/index.ts': 'export const snapshotWriter = () => 1;\n',
};

function writeTree(dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
  }
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'ignore', 'ignore'] });
}

/**
 * 建一个干净的 fixture 仓库。
 * @param {Record<string,string|null>} [mutate]  覆盖基线文件内容；null 表示删除该文件
 * @param {(dir:string)=>void} [extra]           在 git 提交前追加改动
 */
export function makeFixture(mutate = {}, extra = null) {
  const dir = path.join(ROOT, `fx-${crypto.randomBytes(4).toString('hex')}`);
  fs.mkdirSync(dir, { recursive: true });
  created.push(dir);

  const files = { ...BASE_FILES };
  for (const [rel, content] of Object.entries(mutate)) {
    if (content === null) delete files[rel];
    else files[rel] = content;
  }
  writeTree(dir, files);
  if (extra) extra(dir);

  git(['init', '-q'], dir);
  git(['config', 'user.email', 'test@example.invalid'], dir);
  git(['config', 'user.name', 'govconsole test'], dir);
  git(['add', '-A'], dir);
  git(['commit', '-q', '-m', 'fixture baseline'], dir);
  return dir;
}

// ---------------------------------------------------------------- 观察工具

/** 目录树快照：相对路径 + 内容哈希，用来做"零副作用"判断 */
export function snapshotTree(dir, skip = ['.git', 'console-batches', 'console-disabled']) {
  const out = [];
  const walk = (d, rel) => {
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents.sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (skip.includes(e.name)) continue;
      const p = path.join(d, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { out.push(`D ${r}`); walk(p, r); }
      else if (e.isFile()) {
        const h = crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 12);
        out.push(`F ${r} ${h}`);
      }
    }
  };
  walk(dir, '');
  return out.join('\n');
}

export function gitStatus(repo) {
  const txt = execFileSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' });
  return txt.split('\n').filter((l) => l.trim());
}

/** 列出 root 下所有空目录（含 root 自身之外），用于验证"不留空目录" */
export function listEmptyDirs(root) {
  const empty = [];
  const walk = (d) => {
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    const subs = ents.filter((e) => e.isDirectory());
    for (const e of subs) walk(path.join(d, e.name));
    if (ents.length === 0 && path.resolve(d) !== path.resolve(root)) {
      empty.push(path.relative(root, d).split(path.sep).join('/'));
    }
  };
  if (fs.existsSync(root)) walk(root);
  return empty;
}

export function readJson(abs) {
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

export function exists(abs) {
  return fs.existsSync(abs);
}
