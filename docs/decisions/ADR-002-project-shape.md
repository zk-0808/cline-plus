# ADR-002: 项目承载形态与分层架构

- **Status**: Accepted（2026-06-23 二次修订，纳入 VS Code 不支持 Plugin 的硬约束 → Plugin 退出主交付路径）
- **Date**: 2026-06-23
- **Deciders**: 项目所有者
- **Supersedes**: 无
- **Related**: ADR-001（Handoff / Compact / Memory）、Capability Probe Phase 1、Plugin Dev Quick Reference

---

## Context

项目最初定位为一组围绕 Cline 的增强能力集合，包括：

- Skills
- MCP Server
- 外部脚本
- Handoff / Memory / Workflow 相关机制

Capability Probe Phase 1（2026-06-23）确认了三件事：

1. Cline 已开源 `@cline/sdk`（Apache-2.0，当前 v0.0.51），同一 SDK 内核驱动 VS Code 扩展 / CLI / JetBrains / Kanban
2. Plugin 体系提供：`registerTool` / `registerCommand` / `registerMessageBuilder` / 生命周期 `hooks`（含 `beforeModel` / `afterRun` / `tool_call_before` 等）+ Hook Policy（timeout / retry / fail_closed）
3. 原计划中的部分机制——尤其是 ADR-001 A 项"复用 Cline Compact"——更优雅的实现路径是**作为 Cline 流水线的一部分**通过 `registerMessageBuilder` 或 `beforeModel` 实现，而非"事后监听"

Plugin Dev Probe（2026-06-23）追加确认了一个**硬约束**：

4. **Cline Plugin 当前不适用于 VS Code / JetBrains 扩展**——官方文档原文："This feature currently only applies to Cline SDK, CLI, and Kanban. This feature is not applicable on VSCode and JetBrains Extension for now."
5. 社区目前无 Plugin 实战经验沉淀（SDK v0.0.51，刚推出）

由于用户主工作流位于 VS Code Cline，这条硬约束**直接改写**了"Plugin-first"路线的可行性。

### 用户画像

- 长期使用 Cline 的开发者
- 希望快速获得良好体验
- 不希望花大量时间搭建工作环境
- 当前不存在明确跨 Agent 诉求

### 已知数据

- 73% 任务为 resumed（恢复体验是主要痛点）
- 自研 compact 路线 `compaction_count = 0`，未形成使用闭环
- 已投入一定数量的 Skills 与工作流沉淀（C 类资产）
- Cline SDK 当前仍处于 0.x 阶段

---

## Problem

在已有 Plugin 体系的情况下，本项目应以什么形态承载未来能力？需明确：

- 什么能力进入 Plugin
- 什么能力保留为 Skill
- MCP 应承担什么职责
- 项目最终定位是什么

---

## Considered Alternatives

| ID | 方案 | 关键特征 |
|----|------|---------|
| P1 | 全面 Plugin 化 | 深度整合 / 强 SDK 依赖 / 现有投资折损 |
| P2 | 维持现状 | 零迁移 / 无法利用 Plugin / 违反"不重复造"原则 |
| P3 | Plugin + MCP 双轨 | 整合 + 通用性 / 复杂度翻倍 / 当前无双轨需求支撑 |
| P4 | 职责分层（运行机制 → Plugin，认知资产 → Skill） | 保留现有投资 / 边界需长期维护 |
| P5 | 技术探针（最小 Plugin 实验） | 风险低 / 推迟最终决策 |

---

## Decision

### 当前默认交付形态（Main Line）

```text
薄 Skills
+ 单点 WebSearch MCP
+ 经验文档与规则
+ Plugin 作为实验与未来迁移线（NOT 默认交付）
```

**理由**：
1. 主工作流位于 VS Code，而 Plugin 在 VS Code Cline 不可用
2. 现有 Skill 投入需保留
3. WebSearch 是当前最明确的能力缺口
4. Plugin 适合做"经验机制化"的后续验证，不适合作为当前默认交付

### Plugin 的当前角色定位

```text
Plugin = 实验线 + 未来迁移线
Plugin ≠ 当前主交付
```

P5（最小 Plugin 实验）继续做，但**目的转变**：
- 原目的：验证 Plugin 是否能承担主交付
- 新目的：**在 CLI / SDK 自建环境中验证 Plugin 是否值得成为未来主线**

### 终局走向（保留但非强承诺）

```text
P4（Skill 主体 + Plugin 增强）→ 未来可能形态，前提是：
  - Plugin 在 VS Code Cline 中获得支持，或
  - 用户主工作流迁移到 CLI / Kanban，或
  - P5 实验证明 Plugin 收益显著高于 Skill 路径
```

不预设时间表，由 P5 实验数据 + Cline 路线图共同推动。

### 项目定位（自此固化）

> **面向 Cline 用户的开箱即用工作流增强配置——沉淀真实使用经验，并逐步将经验机制化，持续改善长期使用体验。**

定位拆为三层（按用户感知顺序）：

**L1 开箱体验**（用户首先感知）
用户安装后立刻得到：基础 Skill 集合 + 合理默认规则 + WebSearch MCP + 一套经过验证的工作流。这是项目的**入口价值**。

**L2 经验沉淀**（项目差异化）
真正难复制的不是 Skill 本身，而是长期使用 Cline 的踩坑经验——哪些规则有效、哪些导致上下文污染、哪些工作流容易失控、哪些操作应该机制化。这是项目的**护城河**。

**L3 经验机制化**（长期演化方向）
经验不是最终形态，只是机制缺失时的补丁。演化路径：
```
V1: 提示词告诉模型"终端卡死怎么办"
V2: Skill 提醒模型检测终端状态
V3: Plugin 自动检测并恢复
V4: Cline 原生支持
```
最终目标：**经验不断退出，机制不断接管。** 这与 OUTLINE §1 A 类纪律完全一致。

不追求全面 Plugin 化，不追求跨 Agent 通用，不建设通用平台。

### 分层职责

**Plugin（运行机制）**
承担运行时切入点，A 类机制化的主战场。包括：
- Handoff（基于 `registerMessageBuilder` 在 compact 时双产物输出）
- Resume（基于 `session_start` / `run_start` hook）
- Compact 集成（参与 Cline 流水线，不自建独立 compact）
- 状态检测、Workflow Guard、运行时提醒与防错

原则：**将踩坑经验尽可能转化为运行时约束与自动化能力。**

**Skill（认知资产）**
承担 C 类资产沉淀，提供方法论默认值。包括：
- 工作流模板
- 调研框架
- ADR 模板
- Handoff 模板
- 常见实践指南

原则：**Skill 提供默认方法论，而非追求完整知识库。用户应能够自行扩展与替换。**

**MCP（补缺工具）**
仅解决 Cline 当前明确缺失的能力。V1 默认范围：
- **WebSearch**（项目唯一默认附带的 MCP）

为什么是 WebSearch：Cline 当前确实缺搜索能力 / 用户价值立即可见 / 实现成本低 / 不依赖 Plugin 稳定性。

原则：**MCP 只解决明确缺口，不建设通用平台。**

**文档**
沉淀项目经验。包括踩坑记录、设计决策、最佳实践、迁移说明。

原则：**优先解释"为什么这样设计"，而不是堆积操作说明。**

### V1 项目默认组成

```text
Core Package（默认分发）
├─ 基础 Skills          (L1 开箱体验 + L2 经验沉淀)
├─ 默认规则             (L1 + L2)
└─ WebSearch MCP        (L1 缺口补齐)

Experimental Line（独立、不进默认包）
└─ Plugin              (L3 机制化探路，CLI/SDK 环境)
```

V1 显式**不包含**：
- 大规模 Plugin 重构
- Plugin 进入默认交付包
- MCP 双轨体系
- 跨 Agent 兼容层
- 完整知识管理体系（经验库不做全盘点）

### Plugin Hook vs 文件 Hook 共存说明

OUTLINE §6 "Windows Hook 替代"原假设需要修正——**两者并存，非替代**：

| Hook 类型 | 适用场景 | 当前可用性 |
|----------|---------|-----------|
| **文件 Hook**（`.cline/hooks/*`） | 用户/工作区级自定义脚本 | 跨 OS（含 Windows）由 Cline 实现而定 |
| **Plugin Hook**（typed runtime callback） | 可复用扩展、类型化访问 | **仅 CLI/SDK/Kanban**，VS Code 不可用 |

### Mechanism Principle（经验机制化原则）

经验按 A/B/C 分类管理：

| 类别 | 处置 | 载体 |
|------|------|------|
| **A 类** | 优先机制化 | Plugin |
| **B 类** | 工程约束 | Plugin / 配置 + 退休标记 |
| **C 类** | 保留 | Skill / 文档 |

> **经验库的首要目标不是归档，而是发现可机制化经验并推动其退休。**

具体载体见 [`mechanism-candidates.md`](../mechanism-candidates.md)——以"现存经验 → 当前位置 → 类别 → 理想机制 → 状态"五列简表组织，不做更复杂分类。

