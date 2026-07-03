# Handoff — CLI plugin 市场扩展包探查 + 薄适配层插入点修正

> **生命周期**：每次覆写，无归档——会话交接文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `cli-plugin-marketplace-audit` | 探查 cline CLI plugin 市场（`cline/plugins` 15 plugin + `cline/marketplace` 202 entries catalog.json）；ADR-006 §0 元原则自检结论：**无现成轮子**做"condense 时抽 semantic object 写 handoff.md"；最相关的 `custom-compaction` plugin 仅做纯模板拼接（不调 LLM、不抽 semantic object、不写 handoff.md），但提供触发机制参考；`agents-squad` 的 handoff store 是子代理间 handoff 非 session 间，不适用；3 独立来源（官方 README + 一手源码 + catalog.json 镜像）满足 §1.6 双来源门槛；详见 [investigation-note-cli-plugin-marketplace-audit.md](decisions/investigation/investigation-note-cli-plugin-marketplace-audit.md) | Verified | `adr-006-native-first-principle` |
| `thin-adapter-insert-point-fix` | 薄适配层插入点修正：`beforeModel` runtime hook → `messageBuilder`（registerMessageBuilder）；理由：① `custom-compaction` 官方示例用 messageBuilder ② 规避 codec bug（messageBuilder 不走 codec `Nd` 函数）③ beforeModel 返回修改的 messages 会触发 codec bug（O8）④ C 子代理标注的"🔵 备选"升级为首选；影响 `thin-adapter-layer` 设计前提 | Verified | `cli-plugin-marketplace-audit` |
| `native-condense-semantic-audit-result` | A/B/C 子代理已完成，判定结果：答出了丢失点→做 §3.3 薄适配层。三份结论一致：cline 原生 condense 丢失全部结构化语义（六字段覆盖率 ~5%）。**Task D 实测降级**——当前 provider=deepseek 非 Anthropic，无法触发 agentic 模式；A/B/C 三源一致已 Verified + 市场探查补证，按 §1.3 阴性结论门控无需实测补证；D3 决策不实测 custom-compaction（源码已完整读取）| Verified | `native-condense-semantic-audit-plan` |

## 本会话净变化

### 新增文档

- [investigation-note-cli-plugin-marketplace-audit.md](decisions/investigation/investigation-note-cli-plugin-marketplace-audit.md) — CLI plugin 市场探查（O1-O5 + C1-C3 + D1-D3）
  - O3：`custom-compaction` 完整源码分析（registerMessageBuilder + 纯模板拼接 + 常量与 context-snapshot 对比）
  - D1：薄适配层插入点修正 beforeModel → messageBuilder
  - D2：薄适配层实现策略（不重造触发逻辑，专注做 semantic object 抽取 + handoff.md 写入）

### 关键发现

- **cline plugin 市场结构**：`cline/plugins`（官方 curated，15 plugin）+ `cline/marketplace`（catalog.json 镜像，202 entries）+ `cline/mcp-marketplace`（MCP 独立市场）
- **`custom-compaction` plugin**：用 `registerMessageBuilder`（不是 beforeModel）+ 纯模板拼接（不调 LLM）+ `COMPACT_AT_RATIO=0.75` 与 context-snapshot 完全相同（印证 ADR-006 §2 审计点重造轮子）
- **`agents-squad` plugin**：有 handoff store 但是子代理间（parent↔subagent），非 session 间，不适用
- **本地 plugin 检查**：`~/.cline/plugins/` 仅 context-snapshot 已安装，无第三方 plugin

### 运行时探查（未修改代码，仅命令输出）

- `cline plugin --help` / `cline plugin install --help` — 确认 4 种安装来源（File URL / Git / npm / Local Path）+ `--cwd` 选项
- PowerShell `Get-ChildItem $env:USERPROFILE\.cline\plugins -Recurse -Depth 3` — 确认本地仅 context-snapshot
- WebFetch `cline/plugins` 仓库 README + `custom-compaction` 完整源码 + `cline/marketplace` catalog.json

## 历史净变化（上轮会话，已序列化于 commit `9a69ea9`）

### 治理层（父仓库 cline-plus）

- ADR-006 落地：元原则"完美利用 cline 的原生机制"提升至最高级；分支 B（snapshot/compaction/trigger-tuning）砍/缩/转；`snapshot-trigger-tuning` 整条砍掉
- dev-rules L13 回冻 🔴（上一会话 `dev-rules-unfreeze` 决策 superseded）

### 功能层（submodule context-snapshot，commit `74429de`）

- schema V2 §1.5 六字段对齐（types/extractors/formatter/snapshot-writer）

### native-condense-semantic-audit A/B/C 产出（已序列化于远端 commit `48550f3`）

