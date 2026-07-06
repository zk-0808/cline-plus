# Handoff — A/B Round 2 完成 + 协同效应确认

> **生命周期**：每次覆写，无归档——会话交接文件。
> **进入规则**：会话开始时先读 `plugin/project-rules.md`（若未归档），再读本文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `cli-discovery-path-fix` | ✅ 插件发现路径修正：项目级 `.cline/plugins/` → `~/.cline/plugins/installed/local/`。CLI 只扫描用户主目录，不扫描项目目录。创建 `scripts/sync-governance-plugin.ps1` 同步脚本 | Verified | `runtime-plugin-newbuild` |
| `plugin-self-contained` | ✅ 插件必须自包含：`hooks/pre-compact.ts` 依赖 `../../capabilities/snapshot-writer/`，同步时需一并复制 capabilities，import 路径修正为 `../capabilities/` | Verified | `cli-discovery-path-fix` |
| `rule-injection-obedience` | ✅ 修正：前缀的**事实陈述+否定祈使组合**是唯一有效杠杆（协同效应）。单独任一组件 100% 无效，组合后 20%（n=10）。原结论"位置+服从惯性"和"冲突假说"均被证伪 | Verified | `ab-test-round2` |
| `s1-s5-all-pass` | ✅ S1-S5 CLI 集成测试全部通过。S6 受 BL-2 阻塞 | Verified | `cli-discovery-path-fix` |
| `ab-test-round2` | ✅ Round 2 完成：prefix 分解 n=10。R2-A1(事实 only) 100%、R2-A2(祈使 only) 100%、R2-A3(两者) 20% 工具调用率。**协同效应确认**：单独无效，组合生效。冗余读率 10%，含合理读，停止优化 | Verified | `ab-test-clinerules-conflict` |

## 本会话净变化

### 1. 插件发现路径修正（根因修复）

**问题**：governance 插件放在项目级 `.cline/plugins/governance/`，Cline CLI 只扫描 `~/.cline/plugins/installed/local/`，插件不被发现。

**修复**：
- 删除项目级 `.cline/plugins/governance/` proxy
- 创建 `scripts/sync-governance-plugin.ps1` 同步脚本
- 目标路径：`~/.cline/plugins/installed/local/governance/`
- junction：`~/.cline/plugins/_installed/local/governance` → `installed/local/governance`（§13.11 双目录要求）

### 2. 插件自包含化

**问题**：`hooks/pre-compact.ts` 和 `hooks/session-start.ts` 依赖 `../../capabilities/snapshot-writer/` 和 `../../capabilities/git-checker/`，跨目录引用在安装路径下无法解析。

**修复**：
- 同步时将 3 个 capability 目录（snapshot-writer / git-checker / handoff-provider）一并复制到 `~/.cline/plugins/installed/local/governance/capabilities/`
- 修正 import 路径：`../../capabilities/` → `../capabilities/`

### 3. Rule 注入服从度 — A/B Round 2 最终修正

**原始理解**："模型不服从是因为位置差 + 冲突" → 加前缀克服位置劣势

**Round 1 修正（n=3）**：位置假说证伪、冲突假说无法验证，前缀是唯一杠杆

**Round 2 修正（n=10）—— prefix 分解实验**：
- R2-A1（事实陈述 only）：**100% 工具调用率**
- R2-A2（否定祈使 only）：**100% 工具调用率**
- R2-A3（两者组合 = 生产配置）：**20% 工具调用率，10% 冗余读率**
- **核心发现：协同效应**——两个组件单独完全无效，组合后效果跃升（相变）
- 机制：事实陈述建立"内容已存在"信任 + 否定祈使抑制"验证"冲动 → 两者同时才建立足够信任
- 残留 2 次工具调用含 6 次合理读（注入段外内容）→ **10% 是合理下限，停止优化**

详见 `docs/decisions/investigation/ab-test-clinerules-conflict.md` §六

