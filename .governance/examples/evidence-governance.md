# Evidence Governance（证据治理框架）— 通用化示例包

> **生命周期**：版本绑定 — v1.0 框架定型后归档。
>
> **身份**：EX-2 产出。从 cline++ evidence-governance.md 蒸馏的证据状态机示例包。
>
> **通用化判定依据**：见 [../core/rubric.md](../core/rubric.md) 五维判定清单。
>
> **使用场景**：① 第二个项目接入时按本示例包修改后即可复用；② 写 core/constitution.md §证据治理时引用本包作为状态机/Conflict Registry/Evidence Escalation 的具体落地范本。
>
> **与原项目的关系**：本包从 cline++ 项目蒸馏。判定动作（状态机 / 独立证据判定 / Conflict Registry 机制 / Evidence Escalation 升级路径）保留为通用规则；项目取值（具体 GitHub issue 编号 / PR 链接 / codec bug 引用 / 具体文件路径 / 具体日期）已清除或参数化。

---

## cline++ 特定假设

> 本示例包从 cline++ 项目蒸馏。下列假设若不适用你的项目,需修改对应章节。

| 假设 | 影响章节 | 修改建议 |
|------|---------|---------|
| 假设存在 dev-rules.md 作为执行门控配套文件,与本文件形成"上层依据 + 执行门控"双层结构 | §11.3 / §15 超期处置引用 | 改为你项目的执行门控文件名（如 `guard-rules.md`），或合并入本文件 §11 |
| 假设 ADR frontmatter 支持 `evidence_as_of` / `expires_if_unchanged` / `evidence_source_kind` 三个强制字段 | §15 ADR frontmatter 强制字段 | 改为你项目 ADR 模板支持的字段；若 ADR 无 frontmatter，改为正文首段标注 |
| 假设存在 Investigation Note 文档结构（`docs/decisions/investigation/`）作为 ADR 前置证据链载体 | §10 Investigation Note / §19.4 登记表模板 | 改为你项目的调研记录目录；若仅用 ADR，则 Investigation Note 段内联于 ADR Context |
| 假设默认时效期：源码快照 main 分支 7 天 / 外部生态 14 天 / 官方文档 release 30 天 | §15 时效期 / §19.1 必须补证日 | 按你项目上游演进速度调整——快速迭代项目可缩为 3/7/14 天，慢速项目可放宽到 14/30/90 天 |
| 假设存在子代理协作场景（主 agent 综合多子代理报告） | §20 子代理协作证据规则 | 若你项目为单 agent 工作流，删除 §20 整节；若多 agent 但无主从结构，改为对等节点间的同源检测 |
| 假设存在"每月文档健康度审查"机制触发 Hypothesis 批量复查 | §19.5 复查节奏 | 改为你项目的定期审查节奏（如每 sprint / 每季度），或改为事件触发（如发版前） |
| 假设存在 reviewer-personas.md 定义"优先借鉴成熟实践,非重新发明"约束 | §14 产源说明 | 若你项目无此约束，删除 §14"反思"段；若用其他工程规范文档替代，改引用路径 |
| 假设事故源由（连续颠覆事故 + 外部评审）跨项目可复用为反例素材 | §1 核心问题 / §13 源由 | 若你项目无类似事故，删除 §13 具体事故描述，仅保留"两份外部评审独立指出"的共识结构 |

---

## 1. 核心问题

AI agent 调研工作流的核心风险不是"用了错误的来源",而是**把单一证据直接升级为最终结论**,跳过了中间的假设、验证、置信度管理环节。

| 错误模式 | 实例（通用化）|
|---------|------|
| Observation → Decision（跳级）| `<源码 grep 命中某函数>` ⇒ "<目标系统支持某能力>" |
| Evidence → Decision（跳级）| `<CHANGELOG 零某能力条目>` ⇒ "<目标系统不支持某能力>" |
| 单源裁决 | 官方文档说"不支持" ⇒ 直接采纳,未对照源码 |
| 解释当观察 | `<源码中某表达式>` ⇒ "<某变量是某含义>"（观察没错,解释错了）|

---

## 2. 证据生命周期状态机

### 2.1 五个状态

| 状态 | 定义 | 示例 |
|------|------|------|
| **Observation** | 直接观察（无解释）| `<某表达式>` 出现在 `<某文件>` 第 N 行 |
| **Evidence** | Observation 支持某个假设 | 第 N 行的存在支持"<目标系统有路径拼接逻辑>" |
| **Hypothesis** | 基于证据的解释（需明确标注 Inference）| "<某变量可能是某能力的子目录名>" |
| **Verified** | 至少 2 个独立证据类型一致 | 官方文档 + 源码 + Example 三方一致 |
| **Decision** | 可写入 ADR 的最终结论 | "<某能力的安装路径是 X>" |

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

