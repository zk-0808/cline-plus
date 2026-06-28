---
id: D-2026-06-24-search-evaluate-p5-output-schema
date: 2026-06-24
topic: search-orchestrator
status: superseded
supersedes: []
superseded_by:
  - D-2026-06-25-search-redesign-p5-evidence-map
evidence:
  - file: search/search-orchestrator/survey.md
    section: "M5 结构化输出 / Output Schema（L49-54）"
  - file: search/search-orchestrator/survey.md
    section: "§9.3 最终路线状态 P5/P6（V2）：候选"
  - file: mechanism-candidates.md
    section: "条目 16 Output Schema 结构化抽取"
  - file: mechanism-candidates.md
    section: "条目 17 Highlights / Relevance Compression"
  - file: search/search-orchestrator/experiments/run-8a-mcp-backend.md
    section: "Run #8a 结论：基础设施层边际收益急剧下降"
  - file: decisions/D-2026-06-24-search-infra-mcp-upgrade.md
    section: "回滚动作 / 待 V2 路线决策"
---

# D-2026-06-24 — 评估 P5 Output Schema（启动决策草案）

## ⚠️ 命名冲突提示

本仓库内同时存在两个「P5」：

| 代号上下文 | 含义 | 出处 |
|----------|------|------|
| **本决策 P5** | search-orchestrator 路线图 P5：Output Schema 结构化抽取 | survey §9.3、mechanism-candidates #16 |
| ADR-002 P5 | 项目形态 P5：最小 Plugin 实验（CLI/SDK 沙盒） | ADR-002-project-shape.md |

二者是完全不同语境的代号，互不影响。本决策只讨论前者。后文中所有「P5」均指 search-orchestrator P5（Output Schema）。

---

## 决策

**superseded**：本决策曾启动 P5 Output Schema v1 评估；Run #9c 双盲验证后，字段对齐式 schema 被证伪，现由 `D-2026-06-25-search-redesign-p5-evidence-map` 取代为 Evidence Map / Claim Graph 重设计。

历史原始决策：启动 P5 Output Schema 评估。先写本决策草案落定问题定义、机制设想与验证方案；A/B 实验（Run #9）由后续会话执行。

## 一句话理由

Run #8a 已经把"继续优化抓取链路"这条路打死（TLS 假设 disproven，基础设施层边际收益急剧下降）；P5 是当前唯一既**不依赖已失败假设**、又对**全部三档 Tier（fetch / partial / snippet-only）同时受益**、且**实验成本低**的候选。

---

## Q1：现在的问题是什么

### 现状链路

search-orchestrator 当前 Phase 4 直接从证据生成答案：

```
Phase 1 Plan          → sub-questions
Phase 2 Search/Fetch  → snippet + (optional) cleaned text
Phase 3 Evaluate      → P3 evidence-bound citation（三档模式）
Phase 4 Synthesize    → LLM 自由文本生成答案
```

### 暴露的问题

Run #4 / Run #5 / Run #6 共同观察到的现象，按重要性排序：

| # | 问题 | 当前表现 |
|---|------|---------|
| 1 | **Claim 粒度不一致** | 同一份 sub-question 下，不同来源给出的"事实"粒度差异巨大（一句话 vs 一段背景 vs 一组特性列表），LLM 综合时难以对齐 |
| 2 | **不同来源难比较** | 没有统一字段位，LLM 看到 5 段散文必须自己抽 schema 再综合，抽错就影响结论 |
| 3 | **信息遗漏率不可观测** | 自由文本输出下，无法事后回答"原证据里的 X 字段是否被消化"——只能整体感受 |
| 4 | **Tier C 场景信息密度低** | snippet-only 时，本就稀少的字段被掩埋在 LLM 自由文本风格里，进一步丢失 |
| 5 | **P3 引文与 P5 抽取脱节** | P3 已经把"声明 ↔ 证据"绑定起来了，但绑定的"声明"仍是自由文本，不是 schema 字段 |

### 与 Run #8a 的关系

Run #8a 否决了「通过更强的 fetch 后端把中文 Tier C → Tier A」。这意味着：**未来很长一段时间，中文 query 大概率停留在 snippet-only**。在这个前提下：

