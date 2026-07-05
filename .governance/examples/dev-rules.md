# Dev Rules（跨功能通用防漂移规则）— 通用化示例包

> **生命周期**：版本绑定 — v1.0 框架定型后归档。
>
> **身份**：EX-1b 产出。从 cline++ dev-rules.md 蒸馏的执行边界规则示例包。
>
> **通用化判定依据**：见 [../core/rubric.md](../core/rubric.md) 五维判定清单。
>
> **使用场景**：① 第二个项目接入时按本示例包修改后即可复用；② 写 core/constitution.md §执行主体边界 / §handoff 触发器 / §方向门控时引用本包作为执行门控的具体落地范本；③ 写 rules/ 薄入口时按本包对应章节填充项目取值。
>
> **与原项目的关系**：本包从 cline++ 项目蒸馏。判定动作（执行主体边界 / handoff 触发器 / 状态值约定 / 方向启动门控 / 文件存放 / 文档生命周期）保留为通用规则；项目取值（具体阈值 / 路径 / 工具名 / 版本号 / 字段名 / codec bug / V6 实现 / context-snapshot plugin 等）已清除或参数化，详见下方"cline++ 特定假设"。

---

## cline++ 特定假设

> 本示例包从 cline++ 项目蒸馏。下列假设若不适用你的项目，需修改对应章节。

| 假设 | 影响章节 | 修改建议 |
|------|---------|---------|
| 假设存在 Cline CLI 工具链 + codec bug 阻塞场景作为不可抗力判据来源 | §1.15 执行环境可用性门控 | 改为你的 agent CLI；若无 codec 类阻塞场景，删除 §1.15 中"当前生效的不可抗力声明"表与"V6 实现"段，仅保留通用动作模板 |
| 假设 Windows + PowerShell 5.x 环境，文件核查须用 `Get-ChildItem -Recurse` / `Test-Path` | §1.4 文件核查工具门控（已移至本假设） | 改为你的 shell 环境对应递归列举命令（bash/zsh：`find` / `ls -R`；fish：`find`）；若非 Windows，删除对该 PowerShell 命令的引用 |
| 假设存在 context-snapshot plugin 子项目作为独立 git submodule | §5 文件存放规范的目录树 | 删除目录树中 `context-snapshot/` 条目，替换为你的项目独立子模块（若有）；若无子模块，删除该行 |
| 假设存在 search-orchestrator / search-mcp-wrapper / skills 等产品线子目录 | §5 文件存放规范的目录树 | 改为你的产品线目录命名；若无多产品线，将目录树简化为单产品线模板 |
| 假设存在 mechanism-candidates.md（机制候选清单）作为"经验机制化"沉淀载体 | §3 状态值约定 / §6.4.4 与机制候选清单退休机制的关系 / §6.5 审查范围 | 改为你的机制沉淀载体（如 `mechanisms.md` / `patterns.md`）；若无，删除 §3 状态值中候选清单枚举行、§6.4.4 整节、§6.5 审查范围中候选清单条目 |
| 假设存在 reviewer-personas.md（评审角色定义）作为 §1.11/§1.12 的单点真理 | §1.11 评审角色调用门控 / §1.12 子代理注入评审角色提示词 / §6.4.2 引用清理 | 改为你的评审角色定义文档（同目录 `reviewer-personas.md` 示例包）；若无评审角色机制，删除 §1.11 / §1.12 与 §6.4.2 第 4 步 |
| 假设存在 evidence-governance.md（证据治理框架）作为 §1.5–§1.10 / §6 的单点真理 | §1.5 权威源 / §1.6 双来源验证 / §1.7 minified 边界 / §1.8 Evidence Collapse / §1.13 时效性 / §1.14 "无 X"门控 / §6 文档生命周期 | 改为你的证据治理文档（同目录 `evidence-governance.md` 示例包）；若无，补写或将本包与 evidence-governance.md 合并 |
| 假设存在 docs/decisions/ 命名规范（ADR / D / investigation-note / draft-issue / observation / schema 六类） | §5.1 命名规范与路径约束 | 改为你的决策文档命名规范；若仅用 ADR，删除 D / investigation-note / draft-issue / observation / schema 行；若用 RFC，替换 ADR 行为 RFC 命名 |
| 假设多载体并存（VS Code 扩展 / CLI / SDK / 平台服务），需"载体维度"门控 | §1.15 不可抗力 / §4 方向启动门控载体维度 | 若你的项目为单载体（如纯 Web 前端），删除 §4 载体维度的多选项，改为单一载体固定值；删除 §1.15 多载体不可抗力表 |
| 假设存在 project-health-audit-YYYY-MM-DD.md 月度审查报告命名约定 | §6.5 定期审查机制 | 改为你的审查报告命名（如 `audit-YYYY-QN.md`）；若无定期审查，删除 §6.5（但建议保留——治理膨胀警报是反漂移关键门控） |

---

## 1. 执行主体边界（主 agent vs 专项 agent）

当某步骤的 designated executor 是专项 agent + SKILL 时（即需要 Goggle 过滤 / P3 三元组抽取 / 三档模式 / 同源去重等 SKILL 层机制），主 agent（当前会话的 IDE agent）不得直接用 WebSearch / WebFetch 等通用工具替代执行。

