# 04 — Experiments

> 本章综述 14 轮 A/B 实验。每轮含：主题 / 设计 / 关键数据 / 决策。
>
> 原始数据见 [docs/search-orchestrator/experiments/](../search-orchestrator/experiments/)，浓缩表见 [survey.md §9.2](../search-orchestrator/survey.md)。

---

## 总览

| Run | 主题 | 机制分 | 基础设施分 | 决策 |
|-----|------|-------|-----------|------|
| #1 | P1 Goggle 首轮 | — | — | ✅ 4/5 保留 |
| #2 | P2 三路 fanout 首轮 | — | — | ⚠️ 3.6/5 调参重跑 |
| #3 | P2 调参后复测 | — | — | ❌ 2.6/5 回炉 |
| #4 | P3 中文 query | 5/5 | 1/5 | 规则可行，fetch 瓶颈 |
| #5 | P3 英文 query | 5/5 | 5/5 | ✅ 双维度通过 |
| #6 | P3 中文复测 | 5/5 | 1/5 | ⚠️ 机制零误引用，fetch 中文瓶颈 |
| #7 | P4 同源合并首轮 | — | — | ✅ Merge Precision 100% |
| #8a | MCP 后端切换 | — | 1/5 | ❌ TLS 指纹假设 disproven |
| #9 | P5 Output Schema v1 | 1/5 设计失败 | — | ❌ 单源列表型证据集天花板 |
| #9b | P5 Output Schema v2 | 3/5 有条件 | — | ⚠️ Conflict ID Δ=+40% 非双盲 |
| #9c | P5 Output Schema v3 | 2/5 | — | ❌ 双盲证伪，schema 反超 -20% |
| #10 | P6 Highlights verbatim | 4/5 | — | ✅ P6 升级 active |
| #11 | P4 translation 子类 | 4/5 | — | ✅ P4 LLM P=1.00/R=1.00 |
| #12 | P4 summary/rewrite 首轮 | N/A | — | ❌ Python 3.13 Attempt 样本不足 |
| #12b | P4 summary/rewrite 严格重跑 | 5/5 | — | ✅ P4 LLM P=1.00/R=1.00 |
| #13 | P5 Evidence Map / Claim Graph | 2/5 | — | ❌ Material Relation Δ=+6.3% < +15% |
| #14 | P5 Gap Ledger 最小机制 | **4/5** | — | ✅ **P5 Gap Ledger 升级 active** |

**统计**：14 轮（含 9b/12b 子轮）→ 6 个机制升级 active、4 条路径证伪、3 个机制经多轮迭代后通过。

---

## 1. Run #1 — P1 Goggle 首轮验证

| 字段 | 值 |
|------|-----|
| 日期 | 2026-06-23 |
| Query | "K8s 滚动更新 ImagePullBackOff 排查方法" |
| 改造 | Phase 3.5 Domain Goggles（5 预置 + BOOST/DOWNRANK/DISCARD） |
| 评分 | 4/5 |

### 关键数据

| 指标 | Run A 基线 | Run B 应用 P1 | Δ |
|------|-----------|--------------|---|
| 垃圾站清除率 | 0/5 = 0% | 5/5 = **100%** | +100% |
| Top-5 中 T1/T2 数 | 0 | 1（kubernetes.io 升 T1） | +1 |

### 决策

✅ 保留 + 推进 P1.5 FinalScore 联动。

详见 [run-1-goggle.md](../search-orchestrator/experiments/run-1-goggle.md)；commit `19a8953`。

**评分说明**：原始评分 2/5 用错指标（BOOST 命中数），按 ab-test-template.md 正确指标（垃圾站清除率）重评为 4/5。这是评分阈值体系本身的迭代——指标错了会得到错误结论。

---

## 2. Run #2 — P2 三路 fanout 首轮

| 字段 | 值 |
|------|-----|
| 改造 | Phase 1.4 P2 Query Rewrite + 三路 fanout（直白 / 限域 / 反证）+ DiversityPenalty |
| 评分 | 3.6/5 |