- 继续优化 fetch 链路（M-22 Browser-backed Fetch）= 信息增益中、成本高
- P5 Output Schema = 即使输入只有 snippet，也能从有限字段里榨取最多结构化信息

P5 是**不依赖 fetch 覆盖率改善**的方向，因此优先级高于 M-22。

---

## Q2：P5 机制是什么

### 核心思路

把 Phase 4 从

```
证据 → 自由文本答案
```

改为

```
证据 → 结构化中间表示（schema）→ 自由文本答案
```

中间表示由 **sub-question 本身预声明 schema**，LLM 先按 schema 抽字段，再 reason。

### 示例（对比）

#### 当前（无 schema）

> sub-question：「调研主流开源监控方案，列出 OneUptime、SigNoz、Uptrace 的优劣对比」
>
> LLM 输出：
>
> > OneUptime 是一个轻量开源监控方案，部署简单……SigNoz 基于 ClickHouse，查询能力强但生态较新……Uptrace 主打 OpenTelemetry 集成……

问题：三个产品的字段不一一对应，难比较，难校验。

#### P5（有 schema）

> sub-question：「调研主流开源监控方案……」
>
> Phase 4 first step（按 schema 抽取）：
>
> ```yaml
> - service: OneUptime
>   language: Go
>   pros:
>     - simple deployment
>     - open source
>   cons:
>     - limited ecosystem
>   source: [E1, E2]
>
> - service: SigNoz
>   language: Go + TypeScript
>   storage: ClickHouse
>   pros:
>     - strong query
>   cons:
>     - newer ecosystem
>   source: [E3]
>
> - service: Uptrace
>   language: Go
>   pros:
>     - OpenTelemetry native
>   cons:
>     - smaller community
>   source: [E4]
> ```
>
> Phase 4 second step（综合）：基于上面 schema 生成自由文本答案，引用 source 字段对接 P3。

### Schema 来源

schema 不是预先写死的"对象库"，而是 **sub-question 阶段（Phase 1）由 LLM 即兴声明**。例如：

| sub-question 类型 | 自动声明的 schema |
|------------------|------------------|
| 对比型（多个候选） | `[{name, key_attr_1, key_attr_2, pros[], cons[], source[]}]` |
| 数值型（X 是多少） | `{value, unit, as_of_date, source[]}` |
| 时序型（演化历史） | `[{event, date, what_changed, source[]}]` |
| 因果型（为什么 X 导致 Y） | `{cause, mechanism, conditions[], evidence[], source[]}` |
| 列表型（X 有哪些做法） | `[{approach, applicability, trade_off, source[]}]` |

未来如果出现高频 sub-question 模式，可以把若干 schema 模板沉淀到 SKILL.md 作为软提示（不强制）。

### 与现有机制的关系

| 已有机制 | 与 P5 的关系 |
|---------|------------|
| P1 Goggle / P1.5 FinalScore | 上游：决定哪些证据进入 Phase 3，与 P5 无耦合 |
| P3 Evidence-bound Citation | **强协同**：P3 的"声明 ↔ 证据"绑定从"声明=自由文本句"升级为"声明=schema 字段"。引用粒度更精确 |
| P4 Same-source Merge | 上游：合并去重后再交给 P5 抽取，避免 schema 里出现重复实体 |
| Tier A/B/C | **正交**：三档都适用 P5；Tier C 下抽出的字段虽稀疏，仍优于自由文本 |

### 实现位置

- SKILL.md Phase 1 instructions：新增「为每个 sub-question 预声明 schema 字段」步骤
- SKILL.md Phase 4 instructions：新增 4.1 抽 schema → 4.2 综合两步
- 不动任何代码 / MCP / 工具

---

## Q3：怎么验证

### Run #9 设计（同批证据 A/B）

**严格单变量**：同一份 sub-questions + 同一份证据集合，只改 Phase 4 的处理方式。

