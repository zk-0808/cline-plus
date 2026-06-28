# 05 — Results & Discussion

> 本章回答 RQ3：哪些问题不是提示词可治的？哪些必须下沉到 MCP / 后端 / 代码层？并归纳失败模式、局限与可复用产物。

---

## 1. active 机制清单（最终态）

### 1.1 提示词层（6 个 P 级机制）

| ID | 机制 | SKILL.md 位置 | 验证 Run | 评分 | 关键数据 |
|----|------|--------------|---------|-----|---------|
| **P1** | Domain Goggles | §3.5 | #1 | 4/5 | 垃圾站清除率 100% |
| **P1.5** | FinalScore 联动 | §3.5.5 | #1（同期） | 4/5 | Top-5 升 1 条 T1 |
| **P3** | Evidence-bound Citation（三档模式） | §4.3 | #4/5/6 | 5/5 机制 · 1~5/5 基建 | 误引用 0 |
| **P4** | Evidence Deduplication（同源合并） | §1.4.5 Step 3.bis | #7/11/12b | 4~5/5 | Merge Precision 100%，4 子类全覆盖 |
| **P5 Gap Ledger** | 强制证据缺口枚举 | §4.1 | #14 | 4/5 | Gap Recall Δ=+55.6% |
| **P6** | Highlights / Relevance Compression | Phase 1.bis | #10 | 4/5 | Extractive Fidelity 92.3% |

### 1.2 基础设施层（1 个 Infra）

| ID | 机制 | 落地 | 验证 | 关键设计 |
|----|------|------|------|---------|
| **#24** | MCP 反-bot 节流 wrapper | [search-mcp-wrapper/](../../search-mcp-wrapper/) | 11/11 测试 + Run #14 功能性 | 强制 max_results≤10 + 3 次熔断指数退避 + fetch 独立通道 |

### 1.3 工程约定（Iron Laws）

| 约定 | 来源 | SKILL.md 位置 |
|------|------|--------------|
| fetch_content 全文归档 | Run #10 + #11 教训 | §2.1 |
| evidence id 必引 | Run #14 false gap | §4.1 |

---

## 2. 证伪 / 回退路径汇总（4 + 2）

### 2.1 主路径

| 路径 | 证伪 Run | 评分 | 决策 status | 衍生候选 |
|------|---------|-----|-----------|---------|
| P2 Query Rewrite + Fanout | #2/#3 | 3.6 → 2.6/5 | deferred | #20 反证检索 / #21 多样性排序 |
| P5 v1 字段对齐 schema | #9/#9b/#9c | 1 → 3 → 2/5 | superseded | P5 v2 Evidence Map |
| P5 v2 Evidence Map / Claim Graph | #13 | 2/5 | proposed 不再推进 | P5 Gap Ledger 最小机制 |
| MCP 后端切换（TLS 指纹） | #8a | 1/5 基建 | rolled-back | #22 Browser Fetch |

### 2.2 衍生

| 路径 | 决策 status | 教训 |
|------|-----------|------|
| DiversityPenalty + R1 保底 | rolled-back | LLM 提示词层算分量级压不过 SourceWeight ±10 |
| 完整 Evidence Map / Claim Graph | proposed 不再推进 | 两代结构化中间表示双盲证伪；只 Gap Ledger 最小机制升级 active |

### 2.3 候选清单状态

按 [mechanism-candidates.md](../mechanism-candidates.md) 24 条：

| 状态 | 数量 | 示例 |
|------|------|------|
| 已机制化 | 4 | #17 Highlights / #19 P4 / #24 wrapper / #16 部分（Gap Ledger） |
| 永久C类 | 7 | #8 调研先行 / #9 证据优于推测 / #10 A/B/C 分类 / #11 三轮收敛律 / #12 决策分层 / #13 战略决断 / #23 执行边界 |
| 候选 | 9 | #1~#4（A 类早期）/ #18 multi-agent / #20 反证检索 / #21 多样性排序 / #22 Browser Fetch |
| 实验中 | 2 | #5 长会话 compact / #6 跨会话 handoff |
| 其他 | 2 | #7 Windows Hook / #14 自研 compact 失败转向 |

---

