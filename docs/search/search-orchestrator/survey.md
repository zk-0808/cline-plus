# 主流 Agent 搜索功能实现调研

> **目的**：回答「主流 agent 的搜索功能在工程层做了什么」——过滤、改写、摘要、citation、二次抓取、重排、降权、缓存等具体手法——并给出**对本项目 search-orchestrator 的强化启示**。
>
> **方法**：search-orchestrator skill 自身的 L2 流程（Plan → Search → Evaluate → Synthesize）+ 反证搜索。原始证据见 [search-research-results.md](search-research-results.md)。
>
> **结论指向**：MCP 后端层做不了的事，应该在 **Skill 层（提示词工程）+ 项目层（小型本地后处理）** 补齐；不需要换搜索后端。

---

## 1. 关键发现（一句话总览）

主流 agent 的搜索体系是「**前置搜索 API + LLM 处理 + 后处理过滤**」三层叠加，**真正的能力差距不在搜索引擎本身，而在围绕搜索的 5~7 个工程动作**。

我们 V1 当前栈（`duckduckgo-websearch` MCP + search-orchestrator skill）位于「**裸 search + LLM 自行处理**」档位。差距是**结构性差距**，但绝大部分可以**靠 skill 提示词补齐，不需要新依赖**。

---

## 2. 主流 agent 的实现手法（按证据梳理）

### M1. 搜索深度档位（latency-quality tradeoff）

**Exa** 提供 6 档：`instant` (~250ms) / `fast` (~450ms) / `auto` (~1s) / `deep-lite` (4s) / `deep` (4-15s) / `deep-reasoning` (12-40s)。
**Tavily** 提供 `search_depth: basic | advanced`（[B1](search-research-results.md)）。
**Perplexity Sonar Pro** 把 search depth 暴露为 `reasoning_effort`。

> 含义：**不存在"一种搜索打天下"**。事实查询用 instant，调研用 deep。

### M2. Auto Parameters / 自动改写

