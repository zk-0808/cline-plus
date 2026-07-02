# Context-Snapshot 插件开发阶段性总结

> **生命周期**：阶段绑定——context-snapshot 插件 v0.7.x 阶段交付完成、上游阻塞解除前归档。

日期：2026-07-02
范围：context-snapshot 插件全周期（v0.1.0 立项 → v0.7.x 阶段交付）
关联：[handoff.md](../handoff.md) · [dev-rules.md §1.15](../dev-rules.md) · [investigation-note O9](../decisions/investigation-note-cli-codec-content-map-bug.md)

---

## 1. 概览

**context-snapshot** 是 Cline CLI 插件，定位为"会话内 compact 观测 + 跨会话状态恢复辅助"。通过 `registerMessageBuilder` 挂钩 Cline 原生 compact 事件，compact 时写入结构化 snapshot；同时提供 Loop Guard（工具循环检测 + 警告注入）与 rules 注入（新会话 snapshot 上下文）。

当前状态：**P0/P1 全部完成，代码侧已尽，剩余项均受上游不可抗力阻塞**。

| 维度 | 状态 |
|------|------|
| 版本 | package.json v0.6.0 / 实际能力 v0.7.x |
| 代码 | 18 commits（v0.1.0 → F1 fix） |
| 能力 | 6/7 可用，1 项（snapshot 长对话实测）受 §1.15 阻塞 |
| 阻塞 | §1.15 codec bug（PR #12032 Open）+ #11944 SDK 迁移（无进展）|
| 仓库 | [context-snapshot/src/](../../context-snapshot/src/) |

---

## 2. 里程碑时间线

### 2.1 决策与立项阶段（2026-06-23 ~ 2026-06-27）

| 日期 | 事件 | 关键产出 |
|------|------|---------|
| 2026-06-23 | ADR-001 立项 | handoff/compact/memory 架构方向：A+B'+D'+F，暂缓 C，拒绝 E |
| 2026-06-23 | ADR-002 项目形态 | 薄 Skills + 单点 WebSearch + 经验文档 + Plugin 实验线 |
| 2026-06-27 | ADR-004 P5 暂停 | CLI 载体稳定性不足，P5 Plugin Spike 暂停（非 No-Go）|
| 2026-06-27 | design.md 起草 | Phase 1-4 实施计划，core idea：messageBuilder 挂钩 compact |

### 2.2 架构修正阶段（2026-06-28）

| 日期 | 事件 | 关键产出 |
|------|------|---------|
| 2026-06-28 | ADR-005 拆分 | Compaction（Cline 原生）vs Handoff（Plugin/用户）拆分；命名决议 context snapshot |
| 2026-06-28 | V1-V6 路径评估 | mechanism-landing-assessment.md，V6（afterTool + registerRule）为最终方案 |
| 2026-06-28 | VS Code 不可抗力 | v4.0.0 bootstrap 缺失 → v4.0.1 回滚 pre-SDK → v4.0.2 继承回滚；CLI 3.0.30+ 唯一可用 |

### 2.3 实施与验证阶段（2026-06-28 ~ 2026-07-01）

| 日期 | 事件 | 关键产出 |
|------|------|---------|
| 2026-06-28 | v0.1.0 最小插件 | setup() console.log + beforeModel hook 骨架 |
| 2026-06-29 | 调用链修正 | messageBuilder 在 compact 判定**之前**执行（非之后）|
| 2026-06-30 | codec bug 发现 | `n.content.map is not a function` 三次触发，§1.15 不可抗力登记 |
| 2026-06-30 | v0.6.0 重构 | ADR-005 全量 rename + P0 snapshot writer + P1 bug fixes |
| 2026-07-01 | A1 修复 | beforeModel content string → ContentBlock[]（codec bug 路径 B 根因）|
| 2026-07-01 | V6 实现 | afterTool → loopState → messageBuilder，绕过 codec |
| 2026-07-01 | A4 提取器 | v0.7.0 数据模型 + 4 提取器 + 渲染层解耦 |
| 2026-07-01 | Phase 4 验证 | 3 场景 100% recall + 100% precision |

### 2.4 阻塞跟踪阶段（2026-07-01 ~ 2026-07-02）

