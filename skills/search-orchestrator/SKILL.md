---
name: search-orchestrator
version: 1.0.0
description: 搜索编排器 — 在任何网络搜索或多步骤调研前强制分解问题、列出假设、设计搜索路径并评估证据
category: workflow
preferred_mode: plan
tools: [use_mcp_tool, search_files]
permissions: [read_only]
context_priority: medium
dependencies: []
requires_mcp: ["duckduckgo"]
platform: any
min_cline_version: "3.0.0"
---

# Search Orchestrator

## 前置条件

- 用户需要此 Skill 对应的工作场景
- Cline 已正常运行
- 已配置可提供 `search` / `fetch_content` 两个工具的搜索 MCP server——见 [references/web-search-setup.md](references/web-search-setup.md)
  - V1 默认推荐：`duckduckgo-websearch`（Node + npx，零追加运行时）
  - 可替换为任何等价后端，Skill 层不变

## 输入 / 输出

本 Skill 是工作流方法论，无固定输入输出 schema。具体调用规范参见正文 Phase 1~4。

## 使用示例

参见 [examples/](examples/) 目录下的具体示例。


## Overview

Most search failures are not caused by poor search tools — they're caused by searching before understanding what to search for. This skill forces the agent to plan before searching, evaluate after searching, and iterate when evidence is insufficient.

**Core principle:** Plan → Search → Evaluate → Decide. Never search blindly.

## When to Use

Use before ANY task that involves:
- Web search (DuckDuckGo, Brave, Tavily, Exa, etc.)
- Multi-step research or investigation
- Technology evaluation or tool comparison
- Market research or competitive analysis
- Troubleshooting with unknown root cause
- Fact-checking or claim verification

**Skip only when:** The task is a single, unambiguous fact lookup (e.g., "What is the current version of Python?").

## The Iron Law

```
NO SEARCH WITHOUT A PLAN.
NO CONCLUSION WITHOUT EVALUATION.
```

If you haven't written down your search plan, you haven't started researching.

## Phase 0: Complexity Gate (Is Full Research Justified?)

Before committing to the full Plan→Search→Evaluate→Synthesize pipeline, assess whether the question warrants it. Most questions don't need all four phases.

### Research Tiers

| Tier | Criteria | Process | Example |
|------|----------|---------|---------|
| **L0: Instant** | Single, unambiguous fact with a known authoritative source | Direct answer, no search needed | "What is Python 3.13's release date?" |
| **L1: Quick Lookup** | Simple fact that needs one search to confirm | One search → verify primary source → answer | "What's the current LTS version of Node.js?" |
| **L2: Standard Research** | Multi-faceted question needing 2-4 sub-questions | Plan → Search → Evaluate → Synthesize | "Should we migrate from Express to Fastify?" |
| **L3: Deep Research** | Complex, high-stakes decision with many unknowns | Full orchestration + multiple rounds + counter-evidence | "What backend language should our 50-person team adopt for the next 5 years?" |

### Tier Selection Rule

```
If answerable from a single authoritative source (docs, RFC, spec)
  → L0 or L1

Else if multi-faceted with trade-offs (tech choice, architecture, strategy)
  → L2

Else if high-stakes + long-term impact + multiple stakeholder concerns
  → L3
```

**Default to L2.** L3 is reserved for decisions that will be hard to reverse. Skipping the gate entirely for simple facts is the most common waste in research workflows.

---

## Phase 1: Plan (Before Any Search)

### 1.1 Clarify the Actual Question

Restate the user's question in your own words. Identify what makes it hard:
- Ambiguous terms? (define them)
- Broad scope? (narrow it)
- Implicit assumptions? (surface them)

### 1.2 Decompose Into Sub-Questions

Break the main question into 3-7 sub-questions. Each should be independently searchable.

```
Main: "Is Rust a good choice for our backend rewrite?"
  → Q1: What are Rust's performance characteristics vs our current stack?
  → Q2: What's the Rust backend ecosystem maturity (frameworks, ORMs, deployment)?
  → Q3: What's the Rust hiring market like in [region]?
  → Q4: What are known migration patterns from [current lang] to Rust?
  → Q5: What do teams report as the biggest pain points after adopting Rust?
```

### 1.3 List Hypotheses (What You Think You Know)

For each sub-question, state what you currently believe — as a falsifiable hypothesis. This prevents confirmation bias.

```
Q1 Hypothesis: Rust will be 2-5x faster than our Python backend [unverified]
Q2 Hypothesis: Rust web frameworks (Actix, Axum) are mature enough for production [unverified]
Q3 Hypothesis: Rust developers are scarce and expensive [unverified]
```

### 1.4 Query Rewrite + Fanout（建议 3 路改写）

> **背景**：第二轮调研（[D-2026-06-23-search-adopt-goggles](../../docs/decisions/D-2026-06-23-search-adopt-goggles.md) 同期评审，参见 survey §4 启示 3）指出，主流 agent（Tavily auto_parameters / Azure Semantic Rewrite / Agent4Ranking）都把 query 改写视为搜索阶段的核心动作。本节把"人工写 2-4 条 query"升级为**结构化的 3 路 fanout**：直白 / 限域 / 反证。
>
> **目标**：让每个 sub-question 产生 3 条**视角不同**的 query 并行执行，合并去重后再交给 §3.5 / §3.5.5 处理。
>
> **触发条件**：L2 建议三路；L3 建议三路并可增加反证扩展（见 §1.4.4）；L1 可只用 R1；L0 不适用。
>
> **执行强度（Run #2/#3 之后的诚实定位）**：本节是"软要求"——三路 fanout 在多样性与反证覆盖上**确有边际收益**，但 A/B 实测显示提示词层无法把多样性/反垄断/反证召回率**保证到达标线**（详见 [D-2026-06-24-search-defer-p2](../../docs/decisions/D-2026-06-24-search-defer-p2.md) 与 [D-2026-06-24-search-rollback-diversity](../../docs/decisions/D-2026-06-24-search-rollback-diversity.md)）。LLM 应当尽力执行三路，并在 Phase 4 显式说明每路的可达性与不足。