**当前配置**（R2-A3 = B+完整前缀，已部署并经 n=10 验证）：
- `.clinerules`：条件语言（"若出现注入段...直接使用；否则手动读 HANDOFF.md"）
- registerRule：完整前缀（事实陈述 + 5 条行为指令 + 否定祈使，**不可拆分**）

### 4. S2 测试方法修正

**问题**：问"governance 规则"太泛，模型把 `~/AGENTS.md`（Cline 原生 `.clinerules` 加载）也当成 governance 内容。

**修正**：问 governance 特有内容（如"What is the title of section 1 in Core Constitution?"），模型正确回答"执行主体边界"。

### 5. 新增文件

- `scripts/sync-governance-plugin.ps1` — 完整同步脚本
- `scripts/ab-test-round2.ps1` — Round 2 实验脚本（3 变体 × n=10）
- `docs/decisions/investigation/ab-test-clinerules-conflict.md` — A/B 差分测试报告（Round 1 + Round 2 完成，含协同效应结论）
- `.governance/capabilities/SOP.md` — Capability 开发 7 步清单（含检查清单 + 常见陷阱）
- `e:/cline-dogfood/` — 第二个项目（task-tracker CLI），dogfood 验证框架通用性

## CLI 集成测试结果

| 测试 | 状态 | 证据 |
|------|------|------|
| **S1** Plugin 发现 | ✅ PASS | marker 文件 `plugin-loaded.marker` 创建，setup() 执行 |
| **S2** Rule 注入 | ✅ PASS | 模型直接回答"执行主体边界"（constitution §1），不调工具 |
| **S3** Git-checker 阻断 | ✅ PASS | 6 个未 commit 文件时 `editor` 工具被 skip，reason 正确传递 |
| **S4** 只读不阻断 | ✅ PASS | 6 个未 commit 文件时 `readFile` 正常工作 |
| **S5** Codec 安全 | ✅ PASS | 多轮对话（read+write）无崩溃，beforeModel 返回 undefined 有效 |
| **S6** Compaction | 🔴 阻塞 | BL-2 codec bug，需 ≥180K tokens 长对话 |

详细测试计划：`docs/plugin/runtime-test-plan.md`

## Dogfood 验证结果（第二项目：task-tracker CLI）

| 测试 | 状态 | 证据 |
|------|------|------|
| **D1** Plugin 发现 | ✅ PASS | `e:/cline-dogfood/.governance/runtime/plugin-loaded.marker` 创建 |
| **D2** Rule 注入（项目定制参数） | ✅ PASS | 模型从注入段直接回答 threshold=3（dogfood 定制值，非 cline++ 的 5），0 工具调用 |
| **D3** Git-checker 阈值定制 | ✅ PASS | 5 个未 commit 文件时 `editor` + `run_commands` 全部被 block，error 含"未 commit"|
| **D4** Handoff 注入 | ✅ PASS | 问 CLI 命令 → 0 工具调用，124 文本段，直接从注入的 HANDOFF.md 回答 |
| **D5** 项目代码可用 | ✅ PASS | `node --experimental-strip-types src/cli.ts` add/list/done/remove 全通过 |

**结论**：框架通用性验证通过——同一份插件代码在不同 workspace 下正确读取项目定制配置（threshold 5→3），constitution/rules/handoff 注入正常，git-checker 阻断按项目阈值生效。

## 待办

### 未完成项

