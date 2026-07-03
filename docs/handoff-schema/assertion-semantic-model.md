# Assertion 语义模型（讨论材料 · 未定稿）

> **状态**：讨论材料 / 思考笔记，**未定稿**，等待语义模型决策。
>
> **生命周期**：handoff-schema 功能开发期产出。决策落地后内容会迁移到正式文档（schema/design/project-rules），本文件可归档或删除。
>
> **不适用范围**：本文件不是规则文档，不强制下游遵循。仅在下次会话作为讨论起点。
>
> **源由**：2026-07-03 会话——schema-v2-snapshot 过度打包事件复盘后，发现现有 schema 字段视角不足以解释"为什么 confidence 标注没生效"，进而抽象到 Assertion 语义模型。本文档记录从症状到抽象的完整推演过程。

---

## 0. 阅读顺序

1. §1 起源事件——confidence 失效是怎么发生的
2. §2 问题的重新定义——从"confidence 没生效"到"下游无法判断断言是否值得继承"
3. §3 三层抽象的演进——representation/consumption 拆分，再到 assertion 层
4. §4 Assertion 语义模型雏形
5. §5 高层原则
6. §6 对现有体系的冲击评估
7. §7 冻结的待决策问题
8. §8 §6 v0 过渡版处理（handoff-schema/project-rules.md §6）
9. §9 下次会话起点

---

## 1. 起源事件

### 1.1 上一会话产出的字段

上一会话（2026-07-02）写 handoff.md 时，未完成项表新增一条：

```
schema-v2-snapshot | snapshot schema 化 | depends_on=pr-12032 | Hypothesis
```

`confidence = Hypothesis` 是低置信度标注。`depends_on = pr-12032` 表达"依赖 PR #12032 合并"。**未写推理链**——没有说明"为什么 schema 化依赖 codec bug 修复"。

### 1.2 本会话开始时的失效

本会话开始时，下游模型（本次会话）读到 `schema-v2-snapshot` 这条：

- 看到 `confidence = Hypothesis` → 知道整体证据弱
- 看到 `depends_on = pr-12032` → **直接采信为"snapshot schema 化整体依赖 PR #12032"**
- 没有核查这个依赖判断的依据

直到用户提问"snapshot 功能上已经能实现，为什么 schema-v2-snapshot 在阻塞"——下游才去读源码（types.ts / extractors / README），发现过度打包：

| 子动作 | 是否依赖 PR |
|---|---|
| 字段对齐（id / 枚举 / HandoffRecord 替代）| ❌ 不依赖 |
| 单元测试 | ❌ 不依赖 |
| 短对话实测（workaround 路径）| ❌ 不依赖 |
| 真实 90K+ token 长对话 e2e 实测 | ✅ 依赖（codec bug 阻塞）|

### 1.3 已修正的过度打包

已 commit `9ca7157`：`schema-v2-snapshot` 拆为 `schema-v2-snapshot-align`（不依赖 PR）+ `schema-v2-snapshot-e2e`（依赖 PR）。

但事件暴露的不是"打包错误"这个表面问题，而是更深的机制缺口。

---

## 2. 问题的重新定义

### 2.1 表层症状（错的定义）

> confidence 标注没生效

这个定义仍在 confidence 框架内打转——解法是给 confidence 加补充物（推理链 / 字段级 confidence / 分项 confidence）。

### 2.2 中层定义（GPT 提出）

> 下游无法判断一个断言是否值得继承

这个定义跳出了 confidence 框架——指向真正缺口是**继承判断**而非"置信度表达"。

### 2.3 深层定义（讨论中抽象到）

> handoff 保存的基本单位到底是什么？

如果基本单位是字段，那么每发现一个新需求就加字段（confidence / depends_on / blocker_ref / kind / exit_when / 推理链……）。如果基本单位是 Assertion，那么 Claim / Evidence / Justification / Confidence 是它的天然属性，schema 从模型反推而不是从模板正推。

**根本问题**：字段视角本身是错的。

---

## 3. 三层抽象的演进

### 3.1 第一层：representation / consumption（GPT 提出）

GPT 把方案拆成两层：

| 层 | 含义 | 对应方案 |
|---|---|---|
| representation（表达）| 上游如何写断言 | justification / source type |
| consumption（消费）| 下游如何用断言 | 默认核查高风险字段 |

警告：如果这两层没分开讨论，容易不断给 handoff 加字段。

### 3.2 第二层：assertion（讨论中抽象到）

GPT 的两层还缺一层——**assertion（断言）**本身。因为 handoff 本质不是在保存字段，而是在保存"一系列等待下游继承的断言"。

例如 `depends_on = pr-12032` 不是一个字段，它其实是一条 Assertion。

