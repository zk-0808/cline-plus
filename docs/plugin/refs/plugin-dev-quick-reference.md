# Cline Plugin 开发 Quick Reference

> **生命周期**：永久保留——plugin 开发知识库，随源码探查持续更新。
>
> **定位**：plugin 开发的**知识层**——骨架/hook/capability/契约/源码定位/坑点。与 [plugin-dev-sop.md](../plugin-dev-sop.md)（思考层）/ [cline-plugin-architecture-atlas.md](cline-plugin-architecture-atlas.md)（源码层）/ [development-summary.md](../development-summary.md)（经验层）互补。
>
> **触发时机**（宽松版）：
> - **强信号**：任何 plugin 相关对话开始时，与 SOP 一起读
> - **弱信号**：提到 messageBuilder / hook / rule / provider / capability 时查对应章节
> - **更新信号**：完成源码探查 / 实测验证 / bug 修复后，相关发现回流到本文件对应章节
>
> **内容来源**：Cline 官方文档/示例代码 + 本项目源码探查（investigation-note 系列）+ 实测验证。**不凭印象推断**。
>
> **当前版本基准**：
> - Cline CLI 3.0.37
> - VS Code Extension 4.0.x（plugin 系统不可用，见 §6）
> - SDK v0.0.56
> - 最近更新：2026-07-04（§13.2/§13.9 修订反映 ADR-007 registerRule 静态注入）

---

## 0. ~~重要前提：社区经验为空~~（⚠️ Stale，2026-06-27 作废，已删）

> 本节原结论"社区经验为空"经 [Marketplace 开发机制并行调查](../../decisions/investigation/investigation-note-marketplace-dev-mechanism.md) 证伪——npm `@cline/sdk` 周下载 234,966，官方 examples 11 个，Marketplace 上架 ~22 Plugins。原节已删除，不再占用篇幅。RCA 详见调查报告。

---

## 1. 最小可行 Plugin 骨架

