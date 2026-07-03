# Handoff — hook 自动注入架构设计 + beforeModel 时序验证 + 薄适配层

> **生命周期**：每次覆写，无归档——会话交接文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `thin-adapter-layer-design-approved` | 薄适配层设计审批通过——方案 E beforeModel + 两阶段重构 context-snapshot + 仍写 snapshot 文件（不写 docs/handoff.md）；6 个决策点审批见 [thin-adapter-layer-design.md §10](decisions/thin-adapter-layer-design.md)；**概念澄清**：snapshot 文件（cline 产物，`getSnapshotDir()` 下，5 段 Markdown，4 类对象）vs `docs/handoff.md`（本项目交接文档，schema V2 五类对象，人 + AI 协作维护）| Verified | `native-condense-semantic-audit-result`, `cli-plugin-marketplace-audit` |
| `handoff-schema-closed` | handoff-schema 子项目收口——成功标准已满足（schema V2 §1.5 + Assertion 模型第 1-5 步 + 无损映射 9/9 + 验收查询可回答）；project-rules.md 归档至 [archive/handoff-schema-project-rules.md](archive/handoff-schema-project-rules.md)；dev-rules L13 解冻 🔴→🟢；预期迁入项为空；门控解除 | Verified | `assertion-semantic-model` |
| `thin-adapter-insert-point-fix-superseded` | 修正上轮 handoff.md 决策 `thin-adapter-insert-point-fix`（"插入点修正为 messageBuilder"）——与 custom-compaction 源码注释"Core runs after plugin builders"矛盾；messageBuilder 在原生 condense **之前**执行，无法观察 condense 后产物；正确插入点为 `beforeModel` hook（方案 E），由 C 子代理 Verified（agent-runtime.ts:805-807）；本决策 superseded by `thin-adapter-layer-design-approved` | Verified | `cli-plugin-marketplace-audit` |
| `thin-adapter-mb-bm-collaboration` | beforeModel 单独不够——beforeModel 拿到的是 compaction **后**的摘要 messages，无法从中抽完整 semantic object；采用 messageBuilder + beforeModel 协作方案：messageBuilder `snapshot-source-saver`（compaction 前保存完整 messages 到 module state）+ beforeModel（长度突变检测 + 用保存的完整 messages 抽 semantic object + 写 snapshot）；元原则合规：不重造触发逻辑（用长度突变检测原生 condense，不用 token 阈值判断）| Verified | `thin-adapter-layer-design-approved` |
| `thin-adapter-bm-timing-verified` | beforeModel 时序假设实测验证通过——H1 hook 顺序 Verified（源码 agents/dist/index.js L65 col81619 `prepareTurn→beforeModel` + 短对话实测 messageBuilder 早 beforeModel 101ms）；H2 codec bug 规避 Verified（V6 Loop Guard + 本次 beforeModel 无崩溃）；H3 metadata.kind 源码 Verified（core/dist/index.js L573 `compaction_summary`）实测 pending（180K token 阈值阻塞）| Verified | `thin-adapter-mb-bm-collaboration` |
| `hook-auto-injection-proposed` | mechanism-candidates #6 重新定义为 Continue Previous Project（消费 handoff 而非隐藏 handoff）+ #25 统一为 hook 自动注入体系；架构设计见 [hook-auto-injection-design.md](decisions/hook-auto-injection-design.md)；#1/#2/#3 stale 降级为不跟进；核心哲学：handoff 是 Human + AI 共享的项目资产，插件负责自动消费而非替代人工维护 | Proposed | `thin-adapter-bm-timing-verified` |

## 本会话净变化

### 新增文档

