# Handoff — 三层证据治理结构 + 固定评审角色体系建立

## 本会话决策

| 决策 | 状态 |
|------|------|
| 建立 Level 1 元规则层：evidence-governance.md + reviewer-personas.md | ✅ 已写 |
| 修订 dev-rules.md §1.5-§1.12 执行门控（8 条新规则）| ✅ 已写 |
| ADR-002 添加 Methodology Note（Update 1-4 历史说明，Update 5 起执行新框架）| ✅ 已写 |
| ADR-002 Update 4 修正 Update 3 路径与 manifest 格式错误 | ✅ 已写 |
| ADR-001 Update 1 Capability Probe 5 实测计划（路径与 manifest 已修正）| ✅ 已写 |
| mechanism-candidates #5/#7 备注基于 Update 4 修正 | ✅ 已同步 |
| workflow-review-2026-06-27.md 记录评审反馈与采纳方案 | ✅ 已写 |
| dev-rules.md §1.12 子代理调用必须自行注入评审角色提示词 | ✅ 已写 |

> 本会话由用户"写handoff"明确触发（触发器 a）。本会话主题为**工作流治理结构重构**，与上一个 handoff（VS Code 扩展原生能力调研）有延续但话题已转为方法论层。

---

## 本会话净变化

### 1. 颠覆链事故回顾（06-26 ~ 06-27）

ADR-002 Update 1→2→3→4 连续 4 次颠覆，围绕"VS Code 扩展是否支持 plugin"。外部评审指出核心根因不是"调研规则不足"，而是**证据治理失败**——把单一证据直接升级为最终结论，跳过假设、验证、置信度管理环节。

### 2. 三层治理结构建立

| 层级 | 文档 | 职责 | 借鉴的成熟实践 |
|------|------|------|--------------|
| **Level 1 元规则** | [evidence-governance.md](evidence-governance.md) | 如何形成结论 | EBSE / RCA / ADR Methodology / 科学方法 / Lean Startup |
| **Level 1 元规则** | [reviewer-personas.md](reviewer-personas.md) | 如何评审（成熟实践映射器）| SE/Process/Reliability/Security/API 评审实践 |
| **Level 2 执行门控** | [dev-rules.md §1.5-§1.12](dev-rules.md) | 何时必须停 / 必须调用评审 | — |
| **Level 3 应用** | ADR / Investigation Note | 实际应用 | — |

### 3. evidence-governance.md 核心机制

- **证据生命周期状态机**：Observation → Evidence → Hypothesis → Verified → Decision（禁止跳级）
- **Observation vs Inference 分离**：观察不会错，解释会错
- **证据职责分工**：不同证据类型回答不同问题（官方=设计意图，源码=实际行为，实测=真实运行）
- **Confidence 模型**：高（≥3 源一致）/ 中（2 源一致）/ 低（单源或冲突）
- **Unknown 状态原则**：允许 ADR 暂停于 Unknown，不强制补成 Yes/No
- **Conflict Registry**：冲突时登记，不立即裁决
- **Decision Readiness Checklist**：写入 ADR 前的 5 项检查
- **Evidence Escalation**：官方→Example→源码→实测，禁止 `grep→grep→grep`
- **实验优先**：Observation 成本 > Experiment 成本时优先实验
- **Investigation Note**：ADR 之前的证据链记录模板

**产源诚实记录**（§14）：本框架**无创新部分**——所有组成部分映射到 EBSE/RCA/ADR/科学方法/Lean Startup。本地扩展仅是 AI 工作流场景适配。

### 4. reviewer-personas.md 核心机制

**定位**：成熟实践映射器（best-practice mapper）——首要任务是映射成熟实践，非创造新概念。

**5 个固定角色**：
- Software Engineering Reviewer (ADR/RFC/EBSE/ATAM)
- Process Reviewer (Lean/PDCA/A3/RCA/Postmortem)
- Reliability Reviewer (SRE/Error Budget/Incident Response)
- Security Reviewer (STRIDE/LINDDUN/Threat Modeling)
- API Reviewer (REST/RFC/API Evolution)

**核心约束**：如果存在成熟实践，优先说明名称+核心思想+适用理由；只有现有实践不足时才建议新增本地规则。输出区分：成熟实践 / 本地扩展 / 创新。

### 5. dev-rules.md §1.5-§1.12 执行门控（8 条）

| 条款 | 触发条件 | 解决的根因 |
|------|---------|----------|
| §1.5 权威源与独立证据 | 形成结论时 | 证据职责混用 |
| §1.6 双来源验证 | 关键结论 | 单源裁决 |
| §1.7 Minified 边界 | 用 minified 代码时 | minified 语义误读 |
| §1.8 Evidence Collapse | 证据冲突时 | 同一证据类型打转 |
| §1.9 Direction Drift | 用户重新定义问题 | 方向偏离未纠正 |
| §1.10 Core Proposition Flip | 核心命题翻转 ≥2 次 | 推理系统失控 |
| §1.11 评审角色调用门控 | 写 ADR / 事故复盘等 | 重新发明轮子 |
| §1.12 子代理注入 | 执行 loop / Task subagent | 依赖用户提醒 |

### 6. ADR-002 Update 4 路径与 manifest 修正

