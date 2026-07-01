# cline-plus 深度技术探查任务书（GPT 执行版）

> **状态**：exploration brief
> **生命周期**：任务绑定——深度研究评审闭环后归档。
> **日期**：2026-07-01
> **执行方**：GPT（外部模型）
> **目标**：基于项目已有产出，补齐 cline-plus 技术认知缺口，输出整合视图与演进路线图
> **预计产出**：1 份综合分析报告 + 1 份路线图建议

---

## 0. 背景与前提

### 0.1 项目已有产出（避免重复工作）

本项目已对 Cline 源码做了系统性分析，以下文件是**已完成的调查产出**，执行方**不需要重新探查**这些内容，只需整合：

| 已有产出 | 覆盖内容 | 文件路径 |
|---------|---------|---------|
| Cline Runtime 源码探查 | compact 执行链 / checkpoint / messageBuilder 时机 / rules 注入 | `docs/decisions/investigation-note-cline-runtime-probe.md` |
| Plugin 架构 Atlas | 7 层生命周期 / 7 个稳定 API / 诊断流程图 / 超时策略 | `docs/plugin/refs/cline-plugin-architecture-atlas.md` |
| Plugin 开发指南 | Sandbox 架构 / VS Code workaround / 调试技巧 / 已知坑 | `docs/plugin/refs/cline-plugin-dev-guide.md` |
| CLI Plugin 全链路验证 | setup/build/rules/hooks 实测 + 2 个 bug 发现 | `docs/decisions/investigation-note-cli-plugin-verification.md` |
| 双重 setup 调查 | setup() 双调用现象 + hub 模式根因假设 | `docs/decisions/investigation-note-dual-setup.md` |
| Codec bug 定位 | `n.content.map is not a function` 崩溃链路 | `docs/decisions/investigation-note-cli-codec-content-map-bug.md` |
| VS Code Plugin 不可用根因 | bootstrap.js 打包遗漏 + workaround | `docs/decisions/investigation-note-vscode-bootstrap-missing.md` |
| Marketplace 机制 | 上架流程 / catalog.json / 社区活跃度数据 | `docs/decisions/investigation-note-marketplace-dev-mechanism.md` |
| Plugin 设计文档 | context-snapshot plugin 完整架构 + Phase 1-4 | `docs/plugin/design.md` |
| 机制落地评估 | #1-#7 落地可行性 + Cline API 能力表 | `docs/plugin/mechanism-landing-assessment.md` |
| 机制候选清单 | 24 条经验机制化候选 + 状态机 | `docs/mechanism-candidates.md` |
| Runtime 评审框架 | 8 维度（State/Control Flow/Planner/Evaluator/Observation/Memory/Tooling/Architecture）| `docs/reviewer-personas.md` §2.6 |
| 项目开发提纲 | A/B/C 分类 / 五问法 / 能力验证清单 | `docs/PROJECT_DEV_OUTLINE.md` |
| 当前状态快照 | v0.6.0 实测结果 + 未完成项 | `docs/handoff.md` |
| 提取器设计 | v0.7.0 SnapshotData 模型 + 4 个 Extractor | `docs/plugin/snapshot-extractor-design.md` |
| 外部评审材料 | handoff 机制化方向 + 双投影模型 | `docs/plugin/external-review-*.md`（3 份）|

### 0.2 已确认的不可抗力（执行方需纳入约束）

| 不可抗力 | 影响 | 详见 |
|---------|------|------|
| VS Code 扩展 4.0.x 不支持 Plugin | CLI 3.0.30+ 是唯一运行环境 | `docs/dev-rules.md` §1.15 |
| CLI codec bug（`n.content.map`）| 阻塞真实 90K+ token 长对话路径 | `investigation-note-cli-codec-content-map-bug.md` |
| issue #11944（SDK 迁移时间线）| VS Code Plugin 恢复无 ETA | `docs/handoff.md` |

---

## 1. 探索目标

基于 0.1 的已有产出，执行方需完成**五项补缺整合任务**，每项有明确退出标准。**禁止重复 0.1 已覆盖的内容**——若发现某项任务的信息已在已有产出中，直接引用并标注"已有覆盖"。

---

## 2. 任务清单

### 任务 1：补齐 Cline Runtime 未覆盖模块的源码分析

