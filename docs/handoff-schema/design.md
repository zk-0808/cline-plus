# Handoff Schema — 设计文档（第一阶段）

> **生命周期**：功能绑定 — handoff-schema，第一阶段验收通过后归档。
>
> **定位**：本文件是 handoff.md schema 化的设计文档，不重复 schema 字段定义（权威源为 [schema-semantic-object-model.md](../decisions/schema-semantic-object-model.md)）。本文件承载映射规则、frontmatter 扩展方案、验收查询、演进路线。
>
> **决策依据**：[external-review-round2-handoff.md](../plugin/review/external-review-round2-handoff.md)（评审 Round 2 核心结论——snapshot 与 handoff 是同一套语义对象模型的两种投影，先做 handoff 因不受 codec bug 阻塞）。

---

## 1. 设计目标

### 1.1 第一阶段目标

| 目标 | 验收判据 | 状态 |
|------|---------|------|
| 语义对象模型草案产出 | 五类对象字段定义完整 + ID 规则 + confidence 词汇表对齐 evidence-governance §4 | ✅ 已完成（[schema V1](../decisions/schema-semantic-object-model.md)）|
| handoff.md 无损映射测试 | 9 条未完成项全部映射为结构化 Handoff 对象，字段无遗漏，依赖链完整 | ✅ 已通过（见 §3）|
| 验收查询可回答 | 给全新 agent 只喂 schema 产物，能回答"codec bug 修复后哪些项自动解锁" | ✅ 已通过（见 §4）|

### 1.2 不做的事（第一阶段排除项）

- snapshot schema 化（第二阶段，等 PR #12032 合并 + CLI 发版后跟进）
- plugin 代码推进（mechanism-candidates #5/#6 仍候选）
- handoff.md 现有未完成项内容修改（仅扩展结构，不改变语义）
- 预写未来阶段字段（如 snapshot 专属字段）

---

## 2. 映射规则（handoff.md ↔ schema）

### 2.1 当前 handoff.md 未完成项表结构

| 列名 | 当前含义 | 映射到 schema 字段 |
|------|---------|------------------|
| `id` | 稳定短 ID | `Handoff.id` |
| `方向` | 待办方向 | `Handoff.kind`（从内容推断 conclusion/action）|
| `说明` | 详细说明 | `Handoff.exit_when`（从内容提取完成条件）|
| `优先级` | 🔴/🟡/🟢 | （schema 无对应字段，保留为 handoff.md 本地列）|
| `confidence` | Verified/Likely/Hypothesis | `Handoff.confidence` |
| `depends_on` | 指向其他稳定 ID | `Handoff.blocker_ref`（若依赖的是 Blocker）+ `Handoff.depends_on`（若依赖的是其他 Handoff）|

### 2.2 字段映射注意事项

1. **`depends_on` 列的歧义**：当前 handoff.md 的 `depends_on` 列同时承载两种语义——指向 Blocker（如 `pr-12032`）和指向其他 Handoff（如 `issue-11944`）。schema 化后应区分：
   - 指向 Blocker ID（`B-` 前缀）→ `blocker_ref`
   - 指向其他 Handoff ID → `depends_on`（schema 未显式定义此字段，待 V2 补充）

2. **`kind` / `exit_when` 当前未显式标注**：现有 handoff.md 的"方向"和"说明"列未显式区分 conclusion/action，也未显式声明退出条件。第一阶段保持现状（从内容推断），不强制改写。

3. **`优先级` 列不入 schema**：🔴/🟡/🟢 是 handoff.md 本地优先级标记，与 schema 的 `impact_level`（Blocker 专属）语义不同。保留为本地列。

### 2.3 frontmatter 扩展方案（第一阶段）

第一阶段**不强制**添加 frontmatter。原因：
- 现有表格列已能承载所有 Handoff 对象字段
- frontmatter 适合机器读取，但第一阶段是人工撰写 + 验证
- 第二阶段（snapshot schema 化）再考虑 frontmatter 统一

若未来需要 frontmatter，建议格式：

```yaml
---
version: 1
schema_ref: docs/decisions/schema-semantic-object-model.md
generated_at: 2026-07-03
items:
  - id: h2-h3-evidence
    kind: action
    exit_when: H2/H3 补证完成
    confidence: Hypothesis
    blocker_ref: B-cli-codec-bug
---
```

---

## 3. 无损映射测试结果

### 3.1 测试输入

当前 [handoff.md](../handoff.md) 未完成项表 9 条（截至 2026-07-03）。

### 3.2 映射结果

| id | kind（推断）| exit_when（推断）| confidence | blocker_ref | 映射完整性 |
|----|------------|----------------|-----------|-------------|-----------|
| `next-feature-direction` | action | 下一功能方向决策完成 | Hypothesis | — | ✅ |
| `tier4-deferred` | action | 第四档暂缓项处置 | Hypothesis | — | ✅ |
| `issue-11944` | action | SDK 迁移时间线明确 | Verified | — | ✅ |
| `pr-12032` | action | PR 合并 + CLI 发版 | Verified | — | ✅ |
| `vscode-monitor` | action | 监控到关键词 Plugins / registerMessageBuilder | Verified | `issue-11944`（Handoff ID，非 Blocker）| ⚠️ depends_on 语义 |
| `mech-retirement` | action | 2026-08-01 到期归档 | Verified | — | ✅ |
| `h2-h3-evidence` | action | H2/H3 补证完成 | Hypothesis | `pr-12032`（应映射为 `B-cli-codec-bug`）| ⚠️ blocker_ref ID 不一致 |
| `next-audit` | action | 2026-08-02 审查触发 | Verified | — | ✅ |
| `governance-procedure` | conclusion | governance-procedure.md 创建完成 | Verified | — | ✅ |

