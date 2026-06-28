# ADR-002 P5 Plugin 实验停续评审材料（外部评审输入）

- **日期**：2026-06-26
- **关联 ADR**：[ADR-002](ADR-002-project-shape.md)（项目承载形态与分层架构，2026-06-23 Accepted）
- **关联机制清单**：[mechanism-candidates.md](../mechanism-candidates.md) #1–#6、#14
- **评审目标**：请外部评审就「是否舍弃 ADR-002 P5 最小 Plugin 实验线」给出独立意见，作为 ADR-002 Update / ADR-003 的前置输入
- **材料性质**：评审输入（非决策），论据力求平衡陈述正反两方

---

## 0. 提案摘要

**提案方（项目所有者）倾向**：舍弃 ADR-002 §Validation Plan 定义的 P5 最小 Plugin 实验线，理由是当前已沉淀出一套"相当舒服"的工作流（handoff 状态快照 + ADR 项目级决策 + mechanism-candidates 经验库），P5 Plugin 路径的边际价值不明确。

**ADR-002 既定硬约束**：P5 实验 1–2 周后**必须**产出 ADR-002 Update / ADR-003，明确"未来主线候选 / 保留实验线 / 退出"三选一，不允许观望（OUTLINE §10.3 战略债清理规则）。本材料即该硬性出口的评审前置。

---

## 1. 背景

### 1.1 ADR-002 (2026-06-23) Accepted 时的设想

ADR-002 确立项目形态为「薄 Skills + 单点 WebSearch MCP + 经验文档与规则 + Plugin 作为实验与未来迁移线（NOT 默认交付）」。其中 P5 最小 Plugin 实验的定位：

- **原目的**（2026-06-23 前）：验证 Plugin 是否能承担主交付
- **新目的**（2026-06-23 修订后）：在 CLI / SDK 自建环境中验证 Plugin 是否值得成为**未来主线**
- **硬约束**：Cline Plugin 当前不适用于 VS Code / JetBrains 扩展（官方文档原文），而用户主工作流位于 VS Code Cline
- **最小范围**：fork 官方 `custom-compaction.ts`，加 `registerMessageBuilder`（压缩双产物）+ `handoff/auto-{ts}-{slug}.md` 写出 + `.cline/index.jsonl` 索引追加 + `session_start` hook（输出"上次到哪里"）
- **5 个验证目标**：母本稳定改造 / 闭环成立 / 体验优于纯 Skill / SDK 适配成本 ≤半天 / Plugin-Skill 边界决策犹豫 ≤2 次

### 1.2 距 ADR-002 Accepted 后 3 天的实际进展（2026-06-23 → 2026-06-26）

这 3 天未启动 P5 Plugin 实验，但在 search-orchestrator 子项目上完成了大量工作：

| 工作项 | 产出 | 与 P5 的相关性 |
|--------|------|---------------|
| Run #14 P5 Gap Ledger | 4/5 双盲验证通过，升级 active | 证明提示词层 + SKILL 层机制能解决"证据缺口枚举"问题 |
| #24 搜索 MCP 反-bot 节流 wrapper | 方案 C 落地，11/11 测试通过 | 证明"薄 wrapper + 代码层节流"能解决运行时问题，无需 Plugin |
| 项目化发布 GitHub | cline-search-orchestrator 仓库公开 | 项目形态实证：薄 Skill + wrapper + 文档已可独立交付 |
| GPT 三轮 SKILL 评审 | 9/10，无设计硬伤 | 外部专家认可 SKILL 层设计完备性 |
| SKILL.md 两处设计改进 | §2.1 fetch 归档分模式 + §3.3 T1 冲突标记 | SKILL 层持续演化能力获验证 |

### 1.3 当前工作流成熟度（提案方陈述）

提案方认为已沉淀的三件套工作流"相当舒服"：

