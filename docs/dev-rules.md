# Dev Rules — 跨功能通用防漂移规则

> **范围**：与具体功能无关的**永久**治理规则。不随某一功能开发期结束而删除。
>
> **与功能专属 `project-rules-<功能>.md` 的区别**：功能专属规则（如 `search/project-rules.md`）只在该功能开发期生效，绑定其 `survey.md §9` 的决策/实验/路线表，功能冻结后整体删除；本文件承载**跨功能复用**的执行边界、验证方法论与状态值约定，长期保留。
>
> **加载方式**：本文件**不**通过 `.trae/rules/` 自动注入到系统提示词。新会话开始时由用户在第一句话提醒模型阅读。
>
> **与 `.clinerules` 的关系**：`.clinerules` 约束模型**执行行为**（遇不明确条件即停止询问）；本文件约束**执行主体边界与方法论**。两者互补，不重叠。

---

## 1. 执行主体边界（TRAE agent vs Cline SKILL）

当某步骤的 designated executor 是 Cline + SKILL 时（即需要 Goggle 过滤 / P3 三元组抽取 / 三档模式 / 同源去重等 SKILL 层机制），TRAE agent 不得直接用 WebSearch / WebFetch 等通用工具替代执行。

**判定规则**：若实验框架（run-N-*.md）的执行提示词是"复制到 Cline 执行"，则该步骤的执行主体是 Cline，不是 TRAE agent。TRAE agent 的 WebSearch / WebFetch 等价于"裸 search"层，缺少 SKILL 层的全部机制处理。

**违反时**：回滚 TRAE agent 产出的证据，交付提示词给用户在 Cline 中执行。

### 1.1 子条款：执行产出归档路径

Cline 执行提示词必须在开头声明输出文件的建议存放位置，格式为 `docs/<功能>/experiments/run-N-phase*-*.md`。若提示词未声明位置，Cline 执行模型会自主选择位置（如 `research/`），导致产出文件脱离实验目录治理。此子条款将 `ab-test-template.md:140` 的提示性语句提升为硬规则。

### 1.2 子条款：cline 交互式会话需真实终端（TTY）

凡需实际发起 cline 会话的命令（`cline -i` / `cline -v "..."` / 任何进入 agent loop 的调用），必须交由用户在真实终端执行，TRAE agent 不得在非交互终端代跑——否则报 `EBADF: bad file descriptor, write` 并挂起。TRAE agent 只负责非交互命令（install / config / 目录与文件检查）与结果判读。源由：P5 Spike 实跑（2026-06-26，`experiments/p5-spike/run-p5-capability-spike.md §7 教训 2`）。

### 1.3 子条款：阴性结论须先排除验证方法错误

以"失败/不存在/不可用"为依据下退出或否决类结论前，必须先用一个已知应成功的对照确认验证方法本身有效；共享同一前提的多条证据不算独立交叉验证。源由：P5 Spike No-Go 误判（2026-06-26，`run-p5-capability-spike.md §7 教训 1`——`config plugins` 的 `-c` 参数语义误解导致假阴性，连带"官方样例也失败"的伪交叉验证）。

> *设计意图*：与"不在 SKILL 层做基础设施层的事"（handoff.md）、"绝不用规则解决运行时问题"（README.md）构成同构治理原则——不在错误的层做错误的事，不在错误的执行环境做错误的事。

### 1.4 子条款：Windows 文件核查必须用 PowerShell `Get-ChildItem -Recurse`

在 Windows 环境下做文件/目录存在性核查时，**禁止**依赖 Glob / LS 工具，**必须**用 PowerShell `Get-ChildItem -Recurse` 或 `Test-Path`。源由：ADR-002 Update 2 核查事故（2026-06-27）——Glob `saoudrizwan.claude-dev-*\package.json` 零命中，LS `.vscode\extensions` 因 40000 字符截断只显示部分目录，`extensions.json` 注册表未同步，三个工具同时失效导致假阴性结论"VS Code 扩展未安装"，实际已安装 3.89.2 + 4.0.0 两个版本。

**对照成功证据**：同一查询用 `Get-ChildItem -Path C:\,D:\,E:\ -Filter "*saoudrizwan*" -Recurse -Directory -Depth 6` 立刻命中两个扩展目录。

