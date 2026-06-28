# Run #13 — P5 Evidence Map / Claim Graph 双盲验证框架

> 对应决策：`D-2026-06-25-search-redesign-p5-evidence-map`
>
> 状态：待执行
>
> Designated executor：Phase 0a 由 TRAE agent 准备 query 候选/确认边界；Phase 0b 由用户复制提示词到 Cline + search-orchestrator SKILL 生成 evidence pool；Phase 0c 由 TRAE agent 根据 evidence pool 密封 GT；Phase 1a / 1b 由用户复制提示词到 Cline + search-orchestrator SKILL 执行；Phase 2 由 TRAE agent 在收到输出后评分。

---

## 0. 背景

Run #9c 证伪的是「实体 × 字段对齐表」式 Output Schema v1：

| 指标 | Run A 自由文本 | Run B 字段 schema | Δ |
|------|---------------:|------------------:|--:|
| Conflict ID Rate | 5/5 = 100% | 4/5 = 80% | -20% |
| Field Alignment Rate | 15/15 = 100% | 14/15 = 93% | -7% |
| Schema 幻觉字段数 | N/A | 0 | 护栏有效 |

结论：schema 护栏有效，但字段表可能限制跨维度冲突发现。Run #13 验证新的 P5 v2：Evidence Map / Claim Graph。

---

## 1. 重设计假设

P5 v2 不要求执行者把证据填入预声明字段表，而要求先形成证据关系图：

```text
证据集合 → Evidence Nodes → Relation Edges → Conflict Ledger / Gap Ledger → 最终答案
```

目标不是提高 Field Alignment，而是提高：

1. material conflict / trade-off / temporal shift 的显式召回；
2. 跨主题、跨条件、跨时间关系的发现率；
3. 最终答案关键判断的可追溯性；
4. 不增加 false conflict，不引入无证据关系。

---

## 2. 实验设计

### 2.1 单变量

| 维度 | Run A Control | Run B Treatment |
|------|---------------|-----------------|
| 输入证据 | 同一份非结构化 evidence pool | 同一份非结构化 evidence pool |
| 执行环境 | Cline + search-orchestrator SKILL | Cline + search-orchestrator SKILL |
| GT 可见性 | 不可见 | 不可见 |
| 中间表示 | 无强制中间表示，自由文本合成 | Evidence Nodes + Relation Edges + Ledgers |
| 最终答案要求 | 引用 evidence id | 引用 node / edge / evidence id |

### 2.2 证据集要求

Run #13 不复用 Run #9c 的 Gin / Echo / Fiber 字段对齐场景。证据集必须满足：

| 要求 | 含义 |
|------|------|
| 非结构化 | 输入为混合 evidence pool，不按实体 × 维度分组 |
| 跨维度冲突 | GT 至少包含 4 个跨主题、跨条件或跨时间关系 |
| 有时间/版本变化 | 至少 1 个 temporal shift，避免只测静态字段 |
| 有条件约束 | 至少 1 个结论需要 scope / applicability 限定 |
| 有 gap | 至少 1 个问题只能低置信回答或需标 evidence gap |

候选 query 类型：技术迁移 / 版本升级 / 方案取舍。建议使用真实近期问题，避免人工构造。

### 2.3 Ground Truth

GT 文件应独立密封，Run A / Run B 执行前不可展示给 Cline。GT 至少包含：

| 字段 | 说明 |
|------|------|
| `gt_id` | 稳定编号 |
| `type` | conflict / tradeoff / temporal_shift / scope_constraint / gap |
| `involved_evidence` | 相关 evidence id 列表 |
| `expected_statement` | 评分时可接受的标准表述 |
| `must_be_in_final_answer` | true / false |

---

## 3. 核心指标

