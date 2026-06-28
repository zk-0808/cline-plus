# Capability Probe — Phase 1: 文档/社区调研

- **Date**: 2026-06-23
- **Status**: Phase 1 complete（文档/社区一手资料）
- **Phase 2 (待启动)**: 必要时再去翻源码补缺
- **Related**: ADR-001 Next Steps

---

## 0. 探查结论一览

| ADR-001 探查项 | 结论 | 一手依据 | 风险/备注 |
|----------------|------|----------|-----------|
| PostCompact / 等价 hook | ⚠️ **没有"PostCompact"命名的 hook，但有等价路径** | `beforeModel` runtime hook + `registerMessageBuilder` 都可拦截/重写消息 | 是"我方实现 compact"而非"监听 Cline 的 compact 完成" |
| session_id 等价标识 | 🟡 **未在公开文档中直接列出**，但 SDK Hook context 内部存在 session 概念（stage 列表里有 `session_start` / `session_shutdown`） | `Hook Stages` 文档 | 需 Phase 2 翻 `@cline/core` 类型定义确认 |
| compact 可程序化调用 | ✅ **可以**——通过 plugin 在 `beforeModel` 或 `messageBuilder` 阶段重写消息 | `custom-compaction.ts` / `custom-compaction-hook.example.ts` | 不是"调用 Cline 内置 compact"，是"在 Cline 流水线里插入自定义 compact" |
| condense 消息可被外部 watcher 检测 | ✅ **可以**——但更优雅的方式是注册 `afterRun` / `tool_call_after` hook | Plugin 架构 | 监听文件不再必要，hook 直达 |

**总判断**：原 ADR-001 假设的"Cline 暴露 PostCompact 给我们监听"**不完全成立**。Cline 的实际抽象是**让插件本身参与 compact**，而不是事后通知。这会反过来影响 Handoff v2 的设计——见 §5。

---

## 1. 关键发现：Cline 已有完整 SDK + Plugin 体系

