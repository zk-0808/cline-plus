# Handoff — schema V2 文档层改进 + 交接语句精简 + dev-rules 解冻

> **生命周期**：每次覆写，无归档——会话交接文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `v2-doc-completed` | schema V2 文档层改进完成（schema 1.5 补 `depends_on` 字段 + 明确 `blocker_ref` vs `depends_on` 区分规则 `B-` 前缀 + handoff.md 未完成项表新增 `blocker_ref` 列 + `h2-h3-evidence` 显式化双字段并存）| Verified | `handoff-schema-bootstrap` |
| `v2-decouple` | V2 解耦：拆 `handoff-schema-v2` → `handoff-schema-v2-doc`（已完成，不依赖 PR）+ `schema-v2-snapshot`（保留，依赖 PR #12032）+ `handoff-schema-v2-kind-exit`（延伸项，可选）| Verified | `v2-doc-completed` |
| `handoff-statement-simplify` | handoff.md 末尾两处交接语句精简：去赘述（决策/净变化/状态已在结构化部分），仅保留读文档指引 | Verified | — |
| `dev-rules-unfreeze` | dev-rules 🔴 冻结 → 🟢 解冻（第一阶段验收通过 + V2 文档层改进完成，解冻条件命中）| Verified | `v2-doc-completed` |
| `mapping-test-rerun` | V2 schema 落地后无损映射测试重跑 11/11 通过（拆分后条目 9→11，六字段全覆盖，前缀规则无违反）| Verified | `v2-doc-completed` |
| `snapshot-v2-decouple` | 解耦 `schema-v2-snapshot` → `schema-v2-snapshot-align`（不依赖 PR，字段对齐+短对话实测）+ `schema-v2-snapshot-e2e`（依赖 PR，长对话实测+frontmatter+confidence 固化）；纠正原"snapshot schema 化整体阻塞"过度打包 | Verified | `v2-doc-completed` |
| `confidence-vocab-fix` | schema §1.0 新增 Confidence 词汇表；修正 §1.3/§1.5 字段描述错误（原写"取值与 §4 一致"但字面不一致，schema 用 Verified/Likely/Hypothesis，§4 用高/中/低，需查表对齐） | Verified | `snapshot-v2-decouple` |
| `hypothesis-reasoning-rule` | 新增 project-rules §6：Hypothesis 条目强制推理链（`<字段判断> ← <依据>`）；解决"confidence 标整体证据弱但未定向指引哪个字段弱，下游无判断空间"机制缺口 | Verified | `snapshot-v2-decouple` |

## 本会话净变化

### 1. schema V1 → V2（`docs/decisions/schema-semantic-object-model.md`）

- 标题：V1 → V2，加 V2 变更说明块
- §1.5 Handoff 对象新增 `depends_on` 字段（指向其他 Handoff ID，禁止指向 Blocker ID）
- §1.5 新增 ID 前缀区分规则表（`B-` = Blocker / 其他 = Handoff）+ 混用判据说明
- §2.1 映射表更新：`blocker_ref` 不再错误映射到 `depends_on` 列；新增"前缀区分规则"段（V2 检测与迁移规则）

### 2. handoff.md 未完成项表扩展结构（`docs/handoff.md`）

- 新增 `blocker_ref` 列（扩展结构，不改变现有条目语义）
- `h2-h3-evidence` 显式化双字段并存：`depends_on = pr-12032`（PR 合并动作）+ `blocker_ref = B-cli-codec-bug`（codec bug 阻塞）
- 拆分 `handoff-schema-v2` → `handoff-schema-v2-doc`（已完成，本会话）+ `handoff-schema-v2-kind-exit`（延伸项，可选）+ 保留 `schema-v2-snapshot`（依赖 PR #12032）

### 3. handoff.md 末尾交接语句精简（`docs/handoff.md`）

- "新会话首动作"段：去除赘述（决策/状态已在结构化部分），仅保留"读 handoff.md + dev-rules.md + handoff-schema/project-rules.md"
- `## Handoff` 代码块：同样精简为单行读文档指引

### 4. design.md V2 同步（`docs/handoff-schema/design.md`）

