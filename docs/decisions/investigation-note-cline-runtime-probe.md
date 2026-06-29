# Investigation Note — Cline Runtime Source Probe

> **类型**：Investigation Note（evidence-governance.md §10）
> **状态**：规划完成，待执行
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

## 5. 探查后行动

1. **更新 design.md §8 Open Questions**：根据探查结果填 Q1/Q3/Q4/Q5 状态
2. **更新 PROJECT_DEV_OUTLINE §5.3**：填 compact / checkpoint 验证项
3. **更新 mechanism-landing-assessment.md**：如探查颠覆现有结论，按 §1.10 Core Proposition Flip 门控处理
4. **重新设计 context snapshot 内容生成**（handoff.md 任务 2）：基于 messageBuilder 调用时机和 compact 执行链，决定 snapshot 生成策略
5. **更新 ADR-005 evidence_as_of**：标注本次探查日期

---

## 6. 探查结果（待云端执行后填充）

> 云端执行后，将 4 个 Task 的输出填入本节，并在 §5 行动项中更新对应文档。

### Task A 结果
（待填充）

### Task B 结果
（待填充）

### Task C 结果
（待填充）

### Task D 结果
（待填充）

---

## 产源说明

- 本规划文档基于 sdk/ARCHITECTURE.md（§9 Context Compaction Design Seam）+ 源码 Grep 定位
- 文件路径均经过 Glob + Grep 验证存在
- 未读取源码内容，仅定位文件（初步探查阶段）
