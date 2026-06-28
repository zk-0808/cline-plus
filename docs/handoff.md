# Handoff — Plugin 重构完成 + 机制评估

## 本会话决策

| 决策 | 状态 |
|------|------|
| [ADR-005](decisions/ADR-005-split-compact-from-handoff.md) Compaction 与 Handoff 拆分 | ✅ Accepted + 外部评审修订 |
| [mechanism-landing-assessment.md](plugin/mechanism-landing-assessment.md) 11 条候选落地评估 | ✅ 完成（含 3 处事实修正 + 3 处设计补丁） |
| handoff-plugin 重构 | ✅ 代码完成（4 模块 511 行） |
| mechanism-candidates #5/#6/#7 状态同步 | ✅ 已更新 |

## Plugin 重构架构

```
handoff-plugin/src/
├── index.ts             ← 入口：注册 compact-observer + rules-injector + hooks
├── compaction.ts        ← token 估算 + shouldCompact（保留）
├── tool-recorder.ts     ← 统一工具调用记录器（#1 慢调用 + #4 循环检测）
├── rules-injector.ts    ← handoff.md 动态注入 + 文件命名规范
└── types.ts             ← 类型定义（精简，移除 IndexEntry）
```

关键设计：
- **compact-observer**：只观察 compact 事件，日志记录，不写 handoff
- **rules-injector**：`rules.content` 函数动态读最新 handoff.md，按 `{project_hash}-{timestamp}-{uuid}` 命名
- **tool-recorder**：beforeTool/afterTool 统一采集，供 #1 慢调用告警 + #4 重复检测
- **index.jsonl 已废弃**（ADR-005）

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
| **beforeTool 命令改写** | #2 PowerShell NoProfile + #3 UTF-8 编码注入 | 中 |
| **Loop Guard 提示词注入** | #4 beforeModel hook 检测重复后注入警告 | 中 |
| **File Hooks 验证** | #7 TaskStart 事件文件名/路径/扩展名实测 | 中 |
| **GitHub Issue 提交** | VS Code bootstrap 缺失 | 中 |
| **子模块推送** | 需 GitHub 认证 | 低 |

## 权威源

[dev-rules.md](dev-rules.md) · [ADR-005](decisions/ADR-005-split-compact-from-handoff.md) · [mechanism-landing-assessment.md](plugin/mechanism-landing-assessment.md) · [design.md](plugin/design.md)

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意 §1.5-§1.14 执行门控）与 docs/search/project-rules.md 各一次，遵守三份文档职责划分与防漂移约束。
然后读 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：ADR-005 已落地，handoff-plugin 重构完成（4 模块架构）。机制评估 11 条候选已分析，外部评审 6 处修正已应用。

**下次首要动作**：
1. 实测 #6 注入：验证 Cline rules.content 动态函数能否在新会话中注入 handoff 内容
2. 实现 beforeTool 命令改写（#2 PowerShell NoProfile + #3 UTF-8）
3. File Hooks 验证（#7 TaskStart 事件格式实测）