| 指标 | 定义 | 通过方向 |
|------|------|----------|
| Material Relation Recall | 显式命中的 GT conflict / tradeoff / temporal_shift / scope_constraint 数量 | Run B 高于 Run A |
| Cross-Dimension Relation Recall | 命中的跨主题、跨条件、跨时间关系数量 | Run B 高于 Run A |
| Gap Detection Recall | 正确标出的 GT gap 数量 | Run B 不低于 Run A |
| Traceability Rate | 最终答案关键判断可回指 evidence / node / edge 的比例 | Run B 不低于 Run A |
| False Conflict Count | 把兼容事实误判为冲突的次数 | Run B = 0 或不高于 Run A |
| Unsupported Relation Count | 无 evidence 支撑的 relation 数 | Run B = 0 |
| Information Loss Count | GT 关键结论未进入最终答案的次数 | Run B 不高于 Run A |

### 3.1 评分尺度

| 分数 | 条件 |
|------|------|
| 5/5 | Material Relation Recall Δ ≥ +30%，Traceability 不下降，False Conflict = 0，Unsupported Relation = 0，Info Loss 不增加 |
| 4/5 | Material Relation Recall Δ ≥ +20%，Traceability 不下降，False Conflict ≤ 1，Unsupported Relation = 0 |
| 3/5 | Material Relation Recall Δ ≥ +15%，且没有任一安全指标明显退化 |
| 2/5 | 主指标改善 < +15%，但安全指标无明显退化 |
| 1/5 | 无改善且更长更乱，或 False Conflict > 1，或 Unsupported Relation > 0，或 Info Loss 增加 |

**升级 active 触发条件**：≥4/5。

**继续 proposed 条件**：≤3/5。

---

## 4. 执行流程

```text
Phase 0a  TRAE agent 与用户确认真实 query；若无用户指定，先只给出候选，不执行搜索
Phase 0b  Cline + SKILL 生成非结构化 evidence pool，输出到 docs/search-orchestrator/experiments/run-13-phase0-evidence.md
Phase 0c  TRAE agent 根据 evidence pool 密封 GT，输出到 docs/search-orchestrator/experiments/run-13-ground-truth-sealed.md
Phase 1a  用户在 Cline 会话 1 执行 Run A（盲态），输出到 docs/search-orchestrator/experiments/run-13-run-a-output.md
Phase 1b  用户在 Cline 会话 2 执行 Run B（盲态），输出到 docs/search-orchestrator/experiments/run-13-run-b-output.md
Phase 2   TRAE agent 解封 GT，对照评分并填入本文件结果记录区
Phase 3   若实验完成，按 project-rules.md 同步 survey.md §9.2；若状态变更，再同步 §9.1 / mechanism-candidates
```

---

## 5. Cline 执行提示词

### 5.1 Phase 0b：生成 evidence pool

```text
请把输出保存到 docs/search-orchestrator/experiments/run-13-phase0-evidence.md。

请使用 search-orchestrator SKILL，对下面这个真实技术问题做证据收集，只产出非结构化 evidence pool，不做最终答案：

query: "Kubernetes Gateway API 是否值得从 Ingress 迁移：成熟度、控制器兼容性、迁移风险与适用场景"

执行要求：
1. 使用 search-orchestrator 的既有搜索、fetch、P3 三档模式、P4 同源合并与 P6 highlights 规则。
2. 不要按实体 × 字段表组织证据；只输出混合 evidence pool。
3. 每条 evidence 使用稳定编号 E1、E2、E3...
4. 每条 evidence 必须包含 Claim、Quote、Source、Tier、Scope/Version/Date（如可判断）。
5. fetch 成功的 URL 必须全文归档或合规分块归档，不能只写摘要。
6. 至少覆盖 12 条可评分 evidence；若搜索结果不足，明确标注不足原因。
7. 不要输出最终建议，不要预先总结冲突点。
```

### 5.2 Phase 1a：Run A Control