### 与 ADR-001 的对齐

- ADR-001 A 项（复用 Cline Compact）→ 在本 ADR 下具体化为：**通过 `registerMessageBuilder` 实现"compact + handoff 文件"双产物**，由 Plugin 层承载
- ADR-001 D 项（可版本化索引层）→ Plugin 写入 `.cline/index.jsonl`，Skill 提供索引使用模板
- ADR-001 F 项（capability probe prerequisite）→ Phase 1 已完成主要回答，剩余 session_id 等细节降级为 Design Doc 的实现待确认项

---

## Consequences

### 正面

- 项目定位更加聚焦，"开箱即用 + 体验增强"成为单一目标
- 保留现有 Skill 投资（C 类资产不被冲掉）
- 避免重复建设 Cline 已有能力（符合 OUTLINE §0.2）
- Plugin 只承担高价值运行时能力，表面积受控
- MCP 范围收敛到 Web Search，维护成本低
- 与 Cline 的整合路径官方化，跨 IDE（VS Code / JetBrains / CLI）一次实现

### 负面

- Plugin 与 Skill 的边界需要长期维护，存在边界漂移风险
- SDK 0.x 变化仍可能带来适配成本（实验阶段将测量这一成本）
- 部分能力可能需要经历二次重构（实验 → 固化）
- "跨 Agent 通用性"被显式放弃，未来若产生此需求需重开 ADR

### 退休条件 / Review Trigger

满足任一条件时本 ADR 应重新评审：

- **SDK 达到 v1.0+**（SDK 稳定后 P1 风险骤降）
- **Plugin 能力覆盖项目主要需求**（Plugin 已能替代多数 Skill 职责）
- **出现明确跨 Agent 诉求**（P3 双轨开始有用户支撑）
- **Plugin 代码规模超过 Skill 规模**（信号：Plugin 行数 > Skill 行数；P4 边界已漂移）
- Cline 原生集成 Handoff / Resume / Workflow Guard（整个项目部分能力可退休）
- SDK 架构发生重大变化（破坏性升级）
- **Marketplace 上架 plugin 数 > 50**（社区活动信号——触发社区活动复查，依据 [evidence-governance.md §16](../evidence-governance.md)）
- **npm @cline/sdk 周下载量 > 50 万**（社区活动信号——触发社区活动复查，依据 [evidence-governance.md §16](../evidence-governance.md)）

届时重新评估 P1 / P3 的必要性，或考虑项目整体退休。

---

## Validation Plan（P5 实验范围）

### 实验环境（硬约束）

P5 实验**不能**在 VS Code Cline 中运行（Plugin 不支持）。可选环境：

| 选项 | 描述 | 推荐度 |
|------|------|--------|
| **a. Cline CLI** | `npm i -g cline`，独立进程跑实验，VS Code Cline 继续主用 | ✅ 首选（双轨最自然） |
| **b. SDK 自建 Agent** | 用 `@cline/sdk` 写最小宿主跑实验 | 备选（隔离最干净，但要写宿主代码） |
| **c. 独立实验仓** | 单独建一个 git repo，专门承载 P5 | 配套手段（不与 a/b 互斥） |

默认走 **a + c**：CLI 跑实验 + 独立仓承载产物。

### 最小可行 Plugin 范围（避免实验飘移）

