# Handoff — 散落产物清理 + 扩展加载修复 + 源码探查规划

## 本会话决策

| 决策 | 状态 |
|------|------|
| 散落产物根因：VS Code 扩展加载旧版 auto-handoff 插件 + 4.0.1 patch 全缺失 | ✅ §1.6 双来源验证（cline.log + 源码对比） |
| 清理 + patch + 重装方案：一次性脚本 `scripts/cleanup-and-reinstall-plugin.ps1` | ✅ 用户执行成功 |
| Cline 源码探查规划：4-task 并行（compact 链 / checkpoint / messageBuilder 时机 / rules 注入频率）| ✅ 规划完成并推送远端，待云端执行 |
| PowerShell 5.1 编码约束：含中文脚本必须全 ASCII 或 UTF-8 BOM | ✅ 已记入本会话经验 |

## 本会话净变化

### 1. 散落产物清理 + 扩展加载修复

**根因链**（§1.6 双来源验证）：

| 证据 | 来源 | 结论 |
|------|------|------|
| cline.log L161（2026-06-28T02:22:57）| 日志 | "Plugin auto-handoff overrides handoff-plugin-01" — 两个旧版互相覆盖 |
| 旧版 `auto-handoff/src/index.ts`（4109B）| 源码 | PLUGIN_NAME="auto-handoff"，setup() 写 marker 到 `~/.cline/data/handoff/` |
| 当前项目 `handoff-plugin/src/index.ts`（234行）| 源码 | PLUGIN_NAME="context-snapshot"，写到 `~/.cline/data/snapshot/` — 从未安装 |
| VS Code 扩展 4.0.1 patch 状态 | 实测 | bootstrap/@cline/core/@cline/shared/jiti **全 False** — sandbox 无法启动 |
| `~/.cline/data/snapshot/` 空 | 实测 | 新版从未产出 |

**清理项**：
- `E:\handoff_tail.txt`（根目录散落，UTF-8 乱码）
- `~/.cline/data/handoff/`（旧版产物目录）
- `~/.cline/plugins/installed/local/auto-handoff/`（旧版插件）
- `~/.cline/plugins/_installed/local/handoff-plugin-01/`（旧版副本）

**修复项**：
- VS Code 扩展 4.0.1 patch：复制 `plugin-sandbox-bootstrap.js`(14089B) + `@cline/core` + `@cline/shared` + `jiti` 到扩展目录
- 安装新版 context-snapshot v0.4.0 到 `~/.cline/plugins/installed/local/context-snapshot/`（三能力：messageBuilders + rules + hooks）

**产物**：[scripts/cleanup-and-reinstall-plugin.ps1](../scripts/cleanup-and-reinstall-plugin.ps1)（全 ASCII，PS 5.1 安全）

### 2. Cline 源码探查规划