### 3.3 第三层：原则（讨论中抽象到）

> 任何可被后续会话继承的断言，都必须能够被后续会话以低成本重新评估。

这句话约束的是整个 handoff 系统，自然推出：
- 要有 Evidence（否则无法复核）
- 要有 Justification（否则不知道为什么）
- 要有 Confidence（否则不知道证据强弱）
- 消费侧默认核查高风险断言（否则不会重新评估）

这些都变成原则的推论，而不是零散规则。

---

## 4. Assertion 语义模型雏形

> **未定稿**——以下是对最小语义模型的初步设想，待讨论。

### 4.1 基本单位

**Assertion** 是 handoff 保存的基本单位。它天然拥有四个属性：

```
Evidence  （事实 / 来源）
   ↓
Justification  （把事实连接到结论）
   ↓
Claim  （最终断言）
```

Confidence 是 Assertion 的属性，不是 handoff item 的属性。

### 4.2 Evidence vs Source Type

GPT 建议并列 Source + Justification。讨论中调整为：

- **Evidence** 是一级字段（事实 + 来源元信息）
- **Source Type** 是 Evidence 的子属性，不是 Assertion 的一级字段

理由：以后一定会想加 link / commit / PR / 文件 / line / 实验编号——如果只有 `Source: Test`，迟早又要扩展。所以 Evidence 应该是一个对象，Source Type 是它的 `kind` 子属性。

### 4.3 Evidence.kind 枚举（本地化待定）

GPT 给的 5 档：Code / Test / Discussion / Inference / Guess。

讨论中调整：
- `Guess` 不是一种来源——它是"没有来源"。所以应该用 `None`，并通过 `confidence = Hypothesis` 自然表达"没有直接证据支持的推断"。
- 本地化到本项目文档体系：

| GPT 枚举 | 本项目对应 |
|---|---|
| Code | 读源码（types.ts / extractors）|
| Test | 实测（短对话 workaround / 真实长对话 e2e）|
| Discussion | 评审 / 用户反馈 / 外部建议（如 GPT 这轮）|
| Inference | 基于已有断言推断 |
| ~~Guess~~ | 改为 `None`（用 confidence 表达）|

是否合用，待讨论。

### 4.4 Claim / Evidence / Justification 的关系

- **Evidence** 是事实
- **Justification** 是把事实连接到结论
- **Claim** 是最终断言

示例（schema-v2-snapshot-e2e 条目）：

```
Evidence:
  type: Test
  summary: 90K token e2e failed at codec

Justification:
  snapshot e2e 必经 codec

Claim:
  depends_on = pr-12032
```

### 4.5 Confidence 在新模型下的定位

- 保留为 Assertion 的属性
- 但降级为**辅助**——下游次要看，主要看 Evidence + Justification
- GPT 建议放最后；讨论中保留必填但弱化权重

待讨论：是否仍必填？还是 Evidence.kind = None 时才必填？

---

## 5. 高层原则

> **任何可被后续会话继承的断言，都必须能够被后续会话以低成本重新评估。**

为什么这个措辞比 GPT 的"必须携带可快速验证的依据"更准：

| 措辞 | 约束的对象 |
|---|---|
| "必须携带可快速验证的依据" | 字段（要有什么字段）|
| "必须能够被低成本重新评估" | 系统（表达 + 消费两层都受约束）|

后者自然推出 Evidence（可复核）/ Justification（知为何）/ Confidence（知强弱）/ 消费侧默认核查（会重评）——这些都是原则的推论，不是零散规则。

**跨载体稳定性**：以后无论 handoff 是 Markdown / YAML / 数据库记录，这个原则都可以沿用，不受具体字段设计限制。

待讨论：这个原则写在哪个文档？

---

## 6. 对现有体系的冲击评估

### 6.1 正面冲击：把零散补丁统一到一个模型下

| 已有 | 原定位 | Assertion 模型下的新定位 |
|---|---|---|
| V2 五类对象（Decision/Change/Verification/Blocker/Handoff）| 语义对象模型 | **Assertion 的容器**（载体分类，不是基本单位）|
| evidence-governance §4 confidence 三档 | confidence 定义源 | **Evidence 对象的雏形**（可提升为一级定义源）|
| 现有 confidence 字段 | Handoff 字段 | **Assertion 的属性**（应附在每条 Assertion 上，不是容器上）|
| 现有 depends_on/blocker_ref | Handoff 字段 | **Assertion 的 Claim**（断言内容本身）|
| §6 推理链约束（v0 过渡版）| Hypothesis 专属补丁 | **Assertion 的 Justification 属性**（普适，不是 Hypothesis 专属）|

### 6.2 V2 五类对象 vs Assertion 的关系