**判定规则**：若实验框架（run-N-*.md）的执行提示词声明"复制到专项 agent 执行"，则该步骤的执行主体是专项 agent（带 SKILL），不是主 agent。主 agent 的 WebSearch / WebFetch 等价于"裸 search"层，缺少 SKILL 层的全部机制处理。

**违反时**：回滚主 agent 产出的证据，交付提示词给用户在专项 agent 中执行。

### 1.1 子条款：执行产出归档路径

专项 agent 执行提示词必须在开头声明输出文件的建议存放位置，格式为 `<实验目录>/run-N-phase*-*.md`。若提示词未声明位置，执行模型会自主选择位置（如 `research/`），导致产出文件脱离实验目录治理。

### 1.2 子条款：交互式会话需真实终端（TTY）

凡需实际发起 agent 会话的命令（进入 agent loop 的调用），必须交由用户在真实终端执行，主 agent 不得在非交互终端代跑——否则报文件描述符错误（如 `EBADF: bad file descriptor, write`）并挂起。主 agent 只负责非交互命令（install / config / 目录与文件检查）与结果判读。

### 1.3 子条款：阴性结论须先排除验证方法错误

以"失败 / 不存在 / 不可用"为依据下退出或否决类结论前，必须先用一个已知应成功的对照确认验证方法本身有效；共享同一前提的多条证据不算独立交叉验证。

> *设计意图*：与"不在 SKILL 层做基础设施层的事"、"绝不用规则解决运行时问题"构成同构治理原则——不在错误的层做错误的事，不在错误的执行环境做错误的事。

### 1.5 子条款：权威源与独立证据

证据职责分工（不同证据类型回答不同问题，不可混用）详见 [evidence-governance.md §3](evidence-governance.md)。

**执行门控**：冲突时记录 Conflict Registry（[evidence-governance.md §6](evidence-governance.md)），**不裁决**——理由见本文件 §6.4。

### 1.6 子条款：关键结论双来源验证

Confidence 模型与进入 Verified / Decision 的阈值（独立证据类型数量、独立性判定）详见 [evidence-governance.md §4](evidence-governance.md)——以该处为单点真理，本节不再重复本地阈值。

**执行门控**：Verified 是 Decision 的前置（见 [evidence-governance.md §2.2](evidence-governance.md) 状态转换条件），未达 Verified 不可写入 ADR。

### 1.7 子条款：Minified Code 使用边界

minified 代码**可用于定位**（入口 / 调用链 / 字符串 / API / hook），**不可单独用于语义结论**（设计意图 / 目录结构 / 协议）。

依据 [evidence-governance.md §3](evidence-governance.md) 证据职责分工——minified 是源码证据的子集，回答"实际行为"，不回答"设计意图"。需要语义结论时，必须升级到 unminified 源码或官方文档对照。

**允许**：`Grep minified 确认字符串存在` → `对照官方文档确认语义`
**禁止**：`Grep minified` → `推断设计意图` → `写入 ADR`

### 1.8 子条款：Evidence Collapse 门控（证据冲突停机）

证据冲突时**必须停止**继续在同一证据类型里打转。禁止 / 允许模式与升级路径（官方 → Example → 源码 → 实测）详见 [evidence-governance.md §8](evidence-governance.md) Evidence Escalation——该处为单点真理。

**触发后动作**（执行门控）：
1. 停止当前调研
2. 登记 Conflict Registry（[evidence-governance.md §6](evidence-governance.md)）
3. 按 §8 升级到下一证据类型

### 1.9 子条款：Direction Drift 门控（方向偏离运行时检测）

§4 方向启动门控的**运行时补充**。调研过程中若用户**重新限定研究对象**（非质疑语气），必须立即：

1. 停止当前调研
2. 更新研究对象（记录到当前 Investigation Note）
3. 废弃基于旧对象的推论，或降为 Hypothesis 并标注"基于旧对象"

**检测信号**：用户重新定义问题（如"我讨论的是 X" / "不是 Y" / "还是 X"），**而非**用户语气（如"我一直在质疑"）。关注的是问题定义是否发生变化，不是用户情绪。

### 1.10 子条款：Core Proposition Flip 门控（核心命题翻转停机）

**核心命题**翻转 **≥ `<N>` 次**（如 支持 → 不支持 → 支持 → 不支持）触发工作流审查：停止修正，回到 [evidence-governance.md](evidence-governance.md) 证据治理层面找根因。`<N>` 见 [../core/constitution.md](../core/constitution.md) 项目可调参数 `proposition_flip_threshold`。

**不是 Update 次数**——连续修正可能是深入调查（如 `官方 → Example → 源码 → 实测`）；**核心命题翻转**才是推理系统失控的信号。

**触发后动作**：
1. 停止当前 Update
2. 列出核心命题的翻转历史
3. 检查是否在同一个证据类型里打转（违反 §1.8 Evidence Collapse）
4. 检查是否跳级（违反 [evidence-governance.md §2.3](evidence-governance.md) 禁止跳级）
5. 必要时冻结当前 ADR（标 [evidence-governance.md §5](evidence-governance.md) Unknown 状态），重新调查后写新 Update，而非连续覆盖

