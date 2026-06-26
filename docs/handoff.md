# Handoff — ADR-002 Update 1 事实修正 + P5 Spike 暂停 + 第二轮评审材料修正

## 本会话决策

| 决策 | 状态 |
|------|------|
| 启动 P5 Capability Spike（基于第二轮评审 C→Go/A 推荐） | ⏸ **暂停**——核查发现 VS Code 扩展未集成 plugin 装载入口，"VS Code 直接实验"前提失效 |
| 核查 Cline Plugin VS Code 支持状态（矛盾证据裁定） | ✅ 完成——VS Code 扩展 v3.89.2 未集成装载入口，docs.cline.bot 声明准确 |
| 修正 ADR-002 Update 1（"VS Code 已支持"→"扩展未集成装载入口"） | ✅ 完成（commit `0f20db4`） |
| 修正第二轮评审材料（前提回到"VS Code 不可用"仍成立） | ✅ 完成（commit `0f20db4`） |
| 更新 handoff | ✅ 用户口头要求，触发 project-rules.md 4.a |

---

## 本会话净变化

### 1. ADR-002 Update 1 事实修正（本会话最重大）

上一会话基于 GitHub sdk/examples/plugins 页面（2026-06-03）的"extends any Cline agent — VS Code, JetBrains"声明，得出"VS Code 已支持 Plugin"结论，写入 ADR-002 Update 1。

本会话启动 P5 Spike 前核查装载方式时发现**矛盾证据**：

| 来源 | 原文 | 语义层面 |
|------|------|---------|
| GitHub sdk/examples/plugins（2026-06-03） | "extends any Cline agent — VS Code, JetBrains" | **SDK 设计能力范围**——plugin 代码可扩展任何基于 Core SDK 的 agent 内核 |
| docs.cline.bot/customization/plugins | "not applicable on VSCode and JetBrains Extension for now" | **用户操作可用性**——`cline plugin install` 在 VS Code 扩展中不可用 |
| VS Code Marketplace Cline v3.89.2（2026-06-11）CHANGELOG | 无 "plugin" 相关条目（Grep 零匹配） | **决定性证据**——VS Code 扩展从未集成 plugin 装载 UI |

**裁定结论**：docs.cline.bot 声明准确，VS Code 扩展未集成 plugin 装载入口。GitHub sdk/examples/plugins 描述的是 @cline/core SDK 内核的设计能力范围（plugin 代码层面确实可跨形态扩展），但 VS Code 扩展的前端 UI 层尚未暴露装载入口。

**准确事实**：
- ✅ Plugin **代码层面**跨形态可用（@cline/core SDK 支持，一次写到处跑的设计成立）
- ❌ VS Code 扩展（v3.89.2）**尚未集成 plugin 装载入口**（无 UI、无命令、CHANGELOG 无记录）
- 实验仍需 **CLI 方式**（`npm i -g cline` + `cline plugin install`），不能在 VS Code 直接实验

ADR-002 Update 1 已直接修正（非追加 Update 2，保留 Update 1 编号但内容修正）：
- 标题改为"Cline Plugin VS Code 支持状态核查（含修正）"
- 事实变化表改为矛盾证据裁定
- 影响表"已失效"改回"仍成立"
- 后续动作 VS Code 改回 CLI

### 2. 第二轮评审材料修正

[ADR-002-p5-experiment-exit-review.md](decisions/ADR-002-p5-experiment-exit-review.md) 第二轮评审输入章节基于"VS Code 已支持"前提，本会话已修正：
- 开头声明改为"前提仍成立"
- 论据状态表"已失效"改回"仍成立"
- Q2.1/Q2.3/Q2.4 的 VS Code 表述全部修正

### 3. P5 Spike 暂停

第二轮评审推荐"1 天 VS Code 直接实验"。本会话核查发现 VS Code 不可用后，Spike 执行环境需改回 CLI 方式。用户选择**暂停 Spike + 重评**——将修正后的事实交外部评审重新评估。

experiments/p5-spike/ 空目录已清理。

