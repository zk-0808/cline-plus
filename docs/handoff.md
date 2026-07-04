# Handoff — 设计文档对齐 ADR-007 + summary 提取质量修复

> **生命周期**：每次覆写，无归档——会话交接文件。
> **进入规则**：会话开始时先读 `plugin/project-rules.md`（若未归档），再读本文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `phase-3-cli-verified` | Phase 3 CLI 集成测试通过——registerRule 路径注入 handoff 成功；debug 代码清理完成；tsc --noEmit 零错误 | Verified | `registerRule-over-messageBuilder` |
| `registerRule-over-messageBuilder` | messageBuilder 注入的 system 消息被 cline agent 训练偏好压过；registerRule 注入到系统提示词顶层后模型直接引用注入内容 | Verified | - |
| `adr-007-snapshot-static-injection` | **ADR-007**：snapshot 走 registerRule 静态注入（不迁 messageBuilder）。承重论据：会话内续命归 cline 原生 compaction，snapshot 只服务跨会话续作 | Verified | `registerRule-over-messageBuilder` |
| `rules-split-handoff-snapshot` | registerRule 拆分为两个独立 id（`handoff-context` / `snapshot-context`），content() 改纯函数读预加载 state，I/O 移到 setup() | Verified | `adr-007-snapshot-static-injection` |
| `docs-aligned-with-adr007` | hook-auto-injection-design.md + quick-reference.md 全部更新对齐 ADR-007。§0 scope 澄清：三层判据管执行机制，registerRule 管内容交付，正交 | Verified | `adr-007-snapshot-static-injection` |
| `summary-extraction-p-level` | HandoffProvider summary 提取从 emoji 正则改为 P-level 标题匹配 + section 状态检测。实测 3/3 正确 | Verified | - |

## 本会话净变化

### 功能层（submodule context-snapshot）

- **HandoffProvider summary 提取重写**（未提交）：
  - [src/providers/handoff-provider.ts](context-snapshot/src/providers/handoff-provider.ts)
    - 新增 `extractPLevelItems()` — 匹配 `##+ P\d+` 标题 + section 状态检测（已完成/部分完成/待完成）
    - 新增 `buildSummary()` — 逐项列出 id + title + status marker（✅/⏳/🔲）
    - 头注释更新为 registerRule (ADR-007)
    - tsc 零错误，实测提取 3/3 P 级项正确

### 治理层（父仓库）

- **hook-auto-injection-design.md**（6 处编辑）：§0 scope 澄清 + §1 流程图 registerRule + §2 选型表重写给 registerRule + §3 superseded 注 + §3.2 方式 D 加结论修订 + §6 路线状态更新
- **quick-reference.md**（4 处编辑）：§13.2/§13.9 结论修订反映 ADR-007 + 版本号升级 CLI 3.0.37 / SDK 0.0.56

### 关键经验

- **"能注入"≠"模型会用"**：Phase 0 只验证契约能力，Phase 3 实测才发现 messageBuilder 被训练偏好压过。契约验证 ≠ 集成验证
- **文档结论比事实更易腐**：§13.2 的行为事实（registerRule 求值一次）没变，但设计结论（"已废弃"→"正确路径"）随 ADR-007 翻转
- **正则要匹配实际格式**：emoji 正则 vs `### P1 —` 格式——写正则前先 grep 实际数据

## 待办

### 未完成项

- ⏳ commit 守卫（hook-auto-injection-design.md §4）— beforeTool git status + skip 阻断，Phase 2 待实现
- ⏳ 提交本会话改动（子模块 handoff-provider.ts + 父仓库 docs）
- ⏳ 同步 plugin 安装目录（Copy-Item -Recurse -Force src/ → installed/local/context-snapshot/src/）

## 阻塞项

| 阻塞点 | 影响 | 缓解 |
|--------|------|------|
| TRAE sandbox 限制覆写 `.cline\plugins` | 无法在 IDE 内同步 plugin 代码 | 用户在真实 PowerShell 跑 sync-and-test.ps1 |
| TUI 模式吞 console.log | 无法直接看 plugin 日志 | 用非 TUI 模式 |
| PR #12032（CLI codec bug 修复） | 阻塞 H3 长对话实测 | 持续监控 |

## 关键资源

```
@cline/shared:  E:\node-global\node_modules\cline\node_modules\@cline\shared\dist\
plugin 代码:    context-snapshot/src/index.ts（已拆分 registerRule）
handoff provider: context-snapshot/src/providers/handoff-provider.ts（summary 提取已重写）
验证脚本:       context-snapshot/verify-hook-injection.cjs（3 tests PASS）
同步脚本:       scripts/sync-and-test.ps1（全 ASCII）
ADR-007:        docs/decisions/adr/ADR-007-snapshot-registerRule-static-injection.md
```

### 关键经验

- **registerRule > messageBuilder（system 消息）**：cline agent 训练偏好压过 messageBuilder system 消息，但服从 registerRule 注入的规则
- **registerRule content 只评估一次**：适合静态内容（handoff/snapshot），不适合动态 per-turn 内容
- **snapshot 服务跨会话续作**：会话内续命归 cline 原生 compaction，snapshot 只服务下一会话启动注入（ADR-007）
- **content() 应是纯函数**：I/O 在 setup() 完成，content 只读 state，可单测
- **契约验证 ≠ 集成验证**：Phase 0 验证"能注入"，Phase 3 才发现"模型不用"

### 已知事实

- cline 版本：3.0.37
- `@cline/*` 包版本：0.0.56
- plugin 安装路径：`_installed/local/`（junction 指向 `installed/local/`）
- registerRule 拆分：Verified（两条独立 id，tsc 零错误，3 tests PASS）
- cline 契约支持多 registerRule（`rules: AgentExtensionRule[]`，agent.d.ts L164）

## 新会话首动作

1. 读 [plugin/project-rules.md](plugin/project-rules.md)（若未归档）
2. 读本文件
3. 读 [ADR-007](decisions/adr/ADR-007-snapshot-registerRule-static-injection.md)
4. 提交本会话未提交改动 + 同步 plugin 安装目录
5. 推进 commit 守卫（§4）

## 引用

- ADR-007：[ADR-007-snapshot-registerRule-static-injection.md](decisions/adr/ADR-007-snapshot-registerRule-static-injection.md)
- Phase 0 契约验证：[hook-auto-injection-design.md §3](decisions/hook-auto-injection-design.md)
- hook 自动注入设计：[hook-auto-injection-design.md](decisions/hook-auto-injection-design.md)（已更新对齐 ADR-007）
- 探查规划（H1-H5 全部 refuted）：[investigation-plan-cline-3.0.37-plugin-contract.md](decisions/investigation/investigation-plan-cline-3.0.37-plugin-contract.md)
