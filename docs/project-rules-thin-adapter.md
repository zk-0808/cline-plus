# Project Rules — thin-adapter-layer（功能专属开发期约束）

> **生命周期**：功能绑定 — thin-adapter-layer 实现（ADR-006 §3.3），薄适配层验收通过后归档（跨功能通用规则迁入 dev-rules.md）。
>
> **范围**：仅在 thin-adapter-layer 功能开发期间生效。功能稳定后此文件可整体删除。
>
> **命名约定**：功能专属的开发期防漂移规则统一命名为 `project-rules-<功能短名>.md`，各功能各持一份，开发期间**只在本功能对应的这份文件里增删规则**。跨功能通用规则一律不进本文件，统一沉淀到 [`dev-rules.md`](dev-rules.md)（永久保留）。
>
> **加载方式**：本文件不依赖任何特定 IDE 的规则自动注入机制。新会话开始时由用户在第一句话提醒模型阅读本文件一次即可。
>
> **原则**：只写防漂移的最小约束，不写"必读必写"硬规则。本文件本身就是 C 类（治理思考方式）的半机制化辅助。
>
> **与 [`dev-rules.md`](dev-rules.md) 的分工**：本文件只收录**绑定 thin-adapter-layer 功能**（context-snapshot plugin 触发机制改造）的防漂移约束。跨功能通用的执行边界、handoff 通用触发器、状态值约定已沉淀至 `dev-rules.md`（永久保留），本文件不重复。

---

## §4 门控声明（启动时已确认）

| 维度 | 答案 |
|------|------|
| **载体** | [context-snapshot](../context-snapshot/) plugin 代码（src/index.ts + src/compaction.ts）+ [thin-adapter-layer-design.md](decisions/thin-adapter-layer-design.md) 设计文档 |
| **范围** | context-snapshot plugin 触发机制改造——从自研 `shouldCompact`（token 阈值判断）改为 `beforeModel` hook 检测原生 condense 发生；阶段 1 死代码清理；阶段 2 beforeModel 实现 |
| **排除** | 写 handoff.md（审批结果：仍写 snapshot 文件）/ 补 Verification/Blocker/Handoff 三类 extractor（审批结果：仍是 4 类）/ 产物格式改为 schema V2 六字段表格（审批结果：仍是 5 段 Markdown）|
| **成功标准** | ① 元原则合规（无自研 token 估算 / 无自研阈值判断 / 无自研 compaction 触发逻辑）② beforeModel hook 正确检测原生 condense 发生 ③ snapshot 写入复用现有 extractors + snapshot-writer ④ codec bug 规避（所有 messages 用 ContentBlock[] 格式）⑤ 死代码清理完成（buildCompactionSummary / shouldCompact token 估算逻辑已删）|

**决策依据**：[thin-adapter-layer-design.md §10 审批结果](decisions/thin-adapter-layer-design.md) — 方案 E beforeModel + 两阶段重构 context-snapshot + 仍写 snapshot 文件。

---

## 防漂移约束

只在下列触发时机做对应动作，没触发不要主动改。本约束为本功能专属；通用约束（handoff 触发器 a/b/c / git 序列化 / 执行主体边界 / 状态值约定）见 [`dev-rules.md`](dev-rules.md)。

### 1. 触发机制改造（自研 → 原生 hook）

**规则**：context-snapshot plugin 的 compact-observer messageBuilder 不得再调用 `shouldCompact()` 的 token 阈值判断逻辑。触发检测改为 `beforeModel` hook（方案 E）。

