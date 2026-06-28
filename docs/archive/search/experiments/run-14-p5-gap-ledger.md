# Run #14 — P5 Gap Ledger 最小机制双盲验证框架

> 对应决策：`D-2026-06-25-search-redesign-p5-evidence-map`（proposed，本 run 验证其衍生最小机制）
>
> 状态：已完成（Phase 2 评分 4/5，Gap Ledger 升级 active，进入 SKILL.md）
>
> Designated executor：Phase 0a 由 TRAE agent 与用户确认 query / 证据池策略；Phase 0b 由用户复制提示词到 Cline + search-orchestrator SKILL 生成 gap 密集 evidence pool（若复用 Run #13 池则跳过）；Phase 0c 由 TRAE agent 根据 evidence pool 密封 GT；Phase 1a / 1b 由用户复制提示词到 Cline + search-orchestrator SKILL 盲态执行；Phase 2 由 TRAE agent 在收到输出后解封评分。

---

## 0. 背景

Run #13（Evidence Map / Claim Graph，2/5 双盲证伪）与 Run #9c（字段对齐 schema，2/5 双盲证伪）一致表明：在整理良好的非结构化 evidence pool 上，自由文本合成已接近天花板，完整结构化中间表示（节点-边、字段表）相对自由文本无决定性增量。

Run #13 的指标实测：

| 指标 | Run A 自由文本 | Run B Evidence Map | Δ |
|------|---------------:|-------------------:|--:|
| Material Relation Recall | 15/16 = 93.8% | 16/16 = 100% | +6.3% |
| Cross-Dimension Relation Recall | 12/12 = 100% | 12/12 = 100% | 0 |
| Gap Detection Recall | 2/3 = 66.7% | 3/3 = 100% | +33.3% |
| 安全指标（False Conflict / Unsupported Relation / Info Loss） | 0 / 0 / 0 | 0 / 0 / 0 | 0 |

唯一可复现增量集中在 **Gap Ledger 强制枚举证据缺口**（Run B 捕获了 Run A 漏掉的回滚证据缺口 GT15）。但 Run #13 的 gap 分母只有 3（GT9 / GT12 / GT15），统计功效太弱，无法判定这是真实机制收益还是噪声。

Run #14 把这一窄机制单独隔离测量：剥离 Evidence Nodes / Relation Edges / 完整 Claim Graph，**只在自由文本合成前追加一步「强制证据缺口枚举」**，并换用 gap 密集证据集，使 Gap Detection 有足够分母可检验。

---

## 1. 假设

> **H14**：在自由文本合成前追加一步「强制枚举证据缺口（Gap Ledger）」这一最小提示词机制，能在不引入完整节点-边结构的前提下，显著提升证据缺口召回率（Gap Detection Recall），且不损伤 material relation 召回、可追溯性与安全指标。

若成立，则该最小机制可作为 P5 的唯一落地候选进入 SKILL.md；若不成立（Gap Detection Δ 不显著 / 安全指标退化），则 P5 整条线（含 Gap Ledger）保持 proposed 并实质收敛。

---

## 2. 实验设计

### 2.1 单变量（与 Run #13 的关键区别）

| 维度 | Run A Control | Run B Treatment |
|------|---------------|-----------------|
| 输入证据 | 同一份 gap 密集非结构化 evidence pool | 同一份 gap 密集非结构化 evidence pool |
| 执行环境 | Cline + search-orchestrator SKILL | Cline + search-orchestrator SKILL |
| GT 可见性 | 不可见 | 不可见 |
| 中间表示 | 无强制中间表示，自由文本合成 | **仅一步 Gap Ledger（强制证据缺口枚举），随后自由文本合成** |
| **不引入** | — | **不引入 Evidence Nodes / Relation Edges / Conflict Ledger / 节点-边结构** |
| 最终答案要求 | 引用 evidence id | 引用 evidence id（gap 项需标 evidence 不足/低置信） |

与 Run #13 的差异在 Run B：Run #13 的 Run B 是完整 Evidence Map（Nodes + Edges + Conflict Ledger + Gap Ledger）；Run #14 的 Run B **只保留 Gap Ledger 一步**，其余与 Run A 完全相同。这样 Gap Ledger 的边际贡献被单独隔离。

### 2.2 证据集要求

Run #14 的指标焦点从 material relation 转向 **gap detection**，因此证据集必须 gap 密集：

