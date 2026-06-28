---
id: D-2026-06-24-search-rollback-diversity
date: 2026-06-24
topic: search-orchestrator
status: rolled-back
supersedes: []
superseded_by: []
evidence:
  - file: search/search-orchestrator/experiments/run-3-fanout-tuned.md
    section: "指标计算"
  - file: search/search-orchestrator/experiments/run-3-fanout-tuned.md
    section: "决策"
  - file: search/search-orchestrator/survey.md
    section: "10.6 Run #3 —— P2 调参后复测"
  - file: search/search-orchestrator/survey.md
    section: "10.7 P2 收敛决策"
  - file: mechanism-candidates.md
    section: "条目 21：多样性排序机制"
---

# D-2026-06-24 — 回退 DiversityPenalty + R1 保底

## 决策

**回退** Run #2 后引入的提示词级多样性约束：

- 删除 SKILL.md §3.5.6（DiversityPenalty + R1 保底整节）
- 从 §3.5.5 FinalScore 公式中移除 `DiversityPenalty` 项
- §1.4.2 删除「英中社区各 ≥ 1」硬约束（site: 误用为路由器）
- §1.4.7 改为「单一通路」，不再引用 §3.5.6
- §3.5.5 护栏新增反模式条：「不在提示词层引入多样性/反垄断算分」

## 一句话理由

Run #3（2026-06-24）综合 2.6/5，三项指标倒退或不达标；根因属机制层（A 类），非提示词层可治。

## 证据链

- **experiments/run-3-fanout-tuned.md 指标计算** ——
  - 唯一权威源覆盖增量 = −2（目标 ≥ +2）❌
  - 反证立场结果数 = 0（目标 ≥ 1，且 Run #1 旧 B = 2，**倒退**）❌
  - 单一路最大席位 R2=7（目标 ≤ 5）❌
- **experiments/run-3-fanout-tuned.md 决策** ——
  - 根因 #1：site: 是过滤器不是路由器（C 类设计错误，已写入教训）
  - 根因 #2：DiversityPenalty ±2 vs SourceWeight ±10 量级失衡（A 类）
  - 根因 #3：DDG 对负向 query 召回差（A 类）
- **survey §10.6 / §10.7** 收敛决策与回退动作清单。
- **mechanism-candidates #21** 把「多样性排序」标记为 A 类机制候选。

## 影响

| 文件 / 章节 | 回退内容 |
|------------|---------|
| SKILL.md §1.4 标题 | "强制 3 路改写" → "建议 3 路改写" |
| SKILL.md §1.4.1 R2 模板 | 删除"英中各 ≥ 1"硬约束 |
| SKILL.md §1.4.1 示例 | R2 改回单语种英文 |
| SKILL.md §1.4.2 | 主体改建议；新增 §1.4.2.bis 双语子路（可选） |
| SKILL.md §1.4.3 | 新增 Run #3 教训段（反证检索属后端能力问题） |
| SKILL.md §1.4.7 | "配额"→"单一通路" |
| SKILL.md §3.5.5 公式 | 删除 `DiversityPenalty` |
| SKILL.md §3.5.5 实操规则 | 删除"步骤 3 计算 DiversityPenalty" |
| SKILL.md §3.5.5 护栏 | 新增"不在提示词层引入多样性算分"反模式 |
| SKILL.md §3.5.6 整节 | **删除** |
| mechanism-candidates.md | 新增 #20（反证检索机制）、#21（多样性排序机制），均 A 类 |

## 三条 C 类教训（永久保留到 OUTLINE）

1. **site: 是过滤器不是路由器** —— 多语种由 query 触发，不由 site: 域名混合。
2. **提示词层算分不可信** —— ±2 量级压不过 ±10；LLM 不严格按公式执行。
3. **A/B/C 分类比指标更先决** —— Run #3 的"调参重跑"决定本身错，根因 #3 已是 A 类，不该走 SKILL 层第三轮治理。

## 回滚动作

无（本决策**就是**回滚动作）。如未来 mechanism-candidates #21 机制化完成，该机制不应再以提示词形态回到 SKILL.md。
