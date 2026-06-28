# Run #12 — P4 summary/rewrite 子类补评测（LLM vs SimHash/Jaccard 基线）

> **前身**：Run #11（P4 语义场景去重增益验证）已验证 translation 子类，但 `semantic-summary` / `semantic-rewrite` 样本数为 0，因此评分从数字上的 5/5 降为 4/5。
>
> **本轮目标**：只补 `semantic-summary` 与 `semantic-rewrite` 两个子类，不重复证明 translation。
>
> **执行边界**：Phase 0 搜索、fetch、P4 合并必须由 **Cline + search-orchestrator SKILL** 执行；TRAE agent 不得用通用 WebSearch/WebFetch 代跑。
>
> **关键 Iron Law**：每个 fetch 成功 URL 必须完整归档正文；摘要、snippet、highlights 不能替代正文。

---

## 1. 实验目标

验证 P4 Same-Source Merge 在同语言语义同源场景下，相对 SimHash/Jaccard + URL 规范化基线的增益。

本轮只统计：

| 子类 | 目标 |
|------|------|
| `semantic-summary` | 长文 / 官方说明 / 深度教程被压缩成摘要、速览、要点整理时，P4 能否识别同源关系 |
| `semantic-rewrite` | 同一内容被改写、洗稿、重排措辞后，P4 能否识别同源关系 |

不计入主指标：

| 类别 | 处理方式 |
|------|----------|
| `semantic-translation` | 可记录，但不计入本轮主指标；Run #11 已覆盖 |
| `verbatim` | 可记录，用于 sanity check；不作为本轮评分核心 |
| same-topic different | 同主题不同文章，必须判为不同，不得为了凑样本强行合并 |

---

## 2. 执行主体声明（designated_executor）

| 步骤 | designated_executor | 理由 |
|------|---------------------|------|
| Phase 0 搜索 + fetch + P4 合并 | **Cline + SKILL** | 需要 Goggle / P3 / P4 / P6 / 全文归档 Iron Law 全流程 |
| Phase 1 Ground truth 标注 | **TRAE agent** | 读取 Cline 输出的全文归档，逐对标注，不需要 SKILL 搜索能力 |
| Phase 1b 用户抽检 | **用户** | 抽检语义同源标注质量，降低 LLM 自评循环论证 |
| Phase 2 SimHash/Jaccard 基线 | **TRAE agent** | 纯算法层，可复现代码 |
| Phase 3 指标计算与对比 | **TRAE agent** | 对比 baseline / P4 / ground truth |

---

## 3. 样本有效性门槛

本轮比 Run #11 更容易出现“同主题但非同源”的误判，因此先设有效性门槛。

| 门槛 | 条件 | 不满足时 |
|------|------|----------|
| fetch 完整性 | fetch 成功 URL ≥ 8，且成功项都有完整正文归档 | 记为基础设施不足，不评分 |
| 主样本量 | `semantic-summary` + `semantic-rewrite` 可验证配对 ≥ 3 | 记为样本不足，不评分 |
| 子类覆盖 | summary 与 rewrite 至少各 1 对 | 若只覆盖一个子类，最高 4/5 |
| 高置信标注 | 计入主指标的同源对必须是 high/medium confidence | low confidence 只记录，不计分 |
| False Merge 审计 | P4 合并的每个 pair 都能落到 GT positive | 若合并 same-topic different，按 false merge 计 |

5/5 的额外门槛：summary 与 rewrite 至少各 2 对。否则即使指标达标，也最多 4/5。

---

## 4. Phase 0：搜索 + fetch + P4 合并（Cline 执行）

### 4.1 候选 query

优先使用同语言中文结果，以减少 translation 对主指标的干扰。

| 优先级 | Query | 选择理由 |
|--------|-------|----------|
| Primary | `Python 3.13 free-threaded JIT 新特性 迁移影响` | 官方中文文档、发布说明、中文社区摘要、博客改写概率高；技术点具体，便于判断 claim 子集与改写 |
| Fallback A | `PostgreSQL 17 增量备份 pg_combinebackup 新特性` | 官方文档 / 发布说明 / 中文教程 / 摘要文章较多，summary 概率高 |
| Fallback B | `Next.js 15 async request APIs breaking changes 迁移` | 官方迁移指南与大量博客教程并存，rewrite/summary 概率高 |

