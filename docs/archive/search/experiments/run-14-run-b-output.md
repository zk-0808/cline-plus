# Run B 输出：Gap Ledger + Final Answer

> **依据**: Run 14 Phase 0 Evidence Pool（2026-06-26 采集），即 Run A 输出中引用的 E1–E18 及 §2/§3/§5 等全部证据  
> **注意**: 本文件不包含外部资料，所有判断均基于给定 evidence pool；Step 1（Gap Ledger）与 Step 2（Final Answer）之间没有交叉污染

---

## Step 1 — Gap Ledger（强制证据缺口枚举）

逐一扫描用户问题涉及的每个子维度，显式列出证据缺口。每个条目包含：gap 描述、gap 类型、相关 evidence id、当前子问题可达到置信度。

### 1.1 Playwright — 有效性 & 被识别风险

| # | gap 描述 | gap 类型 | evidence id | 置信度 |
|---|---------|---------|-------------|-------|
| G1 | Playwright 在 VPS 上 Pro 通过率 **2%**、Enterprise **≈0%** 来自 HumanBrowser 单次测试。HumanBrowser 是商业反检测浏览器服务，其 12 方法对比表缺乏独立第三方复现。原陈述"≈2%""≈0%"看似有量化支撑，实则源头单一、方法学透明性证据不足。 | **单一来源** + 来源偏差（商业博客自测） | E1（引用 HumanBrowser 博文） | low |
| G2 | Cloudflare ML v9 加权了 JA4、HTTP/2 frame 排序、行为遥测——但 Playwright 在这三个信号维度上分别**具体**暴露什么、Stealth 补丁覆盖了多少、未覆盖哪些，evidence pool 中无逐项对标分析。E4（JA3 指纹不匹配）和 E5（ML v9 部署）只是各自提及一个片段，缺少将两者关联起来的系统性测试。 | **无直接对比**（Playwright 各检测层的覆盖缺口未逐项列明）| E4, E5 | low |
| G3 | **Cross-browser comparison missing**: Playwright 对 Chromium / Firefox / WebKit 三种浏览器在 Cloudflare 下的分浏览器通过率数据完全缺失。Playwright 并不限制浏览器类型，但所有 evidence 只讨论了 Chromium。是否切换 Firefox 或 WebKit 引擎可以改变 JA3 指纹或降低被识别风险，完全未知。 | **范围外推**（仅测试 Chromium，结论被推广到 Playwright 全部）| E1, E4 | low |
| G4 | Node.js 生态的 `playwright-extra` + `puppeteer-extra-plugin-stealth` 是否已过时？Scrapfly 指 Python 的 playwright-stealth v2.x 活跃维护而 Node.js 生态落后 [§2.5]，但 Pro 级通过率数据中未区分这两种语言栈。人类读者可能以为"Playwright 有效/无效"是跨语言统一的，证据池中无此对比。 | **无直接对比**（Python vs Node.js stealth 插件有效性） | §2.5 | low |

### 1.2 nodriver / undetected-chromedriver — 有效性 & 被识别风险

| # | gap 描述 | gap 类型 | evidence id | 置信度 |
|---|---------|---------|-------------|-------|
| G5 | **`tab.cf_verify()` 实际成功率未知**。nodriver 的自述文档声称内置 Turnstile 自动点击功能（依赖 opencv-python 视觉识别），但 evidence pool 中既无该功能在 Pro/Enterprise 站点上的独立实测数据，也无与 Camoufox、Scrape.do API 的横向对比。Run A 已注明"该功能的实际成功率缺乏独立验证数据"。 | **缺反证**（positive claim 无独立验证） / **无直接对比**（与其他 Turnstile 方案对比） | §2.18, E8 | low |
| G6 | undetected-chromedriver VPS 下 Pro 约 **8%** / Enterprise **0%**——与 Playwright 的 2%/0% 同源（HumanBrowser 单次测试），重复单一来源问题。两者数值差异（8% vs 2%）是否统计显著无从判断。 | **单一来源** + 无统计显著性判断 | §2.2 | low |
| G7 | undetected-chromedriver 的 Turnstile 失败结论来自 Scrape.do 2026-01-26 发布的内容。到 2026-06，undetected-chromedriver 可能有更新，但 evidence pool 无此后版本的独立测试。| **证据过时**（5 个月前发布，反爬环境快速演进）| E18, §2.7 | low |

