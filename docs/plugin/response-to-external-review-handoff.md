# 项目方回应 — Handoff 机制化基石方向

> **文档性质**：项目方对外部评审的正式回应材料
> **回应对象**：[external-review-handoff-foundation.md](external-review-handoff-foundation.md) 中归档的外部评审意见
> **撰写日期**：2026-07-01
> **用途**：作为下一轮外部评审的输入材料，提供项目实际上下文 + 项目方对评审建议的消化判断 + 待外部评审回答的具体问题
> **关联**：[ADR-001](../decisions/ADR-001-handoff-compact-memory.md) · [ADR-005](../decisions/ADR-005-split-compact-from-handoff.md) · [design.md](design.md) · [mechanism-candidates.md](../mechanism-candidates.md) #5/#6 · [evidence-governance.md](../evidence-governance.md) · [dev-rules.md](../dev-rules.md)

---

## 0. 本材料的立场

我们认同评审关于「三大特色 + 三大隐患」的判断框架。但在落地路径上，项目自身有几个硬约束是评审建议未触及的，这些约束会直接影响 schema 化的边界、载体和成本。本材料的目的是把这些约束摆出来，并提出一个我们认为比「要不要采纳 schema 草案」更靠前的决策点。

本材料**不是**对评审建议的逐条回应，**不是**实施方案，**不是**新 ADR。它是一份"项目上下文补全 + 关键决策点前置 + 待回答问题清单"的输入材料。

---

## 1. 项目实际上下文（评审建议落地前必须知道的）

### 1.1 handoff 和 context snapshot 是两个已被 ADR-005 拆分的独立机制

评审通篇把 handoff.md 和 context snapshot 当作一个对象讨论。但项目在 2026-06-28 已通过 [ADR-005](../decisions/ADR-005-split-compact-from-handoff.md) 决议将两者拆分：

| 维度 | context snapshot | handoff |
|------|-----------------|---------|
| **目的** | 窗口内压缩（token 管理）| 跨会话状态恢复（状态持久化）|
| **触发** | token 阈值（被动）| 用户指令 / 决策信号 / 长会话（主动）|
| **产物** | `~/.cline/data/snapshot/*.md`（plugin 自动生成）| `docs/handoff.md`（人工撰写）|
| **消费者** | Cline rules 注入（机读）| 下一个 agent / 人（人读为主）|
| **负责方** | Plugin（[snapshot-writer.ts](../../context-snapshot/src/snapshot-writer.ts)）| 用户 + 规则（[dev-rules.md §2](../dev-rules.md)）|
| **Git 追踪** | 否（运行时产物）| 是（每次写入后立即 commit）|

**拆分理由**（ADR-005 原文）：「compact 是 Cline 的事，handoff 是 Plugin/用户的事。共享 'handoff' 一词导致代码注释、函数名、文件名误导后续维护者。」

**对评审建议的影响**：评审说的「三字段升级」「schema 化」「依赖图」——这些措施落到 snapshot 还是落到 handoff.md，成本和阻力完全不同。这个区分在评审原文里是缺失的。

### 1.2 项目已有一套「隐性证据协议」——evidence-governance.md

评审指出「证据分级 + 假设编号是真正的亮点」，并建议字段化。项目其实已有一份完整的 [evidence-governance.md](../evidence-governance.md)（Level 1 元规则），定义了：

- **五状态证据生命周期**：Observation → Evidence → Hypothesis → Verified → Decision
- **Confidence 三档**：高（≥3 独立证据）/ 中（2 独立证据）/ 低（单源或冲突）
- **Conflict Registry**：证据冲突登记表，禁止立即裁决
- **Evidence Escalation**：跨证据类型升级路径（官方 → Example → 源码 → 实测）

handoff.md 里出现的 `H1-H4` / `O1-O7` / `Likely / Hypothetical / Verified` 不是即兴写法，而是这套元规则在 handoff 文档层的投影。