**初步探查结论**：
- 源码位置：`E:\cline-repo`（本地 clone，CLI 在 `E:\node-global\node_modules\cline\`）
- 权威源：[sdk/ARCHITECTURE.md](file:///e:/cline-repo/sdk/ARCHITECTURE.md) §9 Context Compaction Design Seam
- 关键发现：`@cline/agents` 仅 2 源文件（`index.ts` + `agent-runtime.ts`），turn-preparation seam 在 `agent-runtime.ts`

**4 个探查 Task**（云端并行执行，每个注入 SE Reviewer 角色 §1.12）：

| Task | 主题 | 回答 design.md §8 |
|------|------|-------------------|
| A | compact 执行链 | Q1（build() 是否在 compact 时被调用）|
| B | checkpoint 机制 | PROJECT_DEV_OUTLINE §5.3 验证项 2 |
| C | messageBuilder 调用时机 | Q3（并发安全）|
| D | rules 注入频率 | 影响 #6 实现策略 |

**文件清单**（已 Grep 验证存在）：
- compact: `sdk/packages/core/src/extensions/context/compaction*.ts`（4 文件）+ `agent-runtime.ts`
- checkpoint: `sdk/packages/core/src/session/checkpoint-*.ts` + `session-snapshot.ts` + `hooks/checkpoint-hooks.ts`
- messageBuilder: `sdk/packages/core/src/session/services/message-builder.ts` + `agent-runtime.ts`
- rules: `user-instruction-plugin.ts` + `session-runtime-orchestrator.ts` + `plugin-sandbox.ts`

**产物**：[docs/decisions/investigation-note-cline-runtime-probe.md](decisions/investigation-note-cline-runtime-probe.md)

### 3. PowerShell 5.1 编码经验

- PS 5.1 默认按 GBK 读取 UTF-8 without BOM 文件，含中文注释/字符串的脚本会乱码破坏语法
- 解决：脚本全 ASCII（注释+字符串+Write-Host 输出），或保存为 UTF-8 with BOM
- 验证方法：`[System.Management.Automation.Language.Parser]::ParseFile()` + 字节扫描非 ASCII

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **用户验证插件加载** | Reload VS Code → 确认 context-snapshot 出现在 Customize → Plugins | 🔴 高 — 阻塞后续所有插件相关验证 |
| **云端执行 4 Task 探查** | 按 investigation-note §3 并行执行，输出填入 §6 | 🔴 高 — 所有后续设计依赖此探查结果 |
| **基于探查结果重新设计 snapshot 内容** | 语义级摘要（非正则提取）、体积控制（2K-4K token）、生命周期管理 | 🔴 高 — 依赖探查 |
| **#4 beforeModel 提示词注入** | 读 detectLoopPatterns() 结果注入 messages（设计完整，代码层面缺失）| 🟡 中 — 不依赖探查，可并行 |
| **index.ts 职责拆分** | snapshot 生成逻辑（80 行）拆到独立模块 | 🟡 中 — 不依赖探查，可并行 |
| **推送分支** | `feat/adr-005-compact-handoff-split` | 🟢 低 |

## 同步脚本（跨环境协作）

| 脚本 | 用法 | 环境 |
|------|------|------|
| `scripts/sync.sh` | `bash scripts/sync.sh [项目路径]` | Git Bash / WSL |
| `scripts/sync.ps1` | `.\scripts\sync.ps1 [-Project "E:\cline++"]` | PowerShell |

默认项目路径 `E:/cline++`，可传参覆盖。

**使用时机**：云端 agent 推送变更后，本地开始工作前执行一次。

**执行流程**：检查本地状态 → 自动 stash → fetch → rebase/ff → 恢复 stash → 子模块同步 → 输出摘要。

**冲突处理**：
- rebase 冲突：自动中止 rebase，需手动 `git rebase origin/main`
- stash pop 冲突：改动保留在 stash 中，用 `git stash list` 查看后手动 `git stash pop stash@{N}`

**摘要提示**：同步完成后如果 `handoff.md` 有变更，脚本会提示"建议阅读"。

## 权威源

[dev-rules.md](dev-rules.md) · [ADR-005](decisions/ADR-005-split-compact-from-handoff.md) · [mechanism-landing-assessment.md](plugin/mechanism-landing-assessment.md) · [design.md](plugin/design.md) · [investigation-note-cline-runtime-probe.md](decisions/investigation-note-cline-runtime-probe.md)

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意 §1.5-§1.14 执行门控）与 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：散落产物已清理，VS Code 扩展 4.0.1 patch + context-snapshot v0.4.0 已安装（待用户 reload 验证）。Cline 源码探查规划已推送远端（commit `9b601e0`），待云端并行执行 4 Task。

**下次首要动作**：
1. **用户验证插件加载**：Reload VS Code → 确认 context-snapshot 出现在 Customize → Plugins → 触发一次 compact 检查 `~/.cline/data/snapshot/` 产出
2. **云端执行探查**（如未完成）：读 [investigation-note-cline-runtime-probe.md](decisions/investigation-note-cline-runtime-probe.md) §3，按 Task A/B/C/D 并行，输出填入 §6
3. **基于探查结果重新设计 context snapshot 内容生成**：依赖 Task A（compact 链）+ Task C（messageBuilder 时机）
4. **实现 #4 beforeModel 提示词注入**（不依赖探查，可并行）
