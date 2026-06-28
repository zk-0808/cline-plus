# Mechanism Candidates

> 经验机制化清单。每条经验只记录五列：经验 / 当前位置 / 类别 / 理想机制 / 状态。
>
> **首要目的不是归档，而是发现可机制化经验并推动其退休**（ADR-002 Mechanism Principle）。

<!--
经验机制化漏斗：

o → p → r → d → e → m → x
                 ↓
                 k

o = observation    观察到但未归纳（初始状态，从 DEV_NOTES 进入时自动获得）
p = pattern        已归纳为重复模式
r = rule           可写入 dev-rules.md 的行为规则
d = decision       决定代码化（附三维评估：事件语义匹配度 / 实现优雅度 / 事故频率）
e = experimental   正在 P5 实验验证
m = mechanismd     实验通过，代码已实现，对应规则/提示词应删除
k = killed         实验证伪终止，证据保留
x = retired        对应规则/提示词已确认删除，整行移入归档区

状态变更必须有触发动作（实验、代码、删除提示词）。
唯一入口：DEV_NOTES 踩坑日志（无状态要求，零摩擦）。
唯一出口：退休（x），要求对应代码规则已被确认删除。
-->

---

## 状态约定

| 简写 | 状态 | 含义 | 触发条件 |
|------|------|------|---------|
| o | 观察中 | 观察到但未归纳（初始状态） | 从 DEV_NOTES 或其他来源首次移入本表时自动标注 |
| p | 模式 | 已识别为重复模式（认知操作，无需代码介入） | 维护者在审查时主动标注 |
| r | 规则 | 可写入 dev-rules.md 的行为规则 | 显著影响工作流 |
| d | 决策 | 决定代码化，附三维评估：事件语义匹配度 / 实现优雅度 / 事故频率 | 必须有 Runtime Event 接入点（Gate 0）。Gate 0.5：**这是一个系统问题，不是 Prompt/配置问题？** |
| e | 实验中 | 正在 P5 实验验证 | 有 run-N-*.md 实验计划 |
| k | 已终止 | 实验证伪或有充分证据证明不值得继续投入 | 有明确实验结论，非前置条件变化 |
| m | 已机制化 | 实验通过，代码已实现 | 双盲验证或等价实证通过 |
| x | 已退休 | 对应规则/提示词已确认删除，整行移入归档区 | 规则删除确认 + 30 天倒计时 |

**永久 C 类**（不进漏斗管线，在表末尾保留作为"已知不可代码化"参考）：治理思考方式，不可机制化。

---

## 种子条目（从 ADR-001 / Capability Probe / OUTLINE / memory dump 抽取）