### 1.11 子条款：评审角色调用门控

评审角色触发条件表、核心约束、输出三分类（成熟实践 / 本地扩展 / 创新）统一按 [reviewer-personas.md §1 与 §4.1](reviewer-personas.md) 执行——该处为单点真理。

### 1.12 子条款：子代理调用必须注入评审角色提示词

执行 loop / 串行任务 / 调用 Task subagent 时，主 agent **必须自行**把对应评审角色提示词注入子代理的 query 参数，**不依赖**用户在对话层提醒。

**执行约束**：调用子代理做评审类任务必须注入角色提示词；禁止依赖用户在对话层提醒；禁止把多角色意见混合在一个 subagent 输出中；多角色意见冲突时按 [evidence-governance.md §6](evidence-governance.md) Conflict Registry 登记冲突，不裁决。

注入步骤（角色识别 / 注入格式 / 多角色并行）按 [reviewer-personas.md §4.2](reviewer-personas.md) 执行——该处为单点真理。

### 1.13 子条款：结论时效性门控

依据 [evidence-governance.md §15](evidence-governance.md) 结论时效性模型，引用 ADR 结论作为新决策论据前，**必须**检查该 ADR 的 `evidence_as_of` 与 `expires_if_unchanged` 字段：

1. **未超期**（`expires_if_unchanged` 在未来）：可直接引用
2. **已超期**（`expires_if_unchanged` 在过去）：
   - 停止引用该结论作为决策依据
   - 降级为 Hypothesis（待复查）
   - 触发复查（重新核查证据来源是否仍成立）
3. **缺字段**（存量 ADR 未填）：在下次 Update 时补齐；引用前需人工判断时效

**禁止**：直接引用超期结论作为新决策的论据而不复查。

**适用范围**：所有涉及外部生态（社区活跃度 / 包下载量 / 上架数 / 仓库活动 / 官方文档版本）的 ADR 结论。

**成熟实践映射**：
- 结论时效性门控 ↔ **Refresh Token 验证**（使用前必须检查是否过期）+ **SLR 检索时间范围限定**（系统综述要求声明检索时间窗）

### 1.14 子条款："无 X"类结论门控

下"无 X"类结论（无开发记录 / 无社区沉淀 / 无可用工具 / 无文档 / 无示例）前，**必须**：

1. 经当前活跃功能的 SKILL 反证查询（如适用）
2. 至少 **`<N>` 类独立证据类型**一致（如包仓库 + 仓库活动 + 官方文档 + 应用市场 + 搜索引擎）。`<N>` 见 [../core/constitution.md](../core/constitution.md) 项目可调参数 `negative_conclusion_evidence_count`。
3. 在 Investigation Note（[evidence-governance.md §10](evidence-governance.md)）中记录反证搜索过程，含 query 列表（[evidence-governance.md §17](evidence-governance.md)）

**禁止**：
- 基于单一证据类型下"无 X"结论
- 仅自述"搜过 X"而不记录 query 列表（违反 §17 调研可复现性）

**违反时**：回滚结论，降级为 Hypothesis，登记 Conflict Registry。

**成熟实践映射**：
- "无 X"结论门控 ↔ **EBSE 三角验证（Triangulation）** + **科学方法的否定假设（Falsifiability）**——Karl Popper 强调可证伪性是科学结论的必要条件，"无 X"结论必须主动寻找反证

### 1.15 子条款：执行环境可用性门控（不可抗力声明）

当外部执行环境（扩展 / CLI / SDK / 平台服务）的可用性发生**非预期变化**（官方回滚 / API 废弃 / 打包缺陷 / 服务下线），构成**不可抗力**——所有依赖该环境的设计、实施计划和验证步骤必须立即冻结并重新评估。

**触发后动作**：
1. 在相关 design.md / assessment.md 中插入不可抗力声明块，包含：完整证据链（时间线 + 版本号 + 证据引用）、对现有设计的具体影响
2. 将所有依赖该环境的验证步骤标记为"受限"或"推迟"，指定替代验证路径（如 CLI 端替代 GUI 端）
3. 登记待跟进项（上游 issue / 官方 changelog 监控），明确恢复条件

**禁止**：
- 在已知环境不可用的情况下，继续编写或执行依赖该环境的验证步骤
- 用 workaround 结果等同于"环境可用"（workaround 可用 ≠ 官方支持路径可用）
- 省略证据链直接声明"不可用"（必须按 §1.6 双来源验证）

**当前生效的不可抗力声明**（项目自维护表，各项目按实际填入）：

| 环境 | 状态 | 替代路径 | 恢复条件 |
|------|------|---------|---------|
| <环境名 + 版本> | <可用 / 部分受限 / 不可用> | <替代路径> | <恢复条件 + 上游 issue 链接> |

> *原 cline++ 版本*：含 VS Code 扩展 4.0.x plugin 系统 / CLI 3.0.34 codec bug / V6 messageBuilder 实现等具体声明表与影响范围分级（🔴 / 🟡 / 🟢）。本通用化版本仅保留通用动作模板与空表头，项目专属声明由各项目按上方模板自维护。

