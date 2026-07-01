# cline-plus 深度技术探查 — 执行摘要（GPT 产出整合版）

> **状态**：draft（待项目方评审）
> **日期**：2026-07-01
> **执行方**：GPT（外部模型）
> **整合方**：项目方（TRAE agent）
> **数据来源**：GPT 两份产出（执行摘要.docx + 任务1.docx）+ 项目已有产出交叉校验
> **关联**：[cline-plus-deep-research-brief.md](cline-plus-deep-research-brief.md)（任务书）

---

## 0. 整合说明

### 0.1 GPT 产出的两个问题

1. **执行摘要.docx 偏离任务书**：生成了通用仓库概览（目录结构/安装/安全/同类对比），未执行任务书定义的 5 项补缺任务。该部分内容与项目已有产出（[PROJECT_DEV_OUTLINE.md](../PROJECT_DEV_OUTLINE.md)、[design.md](design.md)）高度重复，本摘要不纳入。
2. **任务1.docx 实际包含全部 5 项任务**（压缩版），但证据质量存在系统性问题（见 §0.2）。

### 0.2 证据质量问题（整合时已处理）

| 问题 | 表现 | 处理方式 |
|------|------|---------|
| 不透明引用 | `【27†L453-L460】` 无法定位到具体文件 | 降级为 Hypothesis，标注"待源码验证" |
| 占位符未填 | `#XX` / `#YY` 未查 mechanism-candidates | 整合时补填实际候选编号 |
| 无 Investigation Note 格式 | 缺 Observation/Evidence/Verified 结构 | 整合时重构为项目模板 |
| 无置信度标签 | 结论未区分 Verified/Likely/Hypothesis | 整合时按证据强度标注 |
| 未读项目文件 | `【0.1 未给链接】` 出现多处 | 整合时补填项目文件路径 |
| 推测当事实 | "Cline 原生支持子代理并行执行"无源码证据 | 降级为 Hypothesis |

### 0.3 本摘要的证据等级约定

- **Verified**：项目已有源码探查或实测确认（引用 investigation-note-*.md）
- **Likely**：GPT 基于官方文档/博客的判断，有间接证据但未源码验证
- **Hypothesis**：GPT 推测，无具体证据来源，待验证

---

## 1. 任务 1：Cline Runtime 未覆盖模块分析

### 1.1 Plan/Act 模式

| 字段 | 内容 | 证据等级 |
|------|------|---------|
| 是什么 | 交互式双模式切换：Plan 模式探查项目制定策略，Act 模式执行计划（每个文件变更/命令执行需用户批准）| **Likely**（GPT 引用官方文档）|
| 在哪个文件 | GPT 称"src/ 目录中查找 planMode 或 acting 相关实现"，**未给出具体文件路径** | **Hypothesis**（待源码验证）|
| 怎么触发 | 用户手动切换模式 | **Likely** |
| plugin 能否介入 | GPT 称"可通过生命周期钩子介入"，但未指明具体 hook 名 | **Hypothesis** |
| Plan 阶段是否生成结构化计划 | GPT 称"可包含结构化任务列表（参见 Focus Chain）" | **Likely**（关联 Focus Chain）|

**整合方注**：项目 [PROJECT_DEV_OUTLINE.md §5](../PROJECT_DEV_OUTLINE.md) 已列出 Plan/Act 为"原生能力"，但同样未做源码验证。GPT 的结论与项目既有认知一致，但**两者都停在文档层，未到源码层**。需按任务书要求读 Cline GitHub `src/core/` 验证。

### 1.2 Subagents 机制

| 字段 | 内容 | 证据等级 |
|------|------|---------|
| 是什么 | CLI 支持生成子代理和多代理团队，并行处理子任务 | **Likely**（GPT 引用 CLI 特性文档）|
| 在哪个文件 | GPT 称"Agent or Team 管理模块"，**未给出具体文件路径** | **Hypothesis** |
| 父代理如何派生子代理 | GPT 称"通过 createAgentTeam 等 SDK 工具"，**未验证** | **Hypothesis** |
| 子代理 context 是否隔离 | GPT 称"由核心运行时保证隔离，可配置共享状态"，**无源码证据** | **Hypothesis** |
| plugin 能否介入 | GPT 称"通过 SDK 提供的多代理工具控制" | **Hypothesis** |

