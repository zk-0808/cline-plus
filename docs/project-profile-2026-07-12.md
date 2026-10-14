# 项目情况文档：Cline-Plus（面向 AI Agent 的工程治理与上下文优化框架）

> **用途**：为简历撰写提供项目事实依据。包含发展历程、两条主线详解、具体成果、量化数据。
> **日期**：2026-07-12
> **证据来源**：ADR/D 决策实读 / 实验报告实读 / handoff.md 实读 / 源码实读 / WebFetch 核查

---

## 一、项目概况

| 项 | 值 |
|----|-----|
| **项目名** | Cline-Plus（Cline 扩展层） |
| **定位** | 面向 Cline AI Agent 的工程治理与上下文优化框架 |
| **形态** | git template repo（开箱即用配置 + Plugin 运行时） |
| **时间跨度** | 2026-06-15 ~ 至今（约 4 周，v1.0 已 tag 于 2026-07-09） |
| **代码规模** | 6 类子项目协同（详见 §三） |
| **技术栈** | TypeScript / Node.js / Cline Plugin SDK / MCP |
| **当前版本** | v1.0（框架填充 100%，CLI 端全链路验证通过） |

**一句话定位**（来自 ADR-002）：面向 Cline 用户的开箱即用工作流增强配置——沉淀真实使用经验，并逐步将经验机制化，持续改善长期使用体验。

---

## 二、项目脉络：两条主线并行推进

项目围绕**两个核心问题**展开，两条主线并行启动（均于 2026-06-23 启动决策），但产出节奏不同：

```
主线一：网络搜索增强（MCP + Skill）          主线二：会话记忆系统
   │                                           │
   问题：AI Agent 检索能力缺失                  问题：长会话上下文丢失
   │                                           │
   06-23 调研 + P1 Goggle 决策                 06-23 ADR-001 方向决策
   06-23~25 P1-P6 连续决策 + A/B 实验          06-28 ADR-005 拆分窗口内/跨窗口（概念深化）
   06-26 节流 wrapper 采纳                     06-28 SDK 回滚 → 转 CLI 验证
   ↓                                           07-02 健康审计（56 项问题）
   search-orchestrator v1.0（先产出成果）       07-03~09 治理框架化 + 五层架构
                                               ↓
                                               context-snapshot plugin + governance 框架 v1.0
```

### 主线一：网络搜索增强

**核心问题**：Cline 原生缺乏网络搜索能力，且主流 Agent 搜索体系的真正能力差距不在搜索引擎本身，而在围绕搜索的 5~7 个工程动作（调研结论，survey.md §1）。

**产出**：
1. **search-mcp-wrapper**（v0.1.0）：包裹 duckduckgo-websearch，提供反-bot 节流（强制 max_results≤10 + 跨调用状态 + 指数退避熔断）
2. **search-orchestrator Skill**（v1.0.0）：搜索编排器方法论，强制 Plan→Search→Evaluate→Decide 流程
3. **调研报告 survey.md**：主流 Agent 搜索功能实现调研（Exa/Tavily/Perplexity/Brave Goggles 等 9 类手法）

**关键实验**：3 轮 A/B 实验验证机制有效性
- Run #1：Domain Goggles + FinalScore 联动（4/5 ✅）
- Run #2/#3：三路 fanout（3.6/5 ⚠️ → 2.6/5 ❌，回退 DiversityPenalty）
- Run #14：Gap Ledger 强制缺口枚举（4/5 ✅，Gap Recall +55.6%）

### 主线二：会话记忆系统

**核心问题**：AI Agent 长会话存在两类上下文丢失——窗口内压缩丢失细节、跨窗口续作丢失状态。

**关键决策演化**（ADR-005 是核心转折）：