1. **状态快照**：`docs/handoff.md`——会话级决策、净变化、下次第一句话；project-rules.md 4.a/4.b/4.c 三触发器防止过早/过晚交接
2. **项目级决策**：`docs/decisions/`——ADR（战略）+ D（运营）分层，frontmatter 状态机（proposed/active/deferred/superseded/rolled-back），supersedes 链可追溯
3. **经验库**：`docs/mechanism-candidates.md`——22+1 条经验，A/B/C 分类，状态机（候选/实验中/已机制化/永久C类/已退休），"首要目标是发现可机制化经验并推动其退休"

三件套由 `docs/project-rules.md` 的"三份文档职责划分 + 五条防漂移约束"治理，已运行稳定。

---

## 2. 支持舍弃的论据（提案方立场）

### 2.1 工作流已覆盖 ADR-002 §L3 部分目标

ADR-002 §L3（经验机制化）的演化路径：`V1 提示词 → V2 Skill 提醒 → V3 Plugin 自动 → V4 Cline 原生`。当前三件套工作流已在 V1/V2 层稳定运行，且 search-orchestrator 的 14 轮 A/B 实验证明 V2 层（SKILL）能固化大量运行手册级经验（Gap Ledger / P3 Citation / P4 Dedup / P6 Highlights 均已机制化进 SKILL.md）。

**论据**：若 V2 层已能覆盖绝大多数经验，V3 Plugin 的增量主要在"自动化触发"（compact 自动 vs 手动 / hook 检测 vs 提示词提醒），增量价值是否值得 1–2 周投入存疑。

### 2.2 "薄 wrapper + 代码层"已解决一类运行时问题

#24 搜索 MCP wrapper（方案 C）证明：运行时确定性问题（反-bot 节流）应交给代码而非提示词，且**不需要 Plugin**——一个 11 测试通过的薄 wrapper MCP 即可解决。mechanism-candidates #24 状态已"已机制化"。

**论据**：这提供了 Plugin 之外的第二条机制化路径（MCP wrapper），且该路径在 VS Code 可用、无 SDK 0.x 风险、无跨环境迁移成本。

### 2.3 VS Code 不可用硬约束未解除

ADR-002 已确认 Plugin 在 VS Code Cline 不可用。3 天来此约束无变化（Cline SDK 仍 v0.0.x，官方文档未更新）。P5 实验只能在 CLI/SDK 环境跑，而用户主工作流在 VS Code——**实验环境与生产环境分离**，实验结论难以直接迁移。

**论据**：即使 P5 实验证明 Plugin 收益显著，也无法在主工作流应用，"等待 VS Code 支持后进入主交付"的承诺无时间表，等于无限期暂缓。

### 2.4 SDK 0.x 风险未降低

> **⚠️ Stale 标注（2026-06-27，ADR-002 Update 5）**：本节"社区无 Plugin 实战沉淀"论据**作废**——经 [Marketplace 开发机制并行调查](investigation-note-marketplace-dev-mechanism.md) 证伪：npm @cline/sdk 周下载 23 万+，GitHub 外部贡献者 abeatrix 7 个 plugin PR 已合并，Marketplace 上架 ~22 Plugins。
>
> 但 SDK 0.x 风险论据**独立成立**（SDK 仍 0.x），§2.4 整体结论可能不变。详见 [ADR-002 Update 5](ADR-002-project-shape.md) 事实 4 + C6 Conflict。

ADR-002 §退休条件列出"SDK 达到 v1.0+"。当前 Cline SDK 仍 v0.0.51，~~社区无 Plugin 实战沉淀~~（已作废，见上方 stale 标注）。P5 实验验证目标④（SDK 适配成本 ≤半天）在 0.x 阶段不可控——SDK 1–2 周内可能有破坏性变更。

**论据**：在 SDK 不稳定期投入实验，适配成本可能远超半天，且实验结论可能因 SDK 重构而失效。（注：本论据基于 SDK 0.x，不依赖"社区无沉淀"作废论据）

### 2.5 机会成本

