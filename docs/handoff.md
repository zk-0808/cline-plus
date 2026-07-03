# Handoff — native-condense-semantic-audit 探查规划产出

> **生命周期**：每次覆写，无归档——会话交接文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `native-condense-semantic-audit-plan` | 产出 4 子代理并行探查规划回答 ADR-006 §4.1 问题 1（cline 原生 condense 到底丢了什么 handoff 需要的语义）；关键发现 `cline --help` 暴露 `--compaction <agentic\|basic\|off>` 一级公开选项（默认 basic）——原生 condense 是公开接口而非深埋内部；复用 investigation-note O5 已 verified 的云端子代理读 cline/cline 仓库源码路径与方法；4 任务包：A 文档面（CLI help + docs.cline.bot 查三模式语义）/ B 源码面（ContextManager 实现 + condense 产物数据结构 + 字段覆盖矩阵）/ C 源码面（hook 暴露面 + 推荐插入点）/ D 实测面（本地短对话 + MAX_INPUT_TOKENS=1000 触发，用户终端执行 §1.2）；A/B/C 可云端并行无依赖，D 需 A/B/C 完成后启动（产物解读需 B 的字段覆盖矩阵对照）；对照标准=schema V2 §1.5 六字段（id/kind/exit_when/confidence/depends_on/blocker_ref）+ 五类对象；判定标准：答不出丢失点→B 分支整条砍掉，答出丢失点→做 §3.3 薄适配层 | Verified | `adr-006-native-first-principle` |

## 本会话净变化

### 探查规划产出（未写入仓库文件，仅在对话中）

- `native-condense-semantic-audit` 探查规划：4 子代理任务包（A/B/C/D），每包含目标 / 输入线索 / 任务步骤 / 产出格式
- 关键发现：`cline --help` 暴露 `--compaction <agentic|basic|off>` 一级选项（默认 basic）——condense 触发与模式是 CLI 公开接口
- 复用线索：[investigation-note-cli-codec-content-map-bug.md O5](decisions/investigation/investigation-note-cli-codec-content-map-bug.md) 已 verified 云端子代理读 cline/cline 仓库源码的路径（`sdk/packages/core/src/runtime/config/agent-message-codec.ts`）与方法

### 运行时探查（未修改代码，仅命令输出）

- `cline --version` = 3.0.34（与 §1.15 不可抗力声明一致）
- `cline --help` 确认 `--compaction` 选项 + `--hooks-dir` / `--config` / `--data-dir` 等相关选项
- 本地 CLI 路径：`E:\node-global\node_modules\cline`（package.json 确认 dependencies `@cline/sdk` / `@cline/core` / `@cline/agents` / `@cline/llms` / `@cline/shared` 均 0.0.54）
- 本地 cline.exe（Bun-embedded）：`E:\node-global\node_modules\.cline-mysker53\node_modules\@cline\cli-windows-x64\bin\cline.exe`

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
| `native-condense-semantic-audit` | cline 原生 condense 语义丢失点实测 | **已产出 4 子代理探查规划，待派发**——A 文档面（CLI help + docs.cline.bot 查 `--compaction` 三模式语义）/ B 源码面（ContextManager 实现 + condense 产物数据结构 + 字段覆盖矩阵）/ C 源码面（hook 暴露面 + 推荐插入点）/ D 实测面（本地短对话 + MAX_INPUT_TOKENS=1000 触发，用户终端执行 §1.2）；A/B/C 云端并行无依赖，D 需 A/B/C 完成后启动；规划详情见本会话决策 `native-condense-semantic-audit-plan`；判定标准：答不出丢失点→B 分支整条砍掉，答出丢失点→做 §3.3 薄适配层；不依赖 PR #12032（短对话不触发 codec bug 路径 B）| 🟡 中 | Verified | — | — |
| `handoff-schema-v2-kind-exit` | kind/exit_when 显式化 | 在 handoff.md 未完成项表中显式标注 `[kind] exit_when`（V2 延伸项，可选）| 🟢 低 | Hypothesis | — | — |
| `assertion-semantic-model` | Assertion 语义模型决策（已落地，待实施） | 决策版材料见 [assertion-semantic-model.md](handoff-schema/assertion-semantic-model.md)；Q1-Q6 已定 + 元规则已加；第 1-5 步已完成（commit `048a876`）；第 6 步 V2 字段表达重写按材料 §9.3 暂缓保持缓冲 | 🟡 中 | Verified | — | — |
| `buildCompactionSummary-cleanup` | 死代码清理 | 删 [compaction.ts:109-143](../context-snapshot/src/compaction.ts#L109-L143) `buildCompactionSummary` 函数（计算了但 index.ts 未使用 `result.messages`）；可与 `native-condense-semantic-audit` 合并推进；属 ADR-006 §3.4 清理动作 | 🟢 低 | Verified | `native-condense-semantic-audit` | — |
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
1. **🟡 中：派发 native-condense-semantic-audit 4 子代理探查** — A/B/C 云端并行（文档面 / 源码面 ContextManager / 源码面 hook），D 实测面需 A/B/C 完成后用户终端执行；规划详情见本会话决策 `native-condense-semantic-audit-plan`
2. **🟢 低：kind/exit_when 显式化** — `handoff-schema-v2-kind-exit` 延伸项（可选）
3. **🟢 低：buildCompactionSummary 死代码清理** — `buildCompactionSummary-cleanup`（可与 #1 合并推进）
4. **🟡 中：跟进 GitHub #11944** — SDK 迁移时间线（影响 VS Code 扩展 plugin 系统恢复）
5. **🟡 中：监控 PR #12032** — CLI codec bug 修复 PR，合并 + 发版后触发 §1.15 解除流程 + `schema-v2-snapshot-e2e`
6. **🟢 低：2026-08-01 到期** — mechanism-candidates #17/#19/#24 移入归档
7. **🟢 低：2026-08-02 下次审查** — 按 dev-rules §6.5 触发条件执行
8. **🟢 低：stale 扫描** — mechanism-candidates #1/#2/#3 长期候选评估
9. **🟢 低：第四档暂缓项** — D1/D3/D4/D6/D7 + G4-G5 + H3/H6 + I1-I3
