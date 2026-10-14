# A/B 测试模板：search-orchestrator 强化项验证

> 本模板把 2026-06-23 「P1 Goggle 验证」一次性 A/B 跑通的格式**固化为可重用工具**。
>
> 适用于验证 Phase 3.5（Goggle）、Phase 3.5.5（FinalScore 联动）、未来 P2 Query Rewrite、P3 Evidence-bound Citation、P4 Dedup 等任何 search-orchestrator 强化项。
>
> 来源：GPT 二轮评审「这次实验最值得保留的成果不是 Goggle 本身，而是一个可重复的评测框架」。

---

## 1. 何时使用

每次给 search-orchestrator 加新流程（哪怕只是一段提示词）前，**必须**用本模板做一次 A/B 验证。规则：

- 改 SKILL.md 任意 Phase 的硬性流程 → 必跑
- 调整预置 Goggle / 权威分级 → 必跑
- 仅修文字 / 排版 / 注释 → 不用跑
- 验证不通过 → 改造回退或回炉

---

## 2. 测试规则

### 2.1 Query 选取

| 要求 | 含义 |
|------|------|
| **真实问题** | 直接使用真实场景里你最近会问的问题，禁用人工构造 |
| **有目标污染源** | 该 query 在不加规则时**必然返回垃圾**——例如中文技术查询易拉 CSDN/toutiao |
| **结果可判分** | 至少存在一个明确"高质量"答案站（让 BOOST/T1 有命中机会） |
| **单一 query** | 不做 query rewrite/fanout，避免多变量混淆 |

### 2.2 Run A / Run B 双跑

| Run | 含义 |
|-----|------|
| **Run A** | 不应用本次新增规则，记录搜索引擎原始顺序的 top 10 |
| **Run B** | 应用新增规则（Goggle / SourceWeight / Rewrite ...），在**同一份**原始结果上重排或打标 |

> 关键：Run B 不重新调 search，只在 Run A 数据上做 LLM 处理。这样可以严格隔离"规则带来的差异"。

### 2.3 指标体系（沿用 GPT 二轮评审建议）

正确指标，按优先级：

| 优先级 | 指标 | 计算方式 |
|--------|------|---------|
| **P1（核心）** | **垃圾站清除率** | (Run B 中被 DOWNRANK + DISCARD 的农场/转载结果数) / (Run A 中农场/转载结果总数) |
| **P2（核心）** | **Top-5 权威度变化** | Run B 重排后 Top 5 的 T-Level 分布对比 Run A 的 Top 5 |
| **P3（参考）** | BOOST 命中数 | **不作为主要指标**——白名单永远赶不上长尾，命中低不等于失败 |
| **P4（参考）** | DISCARD 误伤数 | 被 DISCARD 但事后判定有用的结果数（应为 0） |

错误指标，明确放弃：

| 指标 | 为什么不用 |
|------|----------|
| BOOST 命中数 / 总数 | 偏向白名单覆盖，导致"扩白名单冲动" |
| 单纯总结果数 | 与质量无关 |

### 2.4 评分尺度

| 分数 | 含义 |
|------|------|
| 5/5 | 垃圾站清除率 ≥ 80% **且** Top 5 中至少 2 条升入 T1/T2 |
| 4/5 | 垃圾站清除率 ≥ 80% **或** Top 5 中至少 1 条升入 T1/T2 |
| 3/5 | 垃圾站清除率 50%~80%，Top 5 排序有可见改善 |
| 2/5 | 垃圾站清除率 < 50%，Top 5 几乎无变化 |
| 1/5 | Run B 与 Run A 实质等同，规则失效 |

### 2.5 P3 专属双维度评分

当测试改造为 **P3 Evidence-bound Citation** 时，使用以下双维度评分替代 §2.4 的单一尺度。其他改造仍用 §2.4。

#### 机制分（P3 Mechanism Score）

衡量规则执行质量——不依赖 fetch 覆盖率。

| 分数 | 条件 |
|------|------|
| 5/5 | Claim-Quote 绑定率 ≥ 80% 且 误引用 = 0 且 标签完整率 100% |
| 4/5 | Claim-Quote 绑定率 ≥ 60% 且 误引用 ≤ 1 且 标签完整率 ≥ 90% |
| 3/5 | Claim-Quote 绑定率 ≥ 50% 且 误引用 ≤ 2 |
| 2/5 | Claim-Quote 绑定率 < 50% 但无编造 |
| 1/5 | 误引用 > 2 或存在编造的 Quote |

误引用 > 0 自动降一档。

#### 基础设施分（Infrastructure Score）

衡量 fetch 成功率——环境依赖，与规则质量无关。

| 分数 | 条件 |
|------|------|
| 5/5 | fetch 成功率 ≥ 80%（Drop Rate ≤ 20%） |
| 4/5 | fetch 成功率 ≥ 60%（Drop Rate ≤ 40%） |
| 3/5 | fetch 成功率 ≥ 40%（Drop Rate ≤ 60%） |
| 2/5 | fetch 成功率 ≥ 20%（Drop Rate ≤ 80%） |
| 1/5 | fetch 成功率 < 20%（Drop Rate > 80%） |

#### 使用方式

报告两个分数，不合并。例如 `机制 5/5 · 基础设施 5/5` 或 `机制 5/5 · 基础设施 1/5`。决策时以机制分为主——机制分 ≥ 4/5 即说明规则可采纳，基础设施分决定 Tier A/B/C 档位。

### 2.6 P4 专属指标体系

当测试改造为 **P4 Evidence Deduplication（同源内容合并）** 时，使用以下指标替代 §2.3 的通用指标。

