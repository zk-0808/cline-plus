# 归档摘要 — 搜索实验 run-9 到 run-14

> **生成日期**：2026-06-28
> **覆盖范围**：P5 Output Schema（v1→v2→v3）、P6 Highlights、P4 语义合并（translation + summary/rewrite）、P5 Evidence Map、P5 Gap Ledger
> **归档性质**：摘要索引，不移动/删除原始文件

---

## 机制验证总结

| 机制 | 最终状态 | 关键实验 | 核心结论 |
|------|---------|---------|---------|
| P5 Output Schema v1（字段对齐表） | ❌ proposed → superseded | run-9 → 9b → 9c | 双盲证伪：schema 结构限制跨维度冲突发现（Δ Conflict ID = -20%） |
| P5 Evidence Map / Claim Graph | ❌ proposed（不再推进） | run-13 | 双盲证伪：完整结构化中间表示对自由文本无决定性优势（Δ Material Relation Recall = +6.3% < +15%） |
| P5 Gap Ledger（最小机制） | ✅ active | run-14 | 双盲验证通过：Gap Detection Recall Δ=+55.6%，Implicit Gap Recall Δ=+40%，False Gap=1 |
| P6 Highlights（verbatim 抽取） | ✅ active | run-10 | Extractive Fidelity 92.3%（24/26），Paraphrase 7.7%，提示词层 verbatim 指令基本有效 |
| P4 语义合并 — translation | ✅ active | run-11 | P4 LLM P=1.00/R=1.00 vs Baseline R=0.20，Net Gain +0.80 |
| P4 语义合并 — summary/rewrite | ✅ active | run-12b | P4 LLM P=1.00/R=1.00 vs Baseline R=0.00，Net Gain +1.00，False Merge=0 |

---

## 逐文件摘要

