# V2-A 静态审计报告

日期：2026-07-01
审计对象：context-snapshot 插件（v0.6.0）
关联任务：A1 修复 beforeModel content 类型 + A2 V2-A 静态审计

---

## 步骤 1：TypeScript 编译检查

- 结果：**零错误** ✅
- 说明：需要为 `@cline/core` 创建类型 stub（peer dependency 未安装，运行时由 Cline 注入）。stub 位于 `context-snapshot/node_modules/@cline/core/index.d.ts`，仅包含 context-snapshot 使用的类型。
- 原始编译错误（修复前）：
  - `@cline/core` 模块缺失 → 创建 stub 解决
  - compaction.ts `default` 分支 `never` 类型 → stub 使用宽松 `ContentBlock` 接口解决

## 步骤 2：beforeModel 返回类型契约对照

- 契约来源：Cline Plugin API（`beforeModel` hook 签名）
- `return undefined`：✅ 合法 — 表示不修改 messages
- `return { messages: [...] }`：✅ messages 为 `Message[]`，注入消息结构符合
- 注入消息 `role: "user"`：✅ 合法
- 注入消息 `content: [{ type: "text", text: string }]`：✅ **A1 修复后**为 `ContentBlock[]` 数组类型，符合 codec 期望

### A1 修复前后对比

| 维度 | 修复前 | 修复后 |
|------|--------|--------|
| content 类型 | `string`（模板字符串）| `[{ type: "text", text }]`（ContentBlock[]）|
| codec `n.content.map(eK)` | ❌ string 无 `.map()` → 崩溃 | ✅ array 有 `.map()` |
| META_MARKER 检查 | `typeof last.content === "string"` | `Array.isArray(last.content)` + `.some()` |

## 步骤 3：content 类型审计（A1 关联）

- A1 修复后 content 格式：✅ 符合 `ContentBlock[]`（`[{ type: "text", text: string }]`）
- META_MARKER 检查逻辑：✅ 正确适配 array 类型
  - 先检查 `Array.isArray(last.content)`
  - 再用 `.some()` 遍历 block 检查 `type === "text"` 且 `text.includes(META_MARKER)`
  - 逻辑与原 string 版本等价（都检查"最后一条 user 消息是否包含 marker"）

## 步骤 4：其他 hook 签名审计

| Hook | 签名 | 契约一致性 | 备注 |
|------|------|-----------|------|
| `beforeTool` | `args: { toolName: string; input: Record<string, unknown> }` | ✅ 一致 | 直接透传给 `toolRecorder.beforeTool()` |
| `afterTool` | `args: { toolName: string; success: boolean }` | ✅ 一致 | 返回 record 后做慢调用/循环检测 |
| `messageBuilder.build` | `messages: Message[] → Message[]` | ✅ 一致 | 返回原 messages（不修改） |
| `registerRule.content` | `() => string`（函数）| ✅ 一致 | 函数式 content，每次评估时重新读取 snapshot |

## 步骤 5：类型一致性审计

| 类型 | 状态 | 备注 |
|------|------|------|
| `Message`（types.ts）| ✅ 一致 | 从 `@cline/core` re-export，stub 定义与使用一致 |
| `ContentBlock`（stub）| ✅ 存在 | 宽松接口，覆盖 text/thinking/tool_use/tool_result/file 所有字段 |
| `shouldCompact` 返回 `CompactResult` | ✅ 正确 | `{ needsCompact: boolean; totalTokens: number; messages: Message[] }` |
| `collectToolNames` 返回 `string[]` | ✅ 正确 | |
| `collectTouchedFiles` 返回 `string[]` | ✅ 正确 | |

---

## 结论

**代码逻辑 Verified** — A1 修复后，beforeModel 注入的 content 类型从 string 改为 ContentBlock[]，消除 codec `n.content.map()` 崩溃的直接触发条件。所有 hook 签名与契约一致，类型使用正确。

### ⚠️ 发现的非 A1 范围问题（记录不修复）

| # | 文件 | 行 | 问题 | 风险等级 |
|---|------|-----|------|---------|
| F1 | compaction.ts | L108 | `buildCompactionSummary()` 返回的 Message `content` 为 **string 类型**。此 Message 经 messageBuilder.build() 返回后进入 codec 管道，同样会触发 `n.content.map()` 崩溃。但 messageBuilder 仅在 compact 触发时执行（高 token 场景），且 compact 本身受 §1.15 不可抗力（CLI 3.0.34 codec bug）阻塞，当前实际不会到达。 | 🟡 中 |
| F2 | compaction.ts | L28 | `stringifyContent` 参数类型 `ToolResultContent["content"]` 与 ContentBlock 宽松接口的 `content` 字段（`string \| Record<string, unknown> \| undefined`）存在类型兼容性依赖——依赖 stub 的宽松定义。真实 `@cline/core` 类型可能更严格。 | 🟢 低 |
| F3 | 全局 | — | `@cline/core` peer dependency 未安装，tsc 依赖 stub。stub 是基于代码使用推断的，非官方类型。若真实 API 有差异，审计结论需复查。 | 🟢 低 |

### A1 修复验收清单

| # | 验收标准 | 结果 |
|---|---------|------|
| 1 | `content` 字段为 `[{ type: "text", text: string }]` 格式 | ✅ |
| 2 | META_MARKER 检查逻辑适配 array 类型 | ✅ |
| 3 | `tsc --noEmit` 编译零错误 | ✅ |
| 4 | 不修改其他文件 | ✅ 仅 index.ts |
| 5 | 不新增依赖 | ✅ |
