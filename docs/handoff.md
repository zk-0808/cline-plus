# Handoff — 源码探查完成 + #4 beforeModel 实现 + VS Code 插件不可用确认

## 本会话决策

| 决策 | 状态 |
|------|------|
| Cline SDK 源码从 GitHub 拉取（19 文件），4 Task 探查全部完成 | ✅ |
| design.md §8 Q1/Q3 已回答，§3.1 流程图已修正 | ✅ |
| #4 beforeModel 提示词注入已实现（v0.5.0） | ✅ |
| VS Code 扩展 4.0.x 不支持插件（回滚到 3.89.2 pre-SDK） | ✅ 确认 |
| GitHub issue #11944 待用户补充评论 | ⬜ |

## 本会话净变化

### 1. Cline Runtime 源码探查（4 Task）

**Task A — compact 执行链**：
- plugin messageBuilder.build() 在 compact 判定**之前**执行
- 调用链：`orchestrator.prepareProviderMessagesForApi（plugin MB + API-safety）→ compact 策略判定`
- plugin MB 修改消息内容会影响 compact token 估算

**Task B — checkpoint**：
- Cline 有完整 shadow-git checkpoint 系统，每 tool use 后自动触发
- 不需要自建 checkpoint

**Task C — messageBuilder**：
- 每 turn 一次，串行执行，单 session 无并发
- sandbox 有 catch+retry 降级，API-safety 不兜底 plugin 异常

**Task D — rules**：
- 每 turn 注入 system prompt（composeSystemPrompt），content 函数每 turn 重新调用

### 2. design.md 修正

- §3.1 流程图：修正为完整调用链（MB → API-safety → compact → beforeModel）
- §3.4 降级行为：修正异常描述（sandbox fallback，非 API-safety）
- §8 Q1/Q3：已回答

### 3. #4 beforeModel 实现

`handoff-plugin/src/index.ts` 新增 `hooks.beforeModel`：
- 检查 `toolRecorder.detectRepetition(5, 3)`
- 检测到循环 → 注入 user message 警告
- 去重：检查最后一条消息是否已含 "LOOP DETECTED"
- 插件版本升至 v0.5.0

### 4. VS Code 插件支持状态

- **v4.0.1**：回滚到 3.89.2（pre-SDK），plugin 系统不存在
- **v4.0.2**：继承回滚，extension.js 无任何 plugin 代码
- **CLI 3.0.30+**：SDK 版本，plugin 全功能可用
- **根因**：release notes 确认 "Roll the stable VS Code extension back to the pre-SDK-migration codebase"
- **GitHub issue #11944**：已提交，Linear bot 关联 CLINE-2584，作者未回复

## 产出文件

| 文件 | 变更 |
|------|------|
| `docs/decisions/investigation-note-cline-runtime-probe.md` | §5/§6 已填充（4 Task 结果 + 关键发现）|
| `docs/plugin/design.md` | §3.1/§3.4/§8 已更新 |
| `docs/handoff.md` | 本文件 |
| `handoff-plugin/src/index.ts` | 新增 beforeModel hook |
| `handoff-plugin/package.json` | v0.5.0 |
| `.gitignore` | .cline-repo/ |

## Commits

| Hash | Message |
|------|---------|
| `ae2f896` | feat(#4): beforeModel loop guard in context-snapshot plugin |
| `6b1e04b` | handoff: runtime probe complete, design.md corrected |
| `5e13c34` | probe: complete 4-task Cline runtime source investigation |

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **VS Code 插件验证** | 等 SDK 迁移重新合入 VS Code 扩展后验证 | 🔴 高 — 阻塞所有 VS Code 端验证 |
| **CLI 端验证插件** | 用 `cline -i` 跑完整 plugin 链（compact-observer + beforeModel + rules） | 🔴 高 — 当前唯一可行路径 |
| **重新设计 snapshot 内容生成** | 基于探查发现（MB 在 compact 前），决定 compact-observer 如何判断写 snapshot | 🟡 中 |
| **GitHub issue #11944 跟进** | 用户补充评论后等作者回复 SDK 迁移时间线 | 🟡 中 |
| **PROJECT_DEV_OUTLINE §5.3 更新** | checkpoint 验证项已回答 | 🟢 低 |

## 权威源

[dev-rules.md](dev-rules.md) · [investigation-note-cline-runtime-probe.md](decisions/investigation-note-cline-runtime-probe.md) · [design.md](plugin/design.md) · [ADR-005](decisions/ADR-005-split-compact-from-handoff.md)

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意 §1.5-§1.14 执行门控）与 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：4 Task 源码探查完成，#4 beforeModel 已实现，VS Code 扩展 4.0.x 确认不支持插件（回滚到 pre-SDK）。CLI 3.0.30+ 是当前唯一可用的插件运行环境。

**下次首要动作**：
1. **CLI 端验证插件全链路**：用 `cline -i` 跑一个长对话任务，验证 compact-observer + beforeModel + rules-injector 三个能力是否正常工作
2. **重新设计 snapshot 内容生成**：基于探查发现（MB 在 compact 前执行），plugin 的 compact-observer build() 收到的是 compact 前的原始消息，需自行判断是否写 snapshot
3. **issue #11944 跟进**：等作者回复 SDK 迁移时间线