**背景**：0.1 已覆盖 compact / checkpoint / messageBuilder / rules / Plugin 7 层，但 [PROJECT_DEV_OUTLINE.md §5](file:///e:/cline++/docs/PROJECT_DEV_OUTLINE.md) 列出的以下原生能力**未做源码级验证**。

**需补齐的 5 个模块**：

| 模块 | 待回答问题 | 数据源建议 |
|------|-----------|-----------|
| **Plan/Act 模式** | 实现在哪个文件？两种模式如何切换？Plan 阶段是否生成结构化计划？plugin 能否介入？ | Cline GitHub 源码 `src/core/` 目录 |
| **Subagents 机制** | 调度模型是什么？父 agent 如何派生子 agent？子 agent 的 context 是否隔离？ | Cline GitHub 源码 `src/` 搜索 subagent/agent-teams |
| **Deep Planning / Focus Chain** | 是否真实存在？若存在，触发条件是什么？与 Plan/Act 模式关系？ | Cline GitHub 源码 + release notes |
| **Memory Bank** | 存储模型是什么？检索方式？与 context snapshot 是什么关系？ | Cline GitHub 源码 + 文档 |
| **Workflows** | 执行模型是什么？与 Slash Commands 区别？plugin 能否定义 workflow？ | Cline GitHub 源码 + 文档 |

**产出**：一份调查笔记，遵循项目 Investigation Note 模板（Observation / Evidence / Hypothesis / Verified / Remaining Unknown）。

**退出标准**：每个模块能回答四问——"它是什么、在哪个文件、怎么触发、plugin 能否介入"。若模块不存在于源码中，明确标注"未找到实现"并列出搜索过的路径。

**约束**：
- 优先读 unminified `.ts` 源码，minified 代码仅用于定位
- 每个结论标注证据类型（源码 / 文档 / 实测）
- 若与 0.1 已有产出冲突，记录冲突而非覆盖

---

### 任务 2：设计绕过 codec bug 的验证路径

**背景**：[handoff.md §4](file:///e:/cline++/docs/handoff.md) 已实测 6 项核心功能，但两项关键验证受 §1.15 codec bug 阻塞。

**受阻塞的验证项**：

| 验证项 | 阻塞原因 | 当前状态 |
|--------|---------|---------|
| 真实 90K+ token 长对话触发 compact | codec bug 在长消息序列下崩溃 | workaround 路径已验证（降阈值到 1000 tokens）|
| Loop Guard 注入层端到端 | beforeModel 返回 messages 修改触发 codec 路径 | 检测层已 Verified，注入层阻塞 |

**任务**：为上述两项设计**不触发 codec bug 的替代验证路径**，或论证为何无法绕过。

**产出**：一份验证方案文档，包含：
- 每项的替代路径设计（若有）
- 替代路径的局限性声明（与真实路径的差异）
- 无法绕过时的降级验证策略

**退出标准**：每项验证有明确的"可执行步骤"或"无法绕过的技术论证"。

**约束**：
- 不修改 Cline 源码
- 替代路径需说明与真实路径的差异，避免过度乐观结论

---

### 任务 3：Cline 原生能力 → Agent Runtime 8 组件映射

**背景**：[reviewer-personas.md §2.6](file:///e:/cline++/docs/reviewer-personas.md) 定义了 8 维度 Runtime 架构，但项目**没有把 Cline 原生能力映射到这些组件**。这是本任务书的核心价值。

**8 个 Runtime 组件**（来自 reviewer-personas.md §2.6）：

| 组件 | 定义问题 | 成熟实践映射 |
|------|---------|------------|
| **Runtime State** | Agent 当前状态？非法状态转换？有状态机定义？ | ReAct 循环状态 / Plan-Execute 两阶段 |
| **Control Flow** | 缺少停止/回退条件？目标锁？ | Termination Guard |
| **Planner** | 目标漂移？Objective Consistency Check？ | Plan-and-Execute 分离 |
| **Evaluator** | 成功标准谁定义？maker/checker 分离？ | 确定性验证器优先 |
| **Observation** | 信号优先级？一级证据 vs 二级信号？ | Structured Events / Hooks vs Observers |
| **Memory** | Working/Short-term/Long-term 分层？已验证事实是否进入决策？ | State Primitives / "agent forgets, repo doesn't" |
| **Tooling** | 缺少专用验证工具？工具设计是否迫使低效路径？ | Tool Selection as Harness 职责 |
| **Architecture** | 问题应在哪一层解决？Prompt/Skill/Runtime/Tool/Framework？ | 修复可扩展性 |

**任务**：对每个组件，填写以下映射表：

| 字段 | 说明 |
|------|------|
| **Cline 原生能力** | Cline 源码中是否存在对应实现？（引用任务 1 的结论）|
| **项目当前雏形** | cline-plus 项目中是否有相关候选或实现？（引用 mechanism-candidates.md）|
| **Plugin 可扩展性** | 能否通过 7 个稳定 API 介入？（引用 architecture-atlas §4）|
| **扩展路径建议** | 若可扩展，建议的实现方向；若不可，说明原因 |
| **成熟实践对照** | 与 reviewer-personas.md 列出的成熟实践对比，差距在哪 |

**产出**：一份 8 行的映射表 + 每行的简要分析。

**退出标准**：每个组件的 5 个字段全部填写，且"Cline 原生能力"字段基于任务 1 的源码结论（非推测）。

**约束**：
- "Cline 原生能力"字段必须基于源码证据，不能是文档推测
- "项目当前雏形"字段必须引用具体候选编号（mechanism-candidates #N）
- 若某组件 Cline 既无原生支持、项目也无雏形、plugin 也不可扩展，明确标注"空白"

---

### 任务 4：扩展点与重构难点统一优先级矩阵

**背景**：项目已有分散的难点评估，但未整合为统一优先级。

**已有分散信息**：

| 来源 | 覆盖内容 |
|------|---------|
| `mechanism-landing-assessment.md §3` | #1-#7 落地可行性 |
| `plugin-dev-sop.md` | 4 处契约违反难点 |
| `ADR-005` | handoff-plugin 重构影响 |
| `external-review-round2-handoff.md` | schema 化路径分析 |
| `snapshot-extractor-design.md §7` | v0.7.0 风险表 |

**任务**：整合上述信息 + 任务 3 的映射结论，输出**统一的优先级矩阵**。

**矩阵维度**：

| 维度 | 取值 | 说明 |
|------|------|------|
| **价值** | high / medium / low | 对跨 agent 基石性的贡献 |
| **成本** | high / medium / low | 工程量 + 认知负担 |
| **阻塞** | none / external / codec-bug | 依赖外部条件 |
| **风险** | high / medium / low | 契约违反、精度不足等 |

**矩阵行**（候选工作项）：

| # | 工作项 | 来源 |
|---|--------|------|
| W1 | v0.7.0 提取器实现 | snapshot-extractor-design.md |
| W2 | handoff.md schema 化（三字段）| external-review-handoff-foundation.md |
| W3 | 语义对象模型 + 双投影 | external-review-round2-handoff.md |
| W4 | Loop Guard 注入层验证 | handoff.md 未完成项 |
| W5 | 真实长对话 compact 验证 | handoff.md 未完成项 |
| W6 | dual-setup 根因升级到 Verified | investigation-note-dual-setup.md |
| W7 | design.md §3.3.2 废弃标注 | 已完成（v0.6.x 收尾）|
| W8 | README 术语统一 | 已完成（v0.6.x 收尾）|
| W9-W14 | 任务 3 识别的扩展路径 | 任务 3 产出 |

**产出**：一份矩阵表 + 推荐执行顺序。

**退出标准**：每个工作项的 4 个维度全部填写，推荐顺序有明确理由（不只是"按优先级"）。

**约束**：
- 已完成项（W7/W8）标注 completed，不参与排序
- 受 codec bug 阻塞项需标注，但不自动降级——评估其解除阻塞后的价值

---

### 任务 5：cline-plus 整体技术演进路线图

**背景**：现有路线图是 plugin 专属（design.md Phase 1-4），缺少 cline-plus 整体技术演进视角。

**已有路线图**：

| 来源 | 覆盖范围 | 状态 |
|------|---------|------|
| `design.md §5` | Plugin Phase 1-4 | Phase 1-2 完成，Phase 3 取消，Phase 4 受阻 |
| `PROJECT_DEV_OUTLINE.md §5` | 能力验证清单 | 未转化为路线图 |
| `snapshot-extractor-design.md §6` | v0.7.0 实施计划 | proposed |
| `mechanism-candidates.md` | 24 条候选状态 | 状态机跟踪 |

**任务**：输出**两层路线图**：

**L1 — Plugin 层**（已有，整合即可）：

| 里程碑 | 状态 | 依赖 |
|--------|------|------|
| v0.6.x 收尾 | ✅ 完成 | — |
| v0.7.0 提取器 | proposed | 无 |
| v0.8.0 schema 化 | 待定 | 任务 4 优先级矩阵 |
| v0.9.0 语义对象模型 | 待定 | v0.8.0 + 外部评审结论 |

**L2 — cline-plus 层**（需基于任务 3 映射 + 任务 4 矩阵生成）：

| 里程碑 | 候选内容 | 依赖 |
|--------|---------|------|
| ? | 基于任务 3 识别的可扩展 Runtime 组件 | 任务 3 + 任务 4 |
| ? | 基于任务 1 识别的 Cline 原生能力补齐 | 任务 1 |
| ? | 基于机制候选 #1-#24 的推进 | mechanism-candidates.md |

**产出**：一份两层路线图，每个里程碑标注：
- 目标
- 依赖（前置里程碑 / 外部条件）
- 阻塞（codec bug / 官方回复等）
- 退出标准
- 风险

**退出标准**：
- L1 路线图与已有产出一致，无矛盾
- L2 路线图基于任务 3/4 结论，每个里程碑可追溯到具体证据
- 两个阻塞项（codec bug / issue #11944）在路线图中显式标注，不隐藏

**约束**：
- 不给出时间估计（项目规则：避免时间预测）
- 路线图是建议，不是决策——最终决策需走 ADR 流程

---

## 3. 执行约束

### 3.1 证据要求

- **源码结论**：必须引用具体文件路径 + 行号（或函数名），minified 代码仅用于定位
- **能力声明**：必须区分"源码验证"vs"文档声明"vs"推测"
- **冲突处理**：若发现与 0.1 已有产出冲突，记录冲突并标注，不覆盖

### 3.2 避免重复

- 任务 1：0.1 已覆盖的 compact/checkpoint/messageBuilder/rules/Plugin 7 层**不重新探查**
- 任务 2：0.1 已验证的 6 项核心功能**不重新验证**
- 任务 3：0.1 已有的 mechanism-candidates 24 条**不重新评估**
- 任务 4：0.1 已有的分散评估**整合而非重做**
- 任务 5：0.1 已有的 plugin 路线图**整合而非重做**

### 3.3 输出格式

- 每个任务一份独立文档，命名 `deep-research-task-N-{topic}.md`
- 放在 `docs/plugin/` 目录下
- 遵循项目 Investigation Note 模板（Observation / Evidence / Hypothesis / Verified / Remaining Unknown）
- 关键结论标注置信度（Verified / Likely / Hypothesis）

### 3.4 项目规则约束

- 不给时间估计
- 不创建 ADR（路线图是建议，不是决策）
- 不修改已有文档（只新增分析文档）
- 外部生态结论标注 evidence_as_of 日期

---

## 4. 交付清单

执行方需交付以下文件：

| # | 文件 | 对应任务 | 格式 |
|---|------|---------|------|
| 1 | `docs/plugin/deep-research-task-1-runtime-modules.md` | 任务 1 | Investigation Note |
| 2 | `docs/plugin/deep-research-task-2-verification-paths.md` | 任务 2 | 验证方案 |
| 3 | `docs/plugin/deep-research-task-3-runtime-mapping.md` | 任务 3 | 映射表 + 分析 |
| 4 | `docs/plugin/deep-research-task-4-priority-matrix.md` | 任务 4 | 矩阵表 + 排序 |
| 5 | `docs/plugin/deep-research-task-5-roadmap.md` | 任务 5 | 两层路线图 |
| 6 | `docs/plugin/deep-research-summary.md` | 综合 | 执行摘要 + 关键发现 |

---

## 5. 优先级建议

若执行方资源有限，按以下优先级处理：

| 优先级 | 任务 | 理由 |
|--------|------|------|
| **P0** | 任务 3（Runtime 映射）| 核心价值，项目最缺的视角 |
| **P1** | 任务 1（补齐模块）| 任务 3 的数据依赖 |
| **P2** | 任务 4（优先级矩阵）| 整合产出，决策输入 |
| **P3** | 任务 5（路线图）| 依赖任务 3/4 |
| **P4** | 任务 2（验证路径）| 工程性任务，不阻塞认知建设 |

建议执行顺序：任务 1 → 任务 3 → 任务 4 → 任务 5 → 任务 2（任务 2 可并行）。

---

## 6. 参考文件快速索引

执行方应先读以下文件再开始：

**必读**（理解项目状态）：
1. `docs/handoff.md` — 当前状态快照
2. `docs/PROJECT_DEV_OUTLINE.md` — 项目定位与方法论
3. `docs/plugin/design.md` — Plugin 设计文档
4. `docs/mechanism-candidates.md` — 机制候选清单
5. `docs/reviewer-personas.md` §2.6 — Runtime 8 维度框架

**按需读**（任务 1 数据源）：
6. `docs/decisions/investigation-note-cline-runtime-probe.md` — 已有源码探查
7. `docs/plugin/refs/cline-plugin-architecture-atlas.md` — Plugin 架构 Atlas

**按需读**（任务 4 数据源）：
8. `docs/plugin/mechanism-landing-assessment.md` — 落地评估
9. `docs/plugin/plugin-dev-sop.md` — 开发 SOP
10. `docs/decisions/ADR-005-split-compact-from-handoff.md` — 拆分决策

**按需读**（任务 5 数据源）：
11. `docs/plugin/snapshot-extractor-design.md` — v0.7.0 设计
12. `docs/plugin/external-review-round2-handoff.md` — 语义对象模型方向
