# 项目发展历程与子项目实际情况回顾报告 2026-07-12

> **生命周期**：事件绑定 — 审查机制退役后归档（同 2026-07-02 基线报告）。
> **回顾日期**：2026-07-12
> **回顾性质**：手动触发的发展历程回顾（非问题导向审计），距上次健康审计（2026-07-02）10 天
> **回顾动机**：解决"把项目直接交给 AI 时，AI 往往忽视子项目"的痛点——本报告以**子项目全景盘点**为核心，让后续 AI 能快速建立项目全貌
> **证据来源**：直接读文件 / WebFetch 核查 GitHub / 决策索引实读 / handoff.md 实读

---

## 0. 执行摘要

| 维度 | 状态 |
|------|------|
| **项目定位** | Cline AI agent 治理框架（git template repo），五层架构 L1-L5 |
| **框架版本** | v1.0 已 tag（2026-07-09） |
| **填充完成度** | 100%（GV-1 + GV-6 + GV-7 + 4 Capability + Plugin 运行时 + hooks） |
| **CLI 端验证** | S1-S5 全通过 + D1-D5 dogfood 全通过 |
| **VS Code 端** | 🔴 全阻塞（BL-1，14 天无进展） |
| **Compaction 实测** | 🔴 阻塞（BL-2，11 天未合并） |
| **子项目数** | 6 类（.governance / context-snapshot / search-mcp-wrapper / skills / docs / scripts） |
| **距上次审计** | 10 天，审计报告 `expires_if_unchanged: 2026-07-16` 即将到期 |

**核心结论**：框架 v1.0 已完成且 dogfood 验证通过，但两个上游阻塞项（BL-1/BL-2）均无进展，项目进入"等上游"阶段。本报告重点不是找问题，而是**把项目实际情况和子项目关系固化成文档**，避免后续 AI 忽视子项目。

---

## 1. 项目发展时间线

### 1.1 关键里程碑（按时间正序）

| 日期 | 事件 | 类型 |
|------|------|------|
| 2026-06-15 | [ADR-001](decisions/adr/ADR-001-handoff-compact-memory.md) Handoff/compact/memory 策略确立 | 方向决策 |
| 2026-06-20 | [ADR-002](decisions/adr/ADR-002-project-shape.md) 项目形态：Cline 扩展层 L1/L2/L3 | 方向决策 |
| 2026-06-23 | search-orchestrator P1 Domain Goggles + FinalScore 联动采纳 | 功能决策 |
| 2026-06-24 | search-orchestrator P3/P4 采纳 + DiversityPenalty 回退 | 功能决策 |
| 2026-06-25 | search-orchestrator P5 Evidence Map 重设计（proposed） | 功能决策 |
| 2026-06-26 | ADR-003 rolled-back（P5 Plugin Spike 退出当日撤销）+ MCP 节流 wrapper 采纳 | 转折点 |
| 2026-06-27 | ADR-004 P5 Plugin Spike 暂停（后被 ADR-005 取代） | 功能决策 |
| **2026-06-28** | **[D-2026-06-28](decisions/D-2026-06-28-cline-v401-sdk-rollback.md) Cline v4.0.1 SDK 回滚事件** — 项目从 VS Code 扩展转 CLI 验证的**直接触发原因** | **重大转折** |
| 2026-07-02 | [项目健康审计](project-health-audit-2026-07-02.md)（56 项问题，5 根因，四档计划）+ [ADR-006](decisions/adr/ADR-006-native-mechanism-first-principle.md) 原生机制优先原则 | 治理审计 |
| 2026-07-03 | ADR-006 active | 方向决策 |
| 2026-07-05 | handoff.md 开始追踪 BL-1/BL-2 | 阻塞追踪 |
| 2026-07-09 | **框架 v1.0 tag** + 6 个可选项全部完成 | **里程碑** |
| 2026-07-12 | 本报告（发展历程回顾） | 回顾 |

### 1.2 发展阶段划分

