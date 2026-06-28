# 03 — Mechanism Design

> 本章详解 6 个 active P 级机制 + 1 个 Infra wrapper 的设计与落地形态，并列出 4+2 条证伪路径。
>
> 每个机制含：设计意图 / 落地形态 / 关键数据 / 失败模式 / 决策文档链接。

---

## 1. P1 Domain Goggles（域名级软过滤）

### 1.1 设计意图

借鉴 Brave Search Goggles 思想——同一搜索引擎在不同 Goggle 下结果质量差异可达 5 倍。但 DDG MCP 后端不支持 Goggle DSL，因此把 Goggles 思想**转译为提示词层后置过滤**：LLM 在 evaluate 阶段按 BOOST / DOWNRANK / DISCARD 表对结果打标，等效于"软 Goggle"。

### 1.2 落地形态（SKILL.md §3.5）

预置 5 个 Goggle：

| Goggle | 适用场景 | 关键动作 |
|--------|---------|---------|
| `general-tech` | 通用技术调研 | DISCARD 农场页；DOWNRANK 转载站；BOOST 官方文档 |
| `academic` | 学术 / 论文 | BOOST arxiv / *.edu / semanticscholar；DOWNRANK medium / dev.to |
| `product-research` | 产品选型 | BOOST 官方文档 / GitHub repo；DISCARD 商业广告 |
| `security` | 安全审计 | BOOST CVE / vendor advisory；DISCARD 教程站 |
| `zh-tech` | 中文技术调研 | DISCARD toutiao / bjh / 360doc / csdn 农场；BOOST juejin / 官方文档 |

三档动作：

| 动作 | 含义 |
|------|------|
| `BOOST` | 域名权重 +N（升入 Top-5 候选） |
| `DOWNRANK` | 域名权重 -N（降出 Top-5） |
| `DISCARD` | 直接剔除（不进 evaluate） |

### 1.3 关键数据（Run #1）

| 指标 | Run A 基线 | Run B 应用 P1 | Δ |
|------|-----------|--------------|---|
| 垃圾站清除率 | 0/5 = 0% | 5/5 = **100%** | +100% |
| Top-5 中 T1/T2 数 | 0 | 1（kubernetes.io） | +1 |
| 评分 | — | **4/5** | — |

Query: `"K8s 滚动更新 ImagePullBackOff 排查方法"`

### 1.4 失败模式

- **长尾召回不可恢复**：Brave Goggles 在召回阶段对数万候选硬过滤；软过滤只在最终 10-50 条上软重排。精度损失有界（NDCG 级），但长尾召回损失无界。这是结构性天花板，不可提示词可治（[survey.md §10.1](../search-orchestrator/survey.md)）
- **LLM 不会真去抓所有 URL 验证域名**——Goggle 只是降低头部噪声，不是 100% 过滤

### 1.5 决策文档

[D-2026-06-23-search-adopt-goggles.md](../decisions/D-2026-06-23-search-adopt-goggles.md)（status: active）

---

## 2. P1.5 FinalScore 联动（Goggle × SourceWeighting）

### 2.1 设计意图

P1 落地后暴露问题：长尾优质站不靠扩白名单也自然上升。需要把 Goggle 动作与 SourceWeighting 数值联动，让 FinalScore 综合反映"Goggle 过滤 + 域名权威 + 内容相关度"。

### 2.2 落地形态（SKILL.md §3.5.5）

```
FinalScore = SourceWeight(T-Level) + GoggleAction(BOOST=+N / DOWNRANK=-N) + ContentRelevance
```

按 FinalScore 重排 Top-5。

### 2.3 关键数据

Run #1 同期验证：Top-5 中至少 1 条升入 T1/T2（kubernetes.io 升 T1）。

### 2.4 决策文档

[D-2026-06-23-search-finalscore-coupling.md](../decisions/D-2026-06-23-search-finalscore-coupling.md)（status: active）

---

## 3. P3 Evidence-bound Citation（三档模式）

### 3.1 设计意图

借鉴 Perplexity Sonar Pro 架构强制 citation——citation hallucination rate 37% vs ChatGPT web-search-off 67%。在提示词层强制每条 Claim 绑定 Quote + Source，避免 LLM 编造引用。

