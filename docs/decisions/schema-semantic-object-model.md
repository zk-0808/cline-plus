# Semantic Object Model — Assertion 语义模型与载体分类规范 (V3)

> **生命周期**：永久保留——跨项目通用的底层语义模型规范。
> **定位**：定义 `context-snapshot` (机械投影) 与 `handoff.md` (叙事投影) 共同依赖的核心语义模型。不拘泥于特定存储格式，仅约束基本单位（Assertion）属性、载体分类（五类对象）、稳定 ID 生成与共享词汇表。
>
> **V3 变更（2026-07-03）**：引入 §0 设计原则 + Assertion 语义模型作为基本单位；V2 五类对象重定位为"Assertion 载体分类"（字段定义不变，仅表述更新）；解决 V2 中"confidence 标注了却没生效"的机制缺口——下游继承的是 Claim，缺 Evidence/Justification 时 confidence 仅是 item 级标签，无法阻止采信。
>
> **V2 变更（2026-07-03）**：1.5 Handoff 对象新增 `depends_on` 字段（Handoff 间依赖）；明确 `blocker_ref` vs `depends_on` 的 ID 前缀区分规则（`B-` = Blocker / 其他 = Handoff）。V1 中 `blocker_ref` 错误映射到 handoff.md `depends_on` 列的歧义由此消除。

---

## 0. 设计原则

### 0.1 高层原则

> **任何可被后续会话继承的断言，都必须能够被后续会话以低成本重新评估。**

此原则约束整个 handoff 系统（表达层 + 消费层），自然推出四项要求：
- **Evidence**：否则无法复核
- **Justification**：否则不知道为什么
- **Confidence**：否则不知道证据强弱
- **消费侧默认核查高风险断言**：否则不会重新评估（消费层规则见 `handoff-schema/project-rules.md`（**该文件已按 `docs/handoff-schema/design.md:213` 的约定删除**））

这些都是原则的推论，而不是零散规则。跨载体稳定——以后无论 handoff 是 Markdown / YAML / 数据库记录，此原则都可沿用，不受具体字段设计限制。

### 0.2 Assertion 语义模型（基本单位）

**handoff 保存的基本单位是 Assertion**，不是字段。五类对象（Decision/Change/Verification/Blocker/Handoff）是 Assertion 的**载体分类**，不是最小语义单位。

#### 0.2.1 四属性

每条 Assertion 天然拥有四个属性：

```
Evidence  （事实 + 来源元信息）
   ↓
Justification  （把事实连接到结论）
   ↓
Claim  （最终断言）
```

- **Claim**：断言内容本身（如 `depends_on = pr-12032`）
- **Evidence**：事实 + 来源元信息（对象，含 `kind` / `summary` 子属性，未来可扩展 `link` / `commit` / `file` / `line` 等）
- **Justification**：把 Evidence 连接到 Claim 的简短理由（不是 CoT 推理过程，30 字内即可）
- **Confidence**：Assertion 的属性（不是 handoff item 的属性）——条件必填，详见 §0.2.4

#### 0.2.2 Evidence.kind 枚举

| kind | 含义 | 本项目对应 |
|------|------|----------|
| `Code` | 读源码得出 | 读 types.ts / extractors 等代码 |
| `Test` | 实测得出 | 短对话 workaround / 真实长对话 e2e |
| `Discussion` | 评审 / 用户反馈 / 外部建议 | 评审 Round N / 用户提问 / 外部建议（如 GPT 反馈）|
| `Inference` | 基于已有断言推导 | **必须**有可追溯的上游 Assertion |
| `None` | 无任何来源，纯判断 | 用 `confidence = Hypothesis` 自然表达 |

#### 0.2.3 Inference vs None 边界（必须写死，防误用）

- **Inference**：基于已有断言推导，**有可追溯的上游 Assertion**。例："codec bug 阻塞长对话路径"基于 §1.15 现象 + 调研断言推导。
- **None**：无任何来源，纯判断。

