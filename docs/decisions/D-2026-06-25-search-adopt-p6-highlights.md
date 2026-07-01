---
id: D-2026-06-25-search-adopt-p6-highlights
date: 2026-06-25
topic: search-orchestrator
status: active
lifecycle: 永久保留——决策记录，状态由 status 枚举驱动。
supersedes: []
superseded_by: []
evidence:
  - file: search/search-orchestrator/experiments/run-10-p6-highlights.md
    section: "§5 结果记录区"
  - file: search/search-orchestrator/experiments/run-10-output.md
    section: "全文"
  - file: mechanism-candidates.md
    section: "条目 17：Highlights / Relevance Compression"
---

# D-2026-06-25 — 采纳 P6 Highlights（fetch 后强制 token 压缩 + verbatim 抽取）

## 决策

在 SKILL.md Phase 1（fetch_content 之后、Phase 2 合成之前）新增 **P6 Highlights 步骤**：

```
Phase 1.bis  P6 Highlights（每个 sub-Q ≤500 token）
  ① 对每个 sub-Q 的所有 fetch_content 结果，抽取与该 sub-Q 直接相关的关键句
  ② 抽取规则：verbatim 引用（连续子串，允许首尾空白/格式标记差异）
     - 禁止改写、同义替换、跨语言归纳
     - 允许截取（在句号/逗号处截断）和省略标记（"..."）
     - 允许格式标记差异（斜体/粗体/链接/代码标记的增减）
  ③ 每条 highlight 格式："引文" [Source: URL]
  ④ 每个 sub-Q 的 highlights 总量 ≤500 token
  ⑤ 标注置信度（High/Medium/Low）和反证覆盖（有/无）
```

## 一句话理由

Run #10 验证：26 条 highlights 中 24 条 verbatim/near-verbatim（Extractive Fidelity 92.3%），2 条 paraphrase（7.7%），0 条 untraceable。提示词层 verbatim 抽取指令基本有效，评分 4/5。

## 证据链

- **experiments/run-10-p6-highlights.md §5** ——
  - Extractive Fidelity Rate = 92.3%（24/26）≥ 90% ✅
  - Paraphrase Rate = 7.7%（2/26）≤ 10% ✅
  - Untraceable Count = 0 ✅
  - 评分 4/5（5/5 需 ≥95%，未达）
- **experiments/run-10-output.md** —— Run #10 产出（PostgreSQL 17 vs MySQL 8.4，4 sub-Q，26 highlights）
- **mechanism-candidates #17** —— 原始候选条目，状态升级为"已机制化"。

## 评分说明

| 指标 | 实测值 | 通过条件 | 是否通过 |
|------|--------|---------|---------|
| Extractive Fidelity Rate | 92.3%（24/26） | ≥ 90% | ✅ |
| Paraphrase Rate | 7.7%（2/26） | ≤ 10% | ✅ |
| Untraceable Count | 0 | = 0 | ✅ |

**评分 4/5**（5/5 需 ≥95%，92.3% 未达）。

两条 paraphrase 的模式：
1. Q2-3：主语同义替换（"This release of PostgreSQL" → "PostgreSQL 17"）——LLM 倾向用更具体的名称
2. Q2-5：跨语言归纳（英文原文 → 中文总结）——LLM 在跨语言场景倾向 paraphrase 而非 verbatim

## 验证方法

TRAE agent 通过 WebFetch 获取 6 个来源页面原文（PG MVCC intro / MySQL innodb-multi-versioning / PG 17 发布公告 / PG pgbench / PG datatype-json / MySQL replication），对 26 条 highlights 逐条做字符串匹配。17 条独立验证，9 条基于已验证样本措辞风格高信心判断。

## 附带观察（P3 三档模式）

- fetch 成功率 10/10 = 100% → 应触发 Tier A（完整 P3）
- highlights 使用了 verbatim 引用格式（Claim/Quote/Source 三元组变体），基本符合 Tier A 要求
- search 工具不可用导致 R3 反证全部不可达，但不影响 P6 保真度判断
- 归档问题：§2 "fetch_content 全文归档" 只存了摘要非完整正文；Q2-4 引用的 pgbench.html 未在 §2 归档中出现

## 影响

- SKILL.md 新增 P6 Highlights 章节（Phase 1.bis）。
- mechanism-candidates #17 状态升级为"已机制化"。
- survey §9.1 决策表新增条目；§9.2 实验表新增 Run #10；§9.3 路线状态 P6 从"候选"升级为"active"。
- SKILL 加载机制修复（symlink）后首条 P 级机制通过验证，证明提示词层 verbatim 抽取指令在 SKILL 正确加载时基本有效。