**workaround 不等同环境可用**（§1.15 禁止条款）：workaround 期间实测结果仅证明"避开 bug 的路径可用"，不证明"环境完整可用"。

**解除流程**（恢复条件命中后必须按序执行）：

1. **验证修复落地**：上游修复 PR 合并 + 官方发版（不仅是 main 分支合并，需等 release tag）
2. **升级本地工具**：用户在真实终端升级到含修复的版本，确认版本号已更新
3. **回归实测**：在无 workaround 的环境下重跑原触发场景，确认无崩溃
4. **移除不可抗力声明**：删除"当前生效的不可抗力声明"表中对应行
5. **恢复受阻验证项**：将本节影响范围分级中标 🔴 的项恢复为可推进，按原计划执行
6. **更新引用文档**：同步更新所有引用该声明状态的文档
7. **归档 draft-issue**（若适用）：标注 issue 编号并移入归档流程

**部分解除条件**：若 PR 仅覆盖部分触发路径，按覆盖范围部分移除声明，保留未覆盖路径的受限标注。

**禁止**：
- 跳过步骤 3（回归实测）直接移除声明——workaround 可用 ≠ 修复落地
- 用 main 分支合并等同于"已修复"——必须等 release tag（用户安装的是 release 版本）
- 移除声明后不更新引用文档——会导致其他文档引用过时状态

---

## 2. handoff 通用触发器

> 与功能无关的 handoff 写入触发器。功能专属的自动触发器（如某产品线的 P 级任务完成）见对应的 `project-rules-<功能>.md`。

只在下列触发时机才覆盖写交接文件，没触发不要主动写。写入内容只保留本会话决策、净变化、下次会话第一句话；不重列长期清单。

- **触发器 a：用户口头要求**（无条件）
  用户在对话中明确说「写 handoff」「交接」「结束会话」等。立即执行，不需要任何前置判断。
  *元规则：不写进规则文件以外的判断逻辑，由用户在对话层触发即可。*

- **触发器 b：未 commit 文件堆积阻断守卫**（强制，自动触发）
  当 workspace 未 commit 的新建 / 修改文件数量 **≥ `<N>`**（排除 gitignored 路径）时，**禁止**继续任何实质性代码修改或新探针测试，必须立即写 handoff + commit 序列化。`<N>` 见 [../core/constitution.md](../core/constitution.md) 项目可调参数 `uncommitted_file_threshold`。
  *检测方式*：`git status --porcelain | wc -l`（bash）或对应 shell 等价命令。
  *设计意图*：文件堆积达阈值说明本会话已积累大量未序列化状态，继续推进会让回滚成本失控。阻断守卫的本质是**阻断继续推进**而非代替 agent 思考——agent 被迫停下来，才会产出有意义的 handoff（断言型 confidence，非机械快照）。

- **触发器 c：对话过长 + 话题已跳 + 上下文吃紧**（建议，不自动）
  **同时**满足下列三条：
  ① 本会话用户消息 **≥ `<N>` 轮**；`<N>` 见 [../core/constitution.md](../core/constitution.md) 项目可调参数 `long_session_turns`。
  ② 当前轮所讨论的工作项与上一轮**无证据 / 决策依赖**（即：不引用上一轮的实验数据、决策 ID、文件改动）；
  ③ 上下文窗口占用 **≥ `<ratio>`**（**估算方式**：模型无 API 自查 token 占用，用代理信号估算——对话轮次达阈值 + 出现以下任一压力信号：a) 输出开始截断 b) 遗忘前文已确认的决策 c) 重复生成已说过的话 d) 用户主动提示"上下文快满了"）。`<ratio>` 见 [../core/constitution.md](../core/constitution.md) 项目可调参数 `context_pressure_ratio`。
  仅向用户**提议**写 handoff，由用户拍板，不自动覆盖。
  *三条 AND 的设计意图*：① 防止短会话误报，② 防止同话题多轮调优误报，③ 防止前两条满足但 context 充裕时过早交接（损失会话内已建立的工作记忆）。

*没有任一触发器命中时禁止写 handoff*。例如：刚完成上一份 handoff 列出的"下次具体动作"中的第一项 ≠ 触发器，本会话应继续推进剩余动作，而不是再写 handoff。

### 2.1 子条款：handoff 进入 git

每次覆盖写交接文件后，必须立即 git commit（含交接文件及本会话产生的所有新文件和修改文件）。commit message 格式：`handoff: <一句话摘要>`。目的：出现异常时可回滚到任一 handoff 快照。

### 2.2 子条款：handoff 未完成项表强制三字段

交接文件的「未完成项 / 后续动作」表**必须**包含以下三列：

| 字段 | 规则 | 示例 |
|------|------|------|
| **id** | 稳定短 ID，小写字母 + 数字 + 连字符，不超 20 字符。可复用 ADR 编号 / mechanism-candidates 编号 / 任务书编号 | `a1-content-fix` / `m4-loop-guard` |
| **confidence** | 取值与 [evidence-governance.md §4](evidence-governance.md) 一致：`Verified` / `Likely` / `Hypothesis` | `Verified` |
| **depends_on** | 指向其他稳定 ID（逗号分隔），**禁止**自然语言描述 | `codec-bug-fix` 而非 "等 codec bug 修复" |