| 时间 | 认知 | 决策 |
|------|------|------|
| 06-23 | compact 与 handoff 耦合（一个触发器、一个产物） | ADR-001 选定方向 |
| 06-28 | **拆清两类问题**：窗口内压缩（token 管理）≠ 跨窗口恢复（状态持久化） | **ADR-005 拆分** |
| 06-28 | VS Code SDK 回滚，plugin 系统消失 | 转 CLI 验证（BL-1） |
| 07-09 | context-snapshot plugin + governance 框架 v1.0 | 框架完成 |

**ADR-005 拆分原则**（项目的核心概念贡献）：

| 维度 | Compaction（窗口内） | Handoff（跨窗口） |
|------|---------------------|------------------|
| 目的 | 让对话能继续（token 管理） | 让任何 agent 能接手（状态持久化） |
| 触发 | token 阈值（被动） | 状态显著变化时（主动） |
| 产物 | context snapshot | handoff.md |
| 消费者 | 模型 | 人/任何 agent |
| 存储 | Cline 内部 | 文件系统 + git |
| 命名 | `context snapshot` | `handoff` |

**产出**：
1. **context-snapshot plugin**（v0.6.0，submodule）：compact 触发时自动生成结构化 snapshot
2. **.governance/ 治理框架**（v1.0）：五层架构 + 6 个 Capability 模块 + 4 类 Hook
3. **handoff.md 机制**：跨会话状态恢复协议（人可读 + git 可追踪 + agent 无关）

---

## 三、子项目全景（6 类协同）

### 子项目 A：`.governance/`（框架核心，主产出）

**五层架构**：

| 层 | 目录 | 职责 | 生命周期 |
|----|------|------|---------|
| L1 Core | `core/` | 跨项目通用宪法（≤800 token 判定动作） | 年/月 |
| L2 Rules | `rules/` | 装好即生效的薄入口（每份 ≤50 行） | 周 |
| L3 Capability | `capabilities/` | "怎么做"的代码模块（pass/block/inject） | 月 |
| L4 Hooks | `hooks/` + `plugin/` | "什么时候调用"的事件驱动检查 | 天 |
| L5 Runtime | `HANDOFF.md` + `runtime/` | 动态状态文件 | 每次 session |

**6 个 Capability 模块**（全部实现，tsc 通过）：

| 模块 | 职责 | 状态 |
|------|------|------|
| git-checker | git 未 commit 文件堆积检测 → block | ✅ |
| snapshot-writer | PreCompact 时写 snapshot.json | ✅ |
| handoff-provider | SessionStart 注入 HANDOFF.md + snapshot + constitution | ✅ |
| rule-appender | 经验追加到 HANDOFF.md 待沉淀区（33 测试过） | ✅ |
| staleness-sweeper | 待沉淀区过期条目清理 | ✅ |
| tracer | 治理行为可观测层 | ✅ |

### 子项目 B：`context-snapshot/`（Plugin 源码，submodule）

- 版本：v0.6.0，独立 git 仓库
- 架构：messageBuilder（compact 介入）+ beforeModel（Loop Guard）+ registerRule（静态注入）
- 核心文件：`index.ts` / `compaction.ts` / `snapshot-writer.ts` / `tool-recorder.ts` / `rules-injector.ts`

### 子项目 C：`search-mcp-wrapper/`（MCP 节流）

- 版本：v0.1.0
- 能力：强制 max_results≤10 + 跨调用状态 + 指数退避熔断（CIRCUIT_OPEN 状态）
- 验证：Run #14 功能性验证通过（3 次熔断正确触发指数退避）

### 子项目 D：`skills/search-orchestrator/`（Cline Skill）

- 版本：v1.0.0，category: workflow，preferred_mode: plan
- 核心机制：Phase 0 复杂度门控（L0-L3）+ 三路 fanout + Domain Goggles + FinalScore 联动 + Gap Ledger + Evidence-bound Citation
- 经多轮 A/B 实验验证（Run #1/#2/#3/#5/#6/#10/#14）

### 子项目 E：`docs/`（文档体系）

