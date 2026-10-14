# Cline Nightly 构建测试计划

> **目的**：验证 Issue #11944（plugin-sandbox-bootstrap.js 未打包）在 Nightly 构建中是否已修复
> **背景**：Cline 4.0 已回滚，维护者基于新 SDK 准备重新发布，邀请社区测试 Nightly
> **反馈表单**：https://forms.gle/DWfEn8oLV7CW4Bjv7
> **Nightly 安装**：https://marketplace.visualstudio.com/items?itemName=saoudrizwan.cline-nightly
> **创建日期**：2026-07-20

---

## 0. 前置准备

### 0.1 记录当前环境（已确认 2026-07-20）

| 组件 | 当前值 | 备注 |
|------|--------|------|
| OS | Windows 11 | |
| VS Code 扩展 | `claude-dev` **4.0.8** | 回滚后的稳定版；`dist/` 只有 `extension.js`(21MB) + tree-sitter wasm，**无 bootstrap** |
| CLI | `cline` **3.0.46** | ✅ 正常包含 `plugin-sandbox-bootstrap.js`(14089 bytes) |
| @cline/core | **0.0.65** | CLI 内含 |
| @cline/sdk | **0.0.65** | CLI 内含 |
| 已装插件 | `context-snapshot`, `governance` | 在 `~/.cline/plugins/installed/local/` |
| `CLINE_PLUGIN_IMPORT_TIMEOUT_MS` | **30000** | User 级别（之前 workaround 设置） |
| 4.0.8 Workaround | ❌ 未应用 | `dist/extensions/` 和 `node_modules/@cline/` 均不存在 |

> **关键发现**：VS Code 扩展 4.0.8 仍然没有 `plugin-sandbox-bootstrap.js`——Issue #11944 的问题在 4.0.8 中依旧存在。这符合维护者说的"4.0 已回滚"，4.0.8 是回滚后的版本，Nightly 才是新 SDK 重构的版本。

- [ ] 安装 Nightly 后记录 Nightly 版本号
- [ ] 测试 Nightly 前确认是否需要清除 `CLINE_PLUGIN_IMPORT_TIMEOUT_MS`（测试默认超时）

### 0.2 安装 Nightly

- [ ] 从 Marketplace 安装 `saoudrizwan.cline-nightly`
- [ ] 记录 Nightly 扩展版本号（package.json 中的 version 字段）
- [ ] 确认 Nightly 与稳定版 4.0.8 是否可以共存（扩展 ID 不同：`saoudrizwan.cline-nightly` vs `saoudrizwan.claude-dev`）
- [ ] Reload VS Code

### 0.3 清除旧 Workaround

> 当前 4.0.8 未应用 workaround，无需清除扩展目录文件。但环境变量需要处理。

- [x] 确认 4.0.8 扩展目录无 workaround 文件（已确认：`dist/extensions/` 不存在）
- [ ] 可选：清除 `CLINE_PLUGIN_IMPORT_TIMEOUT_MS` 环境变量（当前为 30000，测试默认超时是否足够）
  ```powershell
  [Environment]::SetEnvironmentVariable("CLINE_PLUGIN_IMPORT_TIMEOUT_MS", $null, "User")
  ```
- [ ] Reload VS Code

---

## 1. 核心回归测试：Plugin Sandbox Bootstrap

> **原始 Issue #11944 的核心问题**

### 1.1 Bootstrap 文件存在性检查

- [ ] 定位 Nightly 扩展目录（`~/.vscode/extensions/saoudrizwan.cline-nightly-*`）
- [ ] 搜索 `dist/` 目录下是否存在 `plugin-sandbox-bootstrap.js`
- [ ] 如果存在，记录文件大小和修改时间
- [ ] 如果不存在，搜索整个扩展目录是否有 `plugin-sandbox*` 相关文件

```powershell
# 检查命令
$nightly = Get-ChildItem "$env:USERPROFILE\.vscode\extensions" -Directory -Filter "saoudrizwan.cline-nightly-*" | Sort-Object Name -Descending | Select-Object -First 1
Get-ChildItem -Path $nightly.FullName -Recurse -Filter "plugin-sandbox*" | Select-Object FullName, Length
```

### 1.2 插件加载测试（无 Workaround）

- [ ] 确保已清除所有旧 workaround 文件
- [ ] 确保 `~/.cline/plugins/installed/local/` 下有测试插件（probe-5 或 governance plugin）
- [ ] 启动新的 Cline 会话
- [ ] 检查 `plugin-loaded.log` 是否生成（证明 `setup()` 被调用）
- [ ] 检查 VS Code Developer Tools Console（`Ctrl+Shift+I`）中是否有 `[probe-5-test-plugin]` 日志输出
- [ ] 记录从会话启动到 plugin loaded 的时间

