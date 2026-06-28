# Run #14 — Phase 0c 密封 Ground Truth

> **状态**：已密封（2026-06-26）
> **对应 evidence pool**：[run-14-phase0-evidence.md](run-14-phase0-evidence.md)（18 条 P3 三元组 E1-E18）
> **查询**：评估无头浏览器抓取穿透 Cloudflare 等反爬的可行方案
> **密封者**：TRAE agent（Phase 0c designated executor）
> **盲态约束**：Run A / Run B 执行前本文件不可展示给 Cline

---

## §1 GT 设计原则

依据 [run-14-p5-gap-ledger.md §2.2](run-14-p5-gap-ledger.md) 证据集要求：

| 要求 | 设计 | 实测 |
|------|------|------|
| gap ≥5 | 密封 9 个 gap（4 显性 + 5 隐性） | ✓ 远超阈值 |
| 显性缺口 ≥2 | G1-G4（证据明确写"未找到/资料不足/已停滞"） | ✓ |
| 隐性缺口 ≥2 | G5-G9（证据看似回答了问题，但单源/利益相关/版本过时/缺反证） | ✓ |
| material relation ≥4 | M1-M5（conflict/tradeoff/temporal_shift/scope_constraint） | ✓ |

**隐性 gap 的判定标准**：证据池里**存在**相关陈述，看似回答了某个子问题，但存在以下之一者判为隐性 gap：
- 单源 + 利益相关（商业方案的自卖自夸 / 竞争对手的贬低）
- 版本/时间戳过时（结论依赖的版本已远超当前）
- 项目方自述无独立反证
- 范围外推（特定条件下的结论被泛化）

**显性 gap 的判定标准**：证据池里**明确写**"未找到/资料不足/已停滞/不支持/无数据"，或 §3 反证不足汇总里如实记录的缺口。

---

## §2 Ground Truth 表

### §2.1 Gap 项（主指标分母 = 9）

| gt_id | type | gap_subtype | involved_evidence | expected_statement | must_be_in_final_answer |
|-------|------|-------------|-------------------|--------------------|------------------------|
| G1 | gap_explicit | no_direct_comparison | E1, E6, E17 | 6 方案（Playwright/nodriver/Camoufox/FlareSolverr/cloudscraper/托管云浏览器）之间缺统一基准的横向对比；现有对比表（HumanBrowser 12-method、Scrape.do 5-method）覆盖方案不完整，无法直接判定各方案相对优劣 | true |
| G2 | gap_explicit | missing_counter_evidence | E15 | Web Bot Auth（2026-05 推出）作为合法通道，其站点部署率/普及时间表缺反证数据；证据仅说"long tail of sites have not enabled it"，无具体部署率数字 | true |
| G3 | gap_explicit | single_source | E5, E2 | Cloudflare ML v9 的具体检测权重（JA4/HTTP2 frame ordering/behavioral telemetry）仅在 HumanBrowser 单源出现，无 Cloudflare 官方文档（T1）佐证；§3 反证不足汇总明确记录"无 T1 源" | true |
| G4 | gap_explicit | outdated | E13, E14 | cloudscraper（Anorov/cfscrape）仅支持 Python 2.6-3.7、仅适用 JS check 类防护，不适用 reCAPTCHA / CF v2 challenge；证据明确标记"可能已停滞"，其"有效"结论已过时 | true |
| G5 | gap_implicit | single_source | E9 | Camoufox "CreepJS 最优/与真人无法区分"结论来自 ScrapingBee 单源，且 ScrapingBee 是商业爬虫服务（卖 Camoufox 集成），存在利益相关；需标注为"单源+利益相关，置信度受限" | true |
| G6 | gap_implicit | single_source | E10 | Camoufox canvas spoofing 失败结论来自 Kameleo blog，而 Kameleo 是 Camoufox 的商业竞争对手（卖自家抗检测浏览器），存在利益相关；需标注为"竞争对手单源，需交叉验证" | true |
| G7 | gap_implicit | out_of_scope | E1, E6, E17 | HumanBrowser 12-method 通过率数据（"住宅+移动指纹+类人 ~95%"）来自 HumanBrowser 自家博客，他们卖 "Human Browser managed" 服务；数据让自家方案看起来最好，存在利益相关外推；需标注为"利益相关方数据" | true |
| G8 | gap_implicit | outdated | E7 | undetected-chromedriver README 说"headless 自 Chrome 110 后已修复（仍 unofficial）"，但 Chrome 当前版本已远超 110（2026 年 Chrome 稳定版 ~130+），该陈述可能已过时；需标注为"版本依赖信息可能过时" | true |
| G9 | gap_implicit | missing_counter_evidence | E8 | nodriver 的 `tab.cf_verify()` 自动点击 Turnstile 功能为项目方自述（README），缺独立第三方验证其有效性；需标注为"项目方自述无反证" | true |

