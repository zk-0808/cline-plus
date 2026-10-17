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

| ADR-007 | `docs/decisions/adr/`（正文） | snapshot 走 registerRule 静态注入，不迁 messageBuilder | 2026-08-04 | 74 天 | 18 个文件 | **前提已被实现体推翻**：`@cline/core@0.0.95` 的 `plugin-sandbox-bootstrap.js` 里 `registerRule` 接受函数式 content（`hasContentHandler:true`），宿主持有 `resolveRuleContent()` 并按需调用——"只在 session 启动求值一次"不成立 | 需重新评估该决策是否仍成立（可能应降级） | blocked |

> **ADR-006 已于 2026-10-17 完成复查**（本地可证部分），`Evidence as of` 与 `Expires if unchanged` 已更新为 2026-10-17 / 2026-11-16，故不在上表。复查记录见该 ADR 文末「Update 2026-10-17」。

## 不需复查（列出是为了让"7 份"这个数字对得上）

| ADR | 来源目录 | 为何不进队列 |
|---|---|---|
| ADR-004 | `docs/decisions/adr/` | 已被 ADR-005 **整体取代**，复查义务随之解除。引用时应引 ADR-005 |
| ADR-008 | `.governance/decisions/adr/` | 未过期（2027-01-09 到期），当前可正常引用 |

---

## 阻塞原因（2026-10-17 修正过一次）

**此前的说法是错的。** 本队列第一版写「本机 `cline` 不在 PATH，取不到权威的 CLI 版本与行为事实」，并据此把 4 份 ADR 标成 blocked。

实际核查（同日）：`cline --version` → **3.0.46**，`Get-Command cline` → `E:\node-global\cline.ps1` —— **它就在 PATH 上**。

误判来自控制台侧：`readEnv()` 用 `execFile('cline', ['--version'])` 直接执行 npm 的 `.ps1` 垫片，Node 不开 shell 时执行不了它，于是以 ENOENT 失败、面板显示「cline 不可用」。我把这个假阴性当成了环境事实，还写进了这份队列。已修（改为经 pwsh 执行该固定命令）。

**修正后的真实阻塞**：不是"没有 CLI"，而是**没有做过取证**。ADR-001/002/004/007 需要的证据大多要跑一次真实会话或查上游 issue，不是一条 `--version` 能给的；ADR-006 那条（`beforeModel` 的入参键名）在 3.0.46 下可以做，但需要启动一次会话 —— 一次会真实花钱、且会写运行期产物的操作，需要人点头。

**仍然不做**：用网页搜索现取现改日期。理由是那会把"检索到的一句话"当成"复查通过"，而 §15 要求的是**复查证据**，不是检索动作本身。

---

## 复查完成后的动作（照 §15 超期处置）

1. 复查通过 → 更新该 ADR 的 `Evidence as of` 与 `Expires if unchanged`，删除本表中的行
2. 复查失败 → 降级为 Hypothesis，登记 Conflict Registry（`docs/evidence-governance.md §19`）
3. 未复查 → 保持 blocked，其结论不得作为新决策论据（`dev-rules.md §1.13`）

---

## 附：ADR-006 的本地自查结果（2026-10-17，不需要外部证据的那一半）

ADR-006 §0 元规则自检第 1 条问的是：「是不是又在造原生已有的轮子？（如：自研 token 阈值判断 / **自研压缩逻辑** / 自研截断策略）」。

**查到一处未答复的缺口**：

| 事实 | 位置 |
|---|---|
| 当前实现用**消息条数比例**判断"这次是不是发生了压缩"：`postMessages.length < preMessages.length * 0.5`，且 `preMessages.length <= 4` 直接不判 | `.governance/plugin/hooks/pre-compact.ts` · `detectCompaction()` |
| 该判断在 `beforeModel()` 里每次模型调用前执行，靠上一次消息数组与当前数组的**长度差**推断 | `.governance/plugin/index.ts` · L394–L407 |
| ADR-005 的 Status 写的是「实现方式部分被 ADR-006 Supersede——compact-observer 改为 **hook 原生 condense 事件**，不做自研 token 判断」 | `docs/decisions/adr/ADR-005-split-compact-from-handoff.md` |
| ADR-006 §1.2 已核实：cline 原生确有 `ContextManager` auto-condense | 本 ADR |

**缺口是什么**：ADR-005/006 要求"改用原生 condense 事件"，实现里没有读任何原生 condense 信号，而是自己按消息数比例猜。它**没有**重犯已被否掉的那类错误（自研 token 估算、`COMPACT_AT_RATIO = 0.75` 阈值都不在了），但"压缩是否发生"这个事实仍是自研推断 —— 正是元规则自检第 1 条列举的"自研压缩逻辑"。

**它需要回答的问题（尚未回答）**：`beforeModel` 的上下文里到底能不能拿到原生 condense 事件/字段？如果能，这条启发式就该删掉；如果不能，就必须把这个理由写下来（证据 + 版本），否则下一个读代码的人会以为这是"已经论证过的选择"。

**为什么不现在就改**：改 `detectCompaction` 会直接改变 hook 的运行时判定（写不写 snapshot），属于行为变更，且"原生信号是否可得"这一前提我没法在本机取证（`cline` 不在 PATH）。所以本轮只把缺口显性化，代码里加了指向本节的注释，不改行为。

### 待决策：`detectCompaction` 怎么处置（三选一，尚未定）

