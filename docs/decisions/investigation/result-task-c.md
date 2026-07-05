# registerMessageBuilder 源码分析

## 结论摘要

```
- registerMessageBuilder 类型定义: sdk/packages/shared/src/extensions/contribution-registry.ts:29-32
- 执行调用点: sdk/packages/core/src/runtime/orchestration/session-runtime-orchestrator.ts:996-1007
- 执行时机: 每次 model request（在 beforeModel hook 中触发）
- 注入目标: 整个消息数组（所有角色：system / user / assistant / tool_result 均可修改）
- 与 registerRule 的本质区别: 见下方对比表
```

## 详细分析

### 1. 类型定义

**文件**: `sdk/packages/shared/src/extensions/contribution-registry.ts:29-32`

```typescript
export interface AgentExtensionMessageBuilder<TMessage = unknown> {
    name: string;
    build: (message: TMessage) => TMessage | Promise<TMessage>;
}
```

注册 API 定义在同一文件 `:128`：

```typescript
registerMessageBuilder: (
    builder: AgentExtensionMessageBuilder<TMessage>,
) => void;
```

builder 被收集到 `ContributionRegistry` 的 `registry.messageBuilder[]` 数组中（`:513`）。

### 2. 执行调用链

```
AgentRuntime.run()  (agent-runtime.ts:807)
  └─ for (hook of hooks.beforeModel)   ← 每次 model request 前调用
       └─ SessionRuntime.createRuntimeHooks().beforeModel  (session-runtime-orchestrator.ts:919)
            └─ this.prepareMessagesForModelRequest(messages)  (:987)
                 └─ this.prepareProviderMessagesForApi(...)  (:996)
                      │
                      │  // ① 先跑所有 plugin messageBuilder
                      ├─ for (builder of messageBuilders) {
                      │     providerMessages = await builder.build(providerMessages);  (:1002-1004)
                      │  }
                      │
                      │  // ② 再跑核心 MessageBuilder.buildForApi()（截断/安全规范化）
                      └─ this.messageBuilder.buildForApi(providerMessages)  (:1005)
```

**关键代码** (`session-runtime-orchestrator.ts:996-1007`)：

```typescript
private async prepareProviderMessagesForApi(
    messages: MessageWithMetadata[],
): Promise<MessageWithMetadata[]> {
    let providerMessages = messages;
    const messageBuilders =
        this.contributionRegistry.getRegistrySnapshot().messageBuilder;
    for (const builder of messageBuilders) {
        providerMessages = await builder.build(providerMessages);
    }
    return this.messageBuilder.buildForApi(providerMessages);
}
```

### 3. 执行时机

**每次 model request**，不是一次性。

调用路径确认：
- `agent-runtime.ts:807` — 在 agent 主循环中，每次调用 model 前遍历 `this.hooks.beforeModel`
- `session-runtime-orchestrator.ts:919-930` — `beforeModel` hook 内部调用 `prepareMessagesForModelRequest`
- 因此 plugin 注册的 messageBuilder 在每轮 model 调用前都会被执行

### 4. 注入目标

**整个消息数组**，不限于某一角色。

builder 的签名是 `(messages: Message[]) => Message[]`，它接收完整的 provider-bound 消息数组，可以：
- 追加新消息（任意角色）
- 删除/过滤已有消息
- 修改消息内容（改 system prompt、改 user message、改 tool result 等）
- 重排消息顺序

典型用例（`sdk/examples/plugins/custom-compaction.ts`）：plugin 实现自定义 compaction，压缩历史消息以控制 context window。

### 5. 与 registerRule 的本质区别

| 维度 | `registerRule` | `registerMessageBuilder` |
|------|---------------|------------------------|
| **注入位置** | system prompt 字符串 | 整个 `Message[]` 数组 |
| **执行时机** | 每次 run 开始时（`composeSystemPrompt`） | 每次 model request 前（`beforeModel` hook） |
| **执行频率** | 1 次 / run | N 次 / run（每个 iteration 一次） |
| **作用范围** | 仅影响 system prompt | 可修改所有角色的所有消息 |
| **能力范围** | 静态文本注入 | 动态消息变换（增删改查） |
| **典型用途** | 注入规则、指令、上下文提示 | 消息压缩、历史改写、context window 管理 |
| **执行顺序** | `composeSystemPrompt()` 拼接 | plugin builders 先执行 → 核心 `buildForApi()` 后执行 |
| **能力要求** | `rules` capability | `messageBuilders` capability |

**本质区别一句话**：`registerRule` 往 system prompt 里追加文本片段；`registerMessageBuilder` 对整个消息流水线做变换（transform pipeline）。

### 6. 执行顺序细节

在单次 model request 的消息准备中：

1. **plugin messageBuilder** 按注册顺序依次执行（链式 transform）
2. **核心 `MessageBuilder.buildForApi()`** 最后执行，做安全规范化：
   - tool result 截断（`maxToolResultChars`）
   - assistant text 截断
   - outdated file content 重写
   - media budget 限制
   - total text budget 截断
   - missing tool result 修复

这意味着 plugin builder 可以自由变换消息，但最终仍受核心安全截断保护。

### 7. Sandbox 层桥接

对于 sandbox 插件（`plugin-sandbox.ts:543-583`），`registerMessageBuilders` 函数将 sandbox 内的 builder 桥接到宿主 API：

```typescript
function registerMessageBuilders(api, sandbox, descriptor, timeoutMs, reinitialize) {
    for (const bd of descriptor.contributions?.messageBuilders ?? []) {
        api.registerMessageBuilder({
            name: bd.name,
            async build(messages) {
                // 通过 IPC 调用 sandbox 内的 buildMessages
                const result = await sandbox.call("buildMessages", {
                    pluginId: descriptor.pluginId,
                    contributionId: bd.id,
                    messages,
                }, { timeoutMs });
                return isMessageArray(result) ? result : messages;
            },
        });
    }
}
```

sandbox 内的注册（`plugin-sandbox-bootstrap.ts:497`）将 `build` 函数存入 `handlers.messageBuilders` Map。