1–2 周投入 P5 的机会成本：消融实验（验证已有机制真实收益）、新功能开发、CSDN 博客推广等。P5 的预期收益（验证 Plugin 是否值得未来主线）在 VS Code 不可用约束下变现路径模糊。

---

## 3. 反对舍弃的论据（评审应认真考量）

### 3.1 当前工作流本质是 C 类半机制化，未触及运行时自动化

project-rules.md 自述："本文件本身就是 C 类（治理思考方式）的半机制化辅助。"三件套工作流中：

- handoff.md：手动触发（4.a）或启发式触发（4.b/4.c），无自动检测
- ADR/D：完全人工决策与维护
- mechanism-candidates：人工识别 + 人工状态维护

**论据**：ADR-002 §L3 明确"经验不是最终形态，只是机制缺失时的补丁"，最终目标是"经验不断退出，机制不断接管"。当前工作流的"舒服"可能源于**对 C 类半机制化的熟悉**，而非已达到 V3 运行时自动化。舍弃 P5 等于放弃 V3 路径的唯一探针。

### 3.2 mechanism-candidates #1–#4 无机制化路径

#1（终端假死）、#2（PowerShell 阻塞参数）、#3（UTF-8 乱码）、#4（循环跳出）均标"候选"，理想机制均为 plugin（`tool_call_after` hook / shell-wrapper / loop-guard）。若舍弃 P5：

- 这 4 条经验要么永久停留在"候选"（清单沦为目录）
- 要么降级为"永久C类"（承认不可机制化，违背 ADR-002 Mechanism Principle）
- 要么寻找非 Plugin 路径（如 .cline/hooks 文件 hook，但 ADR-002 表格标注其可用性"由 Cline 实现而定"，未验证）

**论据**：舍弃 P5 不是只舍弃一条实验线，而是连带阻塞 #1–#4 的机制化路径，需明确这些经验的归宿。

### 3.3 搜索（认知任务）与 compact/handoff（运行时任务）本质不同

search-orchestrator 的成功（14 轮 A/B + #24 wrapper）证明的是**认知任务**可在提示词 + 薄 wrapper 层解决。但 ADR-001/002 关心的 compact/handoff/resume 是**运行时任务**——需要在 Cline 流水线的特定时机（compact 触发 / session 启动）自动介入，提示词层无法感知这些时机。

**论据**：search-orchestrator 的成功**不可推广**到 ADR-001 场景。提案方"已沉淀舒服工作流"的论据主要基于认知任务经验，运行时任务的机制化仍依赖 Plugin 或等价 hook 能力。

### 3.4 ADR-002 硬性出口要求评审依据，不允许"感觉舒服"作为退出理由

ADR-002 §实验结束硬性出口明确三种结论：未来主线候选 / 保留实验线 / 退出。"退出"要求"SDK 0.x 风险过高或核心闭环跑不通"——这是**技术性退出条件**，非主观舒适度判断。

**论据**：以"工作流舒服"为由退出，可能不符合 ADR-002 既定退出标准。评审应判断：舒服感是否构成充分退出依据，还是需要先做最小实验（至少验证目标①②：母本能否 fork + 闭环能否跑通）再决定。

### 3.5 session_start hook 的缺失影响 resume 体验

73% 任务为 resumed（ADR-001 Context）。当前 resume 完全依赖用户手动"先读 handoff.md"（mechanism-candidates #6），无自动检测与提示。P5 的 `session_start` hook 是该痛点的唯一自动化路径。舍弃 P5 意味着 resume 体验持续依赖人工纪律。

**论据**：73% 场景的自动化收益被放弃，需评估这是否可接受。

---

## 4. 中间路径选项（非 binary）

评审不必只在"完全舍弃 vs 完全继续"间二选一。以下中间路径供考量：

### 选项 A：完全舍弃（提案方倾向）

- P5 实验线终止
- 从 mechanism-candidates 移除 Plugin 作为理想机制（#1–#6、#14 改标"永久C类"或寻找替代机制）
- ADR-002 Update 记录退出决定
- 退出依据：工作流成熟 + VS Code 不可用 + SDK 风险