| # | 经验 | 当前位置 | 类别 | 理想机制 | 状态 |
|---|------|---------|------|----------|------|
| 1 | 终端命令假死 / Shell 阻塞 | 系统提示词、SKILL 规则 | A | terminal-watchdog plugin（`tool_call_after` hook 检测超时） | 候选 |
| 2 | PowerShell 阻塞用 `-NoProfile` 等参数 | 系统提示词 | A | shell-wrapper plugin（safe-exec） | 候选 |
| 3 | UTF-8 输出乱码处理 | 系统提示词 | A | shell-wrapper plugin（环境变量注入） | 候选 |
| 4 | 重复循环要主动跳出 | 提示词 / Skill | A | loop-guard plugin（基于工具调用相似度） | 候选 |
| 5 | 长会话要主动 compact + 写 handoff | Skill / 提示词 | A | **拆分**（[ADR-005](decisions/ADR-005-split-compact-from-handoff.md)）：Compaction 归 Cline 原生，Handoff 归 Plugin 独立触发 | **实验中（重构中）** — ADR-005 决定将 Compaction 与 Handoff 拆分为两个独立机制。Phase 2 全链路验证通过（2026-06-28）但产物定位调整：compact 时不再产出 handoff.md（那是 Cline 的事），handoff 改为独立触发器（用户指令 / 决策信号 / 定时）。详见 [ADR-005](decisions/ADR-005-split-compact-from-handoff.md) | |
| 6 | 跨会话续作要先读上次 handoff | 提示词 / Skill | A | **写入 Cline 动态 rules**（[ADR-005](decisions/ADR-005-split-compact-from-handoff.md)）：读 handoff.md 注入新会话 rules | 候选（重构中）— ADR-005 将 #6 从独立 session_start hook 改为写入 Cline 动态 rules。handoff.md 内容注入到新会话的 rules capability 中，不依赖 index.jsonl。触发条件：见 [ADR-004](decisions/ADR-004-p5-spike-pause.md) | |
| 7 | Windows 不支持 Cline 早期 Hook | OUTLINE §6.1 | B | SDK plugin hook（已确认存在，需 Phase 2 验证 Windows 可用性） | 候选（验证后或可标"已退休"）。**[ADR-002 Update 3](decisions/ADR-002-project-shape.md) 确认：VS Code 扩展 4.0.0 代码层有 Windows hook 支持（`findWindowsHook` + `<hooksDir>/<event>.ps1` + `isGlobalHooksDir` 匹配 `/cline/Hooks/i`），放文件即可被发现。待 Windows 实测确认后标已退休** |
| 8 | 调研先行 / 五问门控 | OUTLINE §3 | **C** | 不可机制化 | 永久C类 |
| 9 | 证据优于推测 / 问题定义优于方案 | constitution / OUTLINE | **C** | 不可机制化 | 永久C类 |
| 10 | A/B/C 分类纪律 | OUTLINE §1 | **C** | 不可机制化 | 永久C类 |
| 11 | 三轮收敛律 / 2 轮收敛节奏 | OUTLINE §10.2 | **C** | 不可机制化 | 永久C类 |
| 12 | 决策 vs 实现分层（ADR vs Design Doc） | OUTLINE §9.1 | **C** | 不可机制化 | 永久C类 |
| 13 | 战略决断不得伪装成待办 | OUTLINE §4.2 | **C** | 不可机制化（但可由 plugin 检测"未来再研究"类待办并提醒） | 永久C类（半机制化辅助） |
| 14 | 自研 compact 路线已失败 / `compaction_count=0` | memory + task analysis | A→已转向 | 接入 Cline messageBuilder（替代自研） | 候选（暂缓）— 触发条件：见 [ADR-004](decisions/ADR-004-p5-spike-pause.md)。CLI 3.0.30 插件运行时已验证可用，结论保留 |
| 15 | 装机/部署任务必须先盘点现状（已装/已配置的工具与配置），再决定是否安装新依赖 | 本次 DDG MCP 装机失误（2026-06-23） | **C** | 不可机制化（治理思考方式）。可由 plugin 半机制化：装机前自动扫 `cline_mcp_settings.json` / PATH / 已知工具，但根治在认知层 | 永久C类（半机制化辅助） |
| 16 | Output Schema 结构化抽取（Search→Extract→Normalize→Reason） | search-orchestrator/survey.md §9 + decisions/D-2026-06-24-search-evaluate-p5-output-schema.md（superseded）+ decisions/D-2026-06-25-search-redesign-p5-evidence-map.md（proposed）+ experiments/run-9b-p5-output-schema-v2.md（3/5 有条件）+ run-9b-external-review.md（外部评审决策 C）+ run-9c-p5-output-schema-v3.md（2/5 双盲证伪）+ experiments/run-13-p5-evidence-map.md（2/5 双盲证伪）+ experiments/run-14-p5-gap-ledger.md（4/5 ✅ Gap Ledger 升级 active） | A | search-orchestrator skill v2：P5 v1 字段对齐 schema（Run #9c 证伪）与 v2 Evidence Map / Claim Graph（Run #13 证伪）均未对自由文本展现决定性优势；仅 Gap Ledger 强制证据缺口枚举显示窄增量 | **部分已机制化** — Run #14 4/5 双盲验证通过：Gap Detection Recall Δ=+55.6%（33.3% → 88.9%），Implicit Gap Recall Δ=+40%（40% → 80%），安全指标全部不退化。Gap Ledger 最小机制已升级 active 并进入 SKILL.md。False Gap=1 阻挡 5/5（Run B G15 把 cloudscraper"已淘汰"误标为"侦察用途待评估"），缓解措施=每项 gap 需引用 evidence id，evidence 充分则不应标 gap。完整 Evidence Map / Claim Graph 保持 proposed，不再推进 |
| 17 | Highlights / Relevance Compression（fetch 后强制 token 压缩） | search-orchestrator/survey.md §9.3 P6 行 + experiments/run-10-p6-highlights.md（4/5 ✅）+ decisions/D-2026-06-25-search-adopt-p6-highlights.md（active） | A | search-orchestrator skill v2：fetch_content 结果不直接进 context，先按 sub-Q 抽 ≤500 token | **已机制化** — Run #10 评分 4/5：Extractive Fidelity 92.3%（24/26），Paraphrase 7.7%（2/26），Untraceable 0。两条 paraphrase 模式：主语同义替换 + 跨语言归纳。提示词层 verbatim 抽取指令基本有效 |
| 18 | 重量 multi-agent 编排（Planner/Searcher/Composer） | 同上 / OpenAI Deep Research 借鉴 | A→拒绝 | 走 Cline 原生 subagent；search-orchestrator 不内建 | 候选（不进 V1） |
| 19 | 同源转载证据去重（Evidence Deduplication） | decisions/D-2026-06-24-search-adopt-p4-same-source-merge.md（active）+ experiments/run-7-p4-dedup.md（逐字场景）+ experiments/run-11-p4-semantic-merge.md（translation 语义场景 4/5）+ experiments/run-12-p4-summary-rewrite.md（summary/rewrite 语义场景 5/5） | A | 已落地为 P4 Same-source Merge：Phase 3 同源合并步骤；指标修订见 D-2026-06-24-search-revise-p4-metrics。Run #7 验证逐字场景（Merge Precision 100%）；Run #11 验证 translation 子类（P4 LLM P=1.00/R=1.00 vs lexical baseline P=1.00/R=0.20，Net Gain +0.80）；Run #12b 验证 summary/rewrite 子类（GT positive=5：summary 3、rewrite 2；Baseline P=1.00/R=0.00/F1=0.00；P4 LLM P=1.00/R=1.00/F1=1.00；Net Gain +1.00；False Merge=0；Info Loss=0） | **已机制化（逐字 + translation + summary/rewrite 语义子类均验证通过）** |
| 20 | 反证检索（counter-evidence search）—— DDG/通用 search 后端对负向 query 召回差，复合 OR 易被屏蔽 | search-orchestrator §1.4.3 + experiments/run-3-fanout-tuned.md 决策「根因 #3」+ decisions/D-2026-06-24-search-defer-p2.md（deferred）+ survey.md §10.3（现成结论引用 2026-06-25）| A | 反证专用检索机制：分拆负向短语单发、引入 contrarian intent classifier、或换支持否定召回的后端（Tavily/Exa）。**现成结论验证**：NevIR 基准确认神经检索在否定上等于/低于随机；DDG 2023 起算子被下线；"分拆负向短语单发"方向正确。修正：非"完全不可治"，可由检索策略+架构缓解 | 候选（P2 失败遗产） |
| 21 | 多样性排序（DiversityPenalty / R1 保底 / 单一路 entry cap） | search-orchestrator §3.5.5/§3.5.6 + experiments/run-3-fanout-tuned.md 决策「根因 #2」+ decisions/D-2026-06-24-search-defer-p2.md（deferred）+ survey.md §10.4（现成结论引用 2026-06-25）| A | 排序后处理代码：合并阶段做真正的数值排序与配额约束，而非依赖 LLM 算分。提示词级算分量级失衡且 LLM 不可靠。**现成结论强支持**：NumericBench 证 LLM 算术不准；评分误差 4 倍方差压缩使 ±2 落在噪声地板内；pointwise 逐条打分是排序家族里方差最大范式。LLM 应只做语义判断（输出离散标签），数值合成交给代码 | 候选（P2 失败遗产） |
| 22 | Browser-backed Fetch（穿透 Cloudflare JS Challenge） | search-orchestrator/experiments/run-8a-mcp-backend.md（否决 TLS 假设）+ decisions/D-2026-06-24-search-infra-mcp-upgrade.md（rolled-back）+ survey.md §10.5（现成结论引用 2026-06-25）| A | Playwright / Headless Chromium MCP：能执行 JS 取 challenge cookie。**现成结论修正**：真实浏览器内核是必要执行环境，但**非唯一**（cloudscraper/FlareSolverr 旁路、nodriver/Camoufox 引擎级工具、托管云浏览器）且**不充分**（裸 headless 必被识别，需 stealth + 住宅代理 + 拟人化 + CAPTCHA solver 多层叠加）。原"唯一对路径方案"措辞需修正为"多层方案的地基层"| 候选（暂缓）— 触发条件：Tier C snippet-only 被证明严重影响答案质量；否则不启动。启动时选多层叠加方案而非裸 Playwright |
| 23 | TRAE agent 与 Cline SKILL 执行边界混淆 | session_memory 2026-06-24/25 两次记录 + docs/dev-rules.md §1（执行主体边界） | **C** | 不可机制化（治理思考方式）。半机制化辅助：① dev-rules.md §1 已落地为防漂移约束；② 实验框架模板（run-N-*.md）必须声明各 Phase 的 designated_executor（Cline / TRAE agent / 用户手动） | 永久C类（半机制化辅助） |
| 24 | 搜索 MCP 自适应反-bot 节流 / 退避（DDG `BOT_DETECTED` 后靠提示词手动降速不可靠，应下沉到 MCP 实现层） | Run #14 Phase 0b 运行时故障（2026-06-25，Q2 nodriver 被封后全链路不可用）+ skills/search-orchestrator/references/web-search-setup.md §七 分层（rate limit / bot 重试归 MCP 层）+ duckduckgo-websearch 源码（已有 token-bucket 限速 + 3 次重试 + cookie jar，但 max_results>10 翻页放大易触发，且未暴露 backend 切换） | A | 在搜索 MCP 实现层补全自适应反-bot：① `BOT_DETECTED` 后指数退避 + 跨请求记忆近期被封状态主动降速；② vqd 翻页间随机 jitter，避免连击；③ 会话级熔断（被封后自动降 max_results / 串行化）；④ 被封后回退 lite/bing backend。需 fork 上游或包薄 wrapper MCP（当前为 `npx -y` 拉上游，不可直接改）。与 #21 同理：确定性运行时节流应交给代码而非提示词 | **已机制化** 2026-06-26（方案 C 落地于 search-mcp-wrapper/，11/11 集成测试通过，子代理两轮 code review 通过；Run #14 Phase 0b 功能性验证通过：3 次熔断正确触发指数退避（30s/2min/10min），fetch_content 独立通道不受熔断影响，降级规约正确执行） |

