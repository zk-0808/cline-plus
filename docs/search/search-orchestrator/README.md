# Search Orchestrator — 主题状态总览

`search-orchestrator` skill 的所有产物入口。SKILL 本身位于 [`../../skills/search-orchestrator/SKILL.md`](../../../skills/search-orchestrator/SKILL.md)。

## 当前状态（2026-06-25）

| 路线项 | 状态 | 决策 |
|--------|------|------|
| P1 Domain Goggles | ✅ active | [D-2026-06-23-search-adopt-goggles](../../decisions/D-2026-06-23-search-adopt-goggles.md) |
| P1.5 FinalScore 联动 | ✅ active | [D-2026-06-23-search-finalscore-coupling](../../decisions/D-2026-06-23-search-finalscore-coupling.md) |
| P2 Query Rewrite + Fanout | ⏸ deferred | [D-2026-06-24-search-defer-p2](../../decisions/D-2026-06-24-search-defer-p2.md) |
| DiversityPenalty + R1 保底 | ⛔ rolled-back | [D-2026-06-24-search-rollback-diversity](../../archive/decisions/D-2026-06-24-search-rollback-diversity.md) |
| P3 Evidence-bound Citation | ✅ active（三档模式）| [D-2026-06-24-search-adopt-p3](../../decisions/D-2026-06-24-search-adopt-p3.md) |
| P4 Evidence Deduplication | ✅ active（同源内容合并）| [D-2026-06-24-search-adopt-p4-same-source-merge](../../decisions/D-2026-06-24-search-adopt-p4-same-source-merge.md) |
| P5 Output Schema / Evidence Map | ⬜ proposed | [D-2026-06-25-search-redesign-p5-evidence-map](../../decisions/D-2026-06-25-search-redesign-p5-evidence-map.md) |
| P6 Highlights / Relevance Compression | ✅ active | [D-2026-06-25-search-adopt-p6-highlights](../../decisions/D-2026-06-25-search-adopt-p6-highlights.md) |

## 文档导航

### 调研（事实层）

- [survey.md](survey.md) — 主流 agent 搜索能力调研报告（§1–§8 事实层 + §9 决策跳转）
- [search-research-results.md](search-research-results.md) — 调研原始证据库

### 实验（数据层）

- [experiments/run-1-goggle.md](../../archive/search/experiments/run-1-goggle.md) — P1 Goggle 首轮验证（4/5 ✅）
- [experiments/run-2-fanout.md](../../archive/search/experiments/run-2-fanout.md) — P2 三路 fanout 首轮（3.6/5 ⚠️）
- [experiments/run-3-fanout-tuned.md](../../archive/search/experiments/run-3-fanout-tuned.md) — P2 调参后复测（2.6/5 ❌）

### 决策（结论层，在 `../decisions/`）

- [D-2026-06-23-search-adopt-goggles](../../decisions/D-2026-06-23-search-adopt-goggles.md)
- [D-2026-06-23-search-finalscore-coupling](../../decisions/D-2026-06-23-search-finalscore-coupling.md)
- [D-2026-06-24-search-rollback-diversity](../../archive/decisions/D-2026-06-24-search-rollback-diversity.md)
- [D-2026-06-24-search-defer-p2](../../decisions/D-2026-06-24-search-defer-p2.md)

### Skill 实体

- [`skills/search-orchestrator/SKILL.md`](../../../skills/search-orchestrator/SKILL.md) — 主 skill 文件（提示词级流程）
- [`skills/search-orchestrator/examples/ab-test-template.md`](../../../skills/search-orchestrator/examples/ab-test-template.md) — A/B 验证模板
- [`skills/search-orchestrator/references/web-search-setup.md`](../../../skills/search-orchestrator/references/web-search-setup.md) — MCP 安装与故障排查
- [`skills/search-orchestrator/references/search-path-design.md`](../../../skills/search-orchestrator/references/search-path-design.md) — Query 设计模式

## 三条 C 类永久教训（来自 P2 失败）

1. **site: 是过滤器不是路由器** —— 多语种由 query 触发，不由 site: 域名混合。
2. **提示词层算分不可信** —— ±2 量级压不过 ±10；LLM 不严格按公式执行。
3. **A/B/C 分类比指标更先决** —— 调参重跑前必须先确认根因是否仍属 SKILL 层可治。