### 决策

⚠️ 不达 4/5 阈值，调参重跑（Run #3）。

### 暴露的问题

- DiversityPenalty ±2 量级压不过 SourceWeight ±10
- 反证路（R3）召回差
- LLM 提示词层算分不稳定

详见 [run-2-fanout.md](../search-orchestrator/experiments/run-2-fanout.md)。

---

## 3. Run #3 — P2 调参后复测

| 字段 | 值 |
|------|-----|
| 改造 | P2 调参（提高 DiversityPenalty 权重、调整 R3 反证策略） |
| 评分 | 2.6/5 |

### 决策

❌ 回炉。P2 整体 deferred。

### 根因（与 #20/#21 候选关联）

| 根因 | 学术对照 |
|------|---------|
| LLM 提示词层算分不可靠 | NumericBench：LLM 算术达不到 100%；4 倍方差压缩使 ±2 落在噪声地板 |
| 负向 query 召回差 | NevIR：神经检索在否定上等于/低于随机；DDG 2023 起算子被下线 |
| DiversityPenalty 量级失衡 | pointwise 逐条打分是排序家族方差最大范式 |

衍生候选：#20 反证检索 / #21 多样性排序 → 保持候选（暂缓，后续可由检索策略+架构缓解，非"完全不可治"）。

详见 [run-3-fanout-tuned.md](../search-orchestrator/experiments/run-3-fanout-tuned.md)；决策 [D-2026-06-24-search-defer-p2](../decisions/D-2026-06-24-search-defer-p2.md)。

---

## 4. Run #4 — P3 中文 query 首轮

| 字段 | 值 |
|------|-----|
| Query | 中文 |
| 改造 | P3 Evidence-bound Citation（Claim / Quote / Source 三元组） |
| 机制分 | 5/5 |
| 基础设施分 | 1/5 |

### 关键数据

| 维度 | 结果 |
|------|------|
| Claim-Quote 绑定率 | 100% |
| 误引用 | 0 |
| fetch 成功率 | 1/10 = 10%（中文站点 fetch 瓶颈） |

### 决策

✅ 机制可行（5/5）。基础设施瓶颈（1/5）由 Tier B/C 降级吸收，不阻塞机制采纳。

### 衍生

发现"中文 fetch 瓶颈"是结构性问题，催生 P3 三档模式设计。

详见 [run-4-p3-evidence-bound-citation.md](../search-orchestrator/experiments/run-4-p3-evidence-bound-citation.md)。

---

## 5. Run #5 — P3 英文 query 复测

| 字段 | 值 |
|------|-----|
| Query | 英文 |
| 改造 | P3（同 #4） |
| 机制分 | 5/5 |
| 基础设施分 | 5/5 |

### 关键数据

| 维度 | 结果 |
|------|------|
| Claim-Quote 绑定率 | 100% |
| 误引用 | 0 |
| fetch 成功率 | 5/5 = 100%（英文生态覆盖高） |

### 决策

✅ 双维度通过。P3 升级 active。

### 落地

D-2026-06-24-search-adopt-p3（active）；SKILL.md §4.3 新增 §4.3 Output-Citation-Enforce 三档模式。

详见 [run-5-p3-retry.md](../search-orchestrator/experiments/run-5-p3-retry.md)。

---

## 6. Run #6 — P3 中文 query 复测（排除波动）

| 字段 | 值 |
|------|-----|
| Query | 中文 |
| 改造 | P3（同 #4） |
| 机制分 | 5/5 |
| 基础设施分 | 1/5 |

### 关键数据

| 维度 | 结果 |
|------|------|
| 1 个成功 fetch URL 产出 4 条 verbatim Quote | 0 误引用 |
| 9 个 fetch 失败 URL | 全部正确标 `[无法引证]`，0 编造 |

### 决策

⚠️ 确认机制零误引用，fetch 中文瓶颈为持久现象。

### 衍生

- 中文场景永久 Tier C
- 启动 #22 Browser-backed Fetch 候选（暂缓）
- Run #8a 启动 MCP 后端切换验证