**适用范围**：所有 Windows 文件存在性/目录列举核查，特别是 `.vscode/extensions/`、用户 home 目录下的配置目录（`.cline/`、`.claude/` 等）。对于已知精确路径的单文件读取，Read 工具仍可用。

### 1.5 子条款：权威源与独立证据

依据 [evidence-governance.md §3](evidence-governance.md) 证据职责分工，不同证据类型回答不同问题，**不可混用**：

| 证据类型 | 回答的问题 |
|---------|----------|
| 官方文档 | 设计意图 / 是否官方支持 / 推荐用法 |
| 源码（unminified 优先）| 实际行为 / API 是否存在 |
| SDK Example | 推荐用法 / 设计意图佐证 |
| Issue / Discussion | 已知限制 |
| CHANGELOG | 何时引入 |
| 实测 | 真实运行行为 |

**冲突时记录**（[evidence-governance.md §6](evidence-governance.md) Conflict Registry），**不裁决**——官方文档和源码是独立证据源，文档可能落后，代码可能有 bug，冲突本身就是知识。

源由：ADR-002 Update 1 用 CHANGELOG 回答"是否支持"（错误——CHANGELOG 回答"何时引入"）；Update 4 用官方文档直接裁决源码冲突（碰巧正确，但下次官方文档错误时会再颠覆）。

### 1.6 子条款：关键结论双来源验证

关键结论（路径 / 格式 / API 签名 / 能力可用性）必须至少 **2 个独立证据类型**一致，才可进入 Verified 状态。

- **独立证据类型**：官方文档 + 源码 / 源码 + Example / 官方 + Issue 等
- **非独立**：官方博客 + 官方文档（同一来源）；同一 minified 文件的不同行 Grep（同一来源）

依据 [evidence-governance.md §4](evidence-governance.md) Confidence 模型——单源只能到 Hypothesis，不可到 Verified。

源由：ADR-002 Update 1/2/3 都基于单一来源下结论（CHANGELOG / minified 代码 Grep），导致连续颠覆。

### 1.7 子条款：Minified Code 使用边界

minified 代码**可用于定位**（入口 / 调用链 / 字符串 / API / hook），**不可单独用于语义结论**（设计意图 / 目录结构 / 协议）。

依据 [evidence-governance.md §3](evidence-governance.md) 证据职责分工——minified 是源码证据的子集，回答"实际行为"，不回答"设计意图"。需要语义结论时，必须升级到 unminified 源码或官方文档对照。

**允许**：`Grep minified 确认字符串存在` → `对照官方文档确认语义`
**禁止**：`Grep minified` → `推断设计意图` → `写入 ADR`

源由：ADR-002 Update 2 把 minified 第 543 行 `registerMessageBuilder` 误判为 zod schema 解析（实际是真实实现）；Update 3 把 DGu 函数的 `pluginName` 误判为安装路径（实际是运行时路径解析）。

### 1.8 子条款：Evidence Collapse 门控（证据冲突停机）

证据冲突时**必须停止**继续在同一证据类型里打转，按 [evidence-governance.md §8](evidence-governance.md) Evidence Escalation 升级到下一证据类型。

**禁止模式**：`grep → grep → grep → grep`（同一证据类型连续使用 ≥2 次未解决冲突）。
**允许模式**：`官方 → Example → 源码 → 实测`（跨证据类型升级，即使连续 4 次修正也说明调查越来越深入）。

**触发后动作**：
1. 停止当前调研
2. 登记 Conflict Registry（[evidence-governance.md §6](evidence-governance.md)）
3. 升级到下一证据类型（官方 → Example → 源码 → 实测）

源由：ADR-002 Update 2/3 都在 minified 代码 Grep 里打转，未升级到官方文档或实测，导致连续颠覆。

### 1.9 子条款：Direction Drift 门控（方向偏离运行时检测）

§4 方向启动门控的**运行时补充**。调研过程中若用户**重新限定研究对象**（非质疑语气），必须立即：

1. 停止当前调研
2. 更新研究对象（记录到当前 Investigation Note）
3. 废弃基于旧对象的推论，或降为 Hypothesis 并标注"基于旧对象"

**检测信号**：用户重新定义问题（如"我讨论的是 VSCode" / "不是 CLI" / "还是 VSCode"），**而非**用户语气（如"我一直在质疑"）。关注的是问题定义是否发生变化，不是用户情绪。

源由：ADR-002 Update 1/2 期间用户察觉方向偏离但未能掰回——用户在质疑能否复用到插件，调研却持续在 CLI 载体上推进。

