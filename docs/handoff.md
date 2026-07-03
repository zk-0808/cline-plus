# Handoff — native-condense-semantic-audit A/B/C 完成 + D 待执行

> **生命周期**：每次覆写，无归档——会话交接文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `native-condense-semantic-audit-plan` | 产出 4 子代理并行探查规划回答 ADR-006 §4.1 问题 1；**关键纠正**：handoff.md 原记录"`cline --help` 暴露 `--compaction <agentic\|basic\|off>`"是不正确的——CLI 没有 `--compaction` 选项，compaction 策略是 VS Code SDK 持久化设置（PR #11892，2026-07-03 merged）| Verified | `adr-006-native-first-principle` |
| `native-condense-semantic-audit-result` | **A/B/C 子代理已完成，判定结果：答出了丢失点→做 §3.3 薄适配层**。三份结论一致：cline 原生 condense 丢失了全部结构化语义（六字段覆盖率 ~5%），设计目标是上下文窗口管理而非知识管理。推荐 `beforeModel` runtime hook 作为薄适配层插入点（compaction 后触发，codec bug 风险低）。D 实测面提示词已准备（`task-d-prompt.md`），待用户在真实终端执行。**额外发现**：`--compaction` CLI 选项不存在，compaction 策略是 VS Code SDK 设置 | Verified | `native-condense-semantic-audit-plan` |

## 本会话净变化

### 探查产出（4 Investigation Notes 写入仓库）

- [investigation-note-native-condense-a-docs.md](decisions/investigation/investigation-note-native-condense-a-docs.md) — 文档面：CLI 无 `--compaction` 选项；compaction 策略是 VS Code SDK 设置（`basic`|`agentic`）；产物是纯文本摘要，六字段全部缺失
- [investigation-note-native-condense-b-source.md](decisions/investigation/investigation-note-native-condense-b-source.md) — 源码面：ContextManager 已废弃→SDK `createContextCompactionPrepareTurn`；agentic 摘要 metadata 有 `kind`/`readFiles`/`modifiedFiles`；六字段覆盖率 ~5%
- [investigation-note-native-condense-c-hooks.md](decisions/investigation/investigation-note-native-condense-c-hooks.md) — hook 面：PreCompact 已定义但未接入；`beforeModel` 是推荐插入点（compaction 后触发）；codec bug 风险低
- [investigation-note-native-condense-synthesis.md](decisions/investigation/investigation-note-native-condense-synthesis.md) — 综合报告：六字段全部缺失，判定做 §3.3 薄适配层
- [task-d-prompt.md](decisions/investigation/task-d-prompt.md) — Task D 实测提示词（待用户终端执行）

### 关键纠正

- **handoff.md 原记录错误**："`cline --help` 暴露 `--compaction <agentic|basic|off>`" → 实际 CLI 没有此选项。compaction 策略是 VS Code SDK 持久化设置（`basic`|`agentic`），PR #11892 引入
- **不影响判定**：原生 condense 丢失结构化语义的结论不受此纠正影响（源码分析直接读 SDK 代码）

## 历史净变化（上轮会话，已序列化于 commit `9a69ea9`）

### 治理层（父仓库 cline-plus）

- ADR-006 落地：元原则"完美利用 cline 的原生机制"提升至最高级；分支 B（snapshot/compaction/trigger-tuning）砍/缩/转；`snapshot-trigger-tuning` 整条砍掉
- dev-rules L13 回冻 🔴（上一会话 `dev-rules-unfreeze` 决策 superseded）

### 功能层（submodule context-snapshot，commit `74429de`）

- schema V2 §1.5 六字段对齐（types/extractors/formatter/snapshot-writer）

### Assertion 语义模型实施第 1-5 步（commit `048a876`）

- schema V2→V3（§0 原则 + §0.2 Assertion 模型 + §0.3 五类对象重定位）
- project-rules §6 v0→v0.1（Hypothesis 推理链→Assertion Justification 过渡表达）+ §7 新增消费层规则

## Commits

| Hash | Repo | Message |
|------|------|---------|
| `9a69ea9` | cline-plus (父仓库) | feat(decisions): ADR-006 原生机制优先原则 - 元规则提升至最高级 + snapshot-trigger-tuning 砍掉 |
| `74429de` | context-snapshot (submodule) | feat(snapshot): schema V2 §1.5 六字段对齐 - types/extractors/formatter/snapshot-writer |
| `538eaa0` | cline-plus (父仓库) | feat: schema V2 §1.5 对齐 - dev-rules 回冻 + context-snapshot submodule 升级 |

## 未完成项

