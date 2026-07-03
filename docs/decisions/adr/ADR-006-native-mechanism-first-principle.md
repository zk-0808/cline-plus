# ADR-006: Native Mechanism First Principle（原生机制优先原则）

- **Status**: Accepted
- **Date**: 2026-07-03
- **Deciders**: 项目所有者
- **Supersedes**: ADR-005 中关于 compact-observer 实现方式的部分（保留 ADR-005 拆分原则，砍掉其默认的"plugin 自己判断 token 阈值"实现路径）
- **Related**: [ADR-001](ADR-001-handoff-compact-memory.md)、[ADR-005](ADR-005-split-compact-from-handoff.md)、[schema-semantic-object-model.md](../schema-semantic-object-model.md)、[mechanism-candidates.md](../../mechanism-candidates.md)
- **Evidence as of**: 2026-07-03
- **Expires if unchanged**: 2026-08-03（项目原则类，30 天后复查执行情况）

---

## §0 元原则（最高级）

> **完美利用 cline 的原生机制——任何新功能/改进，必须先证明原生机制不可用或不足，才能造新轮子。**

此原则**最高级**——优先于所有功能设计、字段决策、阈值调优。任何与之冲突的方案需先回答"为什么原生不够"。

### 元规则自检（防复发约束）

每个决策前问：

1. **是不是又在造原生已有的轮子？**（如：自研 token 阈值判断 / 自研压缩逻辑 / 自研截断策略）
2. **是不是又在打字段补丁？**（继承 [assertion-semantic-model.md §10](../../handoff-schema/assertion-semantic-model.md) 元规则）

两个问题任一答"是"即阻塞决策——需先回到元原则重新审视。

---

## §1 Context（背景）

### 1.1 起源事件

`schema-v2-snapshot-align` 完成后，会话自然延续到 `snapshot-trigger-tuning`（评估 `COMPACT_AT_RATIO` 0.75→0.65-0.70）。

外部评审（GPT）两次回答提出根本性质疑：
- **第一次**：B 分支（snapshot/compaction/trigger-tuning）在重造原生轮子，应做"原生替代性审计"
- **第二次**：核实后修正——cline 原生确实有 `ContextManager` auto-condense + `getNextTruncationRange` 截断策略；plugin/hooks 在 CLI 形态下可用（VSCode 扩展暂不可用）；建议 B 分支整条砍掉改为薄适配层

### 1.2 事实核查结果（2026-07-03）