- [thin-adapter-layer-design.md](decisions/thin-adapter-layer-design.md) — 薄适配层设计文档（§1 目标 + §2 现状审计 + §3 设计约束 + §4 触发机制方案对比 + §5 形态选择 + §6 实现策略 + §7 验收标准 + §8 风险 + §9 决策点 + §10 审批结果）
- [project-rules-thin-adapter.md](project-rules-thin-adapter.md) — thin-adapter-layer 功能专属开发期约束（§4 门控 + 6 条防漂移约束 + §6 不做的事）
- [archive/handoff-schema-project-rules.md](archive/handoff-schema-project-rules.md) — handoff-schema project-rules.md 归档版（含归档标注）
- [investigation-note-beforemodel-timing-verify.md](decisions/investigation/investigation-note-beforemodel-timing-verify.md) — **本会话** beforeModel 时序实测验证报告（H1/H2/H3 三假设验证状态 + 安装 CLI 3.0.34 bundle 源码证据 + 短对话日志分析）
- [hook-auto-injection-design.md](decisions/hook-auto-injection-design.md) — **本会话** hook 自动注入架构设计（#6 Continue Previous Project + #25 commit 守卫 → beforeRun + beforeTool hook 统一方案，Provider 可扩展架构）

### 功能层（submodule context-snapshot）

- **阶段 1 清理**（上会话，commit `8671de0`）：删 `buildCompactionSummary` 死代码 + `shouldCompact` + `estimateTokens` + 自研常量（compaction.ts 从 166 行减到 38 行）
- **阶段 2 实现**（上会话，commit `8671de0`）：messageBuilder `snapshot-source-saver`（compaction 前保存完整 messages）+ `beforeModel` hook（长度突变检测 + 用完整 messages 写 snapshot）
- **本会话：时序实测验证**（commit `3358a7b`）：index.ts 临时添加 `debugLog()` 验证 messageBuilder→beforeModel 时序（101ms gap 确认），验证完成后删除（submodule 净变化为零）；investigation-note 文档记录 H1/H2/H3 三假设验证结果

### CLI 3.0.34 bundle 源码探查（本会话新发现）

- `agents/dist/index.js` L65 col81619：`prepareTurnForModelRequest(n)` → `for(h of hooks.beforeModel)` — 直接确认 compaction → beforeModel 执行顺序
- `core/dist/index.js` L534：原生 compaction 阈值 `maxInputTokens=200K, thresholdRatio=0.9, reserveTokens=16384` → 触发点 ~180K tokens；**无 CLI flag/env var 可调**
- `core/dist/index.js` L573：agentic compaction 产物含 `metadata.kind="compaction_summary"` — 确认 §4.4 H3 假设的字段存在性

### 治理层（父仓库 cline-plus）

- dev-rules L13 解冻 🔴→🟢（handoff-schema 收口）
- handoff-schema project-rules.md 归档至 archive/
- thin-adapter-layer 门控解除（handoff-schema §5"不做 plugin 代码推进"门控随收口解除）
- **本会话：mechanism-candidates 更新** — #1/#2/#3 stale 降级为"不跟进"（等 VS Code 插件恢复）；#6 重新定义为 Continue Previous Project（消费 handoff 而非隐藏 handoff，Provider 可扩展架构）；#25 统一为 hook 自动注入体系（与 #6 共享 context-snapshot 插件）

## Commits

| Hash | Repo | Message |
|------|------|---------|
| `de2794f` | cline-plus (父仓库) | feat(design): 薄适配层设计文档 - 审批方案 E beforeModel + 两阶段重构 + 门控阻塞 |
| `4428278` | cline-plus (父仓库) | feat(governance): handoff-schema 收口 - project-rules.md 归档 + dev-rules L13 解冻 |
| `8671de0` | context-snapshot (submodule) | feat(thin-adapter): 阶段1清理+阶段2实现 - 删自研shouldCompact+beforeModel协作方案 |
| `88c5b5a` | cline-plus (父仓库) | feat(thin-adapter): 薄适配层阶段1+2 - project-rules + context-snapshot submodule 更新 |
| `ea9b215` | cline-plus (父仓库) | docs(thin-adapter): 概念澄清 - 区分 cline 产物(snapshot文件) 与 本项目交接文档(docs/handoff.md) |
| `3358a7b` | cline-plus (父仓库) | docs(timing-verify): beforeModel 时序实测验证 - H1/H2 Verified + H3 Likely |
| `3703b53` | cline-plus (父仓库) | feat(hook-injection): #6 Continue Previous Project + #25 commit 守卫 → hook 自动注入架构设计 |

## 未完成项