```
阶段一：定位探索期（2026-06-15 ~ 06-27）
  ADR-001/002 确立方向 → search-orchestrator 功能开发 → ADR-003/004 Plugin Spike 受挫

阶段二：环境转折期（2026-06-28 ~ 07-02）
  Cline v4.0.1 SDK 回滚 → VS Code 端 plugin 消失 → 转 CLI 验证 → 健康审计暴露 56 项问题

阶段三：治理框架化期（2026-07-03 ~ 07-09）
  ADR-006 原生机制优先 → GV-7 契约冻结 → 五层架构填充 → v1.0 tag

阶段四：等上游期（2026-07-09 至今）
  框架完成，dogfood 通过 → BL-1/BL-2 阻塞 S6 compaction 实测 → 等上游 PR/issue
```

---

## 2. 子项目全景盘点（核心章节）

> **本节解决"AI 忽视子项目"痛点**。项目不是单一代码库，而是 6 类子项目的协同体。后续 AI 接手时**必须**先读本节建立全貌。

### 2.1 子项目关系图

```
                    ┌─────────────────────────────────────┐
                    │   cline++ (根仓库, git template)     │
                    │   README.md / .clinerules / LICENSE │
                    └──────────────┬──────────────────────┘
                                   │
        ┌──────────────┬───────────┼───────────┬──────────────┬──────────────┐
        │              │           │           │              │              │
   ┌────▼────┐  ┌──────▼─────┐ ┌───▼───┐ ┌─────▼─────┐ ┌──────▼─────┐ ┌──────▼─────┐
   │.governance│  │context-    │ │search-│ │  skills/  │ │   docs/    │ │  scripts/  │
   │  (框架核心)│  │snapshot/   │ │mcp-   │ │search-    │ │ (文档体系) │ │ (工具脚本) │
   │           │  │(Plugin 源码)│ │wrapper│ │orchestrator│ │            │ │            │
   │  L1-L5    │  │ submodule  │ │(节流) │ │ (Cline    │ │ 规则+决策  │ │ sync/ab-test│
   │           │  │            │ │       │ │  skill)   │ │ +审计+指南 │ │ /patch     │
   └─────┬─────┘  └──────┬─────┘ └───┬───┘ └─────┬─────┘ └──────┬─────┘ └────────────┘
         │               │           │           │              │
         │  同步到        │ 安装到     │ 被        │ 被           │ 被引用
         │  ~/.cline/    │ ~/.cline/ │ skills/   │ .governance/ │
         │  plugins/     │ plugins/  │ 引用      │ examples/    │
         │  installed/   │ installed/│           │ 引用         │
         │               │           │           │              │
         └───────────────┴───────────┴───────────┴──────────────┘
                              ↑
                    Cline CLI 3.0.30+ 发现并加载
                    (VS Code 4.0.x 不支持 — BL-1)
```

### 2.2 各子项目详情

#### 子项目 A：`.governance/` — 治理框架核心

**定位**：本项目的核心产出。五层架构组织 AI agent 治理规则。

**五层架构**：

| 层 | 目录 | 生命周期 | 职责 | 关键文件 |
|----|------|---------|------|---------|
| L1 Core | `.governance/core/` | 年/月 | 跨项目通用宪法（≤800 token 判定动作） | [constitution.md](../.governance/core/constitution.md) / [rubric.md](../.governance/core/rubric.md) |
| L2 Rules | `.governance/rules/` | 周 | 装好即生效的薄入口（每份 ≤50 行） | [lifecycle.md](../.governance/rules/lifecycle.md) / [handoff-entry.md](../.governance/rules/handoff-entry.md) |
| L3 Capability | `.governance/capabilities/` | 月 | "怎么做"的代码模块（pass/block/inject） | 6 个模块 + [README.md](../.governance/capabilities/README.md) + [SOP.md](../.governance/capabilities/SOP.md) |
| L4 Hooks | `.governance/hooks/` + `.governance/plugin/` | 天 | "什么时候调用"的事件驱动检查 | [config.json](../.governance/hooks/config.json) / [plugin/index.ts](../.governance/plugin/index.ts) |
| L5 Runtime | `HANDOFF.md` + `.governance/runtime/` | 每次 session | 动态状态文件 | snapshot.json |

