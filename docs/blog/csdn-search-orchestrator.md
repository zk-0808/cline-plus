# 14 轮双盲 A/B 实验：把 Cline + DuckDuckGo 搜索能力逼近 Perplexity 的 6 个提示词层机制

> 仓库地址：[https://github.com/zk-0808/cline-search-orchestrator](https://github.com/zk-0808/cline-search-orchestrator)

## 写在前面

如果你也在用 Cline（或任何基于 MCP 的开源 agent），大概率遇到过这种场景：

> 让 agent 去搜一个中文技术问题，回来一堆 CSDN 转载、toutiao 农场、SEO 垃圾站。问它"这个结论有反证吗"，它说"根据多个来源……"——但你根本看不到引用，更别提追溯原文。

商业 agent（Perplexity / Tavily / Exa）解决得很好，但要么付费、要么要 API key、要么换了整套后端。开源栈能不能在不花钱、不换后端、不加依赖的前提下，把搜索质量逼到接近商业 agent？

我用 4 天时间跑了 14 轮双盲 A/B 实验，验证了 **6 个提示词层机制 + 1 个基础设施层机制**，全部升级 active；同期通过 4 轮证伪实验否决了 4 条候选路径。本文是这次实验的总结，完整代码与文档已开源：

**[https://github.com/zk-0808/cline-search-orchestrator](https://github.com/zk-0808/cline-search-orchestrator)**

---

## 一、起点：能力差距的结构性归因

Cline 自身没有内置 web search，依赖外部 MCP（默认 DuckDuckGo）。直接装好 DDG MCP 后的能力位置是「裸 search + LLM 自行处理」——与商业 agent 的差距是结构性的。

但调研后发现一个关键事实：

> **差距的 80% 不在搜索引擎本身，而在围绕搜索的 5~7 个工程动作**（域名过滤、citation 强制、query 改写、压缩、结构化、失败处理）。

其中绝大多数可以靠提示词补齐——不需要新依赖、不需要 API key、不需要换后端。这一判断驱动了整个项目的设计方向：把商业 agent 搜索栈的工程动作**转译**为 Cline + DDG MCP 栈上的提示词层机制。

完整对照表见仓库 `docs/research/01-background.md`：12 项商业 agent 手法中，5 项可提示词等效、5 项部分覆盖、2 项不可（必须由 LLM 自身承担或换后端）。

---

## 二、方法学：把"是否有效"从主观判断升级为可量化评测

这是本项目最想强调的贡献。提示词工程最大的问题是"改了感觉变好了"——没有对照、没有指标、没有阈值，调一版是一版，回退不了。

本项目固化了一套 **A/B 双盲评测框架**（仓库 `skills/search-orchestrator/examples/ab-test-template.md`），核心规则：

### 1. Run A / Run B 双跑

| Run | 含义 |
|-----|------|
| **Run A** | 不应用本次新增规则，记录搜索引擎原始顺序的 top 10 |
| **Run B** | 应用新增规则，在**同一份**原始结果上重排或打标 |

关键：Run B 不重新调 search，只在 Run A 数据上做 LLM 处理。这样可以严格隔离"规则带来的差异"。

### 2. 评分阈值体系（4 种）

不同机制用不同评分尺度，不混用：

| 尺度 | 适用场景 | 核心指标 |
|------|---------|---------|
| 通用尺度 | Goggle / 排序类改造 | 垃圾站清除率 + Top-5 T1+T2 数量变化 |
| P3 双维度 | Evidence-bound Citation | 机制分（Claim-Quote 绑定率）+ 基础设施分（fetch 成功率），不合并 |
| P4 三层核心 | 同源去重 | Merge Precision + False Merge + Info Loss，三个都达标才算过 |
| P5 双盲 | Gap Ledger | Gap Detection Recall + Implicit Gap Recall + 安全指标不退化 |

### 3. Ground Truth 密封流程

实验设计 → GT 密封 → 盲态双轨 → 揭盲评分。**不事后调阈值**——4/5 升级、3/5 回炉、2/5 回退，预设好什么分数对应什么动作。

这套框架本身是可复用产物，其他 agent 提示词工程研究可以直接套用。

---

## 三、6 个 active 机制（全部通过双盲验证）

| ID | 机制 | 关键数据 | 落地位置 |
|----|------|---------|---------|
| **P1** | Domain Goggles（域名级软过滤 + 排序） | 垃圾站清除率 100%；评分 4/5 | SKILL.md §3.5 |
| **P1.5** | FinalScore 联动（Goggle × SourceWeighting） | Top-5 中至少 1 条升入 T1/T2 | SKILL.md §3.5.5 |
| **P3** | Evidence-bound Citation（三档模式 Tier A/B/C） | 机制分 5/5；误引用 0 | SKILL.md §4.3 |
| **P4** | Evidence Deduplication（同源合并） | Merge Precision 100%、False Merge 0、Info Loss 0 | SKILL.md §1.4.5 |
| **P5 Gap Ledger** | 合成前强制枚举证据缺口 | Gap Detection Recall +55.6%（33.3% → 88.9%） | SKILL.md §4.1 |
| **P6** | Highlights（fetch 后 verbatim 抽取 ≤500 token） | Extractive Fidelity 92.3%，Untraceable 0 | SKILL.md Phase 1.bis |

外加 1 个基础设施层机制：

| **#24** | MCP 反-bot 节流 wrapper（强制 max_results≤10 + 熔断指数退避） | 11/11 集成测试 + 功能性验证通过 | search-mcp-wrapper/ |

挑几个值得展开讲：

### P1 Domain Goggles：提示词层能不能做域名级硬过滤？

借鉴 Brave Goggles 的思路，在提示词层用 BOOST / DOWNRANK / DISCARD 表对结果打标。Run #1 验证：垃圾站清除率 5/5 = 100%，评分 4/5。

但这里有个关键认知：提示词层软过滤与 Brave Goggles 硬过滤**不可等效**。Goggles 在召回阶段对数万候选硬过滤，软过滤只在最终 10-50 条上软重排——精度损失有界（NDCG 级），召回损失无界（长尾不可恢复）。所以 P1 是"无 Brave 后端时的最优替代"，不是"等价实现"。这一判断由 Brave Goggles 白皮书与 RankGPT 学术结论支持。

### P5 Gap Ledger：唯一从两代结构化中间表示失败里活下来的最小机制

P5 经历了三代设计：

| 代次 | 设计 | Run | 评分 | 教训 |
|------|------|-----|------|------|
| v1 | 实体 × 字段对齐 schema | #9 / #9b / #9c | 1/5 → 3/5 → 2/5 | 字段表锁住执行者只填同维度，削弱跨维度冲突发现 |
| v2 | Evidence Map / Claim Graph（节点-边-Conflict Ledger） | #13 | 2/5 | Material Relation Recall Δ=+6.3% < +15% 门槛；自由文本叙事流同样能连接跨维度关系 |
| v3（最终） | **仅 Gap Ledger**（合成前强制枚举证据缺口） | #14 | 4/5 | Gap Detection Recall +55.6%；唯一可复现增量 |

Run #13 的关键发现：自由文本反超 schema 的方向与 Run #9c 一致。完整 Evidence Map / Claim Graph 保持 proposed，不再推进。**只把 Gap Ledger 这个最小机制升级 active**——这是"避免过度工程"的典型例子。

### #24 节流 wrapper：为什么提示词层解决不了 bot detection

DDG 后端对 `site:` 100% 触发 `BOT_DETECTED`、`OR` 部分触发。Run #14 Phase 0b 时 Q2-Q8 全链路不可用，靠提示词手动降速不可靠。

源码评估发现：上游 `duckduckgo-websearch` 的 `search()` 方法是黑盒，内部 3 次线性重试 `[1s, 2s]` + 无延迟无 jitter 分页循环 + 进程级单例 cookieJar（被封 cookie 持续携带直到重启）。

最终选了**方案 C**：薄 wrapper + 禁分页。

```typescript
class ThrottledSearchWrapper {
  private static readonly MAX_RESULTS_CAP = 10;
  private static readonly BACKOFF_DELAYS = [30_000, 120_000, 600_000]; // 30s, 2min, 10min
  private static readonly FAILURE_THRESHOLD = 3;
  private static readonly FAILURE_WINDOW_MS = 3600_000; // 1h sliding window
  // ...
}
```

核心设计：

1. **强制 `max_results ≤ 10`**——从根上消除 vqd 翻页连击
2. **跨调用状态记忆**——wrapper 实例维护 `blockedUntil` + `recentFailures`
3. **指数退避**——捕获 `BOT_DETECTED` 后 `[30s, 2min, 10min]` 重试
4. **会话级熔断**——连续 3 次失败后设 `blockedUntil = now + 指数递增`，期间拒绝 search 调用
5. **fetch_content 独立通道**——与 search 反爬正交，熔断期可正常调用

为什么禁分页零损失？因为 SKILL §1.4.1 规定 R1/R2/R3 三路 fanout 每路 `max_results=10`，项目从不使用 >10 的分页能力。

11/11 集成测试通过，Run #14 Phase 0b 功能性验证通过。

---

## 四、4 条证伪路径（方法论成功的同等证据）

证伪本身和 active 机制一样重要——它识别了"提示词层能做到什么"的天花板。

| 路径 | 证伪实验 | 评分 | 教训 |
|------|---------|-----|------|
| **P2 Query Rewrite + Fanout** | Run #2 / #3 | 3.6/5 → 2.6/5 | LLM 提示词层算分不可靠；负向 query 召回差属后端能力限制 |
| **P5 v1 字段对齐 schema** | Run #9 / #9b / #9c | 1/5 → 3/5 → 2/5 | 字段表锁住执行者只填同维度，削弱跨维度冲突发现 |
| **P5 v2 Evidence Map / Claim Graph** | Run #13 | 2/5 | Material Relation Recall Δ=+6.3% < +15% 门槛；自由文本反超 schema |
| **MCP 后端切换（TLS 指纹）** | Run #8a | 1/5 基础设施分 | TLS 指纹假设 disproven；HTTP Success ≠ Content Success |

### 为什么 P2 必须下沉到代码层

P2 Query Rewrite + Fanout 想用 LLM 在提示词层做 DiversityPenalty ±2 的数值算分。Run #2/3 证伪后发现根因有三层：

1. **LLM 算术本身不准**（NumericBench 印证：简单加减都达不到 100%，next-token 范式与算术进位逻辑相反）
2. **数值分被"压缩"**（评分误差 σ²≈0.21 vs 基线 0.87，4 倍方差压缩，±2 落在噪声地板内）
3. **pointwise 逐条打分是排序家族里方差最大、最不稳定的范式**

工程结论：算分必须出 LLM、进算法层。LLM 只做语义判断（输出离散标签/布尔，不输出分数），数值合成与排序交给确定性代码。若必须 LLM 参与排序，用 pairwise/setwise 而非 pointwise。

### 为什么 MCP TLS 指纹切换是假命题

Run #8a 想验证"换 Node.js → Python curl_cffi 能解决中文 fetch 覆盖率问题"。结果：HTTP Success ≠ Content Success——juejin 等站点全部返回 "Please wait..." 假页面，TLS 指纹对了但 Cloudflare JS Challenge 没过。决策 rolled-back。

---

## 五、三层职责分离（核心设计原则）

```
┌─────────────────────────────────────────────┐
│  Skill 层（方法论）                          │
│  skills/search-orchestrator/SKILL.md          │
│  P1/P1.5/P3/P4/P5/P6 — 提示词层机制          │
└──────────────────┬──────────────────────────┘
                   │ 调用
┌──────────────────▼──────────────────────────┐
│  Wrapper 层（节流）                          │
│  search-mcp-wrapper/                         │
│  #24 — 强制 cap + 熔断 + 串行化             │
└──────────────────┬──────────────────────────┘
                   │ 调用
┌──────────────────▼──────────────────────────┐
│  上游（DDG 后端）                            │
│  duckduckgo-websearch                        │
│  原始 search / fetch_content                │
└─────────────────────────────────────────────┘
```

**不在错误的层做错误的事**——提示词层不做基础设施层的事（如反-bot 节流），基础设施层不做提示词层的事（如 citation 强制）。这条原则贯穿整个项目设计。

---

## 六、如何使用

### 三种使用形态

| 形态 | 内容 | 适用场景 |
|------|------|---------|
| **A 仅 SKILL** | 复制 `skills/search-orchestrator/` 到 Cline skill 加载路径 | 只想要搜索编排方法论，后端自己解决 |
| **B 仅 wrapper** | 装 `search-mcp-wrapper/`，配 MCP JSON | 只想要反-bot 节流，不要 SKILL 流程 |
| **C 完整**（推荐） | SKILL + wrapper | 复现本研究栈 |

### 安装步骤

```bash
# 1. clone 仓库
git clone https://github.com/zk-0808/cline-search-orchestrator.git

# 2. 装 wrapper
cd search-mcp-wrapper
npm install
npm run build
npm test  # 11/11 通过

# 3. 配置 Cline MCP（见仓库 skills/search-orchestrator/references/web-search-setup.md）
# 4. 复制 skills/search-orchestrator/ 到 Cline skill 加载路径
```

### 场景选择指引

| 场景 | 推荐机制组合 |
|------|-------------|
| 中文技术查询 | P1 Goggles + P1.5（过滤 CSDN/toutiao 农场） |
| 通用技术调研 | P1 + P3 Tier A + P6（完整 citation + 压缩） |
| 学术 / 论文 | P1（BOOST arxiv/*.edu）+ P3 + P5 Gap Ledger |
| 安全研究 | P1 + P3 + P5（反证缺口必查） |
| 产品调研 | P4 同源去重 + P6（多源转载压缩） |

---

## 七、一些数字

| 维度 | 值 |
|------|-----|
| 研究周期 | 4 天（2026-06-23 ~ 2026-06-26） |
| A/B 实验轮数 | 14 |
| active 机制数 | 6 P 级 + 1 Infra = 7 |
| 证伪 / 回退路径数 | 4 条主路径 + 2 条衍生 |
| 引入新依赖数 | 1（`@modelcontextprotocol/sdk`，wrapper 用） |
| 引入付费 API key 数 | 0 |
| 换搜索后端次数 | 0（DDG 始终） |

---

## 八、与现成学术结论的对照

避免重复造轮子。5 个机制评估直接援引了现成学术 / 工程结论：

| 机制 | 援引结论 | 关键来源 |
|------|---------|---------|
| P1 Goggles | 提示词层软过滤结构性天花板（长尾召回不可恢复） | Brave Goggles 白皮书 / RankGPT |
| P4 同源去重 | 逐字场景 overkill，语义场景有真正价值 | Manning IR Book §19.6 / Manku WWW'07 / Henzinger DOCENG'13 |
| #20 反证检索 | 神经检索在否定上等于/低于随机 | NevIR EACL'24 / NegBench MIT |
| #21 多样性排序 | LLM 算术不准 + 4 倍方差压缩 | NumericBench arXiv'25 / LLM-as-a-Judge |
| #22 Browser Fetch | headless 是地基不是整栋楼 | Browserless / Scrapfly stealth |

完整文献清单见仓库 `docs/research/references.md`。

---

## 九、总结

商业 agent 搜索能力的 80% 工程动作可以转译为提示词层的硬性流程。本项目用 14 轮双盲 A/B 验证了其中 6 项有效、4 项无效，并把"是否有效"的判定从主观感觉升级为可复现的量化评测。

如果你也在用 Cline 或类似的开源 agent 栈，欢迎直接拿去用：

**[https://github.com/zk-0808/cline-search-orchestrator](https://github.com/zk-0808/cline-search-orchestrator)**

如果对你有帮助，star 一下；遇到问题提 issue，我会跟。后续会继续推进 #22 Browser Fetch（穿透 Cloudflare JS Challenge）与 #24 V2 backend 切换（Brave/Bing MCP）。

---

## 推荐阅读顺序（如果你不想读全部文档）

| 顺序 | 文件 | 主题 |
|------|------|------|
| 1 | `docs/research/00-overview.md` | 摘要 + 问题 + 主要结论（如果只读一份，读这份） |
| 2 | `docs/research/02-methodology.md` | A/B 双盲框架 + 评分阈值体系 |
| 3 | `docs/research/03-mechanisms.md` | 6 active + #24 wrapper + 证伪路径详解 |
| 4 | `docs/research/06-usage.md` | 如何在 Cline 中应用 |

仓库地址再放一次：

**[https://github.com/zk-0808/cline-search-orchestrator](https://github.com/zk-0808/cline-search-orchestrator)**
