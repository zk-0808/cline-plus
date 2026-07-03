# Investigation Note: Native Condense 源码面探查 (Task B)

> **调查日期**: 2026-07-03
> **cline 仓库**: https://github.com/cline/cline (main branch, commit `dfd0e02`)
> **结论**: cline 原生 condense 已从旧的 `ContextManager.getNextTruncationRange` 截断方案重构为 SDK 级 `createContextCompactionPrepareTurn` 双策略方案。产物是 `MessageWithMetadata[]`，核心摘要消息包含自由文本 + 文件操作元数据，**不包含任何结构化的 Decision/Change/Verification/Blocker/Handoff 对象**。

---

## 1. ContextManager 实现摘要

### 1.1 旧方案（已废弃）

旧版 `ContextManager` 类（路径 `src/core/context/context-management/ContextManager.ts`）包含 `getNextTruncationRange()` 方法，采用**截断式**策略：当 token 用量超过阈值时，按 "half" 或 "quarter" 比例截断对话历史的前半部分。

**证据来源**: `.clinerules/cline-overview.md` 中的 `attemptApiRequest` 伪代码（行约 200-210）:
```typescript
this.conversationHistoryDeletedRange = this.contextManager.getNextTruncationRange(
  this.apiConversationHistory,
  this.conversationHistoryDeletedRange,
  totalTokens / 2 > maxAllowedSize ? "quarter" : "half"
)
```

**当前状态**: `ContextManager` 类和 `getNextTruncationRange` 在当前 main 分支中**已完全移除**。grep 搜索无结果。`conversationHistoryDeletedRange` 字段仍存在于 `ExtensionMessage` 类型定义中（`apps/vscode/src/shared/ExtensionMessage.ts:193`），但仅作为历史兼容字段。

### 1.2 新方案：SDK Context Compaction

新方案位于 `sdk/packages/core/src/extensions/context/` 目录，核心文件：

| 文件 | 职责 |
|---|---|
| `compaction.ts` | 入口：`createContextCompactionPrepareTurn()` — 构建 prepareTurn 回调 |
| `compaction-shared.ts` | 共享工具函数：序列化、截断、文件操作提取、摘要消息构建 |
| `basic-compaction.ts` | **basic 策略**：纯截断，无 LLM 调用 |
| `agentic-compaction.ts` | **agentic 策略**：LLM 生成摘要 + 保留近期消息 |

**触发条件**（`compaction.ts:resolveTriggerState`）：
- **auto 模式**: `inputTokens > triggerTokens`，其中 `triggerTokens = min(maxInputTokens - reserveTokens, maxInputTokens * thresholdRatio)`
- 默认值: `thresholdRatio = 0.9`, `reserveTokens = 16384`, `maxInputTokens = 200000`
- **manual 模式**: 用户执行 `/compact` 或 `/smol` 命令时触发，目标压缩比默认 0.5

**证据来源**: `sdk/packages/core/src/extensions/context/compaction.ts` 行 120-150 (`resolveTriggerState`)

---

## 2. condense 产物数据结构

### 2.1 核心返回类型

```typescript
// sdk/packages/core/src/types/config.ts:72-74
interface CoreCompactionResult {
  messages: MessageWithMetadata[];
}
```

### 2.2 MessageWithMetadata 完整字段

```typescript
// sdk/packages/shared/src/llms/messages.ts:131-163
interface MessageWithMetadata extends Message {
  id?: string;           // 消息唯一 ID
  agent?: string;        // 逻辑 agent 类型
  sessionId?: string;    // 所属 session ID
  metadata?: Record<string, unknown>;  // 扩展元数据
  modelInfo?: {          // 生成时的模型信息
    id: string;
    provider: string;
    family?: string;
  };
  metrics?: {            // token 使用指标
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    cost?: number;
  };
  ts?: number;           // 时间戳
}

// 基础 Message 类型
interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}
```

### 2.3 两种策略的产物差异

