# Capability 开发 SOP — 7 步清单

> **生命周期**：版本绑定 — v1.0 框架定型后归档，后续变更走 ADR。
>
> **身份**：开发者操作手册。从零到上线一个新 Capability 的完整步骤。
>
> **适用对象**：任何需要向 governance 框架添加新能力的开发者。

---

## 前置知识

- **Capability** = 表达"意图"(intent) 的纯函数模块，返回 `pass | block | inject`
- **Hook** = 执行"动作"的运行时入口，调用 Capability 获取意图后执行
- **正交原则**：Capability 只判断，Hook 只执行。同一 Capability 可被多 Hook 复用
- **配置驱动**：`.governance/hooks/config.json` 声明哪些 Capability 在哪些 Hook 中启用

详见 [`README.md`](README.md) 的类型定义和复用矩阵。

---

## 7 步流程

### Step 1 — 定义职责与意图

回答三个问题（写在本步产出物的文件头注释中）：

1. **这个 Capability 做什么？**（一句话，动词开头）
2. **它返回什么 intent？**（`pass` / `block` / `inject`，可多选取决于 HookEvent.type）
3. **它被哪些 Hook 调用？**（SessionStart / PreToolUse / PostToolUse / PreCompact / 手动）

**反模式**：如果一个 Capability 需要在所有 4 种 Hook 中都返回不同 intent，说明职责太宽，应该拆分。

### Step 2 — 定义接口 (`types.ts`)

创建 `capabilities/<name>/types.ts`，包含：

```typescript
// types.ts — <name> Capability 类型定义 (GV-6 §N)

// 1. 继承共用类型（从 git-checker/types.ts 复制或从 README §一 引用）
export interface SessionContext { /* ... 见 README §一 ... */ }
export interface HookEvent { /* ... 见 README §一 ... */ }
export interface CapabilityInput { ctx: SessionContext; event: HookEvent; }

// 2. 定义 Input（继承 CapabilityInput，加 args）
export interface MyCapInput extends CapabilityInput {
  args: {
    // 配置参数（从 hooks/config.json 传入）
    threshold: number;
    path: string;
    // ...
  };
}

// 3. 定义 Result（intent + data + metadata）
export interface MyCapResult {
  intent: "pass" | "block" | "inject";
  data?: {
    // intent=block 时附 reason；intent=inject 时附 additionalContext
    reason?: string;
    additionalContext?: string;
    // 其他返回数据
  };
  metadata?: {
    // 可选：错误信息、诊断数据
    error?: string;
  };
}
```

**规则**：
- `args` 中的每个字段必须对应 `hooks/config.json` 中的配置项
- `data.reason` 仅在 `intent=block` 时有意义
- `data.additionalContext` 仅在 `intent=inject` 时有意义
- `metadata` 永远可选——用于诊断，不用于逻辑分支

### Step 3 — 实现 (`index.ts`)

创建 `capabilities/<name>/index.ts`：

```typescript
// index.ts — <name> Capability 实现 (GV-6 §N)
// <职责描述，一句话>

import { ... } from "node:fs";  // 零外部依赖，仅用 Node 内置
import type { MyCapInput, MyCapResult } from "./types.js";

export * from "./types.js";

export async function myCapability(input: MyCapInput): Promise<MyCapResult> {
  const { ctx, event, args } = input;

  // 1. 前置检查（非 git 仓库 / 文件不存在等 → pass，不阻断）
  // 2. 核心逻辑（根据 event.type 分支）
  // 3. 返回 intent + data + metadata
}
```

**实现规范**：

| 规范 | 要求 | 理由 |
|------|------|------|
| 零外部依赖 | 仅 `node:` 内置模块 | 插件自包含，同步到 CLI 时不装 npm 包 |
| 同步 vs 异步 | 函数签名 `async`，内部可用同步 API | Hook 层 `beforeTool` 需同步返回 `skip`——见 Step 6 |
| 失败安全 | 任何异常 → `pass`（不阻断） | 宁可放过，不可误杀 |
| 超时保护 | `execSync` 必须 `{ timeout: 5000 }` | 防止挂起会话 |
| 路径截断 | 文件列表 `slice(0, 20)` | 防止注入超长 |

### Step 4 — 注册到 Plugin (`plugin/index.ts`)

在 `.governance/plugin/index.ts` 的对应 Hook 分发逻辑中接入：

**4a. 如果是 SessionStart（同步预加载）**：

在 `preloadSessionContext()` 函数中添加同步读取逻辑。参考现有 `handoff-provider` 和 `git-checker` 的 SessionStart 分支——它们在 `preloadSessionContext()` 中内联实现（因为 `registerRule.content()` 必须同步返回）。

**4b. 如果是 PreToolUse（`beforeTool` hook）**：

在 `hooks.beforeTool(context)` 中添加调用。注意 `beforeTool` 必须**同步返回** `{ skip: true, reason }`——所以 Capability 逻辑必须用同步 API（`execSync` / `readFileSync`），不能用 `await`。

**4c. 如果是 PreCompact（`beforeModel` hook）**：

在 `hooks.beforeModel(context)` 中调用 `detectCompaction()` → `dispatchPreCompact()`。参考现有 `snapshot-writer` 接入方式。PreCompact 可以用异步 API。

**4d. 如果是 PostToolUse（`afterTool` hook）**：

在 `hooks.afterTool(context)` 中添加调用。当前 `post-tool` 配置 `enabled: false`，新 Capability 需先在 config.json 中启用。

### Step 5 — 配置 (`hooks/config.json`)

在 `.governance/hooks/config.json` 的对应 Hook 节点下添加 capability 配置：