- 标题：第一阶段 → V2 已推进；新增 V2 推进说明块
- §1.1 第一阶段目标表新增"V2 文档层改进（解耦）"行（✅ 已完成）
- §3.2 表格：`vscode-monitor` 行 ⚠️ → ✅（depends_on 字段已显式化）；`h2-h3-evidence` 行 ⚠️ → ✅（V2 显式化双字段并存）
- §3.3 问题 1/2 标记 ✅ 已解决（删除线 + V2 落地说明）；问题 3 标"延伸项"保留
- §3.4 测试结论更新；新增 §3.5 V2 重跑结果表（11/11 通过 + 前缀规则无违反）
- §4.3/§4.4 验收查询更新（blocker_ref 直接 B- 前缀匹配，无需语义推断）
- §5 演进路线重写：§5.1 第一阶段已完成 / §5.2 V2 文档层已完成 / §5.3 第二阶段（snapshot schema 化）/ §5.4 第三阶段
- §6.1/§6.2 风险缓解更新（V2 已落地）；§7 评审对齐表 V2 注释

### 5. project-rules.md V2 同步（`docs/handoff-schema/project-rules.md`）

- §3 无损映射测试约束：五字段 → 六字段全覆盖；新增"前缀规则无违反"判据
- §4 验收查询：预期答案注释更新（V2 后显式标注 blocker_ref）
- §5 不做的事：补充 V2 后扩展说明（新增 blocker_ref 列为扩展结构非语义修改）+ 新增"kind/exit_when 显式化"作为可选延伸项

### 6. dev-rules 状态错位处理（`docs/dev-rules.md`）

- L13 顶部状态：🔴 冻结中 → 🟢 解冻（2026-07-03）
- 解冻理由：第一阶段三项验收判据通过 + V2 文档层改进完成
- 维护节奏声明：V2 改动沉淀在 handoff-schema/project-rules.md，未迁入 dev-rules（V2 规则尚未验证跨功能通用）；下次扩容窗口为第二阶段开始时

### 7. schema-v2-snapshot 解耦 + 置信度机制改进（本轮会话）

**解耦过度打包**（`docs/handoff.md` + `docs/handoff-schema/design.md`）：
- `schema-v2-snapshot` 拆为 `schema-v2-snapshot-align`（不依赖 PR，可立即推进）+ `schema-v2-snapshot-e2e`（依赖 PR + blocker_ref=B-cli-codec-bug）
- 修正原"snapshot schema 化整体阻塞"过度打包——codec bug 只阻塞真实长对话路径实测，不阻塞代码层字段对齐
- design.md §5.3 第二阶段分两步推进说明（5.3.1 不依赖 PR / 5.3.2 依赖 PR）

**置信度词汇表修正**（`docs/decisions/schema-semantic-object-model.md`）：
- 新增 §1.0 Confidence 词汇表——显式映射 schema 词汇（Verified/Likely/Hypothesis）与 evidence-governance §4 词汇（高/中/低），两者字面不一致需查表对齐
- 修正 §1.3/§1.5 字段描述错误（原写"取值与 §4 一致"但字面不一致）
- 移除未完成项表 `handoff-schema-v2-doc`（已完成，状态不一致）

**Hypothesis 推理链约束**（`docs/handoff-schema/project-rules.md` §6）：
- 新增约束：`confidence = Hypothesis` 的未完成项必须在"说明"列写简短推理链（格式 `<字段判断> ← <依据>`），让下游有判断空间
- 设计意图：confidence 标注整体证据强度，但下游需要"哪个字段判断弱"的定向指引，否则只能全采信或全盘否定
- 立即应用：本轮新增的 `schema-v2-snapshot-align` / `schema-v2-snapshot-e2e` 已写推理链
- 源由：上一会话 schema-v2-snapshot 标 Hypothesis 但未写推理链，下游模型直接采信为"整体依赖 PR"，直到用户提问才读源码发现过度打包

## Commits

| Hash | Repo | Message |
|------|------|---------|
| （本会话）| cline-plus | feat(handoff-schema): V2 文档层改进 - depends_on 字段 + blocker_ref 显式化 + 解冻 |

## 未完成项