#### Basic 策略产物
- **不生成摘要**，直接返回截断后的原始消息子集
- 保护策略：保留第一条 user 消息、最后一条 user 消息、最后一条 assistant 消息、最近一个 turn
- 截断顺序：先删 assistant（非最后）→ 再删 user（非首非末）→ 再删最后 assistant → 再删最后 user → 最后裁剪剩余消息文本
- **产物 = 原始消息的子集（可能被裁剪文本长度）**

**证据来源**: `sdk/packages/core/src/extensions/context/basic-compaction.ts` 行 250-300 (`runBasicCompaction`)

#### Agentic 策略产物
- **生成一条 `compaction_summary` 消息** + 保留 cutIndex 之后的近期消息
- 摘要消息结构：

```typescript
// compaction-shared.ts:buildSummaryMessage (行 280-295)
{
  role: "user",
  content: "Context summary:\n\n{LLM生成的摘要文本}",
  metadata: {
    kind: "compaction_summary",
    summary: string,           // LLM 生成的摘要全文
    details: {
      readFiles: string[],     // 读取过的文件路径列表
      modifiedFiles: string[], // 修改过的文件路径列表
    },
    tokensBefore: number,      // 压缩前的 token 数
    generatedAt: number,       // 生成时间戳 (Date.now())
  }
}
```

**证据来源**: `sdk/packages/core/src/extensions/context/compaction-shared.ts` 行 60-70 (`CompactionSummaryMetadata` 接口), 行 280-295 (`buildSummaryMessage`)

### 2.4 Agentic 摘要的 LLM Prompt 模板

```
Summarize this session for continuation. Be concise and factual.

## Goal
One sentence: what is being built or fixed.

## State
- Done: completed steps
- In Progress: current work
- Blocked: blockers or open questions

## Highlights
Key technical choices or notable findings (omit if none).

## Next
Immediate next steps.

## Files
Read: {readFiles}
Edited: {modifiedFiles}
```

**证据来源**: `sdk/packages/core/src/extensions/context/compaction-shared.ts` 行 240-260 (`buildSummaryRequest`)

### 2.5 getNextTruncationRange（已废弃）

该函数在当前代码库中**不存在**。旧方案使用 `conversationHistoryDeletedRange: [number, number]` 元组标记被删除的消息索引范围。新方案不再使用索引范围截断，而是直接返回新的消息数组。

---

## 3. 字段覆盖矩阵

| handoff 字段 | 原生 condense 有？ | 映射关系 | 丢失原因 |
|---|---|---|---|
| **id** | ❌ 无 | 无对应 | condense 产物不生成结构化对象 ID。`MessageWithMetadata.id` 是消息级 ID，不是 condense 产物级 ID。 |
| **kind** | ⚠️ 部分 | `metadata.kind === "compaction_summary"` 可区分摘要消息，但仅一种 kind，无法表达 Decision/Change/Verification/Blocker/Handoff 五类语义 | 摘要是自由文本，kind 字段仅标识"这是一条压缩摘要"，不携带语义分类 |
| **exit_when** | ❌ 无 | 无对应 | condense 不关心任务退出条件。摘要 prompt 中的 "Next" 段落隐含了后续步骤，但非结构化 |
| **confidence** | ❌ 无 | 无对应 | LLM 摘要不附带置信度评分 |
| **depends_on** | ❌ 无 | 无对应 | 无依赖关系建模 |
| **blocker_ref** | ⚠️ 部分 | 摘要 prompt 中 "State → Blocked" 段落可能提及阻塞项，但以自由文本形式存在，无结构化引用 | 无 blocker 对象模型 |

---

## 4. 五类对象覆盖