### 选项 B：暂缓 + 明确触发条件

- P5 实验线保留为"候选（暂缓）"
- 设定启动触发条件（满足任一即重启）：
  - Cline SDK 达到 v1.0+
  - Cline Plugin 支持 VS Code
  - 当前工作流出现明确瓶颈（如 compact 漏触发导致上下文丢失 / resume 忘读 handoff 导致重复工作）
  - #1–#4 中任一经验被证明严重影响体验且提示词层无解
- ADR-002 Update 记录暂缓决定与触发条件
- 符合 project-rules.md 状态约定："候选（暂缓）— 触发条件：XXX"

### 选项 C：缩减范围（只做最小闭环验证）

- 只做 P5 验证目标①②：fork `custom-compaction.ts` + 实现 compact→handoff→index 闭环
- 不做 `session_start` hook（依赖未探测的 Phase 2 能力）
- 不做体验对照（验证目标③，主观且耗时）
- 时间窗口压缩至 2–3 天
- 产出：闭环是否跑通的技术性结论，作为 go/no-go 硬依据
- ADR-002 Update 基于实验数据决定后续

### 选项 D：转化形态（非 Plugin 路径）

- 放弃 Plugin 路径，探索 ADR-002 表格提到的"文件 Hook（.cline/hooks/*）"或外部 watcher
- 用文件 Hook 实现 compact 触发→handoff 写出（若 Cline 支持）
- 用外部 watcher（监听 `.cline/` 目录变化）实现 index 追加
- 优势：VS Code 可用、无 SDK 依赖
- 风险：文件 Hook 可用性未验证（ADR-002 标注"由 Cline 实现而定"）；外部 watcher 增加系统依赖

---

## 5. 评审问题清单

请外部评审就以下问题给出明确意见（每题给出立场 + 理由）：

### Q1：工作流成熟度判定

当前三件套工作流（handoff + ADR + mechanism-candidates）是否已充分覆盖 ADR-002 §L3 经验机制化目标？还是本质停留在 C 类半机制化（V1/V2 层），未触及 V3 运行时自动化？提案方"相当舒服"的判断，是有效退出依据，还是熟悉度偏差？

### Q2：经验类型可推广性

search-orchestrator 在认知任务（搜索/抽取/合成）上的成功，能否推广到 ADR-001 关心的运行时任务（compact/handoff/resume）？两类任务在"提示词层是否可独立解决"上是否存在本质差异？

### Q3：#1–#4 经验归宿

若舍弃 P5，mechanism-candidates #1（终端假死）、#2（PowerShell 阻塞）、#3（UTF-8 乱码）、#4（循环跳出）的理想机制均为 plugin，其机制化路径如何处理？降级为永久C类是否违背 ADR-002 Mechanism Principle？是否存在 Plugin 之外的可行机制（文件 Hook / 外部 watcher / Cline 原生能力）？

### Q4：中间路径推荐

在选项 A（完全舍弃）/ B（暂缓+触发条件）/ C（缩减范围最小验证）/ D（转化形态）中，哪个最符合：
- ADR-002 §实验结束硬性出口的退出标准
- OUTLINE §10.3 战略债清理规则（不允许观望）
- project-rules.md 状态约定（候选/实验中/已机制化/永久C类/已退休）

### Q5：resume 自动化（73% 场景）

73% 任务为 resumed。当前 resume 完全依赖人工"先读 handoff.md"。舍弃 P5 后，resume 自动化的替代路径是什么？人工纪律是否可长期依赖，还是会随任务复杂度增长而失效？

### Q6：决策时序

是否应先做选项 C（2–3 天最小闭环验证）获得技术性数据，再决定 A/B/D？还是可直接基于现有论据（VS Code 不可用 + SDK 风险 + 工作流成熟）选择 A/B 而无需实验？

---

## 6. 评审输出要求

