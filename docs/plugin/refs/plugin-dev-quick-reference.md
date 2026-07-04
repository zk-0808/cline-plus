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
