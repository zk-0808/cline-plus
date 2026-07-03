# Handoff — 薄适配层设计审批 + 阶段 1+2 实现 + handoff-schema 收口

> **生命周期**：每次覆写，无归档——会话交接文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `thin-adapter-layer-design-approved` | 薄适配层设计审批通过——方案 E beforeModel + 两阶段重构 context-snapshot + 仍写 snapshot 文件（不写 docs/handoff.md）；6 个决策点审批见 [thin-adapter-layer-design.md §10](decisions/thin-adapter-layer-design.md)；**概念澄清**：snapshot 文件（cline 产物，`getSnapshotDir()` 下，5 段 Markdown，4 类对象）vs `docs/handoff.md`（本项目交接文档，schema V2 五类对象，人 + AI 协作维护）| Verified | `native-condense-semantic-audit-result`, `cli-plugin-marketplace-audit` |
| `handoff-schema-closed` | handoff-schema 子项目收口——成功标准已满足（schema V2 §1.5 + Assertion 模型第 1-5 步 + 无损映射 9/9 + 验收查询可回答）；project-rules.md 归档至 [archive/handoff-schema-project-rules.md](archive/handoff-schema-project-rules.md)；dev-rules L13 解冻 🔴→🟢；预期迁入项为空；门控解除 | Verified | `assertion-semantic-model` |
| `thin-adapter-insert-point-fix-superseded` | 修正上轮 handoff.md 决策 `thin-adapter-insert-point-fix`（"插入点修正为 messageBuilder"）——与 custom-compaction 源码注释"Core runs after plugin builders"矛盾；messageBuilder 在原生 condense **之前**执行，无法观察 condense 后产物；正确插入点为 `beforeModel` hook（方案 E），由 C 子代理 Verified（agent-runtime.ts:805-807）；本决策 superseded by `thin-adapter-layer-design-approved` | Verified | `cli-plugin-marketplace-audit` |
| `thin-adapter-mb-bm-collaboration` | beforeModel 单独不够——beforeModel 拿到的是 compaction **后**的摘要 messages，无法从中抽完整 semantic object；采用 messageBuilder + beforeModel 协作方案：messageBuilder `snapshot-source-saver`（compaction 前保存完整 messages 到 module state）+ beforeModel（长度突变检测 + 用保存的完整 messages 抽 semantic object + 写 snapshot）；元原则合规：不重造触发逻辑（用长度突变检测原生 condense，不用 token 阈值判断）| Verified | `thin-adapter-layer-design-approved` |

## 本会话净变化

### 新增文档

- [thin-adapter-layer-design.md](decisions/thin-adapter-layer-design.md) — 薄适配层设计文档（§1 目标 + §2 现状审计 + §3 设计约束 + §4 触发机制方案对比 + §5 形态选择 + §6 实现策略 + §7 验收标准 + §8 风险 + §9 决策点 + §10 审批结果）
- [project-rules-thin-adapter.md](project-rules-thin-adapter.md) — thin-adapter-layer 功能专属开发期约束（§4 门控 + 6 条防漂移约束 + §6 不做的事）
- [archive/handoff-schema-project-rules.md](archive/handoff-schema-project-rules.md) — handoff-schema project-rules.md 归档版（含归档标注）

### 功能层（submodule context-snapshot，commit `8671de0`）

- **阶段 1 清理**：删 `buildCompactionSummary` 死代码 + `shouldCompact` + `estimateTokens` + 自研常量（compaction.ts 从 166 行减到 38 行）
- **阶段 2 实现**：messageBuilder `snapshot-source-saver`（compaction 前保存完整 messages）+ `beforeModel` hook（长度突变检测 + 用完整 messages 写 snapshot）
- tsc --noEmit 通过

### 治理层（父仓库 cline-plus）

- dev-rules L13 解冻 🔴→🟢（handoff-schema 收口）
- handoff-schema project-rules.md 归档至 archive/
- thin-adapter-layer 门控解除（handoff-schema §5"不做 plugin 代码推进"门控随收口解除）

## Commits

| Hash | Repo | Message |
|------|------|---------|
| `de2794f` | cline-plus (父仓库) | feat(design): 薄适配层设计文档 - 审批方案 E beforeModel + 两阶段重构 + 门控阻塞 |
| `4428278` | cline-plus (父仓库) | feat(governance): handoff-schema 收口 - project-rules.md 归档 + dev-rules L13 解冻 |
| `8671de0` | context-snapshot (submodule) | feat(thin-adapter): 阶段1清理+阶段2实现 - 删自研shouldCompact+beforeModel协作方案 |
| `88c5b5a` | cline-plus (父仓库) | feat(thin-adapter): 薄适配层阶段1+2 - project-rules + context-snapshot submodule 更新 |
| `ea9b215` | cline-plus (父仓库) | docs(thin-adapter): 概念澄清 - 区分 cline 产物(snapshot文件) 与 本项目交接文档(docs/handoff.md) |

## 未完成项