| 要求 | 含义 |
|------|------|
| 非结构化 | 输入为混合 evidence pool，不按实体 × 维度分组 |
| **gap 密集** | GT 至少包含 **5 个 evidence gap**（证据不足 / 仅能低置信回答 / 缺反证 / 缺直接对比），远高于 Run #13 的 3 个，保证 Gap Detection Recall 分母足够 |
| gap 隐蔽性分层 | gap 中至少 2 个为「显性缺口」（证据里明确写"未找到/资料不足"），至少 2 个为「隐性缺口」（证据看似回答了问题，但实为单源/过时/范围外推，需主动识别为不可靠） |
| 仍含少量 material relation | 保留 ≥4 个 conflict/tradeoff/temporal_shift/scope_constraint 作为安全指标基线（确认 Gap Ledger 不会挤掉 relation 召回 / 不引发 info loss） |

候选 query 类型：仍取技术迁移 / 版本升级 / 方案取舍这类高 gap 密度真实问题。

**本 run 选定 query**（锚定 mechanism-candidates #22 Browser-backed Fetch，项目后续选型时真实用到的决策；该领域天然 gap 密集：缺直接对比 / 单源 / 证据过时 / 范围外推 / 缺失败反证）：

```text
评估无头浏览器抓取穿透 Cloudflare 等反爬的可行方案：Playwright / nodriver / Camoufox / FlareSolverr / cloudscraper 与托管云浏览器的有效性、被识别风险、住宅代理与 CAPTCHA 依赖、适用边界
```

### 2.3 Ground Truth

GT 独立密封，Run A / Run B 执行前不可展示给 Cline。GT 至少包含：

| 字段 | 说明 |
|------|------|
| `gt_id` | 稳定编号 |
| `type` | gap_explicit / gap_implicit / conflict / tradeoff / temporal_shift / scope_constraint |
| `involved_evidence` | 相关 evidence id 列表 |
| `expected_statement` | 评分时可接受的标准表述 |
| `gap_subtype` | 仅 gap 项填：missing_counter_evidence / no_direct_comparison / single_source / outdated / out_of_scope |
| `must_be_in_final_answer` | true / false |

---

## 3. 核心指标

主指标为 Gap Detection Recall（本 run 的被测机制直接目标），其余为安全指标（确认最小机制不带来副作用）。

| 指标 | 定义 | 角色 | 通过方向 |
|------|------|------|----------|
| **Gap Detection Recall** | 正确显式标注的 GT gap 数 / GT gap 总数（分母 ≥5） | 主指标 | Run B 显著高于 Run A |
| Implicit Gap Recall | 仅隐性缺口子集的召回 | 主指标分项 | Run B 高于 Run A（最能体现"强制枚举"价值） |
| Material Relation Recall | 显式命中的 GT conflict/tradeoff/temporal_shift/scope_constraint 数 | 安全指标 | Run B 不低于 Run A |
| Traceability Rate | 最终答案关键判断可回指 evidence id 的比例 | 安全指标 | Run B 不低于 Run A |
| False Gap Count | 把证据充分的结论误标为"证据不足"的次数 | 安全指标 | Run B = 0 或不高于 Run A |
| Unsupported Relation Count | 无 evidence 支撑的关系数 | 安全指标 | Run B = 0 |
| Information Loss Count | `must_be_in_final_answer=true` 的 GT 项未进入最终答案的次数 | 安全指标 | Run B 不高于 Run A |
| Answer Verbosity Delta | Run B 相对 Run A 的篇幅膨胀（粗略字数比） | 成本指标 | 不应显著膨胀 |

### 3.1 评分尺度

| 分数 | 条件 |
|------|------|
| 5/5 | Gap Detection Recall Δ ≥ +30% 且 Implicit Gap Recall Δ ≥ +30%，安全指标全部不退化，False Gap = 0，Unsupported Relation = 0，Info Loss 不增加 |
| 4/5 | Gap Detection Recall Δ ≥ +20%，安全指标不退化，False Gap ≤ 1，Unsupported Relation = 0 |
| 3/5 | Gap Detection Recall Δ ≥ +15%，无任一安全指标明显退化 |
| 2/5 | Gap Detection Recall Δ < +15%，但安全指标无明显退化 |
| 1/5 | 无改善且更长更乱，或 False Gap > 1，或 Unsupported Relation > 0，或 Info Loss 增加 |

**升级 active（仅 Gap Ledger 最小机制进入 SKILL.md）触发条件**：≥4/5。

**继续 proposed / P5 整条线收敛条件**：≤3/5。

---

## 4. 执行流程

```text
Phase 0a  TRAE agent 与用户确认 query 与 evidence pool 复用策略（复用 Run #13 池 / 新建 gap 密集池）
Phase 0b  Cline + SKILL 生成 gap 密集非结构化 evidence pool，输出到 docs/search-orchestrator/experiments/run-14-phase0-evidence.md（若复用 Run #13 池则跳过）
Phase 0c  TRAE agent 根据 evidence pool 密封 GT（gap ≥5），输出到 docs/search-orchestrator/experiments/run-14-ground-truth-sealed.md
Phase 1a  用户在 Cline 会话 1 执行 Run A（盲态），输出到 docs/search-orchestrator/experiments/run-14-run-a-output.md
Phase 1b  用户在 Cline 会话 2 执行 Run B（盲态，仅 Gap Ledger 一步），输出到 docs/search-orchestrator/experiments/run-14-run-b-output.md
Phase 2   TRAE agent 解封 GT，对照评分并填入本文件结果记录区
Phase 3   完成实验后按 project-rules.md 同步 survey.md §9.2；若状态变更，再同步 §9.1 / mechanism-candidates #16
```