**允许的 messageBuilder 用途**：仅保留 loop-guard-injector（[index.ts:85-103](../context-snapshot/src/index.ts#L85-L103)）等不依赖 condense 触发的功能。compact-observer 的触发职责迁移到 beforeModel hook。

**元原则自检**（按 [ADR-006 §0](decisions/adr/ADR-006-native-mechanism-first-principle.md)）：
- ✅ beforeModel hook 是 cline 原生能力，不重造轮子
- ❌ shouldCompact 的 `MAX_INPUT_TOKENS × COMPACT_AT_RATIO` 判断是重造原生触发逻辑，必须删除

### 2. 范围收窄边界（审批结果 §10.1）

**规则**：薄适配层**只改触发机制**，不改以下维度：

| 维度 | 当前状态 | 薄适配层保持不变 |
|------|---------|----------------|
| 产物存储 | `getSnapshotDir()` 下 snapshot 文件 | ✅ 不改 |
| 产物格式 | 5 段式 Markdown（Header/Decisions/Changes/Todos/Sources）| ✅ 不改 |
| semantic object | 4 类（Decision/Change/Todo/Source）| ✅ 不补 5 类 |
| extractors | 现有 4 个（decision/change/todo/source）| ✅ 不新增 |

**违反时**：若实现过程中出现"顺便补五类对象"或"顺便改产物格式"的冲动，回到本约束重新审视——这些是 handoff-schema 子项目已收口的事项，不属于薄适配层范围。

### 3. 死代码清理（阶段 1）

**规则**：阶段 1 必须完成以下清理，独立于阶段 2 实现：

| 清理项 | 文件位置 | 必要性 |
|--------|---------|--------|
| 删 `buildCompactionSummary` 死代码 | [compaction.ts:109-143](../context-snapshot/src/compaction.ts#L109-L143) | 计算了 `result.messages` 但 index.ts:77 `return messages` 未使用 |
| 删 `COMPACT_AT_RATIO` / `MAX_INPUT_TOKENS` 常量 | [compaction.ts:6-8](../context-snapshot/src/compaction.ts#L6-L8) | 重造原生常量（与 custom-compaction 完全相同）|
| 简化 `shouldCompact` 为只观察或删除 | [compaction.ts:145-166](../context-snapshot/src/compaction.ts#L145-L166) | 重造原生触发判断 |
| 删 `estimateTokens` 自研函数 | [compaction.ts:19-21](../context-snapshot/src/compaction.ts#L19-L21) | 重造原生 token 计数 |

**顺序约束**：阶段 1 清理完成后才能开始阶段 2 实现——避免在死代码上叠加新逻辑。

### 4. beforeModel 时序假设验证（阶段 2 前置）

**规则**：阶段 2 实现前，必须验证 [thin-adapter-layer-design.md §4.4](decisions/thin-adapter-layer-design.md) 的待验证假设：

| 假设 | 验证方式 | 失败时 fallback |
|------|---------|----------------|
| beforeModel 在原生 compaction 后触发 | 读 @cline/core 源码 或 实测 | 退回方案 B+A（messageBuilder + metadata.kind 检测 + 长度突变 fallback）|
| beforeModel 返回 ContentBlock[] 格式 messages 不触发 codec bug | 实测 | 已有 index.ts:97-101 规避模式，风险低 |

**阴性结论门控**（按 [dev-rules.md §1.3](dev-rules.md)）：若 beforeModel 时序假设验证失败，不得强行实现——需先确认 fallback 方案（B+A）并更新设计文档。

### 5. codec bug 规避（持续约束）

**规则**：所有 messageBuilder / hook 返回的 messages 必须用 `ContentBlock[]` 格式，禁止 string content。

**依据**：[investigation-note-cli-codec-content-map-bug.md O8](decisions/investigation/investigation-note-cli-codec-content-map-bug.md) — codec `Nd` 函数调 `n.content.map`，string content 无 `.map()` 会崩。

**已验证模式**（[index.ts:97-101](../context-snapshot/src/index.ts#L97-L101)）：
```typescript
const warningMsg: Message = {
    role: "user",
    content: [{ type: "text", text: warningText }],  // ContentBlock[] not string
};
```

### 6. 不做的事

- **不做** 写 `docs/handoff.md`（本项目交接文档，人 + AI 协作维护，plugin 自动覆写会破坏人工内容；审批结果：仍写 snapshot 文件——cline 产物，存储于 `getSnapshotDir()` 下）
- **不做** 补 Verification/Blocker/Handoff 三类 extractor（审批结果：仍是 4 类）
- **不做** 产物格式改为 schema V2 六字段表格（审批结果：仍是 5 段 Markdown）
- **不做** 自研 token 估算 / 阈值判断 / compaction 触发逻辑（违反 ADR-006 §0 元原则）
- **不做** 长对话实测（受 §1.15 codec bug 阻塞，等 PR #12032 合并）——阶段 2 实现用短对话验证 beforeModel 时序即可

---

## 状态值约定

复用 [`dev-rules.md §3`](dev-rules.md)。本功能涉及的状态枚举：
- confidence：`Verified` / `Likely` / `Hypothesis`（对齐 `evidence-governance.md §4`）
- 阶段状态：`阶段 1 清理` / `阶段 2 实现` / `阶段 3 验证`

---

## 本功能不引入新规则到 dev-rules.md

按 [`dev-rules.md` L518 维护节奏](dev-rules.md)，本功能开发期间 dev-rules.md 已解冻（handoff-schema 收口后），但本功能新规则仍先沉淀在本文件，待 thin-adapter-layer 功能整体结束、进入交接期时才评估迁入。

**预期迁入项**（待 thin-adapter-layer 功能整体结束、进入交接期时评估）：
- 无。薄适配层是工程实现层改造，不是行为规则。若 beforeModel hook 触发检测模式被验证为跨功能通用，才考虑迁入 dev-rules。