执行时先跑 Primary。若 Cline 在初步 P4 合并后发现 summary+rewrite 可验证 pair < 3，保留失败记录，再切到 Fallback A；仍不足时再切 Fallback B。最终只对第一个满足样本门槛的 query 进入 Phase 1-3。

### 4.2 执行提示词（复制到 Cline）

```text
【输出文件位置】将结果保存至：
docs/search-orchestrator/experiments/run-12-output.md

请用 search-orchestrator SKILL 执行以下 P4 summary/rewrite 子类补评测的 Phase 0。

本任务目标：验证 P4 Same-Source Merge 是否能识别 semantic-summary 与 semantic-rewrite。不要把“同主题不同文章”误判为同源。translation 可记录但不计入主指标。

候选 query 按顺序尝试：
1. Python 3.13 free-threaded JIT 新特性 迁移影响
2. PostgreSQL 17 增量备份 pg_combinebackup 新特性
3. Next.js 15 async request APIs breaking changes 迁移

选择规则：
- 先执行第 1 个 query。
- 若初步 fetch + P4 合并后，可验证的 semantic-summary + semantic-rewrite 配对少于 3，记录“样本不足”原因，再尝试下一个 query。
- 最终只保留第一个满足样本门槛的 query 作为正式结果；失败尝试写入 §0 Attempt Log。

Sub-questions 模板：
Q1: 该特性的核心机制是什么，官方如何描述？
Q2: 该特性解决了什么问题，迁移或启用方式是什么？
Q3: 社区文章如何摘要、改写或教程化该特性？

执行要求：

Step 1 — 搜索 + fetch：
- 按 SKILL.md Phase 1 分解 sub-questions，并为每个 sub-Q 产出 R1/R2/R3 三路 query。
- 可启用 R2 双语子路，但本轮主指标优先中文同语言 pair。
- fetch 总数至少 10 个 URL；成功 fetch 至少 8 个 URL。
- 至少 fetch：
  - 1 个官方源或准官方源；
  - 3 个中文技术社区 / 平台文章（如 docs.python.org/zh-cn、cloud.tencent.com/developer、juejin.cn、cnblogs.com、blog.csdn.net、segmentfault.com）；
  - 2 个教程 / 速览 / “一文看懂”类文章；
  - 2 个疑似改写 / 二次整理文章。
- 每个 fetch 成功 URL 必须完整归档正文，不能用摘要、snippet、highlights 代替。
- fetch 失败 URL 也要记录 URL + 失败原因。

Step 2 — P4 同源内容合并：
按 SKILL.md §1.4.5 Step 3.bis 执行同源内容合并，但本轮采用更严格的 semantic-summary / semantic-rewrite 判据：

可以合并的情况：
- semantic-summary：B 是 A 的压缩版，核心 claim 集合大体是 A 的子集，且没有明显独立新增论证；
- semantic-rewrite：A/B 的 claim 顺序、例子、代码片段、独特措辞或段落结构高度对应，只是措辞被改写；
- verbatim：逐字或近逐字镜像，可记录但不是本轮主指标；
- translation：跨语言翻译，可记录但不是本轮主指标。

禁止合并的情况：
- 只是讨论同一版本 / 同一新特性，但论证角度、例子、结构不同；
- 都引用同一官方文档，但各自有独立解释或新增经验；
- 只是标题相似或 SEO 关键词相同；
- 无法从正文中找到 claim 对应关系。

若判断为同源，只保留权威分级最高的版本（T1 > T2 > T3 > T4；同级保留 SearchRank 更高）。

Step 3 — 输出格式（严格遵守）：

# Run #12 Output — P4 summary/rewrite Phase 0

## §0 Attempt Log
| Attempt | Query | fetch 成功数 | summary/rewrite 候选对数 | 是否进入正式评测 | 样本不足原因 |
|---------|-------|-------------:|--------------------------:|------------------|--------------|

## §1 原始搜索结果表（fetch 前，全部结果）
| # | Attempt | Title | URL | Snippet | 来源路（R1/R2/R3） |
|---|---------|-------|-----|---------|--------------------|

## §2 fetch_content 全文归档
### URL-1: <url>
fetch 状态：成功/失败
失败原因：<若失败则填写>
正文：
<完整正文，不是摘要>

## §3 P4 合并决策表
| 合并组 | 被合并 URL # | 保留 URL # | 判断依据 | 同源类型（verbatim/translation/summary/rewrite） | 置信度（high/medium/low） |
|--------|-------------|------------|----------|--------------------------------------------------|---------------------------|

## §4 近似但不合并的 pair（False Merge 审计）
| #A | #B | 表面相似点 | 不合并原因 |
|----|----|------------|------------|

## §5 合并后结果集 + Goggle/T-Level/FinalScore
| # | Title | URL | Goggle Action | T-Level | FinalScore | 备注 |
|---|-------|-----|---------------|---------|-----------|------|

## §6 合成答案
基于合并后结果集生成答案，并在引用中保留被合并来源的 trace。
```

