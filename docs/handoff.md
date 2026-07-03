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
| `assertion-semantic-model-confirmed` | Assertion 语义模型决策落地——基本单位=Assertion（Claim/Evidence/Justification/Confidence 四属性）；Evidence.kind 5 档枚举（Code/Test/Discussion/Inference/None）+ Inference vs None 边界写死；Confidence 条件必填（仅 None 时必填）；原则写 schema §0；消费规则写 project-rules 标注待迁入；V2 五类对象调整为"Assertion 载体分类"；新增元规则"是否在打字段补丁"防复发 | Verified | `hypothesis-reasoning-rule` |
| `assertion-model-impl-step1-5` | Assertion 模型实施第 1-5 步完成：schema V2→V3（标题调整 + §0 原则 + §0.2 Assertion 模型定义 + §0.3 五类对象重定位）；project-rules §6 v0→v0.1（Hypothesis 推理链→Assertion Justification 过渡表达）+ §7 新增消费层规则（高风险字段默认核查，待迁入 dev-rules）；第 6 步 V2 字段重写按材料 §9.3 暂不推进保持缓冲 | Verified | `assertion-semantic-model-confirmed` |

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

### 8. Assertion 语义模型决策（`docs/handoff-schema/assertion-semantic-model.md`）

材料从"讨论稿"升级为"决策版"——核心结论已定：
- **Q1 已确认**：handoff 基本单位 = Assertion（解释力 + 正交性两检验通过）
- **Q2 已确认**：四属性最小模型（Claim / Evidence / Justification / Confidence）；Evidence 含 kind 子属性；Confidence 条件必填（仅 None 时必填）
- **Q3 已定**：Evidence.kind 5 档枚举（Code/Test/Discussion/Inference/None）+ Inference vs None 边界写死（Inference 有可追溯上游断言 / None 无来源纯判断）+ 起源事件作反面教材写入
- **Q4 已定**：高层原则写 schema §0 设计原则（统领 V2 对象 + Assertion 两套东西）
- **Q5 已定**：消费层规则短期写 project-rules 标注"待第二阶段迁入 dev-rules"
- **Q6 已定**：V2 五类对象定位调整为"Assertion 载体分类"（字段不变仅表述更新）
- **新增 §10 元规则**：每个决策前自检"是不是又在打字段补丁"——约束思考方式防复发
- **§9.2 实施顺序**：6 步（schema §0 原则 → 标题调整 → Assertion 模型定义 → 消费规则 → §6 处理 → V2 字段重写最后做）

### 9. Assertion 模型实施第 1-5 步（`docs/decisions/schema-semantic-object-model.md` + `docs/handoff-schema/project-rules.md`）

按材料 §9.2 顺序推进，每步用 §10 元规则自检（每步都不是加 V2 字段，是显式化 Assertion 属性 / 调整表述 / 落地原则推论）：

**schema V2 → V3**（`docs/decisions/schema-semantic-object-model.md`）：
- 标题调整：从"语义对象模型规范"→"Assertion 语义模型与载体分类规范"
- 新增 §0.1 高层原则（任何可被继承的断言必须能被低成本重新评估）
- 新增 §0.2 Assertion 语义模型（基本单位）：四属性 + Evidence.kind 5 档枚举 + Inference vs None 边界写死 + Confidence 条件必填规则
- 新增 §0.3 五类对象 = Assertion 载体分类（V2 字段定义不变，仅表述更新）
- §1 标题调整：从"核心五类对象模型"→"五类对象模型（Assertion 载体分类）"

**project-rules §6 v0 → v0.1**（`docs/handoff-schema/project-rules.md`）：
- §6 从"Hypothesis 条目推理链（机制改进）"→"Assertion Justification 属性过渡表达（v0.1 过渡版）"
- 规则约束扩展：从仅 `Hypothesis` → `Evidence.kind = None 或 Hypothesis`
- 增加与 schema §0.2 的关系说明（模型定义 vs 表达层过渡）
- 标注 v0.1 状态——待 V2 字段重写（实施第 6 步）后内容被吸收删除

**project-rules §7 新增**（`docs/handoff-schema/project-rules.md`）：
- 消费层规则：高风险字段（`depends_on` / `blocker_ref`）默认核查
- 三档核查动作（读 Justification / 核查 Evidence / 重跑 Assertion）
- 核查判据（Justification 充分且 Evidence.kind ≠ None → 采信；缺失或 None → 不直接采信）
- 与 §0.1 原则的关系说明
- 标注"待第二阶段迁入 dev-rules"

**第 6 步暂不推进**：V2 字段表达重写按材料 §9.3 保持缓冲——等第 1-5 步稳定后再由模型反推。

## Commits

| Hash | Repo | Message |
|------|------|---------|
| （本会话）| cline-plus | feat(handoff-schema): V2 文档层改进 - depends_on 字段 + blocker_ref 显式化 + 解冻 |

## 未完成项

| id | 方向 | 说明 | 优先级 | confidence | depends_on | blocker_ref |
|----|------|------|--------|-----------|------------|-------------|
| `handoff-schema-v2-kind-exit` | kind/exit_when 显式化 | 在 handoff.md 未完成项表中显式标注 `[kind] exit_when`（V2 延伸项，可选）| 🟢 低 | Hypothesis | — | — |
| `assertion-semantic-model` | Assertion 语义模型决策（已落地，待实施） | 决策版材料见 [assertion-semantic-model.md](handoff-schema/assertion-semantic-model.md)；Q1-Q6 已定 + 元规则已加；下次会话进入实施阶段（按材料 §9.2 顺序推进 6 步）；不立即改 schema/规则 ← 上轮 §6 是局部补丁，需先定语义模型再统一重构，否则陷入"补字段循环"；元规则约束思考方式防复发 | 🟡 中 | Verified | — | — |
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