#### 1.4.1 三路 fanout 模板

对每个 sub-question，**必须**产出且仅产出以下 3 条 query 变体（L1 可省 R2）：

| 路 | 命名 | 模板 | 目的 |
|----|------|------|------|
| **R1** | 直白型（direct） | `<用户原话或最自然的中文/英文短句>` | 探测大众认知与高排名结果，建立基线 |
| **R2** | 限域型（site-restricted） | `<关键词> (site:<T1/T2 域> OR …)` — 至少 3 个 site:（详见 §1.4.2） | 强制命中权威源，避开转载与农场 |
| **R3** | 反证型（counter-evidence） | `<主张> 反例 / 失败 / 迁回 / regression / "migrated from X to Y"` | 主动寻找反对意见与失败案例，破除确认偏误 |

最小示例：

```
Sub-Q: "Rust 微服务后端是否比 Go 更合适"

R1（直白）: Rust vs Go 微服务后端 选型
R2（限域）: Rust Go microservice production (site:reddit.com OR site:news.ycombinator.com OR site:github.com)
R3（反证）: "migrated from Rust to Go" OR "Rust microservice regression" OR "Rust 微服务 翻车"
```

#### 1.4.2 限域型 R2 的域名挑选规则

R2 的 `site:` 列表建议从以下两类中选 **3~5 个**（不少于 3，避免被单一生态垄断）。

> **Run #3 教训（2026-06-24）**：site: 是**过滤器不是路由器**——把中文域名（zhihu/tonybai）加进 site: 不会让英文 query 自动返回中文页。多语种结果**必须由多语种 query 触发**。所以 R2 在单一语言 query 下，site: 列表应保持同语种生态；若用户希望覆盖另一语种权威源，请按下面 §1.4.2.bis 把 R2 分子路。

| 类别 | 候选 | 选择依据 |
|------|------|---------|
| **T1 官方权威** | 该领域官方文档 / 标准组织 / RFC / vendor advisory（如 `rust-lang.org`、`kubernetes.io`、`postgresql.org`） | 见 §3.3 T1 定义 |
| **T2 半权威（英文社区）** | `news.ycombinator.com`、`reddit.com`、`stackoverflow.com`、主流项目 GitHub README、`*.acm.org`、`arxiv.org`（看主题） | 见 §3.3 T2 定义 |
| **T2 半权威（中文社区）** | `zhuanlan.zhihu.com`、`tonybai.com`、`infoq.cn`、`juejin.cn`、官方中文文档站（`docs.python.org/zh` 等） | 同上 |

**禁止**：把 `csdn.net`、`medium.com`、`toutiao.com` 这类已在 §3.5 被 DOWNRANK / DISCARD 的域名写进 R2 的 `site:` 列表——会与 Goggle 自相矛盾。

##### 1.4.2.bis R2 的双语子路（可选，当需要双语覆盖时启用）

当 query 主题在两个语种社区都有重要权威源时（如 Rust/Go/K8s 等中英都活跃的主题），R2 可拆分为两个**同主题、不同语种**的子路：

```
R2-EN: <英文关键词> (site:<英文 T1/T2 域> OR …)
R2-CN: <中文关键词> (site:<中文 T2 域> OR …)
```

两子路并行 dispatch、按 URL 去重后并入 R2 池参与排序。不强制启用——单语种主题维持单 R2 即可。

##### 1.4.2.ter site: 不可用时的降级方案（当后端拒绝 site: query 时启用）

**触发条件**：search 后端对 `site:` query 返回 `BOT_DETECTED`、0 结果、或持续超时。

> **Run #14 实测（2026-06-26）**：DDG 后端对 `site:` query 100% 触发 `BOT_DETECTED`，对 `OR` 复合 query 部分触发，对单引号精确匹配最稳定。这是后端特性（非 wrapper bug，#24 wrapper 只管节流不管 query 形式）。

**降级方案**：把 `site:` operator 从 query 语法降级为**普通关键词**——将目标站点域名作为自然语言词加入 query，让搜索引擎做模糊匹配而非严格限域。

| 原 R2 模板（site: 语法） | 降级 R2 模板（自然语言限域） |
|------------------------|----------------------------|
| `"Playwright Cloudflare" (site:reddit.com OR site:news.ycombinator.com)` | `Playwright Cloudflare reddit` 或 `Playwright Cloudflare hacker news` |
| `nodriver Cloudflare bypass (site:github.com OR site:stackoverflow.com)` | `nodriver Cloudflare bypass github` 或 `nodriver Cloudflare stackoverflow` |

**注意事项**：
- 降级后召回会**变宽**（不再严格限域到该站点，可能返回其他来源），需在 §3.2 评估时人工过滤
- 一次只加**一个**站点名作为关键词，避免 `OR` 复合 query 再次触发后端检测
- 若降级后仍触发 `BOT_DETECTED`，按 §1.4.2 的 site: 列表换下一个站点名重试
- 降级触发时在输出中标注 `R2 降级（site: 不可用）`，便于 §3.2 评估时识别