**设计意图**：
- `id` 稳定 → `depends_on` 可遍历 → 依赖图可从 blocker_ref 边即时重建，不需要独立载体
- `confidence` 复用 evidence-governance 词汇表 → snapshot（机械投影）和 handoff（叙事投影）共享同一套置信语义
- 三字段是 agent 已有判断的结构化输出，不增加认知负担，30 秒约束不受威胁

**agent 自动填，人工可覆写**。格式纪律由本规则 + handoff 模板保障。

### 2.3 子条款：交接文件格式保持现状

交接文件的格式保持现状，不改动原有结构。每次覆写只更新内容，不重构标题、不调整顺序、不增删章节。末尾保留独立的 `## Handoff（推荐下次会话开局交接语句）` section（code block 形式的开局指令），便于复制。

---

## 3. 状态值约定

机制候选清单（`mechanism-candidates.md` 或等价载体）的状态枚举见该文件 §状态约定，只能用：`候选` / `实验中` / `已机制化` / `永久C类` / `已退休`。不要发明新值（例如 `investigate-later`、`暂缓` 这类如需表达，用「候选（暂缓）— 触发条件：XXX」的注释形式）。

决策 status 枚举见 `docs/README.md`（或等价决策目录入口）：`proposed` / `active` / `deferred` / `superseded` / `rolled-back`。

---

## 4. 方向启动门控：明确开发指向对象

启动一个新的大方向（如新功能开发、载体迁移、架构调整、研究课题）前，**必须**先明确"开发指向的对象"并请用户确认。对象至少包含以下维度：

| 维度 | 必须回答的问题 |
|------|--------------|
| **载体** | 操作的目标是什么？（扩展 / CLI / SDK / 独立脚本 / 文档体系）|
| **范围** | 调研或实现覆盖哪些能力？（commands / MCP / skill / hook / plugin / 其他）|
| **排除** | 哪些不在本次范围内？（避免偏离到相邻载体）|
| **成功标准** | 什么算调研完成？（清单产出 / 实测验证 / 决策文档更新）|

**触发条件**：用户说"启动 X 方向" / "调查 Y" / "做 Z 实验"等启动性指令时。

**违反时**：若调查过程中发现范围漂移（如本应调研载体 A 却偏离到载体 B），必须立即停止并回到用户确认的对象范围，不可继续推进。

> *设计意图*：与 §1.3（阴性结论门控）、§1.15（不可抗力门控）构成同构治理——在错误的层做错误的事、偏离到错误的对象做调研、依赖错误的环境做验证，三类错误都需前置门控。

---

## 5. 文件存放规范

新增文件**必须**放入对应目录，**禁止**在根目录散落 .log / .ps1 / .sh / 未分类 .md。

### 5.1 通用目录模板

```
docs/                     项目文档
  decisions/              决策 + 调查笔记（按类型聚类）
    adr/                  ADR-NNN-<短描述>.md（架构决策记录）
    <功能>/               D-YYYY-MM-DD-<功能>-<动作>-<对象>.md（功能决策）
    investigation/        investigation-note-*.md（调查笔记）
    draft-issue/          draft-issue-*.md（待提交 issue 草稿）
    observation-*.md      观察记录（根目录）
    schema-*.md           跨功能 schema 规范（根目录）
    README.md / ARCHIVE.md
  <功能>/                  各产品线文档（按功能聚类）
    project-rules.md      功能开发期防漂移约束
scripts/                  工具脚本（patch、自动化）
<独立项目源码>/            各独立项目源码（各自子目录 / submodule）
experiments/              Spike 实验
```

> *原 cline++ 版本*：含 `context-snapshot/`（plugin 源码 submodule）/ `search-mcp-wrapper/`（MCP wrapper 独立项目）/ `skills/`（Cline skills）/ `handoff-schema/`（handoff schema 化功能）等具体子目录。本通用化版本仅保留通用模板，各项目按产品线替换（详见假设清单 §5 项）。

**判定规则**：
- 对外可发布的指南 / 参考 → `docs/<对应产品线>/refs/`（或等价对外目录）
- 内部决策记录（ADR / 调查笔记）→ `docs/decisions/` 按类型入子目录
- 可执行脚本（.ps1 / .sh / .py 工具）→ `scripts/`
- 运行时日志（.log）→ gitignore，不入库
- 独立项目的源码 → 各自子目录

### 5.2 子条款：`docs/decisions/` 命名规范与路径约束

`docs/decisions/` 按文档类型聚类为子目录，新增文件**必须**遵守下列命名格式与路径约束：