### 1.3 Camoufox — 有效性 & 被识别风险

| # | gap 描述 | gap 类型 | evidence id | 置信度 |
|---|---------|---------|-------------|-------|
| G8 | **Camoufox canvas 伪装失败** 结论来自 Kameleo 自有博客——Kameleo 是 Camoufox 的直接商业竞争对手。Run A 已明确指出该结论"可能存在商业偏差"。在无独立第三方复现的情况下，该缺陷描述不能视为已确认事实。 | **单一来源** + 来源偏差（竞争对手声称） | E10 | low |
| G9 | Camoufox 基于 **Firefox 135**（当前最新 138，差距 3 个次要版本）。Firefox 引擎更新是否改变指纹一致性的量化风险——有多少检测面失效、失效速度多快——evidence pool 中无数据。该 gap 的实质是："版本滞后"本身是已知风险，但**风险敞口的具体量化**缺失。 | **范围外推**（版本滞后 → 安全性下降，但下降幅度无数据） | §2.10 | low |
| G10 | Camoufox 的速度标为"Slow"（Scrape.do 标注），但 **无具体延迟对比数据**——与其他方案在首字节时间、页面加载时间、每次请求总耗时上的逐项对比缺失。如果"慢"是 2x 还是 20x 的差距，决策完全不同。 | **无直接对比**（无跨方案延迟/Latency 量化数据）| §2.7 | low |
| G11 | Camoufox 在 CreepJS 上"与真人浏览器无法区分"来自 ScrapingBee 独立评测——但 ScrapingBee 本身也是一家商业爬虫 API 服务商。其评测方法学的独立性（测试条件、样本量、CreepJS 版本）未在 evidence pool 中透明呈现。 | **来源偏差**（评测方本身为商业竞争对手）| E9 | medium |

### 1.4 FlareSolverr — 有效性 & 被识别风险

| # | gap 描述 | gap 类型 | evidence id | 置信度 |
|---|---------|---------|-------------|-------|
| G12 | FlareSolverr + 代理 VPS 下 Pro 约 **3%** / Enterprise **0%**——再次来自 HumanBrowser 单次测试。三个方案（Playwright、undetected-chromedriver、FlareSolverr）的通过率全部源自同一测试、服务商 HumanBrowser，重复同一单一来源问题。 | **单一来源**（HumanBrowser 一家包揽多个方案的通过率数据） | §2.2 | low |
| G13 | FlareSolverr challenge 检测不完整的 Issue #1734 报告是单一用户报告，证据 pool 未提供该 Issue 是普遍性问题还是特定站点下的偶发行为。类似 Issue #771/#783 引自 §1 Q4 但具体细节（站点特征、FlareSolverr 版本）未呈现。 | **缺反证**（多份 Issue 存在检测漏报，但未验证在哪些条件下必现） | E12 | low |
| G14 | Byparr 作为 FlareSolverr 替代尝试，在 evidence pool 中"成熟度尚待验证"——即 name only，无可用的测试数据或架构描述。 | **缺反证**（零数据）| §1 Q4 #7 | low |

### 1.5 cloudscraper — 有效性

| # | gap 描述 | gap 类型 | evidence id | 置信度 |
|---|---------|---------|-------------|-------|
| G15 | cloudscraper 被归为"已被淘汰"——这个判断本身合理且多源确认，但 **它作为侦察工具的具体有效性（比如能否可靠区分 CF 旧版 JS check vs v2 challenge vs Turnstile）无数据**。如果它可以作为防护等级探测的低成本手段，其价值不应被完全忽略。 | **范围外推**（"不能作为穿透手段"→"完全无用"，中间缺了"侦察用途"的评估） | E13, E14, §2.14, §2.15, §2.16 | medium |

### 1.6 托管云浏览器 — 有效性 & 被识别风险