## 3. 失败模式归纳

### 3.1 评测设计层（方法学失败）

| 模式 | 案例 | 教训 |
|------|------|------|
| **单源列表型证据集天花板** | Run #9（1 URL × 4 同源 claim）→ Run A 基线 100%，Run B 无空间 | 评测前必须确认证据集结构能触发机制收益场景 |
| **结构化证据集天花板** | Run #9b（P3 证据集已结构化）→ Field Alignment Δ=0 | 不能复用 P3 已结构化的证据集验证 P5 字段对齐 |
| **自由文本天花板** | Run #13（Cross-Dimension 双方 12/12）→ 自由文本叙事流同样能跨维度 | 评测指标要在双方均能达天花板的维度之外设计 |
| **指标选错** | Run #1 原评 2/5 用 BOOST 命中数（错误指标），重评 4/5 用垃圾清除率 | 评分阈值体系本身需迭代——错误的指标会得到错误结论 |

### 3.2 机制设计层（机制失败）

| 模式 | 案例 | 教训 |
|------|------|------|
| **schema 锁住跨维度发现** | Run #9c：执行者只报告 schema 内字段间冲突，漏跨维度 | 字段表设计反而削弱发现能力 |
| **LLM 算分不可靠** | Run #2/#3 DiversityPenalty ±2 落在噪声地板 | 排序必须出 LLM、进算法层；LLM 只做语义判断 |
| **跨语言归纳** | Run #10 P6 两条 paraphrase 是英文 → 中文 | LLM 在跨语言场景倾向 paraphrase 而非 verbatim，是结构性倾向 |
| **HTTP ≠ Content** | Run #8a TLS 指纹切换 HTTP 100% / Content 0% | 验证基础设施必须区分协议层成功与语义层成功 |
| **追求 gap 召回产生 false gap** | Run #14 G15 cloudscraper "已淘汰" 被误标 | 每项 gap 必引 evidence id，evidence 充分则不应标 gap |

### 3.3 基础设施层（非机制失败）

| 模式 | 案例 | 教训 |
|------|------|------|
| **中文 fetch 瓶颈** | Run #4/#6 1/10 fetch 成功 | 不能因基础设施限制放弃机制——用三档模式解耦 |
| **DDG BOT_DETECTED 全链路阻塞** | Run #14 Phase 0b | 节流应交给代码而非提示词；落地为 #24 wrapper |
| **`site:` 100% 触发 BOT_DETECTED** | Run #14 Phase 0b | SKILL §1.4.2.ter R2 降级为自然语言关键词 |
| **fetch 全文归档缺失** | Run #10/11 摘要替代正文 | 摘要级指纹 ≠ 文档级指纹；强制全文归档（Iron Law） |
| **SKILL 未加载** | Run #1~#9c 5 个机制验证型 Run 在 SKILL 未加载状态执行 | 结论可信度存疑；5 项援引现成学术结论替代自实验 |

---

## 4. 局限

### 4.1 样本量

| Run | 样本 | 上界估计？ |
|-----|------|----------|
| #1 | 1 query × 10 结果 | 否（垃圾清除 100% 是真实） |
| #11 | 3 对 translation | **是**——Net Gain +0.80 是上界（摘要限制低估 baseline verbatim 能力） |
| #12b | 5 对 summary/rewrite | 否（GT positive=5 已饱和） |
| #14 | 9 gap + 5 relation | 否（gap 密集证据集已饱和） |

### 4.2 执行者偏差

同一执行者跑 Run A / Run B 可能产生 framing effect。Run #9c 起改用**严格双盲**——执行者跑 Run A / Run B 时**看不到** GT 文件，跑完后才揭开对照计算。

### 4.3 ground truth 主观

GT 由人列举，可能漏。Run #14 GT 9 gap + 5 relation 已是密集集，但仍是单一观察者产物。

### 4.4 后端波动

DDG 反爬触发会污染 fetch 成功率。Run #4 / #6 的 1/10 fetch 成功率可能部分归因后端波动，而非纯中文站点覆盖问题。已用 wrapper 隔离（见 §1.2 #24）。

### 4.5 时间窗口

