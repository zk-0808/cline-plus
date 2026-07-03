# Investigation Note: Native Condense Hook 暴露面探查 (Task C)

> **调查日期**: 2026-07-03
> **cline 版本**: main branch (commit 3c23f80)
> **结论**: cline 有 `PreCompact` 文件 hook（已定义但未接入）和 `beforeModel` runtime hook（已接入、在 compaction 后触发）。**推荐 `beforeModel` 作为薄适配层插入点。**

---

## 1. cline hook 系统概述

cline 有两套并行的 hook 系统：

### 1.1 文件 Hook 系统（VSCode 扩展 + CLI）

通过在 `.clinerules/hooks/` 或 `~/Documents/Cline/Hooks/` 目录下放置可执行脚本来注册。

**有效 hook 类型**（`apps/vscode/src/core/hooks/utils.ts:12-22`）：

```typescript
export const VALID_HOOK_TYPES = [
    "TaskStart",
    "TaskResume",
    "TaskCancel",
    "TaskComplete",
    "PreToolUse",
    "PostToolUse",
    "UserPromptSubmit",
    "Notification",
    "PreCompact",    // ← 已定义
] as const
```

**注册方式**: 创建名为 `<HookName>` 的可执行文件（Unix 无扩展名，Windows 用 `.ps1`）

**Proto 定义**（`apps/vscode/proto/cline/hooks.proto`）：
- `HookInput` 包含 `oneof data` 字段，支持 `pre_compact` (field 17)
- `HookOutput` 返回 `{ contextModification, cancel, errorMessage }`

### 1.2 Runtime/Plugin Hook 系统（SDK）

通过 `AgentRuntimeHooks` 接口定义（`sdk/packages/shared/src/agent.ts:336-370`）：

```typescript
export interface AgentRuntimeHooks {
    beforeRun?: (context) => AgentStopControl | undefined;
    afterRun?: (context) => void;
    beforeModel?: (context) => AgentBeforeModelResult | undefined;
    afterModel?: (context) => AgentStopControl | undefined;
    beforeTool?: (context) => AgentBeforeToolResult | undefined;
    afterTool?: (context) => AgentAfterToolResult | undefined;
    onEvent?: (event) => void;
}
```

**注册方式**:
- Plugin: `AgentPlugin.hooks.beforeModel` 等
- Extension: `AgentExtension` with hooks
- Subprocess: `createSubprocessHooks()` / `createHookConfigFileHooks()`

### 1.3 Plugin MessageBuilder 系统

通过 `api.registerMessageBuilder()` 注册（`sdk/packages/shared/src/extensions/contribution-registry.ts:128`）：

```typescript
registerMessageBuilder: (builder: AgentExtensionMessageBuilder<TMessage>) => void;
```

MessageBuilder 在 model request 前运行，可以重写 messages。

---

## 2. condense 相关 hook 分析

### 2.1 核心发现：PreCompact hook 已定义但未接入

**证据链**：

| 文件 | 行号 | 证据 |
|---|---|---|
| `apps/vscode/src/core/hooks/utils.ts` | 20 | `"PreCompact"` 在 `VALID_HOOK_TYPES` 中 |
| `apps/vscode/proto/cline/hooks.proto` | 67-80 | `PreCompactData` message 定义完整 |
| `apps/vscode/src/core/hooks/templates.ts` | 414-467 | PreCompact 模板脚本存在 |
| `sdk/packages/core/src/hooks/hook-file-config.ts` | 41 | `[HookConfigFileName.PreCompact]: undefined` — **不映射到任何 HookEventName** |
| `apps/vscode/src/sdk/hooks-adapter.ts` | 12 | `"Deferred hooks (NOT wired here): TaskResume, TaskError, SessionShutdown, PreCompact, Notification."` |
| `apps/cli/src/commands/hook.ts` | 22 | `case "pre_compact": return {}` — 只返回空对象 |

**结论**: `PreCompact` 是一个 **已定义但未接入** 的 hook。文件系统可以发现它，proto 定义完整，但它不会在 compaction 流程中被自动触发。

### 2.2 Compaction 执行流程

**自动 compaction**（`sdk/packages/core/src/extensions/context/compaction.ts`）：

```
AgentRuntime.run()
    ↓
prepareTurnForModelRequest()     ← agent-runtime.ts:805
    ↓
createContextCompactionPrepareTurn()  ← 创建 prepareTurn callback
    ↓
检查 token 阈值 → 执行 basic/agentic compaction
    ↓
替换 messages
    ↓
beforeModel hooks                ← agent-runtime.ts:807, 在 compaction 之后
    ↓
Model API call
```