**Tavily**：`auto_parameters: true` 时，API **根据 query 内容自动决定** `topic` (`general/news/finance`)、`search_depth` (`basic/advanced`)，user 不必显式选档（[B1](search-research-results.md)）。
**Exa**：`auto search` 是 2026 起的默认模式，"intelligently combines neural search with other search methods"（[A2](search-research-results.md)）。
**OpenAI Deep Research / Perplexity**：query 进系统后被 LLM **拆为 sub-queries 并行扇出**（[A5](search-research-results.md)），核心是 **breaks complex questions into sub-queries, searches multiple sources in parallel**（[A5 #7](search-research-results.md)）。

### M3. 内置答案（include_answer）

**Tavily Search** 同一 endpoint 返回三个东西：`answer`（已经被 LLM 直接合成的 markdown 答案）+ `results`（10 条 search 结果 + score）+ `images`（[B1](search-research-results.md)）。
**Perplexity Sonar Pro**："runs a live web search on every inference call"，输出**自带 inline citation**（[A4 #3, A4 #6](search-research-results.md)）。

> 含义：商业 agent 在搜索阶段**就已经做完 LLM-grounded answer**。下游 agent 只是组装。

### M4. 内容压缩（highlights）

**Exa**: "We train models that take full webpages and condense them into **just the tokens an LLM needs** ... we call it **highlights** ... 4000 characters recommended"（[B2](search-research-results.md)）。
**Tavily**: `include_raw_content: bool` 控制返回原文还是摘要片段（[B1 schema](search-research-results.md)）。

> 含义：搜索结果不应是「snippet + url 让 LLM 自己抓正文」，而应是「**已经为 LLM 优化过的 4k 字密集信息**」。这是 token cost 的关键。

### M5. 结构化输出 / Output Schema

**Exa**：`output_schema` 参数可以让 search 直接返回**指定 JSON 结构**（"Use output_schema with any search type to extract structured JSON from search results"）（[B2](search-research-results.md)）。
**Tavily**：通过 `auto_parameters` 决定 schema profile。

> 含义：search 不只是「找网页」，而是「**按指定 schema 抽取信息**」。

### M6. 域名级 ranking 控制（Goggles）

**Brave Search** 独有 **Goggles**: DSL 允许 user 用脚本「**boost / downrank / discard** 任意 URL 模式」，三种用法可混（hosted URL / inline / mixed），每 query 最多 3 个 Goggle（[B3](search-research-results.md)）。

应用：
- 学术调研模式 → boost `*.edu`、`*.gov`、arxiv，discard pinterest/quora
- 中文技术调研 → discard toutiao/csdn 农场，boost juejin/掘金/官方文档
- 安全审计 → boost CVE 数据库 + vendor security advisory

> 含义：**搜索质量 != 搜索引擎质量**。同一引擎在不同 Goggle 下表现可能差 5 倍。

### M7. 类别索引（Category-specific search）

**Exa** 有专用索引：`1B+ people, 50M+ companies, 100M+ research papers`（[B2](search-research-results.md)）。
**Tavily** 有 `topic: general | news | finance`。
**Perplexity** 同时跑「Search API（ranked web results）+ Sonar（web-grounded answer）+ Embeddings」（[A4 #4](search-research-results.md)）。

### M8. Citation 强制

**Perplexity Sonar Pro** 的核心卖点：**citation hallucination rate 37%（CJR audit），ChatGPT web-search-off 是 67%**（[A4 #7](search-research-results.md)）。
做法："product architecture **forces** citation discipline"——架构强制每段答案带 `[N]`，而非靠模型自觉。

### M9. Multi-Agent 编排（Deep Research）

**OpenAI Deep Research** 是**多 agent 模式**：planner agent → search agent ×N（并行）→ summarize agent → composer agent（[A5 #2](search-research-results.md)）。
关键 quote：「**A multi-agent research system takes a user query, plans the best web searches, retrieves and summarizes information, composes a comprehensive report**」。
对应论文综述：[arxiv 2506.18096v2](https://arxiv.org/html/2506.18096v2)（Deep Research Agents: Systematic Examination）。

### M10. Query Rewriting（语义改写）

**Azure AI Search** 提供 **Semantic Query Rewrite**：「search service sends the search query to a generative model that generates alternative queries」（[A8 #1](search-research-results.md)）。
学术：**Agent4Ranking**「LLM 模拟 4 种 agent 角色生成 query 变体」（[A8 #3](search-research-results.md)）。
工程：**LangGraph Research Agent** 是一个开源参考（[A8 #6](search-research-results.md)）。

### M11. 失败处理

**Tavily** 返回错误码：`400 / 401 / 429 / 432 / 433 / 500`，每个有明确语义（[B1](search-research-results.md)）。
**DDG MCP** 当前只暴露 `BOT_DETECTED / HTTP_ERROR / TIMEOUT / UNKNOWN` 四种（见 [web-search-setup.md](../../../skills/search-orchestrator/references/web-search-setup.md)）。

### M12. 价格信号

**Perplexity Sonar API** ≈ $1 per million tokens（[A4 #1](search-research-results.md)）。
**Tavily** 计费单位 = `credits`（[B1 usage](search-research-results.md)）。
**Exa** 没有公开价格但 deep-reasoning 12-40s 单次成本不会低。

> 含义：商业 agent 把"搜索"重新定义为「**按 token 付费的 LLM 加工产物**」，已经不是传统搜索 API 的定价模型。

---

## 3. 我们的当前位置

按上述 12 个手法逐一对照：

| # | 手法 | 主流 agent 做法 | 我们 V1 现状 | 差距 |
|---|------|----------------|--------------|------|
| M1 | 搜索深度档位 | Exa 6 档 / Tavily 2 档 | search-orchestrator §0 已有 L0/L1/L2/L3 **认知层档位**；MCP 后端不支持 | ⚠️ 部分覆盖 |
| M2 | 自动改写/扇出 | Tavily auto_parameters / OpenAI multi-query | Skill §1.2 要求人工 decompose；无自动扇出 | ❌ 缺失 |
| M3 | include_answer | Tavily / Perplexity 内置 | 完全无；LLM 自己合成 | ❌ 缺失（但本就是 LLM 的事） |
| M4 | highlights 压缩 | Exa 4k 密集摘要 | fetch_content 返回清洗文本（无 LLM 摘要） | ⚠️ 部分覆盖 |
| M5 | output_schema | Exa 结构化输出 | 无 | ❌ 缺失 |
| M6 | **Goggles 域名级排序** | Brave 独有 | **完全没做**——但完全可以在 skill 提示词层实现 "假 goggle" | 🔥 **借鉴价值最高** |
| M7 | Category 路由 | Tavily topic / Exa 专用索引 | 无；DDG 单引擎 | ⚠️ 可以在 query 层模拟 |
| M8 | **Citation 强制** | Perplexity 架构强制 | Skill §4.2 有 `[实测]/[文档]/[社区]` 标签，但**架构上不强制** | 🔥 **借鉴价值高** |
| M9 | Multi-Agent 编排 | OpenAI Deep Research | Cline 本身可做（subagent），未集成到 search-orchestrator | ⚠️ 跨 skill 整合 |
| M10 | Query rewriting | Azure / 学术 | Skill §1.4 要求人工设计 query；无自动改写 | ❌ 缺失 |
| M11 | 失败处理 | Tavily 6 种错误码 | DDG MCP 4 种 | ✅ 够用 |
| M12 | 价格 | $1/M tokens | DDG 免费 | ✅ 我们零成本 |

**总结**：5 个手法（M1/M4/M8/M9 部分覆盖，M10/M2/M5/M7 缺失，M6 完全没碰），其中 **M6 Goggles 和 M8 Citation 强制是借鉴价值最高、改造成本最低**的两项。

---

## 4. 强化启示（Actionable）

> **不变前提**：不引入 Tavily/Exa/Brave 付费后端，不替换 MCP，不要求用户配 API key。所有改造在 **search-orchestrator skill 提示词 / 文档** 层完成。

### 启示 1：把 Goggles 思想搬到提示词（高 ROI）

**做法**：在 search-orchestrator skill 增加一个 **"Domain Goggles" 章节**，预置 4~6 个典型场景的「域名 boost/downrank/discard 列表」，作为人类与 LLM 共同遵守的过滤规则。每个 Goggle 是一段 markdown 表格，不是代码。

举例（Skill 中可直接写）：

```markdown
### Goggle: 中文技术调研（zh-tech）
- DOWNRANK: toutiao.com, m.toutiao.com, baidu.com/bjh, 360doc.com, csdn 农场页（标题含「最全 / 一文 / 神器 / 详解」）
- BOOST: github.com, juejin.cn, infoq.cn, 官方文档 docs.*, *.dev
- DISCARD: 商业广告页（含"购买/限免/会员"）

### Goggle: 学术/论文（academic）
- BOOST: arxiv.org, *.edu, scholar.google.*, semanticscholar.org, openreview.net
- DOWNRANK: medium.com, dev.to
- DISCARD: pinterest.*, quora.com
```

为什么够用：DDG 引擎本身不分档，但**提示词驱动 LLM 在 evaluate 阶段做后置过滤**完全可行。等效于一个「软 Goggle」。

**风险**：LLM 不会真的去抓所有 URL 验证域名——所以 Goggle 只是**降低头部噪声**，不是 100% 过滤。

**收益预期**：[预测] 中文技术调研结果质量提升 ≥ 50%（toutiao 农场天然被 DOWNRANK）。

### 启示 2：Citation 架构强制（中 ROI）

**做法**：将 Skill §4.2 的 `[实测]/[文档]/[社区]/[推测]` 标签从"建议"升级为"**强制结构**"。在 Phase 4 输出模板中加一行**校验**：

```
## Self-Check (mandatory before send)
- 每个结论是否带 [类型] 标签？     □ Yes / □ No
- 每个 URL 是否对应至少一个 finding？□ Yes / □ No
- [推测] 标签数 ≤ 总结论数 30%？    □ Yes / □ No
未通过任何一项 → 重写，不要交付。
```

为什么够用：这是**架构强制**的最小实现——把检查项写进提示词，让 LLM 自己做最后一道 check。和 Perplexity 的工程级强制不同档，但比"靠模型自觉"强很多。

### 启示 3：Query Rewriting 模板（中 ROI）

**做法**：Skill §1.4 当前要求人工写 query。借鉴 Azure Semantic Query Rewrite + Agent4Ranking 思路，把 query 改写**形式化为 3 个固定变换**：

```markdown
对每个 sub-question，产出 3 种 query 变体并行搜：
1. 直白型：用户自然语言的最直接搜索词
2. 限域型：site:authoritative-domain + 关键词
3. 反证型：搜索"反面观点" / "已知失败案例" / "performance regression"
合并去重后取 top 10。
```

为什么够用：把模型容易跳过的「反证搜索」**结构化为强制三步**。这是 Skill §1.5 已有的想法，但当前在「推荐」语气；改成「**必产出 3 条**」即可。

### 启示 4：Search Depth × Tier 联动（低 ROI 但优雅）

**做法**：把 Skill §0 已有的 L0/L1/L2/L3 复杂度档位**显式映射**到 Exa 风格的搜索动作：

```markdown
| Tier | 搜索动作 | 类比 Exa |
|------|---------|----------|
| L0   | 不搜，直接答 | （无） |
| L1   | 单次 search, max_results=5 | instant |
| L2   | 3 路 query × 10 + 反证 1 路 + fetch_content top 2 | deep-lite |
| L3   | 5 路 query × 15 + 反证 2 路 + fetch_content top 5 + cross-reference 表 | deep |
```

为什么够用：把"调研力度"从主观判断变成**可执行配方**。

### 启示 5：highlights 替代（中 ROI）

**做法**：当前 fetch_content 返回 8k 清洗文本。借鉴 Exa highlights 思路，**在 Skill 提示词中加一步显式压缩**：

```markdown
对每条 fetched content，在 evaluate 阶段产出 ≤ 500 token 的「核心摘要 + 原文 anchor」对：
- 核心摘要：3-5 行，直接回应当前 sub-question
- 原文 anchor：≤ 3 个 quote 片段（带引号）
两者一起送进最终 synthesize，原文不再进入上下文。
```

为什么够用：把 token 成本从「8k × N 条」降到「500 × N 条」，且保留原文 trace。等效于 highlights 但在 prompt 层做。

### 启示 6（拒绝项）：不做 multi-agent 自动扇出

**理由**：Cline 的 subagent 功能可以做，但**当前 V1 不应**——OUTLINE §3 五问门控失败：
- Q1: Cline 已有 subagent 能力 ✅
- Q4: 是"不会用"，不是"缺失" ❌
- 结论 = **用现有 Cline subagent**，不在 search-orchestrator 内部建多 agent

留作 candidates 一条，不进 V1。

---

## 5. 改造优先级（建议）

| 改造 | 强度 | 成本 | 何时做 | 类别 |
|------|------|------|--------|------|
| 启示 1: Domain Goggles | 强 | 30 分钟（写 4~6 个 goggle） | **V1 立刻** | C 类（提示词） |
| 启示 2: Citation 强制 | 中 | 10 分钟（加 self-check 模板） | **V1 立刻** | C 类 |
| 启示 3: Query Rewriting 三变换 | 中 | 20 分钟 | **V1 立刻** | C 类 |
| 启示 4: Tier × Depth 联动 | 弱 | 15 分钟 | V1 可做 | C 类 |
| 启示 5: highlights 替代压缩 | 中 | 20 分钟 | V1 可做 | C 类 |
| 启示 6: multi-agent 扇出 | 强但拒绝 | — | 不进 V1 | A 类候选 |

合计：**前 5 项约 90 分钟可全部落地，无新依赖、无 API key、不改 MCP**。完全符合 ADR-002 「L1 开箱体验 + L2 经验沉淀」定位——这正是把 4 家商业 agent 的工程经验**转译为提示词级最佳实践**。

---

## 6. 调研局限（诚实记录）

按 SKILL.md §3.4 时效与 §3.3 源权威：

| Sub-Q | 证据状态 | 说明 |
|-------|---------|------|
| Tavily 实现细节 | ✅ T1（官方文档 B1） | 充分 |
| Exa 实现细节 | ✅ T1（官方文档 B2） | 充分 |
| Brave Goggles | ✅ T1（官方文档 B3） | 充分 |
| Perplexity Sonar 架构 | ⚠️ T2/T3（[A4 #1, #3, #6, #7](search-research-results.md)，多源交叉） | 充分但缺一手 |
| Claude web_search 参数 | ❌ T1 文档站封锁（[B4](search-research-results.md)） | **[无法确认]** |
| Cline 自身搜索现状 | ✅ T1（[A7 GitHub 仓库 + discussion #496](search-research-results.md)） | 确认 Cline 本身**无内置 web search**，依赖 MCP |
| Multi-agent Deep Research 实证 | ⚠️ T2（[arxiv survey + datacamp + OpenAI cookbook](search-research-results.md)） | 充分但单数据点 |

**[冲突] / [无法确认] 项**：
- Anthropic web_search 工具的具体参数集合：未能直接读取官方文档。
- C1 高级查询语法验证：**0 结果**（BOT_DETECTED 或 query 过窄）——MCP 后端在窄 query 上的鲁棒性是一个**单独的潜在弱点**，建议后续单测。

---

## 7. Next Steps

1. 用户决策：是否启动「启示 1+2+3」三项立即改造（约 60 分钟）。
2. 如同意，则按下列顺序更新 `skills/search-orchestrator/SKILL.md`：
   - 加 §5 Domain Goggles（启示 1）
   - 加 §6 Citation Self-Check（启示 2，可合并进 Phase 4）
   - 加 §1.4-bis Query Variation Triplet（启示 3）
3. 更新 mechanism-candidates.md：把启示 6（multi-agent 扇出）作为新一条 A 类候选记入。
4. git commit 一份完整结果（含本文件、search-research-results.md、skill 修订）。

---

## 8. 一句话总结

> 我们的搜索能力差距不在「DDG vs Tavily」，而在「**有没有把商业 agent 的 5~7 个工程动作转译为 skill 提示词层的硬性流程**」。前者要花钱换后端，后者只需要 60 分钟改提示词。


---

## 9. Decision Outcome（决策跳转）

> 本调研报告的 §1–§8 是事实层（主流 agent 调研、对照、启示）。所有后续决策与 A/B 验证已抽出独立文件。本节只列入口。

### 9.1 已落地的决策

| 决策 ID | 状态 | 标题 |
|---------|------|------|
| [D-2026-06-23-search-adopt-goggles](../../decisions/D-2026-06-23-search-adopt-goggles.md) | active | 采纳 Domain Goggles（P1） |
| [D-2026-06-23-search-finalscore-coupling](../../decisions/D-2026-06-23-search-finalscore-coupling.md) | active | Goggle × Source Weighting 联动 FinalScore（P1.5） |
| [D-2026-06-24-search-rollback-diversity](../../archive/decisions/D-2026-06-24-search-rollback-diversity.md) | rolled-back | 回退 DiversityPenalty + R1 保底 |
| [D-2026-06-24-search-defer-p2](../../decisions/D-2026-06-24-search-defer-p2.md) | deferred | 搁置 P2 Query Rewrite + Fanout |
| [D-2026-06-24-search-adopt-p3](../../decisions/D-2026-06-24-search-adopt-p3.md) | active | 采纳 Evidence-bound Citation（P3，三档模式） |
| [D-2026-06-24-search-adopt-p4-same-source-merge](../../decisions/D-2026-06-24-search-adopt-p4-same-source-merge.md) | active | 采纳同源内容合并（P4 Same-Source Merge） |
| [D-2026-06-24-search-revise-p4-metrics](../../decisions/D-2026-06-24-search-revise-p4-metrics.md) | active | 修订 P4 评估指标（域名多样性降级为观察指标） |
| [D-2026-06-24-search-infra-mcp-upgrade](../../archive/decisions/D-2026-06-24-search-infra-mcp-upgrade.md) | **rolled-back** | 启动 MCP 基础设施升级验证（中文 fetch 覆盖率）— Run #8a 否决 TLS 指纹假设 |
| [D-2026-06-24-search-evaluate-p5-output-schema](../../archive/decisions/D-2026-06-24-search-evaluate-p5-output-schema.md) | superseded | 评估 P5 Output Schema v1（字段对齐 schema）— Run #9c 双盲证伪后被 Evidence Map / Claim Graph 重设计取代 |
| [D-2026-06-25-search-redesign-p5-evidence-map](../../decisions/D-2026-06-25-search-redesign-p5-evidence-map.md) | proposed | 重设计 P5：Evidence Map / Claim Graph（非字段对齐 schema）— Run #13 2/5 双盲证伪，保持 proposed |
| [D-2026-06-25-search-adopt-p6-highlights](../../decisions/D-2026-06-25-search-adopt-p6-highlights.md) | active | 采纳 P6 Highlights（fetch 后 verbatim 抽取 ≤500 token） |
| [D-2026-06-26-search-adopt-mcp-throttle-wrapper](../../decisions/D-2026-06-26-search-adopt-mcp-throttle-wrapper.md) | active | 采纳 MCP 反-bot 节流 wrapper（方案 C：强制 max_results≤10 + 跨调用状态 + 指数退避）— 对应 #24，11/11 集成测试 + Run #14 Phase 0b 功能性验证通过，已机制化 |

### 9.2 A/B 实验数据

| 实验 | 主题 | 机制分 | 基础设施分 | 结论 |
|------|------|--------|-----------|------|
| [run-1-goggle](../../archive/search/experiments/run-1-goggle.md) | P1 Goggle 首轮验证 | — | — | 4/5 ✅ 保留 |
| [run-2-fanout](../../archive/search/experiments/run-2-fanout.md) | P2 三路 fanout 首轮 | — | — | 3.6/5 ⚠️ 调参重跑 |
| [run-3-fanout-tuned](../../archive/search/experiments/run-3-fanout-tuned.md) | P2 调参后复测 | — | — | 2.6/5 ❌ 回炉 |
| [run-4-p3-evidence-bound-citation](../../archive/search/experiments/run-4-p3-evidence-bound-citation.md) | P3 首轮（中文 query） | 5/5 机制 | 1/5 基础设施 | 规则可行，fetch 瓶颈 |
| [run-5-p3-retry](../../archive/search/experiments/run-5-p3-retry.md) | P3 复测（英文 query） | 5/5 机制 | 5/5 基础设施 | ✅ 双维度通过 |
| [run-6-p3-zh-retry](../../archive/search/experiments/run-6-p3-zh-retry.md) | P3 复测（中文 query，排除波动） | 5/5 机制 | 1/5 基础设施 | ⚠️ 确认机制零误引用，fetch 层为中文站点稳定瓶颈 |
| [run-7-p4-dedup](../../archive/search/experiments/run-7-p4-dedup.md) | P4 同源内容合并首轮 | — | — | 机制通过：Merge Precision 100%, False Merge 0, Info Loss 0。指标修订见 D-2026-06-24-search-revise-p4-metrics |
| [run-8a-mcp-backend](../../archive/search/experiments/run-8a-mcp-backend.md) | MCP 后端切换验证（Node.js → Python curl_cffi） | — | 1/5 基础设施 | ❌ **TLS 指纹假设 disproven**。Run A/B 双轮 0/10，HTTP Success ≠ Content Success（juejin 全部返回 "Please wait..." JS Challenge 假页面）。回滚动作：MCP 切回 Node.js，中文场景永久 Tier C。新候选 M-22 Browser-backed Fetch |
| [run-9-p5-output-schema](../../archive/search/experiments/run-9-p5-output-schema.md) | P5 Output Schema 首轮验证（单源列表型证据集） | 1/5 设计失败 | — | ❌ **设计失败，非机制失败**。Run A 基线 Claim Coverage 100%、Info Loss 0%——指标天花板已被自由文本顶满，Run B schema 抽取无提升空间。根因：Run #6 单源列表型证据集（1 URL × 4 同源 claim）不触发 P5 核心收益场景（跨源字段对齐）。P5 决策维持 proposed，启动 Run #9b 多实体对比框架重做 |
| [run-9b-p5-output-schema-v2](../../archive/search/experiments/run-9b-p5-output-schema-v2.md) | P5 Output Schema 多实体对比验证（Gin/Echo/Fiber × 5 维度） | 3/5 有条件 | — | ⚠️ **有条件 active（外部评审决策 C）**。Conflict ID +40% 仅方向性信号（非双盲）；Field Alignment 天花板归因 P3 证据集已结构化；Output Length 已排除（纯格式差异）。Run #9c 须双盲 + 非结构化证据集，Conflict ID Δ < +15% 则降回 proposed |
| [run-9c-p5-output-schema-v3](../../archive/search/experiments/run-9c-p5-output-schema-v3.md) | P5 Output Schema 双盲验证（非结构化证据集） | 2/5 | — | ❌ **双盲证伪，降回 proposed**。Conflict ID Δ=-20%（自由文本 100% > schema 80%），Field Alignment Δ=-7%。核心发现：schema 结构可能限制跨维度冲突发现（执行者倾向只报告 schema 内字段间冲突，自由文本叙事流更灵活）。Schema 幻觉=0 护栏有效但不足以挽救机制收益 |
| [run-10-p6-highlights](../../archive/search/experiments/run-10-p6-highlights.md) | P6 Highlights verbatim 抽取保真度验证（PostgreSQL 17 vs MySQL 8.4） | 4/5 | — | ✅ **P6 升级 active**。Extractive Fidelity 92.3%（24/26），Paraphrase 7.7%（2/26），Untraceable 0。两条 paraphrase 模式：主语同义替换 + 跨语言归纳。提示词层 verbatim 抽取指令基本有效。SKILL 加载机制修复（symlink）后首条 P 级机制通过验证 |
| [run-11-p4-semantic-merge](../../archive/search/experiments/run-11-p4-semantic-merge.md) | P4 语义场景去重增益验证（LLM vs SimHash/Jaccard 基线，K8s sidecar 跨语言） | 4/5 | — | ✅ **P4 语义场景已验证（translation 子类）**。Baseline：P=1.00, R=0.20, F1=0.33（高精度低召回，FP=0）。P4 LLM：P=1.00, R=1.00, F1=1.00。Net Gain（Recall 差）+0.80。3 个 translation 对全部正确合并。Baseline translation Miss 属算法边界（lexical 不具备跨语言能力，文献一致）；3-8 verbatim Miss 属数据限制（仅摘要非全文，摘要级指纹≠文档级指纹）。降级 4/5：样本量仅 3 对（全部 translation），Net Gain +0.80 为上界估计（摘要限制低估 baseline verbatim 能力） |
| [run-12-p4-summary-rewrite](../../archive/search/experiments/run-12-p4-summary-rewrite.md) | P4 summary/rewrite 子类补评测（Next.js 15 async request APIs） | 5/5 | — | ✅ **P4 semantic-summary / semantic-rewrite 子类验证通过**。Run #12 初次 Python 3.13 Attempt 为 N/A（样本不足 + 全文归档不合格）；Run #12b 严格重跑后通过：GT positive=5（summary 3、rewrite 2），Baseline SimHash/Jaccard：P=1.00, R=0.00, F1=0.00；P4 LLM：P=1.00, R=1.00, F1=1.00；Net Gain +1.00；False Merge=0；Info Loss=0。P4 语义合并证据范围从 translation 扩展到 summary/rewrite |
| [run-13-p5-evidence-map](../../archive/search/experiments/run-13-p5-evidence-map.md) | P5 v2 Evidence Map / Claim Graph 双盲验证（Gateway API，非结构化证据集） | 2/5 | — | ❌ **保持 proposed**。Material Relation Recall：Run A 15/16=93.8%，Run B 16/16=100%，Δ=+6.3% < +15%。Cross-Dimension Recall 双方 12/12 天花板，Δ=0。安全指标（False Conflict / Unsupported Relation / Info Loss）双方均为 0。结构化中间表示再次未对自由文本展现决定性优势。唯一可复现增量：Gap Ledger 强制枚举证据缺口（捕获 Run A 漏掉的回滚 gap GT15）。衍生候选：后续应只验证“追加 Gap Ledger / 证据缺口枚举”最小机制，而非完整 Evidence Map |
| [run-14-p5-gap-ledger](../../archive/search/experiments/run-14-p5-gap-ledger.md) | P5 Gap Ledger 最小机制双盲验证（Cloudflare 反爬方案，gap 密集证据集 9 gap + 5 relation） | **4/5** | — | ✅ **P5 Gap Ledger 升级 active**。Gap Detection Recall Δ=+55.6%（33.3% → 88.9%），Implicit Gap Recall Δ=+40%（40% → 80%），Material Relation / Traceability / Unsupported / Info Loss 全部不退化。False Gap=1（Run B G15 把 cloudscraper“已淘汰”误标为“侦察用途待评估”，阻挡 5/5）。成本：篇幅 +36%（Gap Ledger 占主要增量，可接受）。Gap Ledger 最小机制作为 P5 唯一落地候选进入 SKILL.md。失败模式：追求 gap 召回时可能产生轻度 false gap，缓解措施=每项 gap 需引用 evidence id，evidence 充分则不应标 gap |

### 9.3 最终路线状态

- P1 Domain Goggles：active
- P1.5 FinalScore 联动：active
- P2 Query Rewrite + Fanout：**deferred**（D-2026-06-24-search-defer-p2）
- **P3 Evidence-bound Citation：active（三档模式，D-2026-06-24-search-adopt-p3）**
- **P4 Evidence Deduplication：active（同源内容合并，D-2026-06-24-search-adopt-p4-same-source-merge）** — Run #7 逐字场景 Merge Precision 100%；Run #11 translation 子类 4/5（Baseline P=1.00/R=0.20/F1=0.33，P4 LLM P=1.00/R=1.00/F1=1.00，Net Gain +0.80）；Run #12b summary/rewrite 子类 5/5（GT positive=5：summary 3、rewrite 2；Baseline P=1.00/R=0.00/F1=0.00，P4 LLM P=1.00/R=1.00/F1=1.00，Net Gain +1.00，False Merge=0，Info Loss=0）。P4 证据范围已覆盖逐字、translation、summary、rewrite；后续只在出现 false merge / 信息损失案例时再复评
- P5 / P6（V2）：候选
- **P5 Gap Ledger（最小机制）：active**（Run #14 4/5，2026-06-26）— 在自由文本合成前追加一步「强制枚举证据缺口（Gap Ledger）」。收益：Gap Detection Recall Δ=+55.6%（33.3% → 88.9%），Implicit Gap Recall Δ=+40%（40% → 80%），安全指标全部不退化。成本：篇幅 +36%。失败模式：追求 gap 召回可能产生轻度 false gap（False Gap=1 阻挡 5/5），缓解措施=每项 gap 需引用 evidence id，evidence 充分则不应标 gap。进入 SKILL.md。P5 完整 Evidence Map / Claim Graph 保持 proposed，不再推进（Run #13 2/5 已证伪）
- **P5 Output Schema / Evidence Map**：**proposed**（D-2026-06-25-search-redesign-p5-evidence-map；supersedes D-2026-06-24-search-evaluate-p5-output-schema）— Run #9 1/5 设计失败，Run #9b 3/5 有条件，Run #9c 2/5 双盲证伪字段对齐 schema，Run #13 2/5 双盲证伪 Evidence Map / Claim Graph（Material Relation Recall Δ=+6.3% < +15%，Cross-Dimension 双方 12/12 天花板，安全指标全 0）。两代结构化中间表示均未对自由文本展现决定性优势。唯一可复现增量：Gap Ledger 强制枚举证据缺口。后续若再评估 P5，只验证“追加 Gap Ledger / 证据缺口枚举”最小机制，不再做完整 Evidence Map
- **P6 Highlights / Relevance Compression：active**（D-2026-06-25-search-adopt-p6-highlights）— Run #10 4/5：Extractive Fidelity 92.3%，Paraphrase 7.7%，Untraceable 0。提示词层 verbatim 抽取指令基本有效。两条 paraphrase 模式：主语同义替换 + 跨语言归纳
- **Infra（MCP 后端升级）**：**rolled-back**（D-2026-06-24-search-infra-mcp-upgrade）— Run #8a 否决 TLS 指纹假设；中文场景永久 Tier C；新候选 M-22 Browser-backed Fetch 状态：**候选（暂缓）**，触发条件为 Tier C 被证明严重影响答案质量

详见各决策文件 + [search-orchestrator/README.md](README.md)。

### 9.4 工程约定（Iron Laws）

非机制候选，但已落地为 SKILL.md 硬性规则的工程教训：

| 约定 | 来源 | SKILL.md 位置 | 说明 |
|------|------|--------------|------|
| fetch_content 全文归档 | Run #10 + Run #11 暴露的系统性问题 | §2.1（新增 2026-06-25） | 每个 fetch 成功的 URL 必须在输出文件归档完整正文（非摘要）。Run #11 教训：摘要替代正文破坏 SimHash 经典设定，导致 baseline verbatim 检测能力被低估。§3.6.1 P6 已补澄清——"不进合成 context"≠"全文丢弃" |

---

## 10. 现成结论引用（2026-06-25）

> **背景**：SKILL 加载问题修复后（见 handoff 2026-06-25），回顾历史 Run #1~#9c 发现 5 个机制验证型 Run 在"SKILL 未加载"状态下执行，结论可信度存疑。对其中 5 个候选机制评估"自实验 vs 搜现成结论"后，判定以下 5 项可直接引用现成学术/工程结论，无需自实验（避免与现成研究重复）。
>
> **全文**：[搜索结论.md](搜索结论.md)
> **执行主体**：TRAE agent 文献调研（非 SKILL 层机制执行，不违反 project-rules.md §约束 5）

### 10.1 P1 Domain Goggles — 提示词层软过滤 vs Brave Goggles 硬排序

| 项 | 内容 |
|---|---|
| 对应存疑 Run | #1 |
| 核心命题 | 提示词层"软过滤"（LLM 按 BOOST/DOWNRANK/DISCARD 表打标）能否等效 Brave Goggles 的域名级硬排序 |
| **裁决** | **不可等效。** 关键不在"排序精度"而在"介入点"：Goggles 在召回阶段对数万候选硬过滤，软过滤在最终 10-50 条上软重排。精度损失有界（NDCG 级），召回损失无界（长尾不可恢复）。叠加延迟 100-1000×、成本、非确定性三重代价 |
| 工程结论 | 软过滤可视为 Goggles 在"最终结果重排"子空间上的有损近似；对长尾依赖查询发生不可恢复的结构性失败 |
| 关键来源 | [Brave Goggles 白皮书](https://brave.com/static-assets/files/goggles.pdf)、[RankGPT](https://github.com/sunnweiwei/rankgpt)、[Brave Rerank](https://brave.com/blog/search-rerank) |
| 对 P1 决策的影响 | P1 已 active（D-2026-06-23-search-adopt-goggles）。现成结论**支持**提示词层软过滤作为降级实现的合理性（无 Brave 后端时的最优替代），但明确了其结构性天花板——长尾召回不可恢复。P1 状态不变 |

### 10.2 P4 Same-Source Merge — 提示词层去重 vs IR 成熟方法

| 项 | 内容 |
|---|---|
| 对应存疑 Run | #7 |
| 核心命题 | 同源转载/镜像去重是 IR 成熟技术；项目提示词层实现是否与现成方法等价 |
| **裁决** | **分场景。** 逐字/近逐字镜像：提示词层与现成方法（SimHash/shingling+MinHash）目标等价，但工程上被严格压制（更贵、更慢、不确定、阈值不可证），属过度工程。语义级同源（改写/洗稿/翻译）：现成句法指纹明确"做不好"，提示词层 LLM 可能真正不等价（更强），但需用语义任务自己的评测证明，不能援引 shingling 成熟度背书 |
| 工程结论 | 结果级尺度（几条到上百条）下，朴素 SimHash/Jaccard + URL 规范化几行代码即可平替逐字去重。提示词层唯一站得住的差异化是"语义合并"和"零额外基础设施" |
| 关键来源 | [Manning IR Book §19.6](https://nlp.stanford.edu/IR-book/html/htmledition/near-duplicates-and-shingling-1.html)、[Manku/Google WWW'07](https://research.google.com/pubs/archive/33026.pdf)、[Henzinger DOCENG'13](https://clgiles.ist.psu.edu/pubs/DOCENG2013-near-duplicate-detection.pdf) |
| 对 P4 决策的影响 | P4 已 active（D-2026-06-24-search-adopt-p4-same-source-merge）。现成结论**部分支持** P4：逐字场景下 P4 是 overkill 但功能等价；语义场景下 P4 有真正价值。Run #11 已验证 translation 子类（4/5）：P4 LLM P=1.00/R=1.00 vs lexical baseline P=1.00/R=0.20，Net Gain +0.80，FP=0。Run #12b 已补 summary/rewrite 子类（5/5）：GT positive=5（summary 3、rewrite 2），Baseline P=1.00/R=0.00/F1=0.00，P4 LLM P=1.00/R=1.00/F1=1.00，Net Gain +1.00，False Merge=0，Info Loss=0。P4 语义证据范围已覆盖 translation、summary、rewrite |

### 10.3 #20 反证检索 — 负向 query 召回差是否"非提示词可治"

| 项 | 内容 |
|---|---|
| 对应存疑 Run | #2/3 遗产 |
| 核心命题 | DDG/通用搜索后端对负向 query（OR/否定词/反例词）召回差是后端能力限制，非提示词可治 |
| **裁决** | **基本成立，但需收紧措辞。** 负向召回差发生在检索阶段（非生成阶段），提示词够不到。NevIR 基准：多数神经检索模型在否定上等于或低于随机排序；"语义坍缩"使否定信号在向量空间不可分。DDG 特异性：基于 Bing，2023 年起大部分算子被下线，"后端能力限制"字面成立 |
| 反证修正 | 命题把三种机制混为一谈（OR 算子支持、词项级否定、语义级反例）；词法后端对显式否定线索并非无能（BM25 比 dense embedding 抓得好）；可由检索架构+训练数据缓解，非"完全不可治" |
| 工程结论 | agent 正确动作：OR 拆成多次检索取并集；否定/排除转正向词项或后置过滤；反证用高召回词法 + NLI/重排，而非指望后端理解否定 |
| 关键来源 | [NevIR EACL'24](https://aclanthology.org/2024.eacl-long.139.pdf)、[NegBench MIT](https://news.mit.edu/2025/study-shows-vision-language-models-cant-handle-negation-words-queries-0514)、[DDG 算子下线 gHacks](https://www.ghacks.net/2023/04/24/duckduckgo-disables-most-search-filters-from-search)、[BioGen TREC'25](https://arxiv.org/html/2603.17580) |
| 对 #20 状态的影响 | #20 保持**候选（P2 失败遗产）**。现成结论**支持** #20 的核心判断（提示词层不可治），但修正了"完全不可治"的绝对说法——可由检索策略+架构缓解。理想机制列的"分拆负向短语单发"已被现成结论验证为正确方向 |

### 10.4 #21 多样性排序 — LLM 提示词层算分可靠性

| 项 | 内容 |
|---|---|
| 对应存疑 Run | #2/3 遗产 |
| 核心命题 | LLM 在提示词层做数值算分（DiversityPenalty ±2）不可靠，量级压不过 SourceWeight ±10 |
| **裁决** | **成立，且比直觉更深。** 三重叠加：① LLM 算术本身不准（NumericBench：简单加减都达不到 100%，next-token 范式与算术进位逻辑相反）；② 数值分被"压缩"（评分误差 σ²≈0.21 vs 基线 0.87，4 倍方差压缩），±2 落在噪声地板内；③ pointwise 逐条打分是排序家族里方差最大、最不稳定的范式，提示噪声影响比算法本身还大 |
| 工程结论 | 算分必须出 LLM、进算法层。LLM 只做语义判断（输出离散标签/布尔，不输出分数），数值合成与排序交给确定性代码。若必须 LLM 参与排序，用 pairwise/setwise 而非 pointwise |
| 关键来源 | [NumericBench arXiv'25](https://arxiv.org/html/2502.11075v1)、[LLM 评分压缩 arXiv'25](https://arxiv.org/html/2602.13862v2)、[LLM-as-a-Judge 偏差 arXiv'25](https://arxiv.org/html/2506.22316v2)、[零样本 LLM 排序大规模研究 arXiv'24](https://arxiv.org/html/2406.14117v1) |
| 对 #21 状态的影响 | #21 保持**候选（P2 失败遗产）**。现成结论**强支持** #21 的核心判断（提示词层算分不可靠），且给出了比原判断更深的机理（三重叠加）。理想机制列的"排序后处理代码"方向正确 |

### 10.5 #22 Browser Fetch — headless 浏览器是否"唯一对路径方案"

| 项 | 内容 |
|---|---|
| 对应存疑 Run | #8a 遗产 |
| 核心命题 | Playwright/headless Chromium 是穿透 Cloudflare JS Challenge 的唯一对路径方案 |
| **裁决** | **命题需修正。** 真实浏览器内核是**必要执行环境**（JS Challenge 必须真实 JS 执行），但**既非唯一**（老式挑战有 cloudscraper/FlareSolverr 旁路；引擎级工具 nodriver/Camoufox 更隐蔽；托管云浏览器另成一路），**也不充分**（裸 headless 必被识别，需叠加 stealth 补丁 + 住宅代理 + 拟人化行为 + CAPTCHA solver） |
| 工程结论 | headless 浏览器是"地基"不是"整栋楼"。稳定方案是"住宅代理 + 真实浏览器 + solver"多层叠加，让单层失效不至于崩盘 |
| 关键来源 | [Browserless](https://www.browserless.io/blog/how-to-bypass-cloudflare-scraping)、[Scrapfly stealth](https://scrapfly.io/blog/posts/playwright-stealth-bypass-bot-detection)、[ByteTunnels nodriver/Camoufox](https://bytetunnels.com/posts/playwright-vs-selenium-stealth-which-evades-detection-better) |
| 对 #22 状态的影响 | #22 保持**候选（暂缓）**。现成结论**修正**了原命题的"唯一"措辞，但**不改变**暂缓决策——触发条件（Tier C snippet-only 被证明严重影响答案质量）未变。若未来启动，应选多层叠加方案而非裸 Playwright |

### 10.6 汇总：现成结论对路线图的影响

| 机制 | 原状态 | 现成结论影响 | 是否需自实验 |
|------|--------|-------------|-------------|
| P1 Goggles | active | 支持降级实现合理性，明确长尾天花板 | 否 |
| P4 Same-Source Merge | active（已机制化） | 逐字场景 overkill，语义场景有真正价值 | 仅语义场景需补评测 |
| #20 反证检索 | 候选 | 支持核心判断，修正"完全不可治" | 否 |
| #21 多样性排序 | 候选 | 强支持核心判断，给出更深机理 | 否 |
| #22 Browser Fetch | 候选（暂缓） | 修正"唯一"措辞，不改变暂缓决策 | 否（启动时选多层方案） |

**净变化**：5 个机制均无需自实验，避免与现成研究重复。唯一仍需自实验的是 P6 Highlights（提示词层抽取保真度，无现成结论覆盖）和 P3 三档模式（项目自创设计，附带在 Run #10 观察）。