来源：[官方 plugin examples README](https://github.com/cline/cline/tree/main/sdk/examples/plugins)

```ts
import type { AgentPlugin } from "@cline/core";
import { createTool } from "@cline/core";

const myPlugin: AgentPlugin = {
  name: "my-plugin",

  manifest: {
    capabilities: ["tools", "hooks"],  // 必须显式声明用到的能力
  },

  setup(api, ctx) {
    api.registerTool(createTool({ /* ... */ }));
  },

  hooks: {
    beforeRun({ snapshot }) { /* ... */ },
    afterRun({ result }) { /* ... */ },
  },
};

export default myPlugin;
```

**Capability ↔ api 方法对照**：

| Capability | 解锁的 api 方法 |
|------------|------------------|
| `tools` | `api.registerTool()` |
| `commands` | `api.registerCommand()` |
| `rules` | `api.registerRule()` |
| `skills` | bundled skills 自动发现 |
| `providers` | `api.registerProvider()` |
| `messageBuilders` | `api.registerMessageBuilder()` |
| `automationEvents` | `api.registerAutomationEventType()` + `ctx.automation?.ingestEvent()` |
| `hooks` | runtime 生命周期回调 |

---

## 2. Hook 完整生命周期

```text
beforeRun     → 运行循环开始前
  beforeModel   → 每次模型请求前
  afterModel    → 每次模型响应后、工具执行前
  beforeTool    → 每次工具执行前（可返回 { skip: true } 拦截）
  afterTool     → 每次工具执行后
afterRun      → 运行循环结束后（成功/失败/中断都触发）
onEvent       → 任何 AgentRuntimeEvent 触发
```

**P5 实验关键点**：
- **`registerMessageBuilder`** 是 compact 的首选入口（不是 `beforeModel` hook）。原因：messageBuilder 运行在核心消息流水线，先于 Cline 内置安全 builder，多个 builder 按注册顺序运行
- **`session_start` hook 不在 plugin 的 `hooks` 字段里**——它在更底层的 hook stages 列表里。**待 Phase 2 源码确认**如何在 plugin 中注册
- `afterRun` 触发条件：`result.status === "completed"` 才是成功，aborted/failed 也会触发

---

## 3. 文件 Hook vs Plugin Hook 区别（重要）

| 文件 Hook（.cline/hooks/） | 文件事件 | 后端 runtime hook |
|--------------------------|---------|------------------|
| `TaskStart` | agent_start | beforeRun |
| `TaskResume` | agent_resume | beforeRun（带 resume context）|
| `UserPromptSubmit` | prompt_submit | beforeRun（带 prompt context）|
| `PreToolUse` | tool_call | beforeTool |
| `PostToolUse` | tool_result | afterTool |
| `TaskComplete` | agent_end | afterRun（completed）|
| `TaskError` | agent_error | afterRun（failed）|
| `TaskCancel` | agent_abort | afterRun 或 session shutdown |
| `SessionShutdown` | session_shutdown | session cleanup |

**官方使用建议**：
- **文件 Hook** → 用户/工作区配置的外部脚本
- **Plugin Hook** → 可复用扩展，需要类型化运行时访问

**对项目的意义**：本项目的 Plugin 走类型化路径；文件 Hook 仅当用户想自定义时使用。

---

## 4. 单文件 Plugin vs Package Plugin

### 单文件 Plugin（实验首选）

- 一个 `.ts` 或 `.js` 文件，导出 `AgentPlugin`
- 只能 import Node 内置和 `@cline/*` 包
- 安装：`cline plugin install https://github.com/owner/repo/blob/main/file.ts`

**P5 实验直接用这种**。

### Package Plugin（生产分发）

- 一个目录，含 `package.json` + `cline` 字段
- 可声明 npm 依赖
- 可绑定 Skills
- 安装：`cline plugin install https://github.com/owner/repo.git[@ref]`

```json
{
  "name": "my-cline-plugin",
  "version": "1.0.0",
  "cline": {
    "plugins": [
      {
        "paths": ["./index.ts"],
        "capabilities": ["tools", "hooks"]
      }
    ]
  },
  "peerDependencies": {
    "@cline/sdk": "*"
  },
  "peerDependenciesMeta": {
    "@cline/sdk": { "optional": true }
  }
}
```

**关键**：`@cline/*` 由 host 运行时提供，安装时会被剥离。声明为 optional peer dep。

---

## 5. 分发渠道（4 种）

| 方式 | 命令 | 适用 |
|------|------|------|
| 文件 URL | `cline plugin install https://github.com/.../file.ts` | 单文件实验/分享 |
| Git 仓库 | `cline plugin install https://github.com/owner/repo.git[@ref]` | 完整 Package |
| npm | `cline plugin install npm:@scope/my-plugin` | 正式发布 |
| 本地路径 | `cline plugin install ./my-plugin` | 本地开发 |

**P5 实验路径建议**：本地路径 → 验证后再考虑发布

---

## 6. 关键约束（VS Code/JetBrains 当前不支持）

来源：[customization/plugins](https://docs.cline.bot/customization/plugins) 顶部

> "This feature currently only applies to Cline SDK, CLI, and Kanban. **This feature is not applicable on VSCode and JetBrains Extension for now.**"

**对本项目的重大影响**：

| 你的当前工作流 | Plugin 可用性 |
|--------------|---------------|
| VS Code 里用 Cline | ❌ Plugin **不支持** |
| Cline CLI | ✅ 支持 |
| Cline Kanban | ✅ 支持 |
| 用 `@cline/sdk` 自建 Agent | ✅ 支持 |

**这条直接影响 ADR-002 P5 实验的可行性**——你日常在 VS Code 里用 Cline，P5 plugin 你**装不进去**。要跑实验必须切到 CLI 或自建 SDK 应用。

这是 Phase 1 漏掉的核心信息，**必须在 ADR-002 / P5 实验计划里反映**。

---

## 7. 官方设计准则（plugin design guidelines）

直接照搬官方 5 条：

1. **factory 函数 vs 直接导出**——需要配置时用 `createXxxPlugin(config)`，不需要就直接 export plugin object
2. **`setup()` 必须同步且快**——它运行在第一次 LLM 调用前，任何 async 初始化都会延迟 agent
3. **所有 tools 在 `setup()` 注册**——不要在 lifecycle hook 里注册，tool 必须在第一次 iteration 前就可用
4. **lifecycle hooks 只用于观察**（日志、metrics、审计），不用于改变行为。要改变行为用 `beforeModel`/`beforeRun` 调整 prompt 或 context
5. **hooks 里的错误要优雅处理**——`beforeTool` 抛错会算作 tool 失败。纯观察性 hook 内部 catch

---

## 8. messageBuilder vs beforeModel hook 选择

| 维度 | `registerMessageBuilder` | `hooks.beforeModel` |
|------|------------------------|--------------------|
| 何时用 | 可复用 / plugin-owned 压缩策略 | 需要 runtime hook context 或直接 mutate request |
| 执行位置 | 核心消息流水线，**先于** Cline 内置安全 builder | runtime 内部 |
| 多个并存 | 按注册顺序串行 | 同上 |
| 最终保护 | 之后还有 provider-safe truncation 兜底 | 同上 |

**默认选 messageBuilder**——只有需要 runtime snapshot 时才退而求其次。

---

## 9. 关键代码样例索引

P5 实验直接参考的官方样例：

| 文件 | 关键能力 | 适用 P5 子任务 |
|------|---------|---------------|
| [`weather-metrics.ts`](https://github.com/cline/cline/blob/main/sdk/examples/plugins/weather-metrics.ts) | tool + 完整 hook 套餐 + 推 git push 拦截 | **首读样例**，看完整 plugin shape |
| [`custom-compaction.ts`](https://github.com/cline/cline/blob/main/sdk/examples/plugins/custom-compaction.ts) | `registerMessageBuilder` 实现 compact | **核心参考**——ADR-001 A 项实现的直接母本 |
| [`custom-compaction-hook.example.ts`](https://github.com/cline/cline/blob/main/sdk/examples/hooks/custom-compaction-hook.example.ts) | `beforeModel` hook 版 compact | 备选 |
| [`mac-notify.ts`](https://github.com/cline/cline/blob/main/sdk/examples/plugins/mac-notify.ts) | `afterRun` 触发桌面通知 | 学习生命周期触发外部副作用 |
| [`gitignore-read-files-guard.ts`](https://github.com/cline/cline/blob/main/sdk/examples/plugins/gitignore-read-files-guard.ts) | `beforeTool` 返回 `{ skip: true }` 拦截 | 学习 tool 拦截模式 |
| [`env-blocker.ts`](https://github.com/cline/cline/blob/main/sdk/examples/plugins/env-blocker.ts) | secret 防护 | 安全规则机制化范本 |
| [`background-terminal.ts`](https://github.com/cline/cline/blob/main/sdk/examples/plugins/background-terminal.ts) | 启动后台 shell + steer message 回写 | terminal-watchdog 机制候选（mechanism-candidates #1）|
| [`automation-events.ts`](https://github.com/cline/cline/blob/main/sdk/examples/plugins/automation-events.ts) | plugin 推送 automation event | 调度类机制 |
| [`typescript-lsp-plugin`](https://github.com/cline/typescript-lsp-plugin) | 完整 Package Plugin 案例 | **生产分发参考** |

---

## 10. ~~对 ADR-002 P5 计划的调整建议~~（⚠️ Stale，2026-07-04 删除）

> 原节内容（P5 实验环境要求 + fork custom-compaction.ts）已 stale——P5 实验已暂停（[ADR-004](../../decisions/adr/)），context-snapshot 插件已独立开发至 v0.7.x。原节已删除。

---

## 11. ~~一键启动 P5 实验的最小步骤~~（⚠️ Stale，2026-07-04 删除）

> 原节内容（P5 实验一键启动步骤）已 stale。当前 plugin 本地安装步骤见 [SOP §0.5 一轮跑完清单](../plugin-dev-sop.md)。原节已删除。

---

## 12. ~~给本项目的 5 条结论~~（⚠️ Stale，2026-07-04 删除）

> 原节 5 条结论已 stale——P5 已暂停、社区经验判定已作废（§0）。当前结论见 [development-summary.md](../development-summary.md) 能力矩阵。原节已删除。

---

## 13. 源码探查产出回流（2026-07-04 新增）

> 本节收纳后续源码探查的产出，作为 §1-§9 官方资料的补充。每条标注来源 investigation-note + Verified 状态。

### 13.1 messageBuilder 调用时机（Verified）

来源：[investigation-note-cline-runtime-probe.md](../../decisions/investigation/investigation-note-cline-runtime-probe.md) + [investigation-note-cli-plugin-verification.md](../../decisions/investigation/investigation-note-cli-plugin-verification.md)

- **build() 在每次 turn 准备时被调用**（非仅 compact 时）——4 消息会话 = 4 次 build() 调用
- **messageBuilder 在原生 compact 判定之前执行**（非之后）——这意味着 messageBuilder 拿到的是 compact **前**的完整 messages，无法观察 compact 后产物
- **多个 messageBuilder 按注册顺序串行执行**

**对设计的影响**：要做"compact 后抽 semantic object"必须用 beforeModel hook（方案 E），不能用 messageBuilder。详见 [thin-adapter-layer-design.md](../../decisions/thin-adapter-layer-design.md)。

### 13.2 rules 注入频率（Verified）

来源：[investigation-note-cline-runtime-probe.md](../../decisions/investigation/investigation-note-cline-runtime-probe.md) §2.4 + [investigation-note-cli-plugin-verification.md](../../decisions/investigation/investigation-note-cli-plugin-verification.md)

- **registerRule 的 content 函数只在 session 启动时求值一次**——运行时永不重新求值
- **不能用 registerRule 做动态 per-turn 内容注入**（如 per-turn 变化的 loop guard warning）

**对设计的影响**（ADR-007 修订）：handoff 和 snapshot 是 **session-start 静态资产**——启动时读一次正是它们要的语义。registerRule "求值一次"契约恰好匹配。当前实现：setup() 预加载 I/O → module state → content() 纯函数读 state → registerRule 双 id（`handoff-context` / `snapshot-context`）独立注入。**不能用 registerRule 的是动态 per-turn 内容**（那部分走 messageBuilder 或 beforeModel），但静态资产走 registerRule 是正确路径。详见 [ADR-007](../../decisions/adr/ADR-007-snapshot-registerRule-static-injection.md)。

> ⚠️ **Phase 3 实测发现**：messageBuilder 注入的 system 消息被 cline agent 训练偏好压过，模型忽略注入内容；registerRule 注入到系统提示词顶层后模型直接引用。静态内容**必须走 registerRule**，不走 messageBuilder。

### 13.3 estimateTokensFromChars 不可用（Verified）

来源：[investigation-note-cli-plugin-verification.md](../../decisions/investigation/investigation-note-cli-plugin-verification.md) V2

- **`@cline/shared` 的 `estimateTokensFromChars` 返回值异常低**——16K 字符 → 297 tokens（预期 ~4,000）
- **不可用于 token 估算**，差 ~13 倍
- **替代方案**：`Math.ceil(text.length / 4)` 标准英文近似

**对设计的影响**：context-snapshot 已删除自研 `shouldCompact` + `estimateTokens`（阶段 1 清理），改用 beforeModel 长度突变检测原生 condense。详见 [project-rules-thin-adapter.md §1](../project-rules-thin-adapter.md)。

### 13.4 serializeMessage block type 不匹配（Verified）

来源：[investigation-note-cli-plugin-verification.md](../../decisions/investigation/investigation-note-cli-plugin-verification.md) V3 + Bug 2

- **Cline 实际消息的 block type 不在 `text / thinking / tool_use / tool_result / file` 枚举中**
- 所有 block 落入 `default` 分支，只输出 `[role type block]` 标签（不含内容）
- **修复**：`default` 分支改为 `JSON.stringify(block).slice(0, 2000)`

**坑点**：写 extractor 时不要硬编码 block type 枚举，用 `JSON.stringify` 兜底。

### 13.5 双重 setup() 现象（Verified）

来源：[investigation-note-dual-setup.md](../../decisions/investigation/investigation-note-dual-setup.md)

- **CLI 3.0.34 每次 `cline -i` 启动时 setup() 被调用两次**，间隔 300-500ms
- 第一条 workspace=unknown，第二条 workspace=实际路径
- messageBuilder.build() 也成对出现（每 turn 两次）
- **3.0.33 为单 setup，3.0.34 升级引入**

**坑点**：setup() 里不要做幂等性假设——注册逻辑必须能承受双调用。context-snapshot 的 `api.registerMessageBuilder()` / `api.registerTool()` 已验证可承受双调用。

### 13.6 codec bug 路径 A/B（Verified）

来源：[investigation-note-cli-codec-content-map-bug.md](../../decisions/investigation/investigation-note-cli-codec-content-map-bug.md) O8

- **路径 A（MCP tool_result）**：content 经 JSON.stringify 有损转换变非数组
- **路径 B（beforeModel 注入）**：beforeModel 返回 content 为 string 类型，codec `Nd` 函数调 `n.content.map()` 必崩——**与消息数量/token 总量无关**，任何步骤下 beforeModel 返回 string content 都会崩溃

**坑点**：所有 hook / messageBuilder 返回的 messages 必须用 `ContentBlock[]` 格式，禁止 string content。详见 [project-rules-thin-adapter.md §5](../project-rules-thin-adapter.md)。

### 13.7 原生 compaction 阈值与产物（Verified）

来源：[investigation-note-native-condense-c-hooks.md](../../decisions/investigation/investigation-note-native-condense-c-hooks.md) + [investigation-note-beforemodel-timing-verify.md](../../decisions/investigation/investigation-note-beforemodel-timing-verify.md)

- **CLI 3.0.34 原生 compaction 阈值**：`maxInputTokens=200K, thresholdRatio=0.9, reserveTokens=16384` → 触发点 ~180K tokens
- **无 CLI flag/env var 可调**——不能用配置降低阈值做测试
- **agentic compaction 产物含 `metadata.kind="compaction_summary"`**——可用于检测 compaction 发生
- **beforeModel 在原生 compaction 之后执行**（源码 `agents/dist/index.js` L65 `prepareTurnForModelRequest → beforeModel`）

**对设计的影响**：短对话无法触发 compaction（需 180K tokens），实测需等 PR #12032 修复 codec bug 后才能跑长对话。详见 [dev-rules.md §1.15](../../dev-rules.md)。

### 13.8 源码文件定位速查（Verified）

来源：[investigation-note-cline-runtime-probe.md](../../decisions/investigation/investigation-note-cline-runtime-probe.md) §2

| 主题 | 关键文件 |
|------|---------|
| compact 执行链 | `sdk/packages/core/src/extensions/context/compaction.ts` + `basic-compaction.ts` + `agentic-compaction.ts` |
| compact 设计意图 | `sdk/ARCHITECTURE.md` §9 |
| messageBuilder 服务 | `sdk/packages/core/src/session/services/message-builder.ts` |
| turn-preparation 调用点 | `sdk/packages/agents/src/agent-runtime.ts`（`prepareTurnForModelRequest`）|
| rules 注入 | `sdk/packages/core/src/extensions/config/user-instruction-plugin.ts` |
| contribution 注册表 | `sdk/packages/shared/src/extensions/contribution-registry.d.ts` |
| checkpoint 机制 | `sdk/packages/core/src/session/checkpoint-restore.ts` + `checkpoint-diff.ts` + `session-snapshot.ts` |

**与 atlas 的关系**：atlas 覆盖 plugin 子系统 7 文件（discovery/install/load/sandbox/runtime），本表覆盖 core/agents 层的运行时文件。两者互补。

### 13.9 beforeRun / beforeTool / beforeModel hook 契约（Verified，Phase 0）

来源：CLI 3.0.34 `@cline/shared/dist/agent.d.ts` L184-248（[hook-auto-injection-design.md Phase 0](../../decisions/hook-auto-injection-design.md)）

**AgentRuntimeHooks 7 回调签名**（L238-248）：

| Hook | Context 类型 | 返回类型 | 能否注入 messages |
|------|-------------|---------|------------------|
| `beforeRun` | `AgentRunLifecycleContext` = `{ snapshot }` | `AgentStopControl` = `{ stop?, reason? }` | ❌ **不能** |
| `afterRun` | `AgentRunLifecycleContext & { result }` | `void` | ❌ |
| `beforeModel` | `AgentBeforeModelContext` = `{ snapshot, request }` | `AgentBeforeModelResult` = `{ stop?, reason?, messages?, tools?, options? }` | ✅ **能**（替换整个 messages）|
| `afterModel` | `AgentAfterModelContext` = `{ snapshot, assistantMessage, finishReason }` | `AgentStopControl` | ❌ |
| `beforeTool` | `AgentBeforeToolContext` = `{ snapshot, tool, toolCall, input }` | `AgentBeforeToolResult` = `{ skip?, stop?, reason?, input?, policy? }` | N/A（控制工具执行）|
| `afterTool` | `AgentAfterToolContext` = `{ snapshot, tool, toolCall, input, result, startedAt, endedAt, durationMs }` | `AgentAfterToolResult` = `{ stop?, reason?, result? }` | N/A |
| `onEvent` | `AgentRuntimeEvent` | `void` | ❌ |

**关键坑点**：

1. **beforeRun 不能注入 messages**——返回类型 `AgentStopControl` 只有 `stop`/`reason`。静态内容（handoff/snapshot）走 **registerRule**（ADR-007）；动态 per-turn 内容走"beforeRun 写 module state + messageBuilder 读取注入"模式（方式 B，但注意 messageBuilder 服从度不足——见 §13.2 ⚠️）。
2. **beforeRun context 无 workspacePath**——`AgentRunLifecycleContext` 只有 `snapshot`。workspacePath 必须在 `setup()` 时从 `PluginSetupContext.workspaceInfo.rootPath` 闭包捕获（CLI plugin 路径）。
3. **beforeModel 是唯一能替换 messages 的 hook**——返回 `messages?` 字段会替换整个 in-memory transcript（`agent.d.ts` L302-307 注释："When it returns messages, the runtime replaces its in-memory transcript so compaction persists into the final run result"）。
4. **beforeTool skip vs stop**——`skip` 跳过本次工具调用（run 继续）；`stop` 停止整个 run。commit 守卫用 `skip`。
5. **所有 hook 返回的 messages 必须用 `AgentMessage[]` + `AgentMessagePart[]` 格式**——content 不能是 string（与 §13.6 codec bug 一致）。

**对设计的影响**：静态内容（handoff/snapshot）走 registerRule 双 id 注入（ADR-007）；方式 B（module state → messageBuilder）仅用于动态 per-turn 内容，且服从度不足（见 §13.2）。详见 [hook-auto-injection-design.md §3.2](../../decisions/hook-auto-injection-design.md)（已修订）。

### 13.10 CLI 3.0.37 工具名变更（Verified，E2E）

来源：CLI E2E 测试 2026-07-04 + `@cline/shared/dist/hub.d.ts` `HubToolExecutorName`

**CLI 3.0.37 重命名了全部工具**：

| 旧名（≤3.0.34） | 新名（3.0.37+） | 说明 |
|----------------|----------------|------|
| `write_to_file` | **`editor`** | 文件创建/编辑（合并） |
| `replace_in_file` | **`editor`** | 文件编辑（合并入 editor） |
| `insert_content` | **`editor`** | 文件插入（合并入 editor） |
| `search_and_replace` | **`editor`** | 搜索替换（合并入 editor） |
| `execute_command` | **`run_commands`** | 命令执行 |
| `read_file` | **`readFile`** | 文件读取（camelCase） |
| — | **`applyPatch`** | diff patch（新增） |
| — | **`bash`** | shell 命令（新增，与 run_commands 并存） |

**完整 HubToolExecutorName**（hub.d.ts L311）：
```typescript
"readFile" | "search" | "bash" | "webFetch" | "editor" | "applyPatch" | "skills" | "askQuestion" | "submit"
```

**E2E 验证**：commit 守卫 WRITE_TOOL_NAMES 使用旧名 `write_to_file` → CLI 实际调用 `editor` → guard 不触发 → 模型成功创建所有文件。**修复后**（加入 `editor`）→ 第 3 次 `editor` 调用被 skip，模型收到 reason。

> ⚠️ **教训**：工具名是 CLI 版本相关的。plugin 代码里硬编码工具名时，必须同时覆盖新旧名（向后兼容），或在文档里标注"verified on CLI X.Y.Z"。写 beforeTool/afterTool 过滤逻辑时，先 `cline -i` 跑一次看实际 toolCall.toolName。

### 13.11 plugin 同步路径陷阱（Verified）

来源：CLI E2E 调试 2026-07-04

**Copy-Item 的 src vs src\* 区别**：

```powershell
# ❌ 错误：把 src 目录本身复制到目标下，变成 src\src\*
Copy-Item "E:\cline++\context-snapshot\src" -Destination "C:\...\context-snapshot\src" -Recurse -Force

# ✅ 正确：复制 src 目录的*内容*到目标
Copy-Item "E:\cline++\context-snapshot\src\*" -Destination "C:\...\context-snapshot\src\" -Recurse -Force
```

**双重安装目录**：CLI 扫描 `~/.cline/plugins/installed/` 和 `~/.cline/plugins/_installed/`（后者可能是 junction）。两个目录都必须同步，否则 CLI 可能加载旧代码。

**验证方法**：同步后检查目标文件的 `LastWriteTime` 和内容（如 `Select-String` 搜索关键标记），不要只看 Copy-Item 无报错就认为成功。

> ⚠️ **教训**：sync-and-test.ps1 用 `src\*`（正确），手动同步容易漏掉通配符。建议始终用脚本同步。

### 13.12 registerRule 注入点源码定位（✅ Fully Verified，2026-07-05 新增 / 2026-07-06 第二轮探查完成）

来源：[investigation-note-cline-prompt-layering.md](../../decisions/investigation/investigation-note-cline-prompt-layering.md)（5 subagent 并行探查）+ [investigation-note-cline-prompt-layering-round2.md](../../decisions/investigation/investigation-note-cline-prompt-layering-round2.md)（第二轮应用层穿透）

> ✅ **第二轮探查完成**(2026-07-06):已穿透到 cline 应用层，确认 `buildClineSystemPrompt()` 在 `sdk/packages/shared/src/prompt/cline.ts:72-105`。base prompt 是单体模板（~600 token），`{{CLINE_RULES}}` 占位符在 VS Code 路径被替换为空字符串。registerRule 追加在 base prompt 末尾，不被覆盖。第 6 场景（context window 挤出）经 Task I 验证**不成立**——base prompt + registerRule 总量 <2k token。

**注入点源码位置**：`sdk/packages/core/src/runtime/orchestration/session-runtime-orchestrator.ts:657-666`（`composeSystemPrompt()` 方法）

**注入机制**：`mergeSystemPromptRules(base, rules)`（同文件 :95-106）纯字符串拼接：

```typescript
function mergeSystemPromptRules(systemPrompt: string, rules: ReadonlyArray<string>): string {
    const base = systemPrompt.trim();
    const additional = rules.map(r => r.trim()).filter(Boolean).join("\n\n");
    if (base && additional) return `${base}\n\n${additional}`;
    return base || additional;
}
```

**最终 System Prompt 结构**：

```
┌─────────────────────────────────────────────┐
│ Base System Prompt (模板 + 占位符替换)        │
│  - {{CLINE_RULES}} → .clinerules 文件规则    │
│  - {{CLINE_METADATA}} → 工作区元数据          │
├─────────────────────────────────────────────┤
│ registerRule 注册的规则 (mergeSystemPrompt   │
│ Rules append 在 base 之后,独立段落)           │
│  - 格式: ## rule-name → content              │
└─────────────────────────────────────────────┘
```

**关键结论**：
- ✅ registerRule 注入**不被内置 RULES 段落覆盖**（mergeSystemPromptRules 是纯 append,不替换）
- ✅ **无长度截断**——cline 不主动截断 system prompt,由 API 层 context window 兜底
- ✅ **content 支持 lazy function**——`() => string | Promise<string>`,每次 run 时调用 composeSystemPrompt 实时求值
- ⚠️ **同名覆盖风险**——多目录同名 rule 后者静默替换前者（`records.set(id, ...)`），建议用 namespace 前缀避坑（如 `governance:constitution`）
- ⚠️ **Rule 按 name 字母序排列**——无 priority/weight 字段,先注册后注册无影响

### 13.13 Rule 失效场景（✅ Fully Verified，2026-07-05 新增 / 2026-07-06 第二轮探查完成）

来源：[investigation-note-cline-prompt-layering.md](../../decisions/investigation/investigation-note-cline-prompt-layering.md) Task E + [investigation-note-cline-prompt-layering-round2.md](../../decisions/investigation/investigation-note-cline-prompt-layering-round2.md) Task J

| # | 场景 | 触发条件 | 表现 | 可排查性 |
|---|------|----------|------|----------|
| ① | 显式禁用 | frontmatter `disabled: true` 或 `enabled: false` | rule 不出现 | ✅ 明确 |
| ② | 解析失败 | YAML 格式错误、空 body、缺 name | rule 静默消失 | ⚠️ 无用户提示 |
| ③ | 目录未加载 | rule 文件不在 watcher 监控目录 | rule 不存在 | ⚠️ 需检查目录配置 |
| ④ | 同名覆盖 | 多目录存在同名 rule,后者覆盖前者 | 静默替换 | ⚠️ 需检查多目录加载顺序 |
| ⑤ | Prompt 过长 | rule 总量超出 context window | API 层截断或报错 | ❌ cline 无主动管理 |
| ⑥ | **位置+服从惯性**(2026-07-06 第二轮探查修正) | registerRule 在 base prompt 末尾追加,模型对 base prompt 前半部分指令有更强服从倾向;当 rule 与 base prompt 指令方向相反时,模型倾向遵循位置靠前的指令 | rule 技术上注入成功但模型不服从 | ⚠️ 需用行为指令前缀("DO NOT RE-READ")对抗 |

**唯一硬性跳过条件**：`disabled === true`（[rules.ts](../../decisions/investigation/result-task-e.md) `isRuleEnabled`）——无 frontmatter 条件逻辑、无 when/condition、无环境变量判断。

**.clinerules 搜索路径优先级**（前 4 个,完整 7 个见源码）：
1. `${workspace}/AGENTS.md`
2. `${workspace}/.clinerules/`
3. `${workspace}/.cline/rules/`
4. `~/.agents/AGENTS.md`

**调试建议**：rule 不生效时,按 ①→②→③→④→⑤ 顺序排查。最常见的"实测发现 rule 不生效"根因是 ④（同名覆盖）,非 cline 内置 RULES 覆盖。

---

## 14. 验证脚本模板（Verified，2026-07-05 新增）

> **来源**：抽象自 [verify-hook-injection.cjs](../../../context-snapshot/verify-hook-injection.cjs) 3-test 结构。该脚本 Phase 3 实测 PASS，覆盖核心功能 + 辅助功能 + 降级场景。
>
> **定位**：plugin 单元/集成验证的可复用骨架。SOP §4 验证档位 🟡 B / 🔴 C 推荐使用此模板。

### 14.1 三段式结构（核心功能 + 辅助功能 + 降级）

```javascript
/**
 * <Phase> 验证 — <被测模块名>
 * Run: node verify-<feature>.cjs
 */
const { <CoreClass> } = require("./dist/src/<path>.js");
const { <HelperClass> } = require("./dist/src/<path>.js");

const WORKSPACE = "<absolute-path>";

console.log("<Phase> — <Feature> Verification");
console.log(`Workspace: ${WORKSPACE}\n`);

// ─── Test 1: 核心功能 ───
console.log(`${"═".repeat(60)}`);
console.log("  Test 1: <CoreClass>");
console.log(`${"═".repeat(60)}`);

const core = new <CoreClass>();
const detectResult = core.detect(WORKSPACE);
console.log(`detect(): ${detectResult ? "✅ found" : "❌ not found"}`);

const loadResult = core.load(WORKSPACE);
console.log(`load().detected: ${loadResult.detected ? "✅" : "❌"}`);
console.log(`load().content length: ${loadResult.content.length} chars`);

// ─── Test 2: 辅助功能（如 git/tool 状态） ───
console.log(`\n${"═".repeat(60)}`);
console.log("  Test 2: <HelperClass>");
console.log(`${"═".repeat(60)}`);

const helper = new <HelperClass>();
const helperResult = helper.<primaryMethod>(WORKSPACE);
console.log(`<primaryMethod>(): ${helperResult.<flag> ? "✅" : "❌"}`);

const threshold = <N>;
const wouldBlock = helperResult.<flag> && helperResult.<count> >= threshold;
console.log(`Would block (threshold=${threshold}): ${wouldBlock ? "🚫 YES" : "✅ NO"}`);

// ─── Test 3: 降级场景（非 git / 空目录 / 边界值） ───
console.log(`\n${"═".repeat(60)}`);
console.log("  Test 3: 降级测试 (<edge-case-desc>)");
console.log(`${"═".repeat(60)}`);

const degrade = helper.<primaryMethod>("<non-workspace-path>");
console.log(`isRepo/valid: ${degrade.<flag> ? "✅" : "❌ (expected)"}`);
console.log(`Would block: ${degrade.<flag> && degrade.<count> >= threshold ? "🚫" : "✅ NO (降级正确)"}`);

// ─── Summary ───
console.log(`\n${"═".repeat(60)}`);
console.log("  SUMMARY");
console.log(`${"═".repeat(60)}`);
const t1Pass = detectResult && loadResult.detected && loadResult.content.length > 0;
const t2Pass = helperResult.<flag> && helperResult.<count> >= 0;
const t3Pass = !degrade.<flag>;
console.log(`Test 1 (<CoreClass>): ${t1Pass ? "✅ PASS" : "❌ FAIL"}`);
console.log(`Test 2 (<HelperClass>): ${t2Pass ? "✅ PASS" : "❌ FAIL"}`);
console.log(`Test 3 (降级): ${t3Pass ? "✅ PASS" : "❌ FAIL"}`);
const allPass = t1Pass && t2Pass && t3Pass;
console.log(`\nOVERALL: ${allPass ? "✅ PASSED" : "❌ FAILED"}`);
console.log(`\n注: hook 路由验证需 CLI 集成测试（需用户跑 cline -i）`);
process.exit(allPass ? 0 : 1);
```

### 14.2 三段式选型理由

| Test 段 | 验证目标 | 何时必填 | 何时可省 |
|--------|---------|---------|---------|
| **Test 1 核心功能** | 主类/主流程的 happy path | 必填 | — |
| **Test 2 辅助功能** | 协作类（git/tool/registry） | 涉及外部系统时 | 纯函数 / 无协作类 |
| **Test 3 降级场景** | 边界条件 / 错误恢复 | 涉及外部依赖时 | 纯内存逻辑 |

**降级场景的典型选择**：
- 非 git 工作区（`C:\Windows\System32` / 空目录）
- 字段缺失（`undefined` / 空字符串）
- 阈值边界（count = 0 / count = threshold-1 / count = threshold）

### 14.3 使用规范

1. **必填 summary + exit code**——CI 可集成（`process.exit(allPass ? 0 : 1)`）
2. **每个 Test 独立判定**——单 Test 失败不影响其他 Test 执行
3. **降级 Test 用"expected ❌"标注**——区分"预期失败"和"真失败"
4. **末尾注明 hook 路由限制**——单元验证不能替代 CLI 集成，避免误判"全 PASS = 功能可用"

### 14.4 适用档位（与 SOP §4 对齐）

| SOP 验证档 | 是否用本模板 | 替代/补充 |
|-----------|------------|----------|
| 🟢 A | 不必——1-2 次工具调用即可 | 直接调用即可 |
| 🟡 B | **推荐**——5-15 次工具调用档位用模板固化 | + instrument.log |
| 🔴 C | **必填**——长对话前先用模板跑过单元逻辑 | + CLI 集成测试 |

---

## 15. 代码骨架补全（2026-07-05 新增）

> **来源**：§16 差距分析识别的 5 处骨架缺口。本节补齐后，"只看 quick-reference 能否写出代码"的自足性大幅提升。

### 15.1 registerRule 骨架（ADR-007 双 id 模式）

```typescript
import type { AgentPlugin } from "@cline/core";

const myPlugin: AgentPlugin = {
  name: "my-plugin",
  manifest: { capabilities: ["rules"] },
  setup(api, ctx) {
    const workspacePath = ctx.workspaceInfo.rootPath;  // 闭包捕获

    // 预加载（I/O 在 setup 完成，content 只读——ADR-007 §5.1）
    let contentA = "";
    let contentB = "";
    try { contentA = loadAssetA(workspacePath); } catch (e) { console.error(`[my-plugin] A preload failed: ${e}`); }
    try { contentB = loadAssetB(workspacePath); } catch (e) { console.error(`[my-plugin] B preload failed: ${e}`); }

    // 双 id 独立降级（ADR-007）
    api.registerRule({ id: "asset-a-context", content: () => contentA });
    api.registerRule({ id: "asset-b-context", content: () => contentB });
  },
};
```

**关键约束**（来自 §13.2 + ADR-007）：
- `content()` 是纯函数——只读预加载 state，禁止 I/O
- `id` 唯一——多个 rule 用不同 id 独立注册
- "求值一次"——session 启动求值，运行时永不重求值，**只能用于静态资产**

### 15.2 registerMessageBuilder 骨架（动态 per-turn 内容）

```typescript
import type { AgentPlugin, AgentExtensionMessageBuilder } from "@cline/core";

const builder: AgentExtensionMessageBuilder = {
  id: "my-builder",
  build(ctx) {
    // ctx 含 snapshot / request / messages
    // ⚠️ content 必须是 ContentBlock[]，不能是 string（§13.6 codec bug）
    return [
      {
        role: "user",
        content: [{ type: "text", text: "injected per-turn context" }],
      },
    ];
  },
};

const myPlugin: AgentPlugin = {
  name: "my-plugin",
  manifest: { capabilities: ["messageBuilders"] },
  setup(api, ctx) {
    api.registerMessageBuilder(builder);
  },
};
```

**关键约束**（来自 §13.1 + §13.6 + ADR-007）：
- `build()` 每次 turn 都会被调用（非仅 compact 时）
- **服从度不足**——messageBuilder 注入的 system 消息被 cline agent 训练偏好压过（ADR-007），**静态内容优先走 registerRule**
- `content` 必须是 `AgentMessagePart[]` 数组，**禁止 string**

### 15.3 registerTool 骨架

```typescript
import type { AgentPlugin } from "@cline/core";
import { createTool } from "@cline/core";

const myTool = createTool({
  name: "my-tool",
  description: "做某件事",
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string", description: "目标" },
    },
    required: ["target"],
  },
  async execute({ input, ctx }) {
    // ctx 含 snapshot / workspacePath
    const result = doWork(input.target);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  },
});

const myPlugin: AgentPlugin = {
  name: "my-plugin",
  manifest: { capabilities: ["tools"] },
  setup(api) {
    api.registerTool(myTool);
  },
};
```

**关键约束**（来自 §7 官方设计准则）：
- 所有 tool 必须在 `setup()` 注册——不能在 lifecycle hook 里注册
- `execute` 返回 `content` 必须是 `ContentBlock[]`（同 §13.6）

### 15.4 setup() 闭包捕获 workspacePath（坑点 2 代码化）

```typescript
setup(api, ctx) {
  // ✅ 正确：从 PluginSetupContext 闭包捕获
  const workspacePath = ctx.workspaceInfo.rootPath;

  // ❌ 错误 1：从 beforeRun context 拿
  // hooks: { beforeRun(ctx) { const wp = ctx.workspacePath; } }  // undefined！

  // ❌ 错误 2：硬编码绝对路径
  // const workspacePath = "E:\\cline++";  // 不可移植

  // 闭包内所有 hook / rule / builder 都用这个 workspacePath
  api.registerRule({ id: "x", content: () => readAsset(workspacePath) });
}
```

**理由**（来自 §13.9 坑点 2）：`AgentRunLifecycleContext` 只有 `snapshot`，无 `workspacePath`。hook 运行时拿不到，必须 setup 时闭包捕获。

### 15.5 plugin 本地同步命令模板（合并 §13.11 陷阱）

```powershell
# 完整同步命令（PowerShell，全 ASCII）
$src = "E:\cline++\context-snapshot\src"
$dst1 = "$env:USERPROFILE\.cline\plugins\installed\local\context-snapshot\src"
$dst2 = "$env:USERPROFILE\.cline\plugins\_installed\local\context-snapshot\src"

# 用 src\*（不是 src）—— §13.11 陷阱
Copy-Item "$src\*" -Destination "$dst1\" -Recurse -Force
Copy-Item "$src\*" -Destination "$dst2\" -Recurse -Force

# 验证：检查 LastWriteTime + 关键标记
Get-ChildItem "$dst1\index.ts" | Select-Object LastWriteTime
Select-String -Path "$dst1\index.ts" -Pattern "registerRule" | Select-Object -First 3
```

**为什么必须同步两个目录**（来自 §13.11）：CLI 扫描 `installed/` 和 `_installed/`（后者可能是 junction），只同步一个会加载旧代码。

---

## 16. 文档自足性差距分析（2026-07-05 新增）

> **目的**：验证"只看 SOP + quick-reference 能否直接写出 plugin 代码"。本节是 P2 差距分析的产出，作为文档自洽性的基线。
>
> **方法**：以"plugin 开发者拿到这两份文档"为视角，按 8 个开发任务维度评估覆盖度。

### 16.1 覆盖度评估表

| # | 开发任务 | SOP 覆盖 | quick-reference 覆盖 | 自足性 | 备注 |
|---|---------|---------|---------------------|--------|------|
| 1 | 写一个新 hook（beforeTool/afterTool）| §1.1 契约速查 + §4 验证档 | §13.9 契约表 + §9 样例索引 | ✅ 自足 | 链路完整 |
| 2 | 写一条 registerRule（静态）| §1.1 契约速查 | §13.2 求值频率 + §15.1 骨架 + ADR-007 | ✅ 自足 | §15.1 补全后 |
| 3 | 写一个 messageBuilder（动态）| §1.1 契约速查 | §13.1 调用时机 + §15.2 骨架 | ✅ 自足 | §15.2 补全后；服从度警告已标 |
| 4 | 写一个 tool | §1.1 契约速查 | §9 样例索引 + §15.3 骨架 | ✅ 自足 | §15.3 补全后 |
| 5 | setup() 捕获 workspacePath | §3 红线（不假设）| §13.9 坑点 2 + §15.4 代码片段 | ✅ 自足 | §15.4 补全后 |
| 6 | 写验证脚本 | §4 验证档位 | §14 模板 | ✅ 自足 | §14 新增后 |
| 7 | 同步 plugin 到本地 | （未覆盖）| §13.11 陷阱 + §15.5 命令模板 | ✅ 自足 | §15.5 补全后 |
| 8 | 处理 codec bug / ContentBlock 格式 | §3 红线（不跳 tsc）| §13.6 路径 A/B + §13.9 坑点 5 | ✅ 自足 | 已有 |

### 16.2 已知残留缺口（非阻塞）

| 缺口 | 影响 | 缓解 | 修复时机 |
|------|------|------|---------|
| `automationEvents` 完整用法 | 无法写 automation event 类 plugin | §9 有样例索引 `automation-events.ts` | 用到时再补 |
| `providers` capability 完整用法 | 无法写 provider 类 plugin | §1 capability 表有入口 | 用到时再补 |
| `commands` capability 完整用法 | 无法写 command 类 plugin | §1 capability 表有入口 | 用到时再补 |
| `skills` 自动发现机制 | 不知如何打包 skill | §1 表注 "bundled skills 自动发现" | 用到时再补 |
| 长对话验证（🔴 C 档）的 codec bug workaround | 无法跑 ≥90K tokens 实测 | §13.7 注 "等 PR #12032" | PR 合并后补 |
| CLI 集成测试（cline -i）的标准流程 | 不知如何系统性跑 CLI E2E | handoff.md / SOP §0.5 提到 | 下次实测时回流 |

### 16.3 自足性结论

**补全前**（本会话 P2 启动时）：8 项中 3 项自足（#1/#8 部分 / §13.6），5 项有缺口（#2/#3/#4/#5/#6/#7）。

**补全后**（§14/§15 落地后）：8 项全部自足，残留 6 项非阻塞缺口（用到时再补）。

**复查触发条件**：若新增 capability 类型（automationEvents/providers/commands/skills）实际开发时，本节对应行需从"残留缺口"提升为"补全项"。

---
