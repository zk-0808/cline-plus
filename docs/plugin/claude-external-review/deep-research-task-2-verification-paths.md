# Investigation Note: Cline Runtime 未覆盖模块源码分析

**文件**: `docs/plugin/deep-research-task-1-runtime-modules.md`
**状态**: active
**生命周期**: 任务绑定——深度研究评审闭环后归档。
**evidence_as_of**: 2026-07-01
**执行约束**: 0.1 已覆盖的 compact / checkpoint / messageBuilder / rules / Plugin 7 层不重新探查。

---

## 前置说明：已有覆盖部分

以下模块已在 0.1 产出中完成源码级验证，本文件不重复：

| 已覆盖模块 | 来源文件 |
|-----------|---------|
| compact / compaction | `investigation-note-cline-runtime-probe.md` |
| checkpoint | `investigation-note-cline-runtime-probe.md` |
| messageBuilder 时机 | `investigation-note-cline-runtime-probe.md` |
| rules 注入 | `investigation-note-cline-runtime-probe.md` |
| Plugin 7 层生命周期 | `cline-plugin-architecture-atlas.md` |

---

## 模块一：Plan/Act 模式

### Observation

Cline 在 CLI 模式下支持两种交互模式：`plan`（规划模式）和 `act`（执行模式）。用户在启动 CLI 时可以指定初始模式；在 plan 模式下，模型只能规划而不能修改文件或执行命令，直到用户确认后模型调用 `switch_to_act_mode` 工具切换。

### Evidence

**文件**：`apps/cli/src/runtime/interactive/mode.ts`（47 行，源码）

```typescript
// 第 5 行 — 类型定义
type InteractiveUiMode = "plan" | "act";

// 第 7-31 行 — switch_to_act_mode 工具
export function createInteractiveModeSwitchTool(input: {
    config: Config;
    pendingModeChange: { current: InteractiveUiMode | null };
    tuiModeChanged: { current: ((mode: InteractiveUiMode) => void) | null };
}) {
    return createTool({
        name: "switch_to_act_mode",
        description: "Switch from plan mode to act mode. Call this after the user has confirmed they want to proceed with the plan...",
        execute: async () => {
            if (input.config.mode === "act") { return "Already in act mode."; }
            input.pendingModeChange.current = "act";
            input.tuiModeChanged.current?.("act");
            return "You successfully switched to act mode...";
        },
    });
}

// 第 34-47 行 — 模式切换应用
export async function applyInteractiveModeConfig(input: {
    config: Config;
    mode: InteractiveUiMode;
    switchToActModeTool: NonNullable<Config["extraTools"]>[number];
}): Promise<void> {
    input.config.mode = input.mode;
    input.config.extraTools =
        input.mode === "plan" ? [input.switchToActModeTool] : [];
    input.config.systemPrompt = await resolveSystemPrompt({
        cwd: input.config.cwd,
        providerId: input.config.providerId,
        mode: input.mode,
    });
}
```

**VS Code 对应实现**：`apps/vscode/src/sdk/sdk-mode-coordinator.ts`（文件存在，负责协调 webview ↔ SDK 的模式同步）；`apps/vscode/src/core/controller/state/togglePlanActModeProto.ts`（模式切换控制器 handler）。

**证据类型**：源码

### Hypothesis / Verified

| 问题 | 答案 | 置信度 |
|-----|------|-------|
| 它是什么？ | 两阶段交互模式系统：`plan` 模式注入 `switch_to_act_mode` 工具 + mode-aware systemPrompt；`act` 模式禁用该工具，开放文件/命令能力 | Verified |
| 在哪个文件？ | CLI: `apps/cli/src/runtime/interactive/mode.ts`；VS Code: `sdk-mode-coordinator.ts` + `togglePlanActModeProto.ts` | Verified |
| 怎么触发？ | CLI 启动参数（`--mode plan/act`）或用户在 TUI 切换；模型通过调用 `switch_to_act_mode` 工具从 plan 切到 act | Verified |
| Plugin 能否介入？ | **部分可**。Plugin 无法直接触发模式切换（`pendingModeChange` 是 CLI 内部对象），但可通过 `beforeModel` hook 观察 messages 中是否存在 `switch_to_act_mode` 工具调用结果，从而感知模式变化。无法阻止或主动触发模式切换 | Likely |