**不断启用降级的判断**：若同一 sub-question 的 R2 连续 2 次降级仍失败，跳过 R2，仅靠 R1 + R3 + fetch_content 间接覆盖，并在 Gap Ledger（§4.1）中标注"R2 限域搜索不可用"作为 gap。

#### 1.4.3 反证型 R3 的话术模式

R3 不是"换一个同义词"，而是**主动假设**：「如果当前假设是错的，谁会写下反例？」常用模式：

```
"X slower than Y production benchmark"
"X performance regression"
"cases where X underperformed Y"
"why not X" / "X alternative"
"teams that moved away from X and why"
"migrating from X to Y" / "X 翻车" / "X 踩坑"
```

**规则**：若 R3 返回 0 条反证，**不要**视为"没有反证"——标记 `[未找到反证]`，并在 Round 2 用更宽泛的反证 query 重试一次（最多 1 次）。

> **Run #3 教训（2026-06-24）**：DDG 后端对负向 query 召回较差，复合 `OR` 反证 query 可能被屏蔽返回空；简化 retry 也可能返回偏正面内容。**这是后端能力限制，不是提示词能根治**——属"反证检索机制"缺口，已记入 mechanism-candidates #20。当出现这种情况：① 仍标 `[未找到反证]`；② Phase 4 显式列出"R3 反证不可达 → 结论置信度降一档"；③ 不在 SKILL 层再加补救逻辑。

#### 1.4.4 L3 扩展：额外反证（仅 L3）

L3 深度调研在三元组基础上**追加 1~2 条反证 query**，针对最核心、最高风险的 1~2 个假设进行多角度反向搜索。L2 不强制扩展，避免无限发散。

#### 1.4.5 并行执行与合并

```
Step 1  对每个 sub-question 产出 R1/R2/R3 三条 query
Step 2  全部 sub-question 的所有 query 在一条 message 内并行 dispatch（不串行、不 && 链）
Step 3  按 URL 精确去重；合并后期望规模 ≈ 3 × N_subQ × max_results
Step 3.bis  同源内容合并（P4）—— 对去重后的结果集，判断是否有同一篇文章被不同站点转载/镜像。
              若判断为同源转载，只保留权威分级最高的版本（T1 > T2 > T3 > T4；同级保留 SearchRank 更高的）。
              被合并的 URL 在 Source 表中标注 [同源合并]。
              详见 [D-2026-06-24-search-adopt-p4-same-source-merge](../../docs/decisions/D-2026-06-24-search-adopt-p4-same-source-merge.md)。
Step 4  把合并集交给 §3.5（Goggle 打标）→ §3.5.5（FinalScore 重排）→ §3.1（充分性评分）
```

#### 1.4.6 输出表（替代旧 §1.4 表格）

| Sub-Q | Route | Query | 预期信息增益 | 期望主要来源类型 |
|-------|-------|-------|--------------|------------------|
| Q1 | R1 | "Rust vs Python backend performance benchmark 2025" | High | T2 社区 + T3 博客 |
| Q1 | R2 | "Rust Python benchmark" site:rust-lang.org OR site:github.com | High | T1 官方 |
| Q1 | R3 | "Rust slower than Python production case" | Medium | T3 真实事故贴 |

更多 query 词法模式见 [references/search-path-design.md](references/search-path-design.md)。

#### 1.4.7 合并流程（按 §3.5.5 单一通路）

> **Run #3 之后回退（2026-06-24）**：取消"DiversityPenalty + R1 保底"提示词级算分。合并阶段只走 §3.5.5 FinalScore 单一通路，不再加多样性项。
>
> 多样性 / 反垄断 / 路径配额属机制层问题（见 mechanism-candidates #21），SKILL 层不再尝试治理。

执行顺序：

```
Step 1  收集所有路（R1/R2/R3 含其 retry 分支）的原始结果，按 URL 精确去重
Step 2  对每条结果调用 §3.5.2 Goggle 打标
Step 3  对每条结果按 §3.3 评出 T-Level
Step 4  按 §3.5.5 FinalScore 公式排序（SearchRank + GoggleWeight + SourceWeight）
Step 5  输出 top-10，进入 §3.1 充分性评分
```

**对单一路径垄断 top-N 的现状**：承认局限。Phase 4 Sources 表中显式列出"来源路"列，让人类用户自行识别是否需要调整 R2 site: 列表或拆双语子路（§1.4.2.bis）。

### 1.5 Execute as Batch, Not Sequentially

Issue independent search queries in **parallel** (single message with multiple tool calls), not chained with `&&`. Independent queries don't need to wait for each other.

§1.4 的 3 路 fanout 与跨 sub-question 的 query 都属"独立 query"——一次性发出。

> **注**：旧 §1.5 "Counter-Evidence Search (Mandatory for L2+)" 已并入 §1.4.3 / §1.4.4。反证不再是独立步骤，而是 §1.4 三元组的**第三路硬性输出**。

---

## Phase 2: Execute (Search)

Run the prioritized search queries. For each result:

1. **Fetch primary sources** — not just search snippets. A claim without a verified URL is unreliable.
2. **Cross-reference** — if two independent sources agree, confidence increases. If they conflict, flag the contradiction.
3. **Respect rate limits** — batch parallel queries within tool limits, don't spam.

### 2.1 fetch_content 全文归档（Iron Law）

> **来源**：Run #10 / Run #11 暴露的系统性问题——§2 标题为"全文归档"但实际只存 2-3 句摘要，导致 Run #11 baseline SimHash 在 verbatim 对上 Miss（"摘要级指纹"≠"文档级指纹"），Net Gain 成为上界估计。