Update 3 基于 minified 代码反向工程推断的 plugin 安装路径（`.cline/<pluginName>/`）和 manifest（`managed.json`）错误。Update 4 对照官方文档修正：
- 安装路径：`.cline/plugins/`（项目级）或 `~/.cline/plugins/`（全局级）
- manifest：`package.json` 含 `cline` 字段，格式 `{ "cline": { "plugins": [{ "paths": ["./index.ts"], "capabilities": ["tools","hooks"] }] } }`
- VS Code 扩展能否自动发现 `.cline/plugins/`：官方文档未说明，仍需实测

### 7. ADR-002 Methodology Note

Update 1-4 保留不变（历史可追溯），明确标注"predate Evidence Governance framework"。从 Update 5 起所有结论必须标注 Observation / Inference / Evidence Type / Confidence / Remaining Unknown，不可跳级。

---

## 本会话修改文件

| 文件 | 改动 |
|------|------|
| `docs/evidence-governance.md` | 新建（Level 1 元规则，14 章 + 产源说明）|
| `docs/reviewer-personas.md` | 新建（Level 1 元规则，5 固定角色 + 调用规则）|
| `docs/dev-rules.md` | 新增 §1.5-§1.12（8 条执行门控）|
| `docs/decisions/ADR-002-project-shape.md` | Update 4（路径修正）+ Methodology Note |
| `docs/decisions/ADR-001-handoff-compact-memory.md` | Update 1 Probe 5 实测准备清单路径修正 |
| `docs/mechanism-candidates.md` | #5/#7 备注基于 Update 4 修正 |
| `docs/workflow-review-2026-06-27.md` | 新建（评审材料）+ §9 评审反馈与采纳方案 |

---

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **Capability Probe 5 实测** | 验证手动放 plugin 文件到 `.cline/plugins/` 能否触发 VS Code 扩展执行 setup 函数。**作为新框架首个应用**——按 Investigation Note 格式记录证据链（Observation → Evidence → Hypothesis → Verified → Decision）。TRAE agent 准备文件，用户 reload window 后检查 `plugin-loaded.log`。详见 [ADR-001 Update 1](decisions/ADR-001-handoff-compact-memory.md) | **高** |
| Capability Probe 1-4 | PostCompact hook / session_id / compact 程序化调用 / condense 消息 watcher | 中（Probe 5 后）|
| **P5 Spike 恢复等待** | 恢复条件见 [ADR-004](decisions/ADR-004-p5-spike-pause.md)。Probe 5 通过 → 条件 2 满足 | 低（等待 Probe 5）|
| research/06-usage.md 断链 | 旧链接指向 project-rules.md，是否更新待定 | 低 |

> **注意**：ADR-004 仍为 deferred。Probe 5 实测结果是恢复路径关键——若通过，#5 可在 VS Code 直接可用。

权威源：[evidence-governance.md](evidence-governance.md)、[reviewer-personas.md](reviewer-personas.md)、[dev-rules.md §1.5-§1.12](dev-rules.md)、[ADR-002 Update 4 + Methodology Note](decisions/ADR-002-project-shape.md)、[ADR-001 Update 1](decisions/ADR-001-handoff-compact-memory.md)、[ADR-004](decisions/ADR-004-p5-spike-pause.md)、[workflow-review-2026-06-27.md](workflow-review-2026-06-27.md)、[mechanism-candidates.md](mechanism-candidates.md)、[project-rules-search-orchestrator.md](project-rules-search-orchestrator.md)

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意新增 §1.5-§1.12 执行门控）与 docs/project-rules-search-orchestrator.md 各一次，遵守三份文档职责划分与防漂移约束。
然后读 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：本会话完成**三层证据治理结构 + 固定评审角色体系建立**。起因是 ADR-002 Update 1→2→3→4 连续 4 次颠覆事故，外部评审指出核心根因是"证据治理失败"（把单一证据直接升级为最终结论，跳过假设/验证/置信度管理），而非"调研规则不足"。已建立三层结构：Level 1 元规则（[evidence-governance.md](evidence-governance.md) 证据状态机 + [reviewer-personas.md](reviewer-personas.md) 5 固定评审角色）→ Level 2 执行门控（[dev-rules.md §1.5-§1.12](dev-rules.md) 8 条规则）→ Level 3 应用（ADR + Investigation Note）。evidence-governance.md §14 诚实记录所有部分均映射 EBSE/RCA/ADR 等成熟实践，无创新部分。reviewer-personas.md 定位为"成熟实践映射器"，核心约束"优先借鉴成熟实践，非重新发明"。dev-rules.md §1.12 规定执行 loop / 调用子代理时 TRAE agent 必须自行注入评审角色提示词。ADR-002 Methodology Note 标注 Update 1-4 保留不变，从 Update 5 起执行新框架。下次首要动作：**Capability Probe 5 实测**——作为新框架首个应用，按 Investigation Note 格式记录证据链，验证手动放 plugin 文件到 `.cline/plugins/` 能否触发 VS Code 扩展执行 setup。TRAE agent 准备最小 plugin 文件（`package.json` 含 `cline` 字段 + `index.ts` 含 setup 注册 messageBuilder/tool + 写日志），用户 reload window 后检查 `plugin-loaded.log`。
