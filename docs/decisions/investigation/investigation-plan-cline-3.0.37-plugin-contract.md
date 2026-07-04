# Investigation Plan — cline 3.0.37 Plugin Contract 探查

> **生命周期**：一次性探查任务，产出验证后归档至 investigation-note。

## 背景

cline 从 3.0.34 升级到 3.0.37 后，context-snapshot plugin 行为异常：

| 现象 | 证据 |
|------|------|
| plugin 已加载 | `data/snapshot/plugin-loaded.marker` mtime = 2026-07-04 16:03:19（setup() 被调用）|
| console.log 输出被 TUI 吞 | TUI 模式（`-i`）看不到任何 `[context-snapshot]` 日志 |
| handoff 未注入 | 模型主动用 `read_files` / `search_codebase` 读 handoff.md，不是 plugin 注入 |
| beforeRun hook 可能没触发 | 同上（待 debug log 验证）|

## 探查目标

| 编号 | 假设 | 验证方法 | 优先级 |
|------|------|---------|--------|
| H1 | `setup(ctx)` 的 ctx 结构变化，`ctx.workspaceInfo.rootPath` 不存在 | 读 `@cline/shared` 类型定义 | P0 |
| H2 | `hooks.beforeRun` 在 3.0.37 被移除或改名 | 读 `@cline/shared/dist/agent.d.ts` | P0 |
| H3 | `registerMessageBuilder` 的 build() 不再每 turn 调用 | 读 `@cline/sdk` 类型定义 + 源码 | P0 |
| H4 | `capabilities: ["hooks"]` 需显式声明 hook 名 | 对比 3.0.34 vs 3.0.37 manifest 格式 | P1 |
| H5 | plugin 注册需 manifest 文件，junction 不被识别 | 读 `@cline/core` plugin loader | P1 |

## 子代理任务分配

### 子代理 1：`@cline/shared` 类型定义（P0）

**路径**：`E:\node-global\node_modules\@cline\shared\dist\`

**任务**：

1. 读 `agent.d.ts` 全文，找：
   - `AgentRuntimeHooks` 接口定义（beforeRun/beforeTool/beforeModel/afterTool 是否还在）
   - `AgentRunLifecycleContext` 定义（beforeRun context 结构）
   - `AgentBeforeToolContext` / `AgentAfterToolContext` 定义
   - `AgentBeforeModelContext` 定义
2. 读 `plugin.d.ts`（如果存在），找：
   - `PluginApi` 接口（registerMessageBuilder/registerRule 签名）
   - `MessageBuilder` 接口
   - `PluginSetupContext` 定义（setup ctx 结构）
3. 对比 3.0.34 的契约（参考 `e:\cline++\docs\plugin\refs\plugin-dev-quick-reference.md §13.9`）

**产出**：契约变化表（3.0.34 vs 3.0.37）

### 子代理 2：`@cline/sdk` 包（P0）

**路径**：`E:\node-global\node_modules\@cline\sdk\`

**任务**：

1. 读 `package.json`，确认 exports 入口
2. 读主入口的 `.d.ts`，找：
   - plugin 注册 API（`registerPlugin`? `loadPlugin`?）
   - messageBuilder 调用时机注释
   - hook 注册方式
3. 用 grep 找 `beforeRun` / `messageBuilder` / `registerMessageBuilder` 关键字

**产出**：plugin API 注册流程图

### 子代理 3：`@cline/core` 包（P1）

**路径**：`E:\node-global\node_modules\@cline\core\`

**任务**：

1. 读 `package.json`
2. 用 grep 找 `plugin` / `loadPlugin` / `_installed` / `installed/local` 关键字
3. 找 plugin loader 逻辑（如何扫描 `_installed/local` 目录、如何解析 manifest）
4. 确认 junction/symlink 是否被识别

**产出**：plugin 加载流程 + manifest 格式要求

### 子代理 4：GitHub Release Notes（P0）

**任务**：

1. WebFetch `https://github.com/cline/cline/releases` 找 3.0.35/3.0.36/3.0.37 release notes
2. 重点找：
   - "plugin" / "hook" / "messageBuilder" 关键字
   - breaking changes
   - migration guide
