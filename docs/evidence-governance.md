# Evidence Governance（证据治理框架）

> **层级**：Level 1 元规则——定义如何形成结论。
>
> **适用范围**：所有需要推理的场景——调研、设计、性能分析、Bug 定位、能力核查等。
>
> **与 dev-rules.md 的关系**：本文件是 dev-rules.md 执行门控的**上层依据**。dev-rules.md 规定"什么时候必须停"，本文件规定"如何形成结论"。两者不重叠。
>
> **与 ADR 的关系**：ADR 记录已达到 Decision 状态的结论。Decision 之前的证据链记录在 Investigation Note 中。
>
> **源由**：ADR-002 Update 1→2→3→4 连续 4 次颠覆事故（2026-06-26 ~ 2026-06-27）。外部评审指出核心问题不是"调研规则不足"，而是"证据治理失败"——把单一证据直接升级为最终结论，跳过了假设、验证、置信度管理环节。

---

## 1. 核心问题

AI agent 调研工作流的核心风险不是"用了错误的来源"，而是**把单一证据直接升级为最终结论**，跳过了中间的假设、验证、置信度管理环节。

| 错误模式 | 实例 |
|---------|------|
| Observation → Decision（跳级）| `grep 命中 registerMessageBuilder` ⇒ "VS Code 扩展支持 plugin" |
| Evidence → Decision（跳级）| `CHANGELOG 零 plugin 条目` ⇒ "VS Code 扩展不支持 plugin" |
| 单源裁决 | 官方文档说"不支持" ⇒ 直接采纳，未对照源码 |
| 解释当观察 | `join(workspace,".cline",e)` ⇒ "e 是安装路径"（观察没错，解释错了）|

---

## 2. 证据生命周期状态机

### 2.1 五个状态

| 状态 | 定义 | 示例 |
|------|------|------|
| **Observation** | 直接观察（无解释）| `join(workspace,".cline",e)` 出现在 dist/extension.js 第 475 行 |
| **Evidence** | Observation 支持某个假设 | 第 475 行的存在支持"VS Code 扩展有路径拼接逻辑" |
| **Hypothesis** | 基于证据的解释（需明确标注 Inference）| "e 可能是 plugin 安装路径的子目录名" |
| **Verified** | 至少 2 个独立证据类型一致 | 官方文档 + 源码 + Example 三方一致 |
| **Decision** | 可写入 ADR 的最终结论 | "plugin 安装路径是 .cline/plugins/" |

### 2.2 状态转换条件

```
Observation → Evidence:    无条件（任何观察都可记为证据）
Evidence → Hypothesis:     需明确标注 Inference（解释）
Hypothesis → Verified:     需 ≥2 个独立证据类型一致
Verified → Decision:       需通过 Decision Readiness Checklist（§7）
```

### 2.3 禁止跳级

- Observation → Decision：**禁止**
- Evidence → Decision：**禁止**
- Hypothesis → Decision：**禁止**（必须先到 Verified）

### 2.4 Observation vs Inference 必须分离

每项结论必须明确区分：

- **Observation**：直接看到的事实（如 `join(workspace,".cline",e)`）
- **Inference**：对观察的解释（如"e 是安装路径"）

观察不会错，解释会错。混淆两者是颠覆链的主要来源。

---

## 3. 证据职责分工

不同证据类型回答不同问题，**不可混用**。

| 问题 | 应使用的证据类型 |
|------|---------------|
| API 是否存在 | 源码 / minified 定位 |
| 是否官方支持 | 官方文档 |
| 推荐怎么用 | 官方文档 + Example |
| 何时引入 | CHANGELOG / Release Notes |
| 已知限制 | Issue / Discussion |
| 真实运行行为 | 实测 |
| 设计意图 | 官方文档 / Example 注释 |

**冲突时记录，不裁决**（见 §6 Conflict Registry）。

**反例**（本次事故）：
- 用 CHANGELOG 回答"是否支持"——错误，CHANGELOG 回答"何时引入"
- 用 minified 源码回答"设计意图"——错误，源码回答"实际行为"

---

## 4. Confidence 模型

每项结论必须标注置信度。

| 等级 | 定义 | 可进入的状态 |
|------|------|------------|
| **高** | ≥3 个独立证据类型一致，无冲突 | Decision |
| **中** | 2 个独立证据类型一致，或单源但来源权威 | Verified |
| **低** | 单一证据，或存在未解决冲突 | Hypothesis |

**标注格式**：

```
结论：VS Code 扩展代码层有 registerMessageBuilder 注册接口
证据：
  ★★★★★ 源码（dist/extension.js 第 543 行）
  ★★★★☆ 官方文档（capabilities 表含 messageBuilders）
置信度：高
Remaining Unknown：手动放文件能否触发 setup（待实测）
```

---

## 5. Unknown 状态原则

### 5.1 允许 Unknown

ADR / 调研结论允许暂时停在 Unknown，**不强制补成 Yes/No**。

### 5.2 何时必须标 Unknown

- 官方文档未说明
- 源码 minified 无法确定语义
- 多源冲突未解决
- 未实测

### 5.3 Unknown 不是失败

Unknown 是诚实记录。**补成 Yes/No 才是失败**——因为低置信度结论写成确定事实后，会被当作 Decision 引用，导致下游错误。

### 5.4 实例

本次事故中，"VS Code 扩展能否自动发现 `.cline/plugins/`" 官方文档未说明，应标 Unknown，而非基于 CLI 行为推断"VS Code 也支持"。

---

## 6. Conflict Registry（证据冲突登记）