- **Observation**：直接看到的事实（如 `<某表达式>`）
- **Inference**：对观察的解释（如"<某变量是某含义>"）

观察不会错,解释会错。混淆两者是颠覆链的主要来源。

---

## 3. 证据职责分工

不同证据类型回答不同问题,**不可混用**。

| 问题 | 应使用的证据类型 |
|------|---------------|
| API 是否存在 | 源码 / minified 定位 |
| 是否官方支持 | 官方文档 |
| 推荐怎么用 | 官方文档 + Example |
| 何时引入 | CHANGELOG / Release Notes |
| 已知限制 | Issue / Discussion |
| 真实运行行为 | 实测 |
| 设计意图 | 官方文档 / Example 注释 |
| 社区开发活动是否存在 | 包数量 + 周下载量 + GitHub issue/PR 数 + 第三方 fork/scope |
| 社区 how-to 经验是否沉淀 | 中英文搜索引擎 + 技术博客平台 |
| 社区插件/扩展是否上架 | 官方 Marketplace API 或 catalog.json |
| 社区问题是否被响应 | GitHub issue 关闭率 + 响应时长 + Stack Overflow 标签活跃度 |

**冲突时记录,不裁决**（见 §6 Conflict Registry）。

**反例**（通用模式）：
- 用 CHANGELOG 回答"是否支持"——错误,CHANGELOG 回答"何时引入"
- 用 minified 源码回答"设计意图"——错误,源码回答"实际行为"
- 用一种社区证据类型代替另一种：
  - ❌ "无 how-to 博客" ⇒ "无开发活动"（证据类型混淆）
  - ❌ "包存在" ⇒ "社区已沉淀经验"（包存在 ≠ 经验沉淀）
  - ✅ "无 how-to 博客" + "周下载 < N" + "GitHub PR 数 < M" + "Marketplace 上架 0" ⇒ "社区活动稀少"（多源一致）

**成熟实践映射**：社区活动多源验证 ↔ **EBSE 多源证据三角验证（Triangulation）** + **Mixed Methods Research**（定量包管理/GitHub 数据 + 定性博客/Issue 分析）

---

## 4. Confidence 模型

每项结论必须标注置信度。

| 等级 | 定义 | 可进入的状态 |
|------|------|------------|
| **高** | ≥3 个独立证据类型一致,无冲突 | Decision |
| **中** | 2 个独立证据类型一致,或单源但来源权威 | Verified |
| **低** | 单一证据,或存在未解决冲突 | Hypothesis |

**标注格式**：

```
结论：<目标系统某结论>
证据：
  ★★★★★ 源码（<某文件> 第 N 行）
  ★★★★☆ 官方文档（<某文档章节>）
置信度：高
Remaining Unknown：<待验证事项>（待实测）
```

### 4.1 Confidence 与状态机的正交关系

**Confidence**（高/中/低）与 §2 状态机（Observation / Evidence / Hypothesis / Verified / Decision）是**两个独立维度**,回答不同问题：

| 维度 | 回答的问题 | 取值 |
|------|-----------|------|
| **Confidence** | "这条结论的证据有多强？" | 高 / 中 / 低 |
| **State** | "这条结论已被允许用于哪种决策？" | Observation → Evidence → Hypothesis → Verified → Decision |

**正交关系矩阵**：

| State ＼ Confidence | 高 | 中 | 低 |
|--------------------|----|----|----|
| Observation | 罕见（单点观察也可靠,如直接读配置文件）| 常见 | 常见 |
| Evidence | 罕见 | 常见 | 常见 |
| Hypothesis | 罕见（高置信 + 仅 Hypothesis 通常意味着状态滞后,应升级 Verified）| 常见 | 常见 |
| Verified | 允许（满足 ≥3 独立证据）| **典型**（满足 ≥2 独立证据）| 不允许（违反状态转换条件 §2.2）|
| Decision | **典型**（≥3 独立 + 无冲突 + 通过 §7 Checklist）| 允许（特殊情形：来源极权威且通过 §7 Checklist）| 不允许 |

**正交关系的三个含义**：