**对评审建议的影响**：评审建议的 `confidence` 字段，项目已有成熟词汇表（高/中/低 ↔ Verified/Likely/Hypothesis）。schema 化时不需要新造枚举，直接对接 evidence-governance.md §4 即可。但这也意味着——「字段化」不是从零开始，而是把已有元规则从「调查笔记层」提升到「handoff 层」。这一步的迁移成本和潜在回退风险需要评估。

### 1.3 handoff.md 的写作受 dev-rules.md §2 硬规则约束

[dev-rules.md §2](../dev-rules.md) 定义了 handoff.md 的写入触发器：

- **触发器 a**：用户口头要求（无条件）
- **触发器 c**：用户消息 ≥8 轮 + 话题已跳 + 上下文 ≥70%（仅提议，用户拍板）

§2.1 子条款：写入后必须立即 git commit，message 格式 `handoff: <一句话摘要>`。

**关键约束**：触发器 a 是「无条件立即执行」——用户说「写 handoff」时，agent 必须立刻产出，不能因为「schema 字段没填全」而拖延或要求补充。这意味着任何 schema 化方案必须满足「30 秒内可产出」的硬约束，否则会与触发器 a 冲突。

**对评审建议的影响**：评审建议的「强制三字段」如果落到 handoff.md，每次触发器 a 触发时，agent 必须在产出文档的同时填完 `id` / `confidence` / `depends_on`。这在技术上可行（agent 自己生成 ID），但需要验证是否会拖慢 handoff 产出节奏，进而触发「写 handoff」的心理抗拒。

### 1.4 当前受 §1.15 codec bug 阻塞，handoff 正式开发尚未启动

[dev-rules.md §1.15](../dev-rules.md) 声明的不可抗力：

| 环境 | 状态 | 影响 |
|------|------|------|
| VS Code 扩展 4.0.x（plugin 系统）| 不可用 | 所有 plugin 实测改走 CLI |
| CLI 3.0.34 codec bug | 部分受限 | 🔴 snapshot 长对话实测搁置；🟡 Loop Guard 带观察推进；🟢 setup/rules 短交互可推进 |

context-snapshot plugin v0.6.0 的 6 项核心功能中，5 项已通过 workaround 验证，但**真实长对话路径**（90K tokens 触发 compact）仍受 codec bug 阻塞。这意味着：

- 评审建议中涉及「自动生成 schema 化产物」的部分，目前只能在 workaround 路径上验证
- handoff 正式开发（mechanism-candidates #5/#6 推进到 m）的前置条件是 codec bug 修复或绕过

**对评审建议的影响**：评审建议的落地时机受外部环境约束。我们已将评审材料归档为「待激活」，触发条件是 codec bug 解除或 #5/#6 推进到正式机制化。

### 1.5 项目有「机制化漏斗」——schema 化是漏斗中的 d→e 阶段

[mechanism-candidates.md](../mechanism-candidates.md) 定义了经验机制化的状态机：

```
o（观察）→ p（模式）→ r（规则）→ d（决策代码化）→ e（实验中）→ m（已机制化）→ x（已退休）
```

当前 #5（长会话 compact + handoff）和 #6（跨会话续作读 handoff）都停在「实验中（重构中）」。评审建议的 schema 化，本质上是把 handoff 从「r（规则）」推向「d（决策代码化）」——这需要经过 Gate 0（必须有 Runtime Event 接入点）和 Gate 0.5（这是系统问题，不是 Prompt/配置问题？）。

**对评审建议的影响**：评审建议中「每条决策补三字段」如果是人工填写，它是 Prompt/配置层的事，不进漏斗；如果是 plugin 自动生成，它需要 Runtime Event 接入点。这两种路径的工程量差一个数量级。

---

## 2. 项目方对评审三大特色的判断

### 2.1 特色一（证据分级 + 假设编号）——认同，且已有元规则支撑

评审判断准确。补充一点：这不是 handoff.md 的原创，而是 [evidence-governance.md](../evidence-governance.md) 元规则在 handoff 层的投影。handoff.md 里看到的 `H1-H4` / `O1-O7` 来自调查笔记（investigation-note）的编号体系，handoff 只是引用。