研究周期 2026-06-23 ~ 2026-06-26 共 4 天。所有结论在此时段内成立，未做长期回归。建议未来在以下场景复评：

- DDG 后端策略变更（如重新支持 `site:` / `OR` 算子）
- Cline 引入新的 search MCP 后端
- LLM 模型升级（影响 P6 verbatim 抽取保真度）

---

## 5. 与现成学术结论的对照

避免重复造轮子。5 个机制评估援引了现成学术结论，详见 [搜索结论.md](../search-orchestrator/搜索结论.md) 与 [survey.md §10](../search-orchestrator/survey.md)。

### 5.1 P1 Goggles — 软过滤 vs 硬排序

**核心命题**：提示词层"软过滤"（LLM 按 BOOST/DOWNRANK/DISCARD 表打标）能否等效 Brave Goggles 的域名级硬排序。

**裁决**：**不可等效**。关键不在"排序精度"而在"介入点"：
- Goggles 在召回阶段对数万候选硬过滤
- 软过滤在最终 10-50 条上软重排

精度损失有界（NDCG 级），召回损失无界（长尾不可恢复）。

**对 P1 决策的影响**：现成结论**支持**提示词层软过滤作为降级实现的合理性（无 Brave 后端时的最优替代），但明确了其结构性天花板。P1 状态不变（active）。