### 6.1 何时登记

不同证据类型对同一问题给出矛盾答案时。

### 6.2 登记内容

| 字段 | 内容 |
|------|------|
| 冲突问题 | （如"VS Code 扩展是否支持 plugin"）|
| 来源 A | （如官方文档："不支持"）|
| 来源 B | （如 SDK Example："extends any Cline agent — VS Code, JetBrains"）|
| 来源 C | （如源码：第 543 行有 registerMessageBuilder）|
| 当前置信度 | （如"中——多源冲突"）|
| 待验证事项 | （如"手动放文件实测"）|

### 6.3 禁止立即裁决

冲突登记后**不允许立即选择一方**，必须列出待验证事项，等更多证据（见 §8 Evidence Escalation）。

### 6.4 冲突本身就是知识

冲突不是"谁对谁错"，而是"存在张力"。记录冲突比消除冲突更有价值——因为消除可能是错的。

---

## 7. Decision Readiness Checklist

写入 ADR 或更新长期规则前，必须通过：

- [ ] 是否仍存在 Unknown？（若是 → 不可进入 ADR，标 Unknown）
- [ ] 是否仍存在未解决冲突？（若是 → 登记 Conflict Registry，不可进入 ADR）
- [ ] 是否所有关键结论达到 Verified？（若否 → 降为 Hypothesis）
- [ ] 是否只是合理推测而非已验证事实？（若是 → 降为 Hypothesis）
- [ ] 是否标注了所有结论的 Confidence？（若否 → 补标注）

**只有全部通过，才能进入 ADR。**

---

## 8. Evidence Escalation（证据升级）

证据冲突时**自动升级**，而非继续在同一证据类型里打转。

```
Level 1: 官方文档
  ↓ 冲突
Level 2: SDK Example
  ↓ 冲突
Level 3: 源码（unminified 优先，minified 仅用于定位）
  ↓ 冲突
Level 4: 实测（实验优先，见 §9）
```

**禁止模式**：`grep → grep → grep → grep`（同一证据类型连续使用未解决冲突）。

**允许模式**：`官方 → Example → 源码 → 实测`（跨证据类型升级，即使连续 4 次修正也说明调查越来越深入）。

---

## 9. 实验优先原则

当 Observation 成本 > Experiment 成本时，**优先实验**。

**实例**：
- 问题："VS Code 扩展支不支持 plugin？"
- Observation 路径：分析 22MB minified 代码（数小时，可能误读）
- Experiment 路径：`mkdir .cline/plugins/test-plugin/` + 启动 VSCode + 看是否加载（10 分钟）
- **应优先实验**

**反例**（本次事故）：花大量时间分析 minified 代码推断 plugin 路径和 manifest 格式，实际 fetch 官方文档或实测一次就能解决。

---

## 10. Investigation Note

ADR 之前应有 Investigation Note 记录证据链，**不直接从搜索跳到 ADR Update**。

**格式**：

```
## Investigation Note: <主题>
日期：YYYY-MM-DD

### Observation
- <直接观察 1>
- <直接观察 2>

### Evidence
- <证据 1>（来源：<类型>，置信度：<高/中/低>）
- <证据 2>（来源：<类型>，置信度：<高/中/低>）

### Hypothesis
- <假设 1>（基于证据 1+2，置信度：<高/中/低>）

### Conflict Registry（如有）
- 冲突问题：<...>
- 来源 A：<...>
- 来源 B：<...>
- 待验证：<...>

### Verified（如已达到）
- <已验证结论>（独立证据类型：A + B）

### Remaining Unknown
- <尚未确认项>

### Decision（如已达到）
- <可写入 ADR 的结论>
```

---

## 11. 本框架的适用边界

### 11.1 适用

- 调研类工作（能力核查、技术选型、方案对比）
- Bug 定位（观察 vs 解释分离）
- 性能分析（多源证据交叉验证）
- 任何需要"从证据到结论"的推理场景

### 11.2 不适用

- 纯执行类任务（如按已确认的步骤跑命令）
- 用户明确指示的直接操作

### 11.3 与 dev-rules.md 的协作

| 场景 | 本文件 | dev-rules.md |
|------|--------|-------------|
| 形成结论时 | 定义状态机和置信度 | §1.5-§1.10 执行门控引用本文件 |
| 证据冲突时 | §6 Conflict Registry + §8 Escalation | §1.8 Evidence Collapse 门控 |
| 方向偏离时 | — | §1.9 Direction Drift 门控 |
| 核心命题翻转时 | — | §1.10 Core Proposition Flip 门控 |

---

## 12. 不做的事

- 不收录功能专属的证据规则（那些留在对应的 `project-rules-<功能>.md`）
- 不预写"未来可能用到"的证据类型
- 不替代 dev-rules.md 的执行门控（本文件只定义"如何形成结论"，不定义"何时必须停"）

---

## 13. 源由与评审记录

本框架由 [workflow-review-2026-06-27.md](workflow-review-2026-06-27.md) 的外部评审反馈催生。两份外部评审独立指出：

1. **评审一**：核心根因是"证据治理失败"——没定义"不同证据分别能回答什么问题"；建议 Observation/Inference/Conclusion 分离 + Confidence 标注。
2. **评审二**：核心根因是"证据状态管理失败"——从证据直接跳到结论，跳过 Hypothesis；建议 Observation → Evidence → Hypothesis → Verified → Decision 状态机。

两份评审共识：本框架作为上层元规则，dev-rules.md 作为执行门控，ADR 作为实际应用。三层结构不重叠。