3. WebFetch `https://github.com/cline/cline/blob/main/CHANGELOG.md`（如果存在）

**产出**：3.0.34→3.0.37 plugin 相关 breaking changes 列表

### 子代理 5：官方 Plugin 文档（P1）

**任务**：

1. WebSearch "cline cli plugin development 2026"
2. WebFetch `https://docs.cline.bot/plugins`（或类似官方文档 URL）
3. 找：
   - plugin manifest 格式（package.json 的 `cline` 字段）
   - capabilities 支持值
   - hook 注册示例
   - beforeRun hook 文档

**产出**：官方 plugin 开发指南摘要

## 产出汇总模板

每个子代理回来后填写：

```
## 子代理 N 产出

### 关键发现
- [发现1]

### 契约变化（vs 3.0.34）
| 字段 | 3.0.34 | 3.0.37 | 影响 |
|------|--------|--------|------|

### 对 H1-H5 假设的验证
- H1: [confirmed/refuted/unknown] + 证据
- ...

### 修复建议
- [建议1]
```

## 验证 checkpoint

探查完成后，应能回答：

1. `beforeRun` hook 在 3.0.37 是否还支持？改名了？
2. `ctx.workspaceInfo.rootPath` 是否还存在？
3. `registerMessageBuilder` 的 build() 调用时机是否变了？
4. plugin manifest 是否需要新字段？
5. `_installed/local` 路径是否正确？junction 是否被识别？

## 资源路径速查

```
@cline/shared:  E:\node-global\node_modules\@cline\shared\dist\
@cline/sdk:     E:\node-global\node_modules\@cline\sdk\
@cline/core:    E:\node-global\node_modules\@cline\core\
@cline/agents:  E:\node-global\node_modules\@cline\agents\
cline (binary): E:\node-global\node_modules\cline\bin\cline (Bun 编译，无源码)
旧契约参考:     e:\cline++\docs\plugin\refs\plugin-dev-quick-reference.md §13.9
旧 atlas:       e:\cline++\docs\plugin\refs\cline-plugin-architecture-atlas.md
```

## 注意事项

1. **cline 主二进制是 Bun 编译的**（`E:\node-global\node_modules\cline\bin\cline`），无源码可读——只能依赖 `@cline/*` 包的 `.d.ts` 类型定义
2. **`@cline/cli-windows-x64`** 平台包可能含额外信息，路径：`E:\node-global\node_modules\@cline\cli-windows-x64\`
3. 如果 `.d.ts` 也不全，只能靠 GitHub release notes + 官方文档
4. 优先级 P0 的子代理 1/2/4 必须跑，P1 的 3/5 视 P0 结果决定

## 已知事实（不需要重新探查）

- cline 版本：3.0.37（`cline --version`）
- `@cline/*` 包版本：0.0.56（见 `cline/package.json` dependencies）
- plugin 安装路径变化：`installed/local/` → `_installed/local/`（3.0.37 用新路径，旧路径已用 junction 兼容）
- plugin 确实加载：marker 文件 mtime 证明 setup() 被调用
- TUI 模式吞 console.log：需用文件日志或非 TUI 模式调试

## 后续动作

探查完成后：

1. 根据 H1-H5 验证结果修复 `index.ts`：
   - hook 注册方式（如果 beforeRun 改名）
   - ctx 字段路径（如果 workspaceInfo 变化）
   - messageBuilder 调用时机（如果 build() 不再每 turn 调用）
2. 重新同步 plugin 到 `_installed/local/`
3. 跑 `sync-and-test.ps1` 验证 handoff 注入
4. 验证通过后清理 debug log 代码
