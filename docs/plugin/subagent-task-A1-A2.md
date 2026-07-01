# 子代理任务书：A1 修复 beforeModel content 类型 + A2 V2-A 静态审计

> **状态**：待执行
> **难度**：低（单点修改 + 静态审计）
> **可并行**：是（A1 和 A2 独立，但 A2 审计范围含 A1 修改后的代码，建议 A1 完成后 A2 再执行或 A2 审计当前代码后标注 A1 影响范围）
> **归档条件**：两个任务均完成并通过验收后，本文件移至 `docs/archive/`

---

## 背景

[investigation-note O8](../decisions/investigation-note-cli-codec-content-map-bug.md)（Verified，4 来源）发现：[index.ts:146](../../context-snapshot/src/index.ts#L146) beforeModel hook 返回的注入消息 content 为 **string 类型**，而 Cline codec 的 `Nd` 函数对每条消息调用 `n.content.map(eK)`——string 无 `.map()` 方法，必然崩溃。

这与消息数量/token 总量无关，任何步骤下 beforeModel 返回 string content 都会触发 codec bug。

**根因链**（Verified）：
```
Plugin beforeModel hook 返回 messages
  → 注入消息 content 为 string 类型 [Verified, index.ts:146]
    → codec Nd 函数对每条消息调用 n.content.map(eK) [Verified, O3]
      → string 无 .map() 方法 → 崩溃 [Verified, handoff §4 实测吻合]
```

---

## A1：修复 beforeModel content 类型

### 目标

将 [index.ts:146](../../context-snapshot/src/index.ts#L146) 注入消息的 content 从 string 类型改为 array 类型，符合 Cline codec 期望的 `ContentBlock[]` 格式。

### 修改范围

**文件**：`e:\cline++\context-snapshot\src\index.ts`

**修改点 1**（第 146 行，核心修复）：

修改前：
```typescript
return {
    messages: [...messages, { role: "user", content: `${META_MARKER}\n${warningText}` }],
};
```

修改后：
```typescript
return {
    messages: [...messages, {
        role: "user",
        content: [{ type: "text", text: `${META_MARKER}\n${warningText}` }]
    }],
};
```

**修改点 2**（第 132-140 行，META_MARKER 检查逻辑适配）：

原逻辑检查 `typeof last.content === "string"`，content 改为 array 后此条件永远 false，需适配：

修改前：
```typescript
if (messages.length > 0) {
    const last = messages[messages.length - 1];
    if (
        last.role === "user" &&
        typeof last.content === "string" &&
        last.content.includes(META_MARKER)
    ) {
        return undefined; // Already warned in last turn
    }
}
```

修改后：
```typescript
if (messages.length > 0) {
    const last = messages[messages.length - 1];
    if (last.role === "user" && Array.isArray(last.content)) {
        const hasMarker = last.content.some(
            block => block.type === "text" && typeof block.text === "string" && block.text.includes(META_MARKER)
        );
        if (hasMarker) {
            return undefined; // Already warned in last turn
        }
    }
}
```

### 验收标准

1. `content` 字段为 `[{ type: "text", text: string }]` 格式（ContentBlock 数组）
2. META_MARKER 检查逻辑适配 array 类型
3. `tsc --noEmit` 编译零错误
4. 不修改其他文件
5. 不新增依赖

### 注意事项

- **不要**修改 `warningText` 的内容，只改 content 的结构
- **不要**修改 `META_MARKER` 的值
- **不要**修改 `loopWarningCount` 或 `MAX_LOOP_WARNINGS` 逻辑
- **不要**修改 beforeTool / afterTool / messageBuilder / registerRule 等其他部分
- 编译用 UTF-8 编码（项目规则）

---

## A2：V2-A 静态代码审计

### 目标

验证 context-snapshot 插件代码逻辑正确性，对照 Cline Plugin API 契约核验类型一致性。

### 审计范围

**文件**：
- `e:\cline++\context-snapshot\src\index.ts`（主审计对象）
- `e:\cline++\context-snapshot\src\compaction.ts`（辅助审计）
- `e:\cline++\context-snapshot\src\snapshot-writer.ts`（辅助审计）
- `e:\cline++\context-snapshot\src\tool-recorder.ts`（辅助审计）
- `e:\cline++\context-snapshot\src\rules-injector.ts`（辅助审计）
- `e:\cline++\context-snapshot\src\constants.ts`（辅助审计）
- `e:\cline++\context-snapshot\src\types.ts`（辅助审计）

**契约参考**：
- `e:\cline++\context-snapshot\node_modules\@cline\shared\dist\agent.d.ts`（如存在）
- `e:\cline++\docs\plugin\refs\cline-plugin-architecture-atlas.md`（§4 7 个稳定 API）
- `e:\cline++\docs\plugin\refs\plugin-dev-quick-reference.md`（Hook 生命周期 + 能力对照）

### 审计步骤

#### 步骤 1：TypeScript 编译检查

```bash
cd e:\cline++\context-snapshot
npx tsc --noEmit
```

记录所有编译错误（应为零，若非零需逐条记录）。

#### 步骤 2：beforeModel 返回类型契约对照

读取 `@cline/shared/dist/agent.d.ts`（或项目内的 stub 类型声明），找到 `beforeModel` hook 的返回类型定义，核验：
- `return undefined` 是否合法
- `return { messages: [...] }` 的 messages 类型是否匹配
- 注入消息的 `role` 和 `content` 字段是否符合 `Message` 类型
- content 是否应为 `ContentBlock[]`（数组类型）

#### 步骤 3：beforeModel 注入消息 content 类型审计（A1 关联）

重点审计 A1 修复后的 content 类型：
- content 是否为 `[{ type: "text", text: string }]` 格式
- 是否与 codec 期望的 `ContentBlock[]` 一致
- META_MARKER 检查逻辑是否正确适配 array 类型

#### 步骤 4：其他 hook 签名审计

- `beforeTool` 签名（`args.toolName` / `args.input`）是否与契约一致
- `afterTool` 签名（`args.toolName` / `args.success`）是否与契约一致
- `messageBuilder.build` 签名（`messages: Message[]`）是否与契约一致
- `registerRule` 的 `content` 字段（函数 vs 字符串）是否与契约一致

#### 步骤 5：类型一致性审计

- `Message` 类型定义（types.ts）是否与 `@cline/shared` 一致
- `ContentBlock` 类型是否存在且被正确引用
- `shouldCompact` / `collectToolNames` / `collectTouchedFiles` 的返回类型是否正确使用

### 验收标准

1. `tsc --noEmit` 零错误（或记录所有错误及原因）
2. beforeModel 返回类型与契约一致
3. content 类型为 ContentBlock[] 数组（A1 修复后）
4. 所有 hook 签名与契约一致
5. 产出审计报告（文本格式，记录每步骤结果）

### 审计报告格式

```
## V2-A 静态审计报告

### 步骤 1：TypeScript 编译检查
- 结果：[零错误 / N 个错误]
- 错误清单（若有）：

### 步骤 2：beforeModel 返回类型契约对照
- 契约来源：[文件路径]
- return undefined：[合法 / 不合法，原因]
- return { messages }：[类型匹配 / 不匹配，原因]

### 步骤 3：content 类型审计
- A1 修复后 content 格式：[符合 / 不符合 ContentBlock[]]
- META_MARKER 检查逻辑：[正确 / 不正确，原因]

### 步骤 4：其他 hook 签名审计
- beforeTool：[一致 / 不一致，原因]
- afterTool：[一致 / 不一致，原因]
- messageBuilder.build：[一致 / 不一致，原因]
- registerRule.content：[一致 / 不一致，原因]

### 步骤 5：类型一致性审计
- Message 类型：[一致 / 不一致，原因]
- ContentBlock 类型：[存在 / 不存在，原因]
- 其他返回类型：[正确 / 不正确，原因]

### 结论
- [代码逻辑 Verified / 存在 N 个问题]
- 问题清单（若有）：
```

### 注意事项

- 静态审计不等同运行时端到端验证
- 审计的是插件代码正确性，不是 codec bug 本身（codec bug 在 Cline 核心，不在本插件）
- 若发现非 A1 范围的问题，记录但不修复（超出本任务范围）
- 编译用 UTF-8 编码（项目规则）

---

## 参考文档

| 文档 | 用途 |
|------|------|
| [investigation-note O8](../decisions/investigation-note-cli-codec-content-map-bug.md) | A1 根因依据 |
| [handoff.md](../handoff.md) | 当前状态 + 未完成项 |
| [dev-rules.md §1.15](../dev-rules.md) | 不可抗力门控 |
| [plugin-dev-sop.md](plugin-dev-sop.md) | Plugin 开发规划框架 |
| [architecture-atlas.md](refs/cline-plugin-architecture-atlas.md) | 7 个稳定 API |
| [quick-reference.md](refs/plugin-dev-quick-reference.md) | Hook 生命周期 |

---

## 归档说明

两个任务均完成并通过验收后：
1. 在本文件头部标注 `状态：已完成`
2. 将本文件移至 `docs/archive/subagent-tasks/`
3. 在 handoff.md 未完成项表中标注 A1/A2 完成
