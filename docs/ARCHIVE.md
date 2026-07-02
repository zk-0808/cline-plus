# 根目录文档归档摘要

> **生命周期**：永久保留——归档索引。

> **日期**：2026-06-28
> **评估范围**：`docs/` 根目录 8 个文档
> **原则**：不移动、不删除文件，仅记录归档建议

---

## 归档项

### `workflow-review-2026-06-27.md`

- **核心价值**：ADR-002 Update 1→4 连续颠覆链的根因分析，提交给外部评审的一次性材料
- **归档原因**：
  - 一次性评审材料，非持续维护文档
  - 核心发现已沉淀到 `evidence-governance.md`（证据生命周期状态机、单源裁决等错误模式）
  - 改进建议已纳入 `dev-rules.md`（§1.3 阴性结论须先排除验证方法错误等）
  - 日期限定命名（`2026-06-27`）表明其为快照而非活文档
- **备注**：保留文件本身作为历史追溯，但不应作为当前治理依据

---

## 保留项

| 文件 | 保留原因 |
|------|---------|
| `PROJECT_DEV_OUTLINE.md` | 项目定位、三层架构（L1/L2/L3）、"三个绝不"等基础框架仍有效，ADR-002 引用仍正确 |
| `README.md` | 文档目录索引，当前结构（含 `decisions/`、`plugin/`）反映准确 |
| `dev-rules.md` | 活跃治理文档，跨功能永久规则，持续更新中 |
| `evidence-governance.md` | 活跃治理文档，证据生命周期状态机，近期创建（2026-06-27） |
| `handoff.md` | 活跃会话快照，反映当前项目状态（ADR-005 + mechanism-landing-assessment） |
| `mechanism-candidates.md` | 活跃跟踪文档，11 条候选状态持续更新 |
| `reviewer-personas.md` | 活跃治理文档，Level 1 元规则 |

---

## 外部评审文档闭环状态（H7 补登，2026-07-02）

> **原则**：不移动文件（保持引用链完整），仅在本文档记录闭环状态。闭环 = 意见已处理 + 决策已落定 + 后续跟踪表已建立。

| 文件 | 闭环状态 | 闭环依据 | 备注 |
|------|---------|---------|------|
| `plugin/claude-external-review/review-closure-report.md` | ✅ 已闭环 | §7 闭环结论 + B1-B5 跟踪表（G2 补全） | 闭环报告本身，含处理决策矩阵 |
| `plugin/claude-external-review/` 其余文档 | ✅ 已闭环 | 意见已纳入 review-closure-report | Claude 评审输入材料 |
| `plugin/gpt-external-review/deep-research-summary.md` | ✅ 已闭环 | 意见已纳入 review-closure-report §3 | GPT 评审摘要 |
| `plugin/gpt-external-review/` 其余文档 | ✅ 已闭环 | 同上 | GPT 评审输入材料 |
| `plugin/external-review-handoff-foundation.md` | ✅ 已闭环 | 第 1 轮评审输入，已由 response-to-external-review-handoff 回应 | 第 1 轮 |
| `plugin/response-to-external-review-handoff.md` | ✅ 已闭环 | 项目方第 1 轮回应，已由 round2 评审回复 | 第 1 轮回应 |
| `plugin/external-review-round2-handoff.md` | 🔄 活跃 | 第 2 轮评审 + §7 项目方第 2 轮回应（2026-07-02 追加） | **不归档**——round2 回应刚完成，后续可能触发第 3 轮 |

**归档判据**：闭环文档保留在原位（不移动到 archive/），因仍有引用（如 review-closure-report B1-B5 跟踪表、round2-handoff §7 回应）。下次文档健康度审查时复查是否可物理归档。
