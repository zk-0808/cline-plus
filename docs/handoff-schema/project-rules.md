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

**决策依据**：[external-review-round2-handoff.md](../plugin/review/external-review-round2-handoff.md)（评审 Round 2 核心结论——snapshot 与 handoff 是同一套语义对象模型的两种投影）。

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
- 字段无遗漏（id / kind / exit_when / confidence / depends_on / blocker_ref 六字段全覆盖，V2 起）
- 依赖链完整（`depends_on` 指向其他 Handoff ID；`blocker_ref` 指向 Blocker ID，必须以 `B-` 前缀标识）
- 前缀规则无违反（`depends_on` 列中不应出现 `B-` 前缀；`blocker_ref` 列中不应出现非 `B-` 前缀）

### 4. 验收查询（成功标准之一）

给全新 agent 只喂 schema 产物（不喂 handoff.md 原文），让它回答"如果 codec bug 修复，哪些阻塞项会自动解锁？"——答得出依赖链才算到位。
- 查询方式：遍历未完成项中所有 `blocker_ref == B-cli-codec-bug` 的 Handoff 对象
- 当前预期答案：`h2-h3-evidence`（V2 后显式标注 `blocker_ref = B-cli-codec-bug`），其余 9 项无此 blocker

### 5. 不做的事

- **不做** snapshot schema 化（第二阶段，等 PR #12032 合并 + CLI 发版后跟进）
- **不做** plugin 代码推进（mechanism-candidates #5/#6 仍候选）
- **不修改** `docs/handoff.md` 现有未完成项的语义内容（V2 仅扩展结构——新增 `blocker_ref` 列承载已识别的 Blocker 关系，不改变现有条目的方向/说明语义）
- **不预写**未来阶段的字段（如 snapshot 专属字段，等第二阶段再加）
- **不做** `kind` / `exit_when` 在 handoff.md 中的显式标注（延伸项 `handoff-schema-v2-kind-exit`，可选推进）

### 6. Assertion Justification 属性过渡表达（v0.1 过渡版）

> **状态**：v0.1 过渡版——Assertion 语义模型已落地 schema §0.2，本节内容是模型在 handoff.md 表达层的过渡约束。待 V2 字段重写（实施第 6 步）后，本节内容迁移到统一 Assertion 表达，本节删除。

**规则**：`Evidence.kind = None` 或 `confidence = Hypothesis` 的未完成项**必须**在"说明"列写简短 Justification，说明关键字段判断（`depends_on` / `blocker_ref`）的依据。其他档可选。

**格式**：`<字段判断> ← <依据>`（一句话，写在"说明"列内）

**示例**：
- ❌ `说明: snapshot schema 化 | depends_on=pr-12032 | Hypothesis`（下游无法核查，只能采信或全盘否定）
- ✅ `说明: snapshot schema 化（字段对齐不依赖 PR / 长对话实测依赖 codec bug）| depends_on=pr-12032 | Hypothesis`（下游可定向判断）

**与 schema §0.2 的关系**：
- schema §0.2 Assertion 模型定义了 Justification 作为基本单位属性（普适）
- 本节是 Justification 属性在 handoff.md "说明"列的**过渡表达**——V2 字段尚未重写，handoff.md 仍用现有六字段表格
- 过渡期约束：高风险条目（`Hypothesis` / `Evidence.kind = None`）必须显式化 Justification，避免下游无判断空间
- 实施第 6 步（V2 字段重写）后，所有条目统一表达 Assertion 完整属性，本节过渡约束被吸收删除

**源由**：2026-07-03 会话——`schema-v2-snapshot` 标 `depends_on=pr-12032 + Hypothesis` 但未写 Justification。下游模型（下一会话）读到时直接采信为"snapshot schema 化整体依赖 PR #12032"，直到用户提问才读源码发现过度打包（schema 化本可拆为 align 不依赖 PR + e2e 依赖 PR）。这是 §0.2.3 反面教材的具体来源——伪装成事实的 None。

### 7. 消费层规则：高风险字段默认核查（Assertion 模型消费侧）

> **生命周期标注**：本规则本质普适（跨功能通用），但 dev-rules 当前冻结。短期沉淀在本文件，**待第二阶段开始时迁入 `dev-rules.md`**——迁入时机与 §6 重构同步评估。

**规则**：下游会话引用下列**高风险字段**时，必须先核查其 Assertion 属性（Evidence + Justification），再决定是否采信：

| 高风险字段 | 核查理由 |
|---|---|
| `depends_on` | 依赖关系直接影响后续规划——误采信会传播过度打包/错位阻塞 |
| `blocker_ref` | 阻塞关系直接影响推进判断——误采信会错位阻塞或漏判阻塞 |

**核查动作**（任选其一，按成本低者优先）：
1. **读 Justification**（最低成本）——若条目已写推理链（§6 v0 过渡版约束），直接读"说明"列
2. **核查 Evidence**（中等成本）——读引用的源文档（design.md / investigation-note / 源码）
3. **重跑 Assertion**（最高成本）——重新评估断言是否仍成立

**核查判据**：
- 若 Justification 充分且 Evidence.kind ≠ None → 采信 Claim
- 若 Justification 缺失或 Evidence.kind = None → **不直接采信**，必须先重跑 Assertion 或标记为待核查
- 若重跑结果与原 Claim 不一致 → 修正断言并记录新决策

**与 §0.1 原则的关系**：
- §0.1 高层原则要求"任何可被继承的断言都必须能被低成本重新评估"
- 本规则是 §0.1 在消费侧的落地——下游不主动核查就等于放弃了"重新评估"能力
- 但消费侧补丁不能替代表达层——若上游表达不足（缺 Justification/Evidence），下游仍需读源码，handoff 价值降低（见 [assertion-semantic-model.md §3 GPT 警告](./assertion-semantic-model.md)）

**适用范围**：
- 新会话开始时读 handoff.md 未完成项表，凡引用 `depends_on` / `blocker_ref` 的字段都适用
- 不适用于 `id` / `kind` / `exit_when` 等低风险字段（这些字段错误易在 30 秒约束内被发现）

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
