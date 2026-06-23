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

### 1.4 Design Search Paths

For each sub-question, design 2-4 specific search queries. Prioritize by expected information gain.

| Sub-Q | Search Query | Expected Gain | Priority |
|-------|-------------|--------------|----------|
| Q1 | "Rust vs Python backend performance benchmark 2025" | High (hard data) | 1 |
| Q1 | "Rust web service latency production" | Medium | 2 |

See [references/search-path-design.md](references/search-path-design.md) for query design patterns.

### 1.5 Counter-Evidence Search (Mandatory for L2+)

For each core hypothesis, design **at least one reverse search** aimed at disproving it. Confirmation bias is the single largest source of research error — the only defense is actively seeking disconfirming evidence.

```
Hypothesis: "Rust has better performance than Java"
  → Reverse query: "Rust slower than Java production benchmark"
  → Reverse query: "Rust performance regression real world"
  → Reverse query: "cases where Rust underperformed Java"

Hypothesis: "React is the best choice for our dashboard"
  → Reverse query: "why not React for dashboard"
  → Reverse query: "React alternative dashboard performance"
  → Reverse query: "teams that moved away from React and why"
```

**Rule:** If you cannot find evidence against a hypothesis, note that too — but don't treat absence of counter-evidence as proof. Mark it: `[未找到反证]` (no counter-evidence found).

### 1.6 Execute as Batch, Not Sequentially

Issue independent search queries in **parallel** (single message with multiple tool calls), not chained with `&&`. Independent queries don't need to wait for each other.

---

## Phase 2: Execute (Search)

Run the prioritized search queries. For each result:

1. **Fetch primary sources** — not just search snippets. A claim without a verified URL is unreliable.
2. **Cross-reference** — if two independent sources agree, confidence increases. If they conflict, flag the contradiction.
3. **Respect rate limits** — batch parallel queries within tool limits, don't spam.

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
5. 在 Phase 4 输出中，Sources 表新增 "T-Level" 列（与 Goggle Action 并列）
```

#### 设计护栏（避免膨胀）

| 规则 | 原因 |
|------|------|
| 不为每个新发现的优质站补 BOOST 白名单 | 防止「200 域名白名单」陷阱（GPT 2026-06-23 评审第二轮指出） |
| 优先用 Source Weighting 提升新站，而不是 Goggle | Goggle 是**类别级粗筛**，Source Weighting 才是**站点级精筛** |
| Goggle 仅覆盖**高频垃圾域** + **少数普世权威域**（github/docs/arxiv） | 长尾交给 Source Weighting |
| 不引入实际数值计算 / 排序代码 | 保持「提示词级」轻量本质，不增加新依赖 |

---

## Phase 4: Synthesize (Output)

### 4.1 Structure the Answer

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

### 4.2 Source Credibility Standards

Follow `.clinerules` 宪法一 evidence labeling:

| Label | Meaning | Example |
|-------|---------|---------|
| `[实测]` | You executed/tested it yourself | Running a command and seeing output |
| `[源码]` | Confirmed in source code | Reading GitHub repo code |
| `[文档]` | Official documentation or README | docs.python.org, man pages |
| `[社区]` | Forum/issue/blog experience | Stack Overflow, GitHub issues, blog posts |
| `[推测]` | Unverified inference | Must be marked "未验证" |

Credibility order: 实测 > 源码 > 文档 > 社区 > 推测

### 4.3 Mark Uncertainty Explicitly

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