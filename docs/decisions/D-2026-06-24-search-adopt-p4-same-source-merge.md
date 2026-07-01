---
id: D-2026-06-24-search-adopt-p4-same-source-merge
date: 2026-06-24
topic: search-orchestrator
status: active
lifecycle: 永久保留——决策记录，状态由 status 枚举驱动。
supersedes: []
superseded_by: []
evidence:
  - file: search/search-orchestrator/experiments/run-7-p4-dedup.md
    section: "全文"
  - file: mechanism-candidates.md
    section: "条目 19：同源转载证据去重"
---

# D-2026-06-24 — 采纳同源内容合并（P4 Same-Source Merge）

## 决策

在 SKILL.md §1.4.5 Step 3（URL 精确去重）之后追加 **Step 3.bis 同源内容合并**：

```
Step 3.bis  同源内容合并
              ① 对去重后的结果集，判断是否有同一篇文章被不同站点转载/镜像
              ② 若判断为同源转载，只保留权威分级最高的版本
                 （T1 > T2 > T3 > T4；同级保留 SearchRank 更高的）
              ③ 被合并的 URL 在 Source 表中标注 [同源合并]
```

## 一句话理由

Run #7 验证：同源合并率 100%，误合并 0，信息损失 0。知乎原文 → SegmentFault 转载 → CSDN 镜像全部正确识别。

## 证据链

- **experiments/run-7-p4-dedup.md** ——
  - Merge Precision = 100%（2/2 转载正确识别）
  - False Merge = 0
  - Information Loss = 0
  - 保留版本为最高权威源（知乎 T3 vs CSDN T4）
- **mechanism-candidates #19** —— 原始候选条目。

## 评分说明

P4 采用三层核心指标 + 一层观察指标：

| 层级 | 指标 | 值 | 通过 |
|------|------|----|------|
| 核心 | Merge Precision | 100% | ✅ |
| 核心 | False Merge Count | 0 | ✅ |
| 核心 | Information Loss | 0 | ✅ |
| 观察 | Unique Domains Delta | -1 | 仅记录，不参与判定 |

Top-5 域名多样性从 4→3 的解构：合并的 segmentfault.com 是转载站（与知乎同内容），释放的 slot 被同腾讯云其他文章填入。**域名多样性 ≠ 内容多样性**——这一条指标的假设在 P4 场景下不成立，单独修订为观察指标（见 D-2026-06-24-search-revise-p4-metrics）。

## 影响

- SKILL.md §1.4.5 新增 Step 3.bis。
- ab-test-template.md §2.4/§2.5 新增 P4 专属指标体系。
- survey §9.3 路线状态更新。
