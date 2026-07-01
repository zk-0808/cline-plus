---
id: D-2026-06-24-search-revise-p4-metrics
date: 2026-06-24
topic: search-orchestrator
status: active
lifecycle: 永久保留——决策记录，状态由 status 枚举驱动。
supersedes: []
superseded_by: []
evidence:
  - file: search/search-orchestrator/experiments/run-7-p4-dedup.md
    section: "核心指标 / 多样性变化分析"
---

# D-2026-06-24 — 修订 P4 评估指标

## 决策

P4 评估指标从单一日志分为两层：核心指标 + 观察指标。Top-5 域名多样性从通过条件降级为观察指标。此修订已反映在 ab-test-template.md §2.6。

## 理由

Run #7 暴露出 `Top-5 唯一域名数` 指标在 P4 场景下的本质缺陷：

```
域名多样性 ≠ 内容多样性

知乎（原文）    → 1 域名 × 1 内容
SegmentFault（转载）→ 1 域名 × 0 独特内容
CSDN（镜像）    → 1 域名 × 0 独特内容
──────────────
3 域名           → 1 份内容
```

P4 的目标是**消除重复内容占位，让一个事实只占一个席位**，而非提升域名计数。原指标默认假设"域名数 ↑ ≈ 内容多样性 ↑"，在转载/镜像场景下不成立。

## 新指标体系

### 核心指标（影响通过/不通过）

| 指标 | 目标 | 说明 |
|------|------|------|
| **Merge Precision（同源合并率）** | ≥ 90% | 正确合并数 / 总识别转载数 |
| **False Merge Count（误合并数）** | = 0 | 被合并但实际为不同内容的 URL 数 |
| **Information Loss Count（信息损失数）** | = 0 | 合并导致丢失的独特 claim 数 |

### 观察指标（仅记录，不参与判定）

| 指标 | 说明 |
|------|------|
| **Unique Domains Delta** | 合并前后 Top-5 唯一域名数变化（+1/0/-1） |

## 与 P3 双维度评分的关系

P3 是**机制分 vs 基础设施分**的分离。P4 是**核心指标 vs 观察指标**的分离。两者解决的问题不同：P3 分离的是"规则好坏 vs 环境好坏"，P4 分离的是"主目标 vs 次生指标"。

## 影响

- ab-test-template.md §2.6 新增 P4 专属指标体系。
- 原 §2.3 的 P4 指标行（DISCARD 误伤数）仍保留，仅适用于 Goggle 类测试。