**这意味着**：如果要字段化 `confidence`，不需要在 handoff 层重新定义，直接对接 evidence-governance.md §4 的三档模型即可。schema 化的词汇表已就绪。

### 2.2 特色二（「答得上」出口判据）——认同，且已写入 plugin-dev-sop.md

评审判断准确。这条已固化在 [plugin-dev-sop.md §1-§2](plugin-dev-sop.md)，作为规划阶段的出口判据：「每步出口是'答得上来吗'——答不上来就是没到位，动作清单可以表演，答不上来表演不了。」

**这意味着**：如果 schema 化引入新字段，新字段的「填没填」不是出口判据，「填的字段能不能让下一个 agent 答得上问题」才是。这是对 schema 设计的额外约束——字段不能只为了「结构完整」而存在，必须能回答具体问题。

### 2.3 特色三（不可抗力显式声明）——认同，且已规则化为 dev-rules.md §1.15

评审判断准确。这条已从「handoff 里的好习惯」升级为 [dev-rules.md §1.15](../dev-rules.md) 永久规则，带影响分层（🔴/🟡/🟢）和恢复条件声明。

**这意味着**：评审建议的 `invalidated_when` / `last_verified` 字段，在「不可抗力」这一类结论上已有雏形（§1.15 表格的「恢复条件」列）。问题是如何把这种声明从「§1.15 专属」推广到「handoff 里所有关键结论」。

---

## 3. 项目方对评审三大隐患的判断

### 3.1 隐患一（人读优先，机读其次）——部分认同，但对象边界必须先划清

认同「缺少机器锚点」的诊断。但评审建议的 `state.json` / frontmatter 方案没有区分落到 snapshot 还是 handoff.md：

| 若落到 snapshot | 若落到 handoff.md |
|----------------|------------------|
| 成本低（plugin 自动生成，改 [snapshot-writer.ts](../../context-snapshot/src/snapshot-writer.ts) 即可）| 成本高（人工撰写，强制 schema 增加每次书写负担）|
| 消费者是 Cline rules 注入（机读天然适配）| 消费者是 agent + 人（人读叙事不能丢）|
| 与 ADR-005 已废弃的 index.jsonl 有概念重叠风险 | 与 dev-rules §2 触发器 a「无条件立即产出」有节奏冲突 |
| 可直接进 mechanism-candidates 漏斗的 d 阶段 | 需先回答「这是系统问题还是 Prompt 问题」（Gate 0.5）|

**项目方判断**：schema 化应**先落 snapshot，后落 handoff.md**。理由：
1. snapshot 是 plugin 生成，schema 化是代码层的事，不增加人工负担
2. snapshot 的消费者是 rules 注入，机读契约天然适配
3. handoff.md 的 schema 化需要先解决「触发器 a 节奏冲突」，这是规则层的事，滞后于代码层

**待外部评审回答**：这个「先 snapshot 后 handoff.md」的顺序是否合理？还是评审认为两者必须同步 schema 化才能构成「基石」？

### 3.2 隐患二（平面引用，不是图）——认同，且项目已有半结构化雏形

认同「依赖关系埋在散文里」的诊断。但项目已有两个半结构化的雏形：

**雏形 A**：[dev-rules.md §1.15](../dev-rules.md) 的不可抗力影响分层表（🔴/🟡/🟢 + 恢复条件），本质上是 `blocker → blocked` 关系表的特例。

**雏形 B**：[handoff.md](../handoff.md) §「未完成项 / 后续动作」表已隐含依赖关系，如：
- 「Loop Guard 注入层端到端验证」→ depends on → 「codec bug 修复」
- 「dual-setup 升级到 Verified」→ depends on → 「Cline 官方说明或源码证据」

这些依赖已在文字中表达，只是没字段化。

**项目方判断**：依赖图字段化的最低侵入方案是在 handoff.md 的「未完成项」表中新增 `blocker_ref` 列，而非另建独立的 `dependency-graph.md` 或 `state.json`。理由：
1. 未完成项是 handoff 每 30 秒就要读的部分，依赖关系放在这里最显眼
2. 独立文件容易脱管（参考 ADR-005 废弃 index.jsonl 的理由：自建索引与 Cline 原生存储职责重叠）
3. §1.15 的影响分层表已经是一种「局部依赖图」，推广到全 handoff 是增量演进，不是重构