| 选项 | 做法 | 需要什么证据才能定 | 主要风险 |
|---|---|---|---|
| **A** 保持启发式，把理由写实 | 不改逻辑；在 ADR-006 补一次 Update：证明「`beforeModel` 上下文里拿不到原生 condense 事件」，附版本与取证方式 | 一次 CLI 探查：打印 `beforeModel(context)` 的入参键名，看有没有 condense 相关字段 | 若结论写错（其实能拿到），等于用一份自证材料把违规固化下来 |
| **B** 改读原生 condense 事件 | `detectCompaction` 改为读原生字段/事件，删掉比例启发式 | 同 A 的探查，且要确认该字段在 hook 触发时**有值**（不是恒为 undefined） | 判据读不到时会**不再写 snapshot**，PreCompact 机制静默失效；而这个失效恰好是"不报错"的那一类 |
| **C** 删掉检测，PreCompact 触发即写 | 不判断是否压缩，只要 `beforeModel` 被调到就写 snapshot | 需要确认 `beforeModel` 的调用频率与语义（是否只在压缩后调） | 语义变化最大：若 `beforeModel` 每次模型调用都触发，会写成高频覆盖，snapshot 变成"最近一次模型调用"而非"压缩点" |

**倾向 A**，理由：A 不改变运行时行为（零回归风险），且它要求的证据（探查入参键名）恰好也是 B/C 的前置证据 —— 先把事实取到，再谈改法。**在拿到那份探查结果之前，B 和 C 都不该动。**

> **已咨询 ChatGPT（2026-10-17，带 `@GitHub` 读真实文件，思考模式已开，同一对话续问）**：
> **选 A** —— 先不改运行时行为，补齐「原生信号不可得」的实测证据再记录 Update。
> 它给的最大风险是「**把未经验证的不可用写成事实**」，依据是 `detectCompaction()` 按消息数比例猜测、`beforeModel()` 每次模型调用前执行、以及 ADR-006 §0 明确阻塞未经论证的自研压缩逻辑。
> 这条风险与我写 A 的理由正好对上：A 的唯一风险就是那半个证据 —— 所以 **A 的前置动作就是去取证，而不是直接写 Update**。

#### 取证结果（2026-10-17，本地读上游类型定义，零成本）

不需要跑会话：`cline` 已安装，`@cline/*` 包就在磁盘上，直接读它自己的 `.d.ts` 就够了。

| 事实 | 来源 |
|---|---|
| 原生压缩机制**确实存在**：`createContextCompactionPrepareTurn()` 构造 `prepareTurn` 回调，由 agent runtime 在**每次模型请求前**执行压缩 | `@cline/core@0.0.95` · `dist/extensions/context/compaction.d.ts` |
| 原生管线能拿到"为什么压缩"的信号：`overflowRecovery?: boolean`（provider 报上下文超限，强制压缩）、`previousRequestInputTokens?: number`（上一请求的真实输入 token 数，用作下界） | 同上 · `ContextPipelinePrepareTurnInput` |
| **但 `beforeModel` 这条路径被原生 wrapper 明确排除在外**：原文「Known gap: compactions performed via plugin `registerMessageBuilder()` or via the `beforeModel` runtime hook **bypass this wrapper entirely**, so they do not emit compaction telemetry」 | 同上 · 函数注释 |

**结论**：ADR-006 那个悬着的问题有答案了 —— **在 `beforeModel` 这个插件钩子上，拿不到原生压缩事件/信号**，不是"我猜拿不到"，而是上游类型文档明写这条路径 bypass 了 native wrapper，连 telemetry 都没有。

于是：
- 当前用消息条数比例推断压缩，**在"没有原生信号"这个前提下是合理的**（A 选项成立）
- 但它仍然要写进 ADR 的 Update：写清"上游哪一版、哪个文件、哪句注释"证明不可得 —— 这正是 GPT 说的"别把未经验证的不可用写成事实"的反面做法（**带出处的不算猜测**）
- **B 选项（改读原生事件）在 `beforeModel` 上不可行**，除非改成走原生 `prepareTurn` 管线（那是另一种架构，不是小改）

#### 顺带发现：CLI 版本号有三个不同的数字

| 读数 | 值 | 出处 |
|---|---|---|
| `cline --version` | **3.0.46** | 命令行 |
| npm 包 `cline` | **3.0.73** | `E:\node-global\node_modules\cline\package.json` |
| `@cline/*` 依赖 | **0.0.95** | 同上 `dependencies` |

三个数字互不一致。**这影响所有 ADR 的"版本号类"证据口径** —— 说"在 CLI 3.0.46 上成立"和"在 3.0.73 上成立"是两件事。引用 ADR 时必须写清是哪个包的哪个版本，不能只写"当前 CLI"。此事尚未判定哪个才该被当作口径。

**这条决策的取证方式**（需要在能跑 cline 的环境执行）：在 `beforeModel` 里临时 `console.log(Object.keys(context))` 与 `typeof context.messages`，跑一次触发压缩的会话，看原生是否暴露 condense 事件。取证后把键名清单写进 ADR-006 的 Update，再回来选 A/B/C。

### 咨询侧的操作记录（为了下次少走弯路）

要把这条决策交给 ChatGPT 判，必须用 `@GitHub` 让它读真实文件；但插入 GitHub 连接器的那一步只能靠菜单点选。2026-10-17 实测：

| 尝试 | 结果 |
|---|---|
| `button[aria-label*="GitHub"]` | 不匹配（该菜单项的 accessible name 来自文本内容，不是 `aria-label`） |
| `[role="listbox"] button` | 不匹配（插件菜单不是 listbox 角色） |
| `bsk extract --discover` | 只返回两个匿名 `div` 列表，没有可用选择器 |
| 完整 `observe` | **可用**：菜单项以 `button "GitHub Triage PRs, issues, CI, and publish flows"` 形式出现，可点 |

结论：**没有便宜的定位捷径，必须付一次完整 observe**（本流程剩余部分约 1500 token）。下次做这条咨询时预留足够预算，别在中途开始。