实验仅实现一个 plugin 文件，**以官方 `custom-compaction.ts` 为母本 fork 改造**：
> 来源：[github.com/cline/cline/blob/main/sdk/examples/plugins/custom-compaction.ts](https://github.com/cline/cline/blob/main/sdk/examples/plugins/custom-compaction.ts)

**包含**：
- 一个 `registerMessageBuilder`（沿用母本逻辑）：在 token 估算超阈值时，将中间历史压缩为 summary message
- 在压缩同时，**同步写出** `handoff/auto-{timestamp}-{slug}.md`
- 在 `.cline/index.jsonl` 追加一条索引记录（含 `schema_version` / `slug` / `ts` / `ref` / `source: auto`）
- 一个 `session_start` 类 hook（具体注册方式 Phase 2 待确认）：检测最近 handoff 并向 console 输出"上次到哪里"

**不包含**（避免实验吃成饭）：
- inline / crosswindow / silent 三档判定
- `/where` slash command
- task_type 模板分化
- 任何 UI 集成
- 安装包发布
- 进入默认交付包

### 验证目标（重新对齐"实验线"定位）

实验目的不再是"是否能承担主交付"，而是 **"是否值得成为未来主线"**。验证目标相应调整：

| # | 验证目标 | 度量方式 | 通过标准 |
|---|---------|---------|---------|
| 1 | `custom-compaction.ts` 母本能否稳定改造 | fork + 安装 + 触发一次有效压缩 | 至少触发 1 次有效压缩，无类型错误 |
| 2 | compact → handoff → index 最小闭环是否成立 | 单次 build 内同时产出 summary + handoff.md + index.jsonl 行 | 三个产物齐全 |
| 3 | 实验体验是否**明显优于**纯 Skill / 文档方案 | 同任务在 VS Code（Skill）vs CLI（Plugin）对照，主观打分 + 续作 token 节省 | Plugin 路径中位数提升 ≥ 1 档（5 档量表）|
| 4 | SDK 1–2 周内变更与适配成本 | 记录实验期 SDK 版本变更次数 + 破坏性影响 | 适配工作量 ≤ 半天 |
| 5 | Plugin 与 Skill 的职责边界是否自然清晰 | 实验中是否反复纠结"该 Plugin 还是 Skill" | 决策犹豫次数 ≤ 2 次 |

### 实验结束硬性出口

1–2 周后**必须**产出 ADR-002 Update（或 ADR-003），明确以下之一：
- **未来主线候选**：若实验证明 Plugin 收益显著高于 Skill 路径 → 标记为"等待 VS Code 支持后进入主交付"
- **保留实验线**：若收益不明显 → Plugin 继续在 CLI/SDK 实验线，不进默认包
- **退出**：若 SDK 0.x 风险过高或核心闭环跑不通 → P5 终止，从 mechanism-candidates 移除 Plugin 选项

不允许继续观望（OUTLINE §10.3 战略债清理规则）。

### 启动步骤（来自 plugin-dev-quick-reference §11）

```bash
# 1. 安装 Cline CLI
npm i -g cline

# 2. 在独立实验仓创建工作目录
mkdir -p experiments/handoff-probe-plugin
cd experiments/handoff-probe-plugin

# 3. fork 官方 custom-compaction.ts 作为起点
curl -O https://raw.githubusercontent.com/cline/cline/main/sdk/examples/plugins/custom-compaction.ts
mv custom-compaction.ts handoff-probe.ts

# 4. 改造：加 handoff.md 写出 + index.jsonl 追加

# 5. 本地安装
cline plugin install ./handoff-probe.ts --cwd .

# 6. 验证装载
cline config

# 7. 实跑长任务触发 compact
cline -i "..."
```

---

## Next Steps

```text
ADR-002 (Accepted)
        ↓
P5 最小实验 Plugin 启动（独立沙盒，不影响主项目）
        ↓
1–2 周实验 + 数据收集
        ↓
ADR-002 Update / ADR-003：固化 P4 或转 P1/P2
        ↓
Handoff v2 Design Doc（基于实验结果落实现细节）
        ↓
Implementation
```

---

> **Methodology Note (added 2026-06-27, after Update 4):**
>
> Updates 1–4 predate the [Evidence Governance framework](../evidence-governance.md) and therefore do not distinguish Observation / Evidence / Hypothesis / Verified / Decision states, nor do they annotate Confidence levels or maintain a Conflict Registry. They should be interpreted under the previous methodology.
>
> Specifically:
> - Update 1 jumped from CHANGELOG (negative evidence) directly to Decision ("VS Code 扩展未集成 plugin")
> - Update 2 jumped from minified code Grep to semantic conclusion (误判 zod schema)
> - Update 3 jumped from minified code path concatenation to install-path conclusion (DGu 函数语义误读)
> - Update 4 jumped from official docs to final conclusion (碰巧正确，但方法论仍错)
>
> From **Update 5 onward**, all conclusions must follow the Evidence Governance framework: each conclusion must annotate Observation / Inference / Evidence Type / Confidence / Remaining Unknown, and must not skip states (Observation → Evidence → Hypothesis → Verified → Decision).
>
> Historical Updates are preserved unchanged for traceability. See [workflow-review-2026-06-27.md](../archive/workflow-review-2026-06-27.md) for the full root-cause analysis and external review.

---

## Update 1 (2026-06-26): Cline Plugin VS Code 支持状态核查（含修正）

### 事实变化（经多源核查，含矛盾证据裁定）

2026-06-26 核查 Cline 官方文档时发现**矛盾证据**，经深入核查后裁定如下：

| 来源 | 原文 | 语义层面 | 核查结果 |
|------|------|---------|---------|
| [sdk/examples/plugins](https://github.com/cline/cline/tree/main/sdk/examples/plugins)（GitHub，2026-06-03 更新，Cline 创建者提交） | "extends **any Cline agent — CLI, Kanban, VS Code, JetBrains**, or anything built on the Core SDK" | **SDK 设计能力范围**——plugin 代码可扩展任何基于 Core SDK 的 agent 内核 | 描述准确，但指 SDK 层 |
| [customization/plugins](https://docs.cline.bot/customization/plugins)（docs.cline.bot） | "This feature currently only applies to Cline SDK, CLI, and Kanban. **This feature is not applicable on VSCode and JetBrains Extension for now.**" | **用户操作可用性**——`cline plugin install` 命令与 UI 入口在 VS Code 扩展中不可用 | **裁定为准**——VS Code 扩展未集成装载入口 |
| VS Code Marketplace Cline v3.89.2（2026-06-11）CHANGELOG | 无 "plugin" 相关条目（Grep 零匹配） | **版本历史佐证**——VS Code 扩展从未集成 plugin 装载 UI | 决定性证据 |

**裁定结论**：Context §4 记录的硬约束**仍成立**——VS Code Cline 扩展（v3.89.2）尚未集成 plugin 装载入口。GitHub sdk/examples/plugins 描述的是 @cline/core SDK 内核的设计能力范围（plugin 代码层面确实可跨形态扩展任何基于 Core SDK 的 agent），但 VS Code 扩展的前端 UI 层尚未暴露装载入口。

**准确事实**：
- ✅ Plugin **代码层面**跨形态可用（@cline/core SDK 支持，一次写到处跑的设计成立）
- ❌ VS Code 扩展（v3.89.2）**尚未集成 plugin 装载入口**（无 UI、无命令、CHANGELOG 无记录）
- 实验仍需 **CLI 方式**（`npm i -g cline` + `cline plugin install`），不能在 VS Code 直接实验

### 对本 ADR 的影响

| 章节 | 原内容 | Update 后状态 |
|------|--------|--------------|
| Context §4（VS Code 不可用硬约束） | Plugin 不适用于 VS Code / JetBrains | **仍成立**——VS Code 扩展未集成 plugin 装载入口（v3.89.2 CHANGELOG 零 plugin 条目） |
| Context §5（社区无实战沉淀） | SDK v0.0.51，刚推出 | 部分成立（SDK 仍 0.x；plugin 代码层跨形态可用但 VS Code 扩展未开放，社区沉淀待观察） |
| Decision §当前默认交付形态 | Plugin 作为实验与未来迁移线（NOT 默认交付） | 不变——Plugin 仍非默认交付，实验线前提未变 |
| Decision §Plugin 的当前角色定位 | P5 实验目的："在 CLI / SDK 自建环境中验证 Plugin 是否值得成为未来主线" | 不变——实验环境仍为 CLI / SDK 自建环境 |
| Validation Plan §实验环境（硬约束） | "P5 实验**不能**在 VS Code Cline 中运行（Plugin 不支持）" | **仍成立**——P5 实验仍需 CLI 方式，不能在 VS Code Cline 中运行 |
| Validation Plan §最小可行 Plugin 范围 | fork custom-compaction.ts，CLI 环境跑 | 不变——fork custom-compaction.ts，CLI 环境跑 |
| Validation Plan §启动步骤 | `npm i -g cline` + 独立实验仓 | 不变——`npm i -g cline` + 独立实验仓 |

### 对外部评审材料的影响

[ADR-002-p5-experiment-exit-review.md](../archive/decisions/ADR-002-p5-experiment-exit-review.md)（2026-06-26 撰写）基于"VS Code 不可用"前提，该前提**经核查仍成立**：

| 评审材料章节 | 原论据 | Update 后状态 |
|-------------|--------|--------------|
| §2.3 VS Code 不可用硬约束未解除 | 支持舍弃 | **仍成立**（VS Code 扩展 v3.89.2 未集成 plugin 装载入口） |
| §2.4 SDK 0.x 风险 | 支持舍弃 | 仍成立（SDK 仍 0.x，且 VS Code 扩展未开放，风险未降低） |
| §3.3 实验环境与生产环境分离 | 反对舍弃 | **仍成立**（实验环境 CLI 与生产环境 VS Code 仍分离） |
| §4 选项 C（CLI 独立沙盒最小验证） | 中间路径推荐 | 不变——仍为 CLI 独立沙盒最小验证 |
| §5 Q4/Q6 中间路径推荐 | C→B 组合 | 不变——C 的执行环境仍为 CLI |

评审核心结论（"先做最小闭环验证再决定"）仍成立。第二轮评审基于"VS Code 已支持"的乐观假设需修正——实验环境回到 CLI 方式，验证成本未下降。

### Plugin 能力补充说明（核查所得）

官方文档明确了 Plugin 与其它手段的能力边界，对 mechanism-candidates #1–#6、#14 的归宿判定至关重要：

| 能力 | Plugin | 文件 Hook（.cline/hooks/*） | Wrapper MCP | 外部 watcher |
|------|--------|---------------------------|-------------|-------------|
| `registerMessageBuilder`（compact 关键） | ✅ | ❌ | ❌ | ❌ |
| `registerTool` | ✅ | ❌ | ✅（等价） | ❌ |
| runtime hooks（8 种，含 onEvent） | ✅ | 部分（9 种文件事件适配） | ❌ | ❌ |
| typed in-process callbacks | ✅ | ❌（JSON 序列化外部脚本） | ❌（跨进程） | ❌（跨进程） |
| 跨形态复用（CLI/Kanban/VSCode/JetBrains） | ✅ | 依赖 Cline 实现 | ✅ | 系统级 |

**关键发现**：#5（compact + handoff 双产物）的 `registerMessageBuilder` 是 Plugin 独有能力，文件 Hook / Wrapper MCP / 外部 watcher 均无法介入 model call 前的消息重写层。这直接回答了评审材料 §3.1/§3.3 的"运行时任务是否必须 Plugin"——**至少 compact 自动化必须 Plugin**。

### 后续动作

1. **本 Update 落地后**：评审材料前提仍成立，用户需决定是否重新评审或直接进入选项 C（CLI 最小闭环验证）
2. **机制清单 #1–#4 归宿**：VS Code 扩展未集成 plugin 装载入口，#1–#4 的理想机制（plugin）可行路径未恢复，维持"等待 Runtime 能力"暂缓标记
3. **P5 实验环境**：仍为 CLI 独立沙盒（`npm i -g cline` + `cline plugin install`），成本未下降
4. **survey.md §9.1 同步**：本 Update 非 status 变更（ADR-002 仍 active），不触发 project-rules.md 约束 1/2，无需加新行

### 本 Update 不变更的内容

- ADR-002 整体方向（薄 Skills + 单点 WebSearch MCP + 经验文档 + Plugin 实验线）不变
- ADR-002 §项目定位（L1/L2/L3 三层）不变
- ADR-002 §退休条件 / Review Trigger 不变（SDK v1.0+ 等仍适用）
- ADR-002 status 仍为 active（非 superseded，非新 ADR-003）

本 Update 记录外部事实核查（Cline Plugin VS Code 支持状态的矛盾证据裁定）及其对本 ADR 局部章节的修正，不构成整体决策推翻。

---

## Update 2 (2026-06-27): VS Code 扩展代码层 hook/plugin 系统核查（纠正 Update 1 核查方法）

### 核查背景

用户质疑 Update 1「VS Code Plugin Hook 不可用」结论的核查方法（dev-rules.md §1.3 阴性结论须先排除验证方法错误）。Update 1 仅基于 3.89.2 CHANGELOG 零 plugin 条目下阴性结论，未做代码层核查。本 Update 补充代码层核查。

### 核查方法纠正

| 维度 | Update 1 方法 | Update 2 方法 |
|------|--------------|--------------|
| 文件定位 | Glob/LS（均失效：Glob 零命中，LS 40000 字符截断）| PowerShell `Get-ChildItem -Recurse`（可靠）|
| 证据来源 | CHANGELOG 条目 + 官方文档 | dist/extension.js 代码层 Grep + 官方文档 |
| 版本范围 | 仅 3.89.2 | 3.89.2 + **4.0.0**（Update 1 遗漏，4.0.0 于 2026-06-25 22:42 安装）|

### 关键发现

**发现 1：VS Code 扩展代码层有完整 hook 系统**

4.0.0/dist/extension.js 代码层核查（Grep + PowerShell Select-String）证实：

- 第 3351 行：`HookDiscoveryCache` / `findHookScripts` / `hasHook` / `createWithStreaming`——完整的 hook 发现与执行系统
- 第 2048 行：hook 类型包括 `beforeRun` / `afterRun` / `beforeModel` / `beforeTool` / `afterTool` / `agent_start` / `tool_call` / `preToolUse`；日志环境变量 `CLINE_HOOKS_LOG_PATH` + `hooks.jsonl`
- 第 1949 行：生命周期 hook `beforeRun` / `afterRun` / `beforeModel`

**发现 2：VS Code 扩展代码层有 plugin 结构**

4.0.0/dist/extension.js 第 475 行（及第 1548 行重复）：

```javascript
function DGu(t){
  let e=t.pluginName??RGu,
      r=tie.default.join(t.workspacePath,".cline",e);
  return {
    pluginName:e, pluginPath:r,
    workflowsPath:tie.default.join(r,"workflows"),
    skillsPath:tie.default.join(r,"skills"),
    bundleCachePath:tie.default.join(r,"cache","bundle.json"),
    manifestPath:tie.default.join(r,"managed.json"),
    rulesFilePath:tie.default.join(r,"ru...
```

VS Code 扩展代码层有 `pluginName` 概念，plugin 结构为 `<workspace>/.cline/<pluginName>/{skills,workflows,cache/bundle.json,managed.json,rules}`。

**发现 3：registerMessageBuilder 仍未在 VS Code 扩展实现**

Grep `registerMessageBuilder|messageBuilder` 命中均为 zod schema 解析代码，非真实实现。Update 1「registerMessageBuilder 是 Plugin 独占」结论仍成立。

**发现 4：4.0.0 已安装但 Update 1 遗漏**

4.0.0 `installedTimestamp: 1782528118874` → 2026-06-25 22:42（北京时间）。Update 1 (2026-06-26) 核查时 4.0.0 已存在 1 天，但仅报告 3.89.2。4.0.0 package.json 仍零 plugin 关键字，commands 列表无 `cline.plugin.*`，结论不变，但核查范围有遗漏。

**发现 5：Update 1 证据来源记录有误**

Update 1 引用「globalState.json clineVersion=3.89.2」——本地核查 globalState.json 不存在。版本号 3.89.2 本身准确（扩展目录确有 `saoudrizwan.claude-dev-3.89.2`），但证据来源应为扩展目录名，非 globalState.json。

### 对 Update 1 能力边界表的修正

| 能力 | Update 1 结论 | Update 2 修正 |
|------|--------------|--------------|
| Plugin Hook（typed runtime callback） | VS Code 不可用 | **代码层有 typed runtime hook**（beforeRun/afterRun/beforeModel/beforeTool/afterTool），UI 层无装载命令，可用性待实测 |
| 文件 Hook（.cline/hooks/*） | 部分支持（9 种文件事件） | **代码层有完整 hook 发现系统**（HookDiscoveryCache/findHookScripts），配置方式待实测 |
| registerMessageBuilder | Plugin 独占 | **仍成立**（VS Code 扩展未实现）|
| plugin 装载入口 | VS Code 未集成 | **UI 层无命令，代码层有 plugin 结构**（`.cline/<pluginName>/`），手动放文件可能触发，待实测 |

### 核心结论修正

Update 1「VS Code 扩展未集成 plugin 装载入口」在 **UI 层面仍成立**（无 `cline plugin install` 命令），但**代码层面不准确**——VS Code 扩展代码层有：

1. 完整的 hook 系统（typed runtime callback）
2. plugin 结构（`.cline/<pluginName>/`）
3. skill 装载路径（`.cline/<pluginName>/skills/`）

**手动放 plugin 文件到 `<workspace>/.cline/<pluginName>/` 可能触发 VS Code 扩展装载**——这是 Update 1 未探索的路径，需 Capability Probe 实测。

### 后续动作

1. **启动 ADR-001 Capability Probe**：验证 VS Code 扩展的 hook/plugin 可用性（手动放文件到 `.cline/<pluginName>/`）
2. **mechanism-candidates #6/#7 补充备注**：VS Code 扩展代码层有 beforeRun/agent_start hook，#6 可能在 VS Code 直接可用
3. **ADR-004 恢复条件补充**：代码层有 plugin 结构，手动放文件可能触发，是恢复路径之一
4. **核查方法教训**：Windows 文件核查必须用 PowerShell `Get-ChildItem -Recurse`，Glob/LS 不可靠（Glob 零命中，LS 截断）

### 本 Update 不变更的内容

- ADR-002 整体方向不变
- ADR-002 status 仍为 active
- Update 1 的 registerMessageBuilder 独占性结论仍成立
- #5 仍需 plugin（registerMessageBuilder 独占）

---

## Update 3 (2026-06-27): VS Code 扩展 4.0.0 原生能力完整调研（纠正 Update 2 发现 3）

### 核查背景

用户反馈 Update 1/2 调查方向偏离——"VS Code 扩展的原生 commands/MCP/skill 都是应该的调研对象，之前却偏离到 CLI"。Update 2 仅核查 plugin 结构和 hook 系统，未完整调研 VS Code 扩展本身的原生能力。本 Update 补充完整调研。

### 核查对象（明确）

- **载体**：`C:\Users\19936\.vscode\extensions\saoudrizwan.claude-dev-4.0.0`（installedTimestamp 1782528118874 → 2026-06-25 22:42 北京时间）
- **不再偏离到 CLI**：CLI（3.0.31）是独立载体，本次核查仅针对 VS Code 扩展

### 核查方法

- `package.json` 完整读取（18188 字节）
- `skills-lock.json` 完整读取（245 字节）
- `dist/extension.js`（22MB minified）Grep + PowerShell `Select-String` / `Substring` 精准提取
- 遵循 dev-rules.md §1.3 教训：Windows 文件核查用 PowerShell `Get-ChildItem -Recurse`

### VS Code 扩展 4.0.0 原生能力完整清单

#### A. Commands（package.json 暴露 20 个，零 plugin/hook/skill 管理命令）

| 类别 | 命令 | 说明 |
|------|------|------|
| 侧边栏（6）| `cline.plusButtonClicked` / `cline.mcpButtonClicked` / `cline.marketplaceButtonClicked` / `cline.historyButtonClicked` / `cline.accountButtonClicked` / `cline.settingsButtonClicked` | New Task / MCP Servers / Customize / History / Account / Settings |
| Cline 类（14）| `cline.addToChat` / `cline.addTerminalOutputToChat` / `cline.focusChatInput` / `cline.generateGitCommitMessage` / `cline.abortGitCommitMessage` / `cline.explainCode` / `cline.improveCode` / `cline.jupyterGenerateCell` / `cline.jupyterExplainCell` / `cline.jupyterImproveCell` / `cline.openWalkthrough` / `cline.reconstructTaskHistory` / `cline.dev.createTestTasks`(dev) / `cline.dev.expireMcpOAuthTokens`(dev) | 编辑器/终端/Git/Jupyter 集成 + 任务历史重建 |

**关键观察**：零 `cline.plugin.*` 命令，零 `cline.hook.*` 命令，零 `cline.skill.*` 命令，零 `cline.workflow.*` 命令。

#### B. Skill 装载（代码层自动发现 6 个路径）

`dist/extension.js` 第 2649 行（minified）：

```javascript
function u1n(t){return[
  {path:sY.join(t,MNt.clineruleSkillsDir),source:"project"},  // <workspace>/.clinerules/skills
  {path:sY.join(t,MNt.clineSkillsDir),source:"project"},      // <workspace>/.cline/skills
  {path:sY.join(t,MNt.claudeSkillsDir),source:"project"},     // <workspace>/.claude/skills
  {path:sY.join(t,MNt.agentsSkillsDir),source:"project"},     // <workspace>/.agents/skills
  {path:C7d(),source:"global"},                                // ~/.cline/skills
  {path:I7d(),source:"global"}                                 // ~/.agents/skills
]}
MNt={
  clineruleSkillsDir:".clinerules/skills",
  clineSkillsDir:".cline/skills",
  claudeSkillsDir:".claude/skills",
  agentsSkillsDir:".agents/skills"
}
```

**VS Code 扩展原生支持 skill 装载**——放 SKILL.md 文件到上述任一路径即可被自动发现，**无需 UI 命令**。`skills-lock.json` 引用 `cline/sdk-skill` github（skillPath: `skill/cline-sdk/SKILL.md`）。

#### C. 文件 Hook 系统（代码层完整，Windows 支持 .ps1）

`dist/extension.js` 第 3351 行（minified）：

```javascript
dQ=class t{
  static async findHookScripts(e){
    let r=[];
    for(let a of await Swe())  // getAllHooksDirs
      r.push(t.findHookInHooksDir(e,a));
    // ...
  }
  static async findHookInHooksDir(e,r){
    return process.platform==="win32"?t.findWindowsHook(e,r):t.findUnixHook(e,r)
  }
  static async findWindowsHook(e,r){
    let i=KGn.default.join(r,`${e}.ps1`);  // Windows: <hooksDir>/<eventName>.ps1
    if(await t.isHookFile(i,e))return i
  }
  static isGlobalHooksDir(e){
    return/[/\\][Cc]line[/\\][Hh]ooks/i.test(e)  // 路径含 /cline/Hooks
  }
}
```

**VS Code 扩展原生支持文件 Hook**：
- Windows：`<hooksDir>/<eventName>.ps1`
- Unix：`<hooksDir>/<eventName>` 无扩展名
- 全局 hooks 目录：路径匹配 `/cline/Hooks/i`
- 工作区 hooks 目录：通过 `getWorkspaceHooksDirs` 获取
- **放文件即可被发现，无需 UI 命令**

#### D. Plugin 注册系统（代码层完整，UI 未暴露）⚠️ 颠覆 Update 2 发现 3

`dist/extension.js` 第 543 行（minified）：

```javascript
let s = {
  tools: [], commands: [], rules: [], messageBuilder: [],
  providers: [], automationEventTypes: [], mcpServers: []
};
let u = {
  registerTool: d => s.tools.push(d),
  registerCommand: d => s.commands.push(d),
  registerRule: d => {/* 需 manifest.capabilities "rules" */},
  registerMessageBuilder: d => s.messageBuilder.push(d),
  registerProvider: d => s.providers.push(d),
  registerAutomationEventType: d => {/* 需 "automationEvents" capability */},
  registerMcpServer: d => {/* 需 "mcp" capability，metadata.source="plugin" */}
};
// plugin 文件类型: [".js", ".ts"]
// automation event types: agent_start, agent_resume, ...
await o.setup?.(u, c);  // 调用 plugin 的 setup 函数注册能力
```

**VS Code 扩展代码层有完整 plugin 注册系统**，包括：
- `registerTool` / `registerCommand` / `registerRule` / `registerMessageBuilder` / `registerProvider` / `registerAutomationEventType` / `registerMcpServer`
- plugin 文件类型：`.js` 或 `.ts`
- plugin 需要 manifest 声明 capabilities
- 通过 setup 函数注册能力

#### E. Plugin install/uninstall 代码层存在（UI 未暴露）

`dist/extension.js` 第 3803 行（install）+ 第 2060 行（uninstall）：

```javascript
async function Mch(t, e) {
  let [r] = e;
  if (!r) throw new Error("Marketplace plugin install args must start with a plugin source.");
  let i = await W9o({source: r}), ...
  return ET.create({id:t.id, type:t.type, status:"installed", ...})
}
async function SOd(t, e={}) {
  // Plugin marketplace uninstalls require a plugin name.
  let a = await Kvn({name:i, workspaceRoot:e.workspaceRoot});
  ...
}
```

代码层有 `Marketplace plugin install` / `uninstall` 函数，但 `package.json` 的 20 个 commands 中未暴露。可能通过 `cline.marketplaceButtonClicked`（Customize 按钮）触发，待实测。

#### F. MCP 集成

- 依赖：`@modelcontextprotocol/sdk@^1.25.1`
- 命令：`cline.mcpButtonClicked`（打开 MCP Servers 面板）
- 配置文件：`cline_mcp_settings.json`（路径待实测）
- OAuth 管理：`cline.dev.expireMcpOAuthTokens`（dev mode）
- plugin 可通过 `registerMcpServer` 注入 MCP server（metadata.source="plugin"）

#### G. 其他原生能力

- **gRPC 通信**：`@grpc/grpc-js` / `@grpc/proto-loader` / `nice-grpc` / `grpc-health-check`
- **浏览器自动化**：`chrome-launcher` / `puppeteer-core` / `puppeteer-chromium-resolver`
- **本地数据库**：`better-sqlite3`（task history 存储）
- **文件 watcher**：`chokidar@^4.0.1`（可能与 hook/plugin 装载触发相关）
- **git 集成**：`simple-git`
- **端点配置**：`~/.cline/endpoints.json`（ClineEndpoint 类）
- **Walkthrough**：5 步引导（step1.md ~ step5.md）

### 对 Update 1/2 结论的修正

| 结论 | Update 1/2 | Update 3 修正 |
|------|-----------|--------------|
| registerMessageBuilder 是 Plugin 独占 | Update 2 发现 3：仍成立 | **错误**——VS Code 扩展代码层第 543 行有 `registerMessageBuilder` 注册接口，是 plugin 注册系统的一部分 |
| VS Code 扩展未集成 plugin 装载入口 | Update 1：仍成立（UI 层）| **UI 层仍成立**，但代码层有 `Mch` install / `SOd` uninstall 函数，可能通过 `cline.marketplaceButtonClicked` 触发，待实测 |
| #5 仍需 plugin（registerMessageBuilder 独占）| Update 2：仍成立 | **需重新评估**——VS Code 扩展代码层有 registerMessageBuilder，若手动放 plugin 文件能触发 setup，则 #5 可能在 VS Code 直接可用 |
| 文件 Hook 可用性 | Update 2：待实测 | **确认可用**——代码层有 `findWindowsHook`（.ps1）+ `isGlobalHooksDir`（/cline/Hooks）+ `getWorkspaceHooksDirs`，放文件即可被发现 |
| Skill 装载 | Update 2：未完整调研 | **确认可用**——6 个路径（4 项目级 + 2 全局级），放 SKILL.md 即可被发现 |

### 对 mechanism-candidates 的影响

| # | 经验 | Update 3 影响 |
|---|------|--------------|
| 5 | compact 双产物（`registerMessageBuilder`）| **可能不需要 CLI 载体**——VS Code 扩展代码层有 registerMessageBuilder，需 Capability Probe 实测手动放 plugin 文件能否触发 setup |
| 6 | session_start hook | **确认 VS Code 扩展可用**——文件 Hook（.ps1）+ plugin automation events（agent_start/agent_resume）双路径 |
| 7 | Windows 不支持 Cline 早期 Hook | **可标已退休**——VS Code 扩展代码层有 Windows hook 支持（`.ps1`），原生可用 |

### 核心结论

Update 2 发现 3「registerMessageBuilder 仍未在 VS Code 扩展实现」**错误**——Grep `registerMessageBuilder` 命中 40 次中，第 543 行是 plugin 注册系统的真实实现，非 zod schema 解析。VS Code 扩展代码层有完整的 plugin 注册系统，包括 `registerMessageBuilder`。

**新核心问题**：手动放 plugin 文件（`.js`/`.ts`）到 `<workspace>/.cline/<pluginName>/` 能否触发 VS Code 扩展执行其 setup 函数？这是 #5 能否在 VS Code 直接可用的关键，需 Capability Probe 实测。

### 后续动作

1. **启动 ADR-001 Capability Probe**（最高优先级）：验证手动放 plugin 文件能否触发 setup 函数执行（registerMessageBuilder 注册）
2. **mechanism-candidates #5 备注修正**：从"仍需 plugin"改为"VS Code 扩展代码层有 registerMessageBuilder，待 Capability Probe 实测"
3. **mechanism-candidates #7 状态调整**：可标已退休（VS Code 扩展代码层有 Windows hook 支持）
4. **ADR-004 恢复条件 2 补充**：手动放 plugin 文件可能触发 setup，是恢复路径之一（实测前保留 deferred）

### 本 Update 不变更的内容

- ADR-002 整体方向（薄 Skills + 单点 WebSearch MCP + 经验文档 + Plugin 实验线）不变
- ADR-002 status 仍为 active
- ADR-002 §项目定位（L1/L2/L3 三层）不变
- ADR-002 §退休条件 / Review Trigger 不变

本 Update 记录 VS Code 扩展 4.0.0 原生能力完整调研结果，纠正 Update 2 发现 3 的错误结论（registerMessageBuilder 在 VS Code 扩展代码层有实现），不构成整体决策推翻。

---

## Update 4 (2026-06-27): 官方文档对照修正（Update 3 路径与 manifest 格式错误）

### 核查背景

Update 3 基于 `dist/extension.js` minified 代码反向工程推断 plugin 安装路径为 `.cline/<pluginName>/`、manifest 为 `managed.json`。本次用户要求搜索社区开发经验后，fetch 官方文档 [docs.cline.bot/customization/plugins](https://docs.cline.bot/customization/plugins) 发现 Update 3 的路径与 manifest 格式均错误。

### Update 3 的错误

| 维度 | Update 3 错误结论 | 官方文档实际 |
|------|------------------|------------|
| **plugin 安装路径** | `.cline/<pluginName>/` | **`.cline/plugins/`**（项目级）或 `~/.cline/plugins/`（全局级）|
| **manifest 文件** | `managed.json` | **`package.json`** 含 `cline` 字段 |
| **manifest 格式** | 未明确 | `{ "cline": { "plugins": [{ "paths": ["./index.ts"], "capabilities": ["tools","hooks"] }] } }` |
| **capabilities 枚举** | 参考 dist/extension.js 第 543 行 | `tools / commands / rules / skills / providers / messageBuilders / automationEvents / hooks`（注意 `messageBuilders` 复数）|
| **plugin 目录结构** | 未完整调研 | `~/.cline/plugins/{_installed,npm,git,remote,local}/` + `.cline/plugins/`（项目级）|

### 错误根因

Update 3 从 `dist/extension.js` 第 475 行 `DGu` 函数推断路径：

```javascript
function DGu(t){
  let e=t.pluginName??RGu,
      r=tie.default.join(t.workspacePath,".cline",e);
  return { pluginName:e, pluginPath:r, ... }
}
```

`DGu` 是 SDK 内部用于**已装载 plugin 的运行时路径解析**（pluginName 作为子目录名），**不是安装路径**。实际安装路径由 `cline plugin install` 命令写入 `.cline/plugins/`，`DGu` 解析的 `<workspace>/.cline/<pluginName>/` 是 plugin 运行时的内部资源目录（skills/workflows/cache 等），不是 plugin 入口文件的安装位置。

### 官方文档确认的关键事实

| 事实 | 官方文档原文 | 语义 |
|------|------------|------|
| VS Code 不支持 | "This feature currently only applies to Cline SDK, CLI, and Kanban. This feature is not applicable on VSCode and JetBrains Extension for now." | **用户操作可用性**——`cline plugin install` 命令在 VS Code 扩展中不可用 |
| SDK 设计能力范围 | "extends any Cline agent — CLI, Kanban, VS Code, JetBrains, or anything built on the Core SDK" | **SDK 代码层**——plugin 代码可扩展任何基于 Core SDK 的 agent 内核 |
| CLI 自动发现路径 | "The CLI auto-discovers plugins from `.cline/plugins` in the workspace, `~/.cline/plugins`, and the system Plugins folder." | **CLI 载体的自动发现路径**，VS Code 扩展未明确说明 |

### 对 Update 3 结论的修正

| Update 3 结论 | Update 4 修正 |
|--------------|--------------|
| "手动放 plugin 文件到 `<workspace>/.cline/<pluginName>/` 可能触发 VS Code 扩展装载" | **路径错误**——应为 `.cline/plugins/`。但 VS Code 扩展 UI 层无 `cline plugin install` 命令，手动放文件到 `.cline/plugins/` 能否被 VS Code 扩展自动发现**仍待实测**（官方文档明确 CLI 自动发现，VS Code 扩展未说明）|
| "registerMessageBuilder 在 VS Code 扩展代码层有实现" | **仍成立**——第 543 行代码层确认，且官方 capabilities 表含 `messageBuilders` |
| "Skill 装载 6 路径" | **仍成立**——与 plugin 路径无关，skill 装载是独立机制 |
| "文件 Hook 确认可用" | **仍成立**——官方文档"Plugin hooks vs file hooks"章节确认 file hooks 是外部脚本在 `.cline/hooks` |

### 官方 plugin 示例完整清单（11 个，来自 [github.com/cline/cline/sdk/examples/plugins](https://github.com/cline/cline/tree/main/sdk/examples/plugins)）

| 示例 | 能力 | 对本项目的价值 |
|------|------|--------------|
| **custom-compaction.ts** | `registerMessageBuilder` | **#5 compact 双产物的完美母本** |
| weather-metrics.ts | tool + hooks | 入门参考 |
| mac-notify.ts | afterRun hook | #6 参考 |
| background-terminal.ts | 长任务工具 | |
| automation-events.ts | automationEvents | |
| gitignore-read-files-guard.ts | beforeTool guard | |
| env-blocker.ts | beforeTool 安全 | |
| web-search.ts | web_search 工具 | |
| openrouter-provider.ts | registerProvider | |
| typescript-lsp/ | goto_definition | 唯一已知实战 plugin |
| agents-squad/ | 多 agent 协作 | |

### Runtime hooks 完整映射（官方文档确认）

| File hook | File event | Runtime hook |
|-----------|-----------|--------------|
| TaskStart | agent_start | beforeRun |
| TaskResume | agent_resume | beforeRun (resume) |
| UserPromptSubmit | prompt_submit | beforeRun (prompt) |
| PreToolUse | tool_call | beforeTool |
| PostToolUse | tool_result | afterTool |
| TaskComplete | agent_end | afterRun (completed) |
| TaskError | agent_error | afterRun (failed) |
| TaskCancel | agent_abort | afterRun/abort |
| SessionShutdown | session_shutdown | session cleanup |

### 核心结论修正

Update 3 的核心结论"VS Code 扩展代码层有完整 plugin 注册系统"**仍成立**，但 plugin 安装路径和 manifest 格式错误。修正后：

- **plugin 安装路径**：`.cline/plugins/`（非 `.cline/<pluginName>/`）
- **manifest 文件**：`package.json` 含 `cline` 字段（非 `managed.json`）
- **VS Code 扩展能否自动发现 `.cline/plugins/`**：官方文档仅明确 CLI 自动发现，VS Code 扩展未说明，**仍需 Capability Probe 实测**

### 后续动作

1. **ADR-001 Update 1 修正**：Probe 5 实测准备清单的 manifest 格式和路径修正
2. **mechanism-candidates #5 备注修正**：路径修正
3. **Capability Probe 5 实测路径调整**：plugin 文件放 `.cline/plugins/` 而非 `.cline/<pluginName>/`，manifest 用 `package.json` 含 `cline` 字段

### 本 Update 不变更的内容

- ADR-002 整体方向不变
- ADR-002 status 仍为 active
- Update 3 的"registerMessageBuilder 在 VS Code 扩展代码层有实现"结论仍成立
- Update 3 的 skill 装载 / 文件 hook 结论仍成立

本 Update 记录官方文档对照后的路径与 manifest 格式修正，不构成整体决策推翻。

---

## Update 5 (2026-06-27): VS Code 扩展 plugin 装载入口实测 + Marketplace 机制摸清 + #5 命题边界确认

> **方法论**：本 Update 严格遵循 [evidence-governance.md](../evidence-governance.md) 框架，所有结论标注 Observation / Inference / Evidence Type / Confidence / Remaining Unknown，不跳级。配套 Investigation Notes：
> - [investigation-note-probe-5.md](../archive/decisions/investigation-note-probe-5.md) — Probe 5 实测
> - [investigation-note-vscode-settings-inventory.md](investigation-note-vscode-settings-inventory.md) — VS Code 扩展可设置选项完整盘点
> - [investigation-note-marketplace-dev-mechanism.md](investigation-note-marketplace-dev-mechanism.md) — Marketplace 开发机制并行调查（4 subagent）
> - Agents Squad handoff store 源码核查（SE Reviewer subagent）

### 事实变化（经多源核查 + 实测）

**事实 1：VS Code 扩展 4.0.0 有 plugin 装载入口**（实测，高置信度）

- Observation：用户在 VS Code Cline 扩展的 Customize 按钮中发现 plugin 管理面板，已安装 p5-spike-plugin + weather-metrics
- Evidence Type：用户实测 UI 观察 + Customize 显示的安装路径
- 推翻 Update 1 结论"VS Code 扩展未集成 plugin 装载入口"——该结论基于 v3.89.2 CHANGELOG 零 plugin 条目，遗漏了 v4.0.0 的 Customize 按钮 UI 层入口
- Confidence：高

**事实 2：VS Code 扩展读取 CLI 全局 plugin store**（实测，高置信度）

- Observation：Customize UI 显示两个 plugin 的安装路径：
  - `p5-spike-plugin` → `C:\Users\19936\.cline\plugins\_installed\local\p5-spike-plugin.ts-d7f2b02ac5d1\p5-spike-plugin.ts`（CLI local 安装）
  - `weather-metrics` → `C:\Users\19936\.cline\plugins\_installed\remote\weather-metrics.ts-1770dbabbed0\weather-metrics.ts`（CLI remote URL 安装）
- Inference：VS Code 扩展与 CLI 共享 `~/.cline/plugins/_installed/` 全局 store（非 workspace 级 `.cline/plugins/`）
- Confidence：高

**事实 3：Marketplace 后端是 hybrid 架构**（minified 源码 + 网络实测 + 官方仓库，高置信度）

- 公开 catalog：`https://cline.github.io/marketplace/catalog.json`（200，未鉴权，202 条 entries：149 MCP + 15 plugin + 38 skill）
- 鉴权 API：`https://api.cline.bot/v1/marketplace/*`（401，WorkOS 鉴权，语义未验证）
- 上架机制按类型分化：MCP=GitHub Issue + 人工审核 / Plugin & Skill=PR + CI `npm run validate`
- VS Code 扩展通过 extension host fetch catalog.json → postMessage 注入 webview 渲染
- Confidence：高（多源交叉验证：源码字符串 + 网络状态码 + 官方仓库 CONTRIBUTING）

**事实 4：社区开发活动已显著存在**（npm + GitHub + 官方 examples + Marketplace，高置信度）

- Observation（5 类反证）：
  - npm `@cline/sdk` 周下载 234,966 / `@cline/core` 239,780 / `cline` CLI 263,674
  - GitHub 外部贡献者 abeatrix 至少 7 个 plugin development PR（2026-05-19~06-23 合并）
  - 官方 plugin examples 11 个（含 weather-metrics/custom-compaction/agents-squad 等）
  - 独立官方 plugin 仓库 `cline/typescript-lsp-plugin`
  - `cline plugin install` 支持 4 种来源（file URL / git / npm / local）
- Confidence：高
- **Context §5"社区目前无 Plugin 实战经验沉淀"作废**（详见 [investigation-note-marketplace-dev-mechanism.md](investigation-note-marketplace-dev-mechanism.md) §C 号 RCA）

**事实 5：Agents Squad handoff store 与 #5 不重叠**（一手源码 + 官方 README，高置信度）

- Observation：Agents Squad plugin manifest `capabilities: ["tools"]`——仅注册 tools，**不使用 messageBuilder**
- Agents Squad handoff store：`save_handoff({path, content})` / `read_handoff({path})`，文件系统 per-conversation 共享，LLM tool 触发，subagent 间协作（Blackboard pattern 实例）
- #5 命题：compact 时通过 messageBuilder 产出 handoff.md + index.jsonl，self-continuity 机制
- Inference：二者重叠度低——仅"handoff 命名"与"文件系统持久化"表面相似；触发机制、消费者、产物结构、检索能力四项均不重叠
- Confidence：高（源码 manifest + README + schema 三重佐证）

### Conflict Registry（含历史 + 本次新增）

| # | 冲突 | 来源 A | 来源 B | 处置 |
|---|------|--------|--------|------|
| C1 | Plugin 是否支持 VSCode/JetBrains | docs: "not applicable for now" | GitHub README: "extends any Cline agent" + 4.0.0 实测 Customize 可用 | **本次解决**——实测证明 4.0.0 已支持，docs 滞后于版本 |
| C2 | 扩展点数量 | docs Extension Glossary: 6 个 | GitHub README Capabilities 表: 8 个 | 以仓库 README 为完整契约 |
| C3 | Hook 分类口径 | docs Hook Stages: 15 个阶段 | GitHub README Runtime hooks: 7 个 | 不同粒度，docs 未明确关系 |
| C4 | MCP 提交渠道 | cline/mcp-marketplace: issue-based | cline/marketplace: PR-based | 两者并存未声明主从 |
| C5 | examples 数量 | docs: 9 个 | GitHub README: 11 个 | docs 落后于仓库 |
| C6（新）| "无开发记录"结论 | plugin-dev-quick-reference.md §0 + ADR-002 Context §5 | npm 23 万周下载 + 7 个外部 PR + 11 examples + 22 Marketplace plugin | 来源 A 宽义结论作废 |
| C7（新）| Update 1 "VS Code 扩展未集成 plugin 装载入口" | v3.89.2 CHANGELOG 零 plugin 条目 | v4.0.0 Customize 实测可用 | **本次解决**——Update 1 仅基于 v3.89.2，遗漏 v4.0.0 |

### 对历史 Update 的修正

| 章节 | 原内容 | Update 5 修正 |
|------|--------|--------------|
| Context §4（VS Code 不可用硬约束） | "Plugin 不适用于 VS Code / JetBrains" | **v4.0.0 实测可用**（Customize 按钮 marketplace 安装），硬约束解除 |
| Context §5（社区无实战沉淀） | "SDK v0.0.51，刚推出" | **作废**——社区开发活动已显著存在（详见事实 4）|
| Update 1（VS Code 扩展未集成 plugin 装载入口） | "仍成立——VS Code 扩展未集成 plugin 装载入口" | **错误**——基于 v3.89.2，遗漏 v4.0.0 |
| Update 2 发现 3（registerMessageBuilder 仍未在 VS Code 扩展实现） | "仍成立" | **错误**——Update 3 已纠正，本次再确认 |
| Update 4（VS Code 扩展能否自动发现 `.cline/plugins/` 仍需实测） | "仍需 Capability Probe 实测" | **优先级降低**——全局 store 已可用，workspace 级自动扫描为补充验证 |

### 对 mechanism-candidates #5 的影响

**命题修正**（基于 Agents Squad 源码核查）：

| 维度 | 原命题 | 修正后命题 |
|------|--------|-----------|
| 触发时机 | compact 流程中 | 不变 |
| 注册扩展点 | messageBuilder | 不变 |
| 消费者 | 同一 session compact 后的自己 | 不变 |
| 产物结构 | handoff.md + index.jsonl | 不变 |
| 与 Agents Squad 关系 | 未明确 | **明确边界**——#5 是 self-continuity，Agents Squad 是 inter-agent coordination，二者独立共存 |
| 路径方案 | 待定 | **借鉴 Agents Squad**：`~/.cline/data/plugins/<plugin>/handoffs/<conversationId>/` + `SAFE_ID_RE` + `startsWith(dir/)` 穿越防护 |
| 检索能力 | index.jsonl | **#5 独有增量**——Agents Squad 无索引/检索 |

**核心结论**：#5 命题不变，但需显式声明与 Agents Squad 的边界。二者不应合并，应作为两个独立 plugin 共存。#5 应复用 Agents Squad 的文件路径方案与穿越防护模式，但 messageBuilder 注册 + compact 流程触发 + index.jsonl 检索索引三项是 #5 必须自建的增量。

### 对 ADR-004 的影响

**ADR-004 恢复条件 2 满足**——#5 不再依赖 CLI 载体，VS Code 扩展环境通过 Customize marketplace 直接可用。P5 Spike 可重启。

### 后续动作

1. **ADR-004 状态更新**：恢复条件 2 满足，可重启 P5 Spike，但命题需按本 Update §#5 命题修正调整
2. **mechanism-candidates #5 状态更新**：从"候选（暂缓）"改为"候选"或"实验中"，备注边界与路径方案
3. **plugin-dev-quick-reference.md §0 stale 标注**：加 stale 标记，注明已被本 Update 修正
4. **ADR-002-p5-experiment-exit-review §2.4 stale 标注**：该节"社区无 Plugin 实战沉淀"论据作废（但 SDK 0.x 论据独立成立，§2.4 整体结论可能不变）
5. **B 组项目规则补强**（建议新增 6 条规则，待用户 review）：
   - `evidence-governance.md §15` 结论时效性模型（默认 14 天时效期 + ADR frontmatter 加 `evidence_as_of` + `expires_if_unchanged`）
   - `dev-rules.md §1.13` 结论时效性门控
   - `evidence-governance.md §16` 社区活动证据职责
   - `evidence-governance.md §17` 调研可复现性（必须记录 query 列表）
   - `dev-rules.md §1.14` "无 X"类结论门控（必须经 search-orchestrator 反证 + 3 类独立证据）
   - `ADR-002 §退休条件补充`（社区活动信号触发器）

### 本 Update 不变更的内容

- ADR-002 整体方向（薄 Skills + 单点 WebSearch MCP + 经验文档 + Plugin 实验线）不变
- ADR-002 status 仍为 active
- ADR-002 §项目定位（L1/L2/L3 三层）不变
- ADR-002 §退休条件 / Review Trigger 不变（但建议补充社区活动信号触发器）

本 Update 记录 VS Code 扩展 4.0.0 plugin 装载入口实测 + Marketplace 机制摸清 + Agents Squad handoff store 边界确认，纠正 Update 1 的"VS Code 不可用"错误结论，不构成整体决策推翻。

---

## Update 6 (2026-06-28): VS Code 扩展 plugin sandbox bootstrap 缺失根因确认（修正 Probe 5 V3 / Update 5）

> **方法论**：本 Update 严循 [evidence-governance.md](../evidence-governance.md) 框架。配套 Investigation Note：
> - [investigation-note-vscode-bootstrap-missing.md](investigation-note-vscode-bootstrap-missing.md) — 完整证据链

### 核查背景

investigation-note-probe-5.md V3 结论"VS Code 扩展**加载并执行**了全局 plugin store 中的 plugin"基于 Customize UI 显示 "Installed" 状态。Update 5 据此宣布 Context §4 硬约束解除、ADR-004 恢复条件 2 满足。但上次会话（handoff.md 记录）发现 Handoff Plugin 的 `setup()` 从未执行——debug log 和 marker 文件均不出现，UI "已加载"与运行时激活之间存在矛盾。本 Update 追查根因。

### 事实变化（4 类独立证据交叉验证）

**事实 1：`plugin-sandbox-bootstrap.js` 不存在于 VS Code 扩展发行包**（实测，高置信度）

- Observation：`find saoudrizwan.claude-dev-4.0.0 -name "plugin-sandbox*"` → 零命中；`find saoudrizwan.claude-dev-4.0.0 -name "bootstrap*"` → 零命中
- `dist/` 目录仅含 `extension.js`（22.5MB）一个文件，无独立 bootstrap
- Evidence Type：实测（find 命令）
- Confidence：高

**事实 2：同一 bootstrap 文件存在于 CLI 发行包**（实测，高置信度）

- Observation：
  - `@cline/core/dist/extensions/plugin-sandbox-bootstrap.js`（14KB）
  - `@cline/cli-windows-x64/extensions/plugin-sandbox-bootstrap.js`（14KB）
- Evidence Type：实测（find 命令）
- Confidence：高

**事实 3：Plugin sandbox 加载代码在 bundle 中（minified），但 bootstrap 子进程无法启动**（源码分析，高置信度）

- Observation（bundle grep 命中数）：
  - `plugin-sandbox`：4 处（sandbox spawn、bootstrap 路径解析、debug role）
  - `registerMessageBuilder`：5 处（API 注册、sandbox 消息转发、stub 回退）
  - `CLINE_PLUGIN_IMPORT_TIMEOUT_MS`：1 处（超时环境变量）
  - `loadSandboxedPlugins`：0 处（minified 为 `ivn`）
  - `SubprocessSandbox`：0 处（minified 为 `Xmn`）
- Inference：`resolveBootstrap()` 有 5 个候选 `.js` 路径 + jiti fallback → 全部在扩展环境中失败 → fallback 到 `node -e "<jiti script>"` → jiti 被内联在 bundle 中不可 require → 子进程启动失败 → 4000ms 超时 → `setup()` 永不执行
- Evidence Type：源码（minified bundle + SDK 源码 `plugin-sandbox.ts`）
- Confidence：高

**事实 4：CLI 3.0.31 中 `setup()` 成功执行**（实测，高置信度）

- Observation（用户执行 `cline -v "list the tools you have available"`，设 `CLINE_PLUGIN_IMPORT_TIMEOUT_MS=30000`）：
  - `C:\handoff-plugin-debug.log`：`[1] setup() called at 2026-06-28T02:22:57.440Z`
  - `~/.cline/data/handoff/plugin-loaded.marker`：`loaded at 2026-06-28T02:22:57.451Z`
  - 时间差 11ms
- Evidence Type：实测（marker 文件）
- Confidence：高

### 辅助发现

**ALo 特性门控不是阻塞原因**（源码，高置信度）：

- `ALo(k, "plugins")` → `f0t(t, e)` → `new Set(t ?? ZVu).has(e)`
- `ZVu = rqi = ["rules", "skills", "workflows", "plugins"]`——默认包含 `"plugins"`
- 门控通过，plugin 加载代码确实被执行，但 sandbox 子进程启动失败

**GitHub Issue #11065**（CLOSED，2026-05-26）：

- "Plugin sandbox times out at 4000ms on Windows — official example fails to load"
- 修复：暴露 `CLINE_PLUGIN_IMPORT_TIMEOUT_MS` 环境变量。CLI 实测时已使用此变量（30000ms）

### 根因判定

**VS Code 扩展 4.0.0 的 esbuild 打包流程将 plugin loading 代码（`loadSandboxedPlugins`、`SubprocessSandbox`、`registerMessageBuilder`）内联进了 `dist/extension.js`，但未将 `plugin-sandbox-bootstrap.js` 作为独立文件输出到 `dist/` 目录。**

因果链：`loadSandboxedPlugins()` → `resolveBootstrap()` → 5 个 `.js` 候选路径全部失败 → jiti fallback 失败（jiti 被内联不可 require + `.ts` 源文件不存在）→ sandbox 子进程无法启动 → 4000ms 超时 → `setup()` 永不执行。

CLI 的构建流程正确输出了 bootstrap 文件（`@cline/core/dist/extensions/` + `@cline/cli-windows-x64/extensions/`），因此 CLI 中 plugin 正常工作。

### 对历史 Update / Investigation Note 的修正

| 章节 | 原内容 | Update 6 修正 |
|------|--------|--------------|
| investigation-note-probe-5.md V3 | "VS Code 扩展**加载并执行**了全局 plugin store 中的 plugin" | **过度推断**——UI 显示"Installed"仅表示 `discoverPluginModulePaths()` 发现了文件（UI 层发现），不等于 `loadSandboxedPlugins()` 成功启动了 sandbox 子进程（运行时加载）|
| investigation-note-probe-5.md D2 | "VS Code 不可用硬约束解除" | **回退**——VS Code 扩展因 bootstrap 缺失不可用，仅 CLI 可用 |
| investigation-note-probe-5.md D3 | "ADR-004 恢复条件 2 满足" | **需重新评估**——VS Code 扩展路径不可用，仅 CLI 路径可用 |
| Update 5 Context §4 | "v4.0.0 实测可用（Customize 按钮 marketplace 安装），硬约束解除" | **部分回退**——Customize UI 可发现 plugin（UI 层），但 sandbox 无法启动（运行时层）。硬约束从"完全不可用"修正为"UI 可发现但运行时不可用" |
| Update 5 ADR-004 | "恢复条件 2 满足——#5 不再依赖 CLI 载体" | **回退**——#5 仍依赖 CLI 载体（VS Code 扩展 bootstrap 缺失）|

### VS Code Workaround 验证（2026-06-28，实测通过）

步骤：
1. 复制 `plugin-sandbox-bootstrap.js`（从 CLI `@cline/core/dist/extensions/`）到扩展 `dist/extensions/`
2. 复制 `@cline/shared`、`@cline/core`、`jiti` 包到扩展 `node_modules/`
3. `setx CLINE_PLUGIN_IMPORT_TIMEOUT_MS 30000`
4. Reload VS Code window

结果：`setup()` 成功执行，Phase 2 全链路 7 次 compact 事件均捕获，handoff.md + index.jsonl 双产物正确写入。

**对 Update 6 前述修正的影响**：workaround 使 VS Code 扩展可用，但依赖非官方补丁。mechanism-candidates #5 状态更新为"实验中（CLI 3.0.31 + VS Code workaround）"。

### 核心命题翻转审查（dev-rules.md §1.10 触发）

"VS Code 扩展是否支持 Plugin"核心命题翻转历史：

| 时间点 | 命题 | 依据 |
|--------|------|------|
| ADR-002 Context §4（2026-06-23）| 不支持 | 官方文档 "not applicable for now" |
| Probe 5 / Update 5（2026-06-27）| 支持 | Customize UI 显示 "Installed" |
| 本调查 / Update 6（2026-06-28）| **不支持**（运行时层）| bootstrap 文件缺失 + CLI 对照成功 |

翻转 3 次（不支持→支持→不支持），触发 §1.10 工作流审查。

**审查结果**：
- 违反 §1.8 Evidence Collapse？否——Probe 5 从 UI 观察（实测证据类型）直接跳到"支持"结论，未与官方文档（"not applicable"）和源码（bootstrap 缺失）做交叉验证
- 违反 evidence-governance.md §2.3 禁止跳级？是——Probe 5 V3 从 Observation（UI 显示 Installed）直接到 Decision（硬约束解除），跳过了 Hypothesis（UI 发现是否等于运行时激活？）和 Verified（setup() 是否真正执行？）
- **处置**：本次 Update 补齐了缺失的 Verified 层（CLI 对照实测 + bootstrap 缺失确认），修正了跳级结论

### Remaining Unknown

1. ~~手动复制 bootstrap 后依赖解析~~ → Workaround 验证已确认正常
2. ~~`CLINE_WRAPPER_PATH` 环境变量~~ → 未测试，workaround 方案已替代
3. Cline 官方是否计划修复（Issue #11065 仅涉及超时，未涉及 bootstrap 缺失）
4. ~~CLI 中 `build()` / `registerMessageBuilder` 是否在 compact 事件时被实际调用~~ → Phase 2 全链路验证确认（7 次 compact 事件）

### 后续动作

1. ~~**CLI 验证 build()**~~ → 已完成（Phase 2 全链路 7 次 compact 事件）
2. ~~**VS Code workaround 实验**~~ → 已完成（Workaround 验证通过）
3. ~~**mechanism-candidates #5 状态更新**~~ → 已更新为"实验中"
4. ~~**investigation-note-probe-5.md 修正标注**~~ → 已追加 V3/D2/D3 纠正标注
5. **决策抽取中文化**：`generateHandoffContent` 仅匹配英文关键字
6. **index.jsonl file_count**：`file_count: 0` 硬编码待修正
7. **测试产物清理** + **Git commit**

### 本 Update 不变更的内容

- ADR-002 整体方向（薄 Skills + 单点 WebSearch MCP + 经验文档 + Plugin 实验线）不变
- ADR-002 status 仍为 active
- Plugin 代码正确性不变（CLI + VS Code workaround 均验证通过）
- mechanism-candidates #5 的命题（compact 双产物 via registerMessageBuilder）不变
- ADR-002 §退休条件 / Review Trigger 不变

本 Update 记录 VS Code 扩展 4.0.0 plugin sandbox bootstrap 缺失根因确认 + Workaround 验证 + Phase 2 全链路验证通过，修正 Probe 5 V3 / Update 5 的过度推断，不构成整体决策推翻。
