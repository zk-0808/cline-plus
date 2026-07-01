---
id: D-2026-06-24-search-defer-p2
date: 2026-06-24
topic: search-orchestrator
status: deferred
lifecycle: 永久保留——决策记录，状态由 status 枚举驱动。
supersedes: []
superseded_by: []
evidence:
  - file: search/search-orchestrator/survey.md
    section: "10.5 Run #2 —— P2 Query Rewrite + Fanout 首轮验证"
  - file: search/search-orchestrator/survey.md
    section: "10.6 Run #3 —— P2 调参后复测"
  - file: search/search-orchestrator/survey.md
    section: "10.7 P2 收敛决策"
  - file: search/search-orchestrator/experiments/run-3-fanout-tuned.md
    section: "决策"
  - file: decisions/D-2026-06-24-search-rollback-diversity.md
    section: "三条 C 类教训"
  - file: mechanism-candidates.md
    section: "条目 20：反证检索机制"
  - file: mechanism-candidates.md
    section: "条目 21：多样性排序机制"
---

# D-2026-06-24 — 搁置 P2 Query Rewrite + Fanout

## 决策

**搁置** P2 三路 fanout 改造的当前路线，不进入 Run #4。SKILL.md §1.4 三路 fanout 思想保留为**软要求**（"建议 3 路改写"），不再做提示词级强制约束。

P2 状态：**deferred**。剩余瓶颈交付给 mechanism-candidates A 类候选：
- 反证检索机制（#20）
- 多样性排序机制（#21）

## 一句话理由

P2 已 Run #2 (3.6/5) + Run #3 (2.6/5) 两轮未过，触发 OUTLINE §2.1 停止信号；剩余瓶颈属机制层，不可提示词治理。

## 收敛路径（事实链）

```
P1 Goggle (Run #1, 4/5)               ✅ 保留
  → P1.5 FinalScore 联动              ✅ 保留
    → P2 三路 fanout 设计              ✅ 落地
      → Run #2 验证 (3.6/5)            ⚠️ 调参重跑
        → Run #3 调参后复测 (2.6/5)    ❌ 回炉
          → 回退 DiversityPenalty 等   D-2026-06-24-search-rollback-diversity
            → P2 搁置                  本决策
```

## 证据链

- **survey §10.5** Run #2 首轮验证：唯一权威源覆盖增量 = −2，但反证 ≥ 1。
- **survey §10.6** Run #3 复测：三项指标全部未达标或倒退。
- **survey §10.7** P2 收敛决策表与三条 C 类教训。
- **experiments/run-3-fanout-tuned.md 决策段** 给出三个根因的 A/B/C 分类。
- **D-2026-06-24-search-rollback-diversity** 已执行的 SKILL.md 回退动作。
- **mechanism-candidates #20 / #21** 把瓶颈机制化为 A 类候选。

## 共识来源

- 用户判断：Run #4 不必做。
- GPT 二轮评审判断：「Fanout 机制有效但收益已到天花板，剩余瓶颈在后端能力」。
- A/B/C 分类：根因 #2 / #3 是 A 类机制问题，不在 SKILL 治理范围内。

## 影响

- search-orchestrator 路线图：P2 状态由「V1 立即落地」变为「搁置」。
- 下一项推进：**P3 Evidence-bound Citation**（Claim/Quote/URL 三元组），纯输出层改造，不依赖搜索后端能力。

## 回滚动作 / 恢复条件

本决策本身已是停止信号。**恢复 P2 的条件**：

1. mechanism-candidates #20（反证检索）已机制化交付，或
2. 搜索后端换为支持否定召回的引擎（Tavily / Exa），或
3. 出现新的 A/B 实测证据，且不依赖提示词级算分。

满足任一条件，可考虑用 supersedes 字段开新决策恢复 P2。