| id | 方向 | 说明 | 优先级 | confidence | depends_on | blocker_ref |
|----|------|------|--------|-----------|------------|-------------|
| `native-condense-semantic-audit` | cline 原生 condense 语义丢失点探查 | **A/B/C 已完成，D 待执行** — A/B/C 三份结论一致：原生 condense 丢失全部结构化语义（六字段覆盖率 ~5%），判定做 §3.3 薄适配层；推荐 `beforeModel` hook 插入点；D 实测提示词已准备（`task-d-prompt.md`），待用户终端执行验证 | 🟡 中 | Verified | — | — |
| `thin-adapter-layer` | §3.3 薄适配层实现 | 基于 `native-condense-semantic-audit` 判定结果，设计 `beforeModel` hook 的具体实现：compaction 后检测→从 summary+messages 抽 semantic object→写 handoff.md | 🟡 中 | Verified | `native-condense-semantic-audit` | — |
| `handoff-schema-v2-kind-exit` | kind/exit_when 显式化 | 在 handoff.md 未完成项表中显式标注 `[kind] exit_when`（V2 延伸项，可选）| 🟢 低 | Hypothesis | — | — |
| `assertion-semantic-model` | Assertion 语义模型决策（已落地，待实施） | 决策版材料见 [assertion-semantic-model.md](handoff-schema/assertion-semantic-model.md)；Q1-Q6 已定 + 元规则已加；第 1-5 步已完成（commit `048a876`）；第 6 步 V2 字段表达重写按材料 §9.3 暂缓保持缓冲 | 🟡 中 | Verified | — | — |
| `buildCompactionSummary-cleanup` | 死代码清理 | 删 [compaction.ts:109-143](../context-snapshot/src/compaction.ts#L109-L143) `buildCompactionSummary` 函数（计算了但 index.ts 未使用 `result.messages`）；可与 `thin-adapter-layer` 合并推进；属 ADR-006 §3.4 清理动作 | 🟢 低 | Verified | `native-condense-semantic-audit` | — |
| `schema-v2-snapshot-e2e` | snapshot 真实长对话实测（重新定位） | 原目标"frontmatter 显式化 + confidence 计算固化进 plugin"保留；删去"长对话触发原生 compact"的实测依赖（codec bug 阻塞的只是原生 compact 路径，与 plugin 语义抽取无关）；ADR-006 §3.2 重新定位 | 🟡 中 | Hypothesis | `pr-12032` | `B-cli-codec-bug` |
| `issue-11944` | GitHub #11944 跟进 | SDK 迁移时间线（影响 VS Code 扩展 plugin 系统恢复） | 🟡 中 | Verified | — | — |
| `pr-12032` | PR #12032 合并监控 | CLI codec bug 修复 PR（Open），合并 + CLI 发版后触发 §1.15 解除流程 7 步 | 🟡 中 | Verified | — | — |
| `vscode-monitor` | 监控 VS Code release | 关键词 Plugins / registerMessageBuilder | 🟢 低 | Verified | `issue-11944` | — |
| `mech-retirement` | mechanism-candidates 退休执行 | 2026-08-01 到期将 #17/#19/#24 移入归档 | 🟢 低 | Verified | — | — |
| `h2-h3-evidence` | 补证 H2/H3 | image 分支 undefined 丢弃（受 §1.15 阻塞，等 PR #12032）| 🟢 低 | Hypothesis | `pr-12032` | `B-cli-codec-bug` |
| `next-audit` | 下次文档健康度审查 | 2026-08-02（30 天后），按 §6.5 触发条件执行 | 🟢 低 | Verified | — | — |
| `tier4-deferred` | 第四档暂缓项 | D1/D3/D4/D6/D7 + G4-G5 + H3/H6 + I1-I3 + 根因4（根因4 已由 governance-procedure.md 部分承载）| 🟢 低 | Hypothesis | — | — |
| `mech-stale-scan` | mechanism-candidates stale 扫描 | #1/#2/#3 长期候选无进展（>90 天），评估保留/降级/删除 | 🟢 低 | Verified | — | — |

## 权威源

[dev-rules.md](dev-rules.md)（🔴 冻结）· [evidence-governance.md](evidence-governance.md) · [governance-procedure.md](governance-procedure.md) · [reviewer-personas.md](reviewer-personas.md) · [mechanism-candidates.md](mechanism-candidates.md) · [handoff-schema/project-rules.md](handoff-schema/project-rules.md)（功能专属，活跃执行）· [decisions/schema-semantic-object-model.md](decisions/schema-semantic-object-model.md) · [handoff-schema/design.md](handoff-schema/design.md) · [decisions/adr/ADR-006-native-mechanism-first-principle.md](decisions/adr/ADR-006-native-mechanism-first-principle.md)（本会话核心引用）

> **新会话首动作**：读 [handoff.md](handoff.md) + [dev-rules.md](dev-rules.md) + [handoff-schema/project-rules.md](handoff-schema/project-rules.md)。其余状态以这三份文档自述为准。

---

## Handoff

```text
读 docs/handoff.md + docs/dev-rules.md + docs/handoff-schema/project-rules.md。
```

**后续动作**（无紧急项）：
1. **🟡 中：执行 Task D 实测** — 用户在真实终端按 `task-d-prompt.md` 执行 `cline -i` 短对话 + `/compact` 触发，验证 A/B/C 源码分析结论
2. **🟡 中：设计薄适配层** — `thin-adapter-layer`：基于 A/B/C 判定，设计 `beforeModel` hook 实现（compaction 后检测→抽取 semantic object→写 handoff.md）
3. **🟢 低：buildCompactionSummary 死代码清理** — `buildCompactionSummary-cleanup`（可与 #2 合并推进）
4. **🟢 低：kind/exit_when 显式化** — `handoff-schema-v2-kind-exit` 延伸项（可选）
5. **🟡 中：跟进 GitHub #11944** — SDK 迁移时间线（影响 VS Code 扩展 plugin 系统恢复）
6. **🟡 中：监控 PR #12032** — CLI codec bug 修复 PR，合并 + 发版后触发 §1.15 解除流程 + `schema-v2-snapshot-e2e`
7. **🟢 低：2026-08-01 到期** — mechanism-candidates #17/#19/#24 移入归档
8. **🟢 低：2026-08-02 下次审查** — 按 dev-rules §6.5 触发条件执行
9. **🟢 低：stale 扫描** — mechanism-candidates #1/#2/#3 长期候选评估
10. **🟢 低：第四档暂缓项** — D1/D3/D4/D6/D7 + G4-G5 + H3/H6 + I1-I3
