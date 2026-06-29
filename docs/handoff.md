# Handoff — Cline Runtime 探查完成 + design.md 修正

## 本会话决策

| 决策 | 状态 |
|------|------|
| Cline SDK 源码从 GitHub 拉取（19 文件 shallow fetch） | ✅ 完成 |
| 4 Task 探查全部完成，§6 已填充 | ✅ 完成 |
| design.md §8 Q1/Q3 已回答 | ✅ 完成 |
| design.md §3.1 流程图修正（MB 在 compact 前执行） | ✅ 完成 |
| design.md §3.4 降级行为修正（sandbox fallback，非 API-safety） | ✅ 完成 |

## 本会话净变化

### 1. Cline Runtime 源码探查（4 Task 完成）

**Task A — compact 执行链**：
- **关键发现**：plugin messageBuilder.build() 在 compact 判定**之前**执行
- 完整调用链：`orchestrator.executeRunInternal → prepareTurn 闭包 → prepareProviderMessagesForApi（plugin MB + API-safety）→ compact 策略判定`
- plugin MB 修改消息内容会影响 compact 的 token 估算
- compact-observer 的 build() 收到的是 compact 前的原始消息

**Task B — checkpoint 机制**：
- Cline 有完整的 shadow-git checkpoint 系统
- 每次 tool use 后自动触发
- **不需要自建 checkpoint**

**Task C — messageBuilder 调用时机**：
- 每 turn 一次，串行执行
- plugin MB 先于 API-safety buildForApi()
- sandbox 有 catch+retry 降级，API-safety 不兜底 plugin 异常
- 单 session 无并发问题

**Task D — rules 注入频率**：
- 每 turn 注入 system prompt（composeSystemPrompt）
- content 函数每 turn 重新调用
- rules 先于 messageBuilder 执行

### 2. design.md 修正

- §3.1 流程图：从简化版修正为完整调用链，标注 plugin MB 在 compact 前
- §3.4 降级行为：修正 messageBuilder 异常描述（sandbox fallback，非 API-safety）
- §8 Q1：已回答（MB 在 compact 前被调用）
- §8 Q3：已回答（单 session 无并发，跨 session 风险极低）

### 3. 产出文件

- `docs/decisions/investigation-note-cline-runtime-probe.md` §6 已填充（4 Task 结果 + §6.1 关键发现）
- `docs/plugin/design.md` §3.1/§3.4/§8 已更新
- `.cline-repo/` 已 .gitignore（GitHub fetch 的源码，不入库）

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **用户验证插件加载** | Reload VS Code → 确认 context-snapshot 出现在 Customize → Plugins | 🔴 高 — 阻塞后续所有插件验证 |
| **重新设计 snapshot 内容生成** | 基于发现 1（MB 在 compact 前），plugin 需自行判断是否写 snapshot | 🔴 高 — 核心设计变更 |
| **实现 #4 beforeModel 提示词注入** | 读 detectRepetition() 结果注入 messages（不依赖探查）| 🟡 中 — 可并行 |
| **PROJECT_DEV_OUTLINE §5.3 更新** | checkpoint 验证项已回答 | 🟢 低 |
| **ADR-005 evidence_as_of 更新** | 标注 2026-06-29 探查日期 | 🟢 低 |

## 权威源

[dev-rules.md](dev-rules.md) · [investigation-note-cline-runtime-probe.md](decisions/investigation-note-cline-runtime-probe.md) · [design.md](plugin/design.md) · [ADR-005](decisions/ADR-005-split-compact-from-handoff.md)

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意 §1.5-§1.14 执行门控）与 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：4 Task 源码探查全部完成，design.md 已修正。探查发现 plugin messageBuilder 在 compact 判定之前执行，需要重新设计 snapshot 内容生成策略。

**下次首要动作**：
1. **用户验证插件加载**：Reload VS Code → 确认 context-snapshot 出现在 Customize → Plugins → 触发一次 compact 检查 `~/.cline/data/snapshot/` 产出
2. **重新设计 snapshot 内容生成**：基于探查发现（MB 在 compact 前执行），决定 compact-observer 的 build() 如何判断当前是否应该写 snapshot（自行 token 估算 vs 其他信号）
3. **实现 #4 beforeModel 提示词注入**：读 `toolRecorder.detectRepetition()` 结果，通过 hooks.beforeModel 注入警告消息到 messages
