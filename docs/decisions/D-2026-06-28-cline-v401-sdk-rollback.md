# Cline v4.0.1 — SDK 迁移回滚事件记录

## 事件概述

| 字段 | 值 |
|------|-----|
| 日期 | 2026-06-28 |
| 版本 | Cline VS Code Extension v4.0.1 |
| 发布时间 | 2026-06-28 02:48 UTC（GitHub Release） |
| 仓库 | `saoudrizwan/claude-dev` 已更名为 `cline/cline` |

## 官方 Changelog

> "Roll the stable VS Code extension back to the pre-SDK-migration codebase to resolve regressions reported in 4.0.0. This release ships the 3.89.2 extension code under a higher version number so existing 4.0.0 users receive the update. SDK-migration work continues separately on `main`."

摘要：v4.0.1 是**回滚版本**，将 VS Code 扩展代码退回到 SDK 迁移前的 3.89.2 代码基，以修复 v4.0.0 引入的回归问题。SDK 迁移工作继续在 `main` 分支独立进行。

## 关联历史

### 2026-06-26：v4.0.0 bootstrap 缺失

Phase 2 中确认：v4.0.0 因 esbuild 配置不输出独立 bootstrap 文件，导致 VS Code 扩展在 handoff-plugin 的 detect-compact 机制中无法触发 compact 事件捕获。4 类证据交叉验证。详见 `investigation-note-vscode-bootstrap-missing.md`。

### 2026-06-28：v4.0.1 回滚

v4.0.1 回退到 3.89.2 代码基，老代码包含 bootstrap 机制，因此**当前稳定版不存在 bootstrap 缺失问题**。

但 SDK 迁移分支（main）上的 esbuild 配置问题**未被修复**——官方仅直接回退，未在新分支上修改配置。未来当 SDK 迁移再次合入稳定版时，bootstrap 问题可能随代码一同回归。届时需检查 SDK 迁移分支中 esbuild.config.ts 是否包含了独立的入口配置。

## 附带观察：CLI v3.0.31 新增 plugin-bundled skills

CLI v3.0.31（2026-06-27）Release Notes 中包含：

> "Added marketplace uninstall support and surfaced plugin-bundled skills"

这意味着 Cline 生态开始正式支持在 Marketplace 中展示插件携带的 skills。这与 `skills-mcp-server` 的探索方向有交集——如果将来 Cline 生态正式支持 plugin-bundled skills，我们的 skills 体系可以与之对齐。当前阶段记录即可，无需立即行动。

## 对项目的影响

| 方面 | 影响 | 行动 |
|------|------|------|
| Handoff Plugin demo | ❌ 无影响 | 已标记为 demo 不进入使用，v4.0.1 回滚不改变该决策 |
| bootstrap 根因分析结论 | ✅ 仍然成立 | 之前对 v4.0.0 的诊断（esbuild 配置问题）在 SDK 迁移分支上仍然正确 |
| 未来风险 | ⚠️ 可能复发 | 当 SDK 迁移再次合入稳定版时，需重新检查 bootstrap 机制是否被正确配置 |
| plugin-bundled skills | 📝 值得关注 | Cline 生态的 skills 规范化方向，与 skills-mcp-server 的长期方向一致 |

## 参考

- [investigation-note-vscode-bootstrap-missing.md](investigation-note-vscode-bootstrap-missing.md) — v4.0.0 bootstrap 缺失根因分析
- https://github.com/cline/cline/releases/tag/v4.0.1 — 官方 Release