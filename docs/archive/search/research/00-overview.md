# 00 — Overview

> 本文件是 search-orchestrator 研究项目的入口摘要。如果只读一份文档，读这份。

---

## Abstract（中文）

把「商业 agent 搜索体系的工程动作」转译为「Cline + DDG MCP 栈上的提示词层机制」，使零 API key、零付费后端的开源 agent 搜索能力接近商业 agent（Perplexity / Tavily / Exa）的工程质量。

围绕这一目标，本项目在 2026-06-23 ~ 2026-06-26 期间完成 **14 轮双盲 A/B 实验**，验证了 **6 个提示词层机制**（P1/P1.5/P3/P4/P5 Gap Ledger/P6）与 **1 个基础设施层机制**（#24 反-bot 节流 wrapper），其中 6 项 P 级机制与 1 项 Infra 全部升级 active。同期通过 4 轮证伪实验否决了 P2 fanout、P5 字段对齐 schema、P5 Evidence Map / Claim Graph、MCP 后端 TLS 指纹切换等 4 条候选路径。

核心方法论贡献：把「提示词改造是否有效」从主观判断升级为**可量化评测**——A 跑基线、B 跑改造、共用同一份 ground truth、按预设评分阈值裁定升级 / 回退。本框架已固化为 [ab-test-template.md](../../skills/search-orchestrator/examples/ab-test-template.md)，可被其他 agent 提示词工程研究复用。

---

## Abstract (English)

This project translates "engineering actions used by commercial agents in their search stacks" into "prompt-layer mechanisms running on a Cline + DuckDuckGo MCP stack", so that an open-source agent stack without API keys or paid backends can approach the engineering quality of commercial agents such as Perplexity / Tavily / Exa.