**每个 fetch_content 成功的 URL，其返回正文必须完整归档到输出文件的独立章节。**

归档要求：
- **归档完整正文**，不是摘要、不是 highlights、不是 snippet
- 每个 URL 的归档块包含：URL、fetch 状态、完整正文
- fetch 失败的 URL 也要记录（URL + 失败原因），不省略
- 归档章节在输出文件中位于搜索结果表之后、P6 highlights 之前

**为什么必须归档全文**：
1. **可审计性**：P3 Quote 必须是 fetch_content 返回正文的连续子串——无全文归档则无法事后验证 Quote 是否 verbatim
2. **基线评测**：P4 同源合并的算法基线（SimHash/Jaccard）需要全文作为输入——摘要替代正文会破坏 SimHash 经典设定（Run #11 教训）
3. **P6 highlights 抽取的源数据**：highlights 是从全文中抽取的 verbatim 子串——无全文则 highlights 的 verbatim 性不可验证

**与 P6 的关系**：
- P6 §3.6.1 说"fetch_content 全文不直接进合成 context，只进 highlights"——这是**合成 context** 的约束（Phase 4 合成只用 highlights，不用全文）
- **不等于"全文丢弃"**——全文必须归档到输出文件，只是不进 Phase 4 合成 context
- 即：全文 → 归档到输出文件 §2 + 抽取 highlights → highlights 进 Phase 4 合成

---

## Phase 3: Evaluate (After Each Round)

### 3.1 Score Evidence Quality

For each sub-question, evaluate whether the evidence is sufficient:

| Status | Criteria |
|--------|----------|
| ✅ **Sufficient** | Multiple independent sources agree, primary data cited, no major contradictions |
| ⚠️ **Partial** | One source or conflicting sources, or only search snippets without primary verification |
| ❌ **Insufficient** | No relevant results, or all sources are low-quality (unverified blogs, outdated, clickbait) |

### 3.2 Identify Gaps

List what's still missing:
- Which sub-questions have insufficient evidence?
- What data was expected but not found?
- Are there conflicting claims that need resolution?

### 3.3 Source Weighting (Quality Over Quantity)

When evidence conflicts, resolve by source authority, not by counting voices. One authoritative source outweighs many low-quality sources.

| Source Tier | Weight | Examples | Trust Rule |
|-------------|--------|----------|------------|
| **T1: Authoritative** | 10× | Official docs, RFCs, language specs, published research papers, vendor security advisories | Trust over any number of T3/T4 sources |
| **T2: Semi-Authoritative** | 3× | Major project READMEs, well-maintained Wikipedia pages, respected technical books, government publications | Trust over T3/T4, but cross-check against T1 |
| **T3: Community** | 1× | Stack Overflow (accepted+high-vote), GitHub issues (maintainer-confirmed), respected tech blogs (e.g., rachelbythebay, danluu) | Useful but not authoritative |
| **T4: Low-Authority** | 0.1× | Personal blogs (unverified), Medium articles, forum posts, Reddit comments, AI-generated content | Use only as pointers to T1-T3 sources |

**Conflict Resolution Rule:**
```
If T1 source contradicts 20 T3/T4 sources:
  → Defer to T1, note the contradiction, cite the T1 source explicitly

If two T1 sources contradict:
  → Flag as [冲突], present both, do NOT reconcile artificially

If no T1/T2 source exists for a claim:
  → Downgrade confidence to Low, mark [社区] sources explicitly
```

### 3.4 Freshness Evaluation

Evidence decays. What was true in 2021 may be false in 2026. Score each source for freshness relative to its domain.

| Domain | Max Age for "Current" | Reasoning |
|--------|----------------------|-----------|
| AI/LLM tools, models, benchmarks | 6 months | Field moves weekly |
| Web frameworks, frontend libraries | 1 year | Major versions change APIs |
| Programming language features | 1 year | Compiler/stdlib evolve steadily |
| Database, infrastructure, OS | 2 years | Slower release cycles, stable core |
| Security vulnerabilities, CVEs | 3 months (patch) / 2 years (pattern) | Vulnerabilities age fast; patterns persist |
| Academic CS theory, algorithms | 5 years | Fundamentals don't change much |
| Hiring market, salary data | 1 year | Market conditions shift |

**Freshness Markers:**

| Marker | Meaning |
|--------|---------|
| No marker | Within recommended max age |
| `[时效: N年前]` | Older than recommended max age — may be outdated |
| `[时效: 无法确认]` | Source has no date — treat as potentially stale |

**Rule:** If a claim rests entirely on sources older than the domain's max age, mark conclusion confidence as Low and note: `[证据过时]`.

### 3.5 Decide: Continue or Conclude?

| Condition | Action |
|-----------|--------|
| All sub-questions ✅ Sufficient | Proceed to Phase 4 (Synthesize) |
| Some sub-questions ⚠️ Partial | Design Round 2 queries targeting gaps only |
| All sub-questions ❌ Insufficient | Broaden search scope, try alternative terms, search adjacent topics |

---

## Phase 3.5: Domain Goggles（域名级软过滤）

> **来源**：借鉴 Brave Search Goggles 设计——同一搜索引擎在不同 goggle 下结果质量可差 5 倍。本节是 V1 第一项主流 agent 工程手法的提示词级移植。
>
> **本质**：MCP 后端不能做的事，让 LLM 在 Evaluate 阶段做后置过滤。Goggle 不是真过滤器，是「LLM 必须遵守的排序规则表」。
>
> **使用方式**：每次进入 Phase 2 前，根据 query 主题选 1~2 个 goggle 应用。在 Phase 3.1 评分前，先按 goggle 对结果做 BOOST / DOWNRANK / DISCARD。