**关键证据**（`sdk/packages/agents/src/agent-runtime.ts:805-807`）：
```typescript
request = await this.prepareTurnForModelRequest(request);  // compaction 在此

for (const hook of this.hooks.beforeModel) {               // beforeModel 在此后
    const result = await hook({ snapshot, request });
    ...
}
```

**手动 compaction**（`/compact` 或 `/smol` 命令）：
- VSCode: `SdkCompactionCoordinator.compactTask()` → `compactSessionMessages()` → 重启 session
- CLI: `compactInteractiveMessages()` → 重启 session
- 手动 compaction **不触发任何 hook**，直接替换 messages 并重启

### 2.3 各 Hook 在 Condense 场景下的分析

| hook 名 | 触发时机 | condense 场景下是否触发 | 可访问数据 | 注入能力 |
|---|---|---|---|---|
| **PreCompact** (文件 hook) | compaction 前 | **否**（已定义但未接入） | 设计上可拿到 `contextJsonPath`（完整 API history）、`contextRawPath`（完整 context window）、token 统计 | 设计上可 `cancel` compaction 或注入 `contextModification` |
| **beforeModel** (runtime hook) | compaction 后、model request 前 | **是**（每次 model request 前） | `request.messages`（compaction 后的 messages）、`request.systemPrompt`、`request.tools`、`snapshot` | 可返回 `{ messages }` 重写 messages、注入 context |
| **afterModel** (runtime hook) | model response 后 | **是** | `assistantMessage`、`finishReason` | 可返回 `stop` 控制，但不能修改 messages |
| **beforeTool** (runtime hook) | tool 执行前 | **是**（如果 model 调用 tool） | `toolCall`、`input` | 可 `skip`/`stop` tool、修改 `input` |
| **afterTool** (runtime hook) | tool 执行后 | **是** | `toolCall`、`result`、`durationMs` | 返回值有限（`AgentAfterToolResult`） |
| **messageBuilder** (plugin) | model request 前（在 prepareTurn 和 beforeModel 之间？） | **是** | 完整 messages 数组 | 可重写 messages（返回新数组） |
| **PreToolUse** (文件 hook) | tool 执行前 | **是** | `toolName`、`parameters` | 可 `cancel` tool、注入 `contextModification` |
| **PostToolUse** (文件 hook) | tool 执行后 | **是** | `toolName`、`result`、`success`、`executionTimeMs` | 可注入 `contextModification` |
| **TaskStart** (文件 hook) | 任务开始时 | **否** | `taskMetadata` | 可注入 context |
| **UserPromptSubmit** (文件 hook) | 用户提交 prompt 时 | **否** | `prompt`、`attachments` | 可注入 context |

---

## 3. 薄适配层插入点推荐

### 3.1 推荐：`beforeModel` runtime hook

**理由**：

1. **已接入、稳定可用**：`beforeModel` 在 agent-runtime.ts 中已完整实现，每次 model request 前必定触发
2. **在 compaction 后触发**：执行顺序是 `prepareTurn`（compaction）→ `beforeModel`，所以 `beforeModel` 能看到 compaction 后的 messages
3. **可重写 messages**：返回 `{ messages: [...] }` 可以替换即将发送给 model 的 messages，这意味着可以在 compaction 后注入 handoff.md 内容
4. **可访问完整 request**：包括 `messages`、`systemPrompt`、`tools`、`snapshot`
5. **Plugin 友好**：通过 `AgentPlugin.hooks.beforeModel` 注册，无需文件系统操作

**插入方案**：

```typescript
const plugin: AgentPlugin = {
    name: "condense-handoff",
    hooks: {
        beforeModel({ request }) {
            // 检测是否刚发生 compaction（messages 数量骤减）
            // 从 messages 中抽取 semantic object
            // 写 handoff.md
            // 可选：注入 handoff 内容到 messages
            return undefined; // 不修改 messages
        }
    }
};
```

### 3.2 备选：`PreCompact` 文件 hook（需先接入）

**如果需要在 compaction 前**拿到完整 messages（而非 compaction 后的 summary），需要先将 `PreCompact` 接入 compaction 流程。

**优势**：
- 设计上提供 `contextJsonPath`（完整 API conversation history JSON 文件路径）
- 设计上提供 `contextRawPath`（完整 context window 文本文件路径）
- 在 compaction 前触发，可以拿到将被压缩的原始内容

**劣势**：
- **当前未接入**：`hook-file-config.ts:41` 中 `[HookConfigFileName.PreCompact]: undefined`
- 需要修改 cline 源码才能启用
- 是文件 hook（subprocess），不是 runtime hook，性能开销更大

