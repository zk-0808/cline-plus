---
id: D-2026-06-25-search-redesign-p5-evidence-map
date: 2026-06-25
topic: search-orchestrator
status: proposed
lifecycle: 永久保留——决策记录，状态由 status 枚举驱动。
supersedes:
  - D-2026-06-24-search-evaluate-p5-output-schema
superseded_by: []
evidence:
  - file: search/search-orchestrator/experiments/run-9c-p5-output-schema-v3.md
    section: "§5.6 评分理由"
  - file: search/search-orchestrator/experiments/run-9c-p5-output-schema-v3.md
    section: "§5.7 决策"
  - file: decisions/D-2026-06-24-search-evaluate-p5-output-schema.md
    section: "Q2：P5 机制是什么"
  - file: search/search-orchestrator/survey.md
    section: "§9.3 最终路线状态"
  - file: mechanism-candidates.md
    section: "条目 16：Output Schema 结构化抽取"
  - file: search/search-orchestrator/experiments/run-13-p5-evidence-map.md
    section: "§1 重设计假设"
---

# D-2026-06-25 — 重设计 P5：Evidence Map / Claim Graph（非字段对齐 schema）

## 决策

**proposed**：用 **Evidence Map / Claim Graph** 重设计 P5，取代 Run #9c 已证伪的「实体 × 字段对齐表」式 Output Schema v1。

新 P5 仍属于提示词层 Phase 4 中间表示，但中间表示不再服务于字段填表，而是服务于证据关系发现：

```text
证据集合 → Evidence Nodes → Relation Edges → Conflict Ledger / Gap Ledger → 最终答案
```

本决策只启动重设计与 Run #13 验证框架，不修改 SKILL.md。是否进入 `active` 取决于 Run #13 双盲 A/B 结果。

## 一句话理由

Run #9c 证明字段对齐式 schema 的护栏有效但收益不成立：Schema 幻觉字段数为 0，但 Conflict ID Δ=-20%、Field Alignment Δ=-7%。问题不在「结构化」本身，而在「预声明字段表」把执行者锁进同维度填空，削弱跨维度冲突发现。

## 背景

P5 v1 的机制是：

```text
sub-question 预声明 schema 字段 → LLM 抽字段 → 基于字段综合答案
```

Run #9c 在双盲 + 非结构化证据集条件下得到：

| 指标 | Run A 自由文本 | Run B 字段 schema | Δ |
|------|---------------:|------------------:|--:|
| Conflict ID Rate | 5/5 = 100% | 4/5 = 80% | -20% |
| Field Alignment Rate | 15/15 = 100% | 14/15 = 93% | -7% |
| Schema 幻觉字段数 | N/A | 0 | 护栏有效 |

这说明 v1 的字段表没有带来冲突识别收益，反而可能让执行者只报告 schema 内已抽字段之间的冲突，漏掉跨维度关系。

## 新机制

### Phase 4.1 Evidence Nodes

把进入合成阶段的证据先拆成节点，每个节点只表达一个可追溯 claim：

| 字段 | 含义 |
|------|------|
| `node_id` | 稳定编号，例如 `N7` |
| `assertion` | 一条原子主张 |
| `quote` | 支撑该主张的原文片段或 P3 quote |
| `source` | URL / 文档 / evidence id |
| `scope` | 主张适用范围，例如版本、产品、部署条件、时间 |
| `certainty` | high / medium / low |

### Phase 4.2 Relation Edges

在节点之间找关系，而不是把节点塞进实体字段表：

| 关系 | 含义 |
|------|------|
| `supports` | 两个节点互相支持或细化 |
| `contradicts` | 两个节点给出相反结论 |
| `qualifies` | 一个节点限制另一个节点的适用条件 |
| `tradeoff` | 两个节点构成收益与代价 |
| `depends_on` | 一个结论依赖另一个前提 |
| `temporal_shift` | 同一问题在版本/时间上发生变化 |

每条 relation 必须引用两个或多个 `node_id`，不得只凭常识生成。

### Phase 4.3 Conflict Ledger / Gap Ledger

在最终答案前显式产出两张最小账本：

| Ledger | 作用 |
|--------|------|
| Conflict Ledger | 汇总 material conflicts / trade-offs / temporal shifts，尤其检查跨主题、跨条件的关系 |
| Gap Ledger | 汇总证据不足或只能低置信回答的问题 |

### Phase 4.4 Synthesis

最终答案只能使用 Evidence Nodes 与 Relation Edges 中可追溯的信息。答案中的关键判断必须能回指 `node_id` 或 `edge_id`。