### 关键设计点

- **Plan 模式不生成结构化计划**：无内置计划 schema，模型自由格式输出；结构化程度完全由 systemPrompt 决定
- **模式切换是单向的**（plan → act），无法从 act 回退到 plan（同一 session 内）
- **extraTools 机制**：mode 决定 `config.extraTools` 数组内容，这是 CLI 插件可能观察（但无法直接修改）的内部配置

### Remaining Unknown

- VS Code 下是否支持 act → plan 的反向切换（webview 有 toggle 控件，行为未经实测验证）
- Plugin 是否能通过注入自定义 `extraTool` 来模拟模式切换效果（需实测）

---

## 模块二：Subagents 机制

### Observation

Cline 提供 `spawn_agent` 工具支持父 agent 派生子 agent。子 agent 使用独立的 `AgentConfig`，与父 agent context 隔离。该工具存在于 SDK 层，是扩展点而非内置行为——需要由 Plugin 或 agents-squad 示例显式注册。

### Evidence

**文件**：`sdk/packages/core/src/extensions/tools/team/spawn-agent-tool.ts`（203 行，源码）

```typescript
// 第 30-35 行 — 输入 schema
export const SpawnAgentInputSchema = z.object({
    systemPrompt: z.string().describe("System prompt defining the sub-agent's behavior"),
    task: z.string().describe("Task for the sub-agent to complete"),
});

// 第 49-54 行 — 子 agent 上下文标识（隔离证据）
export interface SubAgentStartContext {
    subAgentId: string;        // 独立 ID
    conversationId: string;    // 独立对话 ID
    parentAgentId: string;     // 明确追踪父子关系
    input: SpawnAgentInput;
}

// 第 66-112 行 — 配置接口（关键字段）
export interface SpawnAgentToolConfig {
    configProvider: DelegatedAgentConfigProvider;  // 子 agent 从父获取基础配置
    subAgentTools?: AgentTool[];                   // 子 agent 独立工具集
    hooks?: AgentHooks;                            // lifecycle hooks 可转发给子 agent
    extensions?: AgentExtension[];                 // extensions 可转发
    onSubAgentStart?: (context: SubAgentStartContext) => void | Promise<void>;
    onSubAgentEnd?: (context: SubAgentEndContext) => void | Promise<void>;
}

// 第 129-141 行 — 实例化（context 隔离证据）
const subAgent = createDelegatedAgent({
    kind: "subagent",
    prompt: input.systemPrompt,      // 独立 systemPrompt
    configProvider: config.configProvider,
    tools,                           // 独立工具集
    maxIterations: config.defaultMaxIterations,
    parentAgentId: context.agentId,  // 追踪父子关系
    abortSignal: context.signal,     // 继承 abort 信号
});
```

**实际使用示例**：`sdk/examples/plugins/agents-squad/index.ts`（agents-squad plugin，用 spawn_agent 实现多角色 agent 团队，包含 anvil/oracle/inquisitor/phantom 4 个角色定义）

**关联文件**：`sdk/packages/core/src/extensions/tools/team/delegated-agent.ts`（`createDelegatedAgent` 实现）；`sdk/packages/core/src/session/team/team-session-coordinator.ts`（团队协作调度）

**证据类型**：源码

### Hypothesis / Verified

| 问题 | 答案 | 置信度 |
|-----|------|-------|
| 它是什么？ | SDK 层提供的 `spawn_agent` 工具，允许父 agent 以 systemPrompt + task 为参数派生子 agent；子 agent 有独立 ID、对话 ID、工具集 | Verified |
| 在哪个文件？ | 核心：`sdk/packages/core/src/extensions/tools/team/spawn-agent-tool.ts`；示例：`sdk/examples/plugins/agents-squad/index.ts` | Verified |
| 怎么触发？ | 父 agent 模型调用 `spawn_agent` 工具；工具需由 Plugin 显式注册到 `extraTools` 或通过 `registerTool` API | Verified |
| Plugin 能否介入？ | **可以**。Plugin 可通过 `api.registerTool()` 注册自定义 spawn_agent 配置，或通过 `SpawnAgentToolConfig.hooks` 字段将 Plugin 的 hooks 转发给子 agent，实现跨 agent 生命周期观察 | Verified |