### 3.3 备选：`messageBuilder` plugin hook

**优势**：
- 在 model request 前运行，可重写 messages
- Plugin 级别，注册简单

**劣势**：
- 不确定其与 `prepareTurn`（compaction）的精确执行顺序
- 主要设计用于消息格式转换，不是为 compaction 事件观察设计的

---

## 4. codec bug 风险评估

### 4.1 `beforeModel` hook 的风险

**低风险**。原因：

1. `beforeModel` 接收的 `request.messages` 是 SDK 内部的 `AgentMessage` 类型，不是原始 API `Message` 类型
2. `AgentMessage` 使用结构化的 `content` 数组（`{ type: "text", text: string }[]`），不存在 `content` 类型歧义
3. 即使 hook 不修改 messages（返回 `undefined`），也不会触发 `content.map` 崩溃
4. 如果 hook 返回 `{ messages }`，需要确保返回的 messages 符合 `AgentMessage` 结构

**规避措施**：
- Hook 内部只读 messages，不修改 content 结构
- 写 handoff.md 时，从 messages 中提取 text 内容，不直接序列化 content 数组
- 如果需要修改 messages，确保每个 message 的 `content` 是数组格式

### 4.2 `PreCompact` hook 的风险

**中等风险**。原因：

1. `PreCompactData` 提供 `contextJsonPath`（临时 JSON 文件），需要读取文件
2. JSON 文件中的 message 格式可能包含混合 content 类型（string | array）
3. 如果 hook 返回 `cancel: false`，compaction 正常进行，无风险
4. 如果 hook 返回 `cancel: true`，会阻止 compaction，可能导致 context 溢出

### 4.3 `messageBuilder` hook 的风险

**低风险**。原因：

1. MessageBuilder 接收和返回的都是 SDK 内部 message 格式
2. 不直接操作原始 API messages
3. Core 的 API-safety message builder 在 plugin builder 之后运行，会做最终规范化

---

## 5. 关键源码证据索引

| 文件 | 行号 | 内容 |
|---|---|---|
| `apps/vscode/src/core/hooks/utils.ts` | 12-22 | `VALID_HOOK_TYPES` 定义（含 PreCompact） |
| `apps/vscode/proto/cline/hooks.proto` | 67-80 | `PreCompactData` proto 定义 |
| `sdk/packages/core/src/hooks/hook-file-config.ts` | 41 | `[HookConfigFileName.PreCompact]: undefined`（未接入） |
| `apps/vscode/src/sdk/hooks-adapter.ts` | 12 | "Deferred hooks (NOT wired here): ... PreCompact" |
| `sdk/packages/shared/src/agent.ts` | 336-370 | `AgentRuntimeHooks` 接口定义 |
| `sdk/packages/agents/src/agent-runtime.ts` | 805-807 | `prepareTurn` → `beforeModel` 执行顺序 |
| `sdk/packages/core/src/extensions/context/compaction.ts` | 301 | `createContextCompactionPrepareTurn` 函数 |
| `sdk/packages/shared/src/hooks/events.ts` | 67 | `"pre_compact"` 在 HookEventNameSchema 中 |
| `sdk/packages/shared/src/hooks/events.ts` | 110-126 | `PreCompactData` TypeScript 接口 |
| `apps/vscode/src/core/hooks/templates.ts` | 414-467 | PreCompact hook 模板 |
| `apps/cli/src/commands/hook.ts` | 22 | `case "pre_compact": return {}`（空处理） |
| `sdk/examples/hooks/custom-compaction-hook.example.ts` | 全文 | `beforeModel` hook 实现自定义 compaction 的示例 |
| `sdk/examples/plugins/custom-compaction.ts` | 全文 | `registerMessageBuilder` 实现自定义 compaction 的示例 |

---

## 6. 总结

| 维度 | 结论 |
|---|---|
| **是否有专门的 onCondense hook？** | 有 `PreCompact`，但未接入 |
| **condense 是否触发其他 hook？** | 是，`beforeModel` 在 compaction 后触发 |
| **推荐插入点** | `beforeModel` runtime hook（通过 plugin 注册） |
| **能否拿到 compaction 前的 messages？** | 不能（除非接入 PreCompact 或在 beforeModel 中做 diff 检测） |
| **能否拿到 compaction 后的 messages？** | 能（beforeModel 的 `request.messages`） |
| **能否写 handoff.md？** | 能（hook 中可执行任意代码） |
| **能否修改 messages？** | 能（beforeModel 返回 `{ messages }`） |
| **codec bug 风险** | 低（使用 SDK 内部类型，不操作原始 API messages） |