**关键来源**：
- [Brave Goggles 白皮书](https://brave.com/static-assets/files/goggles.pdf)
- [RankGPT](https://github.com/sunnweiwei/rankgpt)
- [Brave Rerank](https://brave.com/blog/search-rerank)

### 5.2 P4 Same-Source Merge — 提示词层去重 vs IR 成熟方法

**核心命题**：同源转载/镜像去重是 IR 成熟技术；项目提示词层实现是否与现成方法等价。

**裁决**：**分场景**。
- 逐字/近逐字镜像：提示词层与现成方法（SimHash/shingling+MinHash）目标等价，但工程上被严格压制（更贵、更慢、不确定、阈值不可证），属过度工程
- 语义级同源（改写/洗稿/翻译）：现成句法指纹明确"做不好"，提示词层 LLM 可能真正不等价（更强）

**对 P4 决策的影响**：现成结论**部分支持** P4：逐字场景下 P4 是 overkill 但功能等价；语义场景下 P4 有真正价值。Run #11/#12b 已验证 translation/summary/rewrite 三种语义子类全部通过。P4 状态不变（active）。

**关键来源**：
- [Manning IR Book §19.6](https://nlp.stanford.edu/IR-book/html/htmledition/near-duplicates-and-shingling-1.html)
- [Manku/Google WWW'07](https://research.google.com/pubs/archive/33026.pdf)
- [Henzinger DOCENG'13](https://clgiles.ist.psu.edu/pubs/DOCENG2013-near-duplicate-detection.pdf)

### 5.3 #20 反证检索 — 负向 query 召回差是否"非提示词可治"

**核心命题**：DDG/通用搜索后端对负向 query（OR/否定词/反例词）召回差是后端能力限制，非提示词可治。

**裁决**：**基本成立，但需收紧措辞**。负向召回差发生在检索阶段（非生成阶段），提示词够不到。
- NevIR 基准：多数神经检索模型在否定上等于或低于随机排序
- "语义坍缩"使否定信号在向量空间不可分
- DDG 特异性：基于 Bing，2023 年起大部分算子被下线

**反证修正**：命题把三种机制混为一谈（OR 算子支持、词项级否定、语义级反例）；词法后端对显式否定线索并非无能（BM25 比 dense embedding 抓得好）；可由检索架构+训练数据缓解，非"完全不可治"。

**对 #20 状态的影响**：保持**候选（P2 失败遗产）**。现成结论**支持** #20 的核心判断（提示词层不可治），但修正了"完全不可治"的绝对说法——可由检索策略+架构缓解。理想机制列的"分拆负向短语单发"已被现成结论验证为正确方向。

**关键来源**：
- [NevIR EACL'24](https://aclanthology.org/2024.eacl-long.139.pdf)
- [NegBench MIT](https://news.mit.edu/2025/study-shows-vision-language-models-cant-handle-negation-words-queries-0514)
- [DDG 算子下线 gHacks](https://www.ghacks.net/2023/04/24/duckduckgo-disables-most-search-filters-from-search)
- [BioGen TREC'25](https://arxiv.org/html/2603.17580)

### 5.4 #21 多样性排序 — LLM 提示词层算分可靠性

**核心命题**：LLM 在提示词层做数值算分（DiversityPenalty ±2）不可靠，量级压不过 SourceWeight ±10。

**裁决**：**成立，且比直觉更深**。三重叠加：
1. LLM 算术本身不准（NumericBench：简单加减都达不到 100%，next-token 范式与算术进位逻辑相反）
2. 数值分被"压缩"（评分误差 σ²≈0.21 vs 基线 0.87，4 倍方差压缩），±2 落在噪声地板内
3. pointwise 逐条打分是排序家族里方差最大、最不稳定的范式，提示噪声影响比算法本身还大

**工程结论**：算分必须出 LLM、进算法层。LLM 只做语义判断（输出离散标签/布尔，不输出分数），数值合成与排序交给确定性代码。若必须 LLM 参与排序，用 pairwise/setwise 而非 pointwise。

**对 #21 状态的影响**：保持**候选（P2 失败遗产）**。现成结论**强支持** #21 的核心判断（提示词层算分不可靠），且给出了比原判断更深的机理（三重叠加）。

**关键来源**：
- [NumericBench arXiv'25](https://arxiv.org/html/2502.11075v1)
- [LLM 评分压缩 arXiv'25](https://arxiv.org/html/2602.13862v2)
- [LLM-as-a-Judge 偏差 arXiv'25](https://arxiv.org/html/2506.22316v2)
- [零样本 LLM 排序大规模研究 arXiv'24](https://arxiv.org/html/2406.14117v1)

### 5.5 #22 Browser Fetch — headless 浏览器是否"唯一对路径方案"

**核心命题**：Playwright/headless Chromium 是穿透 Cloudflare JS Challenge 的唯一对路径方案。

**裁决**：**命题需修正**。真实浏览器内核是**必要执行环境**（JS Challenge 必须真实 JS 执行），但**既非唯一**也**不充分**：
- 非唯一：老式挑战有 cloudscraper/FlareSolverr 旁路；引擎级工具 nodriver/Camoufox 更隐蔽；托管云浏览器另成一路
- 不充分：裸 headless 必被识别，需叠加 stealth 补丁 + 住宅代理 + 拟人化行为 + CAPTCHA solver

**工程结论**：headless 浏览器是"地基"不是"整栋楼"。稳定方案是"住宅代理 + 真实浏览器 + solver"多层叠加，让单层失效不至于崩盘。

**对 #22 状态的影响**：保持**候选（暂缓）**。现成结论**修正**了原命题的"唯一"措辞，但**不改变**暂缓决策——触发条件（Tier C snippet-only 被证明严重影响答案质量）未变。若未来启动，应选多层叠加方案而非裸 Playwright。

**关键来源**：
- [Browserless](https://www.browserless.io/blog/how-to-bypass-cloudflare-scraping)
- [Scrapfly stealth](https://scrapfly.io/blog/posts/playwright-stealth-bypass-bot-detection)
- [ByteTunnels nodriver/Camoufox](https://bytetunnels.com/posts/playwright-vs-selenium-stealth-which-evades-detection-better)

### 5.6 汇总表

| 机制 | 原状态 | 现成结论影响 | 是否需自实验 |
|------|--------|-------------|-------------|
| P1 Goggles | active | 支持降级实现合理性，明确长尾天花板 | 否 |
| P4 Same-Source Merge | active（已机制化） | 逐字场景 overkill，语义场景有真正价值 | 仅语义场景需补评测（已补） |
| #20 反证检索 | 候选 | 支持核心判断，修正"完全不可治" | 否 |
| #21 多样性排序 | 候选 | 强支持核心判断，给出更深机理 | 否 |
| #22 Browser Fetch | 候选（暂缓） | 修正"唯一"措辞，不改变暂缓决策 | 否（启动时选多层方案） |

**净变化**：5 个机制均无需自实验，避免与现成研究重复。唯一仍需自实验的是 **P6 Highlights**（提示词层抽取保真度，无现成结论覆盖）和 **P3 三档模式**（项目自创设计，附带在 Run #10 观察）。

---

## 6. 可复用产物

### 6.1 三类可复用资产

| 类型 | 产物 | 位置 | 适用对象 |
|------|------|------|---------|
| 框架 | A/B 测试模板 | [ab-test-template.md](../../skills/search-orchestrator/examples/ab-test-template.md) | 任何提示词改造项的验证 |
| 框架 | 评分阈值体系 | [02-methodology.md §2](02-methodology.md) | 4 种尺度的通过 / 回退门槛 |
| 框架 | GT 密封流程 | [02-methodology.md §3](02-methodology.md) | 防止执行者向 GT 靠拢 |
| 代码 | 反-bot 节流 wrapper | [search-mcp-wrapper/](../../search-mcp-wrapper/) | 任何用 DDG MCP 的项目 |
| Skill | search-orchestrator | [skills/search-orchestrator/SKILL.md](../../skills/search-orchestrator/SKILL.md) | Cline 用户开箱即用 |

### 6.2 三条工程经验

| 经验 | 出处 | 适用场景 |
|------|------|---------|
| 评测设计本身需迭代——识别天花板归因再跑下一轮 | Run #9 → #9b → #9c → #13 → #14 | 任何 A/B 评测 |
| HTTP Success ≠ Content Success | Run #8a | 验证基础设施时区分协议层与语义层 |
| 提示词层算分不可靠，必须出 LLM 进算法层 | Run #2/#3 + NumericBench | 任何 LLM 评分 / 排序场景 |

### 6.3 与传统 prompt engineering 评测的差异

| 维度 | 传统做法 | 本框架 |
|------|---------|--------|
| 评测对象 | LLM 输出质量（主观） | 提示词改造的**净增量**（客观） |
| 评测方法 | 人打分 / LLM-as-a-Judge | A/B 双盲 + 量化指标 |
| 评测粒度 | 整体 impression | Recall / False Positive / Info Loss 等分项 |
| 评测门槛 | "看起来更好" | 预设阈值（如 Δ ≥ +15%）触发 promote |
| 失败处理 | 调提示词再试 | 跑下一轮，识别天花板归因 |
| 证伪价值 | 视为"实验失败" | 视为"识别收益天花板"的契机，派生下一轮方向 |

---

## 7. 三个研究问题的回答

### RQ1 — 可提示词等效实现？

**12 项手法中 5 项可等效**（M4 highlights / M6 Goggles / M8 Citation / M1 深度档位 / M11 失败处理），3 项明确放弃（M3 include_answer / M5 output_schema / M9 multi-agent），2 项后端限制不可治（M2 自动改写 / M10 query rewriting）。**核心收益区已全部覆盖**——M6 Goggles 与 M8 Citation 是商业 agent 借鉴价值最高、改造成本最低的两项，均已落地。

### RQ2 — 能否经受双盲 A/B + 量化评分？

**6 项通过，4 项证伪**。证伪路径本身是方法论成功的证据——Run #9 → #9b → #9c → #13 → #14 的迭代链展示了"识别天花板 → 调整证据集 / 指标 → 再跑下一轮"的可复现评测模式。

### RQ3 — 哪些问题不是提示词可治？

**3 类问题必须下沉**：

| 问题 | 下沉去向 | 落地 |
|------|---------|------|
| LLM 算分不可靠 | 算法层代码 | #21 候选（暂缓） |
| 负向 query 召回差 | 检索架构 + 训练数据 | #20 候选（暂缓） |
| DDG BOT_DETECTED 节流 | MCP wrapper 代码 | ✅ #24 已落地 |

---

## 8. 一句话总结

> **80% 的商业 agent 搜索工程动作可以在零 API key / 零付费后端的开源栈上提示词等效实现；剩余 20% 是后端 / 算法层问题，必须下沉到代码。本研究的价值不在"实现了一个 search skill"，而在于把"是否有效"从主观感觉升级为可复现的量化评测——14 轮实验里 6 个 active 机制与 4 条证伪路径同样重要，因为证伪本身识别了结构化中间表示的收益天花板。**