| # | gap 描述 | gap 类型 | evidence id | 置信度 |
|---|---------|---------|-------------|-------|
| G16 | **Q6 直白型搜索失败**（DDG 因 OR 复合查询返回 0 结果）。这意味着托管云浏览器的全部证据实际上依赖于：(1) HumanBrowser 自我发布的对比数据；(2) Browserless/Scrapfly 官方博客。两者均为**服务商自己的话语场**，缺乏独立第三方横向评测。 | **缺反证** + **单一来源**（搜索故障导致证据来源极端偏窄）| §1 Q6 状态 | low |
| G17 | HumanBrowser 的托管方案 Pro **97%** / Enterprise **78%** —— 这是所有方案中最高的通过率，但 HumanBrowser 自身是否参与了该托管方案的测试？evidence pool 中无明确说明"HumanBrowser 的 '托管方案' 是否包括其自身服务"。如果是自测自评，则该数据不可视为独立评估。 | **来源偏差**（可能为自测自评，非第三方独立测试） | §2.2 | low |
| G18 | Browserless 和 Scrapfly 的技术博文描述了其**架构设计**（headed 模式、cookie 持久化、旋转代理等），但**未给出通过率量化数据**。这些文章是"方案介绍"而非"有效性基准测试"。 | **缺反证**（有架构描述无量化通过率）| §2.3, §2.5 | low |

### 1.7 住宅代理 & CAPTCHA 依赖

| # | gap 描述 | gap 类型 | evidence id | 置信度 |
|---|---------|---------|-------------|-------|
| G19 | **Q7 直白型搜索未成功执行**——第 3 次搜索熔断触达降级，代理/CAPTCHA 依赖的判断全部由 Scrape.do、Evomi、IPRoyal 等商业博客间接覆盖。这意味着"代理 × CAPTCHA"交叉维度的专门横向对比证据**为零**。 | **缺反证** + **无直接对比**（部分搜索降级，该子维度覆盖不足）| §5（搜索状态描述）| low |
| G20 | **住宅代理对 CAPTCHA 出现率的影响未知**：HumanBrowser 数据展示了住宅 IP 提升通过率，但未说明住宅 IP 是否减少了 CAPTCHA 的触发频次。换句话说，代理提升通过率是因为减少了 CAPTCHA 出现，还是因为 CAPTCHA 通过后被挑战的概率降低？两者之间是不同机制。 | **缺反证**（代理→通过率的因果关系链路不透明）| §2.2 | low |
| G21 | **CAPTCHA 解决服务的成本/延迟/成功率数据完全缺失**：evidence pool 提及 2captcha、capsolver 等第三方服务，但无任何基准数据——每次解决的延迟分布、成功率（与 CF Turnstile 版本相关）、批量和按次定价。这些是对比"自建方案 vs 托管方案"经济账的关键参数。 | **缺反证**（零数据）| §2.12 | low |
| G22 | **住宅代理质量分层缺失**：干净的住宅代理、数据中心代理、ISP 住宅混合代理——不同类型的代理在被识别风险和 CAPTCHA 触发率上有巨大差异，但 evidence pool 中代理相关的讨论全部停滞在"住宅代理"这一粗粒度标签，无分层比较。 | **无直接对比**（代理类型/质量的细粒度对比） | §2.13, E7 | low |

### 1.8 被识别风险（跨方案横向）

| # | gap 描述 | gap 类型 | evidence id | 置信度 |
|---|---------|---------|-------------|-------|
| G23 | **跨方案指纹信号泄漏对比完全缺失**：Playwright（JA3 不匹配）、Camoufox（canvas 争议）、FlareSolverr（headless 浏览器指纹）——各方案的检测风险点在不同章节被独立讨论，但没有一张统一的表格对比各方案的 JS 特征信号数量、TLS/JA4 指纹差异性、WebDriver/CDC 标志暴露情况等。 | **无直接对比**（跨方案指纹泄漏对标分析） | 各节分散提及 | low |
| G24 | **HTTP/2 fingerprinting 和 JA4 在除 Playwright 外其他方案上的状态完全未知**：E5 提到了 ML v9 加权了 JA4 和 HTTP/2 frame 排序，但 Camoufox（Firefox 135）、nodriver（CDP 直连）、FlareSolverr 各自是否改变了 HTTP/2 帧特征、JA4 签名是否与真实浏览器一致，evidence pool 无任何信息。 | **缺反证**（ML v9 检测维度已知，但各方案的对应性未被验证）| E5 | low |
| G25 | **"行为分析"的具体指标在各方案上的暴露情况无数据**：ML v9 包括"行为遥测数据"[E5]，但 Playwright 的 `page.mouse.move()` 是否足够模拟真人光标、nodriver 的行为时序是否可被识别、Camoufox 在 Firefox 层是否有行为仿真——这些东西在 evidence pool 中完全不存在。 | **缺反证**（行为层检测维度被提及但未被测试） | E5 | low |

