# 工作流评审材料：连续颠覆链的根因分析

> **提交日期**：2026-06-27
> **评审范围**：2026-06-26 ~ 2026-06-27 两天内 ADR-002 Update 1→2→3→4 连续 4 次颠覆的工作流问题
> **目的**：请外部评审者判断根因分析是否到位、建议的规则改进是否有效、是否有遗漏的结构性问题
> **背景文档**：[ADR-002 Update 1-4](decisions/ADR-002-project-shape.md)、[ADR-001 Update 1](decisions/ADR-001-handoff-compact-memory.md)、[dev-rules.md §1.3/§1.4/§4](dev-rules.md)

---

## 1. 事实层：颠覆链时间线

两天内围绕"VS Code 扩展是否支持 plugin"这一核心问题，连续发生 4 次颠覆，每次"修正"后又发现新错误。

| 时间 | 颠覆版本 | 原结论 | 新结论 | 错误类型 |
|------|---------|--------|--------|---------|
| 06-26 | Update 1 | VS Code 扩展未集成 plugin（基于 CHANGELOG 零 plugin 条目 + 官方文档"不支持"）| — | 核查方法失效（Glob/LS 假阴性，未做代码层核查）|
| 06-27 | Update 2 | registerMessageBuilder 未在 VS Code 扩展实现（基于 Update 1 + minified 代码 Grep 误读）| 推翻 Update 1 部分：代码层有 plugin 结构和 hook 系统 | 语义推断错误（把第 543 行真实实现误判为 zod schema 解析）|
| 06-27 | Update 3 | plugin 安装路径 `.cline/<pluginName>/`，manifest `managed.json`（基于 minified 代码 DGu 函数反向工程）| 推翻 Update 2 发现 3：registerMessageBuilder 确实有实现；但路径和 manifest 格式又错了 | 语义推断错误（DGu 是运行时路径解析，非安装路径）|
| 06-27 | Update 4 | （Update 3 的路径与 manifest 格式）| 推翻 Update 3：路径应为 `.cline/plugins/`，manifest 应为 `package.json` 含 `cline` 字段 | 官方文档未对照 |

**颠覆频率**：2 天 4 次，平均每 12 小时 1 次。每次颠覆都基于同一工作流（minified 代码 Grep + 语义推断），未触发工作流审查。

---

## 2. 核心问题锚定

整个颠覆链围绕一个问题：**VS Code 扩展（saoudrizwan.claude-dev）能否承载 plugin 机制？**

这个问题对项目至关重要——如果 VS Code 扩展支持 plugin，则 #5（compact 双产物，依赖 `registerMessageBuilder`）可在生产环境直接可用；如果不支持，则只能在 CLI 载体上实验，且实验结论无法迁移到生产环境（ADR-004 已记录此错位）。

**用户意图**：调查 cline 的原生能力（plugin、handoff、compact 结合等）**都是基于 VS Code 扩展说的**。但调研方向偏离到 CLI 载体，中间用户察觉不对劲但未能掰回。

---

## 3. 根因分析（7 条，按严重性排序）

### 根因 1：权威源优先级倒置（核心根因）

**应有的调研顺序**：官方文档（权威）→ 代码层验证（实证）→ 社区经验（补充）

**实际顺序**：CHANGELOG（次要证据）→ minified 代码反向工程（高风险）→ 官方文档（最后才对照）

**证据**：
- Update 1（06-26）：基于 CHANGELOG 零 plugin 条目下阴性结论，未查官方文档的"VS Code 不支持"原文
- Update 2/3（06-27）：在 `dist/extension.js`（22MB minified）里 Grep + Substring 反向工程，未对照官方文档
- Update 4（06-27 晚）：fetch 官方文档后立刻发现路径和 manifest 格式错误

**反事实推断**：如果 Update 1 就 fetch 官方文档，路径（`.cline/plugins/`）和 manifest（`package.json`）一次就对了，Update 2/3/4 都不会发生。

### 根因 2：minified 代码反向工程的风险未被识别

`dist/extension.js` 是 minified 的，变量名无意义（DGu/Mch/SOd/u1n），从 minified 代码推断语义极易出错：

| 案例 | minified 代码 | 错误推断 | 实际语义 |
|------|--------------|---------|---------|
| Update 2 | 第 543 行 `registerMessageBuilder` | 误判为 zod schema 解析代码 | 真实的 plugin 注册系统实现 |
| Update 3 | 第 475 行 DGu 函数 `tie.default.join(t.workspacePath,".cline",e)` | 推断 `e`（pluginName）是安装路径子目录 | 实际是已装载 plugin 的运行时资源路径解析 |