**6 个 Capability 模块**：

| 模块 | 职责 | 实现状态 | 阻塞 |
|------|------|---------|------|
| `git-checker` | git 未 commit 文件堆积检测 → block | ✅ tsc 通过 | VS Code 端（BL-1）|
| `snapshot-writer` | PreCompact 时写 snapshot.json | ✅ tsc 通过 | CLI 长对话实测（BL-2）|
| `handoff-provider` | SessionStart 注入 HANDOFF.md + snapshot + constitution | ✅ tsc 通过 | 无 |
| `rule-appender` | 经验追加到 HANDOFF.md 待沉淀区 | ✅ 33 测试过 | 无 |
| `staleness-sweeper` | 待沉淀区过期条目清理 | ✅ 实现 | 无 |
| `tracer` | 治理行为可观测层 | ✅ 实现 | 无 |

**契约文档**：
- GV-7 契约（v1.2 冻结）：[delivery-framework-design.md](decisions/delivery-framework-design.md)
- GV-6 Capability 设计：[capabilities/README.md](../.governance/capabilities/README.md)
- GV-1 宪法：[constitution.md](../.governance/core/constitution.md)

**当前状态**：v1.0 已 tag，填充完成度 100%。

---

#### 子项目 B：`context-snapshot/` — Plugin 源码（submodule）

**定位**：Cline Plugin 实现，compact 触发时自动生成结构化 context snapshot。

**关键属性**：
- **独立 git 仓库**（submodule）
- 版本：v0.6.0
- 上游决策：[ADR-005](decisions/adr/ADR-005-split-compact-from-handoff.md)（Compaction 与 Handoff 拆分）

**架构**：

```
Cline Agent Turn
    ↓
messageBuilder.build(messages)  ← 本 Plugin 在此介入
    ├─ shouldCompact() 判定 token 阈值（75% of 120K）
    ├─ 需要 compact → writeSnapshot() 写入 context snapshot
    └─ 返回 messages（不修改消息内容）
    ↓
hooks.beforeModel               ← Loop Guard 在此注入
    ↓
provider 调用
```

**源码结构**：

```
context-snapshot/src/
├── index.ts             ← plugin 入口 + setup() 注册三类能力 + hooks
├── compaction.ts        ← token 估算 + shouldCompact 判定
├── snapshot-writer.ts   ← 5 节模板生成 + 磁盘写入
├── rules-injector.ts    ← context snapshot 动态注入
├── tool-recorder.ts     ← 工具调用记录 + detectRepetition
├── rules-injector.ts    ← context snapshot 动态注入
└── extractors/          ← v0.7.0 规划：结构化提取器
    ├── decision-extractor.ts
    ├── change-extractor.ts
    ├── todo-extractor.ts
    ├── source-extractor.ts
    └── index.ts
```

**版本演进**：

| 版本 | 状态 | 说明 |
|------|------|------|
| v0.5.0 | ✅ 完成 | Plugin 骨架加载 + compact 检测 + token 估算修复 |
| v0.6.0 | ✅ 完成 | ADR-005 命名落地 + snapshot-writer + Loop Guard + 契约修复 |
| v0.7.0 | ⏳ 规划中 | 结构化提取器（DecisionExtractor / TodoExtractor 等）|

**当前阻塞**：
- BL-1：VS Code 扩展 4.0.x 不支持 Plugin 系统（不可抗力）
- BL-2：CLI codec bug 阻塞真实 90K+ token 长对话路径（S6 compaction 实测）

**安装路径**：`~/.cline/plugins/installed/local/`（CLI 发现路径，非项目级）

---

#### 子项目 C：`search-mcp-wrapper/` — MCP 反-bot 节流 wrapper