### 1.9 适用边界（跨方案横向）

| # | gap 描述 | gap 类型 | evidence id | 置信度 |
|---|---------|---------|-------------|-------|
| G26 | **Q8 适用边界的直白型搜索未成功执行**——该子维度的证据全部是"从已有方案数据中推演或综合"得到的，不是专门的横向比较研究。这导致 §8 中的"选择框架"本质上是一种**逻辑推理而非直接证据支撑的分类**。 | **无直接对比**（搜索未覆盖，适用边界框架为推理产物）| §1 Q8 状态, §5 | low |
| G27 | **各方案的 Throughput/Latency/Cost 横向对比数据完全缺失**。适用边界不仅是"能否穿透保护"，还涉及"每秒多少请求、每次多快、每千次多少钱"。这些对工程选型至关重要的维度的 evidence pool 中为零。 | **缺反证**（零数据）| 全证据池 | low |
| G28 | **Rate limiting 策略与应对方法缺失**：即使穿透了 Cloudflare challenge，站点的速率限制（rate limiting）仍是瓶颈。各方案对 rate limiting 的应对能力（自动退避、重试策略、请求间隔控制）比较完全缺失。 | **缺反证**（零数据）| 全证据池 | low |
| G29 | **Web Bot Auth opt-in 采用率数据缺失**：E15 介绍了该机制的存在，但已 opt-in 的站点数量、增长率、长尾站点覆盖率均无数据。Run A 虽然准确批评了"覆盖范围极窄"，但"极窄"是定性判断，不是量化评估。 | **缺反证**（opt-in 率的量化数据为零）| E15 | low |

### 1.10 证据池自身的方法学缺陷

| # | gap 描述 | gap 类型 | evidence id | 置信度 |
|---|---------|---------|-------------|-------|
| G30 | **R2（限域型搜索）和 R3（反证型搜索）全部未执行**——DDG 的 `site:` 查询持续触发 bot detection [§5]。这意味着 Reddit、HN、Twitter/X 等社区中关于各方案实际使用体验、失败案例、隐坑的讨论完全未收录。证据池整体缺少"失败故事"视角。 | **缺反证**（系统性反证搜索未执行）| §5 | low |
| G31 | **HumanBrowser 12 方法对比表**是 evidence pool 中最核心的量化数据来源（覆盖 Playwright、undetected-chromedriver、FlareSolverr 等多个方案的通过率），但它全部来自 HumanBrowser 一家。该机构的样本量（500 请求/变体 × 8 站点）、测试站点选择、IP 池配置、数据收集方法在 evidence pool 中未呈现原始文档。 | **单一来源** + 方法学透明度不足 | §2.2, §3 | low |
| G32 | **证据时效性梯度不平衡**：Scrape.do（2026-01-26）的评测在 1 月发布，到 6 月已过 5 个月；Camoufox Firefox 135 vs 138 暗示某些评测可能内置了过时的浏览器版本。但无法区分哪些具体结论因时效过期而不可靠。 | **证据过时**（部分来源 5 个月以上，反爬环境快速变化） | §3, §2.1 (AlterLab 报告"since 2024 detection rate 3x increase") | low |

---

## Step 2 — Final Answer

### 前置声明

本最终答案严格基于 Run 14 Phase 0 evidence pool（E1–E18 及 § 节引用）。根据 Gap Ledger 中 G30–G32 的系统性缺陷——R2/R3 搜索未执行、核心数据仅 HumanBrowser 单一来源、部分证据时效性过期——**以下所有量化通过率数据均应视为指标性而非结论性的，且无法覆盖社区真实使用中可能遇到的"失败案例"视角**。

---

### 总体格局：2026 年不存在"一个方案通关"的事

