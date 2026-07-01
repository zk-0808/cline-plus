# Investigation Note — Cline Runtime Source Probe

> **类型**：Investigation Note（evidence-governance.md §10）
> **状态**：✅ 已完成（2026-06-29 GitHub 源码拉取执行）
> **生命周期**：任务绑定——probe 结论被后续设计引用后可归档。
> **日期**：2026-06-29
> **关联**：[handoff.md](../handoff.md)、[ADR-005](ADR-005-split-compact-from-handoff.md)、[design.md](../plugin/design.md) §8 Open Questions、[mechanism-landing-assessment.md](../plugin/mechanism-landing-assessment.md)
> **源码根**：`E:\cline-repo`（本地 clone）
> **权威源**：[sdk/ARCHITECTURE.md](file:///e:/cline-repo/sdk/ARCHITECTURE.md)（设计意图）+ unminified `.ts` 源码（实际行为）

---

## 0. 探查对象（§4 方向启动门控）

| 维度 | 内容 |
|------|------|
| **载体** | Cline SDK 源码（unminified .ts）+ 官方文档（ARCHITECTURE.md + docs/*.mdx）|
| **范围** | 4 项：① /compact 执行链 ② checkpoint 机制 ③ messageBuilder 调用时机 ④ rules 注入频率 |
| **排除** | plugin 子系统 7 文件（atlas 已覆盖：paths/plugin-install/plugin-loader/plugin-sandbox/plugin-sandbox-bootstrap/plugin-module-import/subprocess-sandbox）|
| **成功标准** | 回答 design.md §8 Open Questions Q1/Q3/Q4/Q5 + PROJECT_DEV_OUTLINE §5.3 验证项 1-2（compact / checkpoint）|

## 1. 证据治理约束（§1.5-§1.14 执行门控）

- **§1.5 权威源与独立证据**：ARCHITECTURE.md 回答设计意图，源码回答实际行为，docs/*.mdx 回答推荐用法，不可混用
- **§1.6 关键结论双来源验证**：每项结论至少 2 个独立证据类型（源码 + 官方文档）一致才可标 Verified
- **§1.7 Minified Code 使用边界**：本次源码均为 unminified .ts，可用于语义结论
- **§1.8 Evidence Collapse 门控**：禁止同一证据类型连续使用 ≥2 次未解决冲突
- **§1.13 结论时效性**：本次探查结论基于 Cline 源码快照（2026-06-29 clone），引用时需标注 evidence_as_of
- **§1.14 "无 X"类结论门控**：若下"Cline 无 X 机制"结论，需 search-orchestrator SKILL 反证 + 至少 3 类独立证据

---

## 2. 已定位文件清单

### 2.1 compact 执行链（主题 ①）

| 文件 | 类型 | 推测职责 |
|------|------|---------|
| `sdk/ARCHITECTURE.md` §9 | 官方文档 | 设计意图：core 拥有 compaction policy，agents 拥有 turn-preparation seam |
| `sdk/packages/core/src/extensions/context/compaction.ts` | 源码 | compact 主逻辑（registry map 入口）|
| `sdk/packages/core/src/extensions/context/compaction-shared.ts` | 源码 | compact 共享工具 |
| `sdk/packages/core/src/extensions/context/basic-compaction.ts` | 源码 | basic 策略实现 |
| `sdk/packages/core/src/extensions/context/agentic-compaction.ts` | 源码 | agentic 策略实现 |
| `sdk/packages/core/src/extensions/context/compaction.test.ts` | 源码 | 单元测试（含调用约定）|
| `sdk/packages/core/src/extensions/context/compaction.live.test.ts` | 源码 | 集成测试（含端到端流程）|
| `sdk/packages/agents/src/agent-runtime.ts` | 源码 | turn-preparation seam（prepareTurn 调用点）|
| `docs/features/auto-compact.mdx` | 官方文档 | 用户面向文档（推荐用法）|

### 2.2 checkpoint 机制（主题 ②）

| 文件 | 类型 | 推测职责 |
|------|------|---------|
| `sdk/packages/core/src/session/checkpoint-restore.ts` | 源码 | checkpoint 恢复逻辑 |
| `sdk/packages/core/src/session/checkpoint-diff.ts` | 源码 | checkpoint diff |
| `sdk/packages/core/src/session/session-snapshot.ts` | 源码 | session 快照（可能与 checkpoint 相关）|
| `sdk/packages/core/src/hooks/checkpoint-hooks.ts` | 源码 | checkpoint hooks |
| `sdk/packages/core/src/session/session-versioning-service.ts` | 源码 | session 版本管理 |
| `apps/vscode/src/sdk/sdk-checkpoints.ts` | 源码 | VS Code 扩展层 checkpoint 适配 |
| `apps/vscode/src/core/controller/checkpoints/checkpointRestore.ts` | 源码 | VS Code controller 层 |
| `docs/core-workflows/checkpoints.mdx` | 官方文档 | 用户面向文档 |

### 2.3 messageBuilder 调用时机（主题 ③）

| 文件 | 类型 | 推测职责 |
|------|------|---------|
| `sdk/packages/core/src/session/services/message-builder.ts` | 源码 | messageBuilder 服务实现 |
| `sdk/packages/core/src/session/services/message-builder.test.ts` | 源码 | 测试（含调用约定）|
| `sdk/packages/agents/src/agent-runtime.ts` | 源码 | 调用点（turn-preparation）|
| `sdk/packages/core/src/extensions/plugin/plugin-sandbox.ts` | 源码 | registerMessageBuilders proxy 实现 |
| `sdk/examples/plugins/custom-compaction.ts`（如存在）| Example | 官方示例（设计意图佐证）|
| atlas §3 Data Flow | 内部文档 | 已结论："build() 在每次 turn 准备时都被调用"（需源码验证）|

### 2.4 rules 注入频率（主题 ④）

| 文件 | 类型 | 推测职责 |
|------|------|---------|
| `sdk/packages/core/src/extensions/config/user-instruction-plugin.ts` | 源码 | 用户指令（rules）plugin |
| `sdk/packages/core/src/runtime/orchestration/session-runtime-orchestrator.ts` | 源码 | session 编排（rules 注入调用点？）|
| `sdk/packages/core/src/extensions/plugin/plugin-sandbox.ts` | 源码 | registerSimpleContributions → rules proxy |
| `sdk/packages/shared/src/extensions/contribution-registry.ts` | 源码 | contribution 注册表（rules 类型定义）|
| `docs/customization/cline-rules.mdx` | 官方文档 | 用户面向文档 |

---

## 3. 子代理任务划分（供云端并行执行）

按 §1.12，每个子代理任务需注入评审角色。4 个主题相互独立，可并行。

### Task A：compact 执行链探查

**注入角色**：Software Engineering Reviewer（调研类任务）

**要回答的问题**：
1. compact 触发条件是什么？（token 阈值？手动 /compact？其他？）
2. compact 执行链完整调用顺序：`agent-runtime.ts prepareTurn` → ? → `compaction.ts` → ? → messageBuilder → ?
3. `compaction.ts` 的 registry map 包含哪些策略？（basic / agentic / 其他？）
4. plugin 的 messageBuilder.build() 在 compact 执行链的哪个位置被调用？（compact 判定之前/之后？）
5. compact 后产出的摘要消息如何注入回 messages 数组？
6. atlas 已结论"build() 在每次 turn 准备时都被调用"是否准确？如果是，plugin 如何区分 compact turn 和普通 turn？

**输入文件**：
- `sdk/ARCHITECTURE.md` §9
- `sdk/packages/core/src/extensions/context/compaction.ts`
- `sdk/packages/core/src/extensions/context/compaction-shared.ts`
- `sdk/packages/core/src/extensions/context/basic-compaction.ts`
- `sdk/packages/core/src/extensions/context/agentic-compaction.ts`
- `sdk/packages/core/src/extensions/context/compaction.test.ts`
- `sdk/packages/core/src/extensions/context/compaction.live.test.ts`
- `sdk/packages/agents/src/agent-runtime.ts`
- `docs/features/auto-compact.mdx`

**输出格式**（统一模板，见 §4）：
- Observation：源码事实（含文件:行号引用）
- Evidence Type：源码 / 官方文档 / Example
- Confidence：high / medium / low
- Remaining Unknown：未回答的问题

**回答 design.md §8**：Q1（build() 是否在 compact 时被调用）

### Task B：checkpoint 机制探查

**注入角色**：Software Engineering Reviewer（调研类任务）

**要回答的问题**：
1. Cline 是否有 checkpoint 机制？如果有，核心实现文件？
2. checkpoint 的触发条件？（自动？手动？每个工具调用后？）
3. checkpoint 的存储形式？（文件？git？SQLite？内存？）
4. checkpoint 与 compact 的关系？（独立？compact 触发 checkpoint？）
5. checkpoint 是否可被 plugin API 访问？（plugin 能否读取/触发 checkpoint？）
6. PROJECT_DEV_OUTLINE §5.3 验证项 2："checkpoint 是否需要自己做，还是 Cline 已够用" — 答案？

**输入文件**：
- `sdk/packages/core/src/session/checkpoint-restore.ts`
- `sdk/packages/core/src/session/checkpoint-diff.ts`
- `sdk/packages/core/src/session/session-snapshot.ts`
- `sdk/packages/core/src/hooks/checkpoint-hooks.ts`
- `sdk/packages/core/src/session/session-versioning-service.ts`
- `apps/vscode/src/sdk/sdk-checkpoints.ts`
- `docs/core-workflows/checkpoints.mdx`

**§1.14 提醒**：若结论为"Cline 无 checkpoint 机制"，需 search-orchestrator SKILL 反证 + 至少 3 类独立证据（源码 + 官方文档 + Example + CHANGELOG）

### Task C：messageBuilder 调用时机探查

**注入角色**：Software Engineering Reviewer（调研类任务）

**要回答的问题**：
1. `messageBuilder.build(messages)` 的调用频率？（每 turn？每 compact？每 provider call？）
2. 调用点在 `agent-runtime.ts` 的哪个函数？turn-preparation 的具体位置？
3. 多个 messageBuilder 的执行顺序？plugin 注册的 vs core 内置的？
4. build() 的返回值如何被消费？（替换 messages？追加？忽略？）
5. build() 抛异常时的降级行为？（atlas 说 core 有 API-safety builder 兜底，验证）
6. build() 是否同步？文档说"sync build"，源码是否一致？

**输入文件**：
- `sdk/packages/core/src/session/services/message-builder.ts`
- `sdk/packages/core/src/session/services/message-builder.test.ts`
- `sdk/packages/agents/src/agent-runtime.ts`
- `sdk/packages/core/src/extensions/plugin/plugin-sandbox.ts`（registerMessageBuilders proxy）
- `sdk/packages/shared/src/extensions/contribution-registry.ts`（messageBuilder 类型定义）

**回答 design.md §8**：Q3（build() 中写文件是否需考虑并发安全）

### Task D：rules 注入频率探查

**注入角色**：Software Engineering Reviewer（调研类任务）

**要回答的问题**：
1. `api.registerRule(rule)` 注册的 rule 在何时被注入？（每 turn？每 session start？每 provider call？）
2. `rule.content` 是函数时，调用频率？（每 turn 重新解析？缓存？）
3. 注入位置？（system prompt？messages 数组？user message？）
4. rules 与 messageBuilder 的执行顺序？（rules 先还是 messageBuilder 先？）
5. 多个 rule 的合并方式？（拼接？覆盖？优先级？）
6. plugin 注册的 rule 与用户 `.clinerules` 文件的 rule 如何共存？

**输入文件**：
- `sdk/packages/core/src/extensions/config/user-instruction-plugin.ts`
- `sdk/packages/core/src/runtime/orchestration/session-runtime-orchestrator.ts`
- `sdk/packages/core/src/extensions/plugin/plugin-sandbox.ts`（registerSimpleContributions）
- `sdk/packages/shared/src/extensions/contribution-registry.ts`
- `docs/customization/cline-rules.mdx`

**回答 design.md §8**：无直接对应 Open Question，但影响 #6（rules 注入 handoff.md）的实现策略

---

## 4. 统一输出格式模板

每个子代理输出按以下模板，便于交叉验证：

```markdown
### Task X：<主题>

#### 1. 问题：<问题文本>

**Observation**：
<源码事实，含 file:line 引用>

**Evidence Type**：源码 / 官方文档 / Example / 测试
**Confidence**：high / medium / low
**Remaining Unknown**：<未回答的部分，或 "none"）

---

#### 2. 问题：<问题文本>
...

#### 汇总结论

| 问题 | 结论 | 证据类型 | Confidence |
|------|------|---------|-----------|
| Q1 | ... | 源码+官方文档 | high |

#### Conflict Registry（如有）

| 证据A | 证据B | 冲突描述 | 处理 |
|-------|-------|---------|------|
| 源码 L123 | 文档 §X | ... | 登记，不裁决 |
```

---

## 5. 探查后行动（2026-06-29 更新）

1. **✅ 已完成 — 更新 design.md §8 Open Questions**：见下方 §6.1 发现，Q1/Q3 已回答
2. **⬜ 待做 — 更新 PROJECT_DEV_OUTLINE §5.3**：checkpoint 验证项已回答（不需要自建）
3. **⬜ 待做 — 更新 design.md §3.1 流程图**：修正 messageBuilder 与 compact 的实际顺序
4. **⬜ 待做 — 重新设计 context snapshot 内容生成**：基于发现 1（MB 在 compact 前执行），plugin 的 compact-observer build() 收到的是 compact 前的原始消息，需自行判断是否写 snapshot
5. **⬜ 待做 — 实现 #4 beforeModel 提示词注入**（不依赖探查，可并行）
6. **⬜ 待做 — 更新 ADR-005 evidence_as_of**：标注 2026-06-29

---

## 6. 探查结果（2026-06-29 GitHub 源码拉取执行）

> **evidence_as_of**: 2026-06-29，源码从 GitHub main 分支 shallow fetch（19 文件）
> **证据类型**：全部为 unminified .ts 源码 + 官方文档（.mdx）
> **§1.12 执行**：以下结果由主 agent 直接产出（OpenClaw 环境无 Task subagent 注入机制，已在分析中内嵌 SE Reviewer 视角）

---

### Task A 结果：compact 执行链

#### A1. compact 触发条件

**Observation**：`compaction.ts:resolveTriggerState()` 支持两种配置触发：
- `reserveTokens` 模式：`inputTokens > maxInputTokens - reserveTokens`
- `thresholdRatio` 模式：`inputTokens > maxInputTokens * thresholdRatio`
- 默认：`Math.min(maxInputTokens - DEFAULT_RESERVE_TOKENS, maxInputTokens * DEFAULT_THRESHOLD_RATIO)`（compaction-shared.ts）
- 另有 `manual` 模式（用户 `/compact` 命令），通过 `ContextCompactionPrepareTurnOptions.mode` 传入

**Evidence Type**：源码（compaction.ts:resolveTriggerState, compaction-shared.ts:DEFAULT_* 常量）
**Confidence**：high

#### A2. compact 完整调用链

**Observation**：
```
SessionRuntimeOrchestrator.executeRunInternal()
  → AgentRuntime.run() / .continue()
    → AgentRuntime.runIteration()
      → AgentRuntime.prepareTurnForModelRequest(request)   [agent-runtime.ts:1046]
        → this.config.prepareTurn(context)                  [agent-runtime.ts:1049]
          → SessionRuntimeOrchestrator.createRuntimePrepareTurn() 返回的闭包 [orchestrator.ts:947]
            → this.prepareProviderMessagesForApi(messages)  [orchestrator.ts:1000-1005]
              → plugin messageBuilders 依次 build()        [orchestrator.ts:1000-1002]
              → this.messageBuilder.buildForApi()           [orchestrator.ts:1005]（API-safety 层）
            → 调用 config.prepareTurn（即 createContextCompactionPrepareTurn 返回的函数）[orchestrator.ts:955]
              → compaction.ts 策略执行
      → AgentRuntime hooks.beforeModel 循环                 [agent-runtime.ts:807]
```

**关键发现**：prepareTurn 闭包内先调 `prepareProviderMessagesForApi`（含 plugin messageBuilder + API-safety），**然后**才执行 compact 策略判定。这意味着：
- plugin messageBuilder.build() 在 compact **判定之前**被调用
- compact 产出的摘要消息直接替换 `this.state.messages`（agent-runtime.ts:1069）

**Evidence Type**：源码（agent-runtime.ts:1046-1069, orchestrator.ts:947-1005, compaction.ts:createContextCompactionPrepareTurn）
**Confidence**：high

#### A3. registry map 策略

**Observation**：`BUILTIN_COMPACTION_STRATEGIES` 包含 2 个策略：
- `basic`: `runBasicCompaction()` — 基于规则的消息截断/摘要
- `agentic`: `runAgenticCompaction()` — 使用 LLM 生成摘要

用户可通过 `compaction.compact` 字段提供自定义 compact 函数（compaction.ts:276）。策略选择通过 `compaction.strategy` 配置，默认 `"basic"`。

**Evidence Type**：源码（compaction.ts:BUILTIN_COMPACTION_STRATEGIES, basic-compaction.ts, agentic-compaction.ts）
**Confidence**：high

#### A4. plugin messageBuilder.build() 在 compact 执行链的位置

**Observation**：plugin messageBuilder 在 compact **判定之前**被调用。

调用顺序（在 prepareTurn 闭包内）：
1. `prepareProviderMessagesForApi(messages)` — 先执行 plugin messageBuilder + API-safety
2. `config.prepareTurn(context)` — 再执行 compact 策略判定

**但有歧义**：orchestrator.ts:947 的 `prepareTurn` 闭包内，`prepareProviderMessagesForApi` 和 `config.prepareTurn` 的关系需要仔细看。实际上 orchestrator 的 `createRuntimePrepareTurn` 返回的闭包做了两件事：
- 先 `prepareProviderMessagesForApi(messages)` 生成 `apiMessages`
- 再把 `apiMessages` 传给 `config.prepareTurn({ apiMessages, ... })`

而 `createContextCompactionPrepareTurn` 用 `context.apiMessages` 做 token 估算来判定是否需要 compact。

**结论**：plugin messageBuilder 的 build() 在 compact token 估算之前执行，因此 plugin 修改消息内容会影响 compact 触发判定。

**Evidence Type**：源码（orchestrator.ts:947-1005）
**Confidence**：high

#### A5. compact 后摘要消息注入

**Observation**：`createContextCompactionPrepareTurn` 返回 `{ messages: result.messages }`，agent-runtime.ts:1069 将其赋值给 `this.state.messages`，直接替换原始消息历史。

**Evidence Type**：源码（agent-runtime.ts:1069, compaction.ts:291）
**Confidence**：high

#### A6. plugin 如何区分 compact turn 和普通 turn

**Observation**：plugin 的 `build(messages)` **无法**直接区分。它只收到 messages 数组，没有 `isCompactTurn` 标志。plugin 需要自行通过 token 估算（如 custom-compaction.ts 的 `shouldCompact` 逻辑）来判断当前是否接近 compact 阈值。

**但**：当前 context-snapshot 插件的 compact-observer 已经自己实现了 `shouldCompact` 判定（compaction.ts），所以这个限制实际上已被绕过。

**Evidence Type**：源码（agent-runtime.ts hooks 接口, plugin-sandbox.ts registerMessageBuilder proxy）
**Confidence**：high

#### A7. design.md §8 Q1 回答

**Q1: VS Code 扩展中 registerMessageBuilder 注册的 builder 是否在 compact 时被调用？**

**答**：是的，但不是在 compact 执行期间，而是在 compact **判定之前**。调用链为：`prepareTurn 闭包 → prepareProviderMessagesForApi → plugin messageBuilder.build()`，然后才进行 compact token 估算和策略执行。

**影响**：plugin 的 build() 修改消息内容会影响 compact 的 token 估算。如果 plugin 在 build() 中写入大量内容，可能会更早触发 compact。

#### Task A 汇总结论

| 问题 | 结论 | 证据类型 | Confidence |
|------|------|---------|-----------|
| compact 触发条件 | token 阈值（reserveTokens 或 thresholdRatio）+ 手动模式 | 源码 | high |
| 完整调用链 | orchestrator → prepareTurn 闭包 → prepareProviderMessagesForApi（含 plugin MB）→ compact 策略 | 源码 | high |
| registry 策略 | basic + agentic，可自定义 | 源码 | high |
| plugin MB 位置 | compact 判定**之前** | 源码 | high |
| 摘要注入方式 | 直接替换 state.messages | 源码 | high |
| 区分 compact turn | 无法直接区分，需 plugin 自行估算 | 源码 | high |

#### Task A Conflict Registry

无冲突。ARCHITECTURE.md §9 说"core 拥有 compaction policy，agents 拥有 turn-preparation seam"，源码一致：compaction.ts 在 core 包，agent-runtime.ts 在 agents 包。

---

### Task B 结果：checkpoint 机制

#### B1. Cline 是否有 checkpoint 机制

**Observation**：**是**。Cline 有完整的 checkpoint 机制，基于 shadow Git repository。

核心文件：
- `checkpoint-hooks.ts`：`createCheckpointHooks()` — 创建 checkpoint hooks（git stash/commit）
- `checkpoint-restore.ts`：`readSessionCheckpointHistory()`, `findCheckpointForRun()`, checkpoint 恢复逻辑
- `checkpoint-diff.ts`：checkpoint diff
- `session-snapshot.ts`：`CoreSessionSnapshot` 含 `checkpoint` 字段

**Evidence Type**：源码 + 官方文档（checkpoints.mdx）
**Confidence**：high

#### B2. checkpoint 触发条件

**Observation**：checkpoint 在**每次 tool use 后**自动触发。

文档原文："After each tool use (file edits, commands, etc.), Cline commits the current state of your files to this shadow repo."

实现：`createCheckpointHooks()` 返回的 hooks 在 tool 执行后被调用，通过 `git stash` 或 `git commit` 保存文件快照。

**Evidence Type**：官方文档（checkpoints.mdx）+ 源码（checkpoint-hooks.ts:createCheckpointHooks）
**Confidence**：high

#### B3. checkpoint 存储形式

**Observation**：基于 **shadow Git repository**（独立于项目 git），使用 `git stash` 或 `git commit`。

checkpoint 条目（`CheckpointEntry`）包含：
- `ref`：git ref（stash 或 commit hash）
- `createdAt`：创建时间戳
- `runCount`：运行计数
- `kind`：`"stash"` 或 `"commit"`

存储在 session metadata 的 `checkpoint.history` 数组中。

**Evidence Type**：源码（checkpoint-hooks.ts:CheckpointEntry, checkpoint-restore.ts）+ 官方文档
**Confidence**：high

#### B4. checkpoint 与 compact 的关系

**Observation**：**完全独立**。checkpoint 基于 git 文件快照，compact 基于消息历史压缩。两者无调用关系。

compact 后可通过 checkpoint 回滚到 compact 前的文件状态（文档："You can use checkpoints to restore your task state from before a summarization occurred"），但这是用户手动操作，不是自动关联。

**Evidence Type**：官方文档（checkpoints.mdx, auto-compact.mdx）
**Confidence**：high

#### B5. checkpoint 是否可被 plugin API 访问

**Observation**：checkpoint 通过 `AgentHooks` 接口暴露（checkpoint-hooks.ts 实现 `AgentHooks`），但**未在 plugin API 中看到直接的 checkpoint 注册点**。

plugin 可以通过 `hooks.beforeTool` / `hooks.afterTool` 间接感知 tool 执行，但不能直接触发 checkpoint。

**Evidence Type**：源码（checkpoint-hooks.ts, plugin-sandbox.ts）
**Confidence**：medium（未深入检查 AgentHooks 是否可通过 plugin 注册）

#### B6. PROJECT_DEV_OUTLINE §5.3 验证项 2

**问题**："checkpoint 是否需要自己做，还是 Cline 已够用？"

**答**：Cline 原生 checkpoint 机制已**完全够用**。它：
- 每次 tool use 后自动触发
- 基于 shadow git，不污染项目 git history
- 支持三种恢复模式（文件 / 任务 / 文件+任务）
- 跨 editor session 持久化

**结论**：不需要自己做 checkpoint。

**Evidence Type**：官方文档 + 源码
**Confidence**：high

#### Task B 汇总结论

| 问题 | 结论 | 证据类型 | Confidence |
|------|------|---------|-----------|
| 有无 checkpoint | 有，完整实现 | 源码+文档 | high |
| 触发条件 | 每次 tool use 后自动 | 文档+源码 | high |
| 存储形式 | shadow git (stash/commit) | 源码 | high |
| 与 compact 关系 | 完全独立 | 文档 | high |
| plugin 可访问 | 间接（hooks），无直接 API | 源码 | medium |
| 是否需要自建 | 不需要，原生已够用 | 文档+源码 | high |

---

### Task C 结果：messageBuilder 调用时机

#### C1. build() 调用频率

**Observation**：**每 turn 一次**。在 `SessionRuntimeOrchestrator.prepareProviderMessagesForApi()` 中调用，该方法在每次 provider 请求前执行。

调用点：`orchestrator.ts:1000-1005`
```typescript
const messageBuilders = this.contributionRegistry.getRegistrySnapshot().messageBuilder;
for (const builder of messageBuilders) {
  providerMessages = await builder.build(providerMessages);
}
return this.messageBuilder.buildForApi(providerMessages);
```

**Evidence Type**：源码（orchestrator.ts:1000-1005）
**Confidence**：high

#### C2. 调用点位置

**Observation**：不在 `agent-runtime.ts` 中，而在 `session-runtime-orchestrator.ts` 的 `prepareProviderMessagesForApi()` 方法中。

完整链路：
```
SessionRuntimeOrchestrator.createRuntimePrepareTurn() 返回闭包
  → 闭包内调用 prepareProviderMessagesForApi(messages)
    → plugin messageBuilders 依次 build()
    → this.messageBuilder.buildForApi()（API-safety）
  → 闭包内调用 config.prepareTurn({ apiMessages, ... })
    → compaction 策略
```

**注意**：plugin messageBuilder 的 build() 在 `prepareTurn` 闭包内、compact 策略之前被调用。

**Evidence Type**：源码（orchestrator.ts:947-1005）
**Confidence**：high

#### C3. 多个 messageBuilder 执行顺序

**Observation**：按 `contributionRegistry.getRegistrySnapshot().messageBuilder` 数组顺序**串行执行**。每个 builder 的输出作为下一个的输入（`providerMessages = await builder.build(providerMessages)`）。

执行顺序：plugin 注册的 messageBuilder **先于** core 的 API-safety MessageBuilder。

API-safety MessageBuilder（`this.messageBuilder.buildForApi()`）始终**最后**执行，作为最终保护层。

**Evidence Type**：源码（orchestrator.ts:1000-1005）
**Confidence**：high

#### C4. build() 返回值消费方式

**Observation**：**替换**。`providerMessages = await builder.build(providerMessages)` — 返回值替换输入，传给下一个 builder。

**Evidence Type**：源码（orchestrator.ts:1001）
**Confidence**：high

#### C5. build() 异常降级行为

**Observation**：**无内置降级**。plugin messageBuilder 的异常会沿调用栈向上传播。但 API-safety MessageBuilder（`buildForApi()`）是独立的，不受 plugin builder 异常影响——因为 plugin builder 先执行，如果抛异常，整个 `prepareProviderMessagesForApi` 会失败，不会到达 `buildForApi()`。

**但**：plugin-sandbox.ts 中 sandboxed plugin 的 build() 有 try-catch，调用失败时会 reinitialize sandbox 并重试一次（plugin-sandbox.ts:560-575）。如果重试仍失败，返回原始 messages（`isMessageArray(result) ? result : messages`）。

**结论**：atlas 说的"core 有 API-safety builder 兜底"不完全准确——API-safety builder 在 plugin builder **之后**执行，如果 plugin builder 异常且未被 sandbox catch，整个链会断。但 sandbox 层有自己的降级（返回原始 messages）。

**Evidence Type**：源码（orchestrator.ts:1000-1005, plugin-sandbox.ts:543-580）
**Confidence**：high

#### C6. build() 是否同步

**Observation**：**异步**。`await builder.build(providerMessages)` — orchestrator 中使用 `await`。

但 plugin 可以注册同步的 build()（返回 `Message[]` 而非 `Promise<Message[]>`），因为 JS 的 await 对非 Promise 值是透明的。

API-safety MessageBuilder 的 `buildForApi()` 是**同步**的（无 async/await）。

**Evidence Type**：源码（orchestrator.ts:1001, message-builder.ts:buildForApi）
**Confidence**：high

#### C7. design.md §8 Q3 回答

**Q3: build() 中写文件是否需考虑并发安全？**

**答**：不需要担心并发。原因：
1. messageBuilder 串行执行（`for...of` + `await`），不是并行
2. 每 turn 只调用一次 `prepareProviderMessagesForApi`
3. 但需注意：build() 是异步的，如果多个 session 共享同一个 plugin 实例且同时运行，理论上可能并发写同一文件。不过 Cline 的 session 是隔离的，每个 session 有自己的 orchestrator 实例。

**结论**：单 session 内无并发问题。跨 session 写同一文件（如 index.jsonl）需用 append 模式 + 文件锁，但风险很低。

#### Task C 汇总结论

| 问题 | 结论 | 证据类型 | Confidence |
|------|------|---------|-----------|
| 调用频率 | 每 turn 一次 | 源码 | high |
| 调用点 | orchestrator.prepareProviderMessagesForApi() | 源码 | high |
| 执行顺序 | plugin MB 串行 → API-safety MB 最后 | 源码 | high |
| 返回值消费 | 替换（链式） | 源码 | high |
| 异常降级 | sandbox 有 catch+retry，无全局降级 | 源码 | high |
| 同步/异步 | 异步（await），但 plugin 可注册同步 | 源码 | high |

---

### Task D 结果：rules 注入频率

#### D1. rule 注入时机

**Observation**：**每 turn 注入**。在 `SessionRuntimeOrchestrator.composeSystemPrompt()` 中，每次构建 system prompt 时重新解析所有 rules。

调用点：orchestrator.ts:658-665
```typescript
const rules: string[] = [];
for (const rule of this.contributionRegistry.getRegisteredRules()) {
  const content = await resolveRuleContent(rule);
  if (content) { rules.push(content); }
}
return mergeSystemPromptRules(this.config.systemPrompt, rules);
```

`composeSystemPrompt()` 在每次 agent turn 的 `executeRunInternal()` 中被调用（orchestrator.ts:690+）。

**Evidence Type**：源码（orchestrator.ts:658-665, 690+）
**Confidence**：high

#### D2. rule.content 是函数时的调用频率

**Observation**：**每 turn 重新调用**。`resolveRuleContent(rule)` 检查 content 类型：如果是函数，则调用；如果是字符串，直接使用。

plugin-sandbox.ts:478 中，sandboxed plugin 的 rule content handler 通过 `sandbox.call('resolveRuleContent', ...)` 调用，每次 rule 被评估时都会重新执行。

**Evidence Type**：源码（orchestrator.ts:659-662, plugin-sandbox.ts:470-510）
**Confidence**：high

#### D3. 注入位置

**Observation**：注入到 **system prompt**。`mergeSystemPromptRules(config.systemPrompt, rules)` 将所有 rule 内容追加到 system prompt 末尾。

**Evidence Type**：源码（orchestrator.ts:665）
**Confidence**：high

#### D4. rules 与 messageBuilder 执行顺序

**Observation**：**rules 先于 messageBuilder**。

完整顺序（每次 turn）：
1. `composeSystemPrompt()` — 解析所有 rules，合并到 system prompt
2. `executeRunInternal()` → `AgentRuntime.run()` → agent loop
3. `prepareTurnForModelRequest()` → `prepareTurn` 闭包
4. `prepareProviderMessagesForApi()` — plugin messageBuilder.build() → API-safety buildForApi()
5. compact 策略判定
6. `hooks.beforeModel` 循环
7. provider 调用

**Evidence Type**：源码（orchestrator.ts:658-665, 947-1005）
**Confidence**：high

#### D5. 多个 rule 合并方式

**Observation**：**拼接**。所有 rule content 通过 `mergeSystemPromptRules()` 合并到 system prompt。无覆盖或优先级机制（在 SDK 层面）。

文档说"Workspace rules take precedence when they conflict with global rules"，但这是 Cline 应用层的行为，SDK 层面只是拼接。

**Evidence Type**：源码（orchestrator.ts:665）+ 官方文档（cline-rules.mdx）
**Confidence**：high

#### D6. plugin rule 与 .clinerules 文件 rule 共存

**Observation**：通过 `contributionRegistry.getRegisteredRules()` 统一获取。plugin 通过 `api.registerRule()` 注册的 rule 和 file watcher 加载的 `.clinerules` 文件 rule 都进入同一个 registry，合并方式相同。

`user-instruction-plugin.ts` 负责从 watcher 加载 rules 并注册到 API。

**Evidence Type**：源码（orchestrator.ts:658, user-instruction-plugin.ts, contribution-registry.ts）
**Confidence**：high

#### Task D 汇总结论

| 问题 | 结论 | 证据类型 | Confidence |
|------|------|---------|-----------|
| 注入时机 | 每 turn（composeSystemPrompt） | 源码 | high |
| content 函数频率 | 每 turn 重新调用 | 源码 | high |
| 注入位置 | system prompt | 源码 | high |
| 与 MB 顺序 | rules 先 → messageBuilder 后 | 源码 | high |
| 合并方式 | 拼接（无覆盖） | 源码 | high |
| plugin 与 .clinerules 共存 | 统一 registry，相同处理 | 源码 | high |

---

## 6.1 探查后关键发现（对 design.md 的影响）

### 发现 1：plugin messageBuilder 在 compact 判定之前执行

design.md §3.1 流程图需要修正。当前图示暗示 messageBuilder 在 compact 之后，实际在之前：

```
turn-preparation
  → prepareProviderMessagesForApi()
    → plugin messageBuilder.build()  ← 这里先执行
    → API-safety buildForApi()
  → compact 策略判定（用 apiMessages 做 token 估算）
  → if needsCompact: 执行 compact，替换 messages
```

**影响**：compact-observer 的 build() 收到的是 compact 前的原始消息，不是 compact 后的摘要。plugin 需要自行判断是否应该写 snapshot。

### 发现 2：Cline 原生 checkpoint 已完整，无需自建

PROJECT_DEV_OUTLINE §5.3 验证项 2 已回答：Cline 的 shadow-git checkpoint 机制完全够用。

### 发现 3：build() 异常不被 API-safety 兜底

design.md §3.4 说"messageBuilder.build() 抛出异常时 Cline core 的 API-safety builder 继续运行"——**不准确**。API-safety builder 在 plugin builder 之后，plugin 异常会阻断整个链。但 sandbox 层有自己的降级（catch + retry + 返回原始 messages）。

### 发现 4：rules 每 turn 重新解析

rules-injector 的 `content: () => buildHandoffRuleContent(workspacePath)` 设计正确——content 是函数，每 turn 重新调用，能读取最新的 snapshot 文件。

---

## 产源说明

- 本规划文档基于 sdk/ARCHITECTURE.md（§9 Context Compaction Design Seam）+ 源码 Grep 定位
- 文件路径均经过 Glob + Grep 验证存在
- 未读取源码内容，仅定位文件（初步探查阶段）