---

## 5. Cline 执行提示词

### 5.1 Phase 0b：生成 gap 密集 evidence pool（仅当不复用 Run #13 池时执行）

```text
请把输出保存到 docs/search-orchestrator/experiments/run-14-phase0-evidence.md。

请使用 search-orchestrator SKILL，对下面这个真实技术问题做证据收集，只产出非结构化 evidence pool，不做最终答案：

query: "评估无头浏览器抓取穿透 Cloudflare 等反爬的可行方案：Playwright / nodriver / Camoufox / FlareSolverr / cloudscraper 与托管云浏览器的有效性、被识别风险、住宅代理与 CAPTCHA 依赖、适用边界"

执行要求：
1. 使用 search-orchestrator 的既有搜索、fetch、P3 三档模式、P4 同源合并与 P6 highlights 规则。
2. 不要按实体 × 字段表组织证据；只输出混合 evidence pool。
3. 每条 evidence 使用稳定编号 E1、E2、E3...
4. 每条 evidence 必须包含 Claim、Quote、Source、Tier、Scope/Version/Date（如可判断）。
5. fetch 成功的 URL 必须全文归档或合规分块归档，不能只写摘要。
6. 至少覆盖 12 条可评分 evidence；并在「反证不足汇总」中如实记录哪些子问题搜索结果不足、单源、过时或缺直接对比，不要替证据池补全。
7. 不要输出最终建议，不要预先总结冲突点或证据缺口。
```

### 5.2 Phase 1a：Run A Control

```text
请把输出保存到 docs/search-orchestrator/experiments/run-14-run-a-output.md。

你将看到一份非结构化 evidence pool。请基于它回答用户问题。

用户问题："评估无头浏览器抓取穿透 Cloudflare 等反爬的可行方案：Playwright / nodriver / Camoufox / FlareSolverr / cloudscraper 与托管云浏览器的有效性、被识别风险、住宅代理与 CAPTCHA 依赖、适用边界"

限制：
1. 不要使用 Evidence Map、Claim Graph、节点-边、Conflict Ledger、Gap Ledger 等任何结构化中间表示。
2. 可以自由组织自然段答案。
3. 答案中的关键判断必须引用 evidence id，例如 [E3]。
4. 如发现证据冲突、取舍、版本变化或证据缺口，请自然地写进答案；不要猜测有几个。
5. 不要使用外部资料，只能使用给定 evidence pool。

证据集：
请使用 docs/search-orchestrator/experiments/run-14-phase0-evidence.md 中的 Evidence Pool。不要读取或参考 run-14-ground-truth-sealed.md。
```

### 5.3 Phase 1b：Run B Treatment（仅 Gap Ledger 一步）

```text
请把输出保存到 docs/search-orchestrator/experiments/run-14-run-b-output.md。

你将看到一份非结构化 evidence pool。请基于它回答用户问题。本次唯一的附加要求是：在写最终答案之前，先强制产出一份 Gap Ledger。

用户问题："评估无头浏览器抓取穿透 Cloudflare 等反爬的可行方案：Playwright / nodriver / Camoufox / FlareSolverr / cloudscraper 与托管云浏览器的有效性、被识别风险、住宅代理与 CAPTCHA 依赖、适用边界"

步骤：

Step 1 — Gap Ledger（强制证据缺口枚举）
在回答前，逐一扫描问题涉及的每个子维度，显式列出证据缺口。对每一项给出：
- gap 描述（哪个子问题证据不足）
- gap 类型：缺反证 / 无直接对比 / 单一来源 / 证据过时 / 范围外推
- 相关 evidence id（若有）
- 该子问题当前可达到的置信度：low / medium
必须主动检查「看似被回答、实则单源或过时或范围外推」的隐性缺口，不要只列证据里明说"未找到"的显性缺口。
不要在这一步生成 Evidence Nodes、Relation Edges 或 Conflict Ledger——只做 Gap Ledger。

Step 2 — Final Answer
基于 evidence pool 与上面的 Gap Ledger 生成自由文本最终答案。
关键判断必须引用 evidence id；Gap Ledger 中标注的缺口必须在最终答案里以"证据不足/低置信"的方式显式呈现，不得隐去。
不要使用外部资料，只能使用给定 evidence pool。
```

