# Handoff — A1/A2/A3/A4/A5/V6 全部验证完成

> **生命周期**：每次覆写，无归档——会话交接文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `a1-content-fix` | A1：beforeModel content string → ContentBlock[] | Verified | — |
| `a2-static-audit` | A2：V2-A 静态审计，tsc 零错误 | Verified | — |
| `a5-v6-loop-guard` | A5：V6 Loop Guard 实现（afterTool → loopState → messageBuilder，移除 beforeModel）| Verified | — |
| `a3-handoff-schema` | A3：handoff schema 化（dev-rules §2.2 三字段强制）| Verified | — |
| `a4-extractor` | A4：v0.7.0 提取器（数据模型 + 4 提取器 + 渲染层解耦）| Verified | — |
| `doc-lifecycle` | dev-rules §6 文档生命周期标注 + 63 文件全量补标 | Verified | — |
| `f1-compaction` | F1：compaction.ts buildCompactionSummary 同类 string content bug（已修复 commit `5ac7cec`） | Verified | `codec-bug-fix` |
| `v6-message-builder` | V6：registerRule 只评估一次（死路径），切换到 messageBuilder 注入 warning | Verified | `a5-v6-loop-guard` |
| `a4-phase4-pass` | A4 Phase 4：3 场景 100% recall + 100% precision，提取器验证通过 | Verified | `a4-extractor` |

## 本会话净变化

### 1. A1 beforeModel content 类型修复

`index.ts` 两处：content `string` → `[{ type: "text", text }]`，META_MARKER 检查适配 array。根因：O8 Verified — codec `Nd` 函数调用 `n.content.map()`，string 无 `.map()` 必崩。

### 2. A5 V6 Loop Guard 实现 + 验证

loop warning 注入路径经历两次迭代：
- **V6 初始设计**：afterTool → registerRule 动态内容（system prompt 注入）。**发现 registerRule content 函数在 CLI 3.0.34 只在 session 启动时评估一次，永不重新评估**（rule-eval.log 仅 1 条记录）。死路径。
- **最终方案**：afterTool → loopState → messageBuilder（conversation context 注入）。registerMessageBuilder 每次 model request 都被调用（已验证）。注入 user-role 消息，content 为 ContentBlock[] 格式（绕过 §1.15 codec bug）。
- 模型在 [thinking] 中明确回应了 "The system is warning me about repeating the same tool call"。
- 生产参数：window=3, threshold=2。

### 3. A4 v0.7.0 提取器

- types.ts 新增 SnapshotData / Extractor<T> / 4 种 Record 类型
- extractors/ 目录：decision / change / todo / source 四个提取器
- snapshot-writer.ts 重构：extractSnapshotData + renderSnapshot 解耦

### 4. V6 测试记录

| 日期 | 步数 | 参数 | 注入路径 | 模型回应 | codec bug | 结论 |
|------|------|------|---------|---------|-----------|------|
| 2026-07-01 | 12 | window=5,threshold=3 | — | — | ✅ 步骤12崩溃 | 参数过大 |
| 2026-07-01 | 8 | window=3,threshold=2 | — | — | ❌ | 子模块未更新（参数仍是5/3）|
| 2026-07-01 | 5 | window=1,threshold=1 | registerRule | ❌ 只评估1次 | ❌ | registerRule 死路径 |
| 2026-07-01 | 5 | window=1,threshold=1 | messageBuilder | ✅ thinking 中回应 | ❌ | **验证通过** |

### 5. A4 Phase 4 精度验证

3 个场景（EN 显式决策 / CN assistant 决策 / 混合最小决策），每个场景对比提取器输出与人工标注 ground truth。结果：全部 **100% recall + 100% precision**。验证脚本：`context-snapshot/verify-extractors.cjs`（需 tsc CJS 编译到 dist/）。

观察项（不影响通过）：
- 首条消息决策置信度为 low（无前文上下文）
- assistant todo 优先级固定 tbd（即使含紧急关键词）
- change extractor 向后兼容 files[] 参数产生 low 噪音

## Commits

| Hash | Repo | Message |
|------|------|---------|
| `659dd1c` | context-snapshot | fix: beforeModel content type string → ContentBlock[] (A1) |
| `953f0e5` | context-snapshot | feat: V6 Loop Guard 实现 |
| `8548afd` | context-snapshot | feat: v0.7.0 提取器 |
| `568feb9` | context-snapshot | fix: window=3, threshold=2 |
| `184d1e1` | cline-plus | fix: Loop Guard 参数调整 |

## 未完成项

| id | 方向 | 说明 | 优先级 | confidence | depends_on |
|----|------|------|--------|-----------|------------|
| `issue-11944` | GitHub #11944 跟进 | SDK 迁移时间线 | 🟡 中 | Verified | — |
| `f1-compaction` | F1 compaction.ts string content | 同类 bug，**已修复**（commit `5ac7cec`，string → ContentBlock[]） | 🟢 低 | Verified | `codec-bug-fix` |
| `h2-h3-evidence` | 补证 H2/H3 | image 分支 undefined 丢弃 | 🟢 低 | Hypothesis | — |
| `vscode-monitor` | 监控 VS Code release | 关键词 Plugins / registerMessageBuilder | 🟢 低 | Verified | `issue-11944` |

## 权威源

[dev-rules.md](dev-rules.md) · [design.md](plugin/design.md) · [v2a-static-audit-report.md](plugin/v2a-static-audit-report.md) · [snapshot-extractor-design.md](plugin/snapshot-extractor-design.md) · [investigation-note-cli-codec-content-map-bug.md](decisions/investigation-note-cli-codec-content-map-bug.md)

> **新会话首动作**：除读 dev-rules.md + handoff.md 外，必须读 [plugin/project-rules.md](plugin/project-rules.md) §3 治理类规则——context-snapshot 开发期项目级规则承载位。

---

## Handoff

```text
P0/P1 全部完成。剩余项均为中/低优先级（监控 + 受阻塞项）。读 docs/dev-rules.md §1.15 了解 codec bug 现状。
```

**后续动作**（无紧急项）：
1. **🟡 中：跟进 GitHub #11944** — SDK 迁移时间线
2. ~~**🟡 中：F1 compaction.ts string content**~~ — ✅ 已修复（commit `5ac7cec`，string → ContentBlock[]）
3. **🟢 低：监控 VS Code release** — 关键词 Plugins / registerMessageBuilder
