# ADR 复查队列

> **生命周期**：任务绑定 — 每轮复查清空条目后重写；队列空了就把本文件删掉。
>
> **定位**：`dev-rules.md §1.13` 要求「引用 ADR 结论作为新决策论据前必须先复查」。本文件把**已知过期但尚未复查**的 ADR 逐条列出来，写明各自需要什么证据、卡在哪一步。
>
> **它不是结论**。`状态：blocked` 的意思是「这份决策目前**不得**作为新决策的依据」，不是「它错了」。复查完成后更新 ADR 自身的 `Evidence as of` / `Expires if unchanged`，并把本行删除。
>
> **口径**：ADR 分散在 `docs/decisions/adr/` 与 `.governance/decisions/adr/` 两棵树，编号序列共享 —— 引用任何一份都必须写明来源目录（见 `.governance/decisions/adr/README.md`）。

---

## 待复查（blocked）

| ADR | 来源目录 | 结论（摘） | 过期于 | 已过期 | 仓内被引 | 需要什么证据 | 谁能给 | 状态 |
|---|---|---|---|---|---|---|---|---|
| ADR-001 | `docs/decisions/adr/` | Handoff / Compact / Memory 架构方向 | 2026-07-23 | 86 天 | 16 个文件 | 官方文档/版本号类：Cline CLI 当前版本对 handoff/compact 的机制是否仍如当时所述 | 需 CLI 实测或官方文档；本机 `cline` 不在 PATH | blocked |
| ADR-002 | `docs/decisions/adr/` | 项目承载形态与分层架构 | 2026-07-27 | 82 天 | 20 个文件 | VS Code 扩展 plugin 可用性结论是否被后续版本推翻；SDK 迁移 issue #11944 进展 | 上游 issue + 官方文档 | blocked |
| ADR-005 | `docs/decisions/adr/` | 拆分 Compaction 与 Handoff | 2026-07-28 | 81 天 | 29 个文件 | 依赖 ADR-001 / ADR-004 的时效；两者未复查前无法独立判定 | 上游 ADR 先复查 | blocked |
| ADR-006 | `docs/decisions/adr/` | Native Mechanism First Principle（原生机制优先） | 2026-08-03 | 75 天 | 13 个文件 | 项目原则类：30 天内该原则的执行情况（是否有违反而未登记） | 本仓库自身的决策记录即可自查 | blocked |
| ADR-007 | `docs/decisions/adr/`（正文） | snapshot 走 registerRule 静态注入，不迁 messageBuilder | 2026-08-04 | 74 天 | 18 个文件 | registerRule 静态注入在**当前** CLI 版本下是否仍只在 session 启动求值一次 | 需 CLI 实测 | blocked |

## 不需复查（列出是为了让"7 份"这个数字对得上）

| ADR | 来源目录 | 为何不进队列 |
|---|---|---|
| ADR-004 | `docs/decisions/adr/` | 已被 ADR-005 **整体取代**，复查义务随之解除。引用时应引 ADR-005 |
| ADR-008 | `.governance/decisions/adr/` | 未过期（2027-01-09 到期），当前可正常引用 |

---

## 阻塞原因（为什么这张表还是空的）

本机 `cline` 不在 PATH（健康面板 `L4-PLUGIN`/`L4-MARKER` 也显示 hook 链路 100 天未跑），取不到权威的 CLI 版本与行为事实。ADR-001 / 002 / 004 / 007 的复查都依赖这类外部事实。

**不做的选项**：用网页搜索现取现改日期。理由是那会把"检索到的一句话"当成"复查通过"，而 §15 要求的是**复查证据**，不是检索动作本身。宁可留 blocked。

**能做的**：ADR-006 是项目原则类，只需自查本仓库决策记录是否出现违反该原则而未登记的情况 —— 这条不依赖外部事实，可以本地完成。

---

## 复查完成后的动作（照 §15 超期处置）

1. 复查通过 → 更新该 ADR 的 `Evidence as of` 与 `Expires if unchanged`，删除本表中的行
2. 复查失败 → 降级为 Hypothesis，登记 Conflict Registry（`docs/evidence-governance.md §19`）
3. 未复查 → 保持 blocked，其结论不得作为新决策论据（`dev-rules.md §1.13`）
