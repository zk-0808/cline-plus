# Thin Adapter Layer Design（薄适配层设计）

- **Status**: Approved（§9 决策点已审批，§10 记录审批结果）
- **Date**: 2026-07-03
- **Related**: [ADR-006 §3.3](adr/ADR-006-native-mechanism-first-principle.md)、[investigation-note-cli-plugin-marketplace-audit.md](investigation/investigation-note-cli-plugin-marketplace-audit.md)、[investigation-note-native-condense-synthesis.md](investigation/investigation-note-native-condense-synthesis.md)
- **Evidence as of**: 2026-07-03
- **Expires if unchanged**: 2026-08-03（30 天后复查）

---

## §1 目标

按 ADR-006 §3.3：在原生 condense 时机用 hook 抽 semantic object 写 handoff.md，**完全不碰 compaction.ts 的触发逻辑**。

```
原生 auto-condense 触发
        ↓
plugin hook（插入点待定）
        ↓
从 messages 抽 semantic object（decisions/changes/todos/sources）
        ↓
写 handoff.md（结构化 schema V2 §1.5 六字段）
```

**与当前 context-snapshot 的根本区别**：
- 当前：自研 `shouldCompact` 触发 + 写 snapshot 文件（违反 ADR-005/006）
- 薄适配层：原生 condense 触发后 hook + 写 handoff.md（符合 ADR-006 §0 元原则）

---

## §2 现状审计（context-snapshot 当前实现）

基于 [index.ts](../../context-snapshot/src/index.ts) + [compaction.ts](../../context-snapshot/src/compaction.ts) + [snapshot-writer.ts](../../context-snapshot/src/snapshot-writer.ts) 一手源码核查。

### 2.1 当前实现架构

```
messageBuilder "compact-observer" (index.ts:58-79)
        ↓
shouldCompact(messages) (compaction.ts:145-166)  ← 自研触发逻辑
        ↓
writeSnapshot(messages, tools, files, workspacePath)  ← 写 snapshot 文件
        ↓
extractSnapshotData → renderSnapshot → writeFileSync  ← schema V2 六字段已对齐
```

### 2.2 违反 ADR-006 §0 元原则的点

