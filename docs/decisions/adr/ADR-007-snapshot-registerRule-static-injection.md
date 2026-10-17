# ADR-007: snapshot 走 registerRule 静态注入（不迁 messageBuilder）

- **Status**: Accepted（**结论可信度已降级**：2026-10-17 复查失败，见文末 Update）
- **Confidence**: Hypothesis（原 Verified；前提失效，结论待重新取证）
- **Date**: 2026-07-04
- **Deciders**: 项目所有者
- **Related**: [ADR-005](ADR-005-split-compact-from-handoff.md)、[ADR-006](ADR-006-native-mechanism-first-principle.md)、[hook-auto-injection-design.md](../hook-auto-injection-design.md)、[thin-adapter-layer-design.md](../thin-adapter-layer-design.md)
- **Evidence as of**: 2026-07-04
- **Expires if unchanged**: 2026-10-17（已复查并失败，不再顺延；重新取证后另定）

---

## §1 Context（背景）

context-snapshot plugin 的 `registerRule "snapshot-context"` 当前同时注入 handoff.md（人 + AI 共治文档）和 snapshot（compaction 产物）。外部评审指出这是职责耦合——两者更新周期、消费者、治理模式完全不同。

拆分时遇到关键决策：snapshot 该走 registerRule（session 启动求值一次，静态）还是 messageBuilder（每 turn 求值，动态）？

前期内部评审曾把"snapshot 会话中途 compaction 后不再注入"列为最严重问题，推出"snapshot 必须迁 messageBuilder 做 per-turn 刷新"的结论，并顺手开列 framework 升级需求清单。外部评审指出这是把两行改动膨胀成架构运动，要求先定位 snapshot 的服务对象。

## §2 Decision（决策）

**snapshot 走 registerRule 静态注入，不迁 messageBuilder。**

handoff 和 snapshot 各注册一条 id 不同的 registerRule（`handoff-context` / `snapshot-context`），content() 改纯函数读预加载 state，I/O 移到 setup() 或独立 loader。

## §3 Rationale（论证）

### 3.1 承重论据：会话内续命归 cline 原生 compaction，不归 snapshot

> compaction 本身是 cline 原生机制，compaction 后的 messages 已经是 cline 处理过的。

会话内的上下文延续，是 cline 原生 compaction 自己完成的——它产出压缩后的 messages 直接接着本会话跑。snapshot **根本不参与本会话的续命**，它是写到磁盘给下一会话启动时读的旁路产物。

所以"会话内 compaction 后 snapshot 不再重新注入"不是缺陷，是**职责本就不覆盖**——本会话的续命压根不归 snapshot 管。

### 3.2 这一步证伪了"snapshot 必须迁 messageBuilder"的推论链

前期内部评审假设 snapshot 需要在会话内续命，于是推出"必须 per-turn / 必须 messageBuilder / framework 应提供 per-turn 原语"。但续命是 cline 的活，不是 snapshot 的活。**前提不成立，整条推论链自动塌掉。**

这不是因为 framework 升级"改不了框架"才砍，而是因为它论证的需求根本不存在。

### 3.3 registerRule 的"求值一次"契约匹配 snapshot 服务对象

snapshot 服务**跨会话续作**——session 启动时读最新 snapshot 文件即够。会话内 compaction 写入的新 snapshot 留给**下一会话**消费，不要求本会话内重新注入。

registerRule content 只在 session 启动求值一次——这恰好是 snapshot 需要的语义。

### 3.4 顺带化解"违反 runtime-probe §2.4"的疑点

[runtime-probe §2.4](../../decisions/investigation/investigation-note-cline-runtime-probe.md) 禁止"用 registerRule 做**动态**内容注入（期望中途刷新）"。

定位锁死后，handoff 和 snapshot **都是 session-start 静态资产**——启动时读一次正是它们要的语义。在求值那一刻加载文件内容，和"期望动态刷新"是两回事。**不是违反，是恰好用对了 registerRule 的求值时机。**

### 3.5 已知框架限制（一句话备注，不进设计正文）

cline CLI 当前限制：registerRule 单次求值 + messageBuilder 服从度不足。这是 framework 层约束，plugin 层无法独立解决。本 ADR 的决策在此约束下成立。

## §4 复查触发条件（可证伪）

> **复查触发**：若出现"本会话必须重读自己中途写的 snapshot（而非 cline 原生 compaction 产物）"的真实需求，本定位失效，snapshot 需重新评估迁往 messageBuilder（并连带解决服从度问题）。

有了这一句，决策是可回滚的假设而不是教条——防止未来有人拿"当初 ADR 说走 registerRule"当免检令牌（这正是 dev-rules §1.13 结论时效性门控想防的）。

## §5 Consequences（影响）

### 5.1 拆分改动

- `registerRule("snapshot-context")` content 只返回 snapshot 内容
- 新增 `registerRule("handoff-context")` content 只返回 handoff 内容
- content() 改纯函数读预加载 state，I/O 移到 setup() 或独立 loader
- 两个 rule 独立降级：snapshot 文件不存在 → snapshot rule 返回空；handoff.md 不存在 → handoff rule 返回空；互不影响

### 5.2 不改的部分

- **写入端不动**：compaction hook 写 snapshot 文件、人 + AI 写 handoff.md，早已分离
- **机制不换**：registerRule/messageBuilder/beforeModel 都保留，只改读取端组织方式
- **handoff 走 registerRule**：handoff 是会话级资产，session 中途编辑概率低，"求值一次"契约可接受