| id | 方向 | 说明 | 优先级 | confidence | depends_on | blocker_ref |
|----|------|------|--------|-----------|------------|-------------|
| `handoff-schema-v2-kind-exit` | kind/exit_when 显式化 | 在 handoff.md 未完成项表中显式标注 `[kind] exit_when`（V2 延伸项，可选）| 🟢 低 | Hypothesis | — | — |
| `assertion-semantic-model` | Assertion 语义模型讨论 | 把 handoff 基本单位从"字段"抽象为"Assertion"（Claim/Evidence/Justification/Confidence 四属性）；材料已写见 [assertion-semantic-model.md](handoff-schema/assertion-semantic-model.md)；不立即改 schema/规则 ← 上轮 §6 推理链约束是局部补丁，需先定语义模型再统一重构，否则陷入"补字段循环" | 🟡 中 | Hypothesis | — | — |
| `schema-v2-snapshot-align` | snapshot 数据模型对齐 schema V2 | types.ts 字段对齐 + extractors 调整 + 短对话实测（workaround 路径 `MAX_INPUT_TOKENS=1000`）；字段对齐/单元测试不依赖 codec bug ← codec bug 只阻塞真实长对话路径（≥90K tokens），不阻塞代码层字段对齐 | 🟡 中 | Hypothesis | — | — |
| `schema-v2-snapshot-e2e` | snapshot 真实长对话实测 | 真实 90K+ token 长对话路径实测 + frontmatter 显式化 + confidence 计算固化进 plugin；depends_on=pr-12032 ← 真实长对话路径触发 codec bug 必崩，需等修复 PR 合并 + CLI 发版 | 🟡 中 | Hypothesis | `pr-12032` | `B-cli-codec-bug` |
| `issue-11944` | GitHub #11944 跟进 | SDK 迁移时间线（影响 VS Code 扩展 plugin 系统恢复） | 🟡 中 | Verified | — | — |
| `pr-12032` | PR #12032 合并监控 | CLI codec bug 修复 PR（Open），合并 + CLI 发版后触发 §1.15 解除流程 7 步 | 🟡 中 | Verified | — | — |
| `vscode-monitor` | 监控 VS Code release | 关键词 Plugins / registerMessageBuilder | 🟢 低 | Verified | `issue-11944` | — |
| `mech-retirement` | mechanism-candidates 退休执行 | 2026-08-01 到期将 #17/#19/#24 移入归档 | 🟢 低 | Verified | — | — |
| `h2-h3-evidence` | 补证 H2/H3 | image 分支 undefined 丢弃（受 §1.15 阻塞，等 PR #12032）| 🟢 低 | Hypothesis | `pr-12032` | `B-cli-codec-bug` |
| `next-audit` | 下次文档健康度审查 | 2026-08-02（30 天后），按 §6.5 触发条件执行 | 🟢 低 | Verified | — | — |
| `tier4-deferred` | 第四档暂缓项 | D1/D3/D4/D6/D7 + G4-G5 + H3/H6 + I1-I3 + 根因4（根因4 已由 governance-procedure.md 部分承载）| 🟢 低 | Hypothesis | — | — |
| `mech-stale-scan` | mechanism-candidates stale 扫描 | #1/#2/#3 长期候选无进展（>90 天），评估保留/降级/删除 | 🟢 低 | Verified | — | — |

## 权威源

[dev-rules.md](dev-rules.md)（🟢 解冻）· [evidence-governance.md](evidence-governance.md) · [governance-procedure.md](governance-procedure.md) · [reviewer-personas.md](reviewer-personas.md) · [mechanism-candidates.md](mechanism-candidates.md) · [handoff-schema/project-rules.md](handoff-schema/project-rules.md)（功能专属，活跃执行）· [decisions/schema-semantic-object-model.md](decisions/schema-semantic-object-model.md) · [handoff-schema/design.md](handoff-schema/design.md)

> **新会话首动作**：读 [handoff.md](handoff.md) + [dev-rules.md](dev-rules.md) + [handoff-schema/project-rules.md](handoff-schema/project-rules.md)。其余状态以这三份文档自述为准。

---

## Handoff

```text
读 docs/handoff.md + docs/dev-rules.md + docs/handoff-schema/project-rules.md。
```

**后续动作**（无紧急项）：
1. **🟡 中：snapshot 数据模型对齐 schema V2** — `schema-v2-snapshot-align`（不依赖 PR，可立即推进）
2. **🟢 低：kind/exit_when 显式化** — `handoff-schema-v2-kind-exit` 延伸项（可选）
3. **🟡 中：跟进 GitHub #11944** — SDK 迁移时间线（影响 VS Code 扩展 plugin 系统恢复）
4. **🟡 中：监控 PR #12032** — CLI codec bug 修复 PR，合并 + 发版后触发 §1.15 解除流程 + `schema-v2-snapshot-e2e`
5. **🟢 低：2026-08-01 到期** — mechanism-candidates #17/#19/#24 移入归档
6. **🟢 低：2026-08-02 下次审查** — 按 dev-rules §6.5 触发条件执行
7. **🟢 低：stale 扫描** — mechanism-candidates #1/#2/#3 长期候选评估
8. **🟢 低：第四档暂缓项** — D1/D3/D4/D6/D7 + G4-G5 + H3/H6 + I1-I3