详见 [run-6-p3-zh-retry.md](../search-orchestrator/experiments/run-6-p3-zh-retry.md)。

---

## 7. Run #7 — P4 同源合并首轮（verbatim）

| 字段 | 值 |
|------|-----|
| 改造 | Phase 1.4.5 Step 3.bis 同源内容合并 |
| 子类 | verbatim（逐字） |

### 关键数据

| 指标 | 值 |
|------|-----|
| Merge Precision | 100%（2/2 转载正确识别：知乎原文 → SegmentFault 转载 → CSDN 镜像） |
| False Merge | 0 |
| Information Loss | 0 |
| Unique Domains Delta | -1（仅记录） |

### 决策

✅ 机制通过。保留版本为最高权威源（知乎 T3 vs CSDN T4）。

### 关键修订

发现 "Top-5 域名多样性从 4 → 3" 不是退化——segmentfault.com 是知乎转载站，释放 slot 被同腾讯云其他文章填入。**域名多样性 ≠ 内容多样性**，修订为观察指标（D-2026-06-24-search-revise-p4-metrics）。

详见 [run-7-p4-dedup.md](../search-orchestrator/experiments/run-7-p4-dedup.md)。

---

## 8. Run #8a — MCP 后端切换验证

| 字段 | 值 |
|------|-----|
| 改造 | Node.js `duckduckgo-websearch` → Python `curl_cffi`（TLS 指纹模拟） |
| 基础设施分 | 1/5 |

### 关键数据

| 指标 | 结果 |
|------|------|
| HTTP Success Rate | 10/10 = 100% |
| Content Success Rate | 0/10 = 0% |
| juejin 等中文站点 | 全部返回 "Please wait..." JS Challenge 假页面 |

### 决策

❌ **TLS 指纹假设 disproven**。HTTP Success ≠ Content Success。

### 回滚动作

- MCP 切回 Node.js
- 中文场景永久 Tier C
- 启动 #22 Browser-backed Fetch 候选（暂缓）

### lessons learned

**HTTP 层成功不代表浏览器 JS 执行成功**。juejin 等站点用 JS Challenge 在 HTTP 200 后追加 challenge 页面。后续若启动 #22，应选"住宅代理 + 真实浏览器 + CAPTCHA solver"多层叠加方案而非裸 Playwright。

详见 [run-8a-mcp-backend.md](../search-orchestrator/experiments/run-8a-mcp-backend.md)；决策 [D-2026-06-24-search-infra-mcp-upgrade](../decisions/D-2026-06-24-search-infra-mcp-upgrade.md)（rolled-back）。

---

## 9. Run #9 — P5 Output Schema v1 首轮

| 字段 | 值 |
|------|-----|
| 改造 | P5 v1 字段对齐 schema（sub-question 预声明字段 → LLM 抽字段 → 综合答案） |
| 证据集 | 单源列表型（1 URL × 4 同源 claim） |
| 评分 | 1/5 设计失败 |

### 关键数据

| 指标 | Run A 自由文本 | Run B schema | Δ |
|------|---------------:|-------------:|--:|
| Claim Coverage | 100% | 100% | 0 |
| Info Loss | 0% | 0% | 0 |

### 决策

❌ **设计失败，非机制失败**。Run A 基线已顶满指标天花板，Run B schema 抽取无提升空间。

### 根因

Run #6 单源列表型证据集（1 URL × 4 同源 claim）不触发 P5 核心收益场景（跨源字段对齐）。

### 衍生

启动 Run #9b 多实体对比框架重做（Gin/Echo/Fiber × 5 维度）。

详见 [run-9-p5-output-schema.md](../search-orchestrator/experiments/run-9-p5-output-schema.md)。

### 方法学教训

**评测设计本身就是迭代的**——第一轮跑出天花板，要识别天花板归因（证据集单源），调整证据集再跑下一轮。**不要**只跑一轮就下结论。

---

## 10. Run #9b — P5 Output Schema v2 多实体对比