### 4.3 Phase 0 成功判定

Cline 输出 `run-12-output.md` 后，TRAE agent 才能继续 Phase 1。若 `§2 fetch_content 全文归档` 仍是摘要而非完整正文，本轮直接判为执行无效，先修输出，不进入 baseline。

---

## 5. Phase 1：Ground truth 标注（TRAE agent）

### 5.1 输入

读取 `run-12-output.md`：

- §1 原始搜索结果表
- §2 fetch_content 全文归档
- §3 P4 合并决策表
- §4 近似但不合并的 pair

### 5.2 标注类别

| 类别 | 定义 | 计入主指标 |
|------|------|------------|
| `verbatim` | 逐字 / 近逐字镜像，正文重叠极高 | 否 |
| `semantic-translation` | 跨语言翻译，核心内容相同 | 否 |
| `semantic-summary` | 一篇是另一篇的压缩摘要，claim 集合主要为子集 | 是 |
| `semantic-rewrite` | 同一内容被改写，claim 顺序 / 例子 / 结构高度对应 | 是 |
| `same-topic different` | 同主题但独立内容 | 否，且 P4 若合并则算 false merge |
| `different` | 主题不同或内容关系不足 | 否 |

### 5.3 输出文件

TRAE agent 产出 `docs/search-orchestrator/experiments/run-12-ground-truth.md`：

```markdown
# Run #12 Ground Truth — summary/rewrite 子类标注

## 标注方法
读取 run-12-output.md 的全文归档，对正式评测 query 的 fetch 成功 URL 两两配对标注。

## 配对分类表
| #A | #B | 类别 | 置信度 | 判断依据（1 行） | 是否计入主指标 |
|----|----|------|--------|------------------|----------------|

## 统计
- verbatim 对数：N
- semantic-translation 对数：N
- semantic-summary 对数：N
- semantic-rewrite 对数：N
- same-topic different 对数：N
- different 对数：N
- 主指标语义同源对数（summary + rewrite，high/medium）：N

## 样本有效性结论
按 run-12-p4-summary-rewrite.md §3 判断是否满足有效性门槛。
```

### 5.4 用户抽检

用户随机抽取 20% 配对，且至少包含：

- 1 个 `semantic-summary` 候选对；
- 1 个 `semantic-rewrite` 候选对；
- 2 个 `same-topic different` 或 `different` 对。

若不一致率 > 20%，全量复核 ground truth。

---

## 6. Phase 2：SimHash/Jaccard 基线（TRAE agent）

### 6.1 输出文件

TRAE agent 写：

| 文件 | 用途 |
|------|------|
| `run-12-baseline.py` | 可复现 baseline 脚本 |
| `run-12-baseline-output.md` | baseline 合并决策与指标 |

### 6.2 基线算法

在完整正文上运行，不使用摘要：

| 方法 | 判定 |
|------|------|
| URL 规范化 | scheme/host/path 规范化后相同则同源 |
| SimHash | 对 title + 正文全文的字符 5-shingle 计算 64-bit SimHash，汉明距离 ≤ 3 判为同源 |
| Jaccard | 对 title + 正文全文的字符 5-shingle 计算，Jaccard ≥ 0.90 判为同源 |
| Jaccard sensitivity | 额外报告 Jaccard ≥ 0.80 的敏感性结果，但主指标仍用 0.90 |

任一主方法命中即合并。保留 SearchRank 更高或权威分级更高的 URL。

### 6.3 baseline 输出格式