但 Run #4/6 暴露：fetch 覆盖率在英文 / 中文场景差异极大（英文 5/5，中文 1/10）。**不能因为基础设施限制放弃机制**——所以引入**三档模式**解耦机制质量与基础设施可用性。

### 3.2 落地形态（SKILL.md §4.3）

| Tier | 触发条件 | 输出格式 |
|------|---------|---------|
| **Tier A** | fetch ≥ 60% | 完整 P3：Claim / Quote / Source 三元组 |
| **Tier B** | fetch 20% ~ 60% | 混合模式：有正文的 URL 用 P3，其余标 `[无法引证]` |
| **Tier C** | fetch < 20% | 降级模式：保留 Finding + Source，追加 `[P3 Coverage Low]` 标记 |

每条 Claim 必须满足：
- 至少一个 Quote（来自 fetch_content 的连续子串，允许首尾空白 / 格式标记差异）
- 一个 Source（URL 或 evidence id）
- 不允许编造——若 fetch 失败，必须显式标 `[无法引证]`

### 3.3 关键数据（三轮验证）

| Run | Query 语言 | 机制分 | 基础设施分 | 误引用 |
|-----|----------|-------|-----------|-------|
| #4 | 中文 | 5/5 | 1/5 | 0 |
| #5 | 英文 | 5/5 | 5/5 | 0 |
| #6 | 中文复测 | 5/5 | 1/5 | 0 |

**机制零误引用**——三轮共 16 条 Claim，0 编造。中文 fetch 瓶颈由 Tier B/C 正确降级吸收。

### 3.4 失败模式

- **跨语言归纳**：Run #10 P6 验证中发现 LLM 在跨语言场景倾向 paraphrase 而非 verbatim（英文原文 → 中文总结）
- **fetch 失败导致 Tier C**：基础设施瓶颈由 wrapper 解耦（见 §7）

### 3.5 决策文档

[D-2026-06-24-search-adopt-p3.md](../decisions/D-2026-06-24-search-adopt-p3.md)（status: active）

---

## 4. P4 Evidence Deduplication（同源合并）

### 4.1 设计意图

中文技术调研的常见污染：同一篇文章被多站点转载/镜像，占据 Top-N 多个 slot，挤压独特内容。同源合并只保留权威分级最高的版本（T1 > T2 > T3 > T4），释放的 slot 给真正独特的内容。

### 4.2 落地形态（SKILL.md §1.4.5 Step 3.bis）

```
Step 3.bis  同源内容合并
              ① 对去重后的结果集，判断是否有同一篇文章被不同站点转载/镜像
              ② 若判断为同源转载，只保留权威分级最高的版本
                 （T1 > T2 > T3 > T4；同级保留 SearchRank 更高的）
              ③ 被合并的 URL 在 Source 表中标注 [同源合并]
```

**四种子类**（三轮实验逐步覆盖）：

| 子类 | Run | 验证内容 |
|------|-----|---------|
| verbatim（逐字） | #7 | 知乎原文 → SegmentFault 转载 → CSDN 镜像 |
| translation（翻译） | #11 | K8s sidecar 英文文档 → 中文社区翻译 |
| summary（摘要） | #12b | Next.js 15 async request APIs 多源摘要 |
| rewrite（改写） | #12b | 同一主题不同写法 |

### 4.3 关键数据

| Run | 子类 | Merge Precision | False Merge | Info Loss | 评分 |
|-----|------|----------------|------------|-----------|-----|
| #7 | verbatim | 100% (2/2) | 0 | 0 | — |
| #11 | translation | 100% (3/3) | 0 | 0 | 4/5（样本量限制） |
| #12b | summary/rewrite | 100% (5/5) | 0 | 0 | 5/5 |

**Baseline 对照**（Run #11/12b）：

| 指标 | SimHash/Jaccard baseline | P4 LLM | Net Gain |
|------|-------------------------|--------|---------|
| Precision | 1.00 | 1.00 | 0 |
| Recall | 0.00 ~ 0.20 | 1.00 | **+0.80 ~ +1.00** |

lexical baseline 在跨语言 / 摘要 / 改写场景下召回近 0（属算法边界，文献一致），P4 LLM 全场景 Recall 1.00。

### 4.4 关键修订

