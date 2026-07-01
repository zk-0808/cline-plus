---
id: D-2026-06-23-search-finalscore-coupling
date: 2026-06-23
topic: search-orchestrator
status: active
lifecycle: 永久保留——决策记录，状态由 status 枚举驱动。
supersedes: []
superseded_by: []
evidence:
  - file: search/search-orchestrator/survey.md
    section: "10.2 第二轮 GPT 评审与 P1.5 联动"
  - file: search/search-orchestrator/survey.md
    section: "10.3 联动后的预期效果（基于 Run #1 数据回算）"
  - file: search/search-orchestrator/experiments/run-1-goggle.md
    section: "全文"
---

# D-2026-06-23 — Goggle × Source Weighting 联动 FinalScore（P1.5）

## 决策

在 SKILL.md §3.5.5 新增 **FinalScore 复合模型**：

```
FinalScore(result) = SearchRank + GoggleWeight + SourceWeight
```

其中 SourceWeight 来自 §3.3 权威分级（T1 +10 / T2 +3 / T3 +1 / T4 +0.1），让长尾优质站点（如 `imroc.cc`）即使未命中 Goggle 白名单，也能凭 T-Level 自然升上来。

## 一句话理由

Run #1 暴露：Goggle 白名单永远追不上长尾。扩白名单是反模式；让权威分级与 Goggle **联动打分**才是可持续路径。

## 证据链

- **survey §10.2** 记录 GPT 二轮评审三项修正（错指标 / 缺 TRUST SCORE / 不要手动加 imroc.cc）。
- **survey §10.3** 用 Run #1 原始数据回算：Top-5 T1+T2 从 0 → 1（Goggle only）→ 2（联动后），无需扩白名单即提升。
- **experiments/run-1-goggle.md** 提供联动前后的 10 条结果对照。

## 影响

- SKILL.md §3.5.5 实现 FinalScore 公式；Phase 4 Sources 表新增 T-Level 列。
- 设计护栏新增「不为每个新发现的优质站补 BOOST 白名单」。

## 回滚动作

无；公式在 V1 持续生效。Run #3（2026-06-24）尝试再加 DiversityPenalty 项失败，仅回退该项（D-2026-06-24-search-rollback-diversity），FinalScore 本体保留。
