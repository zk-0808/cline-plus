# governance-console

框架的本地控制台：把 `.governance/` 里的开关、参数、层装配和一键安装收在一个页面上，**并让散在各目录的规则文档可导航、可检索、可定位**。

```
node governance-console/server.mjs
```

启动后终端会打印带 token 的地址，用那个地址打开（token 是必须的，见「安全边界」）。

```
governance-console/
├── server.mjs             零依赖 HTTP 服务：token/Origin 防护、静态服务、路由
├── lib/governance.mjs     状态采集 + 变更计划（行级 diff）+ 应用 / 批次 / 还原
├── lib/contract.mjs       从插件源码推导分发给定的 Hook / Capability / 实现文件契约
├── lib/validate.mjs       配置门禁：15 项检查 + 每项独立的阻断策略
├── lib/health.mjs         健康面板：L1–L5 分层检查 + ADR 生命周期 + 记录型门禁
├── lib/docs.mjs           规则文档索引 / 单篇读取 / 条款抽取 / 全文检索（只读）
├── lib/runner.mjs         白名单脚本执行（6 个任务，客户端不能传命令）
├── test/                  51 个用例：门禁 16 + 批次 8 + 契约/UI 3 + 健康 17 + 手动入口 7
└── public/                index.html · app.js · md.js · style.css · paper.css · favicon.svg
```

跑测试（纯 Node，无依赖，每个用例在独立临时 git 仓库里跑）：

```
node governance-console/test/run.mjs
```

---

## 四个视图

| 视图 | 做什么 |
|---|---|
| **控制台** | 开关与一键安装（见下一节）；全部写操作先出计划再落盘 |
| **健康** | 按 L1–L5 + 决策记录 + 记录型门禁分组，逐条报「判什么 / 观察值 / 应满足 / 依据 / 怎么修」；只读，口径见「健康面板（P1）」一节 |
| **规则视图** | 按治理层级（L1 宪法 / L2 规则 / L3 能力 / L4 Hook / 参考包 / 决策记录 / 元规则 / 运行期入口）列出全部规则文档；点开即在页内渲染，右侧是本文目录；每份文档标注 **章节数 / 被引用次数 / 是否孤儿 / 是否有生命周期标注** |
| **条款索引** | 从宪法、`docs/dev-rules.md` §1.x、`docs/evidence-governance.md`、`docs/PROJECT_DEV_OUTLINE.md`、`.governance/rules/` 里**机械抽取**条款（编号 / 标题 / 摘要 / 标签 / `文件:行号`），可过滤、可一键定位到原文那一行 |

顶栏检索框跨全部治理文档做子串检索（`/` 聚焦），命中结果按文档分组，点进去直接渲染。

**健康、规则视图与条款索引都是只读的**：不写任何文件，不改写原文措辞，抽取结果只做聚合与截断。它们不是新的权威源——判断以原文档为准。

视图可直接深链：`?view=health` / `?view=docs` / `?view=clauses`（与 `?theme=paper` 同理）。

---

## 两套外观（同一份功能）

顶栏右侧的「纸本 / 石墨」按钮即时切换，**只切换 stylesheet，不改任何逻辑与 DOM 结构**，因此两套外观跑的是同一份功能、同一套 API。

| 外观 | 文件 | 定位 |
|---|---|---|
| **石墨仪表台** | `public/style.css` | 早期版本。深色、青绿强调、卡片式 |
| **审计纸本**（样张） | `public/paper.css` | 暖白纸面 + 墨色 + **唯一赭红强调**；衬线标题（本地字体栈）、账本式表格（无竖线）、细线分节代替卡片盒 |

纸本方向的设计原则：**层级靠字重 / 字距 / 留白 / 细线，不靠阴影、渐变、发光、彩色填充**；但**操作区不能因此变弱**——开关、主按钮、风险提示、diff、回滚入口都有明确的对比度与形状差别，不藏在低对比细线里。

默认仍是石墨（不改动既有观感）。想直接看纸本：

```
http://127.0.0.1:7717/?t=<token>&theme=paper
```