### 3.5.1 Goggle 应用流程

```
Step 1  根据 query 主题，从 §3.5.2 预置 goggle 中选 1~2 个（也可叠加）
Step 2  Phase 2 搜索结束后，对每条结果按 goggle 规则打标：
          ✓ BOOST     - 该域名是该 goggle 推荐的高权威源
          ↓ DOWNRANK  - 该域名内容质量偏低、SEO 农场、转载站
          ✗ DISCARD   - 直接丢弃（如标题/URL 特征匹配垃圾模式）
Step 3  Evaluate 阶段优先采纳 BOOST 标记的结果作为证据
Step 4  在 Phase 4 输出 Sources 表时标注哪些来源经过 goggle 提升
```

### 3.5.2 预置 Goggles

#### Goggle A：通用技术（general-tech）

> 适用：编程语言、框架、API、命令行工具、开发实践。

| 类别 | 域名 / 特征 | 动作 |
|------|------------|------|
| BOOST | `github.com`, `docs.*`, `*.dev`, `developer.*`, `*.io/docs`, `man7.org`, language official sites (`docs.python.org`, `pkg.go.dev`, etc.) | ✓ |
| BOOST | 维护良好的项目 README、官方 changelog/release notes | ✓ |
| DOWNRANK | `medium.com`, `dev.to`, `cnblogs.com`（转载多） | ↓ |
| DOWNRANK | `csdn.net` 上标题含「一文 / 最全 / 神器 / 详解 / 万字」的农场页 | ↓ |
| DISCARD | `toutiao.com`, `m.toutiao.com`, `baidu.com/bjh`, `360doc.com` | ✗ |
| DISCARD | 任何标题含「2026 最 / 最 X 的 N 个」的列表农场页 | ✗ |

#### Goggle B：学术 / 论文（academic）

> 适用：研究方法、算法、综述、benchmark、论文引用。

| 类别 | 域名 / 特征 | 动作 |
|------|------------|------|
| BOOST | `arxiv.org`, `*.edu`, `*.ac.*`, `openreview.net`, `aclanthology.org`, `papers.nips.cc`, `proceedings.mlr.press` | ✓ |
| BOOST | `scholar.google.*`, `semanticscholar.org`, `dl.acm.org`, `ieeexplore.ieee.org` | ✓ |
| DOWNRANK | `medium.com` 上的论文复述（除非作者本人） | ↓ |
| DOWNRANK | 营销博客对论文的二次转述 | ↓ |
| DISCARD | 标题含「白话讲」「人话讲」「小白也能懂」的简化版 | ✗ |

#### Goggle C：产品调研（product-research）

> 适用：选型比较、定价、limitation、feature 对照。

| 类别 | 域名 / 特征 | 动作 |
|------|------------|------|
| BOOST | 产品官方域名（`<product>.com`、`docs.<product>.*`）、官方 pricing 页 | ✓ |
| BOOST | 产品官方 changelog、官方对比页（`<product>.com/vs/*`） | ✓ |
| DOWNRANK | 含 `?ref=` / `?aff=` 的 affiliate 链接 | ↓ |
| DOWNRANK | "Top N alternatives to X in 2026" 类 SEO 列表 | ↓ |
| DISCARD | G2 / Capterra 等仅含评分无具体证据的页 | ✗ |

#### Goggle D：安全 / CVE（security）

> 适用：漏洞、补丁、配置加固、合规。

| 类别 | 域名 / 特征 | 动作 |
|------|------------|------|
| BOOST | Vendor 官方安全公告（`*.security`, `security.<vendor>.com`） | ✓ |
| BOOST | `nvd.nist.gov`, `cve.mitre.org`, `cve.org`, `cisa.gov`, OSV 系列 | ✓ |
| BOOST | 项目官方 GHSA（GitHub Security Advisory） | ✓ |
| DOWNRANK | 新闻站对 CVE 的二次转述 | ↓ |
| DISCARD | 安全产品 SEO 软文 | ✗ |

#### Goggle E：中文技术（zh-tech）

> 适用：中文用户搜索中文技术内容时叠加 Goggle A 使用。

| 类别 | 域名 / 特征 | 动作 |
|------|------------|------|
| BOOST | `juejin.cn`（掘金，质量相对最稳）、`infoq.cn`、`zhihu.com` 高赞答主、`weixin.qq.com` 官方公众号 | ✓ |
| BOOST | 各官方中文文档站（`docs.python.org/zh`, `kubernetes.io/zh`, etc.） | ✓ |
| DOWNRANK | `csdn.net` 个人转载 | ↓ |
| DOWNRANK | `cnblogs.com` 老旧文章（> 3 年） | ↓ |
| DISCARD | `toutiao.com`, `360doc.com`, `bjh.baidu.com`, `kuaishou.com/article/*` | ✗ |
| DISCARD | 标题含「2026 必看 / 收藏即学会 / 让你瞬间」等农场套话 | ✗ |

### 3.5.3 Goggle 的边界（诚实声明）

| 限制 | 含义 |
|------|------|
| **不是真过滤器** | LLM 不会调用 URL pattern matcher，只是按规则降低这些来源的可信度权重 |
| **DISCARD 仍可能进证据** | 若仅剩 DISCARD 类来源，应用 `[来源质量不足]` 标签，而非强行丢弃所有结果 |
| **预置 goggle 不是金标准** | 用户应根据自身领域自定义；本表只是一组合理默认值 |
| **冲突时以 §3.3 Source Weighting 为准** | Goggle 是辅助，权威分级是主轴 |

