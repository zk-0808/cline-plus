# Handoff — A1/A2/A5 完成 + 文档生命周期全量补标

> **生命周期**：每次覆写，无归档——会话交接文件。

## 本会话决策

| 决策 | 状态 |
|------|------|
| A1：修复 beforeModel content 类型（string → ContentBlock[]）| ✅ index.ts 两处修改 |
| A2：V2-A 静态审计 | ✅ tsc --noEmit 零错误，5 步骤通过 |
| A5：V6 Loop Guard 实现 | ✅ afterTool 检测 + registerRule 动态注入，beforeModel hook 移除 |
| F1 发现：compaction.ts buildCompactionSummary 同样返回 string content | ⚠️ 记录，受 §1.15 阻塞 |
| dev-rules §6：文档生命周期标注规则 | ✅ 新增 + 63 文件全量补标 |
| 任务书归档 | ✅ subagent-task-A1-A2.md → docs/archive/subagent-tasks/ |

## 本会话净变化

### 1. A1 修复 beforeModel content 类型

[index.ts](context-snapshot/src/index.ts) 两处修改：
- **content**：`string` → `[{ type: "text", text }]`（ContentBlock[] 数组）
- **META_MARKER 检查**：`typeof === "string"` → `Array.isArray` + `.some()`

根因：[investigation-note O8](decisions/investigation-note-cli-codec-content-map-bug.md) Verified — codec `Nd` 函数调用 `n.content.map(eK)`，string 无 `.map()` 方法必崩。

### 2. A2 V2-A 静态审计

[审计报告](plugin/v2a-static-audit-report.md)：tsc --noEmit 零错误，5 步骤全部通过。
- 需为 `@cline/core` 创建类型 stub（peer dependency，运行时由 Cline 注入）
- F1 记录：`compaction.ts` `buildCompactionSummary()` 同样返回 string content，当前受 §1.15 阻塞

### 3. A5 V6 Loop Guard 实现

**架构变更**：loop warning 注入路径从 `beforeModel`（message codec）迁移到 `registerRule`（system prompt），完全绕过 codec bug。

```
旧路径（已移除）：afterTool → detectRepetition → beforeModel → 注入 messages → codec → 💥
新路径（V6）：    afterTool → detectRepetition → loopState → registerRule.content() → system prompt → ✅
```

关键设计：
- `LoopState` 共享状态：afterTool 写入，registerRule 读取
- `registerRule('loop-guard')`：动态内容函数，检测到重复时注入警告文本
- 兜底：`warningCount >= MAX_LOOP_WARNINGS` 时停止注入，交由 Cline max iterations
- `beforeModel` hook 已移除（V6 替代后不再需要）

### 4. dev-rules §6 文档生命周期标注

新增规则：所有 `docs/` 下文档必须标注生命周期，6 种类型（永久保留 / 功能绑定 / 版本绑定 / 任务绑定 / 事件绑定 / 会话绑定）。归档条件必须具体可判定。

63 个活跃文件全量补标完成，零遗漏。

### 5. mechanism-candidates 更新

| # | 变更 |
|---|------|
| #4 Loop Guard | 候选 → **实验中**（V6 实现完成，tsc 通过，待 CLI 实测）|

### 6. dev-rules §1.15 更新

补充 V6 实现完成声明：Loop Guard 注入层从 🔴 阻塞恢复为 🟢 可用（V6 路径）。

## 产出文件

| 文件 | 变更 |
|------|------|
| `context-snapshot/src/index.ts` | A1 content 类型修复 + V6 Loop Guard 重写 |
| `context-snapshot/node_modules/@cline/core/index.d.ts` | 类型 stub（tsc 审计用）|
| `docs/plugin/v2a-static-audit-report.md` | 🆕 A2 审计报告 |
| `docs/dev-rules.md` | §6 文档生命周期规则 + §1.15 V6 声明 |
| `docs/mechanism-candidates.md` | #4 状态更新 |
| `docs/archive/subagent-tasks/subagent-task-A1-A2.md` | 🆕 任务书归档 |
| 63 个文档 | 生命周期标注补全 |

## Commits

| Hash | Repo | Message |
|------|------|---------|
| `659dd1c` | context-snapshot | fix: beforeModel content type string → ContentBlock[] array (A1) |
| `953f0e5` | context-snapshot | feat: V6 Loop Guard 实现 — afterTool 检测 + registerRule 动态注入 |
| `1a20dfc` | cline-plus | docs: A1 fix + A2 V2-A static audit report |
| `51cb276` | cline-plus | handoff: A1/A2 完成 + F1 发现 |
| `bdcede5` | cline-plus | archive: subagent-task-A1-A2 任务书归档 |
| `45b983b` | cline-plus | docs: 全量补标文档生命周期（§6 新规则 + 63 文件标注）|
| `84b5b64` | cline-plus | feat: A5 V6 Loop Guard 实现 + dev-rules/mechanism-candidates 更新 |

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **A3 W2 handoff.md schema 化** | 三字段（id/confidence/depends_on）升级，详见 [external-review-round2-handoff.md](plugin/external-review-round2-handoff.md) | 🟡 P1 |
| **A4 W1 v0.7.0 提取器** | 结构化提取替代简单正则，详见 [snapshot-extractor-design.md](plugin/snapshot-extractor-design.md) | 🟡 P1 |
| **V6 CLI 实测** | Loop Guard 注入层 + 检测层端到端验证（§1.15 codec bug 仍存在，需构造短场景避免触发）| 🟡 P1 |
| **提交 cline/cline issue** | codec bug issue 草稿已就绪（[draft-issue-cli-codec-content-map-bug.md](decisions/draft-issue-cli-codec-content-map-bug.md)）| 🟡 中 |
| **GitHub issue #11944 跟进** | 等作者回复 SDK 迁移时间线 | 🟡 中 |
| **F1 compaction.ts string content** | buildCompactionSummary 同类 bug，受 §1.15 阻塞 | 🟡 中 |
| **补证 H2/H3** | image 分支 undefined 丢弃 + 下游连锁风险（Hypothetical）| 🟢 低 |
| **监控 VS Code 扩展后续 release** | 关键词 `Plugins` / `Customize marketplace` / `registerMessageBuilder` | 🟢 低 |

## 权威源

[dev-rules.md](dev-rules.md) · [design.md](plugin/design.md) · [ADR-005](decisions/ADR-005-split-compact-from-handoff.md) · [mechanism-landing-assessment.md](plugin/mechanism-landing-assessment.md) · [investigation-note-cli-codec-content-map-bug.md](decisions/investigation-note-cli-codec-content-map-bug.md) · [v2a-static-audit-report.md](plugin/v2a-static-audit-report.md)

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意 §1.15 不可抗力门控 + V6 实现状态）与 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：A1/A2/A5 全部完成（beforeModel content 类型修复 + 静态审计通过 + V6 Loop Guard 实现）+ dev-rules §6 文档生命周期规则建立 + 63 文件全量补标。本会话核心增量是 V6——loop warning 注入路径从 beforeModel（message codec）迁移到 registerRule（system prompt），彻底绕开 codec bug。

**下次首要动作**（按优先级）：
1. **🟡 P1：A3 W2 handoff.md schema 化**（三字段升级）
2. **🟡 P1：A4 W1 v0.7.0 提取器**（结构化提取替代正则）
3. **🟡 P1：V6 CLI 实测**（构造短场景验证 Loop Guard 端到端）
4. **🟡 中：提交 codec bug issue + 跟进 #11944**
5. **🟡 中：F1 compaction.ts string content 修复**