Run #7 发现 "Top-5 域名多样性从 4 → 3" 看似退化，实际是合并正确（segmentfault.com 是知乎转载站，释放 slot 被同腾讯云其他文章填入）。**域名多样性 ≠ 内容多样性**——观察指标，不参与判定。详见 [D-2026-06-24-search-revise-p4-metrics](../decisions/D-2026-06-24-search-revise-p4-metrics.md)。

### 4.5 失败模式

- **跨语言归纳**：P6 highlights 跨语言场景下 LLM 倾向 paraphrase——若 P4 合并前 highlights 已 paraphrase，会破坏 verbatim 同源检测。缓解：P4 在 highlights 抽取前执行
- **样本量小**：Run #11 仅 3 对 translation，Net Gain +0.80 是上界估计

### 4.6 决策文档

[D-2026-06-24-search-adopt-p4-same-source-merge.md](../decisions/D-2026-06-24-search-adopt-p4-same-source-merge.md)（active）

---

## 5. P5 Gap Ledger（强制证据缺口枚举）

### 5.1 设计意图

P5 v1 字段对齐 schema（Run #9c 双盲证伪）与 P5 v2 Evidence Map / Claim Graph（Run #13 双盲证伪）均未对自由文本展现决定性优势。但 Run #13 唯一可复现增量是 **Gap Ledger 强制枚举证据缺口**——捕获 Run A 漏掉的回滚 gap。

**最小机制派生**：放弃完整 Evidence Map 节点-边结构，只验证"追加 Gap Ledger 一步"的增量。Run #14 验证 4/5。

### 5.2 落地形态（SKILL.md §4.1）

在自由文本合成前追加一步：

```
Phase 4.1  Gap Ledger（强制）
              ↓
              在合成最终答案前，必须先产出 Gap Ledger：
              枚举所有"证据不足以回答"的子问题
              ↓
              每项 gap 必须引用 evidence id（不可凭常识生成）
              ↓
              evidence 充分则不应标 gap（缓解 false gap）
```

**5 项隐性缺口必查清单**：

| 类型 | 含义 |
|------|------|
| 缺反证 | 仅有支持证据，无反证检索 |
| 无直接对比 | 多源证据但无直接横向对比 |
| 单一来源 | 关键结论仅来自一个源 |
| 证据过时 | 证据时间戳超出当前主题时效 |
| 范围外推 | 证据仅覆盖子范围，被外推到全范围 |

**Gap 类型枚举**：缺反证 / 无直接对比 / 单一来源 / 证据过时 / 范围外推。

### 5.3 关键数据（Run #14）

Query: Cloudflare 反爬方案选型（gap 密集证据集 9 gap + 5 relation）

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

**评分 4/5**：Gap Δ +55.6% 远超 4/5 阈值 +20%（接近 5/5 阈值 +30%），Implicit Δ +40% 满足 5/5 隐性要求，安全指标全部不退化。**未达 5/5 的唯一原因**：False Gap = 1（Run B G15 把 cloudscraper "已淘汰" 误标为 "侦察用途待评估"）。

### 5.4 失败模式

- **追求 gap 召回产生轻度 false gap**：缓解措施 = 每项 gap 需引用 evidence id，evidence 充分则不应标 gap
- **篇幅成本**：Gap Ledger 占主要增量 +36%，可接受

### 5.5 决策文档

[run-14-p5-gap-ledger.md](../search-orchestrator/experiments/run-14-p5-gap-ledger.md)（实验）；机制升级 active，未单独建 D-2026-06-26 决策文档（属 D-2026-06-25-search-redesign-p5-evidence-map 的最小机制派生）

---

## 6. P6 Highlights / Relevance Compression

### 6.1 设计意图

借鉴 Exa highlights——"train models that take full webpages and condense them into just the tokens an LLM needs ... 4k chars"。但本项目不训练模型，把 highlights 思想转译为提示词层 **verbatim 抽取 ≤500 token**：

- 把 token 成本从「8k × N 条」降到「500 × N 条」
- 保留原文 trace（每条 highlight 含 Source URL）
- 避免摘要替代原文（Run #11 教训：摘要级指纹 ≠ 文档级指纹）

### 6.2 落地形态（SKILL.md Phase 1.bis）