```markdown
# Run #12 Baseline — SimHash/Jaccard + URL 规范化

## 算法参数
列出 URL 规范化、SimHash、Jaccard 参数。

## 合并决策表
| #A | #B | URL 规范化 | SimHash 汉明距 | Jaccard 0.90 | Jaccard 0.80 sensitivity | 合并决策 | 保留 |
|----|----|------------|----------------|--------------|---------------------------|----------|------|

## 统计
- URL 规范化合并对数：N
- SimHash 合并对数：N
- Jaccard 0.90 合并对数：N
- 总合并对数（去重）：N
- Jaccard 0.80 sensitivity 额外命中：N
```

---

## 7. Phase 3：指标计算与评分

### 7.1 主指标

本轮主指标只计算 `semantic-summary` 与 `semantic-rewrite`。

| 指标 | 定义 |
|------|------|
| Precision | 合并 pair 中 GT 为 positive 的比例 |
| Recall | GT positive pair 中被合并的比例 |
| F1 | Precision / Recall 调和平均 |
| Summary Recall | `semantic-summary` 子类召回 |
| Rewrite Recall | `semantic-rewrite` 子类召回 |
| False Merge Count | P4 合并但 GT 为 same-topic different / different 的 pair 数 |
| Information Loss | P4 误合并导致丢失的独特 claim 数 |
| Net Gain | P4 主指标 Recall − baseline 主指标 Recall |

### 7.2 对比表

| 指标 | Run A（SimHash/Jaccard） | Run B（P4 LLM） | 差值 |
|------|--------------------------|------------------|------|
| Precision | __ | __ | __ |
| Recall（summary+rewrite） | __ | __ | __ |
| F1 | __ | __ | __ |
| Summary Recall | __ | __ | __ |
| Rewrite Recall | __ | __ | __ |
| False Merge Count | __ | __ | __ |
| Information Loss | __ | __ | __ |
| Net Gain | — | — | __ |

### 7.3 评分尺度

| 分数 | 条件 |
|------|------|
| 5/5 | summary 与 rewrite 各 ≥ 2 对；P4 Recall ≥ 80%；Net Gain ≥ +50%；False Merge = 0；Info Loss = 0 |
| 4/5 | 主样本有效；P4 Recall ≥ 60%；Net Gain ≥ +30%；False Merge = 0 |
| 3/5 | 主样本有效；P4 Recall ≥ 40%；Net Gain ≥ +20%；False Merge ≤ 1 |
| 2/5 | 主样本有效但 P4 Recall < 40% 或 Net Gain < +20% |
| 1/5 | False Merge > 2，或存在系统性信息损失，或 P4 无法识别任何 summary/rewrite 同源对 |
| N/A | 样本有效性门槛不满足 |

---

## 8. 结果记录区

### 8.1 执行产出

| 产出 | 文件 | 状态 |
|------|------|------|
| Phase 0（Cline + SKILL） | [run-12-output.md](run-12-output.md) | 已执行；N/A（Python 3.13 Attempt 样本不足） |
| Phase 0b（Cline + SKILL） | [run-12b-output.md](run-12b-output.md) | 已执行；通过进入门槛 |
| Phase 1（TRAE agent 标注） | [run-12b-ground-truth.md](run-12b-ground-truth.md) | 已完成 |
| Phase 2（基线脚本） | [run-12b-baseline.py](run-12b-baseline.py) | 已完成 |
| Phase 2（基线输出） | [run-12b-baseline-output.md](run-12b-baseline-output.md) | 已完成 |

### 8.2 Ground Truth 统计

Run #12 初次 Attempt（Python 3.13 free-threaded JIT）因样本不足与全文归档不合格，未进入 Phase 1。随后按 §10 重跑 Run #12b（Next.js 15 async request APIs）并补齐全文归档后，进入正式标注。

| 类别 | 对数 | 说明 |
|------|-----:|------|
| verbatim | 0 | 无逐字镜像 pair |
| semantic-translation | 2 | 记录但不计主指标 |
| semantic-summary | 3 | #1-#6、#1-#11、#3-#7 |
| semantic-rewrite | 2 | #1-#10、#1-#9 |
| same-topic different | 9 | False Merge 审计负样本 |
| different | 1 | CSDN AIGC SEO 内容 |
| 主指标语义同源对数 | 5 | summary + rewrite，high/medium confidence |

