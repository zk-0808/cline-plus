# DEPRECATED — P5 Spike 已被 ADR-005 + context-snapshot 取代

> **状态**: superseded（2026-06-28）
> **取代者**: [ADR-005: Split Compaction from Handoff](../../docs/decisions/ADR-005-split-compact-from-handoff.md) + [context-snapshot 插件](../../context-snapshot/)
> **目录保留原因**: ADR-003 决定"保留目录和产物作为未来迁移入口"，作为历史参考。

## 为什么废弃

P5 Spike 将 compaction（token 管理）和 handoff（状态持久化）绑定在同一个触发器（`registerMessageBuilder` compact 事件）和同一个产物（`handoff.md`）中。ADR-005 认定这是"耦合两个无关关注点"，做出以下架构变更：

| p5-spike 能力 | context-snapshot 等价物 | 变化 |
|---|---|---|
| `registerMessageBuilder` compact 触发写 `handoff.md` | `compact-observer`（仅观察）+ `snapshot-writer`（写快照） | 解耦 |
| `index.jsonl` 追加 | 移除 | ADR-005 废弃（Cline SQLite DB 已存会话元数据） |
| `beforeRun` hook（会话启动） | `rules-injector`（动态规则注入） | 替换 |
| `handoff/` 目录 | `~/.cline/data/snapshot/` | 新位置 |

## 不应在此目录做的事

- 新增代码或修改 `p5-spike-plugin.ts`
- 基于此插件开发新功能
- 引用此目录作为活跃实验

## 如需恢复参考

- 机制层面：#6 `beforeRun` hook 已实证触发（`handoff/session-start.log`），结论保留
- 架构层面：compact 与 handoff 拆分已落实为 context-snapshot，无需回退到此设计
- ADR-004 恢复条件第 3 条（"#5 compact 双产物仍为未解问题"）已被 ADR-005 推翻
