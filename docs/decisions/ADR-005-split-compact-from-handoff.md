# ADR-005: 拆分 Compaction 与 Handoff

- **Status**: Accepted
- **Date**: 2026-06-28
- **Deciders**: 项目所有者
- **Supersedes**: ADR-001 中关于 compact 双产物的部分（A 方案的实现方式）
- **Related**: [ADR-001](ADR-001-handoff-compact-memory.md)、[design.md](../plugin/design.md)、[mechanism-candidates.md](../mechanism-candidates.md) #5/#6

---

## Context

### 现状问题

ADR-001 选定的方向是 A（复用 Cline Compact）+ B'（自动分级 Handoff）+ D'（可版本化索引层）。实现上，handoff-plugin 通过 `registerMessageBuilder` 在 Cline compact 触发时同时产出 handoff.md + index.jsonl，把两件事绑定在了一起：

1. **会话内压缩**（Compaction）—— context window 装不下时压缩上下文
2. **跨会话/跨 Agent 状态恢复**（Handoff）—— 保存可移植的工作状态快照

这两个概念被绑在同一个触发器（compact）和同一个产物（handoff.md）上，导致：
- 术语混淆——会话内压缩产出的文件叫"handoff"，但压缩不是交接
- 触发时机错配——compact 是被动的（token 阈值），handoff 应该是主动的（状态显著变化时）
- 职责不清——Cline 原生 compact 已经处理了会话内压缩，plugin 不应该重复做

### 用户工作模式分析

实际使用中，handoff 的核心价值是**可移植的状态恢复**：

```
先读 docs/dev-rules.md 与 docs/search/project-rules.md 各一次，
然后读 docs/handoff.md，按下面的工作内容继续。
```

这不是"跨会话续作"，而是**状态恢复协议**——任何 agent（Cline、OpenClaw、人、任何 LLM）读到 handoff + 相关文件，就能立刻接手工作。

关键特征：
- **Agent 无关**——不绑定 Cline，不绑定任何运行时
- **文件即状态**——状态存在文件系统里，不依赖数据库
- **Git 可追踪**——状态有版本历史，可回滚
- **人可读**——Markdown，不是二进制

### 代表性系统参考

| 系统 | 会话内压缩 | 跨会话记忆 |
|------|----------|-----------|
| **Claude Code** | 4 层策略（时间微压缩 → 缓存微压缩 → 会话记忆 → 完整压缩） | CLAUDE.md（用户手写静态指令） |
| **AgentMemory-Pro** | — | 跨 Agent 持久化记忆引擎（注入 CLAUDE.md / .cursorrules 等） |
| **通用模式** | 分层压缩（轻量 → 重量，渐进式） | 分层记忆（Working → Episodic → Semantic → Procedural） |

> 注：以上仅说明设计空间的代表性方案，**不作为设计依据**。设计依据是用户工作模式实证（下一节）。系统版本会变，但 Token Management ≠ State Persistence 这个划分不会过时。

Claude Code 的会话记忆（session memory）是在会话过程中持续提取的结构化记忆，compact 时直接用它替代 API 调用——这和我们的 handoff.md 在"结构化提取"上有相似之处，但目的不同：Claude Code 的 session memory 是为了**压缩**（减少 token），我们的 handoff 是为了**恢复**（让其他 agent 能接手）。

---

## Decision

将 Compaction 与 Handoff 拆分为两个独立机制，各自有独立的触发器、产物和生命周期。

### 拆分原则

| 维度 | Compaction（会话内压缩） | Handoff（状态恢复快照） |
|------|----------------------|---------------------|
| **目的** | 让对话能继续（token 管理） | 让任何 agent 能接手（状态持久化） |
| **触发** | token 阈值（被动） | 状态显著变化时（主动/信号/定时） |
| **产物** | Cline 原生 compact 摘要 | handoff.md（人可读状态快照） |
| **消费者** | 模型（压缩后的上下文） | 人 / 任何 agent |
| **存储** | Cline 内部管理 | 文件系统 + git |
| **负责方** | Cline 原生 | Plugin / 用户指令 |

### Compaction 层（Cline 原生负责）

Plugin 不干预 Cline 的 compact 流程。`registerMessageBuilder` 可用于观察（日志、指标），但不产出 handoff。

Cline 原生 compact 已覆盖：
- Token 阈值检测
- 消息压缩
- 工具配对完整性

如果 Cline 未来暴露 session memory 提取能力（类似 Claude Code 的 10 段记忆），可以接入，但那是 Cline 的事。

### Handoff 层（Plugin / 用户负责）

Handoff 是独立的状态恢复机制，不依赖 compact 触发。

**触发条件**（满足任一）：
1. 用户显式指令（"写 handoff"、"交接"、"结束会话"）——dev-rules.md §2 触发器 a
2. 决策信号检测（`decision/accept/reject/adopt/rollback/defer` 关键词命中时**建议**写，不自动写）
3. 会话过长 + 话题已跳 + 上下文吃紧——dev-rules.md §2 触发器 c
4. P 级任务完成——project-rules.md 触发器 4.b