```
Phase 1.bis  P6 Highlights（每个 sub-Q ≤500 token）
              ① 对每个 sub-Q 的所有 fetch_content 结果，抽取与该 sub-Q 直接相关的关键句
              ② 抽取规则：verbatim 引用（连续子串，允许首尾空白/格式标记差异）
                 - 禁止改写、同义替换、跨语言归纳
                 - 允许截取（在句号/逗号处截断）和省略标记（"..."）
                 - 允许格式标记差异（斜体/粗体/链接/代码标记的增减）
              ③ 每条 highlight 格式："引文" [Source: URL]
              ④ 每个 sub-Q 的 highlights 总量 ≤500 token
              ⑤ 标注置信度（High/Medium/Low）和反证覆盖（有/无）
```

**与 P3 的关系**：highlights 是 Phase 1 的中间产物，P3 是 Phase 4 输出强制。两者都用 verbatim 抽取原则，但 P6 在 fetch 后立即抽取，P3 在合成时绑定 Claim-Quote。

### 6.3 关键数据（Run #10）

Query: PostgreSQL 17 vs MySQL 8.4，4 sub-Q，26 highlights

| 指标 | 实测 | 通过条件 | 通过 |
|------|-----|---------|-----|
| Extractive Fidelity Rate | 92.3%（24/26） | ≥ 90% | ✅ |
| Paraphrase Rate | 7.7%（2/26） | ≤ 10% | ✅ |
| Untraceable Count | 0 | = 0 | ✅ |

**评分 4/5**（5/5 需 ≥95%，未达）。

两条 paraphrase 模式：

| 模式 | 案例 | 根因 |
|------|------|------|
| 主语同义替换 | "This release of PostgreSQL" → "PostgreSQL 17" | LLM 倾向用更具体的名称 |
| 跨语言归纳 | 英文原文 → 中文总结 | LLM 在跨语言场景倾向 paraphrase 而非 verbatim |

### 6.4 失败模式

- **跨语言归纳**：是结构性倾向，难以靠提示词完全消除。缓解：标注置信度 Low + 在 Gap Ledger 中显式标记
- **fetch 全文归档问题**：Run #10 暴露 §2 只存了摘要非完整正文，Q2-4 引用的 pgbench.html 未在 §2 归档中出现。修复：[SKILL.md §2.1](../../skills/search-orchestrator/SKILL.md) 强制每个 fetch 成功的 URL 必须归档完整正文（Iron Law，见 [survey.md §9.4](../search-orchestrator/survey.md)）

### 6.5 决策文档

[D-2026-06-25-search-adopt-p6-highlights.md](../decisions/D-2026-06-25-search-adopt-p6-highlights.md)（status: active）

---

## 7. #24 MCP 反-bot 节流 wrapper（基础设施层）

### 7.1 设计意图

Run #14 Phase 0b 暴露问题：DDG `BOT_DETECTED` 触发后全链路阻塞，靠提示词手动降速不可靠。问题归因：

| 根因 | 上游源码证据 |
|------|------------|
| vqd 翻页连击放大 + 同 IP 高频 → 越过 DDG 反爬阈值 | `duckduckgoSearcher.ts` `search()` 内部 `while (allResults.length < maxResults)` 无 jitter |
| 3 次线性重试，失败后不记忆状态 | `RETRY_DELAYS=[1000,2000]` 无跨调用降速 |
| cookieJar 进程级单例，被封 cookie 持续携带 | `cookieJar.ts` `export const cookieJar = new CookieJar()` |
| search() 是黑盒，外部无法干预内部重试/分页 | `index.ts` library export 已就绪，wrapper 可直接 import |

### 7.2 三方案对比

| 方案 | 实现成本 | #24 覆盖 | 维护成本 | 风险 |
|------|---------|----------|---------|------|
| A Fork 上游 | 中（~100-150 行） | ①②③④ 全覆盖 | 高（长期维护分支） | 低 |
| B 薄 wrapper 不禁分页 | 低-中（~80-120 行） | ①✅ ②❌ ③⚠️ ④⚠️ | 低 | 中（vqd 连击改不了） |
| **C 薄 wrapper + 禁分页** ★ | **极低（~50 行）** | ①✅ ②✅ ③✅ ④⚠️（V2） | **最低** | 低 |

