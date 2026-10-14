# Cline Nightly 测试结果

> **测试日期**：2026-07-20
> **Nightly 版本**：4.0.1784464136
> **结论**：Issue #11944 **未修复** —— Nightly 仍无 `plugin-sandbox-bootstrap.js`

---

## 测试环境

| 项目 | 值 |
|------|-----|
| OS | Windows 11 |
| VS Code | （需在 VS Code 内确认版本） |
| Nightly 扩展 | `saoudrizwan.cline-nightly-4.0.1784464136` |
| 稳定版扩展 | `saoudrizwan.claude-dev-4.0.8` |
| CLI | cline 3.0.46 / @cline/core 0.0.65 |
| 环境变量 | `CLINE_PLUGIN_IMPORT_TIMEOUT_MS` 已清除（User 级别） |

---

## §0 前置准备

### 0.1 环境变量清除

```powershell
# 清除前
[Environment]::GetEnvironmentVariable('CLINE_PLUGIN_IMPORT_TIMEOUT_MS', 'User')
# 输出: 30000

# 清除后
[Environment]::GetEnvironmentVariable('CLINE_PLUGIN_IMPORT_TIMEOUT_MS', 'User')
# 输出: (空)
```

**状态**：✅ 已清除

---

## §1.1 Bootstrap 文件存在性检查

### Nightly 扩展结构

```
saoudrizwan.cline-nightly-4.0.1784464136/
├── extension.js (25 KB) ← rollout loader
├── next/
│   ├── dist/
│   │   └── extension.js
│   ├── node_modules/
│   │   └── @vscode/
│   └── package.json
├── legacy/
│   ├── dist/
│   │   └── extension.js
│   ├── node_modules/
│   │   └── @vscode/
│   └── package.json
├── assets/
├── walkthrough/
└── package.json
```

### 搜索结果

| 搜索范围 | 搜索目标 | 结果 |
|----------|---------|------|
| 根目录递归 | `plugin-sandbox*` | ❌ 未找到 |
| `next/dist/` | `plugin-sandbox*` | ❌ 未找到 |
| `legacy/dist/` | `plugin-sandbox*` | ❌ 未找到 |
| 根目录递归 | `@cline/` 目录 | ❌ 未找到 |
| 根目录递归 | `jiti/` 目录 | ❌ 未找到 |
| `next/node_modules/` | 内容 | 仅 `@vscode/` |
| `legacy/node_modules/` | 内容 | 仅 `@vscode/` |

### 对比稳定版 4.0.8

| 项目 | Nightly | 稳定版 4.0.8 |
|------|---------|-------------|
| `plugin-sandbox-bootstrap.js` | ❌ 无 | ❌ 无 |
| `@cline/` 目录 | ❌ 无 | ❌ 无 |
| `jiti/` 目录 | ❌ 无 | ❌ 无 |
| 架构 | Rollout loader (25KB) | 单一 bundle (21MB) |

**结论**：Issue #11944 的核心问题在 Nightly 中 **仍未修复**。虽然采用了 rollout loader 架构（支持 next/legacy A/B 测试），但底层的两个 bundle 都没有包含独立的 `plugin-sandbox-bootstrap.js` 文件。

---

## 推断

基于 rollout loader 的源码（`extension.js`），加载逻辑为：

```javascript
// loader 会根据 feature flag 选择 next 或 legacy
let bundle = chooseBundle({ envOverride, settingOverride, cached, previousFailure });
await require(path.join(__dirname, bundle, "dist", "extension.js")).activate(context);
```

如果 `next` 和 `legacy` 的 `extension.js` 都内联了 `plugin-sandbox-bootstrap.js`（而不是作为独立文件），则 `resolveBootstrap()` 搜索路径时仍然无法找到该文件，问题依旧。

---

## 后续测试（暂停）

由于 bootstrap 文件缺失是前提条件，以下测试无法有效进行：

- [ ] §1.2 插件加载测试（setup() 被调用）
- [ ] §1.3 Capability 验证
- [ ] §2 Windows 超时测试
- [ ] §3 插件发现机制测试
- [ ] §4 SDK 兼容性测试
- [ ] §5 回归测试

**建议**：待维护者修复 bootstrap 文件打包问题后，再进行上述测试。

---

## 反馈要点

### 原始问题（Issue #11944）状态

| 测试项 | 结果 | 备注 |
|--------|------|------|
| Bootstrap 文件存在于 Nightly | ❌ 无 | 搜索整个扩展，next/legacy 均无 |

### 正面反馈

- Nightly 采用了创新的 rollout loader 架构，支持 A/B 测试新 SDK
- 架构设计良好：next/legacy 分离，支持 feature flag 和回退机制

### 新发现的问题

Nightly 虽然架构升级，但**核心打包问题未修复**：
- `next` 和 `legacy` bundle 都没有独立的 `plugin-sandbox-bootstrap.js`
- 无法确定这是否是"新 SDK 重构"的预期行为（插件机制可能在新 SDK 中重新设计）

### 建议

1. **明确插件系统在新 SDK 中的状态**：
   - 新 SDK 是否仍需要 `plugin-sandbox-bootstrap.js`？
   - 如果是，构建流程需要调整以输出独立文件
   - 如果否，插件机制是否完全重构？如何使用？

2. **如果仍需要 bootstrap 文件**：
   - 检查 esbuild 配置，确保 `plugin-sandbox-bootstrap.ts` 被编译为独立 `.js` 文件
   - 确保 `@cline/core`、`@cline/shared`、`jiti` 被正确打包

3. **文档更新**：
   - 如果插件机制在新 SDK 中重新设计，请更新官方文档
   - 明确当前 Nightly 中插件系统的预期行为

---

## 下一步

1. 将此结果提交到反馈表单
2. 在 GitHub Issue #11944 回复
3. 考虑预约直播观察通话，询问插件系统在新 SDK 中的设计