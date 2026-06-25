# Project Rules — search-orchestrator 开发期

> **范围**：仅在 search-orchestrator 这一功能开发期间生效。功能稳定后此文件可整体删除。
>
> **加载方式**：本文件**不**通过 `.trae/rules/` 自动注入到系统提示词。新会话开始时，由用户在第一句话提醒模型阅读本文件一次即可。
>
> **原则**：只写防漂移的最小约束，不写"必读必写"硬规则。本文件本身就是 C 类（治理思考方式）的半机制化辅助。

---

## 三份长期文档的职责划分

避免重复写、避免状态错位。三份文档**各管一摊**：

| 文档 | 负责 | 不负责 |
|------|------|--------|
| `docs/search-orchestrator/survey.md` §9 | 决策表 / 实验表 / 路线状态 | 机制清单全表、会话流水 |
| `docs/mechanism-candidates.md` | 经验机制化清单（22 条候选的状态） | 短期路线状态、决策跳转 |
| `docs/handoff.md` | 会话快照（本会话决策、净变化、下次第一句话） | 重列上面两份的长期表 |

`handoff.md` 若需要引用路线或机制清单，用**链接**指向，不复制内容。

---

## 五条防漂移约束

只在下列触发时机做对应动作，没触发不要主动改：

1. **落地新决策**（写入 `docs/decisions/D-*.md` 或 `ADR-*.md`）
   → 同步 `survey.md §9.1` 决策表加一行

2. **某决策 status 变更**（active / deferred / rolled-back / superseded / proposed）
   → `survey.md §9.1` 该行状态同步更新
   → 若该决策对应 `mechanism-candidates` 某条经验已落地为机制，把那条状态改为 `已机制化`

3. **完成一次 A/B 实验**（新增 `experiments/run-N-*.md`）
   → `survey.md §9.2` 实验表加一行（含评分与结论）

4. **触发写 handoff** —— 满足下列任一触发器才覆盖写 `docs/handoff.md`，没触发不要主动写。写入内容只保留本会话决策、净变化、下次会话第一句话；不重列长期清单。

   - **触发器 4.a 用户口头要求**（无条件）
     用户在对话中明确说「写 handoff」「交接」「结束会话」等。立即执行，不需要任何前置判断。
     *元规则：不写进本文件以外的判断逻辑，由用户在对话层触发即可。*

   - **触发器 4.b P 级任务完成**（自动）
     `docs/search-orchestrator/survey.md §9.3` 路线项（含 Infra）的 status 跳转为 `active` / `rolled-back` / `deferred` / `superseded` 任一**终态**时，本会话即视为产出实质性进展，自动写 handoff。
     `proposed` 不算终态——决策草案落地不触发。

   - **触发器 4.c 对话过长 + 话题已跳 + 上下文吃紧**（建议，不自动）
     **同时**满足下列三条：
     ① 本会话用户消息 ≥ 8 轮；
     ② 当前轮所讨论的工作项与上一轮**无证据/决策依赖**（即：不引用上一轮的实验数据、决策 ID、文件改动）；
     ③ 上下文窗口占用 ≥ 70%（即 token usage 估算已逼近模型上限，继续推进风险大）。
     仅向用户**提议**写 handoff，由用户拍板，不自动覆盖。
     *三条 AND 的设计意图*：① 防止短会话误报，② 防止同话题多轮调优误报，③ 防止前两条满足但 context 充裕时过早交接（损失会话内已建立的工作记忆）。

   *没有任一触发器命中时禁止写 handoff*。例如：刚完成上一份 handoff 列出的"下次具体动作"中的第一项 ≠ 触发器，本会话应继续推进剩余动作，而不是再写 handoff。

   **子条款：handoff 进入 git**：每次覆盖写 `docs/handoff.md` 后，必须立即 git commit（含 handoff.md 及本会话产生的所有新文件和修改文件）。commit message 格式：`handoff: <一句话摘要>`。目的：出现异常时可回滚到任一 handoff 快照。

5. **执行主体边界**（TRAE agent vs Cline SKILL）

   当某步骤的 designated executor 是 Cline + SKILL 时（即需要 Goggle 过滤 / P3 三元组抽取 / 三档模式 / 同源去重等 SKILL 层机制），TRAE agent 不得直接用 WebSearch / WebFetch 等通用工具替代执行。

   **判定规则**：若实验框架（run-N-*.md）的执行提示词是"复制到 Cline 执行"，则该步骤的执行主体是 Cline，不是 TRAE agent。TRAE agent 的 WebSearch / WebFetch 等价于"裸 search"层，缺少 SKILL 层的全部机制处理。

   **违反时**：回滚 TRAE agent 产出的证据，交付提示词给用户在 Cline 中执行。

   **子条款：执行产出归档路径**：Cline 执行提示词必须在开头声明输出文件的建议存放位置，格式为 `docs/<功能>/experiments/run-N-phase*-*.md`。若提示词未声明位置，Cline 执行模型会自主选择位置（如 `research/`），导致产出文件脱离实验目录治理。此子条款将 `ab-test-template.md:140` 的提示性语句提升为硬规则。

   *设计意图*：与"不在 SKILL 层做基础设施层的事"（handoff.md）、"绝不用规则解决运行时问题"（README.md）构成同构治理原则——不在错误的层做错误的事。

---

## 状态值约定

`mechanism-candidates.md` 状态枚举见该文件 §状态约定，只能用：`候选` / `实验中` / `已机制化` / `永久C类` / `已退休`。不要发明新值（例如 `investigate-later`、`暂缓` 这类如需表达，用「候选（暂缓）— 触发条件：XXX」的注释形式）。

决策 status 枚举见 `docs/README.md`：`proposed` / `active` / `deferred` / `superseded` / `rolled-back`。

---

## 本文件的生命周期

- 触发删除条件：search-orchestrator 进入冻结期，不再有新决策/实验
- 触发扩容条件：再多两个功能领域（如 plugin、handoff-v2）都遇到同类漂移问题，再考虑提升到通用治理层
- 不做的事：不预写"未来可能用到"的规则
