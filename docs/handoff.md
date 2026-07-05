# Handoff — commit 守卫 E2E 验证 + 文档补全（CLI 3.0.37 工具名 + sync 陷阱）

> **生命周期**：每次覆写，无归档——会话交接文件。
> **进入规则**：会话开始时先读 `plugin/project-rules.md`（若未归档），再读本文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `commit-guard-e2e-pass` | Phase 2 commit 守卫 CLI E2E 验证通过——editor #3 被 skip+reason 阻断，模型理解原因并尝试 commit 后重试 | Verified | `tool-name-cli37` |
| `tool-name-cli37` | CLI 3.0.37 工具名变更：write_to_file→editor, execute_command→run_commands, 新增 applyPatch/bash。WRITE_TOOL_NAMES 须包含新旧两套名 | Verified | - |
| `sync-wildcard-pitfall` | Copy-Item 'src' 复制目录本身为子文件夹，须用 'src\*' 复制内容。installed/ + _installed/ 都须同步 | Verified | - |
| `phase-3-cli-verified` | Phase 3 CLI 集成测试通过——registerRule 路径注入 handoff 成功；debug 代码清理完成；tsc --noEmit 零错误 | Verified | `registerRule-over-messageBuilder` |
| `registerRule-over-messageBuilder` | messageBuilder 注入的 system 消息被 cline agent 训练偏好压过；registerRule 注入到系统提示词顶层后模型直接引用注入内容 | Verified | - |
| `adr-007-snapshot-static-injection` | **ADR-007**：snapshot 走 registerRule 静态注入（不迁 messageBuilder）。承重论据：会话内续命归 cline 原生 compaction，snapshot 只服务跨会话续作 | Verified | `registerRule-over-messageBuilder` |
| `rules-split-handoff-snapshot` | registerRule 拆分为两个独立 id（`handoff-context` / `snapshot-context`），content() 改纯函数读预加载 state，I/O 移到 setup() | Verified | `adr-007-snapshot-static-injection` |
| `docs-aligned-with-adr007` | hook-auto-injection-design.md + quick-reference.md 全部更新对齐 ADR-007。§0 scope 澄清：三层判据管执行机制，registerRule 管内容交付，正交 | Verified | `adr-007-snapshot-static-injection` |
| `summary-extraction-p-level` | HandoffProvider summary 提取从 emoji 正则改为 P-level 标题匹配 + section 状态检测。实测 3/3 正确 | Verified | - |
| `docs-self-sufficiency-p2` | P2 文档自足性补全：quick-reference 新增 §14 验证脚本模板 + §15 代码骨架补全（rule/messageBuilder/tool/setup闭包/sync命令）+ §16 差距分析。SOP §4 加指针。8 个开发任务维度全部自足 | Verified | `docs-aligned-with-adr007` |

## 本会话净变化

### 功能层（submodule context-snapshot）

- **HandoffProvider summary 提取重写**（已提交 submodule 3bf52d9）：
  - [src/providers/handoff-provider.ts](context-snapshot/src/providers/handoff-provider.ts)
    - 新增 `extractPLevelItems()` — 匹配 `##+ P\d+` 标题 + section 状态检测（已完成/部分完成/待完成）
    - 新增 `buildSummary()` — 逐项列出 id + title + status marker（✅/⏳/🔲）
    - 头注释更新为 registerRule (ADR-007)
- **WRITE_TOOL_NAMES 更新**（已提交 submodule 3bf52d9）：
  - [src/index.ts](context-snapshot/src/index.ts)
    - 新增 editor, applyPatch, run_commands, bash 四个 CLI 3.0.37 工具名

### 治理层（父仓库）

- **hook-auto-injection-design.md**（6 处编辑）：§0 scope 澄清 + §1 流程图 registerRule + §2 选型表重写给 registerRule + §3 superseded 注 + §3.2 方式 D 加结论修订 + §6 路线状态更新（Phase 2 标记"CLI E2E 验证通过"）
- **quick-reference.md**（6 处编辑）：§13.2/§13.9 结论修订反映 ADR-007 + 版本号升级 CLI 3.0.37 / SDK 0.0.56 + **新增 §13.10 CLI 3.0.37 工具名映射** + **新增 §13.11 sync 路径陷阱**
- **plugin-dev-sop.md**（1 处编辑）：§1.1 契约速查表新增「工具名」行 → hub.d.ts HubToolExecutorName + 工具名版本变更表
- **plugin-dev-sop.md §4 验证档位**（P2 补全，2026-07-05）：新增「验证脚本模板」+「文档自足性」两段指针，引用 quick-reference §14 / §16
- **plugin-dev-quick-reference.md §14/§15/§16**（P2 补全，2026-07-05）：新增 §14 验证脚本模板（抽象自 verify-hook-injection.cjs 3-test 结构）+ §15 代码骨架补全（registerRule/messageBuilder/tool/setup 闭包/sync 命令 5 个骨架）+ §16 文档自足性差距分析（8 维度评估表 + 6 项残留缺口 + 复查触发条件）

### 提交记录