或点顶栏按钮（选择写入 `localStorage`）。

**无外部字体**：标题走 `--p-serif`（Source Serif 4 → Noto Serif SC → Songti SC → SimSun → Georgia），正文 `system-ui`，路径与行号等宽。如果本地衬线回退（Windows 上的宋体）在标题上观感不佳，把 `paper.css` 里 `--p-serif` 的值改成 `var(--p-sans)` 即可整体退回无衬线标题——这是唯一一处需要按机器微调的地方。

### 为什么要有「孤儿」这个标记

它统计「没有任何其它文档链接到它」的治理文档。这类文档要么是入口式的样板（如 `examples/`），要么是真的被写完后没人再引用。这个数字本身是审计信号，不是页面装饰。

---

## 它控制什么（全部是既有权威文件，不新增配置）

| 页面区块 | 写入目标 | 权威定义 |
|---|---|---|
| Hook 启停（5 个） | `.governance/hooks/config.json` → 各 hook 的 `enabled` | `delivery-framework-design.md §四` 加载顺序 |
| Capability 启停 + 参数 | 同一份 `config.json` → `capabilities.*.enabled` / `args` | 同上 · `§三` 各目录契约 |
| 宪法可调参数（8 项） | `.governance/core/constitution.md` 底部「项目可调参数」表 | 宪法自身声明：*其他项目接入时改此处即可，不动判定动作* |
| 装配预设（5 个） | 移动目录到 `runtime/console-disabled/` + 关闭对应 hook | `delivery-framework-design.md §五` 删除矩阵 |
| 一键安装 | 执行 `scripts/sync-governance-plugin.ps1` 等 | 脚本本身 |

**控制台不持有任何状态。** 每个开关背后都是你随时可以用编辑器手改的文件；这里只是加了一层带 diff 预览与安全备份的操作面。

---

## 四条与仓库治理纪律一致的设计约束

**1. 先出计划，再落盘。**
点任何开关都不会立刻改文件——先生成一份计划，抽屉里给出**行级 diff**、**门禁结论**、副作用提示与可选还原批次，确认后才写。

**2. 「删除矩阵」实现为可逆的停用。**
`§五` 原文是「删什么」，但不可逆的删除不该由一次误点触发。所以预设的实际动作是**把目录移进 `runtime/console-disabled/<batch>/`**，并在 `runtime/console-batches/<batch>.json` 留清单；「变更批次 → 还原」把它整体移回去。停用区与备份区是同一个机制。

**3. 计划带乐观并发控制。**
计划里记录每个被改文件的 `before` 哈希，**以及每个待移动目录的内容指纹**（相对路径＋内容一起哈希）。应用时若磁盘状态已变（你手改了、或另一个终端改了、或往待搬的目录里加了文件），计划**作废并要求重新生成**，绝不静默覆盖、绝不照搬已过期的目录。

**4. 落盘前必须过配置门禁，而且门禁在服务端。**
计划自带校验结论；`applyPlan` 会**在写第一个字节之前重新校验一遍**，`blocking` 时直接拒绝。前端禁用按钮只是体验，不构成约束——绕过 UI 直接打 API 也过不去。见下一节。

---

## 配置门禁（`lib/validate.mjs`）

### 它判定什么

判定对象是**拟议的完整状态**，不是单个输入值：先在内存里算出「应用之后的样子」（配置文本 + 各层是否还在 + 各 Capability 是否还有实现），再整体校验。因为一次预设会同时改文本、搬目录，只看单个值的校验会漏掉「目录没了但配置还声称有」这类组合故障。

### 状态与阻断是两件事

`status` 说的是**事实**，`blocking` 说的是**策略**，两者分开定义、逐条登记在 `POLICY` 表里：

| status | 含义 |
|---|---|
| `pass` | 满足 |
| `fail` | 违反硬约束 |
| `warn` | 可疑但合法 |
| `unknown` | **读不出来**，不是「通过」 |
| `not_applicable` | 该检查在当前装配下不适用（例如 `capabilities/` 已停用时，静态导入检查自然不适用） |