**定位**：包裹 duckduckgo-websearch，提供反-bot 节流能力。

**关键属性**：
- 版本：v0.1.0
- 对应决策：[D-2026-06-26-search-adopt-mcp-throttle-wrapper](decisions/search/D-2026-06-26-search-adopt-mcp-throttle-wrapper.md)
- 验证：Run #14 功能性验证通过（3 次熔断正确触发指数退避）

**架构**（单向依赖，无循环）：

```
index.ts ──→ circuit-breaker.ts ──→ config.ts
```

**核心能力**：
- 强制 `max_results ≤ 10`
- 跨调用状态维护
- 指数退避熔断（CIRCUIT_OPEN 状态）

**依赖**：
- `@modelcontextprotocol/sdk` ^1.0.0
- `duckduckgo-websearch` ^2.0.0

**被谁使用**：被 `skills/search-orchestrator/` 引用（作为 search MCP 后端）。

---

#### 子项目 D：`skills/search-orchestrator/` — Cline Skill

**定位**：搜索编排器方法论 Skill，强制 Plan→Search→Evaluate→Decide 流程。

**关键属性**：
- 版本：v1.0.0
- category: workflow
- preferred_mode: plan
- requires_mcp: `["duckduckgo"]`（即子项目 C）

**核心机制**（经过多轮 A/B 实验验证）：

| 机制 | 来源决策 | 验证 |
|------|---------|------|
| Phase 0 复杂度门控（L0-L3 四档） | 设计 | — |
| §1.4 三路 fanout（直白/限域/反证） | Run #2/#3 | A/B 实测 |
| §3.5 Domain Goggles（5 类预置） | [D-2026-06-23-search-adopt-goggles](decisions/search/D-2026-06-23-search-adopt-goggles.md) | Run #1 |
| §3.5.5 FinalScore 联动公式 | [D-2026-06-23-search-finalscore-coupling](decisions/search/D-2026-06-23-search-finalscore-coupling.md) | Run #1 |
| §3.6 P6 Highlights verbatim 抽取 | [D-2026-06-25-search-adopt-p6-highlights](decisions/search/D-2026-06-25-search-adopt-p6-highlights.md) | Run #10 4/5 |
| §4.1 Gap Ledger 强制缺口枚举 | Run #14 | 4/5 验证，Gap Recall +55.6% |
| §4.3 P3 Evidence-bound Citation 三档 | [D-2026-06-24-search-adopt-p3](decisions/search/D-2026-06-24-search-adopt-p3.md) | Run #5/#6 零误引用 |
| P4 同源合并 | [D-2026-06-24-search-adopt-p4-same-source-merge](decisions/search/D-2026-06-24-search-adopt-p4-same-source-merge.md) | — |

**诚实声明**（SKILL §3.5.3）：
- Goggle 不是真过滤器，是 LLM 必须遵守的排序规则表
- 提示词层无法保证多样性/反垄断（Run #3 教训，已回退 DiversityPenalty）
- 反证检索受后端能力限制（mechanism-candidates #20）

**被谁使用**：被 `.governance/examples/` 引用作为示例；被 docs/search/ 文档体系支撑。

---

#### 子项目 E：`docs/` — 文档体系

**定位**：项目所有文档的入口索引与内容载体。

**文档分类**：

| 类别 | 路径 | 职责 |
|------|------|------|
| **规则文档** | `docs/dev-rules.md` 等 5 份 | 跨功能通用防漂移规则 |
| **决策文档** | `docs/decisions/` | ADR + D 决策 + investigation-note + draft-issue |
| **功能文档** | `docs/search/` / `docs/plugin/` / `docs/handoff-schema/` | 按功能线组织 |
| **审计文档** | `docs/project-health-audit-*.md` | 健康度审查报告 |
| **开发者指南** | `docs/developer-guide/` | 30 分钟跑通框架 |
| **归档** | `docs/archive/` | 历史归档 |

**5 份规则文档**：

