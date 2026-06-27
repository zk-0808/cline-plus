# Project Rules — search-orchestrator（功能专属开发期规则）

> **范围**：仅在 search-orchestrator 这一功能开发期间生效。功能稳定后此文件可整体删除。
>
> **命名约定**：功能专属的开发期防漂移规则统一命名为 `project-rules-<功能短名>.md`，各功能各持一份，开发期间**只在本功能对应的这份文件里增删规则**。跨功能通用规则一律不进本文件，统一沉淀到 [`dev-rules.md`](dev-rules.md)（永久保留）。
>
> **加载方式**：本文件**不**通过 `.trae/rules/` 自动注入到系统提示词。新会话开始时，由用户在第一句话提醒模型阅读本文件一次即可。
>
> **原则**：只写防漂移的最小约束，不写"必读必写"硬规则。本文件本身就是 C 类（治理思考方式）的半机制化辅助。
>
> **与 [`dev-rules.md`](dev-rules.md) 的分工**：本文件只收录**绑定 search-orchestrator 功能**（`survey.md §9` 决策/实验/路线表）的防漂移约束，功能冻结后整体删除。跨功能通用的执行边界、handoff 通用触发器、状态值约定已迁至 `dev-rules.md`（永久保留）。

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

## search-orchestrator 防漂移约束

只在下列触发时机做对应动作，没触发不要主动改。**约束 1–3 + 4.b 为本功能专属**；通用约束（4.a/4.c/git、约束5 执行边界、状态值约定）见 [`dev-rules.md`](dev-rules.md)：

1. **落地新决策**（写入 `docs/decisions/D-*.md` 或 `ADR-*.md`）
   → 同步 `survey.md §9.1` 决策表加一行

2. **某决策 status 变更**（active / deferred / rolled-back / superseded / proposed）
   → `survey.md §9.1` 该行状态同步更新
   → 若该决策对应 `mechanism-candidates` 某条经验已落地为机制，把那条状态改为 `已机制化`

3. **完成一次 A/B 实验**（新增 `experiments/run-N-*.md`）
   → `survey.md §9.2` 实验表加一行（含评分与结论）

4. **触发写 handoff** —— 满足下列任一触发器才覆盖写 `docs/handoff.md`，没触发不要主动写。写入内容只保留本会话决策、净变化、下次会话第一句话；不重列长期清单。

   - **触发器 4.a 用户口头要求**（无条件）+ **触发器 4.c 对话过长 + 话题已跳 + 上下文吃紧**（建议）+ **子条款 handoff 进入 git**：均为跨功能通用规则，已迁至 [`dev-rules.md §2`](dev-rules.md)。本文件不再重复，按链接执行。

   - **触发器 4.b P 级任务完成**（自动，**search-orchestrator 专属**）
     `docs/search-orchestrator/survey.md §9.3` 路线项（含 Infra）的 status 跳转为 `active` / `rolled-back` / `deferred` / `superseded` 任一**终态**时，本会话即视为产出实质性进展，自动写 handoff。
     `proposed` 不算终态——决策草案落地不触发。

   *没有任一触发器命中时禁止写 handoff*。例如：刚完成上一份 handoff 列出的"下次具体动作"中的第一项 ≠ 触发器，本会话应继续推进剩余动作，而不是再写 handoff。

5. **执行主体边界**（TRAE agent vs Cline SKILL）

   此约束全套（执行主体边界 + 执行产出归档路径 / TTY 真实终端 / 阴性结论须排除验证方法错误三个子条款）为跨功能通用规则，已迁至 [`dev-rules.md §1`](dev-rules.md)。本文件不再重复，按链接执行。

---

## 状态值约定

已迁至 [`dev-rules.md §3`](dev-rules.md)（`mechanism-candidates.md` 状态枚举 + 决策 status 枚举）。

---

## 本文件的生命周期

- 触发删除条件：search-orchestrator 进入冻结期，不再有新决策/实验
- 通用治理层已分离：跨功能通用规则已提升至 [`dev-rules.md`](dev-rules.md)（永久保留）。本文件冻结期删除时，通用规则不受影响。
- 不做的事：不预写"未来可能用到"的规则；不收录跨功能通用规则（那些归 `dev-rules.md`）