### 1.3 Capability 验证

- [ ] **messageBuilders**：发送一条消息，检查 `messageBuilder.build()` 是否被调用（查看 log）
- [ ] **tools**：在 Cline 对话中触发 `probe_5_ping` 工具，检查是否返回 pong
- [ ] **hooks**：检查 `beforeRun` hook 是否触发（查看 log）
- [ ] **registerRule**（如 governance plugin 已安装）：检查 loop guard / 系统规则是否注入

---

## 2. Windows 特定问题测试

> **Issue #11065：Windows 上 4 秒默认超时过短**

### 2.1 默认超时行为

- [ ] 不设置 `CLINE_PLUGIN_IMPORT_TIMEOUT_MS`
- [ ] 测试插件是否在默认超时内加载成功
- [ ] 如果失败，记录超时时间（是否仍为 4 秒）
- [ ] 记录错误信息（如果有）

### 2.2 超时环境变量是否仍被支持

- [ ] 设置 `CLINE_PLUGIN_IMPORT_TIMEOUT_MS=30000`
- [ ] 测试插件加载是否成功
- [ ] 如果仍然失败，记录错误信息

---

## 3. 插件发现机制测试

> **验证 UI Customize 面板 vs 实际 sandbox 激活的区别**

### 3.1 发现 vs 激活一致性

- [ ] 打开 Cline 侧边栏 → Customize（齿轮图标）
- [ ] 检查插件是否显示为"已加载"
- [ ] 检查 `plugin-loaded.log` 是否实际生成
- [ ] 两者是否一致？（在 4.0.0 中，UI 显示"已加载"但 sandbox 实际未激活）

### 3.2 多插件加载

- [ ] 同时安装多个插件（probe-5 + governance plugin）
- [ ] 检查两个插件的 `setup()` 是否都被调用
- [ ] 检查是否有插件加载顺序问题

---

## 4. 新 SDK 兼容性测试

> **维护者提到"基于新 Cline SDK 重新构建"**

### 4.1 API 兼容性

- [ ] `AgentPlugin` 接口是否仍然兼容（`name`、`manifest.capabilities`、`setup`、`hooks`）
- [ ] `api.registerMessageBuilder()` 签名是否变化
- [ ] `api.registerTool()` 签名是否变化
- [ ] `ctx.workspaceInfo` 字段是否仍然可用（`rootPath`、`latestGitBranchName`、`latestGitCommitHash`）

### 4.2 TypeScript / jiti 转译

- [ ] `.ts` 插件是否仍能直接加载（无需预编译）
- [ ] 检查 jiti 是否仍作为依赖打包
- [ ] 测试 `import type` 语法是否正常工作

---

## 5. 回归测试：现有功能

> **确保旧功能没有被新 SDK 破坏**

### 5.1 基本对话

- [ ] 正常发送消息，AI 回复正常
- [ ] 工具调用（read_file、write_file 等）正常

### 5.2 MCP 工具（如使用）

- [ ] MCP 工具仍可正常调用
- [ ] 多工具组合调用正常

### 5.3 Context 管理

- [ ] 长对话后 compaction 正常触发
- [ ] 自定义 compaction（如 governance plugin 的 messageBuilder）正常工作

---

## 6. 性能观察

- [ ] 插件加载耗时（从会话启动到 `plugin-loaded.log` 生成）
- [ ] 每轮 `messageBuilder.build()` 耗时（是否 < 100ms）
- [ ] 内存占用是否正常（Task Manager 观察 VS Code 进程）

---

## 7. 结果汇总模板

### 测试环境

| 项目 | 值 |
|------|-----|
| OS | Windows 11 |
| VS Code 版本 | |
| Nightly 版本 | |
| 旧 Workaround 是否清除 | |
| `CLINE_PLUGIN_IMPORT_TIMEOUT_MS` 设置 | |

### 核心结果

| 测试项 | 结果 | 备注 |
|--------|------|------|
| Bootstrap 文件存在 | ✅/❌ | |
| 插件 setup() 被调用 | ✅/❌ | |
| messageBuilders 生效 | ✅/❌ | |
| tools 生效 | ✅/❌ | |
| hooks 生效 | ✅/❌ | |
| 默认超时足够（Windows） | ✅/❌ | |
| UI 发现与实际激活一致 | ✅/❌ | |
| API 向后兼容 | ✅/❌ | |

### 反馈要点

1. **原始问题（Issue #11944）是否修复**：
2. **新发现的问题**：
3. **正面反馈**：
4. **建议**：

---

## 8. 反馈提交

- [ ] 填写反馈表单：https://forms.gle/DWfEn8oLV7CW4Bjv7
- [ ] 考虑是否预约直播观察通话（$50 Cline credits）
- [ ] 在 GitHub Issue #11944 上回复测试结果