| 类型 | 命名格式 | 路径约束 | 示例 |
|------|---------|---------|------|
| **ADR**（架构决策记录）| `ADR-NNN-<短描述>.md` | `decisions/adr/` | `ADR-005-split-compact-from-handoff.md` |
| **D 决策**（功能决策）| `D-YYYY-MM-DD-<功能>-<动作>-<对象>.md` | `decisions/<功能>/`（功能名 = `docs/<功能>/` 目录名）；跨功能决策放根目录 | `D-2026-06-24-search-adopt-p3.md` → `decisions/search/` |
| **investigation-note**（调查笔记）| `investigation-note-<对象>.md` | `decisions/investigation/` | `investigation-note-dual-setup.md` |
| **draft-issue**（待提交 issue 草稿）| `draft-issue-<对象>.md` | `decisions/draft-issue/` | `draft-issue-cli-codec-content-map-bug.md` |
| **observation**（观察记录）| `observation-<对象>.md` | `decisions/`（根目录）| `observation-write-retry-deadlock.md` |
| **schema**（跨功能 schema 规范）| `schema-<对象>.md` | `decisions/`（根目录）| `schema-semantic-object-model.md` |

**强制规则**：
1. **ADR 编号必须连续**（NNN 三位补零，不跳号；已退役的编号不重用）
2. **D 决策日期必须为决策建立日**（非文档撰写日，非决策生效日）
3. **功能名必须与 `docs/<功能>/` 目录名一致**（如 search 功能的决策放 `decisions/search/`）
4. **跨功能决策**（如 `D-YYYY-MM-DD-<项目>-<动作>-<对象>`）放 `decisions/` 根目录，不强行归入某功能子目录
5. **禁止**在 `decisions/` 根目录散落 ADR / D 决策 / investigation-note / draft-issue（必须入对应子目录）
6. **禁止**为单一文件创建子目录（如只有一个 <X> 决策时不建 `decisions/<X>/`，放根目录）

---

## 6. 文档生命周期与规则演进

所有 `docs/` 下的文档**必须**在文件头部标注生命周期，格式为 `> **生命周期**：...`。

> 本节同时承载**规则治理元规则**（关于规则本身的演进：文档生命周期 §6.1-§6.3 / 规则退役 §6.4 / 定期审查 §6.5）。元规则不属于功能规则，不受"功能开发期间冻结"约束。

### 6.1 标注规则

| 类型 | 标注格式 | 示例 |
|------|---------|------|
| **永久保留** | `永久保留 — <理由>` | `永久保留 — 跨功能通用治理规则` |
| **功能绑定** | `功能绑定 — <功能名>，<归档条件>` | `功能绑定 — <功能>，功能冻结后删除` |
| **版本绑定** | `版本绑定 — <版本>，<归档条件>` | `版本绑定 — v0.7.0，实现完成后归档` |
| **任务绑定** | `任务绑定 — <任务>，<归档条件>` | `任务绑定 — <任务>，合入主线后归档` |
| **事件绑定** | `事件绑定 — <事件>，<归档条件>` | `事件绑定 — issue 提交后归档` |
| **会话绑定** | `每次覆写，无归档` | handoff.md |

**归档条件**必须具体、可判定（如"功能冻结后""issue 提交后""v0.7.0 实现完成后"），**禁止**模糊表述（如"以后""适时""不再需要时"）。

### 6.2 执行方式

- **外来文档**（评审产出、外部研究）：手动在文件头添加生命周期标注
- **自产文档**（设计文档、审计报告、调查笔记等）：创建时自觉添加
- **存量文档**：下次修改时补齐；本会话一次性补标所有活跃文档

### 6.3 强制检查

handoff 写入时，检查本会话新增 / 修改的文档是否均已标注生命周期。缺失则在 handoff 中记录待补。

### 6.4 规则退役流程

> **源由**：规则演进"加法 only"导致治理膨胀。审查报告中系统性问题部分源于规则只增不减。本节定义退役判据与引用清理流程，使规则生命周期闭环。

#### 6.4.1 退役判据

一条规则**满足下列任一条件**即触发退役评估：

| 判据 | 定义 | 触发动作 |
|------|------|---------|
| **场景消失** | 规则针对的外部环境 / 工具 / 场景已不存在（如某扩展系统废弃 / 某 CLI API 移除） | 立即退役 |
| **被覆盖** | 规则被更高层或更严格的规则完全覆盖（新规则是旧规则的超集） | 立即退役，引用统一指向新规则 |
| **长期未触发** | 规则在最近 **`<N>` 个月**内无违反记录 + 无 handoff / investigation-note 引用。`<N>` 见 [../core/constitution.md](../core/constitution.md) 项目可调参数 `rule_stale_months`。 | 启动 30 天观察期，期满仍未触发则退役 |
| **重叠度过高** | 与现有其他规则重叠度 **> `<ratio>`**（表达同一意图，仅措辞 / 范围略异） | 合并到主规则，重复条目退役 |
| **治理膨胀警报** | 审查报告问题数 **> `<N>` 项**触发治理膨胀警报（见 §6.5）时，强制启动批量退役评估 | 批量评估 |

**禁止退役**的情形：
- 规则源由的事故距今 **< `<N>` 个月**（事故教训尚未沉淀稳定）
- 规则是 §1.x 执行门控类规则（仅因"长期未触发"退役——执行门控的"未触发"恰证明其有效）
- 规则被 ADR 引用且 ADR 仍为 active 状态

#### 6.4.2 退役前的引用清理清单

退役**必须**按序完成下列步骤，缺一不可：

