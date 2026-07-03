# Investigation Note: Native Condense 语义丢失点综合报告

> **生命周期**：事件绑定 — ADR-006 §4.1 问题回答后归档。
>
> **调查日期**: 2026-07-03
> **子代理**: A（文档面）+ B（源码面 ContextManager）+ C（源码面 hooks）并行完成
> **判定标准**: 答不出丢失点→B 分支整条砍掉；答出丢失点→做 §3.3 薄适配层

---

## 0. 关键纠正

**handoff.md 前提错误**：原记录"cline --help 暴露 `--compaction <agentic|basic|off>` 一级公开选项"是**不正确的**。

Task A 通过读 CLI 官方文档（docs.cline.bot/cli/cli-reference，2026-07-02 更新）确认：cline CLI **没有** `--compaction` 选项。compaction 策略是 VS Code SDK 持久化设置（`basic` | `agentic`），通过 `sdk/packages/core/src/services/global-settings.ts` 的 `GlobalCompactionStrategySchema` 定义，PR #11892（2026-07-03 merged）引入。

---

## 1. 原生 condense 机制全景

### 1.1 触发方式

| 触发方式 | 说明 |
|---------|------|
| Auto-Compact（自动） | `inputTokens > triggerTokens` 时自动触发，`triggerTokens = min(maxInputTokens - reserveTokens, maxInputTokens * thresholdRatio)`，默认 `thresholdRatio=0.9`, `reserveTokens=16384` |
| `/smol` 或 `/compact`（手动） | 用户主动触发，目标压缩比默认 0.5 |

**证据来源**: B — `sdk/packages/core/src/extensions/context/compaction.ts:120-150` (`resolveTriggerState`)

### 1.2 两种策略

| 策略 | 机制 | 产物 |
|------|------|------|
| `basic`（默认） | 纯截断，无 LLM 调用。保护首条/末条 user 消息 + 最近一个 turn | 截断后的原始消息子集 |
| `agentic` | LLM 生成摘要 + 保留近期消息（默认 20000 tokens） | 一条 `compaction_summary` user 消息 + 近期消息 |

**证据来源**: B — `sdk/packages/core/src/extensions/context/basic-compaction.ts` + `agentic-compaction.ts`

### 1.3 执行流程

```
AgentRuntime.run()
    ↓
prepareTurnForModelRequest()     ← agent-runtime.ts:805, compaction 在此执行
    ↓
beforeModel hooks                ← agent-runtime.ts:807, compaction 后触发
    ↓
Model API call
```

**证据来源**: C — `sdk/packages/agents/src/agent-runtime.ts:805-807`

---

## 2. 原生 condense 产物数据结构

### 2.1 Agentic 摘要消息结构

```typescript
{
  role: "user",
  content: "Context summary:\n\n{LLM生成的摘要文本}",
  metadata: {
    kind: "compaction_summary",        // 唯一结构化标识
    summary: string,                    // LLM 摘要全文
    details: {
      readFiles: string[],              // 读取过的文件路径列表
      modifiedFiles: string[],          // 修改过的文件路径列表
    },
    tokensBefore: number,               // 压缩前 token 数
    generatedAt: number,                // 生成时间戳
  }
}
```

**证据来源**: B — `sdk/packages/core/src/extensions/context/compaction-shared.ts:60-70, 280-295`

### 2.2 Agentic 摘要 LLM Prompt 模板

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

**证据来源**: B — `sdk/packages/core/src/extensions/context/compaction-shared.ts:240-260`

### 2.3 Basic 模式产物

- **不生成摘要**，直接返回截断后的原始消息子集
- 保护策略：保留第一条 user 消息、最后一条 user 消息、最后一条 assistant 消息、最近一个 turn

**证据来源**: B — `sdk/packages/core/src/extensions/context/basic-compaction.ts:250-300`

---

## 3. 与 handoff schema V2 §1.5 六字段对照

### 3.1 字段覆盖矩阵