### 关键设计点

- **Context 隔离**：子 agent 有独立 `subAgentId` 和 `conversationId`，不共享父 agent 的 message history
- **配置继承**：子 agent 通过 `DelegatedAgentConfigProvider` 从父 agent 获取基础模型配置（provider、API key 等），不需要重新配置
- **Hooks 转发**：`SpawnAgentToolConfig.hooks` 字段可选转发，意味着 Plugin 可以选择让自己的 hooks 覆盖子 agent 的生命周期
- **调度模型**：同步阻塞——父 agent 等待子 agent `run()` 返回，无异步调度；`timeoutMs: 300000`（5分钟超时）

### Remaining Unknown

- `team-session-coordinator.ts` 中是否支持并行多子 agent（当前证据仅显示顺序调用）
- 子 agent 的 compact/compaction 是否与父 agent 独立计算

---

## 模块三：Deep Planning / Focus Chain

### Observation

"Deep Planning"在 Cline 源码中**不以独立模块形式存在**。搜索 `deep-planning`、`deepPlanning`、`DeepPlanning` 在全源码中**无命中**。真正存在的是 **Focus Chain**，但它不是规划引擎，而是 VS Code 专属的任务 checklist 追踪机制。

### Evidence

**搜索路径**（均无结果）：
- 全仓库搜索 `deep-planning`、`deepPlanning`、`DeepPlanning` → 0 命中
- 全仓库搜索 `focus_chain`、`FocusChain`、`focus-chain` → 命中仅 VS Code 层

**Focus Chain 实现**：`apps/vscode/src/core/task/focus-chain/file-utils.ts`（77 行，源码）

```typescript
// 第 9-11 行 — 文件命名
function getFocusChainFilePath(taskDir: string, taskId: string): string {
    return path.join(taskDir, `focus_chain_taskid_${taskId}.md`)
}

// 第 16-25 行 — 文件内容模板（纯 markdown checklist）
function createFocusChainMarkdownContent(taskId: string, focusChainList: string): string {
    return `# Focus Chain List for Task ${taskId}
<!-- Edit this markdown file to update your focus chain list -->
<!-- Use the format: - [ ] for incomplete items and - [x] for completed items -->
${focusChainList}
<!-- Save this file and the focus chain list will be updated in the task -->`
}
```

**文档关联**：`docs/core-workflows/plan-and-act.mdx` 和 `apps/vscode/src/shared/slashCommands.ts` 中存在 "Deep Planning" 字样（作为**功能名称**出现在文档/UI 字符串，但无对应源码实现模块）

**证据类型**：源码（Focus Chain）+ 文档（Deep Planning 名称）

### Hypothesis / Verified

| 问题 | 答案 | 置信度 |
|-----|------|-------|
| 它是什么？ | "Deep Planning"是 Cline 文档/UI 中对 Plan 模式深度使用的**营销描述**，非独立代码模块。Focus Chain 是 VS Code 专属的任务 todo 追踪器（markdown checklist 文件），非规划引擎 | Verified（无实现） |
| 在哪个文件？ | Focus Chain 文件工具：`apps/vscode/src/core/task/focus-chain/file-utils.ts`。Deep Planning 无独立实现文件 | Verified |
| 怎么触发？ | Focus Chain 由 VS Code 扩展内部创建 `focus_chain_taskid_{taskId}.md` 文件；用户通过编辑该文件更新 checklist 状态 | Verified |
| Plugin 能否介入？ | **不可**。Focus Chain 是 VS Code 扩展内部机制，无 Plugin API 暴露。CLI 环境下不存在该机制 | Verified |

### 关键设计点

- Focus Chain 与 Plan/Act 模式**不是同一机制**：Plan/Act 控制模型权限，Focus Chain 追踪任务进度
- Focus Chain 仅存在于 VS Code 扩展层，CLI 无对应实现
- 本项目运行在 CLI 3.0.x 环境（dev-rules §1.15），因此 **Focus Chain 对 cline-plus 不可用**

---

## 模块四：Memory Bank

### Observation