1. **Grep 引用扫描**：搜索规则编号（如 `§1.13` / `§3.5` / `§6.4`）在 `docs/` 全目录的引用
   ```
   Grep pattern="§1\.13|§3\.5" path=docs/ -r
   ```
2. **更新引用**：将引用指向退役规则的段落改为指向**接替规则**（若有）或加注 `[已退役，见 §6.4.3]`
3. **检查跨文档引用**：特别核查交接文件 / 机制候选清单 / investigation-note / review-closure-report 中的引用
4. **检查评审角色映射表**：若规则在 [reviewer-personas.md §6](reviewer-personas.md) 映射实践表中有记录，同步更新或加注退役
5. **登记退役记录**：在退役规则原位置加注 `> **已退役（YYYY-MM-DD）** — 退役理由：XXX；接替规则：YYY（或无）`，**保留 `<N>` 天**后物理删除（保留期便于误退役回滚）。`<N>` 见 [../core/constitution.md](../core/constitution.md) 项目可调参数 `rule_retire_keep_days`。

#### 6.4.3 退役归档

物理删除时，将退役规则摘要写入 `ARCHIVE.md`（若存在）的"规则退役记录"章节：

| 字段 | 内容 |
|------|------|
| 规则编号 | 如 §1.13 |
| 规则标题 | 如 结论时效性门控 |
| 退役日期 | YYYY-MM-DD |
| 退役判据 | 见 §6.4.1 哪一条 |
| 接替规则 | 编号或"无" |
| 历史源由 | 原规则源由的一句话摘要（保留用于未来相似问题回溯）|

#### 6.4.4 与机制候选清单退休机制的关系

`mechanism-candidates.md`（或等价载体）的 stale entry 清理规则（候选 > 90 天 / 已机制化 > 30 天启动退休倒计时）是**机制候选清单**的退役流程，针对的是"候选机制条目"；本节是**规则文档**的退役流程，针对的是 dev-rules / evidence-governance / project-rules 中的"规则条款"。两者正交，不互相覆盖。

**成熟实践映射**：
- 规则退役流程 ↔ **法律废止程序**（Lex posterior derogat legi priori —— 新法覆盖旧法需明确废止，否则旧法仍有效）+ **代码 dead code 清理**（lint 工具检测未调用代码 + 删除前评估引用）
- 退役保留期 ↔ **Git 分支删除保留期**（deleted branch 可在 reflog 中找回，N 天后 gc）

### 6.5 定期审查机制与退出条件

> **源由**：工作流"重触发轻退出"。审查机制本身也是工作流，若只定义触发条件（每月审查）不定义退出条件，则审查制度自身变成新的永久负担（自指问题）。本节同时定义触发与退出，使审查机制闭环。

#### 6.5.1 触发条件

| 触发条件 | 频率 | 产出 |
|---------|------|------|
| **定期触发** | 默认月度（每月固定日，如每月 2 日） | `docs/project-health-audit-YYYY-MM-DD.md` |
| **事件触发** | 下列任一：①新功能开发结束 ②ADR 状态大规模变更（**≥ `<N>` 份** active → superseded）③外部环境重大变化（如某 CLI 大版本发布） | 同上 |
| **手动触发** | 用户在对话中明确要求 | 同上 |

**审查范围**：
- `docs/` 全目录文档健康度（生命周期标注 / 引用完整性 / 内容时效）
- 规则文档集（dev-rules / evidence-governance / 各 project-rules / reviewer-personas）规则覆盖率与重叠度
- 机制候选清单状态
- 交接文件未完成项表的推进情况

**审查产出**：
- 问题清单（按严重度分级：高-系统性 / 高-局部性 / 中 / 低）
- 根因分析（≥1 条方法论根因）
- 四档优先级执行计划（减法 → 止血 → 机制缺口 → 元规则）

#### 6.5.2 退出条件（审查机制自身的生命周期）

审查机制不假定永久运行。**连续满足下列条件则降级或退役**：

| 条件 | 动作 | 判据 |
|------|------|------|
| 连续两次审查高严重度问题数 **< `<N1>`** | 审查周期从月度降为**季度** | 以基线报告问题数为对比起点 |
| 连续两次审查高严重度问题数 **< `<N2>`**（N2 < N1） | 审查周期从季度降为**半年度** | 同上 |
| 单次审查高严重度问题数 **> `<N3>`** | 触发"治理膨胀"警报，强制执行 §6.4 规则退役流程 + 减法档 | — |
| 审查机制**连续 `<N>` 个月未执行**（含降级为季度 / 半年度后） | 审查机制自身退役，转为**按需触发**（仅事件触发 / 手动触发） | — |

**自指修复声明**：审查机制定义触发的同时必须定义退出条件，避免审查制度自身变成新的永久负担。

#### 6.5.3 与 §6.4 规则退役流程的联动

审查过程中发现下列情况，**必须**触发 §6.4 规则退役评估：

- 规则长期未触发（§6.4.1 第 3 条）
- 规则重叠度过高（§6.4.1 第 4 条）
- 治理膨胀警报命中（§6.4.1 第 5 条）——强制批量评估