1. **Confidence 升降不自动改 State**：新证据出现使 Hypothesis 的 Confidence 从低升到中,**不**等于该 Hypothesis 自动变成 Verified——必须显式走 §2.2 状态转换（"需 ≥2 个独立证据类型一致"作为升级判据,由人工/评审显式判定,而非由 Confidence 数值机械触发）。
2. **State 升降不自动改 Confidence**：一条 Verified 结论被新证据颠覆,State 可回退 Unknown（§5）,但其原 Confidence 标注保留作为历史记录——Confidence 不被 State 回退覆盖。
3. **门槛关系**：State 转换条件**借用** Confidence 等级作为最低门槛（如 Verified 需 Confidence ≥ 中）,但 Confidence 达标**不**意味着 State 必须升级——State 升级还需 §7 Decision Readiness Checklist（针对 Decision）或人工评审。

**反例**（混淆两个维度）：

- ❌ "这条 Hypothesis 标了 Confidence 高,所以可以直接写入 ADR" —— 违反 §2.3 禁止跳级（Hypothesis → Decision 必须经 Verified）
- ❌ "Decision 状态的结论一定是 Confidence 高" —— 特殊情形下 Decision 可为中（如来源极权威且通过 Checklist）,Confidence 与 State 不一一对应
- ❌ "新证据颠覆原结论,所以把原 Confidence 改为低" —— 应保留原 Confidence 标注,State 回退到 Unknown（§5）,新结论重新走状态机

**成熟实践映射**：
- Confidence 与 State 正交 ↔ **Bug 状态机（New/Confirmed/Fixed/Closed）与严重度（Critical/Major/Minor）正交** —— 一条 Bug 可严重度不变而状态流转,也可状态不变而严重度调整（如复现条件变化）
- Confidence 借用为 State 转换门槛 ↔ **CI 流水线 stage gate 借用测试覆盖率作为门控** —— 覆盖率是属性,stage 是流程位置,门控借用属性但不等同属性

---

## 5. Unknown 状态原则

### 5.1 允许 Unknown

ADR / 调研结论允许暂时停在 Unknown,**不强制补成 Yes/No**。

### 5.2 何时必须标 Unknown

- 官方文档未说明
- 源码 minified 无法确定语义
- 多源冲突未解决
- 未实测

### 5.3 Unknown 不是失败

Unknown 是诚实记录。**补成 Yes/No 才是失败**——因为低置信度结论写成确定事实后,会被当作 Decision 引用,导致下游错误。

### 5.4 实例

调研中若"<目标系统是否自动发现某路径>"官方文档未说明,应标 Unknown,而非基于其他子系统的行为推断"<目标系统也支持>"。

---

## 6. Conflict Registry（证据冲突登记）

### 6.1 何时登记

不同证据类型对同一问题给出矛盾答案时。

### 6.2 登记内容（空模板）

> 以下为空模板。接入项目时填入实际冲突实例。

| 字段 | 内容 |
|------|------|
| 冲突问题 | （填写：调查中的对立命题）|
| 来源 A | （填写：来源类型 + 引文 + URL/路径）|
| 来源 B | （填写：来源类型 + 引文 + URL/路径）|
| 来源 C | （填写：来源类型 + 引文 + URL/路径,如无则留空）|
| 当前置信度 | （填写：低/中——多源冲突）|
| 待验证事项 | （填写：下一证据类型 + 验证步骤）|

### 6.3 禁止立即裁决

冲突登记后**不允许立即选择一方**,必须列出待验证事项,等更多证据（见 §8 Evidence Escalation）。

### 6.4 冲突本身就是知识

冲突不是"谁对谁错",而是"存在张力"。记录冲突比消除冲突更有价值——因为消除可能是错的。

---

## 7. Decision Readiness Checklist

写入 ADR 或更新长期规则前,必须通过：

- [ ] 是否仍存在 Unknown？（若是 → 不可进入 ADR,标 Unknown）
- [ ] 是否仍存在未解决冲突？（若是 → 登记 Conflict Registry,不可进入 ADR）
- [ ] 是否所有关键结论达到 Verified？（若否 → 降为 Hypothesis）
- [ ] 是否只是合理推测而非已验证事实？（若是 → 降为 Hypothesis）
- [ ] 是否标注了所有结论的 Confidence？（若否 → 补标注）

**只有全部通过,才能进入 ADR。**

---

## 8. Evidence Escalation（证据升级）

证据冲突时**自动升级**,而非继续在同一证据类型里打转。

```
Level 1: 官方文档
  ↓ 冲突
Level 2: SDK Example / 官方示例
  ↓ 冲突
Level 3: 源码（unminified 优先,minified 仅用于定位）
  ↓ 冲突
Level 4: 实测（实验优先,见 §9）
```

**禁止模式**：`grep → grep → grep → grep`（同一证据类型连续使用未解决冲突）。

**允许模式**：`官方 → Example → 源码 → 实测`（跨证据类型升级,即使连续 4 次修正也说明调查越来越深入）。

