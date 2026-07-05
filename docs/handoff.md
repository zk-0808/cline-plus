# Handoff — 框架 v1.0 设计完成 + issue 追踪 + hook 经验洞察

> **生命周期**：每次覆写，无归档——会话交接文件。
> **进入规则**：会话开始时先读 `plugin/project-rules.md`（若未归档），再读本文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `gv1-rubric-defined` | GV-1 rubric 五维判定清单（触发条件/执行门控/失败动作/证据类型/沉淀位置）确立，作为 EX-* 通用化蒸馏的硬前置工具 | Verified | `gv7-contract-frozen` |
| `gv1-constitution-frozen` | GV-1 Core Constitution v1.0 冻结：7 章节 + 8 项项目可调参数。≤800 token 判定动作 + 项目取值分离 | Verified | `gv1-rubric-defined` |
| `ex-1a-thin-entries` | EX-1a 两个薄入口完成：`rules/handoff-entry.md` + `rules/lifecycle.md`，每份 ≤50 行 | Verified | `gv1-constitution-frozen` |
| `ex-1b-2-3-distilled` | EX-1b/EX-2/EX-3 三个 examples/ 通用化完成，每个含 cline++ 假设清单区块（≥7 项）+ 修改提示区 | Verified | `gv1-rubric-defined` |
| `ex-4-handoff-example` | EX-4 handoff-example.md 完成：四区结构填充示例 + 假设清单 + 修改提示 | Verified | `gv1-constitution-frozen` |
| `gv7-attached-outputs` | GV-7 附带产出完成：`.clinerules` 薄入口 + 根 `HANDOFF.md` 模板 + `runtime/snapshot.json` JSON Schema | Verified | `gv7-contract-frozen` |
| `gv6-capability-design` | GV-6 4 Capability 综合设计完成：SessionContext/HookEvent 类型补齐 + git-checker/snapshot-writer/handoff-provider/rule-appender 完整接口+算法+失败模式 | Verified | `gv7-contract-frozen` |
| `hooks-design-complete` | `.governance/hooks/README.md` 完成：4 Hook 设计文档（session-start/pre-tool/post-tool/pre-compact），含配置接口+执行流程+config.json 示例 | Verified | `gv6-capability-design` |
| `capability-impl-2` | handoff-provider（250 行,tsc 通过）+ rule-appender（300 行,8 场景 33 测试全过）实现完成,零依赖 | Verified | `gv6-capability-design` |
| `project-rules-repositioned` | dev-rules.md 与 plugin/project-rules.md 状态调整为"示例包参考实现（冻结追加）" | Verified | `delivery-positioning-pivot` |
| `issue-tracker-2026-07-05` | BL-1（VS Code plugin 系统不可用）：v4.0.1/v4.0.2 回滚到 pre-SDK,plugin 子系统代码完全不存在,无 assignee/milestone/PR,7 天无官方回复。BL-2（codec bug PR #12032）：Open,Greptile 评分 4/5 建议合并,但作者未回应 review（空字符串处理 + 单对象/null 分支缺测试）,未合并 | Verified | - |
| `hook-experience-insight` | **关键洞察**：context-snapshot/ submodule 已有成熟可跑的 hook 实现（beforeTool commit 守卫 + beforeModel compaction 检测 + afterTool Loop Guard + registerRule ADR-007 + registerMessageBuilder），且有完整设计文档 hook-auto-injection-design.md（§0 Hook 化分层判据 + §2 选型表 + §3 注入方式 Phase 0→3 验证）。框架 `.governance/hooks/` 不必从零开发,可改造 context-snapshot/ 为框架 CLI 端运行时 | Verified | `hooks-design-complete` |
| `runtime-plugin-newbuild-decision` | **决策**：框架 CLI 端运行时新造,不改造 context-snapshot/。理由：context-snapshot 是基于 hook 实现的 Cline plugin（服务 cline++ 专属,含 codec bug workaround/V6 Loop Guard/cline++ 路径）,改造会过耦合——破坏 submodule 独立性或需 fork。新造可借鉴 context-snapshot 经验（hook 注册方式/context 字段访问/registerRule 调用模式）,但架构不同（配置驱动 + Capability 动态加载） | Verified | `hook-experience-insight` |
| `prompt-layering-research-plan` | **规划**：源码探查 cline 提示词分层注入机制。5 个并行 subagent 任务（Task A registerRule 注入点 / Task B .clinerules 加载 / Task C registerMessageBuilder 机制 / Task D 系统提示词总流程 / Task E rule 失效场景）。逾期处置：2026-07-19 未执行则降级为"以实测经验为准" | Hypothesis | `runtime-plugin-newbuild-decision` |

## 本会话净变化

### 治理层