请外部评审输出：

1. **总体立场**：支持舍弃 / 反对舍弃 / 推荐中间路径（指明哪个）
2. **逐题回答**：Q1–Q6 每题给出立场 + 理由（可引用本材料章节）
3. **额外论据**：若评审发现本材料未覆盖的重要论据（正/反均可），请补充
4. **建议下一步**：基于评审立场，建议项目所有者的具体动作（如"写 ADR-003 退出" / "启动选项 C 实验" / "先做能力探测验证文件 Hook"）

---

## 附：相关文档索引

- [ADR-002-project-shape.md](ADR-002-project-shape.md)——项目形态与分层架构（含 Update 1）
- [ADR-001-handoff-compact-memory.md](ADR-001-handoff-compact-memory.md)——Handoff/Compact/Memory 架构方向
- [mechanism-candidates.md](../mechanism-candidates.md)——经验机制化清单（#1–#6、#14 相关）
- [project-rules.md](../project-rules.md)——三份文档职责划分 + 五条防漂移约束
- [handoff.md](../handoff.md)——当前会话快照（2026-06-26）
- [survey.md §9.3](../search/search-orchestrator/survey.md)——search-orchestrator 路线状态（P5 Gap Ledger 已 active）

---

# 第二轮评审输入（2026-06-26 Update 1 后，含事实修正）

## 第一轮评审前提核查（含修正）

本材料第一轮（§0–§6）基于"Cline Plugin 不支持 VS Code"前提撰写。2026-06-26 核查 Cline 官方文档时发现矛盾证据，经深入核查后裁定：**该前提仍成立**——VS Code Cline 扩展（v3.89.2）未集成 plugin 装载入口。详见 [ADR-002 Update 1](ADR-002-project-shape.md)。

矛盾证据裁定：
- GitHub sdk/examples/plugins（2026-06-03）描述"extends any Cline agent — VS Code, JetBrains"——指 @cline/core SDK 内核设计能力
- docs.cline.bot/customization/plugins 明确"not applicable on VSCode and JetBrains Extension for now"——指用户操作可用性
- VS Code Marketplace Cline v3.89.2（2026-06-11）CHANGELOG 零 plugin 条目——决定性证据

准确事实：Plugin 代码层跨形态可用（@cline/core 支持），但 VS Code 扩展未开放装载入口，实验仍需 CLI 方式。

### 第一轮论据状态（修正后）

| 章节 | 原论据 | 核查后状态 |
|------|--------|------------|
| §2.3 VS Code 不可用硬约束未解除 | 支持舍弃 | **仍成立**（VS Code 扩展未集成 plugin 装载入口） |
| §2.4 SDK 0.x 风险 | 支持舍弃 | 仍成立（SDK 仍 0.x，VS Code 扩展未开放，风险未降低） |
| §3.3 实验环境与生产环境分离 | 反对舍弃 | **仍成立**（实验 CLI 与生产 VS Code 仍分离） |
| §4 选项 C（CLI 独立沙盒） | 中间路径推荐 | 不变——仍为 CLI 独立沙盒最小验证 |

### 第一轮评审意见回顾

第一轮外部评审推荐"选项 C → B 组合"（先 2-3 天最小闭环验证，再根据结果决定 A/B），核心论据：

1. 当前退出证据是价值判断（ROI 偏低），ADR-002 退出标准要求技术判断（技术不可行）
2. 工作流"舒服"只能证明 V2 足够好，不能证明 V3 没必要
3. search-orchestrator（认知任务）成功不能推广到 compact/handoff（运行时任务）
4. #1–#4 不应降级永久C类，应改"等待 Runtime 能力"
5. SDK v0.x 只支持暂缓不支持永久放弃

### Update 1 后的新事实

核查所得的 Plugin 能力补充（见 ADR-002 Update 1 §Plugin 能力补充说明）：

