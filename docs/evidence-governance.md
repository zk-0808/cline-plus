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

本框架由 [workflow-review-2026-06-27.md](archive/workflow-review-2026-06-27.md) 的外部评审反馈催生。两份外部评审独立指出：

1. **评审一**：核心根因是"证据治理失败"——没定义"不同证据分别能回答什么问题"；建议 Observation/Inference/Conclusion 分离 + Confidence 标注。
2. **评审二**：核心根因是"证据状态管理失败"——从证据直接跳到结论，跳过 Hypothesis；建议 Observation → Evidence → Hypothesis → Verified → Decision 状态机。

两份评审共识：本框架作为上层元规则，dev-rules.md 作为执行门控，ADR 作为实际应用。三层结构不重叠。

---

## 14. 产源说明（成熟实践映射）

依据 [reviewer-personas.md §1](reviewer-personas.md) 核心约束"优先借鉴成熟实践，非重新发明"，本框架的各组成部分产源如下：

| 本框架章节 | 成熟实践 | 本地扩展（AI 工作流特殊性）| 创新部分 |
|----------|---------|--------------------------|---------|
| §2 证据生命周期状态机 | **EBSE（Evidence-Based Software Engineering）**——Kitchenham et al., 2004；科学方法的 Observation → Hypothesis → Experiment → Conclusion | 增加 Evidence 中间状态（区分"原始观察"与"支持假设的证据"）| 无 |
| §2.4 Observation vs Inference 分离 | **科学方法 + RCA（Root Cause Analysis）**——观察与解释分离是 RCA 基本原则 | 无 | 无 |
| §3 证据职责分工 | **EBSE 证据分级**——不同证据类型回答不同问题 | 针对 AI agent 调研场景的具体证据类型映射（minified/官方/Example/实测）| 无 |
| §4 Confidence 模型 | **EBSE 证据等级** + **CER（Claim-Evidence-Reasoning）** | 简化为高/中/低三档 + ★ 标注 | 无 |
| §5 Unknown 状态 | **科学方法**——"I don't know"是合法答案；**RCA**——未确认原因时停止而非猜测 | 显式允许 ADR 暂停于 Unknown | 无 |
| §6 Conflict Registry | **RCA**——记录矛盾证据而非急于裁决；**ADR**——记录决策时的反对意见 | 无 | 无 |
| §7 Decision Readiness Checklist | **ADR Methodology**——决策前的 context/problem/considered alternatives；**Definition of Ready（Scrum）** | 针对 AI agent 跳级问题的具体检查项 | 无 |
| §8 Evidence Escalation | **RCA 5 Whys**——逐层深入；**PDCA**——Plan/Do/Check/Act 升级 | 证据类型升级路径（官方→Example→源码→实测）| 无 |
| §9 实验优先 | **Lean Startup**——Build-Measure-Learn；**EBSE**——empirical evidence 优于 analytical reasoning | 针对 AI agent 倾向于分析 minified 代码的修正 | 无 |
| §10 Investigation Note | **Lab Notebook / Research Log**——科学研究的实验记录簿 | 格式标准化为 Observation/Evidence/Hypothesis/Verified/Decision | 无 |

**结论**：本框架**无创新部分**——所有组成部分均有成熟实践对应。本地扩展仅是"针对 AI agent 调研工作流的场景适配"（如 minified 代码风险、Confidence 简化为三档）。

**反思**：本次设计过程中曾把"证据治理"当作新概念提出，实际是 EBSE + RCA + ADR Methodology 的组合应用。按 [reviewer-personas.md](reviewer-personas.md) 核心约束，应在最初就映射到 EBSE，而非自创术语。

---

## 15. 结论时效性模型

> **源由**：2026-06-27 [Marketplace 开发机制并行调查](decisions/investigation-note-marketplace-dev-mechanism.md) C 号 Process Reviewer RCA——"无开发记录"结论 4 天后即过时（SDK 升 2 patch / Marketplace 上架 ~22 plugin），但无机制触发复查。

涉及**外部生态**的结论（社区活跃度 / 包下载量 / 上架数 / GitHub 活动 / 官方文档版本）默认时效期 **14 天**。超期需复查或加 `stale` 标注。

涉及**官方文档/版本号**的结论，时效期绑定为"下一版本发布"或 **30 天**（取先到者）。

**ADR frontmatter 强制字段**（新增 ADR 必填，存量 ADR 在下次 Update 时补）：

```yaml
evidence_as_of: <YYYY-MM-DD>           # 结论形成日
expires_if_unchanged: <YYYY-MM-DD>     # 默认 evidence_as_of + 14 天（外部生态）/ + 30 天（官方文档）
```

