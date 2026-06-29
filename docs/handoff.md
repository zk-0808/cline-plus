# Handoff — 命名决议 + Context Snapshot 设计讨论

## 本会话决策

| 决策 | 状态 |
|------|------|
| ADR-005 方向确认正确 | ✅ 用户确认 |
| 命名决议：窗口内压缩产物 = "context snapshot"，跨会话状态快照 = "handoff" | ✅ 已落地到 ADR-005 + 全部源码 + 文档 |
| Plugin 重命名：auto-handoff → context-snapshot | ✅ PLUGIN_NAME / rule name / dir path / function names 全部更新 |
| 64 tests 全通过 | ✅ 重命名后验证 |
| Cline 源码探查规划 | 📋 规划完成，待执行（需先确认源码获取方式） |

## 本会话净变化

### 命名统一（ADR-005 命名决议）

"handoff" 和 "context snapshot" 是两个不同概念，之前共享一个名字导致混淆：

| 术语 | 含义 | 产物 | 存储位置 |
|------|------|------|---------|
| **context snapshot** | 窗口内压缩产物 | 自动生成的上下文摘要 | `~/.cline/data/snapshot/` |
| **handoff** | 跨会话状态快照 | 用户手写的状态交接文档 | `docs/handoff.md`（git 追踪） |

已更新范围：
- 源码：`index.ts` / `rules-injector.ts` / `types.ts`（函数名、变量名、注释、rule name、存储路径）
- 测试：`rules-injector.test.ts` / `plugin-lifecycle.test.ts`
- 文档：`design.md`（标题 + 术语约定 + 存储路径 + 模块表）、`mechanism-landing-assessment.md`（Q4 + 汇总表 + Phase 1）
- ADR-005：新增 "命名决议" 小节
- `package.json`：version 0.3.0 → 0.4.0，description 更新

### 设计讨论核心发现

1. **compact 是 Cline 会话内唯一能重置上下文的机制** — plugin 借此时机写 snapshot，compact 后通过 rules 注入回来，实现无缝续作
2. **代码与 ADR-005 不完全对齐** — messageBuilder 仍在 compact 触发时写 snapshot（当前实现），ADR-005 说 compact-observer 应只观察不产出。但这个矛盾在 compact 是唯一介入点的约束下可能是合理的
3. **snapshot 内容质量不足** — 当前用正则关键词匹配 + 120 字符截取，不够支撑 compact 后的无缝续作
4. **index.ts 职责过重** — snapshot 生成逻辑（80 行）应拆到独立模块
5. **#4 Loop Guard 缺注入层** — 检测完成（N-gram/振荡/持续错误），但只 console.warn，模型看不到

### 同步脚本

跨环境协作（本地 ↔ 云端 agent）后，用同步脚本安全拉取远端变更，不丢本地未提交改动：

| 脚本 | 用法 | 环境 |
|------|------|------|
| `scripts/sync.sh` | `bash scripts/sync.sh [项目路径]` | Git Bash / WSL |
| `scripts/sync.ps1` | `.\scripts\sync.ps1 [-Project "E:\cline++"]` | PowerShell |

默认项目路径为 `E:/cline++`，可传参覆盖。

**使用时机**：云端 agent 推送变更后，本地开始工作前执行一次。

**执行流程**：检查本地状态 → 自动 stash → fetch → rebase/ff → 恢复 stash → 子模块同步 → 输出摘要。

**冲突处理**：
- rebase 冲突：自动中止 rebase，需手动 `git rebase origin/main`
- stash pop 冲突：改动保留在 stash 中，用 `git stash list` 查看后手动 `git stash pop stash@{N}`

**摘要提示**：同步完成后如果 `handoff.md` 有变更，脚本会提示"建议阅读"。

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **Cline 源码探查** | 搞清 /compact 执行链、checkpoint 机制、messageBuilder 调用时机、rules 注入频率 | 🔴 高 — 所有后续设计依赖此探查结果 |
| **snapshot 内容设计** | 探查完成后重新设计：语义级摘要（非正则提取）、体积控制（2K-4K token）、生命周期管理 | 🔴 高 — 依赖探查 |
| **#4 beforeModel 注入** | 读 detectLoopPatterns() 结果注入 messages（代码层面缺失，设计完整） | 🟡 中 — 不依赖探查 |
| **推送分支** | `feat/adr-005-compact-handoff-split` | 🟡 中 |

## 权威源

[dev-rules.md](dev-rules.md) · [ADR-005](decisions/ADR-005-split-compact-from-handoff.md) · [mechanism-landing-assessment.md](plugin/mechanism-landing-assessment.md) · [design.md](plugin/design.md)

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意 §1.5-§1.14 执行门控）与 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：命名决议已落地（context snapshot vs handoff），6 模块 64 tests 全通过。下一步是 Cline 源码探查——搞清 /compact 和 checkpoint 的原生机制，然后重新设计 snapshot 内容和注入策略。

**下次首要动作**：
1. Cline 源码探查：/compact 执行链、checkpoint、messageBuilder 调用时机、rules 注入频率
2. 基于探查结果重新设计 context snapshot 内容生成
3. 实现 #4 beforeModel 提示词注入（不依赖探查，可并行）