| 文件 | 定位 | 当前状态 |
|------|------|---------|
| [dev-rules.md](dev-rules.md) | 跨功能通用防漂移规则（永久保留） | 📖 示例包参考实现（冻结追加） |
| [evidence-governance.md](evidence-governance.md) | 证据治理框架（Level 1 元规则） | 活跃 |
| [reviewer-personas.md](reviewer-personas.md) | 评审角色集（Level 1 元规则） | 活跃 |
| [plugin/project-rules.md](plugin/project-rules.md) | Plugin 开发期约束 | 📖 示例包参考实现（§3.7 仍活跃） |
| [search/project-rules.md](search/project-rules.md) | search-orchestrator 开发期约束 | 功能冻结后删除 |

**决策索引**：[decisions/README.md](decisions/README.md)（时间倒序，含 ADR-001~007 + D 决策 + investigation-note + draft-issue）

**关键审计基线**：[project-health-audit-2026-07-02.md](project-health-audit-2026-07-02.md)（56 项问题，5 根因，四档优先级计划）

---

#### 子项目 F：`scripts/` — 工具脚本

**定位**：自动化工具脚本集合。

**关键脚本**：

| 脚本 | 用途 | 编码约束 |
|------|------|---------|
| `sync-governance-plugin.ps1` | 同步 .governance/plugin/ + capabilities/ 到 CLI 发现路径 | 全 ASCII 或 UTF-8 BOM |
| `sync.sh` / `sync.ps1` | 通用同步 | 同上 |
| `ab-test-round2.ps1` / `ab-test-round2-fix.ps1` | A/B 测试 Round 2 | 同上 |
| `patch-vscode-plugin-support.ps1` / `.sh` | VS Code plugin 支持补丁 | 同上 |
| `cleanup-and-reinstall-plugin.ps1` | 清理重装 plugin | 同上 |
| `test-hook-injection.ps1` | Hook 注入测试 | 同上 |
| `smoke-tracing.mjs` | Tracing 烟雾测试 | — |
| `trace-stats.js` | Tracing 统计 | — |

**编码规范**（[plugin/project-rules.md §1.6](plugin/project-rules.md)）：PowerShell 5.x 默认 GBK 解析无 BOM 文件，.ps1 必须全 ASCII 或带 UTF-8 BOM。

---

## 3. 阻塞项最新状态（WebFetch 核查，2026-07-12）

### 3.1 BL-1：VS Code plugin 系统不可用