---

## 9. 实验优先原则

当 Observation 成本 > Experiment 成本时,**优先实验**。

**通用实例**：
- 问题："<目标系统是否支持某行为？>"
- Observation 路径：分析大型 minified 代码（数小时,可能误读）
- Experiment 路径：构造最小复现 + 触发 + 观察结果（10 分钟）
- **应优先实验**

**反例**：花大量时间分析 minified 代码推断行为和格式,实际 fetch 官方文档或实测一次就能解决。

---

## 10. Investigation Note

ADR 之前应有 Investigation Note 记录证据链,**不直接从搜索跳到 ADR Update**。

**格式**：

```
## Investigation Note: <主题>
日期：YYYY-MM-DD

### Observation
- <直接观察 1>
- <直接观察 2>

### Evidence
- <证据 1>（来源：<类型>,置信度：<高/中/低>）
- <证据 2>（来源：<类型>,置信度：<高/中/低>）

### Hypothesis
- <假设 1>（基于证据 1+2,置信度：<高/中/低>）

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

### 11.3 与执行门控文件的协作

| 场景 | 本文件 | 执行门控文件（如 dev-rules.md）|
|------|--------|-------------|
| 形成结论时 | 定义状态机和置信度 | 执行门控章节引用本文件 |
| 证据冲突时 | §6 Conflict Registry + §8 Escalation | Evidence Collapse 门控 |
| 方向偏离时 | — | Direction Drift 门控 |
| 核心命题翻转时 | — | Core Proposition Flip 门控 |

> **接入提示**：若你项目的执行门控文件名不同（如 `guard-rules.md`）,替换上表"执行门控文件"列即可。

---

## 12. 不做的事

- 不收录功能专属的证据规则（那些留在对应的功能级规则文件）
- 不预写"未来可能用到"的证据类型
- 不替代执行门控文件（本文件只定义"如何形成结论",不定义"何时必须停"）

---

## 13. 源由与评审记录

本框架由外部评审反馈催生。两份外部评审独立指出：

1. **评审一**：核心根因是"证据治理失败"——没定义"不同证据分别能回答什么问题"；建议 Observation/Inference/Conclusion 分离 + Confidence 标注。
2. **评审二**：核心根因是"证据状态管理失败"——从证据直接跳到结论,跳过 Hypothesis；建议 Observation → Evidence → Hypothesis → Verified → Decision 状态机。

两份评审共识：本框架作为上层元规则,执行门控文件作为执行门控,ADR 作为实际应用。三层结构不重叠。

> **接入提示**：若你项目无外部评审历史,本节可改为"设计意图自述"——说明本框架要解决的核心风险（跳级 / 单源裁决 / 解释当观察）即可。

---

## 14. 产源说明（成熟实践映射）

依据"优先借鉴成熟实践,非重新发明"约束,本框架的各组成部分产源如下：

| 本框架章节 | 成熟实践 | 本地扩展（AI 工作流特殊性）| 创新部分 |
|----------|---------|--------------------------|---------|
| §2 证据生命周期状态机 | **EBSE（Evidence-Based Software Engineering）**——Kitchenham et al., 2004；科学方法的 Observation → Hypothesis → Experiment → Conclusion | 增加 Evidence 中间状态（区分"原始观察"与"支持假设的证据"）| 无 |
| §2.4 Observation vs Inference 分离 | **科学方法 + RCA（Root Cause Analysis）**——观察与解释分离是 RCA 基本原则 | 无 | 无 |
| §3 证据职责分工（含社区活动）| **EBSE 证据分级** + **EBSE 三角验证（Triangulation）** + **Mixed Methods Research**——不同证据类型回答不同问题 | 针对 AI agent 调研场景的具体证据类型映射（minified/官方/Example/实测/社区活动）| 无 |
| §4 Confidence 模型 | **EBSE 证据等级** + **CER（Claim-Evidence-Reasoning）** | 简化为高/中/低三档 + ★ 标注 | 无 |
| §5 Unknown 状态 | **科学方法**——"I don't know"是合法答案；**RCA**——未确认原因时停止而非猜测 | 显式允许 ADR 暂停于 Unknown | 无 |
| §6 Conflict Registry | **RCA**——记录矛盾证据而非急于裁决；**ADR**——记录决策时的反对意见 | 无 | 无 |
| §7 Decision Readiness Checklist | **ADR Methodology**——决策前的 context/problem/considered alternatives；**Definition of Ready（Scrum）** | 针对 AI agent 跳级问题的具体检查项 | 无 |
| §8 Evidence Escalation | **RCA 5 Whys**——逐层深入；**PDCA**——Plan/Do/Check/Act 升级 | 证据类型升级路径（官方→Example→源码→实测）| 无 |
| §9 实验优先 | **Lean Startup**——Build-Measure-Learn；**EBSE**——empirical evidence 优于 analytical reasoning | 针对 AI agent 倾向于分析 minified 代码的修正 | 无 |
| §10 Investigation Note | **Lab Notebook / Research Log**——科学研究的实验记录簿 | 格式标准化为 Observation/Evidence/Hypothesis/Verified/Decision | 无 |
| §15 结论时效性模型 | **Refresh Token 生命周期** + **Nutrition Facts"as of"标注** | ADR frontmatter 加 `evidence_as_of` / `expires_if_unchanged` 字段 | 无 |
| §17 调研可复现性 | **SLR 检索协议（Kitchenham & Charters 2007）** + **Lab Notebook** | 强制 query 列表 + 时间戳 + 命中数三字段 | 无 |
| §19 Hypothesis 生命周期 | **Lab Notebook 实验记录的"待验证假设"追踪** + **Scrum 任务的 Definition of Done** | 显式声明日 / 必须补证日 / 超期处置三字段 | 无 |
| §20 子代理协作 | **学术引用的 primary source 追溯** + **Fact-checking 的 temporal consistency check** | 同源检测规则 + 日期异常检测 | 无 |

**结论**：本框架**无创新部分**——所有组成部分均有成熟实践对应。本地扩展仅是"针对 AI agent 调研工作流的场景适配"（如 minified 代码风险、Confidence 简化为三档、子代理同源检测）。

**反思**：设计过程中曾把"证据治理"当作新概念提出,实际是 EBSE + RCA + ADR Methodology 的组合应用。按"优先借鉴成熟实践"约束,应在最初就映射到 EBSE,而非自创术语。

---

## 15. 结论时效性模型

> **源由**：外部生态类结论（社区活跃度 / 包下载量 / 上架数 / GitHub 活动 / 官方文档版本）时效期短于 ADR 复查节奏——若无机制触发复查,过时结论会被当作 Decision 引用。

涉及**外部生态**的结论默认时效期 **14 天**。超期需复查或加 `stale` 标注。

涉及**官方文档/版本号**的结论,时效期绑定为"下一版本发布"或 **30 天**（取先到者）。

涉及**源码快照（main/master 分支）**的结论（如"X 函数在第 N 行实现 Y" / "X hook 注册路径" / "X bug 触发链"）,时效期 **7 天**——上游 main 持续演进（PR 合并 / 重构 / 回滚）,snapshot 失效速度远高于 release 生态。**release tag 源码**不属本类,按"官方文档/版本号"对待（绑定为"下一版本发布"或 30 天）。

**判别要点**：
- 抓取自 `main` / `master` / 默认分支 → 源码快照类（7 天）
- 抓取自 release tag / 已发布版本号 → 官方文档类（30 天或绑版本）
- 不确定时取较短时效期

**ADR frontmatter 强制字段**（新增 ADR 必填,存量 ADR 在下次 Update 时补）：

```yaml
evidence_as_of: <YYYY-MM-DD>           # 结论形成日
expires_if_unchanged: <YYYY-MM-DD>     # 默认 evidence_as_of + 7 天（源码快照 main）/ + 14 天（外部生态）/ + 30 天（官方文档/release tag）
evidence_source_kind: <source-snapshot-main | ecosystem | doc-release>  # 时效类别,用于自动计算
```

> **接入提示**：以下为时效期处置通用模板。具体 ADR 编号、复查结论、是否降级由接入项目按模板填写。

**超期处置**（通用模板）：
1. 引用某 ADR 结论作为新决策论据前,**必须**先复查
2. 复查通过：更新 `evidence_as_of` 与 `expires_if_unchanged`
3. 复查失败：降级为 Hypothesis,登记 Conflict Registry（§6）
4. 未复查：禁止作为新决策的论据（见执行门控文件的相关章节）

**成熟实践映射**：
- 时效期模型 ↔ **Refresh Token 生命周期**（认证令牌的过期与刷新机制）+ **Nutrition Facts"as of"标注**（科学数据的有效期声明）
- 源码快照时效分类 ↔ **VCS pinned commit vs rolling branch**（包管理中 commit hash 锁定与 floating tag 的可信度差异）+ **Reproducible Build 的源码快照声明**（可复现构建要求声明源码取自哪一 commit,rolling 分支必须明确取点）

---

## 16. 社区活动证据职责（已合并至 §3）

本节内容已合并至 [§3 证据职责分工](#3-证据职责分工) 表格末尾（社区活动 4 行）及反例列表。

---

## 17. 调研可复现性

> **源由**：调研类结论仅自述"搜过某主题",未记录 query 列表——无法复现,且无法核查调查范围是否充分。

调研类结论（"无 X" / "社区无 Y" / "找不到 Z"）**必须**记录以下可复现信息：

| 字段 | 必填 | 示例 |
|------|------|------|
| query 列表 | ✅ | `"<主题关键词>"`, `"<主题> 教程"`, `"<包名> 实战"` |
| 搜索引擎 | ✅ | Google / Bing / DDG / 包管理搜索 / GitHub search / 知乎搜索 |
| 时间戳 | ✅ | YYYY-MM-DD HH:MM <时区> |
| 命中数 | ✅ | 约 N 条结果（或"零结果"）|
| 前 3 条命中摘要 | 选填 | 标题 + URL + 一句话相关性判断 |

**禁止**：
- 仅自述"搜过 X"而不记录 query 列表——无法复现的调研**不可写入 ADR**
- 仅用一个 query 下"无 X"结论——至少 3 个不同角度的 query

**Investigation Note 强制位置**：调研记录必须放在 [§10 Investigation Note](#10-investigation-note) 的 Observation 段,不可仅写在 ADR 的 Context 中。

**成熟实践映射**：
- 调研可复现性 ↔ **科学方法实验记录（Lab Notebook）** + **Systematic Literature Review（SLR）的检索协议**——Kitchenham & Charters (2007) 要求 SLR 明确记录检索式、数据库、时间范围、命中数

---

## 18. 产源说明（§15-§17 补充）（已合并至 §14）

本节产源表已合并至 [§14 产源说明](#14-产源说明成熟实践映射) 表格：§15/§17/§19/§20 行新增,§16 产源并入 §3 行。§15-§20 无创新部分,均为成熟实践的本项目适配。

---

## 19. Hypothesis 生命周期管理

> **源由**：项目健康度审查发现多条 Hypothesis 无补证计划,即将超期却无机制触发复查。Hypothesis 登记无"生命周期管理",与 §15 ADR 时效性模型形成断层。
>
> **设计意图**：Hypothesis 是 [§2.1 状态机](#2-证据生命周期状态机) 的中间状态——已基于证据形成解释,但尚未达到 Verified。Hypothesis **不是"暂存区"**,而是"待补证活跃态",必须有生命周期终点。无终点的 Hypothesis 会沉积为"既不能用于决策、又不会被否决"的僵尸假设,污染后续推理。

### 19.1 生命周期字段

每条 Hypothesis **必须**在所在 Investigation Note 中登记以下字段：

| 字段 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `声明日` | ✅ | Hypothesis 形成日（YYYY-MM-DD） | YYYY-MM-DD |
| `必须补证日` | ✅ | 默认 `声明日 + 14 天`（外部生态）/ `+30 天`（官方文档/版本号） | YYYY-MM-DD |
| `补证路径` | ✅ | 升级到 Verified 所需的下一证据类型（按 [§8 Evidence Escalation](#8-evidence-escalation)） | 实测 / unminified 源码 |
| `超期处置` | ✅ | `降级为 Unknown` / `排除出结论链` / `保留并延期（需说明理由）` | 降级为 Unknown |

### 19.2 超期处置规则

1. **未超期**（`必须补证日` 在未来）：可继续作为 Hypothesis 引用,但**不可**作为 Decision 论据（[§2.3 禁止跳级](#23-禁止跳级)）
2. **已超期**（`必须补证日` 在过去）：
   - 停止引用该 Hypothesis 作为推理依据
   - 按 `超期处置` 字段执行（降级或排除）
   - 登记 [Conflict Registry（§6）](#6-conflict-registry证据冲突登记) 若涉及冲突
3. **缺字段**（存量 Hypothesis 未填）：在下次 Investigation Note 修改时补齐；引用前需人工判断时效

### 19.3 与 §15 ADR 时效的关系

| 维度 | [§15 ADR 时效](#15-结论时效性模型) | §19 Hypothesis 生命周期 |
|------|-------------|----------------------|
| 适用对象 | 已达 Decision 状态的 ADR 结论 | 处于 Hypothesis 中间状态的假设 |
| 默认时效 | 14 天（外部生态）/ 30 天（官方文档） | 14 天（外部生态）/ 30 天（官方文档） |
| 超期后果 | 降级为 Hypothesis,触发复查 | 降级为 Unknown 或排除出结论链 |
| 登记位置 | ADR frontmatter `evidence_as_of` / `expires_if_unchanged` | Investigation Note 内 Hypothesis 段 |

**联动**：ADR 超期降级为 Hypothesis 后,自动适用 §19 生命周期管理；Hypothesis 升级为 Verified 并写入 ADR 后,适用 §15 时效模型。两者构成"结论时效双轨制"——已定论结论与未定论假设各有生命周期,互不遗漏。

### 19.4 登记表模板

Investigation Note 的 Hypothesis 段应采用以下格式：

```
### Hypothesis
- H1: <假设陈述>（基于证据 X+Y,置信度：低/中）
  - 声明日: YYYY-MM-DD
  - 必须补证日: YYYY-MM-DD
  - 补证路径: <下一证据类型>
  - 超期处置: <降级为 Unknown / 排除 / 保留并延期（理由）>