| 字段 | 值 |
|------|-----|
| 改造 | P5 v2（多实体 × 多维度字段对齐表） |
| 证据集 | Gin / Echo / Fiber × 5 维度（结构化） |
| 评分 | 3/5 有条件 |

### 关键数据

| 指标 | Run A | Run B | Δ |
|------|------:|------:|--:|
| Conflict ID Rate | 基线 | +40% | +40%（方向性信号） |
| Field Alignment | 天花板 | 天花板归因 P3 证据集已结构化 | 0 |
| Output Length | — | — | 排除（纯格式差异） |

### 决策

⚠️ **有条件 active（外部评审决策 C）**。Conflict ID Δ=+40% 仅方向性信号（非双盲）；Field Alignment 天花板归因 P3 证据集已结构化。

### 衍生

Run #9c 须双盲 + 非结构化证据集，Conflict ID Δ < +15% 则降回 proposed。

详见 [run-9b-p5-output-schema-v2.md](../search-orchestrator/experiments/run-9b-p5-output-schema-v2.md)。

---

## 11. Run #9c — P5 Output Schema v3 双盲证伪

| 字段 | 值 |
|------|-----|
| 改造 | P5 v3（双盲 + 非结构化证据集） |
| 评分 | 2/5 |

### 关键数据

| 指标 | Run A 自由文本 | Run B 字段 schema | Δ |
|------|---------------:|------------------:|--:|
| Conflict ID Rate | 5/5 = 100% | 4/5 = 80% | **-20%** |
| Field Alignment Rate | 15/15 = 100% | 14/15 = 93% | -7% |
| Schema 幻觉字段数 | N/A | 0 | 护栏有效 |

### 决策

❌ **双盲证伪，降回 proposed**。Conflict ID Δ=-20%（自由文本反超 schema）。

### 根因

schema 结构可能限制跨维度冲突发现——执行者倾向只报告 schema 内字段间冲突，自由文本叙事流更灵活。Schema 幻觉=0 护栏有效但不足以挽救机制收益。

### 衍生

D-2026-06-25-search-redesign-p5-evidence-map 启动 v2 重设计（Evidence Map / Claim Graph）。

详见 [run-9c-p5-output-schema-v3.md](../search-orchestrator/experiments/run-9c-p5-output-schema-v3.md)。

---

## 12. Run #10 — P6 Highlights verbatim 抽取

| 字段 | 值 |
|------|-----|
| Query | PostgreSQL 17 vs MySQL 8.4 |
| 改造 | Phase 1.bis P6 Highlights（fetch 后 verbatim 抽取 ≤500 token） |
| 评分 | 4/5 |

### 关键数据

26 条 highlights：

| 指标 | 实测 | 通过条件 | 通过 |
|------|-----|---------|-----|
| Extractive Fidelity Rate | 92.3%（24/26） | ≥ 90% | ✅ |
| Paraphrase Rate | 7.7%（2/26） | ≤ 10% | ✅ |
| Untraceable Count | 0 | = 0 | ✅ |

### 两条 paraphrase 模式

| 模式 | 案例 | 根因 |
|------|------|------|
| 主语同义替换 | "This release of PostgreSQL" → "PostgreSQL 17" | LLM 倾向用更具体的名称 |
| 跨语言归纳 | 英文原文 → 中文总结 | LLM 在跨语言场景倾向 paraphrase |

### 决策

✅ **P6 升级 active**。提示词层 verbatim 抽取指令基本有效。SKILL 加载机制修复（symlink）后首条 P 级机制通过验证。

### 附带发现

- fetch 成功率 10/10 = 100% → Tier A（完整 P3）
- highlights 使用了 verbatim 引用格式（Claim/Quote/Source 三元组变体），基本符合 Tier A 要求
- §2 fetch_content 全文归档只存了摘要非完整正文（Q2-4 引用的 pgbench.html 未归档）→ 催生 Iron Law §2.1