- 5 份规则文档（dev-rules / evidence-governance / reviewer-personas / plugin/project-rules / search/project-rules）
- 决策索引（ADR-001~008 + 12 个 D 决策 + 7 个 investigation-note）
  > **订正（2026-10-14 复核）**：本行数字不实。实测 `docs/decisions/adr/` 仅 **6** 个 ADR（ADR-001/002/004/005/006/007，**无 ADR-003、无 ADR-008**）；`.governance/decisions/adr/` 另有 ADR-007、ADR-008 共 2 个（编号与前者共用同一序列）。`D-*` 实为 **13** 个（`docs/decisions/` 根 1 + `search/` 9 + `docs/archive/decisions/` 3）。"ADR-001~008"这个范围表述不成立。
- 审计报告（2026-07-02 健康审计：56 项问题，5 根因，四档计划）
- 开发者指南（30 分钟跑通框架）

### 子项目 F：`scripts/`（工具脚本）

- 同步脚本（sync-governance-plugin.ps1）
- A/B 测试脚本（ab-test-round2.ps1）
- 补丁脚本（patch-vscode-plugin-support.ps1）
- 测试脚本（test-hook-injection.ps1 / smoke-tracing.mjs）

---

## 四、具体成果（量化数据）

### 4.1 搜索增强线成果

| 指标 | 值 | 来源 |
|------|-----|------|
| A/B 实验轮数 | 14 轮（Run #1~#14） | experiments/ |
| 采纳的机制决策 | 7 个（P1/P1.5/P3/P4/P6 + 节流 wrapper + Gap Ledger） | decisions/search/ |
| Gap Recall 提升 | +55.6%（Run #14 验证） | run-14 |
| 回退的机制 | 1 个（DiversityPenalty，Run #3 证伪） | D-2026-06-24-rollback |
| 调研覆盖主流 Agent | 4 个（Exa/Tavily/Perplexity/Brave） | survey.md |
| 调研识别工程手法 | 9 类（M1~M9） | survey.md §2 |

### 4.2 会话记忆线成果

| 指标 | 值 | 来源 |
|------|-----|------|
| ADR 决策数 | ~~8 个（ADR-001~008）~~ → **订正：6 个（ADR-001/002/004/005/006/007）**；另 `.governance/decisions/adr/` 2 个（ADR-007/008，共用编号序列） | decisions/adr/ |
| 运营决策数 | ~~12 个（D 决策）~~ → **订正：13 个**（`decisions/` 根 1 + `search/` 9 + `archive/decisions/` 3） | decisions/ |
| 治理框架版本 | v1.0（2026-07-09 tag） | git tag |
| 框架填充完成度 | 100%（GV-1 + GV-6 + GV-7 + **GV-6 设计交付的 4 个** Capability + Plugin 运行时 + hooks） | handoff.md |
| Capability 模块数 | **目录实体 6 个**（全部实现，tsc 通过）——比 GV-6 设计交付多 `staleness-sweeper`、`tracer`；两行口径不同，勿混用 | capabilities/ |
| CLI 端验证测试 | S1-S5 全通过 + D1-D5 dogfood 全通过 | handoff.md |
| 验证测试总数 | 10 项（5 CLI 端 + 5 跨项目 dogfood） | handoff.md |

### 4.3 服从度杠杆发现（A/B Round 2，核心工程发现）

**实验设计**：n=10，prefix 分解（事实陈述 only / 否定祈使 only / 两者组合），二元指标 + 冗余/合理标签。

**结果**：

| 变体 | n | 有工具调用的运行 | 冗余读率 |
|------|---|----------------|---------|
| 事实陈述 only | 10 | 10 (100%) | 100% |
| 否定祈使 only | 8 | 8 (100%) | 100% |
| **两者组合（生产配置）** | 10 | **2 (20%)** | **10%** |

**核心发现**：**协同效应/相变**——单独任一组件 100% 无效，组合后降至 20%。模型需要同时知道"内容已存在"（事实陈述）和"不要验证"（否定祈使）才建立足够信任。