样本有效性：通过。summary 与 rewrite 均覆盖，且 summary=3、rewrite=2，达到 5/5 子类覆盖门槛。

### 8.3 指标实测

| 指标 | Run A（SimHash/Jaccard） | Run B（P4 LLM） | 差值 |
|------|--------------------------|------------------|------|
| Precision | 1.00 | 1.00 | 0.00 |
| Recall（summary+rewrite） | 0.00 | 1.00 | +1.00 |
| F1 | 0.00 | 1.00 | +1.00 |
| Summary Recall | 0.00 | 1.00 | +1.00 |
| Rewrite Recall | 0.00 | 1.00 | +1.00 |
| False Merge Count | 0 | 0 | 0 |
| Information Loss | 0 | 0 | 0 |
| Net Gain | — | — | +1.00 |

Baseline 结果：URL 规范化、SimHash ≤ 3、Jaccard ≥ 0.90 均未命中任何主指标 pair；Jaccard ≥ 0.80 sensitivity 也未额外命中。P4 合并的 5 个主指标 pair 均落入 ground truth positive。

### 8.4 评分

**5/5**。

满足评分条件：summary 与 rewrite 各 ≥ 2 对；P4 Recall = 100%；Net Gain = +100%；False Merge = 0；Info Loss = 0。

### 8.5 决策

| 项 | 决策 |
|----|------|
| P4 active 状态 | 保持 active，并扩展证据范围 |
| survey.md §9.2 | 新增 Run #12b 评分行 |
| survey.md §9.3 / §10.2 | 更新 P4 局限：Run #11 translation 子类后，Run #12b 已补 summary/rewrite 子类 |
| mechanism-candidates.md #19 | 更新 evidence 描述：逐字 + translation + summary/rewrite 语义子类均已验证 |
| 后续动作 | P4 不再需要继续补 summary/rewrite；除非未来发现 false merge 或信息损失案例，否则可视为语义同源合并证据闭环 |

---

## 9. 完成后的同步规则

仅在实验完成后同步长期文档：

| 触发 | 同步动作 |
|------|----------|
| Phase 3 完成并产出评分 | `survey.md §9.2` 新增 Run #12 实验行 |
| P4 结论措辞需要扩展 | `survey.md §9.3` / `§10.2` 更新 P4 局限或补充结论 |
| #19 证据范围变化 | `mechanism-candidates.md #19` 更新 evidence 描述 |
| 决策 status 变化 | `survey.md §9.1` 同步该决策状态 |
| P4 路线进入新终态 | 按 project-rules.md 触发 handoff |

若 Run #12 仅是样本不足或 N/A，不改变 P4 active 状态，只在实验文件中记录失败原因；是否写入 `survey.md §9.2` 由“是否完成一次可评分实验”决定。

---

## 10. 重跑协议：Run #12b Next.js 15 Attempt（2026-06-25 补充）

### 10.1 为什么需要重跑

Run #12 首次 Phase 0 输出为 N/A，原因不是 P4 summary/rewrite 能力被证伪，而是数据集未成立：

| 问题 | 影响 |
|------|------|
| Attempt 1 主样本只有 2 对 | 低于 summary+rewrite ≥ 3 的进入门槛 |
| §2 以“核心内容摘要”归档 | 违反 fetch_content 全文归档 Iron Law，不能跑 ground truth / baseline |
| Attempt 2/3 只是快速评估 | 不是完整 Phase 0，不能补足样本 |

因此下一步不是修改 P4 结论，而是重跑一个严格 Phase 0。

### 10.2 重跑目标

优先完整执行首次输出中提示有潜力的 Attempt 3：

`Next.js 15 async request APIs breaking changes 迁移`

选择理由：Next.js 15 async request APIs 同时具备官方迁移文档、中文教程、SEO 改写文章与代码迁移指南，更可能形成 `official/source → tutorial summary → rewrite` 链条。

### 10.3 硬性进入门槛

Run #12b 必须同时满足下列条件，才允许进入 Phase 1：