| # | 文件 | 核心结论 | 评分 | survey.md 覆盖 | 建议 |
|---|------|---------|------|---------------|------|
| 1 | `run-9-p5-output-schema.md` | P5 Output Schema 首轮验证：**设计失败**。单源列表型证据集（1 URL × 4 同源 claim）导致自由文本基线已顶满指标天花板（Claim Coverage 100%），schema 无提升空间。根因：证据集不触发 P5 核心收益场景 | 1/5 | ✅ 已覆盖（survey L310） | 保留作失败案例参考 |
| 2 | `run-9b-external-review.md` | 外部评审材料：提交给评审者的 P5 多实体对比验证背景、评分焦点和决策选项。评审决策为 C（有条件 active，需双盲 + 非结构化证据集） | 3/5 有条件 | ✅ 已覆盖（survey L311） | 保留作评审流程参考 |
| 3 | `run-9b-p5-output-schema-v2.md` | P5 多实体对比验证（Gin/Echo/Fiber × 5 维度）：Conflict ID +40%（方向性信号），Field Alignment 天花板归因 P3 证据集已结构化。非双盲，不可采信为机制证据 | 3/5 有条件 | ✅ 已覆盖（survey L311） | 保留作实验设计迭代参考 |
| 4 | `run-9b-phase0-evidence.md` | Phase 0 证据集：Go Web 框架（Gin/Echo/Fiber）5 维度对比研究，含 15 个 P3 三元组。由 Cline 自主选择主题并执行 | — | ✅ 已覆盖 | 保留作证据集样本 |
| 5 | `run-9c-ground-truth-sealed.md` | 密封 Ground Truth：3 实体 × 5 维度 = 15 槽字段矩阵 + 5 个冲突点。用于 run-9c 双盲评分 | — | ✅ 已覆盖 | 保留作 GT 设计参考 |
| 6 | `run-9c-p5-output-schema-v3.md` | P5 双盲 + 非结构化证据集验证框架。触发条件：Conflict ID Δ < +15% 则降回 proposed | 2/5 | ✅ 已覆盖（survey L312） | 保留作双盲实验设计模板 |
| 7 | `run-9c-run-a-output.md` | Run A 自由文本输出：Gin/Echo/Fiber 5 维度对比，自由文本叙事覆盖全部 15 槽 + 5 冲突 | — | ✅ 已覆盖 | 保留作基线输出样本 |
| 8 | `run-9c-run-b-output.md` | Run B schema 输出：按 schema 抽取 3 实体 × 5 维度字段，Conflict ID 4/5（漏 1 个跨维度冲突） | — | ✅ 已覆盖 | 保留作 schema 输出样本 |
| 9 | `run-10-output.md` | PostgreSQL 17 vs MySQL 8.4 OLTP 高并发选型全流程输出。含 P6 Highlights 首次集成、Goggle × SourceWeighting 观察。DDG API 不可用，改用 fetch_content 直抓 | — | ✅ 已覆盖 | 保留作完整 L2 流程样本 |
| 10 | `run-10-p6-highlights.md` | P6 Highlights verbatim 抽取保真度验证：Extractive Fidelity 92.3%（24/26），Paraphrase 7.7%（2/26），Untraceable 0。两条 paraphrase 模式：主语同义替换 + 跨语言归纳。**P6 升级 active** | 4/5 | ✅ 已覆盖（survey L313, L329） | 保留，P6 已进 SKILL.md |
| 11 | `run-10-phase0-evidence.md` | Phase 0 证据集：PG 17 vs MySQL 8.4 四维度（MVCC/benchmark/复制/JSON）搜索与 fetch 结果 | — | ✅ 已覆盖 | 保留作证据集样本 |
| 12 | `run-11-baseline-output.md` | SimHash/Jaccard + URL 规范化算法基线：28 对全部分类，P=1.00/R=0.20/F1=0.33。高精度低召回，3 个 translation 对全部 Miss（lexical 不具备跨语言能力） | — | ✅ 已覆盖 | 保留作基线算法参考 |
| 13 | `run-11-ground-truth.md` | K8s Sidecar Containers 语义同源对标注：8 个 URL，C(8,2)=28 对，含 verbatim/translation/semantic-summary/different 分类 | — | ✅ 已覆盖 | 保留作 GT 标注方法参考 |
| 14 | `run-11-output.md` | K8s Sidecar Containers 调研全流程输出。fetch 8 URL，归档正文摘要（非全文——系统性归档问题） | — | ✅ 已覆盖 | 保留，注意归档质量问题 |
| 15 | `run-11-p4-semantic-merge.md` | P4 语义去重增益验证（translation 子类）：Baseline R=0.20, P4 LLM R=1.00, Net Gain +0.80。**P4 translation 子类验证通过**。降级 4/5 原因：样本仅 3 对，摘要限制低估 baseline | 4/5 | ✅ 已覆盖（survey L314, L325） | 保留，P4 已 active |
| 16 | `run-12-output.md` | P4 summary/rewrite Phase 0 尝试记录：3 次 Attempt（Python 3.13/PG 17/Next.js 15），前两次样本不足未进入正式评测 | — | ✅ 已覆盖 | 保留作实验迭代记录 |
| 17 | `run-12-p4-summary-rewrite.md` | P4 summary/rewrite 子类补评测框架：要求 ≥3 对 summary + rewrite 候选，严格 Phase 0 协议 | 5/5 | ✅ 已覆盖（survey L315, L325） | 保留，P4 语义合并已全覆盖 |
| 18 | `run-12b-baseline-output.md` | SimHash/Jaccard 基线（Next.js 15）：14 URL，P=1.00/R=0.00/F1=0.00。算法完全无法识别 summary/rewrite 同源 | — | ✅ 已覆盖 | 保留作基线参考 |
| 19 | `run-12b-ground-truth.md` | Next.js 15 语义同源对标注：13 个 URL，6 对 positive（summary 3 + rewrite 2 + translation 1） | — | ✅ 已覆盖 | 保留作 GT 标注参考 |
| 20 | `run-12b-output.md` | P4 summary/rewrite 严格 Phase 0 输出：fetch 14 URL，完整正文归档，6 对候选，5 对 False Merge 审计 | — | ✅ 已覆盖 | 保留作严格 Phase 0 协议样本 |
| 21 | `run-13-ground-truth-sealed.md` | 密封 GT：K8s Gateway API 迁移，16 个 material relation（conflict/tradeoff/temporal_shift/scope_constraint/gap），不测试字段对齐 | — | ✅ 已覆盖 | 保留作 relation-based GT 设计参考 |
| 22 | `run-13-p5-evidence-map.md` | P5 v2 Evidence Map / Claim Graph 双盲验证框架：重设计假设、指标定义、执行协议 | 2/5 | ✅ 已覆盖（survey L316, L328） | 保留作实验框架参考，机制不再推进 |
| 23 | `run-13-phase0-evidence.md` | Phase 0 证据集：K8s Gateway API 迁移，6 个子问题 × 3 路 fanout，16 个 P3 三元组 | — | ✅ 已覆盖 | 保留作证据集样本 |
| 24 | `run-13-run-a-output.md` | Run A 自由文本输出：Gateway API 迁移 4 维度分析，Material Relation Recall 15/16=93.8% | — | ✅ 已覆盖 | 保留作自由文本基线样本 |
| 25 | `run-13-run-b-output.md` | Run B Evidence Map 输出：Evidence Nodes → Relation Edges → Conflict/Gap Ledger → Final Answer，Material Relation Recall 16/16=100% | — | ✅ 已覆盖 | 保留作 Evidence Map 输出样本 |
| 26 | `run-14-ground-truth-sealed.md` | 密封 GT：Cloudflare 反爬方案，9 个 gap（4 显性 + 5 隐性）+ 5 个 material relation。隐性 gap 判定标准：单源利益相关/版本过时/缺反证 | — | ✅ 已覆盖 | 保留作 gap 密集型 GT 设计参考 |
| 27 | `run-14-p5-gap-ledger.md` | P5 Gap Ledger 最小机制双盲验证框架：背景（run-13 唯一增量在 Gap Ledger）、设计、指标定义 | 4/5 | ✅ 已覆盖（survey L317, L327） | 保留，Gap Ledger 已进 SKILL.md |
| 28 | `run-14-phase0-evidence.md` | Phase 0 证据集：Cloudflare 反爬方案，Playwright/nodriver/Camoufox/ScrapingBee 等 18 个 P3 三元组，gap 密集 | — | ✅ 已覆盖 | 保留作证据集样本 |
| 29 | `run-14-run-a-output.md` | Run A 自由文本输出：Cloudflare 反爬 5 方案评估，含 Playwright 通过率数据、nodriver/SeleniumBase 对比、商业方案分析 | — | ✅ 已覆盖 | 保留作自由文本基线样本 |
| 30 | `run-14-run-b-output.md` | Run B Gap Ledger 输出：强制枚举 15 个证据缺口（含 4 个隐性 gap），Gap Detection Recall 88.9% vs Run A 33.3% | — | ✅ 已覆盖 | 保留作 Gap Ledger 输出样本 |