| 维度 | Run A（Control） | Run B（Treatment） |
|------|-----------------|-------------------|
| Phase 1 plan | 标准（无 schema 声明） | 标准 + 每个 sub-Q 末尾声明 schema |
| Phase 2 search/fetch | 不动 | 不动 |
| Phase 3 P3 三档 | 不动 | 不动 |
| Phase 4 综合 | 直接生成答案 | 先抽 schema → 再综合 |
| 证据集 | 同一份 | 同一份（用 Run #4/#6 留存的中文证据，或新跑一份英文） |
| 其他变量 | 不引入 P6 / M-22 | 同 |

### 核心指标（4 项）

| 指标 | 定义 | 计算方式 |
|------|------|---------|
| **Claim Coverage** | 答案中 distinct claim 数 / 证据中可抽出的 distinct claim 总数 | 由审阅人对比 Run A 文本 vs schema 字段 |
| **Conflict Identification Rate** | 答案中显式指出的证据冲突数 / 证据集中实际存在的冲突数 | 审阅人提前标注冲突 ground truth |
| **Information Loss Rate** | 证据中存在但答案中未提及的关键字段数 / 关键字段总数 | 同上 |
| **Output Length Delta** | Run B 答案 token 数 / Run A 答案 token 数 | 直接 token 计数 |

### 评分尺度

| 分数 | 条件 |
|------|------|
| 5/5 | Claim Coverage 提升 ≥ 20%，Conflict ID 提升 ≥ 30%，Info Loss 下降 ≥ 30%，长度 delta < 1.3× |
| 4/5 | Claim Coverage 提升 ≥ 10% 且 Info Loss 下降 ≥ 20% |
| 3/5 | 任一主指标显著提升（≥ 15%），无明显退化 |
| 2/5 | 改善幅度 < 10%，但长度无失控 |
| 1/5 | 无改善 / Output Length 失控（≥ 2×）/ 抽 schema 引入幻觉字段 |

### 实验集

建议复用 Run #6 的中文 query（已知 Tier C 主导，能直接验证「P5 是否在 snippet-only 场景下也成立」），如证据集太少补一组英文。

### 不验证的事

- 不验证 schema 模板是否需要预定义（这是 V2.1 的问题）
- 不验证 schema 抽取是否需要工具化（先全提示词路线）
- 不验证多 sub-question 之间的 schema 一致性（先单 sub-Q 独立）

---

## 潜在风险

| 风险 | 描述 | 缓解 |
|------|------|------|
| Output Length 膨胀 | schema → 综合两步可能让答案变冗长 | 评分尺度对长度 delta 设硬约束（≥ 2× 直接 1/5） |
| Schema 幻觉 | LLM 在字段稀疏时编造数值 | 必须接 P3 evidence binding，无证据字段留空或标 `unknown` |
| Prompt 复杂度 | Phase 1 + Phase 4 双处改造，提示词量增加 | 先做最小实现（Phase 4 抽 schema 内嵌于 synthesize），不动 Phase 1；如效果好再外移到 Phase 1 |
| 与 P3 双重绑定 | claim 既要绑 evidence，schema 字段也要绑 source，可能冗余 | Run #9 评估时单独观察是否引入新混乱 |

## 共识来源

- GPT 评审：路径 A（P5）满足"不依赖失败假设 + 全 Tier 受益 + 实验成本低"三条
- 当前会话 Run #8a 结论：基础设施层边际收益快速下降
- mechanism-candidates #16/#17 已经把 schema 与 highlight 列为 V2 候选

## 后续动作

| 动作 | 状态 |
|------|------|
| 本决策草案落地 | ✅ 本会话 |
| survey §9.1 加入本决策 | ✅ 本会话 |
| mechanism-candidates #16 状态更新为「实验中」 | 待 Run #9 启动时 |
| 编写 run-9-p5-output-schema.md 实验框架 | 下次会话 |
| 准备 Phase 4 二阶段提示词 patch | 下次会话 |
| Run #9 执行 | 下次会话 |

## 不在本决策范围内

- P6 Highlights / Relevance Compression（mechanism-candidates #17）独立评估，本决策不耦合
- M-22 Browser-backed Fetch 状态调整为「候选（暂缓）」，仅当 Tier C 严重影响答案质量时再启动