**整合方注**：这是 GPT 产出中证据最薄弱的模块。`createAgentTeam` API 是否存在未验证，需对照 [architecture-atlas.md §4](refs/cline-plugin-architecture-atlas.md) 的 7 个稳定 API 核对——**7 个 API 中没有 `createAgentTeam`**。GPT 可能将 CLI 特性与 Plugin API 混淆。

### 1.3 Deep Planning / Focus Chain

| 字段 | 内容 | 证据等级 |
|------|------|---------|
| 是什么 | 双阶段深度规划工作流：第一阶段生成详细实现计划（编号列表），第二阶段以计划为指导执行 | **Likely**（GPT 引用官方博客）|
| 在哪个文件 | GPT 称"通过调度两轮任务实现"，**未给出源码路径** | **Hypothesis** |
| 怎么触发 | GPT 称"/deep-planning 命令或配置项" | **Likely** |
| 与 Plan/Act 关系 | GPT 称"Focus Chain 是更高级的规划流程，Plan/Act 是交互式切换"，两者互补 | **Likely** |
| plugin 能否介入 | GPT 称"可通过自定义技能定义新工作流指令" | **Hypothesis** |

**整合方注**：Focus Chain 是否真实存在于源码中仍是 Hypothesis。项目 [PROJECT_DEV_OUTLINE.md §5](../PROJECT_DEV_OUTLINE.md) 列出但标注"未验证"。GPT 的博客引用有参考价值，但需源码确认。

### 1.4 Memory Bank

| 字段 | 内容 | 证据等级 |
|------|------|---------|
| 是什么 | 文档化记忆库：将项目关键信息保存在 Markdown 文件（projectbrief.md / activeContext.md 等），新会话读取恢复上下文 | **Likely**（GPT 引用官方文档）|
| 在哪个文件 | GPT 明确称"源码层面并无独立的 Memory Bank 模块"，是"约定文件 + 规则机制" | **Likely**（否定性结论）|
| 检索方式 | 依赖模型读取文件，无检索算法 | **Likely** |
| 与 context snapshot 关系 | GPT 称"Memory Bank 由用户/规则维护，用于跨会话长期记忆"，与 context snapshot（窗口内压缩）不同 | **Likely** |
| plugin 能否介入 | GPT 称"可通过插件在关键操作后自动更新 activeContext.md" | **Hypothesis** |

**整合方注**：这是 GPT 产出中最有价值的结论——**Memory Bank 不是代码模块而是文档约定**。若 Verified，则项目 [mechanism-candidates.md](../mechanism-candidates.md) #6（跨会话记忆注入）的定位需要重新评估：#6 的竞品不是 Cline 原生 Memory Bank（因为原生不存在），而是用户的纯手工维护。

### 1.5 Workflows

| 字段 | 内容 | 证据等级 |
|------|------|---------|
| 是什么 | 用户定义的多阶段自动化任务流程，满足触发条件时自动执行 | **Likely**（GPT 引用调查）|
| 在哪个文件 | GPT 称"通过配置文件支持（~/Documents/Cline/Workflows/ 和 .clinerules/workflows/）" | **Likely** |
| 怎么触发 | 预定义触发条件 | **Likely** |
| 与 Slash Commands 区别 | GPT 称"Slash 命令是即时交互触发，Workflows 是预先定义的自动化流程" | **Likely** |
| plugin 能否介入 | GPT 称"可通过 SDK 工具定义或触发工作流" | **Hypothesis** |

**整合方注**：Workflows 与 Focus Chain（§1.3）有重叠——GPT 称 deep-planning 是 Workflow 的一个示例。需理清两者关系。

### 1.6 任务 1 总结

| 模块 | GPT 结论 | 整合后证据等级 | 与项目已有认知的关系 |
|------|---------|--------------|-------------------|
| Plan/Act | 原生支持，交互式切换 | Likely | 与 PROJECT_DEV_OUTLINE §5 一致，均未源码验证 |
| Subagents | 原生支持，并行执行 | **Hypothesis**（API 名称存疑）| 项目无既有认知，GPT 是首次分析 |
| Focus Chain | 双阶段工作流，真实存在 | Likely | 与 PROJECT_DEV_OUTLINE §5 一致 |
| Memory Bank | **文档约定，非代码模块** | Likely（否定性结论）| **新认知**——影响 #6 定位 |
| Workflows | 配置文件驱动，真实存在 | Likely | 项目无既有认知 |