`unknown` 与 `not_applicable` **永远不会被折成 `pass`**。是否阻断取决于该项的安全要求，而不是它的状态名：

- 读不出**拟议的 `config.json`** → 阻断。理由是 `.governance/plugin/config-loader.ts` 的 `loadConfig` **在解析失败时不报错**，而是 `console.warn` 后静默回落到 `DEFAULT_CONFIG`——也就是「你以为关掉的，其实全按默认开着」。这种失败模式必须在上游拦住。
- 读不出 **ADR 的复查日期** → 不阻断与它无关的操作。（该项检查放在健康面板，不在配置门禁里。）
- 读不出**分发契约**（`types.ts` 缺失）→ 改 Hook/Capability 时阻断，只改宪法参数时不阻断。

### 契约从源码推导，不维护名字白名单

框架明确允许用户新增 Capability（`delivery-framework-design.md` 契约表：capabilities 一层「可删除 ❌／可扩展 ✅」）。因此校验器里**不能存一份 Capability 名称白名单**——那会把「加了自己的 Capability」判成配置错误，属于把扩展性误判成缺陷。

契约的唯一来源是分发器自己：

| 来源 | 得到什么 |
|---|---|
| `.governance/plugin/types.ts` · `interface HooksConfig` | 有哪些合法顶层 Hook 键 |
| `.governance/plugin/types.ts` · `DEFAULT_CONFIG` | 每个 Hook 声明了哪些 Capability、各自声明了哪些参数 |
| `.governance/plugin/**/*.ts` · `*.capabilities.<key>` 读取点 | 哪些键**真的会被执行**（排除 `verify-governance.ts`，它是验证脚本不是分发器） |
| `.governance/plugin/**/*.ts` · `from "../capabilities/<dir>/index.js"` | 哪些实现文件**必须存在于磁盘**（静态导入解析不了 = 插件加载直接失败） |
| `.governance/capabilities/*/` | 磁盘上的实现目录（用于发现无分发者的孤儿模块） |

所以「新增一个 Capability」的完整动作是**三件事**：建目录 + 在 `DEFAULT_CONFIG` 声明 + 在 `hooks/*.ts` 里读取。只建目录不算——本框架的分发是静态导入，不是运行期扫目录。校验器把这个事实如实报告，并给出一条可执行的 fix，而不是假装目录存在就等于接线完成。

### 15 项检查

| 检查 | 判什么 | 状态即策略 |
|---|---|---|
| `CONFIG_PARSE` | `config.json` 可解析、顶层是对象 | fail→**阻断**；`hooks/` 已停用时为 n/a |
| `HOOK_KEY_UNDECLARED` | 顶层键在 `HooksConfig` 里有出处 | warn |
| `CAP_KEY_UNDISPATCHED` | 启用的 Capability 能被分发器解析 | 启用中→**阻断**；已关闭→warn |
| `CAP_DECLARED_NOT_CONSUMED` | `DEFAULT_CONFIG` 的声明有对应读取点 | warn |
| `CAP_ARGS_UNDECLARED` | 参数键在 `DEFAULT_CONFIG.args` 里声明 | warn |
| `CAP_SHARED_ARGS_DIVERGE` | 同一 Capability 跨 Hook 取值一致 | warn |
| `HOOK_NO_CAPABILITY` | 启用的 Hook 有可执行的 Capability | warn |
| `SKIPTOOLS_UNKNOWN` | `skipTools` 每个名字都能在仓库自有清单里找到出处 | warn |
| `CAP_IMPL_BROKEN` | 分发器的静态导入都能解析到文件 | fail→**阻断**（有 Hook 启用时） |
| `CAP_ORPHAN` | 没有「谁都不调」的 Capability 目录 | warn |
| `MUST_KEEP_MISSING` | 必需层（`.clinerules` / `core` / `runtime`）在拟议状态中仍存在 | fail→**阻断** |
| `PRESET_CONTRACT` | 预设履行它自己的删除契约（该停用的停了、该留的留了） | fail→**阻断** |
| `PARAM_RANGE` | 8 个宪法参数落在语义边界内 | fail→**阻断** |
| `PARAM_MISSING` | 参数表包含全部已知参数 | warn |
| `PARAM_DIVERGENCE` | 同一事实的两处取值一致（宪法阈值 ↔ `gitChecker.threshold`） | warn |