- 修改 [docs/dev-rules.md](dev-rules.md)：状态调整为"📖 示例包参考实现（冻结追加）"
- 修改 [docs/plugin/project-rules.md](plugin/project-rules.md)：生命周期调整为"示例包参考实现"

### 框架产物（`.governance/` 命名空间）

```
.governance/
├── core/
│   ├── constitution.md          ← GV-1 v1.0
│   └── rubric.md                 ← GV-1 五维判定清单
├── rules/
│   ├── handoff-entry.md          ← EX-1a 薄入口
│   └── lifecycle.md              ← EX-1a 生命周期薄入口
├── examples/
│   ├── dev-rules.md              ← EX-1b 通用化（假设清单 10 项）
│   ├── evidence-governance.md   ← EX-2 通用化（假设清单 8 项）
│   ├── reviewer-personas.md     ← EX-3 通用化（假设清单 7 项）
│   └── handoff-example.md        ← EX-4 填写示例
├── capabilities/
│   ├── README.md                 ← GV-6 4 Capability 综合设计
│   ├── handoff-provider/         ← TS 实现（250 行,tsc 通过）
│   └── rule-appender/            ← TS 实现（300 行,33 测试过）
├── hooks/
│   └── README.md                 ← 4 Hook 设计文档
└── runtime/
    └── snapshot.json             ← 空 JSON Schema
```

### 框架根部

- 新建 [.clinerules](.clinerules)：Cline 加载入口
- 新建 [HANDOFF.md](HANDOFF.md)：空模板（含待沉淀区）
- 新建 [README.md](README.md)：框架安装与使用说明

### 关键经验

- **rubric 五维蒸馏有效**：触发条件/执行门控/失败动作/证据类型/沉淀位置足以拆解全部规则,未出现失效信号
- **subagent 并行通用化高效**：3 个 examples/ 蒸馏并行,单任务平均假设清单 7-10 项
- **共用类型集中定义避免接口漂**：GV-6 SessionContext/HookEvent 集中锁定,避免 4 个 Capability 各自定义
- **薄入口量化纪律有效**：rules/ ≤50 行与 core/ ≤800 token 一致
- **hook 经验在 context-snapshot/ 已成熟**：beforeTool/beforeModel/afterTool/registerRule/registerMessageBuilder 五种机制均有可跑实现 + 完整设计文档,**框架 hook 实现可借鉴经验但应新造**（避免过耦合 submodule）
- **issue 短期不解除**：BL-1 VS Code 7 天无回复,BL-2 PR 有进展但作者未回应,继续按"CLI 先跑"策略推进
- **rule 注入需源码验证**：实测发现"cline 内部系统提示词影响大到 rule 注入不能生效",ADR-007 基于行为观察选 registerRule 但未源码验证注入点。已派源码探查规划（5 subagent 任务）,逾期 2026-07-19 降级为"以实测经验为准"

## 待办

### 未完成项

| id | 项 | confidence | depends_on |
|----|----|-----------|------------|
| `cline-prompt-layering-research` | 派 5 个并行 subagent 探查 cline 提示词分层注入机制（Task A-E,详见 investigation-plan-cline-prompt-layering.md）。产出：完整 prompt 分层图 + registerRule 注入点验证。**逾期 2026-07-19 降级** | Hypothesis | `prompt-layering-research-plan` |
| `runtime-plugin-newbuild` | 框架 CLI 端运行时新造（不改造 context-snapshot/,避免过耦合）。借鉴 context-snapshot hook 经验但架构不同：配置驱动 + Capability 动态加载。需先答 4 个开放问题（单一/多 plugin、dynamic/static 加载、预编译方式、目录位置） | Likely | `cline-prompt-layering-research` |
| `capability-impl-snapshot-writer` | snapshot-writer Capability 实现（借鉴 context-snapshot/src/snapshot-writer.ts 设计,新造代码） | Likely | `runtime-plugin-newbuild` |
| `capability-impl-git-checker` | git-checker Capability 实现（借鉴 context-snapshot/src/git-status-checker.ts 设计,新造代码） | Likely | `runtime-plugin-newbuild` |
| `capability-sop-doc` | `.governance/capabilities/SOP.md` —— Capability 开发 7 步清单（读契约→读示例→定档位→写方案→实现→tsc→清理）,适配框架场景 | Hypothesis | - |
| `dogfood-second-project` | 第二个项目 dogfood 验证框架通用性 | Hypothesis | `runtime-plugin-newbuild` |
| `framework-v1.0-tag` | 框架版本号 v1.0 git tag（dogfood 验证后） | Hypothesis | `dogfood-second-project` |

### 后续可选

- 🔲 `.governance/decisions/adr/` 目录建立（首个 ADR：GV-7 冻结决策归档）
- 🔲 ADR-007 迁入框架（snapshot registerRule 静态注入）
- 🔲 verify-hook-injection.cjs 通用化（剥离 cline++ 路径,作为框架 CLI 测试脚本）