**"状态显著变化"的操作性定义**（满足任一即建议触发）：
- 架构决策被接受（ADR status 变为 Accepted）
- 里程碑完成（Phase 结束、实验通过/证伪）
- 工作树交接（切换到不同任务方向）
- 长任务暂停（明确的 stop point）
- 研究对象重新限定（dev-rules.md §1.9 Direction Drift 门控触发）

**产物**：
- `handoff.md`——结构化状态快照（当前格式，保留）
- 不再维护独立的 `index.jsonl`——如果 Cline 未来暴露稳定的会话元数据查询接口，可接入；在此之前，索引由用户自行维护或不维护

**注入机制**：
- #6 session_start hook 的需求，改为写入 Cline 动态 `rules`
- 读取 handoff.md 内容，注入到新会话的 rules 中，而非独立 hook

### 与 Cline 原生能力的边界

```
┌─────────────────────────────────────────────────┐
│ Cline 原生                                       │
│                                                 │
│  Compact（token 阈值触发）                         │
│    → 压缩上下文                                    │
│    → 模型继续工作                                   │
│                                                 │
│  SQLite DB（session metadata）                    │
│    → 会话元数据存储                                  │
│                                                 │
│  rules（plugin API）                              │
│    → 注入持久指令                                   │
│                                                 │
│  文件 Hook（.cline/Hooks/）                        │
│    → 生命周期事件                                   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Plugin / 用户（差异化层）                           │
│                                                 │
│  Handoff（状态变化触发）                            │
│    → 结构化状态快照                                 │
│    → Agent 无关，git 可追踪                         │
│    → 任何 agent 读了就能干活                        │
│                                                 │
│  compact-observer（可选）                          │
│    → 观察 compact 事件                              │
│    → 日志/指标，不产出 handoff                      │
└─────────────────────────────────────────────────┘
```

---

## Consequences

### 正面

- 概念清晰——Compaction 是 Cline 的事，Handoff 是 Plugin 的事
- 触发时机合理——handoff 在状态显著变化时产出，不是 compact 的副产品
- 可移植性更强——handoff 不绑定 Cline 的 compact 触发机制
- 可复用——任何 agent 都能读 handoff，不限于 Cline 生态

### 负面

- handoff-plugin 需要重构——当前 compact 绑定的代码要拆开
- 触发机制变复杂——从"compact 被动触发"变为"多条件主动触发"
- index.jsonl 废弃——如果 Cline SQLite DB 不暴露查询能力，索引层需要替代方案

### 本 ADR 应在以下条件满足时重新审视

- Cline 暴露稳定的 API，支持外部消费结构化的会话状态快照
- Cline 提供可被外部 agent 直接读取的结构化 session memory

### 未选择的方案

**方案 A：保持 compact 绑定 handoff**
- 实现简单（现有代码已验证）
- 拒绝理由：耦合了两个无关关注点（token 管理 vs 状态持久化），compact 是 Cline 的事，handoff 是 Plugin 的事

**方案 B：handoff 存入 SQLite**
- 可利用 Cline 原生存储
- 拒绝理由：不可移植（依赖 Cline 运行时）、不可 git 追踪（二进制数据库）、不 agent 无关（其他 agent 无法直接读取）

**方案 C：index.jsonl 继续自建**
- 与 handoff.md 配对，提供机器可读索引
- 拒绝理由：增加了维护负担，且 Cline 已有 SQLite 存储会话元数据；自建索引与 Cline 原生存储职责重叠，待 Cline 暴露稳定接口后可直接接入

---

## 对现有代码的影响

### handoff-plugin 需要重构

**当前**（`index.ts`）：
```typescript
api.registerMessageBuilder({
    name: "detect-compact",
    build(messages) {
        const result = shouldCompact(messages);
        if (result.needsCompact) {
            writeHandoff(sessionId, messages, tools, files);  // ← 绑定 compact
        }
        return messages;
    },
});
```

**改为**：
```typescript
// compact-observer：只观察，不产出 handoff
api.registerMessageBuilder({
    name: "compact-observer",
    build(messages) {
        const result = shouldCompact(messages);
        if (result.needsCompact) {
            logCompactEvent(messages);  // ← 仅日志/指标
        }
        return messages;
    },
});

// handoff-writer：独立触发器
// 触发方式：用户指令 / 决策信号检测 / rules 注入
// 不绑定 compact
```

### mechanism-candidates 更新

- #5 状态更新：从"实验中（compact 双产物）"改为"实验中（独立 handoff 机制）"
- #6 设计调整：从"session_start hook 读 index.jsonl"改为"rules 注入 handoff.md 内容"

---

## 产源说明

本 ADR 格式映射 EBSE ADR 模板。核心分析基于：
- 主流 Agent 调研（Claude Code 4 层压缩、行业分层记忆趋势）
- 用户工作模式实证（可移植状态恢复协议）
- Cline 原生能力盘点（compact、SQLite、rules、文件 Hook）
- mechanism-candidates #5/#6 现状评估
