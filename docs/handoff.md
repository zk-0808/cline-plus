# Handoff — Plugin 全模块实现 + beforeTool 改写

## 本会话决策

| 决策 | 状态 |
|------|------|
| [ADR-005](decisions/ADR-005-split-compact-from-handoff.md) Compaction 与 Handoff 拆分 | ✅ Accepted + 外部评审修订 |
| [mechanism-landing-assessment.md](plugin/mechanism-landing-assessment.md) 11 条候选落地评估 | ✅ 完成（含 3 处事实修正 + 3 处设计补丁） |
| handoff-plugin 完整实现 | ✅ 6 模块 1113 行，64 tests 全通过 |
| tool-recorder.ts | ✅ #1 慢调用监控 + #4 循环检测（N-gram/振荡/持续错误） |
| rules-injector.ts | ✅ #6 动态 handoff 注入 + findLatestHandoff + 文件命名规范 |
| shell-wrapper.ts | ✅ #2 PowerShell NoProfile + #3 UTF-8 编码注入（幂等改写） |
| index.ts 重构 | ✅ 注册 messageBuilders + rules + hooks 三类能力 |
| @cline/core + @cline/shared 类型桩 | ✅ 编译时类型 + 运行时 stub |
| 文档归档 | ✅ 55 个文件 → `docs/archive/`，8 个 ARCHIVE 摘要留在原位 |
| 断链修复 | ✅ 80 处 → 0 断链 |
| GitHub Issue 提交 | ✅ VS Code bootstrap 缺失 |
| mechanism-candidates #5/#6/#7 状态同步 | ✅ 已更新 |

## Plugin 架构

```
handoff-plugin/src/
├── index.ts             ← 入口：compact-observer + rules-injector + shell-wrapper + hooks
├── compaction.ts (167行) ← token 估算 + shouldCompact
├── tool-recorder.ts (321行) ← #1 慢调用 + #4 循环检测
├── rules-injector.ts (155行) ← #6 动态 handoff 注入
├── shell-wrapper.ts (163行) ← #2 PowerShell 安全参数 + #3 UTF-8 编码
└── types.ts (84行)      ← ToolRecord / LoopPattern / IndexEntry

handoff-plugin/test/
├── tool-recorder.test.ts    ← 14 tests
├── rules-injector.test.ts   ← 16 tests
├── plugin-lifecycle.test.ts ← 9 tests
└── shell-wrapper.test.ts    ← 25 tests

handoff-plugin/types/@cline/  ← 编译时 type stubs + 运行时 JS stubs
```

## 机制落地进度

| # | 机制 | 状态 | 实现位置 |
|---|------|------|---------|
| #1 | Terminal Watchdog (降级) | ✅ 已实现 | tool-recorder.ts getSlowCalls() |
| #2 | PowerShell NoProfile | ✅ 已实现 | shell-wrapper.ts injectPowerShellFlags() |
| #3 | UTF-8 编码注入 | ✅ 已实现 | shell-wrapper.ts injectUtf8Encoding() |
| #4 | Loop Guard 检测 | ✅ 检测层已实现 | tool-recorder.ts detectLoopPatterns() |
| #4 | Loop Guard 提示词注入 | ❌ 待实现 | 需要 beforeModel hook 注入层 |
| #5 | Handoff compact observer | ✅ 已实现 | index.ts messageBuilder |
| #6 | 跨会话记忆注入 | ✅ 已实现 | rules-injector.ts + index.ts rule |
| #7 | Windows File Hooks | ❌ 待验证 | 需实测 Cline File Hooks |

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **#6 注入验证** | 实测 Cline rules.content 动态函数能否正常注入 | 高 |
| **Loop Guard 提示词注入** | #4 beforeModel hook 检测重复后注入警告（detection 完成，缺注入层） | 中 |
| **File Hooks 验证** | #7 TaskStart 事件文件名/路径/扩展名实测 | 中 |
| **推送** | 分支 `feat/adr-005-compact-handoff-split` 待推送 | 高 |

## 权威源

[dev-rules.md](dev-rules.md) · [ADR-005](decisions/ADR-005-split-compact-from-handoff.md) · [mechanism-landing-assessment.md](plugin/mechanism-landing-assessment.md) · [design.md](plugin/design.md) · [mechanism-candidates.md](mechanism-candidates.md)

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意 §1.5-§1.14 执行门控）与 docs/search/project-rules.md 各一次，遵守三份文档职责划分与防漂移约束。
然后读 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：ADR-005 已落地，handoff-plugin 6 模块完整实现（1113 行），64 tests 全通过。#1-#6 中仅 #4 提示词注入层未完成（检测层已就绪）。#7 Windows File Hooks 待实测。

**下次首要动作**：
1. 推送分支（需 GitHub 认证）
2. 实测 #6 注入：验证 Cline rules.content 动态函数能否在新会话中注入 handoff 内容
3. 实现 #4 Loop Guard 提示词注入（beforeModel hook）
