# 反馈表单摘要（供填写 Google Form 时参考）

> **表单地址**：https://forms.gle/DWfEn8oLV7CW4Bjv7
> **创建日期**：2026-07-20

---

## 测试环境

| 项目 | 值 |
|------|-----|
| OS | Windows 11 |
| VS Code | (安装 Nightly 后填写) |
| Cline Nightly 版本 | (安装后填写) |
| 之前使用的稳定版 | VS Code Extension 4.0.8 (post-rollback) |
| CLI | cline 3.0.46 / @cline/core 0.0.65 |
| 测试插件 | context-snapshot, governance, probe-5-test-plugin |

---

## 原始问题（Issue #11944）状态

### 问题描述

VS Code 扩展 4.0.0/4.0.8 中 `plugin-sandbox-bootstrap.js` 未打包到 `dist/` 目录，导致插件 sandbox 无法初始化，插件静默加载失败。

### 根因分析

1. esbuild 管道将插件加载代码（`loadSandboxedPlugins`、`SubprocessSandbox`、`registerMessageBuilder`）打包进 `extension.js`
2. 但未将 `plugin-sandbox-bootstrap.js` 作为独立文件输出到 `dist/`
3. `resolveBootstrap()` 搜索 5 个候选路径，全部未找到
4. jiti 回退失败（jiti 被内联，无法从子进程 `require()`）
5. 结果：sandbox 子进程不启动 → 4 秒超时 → `setup()` 永不执行
6. UI 显示"已加载"但实际 sandbox 未激活（发现与激活是独立代码路径）

### 在 Nightly 中是否修复

> (测试后填写)
> - [ ] `plugin-sandbox-bootstrap.js` 存在于 Nightly 的 `dist/` 目录
> - [ ] 插件 `setup()` 被调用（`plugin-loaded.log` 生成）
> - [ ] messageBuilders capability 生效
> - [ ] tools capability 生效
> - [ ] hooks capability 生效
> - [ ] registerRule capability 生效

---

## Windows 特定问题（Issue #11065）

### 问题描述

Windows 上默认 4 秒插件导入超时过短，插件加载失败。

### 在 Nightly 中的状态

> (测试后填写)
> - [ ] 不设置 `CLINE_PLUGIN_IMPORT_TIMEOUT_MS`，插件能否在默认超时内加载？
> - [ ] 默认超时是否仍为 4 秒？是否已调整？
> - [ ] `CLINE_PLUGIN_IMPORT_TIMEOUT_MS` 环境变量是否仍被支持？

---

## 新发现的问题

> (测试后填写)

---

## 正面反馈

> (测试后填写)
> - 插件加载是否成功？
> - 加载速度是否有改善？
> - API 是否向后兼容？

---

## 建议

1. 确保 `plugin-sandbox-bootstrap.js` 作为独立文件包含在扩展构建输出中（而非仅内联到 `extension.js`）
2. Windows 上默认超时建议提高到至少 15-30 秒（或根据系统自动调整）
3. UI Customize 面板的"已加载"状态应反映 sandbox 实际激活状态，而非仅文件发现
4. 建议在扩展启动日志中明确记录 sandbox 初始化状态（成功/失败/超时）

---

## 是否愿意参加直播观察通话

> ✅ 是——可以展示根因分析过程和回归测试。