---

## 6. 结果记录区（待执行后填入）

### 6.1 Query

`评估无头浏览器抓取穿透 Cloudflare 等反爬的可行方案：Playwright / nodriver / Camoufox / FlareSolverr / cloudscraper 与托管云浏览器的有效性、被识别风险、住宅代理与 CAPTCHA 依赖、适用边界`

### 6.2 Evidence Pool

[run-14-phase0-evidence.md](run-14-phase0-evidence.md) — 18 条 P3 三元组（E1-E18），覆盖 6 方案，wrapper 节流熔断后降级补完，§3 反证不足汇总 9 项缺口如实记录

### 6.3 Ground Truth

[run-14-ground-truth-sealed.md](run-14-ground-truth-sealed.md) — 已密封（2026-06-26）：9 个 gap（4 显性 G1-G4 + 5 隐性 G5-G9）+ 5 个 material relation（M1-M5）；盲态约束：Run A/B 执行前不可展示给 Cline

### 6.4 Run A 输出

[run-14-run-a-output.md](run-14-run-a-output.md) — 自由文本合成，10 节，~3300 字，关键判断引用 E1-E18

### 6.5 Run B 输出

[run-14-run-b-output.md](run-14-run-b-output.md) — Step 1 Gap Ledger（32 项缺口）+ Step 2 Final Answer，~4500 字

### 6.6 指标实测

| 指标 | Run A | Run B | Δ |
|------|------:|------:|--:|
| Gap Detection Recall | 3/9 = 33.3% | 8/9 = 88.9% | **+55.6%** |
| Implicit Gap Recall | 2/5 = 40% | 4/5 = 80% | +40% |
| Material Relation Recall | 5/5 = 100% | 5/5 = 100% | 0 |
| Traceability Rate | ~100% | ~100% | 0 |
| False Gap Count | 0 | 1 | +1 |
| Unsupported Relation Count | 0 | 0 | 0 |
| Information Loss Count | 0 | 0 | 0 |
| Answer Verbosity Delta | 基准 | +36% | +36% |

### 6.7 评分

**4/5**

判定依据：
- ✅ Gap Detection Recall Δ = +55.6% ≥ +20%（远超 4/5 阈值 +20%，接近 5/5 阈值 +30%）
- ✅ Implicit Gap Recall Δ = +40% ≥ +30%（满足 5/5 隐性缺口要求）
- ✅ Material Relation Recall 不退化（100% = 100%）
- ✅ Traceability Rate 不退化
- ✅ Unsupported Relation Count = 0
- ✅ Information Loss Count 不增
- ❌ False Gap Count = 1（Run B G15 把 cloudscraper "已淘汰"误标为"侦察用途待评估"，属轻度 false gap，阻挡 5/5）

未达 5/5 的唯一原因：False Gap = 1。Run B 在追求 gap 召回时对 cloudscraper 的"侦察用途"做了过度延伸标注，把证据充分支持的"已淘汰"结论误标为"有待评估的缺口"。

### 6.8 决策

**升级 active**（满足 ≥4/5 触发条件）

Gap Ledger 最小机制作为 P5 的唯一落地候选进入 SKILL.md。

**机制描述**：在自由文本合成前追加一步「强制枚举证据缺口（Gap Ledger）」——逐一扫描问题涉及的每个子维度，显式列出 gap 描述 / gap 类型（缺反证 / 无直接对比 / 单一来源 / 证据过时 / 范围外推）/ 相关 evidence id / 置信度；必须主动检查隐性缺口（单源 / 利益相关 / 过时 / 范围外推），不只列显性缺口；Gap Ledger 中标注的缺口必须在最终答案以"证据不足/低置信"方式显式呈现。

**收益量化**：Gap Detection Recall +55.6%（33.3% → 88.9%），隐性缺口召回 +40%（40% → 80%），安全指标全部不退化。

**成本**：答案篇幅 +36%（Gap Ledger 占主要增量，可接受）。

**失败模式**（需在 SKILL.md 标注）：追求 gap 召回时可能产生轻度 false gap（把证据充分的结论误标为"待评估"）。缓解措施：Gap Ledger 每项需引用 evidence id，若 evidence 已充分支持某结论则不应标为 gap。

---

## 7. 参考

- [D-2026-06-25-search-redesign-p5-evidence-map.md](../../decisions/D-2026-06-25-search-redesign-p5-evidence-map.md)
- [run-13-p5-evidence-map.md](run-13-p5-evidence-map.md)（上一代完整 Evidence Map，2/5 双盲证伪）
- [run-9c-p5-output-schema-v3.md](run-9c-p5-output-schema-v3.md)（字段对齐 schema，2/5 双盲证伪）
- [mechanism-candidates.md #16](../../mechanism-candidates.md)