**反面教材**（起源事件）：上一会话写的 `depends_on = pr-12032` 既没标 Inference（没指出上游断言）也没标证据，属于"**伪装成事实的 None**"——下游采信为事实，直到用户提问才核查发现过度打包。把这个例子写进枚举定义，防止同类误用。

#### 0.2.4 Confidence 条件必填

**决策**：Confidence **条件必填**——`Evidence.kind = None` 时必填，其他档可选。

理由：
- 当 Evidence 和 Justification 都充分时，confidence 是可从证据强弱**推导**的冗余信息
- 只有当 `kind = None`（即 §0.2.2 替代 Guess 的那档）时，confidence 才承担不可替代的表达职责
- **confidence 的必填性应该和 Evidence 的强弱挂钩**，而不是无条件必填
- 这呼应 §0.1 高层原则——"低成本重新评估"靠的是 Evidence+Justification，confidence 只是在证据缺位时的兜底信号

confidence 词汇表见 [§1.0](#10-confidence-词汇表共享)。

### 0.3 五类对象 = Assertion 载体分类

V2 中"五类对象"原定位为"语义对象模型"，V3 调整为"Assertion 的载体分类"——按内容性质分（决策 / 变更 / 验证 / 阻塞 / 未完成项），与 Assertion（按语义性质分）正交不冲突。

- 一个 Handoff 对象内可含多条 Assertion
- 例：`schema-v2-snapshot-e2e` 这条 Handoff 对象含：
  - Assertion A: `depends_on = pr-12032`（Claim）
  - Assertion B: `blocker_ref = B-cli-codec-bug`（Claim）
  - Assertion C: `exit_when = PR 合并 + CLI 发版`（Claim）
- 每条 Assertion 都应有自己的 Evidence / Justification / Confidence

**字段定义不变**——V2 字段是载体层的合理表达。V3 仅调整定位表述，不立即重写字段（待 Assertion 模型稳定后由模型反推，见 [handoff-schema/assertion-semantic-model.md §9.2](../handoff-schema/assertion-semantic-model.md) 实施顺序第 6 步）。

---

## 1. 五类对象模型（Assertion 载体分类）

### 1.0 Confidence 词汇表（共享）

`confidence` 字段统一映射 [evidence-governance.md §4](../evidence-governance.md) 三档。**本表是"字段 → 治理语义"的映射，不是判定语义的定义源**——状态转换条件与置信度门槛以 evidence-governance.md §2 / §4 为准，引用时的写法约束以该文件 [§4.2](../evidence-governance.md#42-术语使用边界) 为准：

| schema 取值 | evidence-governance §4 | 定义 | 可进入的状态 |
|------------|----------------------|------|------------|
| `Verified` | 高 | ≥3 个独立证据类型一致，无冲突 | `State = Decision` |
| `Likely` | 中 | 2 个独立证据类型一致，或单源但来源权威 | `State = Verified` |
| `Hypothesis` | 低 | 单一证据，或存在未解决冲突 | `State = Hypothesis` |

**注**：schema 借用了状态机的**词汇形态**（`Verified` / `Hypothesis` 同时是 evidence-governance §2.1 的状态名）便于跨对象复用——同一套词汇既能标注 Verification 对象的验证强度，也能标注 Handoff 对象的判断强度。evidence-governance §4 用高/中/低便于人工记忆。两者通过本表对齐，**不是字面一致**。

⚠️ **同词不同义**：`confidence = Verified`（高，门槛 ≥3）**不等价于** `State = Verified`（门槛 ≥2）。一条 `State = Verified` 的结论，其字段标签可能是 `Likely`。引用时按 [evidence-governance.md §4.2](../evidence-governance.md#42-术语使用边界) 的写法约束区分层次（状态带 `State =` 前缀，字段带 `confidence =` 前缀）。本表第 4 列即按该约定书写。

### 1.1 Decision (决策对象)
记录项目中的架构决策、规则变化或关键方向转变。
- `id`: 格式为 `D-YYYY-MM-DD-short-name` 或 `ADR-NNN`。
- `title`: 决策简述。
- `status`: 枚举值包括 `proposed` / `active` / `deferred` / `superseded` / `rolled-back`。
- `evidence_as_of`: 决策建立时的基准日期。
- `expires_if_unchanged`: 决策超期必须复查的日期。
- `blocker_ref`: (可选) 若决策被阻塞，指向 Blocker ID。

### 1.2 Change (变更对象)
记录代码或文档的实际变更。
- `id`: 格式为 `C-commit-hash` 或 `change-short-name`。
- `description`: 变更内容说明。
- `files`: 变更影响的文件列表。
- `depends_on`: 依赖的其他变更/决策 ID。

### 1.3 Verification (验证对象)
记录实验、测试、双盲验证或实证的结论。
- `id`: 格式为 `V-run-N` 或 `verification-short-name`。
- `confidence`: 见 [§1.0](#10-confidence-词汇表共享) 词汇表（`Verified` / `Likely` / `Hypothesis`）。
- `evidence_refs`: 支撑该验证结论 of 证据 ID 列表（如 `O1`, `E1`）。
- `outcome`: 验证结果描述。

### 1.4 Blocker (阻塞对象)
记录外部环境或不可抗力导致的阻塞。
- `id`: 格式为 `B-short-name` (例如 `B-cli-codec-bug`)。
- `type`: `invisible_modal_or_native_dialog` / `stale_blocked_page` / `captcha_or_human_check` / `environment_issue` 等。
- `recovery_condition`: 明确的可判断的解除条件。
- `impact_level`: `🔴 搁置` / `🟡 部分受限` / `🟢 可推进`。

### 1.5 Handoff (交接/未完成项对象)
定义待办任务、计划或交接跟踪点。
- `id`: 稳定短 ID，小写字母 + 数字 + 连字符 (例如 `next-feature-direction`)。
- `kind`: `conclusion` (结论型) | `action` (动作型)。
- `exit_when`: 退出或完成的判定条件。
- `confidence`: 见 [§1.0](#10-confidence-词汇表共享) 词汇表（`Verified` / `Likely` / `Hypothesis`）。
- `depends_on`: 依赖的其他 **Handoff ID** 列表 (逗号分隔，例如 `issue-11944`)。**禁止**指向 Blocker ID——Blocker 关系用 `blocker_ref`。
- `blocker_ref`: 指向 **Blocker ID** (若有阻塞，非自然语言，格式如 `B-cli-codec-bug`)。

**ID 前缀区分规则（V2 核心）**：

| ID 前缀 | 类型 | 写入字段 |
|---------|------|---------|
| `B-` | Blocker | `blocker_ref` |
| 其他（如 `pr-` / `issue-` / 自定义短 ID）| Handoff | `depends_on` |

混用判据：若同一未完成项同时依赖 Blocker 解除和其他 Handoff 完成，两字段都填。例：`h2-h3-evidence` 同时 `blocker_ref = B-cli-codec-bug`（codec bug 阻塞）+ `depends_on = pr-12032`（PR 合并动作完成）。

---

## 2. 映射表

### 2.1 Handoff.md (叙事投影)
在 Frontmatter 或 Markdown 表格中映射如下字段：
- `id` ↔ 列 `id`
- `kind` / `exit_when` ↔ 列 `方向` / `说明` 中的 `[kind] exit_when` 标记
- `confidence` ↔ 列 `confidence`
- `depends_on` ↔ 列 `depends_on` (指向其他 Handoff ID，逗号分隔)
- `blocker_ref` ↔ 列 `blocker_ref` (指向 Blocker ID，`B-` 前缀；无阻塞时空缺)

**前缀区分规则（V2）**：
- 列 `depends_on` 中的 ID 若以 `B-` 开头 → 实为 Blocker 关系，应迁到 `blocker_ref` 列
- 列 `blocker_ref` 中的 ID 若不以 `B-` 开头 → 实为 Handoff 依赖，应迁到 `depends_on` 列

---

## 3. 验收查询示例
当 Blocker `B-cli-codec-bug` 解除后，自动遍历未完成项中所有 `blocker_ref == B-cli-codec-bug` 的 Handoff 对象，将其状态变更为“可推进”，无缝恢复开发。