```json
{
  "session-start": {
    "enabled": true,
    "capabilities": {
      "handoffProvider": { "enabled": true, "args": { /* ... */ } },
      "gitChecker": { "enabled": true, "args": { /* ... */ } },
      "myNewCap": {
        "enabled": true,
        "args": {
          "threshold": 10,
          "path": ".governance/some-file.md"
        }
      }
    }
  }
}
```

**规则**：
- `args` 字段名必须与 `types.ts` 中 `MyCapInput.args` 完全一致
- 每个新 Capability 都需要 `enabled: true` 才会被加载
- 如果 Capability 在多个 Hook 中使用，需要在每个 Hook 节点下分别配置

### Step 6 — 测试

**6a. 单元测试**：

创建 `capabilities/<name>/test.ts`（参考 `rule-appender/test.ts`）：

```typescript
// test.ts — 手动测试脚本
// 运行: npx tsx capabilities/<name>/test.ts

import { myCapability } from "./index.js";

// Case 1: 正常路径
const result1 = await myCapability({
  ctx: { /* mock SessionContext */ },
  event: { type: "PreToolUse", timestamp: new Date().toISOString() },
  args: { threshold: 5, path: "test.md" },
});
console.assert(result1.intent === "pass", "Case 1 should pass");

// Case 2: 阈值触发
// Case 3: 文件不存在 → pass (不阻断)
// Case 4: 非 git 仓库 → pass
```

**6b. CLI 集成测试**：

1. 运行 `scripts/sync-governance-plugin.ps1` 同步到 CLI 发现路径
2. 启动 Cline CLI，检查 `plugin-loaded.marker` 是否更新
3. 验证 Capability 的预期行为（如 block 是否生效、inject 是否注入）
4. 参考测试计划：`docs/plugin/runtime-test-plan.md`

### Step 7 — 文档更新

1. **更新 `capabilities/README.md`**：在对应章节添加新 Capability 的职责、接口、算法、失败模式
2. **更新复用矩阵**（README §六）：标记新 Capability 在哪些 Hook 中使用
3. **更新实现状态表**（README §七）：标记设计✓、实现✓、阻塞项
4. **更新 `docs/handoff.md`**：在"新增文件"中记录

---

## 检查清单

完成 7 步后，逐项确认：

- [ ] `types.ts` 中 `args` 字段与 `config.json` 一一对应
- [ ] `index.ts` 零外部依赖（仅 `node:` 内置模块）
- [ ] `index.ts` 所有异常路径返回 `pass`（不阻断）
- [ ] `index.ts` 中 `execSync` 有 `timeout: 5000`
- [ ] 文件列表有 `slice(0, 20)` 截断
- [ ] `plugin/index.ts` 中对应 Hook 已接入分发逻辑
- [ ] `hooks/config.json` 中 `enabled: true`
- [ ] `sync-governance-plugin.ps1` 执行成功
- [ ] CLI 集成测试通过（marker 更新 + 行为验证）
- [ ] `capabilities/README.md` 已更新
- [ ] 如有跨目录依赖，已复制到插件安装路径并修正 import 路径

---

## 常见陷阱

### 1. 插件自包含约束

Capability 如果依赖 `../../capabilities/` 等跨目录 import，同步到 `~/.cline/plugins/installed/local/governance/` 后路径会断裂。

**解决**：同步脚本会复制整个 `capabilities/` 目录，import 路径必须改为 `../capabilities/`（相对于 `plugin/` 目录）。参考 `hooks/pre-compact.ts` 的 import 修正。

### 2. beforeTool 必须同步返回

`hooks.beforeTool(context)` 必须同步返回 `{ skip: true, reason }` 或 `undefined`。不能用 `await`。所以 PreToolUse 类 Capability 的逻辑必须用同步 API。

**反面**：`hooks.beforeModel(context)` 可以异步（返回 Promise），PreCompact 类 Capability 可以用 `await`。

### 3. intent=block 只在 PreToolUse 有效

`block` 意图只在 `beforeTool` hook 中有意义（返回 `{ skip: true, reason }`）。在 `SessionStart` 或 `PreCompact` 中返回 `block` 会被忽略。

### 4. SessionStart 预加载是同步的

`registerRule.content()` 必须同步返回字符串。所以 SessionStart 类 Capability 在 `preloadSessionContext()` 中是内联同步实现，不是调用异步 Capability 函数。这是设计权衡——Capability 的异步接口用于逻辑隔离，但在 SessionStart 场景下需要同步内联。

### 5. 配置路径是相对于 workspace 的

`hooks/config.json` 中的 `args.path` 等路径是相对于 workspace root 的。Capability 实现中需要用 `join(ctx.cwd, args.path)` 拼接绝对路径。

---

## 引用

- 类型定义与复用矩阵：[`README.md`](README.md)
- 接口契约：[`../core/constitution.md`](../core/constitution.md) + GV-7 §三
- 框架目录契约：[`../../docs/decisions/delivery-framework-design.md`](../../docs/decisions/delivery-framework-design.md)
- Plugin 运行时：[`../plugin/index.ts`](../plugin/index.ts)
- 同步脚本：[`../../scripts/sync-governance-plugin.ps1`](../../scripts/sync-governance-plugin.ps1)
- CLI 测试计划：[`../../docs/plugin/runtime-test-plan.md`](../../docs/plugin/runtime-test-plan.md)
- A/B 测试结论（前缀协同效应）：[`../../docs/decisions/investigation/ab-test-clinerules-conflict.md`](../../docs/decisions/investigation/ab-test-clinerules-conflict.md) §六