### 3.5.4 Goggle 命中报告（Phase 4 必填）

最终输出的 Sources 表必须增加一列「Goggle Action」：

| Source | Type | Credibility | Goggle Action |
|--------|------|-------------|---------------|
| `docs.python.org` | Official docs | [文档] High | ✓ BOOST (general-tech) |
| `csdn.net/某文章` | Tech blog | [社区] Medium | ↓ DOWNRANK (zh-tech) |
| `arxiv.org/abs/...` | Paper | [文档] High | ✓ BOOST (academic) |

### 3.5.5 Goggle × Source Weighting 联动（FinalScore 模型）

> **背景**：第一次 A/B 实测（2026-06-23 K8s ImagePullBackOff 查询）发现，Goggle 白名单永远赶不上长尾——例如 `imroc.cc`（中文 K8s 排障权威站）在白名单中不存在，但其内容质量明显高于 `csdn.net`。
>
> **结论**：不通过扩白名单解决，而通过**让 Goggle 与 §3.3 Source Weighting 联动**，使未命中 Goggle 的优质站点能通过权威分级自然升上来。
>
> **设计原则**：不引入数学计算，而是让 LLM 在排序时遵守一个**复合规则**。

#### 联动公式

```
FinalScore(result) = SearchRank + GoggleWeight + SourceWeight
```

各项含义：

| 项 | 取值 | 来源 |
|----|------|------|
| `SearchRank` | `-position`（如第 3 条 = -3） | 搜索引擎原始排序 |
| `GoggleWeight` | `+2`（✓ BOOST）/ `-1`（↓ DOWNRANK）/ `-∞`（✗ DISCARD）/ `0`（—） | §3.5.2 Goggle 规则 |
| `SourceWeight` | `+10` (T1) / `+3` (T2) / `+1` (T3) / `+0.1` (T4) | §3.3 权威分级 |

#### 联动示例（基于本项目 A/B 实测）

| URL | SearchRank | GoggleWeight | SourceWeight | FinalScore | 上升/下沉 |
|-----|-----------:|-------------:|-------------:|-----------:|----------|
| `kubernetes.io/zh/docs/...` | -8 | +2 (BOOST general-tech+zh-tech) | +10 (T1) | **+4** | ⬆ 最强 |
| `imroc.cc/.../imagepullbackoff` | -10 | 0 (—) | +3 (T2 社区专家) | **-7** | ⬆ 升至 T2 档 |
| `cloudnative-tech.com/p/7429/` | -5 | 0 (—) | +1 (T3) | **-4** | 持平 |
| `wenku.csdn.net/column/...` | -3 | -1 (DOWNRANK zh-tech) | +0.1 (T4) | **-3.9** | ⬇ 沉底 |
| `lryc.cc/news/...` | -7 | -∞ (DISCARD) | — | **-∞** | ⛔ 剔除 |

可见 `imroc.cc` 没在白名单也能自然上升，无需扩 Goggle。

#### 实操规则（LLM 必须遵守）

```
对每条搜索结果按以下步骤打分：

1. 应用 Goggle 规则得到 GoggleWeight
2. 评估 Source Authority 得到 SourceWeight（必须显式给出 T 级）
3. 按 FinalScore 重排
4. 若 FinalScore 出现并列，按原 SearchRank 决定
5. 在 Phase 4 输出中，Sources 表新增 "T-Level"（与 Goggle Action 并列）；若结果来自 §1.4 fanout，额外加 "来源路" 列
```

#### 设计护栏（避免膨胀）

| 规则 | 原因 |
|------|------|
| 不为每个新发现的优质站补 BOOST 白名单 | 防止「200 域名白名单」陷阱（GPT 2026-06-23 评审第二轮指出） |
| 优先用 Source Weighting 提升新站，而不是 Goggle | Goggle 是**类别级粗筛**，Source Weighting 才是**站点级精筛** |
| Goggle 仅覆盖**高频垃圾域** + **少数普世权威域**（github/docs/arxiv） | 长尾交给 Source Weighting |
| **不在提示词层引入多样性/反垄断算分**（如 DiversityPenalty） | Run #3（2026-06-24）证实：LLM 在提示词层算分不可靠，且 ±2 量级压不过 T1 SourceWeight ±10。多样性排序属机制层问题，见 mechanism-candidates #21 |

> **Run #3 教训**：曾尝试新增 §3.5.6 DiversityPenalty + R1 保底来缓解 fanout 单一路垄断，复测综合 2.6/5，倒退。**回退** —— 多样性约束移交机制层（见 mechanism-candidates #21），SKILL 层不再算分。详见实验报告 [run-3-fanout-tuned](../../docs/search-orchestrator/experiments/run-3-fanout-tuned.md) 与决策 [D-2026-06-24-search-rollback-diversity](../../docs/decisions/D-2026-06-24-search-rollback-diversity.md) / [D-2026-06-24-search-defer-p2](../../docs/decisions/D-2026-06-24-search-defer-p2.md)。

---

## Phase 3.6: P6 Highlights（fetch 后 verbatim 抽取）

> **机制来源**：[D-2026-06-25-search-adopt-p6-highlights](../../docs/decisions/D-2026-06-25-search-adopt-p6-highlights.md)（active）
> **验证**：[run-10-p6-highlights](../../docs/search-orchestrator/experiments/run-10-p6-highlights.md) — 评分 4/5，Extractive Fidelity 92.3%

### 3.6.1 触发条件

每个 sub-Q 的所有 fetch_content 结果在进入 Phase 4 合成之前，**必须**先经过 P6 highlights 抽取。fetch_content 全文不直接进合成 context，只进 highlights。

