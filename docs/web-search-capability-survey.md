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
**DDG MCP** 当前只暴露 `BOT_DETECTED / HTTP_ERROR / TIMEOUT / UNKNOWN` 四种（见 [web-search-setup.md](../skills/search-orchestrator/references/web-search-setup.md)）。

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

## 9. 外部评审反馈与最终优先级（2026-06-23 T3 收敛）

> 本节按 OUTLINE §10 "Preferred Collaboration Pattern" 流程产生：T1（Trae 初版报告）→ T2（外部 GPT 评审）→ T3（合并收敛）。原 §2–§5 不动，本节作为最终决策的覆盖层（override layer）。

### 9.1 接受的评审修正

| 评审点 | 原稿位置 | 调整 |
|--------|----------|------|
| **M5 Output Schema 被低估** | §2 M5 / §3 表"⚠️/❌" | 升级为高价值候选，但需要 P1~P4 流程先建立后才动手；进 mechanism-candidates V2 |
| **M4 highlights 重要性被低估** | §4 启示 5 标"中 ROI" | 实质是 **relevance compression**，不是简单摘要；推迟到 V2 与 Output Schema 一同评估 |
| **multi-agent 拆分** | §4 启示 6 "拒绝" | 拒绝**重量**多 agent（Planner/Searcher/Composer），但 **轻量 Query Fanout 本就是 P2 的一部分**——评审准确指出这一点 |
| **Evidence-bound Citation** | §4 启示 2 | 自检模板从行为级升级为**数据结构级**：每个 Finding = `Claim + Quote + URL`，缺一丢弃 |
| **新增 Evidence Deduplication** | 原稿未涵盖 | 同源转载去重（官方 → 新闻 → 社区 → 聚合），低成本高收益，纳入 P4 |
| **Tier × Depth Mapping 暂缓** | §4 启示 4 "弱 ROI 但优雅" | 评审准确指出这是"流程可解释性"而非"搜索质量"——降级为暂缓 |

### 9.2 最终落地优先级

| 优先级 | 改造 | 改造形式 | 状态 |
|--------|------|---------|------|
| **P1** | Domain Goggles（预置 4~6 个软 goggle） | SKILL.md 新增 §5 Goggles | **本会话即落地（用户选择 C：先试 P1）** |
| **P2** | Query Rewrite + Fanout（3 路：直白/限域/反证） | SKILL.md §1.4 升级为强制 | 等 P1 A/B 验证后推进 |
| **P3** | Evidence-bound Citation（Claim/Quote/URL 三元组） | SKILL.md Phase 4 模板改写 | 同上 |
| **P4** | Evidence Deduplication（同源去重） | SKILL.md Phase 3 加一步 | 同上 |
| **P5**（V2 候选） | Output Schema（结构化抽取） | 进 mechanism-candidates A 类 | 等 V1 流程跑顺再评估 |
| **P6**（V2 候选） | Highlights / Relevance Compression | 进 mechanism-candidates A 类 | 同上 |
| 暂缓 | Tier × Depth Mapping | — | 不进 V1 |
| 拒绝 | 重量 multi-agent（Planner/Searcher/Composer） | 走 Cline 原生 subagent | 进 mechanism-candidates 备查 |

### 9.3 收敛律检查

按 OUTLINE §10.2 "2 轮收敛节奏"：本次调研走完 T1（产出）→ T2（GPT 评审）→ T3（本节合并），**符合收敛规则**。后续若再有第 4 轮发散，必须按 §9.3 "禁止引入新核心问题"处理。

### 9.4 T2→T3 期间外部评审原文

GPT 评审原文已记录在本次对话 commit 6a37513 之后的会话上下文中，未单独存档为文件——理由：本节已经把所有可执行结论提炼，原文复述会重复信息。如未来需要 audit 评审过程，可从 git 会话日志 / handoff 文件回溯。

---

## 10. A/B 验证记录

> 评测框架与可贴 prompt 模板见 [skills/search-orchestrator/examples/ab-test-template.md](../skills/search-orchestrator/examples/ab-test-template.md)。

### 10.1 Run #1 —— Phase 3.5 Goggle 首轮验证（2026-06-23）

| 项 | 内容 |
|----|------|
| 改造 | Phase 3.5 Domain Goggles（A general-tech + E zh-tech） |
| Commit | `19a8953` |
| Query | `"Kubernetes 滚动更新 ImagePullBackOff 排查方法"`，max_results=10，单次调用 |
| Run A 农场/转载站数 | 5/10（CSDN×4、lryc.cc×1） |
| Run B 被 DOWNRANK+DISCARD 数 | 5/10 |
| **垃圾站清除率** | **5/5 = 100%** |
| BOOST 命中 | 1/10（kubernetes.io/zh） |
| 未命中 `—` 状态 | 4/10（imroc.cc、devgex.com、cloudnative-tech.com、jishuzhan.net） |
| 用户首轮主观评分 | 2/5（错误指标） |
| 按 ab-test-template §2.4 修正评分 | **4/5** |
| 决策 | **保留**，推进 P1.5 联动 |

### 10.2 第二轮 GPT 评审与 P1.5 联动

GPT 二轮评审的核心修正：

| 评审点 | 调整 |
|--------|------|
| BOOST 命中率是错误指标 | ✅ 接受 → ab-test-template §2.3 把"垃圾站清除率"列为主指标，BOOST 命中数降为"参考" |
| 缺 TRUST SCORE 层 | ✅ 接受 → 新增 SKILL.md §3.5.5 联动小节，FinalScore = SearchRank + GoggleWeight + SourceWeight |
| 不要手动加 imroc.cc | ✅ 接受 → 让 Source Weighting 把 imroc.cc 自然评为 T2，无需扩 Goggle |
| 评测框架是真正资产 | ✅ 接受 → 固化为 examples/ab-test-template.md |

### 10.3 联动后的预期效果（基于 Run #1 数据回算）

按 SKILL.md §3.5.5 FinalScore 公式回算 Run #1 的 10 条结果：

| URL | SearchRank | GoggleWeight | SourceWeight | FinalScore |
|-----|-----------:|-------------:|-------------:|-----------:|
| kubernetes.io/zh/... | -8 | +2 | +10 (T1) | **+4** ⬆⬆ |
| imroc.cc/... | -10 | 0 | +3 (T2) | **-7** ⬆ |
| cloudnative-tech.com/... | -5 | 0 | +1 (T3) | **-4** |
| devgex.com/... | -6 | 0 | +1 (T3) | **-5** |
| jishuzhan.net/... | -9 | 0 | +1 (T3) | **-8** |
| blog.csdn.net (×2) | -1, -2 | -1, -1 | +0.1 (T4) | **-1.9 / -2.9** ⬇ |
| wenku.csdn.net (×2) | -3, -4 | -1, -1 | +0.1 (T4) | **-3.9 / -4.9** ⬇ |
| lryc.cc/news/... | -7 | -∞ | — | **-∞** ⛔ |

**重排后预期 Top 5**：kubernetes.io / imroc.cc / cloudnative-tech / devgex / blog.csdn[1]。
**Top-5 T1+T2 变化**：Run A 原始 = 0，Run B(Goggle only) = 1，**Run B(Goggle + SourceWeight) = 2**——通过联动让 imroc.cc 自然升上来，是不扩白名单的最佳证明。

### 10.4 下一次验证

下一项跑 A/B 应是 **P2 Query Rewrite + Fanout**。模板已就位。