**未满足任务书退出标准**：任务书要求"每个模块能回答四问——它是什么、在哪个文件、怎么触发、plugin 能否介入"，GPT 对 5 个模块的"在哪个文件"均未给出具体源码路径。**任务 1 需补做源码级验证**。

---

## 2. 任务 2：绕过 codec bug 的验证路径

### 2.1 真实 90K+ token 长对话 compact

| 方案 | GPT 建议 | 整合方评估 |
|------|---------|-----------|
| A. 分片模拟长上下文 | 提前向会话追加大量消息片段，观察是否触发 compact | **不可行**——codec bug 在长消息序列下崩溃，追加消息会触发同样路径 |
| B. 单元测试 compact 逻辑 | 写临时脚本调用核心 compaction 函数白盒测试 | **方向正确但约束不足**——需确认 compact 函数是否可独立调用（[investigation-note-cline-runtime-probe.md](../decisions/investigation-note-cline-runtime-probe.md) Task A 显示 compact 在 `prepareProviderMessagesForApi` 内部，非独立函数）|
| C. 分段对话逐步评估 | 降低规模分段模拟 | **当前 workaround 的延伸**——已验证（降阈值到 1000 tokens）|
| D. SDK 单元测试框架 | 利用 SDK 测试框架白盒测试 | **待评估**——需确认 Cline 是否暴露测试入口 |

**GPT 结论**："目前没有不触发 bug 同时完整测试的方法，只能通过降低规模和分段模拟进行部分验证。"

**整合方评估**：GPT 结论与项目 [handoff.md §4](../handoff.md) 已有认知一致——workaround 路径已验证，真实路径受 §1.15 阻塞。GPT 未提供项目未知的新路径。方案 B 是唯一有潜力的方向，但需先验证 compact 函数的可独立调用性。

### 2.2 Loop Guard 注入层端到端

| 方案 | GPT 建议 | 整合方评估 |
|------|---------|-----------|
| A. 改用 afterModel 钩子 | 不在 beforeModel 修改消息，改在 afterModel 插入逻辑 | **改变语义**——afterModel 在 provider 调用后执行，无法阻止重复调用 |
| B. 辅助工具校验 | 在 act 阶段创建辅助工具由 Loop Guard 校验 | **改变架构**——从"注入层"退化为"检测层"，检测层已 Verified |
| C. 降级策略 | 验证层强制触发失败，注明端到端验证依赖 codec 修复 | **当前状态**——与 handoff.md 已有结论一致 |

**GPT 结论**："如果无法完美模拟，则至少可采用降级策略。"

**整合方评估**：GPT 方案 A/B 均改变验证语义，不等价于真实路径。方案 C 是当前已有状态。**任务 2 未提供可绕过 codec bug 的有效新路径**。

### 2.3 任务 2 总结

GPT 的结论"只能通过降低规模和分段模拟进行部分验证"与项目已有认知一致，**未突破 §1.15 阻塞**。真正有价值的方向（方案 B：compact 函数白盒测试）被提出但未深入。

---

## 3. 任务 3：Cline 原生能力 → Runtime 8 组件映射

> **整合方注**：GPT 的映射表结构正确，但"项目现雏形"字段用了 `#XX`/`#YY` 占位符，整合时已补填实际候选编号。"Cline 原生能力"字段基于任务 1 的结论，证据等级继承 §1 的标注。

