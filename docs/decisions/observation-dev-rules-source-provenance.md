# Observation — dev-rules.md 源由归档

> **生命周期**：事件绑定 — dev-rules.md 规则条款退役/重写时归档（按 [dev-rules.md §6.4.2](../dev-rules.md) 引用清理清单维护）。
>
> **范围**：收纳 dev-rules.md §1.x / §4 / §5.1 / §6.3 各条款的**源由段落**（历史事故叙事 + ADR 引用），作为规则正文的考古层。规则正文（判据/动作/禁止条款/成熟实践映射/不可抗力声明表/解除流程）仍保留在 dev-rules.md，本文件不重复。
>
> **使用方式**：dev-rules.md 各条款尾部以"源由：见 [本文件 §X.Y](observation-dev-rules-source-provenance.md#§xy)"指针引用，正文不再复述事故叙事。
>
> **归档动机**：降低规则正文与考古层的耦合（high cohesion / low coupling）。规则条款零改动，仅源由外迁。判据见 [dev-rules.md §6.4.1](../dev-rules.md) 退役判据——执行门控类规则不因"长期未触发"退役，故条款一条不动，仅源由可外迁。

---

## §1.2 cline 交互式会话需真实终端（TTY）

源由：P5 Spike 实跑（2026-06-26，`experiments/p5-spike/run-p5-capability-spike.md §7 教训 2`）。

---

## §1.3 阴性结论须先排除验证方法错误

源由：P5 Spike No-Go 误判（2026-06-26，`run-p5-capability-spike.md §7 教训 1`——`config plugins` 的 `-c` 参数语义误解导致假阴性，连带"官方样例也失败"的伪交叉验证）。

---

## §1.4 Windows 文件核查必须用 PowerShell `Get-ChildItem -Recurse`

源由：ADR-002 Update 2 核查事故（2026-06-27）——Glob `saoudrizwan.claude-dev-*\package.json` 零命中，LS `.vscode\extensions` 因 40000 字符截断只显示部分目录，`extensions.json` 注册表未同步，三个工具同时失效导致假阴性结论"VS Code 扩展未安装"，实际已安装 3.89.2 + 4.0.0 两个版本。

---

## §1.5 权威源与独立证据

源由：ADR-002 Update 1 用 CHANGELOG 回答"是否支持"（错误——CHANGELOG 回答"何时引入"）；Update 4 用官方文档直接裁决源码冲突（碰巧正确，但下次官方文档错误时会再颠覆）。

---

## §1.6 关键结论双来源验证

源由：ADR-002 Update 1/2/3 都基于单一来源下结论（CHANGELOG / minified 代码 Grep），导致连续颠覆。

---

## §1.7 Minified Code 使用边界

源由：ADR-002 Update 2 把 minified 第 543 行 `registerMessageBuilder` 误判为 zod schema 解析（实际是真实实现）；Update 3 把 DGu 函数的 `pluginName` 误判为安装路径（实际是运行时路径解析）。

---

## §1.8 Evidence Collapse 门控（证据冲突停机）

源由：ADR-002 Update 2/3 都在 minified 代码 Grep 里打转，未升级到官方文档或实测，导致连续颠覆。

---

## §1.9 Direction Drift 门控（方向偏离运行时检测）

源由：ADR-002 Update 1/2 期间用户察觉方向偏离但未能掰回——用户在质疑能否复用到插件，调研却持续在 CLI 载体上推进。

---

## §1.10 Core Proposition Flip 门控（核心命题翻转停机）

源由：ADR-002 Update 1→2→3→4 连续 4 次颠覆，核心命题"VS Code 扩展是否支持 plugin"翻转 3 次（不支持→支持→不支持→支持），未触发工作流审查。

---

## §1.11 评审角色调用门控

源由：2026-06-27 外部评审反馈——AI agent 设计工作流时容易"重新发明轮子"。本次自创"证据治理"概念，实际 EBSE（Evidence-Based Software Engineering）、RCA、ADR 等已有成熟方法可直接借鉴。

---

## §1.12 子代理调用必须注入评审角色提示词

源由：用户 2026-06-27 指示"用户要求 loop 时把自行把提示词注入给子代理"——避免每次都要用户提醒，主 agent 应自动按 §1.11 触发条件识别角色并注入。

---

## §1.13 结论时效性门控

源由：2026-06-27 [ADR-002-p5-experiment-exit-review §2.4](../archive/decisions/ADR-002-p5-experiment-exit-review.md) 引用"社区无 Plugin 实战沉淀"（2026-06-23 形成于 ADR-002 Context §5）作为舍弃 P5 论据，未复查——4 天后该结论已被 5 类反证证伪。

---

## §1.14 "无 X"类结论门控

源由：2026-06-23 [plugin-dev-quick-reference.md §0](../plugin/refs/plugin-dev-quick-reference.md) 仅基于"搜博客"单一证据类型下"社区无 plugin 实战经验"结论，未查 npm/GitHub/官方 examples/Marketplace 任一独立证据源。

---

## §1.15 执行环境可用性门控（不可抗力声明）

### 源由 1：VS Code 扩展 v4.0.x plugin 系统不可用

2026-06-28 VS Code 扩展 v4.0.0 bootstrap 缺失 → v4.0.1 官方回滚到 pre-SDK 代码基 → v4.0.2 继承回滚，Plugin 系统在 VS Code 端完全不存在。CLI 端为唯一可用运行环境。完整证据链见 [investigation-note-vscode-bootstrap-missing.md](investigation/investigation-note-vscode-bootstrap-missing.md) + [D-2026-06-28-cline-v401-sdk-rollback.md](D-2026-06-28-cline-v401-sdk-rollback.md) + [design.md 不可抗力声明](../plugin/design.md)。

### 源由 2：CLI 3.0.34 codec bug

2026-06-30 用户报 `Error: n.content.map is not a function. (In 'n.content.map(eK)', 'n.content.map' is undefined)` 三次（duckduckgo 超时 / run_commands 843+ 行 / read E:\cline++\docs 后）。源码定位见 [investigation-note-cli-codec-content-map-bug.md](investigation/investigation-note-cli-codec-content-map-bug.md)。

---

## §4 方向启动门控

源由：ADR-002 Update 1/2 调查方向偏离事故（2026-06-27）——用户要求"调查 cline 的原生能力，handoff 与 compact 结合等都是基于插件说的"，调研却偏离到 CLI 载体，中间用户察觉不对劲但未能掰回。用户明确要求："以后启动大方向时，把开发指向的对象明确出来让我确认。"

---

## §5.1 `docs/decisions/` 命名规范与路径约束

源由：2026-07-03 项目整理——`docs/decisions/` 根目录曾散落 24 个文件，缺乏聚类导致每次查找需在全目录扫描。按类型聚类后根目录降至 5 个文件（README / ARCHIVE / schema / observation / 跨功能 D 决策）。

---

## §6.3 强制检查

源由：2026-07-01 用户指示——约 20 个活跃文件中仅 4 个有明确归档条件，需系统性补标。
