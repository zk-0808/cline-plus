/**
 * validate.mjs — 配置门禁（P0）
 *
 * 职责：判定**拟议的完整状态**是否允许落盘。它不写任何文件，纯函数式。
 *
 * 三条设计红线（来自评审）：
 *  1. `status`（事实）与 `blocking`（策略）分开。`unknown` / `not_applicable`
 *     绝不自动折成 `pass`；是否阻断由该项检查的安全要求决定，逐条声明、集中在 POLICY 表里可审计。
 *  2. 不维护 Capability 名称白名单。契约从分发器源码推导（见 contract.mjs），
 *     用户新增合法 Capability 必须判 pass。
 *  3. 校验"预设是否履行它自己的契约"，不是"是否符合最全配置"。
 *     `不用 Hook` / `只用宪法` 是文档写明的合法装配，必须 pass。
 *
 * 事实依据（不是本文件发明的规则）：
 *  - `.governance/plugin/config-loader.ts` · loadConfig：config.json **解析失败不会报错**，
 *    而是 console.warn 后静默回落到 DEFAULT_CONFIG。也就是说坏配置会变成"全部按默认开着"。
 *    这是 CONFIG_PARSE 必须阻断的理由，而不是"我不喜欢坏 JSON"。
 *  - `docs/decisions/delivery-framework-design.md §五 删除矩阵`：五个装配场景各自允许删什么。
 *  - `.governance/core/constitution.md · 项目可调参数`：8 个参数及其本仓库取值。
 */

export const PARAM_RULES = {
  independent_evidence_count: { min: 1, integer: true, why: '「≥N 类独立证据」的 N，为 0 则任何结论自动成立' },
  negative_conclusion_evidence_count: { min: 1, integer: true, why: '「无 X」结论的 N，为 0 则阴性结论无需证据' },
  uncommitted_file_threshold: { min: 1, integer: true, why: '触发器 b 的阻断阈值，为 0 则永远阻断' },
  long_session_turns: { min: 1, integer: true, why: '触发器 c 的轮次阈值，为 0 则任何会话都算「过长」' },
  context_pressure_ratio: { min: 0.01, max: 0.99, integer: false, why: '上下文占用比例，须落在 (0,1) 开区间' },
  proposition_flip_threshold: { min: 1, integer: true, why: '翻转审查阈值，为 0 则每次都触发' },
  rule_stale_months: { min: 1, integer: true, why: '退役判据月数，为 0 则规则立即过期' },
  rule_retire_keep_days: { min: 0, integer: true, why: '退役保留期，允许 0（立即物理删除）' },
};

/**
 * 状态 → 是否阻断。`true` 阻断，`false` 不阻断，'ctx' 表示由该项的适用条件在检查时决定。
 */
export const POLICY = {
  CONFIG_PARSE: { fail: true, unknown: true },
  CONTRACT_UNREADABLE: { unknown: 'ctx' },
  HOOK_KEY_UNDECLARED: { warn: false, unknown: false },
  CAP_KEY_UNDISPATCHED: { fail: 'ctx', warn: false, unknown: false },
  CAP_DECLARED_NOT_CONSUMED: { warn: false, unknown: false },
  CAP_IMPL_BROKEN: { fail: 'ctx', warn: false, not_applicable: false },
  CAP_ORPHAN: { warn: false },
  CAP_ARGS_UNDECLARED: { warn: false },
  CAP_SHARED_ARGS_DIVERGE: { warn: false },
  CAP_ENABLED_NO_IMPL: { warn: false },
  HOOK_NO_CAPABILITY: { warn: false, unknown: false },
  MUST_KEEP_MISSING: { fail: true },
  PRESET_CONTRACT: { fail: true },
  PARAM_RANGE: { fail: true },
  PARAM_MISSING: { warn: false },
  PARAM_DIVERGENCE: { warn: false },
  SKIPTOOLS_UNKNOWN: { warn: false, unknown: false },
};