详见 [run-10-p6-highlights.md](../search-orchestrator/experiments/run-10-p6-highlights.md)；决策 [D-2026-06-25-search-adopt-p6-highlights](../decisions/D-2026-06-25-search-adopt-p6-highlights.md)（active）。

---

## 13. Run #11 — P4 translation 子类

| 字段 | 值 |
|------|-----|
| Query | K8s sidecar（跨语言场景） |
| 改造 | P4 LLM vs SimHash/Jaccard baseline |
| 评分 | 4/5 |

### 关键数据

3 对 translation：

| 指标 | SimHash/Jaccard baseline | P4 LLM | Net Gain |
|------|-------------------------|--------|---------|
| Precision | 1.00 | 1.00 | 0 |
| Recall | 0.20 | 1.00 | **+0.80** |
| F1 | 0.33 | 1.00 | +0.67 |

- 3 个 translation 对全部正确合并
- Baseline translation Miss 属算法边界（lexical 不具备跨语言能力，文献一致）
- 3-8 verbatim Miss 属数据限制（仅摘要非全文）

### 决策

✅ **P4 语义场景已验证（translation 子类）**。

### 降级 4/5 原因

样本量仅 3 对（全部 translation），Net Gain +0.80 为上界估计（摘要限制低估 baseline verbatim 能力）。

### 衍生

启动 Run #12 补 summary/rewrite 子类。

详见 [run-11-p4-semantic-merge.md](../search-orchestrator/experiments/run-11-p4-semantic-merge.md)。

---

## 14. Run #12 — P4 summary/rewrite 子类首轮（失败）

| 字段 | 值 |
|------|-----|
| Query | Next.js 15 async request APIs |
| 改造 | P4 summary/rewrite 子类（Python 3.13 Attempt） |
| 评分 | N/A |

### 失败原因

- 样本不足
- 全文归档不合格

### 衍生

启动 Run #12b 严格重跑。

详见 [run-12-p4-summary-rewrite.md](../search-orchestrator/experiments/run-12-p4-summary-rewrite.md)。

---

## 15. Run #12b — P4 summary/rewrite 严格重跑

| 字段 | 值 |
|------|-----|
| 改造 | P4 summary/rewrite（严格重跑） |
| 评分 | 5/5 |

### 关键数据

GT positive=5（summary 3、rewrite 2）：

| 指标 | SimHash/Jaccard baseline | P4 LLM | Net Gain |
|------|-------------------------|--------|---------|
| Precision | 1.00 | 1.00 | 0 |
| Recall | 0.00 | 1.00 | **+1.00** |
| F1 | 0.00 | 1.00 | +1.00 |
| False Merge | 0 | 0 | 0 |
| Info Loss | 0 | 0 | 0 |

### 决策

✅ **P4 semantic-summary / semantic-rewrite 子类验证通过**。P4 语义合并证据范围从 translation 扩展到 summary/rewrite。

### 落地

P4 证据范围已覆盖 verbatim、translation、summary、rewrite 四种子类。后续只在出现 false merge / 信息损失案例时再复评。

详见 [run-12-p4-summary-rewrite.md](../search-orchestrator/experiments/run-12-p4-summary-rewrite.md)。

---

## 16. Run #13 — P5 Evidence Map / Claim Graph 双盲证伪

| 字段 | 值 |
|------|-----|
| Query | Gateway API 迁移问题 |
| 改造 | P5 v2 Evidence Map / Claim Graph（节点 + 边 + Conflict Ledger / Gap Ledger） |
| 证据集 | 非结构化 evidence pool E1-E16，16 个 GT material relations |
| 评分 | 2/5 |

### 关键数据

| 指标 | Run A 自由文本 | Run B Evidence Map | Δ |
|------|---------------:|-------------------:|--:|
| Material Relation Recall | 15/16 = 93.8% | 16/16 = 100% | **+6.3% < +15% 门槛** |
| Cross-Dimension Relation Recall | 12/12 = 100% | 12/12 = 100% | 0（双方达天花板） |
| Gap Detection Recall | 2/3 = 66.7% | 3/3 = 100% | +33.3% |
| Traceability Rate | ≈100% | ≈100% | ≈0 |
| False Conflict / Unsupported / Info Loss | 0 / 0 / 0 | 0 / 0 / 0 | 0 |