2026 年 Cloudflare 反爬体系已经演变为一个**三层叠加检测系统**：IP 信誉/ASN 分类层 + 浏览器指纹/TLS 指纹层 + 行为分析层 [E2]。ML v9 于 2026 Q1 全线部署，进一步强化了 TLS 指纹（JA4）、HTTP/2 frame 排序、行为遥测三个信号 [E5]。这个三层架构意味着：**不存在单一魔法开关，只存在一个必须同时堆叠的多层方案栈** [E17]。

换句话说，2026 年评价一个方案的标准不是"它能不能绕过 Cloudflare"，而是"它解决了三层中的哪几层、缺了什么层、通过什么配套补上"。

---

### 方案逐项评估

#### Playwright

- **有效性（对应 Gap G1, G3, G4）**：stock Playwright + 数据中心 IP → Pro 约 **2%** / Enterprise **≈0%**。该数据仅来自 HumanBrowser 单次测试（G1），且仅限于 Chromium（G3），Python/Node.js 的 stealth 生态在证据池中未区分测试（G4）。**置信度 low**。
- **被识别风险**：Playwright/Cromium 的 JA3 指纹与任何真实 Chrome 发行版不匹配 [E4]，在 TLS 握手阶段即可被标记。Stealth 插件修补了 `navigator.webdriver`、plugins、`chrome.runtime` 等表面特征，但不解决 JA4/HTTP2/行为层 [E3]。Playwright 在 Firefox/WebKit 下的 JA3 指纹状态完全未知（G24）。
- **可行路径**：Playwright 必须与住宅代理、真实移动端指纹、类人操作节奏三层同时部署。HumanBrowser 数据中"住宅 + iPhone FP + human input"组合 → Pro ~95%/Enterprise ~75% [§2.2]。但该组合数据同样源自 HumanBrowser 单一测试（G1），且不具备跨测试床的可复现性验证。

#### nodriver / undetected-chromedriver

- **有效性（对应 Gap G5, G6, G7）**：undetected-chromedriver VPS 下 Pro ~8%/Enterprise 0% [§2.2]——与 Playwright 同为 HumanBrowser 单一来源（G6）。nodriver 的 `tab.cf_verify()` 声称可自动点击 Turnstile，但**该功能的实际成功率在证据 pool 中零独立验证**（G5），不应视为已证实的能力。
- **核心差异**：nodriver 通过 CDP 直连浏览器、脱离 chromedriver/Selenium [E8]，这可能在 Turnstile 处理上有实质改进，但无量化数据支撑。undetected-chromedriver 被 Scrape.do（2026-01 评测，已过时 5 个月）确认无法绕过 Turnstile [E18]，且无变通方案（G7）。
- **适用边界**：两者需配合住宅代理且目标站点无 Enterprise 级保护时才可选。如站点启用 Turnstile，nodriver 可能优于 undetected-chromedriver，但**该假设无独立验证**。

#### Camoufox

- **有效性（对应 Gap G8–G11）**：Camoufox 是目前 evidence pool 中唯一在 C++ 层（引擎层）模拟指纹的开源方案。ScrapingBee 独立评测称其 CreepJS 得分"与真人无法区分"（但 ScrapingBee 本身也是商业爬虫服务商，G11）[E9]。Run A 已覆盖的 Kameleo 声称 canvas 伪装失败——此结论需独立复现才可采信（G8）。
- **已知限制**：Firefox 135 基础（当前 Fx 138）可能导致指纹随时间衰减，但**衰减速度无量化数据**（G9）；速度标为"Slow"但无跨方案延迟对比（G10）；无指纹库管理、无浏览器池管理、仅支持 Playwright/Python [§2.10]。
- **被识别风险**：相比 Playwright，Camoufox 在引擎级解决了"隐身代码本身被检测"的问题 [E16]，但其 HTTP/2 帧特征和 JA4 签名在 evidence pool 中完全未验证（G24），存在被 ML v9 在高频请求下标记的未评估风险。

#### FlareSolverr

