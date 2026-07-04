# Handoff — cline 3.0.37 升级 + Phase 1/2 实现 + Plugin 契约探查规划

> **生命周期**：每次覆写，无归档——会话交接文件。
> **进入规则**：会话开始时先读 `plugin/project-rules.md`（若未归档），再读本文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `phase-0-contract-verified` | hook 自动注入 Phase 0 完成——beforeRun 返回 AgentStopControl（不能注入 messages）+ beforeTool skip 字段可用 + beforeModel 返回 messages 可用 + workspacePath 用 setup() 闭包捕获；beforeRun 不能直接注入内容，必须走"beforeRun 写 module state + messageBuilder 读取注入"模式（方式 B）| Verified | `hook-auto-injection-proposed` |
| `phase-1-2-implemented` | hook 自动注入 Phase 1+2 实现完成——HandoffProvider 类（detect/load/summarize）+ beforeRun 加载 handoff.md 写 handoffState + handoff-injector messageBuilder 第一次 build() 注入（ContentBlock[] 格式）+ GitStatusChecker 类（isGitRepo/countUncommitted + 降级）+ beforeTool 每 3 次写入类工具检查未 commit 文件数 ≥5 则 skip；tsc --noEmit 零错误 | Verified | `phase-0-contract-verified` |
| `phase-3-logic-verified` | Phase 3 核心逻辑单元测试通过——verify-hook-injection.cjs 3 tests PASS：HandoffProvider（4039 chars, 22 todos）+ GitStatusChecker（1 uncommitted，不阻断）+ 降级（非 git repo 正确不阻断）| Verified | `phase-1-2-implemented` |
| `cline-3.0.37-upgraded` | cline 从 3.0.34 升级到 3.0.37——npm 全局安装脚本损坏（临时文件未重命名）已修复；plugin 安装路径从 `installed/local/` 变为 `_installed/local/`，用 NTFS junction 兼容 | Verified | - |
| `phase-3-cli-blocked` | Phase 3 CLI 集成测试阻塞——plugin 已加载（marker mtime 证明 setup() 调用），但 handoff 未注入（模型主动用 read_files 读 handoff.md）；TUI 模式吞 console.log 输出；需探查 3.0.37 plugin 契约变化（H1-H5 假设）| Proposed | `phase-3-logic-verified`, `cline-3.0.37-upgraded` |

## 本会话净变化

### 新增文档

- [investigation-plan-cline-3.0.37-plugin-contract.md](decisions/investigation/investigation-plan-cline-3.0.37-plugin-contract.md) — **本会话** cline 3.0.37 plugin 契约探查规划（5 个 H 假设 + 5 个子代理任务分配 + 产出汇总模板 + 验证 checkpoint）
- [hook-auto-injection-design.md](decisions/hook-auto-injection-design.md) §0 设计原则 — **本会话** Hook 化分层判据（机械可判定/需上下文判断/纯方法论 + 反向约束）
- [observation-dev-rules-source-provenance.md](decisions/observation-dev-rules-source-provenance.md) — **本会话** dev-rules.md 源由外迁载体（18 个源由段落，§1.2-§1.15/§4/§5.1/§6.3）
- [plugin-dev-sop.md](plugin/plugin-dev-sop.md) §0 触发放宽 + §0.5 一轮跑完清单 — **本会话**（默认触发 + 6 强信号 + 2 弱信号 + 兜底 + 7 步执行流）
- [plugin-dev-quick-reference.md](plugin/refs/plugin-dev-quick-reference.md) §13 源码探查产出回流 — **本会话**（8 子节，messageBuilder 调用时机/rules 注入频率/estimateTokensFromChars/serializeMessage/双重 setup/codec bug/原生 compaction/源码文件定位）
- [coder-persona.md](plugin/coder-persona.md) 触发放宽 — **本会话**（默认触发 + 5 强信号 + 4 弱信号 + 兜底，去掉"≥30 行"难判定门槛）

### 修改文档

- [dev-rules.md](dev-rules.md) — 18 个源由段落替换为一行指针，522 → 354 行（-32.2%），规则条款全部保留
- [hook-auto-injection-design.md](decisions/hook-auto-injection-design.md) — §3.1/§3.2/§4.3/§6 Phase 0 验证结果

### 功能层（submodule context-snapshot）

- **Phase 1 实现**（commit `6a476fe`）：
  - [src/providers/handoff-provider.ts](context-snapshot/src/providers/handoff-provider.ts) — HandoffProvider 类（detect/load/summarize 三职责分离）
  - [src/git-status-checker.ts](context-snapshot/src/git-status-checker.ts) — GitStatusChecker 类（isGitRepo/countUncommitted + 降级策略）
  - [src/index.ts](context-snapshot/src/index.ts) — beforeRun hook + handoff-injector messageBuilder + beforeTool commit 守卫
- **Phase 2 实现**（commit `6a476fe`）：同上，beforeTool 每 3 次写入类工具检查未 commit ≥5 则 skip
- **Phase 3 验证**（未 commit）：
  - [verify-hook-injection.cjs](context-snapshot/verify-hook-injection.cjs) — 核心逻辑单元测试（3 tests PASS）
  - [src/index.ts](context-snapshot/src/index.ts) — 临时添加 dbgLog() 文件日志（ survives TUI console suppression），待契约探查后清理
- **scripts**：
  - [scripts/test-hook-injection.ps1](scripts/test-hook-injection.ps1) — Phase 3 CLI 集成测试准备脚本（英文输出避免编码问题）
  - [scripts/sync-and-test.ps1](scripts/sync-and-test.ps1) — 同步 index.ts + 跑 cline + 显示 debug log

