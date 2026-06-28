# Run #2 — P2 Query Rewrite + Fanout 首轮验证

**测试日期**: 2026-06-23
**测试 query**: "Rust 真的比 Go 更适合做微服务后端吗"
**max_results**: 10
**Tier**: L2
**工具**: DuckDuckGo MCP (search)
**对照基线**: 同 query 的单次 Run A 结果（详见原始报告归并入 survey §10）
**改造**: SKILL.md §1.4 三路 fanout（R1 直白 / R2 限域 / R3 反证） + §3.5.5 联动

> 注：Run #2 原始数据当时未单独成文，本文件由 survey §10.5 与 Run #1 横向对照表抽出。完整原始 30 条结果未保留——这是 Run #2 时记录纪律不完善的遗憾，后续 Run #3 起均单独存档。

---

## 三路 query

```
R1（直白）: Rust vs Go 微服务后端 选型
R2（限域）: Rust Go microservice production (site:reddit.com OR site:news.ycombinator.com OR site:github.com)
R3（反证）: "migrated from Rust to Go" OR "Rust microservice regression"
```

---

## 关键指标

| 指标 | 值 | 通过线 | 判定 |
|------|----|--------|------|
| 原始总数 / 去重 / 冗余率 | 40 / 28 / 30% | — | 正常 |
| Run A top-10 T1+T2 唯一域名数 | 6 | — | 基线 |
| Run B top-10 T1+T2 唯一域名数 | 4 | — | ❌ |
| **唯一权威源覆盖增量** | **−2** | ≥ +2 | ❌ |
| **反证立场结果数** | **2** | ≥ 1 | ✅ |
| 误伤 | **0** | = 0 | ✅ |
| Run A top-5 T-Level | [T2, T2, T3, T2, T3] | — | — |
| Run B top-5 T-Level | [T1, T1, T1, T1, T1] | — | — |
| 综合评分 | **3.6 / 5** | — | 调参重跑 |

---

## 根因

R2 的 `site:reddit.com OR site:news.ycombinator.com OR site:github.com` 过于窄化，导致 10 条结果全被 T1 英文社区源占满。权威性大幅提升（top-5 全 T1），但**域名多样性从 6 降至 4**，丢失了知乎 / 腾讯云 / tonybai 等中文权威源。

R3 反证策略效果显著（捞出 2 条反证内容：Rust P99 退化 + 100 万行回迁 Go），保留。

---

## 决策（当时）

**调参重跑（非回退）**，要点：

1. R2 site: 列表加入中文技术社区（zhihu / tonybai）
2. FinalScore 加来源路多样性惩罚因子（DiversityPenalty）
3. R1 直白路在 top-10 保底 ≥ 3 席

→ 实施成 SKILL.md §3.5.6（DiversityPenalty + R1 保底）。

---

## 后续

Run #3（2026-06-24）按上述调参重跑，综合 2.6/5，三项指标倒退或不达标 → 调参方向被否决，触发 OUTLINE §2.1 两轮收敛停止信号。

详见：

- [experiments/run-3-fanout-tuned.md](run-3-fanout-tuned.md)
- [decisions/D-2026-06-24-search-rollback-diversity.md](../../decisions/D-2026-06-24-search-rollback-diversity.md)
- [decisions/D-2026-06-24-search-defer-p2.md](../../decisions/D-2026-06-24-search-defer-p2.md)
