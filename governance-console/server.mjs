#!/usr/bin/env node
/**
 * governance-console — 零依赖本地控制台
 *
 *   node governance-console/server.mjs [--port 7717] [--repo .] [--no-exec]
 *
 * 安全边界（本工具能改文件、能跑脚本，所以边界必须明说）：
 *  - 只绑 127.0.0.1，不监听外网
 *  - 所有 API 需要启动时生成的 token（URL 里的 ?t= 会自动带进页面）
 *  - 校验 Origin / Sec-Fetch-Site，挡住其它网页对本服务的跨站请求
 *  - 静态文件只服务白名单里的三个文件名，无目录穿越
 *  - 脚本执行只认 lib/runner.mjs 的白名单，客户端不能传命令
 *  - --no-exec 可整体关掉脚本执行
 */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  readState, readGate, buildPlan, publicPlan, applyPlan, listBatches, restoreBatch, readEnv,
  HOOKS, LAYERS, PRESETS, CONFIG_REL, CONSTITUTION_REL,
} from './lib/governance.mjs';
import { listTasks, runTask } from './lib/runner.mjs';
import { readHealth, readGateLog, GATE_LOG_LIMITS, HEALTH_LAYERS } from './lib/health.mjs';
import { buildIndex, readDoc, extractClauses, searchDocs } from './lib/docs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------------------------------------------------------------- 参数

function parseArgs(argv) {
  const out = { port: 7717, repo: process.cwd(), exec: true, host: '127.0.0.1' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port') out.port = Number(argv[++i]);
    else if (a === '--repo') out.repo = path.resolve(argv[++i]);
    else if (a === '--host') out.host = argv[++i];
    else if (a === '--no-exec') out.exec = false;
    else if (a === '--help' || a === '-h') { out.help = true; }
  }
  return out;
}

const ARGS = parseArgs(process.argv.slice(2));
if (ARGS.help) {
  console.log(`governance-console

用法:
  node governance-console/server.mjs [--port 7717] [--repo <仓库根>] [--no-exec]

参数:
  --port   监听端口（默认 7717）
  --repo   仓库根目录（默认当前目录，须含 .governance/）
  --no-exec 禁用所有脚本执行（只读 + 配置编辑仍可用）
`);
  process.exit(0);
}

const REPO = ARGS.repo;
if (!fs.existsSync(path.join(REPO, '.governance'))) {
  console.error(`[fatal] ${REPO} 下没有 .governance/，这里不是本框架的仓库根。`);
  process.exit(2);
}

// ---------------------------------------------------------------- token / 防护

const TOKEN = crypto.randomBytes(18).toString('base64url');
const ORIGIN = `http://127.0.0.1:${ARGS.port}`;

function tokenOk(req, url) {
  const fromHeader = req.headers['x-console-token'];
  const fromQuery = url.searchParams.get('t');
  return fromHeader === TOKEN || fromQuery === TOKEN;
}

/** 跨站防护：带 Origin 的请求必须同源；Sec-Fetch-Site 不能是 cross-site */
function sameSiteOk(req) {
  const origin = req.headers.origin;
  if (origin && origin !== ORIGIN && origin !== `http://localhost:${ARGS.port}`) return false;
  const sfs = req.headers['sec-fetch-site'];
  if (sfs && sfs === 'cross-site') return false;
  return true;
}

// ---------------------------------------------------------------- HTTP 小工具

function json(res, code, body) {
  const buf = Buffer.from(JSON.stringify(body), 'utf8');
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': buf.length,
    'cache-control': 'no-store',
  });
  res.end(buf);
}

function text(res, code, body, type = 'text/plain; charset=utf-8') {
  const buf = Buffer.from(body, 'utf8');
  res.writeHead(code, { 'content-type': type, 'content-length': buf.length, 'cache-control': 'no-store' });
  res.end(buf);
}

function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('BODY_TOO_LARGE')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('BAD_JSON')); }
    });
    req.on('error', reject);
  });
}

const STATIC = {
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/md.js': ['md.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/paper.css': ['paper.css', 'text/css; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml'],
};