**没有"minified 代码反向工程需官方文档对照"的规则。**

### 根因 3：交叉验证缺失

每次颠覆都基于**单一来源**下结论：

| 颠覆版本 | 单一来源 | 应有的交叉验证 |
|---------|---------|--------------|
| Update 1 | CHANGELOG 阴性 | 官方文档 + 代码层 Grep |
| Update 2 | minified 代码 Grep | 官方文档 + 已知 plugin 示例代码 |
| Update 3 | minified 代码 Grep | 官方文档 + 已知 plugin 示例代码 |

dev-rules.md §1.3 只要求"阴性结论须先排除验证方法错误"，但未要求"关键结论必须至少 2 个独立来源"。

### 根因 4：未使用项目自有的 search-orchestrator SKILL

项目有 search-orchestrator SKILL 专门做调研，含：
- Domain Goggles（过滤 csdn/toutiao 农场）
- P3 三档模式（[实测]/[文档]/[社区] 标签强制）
- 反证搜索（搜索"反面观点"/"已知失败案例"）

但本次调研用了裸 WebSearch，没经过任何机制。如果用了 search-orchestrator 的反证搜索，Update 1 的"VS Code 不支持"会被反证查询挑战（GitHub sdk/examples/plugins 明确说"extends any Cline agent — CLI, Kanban, VS Code, JetBrains"）。

**违反**：dev-rules.md §1（执行主体边界）+ project_memory 记录的"TRAE agent and Cline SKILL execution boundary confusion is a recurring issue"。

### 根因 5：颠覆频率未触发工作流审查

连续 2 次颠覆时就该停下来审查工作流，而非继续在同一工作流内修正。实际是连续 4 次颠覆后才由用户提问触发反思。

**没有"颠覆频率门控"规则**——dev-rules.md 现有规则都是针对单次错误的（§1.3 阴性结论门控、§1.4 Windows 核查方法），没有针对"连续颠覆"的元规则。

### 根因 6：调查方向偏离的纠正机制失效

用户在 Update 1/2 期间就察觉不对劲（原话："我一直在质疑能否复用到插件"），但未能掰回。Update 3 时用户明确说"VS Code 扩展本身是研究对象，之前却偏离到 CLI"。

dev-rules.md §4（本次新增）有方向启动门控（启动前明确对象），但缺少"偏离检测与纠正"的**运行时机制**——调研过程中若用户质疑方向，应立即停止并回到确认的对象范围。

### 根因 7：§1.3 阴性结论门控覆盖范围不足

§1.3 只覆盖"验证方法错误"（如 Glob 失效），但 Update 2/3 的错误是"语义推断错误"（minified 代码误读），不是验证方法错误。§1.3 未覆盖"语义推断也需交叉验证"。

---

## 4. 工作流结构性问题

### 4.1 每次事故后只写针对该次具体错误的规则

dev-rules.md §1.3 是 P5 Spike No-Go 误判后写的，只针对"验证方法错误"。本次颠覆链暴露了新的错误类别（语义推断错误、权威源优先级倒置、交叉验证缺失），§1.3 未覆盖。

**这本身就是工作流问题**——每次事故后只针对该次事故的具体错误写规则，没有上升到工作流层面找结构性根因。

### 4.2 minified 代码反向工程被当作"代码层验证"

真正的"代码层验证"应该是读源码（GitHub 上的 unminified TypeScript）。但本次调研把 minified 代码反向工程当作"代码层验证"，导致语义推断错误。

### 4.3 调研工具与项目自有 SKILL 脱节

项目有 search-orchestrator SKILL 专门做调研，但本次调研用了裸 WebSearch + WebFetch。这违反 dev-rules.md §1 执行主体边界，且未利用 SKILL 的反证搜索机制。

### 4.4 用户的"察觉不对劲"未被机制化捕捉

用户在 Update 1/2 期间就察觉方向偏离，但未触发工作流停止。用户的质疑信号（"我一直在质疑..."）未被识别为"方向偏离警报"。

---

## 5. 建议的规则改进（5 条，待外部评审判断有效性）