> **澄清**（Run #11 教训）：此处"不直接进合成 context"指 Phase 4 合成只用 highlights，**不等于全文丢弃**。fetch_content 全文必须按 §2.1 归档到输出文件，用于可审计性和后续基线评测。即：全文 → 归档（§2.1）+ 抽取 highlights → highlights 进合成。

### 3.6.2 抽取规则

```
Phase 3.6  P6 Highlights（每个 sub-Q ≤500 token）
  ① 对每个 sub-Q 的所有 fetch_content 结果，抽取与该 sub-Q 直接相关的关键句
  ② 抽取规则：verbatim 引用（连续子串，允许首尾空白/格式标记差异）
     - 禁止改写、同义替换、跨语言归纳
     - 允许截取（在句号/逗号处截断）和省略标记（"..."）
     - 允许格式标记差异（斜体/粗体/链接/代码标记的增减）
  ③ 每条 highlight 格式："引文" [Source: URL]
  ④ 每个 sub-Q 的 highlights 总量 ≤500 token
  ⑤ 标注置信度（High/Medium/Low）和反证覆盖（有/无）
```

### 3.6.3 Iron Law — verbatim 抽取

> **LLM 不得改写、同义替换、跨语言归纳。** 引文必须是来源全文的连续子串（允许首尾空白/格式标记差异）。截取和省略标记（"..."）是允许的；同义替换不是。

Run #10 验证的两条 paraphrase 失败模式（须避免）：
1. **主语同义替换**：把 "This release of PostgreSQL" 改成 "PostgreSQL 17" —— 禁止。应直接 verbatim 引用 "This release of PostgreSQL"
2. **跨语言归纳**：英文原文用中文总结 —— 禁止。应直接 verbatim 引用英文原文，在 highlight 外另起一行做中文注释（如有需要）

### 3.6.4 输出格式

每个 sub-Q 的 highlights 块：

```markdown
### Qn Highlights — [sub-Q 主题]

> **Qn 主问题**: [sub-Q 文本]

- "verbatim 引文" [Source: URL]
- "verbatim 引文" [Source: URL]
...

**置信度**: High/Medium/Low — [原因]
**反证覆盖**: ✅ 有 / ❌ [未找到反证] — [原因]
```

### 3.6.5 P6 的边界（诚实声明）

- P6 只做 **token 压缩 + verbatim 保真**，不做信息综合（综合在 Phase 4）
- P6 不替代 Phase 3 评估——评估仍在 Phase 3.1-3.5 完成
- 若 fetch_content 失败（HTTP 错误/JS Challenge 假页面），该 URL 不产生 highlights，标注 `[fetch 失败]`
- 若 search 工具不可用导致 R3 反证全部不可达，所有 sub-Q 标注 `❌ [未找到反证]`，Phase 4 整体置信度降一档

---

## Phase 4: Synthesize (Output)

### 4.1 Gap Ledger（强制证据缺口枚举，合成前必做）

在写最终答案之前，先逐一扫描问题涉及的每个子维度，显式列出证据缺口。这是 P5 最小机制（Run #14 4/5 验证通过，2026-06-26），不可跳过。

**机制收益**：Gap Detection Recall +55.6%（33.3% → 88.9%），隐性缺口召回 +40%（40% → 80%），安全指标全部不退化。

**输出格式**：

```
## Gap Ledger

| # | gap 描述 | gap 类型 | 相关 evidence id | 置信度 |
|---|---------|---------|-----------------|-------|
| G1 | [哪个子问题证据不足] | [类型] | [E1/§x.y] | low/medium |
| G2 | ... | ... | ... | ... |
```

**gap 类型枚举**：
- **缺反证**：positive claim 无独立验证，或反证搜索未执行
- **无直接对比**：跨方案横向数据缺失，结论靠推演
- **单一来源**：多个方案的数据复用同一来源（如三家方案通过率均出自一家测试）
- **证据过时**：来源发布时间距今 ≥3 个月，且领域演进快
- **范围外推**：仅测试某子集（如 Chromium）结论被推广到全部（如 Playwright 全引擎）

**必查的隐性缺口**（不可只列显性"未找到"）：
1. **单源外推**：多个量化数据是否复用同一来源？若是，标注。
2. **利益相关**：评测方是否是被评测方的竞争对手或服务商？若是，标注置信度降级。
3. **范围外推**：测试覆盖的子集（语言/引擎/版本）是否被无声推广到全集？若是，标注。
4. **时效衰减**：来源是否 ≥3 个月前发布且领域快速演进？若是，标注。
5. **反证缺位**：positive claim 是否无独立反证搜索覆盖？若是，标注。

**Iron Law — Gap Ledger 边界**：
- ✅ 每项 gap **必须**引用 evidence id（E1/§x.y）。无 evidence id 的 gap 不应列入。
- ✅ 若 evidence 已充分支持某结论，**不应**标为 gap（避免 false gap）。
- ✅ Gap Ledger 中标注的缺口**必须**在最终答案中以"证据不足/低置信"方式显式呈现，不得隐去。
- ❌ 不要在 Gap Ledger 里生成 Evidence Nodes、Relation Edges 或 Conflict Ledger——只做缺口枚举。

**失败模式警示**（Run #14 实测）：追求 gap 召回时可能把证据充分的结论误标为"待评估"（false gap）。缓解措施=每项 gap 需引用 evidence id，evidence 充分则不应标 gap。

### 4.2 Structure the Answer

