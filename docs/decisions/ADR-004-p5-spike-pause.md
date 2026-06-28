# ADR-004: P5 Plugin Spike 暂停（实验环境前提动摇）

- **Status**: deferred
- **Date**: 2026-06-27
- **Deciders**: 项目所有者
- **Supersedes**: 无（承接 ADR-003 rolled-back 后的 partial Go 状态）
- **Related**: ADR-002（Validation Plan §实验环境硬约束）、ADR-003（No-Go 误判撤销，partial Go）、[experiments/p5-spike/run-p5-capability-spike.md](../../experiments/p5-spike/run-p5-capability-spike.md) §5

---

## Context

ADR-003 撤销 No-Go 误判后，P5 Spike 回到 partial Go：#6 session_start hook 已实证触发，#5 compact 双产物待长任务触发实证。handoff 指定下次首要动作为"让用户在真实终端构造长任务触发 compact"。

本会话（2026-06-27）执行 #5 实证准备时，发现 ADR-002 Validation Plan 选择 CLI 作为实验环境的前提被动摇——不是 Plugin 机制本身失效，而是 **CLI 载体的稳定性**与**实验环境-生产环境对齐**出现 ADR-002 未充分覆盖的问题。

---

## Problem

#5 实证在 CLI 上执行时，是否仍具备 ADR-002 Validation Plan 假设的"CLI 独立沙盒最小验证"环境前提？

---

## Evidence（2026-06-27 实跑证据链）

完整记录见 [run-p5-capability-spike.md §5](../../experiments/p5-spike/run-p5-capability-spike.md)。关键事实：

### 事实 1：CLI 与 VS Code 扩展是两套独立版本号体系

| 载体 | 版本号 | 来源 |
|------|--------|------|
| VS Code 扩展（saoudrizwan.claude-dev） | 3.89.2 | `globalState.json` `clineVersion` |
| CLI（npm `cline` 包） | 3.0.30 → 3.0.31 | `cline --version` |

ADR-003 §环境事实已记录此区分，但 ADR-002 Validation Plan 未充分讨论"两套独立版本号意味着 CLI 验证结论无法直接迁移到 VS Code 扩展"。

### 事实 2：CLI 后台自动升级中断，bin shim 损坏

本会话期间 CLI 从 3.0.30 自动升级到 3.0.31，中途中断导致 `E:\node-global` 下仅存临时残留文件（`.cline-406M7aCE` / `.cline.cmd-8pWxgFLg` / `.cline.ps1-FcSwxPKX`），最终 `cline` / `cline.cmd` / `cline.ps1` shim 缺失，`cline` 命令不可用。经 `npm install -g cline@3.0.30` 修复后，CLI 再次自动升级至 3.0.31。

`cline update --help` 无 disable 选项，`globalState.json` 无自动升级开关——**CLI 自动升级无法禁用**。

### 事实 3：CLI 3.0.31 run_commands 工具调用崩溃

实跑 session `1782529691185_843jq`（2026-06-27T03:08 UTC，cwd=`experiments/p5-spike`，provider=deepseek / deepseek-v4-flash）：

- 03:08:14 plugin 加载成功，`beforeRun` hook 触发（`session-start.log` 写入）
- 03:08:17 deepseek-v4-flash 回复含 `run_commands` 工具调用，input 格式为 `{commands:[{command:"cmd.exe", args:["/c","dir",...]}]}`（对象）
- 46ms 后 cline core 抛 `c.trimStart is not a function`（stack: `B:/~BUN/root/chunk-rqmcram5.js`），msg: "Interactive turn failed"

根因：cline 3.0.31 的 `run_commands` 工具期望 command 为字符串并调用 `.trimStart()`，deepseek-v4-flash 输出为对象 → TypeError。**turn 1 即崩，无法累积 token 到 compact 阈值**。

> 诚实记录：此崩溃的直接原因是模型工具调用格式与 cline core 期望不匹配，换模型（如 glm-5.2）可能不崩，不一定是 CLI 根本性缺陷。但"CLI 自动升级中断 + bin 损坏"（事实 2）是独立的 CLI 稳定性问题。两者叠加使 #5 实证无法稳定执行。

### 事实 4：实验环境（CLI）与生产环境（VS Code）错位

用户主工作流在 VS Code 扩展（3.89.2），该扩展不支持 plugin 装载（ADR-002 Update 1 确认）。P5 实验在 CLI 上验证 `registerMessageBuilder`，但：

- VS Code 扩展是另一套实现（不同版本号、不同工具实现）
- 即使 CLI 验证成功，VS Code 支持 plugin 后仍需重验
- 等于在"非生产载体"上验证"生产载体才需要的能力"