| id | 项 | confidence | depends_on |
|----|----|-----------|------------|
| `capability-sop-doc` | ✅ **已完成**:`.governance/capabilities/SOP.md` — 7 步流程 + 检查清单 + 5 个常见陷阱 | ✅ Verified | - |
| `dogfood-second-project` | ✅ **已完成**:task-tracker CLI 项目验证框架通用性。D1-D5 全通过，项目定制参数正确生效 | ✅ Verified | `s1-s5-all-pass` |
| `framework-v1.0-tag` | 框架版本号 v1.0 git tag（dogfood 验证后） | Hypothesis | `dogfood-second-project` |
| `s6-compaction-test` | S6 Compaction + Snapshot 实测（需 BL-2 PR #12032 合并后） | Blocked | BL-2 |
| `prompt-layering-research-round2` | 第二轮源码探查完成 | ✅ Verified | `prompt-layering-research-done` |
| `ab-test-round2` | ✅ **已完成**:prefix 分解 n=10。协同效应确认：单独无效，组合 20%。冗余读率 10% 含合理读，停止优化 | ✅ Verified | `ab-test-clinerules-conflict` |

### 后续可选

- 🔲 `.governance/decisions/adr/` 目录建立（首个 ADR：cli-discovery-path-fix 决策归档）
- 🔲 ADR-007 迁入框架（snapshot registerRule 静态注入）
- 🔲 verify-hook-injection.cjs 通用化（剥离 cline++ 路径）
- 🔲 `publish-developer-guide`（framework-v1.0-tag 之后）
- 🔲 skipTools 配置更新：`read_file` → `readFile`（CLI 3.0.37 工具名变更，当前不影响功能因 readFile 不在 WRITE_TOOL_NAMES 中）
- 🔲 Capability 类型统一：handoff-provider 用 ctx/event，rule-appender 用 context/trigger

## 阻塞项

| 阻塞点 | 影响 | 缓解 | 追踪日 |
|--------|------|------|--------|
| BL-1 VS Code plugin 系统不可用（issue #11944）| VS Code 端全部 Hook | CLI 端先跑通 | 2026-07-05 |
| BL-2 CLI codec bug（PR #12032 Open）| S6 snapshot 实测 | 短对话测试 workaround；等 PR 合并 | 2026-07-05 |

## 关键资源

```
GV-7 契约:       docs/decisions/delivery-framework-design.md（v1.2 冻结）
GV-1 宪法:        .governance/core/constitution.md
GV-6 设计:        .governance/capabilities/README.md
Hook 配置:        .governance/hooks/config.json
Plugin 运行时:    .governance/plugin/index.ts
同步脚本:         scripts/sync-governance-plugin.ps1
CLI 安装路径:     ~/.cline/plugins/installed/local/governance/
测试计划:         docs/plugin/runtime-test-plan.md
hook 实现范本:    context-snapshot/src/index.ts
ADR-007:         docs/decisions/adr/ADR-007-snapshot-registerRule-static-injection.md
源码探查(第一轮): docs/decisions/investigation/investigation-note-cline-prompt-layering.md
源码探查(第二轮): docs/decisions/investigation/investigation-note-cline-prompt-layering-round2.md
源码探查(第二轮规划): docs/decisions/investigation/investigation-plan-cline-prompt-layering-round2.md
A/B 差分测试报告:  docs/decisions/investigation/ab-test-clinerules-conflict.md
```

### 已知事实

- 框架填充完成度：GV-1 + EX-1a/1b + EX-2~4 + GV-6 + GV-7 + hooks + 4 Capability + Plugin 运行时 = 100%
- **CLI 端插件全链路验证通过（S1-S5）**：发现 → 加载 → setup → registerRule → beforeTool block → messageBuilder → codec 安全
- **插件发现路径**：`~/.cline/plugins/installed/local/`（非项目级 `.cline/plugins/`）
- **插件必须自包含**：capabilities 依赖需一并复制，import 路径修正
- **registerRule 前缀是唯一被验证的服从度杠杆**（A/B Round 2 n=10）：事实陈述+否定祈使组合将复杂问题工具调用率从 100% 降到 20%。**单独任一组件 100% 无效**（协同效应/相变）。详见 ab-test-clinerules-conflict.md §六
- **20% 是合理下限，不应继续压**：残留 2 次工具调用含 6 次合理读（读注入段外的 examples/hooks 等），冗余读率仅 10%
- **`~/AGENTS.md` 干扰**：Cline 原生 `.clinerules` 加载用户主目录 AGENTS.md，与 governance registerRule 同时存在。问太泛的问题模型会混淆两个来源
- BL-1/BL-2 短期不解除，继续按"CLI 先跑"策略推进

