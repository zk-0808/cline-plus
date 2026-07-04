# Handoff — Phase 3 验证完成 — registerRule 注入路径确认 + debug 清理

> **生命周期**：每次覆写，无归档——会话交接文件。
> **进入规则**：会话开始时先读 `plugin/project-rules.md`（若未归档），再读本文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `phase-0-contract-verified` | hook 自动注入 Phase 0 完成——beforeRun 返回 AgentStopControl（不能注入 messages）+ beforeTool skip 字段可用 + beforeModel 返回 messages 可用 + workspacePath 用 setup() 闭包捕获 | Verified | `hook-auto-injection-proposed` |
| `phase-1-2-implemented` | hook 自动注入 Phase 1+2 实现完成——HandoffProvider 类 + beforeRun 加载 handoff.md + handoff-injector messageBuilder + GitStatusChecker 类 + beforeTool commit 守卫；tsc --noEmit 零错误 | Verified | `phase-0-contract-verified` |
| `phase-3-logic-verified` | Phase 3 核心逻辑单元测试通过——verify-hook-injection.cjs 3 tests PASS | Verified | `phase-1-2-implemented` |
| `cline-3.0.37-upgraded` | cline 从 3.0.34 升级到 3.0.37——npm 脚本修复 + plugin 路径 junction 兼容 | Verified | - |
| `cline-3.0.37-contract-stable` | 云端子代理探查 H1-H5 全部 refuted——3.0.37 plugin 契约无 breaking change，问题在 sandbox 运行时行为 | Verified | `cline-3.0.37-upgraded` |
| `registerRule-over-messageBuilder` | **Phase 3 CLI 实测关键发现**——messageBuilder 注入的 system 消息被 cline agent 训练偏好压过（模型仍主动用 read_files/git log 查 handoff）；registerRule 注入到系统提示词顶层后，模型直接引用注入内容。结论：cline agent 对 registerRule 注入的规则服从度远高于 messageBuilder 注入的 system 消息 | Verified | `phase-3-cli-verified` |
| `phase-3-cli-verified` | Phase 3 CLI 集成测试通过——registerRule 路径注入 handoff 成功，模型直接引用注入的 handoff 内容（不再调用 read_files/git log）；debug 代码清理完成（dbgLog/HandoffState/handoff-injector/beforeRun 全部移除）；tsc --noEmit 零错误 | Verified | `phase-3-logic-verified`, `registerRule-over-messageBuilder` |

## 本会话净变化

### 功能层（submodule context-snapshot）

- **Phase 3 验证 + 清理**（commit `a99494e`）：
  - [src/index.ts](context-snapshot/src/index.ts) — registerRule 注入路径确认 + debug 代码清理
    - 删除 `dbgLog()` 函数 + `appendFileSync` import
    - 删除 `HandoffState` 接口 + `handoffState`/`handoffInjected` 变量
    - 删除 `handoff-injector` messageBuilder（已被 registerRule 取代）
    - 删除 `beforeRun` hook（handoff 加载移至 registerRule content 函数）
    - `registerRule` content 扩展：snapshot context + handoff 全文注入

### 治理层（父仓库）

- [docs/plugin/project-rules.md](plugin/project-rules.md) §1.6 — PowerShell 脚本编码规范（全 ASCII 或 UTF-8 BOM）
- [scripts/sync-and-test.ps1](scripts/sync-and-test.ps1) — 全 ASCII 重写（避免 PowerShell 5.x GBK 解析问题）

### Git 提交

- `a99494e`（submodule）— refactor(hook-injection): switch to registerRule path + cleanup debug code (31 insertions, 79 deletions)

## 待办

### P1 — 回顾设计是否合理，有没有偏离初衷

**背景**：hook-auto-injection-design.md §0 定义了三层治理判据（机械可判定 / 需上下文判断 / 纯方法论）。当前实现经历了 messageBuilder → registerRule 的路径切换，需回顾：

1. 设计初衷是"hook 自动注入 handoff，减少模型用工具读取的开销"
2. 实际实现路径：beforeRun + messageBuilder（失败）→ registerRule（成功）
3. 需回顾的问题：
   - beforeRun hook 被删除，是否影响设计完整性？（beforeRun 原本负责 handoff 加载，现在 registerRule content 函数内联加载）
   - messageBuilder 路径仍保留 snapshot-source-saver + loop-guard-injector，是否与 registerRule 路径有职责重叠？
   - 三层治理判据是否需要更新？（registerRule 注入属于哪层？）

