# Handoff — Handoff Plugin VS Code 扩展加载故障排查

## 本会话决策

| 决策 | 状态 |
|------|------|
| Plugin Sandbox 没有文件系统沙箱 — `SubprocessSandbox` 只是 `node` 子进程 | ✅ 源码确认 |
| 之前\"fs.writeFileSync 被 sandbox 拦截\"的根因是目录不存在 + 缺 try-catch | ✅ 已修正 |
| Phase 2 写文件逻辑已实现（handoff.md + index.jsonl） | ✅ 已完成 |
| VS Code 扩展 4.0.0 的 Customize UI 可发现 Plugin 但 setup() 不执行 | ❌ 未解 |
| 安装到 `plugins/_installed/` 标准和 `plugins/installed/` 均无效 | ❌ 未解 |
| UI toggle 手动开关也未触发 setup() | ❌ 未解 |

## 本会话净变化

### 1. Plugin Phase 2 代码实现

`handoff-plugin/src/index.ts` skeleton(24行) → 完整 Phase 2(146行)：
- `setup()`：创建 `~/.cline/data/handoff/` 目录 + 写 `plugin-loaded.marker`
- `build()`：调用 `shouldCompact()`，compact 时写 handoff.md + index.jsonl
- 全路径 try-catch 包裹，失败不阻断对话

### 2. 架构参考文档

`docs/refs/handoff-plugin-architecture.md` — 10 章，记录了 Plugin Sandbox 架构、生命周期、关键路径、项目约定、RPC 协议、**§9 关键未解问题**。

### 3. 源码分析关键发现

- `SubprocessSandbox` 无文件系统拦截（纯 `child_process.spawn()`）
- Plugin 安装到 `_installed/`（`plugin-install.ts:104`）
- Plugin 发现扫描 `plugins/` 全部子目录（`paths.ts:498`）
- VS Code 扩展 4.0.0 bundle 22.5MB，`loadSandboxedPlugins` 未搜到
- `global-settings.json` 有陈旧 `disabledPlugins`，已清除

### 4. 测量参数

- setup() 不执行（debug log 和 marker 均不出现）
- UI 显示正常，toggle 手动开关无效
- `plugins/installed/` 和 `plugins/_installed/` 均无效

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **排查 VS Code 扩展 Plugin 加载机制** | 搜索 GitHub Issues / 社区 / 源码，确认 4.0.0 是否支持 Plugin 加载 | **高** |
| **确认 Plugin 系统是否在 4.0.0 中可用** | 可能 4.0.0 去掉了 sandbox 或仅在 CLI 可用 | **高** |
| 重试 `cline plugin install`（找 npm 完整路径） | 之前因 ENOENT npm 失败 | 中 |
| Phase 3 index.jsonl 字段补齐 | summary + key_terms + decision_count | 低 |

## 权威源

[handoff-plugin-architecture.md](refs/handoff-plugin-architecture.md)、[design-handoff-plugin.md](design-handoff-plugin.md)、[dev-rules.md](dev-rules.md)、[project-rules-search-orchestrator.md](project-rules-search-orchestrator.md)

## E 盘写权限记录

本会话中 E 盘的全部 `writeFileSync` 返回 `EPERM`。解决：用 `cmd /c copy` 或编辑器工具写 C 盘路径。

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意 §1.5-§1.14 执行门控）与 docs/project-rules-search-orchestrator.md 各一次，遵守三份文档职责划分与防漂移约束。
然后读 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：本会话完成 **Handoff Plugin Phase 2 代码实现**，但 VS Code 扩展 4.0.0 中 Plugin 的 `setup()` 始终不执行。安装了 `_installed/` 和 `installed/` 两个路径，toggle 手动开关也无效。

**最大转折点**：发现 Plugin Sandbox 不是文件系统沙箱（只是 `node` 子进程），之前\"writeFileSync 被 sandbox 拦截\"是误导。

**下次首要动作**：
1. 搜索确认 VS Code 扩展 4.0.0 是否支持 Plugin 加载（可能需升级或换 CLI）
2. 用完整路径的 `npm` 重试 `cline plugin install`
3. 备选：CLI 验证

