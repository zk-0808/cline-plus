# Decisions Index

所有决策按时间倒序排列。**只在此处增删**，不在功能目录里另起决策表。

## 状态约定

| 状态 | 含义 |
|------|------|
| `active` | 正在执行 |
| `deferred` | 暂缓（保留恢复条件） |
| `superseded` | 被新决策取代（必须在 frontmatter `superseded_by` 写新决策 ID） |
| `rolled-back` | 已回退（保留以便审计；不要删除） |

## 文件命名约定

- 战略决策：`ADR-NNN-<slug>.md`（NNN 三位数字、跨主题）
- 运营决策：`D-YYYY-MM-DD-<功能短名>-<slug>.md`

## 索引表

| ID | 日期 | 主题 | 状态 | 标题 |
|----|------|------|------|------|
| [D-2026-06-26-search-adopt-mcp-throttle-wrapper](D-2026-06-26-search-adopt-mcp-throttle-wrapper.md) | 2026-06-26 | search-orchestrator | active | 采纳 MCP 反-bot 节流 wrapper（方案 C：强制 max_results≤10 + 跨调用状态 + 指数退避）— 对应 #24，Run #14 功能性验证通过（3 次熔断正确触发指数退避，fetch 独立通道不受影响） |
| [D-2026-06-25-search-redesign-p5-evidence-map](D-2026-06-25-search-redesign-p5-evidence-map.md) | 2026-06-25 | search-orchestrator | proposed | 重设计 P5：Evidence Map / Claim Graph（非字段对齐 schema） |
| [D-2026-06-24-search-evaluate-p5-output-schema](D-2026-06-24-search-evaluate-p5-output-schema.md) | 2026-06-24 | search-orchestrator | superseded | 评估 P5 Output Schema v1（字段对齐 schema） |
| [D-2026-06-24-search-revise-p4-metrics](D-2026-06-24-search-revise-p4-metrics.md) | 2026-06-24 | search-orchestrator | active | 修订 P4 评估指标（域名多样性降级为观察指标） |
| [D-2026-06-24-search-adopt-p4-same-source-merge](D-2026-06-24-search-adopt-p4-same-source-merge.md) | 2026-06-24 | search-orchestrator | active | 采纳同源内容合并（P4 Same-Source Merge） |
| [D-2026-06-24-search-adopt-p3](D-2026-06-24-search-adopt-p3.md) | 2026-06-24 | search-orchestrator | active | 采纳 Evidence-bound Citation（P3，三档模式） |
| [D-2026-06-24-search-defer-p2](D-2026-06-24-search-defer-p2.md) | 2026-06-24 | search-orchestrator | deferred | 搁置 P2 Query Rewrite + Fanout |
| [D-2026-06-24-search-rollback-diversity](D-2026-06-24-search-rollback-diversity.md) | 2026-06-24 | search-orchestrator | rolled-back | 回退 DiversityPenalty + R1 保底 |
| [D-2026-06-23-search-finalscore-coupling](D-2026-06-23-search-finalscore-coupling.md) | 2026-06-23 | search-orchestrator | active | Goggle × Source Weighting 联动 FinalScore（P1.5） |
| [D-2026-06-23-search-adopt-goggles](D-2026-06-23-search-adopt-goggles.md) | 2026-06-23 | search-orchestrator | active | 采纳 Domain Goggles（P1） |
| [ADR-003-plugin-spike-exit](ADR-003-plugin-spike-exit.md) | 2026-06-26 | global | active | P5 Plugin Capability Spike 退出（No-Go，工程性退出）：CLI 3.0.30（最新版）运行时无法装载 plugin（官方样例同样 No plugins found），VS Code 扩展无装载入口 → registerMessageBuilder 无可交付载体；依赖 plugin 的 #1–#6/#14 暂缓，恢复条件=Cline Runtime 开放装载入口 |
| [ADR-002-project-shape](ADR-002-project-shape.md) | 2026-06-20 | global | active | 项目形态：Cline 扩展层 L1/L2/L3（Update 1: 2026-06-26，Cline Plugin VS Code 支持状态核查——扩展未集成装载入口，代码层跨形态可用） |
| [ADR-001-handoff-compact-memory](ADR-001-handoff-compact-memory.md) | 2026-06-15 | global | active | Handoff / compact / memory 策略 |

## 维护规则

1. **新决策追加在表顶**（时间倒序方便最近看见）
2. 每条决策必须有 frontmatter：`id / date / topic / status / supersedes / superseded_by / evidence`
3. 状态变更时，**新开一条决策**而非修改老条目；通过 `supersedes` / `superseded_by` 关联
4. `rolled-back` 决策不删除——是项目记忆的一部分，证明"曾经尝试过但失败"