| 核查项 | 方法 | 结论 | 证据强度 |
|--------|------|------|---------|
| 项目运行形态 | 读 [index.ts:82-83](../../../context-snapshot/src/index.ts#L82-L83) 注释 | **CLI 3.0.34**（已 verified） | 一手源码 |
| plugin/hooks 在 CLI 可用性 | 读 [docs.cline.bot/customization/plugins](https://docs.cline.bot/customization/plugins) | **可用**（"SDK/CLI/Kanban 适用；VSCode/JetBrains 暂不可用"） | 一手官方文档 |
| cline 原生 auto-condense 存在 | GPT 二手核查 + 间接证据（plugin 写 snapshot 行为本身印证原生 condense 存在） | **存在**（`ContextManager` + `/smol` 手动入口 + `getNextTruncationRange`） | 二手核查 + 间接推断（未独立读 cline 源码） |

### 1.3 关键发现：ADR-001/ADR-005 早已有此原则

**ADR-001 (2026-06-23)** 已定方向 A：复用 Cline Compact。关键事实记录：
- "自研 Compact 机制的 `compaction_count = 0`，从未实际触发"
- "Cline 原生已具备自动上下文压缩能力，与本项目 Compact 层职责重叠"

**ADR-005 (2026-06-28)** 进一步拆分：
- "Plugin 不干预 Cline 的 compact 流程"
- "compact-observer：只观察，不产出 handoff"
- 明确边界：Compaction = Cline 负责 / Handoff = Plugin 负责

**结论**：元原则本身早已确立，但 2026-07-03 的 `schema-v2-snapshot-align` 实际**违反了 ADR-005**——snapshot 写入与 compact 触发深度耦合，且保留死代码 `buildCompactionSummary`（计算了压缩后 messages 但未使用）。

---

## §2 Audit：当前实现违反 ADR-005 的具体点

[context-snapshot/src/compaction.ts](../../../context-snapshot/src/compaction.ts) + [index.ts](../../../context-snapshot/src/index.ts) 审计结果：

| 违反点 | 代码位置 | 违反的 ADR 条款 | 性质 |
|--------|---------|---------------|------|
| 自研 token 估算（`estimateTokens`） | [compaction.ts:19-21](../../../context-snapshot/src/compaction.ts#L19-L21) | ADR-005 "Plugin 不干预 Cline compact 流程" | 重造原生 token 计数 |
| 自研阈值判断（`COMPACT_AT_RATIO = 0.75`） | [compaction.ts:7](../../../context-snapshot/src/compaction.ts#L7) | ADR-005 "Plugin 不干预 Cline compact 流程" | 重造原生阈值 |
| `shouldCompact` 函数计算压缩后 messages | [compaction.ts:145-166](../../../context-snapshot/src/compaction.ts#L145-L166) | ADR-005 "只观察，不产出" | **越界**：计算了 `buildCompactionSummary` 但 `index.ts` 未使用 `result.messages` |
| snapshot 写入绑定 compact 触发时机 | [index.ts:60-79](../../../context-snapshot/src/index.ts#L60-L79) | ADR-005 "compact-observer 只观察不产出" | 违反拆分原则 |
| `buildCompactionSummary` 死代码 | [compaction.ts:109-143](../../../context-snapshot/src/compaction.ts#L109-L143) | — | 计算后未使用，是"想造压缩器但没完成"的遗留 |

**核心问题**：`schema-v2-snapshot-align` 在做"snapshot 数据模型对齐 schema V2"的同时，无意中固化了违反 ADR-005 的耦合实现——这才是 `snapshot-trigger-tuning` 显得"中-大工作量且越界到 compaction"的根本原因。

---

## §3 Decision

### 3.1 元原则确立（§0）

"完美利用 cline 的原生机制"提升到最高级原则，优先于所有功能设计决策。

### 3.2 分支裁决

按 GPT 提出的"原生替代性审计"思路，将 handoff-schema 子项目当前未完成项分为两条性质完全不同的分支：

#### 分支 A：Schema + handoff.md 语义对象（保留，符合元原则）

**性质**：填补 cline 原生空白——cline 没有"人/模型可读的、跨 session 跨模型的结构化交接产物"。task history 是给 cline 自己续命用的，不是给下一个 agent 或下一个用户读的。

**未完成项**：
- `assertion-semantic-model` 第 6 步（V2 字段表达重写，显式暂缓，按材料 §9.3 保持缓冲）
- `handoff-schema-v2-kind-exit`（🟢 低延伸项，可选）
- handoff.md 本身的结构化（已 ✅ 完成 schema V2 §1.5 六字段对齐）

**符合元原则的依据**：原生无等价能力，不构成轮子重造。

#### 分支 B：Snapshot / compaction / trigger-tuning（砍/缩/转）

**性质**：违反 ADR-005 拆分原则 + 违反元原则——在 cline 原生 auto-condense 旁边造平行压缩系统。

**未完成项处置**：

| 未完成项 | 处置 | 理由 |
|---------|------|------|
| `snapshot-trigger-tuning`（阈值调优） | **砍掉** | 重造原生阈值判断；原生 auto-condense 已覆盖触发 |
| `snapshot-trigger-tuning` 中的"分级压缩"子项 | **砍掉** | 重造原生 `getNextTruncationRange` 截断策略 |
| `snapshot-trigger-tuning` 中的"长 tool_result 文件化"子项 | **暂缓评估** | 这是 Cursor 的方案，cline 原生是否有等价能力需先核查 |
| `schema-v2-snapshot-e2e`（真实长对话实测） | **重新定位** | 原目标"frontmatter 显式化 + confidence 计算固化进 plugin"——保留语义层目标，但删去"长对话触发原生 compact"的实测依赖（codec bug 阻塞的只是原生 compact 路径，与 plugin 语义抽取无关） |

### 3.3 替代形态：薄适配层（用 hook，不碰 compaction.ts）

按 GPT 提议：在 condense 时机用 hook 抽 semantic object 写 handoff.md，**完全不碰 compaction.ts**。

```
原生 auto-condense 触发
        ↓
plugin hook（beforeModel / condense 事件）
        ↓
从 messages 抽 semantic object（decisions/changes/todos/sources）
        ↓
写 handoff.md（结构化 schema V2 §1.5 六字段）
```

**与当前 `snapshot-trigger-tuning` 方向的根本区别**：
- trigger-tuning 方向：调 `COMPACT_AT_RATIO` / 改 `shouldCompact` 内部逻辑
- 薄适配层方向：完全不调 compaction.ts，只 hook 事件

### 3.4 清理动作（独立于 trigger-tuning）

| 清理项 | 文件 | 优先级 |
|--------|------|--------|
| 删 `buildCompactionSummary` 死代码 | [compaction.ts:109-143](../../../context-snapshot/src/compaction.ts#L109-L143) | 🟡 中 |
| `shouldCompact` 简化为只观察（删 token 估算逻辑） | [compaction.ts](../../../context-snapshot/src/compaction.ts) | 🟡 中（依赖 §4 问题 1 回答后推进） |
| `COMPACT_AT_RATIO` / `MAX_INPUT_TOKENS` 常量删除 | [compaction.ts:6-8](../../../context-snapshot/src/compaction.ts#L6-L8) | 🟢 低（依赖 §4 问题 1 回答后推进） |

---

## §4 Open Questions（待回答才能最终落地的事实前提）

### 4.1 问题 1（B 分支最终砍/缩/转的依据）

> **cline 原生 condense 到底丢了什么 handoff 需要的语义？**

**回答路径**：
1. 实测一次 cline 原生 condense（构造短对话 + `MAX_INPUT_TOKENS=1000` 触发，看 condense 后的 summary 内容形态）
2. 对比 handoff.md schema V2 §1.5 六字段（id / kind / exitWhen / dependsOn / blockerRef）+ 五类对象（Decision/Change/Todo/Source/Meta）
3. 找具体丢失点

**判定标准**：
- 答不出具体丢失点 → B 分支整条砍掉（包括所有清理动作完成）
- 答出具体丢失点 → 做 §3.3 薄适配层（只 hook 抽语义，不调阈值）

### 4.2 问题 2（薄适配层的插入点选择）

> cline 在 condense 时机暴露了哪些 hook？`beforeModel` / condense 事件 / messageBuilder 哪个是正确插入点？

**回答路径**：读 cline SDK 文档 + plugin API 类型定义（`@cline/sdk` / `@cline/core`），确认可用的 hook 列表。

---

## §5 Consequences

### 5.1 正面

- **恢复 ADR-005 拆分原则**：snapshot 不再与 compact 耦合
- **工作量塌缩**：`snapshot-trigger-tuning` 从"中-大"直接归零（若问题 1 答不出丢失点）或缩为"一个 hook 脚本"（若答出丢失点）
- **元规则约束**：后续任何决策都需先过"原生是否已有"自检
- **handoff-schema 子项目收口**：分支 A 已完成（schema V2 + 六字段 + Assertion 模型 1-5 步），分支 B 砍掉后真正进入交接期

### 5.2 负面

- `schema-v2-snapshot-align` 决策需标"实现方式违反 ADR-005，但 schema V2 §1.5 数据模型对齐本身有效"——区分**数据模型**（保留）与**触发实现**（违反）
- 之前的 `snapshot-trigger-analysis` 决策（Likely）部分失效——"调阈值"前提被推翻
- 需要补做 §4 实测才能完成 B 分支最终裁决

### 5.3 待办项调整（handoff.md 同步）

- `snapshot-trigger-tuning`：从未完成项表移除（被本 ADR 砍掉）
- `schema-v2-snapshot-e2e`：重新定位说明（保留语义层目标，删去"长对话触发原生 compact"依赖）
- 新增 `native-condense-semantic-audit`：§4 问题 1 的实测任务（🟡 中优先级，不依赖 PR）
- 新增 `buildCompactionSummary-cleanup`：死代码清理（🟢 低优先级，可与 §4 实测合并推进）

---

## §6 Supersession 关系

### 6.1 不 Supersede ADR-001

ADR-001 方向 A（复用 Cline Compact）+ B'（自动分级 Handoff）+ D'（可版本化索引层）**与本 ADR 完全一致**——本 ADR 是 ADR-001 原则的重申与升级。

### 6.2 部分 Supersede ADR-005

**保留**：ADR-005 的拆分原则（Compaction = Cline / Handoff = Plugin）。

**Supersede**：ADR-005 §对现有代码的影响 中默认的"compact-observer 自己调 `shouldCompact` 判断"实现路径——改为"hook 原生 condense 事件，不做自研 token 判断"。

### 6.3 与 schema-semantic-object-model.md 的关系

不冲突。本 ADR 是工程实现层原则，schema V2 §1.5 六字段是数据模型层定义——数据模型对齐本身有效（schema-v2-snapshot-align 的数据模型部分保留），但触发实现需重构（snapshot-trigger-tuning 砍掉）。

---

## §7 产源说明

本 ADR 基于以下证据链：

1. **一手源码核查**：[context-snapshot/src/index.ts](../../../context-snapshot/src/index.ts) 注释明确"verified CLI 3.0.34"
2. **一手官方文档**：[docs.cline.bot/customization/plugins](https://docs.cline.bot/customization/plugins) "SDK/CLI/Kanban 适用；VSCode/JetBrains 暂不可用"
3. **GPT 二手核查**：cline 原生 `ContextManager` auto-condense + `getNextTruncationRange` 截断策略（未独立读 cline 源码，依赖 GPT 引用 cline.bot 博客 + Medium 文章）
4. **间接推断**：plugin 写 snapshot 行为本身印证原生 condense 存在（若原生无 condense，snapshot 写入无意义）
5. **历史 ADR 证据**：ADR-001 (2026-06-23) 已记录"自研 Compact `compaction_count = 0` 从未触发" + "Cline 原生已具备自动上下文压缩能力"

**证据强度标注**：1/2/5 为一手强证据，3/4 为二手/间接证据。问题 1 的实测回答将提升 3/4 至一手强度。

---

## §8 实施顺序

```
ADR-006 (Accepted)
        ↓
回答 §4 问题 1（实测 cline 原生 condense 产物形态）
        ↓
        ├─ 答不出丢失点 → B 分支整条砍掉 + 清理死代码
        └─ 答出丢失点 → §3.3 薄适配层（用 hook，不碰 compaction.ts）
        ↓
handoff.md 同步未完成项调整（§5.3）
        ↓
handoff-schema 子项目正式收口（分支 A 已完成）
```