| 门槛 | 条件 |
|------|------|
| 完整执行 | 不能快速评估；必须完整 sub-Q 分解、R1/R2/R3、搜索、fetch、P4 合并、False Merge 审计 |
| fetch 数量 | fetch 成功 URL ≥ 8 |
| 全文归档 | 每个 fetch 成功 URL 必须归档完整正文；若工具输出过长，至少按正文开头 / 中段 / 结尾分块归档并标注总字符数 |
| 主样本量 | summary + rewrite high/medium confidence pair ≥ 3 |
| 子类覆盖 | summary 与 rewrite 至少各 1 对 |
| P4 决策表 | 每个合并 pair 必须给出同源类型、置信度、claim 对应依据 |
| False Merge 审计 | 至少列出 5 对“相似但不合并”的 pair |

若任一条件不满足，输出仍归档，但结论为 N/A，不进入 ground truth / baseline。

### 10.4 Cline 执行提示词（复制执行）

```text
【输出文件位置】将结果保存至：
docs/search-orchestrator/experiments/run-12b-output.md

请用 search-orchestrator SKILL 执行 Run #12b：P4 summary/rewrite 子类补评测的严格 Phase 0。

本轮不是快速评估，必须完整执行 Phase 0。TRAE 后续会基于你的输出做 ground truth 与 SimHash/Jaccard baseline，因此输出必须可复现、可审计。

主问题：Next.js 15 async request APIs breaking changes 迁移

Sub-questions：
Q1: Next.js 15 async request APIs 的 breaking change 是什么？官方如何描述 cookies、headers、draftMode、params、searchParams 的异步化？
Q2: 迁移方式是什么？codemod、手工修改、UnsafeUnwrapped* 类型、同步访问 warning/error 的边界分别是什么？
Q3: 社区文章如何摘要、改写或教程化官方迁移指南？哪些文章是官方文档的摘要、改写、教程化重排，哪些只是同主题独立文章？

执行要求：

Step 1 — Query fanout：
- 按 SKILL.md Phase 1 完整分解 sub-questions。
- 每个 sub-Q 产出 R1/R2/R3 三路 query。
- R2 可拆成英文官方/社区与中文社区两条子路。
- 必须覆盖官方源、英文社区教程、中文社区教程、疑似 SEO 改写文章。

建议 query 方向：
- Next.js 15 async request APIs migration cookies headers params searchParams
- Next.js 15 async request APIs codemod UnsafeUnwrappedCookies
- Next.js 15 params should be awaited searchParams migration
- Next.js 15 异步 request APIs 迁移 cookies headers params searchParams
- Next.js 15 cookies headers 异步 改造 codemod

Step 2 — fetch：
- fetch 总数至少 12 个 URL，成功 fetch 至少 8 个 URL。
- 必须尝试 fetch 官方文档：
  - nextjs.org/docs/app/guides/upgrading/version-15
  - nextjs.org/docs/messages/sync-dynamic-apis
- 至少 fetch 3 个中文社区 / 博客来源，例如 juejin.cn、segmentfault.com、cloud.tencent.com/developer、cnblogs.com、blog.csdn.net。
- 至少 fetch 3 个英文社区 / 教程来源，例如 vercel.com/blog、github issue/discussion、dev.to、medium、个人技术博客。
- fetch 失败 URL 也要记录 URL + 失败原因。

Step 3 — fetch_content 全文归档 Iron Law：
- 每个 fetch 成功 URL 必须归档完整正文。
- 禁止只写“核心内容摘要”“主要内容”“相关部分”。
- 如果单篇正文过长，必须采用分块归档：
  - 正文总字符数：N
  - 正文开头 1000 字
  - 正文中段 1000 字
  - 正文结尾 1000 字
  - 说明是否有省略，以及省略范围
- 只有 snippet / 摘要 / highlights 的 URL 不算 fetch 成功。
- 若无法取得正文，标记 fetch 失败，不得用摘要替代。

Step 4 — P4 同源内容合并：
按 SKILL.md §1.4.5 Step 3.bis 执行，但本轮只把以下类型作为主指标候选：
- semantic-summary：B 是 A 的压缩版，核心 claim 集合大体是 A 的子集，且没有明显独立新增论证。
- semantic-rewrite：A/B 的 claim 顺序、例子、代码片段、迁移步骤、错误信息或段落结构高度对应，只是措辞被改写或教程化重排。

可记录但不计主指标：
- translation
- verbatim

禁止合并：
- 只是都引用 Next.js 官方文档，但各自有独立解释、独立代码或新增经验。
- 只是标题相似或 SEO 关键词相同。
- 只是同一 breaking change 的不同迁移实践。
- 无法从正文中找到 claim / code / step 对应关系。

Step 5 — 输出格式（严格遵守）：

# Run #12b Output — P4 summary/rewrite Strict Phase 0

## §0 Protocol Compliance
| 检查项 | 结果 | 证据 |
|--------|------|------|
| 完整执行 R1/R2/R3 | 是/否 | 指向 §1 |
| fetch 成功 ≥ 8 | 是/否 | 成功数 |
| 成功 URL 完整正文归档 | 是/否 | 指向 §2；若有分块，列字符数 |
| summary+rewrite 候选 pair ≥ 3 | 是/否 | 指向 §3 |
| summary/rewrite 均覆盖 | 是/否 | 指向 §3 |
| False Merge 审计 ≥ 5 对 | 是/否 | 指向 §4 |
| 是否允许进入 Phase 1 | 是/否 | 一句话结论 |

## §1 原始搜索结果表（fetch 前，全部结果）
| # | Title | URL | Snippet | 来源路（Qx-Ry） |
|---|-------|-----|---------|----------------|

## §2 fetch_content 全文归档
### URL-1: <url>
fetch 状态：成功/失败
失败原因：<若失败则填写>
正文总字符数：<N>
正文归档方式：完整 / 分块
正文：
<完整正文；若过长，按开头/中段/结尾分块，不得写摘要>

## §3 P4 合并决策表
| 合并组 | 被合并 URL # | 保留 URL # | 判断依据（claim/code/step 对应） | 同源类型（summary/rewrite/verbatim/translation） | 置信度（high/medium/low） | 是否计入主指标 |
|--------|-------------|------------|----------------------------------|---------------------------------------------------|---------------------------|----------------|

## §4 近似但不合并的 pair（False Merge 审计）
| #A | #B | 表面相似点 | 不合并原因 |
|----|----|------------|------------|

## §5 合并后结果集 + Goggle/T-Level/FinalScore
| # | Title | URL | Goggle Action | T-Level | FinalScore | 备注 |
|---|-------|-----|---------------|---------|-----------|------|

## §6 Phase 0 结论
- 是否满足进入 Phase 1 的硬性门槛：是/否
- summary pair 数：N
- rewrite pair 数：N
- 主要风险：...
```