**`PRESET_CONTRACT` 判的是「预设有没有履行它自己的契约」，不是「是否符合最全配置」。** 「不用 Hook」和「只用宪法」是 `§五` 写明的合法装配，必须判 `pass`。把合法预设判成非法，比漏判更糟——那会让用户不敢用预设。

### 阻断时零副作用

`applyPlan` 的顺序是：门禁复核 → 文本并发检查 → 目录指纹复核 → 目标冲突检查 → 才开始写。`blocking` 时直接返回 `{ error: 'BLOCKED', validation }`，**磁盘、目录、批次清单、备份目录都没有被碰过**。`T22` 用整棵仓库树的哈希快照验证这一点，不只看某一个文件。

### 门禁在真实仓库上立刻发现了 3 件事

不是测试造出来的，是跑一遍当前状态就出来的：

1. `config.json` 里有个 `tracing` 块，但 `HooksConfig` 没有这个键，`index.ts` 也没读它——追踪路径与开关其实是写死在 `index.ts` 常量里的，这个块目前**不产生任何效果**。
2. `skipTools` 里的 `glob_file_search` 既不在 `DEFAULT_CONFIG.skipTools` 也不在 `WRITE_TOOL_NAMES`，`docs/handoff.md §3` 的工具名变更记录里也没有它（其余 7 个都在）。要么是漏同步，要么是拼写错误——写错的名字不会匹配任何工具，等于白名单没生效。
3. `capabilities/rule-appender/` 与 `capabilities/staleness-sweeper/` 都没有分发路径——**注意不是"重复实现"**：两者都是完整实现（后者导出 `stalenessSweeper()` 并 import 了 `staleness-utils` 的 `calcStalenessWeight`），只是没有任何 hook 或脚本调用它们，而注释/文档写的是「可手动运行」。留着会被误认为「已经生效」。

这三条都是 `warn`，不阻断——它们不构成落盘风险，但不该继续隐身。

---

## 健康面板（P1）

### 与配置门禁的分工

| | 配置门禁（`validate.mjs`） | 健康面板（`health.mjs`） |
|---|---|---|
| 判什么 | **这次写入能不能落盘**（拟议状态） | **仓库此刻处于什么状态**（磁盘现状） |
| 有无阻断权 | 有（`blocking` 时 `applyPlan` 拒绝） | **没有**，也不给这个字段 |
| 何时跑 | 每次生成/应用计划 | 打开视图或点「重新检查」 |

两者共用同一套状态词表（`pass / fail / warn / unknown / not_applicable`），所以同一件事在两个地方的颜色含义一致。

### ADR 分散在两棵目录树（先说这个，否则下面的数字都会读错）

ADR 不在一个目录里：

| 目录 | 内容 |
|---|---|
| `docs/decisions/adr/` | 项目决策：ADR-001 / 002 / 004 / 005 / 006 / 007 |
| `.governance/decisions/adr/` | 框架决策：ADR-007（另一份副本）、ADR-008 |
| `docs/archive/decisions/` | ADR-003（rolled-back）、第二个 ADR-002 |

而 `.governance/decisions/adr/README.md` 已经把这件事写死了：**编号序列跨两目录共享，不许按目录分别计数，任何 ADR 计数或交叉引用都必须写明来源目录**（2026-10-14 实测）。

面板最初只扫 `docs/decisions/adr/`，于是报出「6 份 ADR」——**正是仓库明令禁止的那种数法**，还漏掉了唯一没过期的 ADR-008。现在两棵树都扫，每条检查都带 `来源：<目录>`，汇总按目录拆分，并新增 `DR-DUPLICATE` 报同编号多副本。

### ADR 生命周期：三个正交维度 + 一个派生显示态