| handoff 字段 | 原生 condense 有？ | 映射关系 | 丢失原因 |
|---|---|---|---|
| **id** | ❌ 无 | 无对应 | condense 不生成结构化对象 ID |
| **kind** | ⚠️ 部分 | `metadata.kind === "compaction_summary"` 仅标识"压缩摘要"，无法表达 Decision/Change/Verification/Blocker/Handoff 五类语义 | 设计目标不同 |
| **exit_when** | ❌ 无 | 无对应 | 摘要 prompt 的 "Next" 段落隐含后续步骤，但非结构化 |
| **confidence** | ❌ 无 | 无对应 | LLM 摘要不附带置信度评分 |
| **depends_on** | ❌ 无 | 无对应 | 无依赖关系建模 |
| **blocker_ref** | ⚠️ 部分 | 摘要 prompt 的 "State → Blocked" 段落可能提及阻塞项，但以自由文本形式存在 | 无 blocker 对象模型 |

### 3.2 五类对象覆盖

| 对象类型 | 原生 condense 有？ | 说明 |
|---|---|---|
| **Decision** | ❌ 无 | "Highlights" 段落可能提及技术决策，但自由文本 |
| **Change** | ⚠️ 部分 | `metadata.details.modifiedFiles` 记录文件路径列表（唯一结构化信息） |
| **Verification** | ❌ 无 | 测试输出、lint 结果等在截断/摘要过程中丢失 |
| **Blocker** | ⚠️ 部分 | "State → Blocked" 段落可能提及，但自由文本 |
| **Handoff** | ❌ 无 | 无任务边界标记或交接点识别 |

### 3.3 覆盖率评估

**~5%**。原生 condense 仅提供：
- `kind` 的最粗粒度区分（"compaction_summary" vs 其他）
- `Change` 对象的文件路径子集（`readFiles` / `modifiedFiles`）

**根本原因**: cline 的 condense 设计目标是**上下文窗口管理**（减少 token 用量），而非**知识管理**（保留结构化语义）。

---

## 4. Hook 暴露面与薄适配层插入点

### 4.1 可用 Hook

| hook 名 | 触发时机 | condense 场景下是否触发 | 推荐度 |
|---|---|---|---|
| **beforeModel** (runtime) | compaction 后、model request 前 | ✅ 是 | ⭐ **推荐** |
| **afterModel** (runtime) | model response 后 | ✅ 是 | ❌ 不能修改 messages |
| **beforeTool** (runtime) | tool 执行前 | ✅ 是 | ❌ 不相关 |
| **afterTool** (runtime) | tool 执行后 | ✅ 是 | ❌ 不相关 |
| **messageBuilder** (plugin) | model request 前 | ✅ 是 | 🔵 备选 |
| **PreCompact** (文件 hook) | compaction 前 | ❌ **未接入** | ❌ 需改源码 |

### 4.2 推荐：`beforeModel` runtime hook

**理由**：
1. 已接入、稳定可用
2. 在 compaction 后触发 → 能看到 compaction 后的 messages
3. 可返回 `{ messages }` 重写 messages
4. 可执行任意代码 → 能写 handoff.md
5. Plugin 友好（`AgentPlugin.hooks.beforeModel` 注册）
6. codec bug 风险低（SDK 内部类型）

**证据来源**: C — `sdk/packages/agents/src/agent-runtime.ts:805-807` + `sdk/packages/shared/src/agent.ts:336-370`

### 4.3 `PreCompact` 未接入的证据

| 文件 | 行号 | 证据 |
|---|---|---|
| `sdk/packages/core/src/hooks/hook-file-config.ts` | 41 | `[HookConfigFileName.PreCompact]: undefined` |
| `apps/vscode/src/sdk/hooks-adapter.ts` | 12 | "Deferred hooks (NOT wired here): ... PreCompact" |
| `apps/cli/src/commands/hook.ts` | 22 | `case "pre_compact": return {}` |

**证据来源**: C

---

## 5. ADR-006 §4.1 判定