| id | 方向 | 说明 | 优先级 | confidence | depends_on | blocker_ref |
|----|------|------|--------|-----------|------------|-------------|
| `thin-adapter-bm-timing-verify` | beforeModel 时序实测验证 | 阶段 2 实现已完成（messageBuilder + beforeModel 协作方案）；待实测验证 beforeModel 在原生 compaction 后触发的时序假设（[design.md §4.4](decisions/thin-adapter-layer-design.md)）；project-rules §6 约束：不做长对话实测（codec bug 阻塞），用短对话验证；失败时退回方案 B+A（metadata.kind 检测 + 长度突变 fallback）| 🟡 中 | Hypothesis | `thin-adapter-mb-bm-collaboration` | — |
| `native-condense-semantic-audit` | cline 原生 condense 语义丢失点探查 | **已完成** — 判定做 §3.3 薄适配层；薄适配层已实现（阶段 1+2），待实测验证 | 🟡 中 | Verified | — | — |
| `handoff-schema-v2-kind-exit` | kind/exit_when 显式化 | handoff-schema 已收口，此延伸项转为独立可选项 | 🟢 低 | Hypothesis | — | — |
| `assertion-semantic-model` | Assertion 语义模型 | 第 1-5 步已完成；第 6 步 V2 字段表达重写按材料 §9.3 暂缓保持缓冲；handoff-schema 已收口，后续推进作为独立项 | 🟡 中 | Verified | — | — |
| `schema-v2-snapshot-e2e` | snapshot 真实长对话实测 | 受 codec bug 阻塞，等 PR #12032 合并；可与 `thin-adapter-bm-timing-verify` 短对话验证合并推进 | 🟡 中 | Hypothesis | `pr-12032` | `B-cli-codec-bug` |
| `issue-11944` | GitHub #11944 跟进 | SDK 迁移时间线（影响 VS Code 扩展 plugin 系统恢复）| 🟡 中 | Verified | — | — |
| `pr-12032` | PR #12032 合并监控 | CLI codec bug 修复 PR（Open），合并 + CLI 发版后触发 §1.15 解除流程 7 步 | 🟡 中 | Verified | — | — |
| `vscode-monitor` | 监控 VS Code release | 关键词 Plugins / registerMessageBuilder | 🟢 低 | Verified | `issue-11944` | — |
| `mech-retirement` | mechanism-candidates 退休执行 | 2026-08-01 到期将 #17/#19/#24 移入归档 | 🟢 低 | Verified | — | — |
| `h2-h3-evidence` | 补证 H2/H3 | image 分支 undefined 丢弃（受 §1.15 阻塞，等 PR #12032）| 🟢 低 | Hypothesis | `pr-12032` | `B-cli-codec-bug` |
| `next-audit` | 下次文档健康度审查 | 2026-08-02（30 天后），按 §6.5 触发条件执行 | 🟢 低 | Verified | — | — |
| `tier4-deferred` | 第四档暂缓项 | D1/D3/D4/D6/D7 + G4-G5 + H3/H6 + I1-I3 + 根因4 | 🟢 低 | Hypothesis | — | — |
| `mech-stale-scan` | mechanism-candidates stale 扫描 | #1/#2/#3 长期候选无进展（>90 天），评估保留/降级/删除 | 🟢 低 | Verified | — | — |

## 权威源

[dev-rules.md](dev-rules.md)（🟢 解冻）· [evidence-governance.md](evidence-governance.md) · [governance-procedure.md](governance-procedure.md) · [reviewer-personas.md](reviewer-personas.md) · [mechanism-candidates.md](mechanism-candidates.md) · [project-rules-thin-adapter.md](project-rules-thin-adapter.md)（功能专属，活跃执行）· [decisions/schema-semantic-object-model.md](decisions/schema-semantic-object-model.md) · [decisions/adr/ADR-006-native-mechanism-first-principle.md](decisions/adr/ADR-006-native-mechanism-first-principle.md) · [decisions/thin-adapter-layer-design.md](decisions/thin-adapter-layer-design.md)（本会话核心产出）· [archive/handoff-schema-project-rules.md](archive/handoff-schema-project-rules.md)（已归档）· [decisions/investigation/investigation-note-native-condense-synthesis.md](decisions/investigation/investigation-note-native-condense-synthesis.md)（A/B/C 综合报告）· [decisions/investigation/investigation-note-native-condense-c-hooks.md](decisions/investigation/investigation-note-native-condense-c-hooks.md)（hook 暴露面，beforeModel 时序证据）

> **新会话首动作**：读 [handoff.md](handoff.md) + [dev-rules.md](dev-rules.md) + [project-rules-thin-adapter.md](project-rules-thin-adapter.md)。其余状态以这三份文档自述为准。

---

## Handoff

```text
读 docs/handoff.md + docs/dev-rules.md + docs/project-rules-thin-adapter.md。
```

**后续动作**（按优先级）：
1. **🟡 中：实测验证 beforeModel 时序** — `thin-adapter-bm-timing-verify`：阶段 2 实现已完成（commit `8671de0`），需实测验证 beforeModel 在原生 compaction 后触发的时序假设；用短对话验证（降低 compaction 阈值）；失败时退回方案 B+A
2. **🟡 中：跟进 GitHub #11944** — SDK 迁移时间线（影响 VS Code 扩展 plugin 系统恢复）
3. **🟡 中：监控 PR #12032** — CLI codec bug 修复 PR，合并 + 发版后触发 §1.15 解除流程 + `schema-v2-snapshot-e2e` 长对话实测
4. **🟡 中：Assertion 语义模型第 6 步** — `assertion-semantic-model`（暂缓项，handoff-schema 已收口，独立推进）
5. **🟢 低：kind/exit_when 显式化** — `handoff-schema-v2-kind-exit` 延伸项（可选）
6. **🟢 低：2026-08-01 到期** — mechanism-candidates #17/#19/#24 移入归档
7. **🟢 低：2026-08-02 下次审查** — 按 dev-rules §6.5 触发条件执行
8. **🟢 低：stale 扫描** — mechanism-candidates #1/#2/#3 长期候选评估
9. **🟢 低：第四档暂缓项** — D1/D3/D4/D6/D7 + G4-G5 + H3/H6 + I1-I3