ADR 的「该不该复查」不是一个枚举能表达清的，所以拆成三个互相独立的维度：

| 维度 | 取值 | 依据 |
|---|---|---|
| **时效** `expiry` | `valid` / `expired` / `unknown` | `Expires if unchanged` 与今天比较 |
| **取代** `supersession` | `none` / `partial` / `full` / `unknown` | `Status` 文本 + `Superseded-by`；**出边的 `Supersedes` 不算**（我取代了谁 ≠ 我被取代） |
| **复查义务** `review` | `done` / `pending` / `not_required` / `unknown` | 过期后 `Evidence as of` 是否晚于 `Expires if unchanged` |

派生显示态互斥，优先级从高到低：

| 显示态 | 何时 | 面板状态 |
|---|---|---|
| `superseded` | 被**整体**取代 | pass —— 状态明确、结论已移交，不是缺陷 |
| `unknown` | 字段读不出 | unknown —— **不能当作有效** |
| `expired` | 日期已过，仍是在效决策 | fail —— 复查前其结论不得作为新决策论据（`dev-rules.md §1.13`） |
| `reverify` | 自己日期没到，但依赖的 ADR 已过期/被取代 | warn —— 引用前先核实上游变化 |
| `due` | 7 天内到期 | warn —— 排入本月复查（`evidence-governance.md §19.5`） |
| `current` | 在时效内 | pass |

**整体被取代是唯一允许豁免复查义务的情形**：取代它的那份已经接管了结论，再去复查一份已作废的文件没有意义。其余情况（包括"部分被取代"）一律保留复查义务 —— 这一条专门写了用例 `H06` 盯住，因为"复查义务被错误豁免"是这套建模最容易犯的错。

真实仓库当前读出：**6 份 ADR，5 份过期（已过 74–86 天），1 份整体被取代**。`ADR-004` 是那份被取代的，所以它**不占**复查义务，也不该和另外 5 份混成一种颜色。

### 记录型门禁：没有记录不能显示成通过

`scripts/check_links_anchors.py` 这类检查的结论**无法由面板重算**——它只能证明"某个时刻真的跑过一次"。所以：

- 运行结果追加到 `.governance/runtime/gate-log.jsonl`（`at` / `task` / `commit` / `exit` / `durationMs` / 摘要 / 机读计数）
- 面板读**最后一条**：没有记录 → `unknown` 并写明「未运行不等于通过」；有记录 → 才按退出码判 pass / fail
- 该文件在 `.gitignore` 覆盖范围内：它是**本机运行记录**，不是仓库事实。换一台机器就是"未运行"，这是对的

点健康页的「运行链接门控」即可跑一次并留下记录。

### 记录型门禁现在有两条

| 门禁 | 跑什么 | 跑通证明了什么 | 不证明什么 |
|---|---|---|---|
| `GATE-LINKS` | `python scripts/check_links_anchors.py` | 全仓 Markdown 的相对链接与标题锚点零失效（归档区按 §1.17 豁免） | 不检查外部 URL 是否可达 |
| `GATE-VERIFY` | `node --import ./scripts/ts-js-resolve.mjs .governance/plugin/verify-governance.ts` | 插件分发逻辑 50 项断言全过：config 加载与深合并、handoff 注入、git-checker、pre-tool 阻断与 skip、compaction 检测、snapshot 写入、分发聚合 | **它直接调 Capability 函数，不经过 Cline**；通过 ≠ Cline 真的触发了 hook |

两条**各读各的记录**：只有 `GATE-LINKS` 的记录时，`GATE-VERIFY` 仍显示「未运行」——不会因为"隔壁绿了"就变绿。`H14` 专门盯这条。

### 为什么要一个 TS loader

仓库的 TS 源码按 tsc 习惯写 `.js` 说明符（`from "./types.js"`），而 Node 的原生类型剥离**只擦除类型、不改写说明符**。结果 `verify-governance.ts` 的文档写着 `node --experimental-strip-types …`，实际一跑就 `ERR_MODULE_NOT_FOUND` —— 又一处"文档写的比能力多"。