### 1.10 子条款：Core Proposition Flip 门控（核心命题翻转停机）

**核心命题**翻转 ≥2 次（如 支持→不支持→支持→不支持）触发工作流审查：停止修正，回到 [evidence-governance.md](evidence-governance.md) 证据治理层面找根因。

**不是 Update 次数**——连续修正可能是深入调查（如 `官方 → Example → 源码 → 实测`）；**核心命题翻转**才是推理系统失控的信号。

**触发后动作**：
1. 停止当前 Update
2. 列出核心命题的翻转历史
3. 检查是否在同一个证据类型里打转（违反 §1.8 Evidence Collapse）
4. 检查是否跳级（违反 [evidence-governance.md §2.3](evidence-governance.md) 禁止跳级）
5. 必要时冻结当前 ADR（标 [evidence-governance.md §5](evidence-governance.md) Unknown 状态），重新调查后写新 Update，而非连续覆盖

源由：ADR-002 Update 1→2→3→4 连续 4 次颠覆，核心命题"VS Code 扩展是否支持 plugin"翻转 3 次（不支持→支持→不支持→支持），未触发工作流审查。

### 1.11 子条款：评审角色调用门控

依据 [reviewer-personas.md](reviewer-personas.md)，下列场景**必须**注入对应评审角色提示词后再产出评审：

| 触发条件 | 调用角色 |
|---------|---------|
| 写入 ADR 前 | Software Engineering Reviewer |
| 工作流事故复盘 | Process Reviewer |
| 连续错误模式分析 | Process Reviewer + Software Engineering Reviewer |
| 故障复盘 | Reliability Reviewer |
| 安全设计 | Security Reviewer |
| API 设计 | API Reviewer |
| 跨领域复杂评审 | 同时调用多个角色（分别输出）|

**核心约束**（所有角色共享，源自 [reviewer-personas.md §1](reviewer-personas.md)）：

> 如果存在成熟实践，请优先说明其名称、核心思想以及为什么适用；只有当现有实践不足时，才建议新增本地规则。

输出必须区分三类：
1. **成熟实践**——直接引用名称 + 核心思想 + 适用理由
2. **本地扩展**——成熟实践在本项目/AI 工作流场景下的适配
3. **创新**——成熟实践无法覆盖的部分，必须说明必要性 + 风险

**禁止**：把成熟实践包装成本地创新（如把 EBSE 包装成"证据治理"）。

源由：2026-06-27 外部评审反馈——AI agent 设计工作流时容易"重新发明轮子"。本次自创"证据治理"概念，实际 EBSE（Evidence-Based Software Engineering）、RCA、ADR 等已有成熟方法可直接借鉴。

### 1.12 子条款：子代理调用必须注入评审角色提示词

执行 loop / 串行任务 / 调用 Task subagent 时，TRAE agent **必须自行**把对应评审角色提示词注入子代理的 query 参数，**不依赖**用户在对话层提醒。

**注入规则**：

1. **识别评审类型**：根据子代理任务性质，对照 §1.11 触发条件表选择角色
   - 调研类任务 → Software Engineering Reviewer
   - 工作流事故分析 → Process Reviewer
   - 故障/稳定性 → Reliability Reviewer
   - 安全相关 → Security Reviewer
   - API/接口设计 → API Reviewer
   - 跨领域 → 多角色分别注入（每个角色一个 subagent 调用）

2. **注入方式**：在 Task 工具的 query 参数开头插入对应角色的提示词引用块（来自 [reviewer-personas.md §3](reviewer-personas.md)），格式：

   ```
   <角色提示词引用块>

   ---

   ## 任务
   <实际任务描述>

   ## 输出要求
   按 reviewer-personas.md §1 区分：成熟实践 / 本地扩展 / 创新
   ```

3. **多角色并行**：跨领域复杂评审时，同一任务调用多个 subagent，每个注入不同角色提示词，分别输出（不混合）。

4. **冲突处理**：若多角色意见冲突，按 [evidence-governance.md §6](evidence-governance.md) Conflict Registry 登记冲突，不裁决。

**禁止**：
- 调用子代理做评审类任务时不注入角色提示词
- 依赖用户在对话层提醒"记得注入角色"
- 把多角色意见混合在一个 subagent 输出中