**待外部评审回答**：`blocker_ref` 列方案是否足够？还是评审认为依赖图必须独立载体（如 `state.json` 的 `depends_on` 字段）才能回答「如果 codec bug 修了，哪些被阻塞项会自动解锁」这类查询？

### 3.3 隐患三（缺少状态新鲜度 / 失效条件）——认同，但需区分「结论」和「动作建议」

认同「陈旧信息被当现状」的风险。但项目已有 [dev-rules.md §1.13](../dev-rules.md) 结论时效性门控，针对 ADR 的 `evidence_as_of` / `expires_if_unchanged` 字段。问题是 §1.13 **未覆盖 handoff 文档本身**。

**关键区分**：handoff 里有两类内容，失效条件不同：

| 内容类型 | 示例 | 失效条件 |
|---------|------|---------|
| **结论型** | 「VS Code 4.0.4 仍是 pre-SDK」| 版本号变化（`invalidated_when: VS Code 4.0.5 release`）|
| **动作建议型** | 「监控关键词 Plugins / registerMessageBuilder」| 动作完成后（`invalidated_when: 关键词出现并确认`）|

评审建议的 `invalidated_when` / `last_verified` 对**结论型**适用，对**动作建议型**需要不同的字段（如 `completed_when`）。

**项目方判断**：时效性字段应扩展 §1.13 到 handoff，但需区分结论型和动作建议型。不要一刀切加 `invalidated_when`——动作建议的失效条件是「完成」不是「过期」。

**待外部评审回答**：是否同意区分两类内容？还是评审认为所有 handoff 条目都应有统一的 `invalidated_when`？

---

## 4. 项目方识别的关键决策点（比「要不要 schema」更靠前）

### 4.1 决策点：schema 化的对象边界

综合 §3.1 的分析，项目方认为最靠前的决策不是「要不要采纳 schema 草案」，而是：

> **schema 化的对象是 handoff.md、context snapshot、还是两者各自一套？**

三个选项：

| 选项 | 描述 | 利 | 弊 |
|------|------|----|----|
| **A. 只 schema 化 snapshot** | handoff.md 保持人读叙事 | 零人工负担；代码层改动；与 ADR-005 拆分一致 | handoff.md 仍是「写得很好的文档」，评审说的「可被任意 agent 解析的协议」落空 |
| **B. 只 schema 化 handoff.md** | snapshot 保持现状 | 直接解决跨 agent 移交的机读问题 | 与 dev-rules §2 触发器 a 节奏冲突；人工负担上升；handoff.md 的 schema 与 snapshot 的 5 节模板可能脱节 |
| **C. 两者各自一套 schema** | snapshot 用机读 schema，handoff.md 用 frontmatter + 表格列扩展 | 各自适配消费者；渐进式演进 | 两套 schema 需保持兼容；维护成本最高；可能重现 ADR-005 已解决的耦合 |

**项目方倾向**：选项 C，但**分阶段实施**——先做 snapshot 的 schema 化（低成本验证），再做 handoff.md 的 frontmatter 扩展（滞后于 snapshot 一到两个版本）。

**待外部评审回答**：
1. 选项 C 的分阶段实施是否可行？还是评审认为必须同步才能构成「基石」？
2. 若分阶段，第一阶段（snapshot schema 化）的验收标准是什么？是「snapshot 能被 rules 注入机读」还是「snapshot 能回答依赖图查询」？

### 4.2 决策点：人工撰写 vs plugin 生成的边界

评审建议的「三字段」如果落到 handoff.md，有一个根本问题：**handoff.md 是人工撰写的**（dev-rules §2 触发器 a 由 agent 产出，但格式和内容由用户/agent 协商）。三字段由谁填？

