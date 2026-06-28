# Cline Plugin 开发 Quick Reference

> P5 实验启动前的参考资料。**所有内容来自 Cline 官方文档/示例代码**，无凭印象推断。
> 调研日期：2026-06-23
> SDK 当前版本：v0.0.51

---

## 0. ~~重要前提：社区经验为空~~（⚠️ Stale，2026-06-27 作废）

> **⚠️ Stale 标注（2026-06-27，[ADR-002 Update 5](../../decisions/ADR-002-project-shape.md)）**：本节"社区经验为空"结论**作废**——经 [Marketplace 开发机制并行调查](../../decisions/investigation-note-marketplace-dev-mechanism.md) 4-subagent 并行核查证伪：
>
> - npm `@cline/sdk` 周下载 **234,966**（2026-06-27 fetch）
> - GitHub 外部贡献者 abeatrix **7 个 plugin development PR**（2026-05-19~06-23 合并）
> - 官方 plugin examples **11 个**（含 weather-metrics/custom-compaction/agents-squad）
> - 独立官方 plugin 仓库 `cline/typescript-lsp-plugin`
> - Marketplace 上架 **~22 Plugins / ~50 Skills / ~200 MCP**
>
> **RCA 根因**：原调查方法缺陷——把"无 how-to 博客"误等同为"无开发活动"（证据类型混淆 + 单源裁决）。详见调查报告 §C 号 Process Reviewer 5 Whys 分析。
>
> 本节原文保留用于追溯，但不应再作为决策依据。下方"后果"段已不适用——P5 实验不再是"为社区探路"，而是验证 #5 自有命题（messageBuilder + compact 双产物 + 检索索引）。

~~搜过 SDK plugin 开发的中英文社区经验、博客、踩坑记录 → **未发现任何有价值的二手沉淀**~~（已作废）
~~原因：`@cline/sdk` 仍是 0.x，文档刚推出不久，社区尚未形成实战经验沉淀~~（已作废）
~~**后果**：我们做 P5 实验时本质上就在为社区**探路**，每一处不顺手都值得记录回 `mechanism-candidates.md` 或新建 `plugin-dev-notes.md`~~（已作废）

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

## 10. 对 ADR-002 P5 计划的调整建议

基于本调研，**Validation Plan 的"最小可行 Plugin 范围"需要补充两点**：

1. **实验环境必须切到 CLI 或 SDK 自建**（VS Code Cline 当前不支持 plugin）。这要么改变工作流，要么 P5 必须走"开两个 Cline——VS Code 主用 + CLI 跑实验"双轨
2. **首个实验文件直接 fork `custom-compaction.ts`**，最小改造：
   - 在压缩同时写出 `handoff/auto-{ts}-{slug}.md`
   - 追加 `.cline/index.jsonl` 一行
   - 5KB 以内，单文件，本地路径安装

**这两个调整应该作为 ADR-002 的勘误反映回去**——否则按原 Validation Plan 跑会卡在"实验装不进 VS Code"这个起手关。

---

## 11. 一键启动 P5 实验的最小步骤（基于上述资料）

```bash
# 1. 安装 Cline CLI
npm i -g cline

# 2. 创建实验目录
mkdir -p experiments/handoff-probe-plugin
cd experiments/handoff-probe-plugin

# 3. fork custom-compaction.ts 作为起点
curl -O https://raw.githubusercontent.com/cline/cline/main/sdk/examples/plugins/custom-compaction.ts
mv custom-compaction.ts handoff-probe.ts

# 4. 改造（加 handoff 写出 + index.jsonl 追加）

# 5. 本地安装
cline plugin install ./handoff-probe.ts --cwd .

# 6. 验证装载
cline config  # 查看 plugin tab

# 7. 实跑
cline -i "做一个长任务，触发 compact"
```

**未验证项**（待实跑时确认）：
- `cline plugin install` 在 Windows 是否可用
- `pluginPaths` 配置在 VS Code Cline 中是否完全无效
- `session_start` 等更底层 hook stage 在 plugin 里如何注册

---

## 12. 给本项目的 5 条结论

| # | 结论 | 行动项 |
|---|------|--------|
| 1 | Plugin 在 VS Code Cline **当前不支持** | 修订 ADR-002 P5 实验环境要求 |
| 2 | 社区无 plugin 实战经验 | P5 实验本身就是社区探路价值 |
| 3 | messageBuilder 是 compact 的官方推荐入口 | `custom-compaction.ts` fork 后改造 |
| 4 | 文件 Hook 和 Plugin Hook 是两套并存机制 | OUTLINE §6.1 "Windows Hook 替代"需重新评估（可能两条都能用） |
| 5 | Package Plugin 可绑定 Skills | 未来 V1 可以是"Plugin + Skills + WebSearch MCP"打包发布 |
