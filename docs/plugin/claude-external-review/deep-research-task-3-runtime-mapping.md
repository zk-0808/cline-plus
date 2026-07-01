# Runtime 映射分析：Cline 原生能力 → Agent Runtime 8 组件

**文件**: `docs/plugin/deep-research-task-3-runtime-mapping.md`
**状态**: active
**evidence_as_of**: 2026-07-01
**背景依据**: `docs/reviewer-personas.md §2.6`（8组件定义）、`docs/mechanism-candidates.md`（项目候选清单）、`docs/plugin/refs/cline-plugin-architecture-atlas.md`（7层生命周期与API）

---

## 8 组件统一映射矩阵

以下为 Cline 原生能力与 cline-plus 机制向 Agent Runtime 8 组件的深度映射表：

| # | 组件 | Cline 原生能力 | 项目当前雏形 | Plugin 可扩展性 | 扩展路径建议 | 成熟实践对照 |
|---|------|--------------|-------------|----------------|-------------|-------------|
| 1 | **Runtime State** | **部分存在**：Plan/Act 两种离散交互模式（`mode.ts`），ReAct 单一核心循环。无显式状态机 | **Candidates #4, #5**：v0.6.0 中基于 loop-guard 的实时循环检测，以及 compaction 状态监测 | **部分可介入**：通过 `beforeModel` 拦截 messages 判断状态，或 `afterTool` 监测历史 | 引入显式 Plugin State Machine，通过 hooks 拦截并改变执行流 | 对比成熟实践：Cline 缺乏真正的状态转换定义，仅靠 ReAct 自然循环，易陷入死循环（Loop） |
| 2 | **Control Flow** | **空白**：内置 max iterations 限制，缺乏动态停止/回退条件与目标锁 | **Candidates #1, #4**：v0.6.0 已实现 Loop Guard 检测层（检测到 4 次重复即触发告警） | **高度可扩展**：利用 `beforeModel` 修改 messages 强行注入警告或截断对话 | 在 `beforeModel` 中注入终止标记，或直接通过 IPC 抛出终止信号实现 Termination Guard | 缺乏主动的、语义层面的 Termination Guard。本项目 Loop Guard 是填补这一空白的核心 |
| 3 | **Planner** | **部分存在**：Plan 模式下依靠 systemPrompt 指导模型生成规划。无结构化计划引擎 | **Candidates #16**：search-orchestrator 中的 Gap Ledger（缺口枚举，已升级为 active 状态） | **不可直接介入**：Plugin 无法直接访问/修改 Cline 内部 planner 计划 | Plugin 可通过 `registerRule` 注入 "Objective Consistency Check" 动态准则约束 | 缺乏确定性计划生成与持续检查（Objective Consistency Check），完全依赖 LLM 自由格式自检，易漂移 |
| 4 | **Evaluator** | **空白**：任务成功与否完全由用户手动确认或 LLM 自主宣告。无确定性验证器 | **Candidates #16, #19, #21**：Gap Ledger（证据链核验）、Same-source Merge（同源转载去重） | **部分可扩展**：利用 `afterTool` 拦截工具输出，在输出中注入或修改 validation 结果 | 结合 Plugin `afterTool` hook，设计 "Checker-as-a-Tool" 强制在工具执行后进行确定性核查 | 缺乏 Maker-Checker 分离机制。成熟实践要求确定性验证器优先（如测试运行成功作为退出门控） |
| 5 | **Observation** | **存在（内部）**：系统事件/工具输出（`tool_result`）作为 message 注入 context | **Candidates #1, #24**：search-mcp-wrapper 中的自适应反-bot 熔断与退避机制（已机制化）| **完全可扩展**：利用 `beforeTool`/`afterTool` 拦截、过滤并对二级信号进行分级 | 建立 "Signal Priority Filter" 机制，将底层 IO 报错、节流信号（如 bot detected）下沉为确定性代码退避 | 官方仅支持 flat 消息流注入。本项目已在 MCP wrapper 层实现确定性节流与退避，提升了信号健壮性 |
| 6 | **Memory** | **存在（文件/消息）**：message history 内存窗口，Compaction 机制，Memory Bank（文档约定） | **Candidates #5, #6, #14, #17**：handoff.md 提取写入、rules 动态注入、Highlights  Relevance 压缩 | **高度可扩展**：通过 `registerMessageBuilder` 动态重构/压缩历史，或 `registerRule` 注入 rules | 实现 "Dynamic Context Refiner"：在 messageBuilder 中剔除噪音工具调用，保留高价值证据 | "Agent forgets, repo doesn't"。Cline 极度依赖 token 吞吐，缺乏 Working/Short/Long-term 结构化分层 |
| 7 | **Tooling** | **高度成熟**：内置 read/write/bash 及 MCP 协议支持，是 Cline 最强能力 | **Candidates #1, #2, #3, #22, #24**：PowerShell safe-exec、反-bot 节流、Headless 浏览器穿透 | **高度可扩展**：通过 `registerTool` 注册自定义子工具，或在 `beforeTool` 中对入参进行校验 | 实现 "Tool Safety Harness"：利用 `beforeTool` 校验入参，避免高危/低效命令（如 rm -rf, raw ping） | 工具链非常强大，但缺乏专用验证防护罩（Harness），容易被模型误用导致低效或破坏性路径 |
| 8 | **Architecture** | **高度成熟**：7 层 Plugin 生命周期（Sandbox 隔离、Host 代理、jiti 动态编译等） | **无**（此为 cline-plus 项目本身的基础设施） | **完全对齐**：项目基石，通过 Atlas 确认的 7 个稳定 API 已经能够支撑绝大多数重构需求 | 保持 Plugin 干净的 "Host-Guest" 契约，避免为了规避约束而入侵 Cline 核心代码 | 上游架构正在经历 SDK 迁移，虽然短期造成破坏（如 4.0.x 插件不可用），但长期利好扩展性 |