**选 C 的核心理由**：

1. **SKILL 实际使用零损失**：[SKILL.md §1.4.1](../../skills/search-orchestrator/SKILL.md) 规定 R1/R2/R3 每路 `max_results=10`，项目从不分页
2. **#24 覆盖度最高且成本最低**：禁分页比 jitter 更彻底地消除 vqd 连击
3. **可升级路径**：C 是 A 的子集，后续需要 >10 结果或 backend 切换时升级到 A，无沉没成本

### 7.3 落地形态（search-mcp-wrapper/src/index.ts）

```typescript
class ThrottledSearchWrapper {
  private static readonly MAX_RESULTS_CAP = 10;
  private static readonly BACKOFF_DELAYS = [30_000, 120_000, 600_000]; // 30s, 2min, 10min
  private static readonly FAILURE_THRESHOLD = 3;
  private static readonly FAILURE_WINDOW_MS = 3600_000; // 1h sliding window

  private recentFailures: Date[] = [];
  private blockedUntil: Date | null = null;
  private circuitBreakCount = 0;
  private chain: Promise<void> = Promise.resolve(); // 串行化链

  async search(query, maxResults = 10) {
    // 排到串行化链（防并发穿透）
    return this.chain = this.chain.then(() => this._searchImpl(query, maxResults));
  }

  private async _searchImpl(query, maxResults) {
    if (this.blockedUntil && now < this.blockedUntil) {
      throw new SearchError(`Circuit open: blocked until ${this.blockedUntil}`, 'CIRCUIT_OPEN');
    }
    const capped = Math.min(maxResults, MAX_RESULTS_CAP);
    try {
      const results = await upstream.search(query, { maxResults: capped });
      // 成功 → 完全恢复
      this.recentFailures = [];
      this.blockedUntil = null;
      this.circuitBreakCount = 0;
      return results;
    } catch (e) {
      if (e.code === 'BOT_DETECTED') this.recordFailure();
      throw e;
    }
  }

  // fetch_content 透传——与 search 反爬正交，不加节流
  async fetch_content(url) { return upstream.fetch_content(url); }
}
```

**6 个设计要点**：

| # | 要点 | 实现 |
|---|------|------|
| 1 | 强制 `max_results ≤ 10` | `Math.min(maxResults, 10)` cap，禁分页 |
| 2 | 3 次失败阈值熔断 | 1h 滑动窗口内 `recentFailures.length >= 3` 触发 |
| 3 | 指数退避 30s / 2min / 10min | `circuitBreakCount++`，`BACKOFF_DELAYS[idx]` |
| 4 | 跨调用状态记忆 | `blockedUntil` + `recentFailures` + `circuitBreakCount` |
| 5 | 串行化链防并发穿透 | `chain.then(...)` 排队 |
| 6 | fetch_content 独立通道 | 与 search 反爬正交，熔断期可正常调用 |

### 7.4 验证结果

| 验证项 | 结果 | 证据 |
|--------|------|------|
| 11 场景集成测试 | ✅ 11/11 通过 | `npm test` |
| 子代理 code review | ✅ 两轮通过 | 第一轮发现 N=2 早熔断（修正为 N=3），复审 0 严重 0 建议 |
| Run #14 Phase 0b 功能性 | ✅ 通过 | 3 次熔断正确触发指数退避（30s/2min/10min），fetch 独立通道不受影响 |

**暴露的上游特性**（非 wrapper bug）：

| 现象 | 触发条件 | 缓解 |
|------|---------|------|
| `site:` 100% 触发 BOT_DETECTED | DDG 后端策略 | SKILL §1.4.2.ter R2 降级为自然语言关键词 |
| `OR` 部分触发 | DDG 后端策略 | 单站点单 query 避免复合 |
| 单引号最稳定 | — | 默认使用 |

### 7.5 决策文档

[D-2026-06-26-search-adopt-mcp-throttle-wrapper.md](../decisions/D-2026-06-26-search-adopt-mcp-throttle-wrapper.md)（status: active）

---

## 8. 证伪路径（4 + 2）

### 8.1 P2 Query Rewrite + Fanout（deferred）