### P2 — SOP + 参考文档能否优化到"只看文档就写出代码"

**背景**：plugin-dev-sop.md（7 步执行清单）+ plugin-dev-quick-reference.md（源码探查产出）是插件开发的两份核心文档。需验证：

1. 验证脚本格式能否复用？——verify-hook-injection.cjs 的 3-test 结构（detect/load + 阈值 + 降级）是否可模板化
2. 能否只看参考文档和 SOP 直接写出代码？——模拟"新会话只读这两份文档，不看源码，写出 HandoffProvider + hook 注册"
3. 差距分析：文档缺什么？（API 字段名 / 时序约束 / 错误降级模式 / ContentBlock 格式要求）

### P3 — handoffProvider.summary 提取质量优化

**背景**：Phase 3 CLI 实测发现 handoffProvider.summary 只提取了头部信息（summary.len=54），模型回答"0 个未完成事项"（实际有 P0/P1/P2 待办）。这是提取质量问题，不是注入问题。

**任务**：优化 HandoffProvider.load() 的 summary 生成逻辑，确保未完成事项计数准确。

## 阻塞项

| 阻塞点 | 影响 | 缓解 |
|--------|------|------|
| TRAE sandbox 限制覆写 `.cline\plugins` | 无法在 IDE 内同步 plugin 代码 | 用户在真实 PowerShell 跑 sync-and-test.ps1 |
| TUI 模式吞 console.log | 无法直接看 plugin 日志 | 用非 TUI 模式或文件日志 |
| PR #12032（CLI codec bug 修复） | 阻塞 H3 长对话实测、schema-v2-snapshot-e2e | 持续监控 |

## 关键资源

### 资源路径速查

```
@cline/shared:  E:\node-global\node_modules\@cline\shared\dist\
@cline/sdk:     E:\node-global\node_modules\@cline\sdk\
@cline/core:    E:\node-global\node_modules\@cline\core\
cline (binary): E:\node-global\node_modules\cline\bin\cline (Bun 编译，无源码)
plugin 代码:    context-snapshot/src/index.ts（已清理，无 debug 代码）
验证脚本:       context-snapshot/verify-hook-injection.cjs（3 tests PASS）
同步脚本:       scripts/sync-and-test.ps1（全 ASCII）
探查规划:       docs/decisions/investigation/investigation-plan-cline-3.0.37-plugin-contract.md
```

### 关键经验

- **registerRule > messageBuilder（system 消息）**：cline agent 训练偏好压过 messageBuilder 注入的 system 消息，但服从 registerRule 注入到系统提示词顶层的规则。后续需要"模型必须遵守"的指令，优先用 registerRule
- **registerRule content 只评估一次**：CLI 3.0.34/3.0.37 中 registerRule content 函数只在 session 启动时调用一次，适合静态内容（handoff/snapshot），不适合动态 per-turn 内容（loop guard 用 messageBuilder）

### 已知事实

- cline 版本：3.0.37（`cline --version`）
- `@cline/*` 包版本：0.0.56
- plugin 安装路径：`_installed/local/`（3.0.37 新路径，junction 指向 `installed/local/`）
- registerRule 注入路径：Verified（模型直接引用 handoff 内容）
- tsc --noEmit：零错误

## 新会话首动作

1. 读 [plugin/project-rules.md](plugin/project-rules.md)（若未归档）
2. 读本文件
3. 按 P1/P2/P3 优先级推进待办

## 引用

- Phase 0 契约验证：[hook-auto-injection-design.md §3](decisions/hook-auto-injection-design.md)
- Phase 1/2/3 实现：[context-snapshot/src/index.ts](context-snapshot/src/index.ts)
- 探查规划（H1-H5 全部 refuted）：[investigation-plan-cline-3.0.37-plugin-contract.md](decisions/investigation/investigation-plan-cline-3.0.37-plugin-contract.md)
- 旧契约参考：[plugin-dev-quick-reference.md §13](plugin/refs/plugin-dev-quick-reference.md)
