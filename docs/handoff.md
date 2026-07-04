# Handoff — ADR-007 拆分 registerRule + 职责耦合治理

> **生命周期**：每次覆写，无归档——会话交接文件。
> **进入规则**：会话开始时先读 `plugin/project-rules.md`（若未归档），再读本文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `phase-3-cli-verified` | Phase 3 CLI 集成测试通过——registerRule 路径注入 handoff 成功；debug 代码清理完成；tsc --noEmit 零错误 | Verified | `registerRule-over-messageBuilder` |
| `registerRule-over-messageBuilder` | messageBuilder 注入的 system 消息被 cline agent 训练偏好压过；registerRule 注入到系统提示词顶层后模型直接引用注入内容 | Verified | - |
| `adr-007-snapshot-static-injection` | **ADR-007**：snapshot 走 registerRule 静态注入（不迁 messageBuilder）。承重论据：会话内续命归 cline 原生 compaction，snapshot 只服务跨会话续作——本会话的续命压根不归 snapshot 管。registerRule "求值一次" 契约匹配两者静态资产语义。复查触发：若需本会话重读自己中途写的 snapshot，本定位失效 | Verified | `registerRule-over-messageBuilder` |
| `rules-split-handoff-snapshot` | registerRule 拆分为两个独立 id（`handoff-context` / `snapshot-context`），content() 改纯函数读预加载 state，I/O 移到 setup()。独立降级：加载失败返回空字符串，互不影响。tsc 零错误，3 tests PASS | Verified | `adr-007-snapshot-static-injection` |

## 本会话净变化

### 功能层（submodule context-snapshot）

- **registerRule 拆分**（commit `e86f925`）：
  - [src/index.ts](context-snapshot/src/index.ts) — handoff/snapshot 各注册一条 rule
    - 新增 `handoffContentLoaded` / `snapshotContentLoaded` module state
    - setup() 预加载 I/O（try/catch 独立降级）
    - content() 改纯函数读 state，无 I/O，可单测
    - 独立降级：snapshot 文件不存在 → snapshot rule 返回空；handoff.md 不存在 → handoff rule 返回空

### 治理层（父仓库）

- [ADR-007-snapshot-registerRule-static-injection.md](decisions/adr/ADR-007-snapshot-registerRule-static-injection.md) — snapshot 走 registerRule 静态注入的论证 + 复查触发条件

### 关键经验沉淀

- **评审结论与改动量比值**：前期两轮模板评审（SE Reviewer + Agent Developer）上千行论证，把"注册两条 rule"膨胀成 Framework/Runtime 架构升级——被外部评审批评。健康比值应是：四条源码实据 + 一句定位 + 十行改动
- **承重论据优先于结论**：ADR-007 写的是"会话内续命归 cline 原生 compaction"这句论证，不是"snapshot 走 registerRule"这个结论。结论会过时，论证才可复查
- **可证伪决策**：ADR-007 带复查触发条件（"若需本会话重读自己中途写的 snapshot，本定位失效"），防止教条化

### Git 提交

- `e86f925`（submodule）— refactor(rules): split registerRule into handoff-context + snapshot-context (ADR-007) (41 insertions, 26 deletions)

## 待办

### P1 — 回顾设计是否偏离初衷（已部分完成）

**已完成**：
- ADR-007 锁定 snapshot 定位（跨会话续作）
- registerRule 拆分（handoff/snapshot 独立 id）
- content() 改纯函数

**待完成**：
- 更新 [hook-auto-injection-design.md](decisions/hook-auto-injection-design.md) §2/§3.2（beforeRun vs registerRule 论证已过时，§3.2 "方式 B 唯一可行"被推翻）
- 评估是否需要更新 §0 三层治理判据（registerRule 注入属于哪层？）

### P2 — SOP + 参考文档能否优化到"只看文档就写出代码"

**任务**：
1. 验证脚本格式能否复用？——verify-hook-injection.cjs 的 3-test 结构是否可模板化
2. 能否只看参考文档和 SOP 直接写出代码？——模拟"新会话只读这两份文档写出 HandoffProvider + hook 注册"
3. 差距分析：文档缺什么？

### P3 — handoffProvider.summary 提取质量优化

**背景**：Phase 3 CLI 实测发现 summary 只提取头部信息（len=54），模型回答"0 个未完成事项"（实际有 P0/P1/P2）。这是提取质量问题，不是注入问题。

**任务**：优化 HandoffProvider.load() 的 summary 生成逻辑。

## 阻塞项

| 阻塞点 | 影响 | 缓解 |
|--------|------|------|
| TRAE sandbox 限制覆写 `.cline\plugins` | 无法在 IDE 内同步 plugin 代码 | 用户在真实 PowerShell 跑 sync-and-test.ps1 |
| TUI 模式吞 console.log | 无法直接看 plugin 日志 | 用非 TUI 模式 |
| PR #12032（CLI codec bug 修复） | 阻塞 H3 长对话实测 | 持续监控 |

## 关键资源

### 资源路径速查

```
@cline/shared:  E:\node-global\node_modules\cline\node_modules\@cline\shared\dist\
plugin 代码:    context-snapshot/src/index.ts（已拆分 registerRule）
验证脚本:       context-snapshot/verify-hook-injection.cjs（3 tests PASS）
同步脚本:       scripts/sync-and-test.ps1（全 ASCII）
ADR-007:        docs/decisions/adr/ADR-007-snapshot-registerRule-static-injection.md
```

### 关键经验

- **registerRule > messageBuilder（system 消息）**：cline agent 训练偏好压过 messageBuilder system 消息，但服从 registerRule 注入的规则
- **registerRule content 只评估一次**：适合静态内容（handoff/snapshot），不适合动态 per-turn 内容
- **snapshot 服务跨会话续作**：会话内续命归 cline 原生 compaction，snapshot 只服务下一会话启动注入（ADR-007）
- **content() 应是纯函数**：I/O 在 setup() 完成，content 只读 state，可单测

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
4. 按 P1（更新设计文档）/ P2（SOP 优化）/ P3（summary 质量）推进

## 引用

- ADR-007：[ADR-007-snapshot-registerRule-static-injection.md](decisions/adr/ADR-007-snapshot-registerRule-static-injection.md)
- Phase 0 契约验证：[hook-auto-injection-design.md §3](decisions/hook-auto-injection-design.md)
- 探查规划（H1-H5 全部 refuted）：[investigation-plan-cline-3.0.37-plugin-contract.md](decisions/investigation/investigation-plan-cline-3.0.37-plugin-contract.md)
