# Handoff — Plugin 模块补全 + 测试验证

## 本会话决策

| 决策 | 状态 |
|------|------|
| [ADR-005](decisions/ADR-005-split-compact-from-handoff.md) Compaction 与 Handoff 拆分 | ✅ Accepted + 外部评审修订 |
| [mechanism-landing-assessment.md](plugin/mechanism-landing-assessment.md) 11 条候选落地评估 | ✅ 完成（含 3 处事实修正 + 3 处设计补丁） |
| handoff-plugin 完整实现 | ✅ 5 模块 950 行，39 tests 全通过 |
| tool-recorder.ts 新增 | ✅ #1 慢调用监控 + #4 循环检测（N-gram/振荡/持续错误） |
| rules-injector.ts 新增 | ✅ #6 动态 handoff 注入 + findLatestHandoff + 文件命名规范 |
| index.ts 重构 | ✅ 注册 messageBuilders + rules + hooks 三类能力 |
| @cline/core + @cline/shared 类型桩 | ✅ 编译时类型 + 运行时 stub |
| 文档归档 | ✅ 55 个文件 → `docs/archive/`，8 个 ARCHIVE 摘要留在原位 |
| 断链修复 | ✅ 80 处 → 0 断链 |
| GitHub Issue 提交 | ✅ VS Code bootstrap 缺失 |
| mechanism-candidates #5/#6/#7 状态同步 | ✅ 已更新 |

## Plugin 架构

```
handoff-plugin/src/
├── index.ts (223行)       ← 入口：注册 compact-observer + rules-injector + hooks
├── compaction.ts (167行)  ← token 估算 + shouldCompact（保留）
├── tool-recorder.ts (321行) ← 统一工具调用记录器（#1 慢调用 + #4 循环检测）
├── rules-injector.ts (155行) ← handoff.md 动态注入 + 文件命名规范
└── types.ts (84行)        ← 类型定义（ToolRecord / LoopPattern / IndexEntry）

handoff-plugin/test/
├── tool-recorder.test.ts    ← 14 tests（记录/慢调用/N-gram/振荡/持续错误）
├── rules-injector.test.ts   ← 16 tests（hash/命名/查找/动态内容）
└── plugin-lifecycle.test.ts ← 9 tests（manifest/setup/messageBuilder/rule/hooks）

handoff-plugin/types/@cline/
├── core/index.d.ts          ← Message/PluginApi/hooks 类型桩
└── shared/index.d.ts        ← estimateTokens 类型桩
```

## 机制评估结论

| 类别 | 候选 | 落地路径 |
|------|------|---------|
| 可直接落地 | #5 messageBuilder、#6 rules 动态函数、#14 已转向 | Cline 原生 |
| Plugin 层可落地 | #1 降级监控、#2-3 beforeTool 改写、#4 检测+提示词+兜底 | tool-recorder + beforeTool |
| 待验证 | #7 File Hooks Windows 支持 | 官方无 .ps1 证据 |
| 暂缓 | #20/#21/#22 | 需外部依赖 |

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **#6 注入验证** | 实测 Cline rules.content 动态函数能否正常注入 | 高 |
| **beforeTool 命令改写** | #2 PowerShell NoProfile + #3 UTF-8 编码注入（tool-recorder 已预留 hook 接入点） | 中 |
| **Loop Guard 提示词注入** | #4 beforeModel hook 检测重复后注入警告（detection 已完成，缺 beforeModel 注入层） | 中 |
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

接续上下文：ADR-005 已落地，handoff-plugin 5 模块完整实现（950 行），39 tests 全通过。tool-recorder 实现 #1 慢调用监控 + #4 三种循环检测（N-gram/振荡/持续错误），rules-injector 实现 #6 动态注入。11 条候选机制评估完成，55 个文档已归档，80 处断链已修复，GitHub Issue 已提交。

**下次首要动作**：
1. 推送分支（需 GitHub 认证）
2. 实测 #6 注入：验证 Cline rules.content 动态函数能否在新会话中注入 handoff 内容
3. 实现 beforeTool 命令改写（#2 PowerShell NoProfile + #3 UTF-8）