### 关键经验

- **插件发现路径陷阱**：Cline CLI 只扫描 `~/.cline/plugins/installed/local/`，不扫描项目级 `.cline/plugins/`。同步必须覆盖 `installed/` 和 `_installed/`（junction）两个目录
- **插件自包含约束**：跨目录 import（如 `../../capabilities/`）在安装路径下不可解析，必须复制依赖并修正路径
- **registerRule 服从度**：技术上"注入成功"≠"模型会用"。需要行为指令前缀（"DO NOT RE-READ"）克服 cline 训练偏好。这是 context-snapshot ADR-007 已验证的经验，在 governance 框架层同样适用
- **beforeTool skip 有效**：CLI 3.0.37 尊重 `{ skip: true, reason }` 返回值，`editor` 工具被成功拦截
- **源码探查盲点纠偏(2026-07-05)**:第一轮 5 subagent 探查停在 SDK runtime 层,未穿透到 cline 应用层 `buildSystemPrompt()`——即 `config.systemPrompt` 内部分层拼装未探查。导致"cline 内部提示词如何分层注入"原问题未回答。已在 investigation-note §七 设计第二轮探查(Task F-J),§13.12/§13.13 标注 Partially Verified,dev-rules §1.16 补"穿透边界判据"防止重蹈覆辙。Rule 失效场景补第 6 类:context window 挤出
- **第二轮源码探查完成(2026-07-06)**:Task F-J 全部完成。关键发现:① `buildClineSystemPrompt()` 在 shared/prompt/cline.ts,VS Code 路径不传 rules(`{{CLINE_RULES}}` 为空);② base prompt 是单体模板 9 section,约 600 token;③ cline 内置约束用 "Always/Do not" 措辞(非 MUST/SHALL),强约束力来自位置靠前;④ Constitution ≤800 token 上限过于保守,建议放宽到 ≤2000 token
- **A/B Round 2 最终修正(2026-07-06)**:prefix 分解实验(n=10)揭示**协同效应**。事实陈述单独 100% 无效，否定祈使单独 100% 无效，两者组合 20%。这不是加性效应而是相变——模型需要同时知道"内容已存在"(事实陈述)和"不要验证"(否定祈使)才建立足够信任。残留 2 次工具调用含 6 次合理读(注入段外内容)，冗余读率 10% 是合理下限

## 新会话首动作

1. 读 [plugin/project-rules.md](plugin/project-rules.md)（若未归档）
2. 读本文件
3. 如需修改 plugin 代码 → 先运行 `scripts\sync-governance-plugin.ps1` 同步到 CLI 发现路径
4. 按优先级推进：`framework-v1.0-tag`

## 引用

- GV-7 契约：[delivery-framework-design.md](decisions/delivery-framework-design.md)
- GV-1 宪法：[.governance/core/constitution.md](../.governance/core/constitution.md)
- Plugin 运行时：[.governance/plugin/index.ts](../.governance/plugin/index.ts)
- 同步脚本：[scripts/sync-governance-plugin.ps1](../scripts/sync-governance-plugin.ps1)
- 测试计划：[docs/plugin/runtime-test-plan.md](plugin/runtime-test-plan.md)
- ADR-007：[ADR-007-snapshot-registerRule-static-injection.md](decisions/adr/ADR-007-snapshot-registerRule-static-injection.md)
- Hook 实现范本：[context-snapshot/src/index.ts](../context-snapshot/src/index.ts)

---

## Handoff（推荐下次会话开局交接语句）

```text
读 docs/handoff.md + docs/dev-rules.md + docs/plugin/project-rules.md（若未归档）。
```