| 新规则 | 内容 | 解决的根因 |
|--------|------|-----------|
| **§1.5 权威源优先级** | 调研顺序：官方文档 > 代码层验证（unminified 源码）> 社区经验。下结论前必须先查官方文档 | #1 |
| **§1.6 交叉验证要求** | 关键结论（路径/格式/API 签名/能力可用性）必须至少 2 个独立来源（官方文档 + 代码层或社区经验）| #3 |
| **§1.7 minified 代码反向工程** | 不得仅基于 minified 代码下结论，必须官方文档对照。minified 代码只能用于验证官方文档已声明的事实 | #2 |
| **§1.8 颠覆频率门控** | 连续 2 次颠覆应触发工作流审查（停止修正，回到工作流层面找根因），而非继续在同一工作流内修正 | #5 |
| **§4 偏离检测补充** | 调研过程中若用户质疑方向（如"我一直在质疑..."），必须立即停止并回到用户确认的对象范围 | #6 |

---

## 6. 向外部评审提出的问题

### Q1：根因分析是否到位？

7 条根因中，**根因 1（权威源优先级倒置）** 是否真的是核心根因？还是表面症状？是否有更深层的结构性问题（如"AI agent 调研工作流本身缺乏门控"）未被识别？

### Q2：建议的规则改进是否有效？

5 条新规则中：
- **§1.5 权威源优先级**：是否会过度依赖官方文档，而官方文档本身可能过时或错误（如本次官方文档说"VS Code 不支持"，但代码层有实现）？
- **§1.7 minified 代码反向工程**：如果官方文档缺失，minified 代码反向工程是否完全不可用？还是需要更细粒度的规则（如"必须用 unminified 源码对照"）？
- **§1.8 颠覆频率门控**：连续 2 次颠覆触发审查，阈值是否合理？是否会导致频繁停顿？

### Q3：是否有遗漏的结构性问题？

本次颠覆链是否暴露了更深层的问题，如：
- **AI agent 调研工作流 vs 人类调研工作流的差异**：AI agent 是否更容易陷入"minified 代码反向工程"陷阱（因 Grep 能力强但语义理解弱）？
- **"修正"动作本身的风险**：每次颠覆后的"修正"是否可能引入新错误（如 Update 4 是否可能也有未发现的问题）？
- **决策文档的版本管理**：连续 4 个 Update 是否应该用 git 分支而非线性追加？

### Q4：search-orchestrator SKILL 的角色

本次调研未用 search-orchestrator SKILL。如果用了，是否能避免颠覆链？还是 search-orchestrator SKILL 本身也不适用于这种"代码层能力核查"场景？

### Q5：用户信号的机制化捕捉

用户在 Update 1/2 期间就察觉方向偏离（"我一直在质疑..."），但未被机制化捕捉。如何设计一个"用户质疑信号检测"机制，使方向偏离能被早期纠正？

---

## 7. 诚实记录：本次评审材料的局限

- 本材料由造成颠覆链的同一 AI agent 撰写，可能存在自我辩护偏差
- 根因分析基于自我反思，可能遗漏未意识到的结构性问题
- 建议的规则改进尚未实测，有效性未知
- 未包含用户视角（用户可能对根因有不同判断）

---

## 8. 附录：颠覆链涉及的关键证据

### A. 官方文档矛盾证据（Update 1 已记录）