### 5.3 不做的事

- **不开 framework 升级需求清单**：cline 不会为单一插件改 framework，许愿式结论落不了地
- **不引入 Context Preparation 阶段**：那是 runtime 架构升级，超出 plugin 层职责
- **不迁 snapshot 到 messageBuilder**：会重新触发"模型忽略注入"问题（决策 `registerRule-over-messageBuilder`）

## §6 Evidence（证据）

| 事实 | 来源 | 含义 |
|------|------|------|
| `rules: AgentExtensionRule[]` | `@cline/shared/dist/extensions/contribution-registry.d.ts` L164 | 支持多 rule 独立注册 |
| `registerRule(rule)` 每次注册一个 | 同上 L96 | 调两次即注册两条 |
| `getRegisteredRules(): AgentExtensionRule[]` | 同上 L229 | 可枚举所有 rule |
| registerRule content 只在 session 启动求值一次 | [runtime-probe §2.4](../investigation/investigation-note-cline-runtime-probe.md) | 静态内容 OK，动态内容死路径 |
| messageBuilder 注入 system 消息被训练偏好压过 | [handoff.md 决策 `registerRule-over-messageBuilder`](../../handoff.md) | 动态注入服从度不足 |
| snapshot 写入在 beforeModel hook（不在 registerRule） | [index.ts L205-230](../../../context-snapshot/src/index.ts#L205-L230) | 写入端早已分离 |

---

## Update 2026-10-17：复查失败（§15 第 3 条 → 降级）

**复查动作**：读 `@cline/core@0.0.95` 的实现体 `dist/extensions/plugin-sandbox-bootstrap.js`。

**发现**：本 ADR 的立论前提是「`registerRule` content 只在 session 启动求值一次」。实现体显示前提不成立：

```js
registerRule:(s)=>{
  let a=Rs(i.pluginId,"rule");
  if(typeof s.content==="function"){
    e.rules.set(a,s.content);
    C.rules.push({id:a,ruleId:s.id,source:s.source,hasContentHandler:!0});
    return;
  }
  C.rules.push({id:a,ruleId:s.id,content:s.content,source:s.source});
}
```

宿主另暴露按需解析：

```js
async function kb(i){let k=ri(i.pluginId).handlers.rules.get(i.contributionId);
  if(typeof k!=="function")return "";return await k()}
... Db={..., resolveRuleContent: kb}
```

即：rule content 可以是**函数**，由宿主持有并通过 `resolveRuleContent()` 按需调用 —— 「只在 session 启动求值一次」这个前提不成立。

**处置**（按 `docs/evidence-governance.md` §15 超期处置第 3 条「复查失败：降级为 Hypothesis，登记 Conflict Registry」）：

- 结论可信度 `Verified` → **`Hypothesis`**
- 登记冲突：**前提已失效，结论待重新取证** —— 见下方登记
- `Expires if unchanged` 不再顺延

**Conflict Registry 登记**（依据 `docs/evidence-governance.md` §6 Conflict Registry「冲突时记录，不裁决」）：

| 项 | 内容 |
|---|---|
| 冲突命题 | 「snapshot 该走 `beforeModel`、不该走 `registerRule`」 |
| 支持原结论的证据 | 原前提：registerRule 只在 session 启动求值一次（当时观察，未见版本标注） |
| 反对原结论的证据 | `@cline/core@0.0.95` 实现体：registerRule 接受函数式 content 且宿主按需 `resolveRuleContent()` |
| 当前状态 | **未裁决**。前提失效 ≠ 结论必错：结论要成立还需另一条证据——「resolveRuleContent 的调用时机不足以支撑 snapshot 注入」 |
| 下一步取证 | 读 runtime 侧调用 `resolveRuleContent` 的位置与频次（在 `@cline/core` dist 里可查） |

**注意**：本次只降级与登记，**未改 ADR 的 Decision 正文**。按 §6「冲突时记录，不裁决」，裁决需等下一步取证。
### 冲突裁决依据补记（2026-10-17）

继续读 `@cline/core@0.0.95` 的 dist，`resolveRuleContent` 的调用点如下：

```js
// 宿主侧把注册的 rule 包装成惰性 content thunk
content: s.hasContentHandler === true
  ? async () => { try { return await t.call("resolveRuleContent", { pluginId: n.pluginId, contributionId: s.id }, { timeoutMs: r }) } ... }
  : ...   // entry.js / index.js
```

更关键的一处：**宿主自带**的规则就是这么写的 ——

```js
r.registerRule({ id: "cline-user-instructions:rules", source: "user-instruction-watcher", content: () => GC(e.watcher) })
```

即：连 cline 自己的 user-instructions 规则都用**函数式 content + watcher**，取用时才求值。

**裁决**：本 ADR 的立论理由「registerRule content 只在 session 启动求值一次」**不成立**，且不是边界情况 —— 惰性 content 是这门接口的正常用法。原结论（snapshot 该走 beforeModel）因此失去核心论据。

**仍未裁决的部分**：结论本身要不要翻（是否改为走 registerRule 注入 snapshot）需要另一个判断 —— 即 `resolveRuleContent` 的调用时机是否满足 snapshot 的"压缩后立即可用"要求。这属于重新设计决策，不在本次取证范围内，留待正式 ADR 处理。

**依据补充**：`docs/evidence-governance.md` §6 Conflict Registry「冲突时记录，不裁决」—— 本次记录到"立论理由失效"为止，Decision 正文仍未改动。