- [investigation-note-native-condense-a-docs.md](decisions/investigation/investigation-note-native-condense-a-docs.md) — 文档面：CLI 无 `--compaction` 选项；compaction 策略是 VS Code SDK 设置
- [investigation-note-native-condense-b-source.md](decisions/investigation/investigation-note-native-condense-b-source.md) — 源码面：ContextManager 实现 + agentic 摘要 metadata 结构
- [investigation-note-native-condense-c-hooks.md](decisions/investigation/investigation-note-native-condense-c-hooks.md) — hook 面：PreCompact 未接入 + beforeModel 推荐
- [investigation-note-native-condense-synthesis.md](decisions/investigation/investigation-note-native-condense-synthesis.md) — 综合报告：六字段全部缺失，判定做 §3.3 薄适配层
- [task-d-prompt.md](decisions/investigation/task-d-prompt.md) — Task D 实测提示词（D3 决策降级，不实测）

## Commits

| Hash | Repo | Message |
|------|------|---------|
| `48550f3` | cline-plus (父仓库) | native-condense A/B/C 子代理产出 + handoff 同步（远端，已 pull）|
| `9a69ea9` | cline-plus (父仓库) | feat(decisions): ADR-006 原生机制优先原则 - 元规则提升至最高级 + snapshot-trigger-tuning 砍掉 |
| `74429de` | context-snapshot (submodule) | feat(snapshot): schema V2 §1.5 六字段对齐 - types/extractors/formatter/snapshot-writer |

## 未完成项

| id | 方向 | 说明 | 优先级 | confidence | depends_on | blocker_ref |
|----|------|------|--------|-----------|------------|-------------|
| `thin-adapter-layer` | §3.3 薄适配层实现 | **插入点已修正为 messageBuilder**（D1）；基于 `cli-plugin-marketplace-audit` D2 策略：不重造触发逻辑（参考 custom-compaction 的 estimateTokens/findRecentStartIndex/serializeMessage）+ 专注做 semantic object 抽取（复用 context-snapshot 现有 extractors）+ 写 handoff.md（schema V2 六字段）| 🟡 中 | Verified | `cli-plugin-marketplace-audit` | — |
| `native-condense-semantic-audit` | cline 原生 condense 语义丢失点探查 | **已完成** — A/B/C 三源一致 + 市场探查补证；Task D 实测降级（D3：当前 provider 非 Anthropic 无法触发 agentic + 源码分析已满足双来源）；判定做 §3.3 薄适配层 | 🟡 中 | Verified | — | — |
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

[dev-rules.md](dev-rules.md)（🔴 冻结）· [evidence-governance.md](evidence-governance.md) · [governance-procedure.md](governance-procedure.md) · [reviewer-personas.md](reviewer-personas.md) · [mechanism-candidates.md](mechanism-candidates.md) · [handoff-schema/project-rules.md](handoff-schema/project-rules.md)（功能专属，活跃执行）· [decisions/schema-semantic-object-model.md](decisions/schema-semantic-object-model.md) · [handoff-schema/design.md](handoff-schema/design.md) · [decisions/adr/ADR-006-native-mechanism-first-principle.md](decisions/adr/ADR-006-native-mechanism-first-principle.md)（本会话核心引用）· [decisions/investigation/investigation-note-cli-plugin-marketplace-audit.md](decisions/investigation/investigation-note-cli-plugin-marketplace-audit.md)（本会话产出）· [decisions/investigation/investigation-note-native-condense-synthesis.md](decisions/investigation/investigation-note-native-condense-synthesis.md)（A/B/C 综合报告）

> **新会话首动作**：读 [handoff.md](handoff.md) + [dev-rules.md](dev-rules.md) + [handoff-schema/project-rules.md](handoff-schema/project-rules.md)。其余状态以这三份文档自述为准。

---

## Handoff

```text
读 docs/handoff.md + docs/dev-rules.md + docs/handoff-schema/project-rules.md。
```

**后续动作**（无紧急项）：
1. **🟡 中：设计薄适配层** — `thin-adapter-layer`：插入点已修正为 messageBuilder（D1）；基于 D2 策略设计实现——不重造触发逻辑（参考 custom-compaction）+ 专注 semantic object 抽取（复用 context-snapshot extractors）+ 写 handoff.md（schema V2 六字段）
2. **🟢 低：buildCompactionSummary 死代码清理** — `buildCompactionSummary-cleanup`（可与 #1 合并推进）
3. **🟢 低：kind/exit_when 显式化** — `handoff-schema-v2-kind-exit` 延伸项（可选）
4. **🟡 中：跟进 GitHub #11944** — SDK 迁移时间线（影响 VS Code 扩展 plugin 系统恢复）
5. **🟡 中：监控 PR #12032** — CLI codec bug 修复 PR，合并 + 发版后触发 §1.15 解除流程 + `schema-v2-snapshot-e2e`
6. **🟢 低：2026-08-01 到期** — mechanism-candidates #17/#19/#24 移入归档
7. **🟢 低：2026-08-02 下次审查** — 按 dev-rules §6.5 触发条件执行
8. **🟢 低：stale 扫描** — mechanism-candidates #1/#2/#3 长期候选评估
9. **🟢 低：第四档暂缓项** — D1/D3/D4/D6/D7 + G4-G5 + H3/H6 + I1-I3
