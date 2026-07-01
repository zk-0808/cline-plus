---
id: D-2026-06-23-search-adopt-goggles
date: 2026-06-23
topic: search-orchestrator
status: active
lifecycle: 永久保留——决策记录，状态由 status 枚举驱动。
supersedes: []
superseded_by: []
evidence:
  - file: search/search-orchestrator/survey.md
    section: "2. M6 域名级 ranking 控制（Goggles）"
  - file: search/search-orchestrator/survey.md
    section: "4. 启示 1：把 Goggles 思想搬到提示词（高 ROI）"
  - file: search/search-orchestrator/survey.md
    section: "9.2 最终落地优先级"
  - file: search/search-orchestrator/experiments/run-1-goggle.md
    section: "全文"
---

# D-2026-06-23 — 采纳 Domain Goggles（P1）

## 决策

在 search-orchestrator 提示词层引入 **Domain Goggles**，作为搜索结果的「软过滤 + 排序权重」机制。
落地形态为 SKILL.md §3.5，预置 5 个 Goggle（general-tech / academic / product-research / security / zh-tech），用 BOOST / DOWNRANK / DISCARD 三档动作。

## 一句话理由

借鉴 Brave Search Goggles 思想——同一搜索引擎在不同 Goggle 下结果质量差异可达 5 倍；提示词级软过滤改造成本最低、ROI 最高。

## 证据链

- **survey §2 M6** 提出 Brave Goggles 机制与对本项目可借鉴性。
- **survey §4 启示 1** 给出最小落地形态（域名表 + 三档动作）。
- **survey §9.2 P1** GPT 二轮评审确认为 V1 立即落地项。
- **experiments/run-1-goggle.md** A/B 实测：垃圾站清除率 5/5 = 100%；评分 4/5。

## 影响

- SKILL.md 新增 §3.5 Domain Goggles 整节。
- 后续衍生 D-2026-06-23-search-finalscore-coupling，以让长尾优质站能不靠扩白名单也自然上升。

## 回滚动作

无；改造已通过 A/B 验证，长期保留。