### 10.5 Run #12b 后续处理

Cline 产出 `run-12b-output.md` 后，TRAE agent 只做验收，不补搜：

| 验收结果 | TRAE agent 动作 |
|----------|-----------------|
| 通过 §10.3 全部门槛 | 产出 `run-12b-ground-truth.md`、`run-12b-baseline.py`、`run-12b-baseline-output.md`，并回填 Run #12 指标 |
| 样本足够但全文归档不合格 | 不进入 Phase 1；要求补完整正文归档 |
| 全文合格但样本不足 | 记录 N/A，不更新长期状态 |
| 发现 false merge 明显风险 | 进入人工抽检或全量复核，不直接给 P4 加分 |

### 10.6 Run #12b 验收结果（2026-06-25）

TRAE agent 读取 `run-12b-output.md` 后，按 §10.3 / §10.5 只做验收，不补搜。

| 验收项 | 结果 | 说明 |
|--------|------|------|
| 完整执行 R1/R2/R3 | 通过 | §1 有完整 query fanout 与原始结果表 |
| fetch 成功 ≥ 8 | 通过 | 输出成功 14 个 URL |
| summary + rewrite pair ≥ 3 | 通过 | 输出给出 5 个计入主指标的 pair |
| summary/rewrite 均覆盖 | 通过 | summary 3 对，rewrite 2 对 |
| False Merge 审计 ≥ 5 对 | 通过 | §4 列出 5 对 |
| 全文归档 | 通过 | §2 已补齐完整正文或合规分块；违规摘要表述检查无命中 |
| 是否允许进入 Phase 1 | 是 | 满足 §10.3 全部硬性门槛 |

结论：**Run #12b 进入 ground truth / baseline，并完成 Phase 3 评分**。

这次与 Run #12 初次 N/A 的区别是：样本量达标，且 Iron Law 已执行到位。