#### 核心指标（决定通过/不通过）

| 指标 | 计算方式 | 通过条件 |
|------|---------|---------|
| **Merge Precision（同源合并率）** | 正确合并数 / 总识别转载数 × 100% | ≥ 90% |
| **False Merge Count（误合并数）** | 被合并但实际为不同内容的 URL 数 | = 0 |
| **Information Loss Count（信息损失数）** | 合并导致丢失的独特 claim 数 | = 0 |

#### 观察指标（仅记录，不参与判定）

| 指标 | 计算方式 |
|------|---------|
| **Unique Domains Delta** | Run B 合并后 Top-5 唯一域名数 - Run A Top-5 唯一域名数 |

#### 评分尺度

| 分数 | 条件 |
|------|------|
| 5/5 | Merge Precision ≥ 90% 且 False Merge = 0 且 Info Loss = 0 |
| 4/5 | Merge Precision ≥ 80% 且 False Merge = 0 |
| 3/5 | Merge Precision ≥ 60% 且 False Merge ≤ 1 |
| 2/5 | Merge Precision < 60% 但无系统性误合并 |
| 1/5 | False Merge > 2 或存在系统性信息损失 |

---

## 3. 测试 Prompt 模板

下面是可直接贴到 Cline / 任意 search-orchestrator 兼容环境的测试话术。

把 `{{...}}` 替换为本次测试参数。

> **手动执行提示**：如果本 Prompt 要在 Cline 环境手动执行，记得在 Prompt 开头说明输出文件的建议存放位置。

````
请用 duckduckgo MCP 做一次 A/B 对比测试，验证以下 search-orchestrator 改造项：

测试改造：{{改造名称，如 "Phase 3.5 Domain Goggles + Phase 3.5.5 FinalScore 联动"}}
测试 query: "{{选取的真实 query}}"
max_results: 10
单一 query，不做改写或扇出。

==================== Run A：基线 ====================

调用 search MCP，把返回的 10 条结果按返回顺序原样列出 title + URL。
不评价、不排序、不剔除。

==================== Run B：应用新规则 ====================

使用 Run A 的**同一份**原始结果（不要重新调用 search），按 search-orchestrator SKILL.md 中
{{改造涉及的章节，如 "Phase 3.5 + Phase 3.5.5"}}
的规则进行处理，输出表格：

| # | Title (短) | URL | {{Goggle Action 等列}} | T-Level | FinalScore | 理由（1 行） |
|---|-----------|-----|----------------------|---------|-----------|-------------|

==================== 指标计算 ====================

请直接给出以下数值：

1. Run A 中农场/转载站数量（如 CSDN / toutiao / 转载新闻站）：__/10
2. Run B 中被 DOWNRANK + DISCARD 的农场/转载站数量：__/10
3. **垃圾站清除率**：第 2 项 / 第 1 项 = __%
4. Run A 的 Top 5 各自 T-Level：[T?, T?, T?, T?, T?]
5. Run B 按 FinalScore 重排后的 Top 5 各自 T-Level：[T?, T?, T?, T?, T?]
6. Top 5 中 T1+T2 数量变化：A=__ → B=__

==================== 主观评分 ====================

按 §2.4 评分尺度给出 1-5 分，并用 1-2 句话说明依据。

最后展示原始数据，不要润色。
````

---

## 4. 验证记录

每次跑完，把结果作为一节追加到 [search-orchestrator/survey.md](../../../docs/search/search-orchestrator/survey.md) §9 "Decision Outcome" 末尾表内。同时在 [`search-orchestrator/experiments/`](../../../docs/search/search-orchestrator/experiments/) 目录下新建 `run-<N>-<slug>.md` 独立存档。

- 改造名称 / 改造对应 commit hash
- Query、Run A/B 结果摘要（**只贴指标计算**，不必贴全部 10 条）
- 评分 + 决策（保留 / 回炉 / 回退）
- 下一次验证的 follow-up（如发现某条规则误伤）

---

## 5. 已完成验证

| 日期 | 改造 | Query | 垃圾清除率 | Top-5 T1+T2 变化 | 评分 | 决策 | 详情 |
|------|------|-------|-----------|------------------|------|------|------|
| 2026-06-23 | Phase 3.5 Goggle | "K8s 滚动更新 ImagePullBackOff 排查方法" | 5/5 = 100% | 0 → 1（仅 kubernetes.io 升 T1） | 4/5 | **保留** + 推进 P1.5 联动 | [search-orchestrator/survey.md §9](../../../docs/search/search-orchestrator/survey.md) / commit 19a8953；实验报告 [run-1-goggle.md](../../../docs/archive/search/experiments/run-1-goggle.md) |

> 评分计算说明：原始评分 2/5 用错指标（BOOST 命中数），按本模板正确指标重评为 4/5。

---

## 6. 反模式（避免）

| 反模式 | 含义 |
|--------|------|
| 用人造 query 测试 | 看不见真实污染 |
| 同一 query 反复跑求平均 | 浪费搜索配额，不增加信息 |
| 用 BOOST 命中率作为指标 | 偏向扩白名单陷阱 |
| 不存档结果 | 下次改进无对照基线 |
| 改造未跑 A/B 就合并 | 违反本项目 §3 五问门控之 Q4 |

---

## 7. 与项目纪律的对应

- OUTLINE §3 五问门控 → 本模板属于 Q4 "缺失还是不会用" 的实证证据来源
- OUTLINE §10 协作流程 T3 收敛 → A/B 跑完即是 T3 输出的强证据
- ADR-002 L2 经验沉淀 → 评测框架本身是 C 类资产