- H2: ...
```

### 19.5 复查节奏

- **触发**：每次会话开始读 Investigation Note 时,检查 Hypothesis 字段是否超期
- **批量复查**：定期文档健康度审查时,统计超期 Hypothesis 数量
- **退役**：Hypothesis 升级为 Verified 或降级为 Unknown 后,从活跃 Hypothesis 清单移除,但保留在原 Investigation Note 中作为推理历史

### 19.6 存量 Hypothesis 补登

> 以下为空模板。接入项目时填入实际未登记生命周期的存量 Hypothesis。

| Investigation Note | Hypothesis 项 | 来源 |
|------------------|-------------|------|
| （填写：调研记录路径）| （填写：H1 / H2 / U 项编号）| （填写：审查批次）|
| （填写：调研记录路径）| （填写：H1 / H2 / U 项编号）| （填写：审查批次）|

**成熟实践映射**：
- Hypothesis 生命周期 ↔ **Lab Notebook 实验记录的"待验证假设"追踪** + **Scrum 任务的 Definition of Done**——假设必须有"完成"或"放弃"的判据,不可无限期待定
- 与 §15 一致,无创新部分,均为成熟实践的本项目适配

---

## 20. 子代理协作证据规则

> **源由**：子代理单源声明被主 agent 直接采信进入 Verified 清单,后审查发现日期异常（未来日期）+ 无独立佐证,排除为幻觉。
>
> **设计意图**：多子代理协作时,"子代理 A 说 X" + "子代理 B 说 X" 不等于"双来源验证"——若 A 和 B 引用同一上游源（如同一搜索结果、同一文档）,仍为单源。主 agent 综合子代理报告时,必须按本节规则重新分类证据等级,不可直接继承子代理声明的等级。

### 20.1 子代理单源声明降级规则

| 子代理声明 | 主 agent 综合时分类 | 理由 |
|-----------|-------------------|------|
| "搜索命中 X" / "找到 PR #N" | **Hypothesis**（待交叉验证） | 子代理搜索结果可能为幻觉（LLM 生成式检索）,需独立工具或人工复核 |
| "源码 L123 含 Y" | **Likely**（若主 agent 可直接读源码复核）→ 复核后 **Verified** | 源码是可复核的客观事实,但子代理可能误读,需主 agent 独立读取同一行 |
| "官方文档说 Z" | **Hypothesis**（待交叉验证） | 子代理可能误引 URL 或编造文档内容,需 WebFetch 独立验证 |
| "多个子代理均报告 W" | **不自动升级**——需检查是否同源 | 多子代理同源 ≠ 多源（见 §20.2） |

### 20.2 同源检测规则

主 agent 综合多子代理报告时,必须检查证据来源是否独立：

1. **URL 独立性**：子代理 A 引用 `https://X`,子代理 B 引用 `https://Y` → 独立；均引用 `https://X` → 同源
2. **文档独立性**：子代理 A 读 `file1.md`,子代理 B 读 `file2.md` → 独立；均读 `file1.md` → 同源
3. **推理链独立性**：子代理 A 基于证据 P 推出结论,子代理 B 基于证据 Q 推出同一结论 → 独立；子代理 B 引用"A 说过" → 同源（传递依赖）