### Git 提交

- `1c4cf32` — docs(governance): dev-rules 源由外迁 + hook §0 + SOP/quick-ref/coder 触发放宽 + §13 回流（6 files, +413/-111）
- `6a476fe`（submodule）— feat(hook-injection): Phase 1+2 实现 HandoffProvider + GitStatusChecker + beforeRun/beforeTool hooks
- `2406df7`（父仓库）— feat(hook-injection): Phase 1+2 submodule 更新

## 待办

### P0 — cline 3.0.37 plugin 契约探查

**入口**：[investigation-plan-cline-3.0.37-plugin-contract.md](decisions/investigation/investigation-plan-cline-3.0.37-plugin-contract.md)

**任务**：用户去云端启用多个子代理重读关键地方，按 5 个子代理任务分配执行：

1. 子代理 1（P0）：`@cline/shared` 类型定义 — `E:\node-global\node_modules\@cline\shared\dist\`
2. 子代理 2（P0）：`@cline/sdk` 包 — `E:\node-global\node_modules\@cline\sdk\`
3. 子代理 3（P1）：`@cline/core` 包 — `E:\node-global\node_modules\@cline\core\`
4. 子代理 4（P0）：GitHub Release Notes — 3.0.34→3.0.37 breaking changes
5. 子代理 5（P1）：官方 Plugin 文档

**验证 checkpoint**：探查完成后应能回答 5 个问题（beforeRun 是否还在 / ctx.workspaceInfo 是否变化 / build() 调用时机 / manifest 新字段 / junction 识别）。

### P1 — 修复 index.ts + 验证 handoff 注入

**依赖**：P0 探查完成

**任务**：
1. 根据 H1-H5 验证结果修复 index.ts（hook 注册方式 / ctx 字段路径 / messageBuilder 调用时机）
2. 同步 plugin 到 `_installed/local/`
3. 跑 `sync-and-test.ps1` 验证 handoff 注入
4. 验证通过后清理 dbgLog() debug 代码

### P2 — Phase 3 完整验证

**依赖**：P1 修复完成

**任务**：
1. 验证 beforeRun 触发 + handoff 注入（非 TUI 模式）
2. 验证 beforeTool commit 守卫（制造 ≥5 未 commit 文件）
3. 验证 TUI 模式下 handoff 注入（需文件日志确认）

## 阻塞项

| 阻塞点 | 影响 | 缓解 |
|--------|------|------|
| cline 3.0.37 plugin 契约变化未知 | Phase 3 CLI 集成测试阻塞 | P0 探查任务 |
| TRAE sandbox 限制覆写 `.cline\plugins` | 无法在 IDE 内同步 plugin 代码 | 用户在真实 PowerShell 跑 sync-and-test.ps1 |
| TUI 模式吞 console.log | 无法直接看 plugin 日志 | 用文件日志（dbgLog）或非 TUI 模式 |
| PR #12032（CLI codec bug 修复） | 阻塞 H3 长对话实测、schema-v2-snapshot-e2e | 持续监控 |

## 关键资源

### 资源路径速查

```
@cline/shared:  E:\node-global\node_modules\@cline\shared\dist\
@cline/sdk:     E:\node-global\node_modules\@cline\sdk\
@cline/core:    E:\node-global\node_modules\@cline\core\
@cline/agents:  E:\node-global\node_modules\@cline\agents\
cline (binary): E:\node-global\node_modules\cline\bin\cline (Bun 编译，无源码)
旧契约参考:     docs/plugin/refs/plugin-dev-quick-reference.md §13.9
旧 atlas:       docs/plugin/refs/cline-plugin-architecture-atlas.md
探查规划:       docs/decisions/investigation/investigation-plan-cline-3.0.37-plugin-contract.md
plugin 代码:    context-snapshot/src/index.ts（含 dbgLog 临时调试代码）
验证脚本:       context-snapshot/verify-hook-injection.cjs（核心逻辑单元测试）
同步脚本:       scripts/sync-and-test.ps1（同步 + 跑 cline + 显示 debug log）
```

### 已知事实

- cline 版本：3.0.37（`cline --version`）
- `@cline/*` 包版本：0.0.56
- plugin 安装路径：`_installed/local/`（3.0.37 新路径，junction 指向 `installed/local/`）
- plugin 已加载：marker mtime 2026-07-04 16:03:19
- 核心逻辑单元测试通过：verify-hook-injection.cjs 3 tests PASS

## 新会话首动作

1. 读 [plugin/project-rules.md](plugin/project-rules.md)（若未归档）
2. 读本文件
3. 读 [investigation-plan-cline-3.0.37-plugin-contract.md](decisions/investigation/investigation-plan-cline-3.0.37-plugin-contract.md)
4. 若用户已带回子代理探查产出 → 按 P1 修复 index.ts
5. 若子代理尚未跑 → 等用户指示

## 引用

- Phase 0 契约验证：[hook-auto-injection-design.md §3](decisions/hook-auto-injection-design.md)
- Phase 1/2 实现：[context-snapshot/src/index.ts](context-snapshot/src/index.ts)
- 探查规划：[investigation-plan-cline-3.0.37-plugin-contract.md](decisions/investigation/investigation-plan-cline-3.0.37-plugin-contract.md)
- 旧契约参考：[plugin-dev-quick-reference.md §13.9](plugin/refs/plugin-dev-quick-reference.md)