| id | 方向 | 说明 | 优先级 | confidence | depends_on | blocker_ref |
|----|------|------|--------|-----------|------------|-------------|
| `thin-adapter-bm-timing-verify` | beforeModel 时序实测验证 | **已完成** — H1 hook 顺序 Verified（源码 + 短对话实测双源）；H2 codec bug 规避 Verified（V6 + 本次）；H3 metadata.kind 源码 Verified 实测 pending（180K 阈值阻塞，等 PR #12032 长对话补测）；调试代码已清理（submodule 净变化为零）| 🟢 低 | Verified | `thin-adapter-mb-bm-collaboration` | — |
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
| `mech-stale-scan` | mechanism-candidates stale 扫描 | **已完成** — #1/#2/#3 评估为"不跟进"（stale >90 天，等 VS Code 插件恢复）| 🟢 低 | Verified | — | — |

## 权威源

[dev-rules.md](dev-rules.md)（🟢 解冻）· [evidence-governance.md](evidence-governance.md) · [governance-procedure.md](governance-procedure.md) · [reviewer-personas.md](reviewer-personas.md) · [mechanism-candidates.md](mechanism-candidates.md) · [project-rules-thin-adapter.md](project-rules-thin-adapter.md)（功能专属，活跃执行）· [decisions/schema-semantic-object-model.md](decisions/schema-semantic-object-model.md) · [decisions/adr/ADR-006-native-mechanism-first-principle.md](decisions/adr/ADR-006-native-mechanism-first-principle.md) · [decisions/thin-adapter-layer-design.md](decisions/thin-adapter-layer-design.md) · [decisions/hook-auto-injection-design.md](decisions/hook-auto-injection-design.md)（**本会话** hook 自动注入架构设计）· [archive/handoff-schema-project-rules.md](archive/handoff-schema-project-rules.md)（已归档）· [decisions/investigation/investigation-note-native-condense-synthesis.md](decisions/investigation/investigation-note-native-condense-synthesis.md)（A/B/C 综合报告）· [decisions/investigation/investigation-note-native-condense-c-hooks.md](decisions/investigation/investigation-note-native-condense-c-hooks.md)（hook 暴露面，beforeModel 时序证据）· [decisions/investigation/investigation-note-beforemodel-timing-verify.md](decisions/investigation/investigation-note-beforemodel-timing-verify.md)（**本会话** beforeModel 实测验证报告）

> **新会话首动作**：读 [handoff.md](handoff.md) + [dev-rules.md](dev-rules.md) + [project-rules-thin-adapter.md](project-rules-thin-adapter.md)。其余状态以这三份文档自述为准。

---

## Handoff

```text
读 docs/handoff.md + docs/dev-rules.md + docs/project-rules-thin-adapter.md。
```

**后续动作**（按优先级）：
1. **🟡 中：hook 自动注入 Phase 0** — `hook-auto-injection-proposed`：验证 beforeRun hook 契约（参数 + 返回值：contextModification? messages?）+ beforeTool skip 字段；从 CLI 3.0.34 源码确认
2. **🟡 中：hook 自动注入 Phase 1-2** — 实现 handoffProvider + beforeRun 注入 + beforeTool commit 守卫；CLI 短对话测试
3. **🟡 中：跟进 GitHub #11944** — SDK 迁移时间线（影响 VS Code 扩展 plugin 系统恢复）
4. **🟡 中：监控 PR #12032** — CLI codec bug 修复 PR，合并 + 发版后触发 §1.15 解除流程 + H3 metadata.kind 实测补证
5. **🟡 中：Assertion 语义模型第 6 步** — `assertion-semantic-model`（暂缓项，handoff-schema 已收口，独立推进）
6. **🟢 低：kind/exit_when 显式化** — `handoff-schema-v2-kind-exit` 延伸项（可选）
7. **🟢 低：2026-08-01 到期** — mechanism-candidates #17/#19/#24 移入归档
8. **🟢 低：2026-08-02 下次审查** — 按 dev-rules §6.5 触发条件执行
9. **✅ 已完成：stale 扫描** — mechanism-candidates #1/#2/#3 已评估为不跟进
10. **🟢 低：第四档暂缓项** — D1/D3/D4/D6/D7 + G4-G5 + H3/H6 + I1-I3
