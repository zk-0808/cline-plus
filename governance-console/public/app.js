/* governance-console — 前端：无框架，全部状态来自 /api/state */
'use strict';

const TOKEN = window.__CONSOLE_TOKEN__ || '';
const $ = (id) => document.getElementById(id);

let STATE = null;
let ENV = null;
let PLAN = null;

// ---------------------------------------------------------------- 基础设施

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'content-type': 'application/json', 'x-console-token': TOKEN, ...(opts.headers || {}) },
  });
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error(`HTTP ${res.status}：${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return n;
}

function toast(msg, kind = '') {
  const t = el('div', { class: `toast ${kind}`, text: msg });
  $('toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 3600);
  setTimeout(() => t.remove(), 4000);
}

function sw(on, onClick, disabled = false) {
  return el('button', {
    class: 'sw', role: 'switch', 'aria-checked': String(!!on),
    disabled: disabled || false, onclick: onClick,
    title: on ? '当前：启用（点击关闭）' : '当前：关闭（点击启用）',
  });
}

// ---------------------------------------------------------------- 加载

async function load() {
  try {
    STATE = await api('/api/state');
  } catch (e) {
    toast(`读取状态失败：${e.message}`, 'err');
    $('chips').innerHTML = '';
    $('chips').appendChild(el('span', { class: 'chip err', text: '无法连接服务' }));
    return;
  }
  renderAll();
  loadEnv();
  loadBatches();
}

async function loadEnv() {
  try { ENV = await api('/api/env'); } catch { ENV = null; }
  renderChips();
}

async function loadBatches() {
  try {
    const { batches } = await api('/api/batches');
    renderBatches(batches || []);
  } catch (e) {
    $('batch-rows').innerHTML = '';
    $('batch-rows').appendChild(el('div', { class: 'empty', text: `读取失败：${e.message}` }));
  }
}

function renderAll() {
  renderChips();
  renderWarnings();
  renderTasks();
  renderHooks();
  renderCaps();
  renderParams();
  renderPresets();
  renderLayers();
}

// ---------------------------------------------------------------- 状态条

function renderChips() {
  const s = STATE;
  const chips = $('chips');
  chips.innerHTML = '';

  chips.appendChild(el('span', { class: 'chip', title: '仓库根目录' },
    'repo ', el('b', { text: s.repo })));

  if (s.git?.isRepo) {
    chips.appendChild(el('span', { class: 'chip', title: '当前分支' }, '⎇ ', el('b', { text: s.git.branch })));
    chips.appendChild(el('span', { class: 'chip', title: `${s.git.headDate} ${s.git.headSubject}` },
      el('b', { text: s.git.head || '?' })));

    const threshold = Number(s.params.find((p) => p.name === 'uncommitted_file_threshold')?.value ?? 5);
    const over = s.git.dirty >= threshold;
    chips.appendChild(el('span', {
      class: `chip ${over ? 'err' : s.git.dirty > 0 ? 'warn' : 'ok'}`,
      title: `未提交文件数 / 宪法阈值（handoff 触发器 b）。点击看样例。`,
      onclick: () => {
        toast(`未提交样例：${(s.git.dirtySample || []).slice(0, 5).join(' | ') || '无'}`, '');
      },
    }, 'dirty ', el('b', { text: String(s.git.dirty) }), ` / ${threshold}`, over ? ' ⚠ 已超阈值' : ''));
  }

  chips.appendChild(el('span', {
    class: `chip ${s.plugin.installed ? 'ok' : 'err'}`,
    title: s.plugin.dir,
  }, '插件 ', el('b', { text: s.plugin.installed ? '已安装' : '未安装' })));

  const onHooks = s.hooks.filter((h) => h.enabled).length;
  chips.appendChild(el('span', { class: `chip ${onHooks ? 'ok' : 'warn'}`, title: '已启用的 hook 数 / 总数' },
    'hooks ', el('b', { text: `${onHooks}/${s.hooks.length}` })));

  if (s.artifacts?.marker?.exists) {
    const age = s.artifacts.marker.ageDays;
    chips.appendChild(el('span', {
      class: `chip ${age > 7 ? 'warn' : 'ok'}`,
      title: `plugin-loaded.marker：${s.artifacts.marker.content}`,
    }, 'marker ', el('b', { text: `${age}d` })));
  } else {
    chips.appendChild(el('span', { class: 'chip err', title: 'plugin-loaded.marker 不存在：SessionStart 从未跑到' }, 'marker ', el('b', { text: '无' })));
  }

  if (ENV) {
    chips.appendChild(el('span', {
      class: `chip ${ENV.cline.ok ? '' : 'err'}`,
      title: ENV.cline.ok ? 'Cline CLI' : (ENV.cline.error || ''),
    }, 'cline ', el('b', { text: ENV.cline.ok ? ENV.cline.version : '不可用' })));
    chips.appendChild(el('span', { class: 'chip', title: '运行时' }, 'node ', el('b', { text: ENV.node })));
  } else {
    chips.appendChild(el('span', { class: 'chip' }, 'cline ', el('b', { text: '检测中…' })));
  }

  $('chip-exec').className = `chip ${s.meta.exec ? 'ok' : 'warn'}`;
  $('chip-exec').textContent = s.meta.exec ? '脚本执行：启用' : '脚本执行：已禁用';
}

// ---------------------------------------------------------------- 告警

function renderWarnings() {
  const list = STATE.warnings || [];
  const sec = $('sec-warn');
  const box = $('warn-list');
  box.innerHTML = '';
  if (!list.length) { sec.hidden = true; return; }
  sec.hidden = false;
  for (const w of list) {
    box.appendChild(el('div', { class: `w-item ${w.level}` },
      el('div', { class: 'dot' }),
      el('div', { class: 'wbody' },
        el('div', { class: 'code', text: w.code }),
        el('div', { text: w.msg }),
        w.fix ? el('div', { class: 'fix', text: `→ ${w.fix}` }) : null,
      )));
  }
}

// ---------------------------------------------------------------- 一键安装

function renderTasks() {
  const grid = $('task-grid');
  grid.innerHTML = '';
  const disabled = !STATE.meta.exec;

  for (const t of STATE.meta.tasks) {
    const btn = el('button', {
      class: t.destructive ? 'danger' : 'primary',
      disabled,
      text: t.destructive ? '重置安装' : '执行',
      onclick: () => onRun(t),
    });
    grid.appendChild(el('div', { class: 'task' },
      el('h3', { text: t.label }),
      el('p', { text: t.hint }),
      el('div', { class: 'file', text: t.file }),
      el('div', { class: 'actions' }, btn, el('span', { class: 'status', id: `st-${t.id}` })),
    ));
  }
}

async function onRun(t) {
  if (t.confirm && !window.confirm(t.confirm)) return;
  const st = $(`st-${t.id}`);
  const log = $('task-log');
  if (st) st.innerHTML = '<span class="spin"></span> 运行中';
  log.className = 'log';
  log.textContent = `$ ${t.file}\n`;

  try {
    const r = await api('/api/run', { method: 'POST', body: JSON.stringify({ taskId: t.id }) });
    if (r.error) {
      log.classList.add('err');
      log.textContent += `\n[${r.error}] ${r.message}`;
      if (st) st.textContent = '失败';
      toast(r.message, 'err');
    } else {
      log.classList.add(r.ok ? 'ok' : 'err');
      log.textContent += (r.stdout || '') + (r.stderr ? `\n--- stderr ---\n${r.stderr}` : '');
      log.textContent += `\n\n[退出码 ${r.exitCode}] ${r.durationMs} ms`;
      if (st) st.textContent = r.ok ? `完成 · ${(r.durationMs / 1000).toFixed(1)}s` : `退出码 ${r.exitCode}`;
      toast(r.ok ? `${t.label}：完成` : `${t.label}：失败`, r.ok ? 'ok' : 'err');
      await load();
    }
  } catch (e) {
    log.classList.add('err');
    log.textContent += `\n[异常] ${e.message}`;
    if (st) st.textContent = '异常';
    toast(e.message, 'err');
  }
}

// ---------------------------------------------------------------- Hook 开关

function renderHooks() {
  const box = $('hook-rows');
  box.innerHTML = '';
  for (const h of STATE.hooks) {
    const toggle = sw(h.enabled, () => requestPlan({ op: 'hook.toggle', hook: h.id, enabled: !h.enabled }), !h.present);
    box.appendChild(el('div', { class: 'row' },
      el('div', {},
        el('div', { class: 'name' },
          h.label,
          el('span', { class: `tag ${h.enabled ? 'on' : 'off'}`, text: h.enabled ? '启用' : '关闭' }),
          h.present ? null : el('span', { class: 'tag must', text: 'config 缺失' }),
        ),
        el('div', { class: 'desc', text: h.does }),
        el('div', { class: 'meta' },
          `触发：${h.when}  ·  `, el('span', { text: h.source }),
          h.skipTools ? `  ·  skipTools: ${h.skipTools.length} 项` : '',
        ),
      ),
      toggle,
    ));
  }
}

// ---------------------------------------------------------------- Capability

function renderCaps() {
  const box = $('cap-rows');
  box.innerHTML = '';
  let any = false;

  for (const h of STATE.hooks) {
    if (!h.capabilities.length) continue;
    for (const c of h.capabilities) {
      any = true;
      const argsBox = el('div', { class: 'inline' });
      for (const [k, v] of Object.entries(c.args)) {
        if (typeof v === 'number') {
          const inp = el('input', { type: 'number', min: '1', step: '1', value: String(v) });
          const commit = () => {
            const nv = inp.value.trim();
            if (nv === String(v)) { inp.classList.remove('dirty'); return; }
            requestPlan({ op: 'cap.arg', hook: h.id, cap: c.name, arg: k, value: nv }, () => {
              inp.value = String(v); inp.classList.remove('dirty');
            });
          };
          inp.addEventListener('input', () => inp.classList.toggle('dirty', inp.value.trim() !== String(v)));
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { inp.blur(); commit(); } });
          inp.addEventListener('blur', commit);
          argsBox.appendChild(el('span', { class: 'mono', text: `${k}:` }));
          argsBox.appendChild(inp);
        } else if (Array.isArray(v)) {
          argsBox.appendChild(el('span', { class: 'meta', text: `${k}: ${v.length} 项` }));
        } else {
          argsBox.appendChild(el('span', { class: 'meta', text: `${k}: ${String(v)}` }));
        }
      }

      box.appendChild(el('div', { class: 'row' },
        el('div', {},
          el('div', { class: 'name' },
            `${h.label} → ${c.name}`,
            el('span', { class: `tag ${c.enabled ? 'on' : 'off'}`, text: c.enabled ? '启用' : '关闭' }),
            c.sourceDirExists ? null : el('span', { class: 'tag must', text: '源码目录缺失' }),
          ),
          el('div', { class: 'meta' }, 'args：'),
          argsBox,
        ),
        sw(c.enabled, () => requestPlan({ op: 'cap.toggle', hook: h.id, cap: c.name, enabled: !c.enabled })),
      ));
    }
  }

  if (!any) box.appendChild(el('div', { class: 'empty', text: 'config.json 里没有挂任何 capability。' }));
}

// ---------------------------------------------------------------- 宪法参数

function renderParams() {
  const box = $('param-rows');
  box.innerHTML = '';
  if (!STATE.params.length) {
    box.appendChild(el('div', { class: 'empty', text: '没解析到参数表——constitution.md 的「项目可调参数」表可能被改过格式。' }));
    return;
  }

  for (const p of STATE.params) {
    const inp = el('input', { type: 'number', value: p.value, step: p.rule.integer ? '1' : '0.01' });
    const commit = () => {
      const nv = inp.value.trim();
      if (nv === p.value) { inp.classList.remove('dirty'); return; }
      requestPlan({ op: 'param.set', name: p.name, value: nv }, () => {
        inp.value = p.value; inp.classList.remove('dirty');
      });
    };
    inp.addEventListener('input', () => inp.classList.toggle('dirty', inp.value.trim() !== p.value));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { inp.blur(); commit(); } });
    inp.addEventListener('blur', commit);

    const bounds = p.rule.max != null ? `[${p.rule.min} – ${p.rule.max}]` : `≥ ${p.rule.min}`;

    box.appendChild(el('div', { class: 'row' },
      el('div', {},
        el('div', { class: 'name' }, el('code', { text: p.name }), el('span', { class: 'tag', text: bounds })),
        el('div', { class: 'desc', text: p.spec }),
        el('div', { class: 'meta', text: `constitution.md:${p.line}  ·  ${p.rule.why}` }),
      ),
      inp,
    ));
  }
}

// ---------------------------------------------------------------- 预设

function renderPresets() {
  const grid = $('preset-grid');
  grid.innerHTML = '';
  for (const p of STATE.meta.presets) {
    const current = STATE.preset.id === p.id;
    const isBuildIn = p.id === 'full';
    grid.appendChild(el('button', {
      class: `preset ${current ? 'current' : ''}`,
      disabled: isBuildIn,
      title: isBuildIn ? '当前无变更可做' : '点击生成停用计划',
      onclick: () => requestPlan({ op: 'preset.apply', preset: p.id }),
    },
      el('div', { class: 'plabel' },
        p.label,
        p.recommended ? el('span', { class: 'tag on', text: '推荐' }) : null,
        current ? el('span', { class: 'tag', text: '当前' }) : null,
      ),
      el('div', { class: 'presult', text: p.result }),
      el('div', { class: 'pdisable', text: p.disable.length ? `停用：${p.disable.join(', ')}` : '不停用任何目录' }),
    ));
  }
}

// ---------------------------------------------------------------- 层现状

function renderLayers() {
  const box = $('layer-rows');
  box.innerHTML = '';
  for (const l of STATE.layers) {
    box.appendChild(el('div', { class: 'row' },
      el('div', {},
        el('div', { class: 'name' },
          l.label,
          el('span', { class: `tag ${l.present ? 'on' : 'off'}`, text: l.present ? '在位' : '缺失' }),
          l.mustKeep ? el('span', { class: 'tag must', text: '必需' }) : null,
          el('span', { class: 'tag', text: l.layer }),
        ),
        el('div', { class: 'desc', text: l.note }),
        el('div', { class: 'meta', text: `${l.path}  ·  ${l.fileCount} 个文件` }),
      ),
      el('span', { class: 'mono', style: 'color:var(--fg-faint);font-size:11px', text: l.present ? '✓' : '✗' }),
    ));
  }
}

// ---------------------------------------------------------------- 批次

function renderBatches(batches) {
  const box = $('batch-rows');
  box.innerHTML = '';
  if (!batches.length) {
    box.appendChild(el('div', { class: 'empty', text: '还没有变更批次。每次应用变更都会在这里留一条可还原记录。' }));
    return;
  }
  for (const b of batches) {
    box.appendChild(el('div', { class: 'batch-row' },
      el('div', { class: 'b-summ' },
        el('div', { text: b.summary }),
        el('div', { class: 'b-at', text: `${b.batch}  ·  ${b.ops} 项  ·  ${new Date(b.at).toLocaleString('zh-CN')}` }),
      ),
      el('button', {
        class: 'sm ghost', disabled: !b.restorable,
        title: b.restorable ? '把这一批的文件/目录恢复原状' : '该批次的部分副本已缺失，无法完整还原',
        text: '还原',
        onclick: () => onRestore(b),
      }),
    ));
  }
}

async function onRestore(b) {
  if (!window.confirm(`还原批次「${b.summary}」？\n\n会把被改动的文件写回原内容，把被停用的目录移回原位。`)) return;
  try {
    const r = await api('/api/restore', { method: 'POST', body: JSON.stringify({ batch: b.batch }) });
    if (r.error) return toast(r.message, 'err');
    toast(`已还原 ${r.done.length} 项${r.skipped.length ? `，跳过 ${r.skipped.length} 项` : ''}`, 'ok');
    if (r.skipped.length) console.warn('跳过：', r.skipped);
    await load();
  } catch (e) { toast(e.message, 'err'); }
}

// ---------------------------------------------------------------- 计划 → 抽屉

async function requestPlan(op, onFail) {
  try {
    const r = await api('/api/plan', { method: 'POST', body: JSON.stringify(op) });
    if (r.error) {
      toast(r.message || r.error, r.error === 'NOOP' ? '' : 'err');
      if (onFail) onFail();
      return;
    }
    PLAN = r.plan;
    openDrawer(PLAN);
  } catch (e) {
    toast(e.message, 'err');
    if (onFail) onFail();
  }
}

function openDrawer(plan) {
  $('d-title').textContent = plan.summary;
  $('d-sub').textContent = `计划 ${plan.id} · 批次 ${plan.batch} · 10 分钟内有效`;

  const box = $('d-content');
  box.innerHTML = '';

  for (const w of plan.warnings || []) {
    box.appendChild(el('div', { class: `w-item ${w.level === 'info' ? '' : w.level}` },
      el('div', { class: 'dot' }),
      el('div', { class: 'wbody' },
        el('div', { class: 'code', text: w.code }),
        el('div', { text: w.msg }),
        w.fix ? el('div', { class: 'fix', text: `→ ${w.fix}` }) : null,
      )));
  }

  for (const c of plan.changes) {
    if (c.kind === 'text') {
      box.appendChild(renderTextChange(c));
    } else if (c.kind === 'move') {
      box.appendChild(el('div', { class: 'move-block' },
        el('span', { text: c.rel }),
        el('span', { class: 'arrow', text: '→' }),
        el('span', { text: c.toRel }),
        el('span', { style: 'color:var(--fg-faint)', text: `(${c.entries} 个文件)` }),
      ));
    }
  }

  $('d-hint').textContent = '应用前会把原文件原样备份到批次目录，可用「变更批次 → 还原」撤回。';
  $('d-apply').disabled = false;
  $('mask').classList.add('open');
  $('drawer').classList.add('open');
  $('drawer').setAttribute('aria-hidden', 'false');
}

function renderTextChange(c) {
  const wrap = el('div', { class: 'file-block' });
  wrap.appendChild(el('div', { class: 'fhead' },
    el('b', { text: c.rel }),
    el('span', { class: 'stat' },
      el('span', { class: 'a', text: `+${c.added}` }), ' ',
      el('span', { class: 'd', text: `−${c.removed}` }),
    ),
  ));

  const d = el('div', { class: 'diff' });
  const lines = c.diff || [];

  // 只显示变更行前后各 2 行上下文
  const keep = new Set();
  lines.forEach((l, i) => {
    if (l.t !== ' ') {
      for (let k = Math.max(0, i - 2); k <= Math.min(lines.length - 1, i + 2); k++) keep.add(k);
    }
  });

  let prev = -1;
  for (let i = 0; i < lines.length; i++) {
    if (!keep.has(i)) continue;
    if (prev !== -1 && i - prev > 1) {
      d.appendChild(el('div', { class: 'l' },
        el('span', { class: 'no', text: '⋯' }),
        el('span', { class: 'sg', text: '' }),
        el('span', { class: 'tx', style: 'color:var(--fg-faint)', text: ' ' }),
      ));
    }
    const l = lines[i];
    d.appendChild(el('div', { class: `l ${l.t === '+' ? 'add' : l.t === '-' ? 'del' : ''}` },
      el('span', { class: 'no', text: String(l.no) }),
      el('span', { class: 'sg', text: l.t === ' ' ? '' : l.t }),
      el('span', { class: 'tx', text: l.text }),
    ));
    prev = i;
  }

  wrap.appendChild(d);
  return wrap;
}

function closeDrawer() {
  $('mask').classList.remove('open');
  $('drawer').classList.remove('open');
  $('drawer').setAttribute('aria-hidden', 'true');
  PLAN = null;
}

async function applyPlan() {
  if (!PLAN) return;
  $('d-apply').disabled = true;
  $('d-apply').textContent = '应用中…';
  try {
    const r = await api('/api/apply', { method: 'POST', body: JSON.stringify({ planId: PLAN.id }) });
    if (r.error) {
      toast(r.message || r.error, 'err');
      if (r.error === 'STALE_PLAN' || r.error === 'PLAN_GONE') { closeDrawer(); await load(); }
      return;
    }
    toast(`已应用：${r.summary}`, 'ok');
    closeDrawer();
    await load();
  } catch (e) {
    toast(e.message, 'err');
  } finally {
    $('d-apply').disabled = false;
    $('d-apply').textContent = '应用变更';
  }
}

// ================================================================ 视图切换

let VIEW = 'console';
let DOCS_INDEX = null;
let CLAUSES = null;
let CURRENT_DOC = null;
let SEARCHING = false;

function switchView(name) {
  VIEW = name;
  for (const t of document.querySelectorAll('.tab')) t.classList.toggle('active', t.dataset.view === name);
  $('view-console').hidden = name !== 'console';
  $('view-docs').hidden = name !== 'docs';
  $('view-clauses').hidden = name !== 'clauses';

  if (name === 'docs' && !DOCS_INDEX) loadDocs();
  if (name === 'clauses' && !CLAUSES) loadClauses();
}

// ================================================================ 规则视图

async function loadDocs() {
  const rail = $('docs-rail');
  rail.innerHTML = '<div class="empty">索引中…</div>';
  try {
    DOCS_INDEX = await api('/api/docs');
  } catch (e) {
    rail.innerHTML = '';
    rail.appendChild(el('div', { class: 'empty', text: `索引失败：${e.message}` }));
    return;
  }
  renderDocsStats();
  renderRail($('search').value.trim());
}

function renderDocsStats() {
  const s = DOCS_INDEX.stats;
  const box = $('docs-stats');
  box.innerHTML = '';
  const chip = (label, val, cls = '') => el('span', { class: `chip ${cls}` }, `${label} `, el('b', { text: String(val) }));
  box.appendChild(chip('文档', s.total));
  box.appendChild(chip('分组', s.groups));
  box.appendChild(chip('总字节', (s.bytes / 1024 / 1024).toFixed(2) + ' MB'));
  box.appendChild(chip('孤儿文档', s.orphans, s.orphans ? 'warn' : 'ok'));
  box.appendChild(chip('缺生命周期标注', s.missingLifespan, s.missingLifespan ? 'warn' : 'ok'));
  box.appendChild(el('span', { class: 'hint-inline', text: '孤儿 = 没有任何其它文档链接到它；缺生命周期 = 文件头没有「生命周期」标注' }));
}

function renderRail(filterText) {
  const rail = $('docs-rail');
  rail.innerHTML = '';
  $('rail-clear').hidden = !filterText;
  const q = (filterText || '').toLowerCase();

  let shown = 0;
  for (const g of DOCS_INDEX.groups) {
    const docs = q ? g.docs.filter((d) => d.rel.toLowerCase().includes(q) || d.title.toLowerCase().includes(q)) : g.docs;
    if (!docs.length) continue;
    shown += docs.length;
    rail.appendChild(el('div', { class: 'rail-group' },
      el('div', { class: 'rail-group-label' }, g.label, el('span', { class: 'rail-count', text: String(docs.length) })),
      el('div', { class: 'rail-group-note', text: g.note }),
      ...docs.map((d) => railDocItem(d)),
    ));
  }
  $('rail-count').textContent = String(shown);
  if (!shown) rail.appendChild(el('div', { class: 'empty', text: '没有匹配的文档。' }));
}

function railDocItem(d) {
  const isOrphan = DOCS_INDEX.orphans.includes(d.rel);
  const noLife = DOCS_INDEX.missingLifespan.includes(d.rel);
  return el('button', {
    class: `rail-doc ${CURRENT_DOC === d.rel ? 'active' : ''}`,
    type: 'button',
    title: d.rel,
    onclick: () => loadDoc(d.rel),
  },
    el('div', { class: 'rd-title', text: d.title }),
    el('div', { class: 'rd-meta' },
      el('span', { class: 'rd-path', text: d.rel }),
      el('span', { class: 'rd-ref', title: `被 ${d.inboundFrom} 个文档引用 ${d.inboundCount} 次` }, `←${d.inboundCount}`),
      `${(d.bytes / 1024).toFixed(1)}K`,
      isOrphan ? el('span', { class: 'tag must', text: '孤儿' }) : null,
      noLife ? el('span', { class: 'tag must', text: '无生命周期' }) : null,
    ),
  );
}

// ---------------------------------------------------------------- 渲染器绑定
// 渲染器在 public/md.js（无 DOM 副作用、可在 Node 里单测）。这里只做绑定。

const mdToHtml = (t, r) => MD.mdToHtml(t, r);
const slugify = (t) => MD.slugify(t);

// ---------------------------------------------------------------- 单篇

async function loadDoc(rel, anchor) {
  const body = $('doc-body');
  body.innerHTML = '<div class="empty">读取中…</div>';
  try {
    const d = await api('/api/doc?p=' + encodeURIComponent(rel));
    if (d.error) { body.innerHTML = ''; body.appendChild(el('div', { class: 'empty', text: d.message })); return; }
    CURRENT_DOC = d.rel;

    $('doc-title').textContent = d.title;
    const meta = $('doc-meta');
    meta.innerHTML = '';
    meta.appendChild(el('span', { class: 'mono', text: d.rel }));
    meta.appendChild(el('span', { text: `${d.lines} 行 · ${(d.bytes / 1024).toFixed(1)} KB` }));
    if (d.lifespan) meta.appendChild(el('span', { class: 'tag', text: `生命周期：${d.lifespan}` }));
    else meta.appendChild(el('span', { class: 'tag must', text: '未标注生命周期' }));

    body.innerHTML = mdToHtml(d.text, d.rel);
    renderToc(d.headings);
    renderRail($('search').value.trim());
    if (anchor) {
      const target = document.getElementById(anchor);
      if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } else {
      body.scrollTop = 0;
    }
  } catch (e) {
    body.innerHTML = '';
    body.appendChild(el('div', { class: 'empty', text: `读取失败：${e.message}` }));
  }
}

function renderToc(headings) {
  const box = $('doc-toc');
  box.innerHTML = '';
  const usable = headings.filter((h) => h.level <= 4);
  if (!usable.length) { box.appendChild(el('div', { class: 'empty', text: '无章节标题' })); return; }
  for (const h of usable) {
    const id = slugify(h.text);
    box.appendChild(el('a', {
      class: `toc-item lv${h.level}`,
      href: '#' + id,
      text: h.text,
      onclick: (e) => {
        e.preventDefault();
        const t = document.getElementById(id);
        if (t) t.scrollIntoView({ block: 'start', behavior: 'smooth' });
      },
    }));
  }
}

// ---------------------------------------------------------------- 检索

let searchTimer = null;
function onSearchInput(v) {
  clearTimeout(searchTimer);
  const q = v.trim();
  if (!q) {
    SEARCHING = false;
    $('rail-clear').hidden = true;
    if (DOCS_INDEX) renderRail();
    return;
  }
  searchTimer = setTimeout(() => {
    switchView('docs');
    if (!DOCS_INDEX) { loadDocs().then(() => renderRail(q)); return; }
    SEARCHING = true;
    renderRail(q);
    $('rail-clear').hidden = false;
  }, 200);
}

// ---------------------------------------------------------------- 条款索引

async function loadClauses() {
  const box = $('clause-rows');
  box.innerHTML = '<div class="empty">抽取中…</div>';
  try {
    CLAUSES = await api('/api/rules');
  } catch (e) {
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'empty', text: `抽取失败：${e.message}` }));
    return;
  }
  $('clause-filter').value = '';
  renderClauses('');
}

function renderClauses(filter) {
  const box = $('clause-rows');
  box.innerHTML = '';
  const q = (filter || '').toLowerCase();
  const list = CLAUSES.clauses.filter((c) =>
    !q || `${c.id} ${c.title} ${c.summary} ${c.file}`.toLowerCase().includes(q));
  if (!list.length) { box.appendChild(el('div', { class: 'empty', text: '无匹配条款。' })); return; }

  for (const c of list) {
    const labelKeys = Object.keys(c.labels);
    box.appendChild(el('div', { class: 'row clause-row' },
      el('div', {},
        el('div', { class: 'name' },
          el('span', { class: 'clause-id', text: c.id || '—' }),
          c.title,
          el('span', { class: 'tag', text: c.kind }),
        ),
        el('div', { class: 'desc', text: c.summary }),
        labelKeys.length > 1
          ? el('div', { class: 'clause-labels' }, ...labelKeys.map((k) =>
              el('span', { class: `clause-label ${c.summaryFrom === k ? 'hi' : ''}`, text: k })))
          : null,
        el('div', { class: 'meta', text: c.loc }),
      ),
      el('button', {
        class: 'sm ghost', text: '定位',
        onclick: () => {
          switchView('docs');
          const heading = c.id ? `${c.id} ${c.id.includes('.') ? '子条款：' : ''}${c.title}` : c.title;
          const go = () => loadDoc(c.file, MD.slugify(heading));
          if (DOCS_INDEX) go(); else loadDocs().then(go);
        },
      }),
    ));
  }
}

// ---------------------------------------------------------------- 视图绑定

for (const t of document.querySelectorAll('.tab')) {
  t.addEventListener('click', () => switchView(t.dataset.view));
}

$('rail-clear').addEventListener('click', () => {
  SEARCHING = false;
  $('search').value = '';
  $('rail-clear').hidden = true;
  if (DOCS_INDEX) renderRail();
});

$('search').addEventListener('input', (e) => onSearchInput(e.target.value));
$('search').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { clearTimeout(searchTimer); onSearchInput(e.target.value); }
  if (e.key === 'Escape') { $('search').value = ''; onSearchInput(''); $('search').blur(); }
});

$('clause-filter').addEventListener('input', (e) => renderClauses(e.target.value));

$('doc-body').addEventListener('click', (e) => {
  const a = e.target.closest('a.doclink');
  if (!a) return;
  e.preventDefault();
  loadDoc(a.dataset.doc);
});

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
    e.preventDefault();
    $('search').focus();
  }
});

// ================================================================ 绑定

$('btn-refresh').addEventListener('click', () => {
  load();
  if (DOCS_INDEX) loadDocs();
  if (CLAUSES) loadClauses();
});
$('btn-batches').addEventListener('click', loadBatches);
$('d-close').addEventListener('click', closeDrawer);
$('d-cancel').addEventListener('click', closeDrawer);
$('d-apply').addEventListener('click', applyPlan);
$('mask').addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

load();
