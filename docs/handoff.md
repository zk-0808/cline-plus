# Handoff — A1/A2/A3/A4/A5 完成 + V6 待本地验证

> **生命周期**：每次覆写，无归档——会话交接文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `a1-content-fix` | A1：beforeModel content string → ContentBlock[] | Verified | — |
| `a2-static-audit` | A2：V2-A 静态审计，tsc 零错误 | Verified | — |
| `a5-v6-loop-guard` | A5：V6 Loop Guard 实现（afterTool → registerRule，移除 beforeModel）| Verified | — |
| `a3-handoff-schema` | A3：handoff schema 化（dev-rules §2.2 三字段强制）| Verified | — |
| `a4-extractor` | A4：v0.7.0 提取器（数据模型 + 4 提取器 + 渲染层解耦）| Verified | — |
| `doc-lifecycle` | dev-rules §6 文档生命周期标注 + 63 文件全量补标 | Verified | — |
| `f1-compaction` | F1：compaction.ts buildCompactionSummary 同类 string content bug | Likely | `codec-bug-fix` |

## 本会话净变化

### 1. A1 beforeModel content 类型修复

`index.ts` 两处：content `string` → `[{ type: "text", text }]`，META_MARKER 检查适配 array。根因：O8 Verified — codec `Nd` 函数调用 `n.content.map()`，string 无 `.map()` 必崩。

### 2. A5 V6 Loop Guard 实现

loop warning 注入路径从 beforeModel（message codec）迁移到 registerRule（system prompt）：
- `LoopState` 共享状态（afterTool 写入，registerRule 读取）
- `registerRule('loop-guard')` 动态内容函数
- `beforeModel` hook 已移除
- 参数调整：window=5→3, threshold=3→2（在 codec 崩溃前触发）

### 3. A4 v0.7.0 提取器

- types.ts 新增 SnapshotData / Extractor<T> / 4 种 Record 类型
- extractors/ 目录：decision / change / todo / source 四个提取器
- snapshot-writer.ts 重构：extractSnapshotData + renderSnapshot 解耦

### 4. V6 测试记录

| 日期 | 步数 | 参数 | LOOP DETECTED | codec bug | 结论 |
|------|------|------|--------------|-----------|------|
| 2026-07-01 | 12 | window=5,threshold=3 | ❌ | ✅ 步骤12崩溃 | 参数过大 |
| 2026-07-01 | 8 | window=3,threshold=2 | ❌ | ❌ | 子模块未更新（参数仍是5/3）|
| 待测 | 8 | window=3,threshold=2 | ? | ? | 子模块已推568feb9 |

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
| `v6-test` | V6 CLI 实测 | 子模块已推568feb9，本地拉取后重跑8步测试 | 🔴 P0 | Likely | `a5-v6-loop-guard` |
| `a4-phase4` | A4 Phase 4 精度验证 | 用真实会话数据验证提取精度≥80%召回率 | 🟡 P1 | Likely | `a4-extractor` |
| `codec-issue` | 提交 cline/cline issue | draft 已就绪 | 🟡 中 | Verified | — |
| `issue-11944` | GitHub #11944 跟进 | SDK 迁移时间线 | 🟡 中 | Verified | — |
| `f1-compaction` | F1 compaction.ts string content | 同类 bug，受 §1.15 阻塞 | 🟡 中 | Likely | `codec-bug-fix` |
| `h2-h3-evidence` | 补证 H2/H3 | image 分支 undefined 丢弃 | 🟢 低 | Hypothesis | — |
| `vscode-monitor` | 监控 VS Code release | 关键词 Plugins / registerMessageBuilder | 🟢 低 | Verified | `issue-11944` |

## 权威源

[dev-rules.md](dev-rules.md) · [design.md](plugin/design.md) · [v2a-static-audit-report.md](plugin/v2a-static-audit-report.md) · [snapshot-extractor-design.md](plugin/snapshot-extractor-design.md) · [investigation-note-cli-codec-content-map-bug.md](decisions/investigation-note-cli-codec-content-map-bug.md)

---

## Handoff

```text
先读 docs/dev-rules.md（注意 §1.15 codec bug + §6 文档生命周期）与 docs/handoff.md，按下面的工作内容继续。
```

**首要动作**：
1. **🔴 P0：V6 本地验证**——`cd e:\cline++\context-snapshot && git fetch origin && git checkout 568feb9`，确认参数 window=3/threshold=2，重跑 8 步测试，CLI 终端找 `LOOP DETECTED`
2. **🟡 P1：A4 Phase 4 精度验证**
3. **🟡 中：提交 codec bug issue**