**设计**：启示 3 借鉴 Azure Semantic Query Rewrite + Agent4Ranking，把 query 改写形式化为 3 个固定变换（直白 / 限域 / 反证）并行扇出。

**证伪**：

| Run | 评分 | 关键发现 |
|-----|------|---------|
| #2 | 3.6/5 | 三路 fanout 首轮 |
| #3 | 2.6/5 | 调参后复测，仍不达 4/5 |

**根因**：
- LLM 提示词层算分不可靠（NumericBench 印证：简单加减都达不到 100%）
- DiversityPenalty ±2 量级压不过 SourceWeight ±10（评分误差 4 倍方差压缩，±2 落在噪声地板内）
- 负向 query 召回差属后端能力限制（NevIR 印证：神经检索在否定上等于/低于随机；DDG 2023 起算子被下线）

**衍生候选**：#20 反证检索 / #21 多样性排序 → 保持候选（暂缓）

**决策文档**：[D-2026-06-24-search-defer-p2.md](../decisions/D-2026-06-24-search-defer-p2.md)（deferred）

### 8.2 P5 v1 字段对齐 Output Schema（superseded）

**设计**：sub-question 预声明 schema 字段 → LLM 抽字段 → 基于字段综合答案。

**证伪**（三轮迭代）：

| Run | 评分 | 关键发现 |
|-----|------|---------|
| #9 | 1/5 设计失败 | 单源列表型证据集天花板——Run A 基线 Claim Coverage 100%、Info Loss 0%，指标天花板已被自由文本顶满 |
| #9b | 3/5 有条件 | 多实体对比（Gin/Echo/Fiber × 5 维度）——Conflict ID Δ=+40% 但仅方向性信号（非双盲） |
| #9c | 2/5 双盲证伪 | 非结构化证据集——Conflict ID Δ=-20%（自由文本 100% > schema 80%），Field Alignment Δ=-7% |

**根因**：schema 结构可能限制跨维度冲突发现——执行者倾向只报告 schema 内字段间冲突，自由文本叙事流更灵活。Schema 幻觉=0 护栏有效但不足以挽救机制收益。

**衍生**：D-2026-06-25-search-redesign-p5-evidence-map 取代 v1，启动 v2 重设计

**决策文档**：[D-2026-06-24-search-evaluate-p5-output-schema.md](../decisions/D-2026-06-24-search-evaluate-p5-output-schema.md)（superseded）

### 8.3 P5 v2 Evidence Map / Claim Graph（保持 proposed 不再推进）

**设计**：用 Evidence Nodes + Relation Edges + Conflict Ledger / Gap Ledger 取代字段对齐 schema，让中间表示服务于证据关系发现而非字段填表。

**证伪**（Run #13）：

| 指标 | Run A 自由文本 | Run B Evidence Map | Δ |
|------|---------------:|-------------------:|--:|
| Material Relation Recall | 15/16 = 93.8% | 16/16 = 100% | +6.3% < +15% 门槛 |
| Cross-Dimension Relation Recall | 12/12 = 100% | 12/12 = 100% | 0（双方达天花板） |
| Gap Detection Recall | 2/3 = 66.7% | 3/3 = 100% | +33.3% |
| 安全指标 | 0 / 0 / 0 | 0 / 0 / 0 | 0 |

**评分 2/5**：主指标未达 +15% 门槛。Cross-Dimension 双方均达天花板，自由文本叙事流同样能连接跨维度关系。

**唯一可复现增量**：Gap Ledger 强制枚举证据缺口（捕获 Run A 漏掉的回滚 gap GT15）。

**衍生**：放弃完整 Evidence Map，只验证"追加 Gap Ledger / 证据缺口枚举"最小机制 → Run #14 → 升级 active（见 §5）

**决策文档**：[D-2026-06-25-search-redesign-p5-evidence-map.md](../decisions/D-2026-06-25-search-redesign-p5-evidence-map.md)（proposed，不再推进）

### 8.4 MCP 后端切换（rolled-back）

**设计**：从 Node.js `duckduckgo-websearch` 切换到 Python `curl_cffi`（基于 curl 的 TLS 指纹模拟），假设能穿透中文站点的 JS Challenge。

**证伪**（Run #8a）：