**结论**：20% 是合理下限（残留 2 次含 6 次合理读，冗余读率仅 10%），不应继续往 0 压。

### 4.4 健康审计成果（2026-07-02）

| 指标 | 值 |
|------|-----|
| 审计问题总数 | 56 项（13 系统性 + 43 局部性） |
| 方法论根因 | 5 个 |
| 四档优先级计划 | 全部基本完成（2026-07-12 核查） |
| 根因改进措施落地 | 5/5 全部落地 |

---

## 五、工程实践与方法论

### 5.1 工程纪律（PROJECT_DEV_OUTLINE.md）

**A/B/C 分类纪律**（项目最高准则）：
- A 类（运行时问题）→ 待机制化，不写规则
- B 类（Cline 限制）→ 打补丁 + 退休标记
- C 类（认知问题）→ 长期保留，写进 constitution

**五问门控**（新功能启动前）：原生是否已有 / 是否有扩展点 / 社区是否有方案 / 缺失还是不会用 / 重新开始还会做

**停止条件**：连续 3 次提交都是治理 / 出现"未来再研究" / 出现"我到底在做什么"

### 5.2 证据治理框架（evidence-governance.md）

- 结论时效性模型（默认 14 天 + ADR frontmatter `evidence_as_of` / `expires_if_unchanged`）
- Hypothesis 生命周期管理（声明日 / 必须补证日 / 超期处置）
- 禁止跳级（Observation → Evidence → Hypothesis → Verified → Decision）
- Conflict Registry（多源证据矛盾裁定）

### 5.3 决策沉淀（ADR 体系）

- ADR（战略决策）+ D 决策（运营决策）+ investigation-note（调查笔记）
- 状态机：proposed → active → superseded / rolled-back
- 不删除回退决策（项目记忆的一部分）

### 5.4 治理框架设计原则

- **正交原则**：Capability 只表达意图（intent），Hook 执行动作
- **原生机制优先**（ADR-006 元原则）：完美利用 cline 原生机制提升到最高级
- **五层架构**：Core/Rules/Capability/Hooks/Runtime，按生命周期分层
- **handoff-schema**：五个核心语义实体（Decision/Change/Verification/Blocker/Handoff）

---

## 六、阻塞与应对

### 6.1 两个上游阻塞（2026-07-12 WebFetch 核查）

| 阻塞项 | 状态 | 无进展天数 | 影响 |
|--------|------|-----------|------|
| BL-1：VS Code plugin 系统不可用（issue #11944） | 🔴 Open | 14 天 | VS Code 端全部 Hook |
| BL-2：CLI codec bug（PR #12032） | 🔴 Open | 11 天 | S6 compaction 实测 |

### 6.2 工程应对

- **CLI 先跑通策略**：BL-1 导致 VS Code 端不可用 → 转 CLI 端验证，S1-S5 + D1-D5 全通过
- **提交上游修复**：BL-2 提交 PR #12032（含 regression test），等待合并
- **短对话 workaround**：BL-2 阻塞长对话实测 → 用短对话测试验证 beforeModel 时序假设
- **不可抗力声明**：dev-rules §1.15 显式声明 BL-1/BL-2 为不可抗力，不阻塞框架交付

---

## 七、简历评估建议

### 7.1 项目的核心价值锚点（简历可挖掘的点）

| 价值点 | 证据强度 | 简历适配度 |
|--------|---------|-----------|
| **问题驱动的架构演化**（compact/handoff 拆分） | 强（ADR-005） | ⭐⭐⭐⭐⭐ 体现概念深化能力 |
| **A/B 实验驱动的机制验证**（14 轮 + 服从度相变发现） | 强（实验报告） | ⭐⭐⭐⭐⭐ 体现工程严谨性 |
| **面对不可抗力的工程判断**（BL-1/BL-2 应对） | 强（handoff + PR） | ⭐⭐⭐⭐ 体现推进力 |
| **五层治理架构**（6 Capability + 4 Hook） | 强（代码实现） | ⭐⭐⭐⭐ 体现架构能力 |
| **两条主线并行推进**（搜索 + 记忆） | 强（决策索引） | ⭐⭐⭐⭐ 体现问题拆解能力 |
| **完整的证据治理方法论**（evidence-governance） | 强（框架文档） | ⭐⭐⭐ 偏方法论，面试加分 |