## 阻塞项

| 阻塞点 | 影响 | 缓解 | 追踪日 |
|--------|------|------|--------|
| BL-1 VS Code plugin 系统不可用（issue #11944）| VS Code 端全部 Hook | CLI 端先跑通;v4.0.1/v4.0.2 回滚到 pre-SDK,plugin 子系统代码完全不存在,7 天无官方回复 | 2026-07-05 |
| BL-2 CLI codec bug（PR #12032 Open）| RT-2 snapshot 实测 + HK-1 循环检测实测 | 短对话测试 workaround;PR Greptile 4/5 建议合并但作者未回应 review（空字符串处理 + 单对象/null 分支缺测试） | 2026-07-05 |

## 关键资源

```
GV-7 契约:       docs/decisions/delivery-framework-design.md（v1.2 冻结）
GV-1 宪法:        .governance/core/constitution.md
GV-1 rubric:      .governance/core/rubric.md
GV-6 设计:        .governance/capabilities/README.md
Hook 设计:        .governance/hooks/README.md
handoff-provider: .governance/capabilities/handoff-provider/
rule-appender:   .governance/capabilities/rule-appender/
hook 实现范本:    context-snapshot/src/index.ts（beforeTool/beforeModel/afterTool/registerRule/registerMessageBuilder 全套）
hook 设计范本:    docs/decisions/hook-auto-injection-design.md（§0 三层判据 + §2 选型表 + §3 注入方式 Phase 0→3 验证）
ADR-007:         docs/decisions/adr/ADR-007-snapshot-registerRule-static-injection.md
验证脚本范本:    context-snapshot/verify-hook-injection.cjs
源码探查规划:    docs/decisions/investigation/investigation-plan-cline-prompt-layering.md（5 subagent 任务 + 复查触发条件）
```

### 已知事实

- 框架填充完成度：GV-1 + EX-1a/1b + EX-2~4 + GV-6 + GV-7 附带产出 + hooks 设计 + 2 个 Capability 实现 = 100%（GV-7 §六填空映射表 + 后续推进）
- 两个 commit 已 push：`e571b6b`（框架填充）+ `aeddcf3`（README + hooks + 2 Capability 实现）
- **hook 经验已在 context-snapshot/ 成熟**：5 种 hook 机制均有可跑实现,框架 hook 开发路径是"新造借鉴经验"而非"改造"（避免过耦合 submodule）
- **运行时开发决策已定**：新造,不改造 context-snapshot/。借鉴 hook 经验但架构不同（配置驱动 + Capability 动态加载）
- **源码探查规划已就绪**：5 个并行 subagent 任务（Task A-E）,可在云端派发执行,逾期 2026-07-19 降级
- BL-1/BL-2 短期不解除,继续按"CLI 先跑"策略推进

## 新会话首动作

1. 读 [plugin/project-rules.md](plugin/project-rules.md)（若未归档）
2. 读本文件
3. 读 [.governance/](../.governance/) 目录树
4. 读 [docs/decisions/investigation/investigation-plan-cline-prompt-layering.md](decisions/investigation/investigation-plan-cline-prompt-layering.md)（源码探查规划,若要执行派 subagent）
5. 读 [context-snapshot/src/index.ts](../context-snapshot/src/index.ts) 与 [docs/decisions/hook-auto-injection-design.md](decisions/hook-auto-injection-design.md)（hook 实现与设计范本）
6. 按优先级推进：`cline-prompt-layering-research`（派 5 subagent）→ `runtime-plugin-newbuild`（新造,先答 4 个开放问题）→ `capability-impl-snapshot-writer` / `capability-impl-git-checker`（借鉴范本新造）→ `capability-sop-doc` → `dogfood-second-project`

## 引用

- GV-7 契约：[delivery-framework-design.md](decisions/delivery-framework-design.md)
- GV-1 宪法：[.governance/core/constitution.md](../.governance/core/constitution.md)
- GV-6 设计：[.governance/capabilities/README.md](../.governance/capabilities/README.md)
- Hook 设计：[.governance/hooks/README.md](../.governance/hooks/README.md)
- Hook 实现范本：[context-snapshot/src/index.ts](../context-snapshot/src/index.ts)
- Hook 设计范本：[hook-auto-injection-design.md](decisions/hook-auto-injection-design.md)
- ADR-007：[ADR-007-snapshot-registerRule-static-injection.md](decisions/adr/ADR-007-snapshot-registerRule-static-injection.md)
- 上一会话 handoff：GV-7 冻结版（本文件前一版本）

---

## Handoff（推荐下次会话开局交接语句）

```text
读 docs/handoff.md + docs/dev-rules.md + docs/plugin/project-rules.md（若未归档）。
```