| 对象类型 | 原生 condense 有？ | 说明 |
|---|---|---|
| **Decision** | ❌ 无 | 摘要 "Highlights" 段落可能提及技术决策，但以自由文本形式存在，无结构化 Decision 对象 |
| **Change** | ⚠️ 部分 | `metadata.details.modifiedFiles` 记录了修改过的文件路径列表，`readFiles` 记录了读取过的文件。这是唯一保留的结构化信息，但不包含变更内容/原因/前后对比 |
| **Verification** | ❌ 无 | 无验证结果记录。测试输出、lint 结果等在截断/摘要过程中丢失 |
| **Blocker** | ⚠️ 部分 | 摘要 prompt 的 "State → Blocked" 段落引导 LLM 提及阻塞项，但以自由文本形式存在，无结构化 Blocker 对象 |
| **Handoff** | ❌ 无 | 无交接点标记。condense 是连续性维护机制，不识别任务边界或交接语义 |

---

## 5. 结论

### 5.1 原生 condense 保留了什么

1. **文件操作轨迹**: `readFiles` / `modifiedFiles` 路径列表（结构化，精确）
2. **压缩前 token 数**: `tokensBefore`（用于监控）
3. **近期消息原文**: agentic 策略保留 `cutIndex` 之后的原始消息（默认 20000 tokens）
4. **自由文本摘要**: LLM 生成的 Goal/State/Highlights/Next 摘要（非结构化）
5. **消息级 ID 和时间戳**: 每条保留消息的 `id`、`ts` 字段

### 5.2 原生 condense 丢失了什么

1. **所有结构化语义对象**: Decision、Change（内容级）、Verification、Blocker（结构化）、Handoff 均不存在
2. **工具调用细节**: tool_use 的 input 参数、tool_result 的完整内容被截断（`TOOL_RESULT_CHAR_LIMIT = 2000`）
3. **思考链**: `thinking` 内容被截断到 2000 字符
4. **中间消息的上下文关联**: 被删除消息之间的因果关系丢失
5. **任务边界**: 无 "任务开始/结束" 标记，无交接点识别
6. **置信度/依赖关系**: 完全不存在

### 5.3 对 handoff schema V2 的覆盖评估

**覆盖率: ~5%**。原生 condense 仅提供了：
- `kind` 的最粗粒度区分（"compaction_summary" vs 其他）
- `Change` 对象的文件路径子集（`modifiedFiles`）

handoff schema V2 的六字段中，`id`/`exit_when`/`confidence`/`depends_on`/`blocker_ref` 完全无对应。五类对象中，Decision/Verification/Handoff 完全缺失，Blocker 仅有自由文本暗示，Change 仅有路径列表。

**根本原因**: cline 的 condense 设计目标是**上下文窗口管理**（减少 token 用量），而非**知识管理**（保留结构化语义）。摘要 prompt 引导 LLM 生成面向"续作"的自由文本摘要，不提取或保留决策链、验证结果、阻塞关系等结构化信息。

---

## 附录：关键源码文件索引

| 文件路径 | 关键内容 |
|---|---|
| `sdk/packages/core/src/extensions/context/compaction.ts` | `createContextCompactionPrepareTurn()` 入口，触发条件判断 |
| `sdk/packages/core/src/extensions/context/compaction-shared.ts` | `CompactionSummaryMetadata` 类型，`buildSummaryMessage()`，`buildSummaryRequest()` prompt 模板 |
| `sdk/packages/core/src/extensions/context/basic-compaction.ts` | `runBasicCompaction()` — 纯截断策略 |
| `sdk/packages/core/src/extensions/context/agentic-compaction.ts` | `runAgenticCompaction()` — LLM 摘要策略 |
| `sdk/packages/core/src/types/config.ts:54-105` | `CoreCompactionContext`/`CoreCompactionResult`/`CoreCompactionConfig` 类型定义 |
| `sdk/packages/shared/src/llms/messages.ts:131-163` | `MessageWithMetadata` 完整字段定义 |
| `apps/cli/src/runtime/interactive/compaction.ts` | CLI 入口：`compactInteractiveMessages()` |
| `apps/vscode/src/sdk/sdk-compaction-coordinator.ts` | VSCode 入口：`SdkCompactionCoordinator.compactTask()` |