### 决策

❌ **保持 proposed，不进入 SKILL.md**。

### 根因

- 主指标 Material Relation Recall Δ=+6.3% < +15% 门槛
- Cross-Dimension Recall 双方均达天花板——自由文本叙事流同样能连接跨维度关系（与 Run #9c "自由文本反超 schema" 方向一致）
- Evidence Map / Claim Graph 的唯一可复现增量是 **Gap Ledger 强制枚举证据缺口**（捕获 Run A 漏掉的回滚 gap GT15）

### 衍生

放弃完整 Evidence Map 节点-边结构。只验证"追加 Gap Ledger / 证据缺口枚举"最小机制 → Run #14。

### lessons learned

两代结构化中间表示（v1 字段表 + v2 节点-边）双盲证伪后，应识别"**结构化中间表示的收益天花板**"，避免无限重设计。

详见 [run-13-p5-evidence-map.md](../search-orchestrator/experiments/run-13-p5-evidence-map.md)。

---

## 17. Run #14 — P5 Gap Ledger 最小机制双盲验证

| 字段 | 值 |
|------|-----|
| 日期 | 2026-06-26 |
| Query | Cloudflare 反爬方案选型（#22 范畴，天然 gap 密集） |
| 改造 | P5 Gap Ledger 最小机制（合成前强制枚举证据缺口） |
| 证据集 | gap 密集：9 gap（4 显性 + 5 隐性）+ 5 material relation |
| 评分 | **4/5** |

### 关键数据

| 指标 | Run A 自由文本 | Run B + Gap Ledger | Δ |
|------|---------------:|--------------------:|--:|
| Gap Detection Recall | 3/9 = 33.3% | 8/9 = **88.9%** | **+55.6%** |
| Implicit Gap Recall | 2/5 = 40% | 4/5 = 80% | +40% |
| Material Relation Recall | 5/5 = 100% | 5/5 = 100% | 0 |
| Traceability Rate | ≈100% | ≈100% | 0 |
| False Gap Count | 0 | 1 | +1 |
| Unsupported Relation Count | 0 | 0 | 0 |
| Information Loss Count | 0 | 0 | 0 |
| Answer Verbosity Delta | 基准 | +36% | +36% |

### 决策

✅ **P5 Gap Ledger 升级 active**，进入 SKILL.md §4.1。

### 评分理由

- Gap Δ +55.6% 远超 4/5 阈值 +20%（接近 5/5 阈值 +30%）
- Implicit Δ +40% 满足 5/5 隐性要求
- 安全指标全部不退化（Material Relation / Traceability / Unsupported / Info Loss）
- **未达 5/5 的唯一原因**：False Gap = 1（Run B G15 把 cloudscraper "已淘汰" 误标为 "侦察用途待评估"）

### 落地

SKILL.md §4.1 新增 Gap Ledger 章节，含：
- 输出格式
- gap 类型枚举（缺反证 / 无直接对比 / 单一来源 / 证据过时 / 范围外推）
- 5 项隐性缺口必查清单
- Iron Law 边界（每项 gap 必引 evidence id）
- false gap 失败模式警示

原 4.1-4.4 递增为 4.2-4.5。

### P5 路线终态

- **P5 Gap Ledger（最小机制）：active**
- P5 完整 Evidence Map / Claim Graph：保持 proposed，**不再推进**（Run #9c / #13 两代结构化中间表示双盲证伪）

### 失败模式与缓解

- 追求 gap 召回产生轻度 false gap → 缓解措施：每项 gap 需引用 evidence id，evidence 充分则不应标 gap
- 篇幅成本 +36% → 可接受（Gap Ledger 占主要增量）

详见 [run-14-p5-gap-ledger.md](../search-orchestrator/experiments/run-14-p5-gap-ledger.md)。

---

## 18. 实验迭代路径图