```
## Conclusion
[Direct answer to the main question, 1-3 sentences]

## Evidence
### Sub-Q1: [Question]
- [Finding] [Source: URL, credibility]
- [Finding] [Source: URL, credibility]
**Confidence:** High / Medium / Low

### Sub-Q2: [Question]
...

## Contradictions & Uncertainty
- [Point A] conflicts with [Point B] — unresolved
- [Topic] has insufficient evidence — more research needed

## Sources by Credibility
| Source | Type | Credibility |
|--------|------|-------------|
| docs.python.org | Official docs | [文档] High |
| github.com/.../issue | Issue discussion | [社区] Medium |
| some-blog.com | Personal blog | [社区] Low |
```

### 4.3 Source Credibility Standards

Follow `.clinerules` 宪法一 evidence labeling:

| Label | Meaning | Example |
|-------|---------|---------|
| `[实测]` | You executed/tested it yourself | Running a command and seeing output |
| `[源码]` | Confirmed in source code | Reading GitHub repo code |
| `[文档]` | Official documentation or README | docs.python.org, man pages |
| `[社区]` | Forum/issue/blog experience | Stack Overflow, GitHub issues, blog posts |
| `[推测]` | Unverified inference | Must be marked "未验证" |

Credibility order: 实测 > 源码 > 文档 > 社区 > 推测

### 4.3 Output-Citation-Enforce（三档模式）

> **来源**：借鉴 Perplexity Sonar Pro 架构强制 citation 的设计——"product architecture forces citation discipline"（survey §2 M8）。Perplexity 的 citation hallucination rate 37% vs ChatGPT 67%，差距核心在于架构强制而非模型自觉。
>
> **A/B 验证**：Run #5（英文 query，fetch 5/5，误引用 0）+ Run #6（中文 query，fetch 1/10，误引用 0）共同确认 P3 机制零误引用。详见 [D-2026-06-24-search-adopt-p3](../../docs/decisions/D-2026-06-24-search-adopt-p3.md)。

#### 档位判定

`fetch_content` 执行后，统计候选 URL 中成功获取正文的比例。根据结果选择输出档位：

| 档位 | fetch 成功率 | 输出格式 |
|------|-------------|---------|
| **Tier A** | ≥ 60% | 完整 P3：Claim / Quote / Source 三元组 |
| **Tier B** | 20%~60% | 混合：有正文 → P3；无正文 → `[无法引证]` |
| **Tier C** | < 20% | 降级：Finding + Source + `[P3 Coverage Low]`，保留已验证证据 |

#### Tier A：完整 P3

```
### [Sub-Q]
- **Claim**: [一句话结论，必须有正文依据]
  **Quote**: "[来源文中的 verbatim 连续子串，≤ 80 字]"
  **Source**: [URL, 证据标签]
```

规则：
- Quote **必须**是 fetch_content 返回正文中的连续子串。禁止拼接、禁止删改词序。
- 每条 Claim 必须有独立 Quote 支持。一个 URL 可产出一条或多条 Claim。
- 找不到合适 Quote → 不生成该 Claim，标记 `[无法引证]`。

#### Tier B：混合模式

对成功 fetch 的 URL：使用 Tier A 格式。
对 fetch 失败的 URL：不生成 Claim，在 Sources 表中标记 `[无法引证]` 并说明原因。

最终合成回答仅包含已验证条目。`[无法引证]` 的 URL 不进入应答体，保留在 Sources 表供后续参考。

#### Tier C：降级模式

使用当前 §4.1 格式（Finding + Source），但做两件事：
1. 如果某 URL 成功 fetch 且有 verbatim Quote 可用，优先以 P3 格式输出
2. 在所有 Sources 表末尾追加一行 `[P3 Coverage Low]` 说明

降级不是回退到旧格式——它是**在基础设施不允许时保留已验证证据**。

#### 自检（所有档位通用）

```
- 每条 claim 是否关联至少一个 URL？    □ Yes / □ No
- [推测] 标签数 ≤ 总结论数 30%？       □ Yes / □ No
- 如果 Tier A/B：每条 claim 是否有 Quote？  □ Yes / □ No
- 如果 Tier C：[P3 Coverage Low] 是否标注？  □ Yes / □ No
```

### 4.5 Mark Uncertainty Explicitly

Never present a guess as fact. Use explicit markers:
- `[未验证]` for unverified claims
- `[无法确认]` for questions you couldn't answer
- `[冲突]` for contradictory findings

---

## Round 2+: Iterative Deepening

If Round 1 evidence is insufficient, plan Round 2:

1. **Focus only on gaps** — don't re-search what's already sufficient
2. **Refine queries** — use more specific terms, different angles, alternative keywords
3. **Go deeper** — follow citations from Round 1 sources, search for authors/organizations referenced
4. **Broaden if stuck** — search adjacent topics, use "vs" comparisons, search in different communities

**Stop condition:** All sub-questions ✅ sufficient, OR 3 rounds completed with no meaningful new evidence, OR user interrupts.

---

## Anti-Patterns (Captured from Real Failures)

1. **Blind first search:** Searching the exact user question without decomposition or hypothesis. Result: shallow top-3 results with no depth.
2. **Single-source conclusion:** Finding one plausible article and stopping. Result: confirmation bias.
3. **No evidence labeling:** Stating conclusions without marking source type. Result: reader can't assess credibility.
4. **Sequential dependent searches:** Using `&&` chains for independent queries. Result: wasted time. Batch parallel queries instead.
5. **Searching before planning:** Diving into search without clarifying what "good enough" looks like. Result: infinite searching, no conclusion.

## References

| Topic | File |
|-------|------|
| Search query design patterns | [references/search-path-design.md](references/search-path-design.md) |