源由：用户 2026-06-27 指示"用户要求 loop 时把自行把提示词注入给子代理"——避免每次都要用户提醒，TRAE agent 应自动按 §1.11 触发条件识别角色并注入。

### 1.13 子条款：结论时效性门控

依据 [evidence-governance.md §15](evidence-governance.md) 结论时效性模型，引用 ADR 结论作为新决策论据前，**必须**检查该 ADR 的 `evidence_as_of` 与 `expires_if_unchanged` 字段：

1. **未超期**（`expires_if_unchanged` 在未来）：可直接引用
2. **已超期**（`expires_if_unchanged` 在过去）：
   - 停止引用该结论作为决策依据
   - 降级为 Hypothesis（待复查）
   - 触发复查（重新核查证据来源是否仍成立）
3. **缺字段**（存量 ADR 未填）：在下次 Update 时补齐；引用前需人工判断时效

**禁止**：直接引用超期结论作为新决策的论据而不复查。

**适用范围**：所有涉及外部生态（社区活跃度 / 包下载量 / 上架数 / GitHub 活动 / 官方文档版本）的 ADR 结论。

**成熟实践映射**：
- 结论时效性门控 ↔ **Refresh Token 验证**（使用前必须检查是否过期）+ **SLR 检索时间范围限定**（系统综述要求声明检索时间窗）

源由：2026-06-27 [ADR-002-p5-experiment-exit-review §2.4](archive/decisions/ADR-002-p5-experiment-exit-review.md) 引用"社区无 Plugin 实战沉淀"（2026-06-23 形成于 ADR-002 Context §5）作为舍弃 P5 论据，未复查——4 天后该结论已被 5 类反证证伪。

### 1.14 子条款："无 X"类结论门控

下"无 X"类结论（无开发记录 / 无社区沉淀 / 无可用工具 / 无文档 / 无示例）前，**必须**：

1. 经 search-orchestrator SKILL 反证查询（如适用，按 [search/project-rules.md](search/project-rules.md)）
2. 至少 **3 类独立证据类型**一致（如 npm + GitHub + 官方文档 + Marketplace + 搜索引擎）
3. 在 Investigation Note（[evidence-governance.md §10](evidence-governance.md)）中记录反证搜索过程，含 query 列表（[evidence-governance.md §17](evidence-governance.md)）

**禁止**：
- 基于单一证据类型下"无 X"结论
- 仅自述"搜过 X"而不记录 query 列表（违反 §17 调研可复现性）

**违反时**：回滚结论，降级为 Hypothesis，登记 Conflict Registry。

**成熟实践映射**：
- "无 X"结论门控 ↔ **EBSE 三角验证（Triangulation）** + **科学方法的否定假设（Falsifiability）**——Karl Popper 强调可证伪性是科学结论的必要条件，"无 X"结论必须主动寻找反证

源由：2026-06-23 [plugin-dev-quick-reference.md §0](plugin/refs/plugin-dev-quick-reference.md) 仅基于"搜博客"单一证据类型下"社区无 plugin 实战经验"结论，未查 npm/GitHub/官方 examples/Marketplace 任一独立证据源。

### 1.15 子条款：执行环境可用性门控（不可抗力声明）

当外部执行环境（VS Code 扩展 / CLI / SDK / 平台服务）的可用性发生**非预期变化**（官方回滚 / API 废弃 / 打包缺陷 / 服务下线），构成**不可抗力**——所有依赖该环境的设计、实施计划和验证步骤必须立即冻结并重新评估。

**触发后动作**：

1. 在相关 design.md / assessment.md 中插入不可抗力声明块，包含：完整证据链（时间线 + 版本号 + 证据引用）、对现有设计的具体影响
2. 将所有依赖该环境的验证步骤标记为"受限"或"推迟"，指定替代验证路径（如 CLI 端替代 VS Code 端）
3. 登记待跟进项（GitHub issue / 官方 changelog 监控），明确恢复条件

**禁止**：
- 在已知环境不可用的情况下，继续编写或执行依赖该环境的验证步骤
- 用 workaround 结果等同于"环境可用"（workaround 可用 ≠ 官方支持路径可用）
- 省略证据链直接声明"不可用"（必须按 §1.6 双来源验证）

**当前生效的不可抗力声明**（2026-06-30 更新）：