`scripts/ts-js-resolve.mjs` 只做一件事：解析失败时把 `./x.js` 换 `./x.ts` 再试一次。不改变语义、不注入全局。两种用法：`node --import ./scripts/ts-js-resolve.mjs <file.ts>`，或在入口里 `ensureTsLoader()` 后再动态 import（手动入口用后者，所以调用方不必记旗标）。

顺带修掉的两处：

- `verify-governance.ts` 的 T4 原先跑在"当前工作区"上，**未提交文件数一变它就挂**——门禁变成了环境的函数。现改为在独立临时 git 仓库里构造确定的 dirty 数，并补上此前从未测过的**阻断分支**（dirty ≥ 阈值 → skip=true）。
- `rule-appender/test.ts`（33 项断言）同样从"跑不起来"变成可执行。

### 检查清单

| 层 | 检查 | 判什么 |
|---|---|---|
| L1 | `L1-PARAMS` | 8 个宪法参数齐备且在语义边界内 |
| L1 | `L1-FILES` | `constitution.md` 与 `rubric.md` 都在 |
| L1 | `L1-SIZE` | 宪法 ≤800 token（**没有分词器就报 unknown，不编数字**） |
| L2 | `L2-PRESENT` / `L2-THIN` | 入口规则存在；每份 ≤50 行（薄度量化） |
| L3 | `L3-IMPL` / `L3-ORPHAN` | 分发器静态导入可解析；没有无分发者的目录 |
| L4 | `L4-CLINERULES` / `L4-CONFIG` / `L4-DISPATCH` | 加载入口有效；`config.json` 可解析；启用的 Capability 有人读取 |
| L4 | `L4-PLUGIN` / `L4-MARKER` | 插件已装到 Cline 发现路径；`plugin-loaded.marker` ≤7 天 |
| L5 | `L5-TRACES` / `L5-SNAPSHOT` | 轨迹有近期记录；`snapshot.json` 是**实例**而不是 schema |
| DR | `ADR-*` / `DR-DUPLICATE` / `DR-QUEUE` / `DR-SOURCE-KIND` / `DR-SUMMARY` | 每份 ADR 的生命周期（**两棵目录树都扫，并标明来源目录**）；同编号重复；时效类别字段；总体时效状况（按目录拆分） |
| GATE | `GATE-LINKS` / `GATE-VERIFY` | 链接锚点门控、插件逻辑自检的上次运行结果（各读各的记录，互不顶替） |

每条检查都带 `ruleRef`（仓库里的文件 + 章节），写不出出处的检查不该存在——否则面板就在发明标准。

### 这一轮读出来的 6 个问题（前 3 个已修）

不是测试造的，是跑一遍当前仓库就出来的：