Memory Bank **不是 Cline 的源码实现功能**，而是一种**文档约定方法论**（documentation methodology）：通过在项目中维护一组结构化 markdown 文件，加上 `.clinerules` 中的系统指令，让 Cline 在会话开始时读取这些文件来"恢复记忆"。存储、检索均依赖文件系统，无运行时数据库或向量检索。

### Evidence

**文件**：`docs/best-practices/memory-bank.mdx`（163 行，文档）

关键段落：

> "Memory Bank is a documentation methodology that transforms Cline from a stateless assistant into a persistent development partner. Through structured markdown files, Cline can 'remember' your project details across sessions."

**目录结构（约定，非代码生成）**：
```
memory-bank/
├── projectbrief.md      # 基础文档
├── productContext.md    # 为什么存在
├── activeContext.md     # 当前工作焦点（最常更新）
├── systemPatterns.md    # 架构与模式
├── techContext.md       # 技术栈
└── progress.md          # 进度
```

**存储模型**：文件系统（项目目录下的 markdown 文件）
**检索方式**：Cline 在 task 开始时通过 .clinerules 指令被告知"读取所有 memory-bank/ 文件"
**触发命令**（文档级，非 slash commands）：
- `"follow your custom instructions"` — 读取并继续
- `"initialize memory bank"` — 初始化结构
- `"update memory bank"` — 全量更新

**源码搜索**：全仓库搜索 `MemoryBank`、`memory-bank`、`memory_bank` 关键字 → **无运行时源码命中**

**证据类型**：文档

### Hypothesis / Verified

| 问题 | 答案 | 置信度 |
|-----|------|-------|
| 它是什么？ | 纯文档约定方法论：项目目录下的结构化 markdown 文件集合 + .clinerules 中的读取指令。无运行时数据库、无向量检索、无持久化 API | Verified（文档层） |
| 在哪个文件？ | 方法论文档：`docs/best-practices/memory-bank.mdx`。**无源码实现文件** | Verified |
| 怎么触发？ | 用户通过自然语言命令触发，Cline 根据 .clinerules 中的指令读取 `memory-bank/` 目录下的 markdown 文件 | Verified（文档） |
| Plugin 能否介入？ | **可以（模拟层）**。Plugin 可通过 `api.registerRule()` 注入动态 memory bank 内容，或通过 `rules.content` 函数动态生成项目状态摘要，实现比静态 markdown 更精确的"记忆"注入 | Likely |

### 与 context-snapshot plugin 的关系

Memory Bank 与 context-snapshot plugin 存在**功能重叠但粒度不同**：

| 维度 | Memory Bank | context-snapshot plugin |
|------|------------|------------------------|
| 触发时机 | 用户手动命令 | compact 事件自动触发 |
| 内容来源 | 用户维护的 markdown 文件 | 自动提取 handoff.md 的决策/未完成项 |
| 注入机制 | .clinerules 指令（读文件） | Plugin rules API（直接注入 context） |
| 精度 | 用户手工维护，依赖人工更新 | 自动提取，依赖 snapshot-writer 质量 |

### Remaining Unknown

- `activeContext.md` 的"最常更新"是否有自动触发机制（当前仅文档声明，无源码验证）

---

## 模块五：Workflows

### Observation

Cline 的 Workflows 是**基于 `.clinerules/workflows/` 目录的结构化 markdown 文件**系统，不是代码执行引擎。工作流通过自然语言步骤描述任务，Cline 在执行时按步骤操作。与 Slash Commands 的区别在于：Slash Commands 是内置的快捷操作（`/newtask`、`/smol` 等），Workflows 是用户/Plugin 定义的可重用任务模板。

### Evidence

**工作流文件示例**：`sdk/examples/cron/events/pr-review.event.md`、`sdk/examples/cron/daily-code-review.cron.md` 等

**工作流文件结构**（从 `.clinerules/workflows/pr-review.md` 类型文件观察）：
```markdown
---
name: PR Review
triggers: [pr_opened, pr_updated]
---
# Steps
1. Read the PR description
2. Review changed files
3. Run tests
4. Post review comment
```

**Slash Commands 实现**：`apps/vscode/src/shared/slashCommands.ts`（命令列表，与 Workflows 无关联）

**关键区分**：
- `SlashCommands`（`/newtask`、`/smol`、`/review`）：内置快捷操作，映射到 Controller handler
- `Workflows`（`.clinerules/workflows/*.md`）：用户定义的结构化任务模板，由 .clinerules 系统加载

