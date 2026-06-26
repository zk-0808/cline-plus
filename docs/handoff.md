# Handoff — 项目化发布 GitHub 闭环 + GPT 三轮 SKILL 评审 + 两处设计改进落地

## 本会话决策

| 决策 | 状态 |
|------|------|
| 项目化发布 GitHub（上次 handoff 标记的高优先级下一步） | ✅ 完成 |
| 仓库名定为 `cline-search-orchestrator` | ✅ 完成 |
| 子项目发布形态：分层多文件论文式研究文档（`docs/research/00-06.md` + `references.md`），中文为主，作为开源社区使用的形式载体 | ✅ 完成 |
| 仅发布 search-orchestrator 子项目，不带 cline++ 父项目治理文档（PROJECT_DEV_OUTLINE / ADR / mechanism-candidates / handoff / project-rules） | ✅ 完成 |
| LICENSE 选用 MIT | ✅ 完成 |
| survey.md §9.1 #24 wrapper 状态同步 proposed → active（约束 2 触发） | ✅ 完成 |
| web-search-setup.md §2.1 第 62 行绝对路径相对化 | ✅ 完成 |
| 写 CSDN 博客推广（含仓库链接） | ✅ 完成（`docs/blog/csdn-search-orchestrator.md`，未跟踪入库） |
| SKILL.md §2.1 fetch 归档分 Research/Production 模式（GPT 第二轮评审建议） | ✅ 落地 |
| SKILL.md §3.3 加 T1 与社区冲突标记规则（GPT 第二轮评审建议，部分采纳） | ✅ 落地 |
| Goggle 域名表数据化 | ⏳ 暂缓（触发条件：Goggle >10 或单表 >20 行；当前 §3.5.5 设计护栏已生效） |
| 消融实验（Ablation） | ⏳ 后续可选方向（GPT 建议，按计划推进，不作为主任务） |
| 写 handoff | ✅ 用户口头要求，触发 project-rules.md 4.a |

---

## 本会话净变化

### 1. 项目化发布 GitHub（主任务闭环）

**仓库**：https://github.com/zk-0808/cline-search-orchestrator（公开，MIT）

**发布产物**：

| 类别 | 内容 |
|------|------|
| 入口 | `README.md`（重写为子项目入口：问题陈述 + 主要成果 + 三种安装形态 + 场景选择 + 三层职责图 + 文档地图 + 方法论贡献） |
| LICENSE | MIT（copyright 2026 zk0808） |
| 研究文档 | `docs/research/` 8 份分层论文式文档：`00-overview.md`（入口摘要）/ `01-background.md`（Cline 现状 vs 商业 agent 12 手法）/ `02-methodology.md`（A/B 双盲框架）/ `03-mechanisms.md`（6 active P 级 + #24 wrapper）/ `04-experiments.md`（14 轮综述）/ `05-results.md`（成果 + 失败模式 + 局限）/ `06-usage.md`（三种使用形态）/ `references.md`（5 节参考文献） |
| Skill | `skills/search-orchestrator/`（完整 SKILL.md + references + examples） |
| Wrapper | `search-mcp-wrapper/`（#24 节流 wrapper 完整实现 + 11 测试） |
| 决策归档 | `docs/decisions/` 7 份决策文档 + README 索引 |
| 实验归档 | `docs/search-orchestrator/experiments/` 14 轮 Run + GT 密封文件 |

**推送状态**：本地 `main` = `722062d`，远程 `origin/main` 同步。

### 2. GPT 三轮 SKILL 评审（外部专家评审闭环）

**第一轮（前 200 行）**：Complexity Gate 设计认可 / Query Rewrite "压缩"建议不采纳（实验硬伤固化的运行手册，非冗余）/ 诚实定位表达保留。

**第二轮（完整 SKILL）**：评分 9/10，无设计硬伤。三点建议：
- ✅ **fetch 归档分 Research/Production 模式**（采纳，真正设计改进）—— 落地于 §2.1
- ⚠️ **Source Weighting 加 T1 与社区冲突标记**（部分采纳）—— 加标记规则不加推翻规则，避免 Run #14 false-gap 风险
- ⏳ **Goggle 数据化**（暂缓）—— §3.5.5 设计护栏已生效，触发条件未达

**第三轮（终评）**：9/10，认可 Pipeline 闭环 / 职责单一 / 经验抽象三点。两点建议：
- ⏳ **SKILL 平台化拆分**（暂缓）—— 触发条件 SKILL > 1200 行或单 Phase > 300 行
- ❌ **删规则降密度**（不采纳）—— 规则非凭空堆砌，是 14 轮 A/B 实验硬伤的固化，删规则等于删实验教训
- ✅ **消融实验**（完全采纳，记录为下一阶段主任务）—— 减法实验验证已有机制真实收益

### 3. SKILL.md 两处设计改进落地

**§2.1 fetch 归档分 Research/Production 模式**：
- Research Mode（默认，向后兼容）：全文归档，可审计性 + 基线评测 + verbatim 验证
- Production Mode：只存 URL + fetch 状态 + highlights + metadata，不归档全文
- Iron Law 跨模式不变：P3 Quote 必须是 fetch_content 返回正文的连续子串（"不归档"≠"不可验证"，只是"不持久化到输出文件"）