- **`registerMessageBuilder` 是 Plugin 独占能力**——文件 Hook / Wrapper MCP / 外部 watcher 均无法介入 model call 前的消息重写层
- **#5（compact + handoff 双产物）必须 Plugin**——这是机制清单中唯一只能由 Plugin 实现的项
- Plugin runtime hooks（8 种，含 onEvent）比文件 Hook（9 种文件事件适配）类型安全且粒度更细
- Plugin 跨形态复用（CLI/Kanban/VSCode/JetBrains）一次写到处跑

## 第二轮评审问题

请外部评审基于 Update 1 后的事实，就以下问题给出意见：

### Q2.1：事实变化后，"工作流舒服"退出依据权重

第一轮评审 Q1 认为"舒服"不能单独构成退出依据。核查后 VS Code 硬约束仍成立、registerMessageBuilder 独占性确认——这是否影响"舒服"作为退出依据的权重？还是说"舒服"仍有一定参考价值（即使 Plugin 在 VS Code 不可用，若当前工作流已够用，是否仍需投入 CLI 实验）？

### Q2.2：registerMessageBuilder 独占性对 P5 必要性的影响

Update 1 确认 `registerMessageBuilder` 是 Plugin 独占，#5（compact + handoff 双产物）必须 Plugin。这是否将 P5 实验从"验证 Plugin 是否值得未来主线"转变为"验证 #5 唯一实现路径是否可行"？实验目的和评估指标是否需要相应调整？

### Q2.3：#1–#4 归宿重新判定

第一轮评审建议 #1–#4 改"等待 Runtime 能力"。核查后 VS Code 扩展未集成装载入口，#1–#4 的理想机制（plugin）可行路径未恢复。这些经验是否应维持"等待 Runtime 能力"？还是仍维持暂缓（因 #1–#4 非 P5 最小范围）？

### Q2.4：选项重新评估

基于 Update 1 后的事实，选项 A/B/C/D 的优先级是否需重排：

- **选项 A（完全舍弃）**："VS Code 不可用"仍成立（v3.89.2 未集成 plugin 装载入口），舍弃依据为"工作流舒服 + SDK 0.x 风险 + 机会成本 + 平台不可用"，是否充分？
- **选项 B（暂缓+触发条件）**：触发条件"VS Code 支持 Plugin"未命中（v3.89.2 未集成装载入口），暂缓理由仍成立，是否维持暂缓？
- **选项 C（最小闭环验证）**：成本未下降（仍需 CLI 方式），是否应立即启动？
- **选项 D（转化形态/文件 Hook）**：Update 1 确认文件 Hook 无 `registerMessageBuilder`，对 #5 不可用，是否应排除？

### Q2.5：SDK 0.x 风险权重

第一轮评审认为"SDK v0.x 只支持暂缓不支持永久放弃"。Update 1 后 Plugin 已跨形态可用（含 VS Code），SDK 0.x 风险权重是否进一步下降？还是说 0.x 阶段的破坏性变更风险仍足以构成暂缓理由？

### Q2.6：实验范围与 go/no-go 标准

若启动选项 C（VS Code 最小闭环验证），基于 Update 1 后的事实，建议的实验范围与 go/no-go 标准：

- **范围**：是否只验证 #5（registerMessageBuilder + handoff 双产物）？还是包含 #6（session_start hook）？
- **go 标准**：闭环跑通 + handoff.md 写出 + index 追加？是否需要体验对比？
- **no-go 标准**：SDK 适配成本超阈值？闭环跑不通？还是其它？
- **时间窗口**：原 1-2 周，Update 1 后是否可压缩？

## 第二轮评审输出要求

请外部评审输出：

1. **总体立场**：基于 Update 1 后事实，是否仍推荐 C→B 组合？还是调整为其它方案？
2. **逐题回答**：Q2.1–Q2.6 每题给出立场 + 理由
3. **与第一轮的差异**：明确指出哪些第一轮结论因 Update 1 而改变，哪些仍成立
4. **建议下一步**：基于更新后事实，建议项目所有者的具体动作