---

## 使用方式（状态简写映射）

当前表中的存量状态映射到 7 状态简写如下：

| 存量状态 | 映射为 | 说明 |
|---------|--------|------|
| `候选` | `o` / `d` | 如果只是被识别但无代码化决定 → o；如果已决定代码化（有明确机制方案）→ d |
| `候选（暂缓）` | `d（暂缓）` | 已决定代码化，但因外部条件（ADR-004）暂缓 |
| `实验中` | `e` | 已在实验中的经验 |
| `已机制化` | `m` | 代码已实现，启动 30 天退休倒计时 |
| `永久C类` | （不进管线） | 保留在表末尾作为"已知不可代码化"参考 |
| `已退休` | `x` | 对应规则已确认删除 |

## 使用方式

1. **添加经验时**：发现一条提示词/Skill 里反复出现的规则，先在此表加一行，决定类别和理想机制。状态标 `o`（观察中），不需要决定代码化方向
2. **做实验时**：每完成一个 P5 子实验，把相关行的状态改为 `e`（实验中）或 `m`（已机制化）
3. **写代码删提示词时**：每删一段提示词/规则，对照本表确认对应行已标 `m`（已机制化）
4. **审查 retirement 时**：状态 = `m`（已机制化）→ 启动 **30 天倒计时**。30 天后在周审查中列为"超期待删除"项。逾期未删除且未延期的，在周审查中标注 `⚠️`。对应的提示词/规则确认删除后，状态改为 `x`（已退休），整行移入归档区

---

## 维护规则

- 一行经验对应一个具体痛点，不写抽象总结
- 类别栏只能填 A/B/C
- 状态变更必须有触发动作（实验、代码、删除提示词）
- 不做更复杂分类（不分领域、不分优先级、不分 owner）
- 当本表行数 > 50 时，先审查是否在做"完善目录"——本表是**清单**不是**知识库**

---

## 归档区（已退休 / 已机制化 经验）

（暂空）