### §2.2 Material Relation 项（安全指标基线 = 5）

| gt_id | type | involved_evidence | expected_statement | must_be_in_final_answer |
|-------|------|-------------------|--------------------|------------------------|
| M1 | conflict | E9, E10 | Camoufox 指纹有效性存在冲突：E9（ScrapingBee）称其"CreepJS 最优/与真人无法区分"，E10（Kameleo）称其"canvas spoofing 在 trashes 指标失败、BrowserLeaks 100% unique"；两源均为商业利益相关方，需交叉验证 | true |
| M2 | tradeoff | E1, E6, E17 | 方案组合存在成本/复杂度 tradeoff：stock Playwright VPS ~2% 失败率极高，而"住宅 IP + 移动指纹 + 类人输入"虽 ~95% 但成本/复杂度剧增；"There is no magic flag, only a stack" — 必须同时解决 IP + 指纹 + 行为三层 | true |
| M3 | temporal_shift | E5, E11, E14 | Cloudflare 检测能力随时间升级：ML v9（2026 Q1 默认）更激进加权 JA4/HTTP2/behavioral；FlareSolverr "曾是 silver bullet 但 behavioral analysis 崛起后不再通用"；cloudscraper 在 CF v2 challenge 上直接返回错误；旧方案有效性持续衰退 | true |
| M4 | scope_constraint | E7, E13, E14, E18 | 各方案有明确适用边界：cloudscraper 仅 JS check（不适用 reCAPTCHA/v2 challenge）；undetected-chromedriver 无法绕过 Turnstile；FlareSolverr 对部分站点无法检测 challenge（#1734/#771）；uc 不隐藏 IP（数据中心失败） | true |
| M5 | tradeoff | E7, E8 | undetected-chromedriver 系列存在迭代 tradeoff：uc（12.7k stars）成熟但不隐藏 IP、无法绕 Turnstile；nodriver（4.4k stars）作为官方继任者，CDP 直接通信提供更高 WAF 抵抗 + `tab.cf_verify()` 支持 Turnstile，但生态较新 | true |

---

## §3 评分锚点（供 Phase 2 解封后对照）

### §3.1 Gap Detection Recall（主指标）

- **分母**：9（G1-G9）
- **隐性 gap 子集分母**：5（G5-G9）
- **判定标准**：最终答案中**显式标注**某项为"证据不足/低置信/单源/利益相关/过时/缺反证/缺直接对比"，且指向正确子类型，计为命中
- **不命中**：仅引用 evidence 内容但未标注其可靠性/缺口，或标注错误的缺口类型

### §3.2 Material Relation Recall（安全指标）

- **分母**：5（M1-M5）
- **判定标准**：最终答案中显式陈述该 relation（冲突/tradeoff/变化/约束），且引用对应 evidence id

### §3.3 Traceability Rate

- 最终答案中每个关键判断必须可回指 evidence id（E1-E18）
- 比例 = 可回指的关键判断数 / 关键判断总数

### §3.4 安全指标

- **False Gap Count**：把证据充分的结论误标为"证据不足"的次数（目标 = 0）
- **Unsupported Relation Count**：无 evidence 支撑的关系数（目标 = 0）
- **Information Loss Count**：`must_be_in_final_answer=true` 的 GT 项未进入最终答案的次数

---

## §4 密封完整性自检

| 检查项 | 结果 |
|--------|------|
| gap 总数 ≥5 | ✓ 9 个 |
| 显性 gap ≥2 | ✓ 4 个（G1-G4） |
| 隐性 gap ≥2 | ✓ 5 个（G5-G9） |
| material relation ≥4 | ✓ 5 个（M1-M5） |
| 每项含 involved_evidence | ✓ 全部指向 E1-E18 |
| 每项含 expected_statement | ✓ 评分时可接受的标准表述 |
| gap 项含 gap_subtype | ✓ 6 种子类型覆盖 |
| must_be_in_final_answer 全标 true | ✓（本 run 测量 gap detection + relation recall，所有 GT 项都需进入最终答案才能计分） |
| 密封前未展示给 Cline | ✓（TRAE agent 独立密封） |

---

## §5 后续动作

- **Phase 1a**：用户在 Cline 会话 1 执行 Run A Control（盲态，自由文本合成），输出到 `run-14-run-a-output.md`
- **Phase 1b**：用户在 Cline 会话 2 执行 Run B Treatment（盲态，仅追加 Gap Ledger 一步），输出到 `run-14-run-b-output.md`
- **Phase 2**：TRAE agent 解封本文件，对照 §3 评分锚点评分，填入 [run-14-p5-gap-ledger.md](run-14-p5-gap-ledger.md) 结果记录区