**§3.3 T1 与社区冲突标记规则**：
- T1 与 ≥2 个 T2 冲突时标记 `[T1 与社区冲突]` 并列呈现
- ❌ 不推翻 T1（避免 Run #14 false-gap 失败模式：cloudscraper"已淘汰"被误标"待评估"）
- T1 过时走 §3.4 Freshness 降级，不走社区数量推翻

---

## 本会话新增文件

| 文件 | 说明 |
|------|------|
| `README.md` | 重写为子项目入口（覆盖原过时内容） |
| `LICENSE` | MIT |
| `docs/research/00-overview.md` | 研究文档入口摘要 |
| `docs/research/01-background.md` | 背景：Cline 现状 vs 商业 agent |
| `docs/research/02-methodology.md` | 方法学：A/B 双盲框架 |
| `docs/research/03-mechanisms.md` | 机制详解：6 active + #24 |
| `docs/research/04-experiments.md` | 14 轮实验综述 |
| `docs/research/05-results.md` | 成果 + 失败模式 + 局限 |
| `docs/research/06-usage.md` | Cline 中应用指南 |
| `docs/research/references.md` | 参考文献（5 节） |
| `docs/blog/csdn-search-orchestrator.md` | CSDN 博客（未跟踪入库，本地使用） |

## 本会话修改文件

| 文件 | 改动 |
|------|------|
| `skills/search-orchestrator/SKILL.md` | §2.1 fetch 归档分 Research/Production 模式 + §3.3 T1 与社区冲突标记规则 |
| `skills/search-orchestrator/references/web-search-setup.md` | §2.1 第 62 行绝对路径 `e:/cline++/...` → 相对路径 `../../../search-mcp-wrapper/build/index.js` |
| `docs/search-orchestrator/survey.md` | §9.1 #24 wrapper 状态 proposed → active（约束 2 触发） |
| `docs/handoff.md` | 覆盖为本交接 |

---

## 当前路线图

权威源：

- [survey.md §9.3 最终路线状态](search-orchestrator/survey.md)
- [mechanism-candidates.md](mechanism-candidates.md)

本会话无 P 级路线状态变化（项目化发布 + SKILL 设计改进，不涉及机制 active/deferred 跳转）。

P 级机制 active 清单（6 条，与上次 handoff 一致）：P1 / P1.5 / P3 / P4 / P5 Gap Ledger / P6。
Infra 机制 active（1 条）：#24 wrapper。

---

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| CSDN 博客发布 | 博客已写好（`docs/blog/csdn-search-orchestrator.md`），待用户手动复制到 CSDN 编辑器发布。标签建议：Cline / MCP / 提示词工程 / A/B 测试 / 搜索引擎 / LLM / 开源 | 中 |
| 消融实验（Ablation） | GPT 终评建议。减法实验验证已有机制真实收益：分别关闭 Complexity Gate / Goggle / Source Weighting / Gap Ledger / Query Fanout，观察 Recall / Citation 准确率 / Token / 延迟。**按计划推进，不作为主任务**；前置：定义"关闭模块"语义（完全删除规则 vs 替换为 baseline 行为）与减法实验框架（非 A/B 双盲，是 A/A' 单盲减法） | 中 |
| SKILL 平台化拆分 | 触发条件：SKILL > 1200 行 或 单 Phase > 300 行。当前 ~800 行，未达触发线 | 低 |
| Goggle 域名表数据化 | 触发条件：Goggle >10 或单表 >20 行。当前 5 个 Goggle，反膨胀护栏已生效 | 低 |
| #22 Browser Fetch 启动评估 | 候选（暂缓）。仅当 Tier C snippet-only 被证明严重影响答案质量才启动 | 低 |
| #24 V2 backend 切换 | 暂缓。DDG 持续不可用时启动 | 低 |

---

## Handoff（下次会话第一句话建议）

首句话提示词：

```text
先读 docs/project-rules.md 一次，遵守里面的三份文档职责划分与五条防漂移约束。
然后读 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：本会话完成两大收尾——① 项目化发布 GitHub 闭环（仓库 https://github.com/zk-0808/cline-search-orchestrator，含 8 份论文式分层研究文档 + README + MIT LICENSE + Skill + wrapper + 决策/实验归档，远程 main = `dc597fa`）；② GPT 三轮 SKILL 评审闭环（9/10，无设计硬伤），落地两处设计改进：§2.1 fetch 归档分 Research/Production 模式 + §3.3 T1 与社区冲突标记规则。项目化发布与外部评审均已闭环，无突出主任务待启动；后续按计划推进常规项（CSDN 博客发布 / SKILL 平台化拆分触发监控 / Goggle 数据化触发监控 / #22 启动评估 / #24 V2 backend 切换 / 消融实验）。注意执行边界：若后续启动消融实验或任何需 Goggle 过滤 / P3 抽取 / Gap Ledger 等 SKILL 层机制处理的工作，执行主体需在实验框架 run-N-*.md 中声明 designated_executor，由 Cline + SKILL 执行，TRAE agent 不得用 WebSearch/WebFetch 替代（project-rules.md §约束 5）。