**超期处置**：
1. 引用该 ADR 结论作为新决策论据前，**必须**先复查
2. 复查通过：更新 `evidence_as_of` 与 `expires_if_unchanged`
3. 复查失败：降级为 Hypothesis，登记 Conflict Registry
4. 未复查：禁止作为新决策的论据（见 [dev-rules.md §1.13](dev-rules.md)）

**成熟实践映射**：
- 时效期模型 ↔ **Refresh Token 生命周期**（认证令牌的过期与刷新机制）+ **Nutrition Facts"as of"标注**（科学数据的有效期声明）

---

## 16. 社区活动证据职责

> **源由**：§3 证据职责分工表未覆盖"社区活动"维度，导致 2026-06-23 调查把"无 how-to 博客"误等同为"无开发活动"（[investigation-note-marketplace-dev-mechanism.md](decisions/investigation-note-marketplace-dev-mechanism.md) C 号 RCA 一号根因：证据类型混淆）。

补全 §3 表格：

| 问题 | 应使用的证据类型 |
|------|---------------|
| 社区开发活动是否存在 | npm 包数量 + 周下载量 + GitHub issue/PR 数 + 第三方 fork/scope |
| 社区 how-to 经验是否沉淀 | 中英文搜索引擎 + 掘金/知乎/CSDN/Dev.to/Medium |
| 社区 plugin 是否上架 | 官方 Marketplace API 或 catalog.json |
| 社区问题是否被响应 | GitHub issue 关闭率 + 响应时长 + Stack Overflow 标签活跃度 |

**禁止**：用一种证据类型代替另一种。例如：
- ❌ "无 how-to 博客" ⇒ "无开发活动"（证据类型混淆）
- ❌ "npm 包存在" ⇒ "社区已沉淀经验"（包存在 ≠ 经验沉淀）
- ✅ "无 how-to 博客" + "npm 周下载 < 100" + "GitHub PR 数 < 5" + "Marketplace 上架 0" ⇒ "社区活动稀少"（多源一致）

**成熟实践映射**：
- 社区活动多源验证 ↔ **EBSE 多源证据三角验证（Triangulation）** + **Mixed Methods Research**（定量 npm/GitHub 数据 + 定性博客/Issue 分析）

---

## 17. 调研可复现性

> **源由**：2026-06-23 [plugin-dev-quick-reference.md §0](plugin/refs/plugin-dev-quick-reference.md) 仅自述"搜过 SDK plugin 开发的中英文社区经验、博客、踩坑记录"，未记录 query 列表——无法复现，且无法核查调查范围是否充分。

调研类结论（"无 X" / "社区无 Y" / "找不到 Z"）**必须**记录以下可复现信息：

| 字段 | 必填 | 示例 |
|------|------|------|
| query 列表 | ✅ | `"cline plugin development"`, `"cline SDK 教程"`, `"@cline/sdk 实战"` |
| 搜索引擎 | ✅ | Google / Bing / DDG / npm search / GitHub search / 知乎搜索 |
| 时间戳 | ✅ | 2026-06-23 14:30 Asia/Shanghai |
| 命中数 | ✅ | 约 N 条结果（或"零结果"）|
| 前 3 条命中摘要 | 选填 | 标题 + URL + 一句话相关性判断 |

**禁止**：
- 仅自述"搜过 X"而不记录 query 列表——无法复现的调研**不可写入 ADR**
- 仅用一个 query 下"无 X"结论——至少 3 个不同角度的 query

**Investigation Note 强制位置**：调研记录必须放在 [§10 Investigation Note](#10-investigation-note) 的 Observation 段，不可仅写在 ADR 的 Context 中。

**成熟实践映射**：
- 调研可复现性 ↔ **科学方法实验记录（Lab Notebook）** + **Systematic Literature Review（SLR）的检索协议**——Kitchenham & Charters (2007) 要求 SLR 明确记录检索式、数据库、时间范围、命中数

---

## 18. 产源说明（§15-§17 补充）

| 本框架章节 | 成熟实践 | 本地扩展（AI 工作流特殊性）| 创新部分 |
|----------|---------|--------------------------|---------|
| §15 结论时效性模型 | **Refresh Token 生命周期** + **Nutrition Facts"as of"标注** | ADR frontmatter 加 `evidence_as_of` / `expires_if_unchanged` 字段 | 无 |
| §16 社区活动证据职责 | **EBSE 三角验证（Triangulation）** + **Mixed Methods Research** | 针对 AI agent 调研场景的具体社区活动证据类型映射（npm/GitHub/Marketplace）| 无 |
| §17 调研可复现性 | **SLR 检索协议（Kitchenham & Charters 2007）** + **Lab Notebook** | 强制 query 列表 + 时间戳 + 命中数三字段 | 无 |

**结论**：§15-§17 无创新部分，均为成熟实践的本项目适配。