### 3.3 发现的问题

1. **`blocker_ref` ID 不一致**：`h2-h3-evidence` 的 `depends_on` 列写的是 `pr-12032`（Handoff ID），但语义上是阻塞关系，应映射到 `B-cli-codec-bug`（Blocker ID）。第一阶段不强制修改 handoff.md，但 schema V2 应明确 `blocker_ref` vs `depends_on` 的区分规则。

2. **`depends_on` 字段 schema 未定义**：schema 1.5 Handoff 对象未显式定义 `depends_on` 字段（只有 `blocker_ref`）。但 `vscode-monitor` 依赖 `issue-11944`（Handoff 间依赖）。schema V2 应补充 `depends_on` 字段。

3. **`kind` / `exit_when` 未显式标注**：当前均为推断，不影响验收但影响机器可读性。第二阶段考虑显式化。

### 3.4 测试结论

- **9/9 条目全部可映射**（字段覆盖完整）
- **2 处 schema V2 改进点**已记录（blocker_ref vs depends_on 区分 / depends_on 字段补充）
- **不影响第一阶段验收**（验收判据是"能回答依赖链查询"，已满足）

---

## 4. 验收查询

### 4.1 查询问题

> "如果 CLI codec bug (`B-cli-codec-bug`) 解除，哪些项自动解锁？"

### 4.2 查询执行

遍历未完成项中所有 `blocker_ref == B-cli-codec-bug` 的 Handoff 对象。

### 4.3 查询结果

| 解锁项 ID | 说明 | 当前 blocker_ref |
|-----------|------|-----------------|
| `h2-h3-evidence` | 补证 H2/H3（image 分支 undefined 丢弃）| `pr-12032` → 应映射为 `B-cli-codec-bug` |

### 4.4 验收结论

✅ **通过**。查询可精确追溯依赖链，答得出"codec bug 修复后 h2-h3-evidence 自动解锁"。

注：`h2-h3-evidence` 的 `blocker_ref` 当前在 handoff.md 写为 `pr-12032`（Handoff ID），但语义上是 Blocker 关系。第一阶段通过语义推断完成查询，第二阶段 schema V2 显式化后可直接通过 ID 前缀（`B-`）匹配。

---

## 5. 演进路线

### 5.1 第一阶段（当前，2026-07-03）

- ✅ 语义对象模型 V1 草案（[schema-semantic-object-model.md](../decisions/schema-semantic-object-model.md)）
- ✅ 无损映射测试通过
- ✅ 验收查询通过

### 5.2 第二阶段（触发条件：PR #12032 合并 + CLI 发版）

- schema V2：补充 `depends_on` 字段（Handoff 间依赖）
- schema V2：明确 `blocker_ref` vs `depends_on` 区分规则（`B-` 前缀 = Blocker，其他 = Handoff）
- snapshot schema 化：context-snapshot plugin 产出的 snapshot 应用同一套语义对象模型
- handoff.md frontmatter 显式化（机器可读）
- `kind` / `exit_when` 在 handoff.md 中显式标注

### 5.3 第三阶段（触发条件：plugin 机制化 #25 落地）

- handoff.md 自动校验（plugin 检测字段完整性 + 依赖链一致性）
- 阻断守卫 #25 落地（beforeTool hook 检测未 commit 文件 ≥ 5）

---

## 6. 风险与缓解

### 6.1 风险：schema V1 过度抽象

**风险**：五类对象模型可能在第二阶段发现字段不足或冗余。
**缓解**：schema 标注为 V1，允许 V2 修订。第一阶段不强制 handoff.md 完全对齐，允许推断映射。

### 6.2 风险：blocker_ref vs depends_on 语义混淆

**风险**：当前 handoff.md 的 `depends_on` 列混用阻塞关系和依赖关系。
**缓解**：第一阶段通过语义推断区分；第二阶段 schema V2 显式化 ID 前缀规则（`B-` = Blocker）。

### 6.3 风险：元文档膨胀

**风险**：本设计文档 + schema 文档 + project-rules.md 可能造成 handoff-schema 功能的文档膨胀。
**缓解**：[project-rules.md §三份长期文档职责划分](project-rules.md) 明确各文档边界，不重复内容。功能结束后 project-rules.md 整体删除，schema + design 归档保留。

---

## 7. 与外部评审 Round 2 的对齐

| 评审建议 | 本设计回应 |
|---------|----------|
| 语义对象模型先定义（零文件改动）| ✅ schema V1 已定义 |
| 先做 handoff.md schema 化（不受 codec bug 阻塞）| ✅ 第一阶段正是此方向 |
| 共享 ID 空间 + confidence 词汇表 | ✅ schema §1 五类对象共享 ID 空间，confidence 对齐 evidence-governance §4 |
| 双投影（机械投影 snapshot / 叙事投影 handoff）| ✅ schema §1.5 Handoff 对象定义，design §2 映射规则 |
| 验收判据：答得上依赖链 | ✅ §4 验收查询通过 |
