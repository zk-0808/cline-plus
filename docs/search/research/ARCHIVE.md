# 归档摘要 — docs/search/research/

> 评估日期：2026-06-28
> 对照基准：`skills/search-orchestrator/SKILL.md`（v1.0.0，含 6 个 P 级机制 + #24 wrapper 的完整落地规范）

## 背景

本目录是 search-orchestrator 项目的研究报告（2026-06-23 ~ 2026-06-26 期间产出）。SKILL.md 已将所有 active 机制的规范、Iron Laws、A/B 验证流程固化为可执行的工作流。以下评估各文件是否仍具独立价值。

---

## 文件评估

| 文件 | 核心价值 | 建议 | 原因 |
|------|---------|------|------|
| `00-overview.md` | 项目入口摘要：问题陈述、RQ1/RQ2/RQ3 三个研究问题、14 轮实验总览、active/证伪机制清单 | **保留** | 是整个研究的"只读一份"入口，提供 SKILL.md 不含的**动机与背景**；对理解"为什么这样设计"不可替代 |
| `01-background.md` | 商业 agent 搜索栈 12 项工程手法对照表（Perplexity / Tavily / Exa vs Cline+DDG），5 项可等效 / 5 项部分覆盖 / 2 项不可 | **保留** | SKILL.md 引用了此对照结论但未复现完整表格；是 RQ1 的原始论证，对后续扩展或学术引用有独立价值 |
| `02-methodology.md` | A/B 双盲验证框架设计：单变量隔离、评分阈值、Ground Truth 密封、promote/rollback 裁定流程 | **归档** | SKILL.md 已引用 `examples/ab-test-template.md` 作为可复用模板；本文件是模板的"方法论说明"，内容被模板 + SKILL.md 覆盖 |
| `03-mechanisms.md` | 6 个 active P 级机制 + 1 个 Infra wrapper 的设计意图、落地形态、关键数据、失败模式、4+2 条证伪路径 | **归档** | 每个机制的落地规范已写入 SKILL.md 对应章节（§3.5 / §4.3 / §1.4.5 等）；本文件是"设计文档"，SKILL.md 是"执行规范"，后者覆盖前者 |
| `04-experiments.md` | 14 轮 A/B 实验的综述表（Run #1 ~ #14 的主题、评分、决策） | **保留** | 是全部实验的**唯一汇总视图**；SKILL.md 只引用了个别 Run 的结论，不含完整实验编年史；对追溯决策链路和复现研究不可替代 |
| `05-results.md` | RQ3 结论：哪些问题不是提示词可治的（P2 负向 query、TLS 指纹、DDG 反-bot），失败模式归纳，局限性讨论 | **归档** | SKILL.md Phase 4 + Iron Laws 已覆盖"什么不做"的结论；失败模式的细节散见于各 decision doc；本文件的综合讨论价值有限 |
| `06-usage.md` | 面向开发者的安装指南浓缩版（三种使用形态、前置依赖、配置步骤） | **归档** | SKILL.md 前置条件 + `references/web-search-setup.md` 已覆盖完整安装流程；本文件是冗余的浓缩版 |
| `references.md` | 外部学术/工程文献引用表（NevIR、NumericBench、RankGPT、Manning IR Book 等） | **保留** | SKILL.md 不含文献引用；本文件是学术溯源的唯一入口，对理解"为什么这些机制被设计成这样"有独立价值 |

---

## 汇总

| 类别 | 文件 |
|------|------|
| **保留**（独立价值，SKILL.md 未覆盖） | `00-overview.md`、`01-background.md`、`04-experiments.md`、`references.md` |
| **归档**（内容已被 SKILL.md 覆盖） | `02-methodology.md`、`03-mechanisms.md`、`05-results.md`、`06-usage.md` |

> **注意**：「归档」不等于「删除」。这些文件仍可作为历史参考，但不建议作为新开发者的必读材料。SKILL.md + ab-test-template.md 已是充分的入口。