---

## 本会话修改文件

| 文件 | 改动 |
|------|------|
| `docs/decisions/ADR-002-project-shape.md` | Update 1 事实修正（标题/事实变化表/影响表/后续动作/末尾说明） |
| `docs/decisions/ADR-002-p5-experiment-exit-review.md` | 第二轮评审输入修正（开头/论据表/Q2.1/Q2.3/Q2.4） |
| `docs/decisions/README.md` | ADR-002 索引行 Update 1 描述修正 |
| `docs/handoff.md` | 覆盖为本交接 |

---

## 当前路线图

权威源：
- [survey.md §9.3 最终路线状态](search-orchestrator/survey.md)
- [mechanism-candidates.md](mechanism-candidates.md)

本会话无 P 级路线状态变化（ADR-002 status 仍 active，非路线项跳转）。

P 级机制 active 清单（6 条，与上次 handoff 一致）：P1 / P1.5 / P3 / P4 / P5 Gap Ledger / P6。
Infra 机制 active（1 条）：#24 wrapper。

---

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **第二轮评审材料重评** | 修正后的评审材料（[ADR-002-p5-experiment-exit-review.md](decisions/ADR-002-p5-experiment-exit-review.md)）需交外部评审重评。核心问题：VS Code 不可用前提下，是否仍推荐 C（CLI 方式 Spike）还是转为 A/B | 高 |
| 决策文档事实审核 7 项修订 | 见上一 handoff §4 修订表（capability-probe session_id 过时 / arXiv 年份笔误 / 5倍声明无源 / Exa 否定召回自相矛盾 / Exa highlights 描述过时 / mechanism-candidates #24 token-bucket 错误 / 永久 Tier C 措辞张力） | 中 |
| **P5 Capability Spike（条件性）** | 取决于重评结果。若仍推荐 C：fork custom-compaction.ts + 改造 registerMessageBuilder + handoff/index 双产物 + **CLI 方式**验证（npm i -g cline + cline plugin install）。Go→ADR-003 / No-Go→退出 | 高（条件性） |
| CSDN 博客发布 | 博客已写好（`docs/blog/csdn-search-orchestrator.md`），待用户手动复制到 CSDN 编辑器发布 | 中 |
| 消融实验（Ablation） | GPT 终评建议。按计划推进，不作为主任务 | 中 |
| SKILL 平台化拆分 | 触发条件：SKILL > 1200 行 或 单 Phase > 300 行。当前 ~800 行，未达触发线 | 低 |
| Goggle 域名表数据化 | 触发条件：Goggle >10 或单表 >20 行。当前 5 个，未达触发线 | 低 |
| #22 Browser Fetch 启动评估 | 候选（暂缓）。仅当 Tier C snippet-only 被证明严重影响答案质量才启动 | 低 |
| #24 V2 backend 切换 | 暂缓。DDG 持续不可用时启动 | 低 |

---

## Handoff（下次会话第一句话建议）

首句话提示词：

```text
先读 docs/project-rules.md 一次，遵守里面的三份文档职责划分与五条防漂移约束。
然后读 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：本会话修正了上一会话 ADR-002 Update 1 的事实错误——核查发现 VS Code Cline 扩展（v3.89.2）未集成 plugin 装载入口（CHANGELOG 零 plugin 条目为决定性证据），"VS Code 已支持 Plugin"结论被推翻，准确事实为"Plugin 代码层跨形态可用，但 VS Code 扩展装载入口未开放，实验仍需 CLI 方式"。Update 1 已直接修正，第二轮评审材料前提回到"VS Code 不可用"仍成立。P5 Spike 暂停——用户选择将修正后的事实交外部评审重评。下次会话首要任务是接收第三轮外部评审意见并落地（若仍推荐 C 则启动 CLI 方式 Spike，若转 A/B 则写 ADR-003/Update 2）。注意：registerMessageBuilder 独占性结论不变（这不依赖 VS Code 扩展），#5 compact+handoff 双产物仍必须 Plugin。