```text
请把输出保存到 docs/search-orchestrator/experiments/run-13-run-a-output.md。

你将看到一份非结构化 evidence pool。请基于它回答用户问题。

用户问题："Kubernetes Gateway API 是否值得从 Ingress 迁移：成熟度、控制器兼容性、迁移风险与适用场景"

限制：
1. 不要使用 Evidence Map、Claim Graph、节点-边、Conflict Ledger 等结构化中间表示。
2. 可以自由组织自然段答案。
3. 答案中的关键判断必须引用 evidence id，例如 [E3]。
4. 如发现证据冲突、取舍、版本变化或证据缺口，请自然地写进答案；不要猜测有几个。
5. 不要使用外部资料，只能使用给定 evidence pool。

证据集：
请使用 docs/search-orchestrator/experiments/run-13-phase0-evidence.md 中的 Phase 3: Evidence Pool（E1-E16）。不要读取或参考 run-13-ground-truth-sealed.md。
```

### 5.3 Phase 1b：Run B Treatment

```text
请把输出保存到 docs/search-orchestrator/experiments/run-13-run-b-output.md。

你将看到一份非结构化 evidence pool。请基于它回答用户问题，并使用 P5 v2 Evidence Map / Claim Graph 中间表示。

用户问题："Kubernetes Gateway API 是否值得从 Ingress 迁移：成熟度、控制器兼容性、迁移风险与适用场景"

步骤：

Step 1 — Evidence Nodes
把 evidence pool 拆成原子证据节点。每个节点包含：node_id、assertion、quote/evidence_id、source、scope、certainty。

Step 2 — Relation Edges
在节点之间寻找关系。允许关系类型：supports、contradicts、qualifies、tradeoff、depends_on、temporal_shift。
每条 edge 必须引用两个或多个 node_id；不得凭常识生成。
必须主动扫描跨主题、跨条件、跨时间关系，不得只比较同一字段或同一小节内的节点。

Step 3 — Conflict Ledger / Gap Ledger
先列出 material conflicts、trade-offs、temporal shifts、scope constraints 和 evidence gaps。
每条 ledger item 必须引用 node_id 或 edge_id。

Step 4 — Final Answer
基于 Nodes / Edges / Ledgers 生成最终答案。关键判断必须回指 node_id、edge_id 或 evidence_id。
不要使用外部资料，只能使用给定 evidence pool。

证据集：
请使用 docs/search-orchestrator/experiments/run-13-phase0-evidence.md 中的 Phase 3: Evidence Pool（E1-E16）。不要读取或参考 run-13-ground-truth-sealed.md。
```

---

## 6. 结果记录区（待执行后填入）

### 6.1 Query

`Kubernetes Gateway API 是否值得从 Ingress 迁移：成熟度、控制器兼容性、迁移风险与适用场景`

### 6.2 Evidence Pool

已归档至 [run-13-phase0-evidence.md](run-13-phase0-evidence.md)。

摘要：Cline + search-orchestrator SKILL 产出 16 条 evidence（E1-E16），覆盖 Gateway API 标准成熟度（v1.4 GA / v1.5 Standard 升级）、控制器 conformance 列表与 benchmark 实测差异、Ingress2Gateway 迁移工具边界、annotation 覆盖缺口、Ingress-NGINX EOL/CVE、side-by-side 迁移策略、性能证据 gap 与不适合迁移场景证据 gap。证据池为混合 evidence pool，不按实体 × 字段分组。

### 6.3 Ground Truth

已密封归档至 [run-13-ground-truth-sealed.md](run-13-ground-truth-sealed.md)。Run A / Run B 执行前不要展示给 Cline。

摘要：GT 包含 16 个 material relations，类型覆盖 conflict、tradeoff、temporal_shift、scope_constraint、gap；主指标不再使用 Field Alignment，而使用 Material Relation Recall、Cross-Dimension Relation Recall、Gap Detection Recall、Traceability Rate、False Conflict Count、Unsupported Relation Count、Information Loss Count。

### 6.4 Run A 输出

已归档至 [run-13-run-a-output.md](run-13-run-a-output.md)。自由文本基线：四维度分析（成熟度 / 控制器兼容性 / 迁移风险 / 适用场景）+ 总结判断，关键判断均回指 evidence id，并自带两处证据缺口说明。