| 日期 | 事件 | 关键产出 |
|------|------|---------|
| 2026-07-01 | 外部评审闭环 | Claude 25 条意见处理完毕（48% 采纳 / 32% 部分采纳 / 8% 拒绝 / 16% 待验证）|
| 2026-07-02 | O9 PR 跟踪 | 上游 PR #12032 提交，scope 命中恢复条件，状态 Open |
| 2026-07-02 | F1 修复 | compaction.ts buildCompactionSummary content string → ContentBlock[] |
| 2026-07-02 | #11944 复查 | 无进展（Open，0 maintainer 回复，VS Code release 停滞 1+ 月）|

---

## 3. 能力矩阵

| 能力 | 实现路径 | 状态 | 阻塞 |
|------|---------|------|------|
| setup marker | console.log 标记 | 🟢 可用 | — |
| rules 注入 | registerRule（session 启动评估一次）| 🟢 可用 | — |
| compact 观测 | messageBuilder `compact-observer` | 🟢 可用（不修改 messages）| — |
| snapshot 写入 | writeSnapshot on compact detected | 🟡 代码就绪 | 🔴 实测需 90K tokens，触发 §1.15 |
| Loop Guard 检测 | afterTool + loopState window=3/threshold=2 | 🟢 可用 | — |
| Loop Guard 注入 | messageBuilder `loop-guard-injector`（ContentBlock[]）| 🟢 可用 | — |
| 提取器 | decision/change/todo/source，渲染层解耦 | 🟢 可用 | — |

---

## 4. 决策演进

### 4.1 关键 ADR

| ADR | 日期 | 核心决策 | Status |
|-----|------|---------|--------|
| ADR-001 | 2026-06-23 | A+B'+D'+F 方向，暂缓 C，拒绝 E | Accepted |
| ADR-002 | 2026-06-23 | Plugin 作为实验线，L1/L2/L3 三层定位 | Accepted（6 Updates）|
| ADR-004 | 2026-06-27 | P5 Spike 暂停（载体稳定性不足）| deferred |
| ADR-005 | 2026-06-28 | Compaction vs Handoff 拆分；命名 context snapshot | Accepted |

### 4.2 V1-V6 路径演进

| 版本 | 机制 | 评估 | 结论 |
|------|------|------|------|
| V1 | 梯度阈值验证（1000→5000→20000 tokens）| 初版推荐 | 后被审查推翻 |
| V2 | Mock 消息注入（`"x".repeat(100000)`）| 不推荐 | — |
| V3 | 静态代码审计（tsc + 契约对照）| 推荐 | 落地为 V2-A 静态审计 |
| V4 | 低 message 数量场景 | 降级方案 | 后被审查推翻 |
| V5 | 技术论证注入层无法绕过 codec bug | Sound | 结论：注入层阻塞 |
| **V6** | **afterTool + registerRule 动态注入** | **Sound** | **最终方案** |

V6 后续修正：registerRule content 函数在 CLI 3.0.34 只评估一次（死路径），切换到 messageBuilder 注入（每次 model request 调用）。

### 4.3 命题三翻（VS Code Plugin 支持）

| 时间 | 命题 | 依据 |
|------|------|------|
| 初版 | 不支持 | ADR-002 Update 1 裁定 |
| Update 2-3 | 支持 | 代码层核查发现 hook 系统 + registerMessageBuilder |
| Update 6 | 运行时层不支持 | v4.0.0 bootstrap 缺失实测，setup() 永不执行 |

---

## 5. Bug 修复记录

### 5.1 codec bug 调查全过程

**Investigation Note** 遵循 [evidence-governance.md §10](../evidence-governance.md) 模板：
- Observation 9 条（O1-O9）
- Hypothesis 3 条（H1 Verified / H2-H3 Hypothetical）
- 决策 3 条（D1 登记 §1.15 / D2 issue 草稿 / D3 跟进表）

**关键发现**：
- O3：minified bundle 精确定位 `Nd` 函数 `n.content.map(eK)` 与错误参数名匹配
- O5：unminified 源码定位 `agentMessageToMessageWithMetadata` L78 / `agentMessagesToMessages` L97 无 `Array.isArray` 守卫
- O8：beforeModel 注入 string content 是第二条独立触发路径（与 token 量无关）
- O9：上游 PR #12032 提交，scope 精确命中恢复条件

**幻觉事件**：PR #5246 单源声明（未来日期 2026-07-14）被主 agent 直接采信，后排除为幻觉——触发 evidence-governance §6 冲突登记 + 教训沉淀。

### 5.2 代码修复