| 来源 | 立场 |
|------|------|
| [docs.cline.bot/customization/plugins](https://docs.cline.bot/customization/plugins) | VS Code 不支持 |
| [github.com/cline/cline/sdk/examples/plugins](https://github.com/cline/cline/tree/main/sdk/examples/plugins) | 支持任何 Cline agent（含 VS Code）|
| 本地 dist/extension.js 第 543 行 | 代码层有完整 plugin 注册系统 |

### B. minified 代码反向工程的错误案例

**Update 2 错误**：第 543 行 `registerMessageBuilder` 命中 40 次，误判为 zod schema 解析代码。实际是 plugin 注册系统的真实实现。

**Update 3 错误**：第 475 行 DGu 函数：
```javascript
function DGu(t){
  let e=t.pluginName??RGu,
      r=tie.default.join(t.workspacePath,".cline",e);
  return { pluginName:e, pluginPath:r, ... }
}
```
错误推断 `e`（pluginName）是安装路径子目录。实际 DGu 是已装载 plugin 的运行时资源路径解析，安装路径是 `.cline/plugins/`。

### C. 官方文档确认的事实（Update 4 对照后）

- plugin 安装路径：`.cline/plugins/`（项目级）或 `~/.cline/plugins/`（全局级）
- manifest：`package.json` 含 `cline` 字段，格式 `{ "cline": { "plugins": [{ "paths": ["./index.ts"], "capabilities": ["tools","hooks"] }] } }`
- capabilities 枚举：`tools / commands / rules / skills / providers / messageBuilders / automationEvents / hooks`
- CLI 自动发现路径：`.cline/plugins` + `~/.cline/plugins` + 系统 Plugins 文件夹
- VS Code 扩展自动发现路径：官方文档未说明（灰色地带，待实测）

---

## 评审请求

请外部评审者针对 §6 的 5 个问题给出判断，特别是：
- 根因分析是否到位（Q1）
- 规则改进是否有效（Q2）
- 是否有遗漏的结构性问题（Q3）

评审结果将用于决定是否将 5 条建议规则写入 dev-rules.md，以及是否需要更深层的工作流重构。

---

## 9. 评审反馈与采纳方案（2026-06-27）

两份外部评审独立提交，核心共识清晰：**核心根因不是"权威源优先级倒置"，而是"证据治理失败 / 证据状态管理失败"**。

### 评审一核心观点

- 根因分析 70% 到位，核心根因判断有偏差
- 真正的根因是"证据治理失败"——没定义"不同证据分别能回答什么问题"
- 建议增加 Confidence 标注 + Observation/Inference/Conclusion 分离
- §1.8"两次颠覆停机"是最弱的规则——应看"证据类型是否一直没变"，非"更新次数"

### 评审二核心观点

- 根因分析 8/10，真正的一号根因是"证据状态管理失败"
- 从证据直接跳到结论，跳过 Hypothesis
- 建议 Observation → Evidence → Hypothesis → Verified → Decision 状态机
- Update 4 也犯了同样的错误（碰巧官方文档正确）
- 建议增加 Evidence Conflict Registry + Decision Readiness Checklist

### 两份评审的共识

1. **根因**：证据治理失败，非调研规则不足
2. **框架**：需要上层证据状态机，非仅补 dev-rules.md 执行规则
3. **结构**：三层——元规则 / 执行门控 / ADR 应用
4. **不回溯**：历史 Update 保留，从新 Update 开始执行新框架

### 采纳方案（已执行）

| 采纳项 | 落地位置 |
|--------|---------|
| Evidence Governance 上层框架（状态机 + Confidence + Conflict Registry + Decision Readiness + Escalation + 实验优先 + Investigation Note）| [evidence-governance.md](evidence-governance.md) |
| §1.5 权威源与独立证据（改为"证据职责分工"，非"官方优先"）| [dev-rules.md §1.5](dev-rules.md) |
| §1.6 双来源验证（改为"2 个独立证据类型"，非"2 个来源"）| [dev-rules.md §1.6](dev-rules.md) |
| §1.7 Minified 边界（改为"可用于定位，不可单独用于语义结论"，非"不得仅凭"）| [dev-rules.md §1.7](dev-rules.md) |
| §1.8 Evidence Collapse 门控（改为"证据类型一直没变"触发，非"次数"）| [dev-rules.md §1.8](dev-rules.md) |
| §1.9 Direction Drift 门控（改为"用户重新定义问题"触发，非"质疑语气"）| [dev-rules.md §1.9](dev-rules.md) |
| §1.10 Core Proposition Flip 门控（替代"连续两次颠覆"，用"核心命题翻转"）| [dev-rules.md §1.10](dev-rules.md) |
| ADR-002 Methodology Note（Update 1-4 历史说明）| [ADR-002](decisions/ADR-002-project-shape.md) |

### 未采纳的建议（记录备查）

| 建议 | 未采纳原因 |
|------|----------|
| Freeze Point（发现冲突时冻结，重新调查后写新 Update）| 已通过 §1.10 Core Proposition Flip 门控 + §1.8 Evidence Collapse 间接覆盖 |
| Investigation Note 作为独立文档 | 已作为 evidence-governance.md §10 模板，未独立成文（避免文档膨胀）|

### 评审评分（评审二给出）

| 维度 | 评分 |
|------|------|
| 事实整理 | 9.5/10 |
| 根因分析 | 8/10 |
| 规则设计 | 8.5/10 |
| 结构性分析 | 7.5/10 |

### 后续动作

1. **从 ADR-002 Update 5 起执行新框架**——所有结论必须标注 Observation / Inference / Evidence Type / Confidence / Remaining Unknown
2. **Capability Probe 5 实测**作为新框架的首个应用——按 Investigation Note 格式记录证据链
3. **dev-rules.md 维护节奏**：按本文件生命周期规则，功能开发期基本冻结，只在功能交界点回顾迁入