const PARAM_ROW_RE = /^\|\s*`([a-z_]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*$/;

/** 解析宪法参数表 → Map(name → {value, spec, line}) */
export function parseParamRows(constText) {
  const rows = new Map();
  if (!constText) return rows;
  const lines = constText.split('\n');
  lines.forEach((line, i) => {
    const m = line.match(PARAM_ROW_RE);
    if (m) rows.set(m[1], { value: m[2].trim(), spec: m[3].trim(), line: i + 1, raw: line });
  });
  return rows;
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * 校验拟议状态。
 *
 * @param {string} repo  仓库绝对路径
 * @param {object} ctx
 * @param {string} ctx.opKind           计划里的 op.op，如 'param.set' / 'preset.apply'
 * @param {string} [ctx.opSummary]      人类可读的一行摘要
 * @param {string|null} ctx.configText  拟议的 config.json 全文；null 表示拟议状态里没有该文件
 * @param {string|null} ctx.constText   拟议的 constitution.md 全文
 * @param {object} ctx.presence         { layerId: boolean } 拟议的层存在性
 * @param {Array}  ctx.layers           LAYERS（含 id/path/mustKeep）
 * @param {Array}  ctx.presets          PRESETS（含 id/disable）
 * @param {string|null} [ctx.presetId]  若本次操作是应用某个预设
 * @param {object} contract             deriveContract(repo) 的结果
 */
export function validateState(ctx, contract) {
  const {
    opKind, opSummary, configText, constText, presence,
    layers = [], presets = [], presetId = null,
  } = ctx;

  const checks = [];
  const emit = (id, title, ruleRef, status, fields = {}) => {
    const policy = POLICY[id] ?? {};
    const declared = policy[status];
    const blocking = fields.blocking !== undefined
      ? fields.blocking
      : declared === 'ctx' ? false : !!declared;
    checks.push({
      id, title, ruleRef, status, blocking,
      observed: fields.observed ?? null,
      expected: fields.expected ?? null,
      fix: fields.fix ?? null,
      detail: fields.detail ?? null,
    });
  };

  // ---------------- 0. 契约本身可否读出
  const touchesDispatch = ['hook.toggle', 'cap.toggle', 'cap.arg', 'preset.apply'].includes(opKind);

  let config = null;
  let configError = null;
  if (configText != null) {
    try { config = JSON.parse(configText); } catch (e) { configError = String(e?.message ?? e); }
  }

  const hookNodes = isPlainObject(config) ? config : {};
  const enabledHooks = Object.entries(hookNodes)
    .filter(([, v]) => isPlainObject(v) && v.enabled === true)
    .map(([k]) => k);

  if (!contract.ok) {
    emit('CONTRACT_UNREADABLE', '分发契约不可读', '需要 .governance/plugin/types.ts 与 index.ts 作为契约来源',
      'unknown', {
        blocking: touchesDispatch && enabledHooks.length > 0,
        observed: contract.problems.join('；') || '未知原因',
        expected: '能从 types.ts 的 HooksConfig / DEFAULT_CONFIG 与 plugin 源码的读取点推出契约',
        fix: '恢复 .governance/plugin/types.ts 与 index.ts。契约读不出时无法确认任何 Capability 会不会被执行。',
      });
  }

  // ---------------- 1. config.json 自身
  const hooksLayerPresent = presence?.hooks !== false;
  if (!hooksLayerPresent) {
    emit('CONFIG_PARSE', 'config.json 可解析', '.governance/plugin/config-loader.ts · loadConfig', 'not_applicable', {
      observed: `.governance/hooks/ 在拟议状态中不存在，config.json 随之停用（${opSummary ?? opKind}）`,
      expected: '不适用',
      fix: null,
    });
  } else if (configText == null) {
    emit('CONFIG_PARSE', 'config.json 可解析', '.governance/plugin/config-loader.ts · loadConfig', 'fail', {
      observed: '拟议状态里没有 .governance/hooks/config.json',
      expected: '该文件存在且是合法 JSON',
      fix: '从 git 恢复 .governance/hooks/config.json，或改用会创建它的装配方式。',
    });
  } else if (configError) {
    emit('CONFIG_PARSE', 'config.json 可解析', '.governance/plugin/config-loader.ts · loadConfig', 'fail', {
      observed: `JSON 解析失败：${configError}`,
      expected: '合法 JSON 对象',
      fix: '修好语法。注意：loadConfig 遇到坏配置不会报错，而是静默回落到 DEFAULT_CONFIG —— 也就是「全部按默认开着」。',
    });
  } else if (!isPlainObject(config)) {
    emit('CONFIG_PARSE', 'config.json 可解析', '.governance/plugin/config-loader.ts · loadConfig', 'fail', {
      observed: `顶层类型是 ${Array.isArray(config) ? 'array' : typeof config}，不是对象`,
      expected: '顶层为对象',
      fix: '改成 { "<hook>": {...} } 形式。',
    });
  } else {
    emit('CONFIG_PARSE', 'config.json 可解析', '.governance/plugin/config-loader.ts · loadConfig', 'pass', {
      observed: '合法 JSON 对象',
      expected: '合法 JSON 对象',
    });
  }

  const canInspectConfig = hooksLayerPresent && isPlainObject(config);

  // ---------------- 2. 顶层键是否是分发器认识的 Hook
  if (canInspectConfig) {
    const unknownKeys = Object.keys(hookNodes).filter((k) => !contract.hookKeys.includes(k));
    if (unknownKeys.length) {
      emit('HOOK_KEY_UNDECLARED', '顶层键在分发器里有出处', contract.sources.hookKeys, 'warn', {
        observed: `config.json 有 ${unknownKeys.join('、')}，但 HooksConfig 只声明了 ${contract.hookKeys.join('、')}`,
        expected: 'config.json 的顶层键都在 HooksConfig 里声明',
        fix: '若该键不是 Hook（例如 tracing 的路径参数写在 index.ts 常量里），可移到注释以外的位置或补进 HooksConfig；若确是新 Hook，需在 types.ts 声明并在 hooks/ 下接线。',
        detail: { unknownKeys },
      });
    } else {
      emit('HOOK_KEY_UNDECLARED', '顶层键在分发器里有出处', contract.sources.hookKeys, 'pass', {
        observed: Object.keys(hookNodes).join('、'),
        expected: 'config.json 的顶层键都在 HooksConfig 里声明',
      });
    }
  }

  // ---------------- 3. Capability 引用 ↔ 分发关系（与"实现目录缺失"是两件事）
  if (canInspectConfig) {
    const undeclared = [];   // {hook, cap, hookEnabled, capEnabled}
    const notConsumed = [];
    const argsUndeclared = [];

    for (const [hookKey, hookNodeRaw] of Object.entries(hookNodes)) {
      const hookNode = isPlainObject(hookNodeRaw) ? hookNodeRaw : {};
      const caps = isPlainObject(hookNode.capabilities) ? hookNode.capabilities : {};
      const decl = contract.declared[hookKey] ?? null;

      for (const [capKey, capNodeRaw] of Object.entries(caps)) {
        const capNode = isPlainObject(capNodeRaw) ? capNodeRaw : {};
        const capEnabled = capNode.enabled !== false;
        const declCap = decl ? decl[capKey] : undefined;

        if (!declCap) {
          const consumedHere = contract.consumed[capKey]?.length > 0;
          if (!consumedHere) {
            undeclared.push({ hook: hookKey, cap: capKey, hookEnabled: hookNode.enabled === true, capEnabled });
          } else {
            notConsumed.push({ hook: hookKey, cap: capKey });
          }
        } else if (!contract.consumed[capKey]?.length) {
          notConsumed.push({ hook: hookKey, cap: capKey });
        }

        if (declCap && isPlainObject(capNode.args)) {
          const extra = Object.keys(capNode.args).filter((a) => !declCap.args.includes(a));
          if (extra.length) argsUndeclared.push({ hook: hookKey, cap: capKey, args: extra });
        }
      }
    }

    if (!undeclared.length) {
      emit('CAP_KEY_UNDISPATCHED', 'Capability 引用可被分发器解析', contract.sources.consumed, 'pass', {
        observed: '配置里出现的 Capability 键都能在分发器源码里找到读取点',
        expected: 'enabled 的 Capability 都能被分发器解析并执行',
      });
    } else {
      const live = undeclared.filter((u) => u.hookEnabled && u.capEnabled);
      const dead = undeclared.filter((u) => !(u.hookEnabled && u.capEnabled));
      const fmt = (u) => `${u.hook}.capabilities.${u.cap}`;
      if (live.length) {
        emit('CAP_KEY_UNDISPATCHED', 'Capability 引用可被分发器解析', contract.sources.consumed, 'fail', {
          blocking: true,
          observed: `${live.map(fmt).join('、')} 处于启用状态，但分发器里没有读取它们的代码`,
          expected: 'enabled 的 Capability 都能被分发器解析并执行',
          fix: '二选一：① 在 types.ts 的 DEFAULT_CONFIG 声明并在对应 hooks/*.ts 里读取它（这才是本框架"新增 Capability"的完整动作，只建目录不算）；② 把这个键从 config.json 删掉或置 enabled:false。',
          detail: { live, dead },
        });
      } else {
        emit('CAP_KEY_UNDISPATCHED', 'Capability 引用可被分发器解析', contract.sources.consumed, 'warn', {
          observed: `${dead.map(fmt).join('、')} 在分发器里找不到读取点，但这些 Hook 或 Capability 当前是关闭的，不会被执行`,
          expected: 'enabled 的 Capability 都能被分发器解析并执行',
          fix: '开启之前先把分发侧补上，否则开启后是空转。',
          detail: { live, dead },
        });
      }
    }

    if (notConsumed.length) {
      emit('CAP_DECLARED_NOT_CONSUMED', '声明过的 Capability 有读取点', contract.sources.declared, 'warn', {
        observed: `${notConsumed.map((u) => `${u.hook}.${u.cap}`).join('、')} 在 DEFAULT_CONFIG 里声明了，但分发器源码里找不到读取点`,
        expected: '声明与读取一致',
        fix: '确认是否漏了接线；若该 Capability 已废弃，从 DEFAULT_CONFIG 移除声明。',
        detail: { notConsumed },
      });
    } else {
      emit('CAP_DECLARED_NOT_CONSUMED', '声明过的 Capability 有读取点', contract.sources.declared, 'pass', {
        observed: 'DEFAULT_CONFIG 的每个 Capability 声明都有对应读取点',
        expected: '声明与读取一致',
      });
    }

    if (argsUndeclared.length) {
      emit('CAP_ARGS_UNDECLARED', 'Capability 参数有声明', contract.sources.declared, 'warn', {
        observed: argsUndeclared.map((u) => `${u.cap}.${u.args.join('/')}`).join('、'),
        expected: 'config 里的参数键都在 DEFAULT_CONFIG 的 args 里声明',
        fix: '多出来的参数会被分发器忽略，不会报错也不会生效。',
        detail: { argsUndeclared },
      });
    } else {
      emit('CAP_ARGS_UNDECLARED', 'Capability 参数有声明', contract.sources.declared, 'pass', {
        observed: '参数键与 DEFAULT_CONFIG 一致',
        expected: 'config 里的参数键都在 DEFAULT_CONFIG 的 args 里声明',
      });
    }

    // 同一 Capability 挂在多个 Hook 上时，取值是否分叉
    const byCap = new Map();
    for (const [hookKey, hookNodeRaw] of Object.entries(hookNodes)) {
      const caps = isPlainObject(hookNodeRaw?.capabilities) ? hookNodeRaw.capabilities : {};
      for (const [capKey, capNode] of Object.entries(caps)) {
        if (!byCap.has(capKey)) byCap.set(capKey, []);
        byCap.get(capKey).push({ hook: hookKey, args: isPlainObject(capNode?.args) ? capNode.args : {} });
      }
    }
    const diverged = [];
    for (const [capKey, uses] of byCap) {
      if (uses.length < 2) continue;
      const sigs = new Set(uses.map((u) => JSON.stringify(u.args, Object.keys(u.args).sort())));
      if (sigs.size > 1) diverged.push({ cap: capKey, uses });
    }
    if (diverged.length) {
      emit('CAP_SHARED_ARGS_DIVERGE', '同一 Capability 多 Hook 取值一致', contract.sources.declared, 'warn', {
        observed: diverged.map((d) => `${d.cap}：${d.uses.map((u) => `${u.hook}=${JSON.stringify(u.args)}`).join(' vs ')}`).join('；'),
        expected: '同一 Capability 在不同 Hook 上用同一组参数',
        fix: '同一事实存在两处取值时，改一处会漏另一处。确认是否为有意差异；不是就统一。',
        detail: { diverged },
      });
    } else {
      emit('CAP_SHARED_ARGS_DIVERGE', '同一 Capability 多 Hook 取值一致', contract.sources.declared, 'pass', {
        observed: [...byCap.entries()].filter(([, u]) => u.length > 1).map(([k, u]) => `${k} × ${u.length} 个 Hook，取值一致`).join('；') || '没有跨 Hook 共用的 Capability',
        expected: '同一 Capability 在不同 Hook 上用同一组参数',
      });
    }

    // 启用的 Hook 却没有可用 Capability
    const emptyEnabled = [];
    for (const hookKey of enabledHooks) {
      const declCaps = contract.declared[hookKey] ? Object.keys(contract.declared[hookKey]) : [];
      if (!declCaps.length) continue; // 契约本身声明该 Hook 不挂 Capability（如 post-tool）→ 不适用
      const caps = isPlainObject(hookNodes[hookKey]?.capabilities) ? hookNodes[hookKey].capabilities : {};
      const anyEnabled = Object.values(caps).some((c) => isPlainObject(c) && c.enabled !== false);
      if (!Object.keys(caps).length || !anyEnabled) emptyEnabled.push(hookKey);
    }
    if (emptyEnabled.length) {
      emit('HOOK_NO_CAPABILITY', '启用的 Hook 有可执行 Capability', contract.sources.declared, 'warn', {
        observed: `${emptyEnabled.join('、')} 已启用，但没有启用任何 Capability`,
        expected: '启用的 Hook 至少有一个启用的 Capability',
        fix: '确认是预期的空转；不是就启用对应 Capability，或关掉这个 Hook。',
        detail: { emptyEnabled },
      });
    } else {
      emit('HOOK_NO_CAPABILITY', '启用的 Hook 有可执行 Capability', contract.sources.declared, 'pass', {
        observed: '每个启用的 Hook 都有启用的 Capability',
        expected: '启用的 Hook 至少有一个启用的 Capability',
      });
    }

    // skipTools 名称出处
    const skipTools = Array.isArray(hookNodes['pre-tool']?.skipTools) ? hookNodes['pre-tool'].skipTools : null;
    if (skipTools == null) {
      emit('SKIPTOOLS_UNKNOWN', 'skipTools 名称有出处', contract.toolNames.source, 'not_applicable', {
        observed: 'pre-tool.skipTools 未配置',
        expected: '不适用',
      });
    } else {
      const known = new Set([...contract.toolNames.skipDefaults, ...contract.toolNames.writeTools]);
      const unknown = skipTools.filter((t) => !known.has(t));
      if (unknown.length) {
        emit('SKIPTOOLS_UNKNOWN', 'skipTools 名称有出处', contract.toolNames.source, 'warn', {
          observed: `这些工具名在 DEFAULT_CONFIG.skipTools 与 WRITE_TOOL_NAMES 里都没有：${unknown.join('、')}`,
          expected: 'skipTools 的每个名称都能在仓库自有清单里找到出处',
          fix: '若是 CLI 新版本的工具名，请同步更新 types.ts 的 DEFAULT_CONFIG 与 docs/handoff.md §3 的工具名变更记录（保留旧名向后兼容）；若是拼写错误，改成正确名称 —— 写错的名字不会匹配任何工具，等于白名单没生效。',
          detail: { unknown, known: [...known] },
        });
      } else {
        emit('SKIPTOOLS_UNKNOWN', 'skipTools 名称有出处', contract.toolNames.source, 'pass', {
          observed: `${skipTools.length} 个名称都有出处`,
          expected: 'skipTools 的每个名称都能在仓库自有清单里找到出处',
        });
      }
    }
  } else if (hooksLayerPresent) {
    // config 存在但不可解析 → 上面已判 fail，依赖项标注为不可判定，而不是编造通过
    for (const [id, title, ref] of [
      ['CAP_KEY_UNDISPATCHED', 'Capability 引用可被分发器解析', contract.sources.consumed],
      ['CAP_DECLARED_NOT_CONSUMED', '声明过的 Capability 有读取点', contract.sources.declared],
      ['HOOK_NO_CAPABILITY', '启用的 Hook 有可执行 Capability', contract.sources.declared],
      ['SKIPTOOLS_UNKNOWN', 'skipTools 名称有出处', contract.toolNames.source],
      ['HOOK_KEY_UNDECLARED', '顶层键在分发器里有出处', contract.sources.hookKeys],
    ]) {
      emit(id, title, ref, 'unknown', {
        observed: 'config.json 不可解析，无法检查该项',
        expected: 'config.json 可解析后才能判定',
        fix: '先修好 config.json。',
        blocking: POLICY[id]?.unknown === 'ctx' ? touchesDispatch && enabledHooks.length > 0 : POLICY[id]?.unknown === true,
      });
    }
  }

  // ---------------- 4. 实现是否真的在磁盘上（静态导入能否解析）
  const capsPresent = presence?.capabilities !== false;
  if (!capsPresent) {
    emit('CAP_IMPL_BROKEN', '静态导入的实现文件存在', contract.sources.imports, 'not_applicable', {
      observed: '.governance/capabilities/ 在拟议状态中不存在，分发侧的导入自然无处可指（该装配下所有 Hook 也应关闭）',
      expected: '不适用',
      fix: null,
    });
  } else if (!contract.imports.length) {
    emit('CAP_IMPL_BROKEN', '静态导入的实现文件存在', contract.sources.imports, 'not_applicable', {
      observed: '分发器里没有对 capabilities/ 的静态导入',
      expected: '不适用',
    });
  } else {
    const broken = contract.imports.filter((i) => !i.target);
    if (broken.length) {
      const live = enabledHooks.length > 0;
      emit('CAP_IMPL_BROKEN', '静态导入的实现文件存在', contract.sources.imports, live ? 'fail' : 'warn', {
        blocking: live,
        observed: broken.map((b) => `${b.from} 指向 ${b.spec}，但该文件不存在`).join('；'),
        expected: '分发器每个静态导入都能解析到磁盘上的实现文件',
        fix: '恢复缺失的实现文件，或从分发器移除该导入。注意这会让插件加载直接失败，不是运行期降级。',
        detail: { broken, checked: contract.imports.length },
      });
    } else {
      emit('CAP_IMPL_BROKEN', '静态导入的实现文件存在', contract.sources.imports, 'pass', {
        observed: `${contract.imports.length} 处静态导入全部可解析`,
        expected: '分发器每个静态导入都能解析到磁盘上的实现文件',
      });
    }

    if (contract.orphans.length) {
      emit('CAP_ORPHAN', '没有无分发者的 Capability 目录', contract.sources.capDirs, 'warn', {
        observed: `${contract.orphans.join('、')} 既没有被分发器静态导入，也不对应任何已声明的 Capability 键`,
        expected: 'capabilities/ 下的每个目录都能被某个分发路径用到',
        fix: '删除该目录，或在 types.ts 声明 + 在 hooks/*.ts 里接线。留着会被误认为"已经生效"。',
        detail: { orphans: contract.orphans },
      });
    } else {
      emit('CAP_ORPHAN', '没有无分发者的 Capability 目录', contract.sources.capDirs, 'pass', {
        observed: `${contract.capDirs.length} 个目录都有分发路径`,
        expected: 'capabilities/ 下的每个目录都能被某个分发路径用到',
      });
    }
  }

  // ---------------- 5. 必需层 / 预设自身契约
  if (layers.length) {
    const missingMust = layers.filter((l) => l.mustKeep && presence?.[l.id] === false);
    if (missingMust.length) {
      emit('MUST_KEEP_MISSING', '必需层在拟议状态中仍存在', 'docs/decisions/delivery-framework-design.md §四 · 各层「可删?」列', 'fail', {
        observed: `拟议状态会让这些必需层消失：${missingMust.map((l) => l.path).join('、')}`,
        expected: `必需层始终存在：${layers.filter((l) => l.mustKeep).map((l) => l.path).join('、')}`,
        fix: '撤销该操作。必需层缺失会让整套机制失效，且不属于任何合法装配。',
        detail: { missingMust },
      });
    } else {
      emit('MUST_KEEP_MISSING', '必需层在拟议状态中仍存在', 'docs/decisions/delivery-framework-design.md §四 · 各层「可删?」列', 'pass', {
        observed: `必需层齐全：${layers.filter((l) => l.mustKeep && presence?.[l.id] !== false).map((l) => l.path).join('、')}`,
        expected: '必需层始终存在',
      });
    }

    if (!presetId) {
      emit('PRESET_CONTRACT', '预设履行它自己的删除契约', 'docs/decisions/delivery-framework-design.md §五 删除矩阵', 'not_applicable', {
        observed: `本次操作不是应用预设（${opKind}）`,
        expected: '不适用',
      });
    } else {
      const preset = presets.find((p) => p.id === presetId);
      if (!preset) {
        emit('PRESET_CONTRACT', '预设履行它自己的删除契约', 'docs/decisions/delivery-framework-design.md §五 删除矩阵', 'fail', {
          observed: `未知预设 ${presetId}`,
          expected: '预设 id 必须在 PRESETS 里',
          fix: '这是控制台内部错误，请报告。',
        });
      } else {
        const disabledIds = preset.disable ?? [];
        const stillPresent = disabledIds.filter((id) => presence?.[id] !== false);
        const wronglyGone = layers.filter((l) => !disabledIds.includes(l.id) && presence?.[l.id] === false);
        const byId = new Map(layers.map((l) => [l.id, l]));
        if (stillPresent.length || wronglyGone.length) {
          emit('PRESET_CONTRACT', '预设履行它自己的删除契约', 'docs/decisions/delivery-framework-design.md §五 删除矩阵', 'fail', {
            observed: [
              stillPresent.length ? `应用「${preset.label}」后应停用却仍存在：${stillPresent.map((id) => byId.get(id)?.path ?? id).join('、')}` : '',
              wronglyGone.length ? `未被该预设要求停用却消失了：${wronglyGone.map((l) => l.path).join('、')}` : '',
            ].filter(Boolean).join('；'),
            expected: `应用「${preset.label}」后：停用 ${disabledIds.map((id) => byId.get(id)?.path ?? id).join('、') || '（无）'}，其余保留`,
            fix: '撤销并报告；这说明预设实现与 §五 的删除矩阵不一致。',
            detail: { preset: preset.id, disabledIds, stillPresent, wronglyGone },
          });
        } else {
          emit('PRESET_CONTRACT', '预设履行它自己的删除契约', 'docs/decisions/delivery-framework-design.md §五 删除矩阵', 'pass', {
            observed: `停用 ${disabledIds.map((id) => byId.get(id)?.path ?? id).join('、') || '（无）'}；其余层保留`,
            expected: '与 §五 删除矩阵一致',
          });
        }
      }
    }
  }

  // ---------------- 6. 宪法参数
  const rows = parseParamRows(constText);
  if (!constText) {
    emit('PARAM_RANGE', '宪法参数在语义边界内', '.governance/core/constitution.md · 项目可调参数', 'not_applicable', {
      observed: '拟议状态里没有 constitution.md',
      expected: '不适用',
    });
  } else {
    const bad = [];
    const missing = [];
    for (const [name, rule] of Object.entries(PARAM_RULES)) {
      const row = rows.get(name);
      if (!row) { missing.push(name); continue; }
      const num = Number(row.value);
      if (!Number.isFinite(num)) { bad.push({ name, value: row.value, why: '不是数字' }); continue; }
      if (rule.integer && !Number.isInteger(num)) { bad.push({ name, value: row.value, why: '必须是整数' }); continue; }
      if (num < rule.min) { bad.push({ name, value: row.value, why: `不得小于 ${rule.min}（${rule.why}）` }); continue; }
      if (rule.max != null && num > rule.max) { bad.push({ name, value: row.value, why: `不得大于 ${rule.max}（${rule.why}）` }); continue; }
    }
    if (bad.length) {
      emit('PARAM_RANGE', '宪法参数在语义边界内', '.governance/core/constitution.md · 项目可调参数', 'fail', {
        observed: bad.map((b) => `${b.name}=${b.value}：${b.why}`).join('；'),
        expected: '每个参数都落在其语义允许的区间内',
        fix: '改成合法值。边界由参数含义决定（如「≥N 类独立证据」的 N 不能是 0），不是控制台自定的策略。',
        detail: { bad },
      });
    } else {
      emit('PARAM_RANGE', '宪法参数在语义边界内', '.governance/core/constitution.md · 项目可调参数', 'pass', {
        observed: `${Object.keys(PARAM_RULES).length - missing.length} 个参数都在边界内`,
        expected: '每个参数都落在其语义允许的区间内',
      });
    }
    if (missing.length) {
      emit('PARAM_MISSING', '宪法参数表包含全部已知参数', '.governance/core/constitution.md · 项目可调参数', 'warn', {
        observed: `参数表里找不到：${missing.join('、')}`,
        expected: '8 个已知参数都在表里',
        fix: '补回缺失的行；缺行会让读取该参数的触发器拿不到取值。',
        detail: { missing },
      });
    } else {
      emit('PARAM_MISSING', '宪法参数表包含全部已知参数', '.governance/core/constitution.md · 项目可调参数', 'pass', {
        observed: '8 个已知参数都在表里',
        expected: '8 个已知参数都在表里',
      });
    }

    // 同一事实的两处取值：宪法 uncommitted_file_threshold ↔ gitChecker.threshold
    if (canInspectConfig) {
      const t = rows.get('uncommitted_file_threshold');
      const cfgThresholds = [];
      for (const [hookKey, hookNode] of Object.entries(hookNodes)) {
        const v = hookNode?.capabilities?.gitChecker?.args?.threshold;
        if (v != null) cfgThresholds.push({ hook: hookKey, value: String(v) });
      }
      if (t && cfgThresholds.length) {
        const diverge = cfgThresholds.filter((c) => c.value !== t.value);
        if (diverge.length) {
          emit('PARAM_DIVERGENCE', '同一事实的两处取值一致', '.governance/core/constitution.md · uncommitted_file_threshold ↔ .governance/hooks/config.json · gitChecker.args.threshold', 'warn', {
            observed: `宪法 uncommitted_file_threshold=${t.value}；config.json ${diverge.map((d) => `${d.hook}=${d.value}`).join('、')}`,
            expected: '两处取同一个值',
            fix: '两处都能在控制台里改；改完提交，避免下次会话读到分叉的值。',
            detail: { constitution: t.value, config: cfgThresholds },
          });
        } else {
          emit('PARAM_DIVERGENCE', '同一事实的两处取值一致', '.governance/core/constitution.md · uncommitted_file_threshold ↔ .governance/hooks/config.json · gitChecker.args.threshold', 'pass', {
            observed: `两处都是 ${t.value}`,
            expected: '两处取同一个值',
          });
        }
      }
    }
  }

  const blocking = checks.some((c) => c.blocking);
  const counts = checks.reduce((a, c) => { a[c.status] = (a[c.status] ?? 0) + 1; return a; }, {});

  return {
    blocking,
    counts,
    checks,
    generatedAt: new Date().toISOString(),
    op: { kind: opKind, summary: opSummary ?? null, presetId },
    contract: {
      ok: contract.ok,
      problems: contract.problems,
      hookKeys: contract.hookKeys,
      consumed: Object.keys(contract.consumed),
      orphans: contract.orphans,
      sources: contract.sources,
    },
  };
}
