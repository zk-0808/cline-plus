# 01 — Background & Related Work

> 本章回答 RQ1：商业 agent 搜索栈做了什么工程动作？哪些可在提示词层等效实现？

---

## 1. Cline 搜索能力现状

### 1.1 Cline 本身没有内置 web search

Cline 把搜索能力外包给 MCP（Model Context Protocol）。本项目默认栈：

```
用户 query
   ↓
Cline (LLM Plan/Act)
   ↓ 调 search MCP
duckduckgo-websearch MCP（nickclyde/duckduckgo-mcp-server，uvx 部署，免 API key）
   ↓
DuckDuckGo 后端（基于 Bing）
   ↓ 返回 title + url + snippet
LLM 自行 synthesize
```

**能力位置**：裸 search + LLM 自行处理。这与 Perplexity / Tavily / Exa 等商业 agent 的差距是**结构性**的。

### 1.2 默认栈的能力边界

| 维度 | 默认栈 | 商业 agent |
|------|--------|-----------|
| 搜索深度档位 | 无（单档） | Exa 6 档 / Tavily 2 档 |
| Query 自动改写 | 无 | Tavily auto_parameters / OpenAI multi-query |
| 内置答案合成 | 无（LLM 自做） | Tavily include_answer / Perplexity Sonar |
| 内容压缩 | fetch_content 返回 8k 清洗文本 | Exa highlights（4k 密集摘要） |
| 结构化输出 | 无 | Exa output_schema |
| 域名级排序 | 无 | Brave Goggles（DSL） |
| Citation 强制 | 无 | Perplexity 架构强制 |
| 失败处理 | 4 种错误码 | Tavily 6 种错误码 |
| 价格 | 0 元 | $1/M tokens 量级 |

---

## 2. 主流 agent 12 项工程手法（按证据梳理）

详见 [survey.md §2](../search-orchestrator/survey.md) 与 [search-research-results.md](../search-orchestrator/search-research-results.md) 原始证据。本节做浓缩对照。

| # | 手法 | 代表实现 | 关键 quote |
|---|------|---------|-----------|
| M1 | 搜索深度档位 | Exa 6 档（instant ~250ms → deep-reasoning 12-40s）；Tavily basic/advanced | "不存在一种搜索打天下" |
| M2 | 自动改写 / 扇出 | Tavily auto_parameters；OpenAI Deep Research 拆 sub-queries 并行扇出 | "breaks complex questions into sub-queries" |
| M3 | 内置答案（include_answer） | Tavily `answer + results + images`；Perplexity inline citation | "搜索阶段就已经做完 LLM-grounded answer" |
| M4 | 内容压缩（highlights） | Exa "condense into just the tokens an LLM needs" 4k chars；Tavily `include_raw_content` | "已为 LLM 优化过的 4k 字密集信息" |
| M5 | 结构化输出（output_schema） | Exa 任意 JSON schema；Tavily auto schema profile | "按指定 schema 抽取信息" |
| M6 | **域名级 ranking 控制（Goggles）** | Brave Search DSL，BOOST/DOWNRANK/DISCARD | "同一引擎在不同 Goggle 下表现可差 5 倍" |
| M7 | 类别索引 | Exa 1B+ people / 50M+ companies / 100M+ papers；Tavily topic | "专用索引" |
| M8 | **Citation 强制** | Perplexity Sonar Pro citation hallucination rate 37% vs ChatGPT 67% | "architecture forces citation discipline" |
| M9 | Multi-Agent 编排 | OpenAI Deep Research: planner → searchers ×N → summarizer → composer | "multi-agent research system" |
| M10 | Query Rewriting | Azure AI Search Semantic Rewrite；学术 Agent4Ranking 4 角色 | "generative model generates alternative queries" |
| M11 | 失败处理 | Tavily 400/401/429/432/433/500；DDG MCP 4 种 | 错误码语义化 |
| M12 | 价格信号 | Perplexity ~$1/M tokens；Tavily credits；Exa 未公开 | "按 token 付费的 LLM 加工产物" |

---

## 3. 差距归因

**关键发现**：差距的 **80% 不在搜索引擎本身**，而在围绕搜索的 5~7 个工程动作。其中：

| 类别 | 手法 | 可提示词等效？ | 落地路径 |
|------|------|---------------|---------|
| **可等效** | M6 Goggles | ✅ | 提示词层 BOOST/DOWNRANK/DISCARD 表 + LLM 在 evaluate 阶段后置过滤 |
| **可等效** | M8 Citation 强制 | ✅ | 提示词层 Claim/Quote/Source 三元组 + self-check 模板 |
| **可等效** | M4 highlights 压缩 | ✅ | 提示词层 verbatim 抽取 ≤500 token + Source 标注 |
| **部分覆盖** | M1 深度档位 | ⚠️ | SKILL §0 已有 L0/L1/L2/L3 认知档位；MCP 后端不支持 |
| **部分覆盖** | M7 类别路由 | ⚠️ | 可在 query 层模拟（site: / 关键词前缀） |
| **不可等效** | M3 include_answer | ❌ | LLM 自身就是答案合成器，不重复造 |
| **不可等效** | M5 output_schema | ❌ | Run #9c 双盲证伪：字段对齐 schema 反而削弱跨维度冲突发现（见 [03-mechanisms.md §3.5](03-mechanisms.md)） |
| **不可等效** | M9 multi-agent | ❌ | 走 Cline 原生 subagent，不在 skill 内建（OUTLINE 五问门控 Q1 已有） |
| **不可等效** | M10 query rewriting | ❌ | Run #2/3 证伪 + NevIR 学术结论：负向 query 召回差属后端能力限制 |
| **够用** | M11 失败处理 | ✅ | DDG MCP 4 种错误码够用；wrapper 补充跨调用状态 |
| **优势** | M12 价格 | ✅ | DDG 零成本，远优于 $1/M tokens |