| Bug | 根因 | 修复 | 验证 |
|-----|------|------|------|
| A1 beforeModel content | string 无 `.map()`，codec `Nd` 崩溃 | string → `[{ type:"text", text }]` | tsc 零错误 + V6 实测 |
| F1 compaction content | 同 A1（死代码，未注入但定时炸弹）| 同 A1 模式 | tsc 零错误 |
| token estimation | compact-observer token 估算偏差 | Math.ceil(text.length / 4) 替代 SDK 函数 | commit `6db3a68` |

### 5.3 双保险机制

针对 §1.15 codec bug 的双层防护：
1. **代码侧**：所有构造 Message 的路径均使用 `ContentBlock[]`（A1 + F1 + V6 messageBuilder）
2. **路径侧**：Loop Guard 注入绕开 codec（messageBuilder → conversation context，不经过 `agentMessagesToMessages` decode）

**关键约束**：workaround 不等同环境可用（§1.15 禁止条款），上游修复前不可抗力声明不解除。

---

## 6. 阻塞与依赖

### 6.1 当前不可抗力（dev-rules.md §1.15）

| 环境 | 状态 | 恢复条件 | 跟进 |
|------|------|---------|------|
| VS Code 4.0.x plugin 系统 | 不可用 | SDK 迁移重新合入稳定版 | #11944（Open，无进展，2026-07-02 复查）|
| CLI 3.0.34 codec 守卫缺失 | 部分受限 | 上游修复两条 decode 路径 + 补测试 | PR #12032（Open，scope 命中，2026-07-02 登记）|

### 6.2 剩余待办

| 优先级 | 项 | 依赖 | 说明 |
|--------|-----|------|------|
| 🟡 中 | #11944 SDK 时间线跟进 | 无 | 2026-07-15 evidence 到期前复查 |
| 🟡 中 | snapshot 写入实测 | §1.15 解除 | 代码侧已就绪 |
| 🟢 低 | VS Code release 监控 | #11944 | 关键词 Plugins / registerMessageBuilder |
| 🟢 低 | PR #12032 合并监控 | 无 | 已登记 O9 |
| 🟢 低 | H2/H3 补证 | 无 | image 分支 + 下游守卫，Hypothetical → Verified/Likely |

---

## 7. 教训与流程改进

### 7.1 方法论教训

| # | 教训 | 触发事件 | 沉淀 |
|---|------|---------|------|
| L1 | **契约优先**：读类型定义先于写代码 | A1/F1 根因均为未按 codec 期望的 ContentBlock[] 构造 content | plugin-dev-sop §1 Step1 边界与契约 |
| L2 | **死代码也要修**：同模式 bug 必须预防性修复 | F1 当前未被注入，但同模式 bug 必须预防 | — |
| L3 | **workaround ≠ 环境可用**：双保险绕开 bug 不解除不可抗力 | V6 绕开 codec 但 §1.15 未解除 | dev-rules §1.15 禁止条款 |
| L4 | **单源声明必须降级 Hypothesis**：主 agent 综合时须按 §1.6 重新分类 | PR #5246 幻觉事件 | evidence-governance §6 冲突登记 |
| L5 | **日期异常是幻觉强信号**：未来日期的 PR/issue 应立即触发反证 | PR #5246 声明 2026-07-14 merge（调查日 2026-06-30）| evidence-governance §6 |
| L6 | **命题三翻触发流程审查**：核心命题翻转 ≥2 次须重新验证证据链 | VS Code Plugin 支持命题三翻（不支持→支持→运行时层不支持）| project_memory 硬约束 |
| L7 | **minified 代码只用于定位**：语义结论须读 unminified / .d.ts | codec bug 调查用 minified 锚点定位 + unminified 源码确认 | dev-rules §1.14 |
| L8 | **模型可能误读 SKILL 文件**：读 evidence 文件而非 SKILL.md | search-orchestrator 实验中模型读错文件 | project_memory 教训 |

### 7.2 流程改进产出

| 产出 | 解决问题 | 路径 |
|------|---------|------|
| **Plugin Dev Planning Framework** | v0.6.0 开发散漫，4 处契约违反靠用户多轮排查 | [plugin-dev-sop.md](plugin-dev-sop.md) |
| **§1.15 不可抗力声明机制** | 外部环境变化导致验证步骤失效 | [dev-rules.md §1.15](../dev-rules.md) |
| **evidence-governance §6 冲突登记** | 单源幻觉进入 Verified 清单 | [evidence-governance.md](../evidence-governance.md) |
| **handoff schema 三字段强制** | handoff.md 字段不统一 | [dev-rules.md §2.2](../dev-rules.md) |
| **文档生命周期标注** | 63 文件状态混乱（proposed/accepted/归档混用）| [dev-rules.md §6](../dev-rules.md) |

