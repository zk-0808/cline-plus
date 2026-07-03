# Semantic Object Model — 语义对象模型规范 (V1)

> **生命周期**：永久保留——跨项目通用的底层语义模型规范。
> **定位**：定义 `context-snapshot` (机械投影) 与 `handoff.md` (叙事投影) 共同依赖的核心对象模型。不拘泥于特定存储格式，仅约束字段定义、稳定 ID 生成与共享词汇表。

---

## 1. 核心五类对象模型

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
- `confidence`: 取值与 `evidence-governance.md §4` 一致：`Verified` / `Likely` / `Hypothesis`。
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
- `confidence`: 取值与 `evidence-governance.md` 一致：`Verified` / `Likely` / `Hypothesis`。
- `blocker_ref`: 指向 Blocker ID (若有阻塞，非自然语言，格式如 `B-cli-codec-bug`)。

---

## 2. 映射表

### 2.1 Handoff.md (叙事投影)
在 Frontmatter 或 Markdown 表格中映射如下字段：
- `id` ↔ 列 `id`
- `kind` / `exit_when` ↔ 列 `方向` / `说明` 中的 `[kind] exit_when` 标记
- `confidence` ↔ 列 `confidence`
- `blocker_ref` ↔ 列 `depends_on` (指向 Block ID，无 block 时空缺)

---

## 3. 验收查询示例
当 Blocker `B-cli-codec-bug` 解除后，自动遍历未完成项中所有 `blocker_ref == B-cli-codec-bug` 的 Handoff 对象，将其状态变更为“可推进”，无缝恢复开发。