// ---------------------------------------------------------------- 路由

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  const p = url.pathname;

  try {
    // --- 静态资源（无敏感信息，不需要 token）
    if (STATIC[p]) {
      const [file, type] = STATIC[p];
      const abs = path.join(PUBLIC_DIR, file);
      if (!fs.existsSync(abs)) return text(res, 404, 'not found');
      return text(res, 200, await fsp.readFile(abs, 'utf8'), type);
    }

    // --- 首页：必须带正确 token，并把 token 注入页面
    if (p === '/' || p === '/index.html') {
      if (!tokenOk(req, url)) {
        return text(res, 403,
          '需要用控制台打印的完整地址打开（带 ?t=<token>）。\n' +
          'token 在启动服务的终端里。这样做是为了挡住其它网页对你本机服务的跨站调用。\n', 'text/plain; charset=utf-8');
      }
      const html = await fsp.readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
      return text(res, 200, html.replaceAll('__TOKEN_VALUE__', TOKEN), 'text/html; charset=utf-8');
    }

    if (!p.startsWith('/api/')) return text(res, 404, 'not found');

    if (!sameSiteOk(req)) return json(res, 403, { error: 'CROSS_SITE', message: '拒绝跨站请求。' });
    if (!tokenOk(req, url)) return json(res, 401, { error: 'UNAUTHORIZED', message: 'token 缺失或错误。' });

    // ---------------- GET /api/state
    if (p === '/api/state' && req.method === 'GET') {
      const state = await readState(REPO);
      // 门禁结果一起下发：前端只显示，不自己判断"算不算通过"
      const gate = await readGate(REPO);
      return json(res, 200, {
        ...state,
        gate,
        meta: {
          hooks: HOOKS.map(({ id, label, when }) => ({ id, label, when })),
          layers: LAYERS.map(({ id, label, layer, path: lp, mustKeep, note }) => ({ id, label, layer, path: lp, mustKeep, note })),
          presets: PRESETS.map(({ id, label, disable, result, sideEffect, recommended }) => ({ id, label, disable, result, sideEffect, recommended })),
          tasks: listTasks(),
          exec: ARGS.exec,
          configRel: CONFIG_REL,
          constitutionRel: CONSTITUTION_REL,
        },
      });
    }

    // ---------------- GET /api/env
    if (p === '/api/env' && req.method === 'GET') {
      return json(res, 200, await readEnv(REPO));
    }

    // ---------------- GET /api/health （健康面板：L1–L5 + 决策记录 + 记录型门禁）
    if (p === '/api/health' && req.method === 'GET') {
      const state = await readState(REPO);
      const health = await readHealth(REPO, { commit: state.git?.head ?? null });
      return json(res, 200, { ...health, layerMeta: HEALTH_LAYERS });
    }

    // ---------------- GET /api/gatelog （记录型门禁的运行历史）
    if (p === '/api/gatelog' && req.method === 'GET') {
      const runs = await readGateLog(REPO);
      return json(res, 200, {
        runs,
        count: runs.length,
        logRel: '.governance/runtime/gate-log.jsonl',
        // 日志滚动：count 是"还留着几条"，不是"跑过几次"。前端必须照这个说。
        rotation: GATE_LOG_LIMITS,
        firstAt: runs[0]?.at ?? null,
        lastAt: runs.at(-1)?.at ?? null,
      });
    }

    // ---------------- GET /api/batches
    if (p === '/api/batches' && req.method === 'GET') {
      return json(res, 200, { batches: await listBatches(REPO) });
    }

    // ---------------- POST /api/plan
    if (p === '/api/plan' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body || typeof body.op !== 'string') return json(res, 400, { error: 'BAD_REQUEST', message: '缺少 op 字段。' });
      const plan = await buildPlan(REPO, body);
      if (plan.error) return json(res, 200, { error: plan.error, message: plan.message });
      return json(res, 200, { plan: publicPlan(plan) });
    }

    // ---------------- POST /api/apply
    if (p === '/api/apply' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body?.planId) return json(res, 400, { error: 'BAD_REQUEST', message: '缺少 planId。' });
      const result = await applyPlan(REPO, body.planId);
      return json(res, result.error ? 200 : 200, result);
    }

    // ---------------- POST /api/restore
    if (p === '/api/restore' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body?.batch) return json(res, 400, { error: 'BAD_REQUEST', message: '缺少 batch。' });
      return json(res, 200, await restoreBatch(REPO, String(body.batch)));
    }

    // ---------------- POST /api/run
    if (p === '/api/run' && req.method === 'POST') {
      if (!ARGS.exec) return json(res, 200, { error: 'EXEC_DISABLED', message: '本服务以 --no-exec 启动，脚本执行已禁用。' });
      const body = await readBody(req);
      if (!body?.taskId) return json(res, 400, { error: 'BAD_REQUEST', message: '缺少 taskId。' });
      const out = await runTask(REPO, String(body.taskId));
      return json(res, 200, out);
    }

    // ---------------- GET /api/docs （规则文档索引）
    if (p === '/api/docs' && req.method === 'GET') {
      return json(res, 200, await buildIndex(REPO));
    }

    // ---------------- GET /api/doc?p=<rel> （单篇正文）
    if (p === '/api/doc' && req.method === 'GET') {
      const doc = await readDoc(REPO, url.searchParams.get('p') || '');
      return json(res, doc.error === 'NOT_FOUND' ? 404 : 200, doc);
    }

    // ---------------- GET /api/rules （条款索引）
    if (p === '/api/rules' && req.method === 'GET') {
      const clauses = await extractClauses(REPO);
      return json(res, 200, {
        clauses,
        stats: {
          total: clauses.length,
          byKind: clauses.reduce((a, c) => { a[c.kind] = (a[c.kind] || 0) + 1; return a; }, {}),
        },
      });
    }

    // ---------------- GET /api/search?q=
    if (p === '/api/search' && req.method === 'GET') {
      return json(res, 200, await searchDocs(REPO, url.searchParams.get('q') || ''));
    }

    return json(res, 404, { error: 'NOT_FOUND', message: `${req.method} ${p} 无此接口。` });
  } catch (e) {
    const code = e?.message === 'BAD_JSON' ? 400 : e?.message === 'BODY_TOO_LARGE' ? 413 : 500;
    return json(res, code, { error: 'SERVER_ERROR', message: String(e?.message ?? e) });
  }
});

server.listen(ARGS.port, ARGS.host, () => {
  const line = '─'.repeat(58);
  console.log(line);
  console.log('  governance-console');
  console.log(line);
  console.log(`  仓库   ${REPO}`);
  console.log(`  地址   ${ORIGIN}/?t=${TOKEN}`);
  console.log(`  执行   ${ARGS.exec ? '脚本执行已启用（白名单 4 个任务）' : '脚本执行已禁用（--no-exec）'}`);
  console.log(line);
  console.log('  改动前一律先出计划；应用前会把原文件/原目录移入');
  console.log('  .governance/runtime/console-batches/ ，可从「变更批次」还原。');
  console.log(line);
});