**同源处理**：同源证据按单源处理,不得因"多个子代理报告"升级为 Likely 或 Verified。

### 20.3 日期异常检测规则

子代理声明的证据若含日期,主 agent 必须检查：

| 异常类型 | 判定 | 处理 |
|---------|------|------|
| 未来日期（晚于当前会话日） | **幻觉强信号** | 立即排除,登记 [§6 Conflict Registry](#6-conflict-registry证据冲突登记) |
| 超出知识截止日期但非未来 | **弱信号** | 需独立工具（WebSearch / WebFetch）验证 |
| 与已知事件时间线矛盾 | **弱信号** | 需交叉验证 |

### 20.4 主 agent 综合流程

主 agent 综合多子代理报告时,必须执行：

1. **证据类型重分类**：按 [§4 Confidence 模型](#4-confidence-模型) 重新分类每条子代理产出的证据,不得直接继承子代理声明的等级
2. **同源检测**：按 §20.2 检查多子代理报告是否同源
3. **日期异常扫描**：按 §20.3 扫描所有含日期的声明
4. **Conflict Registry 登记**：发现的冲突按 [§6](#6-conflict-registry证据冲突登记) 登记
5. **单源声明标注**：未通过交叉验证的单源声明,必须显式标注 "Hypothetical（待交叉验证）",不得进入 Verified 清单

### 20.5 与执行门控文件的关系

- 执行门控文件"双来源验证"规定"单源只能到 Hypothesis"——本节 §20.1 是其在子代理协作场景的具体化
- 执行门控文件"Evidence Collapse 风险"规定"主 agent 综合时须做证据类型升级检查"——本节 §20.4 是其执行流程
- 本节无创新规则,均为执行门控文件在子代理协作场景的执行细则

**成熟实践映射**：
- 子代理同源检测 ↔ **学术引用的 primary source 追溯**——多个二次文献引用同一原始论文,仍计为一个原始来源
- 日期异常检测 ↔ **Fact-checking 的 temporal consistency check**——未来日期是 LLM 幻觉的已知模式
- 与 §15 / §19 一致,无创新部分,均为成熟实践的本项目适配

---

## 修改提示

接入新项目时,需替换以下项目取值：

### 路径与文件名类

| 原项目取值 | 替换为 | 影响章节 |
|----------|-------|---------|
| `docs/decisions/investigation/` | 你项目的调研记录目录（如 `docs/research/` / `docs/adr/notes/`）| §10 / §19.6 |
| `dev-rules.md` | 你项目的执行门控文件名 | §11.3 / §15 超期处置 / §20.5 |
| `reviewer-personas.md` | 你项目的工程规范文档（若有）| §14 反思段 |
| Investigation Note 文件命名约定 | 你项目的命名约定 | §10 / §19.4 |

### 阈值与时效期类

| 原项目取值 | 替换为 | 影响章节 |
|----------|-------|---------|
| 源码快照时效 7 天 | 按上游演进速度调整（快速迭代 3 天 / 慢速 14 天）| §15 / §19.1 |
| 外部生态时效 14 天 | 按生态变动速度调整 | §15 / §19.1 |
| 官方文档时效 30 天 | 按发版节奏调整 | §15 / §19.1 |
| Hypothesis 必须补证日（声明日 + N 天）| 与上述时效期对齐 | §19.1 |
| "至少 3 个不同角度的 query"中的 3 | 按调研主题广度调整 | §17 |

### 字段名类

| 原项目取值 | 替换为 | 影响章节 |
|----------|-------|---------|
| ADR frontmatter 字段 `evidence_as_of` / `expires_if_unchanged` / `evidence_source_kind` | 你项目 ADR 模板支持的字段；若 ADR 无 frontmatter,改为正文首段标注 | §15 |
| `evidence_source_kind` 枚举值 `source-snapshot-main` / `ecosystem` / `doc-release` | 按你项目的证据来源分类调整 | §15 |

### 场景类

| 原项目取值 | 替换为 | 影响章节 |
|----------|-------|---------|
| 子代理协作场景（主 agent + 多子代理）| 若你项目为单 agent → 删除 §20 整节；若对等多 agent → 改为对等节点同源检测 | §20 |
| 每月文档健康度审查 | 改为你项目的定期审查节奏（sprint / 季度 / 发版前）| §19.5 |
| 外部评审历史（§13）| 若无外部评审,改为"设计意图自述" | §13 |

### 实例数据类

| 原项目取值 | 替换为 | 影响章节 |
|----------|-------|---------|
| §6 Conflict Registry 空模板 | 接入后填入实际冲突实例 | §6.2 |
| §19.6 存量 Hypothesis 补登空表 | 接入后填入实际存量 Hypothesis | §19.6 |
| §1 / §5.4 / §9 中通用化的 `<目标系统>` 占位符 | 替换为你项目的具体调查对象 | §1 / §5.4 / §9 |

---

> **使用约束**：本示例包保留判定动作（状态机 / 证据类型层级 / Conflict Registry 机制 / Evidence Escalation 升级路径 / Hypothesis 生命周期 / 子代理同源检测）。项目取值已在上方"cline++ 特定假设"和"修改提示"两区显式列出——接入时按表逐项替换即可,无需重新设计机制。