审查报告的问题清单中**高-系统性**问题，若涉及规则冗余或冲突，应在下次审查前完成 §6.4 退役流程。

#### 6.5.4 审查报告的生命周期

- 审查报告自身标注 `事件绑定 — 审查机制退役后归档`
- 历次审查报告保留在 `docs/` 根目录（不移动到 archive/），便于趋势对比
- 当审查机制退役（§6.5.2 第 4 条）后，所有历史审查报告移入 `docs/archive/health-audits/`

**成熟实践映射**：
- 审查机制退出条件 ↔ **SRE SLO 错误预算**（预算耗尽则冻结变更，预算充裕则放宽发布节奏）+ **PDCA 循环的 Check 阶段退出判据**（Check 不必无限循环，达到稳定状态后转入 Act 持续维护）
- 治理膨胀警报 ↔ **Code Smell 阈值**（lint 工具设定技术债阈值，超阈值强制偿还）

---

## 本文件的生命周期

- 长期保留：本文件承载跨功能通用规则，不随任一功能开发期结束而删除。
- **维护节奏（重要）**：单一功能开发期间，本文件基本**冻结不维护**——该期间所有新规则先沉淀在该功能的 `project-rules-<功能>.md` 里。只在**子项目基本结束、进入交接期时**，才回顾该功能的 `project-rules`，把其中被证明跨功能通用的规则，迁入本文件。
  - 设计意图：避免在功能开发中途反复改通用层（通用性需要至少一个完整功能周期来验证）；迁移动作集中在功能交界点一次性完成。
  - 迁移判据：某条规则与具体功能无关、且预期会被下一个功能复用，才迁入；仅对当前功能成立的留在原 `project-rules-<功能>.md`，随该文件冻结期删除。
- 扩容条件：在功能交界点按判据追加章节。
- 不做的事：不收录功能专属规则（那些留在对应的 `project-rules-<功能>.md`）；不预写"未来可能用到"的规则；不在单一功能开发中途改动本文件（除非修正明确的错误）。

---

## 修改提示

接入本项目时需替换下列项目取值。

### 一、目录路径替换

| 原项目取值（cline++） | 替换为 |
|---------------------|--------|
| `docs/handoff.md` | 你的交接文件路径（框架默认 `HANDOFF.md` 根目录） |
| `docs/decisions/` 子目录结构（adr / investigation / draft-issue） | 你的决策文档目录结构 |
| `docs/<功能>/` 产品线目录 | 你的各产品线目录 |
| `mechanism-candidates.md` | 你的机制沉淀载体（若无则删除 §3 / §6.4.4 相关引用） |
| `evidence-governance.md` | 你的证据治理文档（同目录 `evidence-governance.md` 示例包） |
| `reviewer-personas.md` | 你的评审角色定义（同目录 `reviewer-personas.md` 示例包，若无则删除 §1.11 / §1.12） |
| `ARCHIVE.md` | 你的归档文件（若不存在则创建或删除退役归档子条款） |
| `project-health-audit-YYYY-MM-DD.md` | 你的审查报告命名 |

### 二、阈值参数替换

所有 `<N>` / `<ratio>` / `<N1>` / `<N2>` / `<N3>` 占位符对应 [../core/constitution.md](../core/constitution.md) 项目可调参数，具体取值见该文件"项目可调参数"区。本示例包不再硬编码具体数值。

涉及参数：`independent_evidence_count` / `negative_conclusion_evidence_count` / `uncommitted_file_threshold` / `long_session_turns` / `context_pressure_ratio` / `proposition_flip_threshold` / `rule_stale_months` / `rule_retire_keep_days`。

### 三、项目专属章节增删

- **若你的项目无多载体并存**：删除 §1.15 不可抗力声明章节（整个子条款）+ §4 载体维度的多选项
- **若你的项目无机制候选清单**：删除 §3 状态值中候选清单枚举行 + §6.4.4 整节 + §6.5 审查范围中候选清单条目
- **若你的项目无评审角色机制**：删除 §1.11 / §1.12 + §6.4.2 引用清理第 4 步
- **若你的项目无定期审查机制**：删除 §6.5（但建议保留——治理膨胀警报是反漂移关键门控）
- **若你的项目非 Windows + PowerShell**：§1.4 已移至假设清单，请按你的 shell 环境在假设清单"修改建议"列填入对应递归列举命令（bash / zsh：`find` / `ls -R`）

### 四、术语替换

| 原项目术语（cline++） | 通用化术语 |
|---------------------|-----------|
| Cline / Cline SKILL | 专项 agent / agent + SKILL |
| TRAE / Cline / 其他 IDE agent | 主 agent / 当前会话 IDE agent |
| codec bug / V6 / context-snapshot plugin / 提取器 / thin-adapter-layer | （项目专属，已删除，详见假设清单） |

### 五、引用路径校对

替换完毕后，使用 Grep 工具扫描本文件，确认无残留 cline++ 项目路径：

```
Grep pattern="cline\+\+|cline/|context-snapshot|search-orchestrator|search-mcp-wrapper|TRAE|codec-bug" path=.governance/examples/dev-rules.md
```

应返回 0 条匹配（假设清单与"修改提示"区允许作为示例说明引用的除外）。