[ADR-002-p5-experiment-exit-review §3.3](../archive/decisions/ADR-002-p5-experiment-exit-review.md) 已指出此张力（"实验环境 CLI 与生产环境 VS Code 仍分离，实验结论难以直接迁移"），但当时作为"反对舍弃"的论据被保留。今天的事实 2+3 使该张力从"理论担忧"变为"实操阻塞"。

---

## Decision

### P5 Plugin Spike 暂停（deferred）

#5 compact 双产物实证暂停。P5 Spike 状态从 partial Go 转为 **deferred（实验环境前提动摇）**。

这不是 No-Go（机制本身未被证伪——#6 已实证触发，#5 的 `registerMessageBuilder` 注册路径与 #6 在同一 plugin 对象中，未跑通是载体问题不是机制问题），而是"实验环境前提动摇导致的暂停"。

### 暂停理由（技术性，非主观价值判断）

1. **CLI 载体稳定性不足**：自动升级中断 + bin 损坏（事实 2）+ 工具调用崩溃（事实 3）+ 自动升级无法禁用，使 #5 实证无法稳定执行
2. **实验环境-生产环境错位**（事实 4）：CLI 验证结论无法迁移到 VS Code 扩展，实验价值受限
3. 上述两点是 ADR-002 Validation Plan 选择 CLI 作为实验环境时未充分覆盖的维度

### 对 mechanism-candidates 的处置

#5 / #6 / #14 状态从"实验中"改为"候选（暂缓）"。触发条件在 ADR-003 §恢复条件基础上扩展：

- Cline VS Code 扩展集成 plugin 装载入口（CHANGELOG 出现 plugin 条目）——**首选，解决实验环境-生产环境错位**
- 或用户主工作流迁移到 CLI / Kanban（使 CLI 路径成为可接受的生产载体）
- 且 CLI 载体稳定性恢复（自动升级可控 + 工具调用不崩）
- #6 的已实证结论（`beforeRun` hook 触发）保留，不回退

---

## Consequences

### 正面

- 避免在不稳定的 CLI 载体上继续投入 #5 实证（事实 2+3 证明投入可能被载体问题吞噬）
- 诚实记录"实验环境前提动摇"，避免 ADR-002 Validation Plan 的 CLI 假设被无声侵蚀
- #6 的已实证结论保留，未来恢复时无需重验

### 负面

- #5 compact 双产物闭环仍未实证，compact 自动化路径继续以提示词/Skill 形态承载
- ADR-002 §L3 V3 运行时自动化路径继续暂缓
- 需持续观察 CLI 稳定性与 VS Code 扩展 plugin 支持

### 恢复条件 / Review Trigger

满足下列**全部**条件时重启 P5 Spike：

1. CLI 载体稳定性恢复（自动升级可控或可禁用 + `run_commands` 等基础工具调用不崩）
2. 实验环境与生产环境对齐：VS Code 扩展支持 plugin 装载，**或**用户主工作流迁移到 CLI / Kanban
3. #5 compact 双产物实证仍为未解问题（未被 Cline 原生能力解决）

> **Update 2026-06-27（ADR-002 Update 2 代码层核查补充）**：条件 2 的"VS Code 扩展支持 plugin 装载"有新发现——VS Code 扩展 UI 层无 `cline plugin install` 命令，但**代码层有 plugin 结构**（`.cline/<pluginName>/{skills,workflows,cache,managed.json,rules}`）和完整 hook 系统（beforeRun/afterRun/beforeModel/beforeTool/afterTool）。**手动放 plugin 文件到 `<workspace>/.cline/<pluginName>/` 可能触发 VS Code 扩展装载**——这是未探索的恢复路径，需 Capability Probe 实测。详见 [ADR-002 Update 2](ADR-002-project-shape.md)。

---

## 后续动作

1. **experiments/p5-spike/run-p5-capability-spike.md §5**：状态从 partial Go → deferred（实验环境前提动摇），记录本会话事实 1-4
2. **mechanism-candidates.md**：#5 / #6 / #14 状态"实验中" → "候选（暂缓）— 触发条件：见 ADR-004"
3. **decisions/README.md**：索引表新增 ADR-004 行
4. **survey.md §9.1 同步**：ADR-004 为全局 Plugin 决策，与 search-orchestrator 无主题关联，按 ADR-003 先例**不加入 §9.1**，仅登记于 decisions/README.md
5. **插件临时改动已回滚**：`p5-spike-plugin.ts` 的降阈值实验常量已恢复原值（`MAX_INPUT_TOKENS=120_000` / `PRESERVE_RECENT_TOKENS=24_000`）