---

## 4. 强化启示（高 ROI 转译）

把商业 agent 的工程动作转译为提示词层最小机制。详见 [survey.md §4](../search-orchestrator/survey.md)。

| 启示 | 落地机制 | 改造成本 | 验证状态 |
|------|---------|---------|---------|
| 启示 1：把 Goggles 搬到提示词 | **P1 Domain Goggles**（5 预置 + BOOST/DOWNRANK/DISCARD 三档） | 30 分钟 | ✅ Run #1 4/5 active |
| 启示 2：Citation 架构强制 | **P3 Evidence-bound Citation**（三档 Tier A/B/C + self-check） | 10 分钟 | ✅ Run #4/5/6 三轮验证 active |
| 启示 3：Query Rewriting 三变换 | （后改为 P2 fanout） | — | ❌ Run #2/3 证伪 deferred |
| 启示 4：Search Depth × Tier 联动 | （融入 SKILL §0 L0/L1/L2/L3） | — | ✅ 已落地 |
| 启示 5：highlights 替代压缩 | **P6 Highlights**（fetch 后 verbatim ≤500 token） | 20 分钟 | ✅ Run #10 4/5 active |
| 启示 6（拒绝）：multi-agent 扇出 | 不进 V1，走 Cline 原生 subagent | — | 候选（不进 V1） |

---

## 5. 我们的当前位置（snapshot）

按 12 手法逐一对照后的当前覆盖度：

| # | 手法 | V1 现状 | 差距 |
|---|------|---------|------|
| M1 | 深度档位 | SKILL §0 L0/L1/L2/L3 认知档位；MCP 不支持 | ⚠️ 部分覆盖 |
| M2 | 自动改写 | Skill §1.2 人工 decompose；无自动扇出 | ❌ P2 证伪后 deferred |
| M3 | include_answer | 完全无；LLM 自己合成 | ❌ 不重复造 |
| M4 | highlights 压缩 | **P6 已 active**（≤500 token verbatim 抽取） | ✅ 已补齐 |
| M5 | output_schema | **Run #9c 证伪**，不做 | ❌ 学术证伪 |
| M6 | Goggles | **P1 已 active**（5 预置 + 三档动作） | ✅ 已补齐 |
| M7 | Category 路由 | query 层模拟 | ⚠️ 部分覆盖 |
| M8 | Citation 强制 | **P3 已 active**（三档模式 + self-check） | ✅ 已补齐 |
| M9 | multi-agent | Cline 原生 subagent，未集成到 skill | ⚠️ 跨 skill |
| M10 | Query rewriting | P2 证伪 + #20 候选 | ❌ 后端限制 |
| M11 | 失败处理 | DDG 4 种 + wrapper 跨调用状态 | ✅ 够用 |
| M12 | 价格 | 0 元 | ✅ 优势 |

**总结**：12 手法中 5 项已补齐 / 部分覆盖（M1/M4/M6/M8/M11），3 项明确放弃（M3/M5/M9/M10），1 项候选暂缓（M9），2 项部分覆盖（M2/M7）。**核心收益区已全部覆盖**——M6 Goggles 与 M8 Citation 是商业 agent 借鉴价值最高、改造成本最低的两项，本项目均已落地。

---

## 6. 与现成学术结论的对照

避免重复造轮子，5 个机制评估援引了现成学术结论（见 [survey.md §10](../search-orchestrator/survey.md) / [搜索结论.md](../search-orchestrator/搜索结论.md)）：

| 机制 | 现成结论 | 来源 | 净影响 |
|------|---------|------|-------|
| P1 Goggles | 软过滤≠硬排序；精度损失有界，召回损失无界 | Brave Goggles 白皮书 / RankGPT | 支持降级实现合理性，明确长尾天花板 |
| P4 Same-Source Merge | 逐字场景 overkill；语义场景有真正价值 | Manning IR Book §19.6 / Manku WWW'07 | 部分支持，仅语义场景需自实验 |
| #20 反证检索 | 神经检索在否定上等于/低于随机 | NevIR EACL'24 / NegBench MIT | 强支持核心判断，修正"完全不可治"措辞 |
| #21 多样性排序 | LLM 算术本身不准；评分误差 4 倍方差压缩 | NumericBench / LLM-as-a-Judge | 强支持核心判断，给出更深机理 |
| #22 Browser Fetch | 真实浏览器内核是必要非充要 | Browserless / Scrapfly / ByteTunnels | 修正"唯一"措辞，不改变暂缓决策 |

**净结论**：5 个机制均无需自实验，避免与现成研究重复。只有 P6 Highlights 与 P3 三档模式是项目自创设计，无现成结论覆盖，需自实验。

---

## 7. 与本研究的差异点

本研究**不是**重复实现商业 agent 的功能，而是回答两个差异问题：

1. **可不可以不花钱**：商业 agent 的工程动作能否在零 API key / 零付费后端的开源栈上等效实现？答：5 项可以，3 项不可，已用实验数据证实。
2. **可不可以验证有效**：提示词改造的效果能否经受双盲 A/B + 量化评分？答：6 项通过，4 项证伪，方法论可复现。

详见 [02-methodology.md](02-methodology.md)。