| 组件 | Cline 原生能力（证据等级）| 项目雏形（候选#）| Plugin 可扩展性 | 扩展路径建议 | 成熟实践差距 |
|------|------------------------|----------------|----------------|------------|------------|
| **Runtime State** | Plan/Act 双模式切换（Likely）；无公开状态机定义 | 无 | 可通过 hooks 监控状态切换 | 设计状态侦听器插件，记录模式切换 | ReAct/Plan-Execute 已部分实现，缺状态机文档 |
| **Control Flow** | /undo + checkpoint（Verified，[runtime-probe](../decisions/investigation-note-cline-runtime-probe.md) Task B）；最大迭代次数；无自动目标锁 | [#4 Loop Guard](../mechanism-candidates.md)（检测层 Verified）| 可通过 hooks 每轮验证结束条件 | 实现自动目标锁：检测目标完成即终止 | Termination Guard 缺失，仅有迭代上限 |
| **Planner** | 内部规划，无显式多级规划模块（Likely）；Focus Chain 双阶段（Likely）| [#6 记忆注入](../mechanism-candidates.md)（候选）| 可提供规划工具插件 | 集成"目标一致性检查"：Plan 结束前复述目标对比原始请求 | 缺 Objective Drift 检查 |
| **Evaluator** | 用户 + 内置测试判断；无 maker/checker 分离；LLM 自我判断为主 | [#4 Loop Guard](../mechanism-candidates.md)（部分）| 可注册后验验证工具（文件差异断言）| 实现 Maker/Checker 分离：确定性验证器优先 | 确定性验证缺失，依赖 LLM 判断 |
| **Observation** | 事件/日志采集（执行命令/文件变化）；Hooks 可捕获文件信号（Verified，[architecture-atlas §4](refs/cline-plugin-architecture-atlas.md)）| [#1 Terminal Watchdog](../mechanism-candidates.md)（降级）| 可监听 hooks 收集原始输出 | 设计观察优先级策略：结构化事件 > 非结构化日志 | 缺一级证据优先原则 |
| **Memory** | 短期：上下文管理；长期：Memory Bank 文档约定（§1.4，**非代码模块**）| [#5 context snapshot](../mechanism-candidates.md)（实验中）+ [#6 记忆注入](../mechanism-candidates.md)（候选）| 可通过 snapshot API 记录/恢复状态 | 完善 Memory Bank 与运行时接口：关键操作后自动更新 activeContext.md | 缺分层记忆（Working/Short/Long-term）|
| **Tooling** | 内建工具丰富（shell/IDE/搜索）；Plugin 可扩展工具集（Verified，[architecture-atlas §4](refs/cline-plugin-architecture-atlas.md)）| [snapshot-extractor v0.7.0](snapshot-extractor-design.md)（proposed）| 可注册 verify_snapshot() 等专用验证工具 | 开发确定性验证工具（lint/test 集成）| 缺专用验证工具，依赖通用调试 |
| **Architecture** | 分层：Prompt/Skill/Runtime/Tool/Framework；当前以 Runtime 层（CLI/SDK）为主 | 多层涉及（#5 Runtime / #6 Prompt）| Plugin 系统允许 Runtime 层注入行为 | 明确问题归属层次，避免硬编码在 Prompt | 架构清晰，需按需求做层次划分 |

### 3.1 关键发现

1. **Memory 组件的认知修正**：GPT 确认 Memory Bank 是文档约定非代码模块（§1.4）。这意味着 [#6 记忆注入](../mechanism-candidates.md) 的竞品是用户纯手工维护，而非 Cline 原生机制——**#6 的价值更高**。
2. **Control Flow 是最大空白**：Cline 仅有迭代上限和 /undo，无自动目标锁。[#4 Loop Guard](../mechanism-candidates.md) 检测层已 Verified，但注入层受阻——这是 Control Flow 组件可扩展性最高的方向。
3. **Evaluator 缺确定性验证**：Cline 依赖 LLM 自我判断，maker/checker 未分离。Plugin 可注册后验验证工具（文件差异断言），这是 Tooling + Evaluator 的交叉扩展点。

### 3.2 任务 3 未满足项

- "Cline 原生能力"字段基于任务 1 的 Likely/Hypothesis 结论，**未达任务书要求的"基于源码证据"**
- GPT 称可注册 `verify_snapshot()` 工具，但未对照 [architecture-atlas §4](refs/cline-plugin-architecture-atlas.md) 确认 `registerTool` 是否支持此模式

---

## 4. 任务 4：优先级矩阵

> **整合方注**：GPT 矩阵的 4 维度评估方向正确，但 W4/W5 的"阻塞=external"标注不够精确——应为 `codec-bug`。推荐顺序的理由过于简略，整合时补充。

| # | 工作项 | 价值 | 成本 | 阻塞 | 风险 | 推荐顺序 | 理由（整合后补充）|
|---|--------|------|------|------|------|---------|----------------|
| W1 | v0.7.0 提取器实现 | high | medium | none | medium | **1** | 已有 [proposed 设计](snapshot-extractor-design.md)，无外部阻塞，直接提升 snapshot 精度 |
| W3 | 语义对象模型+双投影 | high | high | none | medium | **2** | 跨 agent 基石性最高（[外部评审](external-review-round2-handoff.md)），但依赖 W1 的数据模型 + handoff 正式开发启动 |
| W2 | handoff schema 化（三字段）| medium | medium | none | low | **3** | [外部评审最小一步建议](external-review-handoff-foundation.md)，成本最低但不阻塞 W1/W3 |
| W5 | 真实长对话 compact 验证 | high | high | **codec-bug** | high | **4**（阻塞，解除后优先）| 价值高但受 §1.15 阻塞，[任务 2](#2-任务-2绕过-codec-bug-的验证路径) 未找到有效绕过路径 |
| W4 | Loop Guard 注入层验证 | medium | medium | **codec-bug** | medium | **5**（阻塞）| 检测层已 Verified，注入层受 §1.15 阻塞，任务 2 未找到有效绕过路径 |
| W6 | dual-setup 根因升级到 Verified | low | low | external | low | **6** | [investigation-note-dual-setup.md](../decisions/investigation-note-dual-setup.md) 当前 Likely，需 Cline 官方说明，不阻塞任何工作 |
| W7 | design.md §3.3.2 废弃标注 | — | — | — | — | **completed** | v0.6.x 收尾已完成 |
| W8 | README 术语统一 | — | — | — | — | **completed** | v0.6.x 收尾已完成 |
| W9-W14 | 任务 3 识别的扩展路径 | 见任务 3 | — | — | — | **待评估** | GPT 未对 W9-W14 单独打分 |

### 4.1 与项目已有评估的差异

GPT 排序 W1 > W3 > W2，与项目 [handoff.md](../handoff.md) 的"下次首要动作"（跟进 codec bug issue + #11944）不一致。原因：GPT 未充分考虑 §1.15 阻塞对 W4/W5 的影响——这两个是项目当前最想推进但受阻塞的项。

**整合方建议**：W1-W3 排序合理，但需增加一条：**W0 = 跟进 codec bug issue**（不在 GPT 矩阵中，但是 W4/W5 的前置条件）。

---

## 5. 任务 5：cline-plus 整体技术演进路线图

### 5.1 L1 — Plugin 层（整合已有 + GPT 补充）

| 里程碑 | 状态 | 依赖 | 阻塞 | 退出标准 | 来源 |
|--------|------|------|------|---------|------|
| v0.6.x 收尾 | ✅ 完成 | — | — | 文档与实现一致 + 目录重命名 | [handoff.md](../handoff.md) |
| v0.7.0 提取器 | proposed | 无 | 无 | 四个 Extractor 实现 + 精度 ≥ v0.6.0 | [snapshot-extractor-design.md](snapshot-extractor-design.md) |
| v0.8.0 schema 化 | 待定 | W1 + 任务 4 矩阵 | 无 | handoff.md 三字段（id/confidence/depends_on）落地 | [external-review-handoff-foundation.md](external-review-handoff-foundation.md) |
| v0.9.0 语义对象模型 | 待定 | W3 + v0.8.0 | 无 | 五类对象 + 双投影映射表 + 无损映射测试 | [external-review-round2-handoff.md](external-review-round2-handoff.md) |

### 5.2 L2 — cline-plus 层（GPT 提出，整合方校准）

| 里程碑 | 候选内容 | 依赖 | 阻塞 | 退出标准 | 整合方评估 |
|--------|---------|------|------|---------|-----------|
| L2-1 | 补齐运行时原生能力（目标一致性检查 / 自动终止条件）| 任务 1 源码验证 | **任务 1 未完成** | 插件覆盖核心运行时功能空缺 | **GPT 过于乐观**——任务 1 未达源码级验证，无法直接进入实现 |
| L2-2 | 多代理与子代理支持 | L2-1 | **§1.2 Subagents API 存疑** | 演示并行多代理完成复杂任务 | **证据不足**——createAgentTeam API 未验证，需先确认 7 个稳定 API 是否支持 |
| L2-3 | 记忆与上下文管理加强（Memory Bank + Context Snapshot 联动）| 任务 1 §1.4 + 任务 3 Memory | 无 | 新会话读取并正确利用先前上下文 | **最可落地**——§1.4 确认 Memory Bank 是文档约定，plugin 可补齐运行时接口 |
| L2-4 | 机制候选 #1-#24 推进 | 任务 3 + 任务 4 | 各项不同 | 候选机制实现并集成 | **需逐项评估**，GPT 未给出具体候选优先级 |

### 5.3 阻塞项显式标注

| 阻塞项 | 影响范围 | 当前状态 | 解除条件 |
|--------|---------|---------|---------|
| §1.15 codec bug | W4 / W5 / 真实长对话 compact 验证 | [investigation-note-cli-codec-content-map-bug.md](../decisions/investigation-note-cli-codec-content-map-bug.md) 已定位，等官方修复 | Cline CLI 修复 `n.content.map` 守卫 |
| issue #11944（SDK 迁移）| VS Code 扩展 Plugin 恢复 | 待作者回复 | VS Code 扩展重新合入 SDK 代码基 |
| 任务 1 源码验证缺失 | L2-1 / L2-2 | GPT 未给出源码路径 | 需按任务书要求补做 Cline GitHub 源码探查 |

### 5.4 任务 5 评估

GPT 的两层路线图框架正确，但 L2 里程碑过于乐观——3 个里程碑中 2 个有未完成的前置依赖（任务 1 源码验证、Subagents API 验证）。**L2-3（记忆与上下文管理）是当前最可落地的方向**，因为 §1.4 已确认 Memory Bank 是文档约定而非代码模块，plugin 补齐运行时接口的路径清晰。

---

## 6. 关键发现与后续步骤

### 6.1 GPT 产出的 3 个有价值发现

1. **Memory Bank 是文档约定非代码模块**（§1.4）——若 Verified，修正项目对 #6 竞品关系的认知
2. **Control Flow 是最大扩展空白**（§3）——Cline 仅有迭代上限，Loop Guard 注入层是高价值方向
3. **Evaluator 缺确定性验证**（§3）——maker/checker 未分离，Plugin 可注册后验验证工具

### 6.2 GPT 产出的 3 个系统性问题

1. **证据质量不达标**——5 个模块均未给出 Cline 源码文件路径，不符合任务书"必须引用具体文件路径 + 行号"要求
2. **API 名称存疑**——`createAgentTeam` 不在 [architecture-atlas §4](refs/cline-plugin-architecture-atlas.md) 的 7 个稳定 API 中
3. **任务 2 未突破阻塞**——未提供项目未知的有效绕过路径，结论与已有认知一致

### 6.3 建议后续步骤

| 优先级 | 步骤 | 理由 |
|--------|------|------|
| **P0** | 补做任务 1 源码级验证 | GPT 的 5 个模块结论均停在 Likely/Hypothesis，L2 路线图依赖这些结论 |
| **P1** | 验证 `createAgentTeam` API 是否存在 | 影响 L2-2 可行性 |
| **P2** | 验证 Memory Bank "文档约定非代码模块"结论 | 影响 #6 定位，若 Verified 则调整 mechanism-candidates |
| **P3** | 推进 W1（v0.7.0 提取器）| 无阻塞，已有 proposed 设计 |
| **P4** | 跟进 codec bug issue | W4/W5 的前置条件 |

---

## 7. 参考资料

### 7.1 GPT 引用的外部资料

- Cline 官方博客和文档（Plan/Act、Subagents、Focus Chain、Memory Bank、Workflows）
- Cline CLI 特性文档
- Agent Safehouse 调查（Workflows 配置路径）
- 开源调查报告（成熟实践映射）

> **注**：GPT 的引用标注（如 `【27†L453-L460】`）无法定位到具体文件，本摘要已将相关结论降级为 Likely/Hypothesis。

### 7.2 整合方引用的项目文件

- [PROJECT_DEV_OUTLINE.md](../PROJECT_DEV_OUTLINE.md) §5 — 能力验证清单
- [investigation-note-cline-runtime-probe.md](../decisions/investigation-note-cline-runtime-probe.md) — Cline Runtime 源码探查
- [architecture-atlas.md](refs/cline-plugin-architecture-atlas.md) §4 — 7 个稳定 API
- [mechanism-candidates.md](../mechanism-candidates.md) — 24 条候选
- [handoff.md](../handoff.md) — 当前状态快照
- [external-review-*.md](external-review-handoff-foundation.md) — 外部评审材料（3 份）
- [snapshot-extractor-design.md](snapshot-extractor-design.md) — v0.7.0 设计
- [investigation-note-dual-setup.md](../decisions/investigation-note-dual-setup.md) — 双重 setup 调查
- [investigation-note-cli-codec-content-map-bug.md](../decisions/investigation-note-cli-codec-content-map-bug.md) — codec bug 定位