| 字段 | 值 |
|------|-----|
| **Issue** | [#11944](https://github.com/cline/cline/issues/11944) |
| **状态** | 🔴 Open（2026-07-12 核查） |
| **开启日** | 2026-06-28 |
| **无进展天数** | **14 天** |
| **Assignee** | 无 |
| **Milestone** | 无 |
| **关联 PR** | 无 |
| **Labels** | VS Code |

**根因**（2026-06-29 用户补充确认）：
- v4.0.1 回滚到 pre-SDK 代码基（3.89.2）
- v4.0.2 继承回滚——extension.js 中 **zero references** to plugin-sandbox / loadSandboxed / registerMessageBuilder / CLINE_PLUGIN
- plugin 子系统代码**完全缺失**（不只是未打包）

**影响**：VS Code 端 Hook 全部阻塞，仅 CLI 端可用。

**缓解**：CLI 3.0.30+ 端 S1-S5 全通过 + D1-D5 dogfood 全通过。

**恢复条件**：SDK 迁移重新合入稳定版（无时间表）。

---

### 3.2 BL-2：CLI codec bug

| 字段 | 值 |
|------|-----|
| **PR** | [#12032](https://github.com/cline/cline/pull/12032) |
| **状态** | 🔴 Open（2026-07-12 核查） |
| **提交日** | 2026-07-01 |
| **未合并天数** | **11 天** |
| **Commits** | 2 |
| **Conversation** | 5 |
| **Checks** | 18 |
| **Files changed** | 2 |

**修复内容**：
- agent-message-codec 容忍 string content（原假设永远是 array）
- string content 归一化为 text part
- single part-shaped object 自动包装
- null/unknown content 不再崩溃
- 含 regression test（覆盖 single-message + batch decode）

**影响**：S6 compaction + snapshot 实测阻塞（需 ≥180K tokens 长对话，正是 bug 触发场景）。

**缓解**：短对话测试 workaround（beforeModel 返回 undefined）。

**恢复条件**：PR 合并 + CLI release tag（非 main 分支合并）。

---

### 3.3 阻塞项趋势判断

| 阻塞项 | 2026-07-02 审计时 | 2026-07-09 handoff | 2026-07-12 核查 | 趋势 |
|--------|------------------|-------------------|----------------|------|
| BL-1 | 已记录 | 追踪中 | 14 天无进展 | 📉 无改善迹象 |
| BL-2 | PR 已提交 | Open | 11 天未合并 | 📉 无改善迹象 |

**判断**：两个阻塞项短期解除概率低。项目已进入"等上游"阶段，应考虑：
1. 是否 ping cline team review BL-2（handoff.md 已建议）
2. BL-1 降级为"长期不可用"，VS Code 端计划搁置
3. 评估是否在 CLI 端继续深化（如 v0.7.0 提取器）而非等 VS Code

---

## 4. 当前完成度复核

### 4.1 框架 v1.0 填充完成度（handoff.md 声明 100%）

| 组件 | 声明状态 | 证据 |
|------|---------|------|
| GV-1 宪法 | ✅ | [constitution.md](../.governance/core/constitution.md) |
| GV-6 Capability 设计 | ✅ | [capabilities/README.md](../.governance/capabilities/README.md) + 6 模块实现 |
| GV-7 契约 | ✅ v1.2 冻结 | [delivery-framework-design.md](decisions/delivery-framework-design.md) |
| Hooks 配置 | ✅ | [config.json](../.governance/hooks/config.json) |
| Plugin 运行时 | ✅ | [plugin/index.ts](../.governance/plugin/index.ts) |
| 4 Capability 实现 | ✅ | git-checker / snapshot-writer / handoff-provider / rule-appender |
| ADR 目录 | ✅ | [adr/](../.governance/decisions/adr/) 含 ADR-007/008 |
| 开发者指南 | ✅ | [developer-guide/](developer-guide/README.md) |

### 4.2 验证完成度

| 测试 | 状态 | 证据来源 |
|------|------|---------|
| S1 Plugin 发现 | ✅ PASS | handoff.md |
| S2 Rule 注入 | ✅ PASS | handoff.md |
| S3 Git-checker 阻断 | ✅ PASS | handoff.md |
| S4 只读不阻断 | ✅ PASS | handoff.md |
| S5 Codec 安全 | ✅ PASS | handoff.md |
| S6 Compaction | 🔴 阻塞 | BL-2 |
| D1 Plugin 发现（dogfood） | ✅ PASS | handoff.md |
| D2 Rule 注入（项目定制） | ✅ PASS | handoff.md |
| D3 Git-checker 阈值定制 | ✅ PASS | handoff.md |
| D4 Handoff 注入 | ✅ PASS | handoff.md |
| D5 项目代码可用 | ✅ PASS | handoff.md |

### 4.3 handoff.md 未完成项

| id | 项 | confidence | depends_on |
|----|----|-----------|------------|
| `s6-compaction-test` | S6 Compaction + Snapshot 实测 | Blocked | BL-2 |

**唯一剩余项**，等 BL-2 PR #12032 合并后执行。

---

## 5. 关键经验沉淀（从 handoff.md 提取）

### 5.1 已验证的技术经验

| 经验 | 证据 | 来源 |
|------|------|------|
| **registerRule 服从度杠杆**：事实陈述+否定祈使组合将工具调用率从 100% 降到 20% | A/B Round 2 n=10 | ab-test-clinerules-conflict.md §六 |
| **20% 是合理下限**：残留 2 次含 6 次合理读，冗余读率 10% | 同上 | handoff.md |
| **插件发现路径**：`~/.cline/plugins/installed/local/`（非项目级） | S1 验证 | handoff.md |
| **插件必须自包含**：跨目录 import 不可解析，需复制依赖 | 安装验证 | handoff.md |
| **registerRule 前缀是唯一服从度杠杆**：单独任一组件 100% 无效（协同效应/相变） | A/B 分解实验 | handoff.md |
| **beforeTool skip 有效**：CLI 3.0.37 尊重 `{ skip: true, reason }` | S3 验证 | handoff.md |

### 5.2 源码探查关键发现（第二轮，2026-07-06）

| 发现 | 位置 |
|------|------|
| `buildClineSystemPrompt()` 在 shared/prompt/cline.ts | VS Code 路径不传 rules |
| base prompt 是单体模板 9 section，约 600 token | — |
| cline 内置约束用 "Always/Do not" 措辞（非 MUST/SHALL） | 强约束力来自位置靠前 |
| Constitution ≤800 token 上限过于保守 | 建议放宽到 ≤2000 token |

---

## 6. 上次审计（2026-07-02）推进情况速览

> 审计报告 `expires_if_unchanged: 2026-07-16`，即将到期。本节做增量盘点。

### 6.1 四档优先级执行状态（基于 handoff.md + 文档实读）

| 档 | 内容 | 状态 |
|----|------|------|
| **第一档（减法+项目级补全）** | B1-B3 指针层 / C5 删硬引用 / C2-C3 角色审计 / K1-K3 项目级规则补全 / B4 下沉 | ✅ 基本完成（plugin/project-rules.md §3 已补全）|
| **第二档（止血）** | A1-A4 文档一致性 / G1 统计修正 / C1 ADR frontmatter / E4 Hypothesis 复查 / H4-H5 README 更新 | ✅ 基本完成 |
| **第三档（机制缺口）** | F2 §1.15 解除流程 / F3 读取门控 / D2 子代理证据 / G2-G3 评审跟踪 | ✅ 部分完成（F2/F3 已机制化）|
| **第四档（元规则）** | D5/D8 框架补强 / E1-E3 Hypothesis 生命周期 / J1-J3 退役机制 / J4 审查退出条件 | ✅ 大部分完成（D1/D3/D4/D6/D7/G4-G5/I1-I3 暂缓）|

### 6.2 5 个方法论根因改进落地

| 根因 | 改进措施 | 落地证据 |
|------|---------|---------|
| 1. 规则制定无可执行性评估 | plugin/project-rules.md §3 补全 + 执行证据字段 | ✅ |
| 2. 知识沉淀无生命周期管理 | evidence-governance §19 Hypothesis 生命周期 + lifecycle.md staleness | ✅ |
| 3. 工作流重触发轻退出 | §1.15 解除流程 + §6.5 审查退出条件 | ✅ |
| 4. 层级错配（治理预算） | dev-rules §6 冻结 + 项目级规则承载 | ✅ |
| 5. 规则演进加法 only | §6.4 规则退役流程 + §6.5 治理膨胀警报 | ✅ |

### 6.3 治理膨胀警报状态

- 2026-07-02 基线：56 项高严重度（13 系统性 + 43 局部性）→ **触发警报**（>50）
- 2026-07-12 当前：四档基本完成，警报应已缓解
- **建议**：本次回顾后可评估是否降级审查周期（月度 → 季度，按 §6.5.2 退出条件）

---

## 7. 给后续 AI 的指引（如何不忽视子项目）

> **本节是本报告的核心价值**——给后续接手项目的 AI 一份"项目全貌速读"。

### 7.1 接手项目时必读的 5 份文档（按顺序）

1. [docs/handoff.md](handoff.md) — 上一会话快照（决策/净变化/未完成项）
2. [docs/dev-rules.md](dev-rules.md) — 跨功能通用防漂移规则（§1.15 不可抗力声明必读）
3. [.governance/core/constitution.md](../.governance/core/constitution.md) — 框架宪法
4. [docs/decisions/README.md](decisions/README.md) — 决策索引（时间倒序）
5. 本报告 §2 子项目全景盘点

### 7.2 子项目关系速记

```
.governance/        → 框架核心（产出）
context-snapshot/   → Plugin 源码（submodule，被 .governance 同步使用）
search-mcp-wrapper/ → MCP 节流（被 skills/search-orchestrator 使用）
skills/search-orchestrator/ → Cline Skill（引用 search-mcp-wrapper）
docs/               → 文档体系（规则+决策+审计，被所有子项目引用）
scripts/            → 工具脚本（同步/测试/补丁）
```

### 7.3 常见忽视点（AI 易踩坑）

| 忽视点 | 后果 | 正确做法 |
|--------|------|---------|
| 只读 README.md 不读 .governance/ | 误以为项目只是文档 | .governance/ 才是核心产出 |
| 忽略 context-snapshot/ 是 submodule | 修改时不走 submodule 流程 | 先读 [context-snapshot/README.md](../context-snapshot/README.md) |
| 以为 search-mcp-wrapper 是独立产品 | 误判其定位 | 它是 search-orchestrator 的依赖 |
| 忽略 BL-1/BL-2 阻塞 | 写依赖 VS Code plugin 的代码 | 先读 dev-rules §1.15 不可抗力声明 |
| 忽略 docs/decisions/ 决策历史 | 重复已否决的决策 | 先读 decisions/README.md 索引 |
| 忽略 scripts/ 编码规范 | .ps1 中文乱码 | 遵循 plugin/project-rules.md §1.6 |

### 7.4 当前可推进 vs 阻塞事项

| 可推进 | 阻塞 |
|--------|------|
| CLI 端 plugin 功能增强（v0.7.0 提取器）| S6 compaction 实测（等 BL-2）|
| 治理规则迭代（.governance/rules/）| VS Code 端任何 Hook（等 BL-1）|
| 文档完善 / 审计 | snapshot 长对话实测（等 BL-2）|
| 新项目 dogfood | — |

---

## 8. 回顾结论

### 8.1 项目实际状态

- **框架 v1.0 已完成**，五层架构填充 100%，CLI 端全链路验证通过
- **两个上游阻塞项无进展**（BL-1 14 天 / BL-2 11 天），项目进入"等上游"阶段
- **子项目协同关系清晰**：6 类子项目各司其职，依赖关系明确
- **治理体系成熟**：上次审计 56 项问题四档基本完成，5 根因改进措施落地

### 8.2 给用户的建议

1. **BL-2 可考虑 ping cline team review**（handoff.md 已建议，本次核查确认仍 Open）
2. **BL-1 降级为长期不可用**，VS Code 端计划搁置，专注 CLI 端
3. **审查周期评估降级**：上次审计四档基本完成，可按 §6.5.2 评估月度 → 季度
4. **下一步功能方向**：v0.7.0 结构化提取器（CLI 端可推进，不依赖阻塞项）

### 8.3 本报告的时效性

- `evidence_as_of`: 2026-07-12
- `expires_if_unchanged`: 2026-07-26（14 天后）
- 引用前需复查：BL-1/BL-2 状态是否变化、v0.7.0 是否启动

---

## 9. 引用

- 上次审计基线：[project-health-audit-2026-07-02.md](project-health-audit-2026-07-02.md)
- 交接文件：[handoff.md](handoff.md)
- 框架宪法：[.governance/core/constitution.md](../.governance/core/constitution.md)
- 决策索引：[decisions/README.md](decisions/README.md)
- BL-1：[issue #11944](https://github.com/cline/cline/issues/11944)
- BL-2：[PR #12032](https://github.com/cline/cline/pull/12032)
- 项目工程纪律：[PROJECT_DEV_OUTLINE.md](PROJECT_DEV_OUTLINE.md)