| 环境 | 状态 | 替代路径 | 恢复条件 |
|------|------|---------|---------|
| VS Code 扩展 4.0.x（plugin 系统）| 不可用 | CLI 3.0.30+ | SDK 迁移重新合入稳定版（issue #11944）|
| CLI 3.0.34 `agent-message-codec.ts` 守卫缺失 | **部分受限**（长对话/异常 MCP tool_result 触发崩溃） | 分层推进：仅低风险实测（setup marker / rules 注入 / Loop Guard 短场景）| 上游修复 `agentMessageToMessageWithMetadata` / `agentMessagesToMessages` 加 `Array.isArray` 守卫 + 补测试 |

**CLI 3.0.34 codec bug 影响范围**：
- 🔴 **搁置**：snapshot 写入实测（需 90K tokens 长对话，正是 bug 触发场景）
- 🟡 **带观察推进**：Loop Guard 实测（构造场景时避免 MCP 工具 + 避免长输出，用小文件简单 read_file 重复）
- 🟢 **可推进**：setup marker / rules 注入（短交互，不触发长对话路径）

**workaround 不等同环境可用**（§1.15 禁止条款）：workaround 期间实测结果仅证明"避开 bug 的路径可用"，不证明"环境完整可用"。

源由 1：2026-06-28 VS Code 扩展 v4.0.0 bootstrap 缺失 → v4.0.1 官方回滚到 pre-SDK 代码基 → v4.0.2 继承回滚，Plugin 系统在 VS Code 端完全不存在。CLI 端为唯一可用运行环境。完整证据链见 [investigation-note-vscode-bootstrap-missing.md](decisions/investigation-note-vscode-bootstrap-missing.md) + [D-2026-06-28-cline-v401-sdk-rollback.md](decisions/D-2026-06-28-cline-v401-sdk-rollback.md) + [design.md 不可抗力声明](plugin/design.md)。

源由 2：2026-06-30 用户报 `Error: n.content.map is not a function. (In 'n.content.map(eK)', 'n.content.map' is undefined)` 三次（duckduckgo 超时 / run_commands 843+ 行 / read E:\cline++\docs 后）。源码定位见 [investigation-note-cli-codec-content-map-bug.md](decisions/investigation-note-cli-codec-content-map-bug.md)。

---

## 2. handoff 通用触发器

> 与功能无关的 handoff 写入触发器。功能专属的自动触发器（如 search-orchestrator 的 P 级任务完成）见对应的 `project-rules-<功能>.md`。

只在下列触发时机才覆盖写 `docs/handoff.md`，没触发不要主动写。写入内容只保留本会话决策、净变化、下次会话第一句话；不重列长期清单。

- **触发器 a：用户口头要求**（无条件）
  用户在对话中明确说「写 handoff」「交接」「结束会话」等。立即执行，不需要任何前置判断。
  *元规则：不写进规则文件以外的判断逻辑，由用户在对话层触发即可。*

- **触发器 c：对话过长 + 话题已跳 + 上下文吃紧**（建议，不自动）
  **同时**满足下列三条：
  ① 本会话用户消息 ≥ 8 轮；
  ② 当前轮所讨论的工作项与上一轮**无证据/决策依赖**（即：不引用上一轮的实验数据、决策 ID、文件改动）；
  ③ 上下文窗口占用 ≥ 70%（即 token usage 估算已逼近模型上限，继续推进风险大）。
  仅向用户**提议**写 handoff，由用户拍板，不自动覆盖。
  *三条 AND 的设计意图*：① 防止短会话误报，② 防止同话题多轮调优误报，③ 防止前两条满足但 context 充裕时过早交接（损失会话内已建立的工作记忆）。

*没有任一触发器命中时禁止写 handoff*。例如：刚完成上一份 handoff 列出的"下次具体动作"中的第一项 ≠ 触发器，本会话应继续推进剩余动作，而不是再写 handoff。

### 2.1 子条款：handoff 进入 git

每次覆盖写 `docs/handoff.md` 后，必须立即 git commit（含 handoff.md 及本会话产生的所有新文件和修改文件）。commit message 格式：`handoff: <一句话摘要>`。目的：出现异常时可回滚到任一 handoff 快照。

---

## 3. 状态值约定

`mechanism-candidates.md` 状态枚举见该文件 §状态约定，只能用：`候选` / `实验中` / `已机制化` / `永久C类` / `已退休`。不要发明新值（例如 `investigate-later`、`暂缓` 这类如需表达，用「候选（暂缓）— 触发条件：XXX」的注释形式）。