| 验证项 | 结果 |
|--------|------|
| HTTP Success Rate | 10/10 = 100% |
| Content Success Rate | 0/10 = 0% |
| juejin 等 | 全部返回 "Please wait..." JS Challenge 假页面 |

**评分 1/5 基础设施分**：HTTP Success ≠ Content Success——TLS 指纹假设 disproven。

**根因**：HTTP 层成功不代表浏览器 JS 执行成功。juejin 等站点用 JS Challenge 在 HTTP 200 后追加 challenge 页面。

**衍生**：#22 Browser-backed Fetch 候选（暂缓）——触发条件为 Tier C snippet-only 被证明严重影响答案质量；启动时选多层叠加方案（住宅代理 + 真实浏览器 + solver）而非裸 Playwright

**决策文档**：[D-2026-06-24-search-infra-mcp-upgrade.md](../decisions/D-2026-06-24-search-infra-mcp-upgrade.md)（rolled-back）

### 8.5 DiversityPenalty + R1 保底（rolled-back）

**设计**：在 FinalScore 加 DiversityPenalty ±2 强制域名多样性 + R1 保底（保证至少 1 条来自 R1）。

**证伪**：与 P2 同期证伪——LLM 提示词层算分量级压不过 SourceWeight ±10；±2 落在噪声地板内（4 倍方差压缩）。NumericBench 印证：LLM 算术本身不准，pointwise 逐条打分是排序家族里方差最大范式。

**决策文档**：[D-2026-06-24-search-rollback-diversity.md](../decisions/D-2026-06-24-search-rollback-diversity.md)（rolled-back）

### 8.6 完整 Evidence Map / Claim Graph（保持 proposed 不再推进）

Run #9 / #9b / #9c / #13 四轮证伪后，明确不再推进完整 Evidence Map / Claim Graph 设计。只 Gap Ledger 最小机制作为 P5 唯一落地候选升级 active（见 §5）。

**lessons learned**：两代结构化中间表示（v1 字段表 + v2 节点-边）双盲证伪后，应识别"结构化中间表示的收益天花板"，避免无限重设计。

---

## 9. 机制间关系图

```
                  ┌──────────────────────┐
                  │  Cline + DDG MCP 栈  │
                  └──────────┬───────────┘
                             │
            ┌────────────────┼─────────────────┐
            ↓                ↓                 ↓
       ┌─────────┐    ┌──────────┐      ┌─────────────┐
       │   P1    │    │   P1.5   │      │     P6      │
       │ Goggles │←──→│ FinalScore│     │  Highlights │
       └────┬────┘    └──────┬───┘      └──────┬──────┘
            │                │                  │
            ↓                ↓                  ↓
       域名过滤后排序     数值联动重排      fetch 后 verbatim 抽取
            │                │                  │
            └───────┬────────┴──────────────────┘
                    ↓
              ┌──────────┐
              │    P4    │
              │  Dedup   │  ← 同源合并（在 P6 之后执行）
              └────┬─────┘
                   ↓
              ┌──────────┐
              │    P3    │
              │ Citation │  ← 三档模式（受 P6 fetch 成功率影响）
              └────┬─────┘
                   ↓
              ┌──────────────┐
              │ P5 Gap Ledger│  ← 合成前强制枚举证据缺口
              └──────┬───────┘
                     ↓
                 最终答案

基础设施层（正交）：
              ┌────────────────────────┐
              │ #24 MCP 反-bot wrapper │  ← 包 duckduckgo-websearch
              └────────────────────────┘
```

---

## 10. Iron Laws（非机制候选，已落地为硬性规则）

| 约定 | 来源 | SKILL.md 位置 | 说明 |
|------|------|--------------|------|
| fetch_content 全文归档 | Run #10 + Run #11 暴露的系统性问题 | §2.1 | 每个 fetch 成功的 URL 必须在输出文件归档完整正文（非摘要）。摘要替代正文破坏 SimHash 经典设定 |
| evidence id 必引 | Run #14 Gap Ledger false gap | §4.1 | 每项 gap / claim 必须引用 evidence id，不可凭常识生成 |
| 绝对路径禁用 | 本会话敏感信息扫描发现 | web-search-setup.md §2.1 | MCP 配置中 args 不得含本机绝对路径，需相对化 |

详见 [survey.md §9.4](../search-orchestrator/survey.md)。