### 7.3 plugin-dev-sop 框架要点

**定位**：模型在规划阶段（写代码前/debug 前）的自检框架，非逐步执行清单。

**档位路由**（改动性质 → 规划强度 → 验证档）：
- 纯本地/常量/文案 → 三步心算 → 🟢 A
- 单模块逻辑不动接口 → Step1+Step2 必做 → 🟢 A / 🟡 B
- 动接口契约/跨模块 → 三步全做，Step3 显式列调用方影响 → 🟡 B / 🔴 C

**退出标准**：
- Step1：能说出改动触达的契约文件路径
- Step2：能说出现有实现最可能出问题的 1-2 个点
- Step3：能明确"不改什么"和"会不会破坏现有调用方"，然后 tsc 零错误才动手

### 7.4 下阶段改进建议

| # | 建议 | 优先级 | 依据 |
|---|------|--------|------|
| I1 | PR #12032 合并后立即跑 snapshot 长对话实测，验证 §1.15 解除 | 🟡 中 | F1 + snapshot 实测均受阻塞 |
| I2 | H2/H3 补证：读 `agentPartToContentBlock` image 分支 + 下游 `agent-runtime.ts:621` / `runtime-event-adapter.ts:70` | 🟢 低 | 单源 Hypothetical 需交叉验证 |
| I3 | 外部评审 Q1-Q8 待回答问题闭环（schema 化对象边界）| 🟢 低 | response-to-external-review-handoff.md |
| I4 | v0.8+ 语义对象模型设计（双投影）| 🟢 低 | 外部评审提议，属下阶段议题 |
| I5 | plugin-dev-sop 框架实测：下次 plugin 改动强制走 §1 规划 | 🟡 中 | 框架已落地但未实战验证 |

---

## 8. 外部评审闭环

### 8.1 Claude 深度研究评审

- 轮次：Phase 1 意见提取（25 条）→ Phase 2 子代理并行审查（3 维度）→ Phase 3 综合决策 → Phase 4 闭环
- 闭环状态：25 条全部处理（48% 采纳 / 32% 部分采纳 / 8% 拒绝 / 16% 待验证）
- 关键发现：
  - **价值最高**：扩展路径建议（P3 messageBuilder / P4 beforeTool / P6 registerRule 完全可行）+ 路线图规划
  - **准确度中等**：F1-F3/F5 均为 Unverified（事实声明 50% 待验证）
  - **系统性误判**：验证路径设计（V1-V6 部分被审查推翻）
  - **最大贡献**：子代理 C 发现 O8（beforeModel content string 类型）——直接定位 codec bug 路径 B 根因

### 8.2 项目方回应

5 项项目实际上下文澄清 + 8 个待外部评审回答问题（Q1-Q8），核心是 schema 化对象边界（snapshot vs handoff.md vs 两者各自一套），项目方倾向选项 C 分阶段实施。

---

## 9. 权威源

- [design.md](design.md) — 插件设计文档
- [mechanism-landing-assessment.md](mechanism-landing-assessment.md) — V1-V6 路径评估
- [plugin-dev-sop.md](plugin-dev-sop.md) — Plugin 开发规划框架
- [snapshot-extractor-design.md](snapshot-extractor-design.md) — v0.7.0 提取器设计
- [v2a-static-audit-report.md](v2a-static-audit-report.md) — A2 静态审计报告
- [investigation-note-cli-codec-content-map-bug.md](../decisions/investigation-note-cli-codec-content-map-bug.md) — codec bug 调查
- [claude-external-review/review-closure-report.md](claude-external-review/review-closure-report.md) — 外部评审闭环
- [ADR-001](../decisions/ADR-001-handoff-compact-memory.md) ~ [ADR-005](../decisions/ADR-005-split-compact-from-handoff.md) — 决策记录

## 10. 证据时效性

- `evidence_as_of`: 2026-07-02
- `expires_if_unchanged`: 2026-07-16（14 天后）
- 引用前需复查：PR #12032 合并状态 + #11944 maintainer 回复 + VS Code release 动态