决策 status 枚举见 `docs/README.md`：`proposed` / `active` / `deferred` / `superseded` / `rolled-back`。

---

## 4. 方向启动门控：明确开发指向对象

启动一个新的大方向（如新功能开发、载体迁移、架构调整、研究课题）前，**必须**先明确"开发指向的对象"并请用户确认。对象至少包含以下维度：

| 维度 | 必须回答的问题 |
|------|--------------|
| **载体** | 操作的目标是什么？（VS Code 扩展 / CLI / SDK / 独立脚本 / 文档体系）|
| **范围** | 调研或实现覆盖哪些能力？（commands / MCP / skill / hook / plugin / 其他）|
| **排除** | 哪些不在本次范围内？（避免偏离到相邻载体）|
| **成功标准** | 什么算调研完成？（清单产出 / 实测验证 / 决策文档更新）|

**触发条件**：用户说"启动 X 方向" / "调查 Y" / "做 Z 实验"等启动性指令时。

**违反时**：若调查过程中发现范围漂移（如本应调研 VS Code 扩展却偏离到 CLI），必须立即停止并回到用户确认的对象范围，不可继续推进。

源由：ADR-002 Update 1/2 调查方向偏离事故（2026-06-27）——用户要求"调查 cline 的原生能力，handoff 与 compact 结合等都是基于插件说的"，调研却偏离到 CLI 载体，中间用户察觉不对劲但未能掰回。用户明确要求："以后启动大方向时，把开发指向的对象明确出来让我确认。"

> *设计意图*：与 §1.3（阴性结论门控）、§1.4（核查方法门控）构成同构治理——在错误的层做错误的事、用错误的工具做核查、偏离到错误的对象做调研，三类错误都需前置门控。

---

## 5. 文件存放规范

新增文件**必须**放入对应目录，**禁止**在根目录散落 .log / .ps1 / .sh / 未分类 .md。

```
docs/                     项目文档
  decisions/              ADR + 调查笔记（Investigation Notes）
  search/                 搜索产品线
    search-orchestrator/  搜索编排器文档 + 实验记录
    research/             搜索质量研究
    blog/                 社区博文
    project-rules.md      search-orchestrator 开发期防漂移约束
  plugin/                 Plugin 产品线
    design.md             context-snapshot 设计文档
    refs/                 架构参考 + 社区指南（对外可发布）
scripts/                  工具脚本（patch、自动化）
context-snapshot/         Plugin 源码（独立 git 仓库，submodule）
search-mcp-wrapper/       MCP wrapper（独立项目）
skills/                   Cline skills
experiments/              Spike 实验
```

**判定规则**：
- 对外可发布的指南/参考 → `docs/plugin/refs/`
- 内部决策记录（ADR / 调查笔记）→ `docs/decisions/`
- 可执行脚本（.ps1 / .sh / .py 工具）→ `scripts/`
- 运行时日志（.log）→ gitignore，不入库
- 独立项目的源码 → 各自子目录（context-snapshot/ / search-mcp-wrapper/）

源由：2026-06-28 项目整理——根目录曾有 patch 脚本、测试日志、重复文档，缺乏存放规范导致每次新增文件都需人工判断位置。

---

## 本文件的生命周期

- 长期保留：本文件承载跨功能通用规则，不随任一功能开发期结束而删除。
- **维护节奏（重要）**：单一功能开发期间，本文件基本**冻结不维护**——该期间所有新规则先沉淀在该功能的 `project-rules-<功能>.md` 里。只在**一个功能开发结束、开始下一个独立功能时**，才回顾上一功能的 `project-rules`，把其中被证明跨功能通用的规则，像本次 search-orchestrator → dev-rules 一样**迁入本文件**。
  - 设计意图：避免在功能开发中途反复改通用层（通用性需要至少一个完整功能周期来验证）；迁移动作集中在功能交界点一次性完成。
  - 迁移判据：某条规则与具体功能无关、且预期会被下一个功能复用，才迁入；仅对当前功能成立的留在原 `project-rules-<功能>.md`，随该文件冻结期删除。
- 扩容条件：见上一条——在功能交界点按判据追加章节。
- 不做的事：不收录功能专属规则（那些留在对应的 `project-rules-<功能>.md`）；不预写"未来可能用到"的规则；不在单一功能开发中途改动本文件（除非修正明确的错误）。
