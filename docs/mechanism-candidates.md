# Mechanism Candidates

> 经验机制化清单。每条经验只记录五列：经验 / 当前位置 / 类别 / 理想机制 / 状态。
>
> **首要目的不是归档，而是发现可机制化经验并推动其退休**（ADR-002 Mechanism Principle）。

---

## 状态约定

- `候选` — 已识别，未开始
- `实验中` — 在某个 P5/后续实验里验证
- `已机制化` — 机制已实现，对应经验**应删除**
- `永久C类` — 治理思考方式，不可机制化
- `已退休` — 经验对应的痛点已被 Cline 原生解决，整条删除

---

## 种子条目（从 ADR-001 / Capability Probe / OUTLINE / memory dump 抽取）

| # | 经验 | 当前位置 | 类别 | 理想机制 | 状态 |
|---|------|---------|------|----------|------|
| 1 | 终端命令假死 / Shell 阻塞 | 系统提示词、SKILL 规则 | A | terminal-watchdog plugin（`tool_call_after` hook 检测超时） | 候选 |
| 2 | PowerShell 阻塞用 `-NoProfile` 等参数 | 系统提示词 | A | shell-wrapper plugin（safe-exec） | 候选 |
| 3 | UTF-8 输出乱码处理 | 系统提示词 | A | shell-wrapper plugin（环境变量注入） | 候选 |
| 4 | 重复循环要主动跳出 | 提示词 / Skill | A | loop-guard plugin（基于工具调用相似度） | 候选 |
| 5 | 长会话要主动 compact + 写 handoff | Skill / 提示词 | A | `registerMessageBuilder` plugin（双产物） | 实验中（P5） |
| 6 | 跨会话续作要先读上次 handoff | 提示词 / Skill | A | `session_start` hook + index.jsonl | 实验中（P5） |
| 7 | Windows 不支持 Cline 早期 Hook | OUTLINE §6.1 | B | SDK plugin hook（已确认存在，需 Phase 2 验证 Windows 可用性） | 候选（验证后或可标"已退休"） |
| 8 | 调研先行 / 五问门控 | OUTLINE §3 | **C** | 不可机制化 | 永久C类 |
| 9 | 证据优于推测 / 问题定义优于方案 | constitution / OUTLINE | **C** | 不可机制化 | 永久C类 |
| 10 | A/B/C 分类纪律 | OUTLINE §1 | **C** | 不可机制化 | 永久C类 |
| 11 | 三轮收敛律 / 2 轮收敛节奏 | OUTLINE §10.2 | **C** | 不可机制化 | 永久C类 |
| 12 | 决策 vs 实现分层（ADR vs Design Doc） | OUTLINE §9.1 | **C** | 不可机制化 | 永久C类 |
| 13 | 战略决断不得伪装成待办 | OUTLINE §4.2 | **C** | 不可机制化（但可由 plugin 检测"未来再研究"类待办并提醒） | 永久C类（半机制化辅助） |
| 14 | 自研 compact 路线已失败 / `compaction_count=0` | memory + task analysis | A→已转向 | 接入 Cline messageBuilder（替代自研） | 实验中（P5） |
| 15 | 装机/部署任务必须先盘点现状（已装/已配置的工具与配置），再决定是否安装新依赖 | 本次 DDG MCP 装机失误（2026-06-23） | **C** | 不可机制化（治理思考方式）。可由 plugin 半机制化：装机前自动扫 `cline_mcp_settings.json` / PATH / 已知工具，但根治在认知层 | 永久C类（半机制化辅助） |
| 16 | Output Schema 结构化抽取（Search→Extract→Normalize→Reason） | search-orchestrator/survey.md §9 + decisions/D-2026-06-24-search-evaluate-p5-output-schema.md（proposed）+ experiments/run-9b-p5-output-schema-v2.md（3/5 有条件）+ run-9b-external-review.md（外部评审决策 C）+ run-9c-p5-output-schema-v3.md（2/5 双盲证伪） | A | search-orchestrator skill v2：每个 sub-question 预声明 schema，LLM 抽完字段再 reason | **候选** — Run #9c 2/5 双盲证伪：Conflict ID Δ=-20%（自由文本反超 schema），Field Alignment Δ=-7%。降回 proposed 触发条件已满足。核心发现：schema 结构可能限制跨维度冲突发现 |
| 17 | Highlights / Relevance Compression（fetch 后强制 token 压缩） | search-orchestrator/survey.md §9.3 P6 行 + experiments/run-10-p6-highlights.md | A | search-orchestrator skill v2：fetch_content 结果不直接进 context，先按 sub-Q 抽 ≤500 token | **实验中（Run #10 轻量版）** — 文献调研（RECOMP/Perplexity/LongLLMLingua/LLMLingua/EMNLP 2025）确认 P6 设计落在研究安全区，跳过完整 ablation。轻量版只验提示词层 LLM 抽取保真度（verbatim vs paraphrase），待 Phase 0+1 执行 |
| 18 | 重量 multi-agent 编排（Planner/Searcher/Composer） | 同上 / OpenAI Deep Research 借鉴 | A→拒绝 | 走 Cline 原生 subagent；search-orchestrator 不内建 | 候选（不进 V1） |
| 19 | 同源转载证据去重（Evidence Deduplication） | decisions/D-2026-06-24-search-adopt-p4-same-source-merge.md（active）+ experiments/run-7-p4-dedup.md | A | 已落地为 P4 Same-source Merge：Phase 3 同源合并步骤；指标修订见 D-2026-06-24-search-revise-p4-metrics | **已机制化** |
| 20 | 反证检索（counter-evidence search）—— DDG/通用 search 后端对负向 query 召回差，复合 OR 易被屏蔽 | search-orchestrator §1.4.3 + experiments/run-3-fanout-tuned.md 决策「根因 #3」+ decisions/D-2026-06-24-search-defer-p2.md（deferred）| A | 反证专用检索机制：分拆负向短语单发、引入 contrarian intent classifier、或换支持否定召回的后端（Tavily/Exa）| 候选（P2 失败遗产） |
| 21 | 多样性排序（DiversityPenalty / R1 保底 / 单一路 entry cap） | search-orchestrator §3.5.5/§3.5.6 + experiments/run-3-fanout-tuned.md 决策「根因 #2」+ decisions/D-2026-06-24-search-defer-p2.md（deferred）| A | 排序后处理代码：合并阶段做真正的数值排序与配额约束，而非依赖 LLM 算分。提示词级算分量级失衡且 LLM 不可靠 | 候选（P2 失败遗产） |
| 22 | Browser-backed Fetch（穿透 Cloudflare JS Challenge） | search-orchestrator/experiments/run-8a-mcp-backend.md（否决 TLS 假设）+ decisions/D-2026-06-24-search-infra-mcp-upgrade.md（rolled-back）| A | Playwright / Headless Chromium MCP：能执行 JS 取 challenge cookie，是当前观测到的中文 fetch 失败模式（juejin "Please wait..." HTTP 200 假页面）的唯一对路径方案。代价高（重、慢、资源高）| 候选（暂缓）— 触发条件：Tier C snippet-only 被证明严重影响答案质量；否则不启动 |
| 23 | TRAE agent 与 Cline SKILL 执行边界混淆 | session_memory 2026-06-24/25 两次记录 + docs/project-rules.md §约束 5 | **C** | 不可机制化（治理思考方式）。半机制化辅助：① project-rules.md §约束 5 已落地为防漂移约束；② 实验框架模板（run-N-*.md）必须声明各 Phase 的 designated_executor（Cline / TRAE agent / 用户手动） | 永久C类（半机制化辅助） |

---

## 使用方式

1. **添加经验时**：发现一条提示词/Skill 里反复出现的规则，先在此表加一行，决定类别和理想机制
2. **做实验时**：每完成一个 P5 子实验，把相关行的"状态"改为"实验中"或"已机制化"
3. **写代码删提示词时**：每删一段提示词/规则，对照本表确认对应行已标"已机制化"
4. **审查 retirement 时**：状态=已机制化 且 对应提示词已删 → 整行可移到 `_archive` 区

---

## 维护规则

- 一行经验对应一个具体痛点，不写抽象总结
- 类别栏只能填 A/B/C
- 状态变更必须有触发动作（实验、代码、删除提示词）
- 不做更复杂分类（不分领域、不分优先级、不分 owner）
- 当本表行数 > 50 时，先审查是否在做"完善目录"——本表是**清单**不是**知识库**

---

## 归档区（已退休 / 已机制化）

（暂空）
