# Handoff — S1-S5 CLI 集成测试全通过

> **生命周期**：每次覆写，无归档——会话交接文件。
> **进入规则**：会话开始时先读 `plugin/project-rules.md`（若未归档），再读本文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `cli-discovery-path-fix` | ✅ 插件发现路径修正：项目级 `.cline/plugins/` → `~/.cline/plugins/installed/local/`。CLI 只扫描用户主目录，不扫描项目目录。创建 `scripts/sync-governance-plugin.ps1` 同步脚本 | Verified | `runtime-plugin-newbuild` |
| `plugin-self-contained` | ✅ 插件必须自包含：`hooks/pre-compact.ts` 依赖 `../../capabilities/snapshot-writer/`，同步时需一并复制 capabilities，import 路径修正为 `../capabilities/` | Verified | `cli-discovery-path-fix` |
| `rule-injection-obedience` | ✅ registerRule 注入需行为指令前缀："DO NOT RE-READ FILES" + 5 条明确指令。不加前缀→模型先搜索文件不服从注入；加前缀→模型直接引用注入内容（借鉴 context-snapshot ADR-007 实测经验） | Verified | `cli-discovery-path-fix` |
| `s1-s5-all-pass` | ✅ S1-S5 CLI 集成测试全部通过。S6 受 BL-2 阻塞 | Verified | `cli-discovery-path-fix` |

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

### 3. Rule 注入服从度修复

**问题**：registerRule 技术上注入了内容，但模型不服从——cline 训练偏好使模型先搜索/读取文件，忽略注入的 constitution 内容。

**修复**：在 `preloadSessionContext()` 的 handoff-provider 段添加行为指令前缀：
```
# GOVERNANCE SESSION CONTEXT (AUTO-INJECTED — DO NOT RE-READ FILES)
...
1. USE the information below DIRECTLY — do NOT call readFile/search/run_commands
2. If the user asks about constitution rules, quote from 'Core Constitution' below
...
--- CONTEXT START ---
```

### 4. S2 测试方法修正

**问题**：问"governance 规则"太泛，模型把 `~/AGENTS.md`（Cline 原生 `.clinerules` 加载）也当成 governance 内容。

**修正**：问 governance 特有内容（如"What is the title of section 1 in Core Constitution?"），模型正确回答"执行主体边界"。

### 5. 新增文件

- `scripts/sync-governance-plugin.ps1` — 完整同步脚本（目录创建 + 文件复制 + import 修正 + junction + 验证）

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

## 待办

### 未完成项

| id | 项 | confidence | depends_on |
|----|----|-----------|------------|
| `capability-sop-doc` | `.governance/capabilities/SOP.md` — Capability 开发 7 步清单 | Hypothesis | - |
| `dogfood-second-project` | 第二个项目 dogfood 验证框架通用性 | Hypothesis | `s1-s5-all-pass` |
| `framework-v1.0-tag` | 框架版本号 v1.0 git tag（dogfood 验证后） | Hypothesis | `dogfood-second-project` |
| `s6-compaction-test` | S6 Compaction + Snapshot 实测（需 BL-2 PR #12032 合并后） | Blocked | BL-2 |

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
源码探查:        docs/decisions/investigation/investigation-note-cline-prompt-layering.md
```

### 已知事实

- 框架填充完成度：GV-1 + EX-1a/1b + EX-2~4 + GV-6 + GV-7 + hooks + 4 Capability + Plugin 运行时 = 100%
- **CLI 端插件全链路验证通过（S1-S5）**：发现 → 加载 → setup → registerRule → beforeTool block → messageBuilder → codec 安全
- **插件发现路径**：`~/.cline/plugins/installed/local/`（非项目级 `.cline/plugins/`）
- **插件必须自包含**：capabilities 依赖需一并复制，import 路径修正
- **registerRule 注入需行为指令前缀**：不加 "DO NOT RE-READ" → 模型不服从；加 → 模型直接引用
- **`~/AGENTS.md` 干扰**：Cline 原生 `.clinerules` 加载用户主目录 AGENTS.md，与 governance registerRule 同时存在。问太泛的问题模型会混淆两个来源
- BL-1/BL-2 短期不解除，继续按"CLI 先跑"策略推进

### 关键经验

- **插件发现路径陷阱**：Cline CLI 只扫描 `~/.cline/plugins/installed/local/`，不扫描项目级 `.cline/plugins/`。同步必须覆盖 `installed/` 和 `_installed/`（junction）两个目录
- **插件自包含约束**：跨目录 import（如 `../../capabilities/`）在安装路径下不可解析，必须复制依赖并修正路径
- **registerRule 服从度**：技术上"注入成功"≠"模型会用"。需要行为指令前缀（"DO NOT RE-READ"）克服 cline 训练偏好。这是 context-snapshot ADR-007 已验证的经验，在 governance 框架层同样适用
- **beforeTool skip 有效**：CLI 3.0.37 尊重 `{ skip: true, reason }` 返回值，`editor` 工具被成功拦截
- **源码探查盲点纠偏(2026-07-05)**:第一轮 5 subagent 探查停在 SDK runtime 层,未穿透到 cline 应用层 `buildSystemPrompt()`——即 `config.systemPrompt` 内部分层拼装未探查。导致"cline 内部提示词如何分层注入"原问题未回答。已在 investigation-note §七 设计第二轮探查(Task F-J),§13.12/§13.13 标注 Partially Verified,dev-rules §1.16 补"穿透边界判据"防止重蹈覆辙。Rule 失效场景补第 6 类:context window 挤出

## 新会话首动作

1. 读 [plugin/project-rules.md](plugin/project-rules.md)（若未归档）
2. 读本文件
3. 如需修改 plugin 代码 → 先运行 `scripts\sync-governance-plugin.ps1` 同步到 CLI 发现路径
4. 按优先级推进：`capability-sop-doc` → `dogfood-second-project` → `framework-v1.0-tag`

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