| 填写方 | 问题 |
|--------|------|
| **Agent 自动填** | agent 能生成 ID，但 `confidence` 判断需要调用 evidence-governance.md 的置信度模型——这是元规则层的判断，agent 每次 handoff 时都要跑一遍，是否拖慢产出？ |
| **人工填** | 违反 dev-rules §2 触发器 a「无条件立即执行」——用户说「写 handoff」时不能要求他先填字段 |
| **混合：agent 填草稿，人工 review** | 增加一轮交互，与触发器 a 的「立即产出」有张力 |

**待外部评审回答**：评审建议的三字段，在人工撰写的 handoff.md 上，预期是由 agent 自动填还是人工填？如果是 agent 自动填，`confidence` 字段的判断逻辑是否应固化到 plugin（即 handoff.md 也变成 plugin 生成）？如果是人工填，如何与触发器 a 协调？

### 4.3 决策点：schema 化与 mechanism-candidates 漏斗的对接

[mechanism-candidates.md](../mechanism-candidates.md) 的漏斗要求「d（决策代码化）」阶段必须通过 Gate 0（Runtime Event 接入点）和 Gate 0.5（系统问题 vs Prompt 问题）。

评审建议的 schema 化如果落到 handoff.md：
- 若是 agent 自动填字段 → Prompt 层的事 → 不进漏斗 → 用 dev-rules 规则约束
- 若是 plugin 自动生成 schema → Runtime 层的事 → 进漏斗 → 需通过 Gate 0/0.5

这两条路径的工程量差一个数量级。项目方需要知道评审建议走哪条路径，才能判断是否触发新 ADR 或在 ADR-005 下加 Update。

**待外部评审回答**：评审建议的 schema 化，预期走 Prompt 层（agent 行为约束）还是 Runtime 层（plugin 代码生成）？

---

## 5. 项目方希望外部评审回答的问题清单

汇总 §3、§4 的待回答问题：

| # | 问题 | 上下文 |
|---|------|--------|
| Q1 | schema 化应先落 snapshot 还是 handoff.md？还是必须同步？ | §3.1 / §4.1 |
| Q2 | 「先 snapshot 后 handoff.md」的分阶段实施是否可行？第一阶段验收标准是什么？ | §4.1 |
| Q3 | 依赖图字段化的 `blocker_ref` 列方案是否足够？还是必须独立载体？ | §3.2 |
| Q4 | 时效性字段是否需区分「结论型」和「动作建议型」？ | §3.3 |
| Q5 | 三字段（id/confidence/depends_on）在人工撰写的 handoff.md 上，由 agent 自动填还是人工填？ | §4.2 |
| Q6 | 若 agent 自动填，`confidence` 判断逻辑是否应固化到 plugin？ | §4.2 |
| Q7 | schema 化走 Prompt 层（规则约束）还是 Runtime 层（plugin 生成）？ | §4.3 |
| Q8 | 评审原提议的「结构化 schema 草案（五类对象）」，在项目方提出「对象边界」问题后，是否仍适用？需要修订吗？ | §4.1 |

---

## 6. 项目方的整体立场

1. **认同评审的方向判断**——handoff 有特色但不够协议化，从人读叙事升级为机读契约是正确方向
2. **认同评审的最小一步**——三字段（id/confidence/depends_on）是低切入点
3. **但坚持对象边界必须先划清**——schema 化落到 snapshot 还是 handoff.md，成本和路径完全不同，不能混为一谈
4. **坚持渐进式实施**——先 snapshot（代码层，低成本验证），后 handoff.md（规则层，需解决触发器 a 节奏冲突）
5. **坚持与既有元规则对接**——confidence 用 evidence-governance.md §4 词汇表，时效性扩展 dev-rules.md §1.13，不新造枚举
6. **不急着重做格式**——与评审建议一致，先在 1-2 份 handoff 上试运行三字段，验证书写负担，再决定全面 schema 化

---

## 修订记录

| 日期 | 变更 | 来源 |
|------|------|------|
| 2026-07-01 | 初版：项目上下文补全 + 评审建议消化判断 + 8 个待回答问题 | 项目方撰写 |