### 6.5 Run B 输出

已归档至 [run-13-run-b-output.md](run-13-run-b-output.md)。Evidence Map / Claim Graph：24 个 Evidence Nodes、14 条 Relation Edges、Conflict Ledger（4）/ Trade-off（4）/ Temporal Shift（3）/ Scope Constraint（4）/ Gap Ledger（5），最后给出四维度结构化最终答案，关键判断回指 node / edge / evidence id。

### 6.6 指标实测

| 指标 | Run A | Run B | Δ |
|------|------:|------:|--:|
| Material Relation Recall | 15/16 = 93.8% | 16/16 = 100% | **+6.3%** |
| Cross-Dimension Relation Recall | 12/12 = 100% | 12/12 = 100% | 0 |
| Gap Detection Recall | 2/3 = 66.7% | 3/3 = 100% | +33.3% |
| Traceability Rate | ≈100% | ≈100% | ≈0 |
| False Conflict Count | 0 | 0（C4 边界标注，非 GT 定义误判）| 0 |
| Unsupported Relation Count | 0 | 0 | 0 |
| Information Loss Count | 0 | 0 | 0 |

明细：

- Run A 唯一漏项是 GT15（无成熟回滚案例的证据缺口，`must_be_in_final_answer=false`）；其余 15 项 material relation 全部显式命中并进入最终答案。
- Run B 命中全部 16 项，唯一相对优势集中在 Gap Ledger 强制显式列出回滚证据缺口（GT15）。
- Cross-Dimension Relation Recall 两者都达天花板（12/12），自由文本叙事流同样能连接跨维度关系。
- 安全指标（False Conflict / Unsupported Relation / Info Loss）双方均为 0，Evidence Map 护栏有效但未带来主指标收益。

### 6.7 评分

**Run #13 评分：2/5。**

- 主指标 Material Relation Recall Δ=+6.3% < +15%（未达 3/5 门槛）。
- Cross-Dimension Relation Recall Δ=0（自由文本已达天花板）。
- 安全指标无退化，且存在小幅 gap detection 收益（+33.3%，但分母仅 3），故高于 1/5。
- 命中 2/5 档：主指标改善 < +15%，安全指标无明显退化。

核心发现：与 Run #9c 的结论一致——在经过良好整理的非结构化 evidence pool 上，自由文本合成已能达到接近天花板的 material relation 与 cross-dimension recall（15/16、12/12）。Evidence Map / Claim Graph 的唯一稳定增量是 **Gap Ledger 强制显式枚举证据缺口**（捕获了自由文本漏掉的回滚 gap）。但这一单点优势不足以把主指标抬过 +15%。结构化中间表示再次未能相对自由文本展现决定性优势；其价值主要体现在“强制 gap 枚举”这一窄机制上。

### 6.8 决策

- 升级 active 触发条件（≥4/5）：**未满足**。
- 继续 proposed 条件（≤3/5）：**满足**。
- **P5 Evidence Map / Claim Graph：proposed（保持）**。整套 Evidence Map 机制不进入 SKILL.md。
- **mechanism-candidates #16：候选（保持）**。
- 衍生观察（记入候选池）：Run #13 唯一可复现的增量是 Gap Ledger 强制证据缺口枚举。后续若再评估 P5，应优先验证“仅追加 Gap Ledger / 证据缺口枚举提示”这一最小机制，而不是完整 Evidence Map；其余节点-边结构暂无证据支持收益。

---

## 7. 参考

- [D-2026-06-25-search-redesign-p5-evidence-map.md](../../decisions/D-2026-06-25-search-redesign-p5-evidence-map.md)
- [run-9c-p5-output-schema-v3.md](run-9c-p5-output-schema-v3.md)
- [D-2026-06-24-search-evaluate-p5-output-schema.md](../../decisions/D-2026-06-24-search-evaluate-p5-output-schema.md)