来源：[docs.cline.bot/sdk/overview](https://docs.cline.bot/sdk/overview)、[github.com/cline/cline](https://github.com/cline/cline)

```text
npm install @cline/sdk
```

- **官方 SDK** `@cline/sdk` 已开源（Apache-2.0），版本 v0.0.51（2026-06-20）
- 核心包结构：
  - `@cline/sdk` — 公开 SDK 表面
  - `@cline/core` — Node 运行时（sessions / tools / persistence / hub / automation）
  - `@cline/agents` — 浏览器可用的无状态执行循环
  - `@cline/llms` — provider gateway / 模型目录
  - `@cline/shared` — 类型、schema、tool helpers、**hooks**、storage helpers
- VS Code 扩展、CLI、JetBrains 插件、Kanban 均基于同一 SDK 内核

**这条直接改写了原项目假设**：本项目过去把 Cline 当作"封闭宿主"对待，但 Cline 其实在主推**插件化扩展**。所有 Handoff/Compact/Memory 的构想，应当**优先考虑写成 `@cline/sdk` 的 plugin**，而不是绕开 Cline 自建机制。

---

## 2. Hooks 体系详细信息

来源：[docs.cline.bot/sdk/plugins](https://docs.cline.bot/sdk/plugins)

### 2.1 可用 Hook Stages（完整列表）

```text
input
runtime_event
session_start          ← session 边界存在
run_start
iteration_start
turn_start
before_agent_start
tool_call_before
tool_call_after
turn_end
stop_error
iteration_end
run_end
session_shutdown       ← session 边界存在
error
```

### 2.2 Hook 处理器（`AgentPlugin.hooks`）

```ts
hooks: {
  beforeRun(context)   // run 开始前
  afterRun(context)    // run 结束后
  beforeModel(context) // 模型调用前，可改写 request.messages
  afterModel(context)
  beforeTool(context)  // 工具调用前，可返回 { skip: true } 拦截
  afterTool(context)
  onEvent(context)
}
```

### 2.3 Hook Policy（重要）

| Field | Meaning |
|-------|---------|
| `mode` | `"blocking"` or `"async"` |
| `timeoutMs` | Hook timeout |
| `retries` | 重试次数 |
| `retryDelayMs` | 重试间隔 |
| `failureMode` | `"fail_open"` or `"fail_closed"` |
| `maxConcurrency` | 并发 hook 数 |
| `queueLimit` | 队列上限 |

`fail_closed` 用于"绕过即不安全"的策略型 hook。

### 2.4 跨 OS 可用性

文档未将 Hook 标注为某个 OS 专属。**之前认为"Cline Hook 仅 macOS/Linux"的判断需要复核**——这可能仅适用于早期 6 种命令式 hook（PreToolUse 之类），与现在 SDK plugin hook 是两套东西。这个结论关系到 §5 的 Windows Hook 替代方向是否仍然成立。

---

## 3. Compact 相关：两条等价路径

来源：[docs.cline.bot/sdk/plugin-examples](https://docs.cline.bot/sdk/plugin-examples)

Cline 把"自定义压缩"明确放在了 SDK 示例顶层，两条等价路径并存：

| 路径 | 入口 | 适用场景 |
|------|------|----------|
| **registerMessageBuilder**（推荐） | `api.registerMessageBuilder({ name, build(messages) })` | 通用、可复用的压缩策略，运行在核心消息流水线，**先于** Cline 内置安全 builder |
| **beforeModel hook** | `hooks.beforeModel({ request })` | 需要 runtime hook context（如直接 mutate request）时使用 |

两个官方示例核心策略**完全一致**：
```text
if 总 token 估算 ≥ MAX_INPUT_TOKENS × 0.75:
    保留 prefix（第一条 user message）
    保留 recent（最近约 24k tokens 的消息）
    将中间历史压缩成一条 summary message
    替换回去
```

并附带提取：tool 名称列表、touched 文件列表、最近 6 条 highlight。

### 重大影响

**ADR-001 中 Decision 的 A 项"复用 Cline 原生 Compact"，措辞需要更新**：Cline 不是给一个固化的 `/compact` 让我们调用，而是给一套 **compact 协议**让我们参与。我们的角色是"实现一个 message builder 或 beforeModel hook"，不是"听 Cline 帮我做完然后捡结果"。

这其实是**好消息**：
- 我们可以在 builder 里直接写入 handoff 文件（一个动作两个产物）
- 不再需要"等 Cline compact → 监听完成 → 抓摘要"这种复杂时序
- builder 本身就拿到压缩前后的 messages，handoff 内容唾手可得

---

## 4. 探查项逐条回答

### 4.1 PostCompact / 等价 hook

**答**：没有名为 `PostCompact` 的 hook。Cline 不提供"compact 完成事件"。但提供了更强的 `registerMessageBuilder` + `beforeModel` 两个**主动参与点**——我们自己就是 compact 的实施者。

**对 ADR 的影响**：
- 取消"hook 探测"作为前置条件，因为根本不是"听别人 compact"
- 改为"实现一个 messageBuilder plugin"作为 Handoff v2 的核心载体

### 4.2 session_id / 等价标识

**答**：文档显示 SDK hook 阶段包含 `session_start` 和 `session_shutdown`，因此 **session 概念存在**。但官方文档未直接列出 `session_id` 字段。

**待 Phase 2 确认**：
- 在 hook context 里能否拿到稳定 session 标识？
- 是否暴露为公开 API 还是内部字段？
- 多窗口同时打开时是否能区分？

**对 ADR 的影响**：
- inline / crosswindow 判定不会因为缺 session_id 而完全失败——至少 `session_start` hook 触发时我们可以判定"这是新 session"
- 跨 session 续作的判定，可结合 `session_start` + 上次 handoff 时间戳启发式判断

### 4.3 compact 可程序化调用

**答**：可以，但表述方式要换。不是"程序化调用 Cline 的 compact"，而是"在 Cline 流水线里**作为** compact 的实现者"，通过：
- `registerMessageBuilder`（首选）
- `beforeModel` hook（需要 runtime context 时）

代码样例直接可用，6KB 左右一个文件，开源 Apache-2.0。

### 4.4 condense 消息可被外部 watcher 检测

**答**：可以，但**已经不必要**。原假设是"读 ui_messages.json 检测 condense 事件"，现在直接注册 `afterRun` 或 `tool_call_after` hook 就能实时获取，零延迟、零文件 IO。

**已确认**之前任务分析里看到的 `condense` ask 类型，对应的就是 Cline 的内置 compaction 流程。

---

## 5. 对 ADR-001 的修正建议

不重写 ADR（避免发散），但需要在 Handoff v2 Design Doc 里**重新表述** A 项：

| 原 ADR Decision | 修正后表述 | 改变性质 |
|-----------------|-----------|---------|
| A: 复用 Cline 原生 Compact | A: **参与** Cline 的 compact 流水线，通过 `registerMessageBuilder` 注入"compact + handoff"双产物逻辑 | 增强（更优雅） |
| F: capability probe prerequisite | F: **已部分回答**——message builder + hook 路径已确认存在，剩 session 标识待 Phase 2 | 风险降低 |
| 跨 IDE 迁移成本 | 实际上 SDK 跨 VS Code/JetBrains/CLI/Kanban 均一致，**迁移成本低于预期** | 负面后果减弱 |

另外，"Windows Hook 替代"作为本项目核心方向之一，需要在 Phase 2 验证：**新 SDK plugin hook 是否在 Windows 上工作**。如果工作，这个差异化定位需要被推翻或重新表述。

---

## 6. Phase 2 待办（仅在必要时启动）

按"减少看源码"的原则，Phase 2 只查 Phase 1 未答清的最小集合：

1. `@cline/shared` 中 hook context 类型定义里是否暴露 `sessionId` / 类似字段（源码位置：`sdk/packages/shared/src/hooks/*`）
2. SDK plugin hook 在 Windows 上的可用性（查 issues 或试装 + 跑示例）
3. `cline plugin install` 在 VS Code 扩展（非 CLI）侧的支持现状

预估 Phase 2 单次成本：≤ 30 分钟。

---

## 7. 下一步建议

按 ADR Next Steps 链路：

```
ADR-001 (Accepted)
        ↓
Capability Probe Phase 1 ✅  ← 当前位置
        ↓
[决策点：是否启动 Phase 2 源码核对，或直接进入 Design Doc]
        ↓
Handoff-v2 Design Doc
        ↓
Implementation
```

**我的判断**：Phase 1 已经把 4 个探查项 3 个回答清楚，剩下的 session_id 细节不影响 Design Doc 主结构。可以直接进入 Design Doc，把 session_id 列为 Design Doc 的"实现待确认项"，需要时再做 Phase 2。