| 违反点 | 代码位置 | 性质 | ADR-006 §3.4 清理动作 |
|--------|---------|------|---------------------|
| 自研 `MAX_INPUT_TOKENS=120_000` / `COMPACT_AT_RATIO=0.75` | [compaction.ts:6-8](../../context-snapshot/src/compaction.ts#L6-L8) | 重造原生常量（与 custom-compaction 完全相同）| 🟢 低优先级删除 |
| 自研 `estimateTokens` | [compaction.ts:19-21](../../context-snapshot/src/compaction.ts#L19-L21) | 重造原生 token 计数（@cline/shared 有问题但仍是自研）| 🟡 中优先级 |
| `shouldCompact` 函数 | [compaction.ts:145-166](../../context-snapshot/src/compaction.ts#L145-L166) | 重造原生触发判断 | 🟡 中优先级简化为只观察 |
| `buildCompactionSummary` 死代码 | [compaction.ts:109-143](../../context-snapshot/src/compaction.ts#L109-L143) | 计算了 `result.messages` 但 index.ts:77 `return messages` 未使用 | 🟡 中优先级删除 |
| snapshot 写入绑定自研 compact 触发 | [index.ts:60-79](../../context-snapshot/src/index.ts#L60-L79) | 违反 ADR-005 拆分原则 | 🟡 中优先级重构 |

### 2.3 可复用的现有资产

| 资产 | 代码位置 | 复用价值 |
|------|---------|---------|
| `extractSnapshotData` | [snapshot-writer.ts:41-59](../../context-snapshot/src/snapshot-writer.ts#L41-L59) | ✅ 直接复用——已调 4 个 extractors |
| 4 个 extractors（decision/change/todo/source）| [extractors/](../../context-snapshot/src/extractors/) | ✅ 直接复用——schema V2 §1.5 六字段已对齐 |
| `renderSnapshot` | [snapshot-writer.ts:185-193](../../context-snapshot/src/snapshot-writer.ts#L185-L193) | ⚠️ 部分复用——渲染逻辑可复用，但输出目标需从 snapshot 文件改为 handoff.md |
| `TodoRecord` 类型 | [types.ts:58-66](../../context-snapshot/src/types.ts#L58-L66) | ✅ 直接复用——schema V2 六字段全覆盖 |
| `collectToolNames` / `collectTouchedFiles` | [compaction.ts:82-107](../../context-snapshot/src/compaction.ts#L82-L107) | ✅ 直接复用——与 custom-compaction 同源 |

---

## §3 设计约束

### 3.1 messageBuilder 签名约束

**双源确认**（满足 [dev-rules.md §1.6](../dev-rules.md) 双来源门槛）：
1. [custom-compaction 源码](https://raw.githubusercontent.com/cline/plugins/main/plugins/custom-compaction/index.ts)：`build(messages: Message[])`
2. [context-snapshot index.ts:60](../../context-snapshot/src/index.ts#L60)：`build(messages: Message[])`

**约束**：messageBuilder 的 `build` 只接收 `messages`，**无 context 参数**——无法直接获取"原生 condense 已发生"的标志。

### 3.2 messageBuilder 执行时机约束

**关键约束**（来自 [custom-compaction 源码注释](https://raw.githubusercontent.com/cline/plugins/main/plugins/custom-compaction/index.ts)）：

> "Core still runs its built-in API-safety message builder after plugin builders, so provider-safe normalization and hard truncation remain the final pass."

**解读**：plugin messageBuilder 在 core compaction **之前**执行。messageBuilder 拿到的 `messages` 是 compaction 前的完整历史，**无法直接观察原生 condense 后的产物**。

**影响**：
- messageBuilder 不能"检测原生 condense 已发生"（因为 condense 还没发生）
- messageBuilder 只能"预测原生 condense 即将发生"（用 token 估算——但这违反 ADR-006 §0 元原则）
- 要观察原生 condense 后的产物，需要 **post-compaction hook**（如 beforeModel）

### 3.3 beforeModel hook 的 codec bug 风险

来自 [investigation-note-cli-codec-content-map-bug.md O8](investigation/investigation-note-cli-codec-content-map-bug.md)：

- `beforeModel` hook 在 compaction 后触发（时机正确）
- 但返回修改的 messages 会触发 codec bug（`Nd` 函数调 `n.content.map`，string content 无 `.map()`）
- **缓解**：用 `ContentBlock[]` 格式而非 string（[index.ts:97-101](../../context-snapshot/src/index.ts#L97-L101) 已用此模式）

**当前 context-snapshot 已验证的规避模式**：
```typescript
// index.ts:97-101 — ContentBlock[] 格式规避 codec bug
const warningMsg: Message = {
    role: "user",
    content: [{ type: "text", text: warningText }],  // ContentBlock[] not string
};
```

### 3.4 schema V2 六字段约束

来自 [types.ts:58-66](../../context-snapshot/src/types.ts#L58-L66) + [schema-semantic-object-model.md](schema-semantic-object-model.md)：

薄适配层产物必须覆盖六字段：`id` / `kind` / `exit_when` / `confidence` / `depends_on` / `blocker_ref` + 五类对象（Decision/Change/Verification/Blocker/Handoff）。

当前 `TodoRecord` 已对齐六字段，但缺少 `Verification` / `Blocker` / `Handoff` 三类对象的 extractor（当前只有 Decision/Change/Todo/Source 四类）。

---

## §4 触发机制设计方案对比

### 4.1 核心难题

messageBuilder 在原生 condense **之前**执行（§3.2），无法直接检测 condense 发生。需要间接检测方案。

### 4.2 方案对比

| 方案 | 机制 | 优点 | 缺点 | 元原则合规 |
|------|------|------|------|-----------|
| **A. messages 长度突变检测** | module-level state 保存上次 `messages.length`；当前 < 上次 × 0.5 → 判定 condense 发生 | 简单；不依赖 metadata | 误判风险（用户删消息）；无法定位 compaction 边界 | ✅ 不重造触发逻辑 |
| **B. metadata.kind 检测** | 遍历 messages 找 `metadata.kind === "compaction_summary"` | 精确；无误判 | basic 模式无此标记；metadata 字段存在性未实测（A/B/C 源码分析，未实测） | ✅ 不重造触发逻辑 |
| **C. summary 文本特征检测** | 遍历 messages 找含 "Context summary:" 前缀的 user 消息 | 不依赖 metadata | 脆弱（前缀可能变）；误判 | ✅ 不重造触发逻辑 |
| **D. 每次 model request 都抽 + 增量更新** | 不检测 condense，每次都抽 semantic object 写 handoff.md | 最简单；无需触发检测 | 频繁 IO；handoff.md 频繁覆写；对话中途抽取可能不完整 | ⚠️ 灰色地带（不重造触发，但行为越界）|
| **E. beforeModel hook** | 用 beforeModel 在 compaction 后触发 | 时机正确；可观察 compaction 后产物 | codec bug 风险（可用 ContentBlock[] 规避）；需验证 beforeModel 在 compaction 后触发的时序 | ✅ 不重造触发逻辑 |
| **F. 自研 token 阈值（当前实现）** | `shouldCompact` 用 `MAX_INPUT_TOKENS × COMPACT_AT_RATIO` 判断 | 已实现 | **重造原生轮子**（违反 ADR-006 §0）| ❌ 违反元原则 |

### 4.3 方案推荐（待用户审批）

**首选：方案 E（beforeModel hook）+ ContentBlock[] 规避 codec bug**

理由：
1. 时机正确——beforeModel 在 compaction 后触发，可观察 compaction 后产物
2. 不重造触发逻辑——符合 ADR-006 §0 元原则
3. codec bug 已有规避模式——context-snapshot index.ts:97-101 已验证 ContentBlock[] 格式可行
4. 与 A/B/C 综合报告推荐一致（[investigation-note-native-condense-c-hooks.md](investigation/investigation-note-native-condense-c-hooks.md)）

**备选：方案 B（metadata.kind 检测）+ 方案 A（长度突变 fallback）**

理由：
1. 若 beforeModel 时序验证失败（compaction 后不触发 beforeModel），退回 messageBuilder
2. 方案 B 精确但需实测 metadata 字段存在性
3. 方案 A 作为无 metadata 时的 fallback

**否决：方案 F（自研 token 阈值）**——违反 ADR-006 §0 元原则，是当前实现的问题所在。

### 4.4 待验证假设

按 [dev-rules.md §1.3](../dev-rules.md) 阴性结论门控，方案 E 依赖以下未验证假设：

| 假设 | 验证方式 | 风险 |
|------|---------|------|
| beforeModel 在原生 compaction 后触发 | 读 @cline/core 源码 或 实测 | 若不触发，退回方案 B+A |
| beforeModel 返回 ContentBlock[] 格式 messages 不触发 codec bug | 实测 | 已有 index.ts:97-101 规避模式，风险低 |
| 原生 agentic 摘要含 `metadata.kind="compaction_summary"` | 实测（需 Anthropic provider）| A/B/C 源码分析结论，未实测 |

---

## §5 形态选择对比（待用户审批）

### 5.1 方案对比

| 形态 | 优点 | 缺点 | 门控冲突 |
|------|------|------|---------|
| **修改 context-snapshot** | 复用现有 extractors + snapshot-writer；不新增 plugin | 与 handoff-schema §5"不做 plugin 代码推进"门控冲突（但 thin-adapter 不属于 handoff-schema 子项目）| ⚠️ 需确认门控范围 |
| **新建独立 plugin** | 清晰分离；不污染 context-snapshot | 需处理 plugin 间依赖（如何复用 context-snapshot 的 extractors）| ✅ 无门控冲突 |
| **重构 context-snapshot 为两阶段** | 阶段 1 清理死代码 + 简化 shouldCompact；阶段 2 实现薄适配层 | 工作量分阶段，降低风险 | ⚠️ 同修改 context-snapshot |

### 5.2 门控范围分析

[handoff-schema/project-rules.md §4](../handoff-schema/project-rules.md) 门控：
- **范围**：handoff schema 定义 + frontmatter 扩展；**不涉及 plugin 代码**
- **排除**：mechanism-candidates #5/#6 plugin 代码推进

**解读**：handoff-schema 子项目门控只约束 handoff-schema 功能开发期间不做 plugin 代码。thin-adapter-layer 是 ADR-006 §3.3 的实现，**不属于 handoff-schema 子项目**——门控不适用。

但需用户确认此解读。

---

## §6 实现策略（待形态选择后细化）

### 6.1 阶段化推进（推荐）

**阶段 1：清理（独立于薄适配层）**
- 删 `buildCompactionSummary` 死代码（[compaction.ts:109-143](../../context-snapshot/src/compaction.ts#L109-L143)）
- 删 `COMPACT_AT_RATIO` / `MAX_INPUT_TOKENS` 常量（[compaction.ts:6-8](../../context-snapshot/src/compaction.ts#L6-L8)）
- 简化 `shouldCompact` 为只观察（删 token 估算逻辑）

**阶段 2：薄适配层实现**
- 选定触发机制（方案 E 或 B+A）
- 实现 hook + semantic object 抽取 + handoff.md 写入
- 复用现有 extractors + renderSnapshot

**阶段 3：验证**
- 真实长对话实测（需 PR #12032 合并以解除 codec bug 阻塞）
- schema V2 六字段覆盖率验证

### 6.2 输出目标转变

| 维度 | 当前 | 薄适配层 |
|------|------|---------|
| 触发 | 自研 `shouldCompact` | 原生 condense 后 hook |
| 产物存储 | `getSnapshotDir()` 下 snapshot 文件 | `docs/handoff.md`（每次覆写）|
| 产物格式 | 5 段式 Markdown（Header/Decisions/Changes/Todos/Sources）| schema V2 六字段表格（对齐 handoff.md 现有格式）|
| semantic object | 4 类（Decision/Change/Todo/Source）| 5 类（+ Verification/Blocker/Handoff——待新增 extractors）|

---

## §7 验收标准

1. **元原则合规**：无自研 token 估算 / 无自研阈值判断 / 无自研 compaction 触发逻辑
2. **schema V2 六字段覆盖**：产物含 id/kind/exit_when/confidence/depends_on/blocker_ref
3. **五类对象覆盖**：Decision/Change/Verification/Blocker/Handoff（当前缺后三类）
4. **handoff.md 写入**：产物写入 `docs/handoff.md`（非 snapshot 文件）
5. **codec bug 规避**：所有 messages 用 ContentBlock[] 格式
6. **死代码清理**：`buildCompactionSummary` / `shouldCompact` token 估算逻辑已删

---

## §8 风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| beforeModel 时序假设错误（compaction 后不触发）| 中 | 高 | 退回方案 B+A；需实测验证 |
| metadata.kind 字段不存在（A/B/C 源码分析有误）| 中 | 中 | 方案 A 长度突变 fallback |
| codec bug 在 beforeModel 路径复发 | 低 | 高 | ContentBlock[] 格式规避（已验证模式）|
| snapshot 文件被频繁覆写导致历史丢失 | 中 | 中 | 当前实现每次 condense 覆写（与原 compact-observer 行为一致）；历史归档可作为延伸项 |
| Verification/Blocker/Handoff 三类 extractor 缺失 | 高 | 中 | 阶段 2 可先复用现有 4 类，三类新增作为延伸项 |

> **概念澄清**：本项目中"snapshot 文件"与"`docs/handoff.md`"是两个不同概念——
> - **snapshot 文件**：cline 产物（plugin 自动生成），存储于 `getSnapshotDir()` 下，5 段式 Markdown，4 类对象，机器生成机器消费
> - **`docs/handoff.md`**：本项目交接文档（人 + AI 协作维护），schema V2 五类对象，会话级覆写，人可读可改
>
> 薄适配层审批结果（§10）只写 snapshot 文件，**不写** `docs/handoff.md`——后者由人 + AI 协作维护，plugin 自动覆写会破坏人工内容。

---

## §9 待用户审批的决策点

1. **触发机制**：方案 E（beforeModel）首选 / 方案 B+A（messageBuilder+metadata）备选 / 其他？
2. **形态选择**：修改 context-snapshot / 新建独立 plugin / 重构 context-snapshot 为两阶段？
3. **门控范围**：thin-adapter-layer 不属于 handoff-schema 子项目，门控不适用——确认？
4. **阶段化推进**：阶段 1 清理先做 / 阶段 1+2 合并 / 其他？
5. **输出目标**：写 `docs/handoff.md`（本项目交接文档，覆写）/ 写 `docs/handoff.md`（追加）/ 仍写 snapshot 文件（cline 产物）+ 链接到 handoff.md？
6. **五类对象**：阶段 2 先复用现有 4 类 / 必须补齐 5 类？

---

## §10 审批结果（2026-07-03）

| 决策点 | 用户审批 | 影响 |
|--------|---------|------|
| **触发机制** | ✅ 方案 E（beforeModel hook）| 首选方案确定；需实测验证 beforeModel 在 compaction 后触发的时序；codec bug 用 ContentBlock[] 规避 |
| **形态选择** | ✅ 重构 context-snapshot 两阶段 | 阶段 1 清理 + 阶段 2 薄适配层；复用现有 extractors + snapshot-writer |
| **门控范围** | ⚠️ **门控适用**（与设计文档 §5.2 "不适用"解读相反）| **thin-adapter-layer 被 [handoff-schema/project-rules.md §5](../handoff-schema/project-rules.md) "不做 plugin 代码推进"门控阻塞**——需先解除 handoff-schema 子项目或等其收口 |
| **输出目标** | ✅ 仍写 snapshot 文件（cline 产物） | 薄适配层**不写 `docs/handoff.md`（本项目交接文档）**；只改触发机制（自研 shouldCompact → beforeModel 检测原生 condense）；产物仍是 `getSnapshotDir()` 下 snapshot 文件（5 段式 Markdown，4 类对象，机器生成）；`docs/handoff.md` 继续由人 + AI 协作维护 |

### 10.1 范围收窄

基于审批结果，薄适配层范围收窄：

| 维度 | 原设计 | 审批后 |
|------|--------|--------|
| 触发机制 | 自研 shouldCompact → 原生 condense 后 hook | ✅ 保留（方案 E beforeModel）|
| 产物存储 | snapshot 文件 → handoff.md | ❌ **撤回**——仍写 snapshot 文件 |
| 产物格式 | 5 段 Markdown → schema V2 六字段表格 | ❌ **撤回**——仍是 5 段 Markdown |
| 五类对象 | 4 类 → 5 类（+ Verification/Blocker/Handoff）| ❌ **撤回**——仍是 4 类 |
| 死代码清理 | buildCompactionSummary + shouldCompact 简化 | ✅ 保留（阶段 1）|

**薄适配层的实际工作**：只改触发机制——从自研 `shouldCompact`（token 阈值判断）改为 `beforeModel` hook 检测原生 condense 发生，其余复用现有实现。

### 10.2 门控阻塞

thin-adapter-layer 被 handoff-schema §5 门控阻塞。解除路径：

1. **handoff-schema 子项目收口**：project-rules.md §4 成功标准已满足（schema V2 + 无损映射 + 验收查询），剩余项（`assertion-semantic-model` 第 6 步暂缓 + `handoff-schema-v2-kind-exit` 可选）不阻塞收口
2. **project-rules.md 归档**：收口后 project-rules.md 整体删除，门控自动解除
3. **dev-rules 解冻**：按 dev-rules L518，子项目结束后评估迁入项（project-rules.md §"预期迁入项"为空，无迁入）

### 10.3 修正 handoff.md 之前的不一致记录

handoff.md 之前记录"薄适配层插入点修正：beforeModel → messageBuilder"（决策 `thin-adapter-insert-point-fix`）与 custom-compaction 源码注释"Core still runs its built-in API-safety message builder after plugin builders"矛盾——messageBuilder 在原生 condense **之前**执行，无法观察 condense 后产物。

**修正**：插入点应为 `beforeModel` hook（方案 E），不是 messageBuilder。决策 `thin-adapter-insert-point-fix` superseded by 本设计文档 §10 审批结果。
