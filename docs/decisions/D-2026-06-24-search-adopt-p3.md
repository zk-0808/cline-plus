---
id: D-2026-06-24-search-adopt-p3
date: 2026-06-24
topic: search-orchestrator
status: active
lifecycle: 永久保留——决策记录，状态由 status 枚举驱动。
supersedes: []
superseded_by: []
evidence:
  - file: search/search-orchestrator/experiments/run-5-p3-retry.md
    section: "全文"
  - file: search/search-orchestrator/experiments/run-6-p3-zh-retry.md
    section: "全文"
  - file: search/search-orchestrator/experiments/run-4-p3-evidence-bound-citation.md
    section: "全文"
  - file: search/search-orchestrator/survey.md
    section: "2. M8 Citation 强制"
  - file: search/search-orchestrator/survey.md
    section: "4. 启示 2：Citation 架构强制（中 ROI）"
---

# D-2026-06-24 — 采纳 Evidence-bound Citation（P3）

## 决策

在 SKILL.md §4 新增 **§4.3 Output-Citation-Enforce**，按三档模式执行：
- **Tier A**（fetch ≥ 60%）：完整 P3 — Claim / Quote / Source 三元组
- **Tier B**（fetch 20%~60%）：混合模式 — 有正文的 URL 用 P3，其余标记 `[无法引证]`
- **Tier C**（fetch < 20%）：降级模式 — 保留 Finding + Source 格式，追加 `[P3 Coverage Low]` 标记，但保留已验证证据不退回旧格式

## 一句话理由

两轮 A/B 实验（英文 Run #5 5/5 fetch、中文 Run #6 1/10 fetch）共同验证了 **P3 机制本身零误引用**。瓶颈是当前 MCP fetch 对中文站点覆盖不足，不应因此放弃机制。

## 证据链

- **experiments/run-5-p3-retry.md**（英文 query）—— fetch 5/5：Claim-Quote 绑定率 100%，误引用 0。
- **experiments/run-6-p3-zh-retry.md**（中文 query）—— fetch 1/10：1 个成功 URL 产出 4 条 verbatim Quote，误引用 0；其余 9 个 URL 因 fetch 失败正确标记 `[无法引证]`，无一条编造。
- **experiments/run-4-p3-evidence-bound-citation.md**（中文 query 首轮）—— 对照基线，同样确认误引用 0。
- **survey §2 M8** 指出 Perplexity 架构强制 citation 是降低 hallucination 的核心手法。
- **survey §4 启示 2** 给出 Citation 架构强制的最小落地形态。

## 评分体系说明

本决策采用双维度评分替代单一日志：
- **P3 Mechanism Score**：衡量绑定率、误引用、标签完整率。Run #5 = 5/5，Run #6 = 5/5（规则执行无问题）。
- **Infrastructure Score**：衡量 fetch 成功率、Drop Rate。Run #5 = 5/5，Run #6 = 1/5（基础设施限制）。

## 影响

- SKILL.md 新增 §4.3 Output-Citation-Enforce（三档），原有 §4.3 后移为 §4.4。
- 后续机制索引（Highlights Compression、P4 Dedup）需要参考本决策的 fetch 覆盖率发现。
- Goggle（P1）和 Source Weighting 不受 fetch 覆盖率影响。

## 对路线图的隐含影响

从本实验获取了一个基础设施层的重要观测：**英文生态 fetch 覆盖高，中文生态 fetch 覆盖极低**。这对后续各项机制的关联影响：

| 机制 | fetch 覆盖率影响 | 备注 |
|------|-----------------|------|
| P3 Citation | 直接相关 | 已通过三档模式解耦 |
| Highlights Compression (P6) | 同样受影响 | 因为需要正文 |
| Source Weighting (P1.5) | 几乎不受影响 | 只依赖 URL + 域名 |
| Goggle (P1) | 不受影响 | 只依赖域名 |
| P2 Fanout | 不受影响 | 搜索层问题 |

## 回滚动作

无。三档模式不硬切，最差降级到 Tier C 也保留已验证证据。
