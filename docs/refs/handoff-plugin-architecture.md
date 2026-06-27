# Handoff Plugin Architecture Reference

> **目的**：记录从 Cline 源码中发现的架构事实，后续开发只需读此文档，不需再翻阅 `cline-repo` 源码。
>
> **维护规则**：只在有新源码发现时才追加新节。不写猜测，只写已验证的源码事实。

---

## 1. Plugin Sandbox 架构（关键发现）

### 1.1 没有文件系统沙箱

`SubprocessSandbox` (core/src/runtime/tools/subprocess-sandbox.ts) 只是普通 `node` 子进程隔离：

- 通过 `child_process.spawn()` 启动 `node plugin-sandbox-bootstrap.ts`
- **没有任何文件系统级拦截**（无 seccomp/AppArmor/Windows 沙箱）
- Plugin 代码的 `fs.writeFileSync()` 直接操作宿主机文件系统

**结论**：之前"`fs.writeFileSync` 被 sandbox 静默拦截"是误导——实际原因是：
1. `~/.cline/data/handoff/` 目录不存在（`writeFileSync` 不会自动创建父目录）
2. 旧代码没有 try-catch，错误被静默丢弃

### 1.2 Plugin 加载链路

```
VS Code Extension
  → loadSandboxedPlugins()          ← plugin-sandbox.ts
  → SubprocessSandbox.spawn()       ← 启动子进程
  → plugin-sandbox-bootstrap.ts     ← 子进程入口
  → importPluginModule(pluginPath)  ← plugin-module-import.ts
  → jiti.import(pluginPath)         ← jiti 实时转译 TS→JS
  → plugin.setup(api, ctx)          ← 调用插件 setup()
  → api.registerMessageBuilder()    ← 注册到核心消息流水线
```

**关键事实**：
- `@cline/core` 与 `@cline/shared` 是 peerDependencies，由宿主运行时解析
- TypeScript 源码直接工作（jiti 实时转译），无需预编译
- Plugin 不需要 `npm install`

### 1.3 VS Code 扩展特有行为

| 行为 | 说明 |
|------|------|
| Plugin 路径 | `~/.cline/plugins/installed/local/<name>/` |
| Customize 面板 | 只显示已安装 plugin 状态 |
| `console.log` | **不显示在 VS Code 开发者 Console**（日志走内部 bridge）|
| 文件系统 | 无限制 — 子进程可写任何用户可写路径 |
| 日志调试 | 通过 `ctx.logger.log()` 或写 marker 文件 |

---

## 2. Plugin 生命周期

### 2.1 时间线

```
会话启动 → Plugin 发现/加载/setup()
  → 每次 turn: messageBuilders → 安全层 → provider
```

- **`build()` 调用频率**：**每次 turn 准备时**都被调用，不是只在 compact 时
- **约束**：每次调用 `shouldCompact()` 检查阈值，不需要 compact 时立即返回

### 2.2 compact 阈值

| 参数 | 默认值 | 含义 |
|------|--------|------|
| `MAX_INPUT_TOKENS` | 120,000 | 模型最大输入 token |
| `COMPACT_AT_RATIO` | 0.75 | 达到 75% 时触发 |
| `PRESERVE_RECENT_TOKENS` | 24,000 | 保留最近消息量 |

---

## 3. 关键文件系统路径

| 用途 | 路径 |
|------|------|
| Plugin 安装目录 | `%USERPROFILE%\.cline\plugins\installed\local\<name>\` |
| Plugin 配置 | `<plugin-dir>/package.json`（`cline.plugins[]`） |
| Plugin 入口 | `<plugin-dir>/src/index.ts` |
| Handoff 存放目录 | `%USERPROFILE%\.cline\data\handoff\` |
| Session 数据目录 | `%USERPROFILE%\.cline\data\sessions\` |

**验证通过**：`fs.writeFileSync` 写入 handoff 目录工作正常（需 `mkdirSync({ recursive: true })` 先创建目录）。

---

## 4. Plugin 项目文件约定

### 4.1 最小文件结构

```
handoff-plugin/
├── package.json          # cline.plugins[] + peerDependencies
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts          # plugin 对象 + setup() + registerMessageBuilder()
    ├── compaction.ts     # shouldCompact() + collectToolNames()
    └── types.ts          # HandoffEntry / IndexEntry / Message
