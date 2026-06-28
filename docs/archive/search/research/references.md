# 参考文献

> 本文件汇总本研究援引的外部学术 / 工程结论。引用原则见 [00-overview.md §核心方法论](00-overview.md)：当某机制的判断已被现成研究覆盖时，直接援引结论，避免与现成研究重复自实验。
>
> 详见 [survey.md §10 现成结论引用](../search-orchestrator/survey.md) 与 [搜索结论.md](../search-orchestrator/搜索结论.md)。

---

## 1. 学术论文（Peer-reviewed / arXiv）

### 1.1 检索与排序

| 文献 | 链接 | 在本研究中的作用 |
|------|------|-----------------|
| **NevIR** (EACL 2024) | https://aclanthology.org/2024.eacl-long.139.pdf | 支撑 #20「反证检索」核心判断：多数神经检索模型在否定 query 上等于或低于随机排序；"语义坍缩"使否定信号在向量空间不可分。结论是提示词层不可治，须由检索策略 + 架构缓解 |
| **NumericBench** (arXiv 2025) | https://arxiv.org/html/2502.11075v1 | 支撑 #21「多样性排序」核心判断：LLM 算术本身不准，简单加减都达不到 100%；next-token 范式与算术进位逻辑相反 |
| **LLM 评分压缩** (arXiv 2025) | https://arxiv.org/html/2602.13862v2 | 支撑 #21 更深机理：评分误差 σ²≈0.21 vs 基线 0.87，4 倍方差压缩使 ±2 落在噪声地板内 |
| **LLM-as-a-Judge 偏差** (arXiv 2025) | https://arxiv.org/html/2506.22316v2 | 支撑 #21：pointwise 逐条打分是排序家族里方差最大、最不稳定的范式 |
| **零样本 LLM 排序大规模研究** (arXiv 2024) | https://arxiv.org/html/2406.14117v1 | 补充证据：零样本 LLM 排序在量级 / 稳定性两个维度都不足以替代算法层排序 |
| **BioGen** (TREC 2025) | https://arxiv.org/html/2603.17580 | 反证检索方向的对照基准，验证"分拆负向短语单发"是正确方向 |

### 1.2 信息检索经典方法

| 文献 | 链接 | 在本研究中的作用 |
|------|------|-----------------|
| **Manning IR Book §19.6** | https://nlp.stanford.edu/IR-book/html/htmledition/near-duplicates-and-shingling-1.html | P4 同源去重的 IR 经典方法对照：SimHash / shingling + MinHash |
| **Manku et al.** (Google, WWW 2007) | https://research.google.com/pubs/archive/33026.pdf | 近重复检测工业级实现，证明逐字场景下提示词层 P4 是 overkill 但功能等价 |
| **Henzinger** (DOCENG 2013) | https://clgiles.ist.psu.edu/pubs/DOCENG2013-near-duplicate-detection.pdf | 语义级近重复检测的局限：现成句法指纹"做不好"，提示词层 LLM 在改写 / 洗稿 / 翻译场景可能真正更强 |

### 1.3 域名级排序

| 文献 | 链接 | 在本研究中的作用 |
|------|------|-----------------|
| **Brave Goggles 白皮书** | https://brave.com/static-assets/files/goggles.pdf | P1 Domain Goggles 的原设计来源：召回阶段对数万候选硬过滤；明确提示词层软过滤的结构性天花板（长尾召回不可恢复） |
| **RankGPT** | https://github.com/sunnweiwei/rankgpt | LLM reranking 的学术对照，提示词层软重排的精度边界参考 |

---

## 2. 工程 / 产品参考

| 来源 | 链接 | 在本研究中的作用 |
|------|------|-----------------|
| **Brave Rerank 博客** | https://brave.com/blog/search-rerank | 商业搜索引擎 rerank 工程实践对照 |
| **NegBench (MIT)** | https://news.mit.edu/2025/study-shows-vision-language-models-cant-handle-negation-words-queries-0514 | 跨模态否定理解失败，与 NevIR 互证 |
| **DDG 算子下线 (gHacks)** | https://www.ghacks.net/2023/04/24/duckduckgo-disables-most-search-filters-from-search | DDG 特异性：基于 Bing，2023 年起大部分算子（site: / OR 等）被下线，#20 中"后端能力限制"字面成立 |
| **Browserless** | https://www.browserless.io/blog/how-to-bypass-cloudflare-scraping | #22 Browser Fetch：Cloudflare JS Challenge 穿透方案对比 |
| **Scrapfly stealth** | https://scrapfly.io/blog/posts/playwright-stealth-bypass-bot-detection | #22：裸 Playwright 必被识别，需 stealth 补丁 + 住宅代理 + 拟人化多层叠加 |
| **ByteTunnels** | https://bytetunnels.com/posts/playwright-vs-selenium-stealth-which-evades-detection-better | #22：nodriver / Camoufox 引擎级工具对比，修正"唯一对路径方案"措辞 |

---

## 3. 上游依赖

本项目 wrapper 层包裹以下上游：

| 依赖 | 仓库 | 在本研究中的作用 |
|------|------|-----------------|
| **duckduckgo-websearch** (HeiSir2014) | https://github.com/HeiSir2014/duckduckgo-mcp-server | #24 wrapper 的被包裹对象。源码评估证明 `search()` 方法是黑盒：内部 3 次线性重试 `[1s, 2s]` + 无延迟无 jitter 分页循环 + 进程级单例 cookieJar。这些是 wrapper 设计的直接依据 |
| **@modelcontextprotocol/sdk** | https://github.com/modelcontextprotocol/servers | wrapper MCP server 的 SDK 基础 |

---

## 4. 项目内部权威文件

研究文档的结论来源，按权威性排序：

| 文件 | 路径 | 职责 |
|------|------|------|
| **survey.md §9 / §10** | [../search-orchestrator/survey.md](../search-orchestrator/survey.md) | 决策表 / 实验表 / 路线状态 / 现成结论引用 |
| **搜索结论.md** | [../search-orchestrator/搜索结论.md](../search-orchestrator/搜索结论.md) | 5 个机制援引现成结论的详细推理 |
| **mechanism-candidates.md** | [../mechanism-candidates.md](../mechanism-candidates.md) | 24 条机制候选清单与状态 |
| **decisions/** | [../decisions/](../decisions/) | 6 份决策文档（D-2026-06-23 ~ D-2026-06-26） |
| **experiments/** | [../search-orchestrator/experiments/](../search-orchestrator/experiments/) | 14 轮 Run 实验归档 |
| **SKILL.md** | [../../skills/search-orchestrator/SKILL.md](../../skills/search-orchestrator/SKILL.md) | search-orchestrator skill 本体（6 active 机制 + Gap Ledger） |
| **ab-test-template.md** | [../../skills/search-orchestrator/examples/ab-test-template.md](../../skills/search-orchestrator/examples/ab-test-template.md) | A/B 双盲评测框架模板（可复用产物） |

---

## 5. 引用规约

- 外部学术 / 工程结论引用时，**必须**同时给出文献名 + 链接 + 在本研究中的具体作用（避免"装饰性引用"）
- 项目内部文档引用时用相对路径链接，不用绝对路径
- 当某判断被现成结论覆盖时，**不**重复自实验；当无现成结论覆盖（如 P6 Highlights 提示词层抽取保真度、P3 三档模式项目自创设计）时，必须自实验
- 现成结论若修正原命题措辞（如 #20"完全不可治" → "可由检索策略 + 架构缓解"），须在对应机制文档与 survey.md §10 同步修正
