# 归档摘要 — docs/search/search-orchestrator/

> 评估日期：2026-06-28
> 对照基准：`skills/search-orchestrator/SKILL.md`（v1.0.0）

## 背景

本目录是 search-orchestrator 项目的编排器文档与社区博文，产出于 2026-06-23 ~ 2026-06-26 研究期间。SKILL.md 已将所有 active 机制固化为可执行规范。以下评估各文件是否仍具独立价值。

---

## 文件评估

| 文件 | 核心价值 | 建议 | 原因 |
|------|---------|------|------|
| `survey.md` | 主流 agent 搜索能力调研报告：Exa / Tavily / Perplexity / Azure Semantic Search 的工程手法拆解（M1~M12），含 5~7 个工程动作的对照分析 | **保留** | 是 RQ1 调研的**完整事实层**（~400 行），包含大量 SKILL.md 未复现的原始分析（搜索深度档位、Auto Parameters、Rerank、Query Rewrite 等细节）；对理解"商业 agent 做了什么"有独立参考价值 |
| `search-research-results.md` | 调研原始证据库：Tavily / Exa / Perplexity API 文档的搜索结果原始记录（~500 行） | **归档** | 是 `survey.md` 的底层原始数据；survey.md 已将结论提炼完毕；原始证据仅在需要验证调研准确性时有用 |
| `搜索结论.md` | P1 Domain Goggles 的深度分析：提示词层软过滤 vs Brave Goggles 硬排序的结构性差异（介入点、召回覆盖、四类损失来源） | **归档** | 核心结论（"软过滤无法恢复被上游丢弃的域名"）已体现在 SKILL.md §3.5 的 Goggle 设计中（只做后置过滤，不声称等效召回）；本文件是论证过程，SKILL.md 是落地结论 |
| `README.md` | 主题状态总览 + 文档导航：8 条路线项的状态表（active / deferred / rolled-back / proposed）、决策文档链接、实验文件索引、三条 C 类永久教训 | **保留** | 是项目全貌的**唯一导航入口**；包含 SKILL.md 不含的决策文档链接矩阵和实验文件索引；三条 C 类教训（site: 是过滤器不是路由器、提示词层算分不可信、A/B/C 分类比指标更先决）是重要的设计约束 |

---

## 社区博文

| 文件 | 核心价值 | 建议 | 原因 |
|------|---------|------|------|
| `../blog/csdn-search-orchestrator.md` | CSDN 社区博文：面向外部读者的实验总结，含 GitHub 仓库链接、通俗化的机制介绍、开源复现指引 | **保留（独立归类）** | 面向**外部社区**的传播资产，与内部技术文档性质不同；不应归入"过时文档"；如需更新，应作为博文单独维护 |

---

## 汇总

| 类别 | 文件 |
|------|------|
| **保留**（独立价值） | `survey.md`、`README.md` |
| **归档**（内容已被 SKILL.md 覆盖） | `search-research-results.md`、`搜索结论.md` |
| **独立归类**（外部传播资产） | `../blog/csdn-search-orchestrator.md` |

> **注意**：「归档」不等于「删除」。原始证据库和深度论证仍可作为历史参考，但不建议作为新开发者的入口。SKILL.md + README.md 已是充分的导航。