### 7.2 简历叙事建议

**当前简历问题**：按架构维度组织（五层架构/实验/治理/质量），没有体现项目的问题驱动脉络。

**建议叙事**（问题驱动）：

```
核心问题：AI Agent 长会话的两类上下文丢失 + 检索能力缺失

两条主线：
1. 网络搜索增强（MCP + Skill）
   - 调研主流 Agent 搜索体系（Exa/Tavily/Perplexity/Brave，9 类手法）
   - 设计 search-orchestrator Skill + 节流 MCP wrapper
   - 14 轮 A/B 实验验证（Gap Recall +55.6%）

2. 会话记忆系统（窗口内压缩 vs 跨窗口恢复拆分）
   - 识别概念耦合：compact 与 handoff 绑定
   - ADR-005 拆分：窗口内（token 管理，被动）vs 跨窗口（状态持久化，主动）
   - 实现 context-snapshot plugin + governance 框架 v1.0

工程发现：A/B Round 2 揭示服从度杠杆的协同效应/相变
   - 单独事实陈述 100% 无效，单独否定祈使 100% 无效
   - 组合后降至 20%（冗余读率 10%）
   - 10 项端到端验证全通过（5 CLI + 5 跨项目 dogfood）

工程判断：识别 2 个上游阻塞，CLI 先跑通 + 提交修复 PR
```

### 7.3 数据可信度分级

**可直接写入简历的高可信数据**：
- 14 轮 A/B 实验（实验报告实存）
- 10/10 → 2/10（A/B Round 2 n=10 实测）
- Gap Recall +55.6%（Run #14 验证）
- 10 项端到端验证全通过（S1-S5 + D1-D5）
- 6 个 Capability 模块（代码实存）
- v1.0 已 tag（git 实存）

**需谨慎的数据**：
- "8 万余字文档"——需实查字数
- "2 个项目 dogfood"——dogfood 项目是 task-tracker CLI，真实存在

**不应写入简历的**：
- BL-1/BL-2 具体编号（过于细节）
- registerRule 前缀细节（面试时讲）
- 6 类子项目全景（简历层级不需要）

### 7.4 面试可讲的深度故事

1. **概念拆分故事**：compact 与 handoff 耦合 → ADR-005 拆分 → 体现概念澄清能力
2. **A/B 实验故事**：14 轮实验 + 服从度相变发现 → 体现工程严谨性
3. **上游阻塞故事**：VS Code plugin 消失 → CLI 先跑通 + 提交 PR → 体现推进力
4. **方法论故事**：证据治理框架 + ADR 体系 → 体现工程纪律

---

## 八、引用

- 项目大纲：[PROJECT_DEV_OUTLINE.md](PROJECT_DEV_OUTLINE.md)
- ADR 索引：[decisions/README.md](decisions/README.md)
- 交接状态：[handoff.md](handoff.md)
- 框架宪法：[.governance/core/constitution.md](../.governance/core/constitution.md)
- Capability 设计：[.governance/capabilities/README.md](../.governance/capabilities/README.md)
- A/B 测试报告：[decisions/investigation/ab-test-clinerules-conflict.md](decisions/investigation/ab-test-clinerules-conflict.md)
- 搜索调研：[search/search-orchestrator/survey.md](search/search-orchestrator/survey.md)
- 上次审计：[project-health-audit-2026-07-02.md](project-health-audit-2026-07-02.md)
- BL-1：[issue #11944](https://github.com/cline/cline/issues/11944)
- BL-2：[PR #12032](https://github.com/cline/cline/pull/12032)