```

### 4.2 `package.json` 关键字段

```json
{
  "name": "handoff-plugin",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "cline": {
    "plugins": [{
      "paths": ["./src/index.ts"],
      "capabilities": ["messageBuilders"]
    }]
  },
  "peerDependencies": {
    "@cline/core": "*",
    "@cline/shared": "*"
  },
  "peerDependenciesMeta": {
    "@cline/core": { "optional": true },
    "@cline/shared": { "optional": true }
  }
}
```

### 4.3 Capability ↔ API 对照

| Capability | API 方法 | 同步/异步 |
|-----------|---------|----------|
| `tools` | `api.registerTool(tool)` | 异步 execute |
| `commands` | `api.registerCommand(command)` | 可同步/异步 |
| `rules` | `api.registerRule(rule)` | 可同步/异步 |
| `messageBuilders` | `api.registerMessageBuilder({ name, build })` | **同步** build |
| `providers` | `api.registerProvider(provider)` | — |
| `automationEvents` | `api.registerAutomationEventType()` | — |
| `mcpServers` | `api.registerMcpServer(server)` | — |
| `hooks` | plugin.hooks 字段 | 异步 |

**重要**：`build()` 在 sandbox 通信层被 `await` 但函数本身建议保持同步。文件写入用 `writeFileSync`。

---

## 5. sandbox RPC 通信协议

Plugin 与主进程通过 **IPC (child_process.send/on)** 通信：

| RPC 方法 | 方向 | 用途 |
|---------|------|------|
| `initialize` | 主进程→sandbox | 加载插件 |
| `buildMessages` | 主进程→sandbox | 执行 messageBuilder |
| `invokeHook` | 主进程→sandbox | 执行 hook |
| `executeTool` | 主进程→sandbox | 执行 tool |
| `executeCommand` | 主进程→sandbox | 执行 command |
| `resolveRuleContent` | 主进程→sandbox | 获取 rule content |

sandbox 进程退出或 RPC 超时时自动 `reinitialize()`，Plugin 无需操心连接管理。

---

## 6. 当前版本与代码位置

| 组件 | 版本/路径 |
|------|---------|
| VS Code 扩展 | `saoudrizwan.claude-dev-4.0.0` |
| Cline SDK 源码 | `e:\cline-repo\` |
| Plugin Sandbox | `sdk/packages/core/src/extensions/plugin/plugin-sandbox.ts` |
| Plugin Bootstrap | `sdk/packages/core/src/extensions/plugin/plugin-sandbox-bootstrap.ts` |
| Module Import | `sdk/packages/core/src/extensions/plugin/plugin-module-import.ts` |
| Plugin Loader | `sdk/packages/core/src/extensions/plugin/plugin-loader.ts` |
| Subprocess Sandbox | `sdk/packages/core/src/runtime/tools/subprocess-sandbox.ts` |
| 自定义 compact 示例 | `sdk/examples/plugins/custom-compaction.ts` |
| Auto Handoff Plugin | `e:\cline++\handoff-plugin\` |
| 已安装的 Plugin | `%USERPROFILE%\.cline\plugins\installed\local\auto-handoff\` |

---

## 7. 设计决策记录

| 决策 | 依据 |
|------|------|
| 输出路径 `~/.cline/data/handoff/` | Cline 已有 `data/sessions/` 等子目录，保持一致 |
| `writeFileSync` 而非异步 | 写入量 < 10KB，同步更简单 |
| `setup()` 创建目录 + 写 marker | 确保后续 handoff 写入时目录存在 |
| 不在 build() 中修改 messages | 当前只检测 compact + 写文件，不介入压缩策略 |
| `@cline/core` 等设为 peerDependencies | 由宿主运行时解析，插件不需要独立安装 |

---

## 8. 开发指南

### 8.1 修改代码后同步

```cmd
copy /y e:\cline++\handoff-plugin\src\*.ts %USERPROFILE%\.cline\plugins\installed\local\auto-handoff\src\
copy /y e:\cline++\handoff-plugin\package.json %USERPROFILE%\.cline\plugins\installed\local\auto-handoff\
copy /y e:\cline++\handoff-plugin\README.md %USERPROFILE%\.cline\plugins\installed\local\auto-handoff\
```

> 修改后只需重启 VS Code 即可生效（扩展在会话启动时重新加载 plugin）。

### 8.2 验证步骤

1. 重启 VS Code
2. 检查 marker：`type %USERPROFILE%\.cline\data\handoff\plugin-loaded.marker`
3. 长对话触发 compact
4. 检查产物：`dir %USERPROFILE%\.cline\data\handoff\*.md`

### 8.3 调试方法

`console.log` **不显示**在 VS Code 开发者 Console。调试信息可用：
- `setup()` 中写 marker 文件（已在用）
- `writeHandoff()` 中写内容到 handoff 目录（已在用）
- Plugin 加载失败时，`plugin-sandbox.ts` 的 `failures` 数组包含错误信息

---

## 9. 关键未解问题：Plugin 加载失败

### 9.1 症状

- Customize UI **可以发现** Plugin（`discoverPluginModulePaths` 工作正常）
- Plugin 在 UI 中显示为"已加载"
- 但 `setup()` **从未执行**（marker 文件不存在，debug log 不出现）

### 9.2 已验证的路径

| 安装路径 | 被发现 | setup() 执行 |
|---------|--------|-------------|
| `plugins/installed/local/<name>/`（手动放置，有 package.json）| ✅ UI 显示 | ❌ 未执行 |
| `plugins/_installed/local/<name>/`（SDK 标准路径，有 package.json）| ✅ UI 显示 | ❌ 未执行 |
| `plugins/_installed/.tmp/.../`（marketplace 官方插件，残留 `.tmp` 目录）| ✅ UI 显示 | 未知 |
| `plugins/_installed/local/<file>.ts`（单文件 SDK 安装）| 无法验证（已清除）| 未知 |
| `plugins/_installed/remote/<file>.ts`（远程单文件安装）| 无法验证（已清除）| 未知 |

### 9.3 假设

1. **UI 显示≠Agent 加载**：Customize 面板的"已加载"可能只是"已发现"状态，并非"已在 Agent 运行时的 sandbox 中激活"
2. **4.0.0 扩展可能不含完整 Plugin sandbox 系统**：`extension.js` 22.5MB 被完全压缩，搜索 `loadSandboxedPlugins` 无结果（可能被 minifier 重命名或代码被摇树优化移除）
3. **可能需要 UI toggle 触发加载**：toggle 开关调用 `qch()` → `zvn()` 可能是真正的加载入口，默认不自动加载
4. **Toggle 也未触发**：手动开关后 `C:\handoff-plugin-debug.log` 仍未出现，说明 toggle 也未成功加载

### 9.4 参考源码位置

| 组件 | 路径 |
|------|------|
| Plugin 安装 | `sdk/packages/core/src/services/plugin-install.ts`（`INSTALLS_DIRECTORY_NAME = "_installed"`）|
| Plugin 发现 | `sdk/packages/shared/src/storage/paths.ts`（`discoverPluginModulePaths` / `resolvePluginConfigSearchPaths`）|
| Sandbox 加载 | `sdk/packages/core/src/extensions/plugin/plugin-sandbox.ts`（`loadSandboxedPlugins`）|
| Bootstrap | `sdk/packages/core/src/extensions/plugin/plugin-sandbox-bootstrap.ts` |
| Module Import | `sdk/packages/core/src/extensions/plugin/plugin-module-import.ts`（jiti 转译）|
| Subprocess | `sdk/packages/core/src/runtime/tools/subprocess-sandbox.ts`（纯 node 子进程，无文件系统沙箱）|

---

## 10. 未确认事项

| # | 事项 | 状态 |
|---|------|------|
| 1 | `build()` 中写文件是否会阻塞对话 | 预期不会（< 10KB 写入）|
| 2 | 多个 messageBuilder 执行顺序 | 按注册顺序串行 |
| 3 | VS Code 扩展 4.0.0 是否包含 sandbox 加载代码 | 待验证 — minified bundle 未搜到 `loadSandboxedPlugins` |
| 4 | UI toggle 能否触发插件加载 | ❌ 实测无效 |
| 5 | `session_start` hook 在 VS Code 扩展中注册 | 待 Phase 3 验证 |