To validate this thesis, we ran **14 rounds of double-blind A/B experiments** between 2026-06-23 and 2026-06-26, validating **six prompt-layer mechanisms** (P1, P1.5, P3, P4, P5 Gap Ledger, P6) and **one infrastructure-layer mechanism** (#24 anti-bot throttle wrapper). All six P-level mechanisms plus the Infra wrapper reached `active`. In parallel, four candidate paths were disproven and rejected: P2 fanout, P5 field-aligned Output Schema, P5 Evidence Map / Claim Graph, and MCP backend TLS-fingerprint switching.

The methodological contribution: turning "is this prompt change actually useful" from a subjective call into a **measurable evaluation** — Run A baseline, Run B treatment, shared ground truth, pre-registered scoring thresholds deciding promote / rollback. The framework is固化d as [`ab-test-template.md`](../../skills/search-orchestrator/examples/ab-test-template.md) and can be reused by other agent prompt-engineering studies.

---

## 问题陈述

### 起点：能力差距的结构性归因

Cline 自身**没有内置 web search**，依赖外部 MCP（默认 DDG `nickclyde/duckduckgo-mcp-server`）。直接装好 DDG MCP 后的实际能力位置：

> **裸 search + LLM 自行处理** —— 与 Perplexity / Tavily / Exa 等商业 agent 差距是**结构性**的。

但调研（见 [01-background.md](01-background.md)）发现：差距的 **80% 不在搜索引擎本身**，而在围绕搜索的 5~7 个工程动作（域名过滤、citation 强制、query 改写、压缩、结构化、失败处理）。其中绝大多数可以**靠提示词补齐，不需要新依赖、不需要 API key、不需要换后端**。

### 三个研究问题

| RQ | 描述 | 结论 |
|----|------|------|
| **RQ1** | 商业 agent 搜索栈的工程动作中，哪些可在提示词层等效实现？哪些不可？ | 12 项手法中 5 项可提示词等效（含 M6 Goggles / M8 Citation）、5 项部分覆盖、2 项不可（M3 include_answer / M5 output_schema 由 LLM 自身承担） |
| **RQ2** | 提示词层机制能否经受**双盲 A/B + 量化评分**的严格验证？ | 6 项 P 级机制通过；4 条候选路径被证伪回退。证伪路径本身是方法论成功的证据 |
| **RQ3** | 哪些问题不是提示词可治的，必须下沉到 MCP / 后端 / 代码层？ | P2 负向 query 召回（DDG 算子下线）、MCP TLS 指纹切换（被 Run #8a 否决）、DDG 反-bot 节流（落地为 #24 wrapper） |

---

## 主要结论（一句话清单）

### ✅ 已升级 active 的机制（6 + 1）

| ID | 机制 | 关键数据 | 落地位置 |
|----|------|---------|---------|
| **P1** | Domain Goggles（域名级软过滤 + 排序） | 垃圾站清除率 5/5 = 100%；评分 4/5 | [SKILL.md §3.5](../../skills/search-orchestrator/SKILL.md) |
| **P1.5** | FinalScore 联动（Goggle × SourceWeighting） | Top-5 中至少 1 条升入 T1/T2 | [SKILL.md §3.5.5](../../skills/search-orchestrator/SKILL.md) |
| **P3** | Evidence-bound Citation（三档模式 Tier A/B/C） | Run #5 5/5 机制分；误引用 0 | [SKILL.md §4.3](../../skills/search-orchestrator/SKILL.md) |
| **P4** | Evidence Deduplication（同源合并：逐字 + translation + summary/rewrite） | Run #7/11/12b 三轮：Merge Precision 100%、False Merge 0、Info Loss 0 | [SKILL.md §1.4.5 Step 3.bis](../../skills/search-orchestrator/SKILL.md) |
| **P5 Gap Ledger** | 合成前强制枚举证据缺口 | Run #14 4/5：Gap Detection Recall Δ=+55.6%（33.3% → 88.9%） | [SKILL.md §4.1](../../skills/search-orchestrator/SKILL.md) |
| **P6** | Highlights / Relevance Compression（fetch 后 verbatim 抽取 ≤500 token） | Run #10 4/5：Extractive Fidelity 92.3%（24/26），Paraphrase 7.7%，Untraceable 0 | [SKILL.md Phase 1.bis](../../skills/search-orchestrator/SKILL.md) |
| **#24** | MCP 反-bot 节流 wrapper（强制 max_results≤10 + 3 次熔断指数退避 + fetch 独立通道） | 11/11 集成测试 + 子代理两轮 review + Run #14 功能性验证通过 | [search-mcp-wrapper/](../../search-mcp-wrapper/) |

### ❌ 被证伪 / 回退的候选路径（4 + 2）

| 路径 | 证伪实验 | 评分 | 教训 |
|------|---------|-----|------|
| P2 Query Rewrite + Fanout | Run #2 / #3 | 3.6/5 → 2.6/5 | LLM 提示词层算分不可靠（NumericBench 印证）；负向 query 召回差属后端能力限制（NevIR 印证） |
| P5 v1 字段对齐 schema | Run #9 / #9b / #9c | 1/5 → 3/5 → 2/5 | 字段表锁住执行者只填同维度，削弱跨维度冲突发现；自由文本反超 schema |
| P5 v2 Evidence Map / Claim Graph | Run #13 | 2/5 | Material Relation Recall Δ=+6.3% < +15% 门槛；Cross-Dimension 双方均达天花板 12/12；唯一可复现增量是 Gap Ledger |
| MCP 后端切换（Node.js → Python curl_cffi） | Run #8a | 1/5 基础设施分 | TLS 指纹假设 disproven；HTTP Success ≠ Content Success（juejin 全部返回 "Please wait..." 假页面） |
| DiversityPenalty + R1 保底 | （rolled-back） | — | LLM 提示词层算分量级压不过 SourceWeight ±10；±2 落在噪声地板内 |
| 完整 Evidence Map / Claim Graph | （保持 proposed 不再推进） | — | 两代结构化中间表示均未对自由文本展现决定性优势；只 Gap Ledger 最小机制升级 active |

---

## 文档地图

| # | 文件 | 主题 |
|---|------|------|
| 00 | 本文件 | 摘要 + 问题 + 主要结论 |
| 01 | [01-background.md](01-background.md) | 背景：Cline 搜索现状 vs 商业 agent 12 手法对照 |
| 02 | [02-methodology.md](02-methodology.md) | 方法论：A/B 双盲框架 + 评分阈值体系 + Ground Truth 密封 |
| 03 | [03-mechanisms.md](03-mechanisms.md) | 机制设计：6 active P 级 + #24 wrapper + 证伪路径详解 |
| 04 | [04-experiments.md](04-experiments.md) | 实验：14 轮 Run 综述与关键数据 |
| 05 | [05-results.md](05-results.md) | 结果：active 机制清单 + 失败模式 + 与现成学术结论对比 |
| 06 | [06-usage.md](06-usage.md) | 使用：如何在 Cline 中应用这些机制 |
| — | [references.md](references.md) | 参考文献与外部链接 |

外部权威文件：

| 用途 | 文件 |
|------|------|
| 完整调研报告 | [docs/search-orchestrator/survey.md](../search-orchestrator/survey.md) |
| 14 份决策文档（含证据链） | [docs/decisions/](../decisions/) |
| 14 轮实验原始数据 | [docs/search-orchestrator/experiments/](../search-orchestrator/experiments/) |
| Skill 主体（落地形态） | [skills/search-orchestrator/SKILL.md](../../skills/search-orchestrator/SKILL.md) |
| 节流 wrapper 实现 | [search-mcp-wrapper/](../../search-mcp-wrapper/) |

---

## 数字一览

| 维度 | 值 |
|------|-----|
| 研究周期 | 2026-06-23 ~ 2026-06-26（4 天） |
| A/B 实验轮数 | 14（Run #1 ~ Run #14，含 9b / 12b 子轮） |
| 决策文档份数 | 14（D-2026-06-2X-search-*.md） |
| active 机制数 | 6 P 级 + 1 Infra = 7 |
| 证伪 / 回退路径数 | 4 条主路径 + 2 条衍生 |
| 机制候选清单条数 | 24（含永久 C 类 7 条、已机制化 4 条、候选 9 条、实验中 2 条、其他 2 条） |
| 引入新依赖数 | 1（`@modelcontextprotocol/sdk`，wrapper 用） |
| 引入付费 API key 数 | 0 |
| 换搜索后端次数 | 0（DDG 始终） |

---

## 一句话总结

> 商业 agent 搜索能力的 80% 工程动作可以转译为提示词层的硬性流程；本项目用 14 轮双盲 A/B 验证了其中 6 项有效、4 项无效，并把"是否有效"的判定从主观感觉升级为可复现的量化评测。