两者**正交不冲突**：
- V2 五类对象是**载体分类**（按内容性质分：决策 / 变更 / 验证 / 阻塞 / 未完成项）
- Assertion 是**基本单位**（按语义性质分：每条断言都是 Claim + Evidence + Justification + Confidence）

一个 Handoff 对象内可含多条 Assertion。例 `schema-v2-snapshot-e2e` 这条 Handoff 对象含：
- Assertion A: "depends_on = pr-12032"（Claim）
- Assertion B: "blocker_ref = B-cli-codec-bug"（Claim）
- Assertion C: "exit_when = PR 合并 + CLI 发版"（Claim）

每条 Assertion 都应有自己的 Evidence / Justification / Confidence。

### 6.3 现有 schema V2 字段不需要立即重写

V2 schema 字段是载体层的合理表达。如果 Assertion 模型定下来，V2 字段会自然被重新组织——但**不是立即重写**，而是等 Assertion 模型稳定后，由模型反推字段表达。

---

## 7. 冻结的待决策问题

### Q1：handoff 保存的基本单位 = Assertion？

倾向：**是**。V2 五类对象是载体分类，Assertion 是基本单位，两者正交。

待确认。

### Q2：Assertion 最小语义模型 = Claim / Evidence / Justification / Confidence？

倾向：**是**，四属性。

两个细节待定：
- **Evidence 是否含 `kind` 子属性**——倾向有（Code/Test/Discussion/Inference/None）
- **Confidence 是否仍必填**——倾向保留必填但降级为辅助

### Q3：Evidence.kind 枚举是否定死？

倾向：**先定 5 档**（Code/Test/Discussion/Inference/None），但留扩展空间。

### Q4：高层原则写在哪个文档？

候选：
- `schema-semantic-object-model.md` §0 设计原则（最高位）
- `evidence-governance.md` 新章节
- 单独文档

### Q5：消费层规则（默认核查高风险字段）写哪里？

属于行为规则，但 dev-rules 已冻结。候选：
- `handoff-schema/project-rules.md`（功能专属）
- 等第二阶段开始时写入 dev-rules.md

### Q6：V2 五类对象的定位怎么调整？

从"语义对象模型"调整为"Assertion 的载体分类"——文档表述需要更新，但字段定义不变。

---

## 8. §6 v0 过渡版处理

### 8.1 当前状态

`docs/handoff-schema/project-rules.md` §6 已 commit（`1f800a7`）：Hypothesis 条目强制推理链。

### 8.2 处理方案

**v0 过渡保留，不 revert 不扩展**。

理由：
- 解决了一个真实问题（只写结论没有依据）
- 没有引入错误，只是抽象层次不够高
- 现在回退意义不大——已验证"增加依据"方向有效
- 暂停继续扩展，等语义模型讨论完成后统一重构

避免的失败模式：
```
§6 → 改 justification → 改 source → 改 confidence → 再改 schema
```
每次都是局部修补。

### 8.3 重构时机

Assertion 语义模型决策落地后：
- §6 内容迁移到 Assertion 模型的 Justification 属性
- §6 本身删除（规则被模型吸收）
- project-rules.md 改为引用模型而非定义字段

---

## 9. 下次会话起点

### 9.1 首动作

读以下文档：
- `docs/handoff.md`（会话快照 + 未完成项表）
- `docs/handoff-schema/project-rules.md`（含 §6 v0 过渡版）
- `docs/handoff-schema/assertion-semantic-model.md`（本文档）

### 9.2 待推进的决策

1. 确认 §7 Q1（基本单位 = Assertion）
2. 确认 §7 Q2（四属性最小模型）
3. 讨论 §7 Q3-Q6（枚举 / 原则位置 / 消费规则位置 / V2 对象定位调整）
4. 决策落地后才动 schema / project-rules 文档

### 9.3 暂不推进的项

- 不立即改 schema V2 字段表达
- 不立即扩展 §6（保持 v0 过渡版）
- 不立即 commit 任何模型改动——先讨论清楚

---

## 附：与本材料相关的现有文档

| 文档 | 关系 |
|---|---|
| [schema-semantic-object-model.md](./decisions/schema-semantic-object-model.md) | V2 五类对象定义——待重新定位为"Assertion 载体分类" |
| [handoff-schema/design.md](./handoff-schema/design.md) | schema 设计文档——§5 演进路线可能需要新增 Assertion 模型阶段 |
| [handoff-schema/project-rules.md §6](./handoff-schema/project-rules.md) | v0 过渡版——等模型定后重构 |
| [evidence-governance.md §4](./evidence-governance.md) | confidence 三档——可能提升为 Evidence 对象定义源 |
| [handoff.md](./handoff.md) | 未完成项表——V2 字段表达，等模型定后反推 |