| # | 问题 | 状态 |
|---|---|---|
| 1 | **`snapshot.json` 放的是 JSON Schema，不是快照实例。** 该路径同时是读写路径：`snapshot-writer` 往这里写实例、`handoff-provider` 从这里读实例。读到 schema 时 `schema_version` 是 `undefined`、`decisions` / `active_todos` 都取不到 —— **不报错，只是 SessionStart 注入的 Snapshot 段静默变空** | ✅ 已修：schema 移到 `.governance/capabilities/snapshot-writer/snapshot.schema.json`，`runtime/snapshot.json` 改为生成物不入库；面板对它报 `not_applicable` 而非「通过」 |
| 2 | **`rules/lifecycle.md` 有 108 行**，而 §四 的薄度量化要求每份入口规则 ≤50 行 | ✅ 已修：拆成入口（49 行）+ 详版 `docs/developer-guide/staleness-internals.md` |
| 3 | **`rule-appender` / `staleness-sweeper` 没有调用路径**：两者都是完整实现，但没有 hook 分发、`scripts/` 里也没有任何入口，而宪法 §5、`lifecycle.md` 晋升流程、`capabilities/README §七` 都按「已生效」口径写"rule-appender 机械追加" | ✅ 已补：新增 `scripts/governance-capability.mjs` 统一手动入口（白名单 + 默认干跑 + 写前备份 + 拒写权威文件区）；`staleness-sweeper` 因 `.js` 值导入在无构建步骤时加载失败，入口如实报「不可执行」并给原因 |
| 4 | **5 份 ADR 已过复查期**（74–86 天），`dev-rules.md §1.13` 规定未复查就不得作为新决策论据；本机无 `cline`，取不到外部证据 | 🟡 已建 `docs/decisions/adr/REVIEW-QUEUE.md`（逐条写「需要什么证据/卡在哪」、状态 blocked），并加 `DR-QUEUE` 检查保证队列与面板的过期集合一致。**复查本身未做** |
| 5 | **`evidence_source_kind` 7 份全缺**。但 §15 原文写的是「新增 ADR 必填，存量 ADR 在下次 Update 时补」——**存量缺失是规则自己给的宽限，不是违规**，所以只报 warn。判 fail 就等于把规则的宽限条款读漏了 | ⏳ 下次改 ADR 时补 |
| 6 | **`traces.jsonl` 最后一条在 100 天前**，`plugin-loaded.marker` 是 103 天前——hook 机制在这台机器上已经很久没真正跑过 | ⏳ 需在本机跑一次 `cline -i` 验证链路 |

三处修复的口径都先问过 ChatGPT（带 `@GitHub` 让它直接读仓库，不是让它信我的转述）：① 选 A「schema 移独立文件」；② 保留 ≤50 行阈值、精简文件而不是放宽规则；③ 选 A「补统一手动入口」而不是改文档或删模块——它同时点出最大风险是「参数校验或权限边界不足导致治理文件被错误修改」，所以入口做成：**白名单登记 + 默认干跑 + 可写目标逐字限定 + 权威文件区拒写 + 写前备份**。

---

## 变更批次与还原

每次应用产生**一个批次目录**：`.governance/runtime/console-disabled/<batch>/`，文本备份与目录移动都落在同一个基址下，清单写在 `.governance/runtime/console-batches/<batch>.json`。

清单记录：`batch` / `at` / `opKind` / `preset` / `backupRoot` / `layersBefore` / `layersAfter` / `validation`（门禁结论与各项计数）/ `ops`（每项操作的类型、原路径、移动目标、文件数）。

**还原顺序是先移回目录、再覆盖文本**：停用 `hooks/` 时 `config.json` 是被改过之后才随目录搬走的，先移回会把「改过的」带回来，随后由文本还原覆盖成原始内容。

路径解析只有一处事实来源：每项操作自己的 `movedTo`（文本备份用清单里的 `backupRoot`）。`listBatches` 与 `restoreBatch` 用同一套解析——早先它们一个用 `batch` 名拼路径、一个用 `movedTo`，导致 UI 把可还原的批次显示成不可还原（按钮禁用、实际能还原）。这是最不该出错的地方，`T24` 专门盯老清单的兼容。

还原成功后：目录回原位、文件内容回到应用前、`console-disabled/` 清空并删除（不留空目录）、清单保留但标 `restored: true`。有跳过项时**保留全部备份**，避免「备份被删、故障还在」。

---

## 这个控制台证明了什么，没证明什么

它证明：**配置变更可审计、可还原、落盘前有门禁**。每一条都有对应的自动化用例。

它**没有**证明：「这套治理框架提升了 agent 的成功率」。那是另一个问题，需要单独的对照实验（有框架 / 无框架，同一批任务，同一套判据）。控制台的测试只能证明控制台自己是对的，不能替框架背书——把这两件事混成一件，是这类项目最常见的过度声明。

---

## 安全边界（这个工具能改文件、能跑脚本，所以必须写清）