---

## 归档结论

**全部 31 个文件均已被 survey.md 实验追踪表（§9）和机制状态表（§11）完整覆盖。** 无需额外归档动作。

### 关键发现回顾

1. **P5 结构化中间表示两代均证伪**：字段对齐 schema（run-9c, 2/5）和 Evidence Map（run-13, 2/5）在双盲条件下均未对自由文本展现决定性优势。自由文本叙事流在跨维度冲突发现上反而更灵活。
2. **P5 Gap Ledger 是唯一落地机制**：从完整 Evidence Map 中剥离出的最小机制（强制枚举证据缺口），run-14 验证 4/5，Gap Detection Recall Δ=+55.6%。
3. **P6 Highlights 验证通过**：提示词层 verbatim 抽取指令 92.3% 保真度，满足工程需求。
4. **P4 语义合并全覆盖**：逐字（run-7）→ translation（run-11）→ summary/rewrite（run-12b），三子类均验证通过。
5. **实验设计迭代显著**：从 run-9 单源设计失败到 run-9c/13/14 双盲设计，实验方法论持续改进。

### 建议

- 所有文件保留原位，不移动/删除
- 本摘要文件作为后期实验索引使用
- 后续 P5 相关工作只围绕 Gap Ledger 机制迭代，不再重做完整 Evidence Map