- **有效性（对应 Gap G12–G14）**：FlareSolverr + 代理 VPS 下 Pro ~3%/Enterprise 0%，被 HumanBrowser 标为 "Dead" [§2.2]。但该数据仍出自 HumanBrowser 单次测试（G12）；如果配合干净住宅代理而非代理 VPS，其通过率可能不同——但无此方向的数据。
- **已知限制**：Issue #1734 报告了 challenge 检测不完整（漏过部分 CF 挑战页）[E12]；每个请求启动独立 headless 浏览器导致内存消耗巨大；Turnstile 支持需结合第三方 CAPTCHA 解决服务 [§2.12]——但解决服务的延迟/成功率/成本数据在证据池中完全不存在（G21）。
- **适用边界**：仅适用于旧式 CF JS challenge（非 Turnstile 非 Enterprise），且需配合干净住宅代理。对 2026 年主流站点效果已不可接受。

#### cloudscraper

- **有效性**：已被反爬演进明确淘汰。原项目限制在 Python 2.6–3.7 环境，遇到 v2 challenge 直接抛出 `CloudflareChallengeError` [E14]。仅适用于 CF 旧版 "I'm Under Attack Mode"（TB 级 JS 检查）[E13]。
- **侦察用途（对应 Gap G15）**：cloudscraper 作为穿透手段已不可用，但它是否可作为"探测目标站点是否部署了最低级 CF 防护"的低成本侦察工具——这一用途在 evidence pool 中无测试数据（G15）。

#### 托管云浏览器服务

- **有效性（对应 Gap G16–G18）**：HumanBrowser 测试中托管方案在 Pro 下 **~97%**、Enterprise **~78%** [§2.2]，是 evidence pool 中所有方案中表现最好的。但该数据可能为 HumanBrowser 自测自评（G17），且 Q6 直白型搜索失败导致该子维度的证据来源极端偏窄——仅有 HumanBrowser（可能是自测）和 Browserless/Scrapfly 官方博文（架构介绍无量化通过率，G18）。
- **被识别风险**：托管服务提供商的优势在于实时维护对抗更新——Browserless 的技术博文详细说明了 headed 模式、cookie 持久化、旋转代理 + 动态 CAPTCHA 检测的架构 [§2.3]。但**托管服务商自身的 IP 段是否已被 Cloudflare 信誉系统批量标记**——证据池无任何信息。换言之，托管方案的高通过率可能是暂时的，一旦服务商的数据中心 IP 段被标记，整个方案栈可能崩溃。
- **关键约束（Run A §6 已覆盖）**：没有一种绕过方式能永远持续——Cloudflare 按自己的节奏推出新检测信号 [§2.3]。托管方案的优势在于服务商快速更新对抗策略而非技术本质上的不可突破。

---

### 住宅代理与 CAPTCHA 依赖

住宅代理的作用量级在 evidence pool 中有大量间接覆盖但缺少专门横向对比（G19）：

| 方案栈 | Pro 通过率 |
|--------|-----------|
| 数据中心 IP 仅 | ~2–8%（方案间差异可能不统计显著）|
| 仅更换住宅 IP | ~35% |
| 住宅 IP + stealth FP | ~70% |
| 住宅 IP + 真实移动端指纹 + 类人操作 | ~95% |

该数据来自 HumanBrowser 一家（G1, G6, G12 复用的同一组测试），且未说明住宅代理到 CAPTCHA 出现率之间的因果关系（G20——住宅 IP 是减少了 CAPTCHA 的触发，还是提高了 CAPTCHA 被通过的概率？）。**代理类型分层**（干净的住宅代理 vs ISP 混合代理 vs 代理池垃圾 IP）的数据也完全缺失（G22）。

CAPTCHA（Turnstile）的分水岭效应是 evidence pool 中少数多源一致确认的结论：Camoufox、Rebrowser-Puppeteer、Scrape.do API 可以绕过 Turnstile；undetected-chromedriver、旧版 FlareSolverr、cloudscraper 不能 [§2.7][E18]。但 Turnstile 是否可被绕过可能取决于 Turnstile 的具体版本变体，证据池中无版本/配置层面的细分。

---

### 被识别风险：跨方案横向

证据 pool 中最大的系统性缺口之一（G23–G25）是被识别风险的横向对比完全缺失：