## 与 v1 的关键差异

| 维度 | P5 v1 字段 schema | P5 v2 Evidence Map |
|------|------------------|--------------------|
| 中间表示目标 | 对齐字段 | 发现证据关系 |
| 结构形态 | 实体 × 维度表 | 节点 + 边 + 冲突账本 |
| 缺失表达 | 字段 unknown | Gap Ledger |
| 核心指标 | Field Alignment | Conflict / Tradeoff Recall |
| Run #9c 失败点 | 结构限制跨维度连接 | 明确把跨维度连接作为主任务 |

## 防止复发 Run #9c 失败的硬约束

1. 不预声明实体 × 维度字段表。
2. 不以 Field Alignment Rate 作为主指标。
3. 不把 unknown 当成每个字段槽的填充值，只允许进入 Gap Ledger。
4. Relation scan 不得限制在同一实体或同一维度内。
5. Conflict Ledger 必须先于最终答案生成。
6. 最终答案的关键判断必须回指 `node_id` 或 `edge_id`。

## 验证方案

Run #13 使用同一份非结构化证据集做双盲 A/B：

| Run | 处理方式 |
|-----|----------|
| Run A | 自由文本合成，允许自然段组织，但要求引用 evidence id |
| Run B | Evidence Map / Claim Graph：先节点、再关系、再 Conflict Ledger / Gap Ledger、最后合成 |

核心指标：

| 指标 | 定义 | 通过方向 |
|------|------|----------|
| Material Conflict / Tradeoff Recall | 显式命中的 GT material conflicts / trade-offs / temporal shifts 数量 | Run B 高于 Run A |
| Cross-Dimension Relation Recall | 命中的跨主题、跨条件、跨时间关系数量 | Run B 高于 Run A |
| Traceability Rate | 最终答案关键判断可回指 node/edge/evidence 的比例 | Run B 不低于 Run A |
| False Conflict Count | 把兼容事实误判为冲突的次数 | Run B = 0 或不高于 Run A |
| Information Loss Count | GT 关键结论未进入最终答案的次数 | Run B 不高于 Run A |

Run #13 若无法在 Conflict / Relation 类指标上达到显著收益，则 P5 v2 继续保持候选，不进入 SKILL.md。

## Run #13 结果（2026-06-25 回填）

Run #13 已完成双盲 A/B（Gateway API 迁移问题，非结构化 evidence pool E1-E16，16 个 GT material relations）。

| 指标 | Run A 自由文本 | Run B Evidence Map | Δ |
|------|---------------:|-------------------:|--:|
| Material Relation Recall | 15/16 = 93.8% | 16/16 = 100% | +6.3% |
| Cross-Dimension Relation Recall | 12/12 = 100% | 12/12 = 100% | 0 |
| Gap Detection Recall | 2/3 = 66.7% | 3/3 = 100% | +33.3% |
| Traceability Rate | ≈100% | ≈100% | ≈0 |
| False Conflict / Unsupported Relation / Info Loss | 0 / 0 / 0 | 0 / 0 / 0 | 0 |

**评分 2/5，结论：保持 proposed，不进入 SKILL.md。**

- 主指标 Material Relation Recall Δ=+6.3% < +15% 门槛，未达 active 条件。
- Cross-Dimension Recall 双方均达天花板（12/12），自由文本叙事流同样能连接跨维度关系——这与 Run #9c「自由文本反超 schema」的结论方向一致。
- Evidence Map / Claim Graph 的唯一可复现增量是 Gap Ledger 强制枚举证据缺口（捕获 Run A 漏掉的回滚 gap GT15）。
- 衍生候选：后续若再评估 P5，只验证「仅追加 Gap Ledger / 证据缺口枚举」最小机制，不再做完整 Evidence Map 节点-边结构。

## 不做的事

- 不复用 Run #9c 的 Gin / Echo / Fiber 字段对齐天花板场景。
- 不把 v2 简化成「换一组字段名」的 schema。
- 不修改 MCP、搜索后端或 fetch 基础设施。
- 不在 Run #13 执行完成前修改 SKILL.md。

## 影响

- 原 P5 v1 决策 `D-2026-06-24-search-evaluate-p5-output-schema` 被本决策 supersede。
- P5 路线状态仍为 `proposed`，但候选设计从字段对齐 schema 改为 Evidence Map / Claim Graph。
- `mechanism-candidates.md` #16 仍为候选；只有 Run #13 验证通过后才可升级为机制化方向。
- `survey.md §9.1` 需新增本决策，并把 v1 决策状态同步为 `superseded`。