```
Run #1 (P1 4/5 ✅)
    ↓
Run #2 (P2 3.6/5 ⚠️) → Run #3 (P2 2.6/5 ❌ deferred)
                                        ↓
                            #20/#21 候选（暂缓，学术结论支持核心判断）
    ↓
Run #4 (P3 中文 5/5 机制 · 1/5 基建)
    ↓
Run #5 (P3 英文 5/5 · 5/5 ✅ active) → Run #6 (P3 中文复测 5/5 · 1/5 ⚠️)
                                                ↓
                                    Run #8a (MCP 后端切换 1/5 ❌ rolled-back)
                                                ↓
                                    #22 候选（暂缓）
    ↓
Run #7 (P4 verbatim 100% ✅)
    ↓
Run #9 (P5 v1 1/5 设计失败) → Run #9b (P5 v2 3/5 有条件) → Run #9c (P5 v3 2/5 ❌ 双盲证伪)
                                                                    ↓
                                                        Run #13 (P5 Evidence Map 2/5 ❌)
                                                                    ↓
                                                        唯一可复现增量: Gap Ledger
                                                                    ↓
                                                        Run #14 (P5 Gap Ledger 4/5 ✅ active)
    ↓
Run #10 (P6 4/5 ✅ active)
    ↓
Run #11 (P4 translation 4/5 ✅) → Run #12 (P4 summary/rewrite N/A ❌)
                                            ↓
                                Run #12b (P4 summary/rewrite 5/5 ✅)
                                            ↓
                                P4 全子类覆盖（verbatim + translation + summary + rewrite）
```

**关键模式**：失败不是终点，是识别"天花板归因"的契机。每轮证伪都派生了下一轮的方向调整，最终在 Run #14 拿到 P5 Gap Ledger 的 active 结果。

---

## 19. 实验索引

完整原始数据：

| Run | 文件 |
|-----|------|
| #1 | [run-1-goggle.md](../search-orchestrator/experiments/run-1-goggle.md) |
| #2 | [run-2-fanout.md](../search-orchestrator/experiments/run-2-fanout.md) |
| #3 | [run-3-fanout-tuned.md](../search-orchestrator/experiments/run-3-fanout-tuned.md) |
| #4 | [run-4-p3-evidence-bound-citation.md](../search-orchestrator/experiments/run-4-p3-evidence-bound-citation.md) |
| #5 | [run-5-p3-retry.md](../search-orchestrator/experiments/run-5-p3-retry.md) |
| #6 | [run-6-p3-zh-retry.md](../search-orchestrator/experiments/run-6-p3-zh-retry.md) |
| #7 | [run-7-p4-dedup.md](../search-orchestrator/experiments/run-7-p4-dedup.md) |
| #8a | [run-8a-mcp-backend.md](../search-orchestrator/experiments/run-8a-mcp-backend.md) |
| #9 | [run-9-p5-output-schema.md](../search-orchestrator/experiments/run-9-p5-output-schema.md) |
| #9b | [run-9b-p5-output-schema-v2.md](../search-orchestrator/experiments/run-9b-p5-output-schema-v2.md) |
| #9c | [run-9c-p5-output-schema-v3.md](../search-orchestrator/experiments/run-9c-p5-output-schema-v3.md) |
| #10 | [run-10-p6-highlights.md](../search-orchestrator/experiments/run-10-p6-highlights.md) |
| #11 | [run-11-p4-semantic-merge.md](../search-orchestrator/experiments/run-11-p4-semantic-merge.md) |
| #12 | [run-12-p4-summary-rewrite.md](../search-orchestrator/experiments/run-12-p4-summary-rewrite.md) |
| #12b | [run-12b-p4-summary-rewrite.md](../search-orchestrator/experiments/run-12b-p4-summary-rewrite.md) |
| #13 | [run-13-p5-evidence-map.md](../search-orchestrator/experiments/run-13-p5-evidence-map.md) |
| #14 | [run-14-p5-gap-ledger.md](../search-orchestrator/experiments/run-14-p5-gap-ledger.md) |