- Playwright/Chromium 的 JA3 不匹配已确认 [E4]，但 Camoufox、nodriver、FlareSolverr 在 JA4、HTTP/2 frame 排序上的状态完全未知（G24）。
- 行为分析（ML v9 的第三层信号）在各方案上是否有对应模拟措施——Playwright 有 `page.mouse.move()` 等仿真 API 但效果无量化；nodriver 和 FlareSolverr 的行为层暴露状态完全未知（G25）。
- 各方案的 JS 特征信号暴露数量（unique JS objects、WebDriver flags、navigator 属性质）无人做对标表格整理（G23）。

这意味着**目前无法给出一个各方案"被识别概率"排名**——只能陈述各方案已知的弱点片段，但无法组装出完整的检测面。

---

### 适用边界

由于 Q8 搜索未执行（G26），以下选择框架是证据池中数据的逻辑推演而非专门研究的产出。且通过率/延迟/成本/吞吐量的横向数据在证据池中完全缺失（G27, G28），以下仅从"能否穿透防护"单一维度给出：

| 防护等级 | 推荐的方案栈 | 需要注意的缺口 |
|---------|------------|--------------|
| CF 旧版 JS check | cloudscraper / FlareSolverr / 任意方案 | — |
| CF Pro + 无 Turnstile | Playwright + 住宅代理 + stealth, undetected-chromedriver + 住宅代理 | 所有方案的量化通过率仅 HumanBrowser 单源；延迟/成本/吞吐量无数据 |
| CF Pro + Turnstile | Camoufox / nodriver (cf_verify 待验证) / 托管云浏览器 + 住宅代理 | Camoufox canvas 缺陷未独立验证；nodriver cf_verify 零独立数据；托管方案可能自测自评 |
| CF Enterprise + Turnstile | 住宅 IP + 真实移动指纹 + 类人操作 / 托管云浏览器 | DIY 方案成本极高且通过率不稳定；托管方案 IP 段可能被标记 |
| Web Bot Auth opt-in | 已验证 AI agent 免 challenge [E15] | 采用率数据为零（G29），战略层面重要但当前实用性极窄 |

---

### 适用于 2026 年门槛条件的最低可行方案栈

综合所有证据，对"最低可工作"方案栈的判断如下：

1. **住宅代理是前置条件**，不是可选项。数据中心 IP 下即使使用最先进的伪装方案，通过率也 ≤ 8%（单源数据），Enterprise 级接近 0%（G1, G6, G12 均为同一来源，但多方案一致指向该结论，可接受为 medium 置信度判断）。
2. **支持 Turnstile 的能力非可选项**。2026 年主流 CF 保护站点中 Turnstile 部署率持续上升，不支持 Turnstile 的方案（undetected-chromedriver、cloudscraper、旧版 FlareSolverr）自动出局。
3. **引擎级指纹方案明显优于 JS 注入方案**。Camoufox（C++ 层）和托管服务（headed 模式+持久化配置）在被识别风险上优于 Playwright Stealth（JS 层补丁）。但 Camoufox 的 canvas 缺陷和版本滞后风险需要独立验证和持续监控。
4. **托管云浏览器是当前"最不坏"的选择**，但存在核心隐患：IP 段被批量标记风险 + 自测自评偏差 + 依赖单一提供商锁定的可能性（G16–G18, G27）。
5. **2026 年值得单独关注的变量**：Cloudflare Web Bot Auth [E15]。该机制的长期影响力取决于 opt-in 站点的增长速率，当前零数据（G29）。

---

### 整体置信度说明

本答案中有量化通过率的判断（～2%、～8%、～3%、～35%、～70%、～95%、～97%）均基于 **HumanBrowser 单一来源**（G1, G6, G12 三方案复用同一组测试）。该测试的样本量（500/变体 × 8 站点）无法独立验证，方法学透明性不足（G31）。R2/R3 搜索未执行导致社区实际使用体验和失败案例完全缺失（G30）。部分证据来源时效性已过 5 个月（G32）。因此，**这些量化数字应以"同一测试床下发现的相对排序"来解读，而非绝对通过率预测**。不同站点、不同 IP 池、不同时间段下，绝对数值可能大幅偏离。

*本文档基于 Run 14 Phase 0 搜索引擎采集的证据集撰写，不包含外部资料。Gap Ledger 覆盖 32 项缺口，包含显性与隐性缺口；Final Answer 中所有低于 medium 置信度的判断已按 Gap Ledger 的要求显式标注。*