| 提交 | 范围 | 内容 |
|------|------|------|
| submodule `3bf52d9` | context-snapshot | feat: HandoffProvider P-level summary + WRITE_TOOL_NAMES CLI 3.0.37 |
| parent `7a2a216` | cline-plus | docs(hook-injection): Phase 2 commit guard CLI E2E verified |
| parent `53231b5` | cline-plus | docs(hook-injection): Phase 2 verified by unit tests (10/10 PASS) |
| parent `6bfe9ae` | cline-plus | docs(hook-injection): mark Phase 2 commit guard as implemented |
| parent `983cfce` | cline-plus | docs: align design docs + quick-reference with ADR-007 registerRule |
| parent `523f749` | cline-plus | feat(rules): ADR-007 split registerRule + handoff.md update |
| parent `c417d90` | cline-plus | docs(plugin): 补充 CLI 3.0.37 工具名变更 + sync 路径陷阱 |

### 关键经验

- **"能注入"≠"模型会用"**：Phase 0 只验证契约能力，Phase 3 实测才发现 messageBuilder 被训练偏好压过。契约验证 ≠ 集成验证
- **文档结论比事实更易腐**：§13.2 的行为事实（registerRule 求值一次）没变，但设计结论（"已废弃"→"正确路径"）随 ADR-007 翻转
- **正则要匹配实际格式**：emoji 正则 vs `### P1 —` 格式——写正则前先 grep 实际数据
- **工具名是版本绑定的**：CLI 升级后旧名不再生效，E2E 测试才能暴露此问题。doc-only review 不够
- **sync 路径是隐藏杀手**：Copy-Item 不带 wildcard 复制目录本身而非内容，导致旧代码残留
- **差距分析先于补全**：P2 先做 8 维度差距分析再补骨架，避免"补了不该补的，漏了该补的"。补全后 8 项全自足，残留 6 项非阻塞缺口标了"用到时再补"
- **验证脚本模板化的价值**：抽象 verify-hook-injection.cjs 成三段式模板（核心+辅助+降级+summary+exit code），下次写新验证脚本直接套，不必从零摸结构

### 模型绕过行为观察

commit 守卫 E2E 测试中发现：模型在 editor 被 skip 后，使用 `run_commands` + `echo > file` 重定向来创建文件。守卫按"每 3 次 write tool"触发检查，而非"每次文件写入"触发。这是守卫粒度限制，非 bug——但需意识到模型会寻找替代路径。

## 待办

### 未完成项

（本会话待办已全部完成）

### 后续可选

- 🔲 commit 守卫增强：考虑覆盖 run_commands echo 重定向（需在 beforeTool 解析 command input）
- 🔲 H3 长对话实测：等 PR #12032（CLI codec bug 修复）合并后验证 compaction 触发时机
- 🔲 test-guard-workspace 清理：被终端锁定，下次会话前手动删除

## 阻塞项

| 阻塞点 | 影响 | 缓解 |
|--------|------|------|
| TRAE sandbox 限制覆写 `.cline\plugins` | 无法在 IDE 内同步 plugin 代码 | 用户在真实 PowerShell 跑 sync-and-test.ps1 |
| TUI 模式吞 console.log | 无法直接看 plugin 日志 | 用非 TUI 模式 |
| PR #12032（CLI codec bug 修复） | 阻塞 H3 长对话实测 | 持续监控 |

## 关键资源

```
@cline/shared:  E:\node-global\node_modules\cline\node_modules\@cline\shared\dist\
plugin 代码:    context-snapshot/src/index.ts（已拆分 registerRule + WRITE_TOOL_NAMES 更新）
handoff provider: context-snapshot/src/providers/handoff-provider.ts（summary 提取已重写）
验证脚本:       context-snapshot/verify-hook-injection.cjs（3 tests PASS）
同步脚本:       scripts/sync-and-test.ps1（全 ASCII）
ADR-007:        docs/decisions/adr/ADR-007-snapshot-registerRule-static-injection.md
```

### 已知事实

- cline 版本：3.0.37
- `@cline/*` 包版本：0.0.56
- plugin 安装路径：`_installed/local/`（junction 指向 `installed/local/`）
- registerRule 拆分：Verified（两条独立 id，tsc 零错误，3 tests PASS）
- cline 契约支持多 registerRule（`rules: AgentExtensionRule[]`，agent.d.ts L164）
- CLI 3.0.37 HubToolExecutorName：readFile, search, bash, webFetch, editor, applyPatch, skills, askQuestion, submit

## 新会话首动作

1. 读 [plugin/project-rules.md](plugin/project-rules.md)（若未归档）
2. 读本文件
3. 读 [ADR-007](decisions/adr/ADR-007-snapshot-registerRule-static-injection.md)
4. 清理 test-guard-workspace（如仍存在）
5. 按优先级推进后续可选项

## 引用

- ADR-007：[ADR-007-snapshot-registerRule-static-injection.md](decisions/adr/ADR-007-snapshot-registerRule-static-injection.md)
- Phase 0 契约验证：[hook-auto-injection-design.md §3](decisions/hook-auto-injection-design.md)
- hook 自动注入设计：[hook-auto-injection-design.md](decisions/hook-auto-injection-design.md)（已更新对齐 ADR-007）
- 探查规划（H1-H5 全部 refuted）：[investigation-plan-cline-3.0.37-plugin-contract.md](decisions/investigation/investigation-plan-cline-3.0.37-plugin-contract.md)