### 5.1 问题回答

> **cline 原生 condense 到底丢了什么 handoff 需要的语义？**

**答**：丢失了**全部结构化语义**。具体：

1. **六字段全部缺失**：id / kind / exit_when / confidence / depends_on / blocker_ref 在原生 condense 产物中无结构化对应
2. **五类对象全部缺失**：Decision / Verification / Handoff 完全缺失；Change 和 Blocker 仅有文件路径列表和自由文本暗示
3. **工具调用细节丢失**：tool_use input 参数、tool_result 完整内容被截断（`TOOL_RESULT_CHAR_LIMIT = 2000`）
4. **思考链丢失**：thinking 内容被截断到 2000 字符
5. **任务边界丢失**：无"任务开始/结束"标记，无交接点识别

**唯一保留的结构化信息**：
- `metadata.kind === "compaction_summary"`（标识压缩摘要）
- `metadata.details.readFiles` / `modifiedFiles`（文件路径列表）
- `metadata.tokensBefore`（压缩前 token 数）

### 5.2 判定结果

按 ADR-006 §4.1 判定标准：

> - 答不出具体丢失点 → B 分支整条砍掉（包括所有清理动作完成）
> - 答出具体丢失点 → 做 §3.3 薄适配层（只 hook 抽语义，不调阈值）

**判定**：**答出了具体丢失点** → 做 §3.3 薄适配层。

丢失点明确且可操作：
- 需要在 condense 时机用 hook 抽取 Decision/Change/Verification/Blocker/Handoff 五类对象
- 需要将结构化数据写入 handoff.md（schema V2 §1.5 六字段）
- 原生 condense 的 `readFiles`/`modifiedFiles` 可直接复用为 Change 对象的文件路径

### 5.3 薄适配层方案

```
原生 auto-condense 触发
        ↓
plugin beforeModel hook（compaction 后触发）
        ↓
检测 compaction 发生（messages 数量骤减 或 metadata.kind === "compaction_summary"）
        ↓
从 compaction summary + 近期 messages 中抽取 semantic object
        ↓
写 handoff.md（结构化 schema V2 §1.5 六字段）
        ↓
（可选）注入 handoff 内容到 messages
```

**插入点**：`beforeModel` runtime hook（通过 plugin `AgentPlugin.hooks.beforeModel` 注册）

**注意事项**：
- hook 内部只读 messages，不修改 content 结构（规避 codec bug）
- 写 handoff.md 时从 messages 中提取 text 内容，不直接序列化 content 数组
- `readFiles` / `modifiedFiles` 可直接映射为 Change 对象

---

## 6. 后续动作

| 动作 | 优先级 | 说明 |
|------|--------|------|
| 决策：薄适配层实现 | 🟡 中 | 基于本报告判定结果，设计 `beforeModel` hook 的具体实现 |
| 清理：删 `buildCompactionSummary` 死代码 | 🟢 低 | ADR-006 §3.4 清理动作 |
| 清理：`shouldCompact` 简化为只观察 | 🟢 低 | ADR-006 §3.4 清理动作 |
| 更新 handoff.md | 🟡 中 | 同步本报告结论 |

---

## 证据来源索引

| 子代理 | 关键源码文件 |
|--------|------------|
| A（文档面）| docs.cline.bot/cli/cli-reference, docs.cline.bot/features/auto-compact, `sdk/packages/core/src/services/global-settings.ts` |
| B（源码面）| `sdk/packages/core/src/extensions/context/compaction.ts`, `compaction-shared.ts`, `basic-compaction.ts`, `agentic-compaction.ts`, `sdk/packages/shared/src/llms/messages.ts:131-163` |
| C（源码面）| `sdk/packages/shared/src/agent.ts:336-370`, `sdk/packages/agents/src/agent-runtime.ts:805-807`, `sdk/packages/core/src/hooks/hook-file-config.ts:41`, `apps/vscode/src/sdk/hooks-adapter.ts:12` |