- **只绑 `127.0.0.1`**，不监听外网
- **所有 API 需要 token**：启动时随机生成，注入页面；不带 token 的请求一律 401
- **跨站防护**：校验 `Origin` 与 `Sec-Fetch-Site`，挡住其它网页对你本机服务的调用（DNS rebinding / CSRF）
- **静态文件白名单**：只服务 5 个文件名，无目录穿越
- **文档读取白名单**：`/api/doc` 只接受 `.governance/` / `docs/` / `governance-console/` 前缀与三个根文件，解析后再次校验必须落在仓库根内（`../../etc/passwd`、`C:\...`、`.git/config` 一律拒绝）
- **脚本执行只认白名单**：`lib/runner.mjs` 里 6 个任务，客户端只能传 `taskId`，不能传命令；`--no-exec` 可整体关闭
- **破坏性任务二次确认**：重置安装会删掉本地插件副本再重建，前端强制 `confirm`
- **渲染不执行原始 HTML**：`public/md.js` 先把整段文本转义再套标签，文档里写 `<script>` 只会显示成文字

---

## 参数

```
--port <n>     监听端口（默认 7717）
--repo <path>  仓库根（默认当前目录，须含 .governance/）
--no-exec      禁用脚本执行；配置编辑与状态查看仍可用
--help
```

---

## 已知局限

- **它是把现有契约做成界面，不是新的权威源。** 页面上的中文说明与阈值理由若与 `dev-rules.md` / `constitution.md` 冲突，以文件为准。
- **门禁证明的是「配置可靠」，不是「治理有效」。** 见下一节。这两件事不能互相替代。
- **健康面板没有阻断权**，也不该有：它描述状态，不拦截操作。拦截是配置门禁的事。
- **健康检查里有 1 项天生是 unknown**：宪法 ≤800 token 这条，仓库没引入分词器，给不出权威 token 数。宁可报 unknown 也不估一个数字冒充结论。
- **记录型门禁的记录是本机的。** `gate-log.jsonl` 在 `.gitignore` 里，换机器/换克隆就是「未运行」。这是有意为之：本机的运行结果不该冒充仓库事实。
- **ADR 解析认两种写法**（§15 模板的 YAML snake_case、实际文档的 Markdown 粗体标签），但仍是按字段名匹配。若把字段改成别的措辞，会落到 `unknown` —— 不是静默通过。
- **配置门禁只覆盖配置层，不覆盖运行期。** 它不会去探测 Cline 实际有没有调到你开的 Hook——那要读 `runtime/traces.jsonl` 与 `plugin-loaded.marker`，在健康面板里。
- **契约推导依赖源码的书写形式。** 它认的是 `types.ts` 的 `interface HooksConfig` / `DEFAULT_CONFIG` 对象字面量，以及 `*.capabilities.<key>` 与相对 import 这两种写法。若把配置读取重构成变量间接引用（如 `caps[key].enabled`），推导会读不到——那时该项退化成「未声明」，仍是 warn 级提示，不会静默判通过。
- **目录内容指纹算的是「路径＋内容」**，能发现「计划生成后目录被改过」，但不告诉你改的是什么。
- **不校验 Cline 端实际行为。** 它读 `.governance/runtime/plugin-loaded.marker` 判断 SessionStart 是否跑过，但 marker 陈旧只说明"没刷新"，不定位原因；真正定位要按 `plugin-dev-sop.md §2` 读源码。
- **单用户本地工具**，没有多会话隔离与权限模型。多人共用一台机器时不要开。批次清单里只有「某次操作及其时间」，**没有操作人身份**——不要把它当成能追责到人的审计日志。
- **装配预设只处理 `§五` 列出的 5 种组合**，更细的裁剪请直接删目录——那时 Git 就是你的还原机制。
- **条款抽取是机械规则，会有误读。** 摘要取「判据 / 执行门控 / 违反时」等标签字段的第一条，取不到才退回首段；它给的是**入口**，不是条款全文。看条款请看原文（每条都带 `文件:行号`）。
- **「被引用次数」只统计仓内相对链接**，不含外部引用，也不区分「引用」与「反向引用同一个无关段落」。
- **渲染器只覆盖治理文档实际用到的语法**（标题 / 列表 / 表格 / 围栏代码 / 引用 / 行内格式），不支持脚注、HTML 内嵌、Mermaid 等。