**SDK 安全机制关联**：`sdk/packages/core/src/runtime/safety/loop-detection.ts`（Loop Detection 与 workflow 执行中的循环保护相关）

**Cron 调度支持**：`sdk/packages/core/src/cron/`（完整 cron 系统，workflow 可被 cron 任务调用）

**证据类型**：源码（文件结构 + cron）+ 文档（workflow 格式）

### Hypothesis / Verified

| 问题 | 答案 | 置信度 |
|-----|------|-------|
| 它是什么？ | 基于 `.clinerules/workflows/` 目录的结构化 markdown 任务模板系统，配合 cron 调度器可定期/事件触发执行 | Verified（文件结构）|
| 在哪个文件？ | 存储：`.clinerules/workflows/*.md`；cron 调度：`sdk/packages/core/src/cron/`；安全防护：`sdk/packages/core/src/runtime/safety/loop-detection.ts` | Verified |
| 怎么触发？ | 1) 用户在对话中触发（引用 workflow 名）；2) Cron 任务定期触发（`cron-runner.ts`）；3) 事件触发（`events/*.event.md`） | Verified |
| Plugin 能否介入？ | **可以**。Plugin 可通过 `api.registerRule()` 注入 workflow 定义，或读取现有 workflow 文件扩展其步骤。此外，workflow 执行时的每个工具调用都经过 `beforeTool`/`afterTool` hooks | Likely |

### Slash Commands vs Workflows 对比

| 维度 | Slash Commands | Workflows |
|------|---------------|-----------|
| 定义方 | Cline 内置 | 用户/Plugin 自定义 |
| 触发 | `/command` 前缀 | 对话引用 / cron / 事件 |
| 格式 | 代码定义（.ts）| Markdown 文件 |
| 可扩展 | Plugin 可通过 `registerTool` 添加 slash command | Plugin 可通过 `registerRule` 注入 workflow |

### Remaining Unknown

- Workflow 文件的正式 schema 是否有 JSON Schema 定义（当前仅从示例文件推断格式）
- CLI 环境是否完整支持 cron 触发（CLI cron 子命令存在于 `apps/cli/src/commands/schedule/`，但与 VS Code cron 的功能对等性未验证）

---

## 综合四问矩阵

| 模块 | 它是什么 | 在哪个文件 | 怎么触发 | Plugin 能否介入 |
|-----|---------|-----------|---------|--------------|
| Plan/Act | 两阶段交互模式，plan 注入 switch_to_act_mode 工具 | `apps/cli/src/runtime/interactive/mode.ts` | CLI 启动参数 / 模型调用工具 | 部分可（beforeModel 观察，无法主动切换） |
| Subagents | spawn_agent 工具，子 agent 上下文隔离 | `sdk/.../team/spawn-agent-tool.ts` | 父 agent 调用 spawn_agent 工具 | **可以**（registerTool + hooks 转发） |
| Deep Planning / Focus Chain | "Deep Planning"无源码实现；Focus Chain = VS Code markdown checklist | `apps/vscode/src/core/task/focus-chain/file-utils.ts` | VS Code 内部创建 checklist 文件 | **不可**（VS Code 内部，CLI 不存在） |
| Memory Bank | 文档约定方法论（markdown 文件 + .clinerules 指令）| `docs/best-practices/memory-bank.mdx`（无源码） | 用户自然语言命令 | **可以**（registerRule 动态注入，比静态 markdown 更精确） |
| Workflows | .clinerules/workflows/ 下的 markdown 任务模板 + cron 调度 | `.clinerules/workflows/` + `sdk/.../cron/` | 对话引用 / cron / 事件触发 | **可以**（registerRule 注入 + beforeTool/afterTool hooks） |

---

## 冲突记录

本次探查未发现与 0.1 已有产出的直接冲突。补充信息：

- 0.1 未提及 Subagents（`spawn_agent`）工具，本次为新增发现
- 0.1 未探查 Workflows/cron 系统，本次为新增发现
- 0.1 未明确 Focus Chain 的 VS Code-only 属性，本次补充说明（影响：cline-plus 在 CLI 环境下无法使用 Focus Chain）