---

## 核心组件分析

### 1. Runtime State & Control Flow (状态与控制流)
* **现状与差距**：Cline 本质上是一个无状态的 ReAct（Reasoning & Acting）死循环。它没有显式的状态转移矩阵（State Transition Matrix），也没有真正的控制流终止保障。在面临工具调用失败、路径受阻或模型生成退化时，极易陷入死循环或产生目标漂移。
* **Plugin 介入可行性**：
  * `beforeModel` hook 允许我们在模型调用前介入。虽然无法直接修改 Cline 内部运行状态，但我们可以通过修改 `messages` 数组（例如在 messages 末尾注入循环警告，或者人为插入一个 `stop` 标志消息）来**间接控制模型决策**。
  * `afterTool` 能够实时计算相似度（如 cline-plus Loop Guard 已经实现并验证的 `detectRepetition`），它是控制流的最强传感器。
* **扩展方向**：建立 Plugin 侧的 **Control Flow Center**：
  1. **Termination Guard**：当检测到深度 loop 或 max iteration 临界点时，强行修改下一次 model 调用的 messages，注入不可忽略的 `CRITICAL_WARNING: You are in a dead loop. STOP calling read_file.`
  2. **Mode Sync**：利用 CLI plan/act 模式特性的 `switch_to_act_mode` 工具，Plugin 可在 beforeModel 检测该工具调用，从而在 Plugin 内部建立双阶段状态机（Plan-Execute 状态机）。

### 2. Evaluator (成功评估器)
* **现状与差距**：上游 Cline 缺乏确定性 Evaluator。任务是否完成全靠 LLM "自我感觉良好"（输出中带有 `I have completed the task`）或依赖人工手动介入点击 Confirm。这导致 Agent 经常在没有真正产生合格产出的情况下，便自行宣告任务结束。
* **Plugin 介入可行性**：
  * Plugin 无法阻止模型输出 "I have completed the task" 字符串，但我们可以利用 `messageBuilder` 或 `beforeModel` 拦截。
  * 如果 Plugin 在 `afterTool` 中发现模型声明完成了某项需要编译或测试的任务，但测试尚未运行或运行失败，Plugin 可以修改下一轮输入，强行驳回模型的完成宣告。
* **扩展方向**：**Deterministic Validator Harness**
  * 设计一个特定规则：若项目包含 `package.json`，在模型声明 "Task Complete" 之前，Plugin 强行通过 dynamic rules 或在 `beforeModel` 中注入临时任务：`Before you conclude, you MUST run npm test and include the test results in your final evidence.`

### 3. Memory & Context Optimization (记忆与上下文优化)
* **现状与差距**：Memory Bank 在上游只是一个推荐的 md 写作指南，不是真正的系统级特性。Cline 在运行长对话时，唯一的手段是 Auto Compact。由于 Token Compaction 只是粗暴地截断前面 % 的消息（保留 systemPrompt 和最后几条），模型经常在一瞬间"忘记"之前的核心设计决策和探索事实。
* **Plugin 介入可行性**：
  * context-snapshot 插件是解决这一痛点的完美机制：利用 `shouldCompact` 拦截，在 Compaction 发生时，自动通过 `snapshot-writer` 提取当前上下文中的关键决策表和未完成项，写入 `~/.cline/data/snapshot/*.md`，并通过 dynamic rules 机制注入新 session，从而在 token 损失 90% 的情况下，完美保留 100% 的关键记忆。
* **扩展方向**：**High-fidelity Memory Injector**
  * 深度迭代 `snapshot-extractor`（如 v0.7.0 设计中的 AST 语法树或 Schema 化提取），进一步减少噪声。
  * 在 `messageBuilder` hook 中，实现 `Evidence deduplication`（同源转载去重）：过滤掉冗余的大文件读取内容，只在 context 中保留 Highlights（Relevance Compression，不超过 500 tokens），从而将物理 context 窗级极大释放。
