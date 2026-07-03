# Project Rules — handoff-schema（功能专属开发期约束）

> **生命周期**：功能绑定 — handoff.md 语义对象模型第一阶段，验收通过后归档（跨功能通用规则迁入 dev-rules.md）。
>
> **范围**：仅在 handoff-schema 功能开发期间生效。功能稳定后此文件可整体删除。
>
> **命名约定**：功能专属的开发期防漂移规则统一命名为 `project-rules-<功能短名>.md`，各功能各持一份，开发期间**只在本功能对应的这份文件里增删规则**。跨功能通用规则一律不进本文件，统一沉淀到 [`dev-rules.md`](../dev-rules.md)（永久保留）。
>
> **加载方式**：本文件不依赖任何特定 IDE 的规则自动注入机制。新会话开始时由用户在第一句话提醒模型阅读本文件一次即可。
>
> **原则**：只写防漂移的最小约束，不写"必读必写"硬规则。本文件本身就是 C 类（治理思考方式）的半机制化辅助。
>
> **与 [`dev-rules.md`](../dev-rules.md) 的分工**：本文件只收录**绑定 handoff-schema 功能**（语义对象模型 + handoff.md frontmatter 扩展）的防漂移约束。跨功能通用的执行边界、handoff 通用触发器、状态值约定已沉淀至 `dev-rules.md`（永久保留），本文件不重复。

---

## §4 门控声明（启动时已确认）

| 维度 | 答案 |
|------|------|
| **载体** | 文档体系（`docs/handoff.md` + 新建语义对象模型文档）|
| **范围** | handoff schema 定义 + frontmatter 扩展；不涉及 plugin 代码 |
| **排除** | snapshot schema 化（等 PR #12032 合并 + CLI 发版后作为第二阶段跟进）、mechanism-candidates #5/#6 plugin 代码推进 |
| **成功标准** | 语义对象模型草案产出 + 现有 handoff.md 完成一次无损映射测试 + 验收查询可回答 |

**决策依据**：[external-review-round2-handoff.md](../plugin/external-review-round2-handoff.md)（评审 Round 2 核心结论——snapshot 与 handoff 是同一套语义对象模型的两种投影）。

---

## 三份长期文档的职责划分

避免重复写、避免状态错位。三份文档**各管一摊**：

| 文档 | 负责 | 不负责 |
|------|------|--------|
| `docs/decisions/schema-semantic-object-model.md` | 语义对象模型规范（五类对象字段定义 / ID 规则 / confidence 词汇表 / lifecycle / blocker_ref 指向稳定 ID）| 会话流水、handoff 未完成项表 |
| `docs/handoff.md` | 会话快照（本会话决策、净变化、下次会话第一句话）+ 未完成项表（强制三字段 id/confidence/depends_on）| 重列 schema 字段定义 |
| `docs/handoff-schema/design.md` | 设计文档（映射规则 / frontmatter 扩展 / 验收查询 / 演进路线）| 重复 schema 字段定义 |

`handoff.md` 若需引用 schema 字段定义，用**链接**指向 `schema-semantic-object-model.md`，不复制内容。

---

## handoff-schema 防漂移约束

只在下列触发时机做对应动作，没触发不要主动改。本约束为本功能专属；通用约束（handoff 触发器 a/b/c / git 序列化 / 执行主体边界 / 状态值约定）见 [`dev-rules.md`](../dev-rules.md)。

### 1. schema 字段变更（新增/修改/删除字段）

→ 同步更新 `docs/decisions/schema-semantic-object-model.md`（权威源）
→ 同步更新 `docs/handoff-schema/design.md` §映射规则（如映射方式变化）
→ 重新执行无损映射测试（见约束 3）

### 2. handoff.md frontmatter 扩展

→ frontmatter 字段必须与 schema 1.5 Handoff 对象字段对齐
→ 现有表格列不删除（向前兼容），仅新增列或补充字段
→ `blocker_ref` 指向稳定 Blocker ID（如 `B-cli-codec-bug`），**禁止**自然语言描述（如"等 codec bug 修复"）

### 3. 无损映射测试（验收判据之一）

每当 schema 字段变更或 handoff.md 结构变更时，必须执行一次无损映射测试：
- 当前 `docs/handoff.md` 未完成项表所有条目全部映射为结构化 Handoff 对象
- 字段无遗漏（id / kind / exit_when / confidence / blocker_ref 五字段全覆盖）
- 依赖链完整（depends_on / blocker_ref 指向的 ID 在 schema 中存在）

### 4. 验收查询（成功标准之一）

给全新 agent 只喂 schema 产物（不喂 handoff.md 原文），让它回答"如果 codec bug 修复，哪些阻塞项会自动解锁？"——答得出依赖链才算到位。
- 查询方式：遍历未完成项中所有 `blocker_ref == B-cli-codec-bug` 的 Handoff 对象
- 当前预期答案：`h2-h3-evidence`（`blocker_ref = B-cli-codec-bug`），其余 8 项无此 blocker

### 5. 不做的事

- **不做** snapshot schema 化（第二阶段，等 PR #12032 合并 + CLI 发版后跟进）
- **不做** plugin 代码推进（mechanism-candidates #5/#6 仍候选）
- **不修改** `docs/handoff.md` 现有未完成项内容（仅扩展结构，不改变语义）
- **不预写**未来阶段的字段（如 snapshot 专属字段，等第二阶段再加）

---

## 状态值约定

复用 [`dev-rules.md §3`](../dev-rules.md)。本功能涉及的状态枚举：
- confidence：`Verified` / `Likely` / `Hypothesis`（对齐 `evidence-governance.md §4`）
- lifecycle.kind：`conclusion`（结论型）/ `action`（动作建议型）
- blocker_ref impact_level：`🔴 搁置` / `🟡 部分受限` / `🟢 可推进`

---

## 本功能不引入新规则到 dev-rules.md

按 [`dev-rules.md` L487 维护节奏](../dev-rules.md)，本功能开发期间 dev-rules.md 冻结。所有新规则沉淀在本文件，功能结束后才评估迁入。

**预期迁入项**（待功能结束后评估）：
- 无。语义对象模型规范是文档级产出，不是行为规则。若 schema 字段约束被验证为跨功能通用，才考虑迁入 dev-rules §2（handoff 触发器）或独立章节。
