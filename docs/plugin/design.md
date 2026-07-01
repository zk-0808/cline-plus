# Context Snapshot Plugin Design Doc

> **状态**：proposed（起草中）
> **日期**：2026-06-27
> **上游决策**：[ADR-001](../decisions/ADR-001-handoff-compact-memory.md)（Accepted，A+B'+D' 方向）、[ADR-004](../decisions/ADR-004-p5-spike-pause.md)（deferred，恢复条件 2 已满足）、**[ADR-005](../decisions/ADR-005-split-compact-from-handoff.md)**（Accepted，Compaction 与 Handoff 拆分）
> **前置验证**：Capability Probe 5（通过），custom-compaction.ts 源码确认，ARCHITECTURE.md §9 Design Seam 确认
> **本设计不替代 ADR-001**——ADR-001 仍为方向性决策，本 Doc 落实 Implementation-level 细节。**ADR-005 修正了实现方式**：Compaction 与 Handoff 拆分为独立机制。

> **术语约定 (ADR-005)**：
> - **context snapshot**（窗口内压缩产物）= 本插件自动生成的上下文摘要，用于 compact 后恢复。本设计文档的主要关注点。
> - **handoff**（跨会话状态快照）= 用户手写的 `docs/handoff.md`，用于跨会话/跨 Agent 状态交接。不属于本插件范围。

---

> ### ⚠️ 不可抗力声明：VS Code 扩展 Plugin 运行时不可用（2026-06-29 确认）
>
> **结论**：Cline VS Code 扩展 4.0.x 全系列不支持 Plugin 系统。**CLI 3.0.30+ 是当前唯一可用的 Plugin 运行环境。** 本设计文档所有 Phase 的实施与验证均须在 CLI 端进行。
>
> **证据链与时间线**：
>
> | 日期 | 版本 | 事件 | 证据 |
> |------|------|------|------|
> | 2026-06-26 | v4.0.0 | esbuild 打包遗漏 `plugin-sandbox-bootstrap.js`，`setup()` 永不执行 | [investigation-note-vscode-bootstrap-missing.md](../decisions/investigation-note-vscode-bootstrap-missing.md)（8 条证据交叉验证，V2 高置信度） |
> | 2026-06-28 | v4.0.1 | 官方回滚到 3.89.2 pre-SDK 代码基，plugin 系统不存在 | [D-2026-06-28-cline-v401-sdk-rollback.md](../decisions/D-2026-06-28-cline-v401-sdk-rollback.md)；release notes: "Roll the stable VS Code extension back to the pre-SDK-migration codebase" |
> | 2026-06-29 | v4.0.2 | 继承回滚，`extension.js` 无任何 plugin 代码 | 实测：`extension.js` 零命中 `plugin-sandbox` / `registerMessageBuilder` |
> | 2026-06-29 | — | GitHub issue #11944 提交，Linear CLINE-2584 关联，作者未回复 SDK 迁移时间线 | handoff.md 本会话决策 |
> | 2026-06-29 | CLI 3.0.33 | `setup()` 执行确认（marker 写入），v0.5.0 三能力（messageBuilders + rules + hooks）全链路加载 | 本会话实测 |
>
> **对本设计的影响**：
> - Phase 1–4 的"VS Code 扩展端验证"全部替换为"CLI 端验证"
> - Phase 4（VS Code 扩展端验证闭环）推迟到 SDK 迁移重新合入稳定版后
> - §2.2 Probe 5 结论"VS Code 扩展 4.0.0 通过 Customize marketplace 加载"已被 v4.0.1 回滚推翻（UI 发现 ≠ sandbox 激活）
> - §2.3 ADR-004 恢复条件 ② 需重新评估：CLI 端满足，VS Code 端不满足

---

## 1. Executive Summary

本设计文档实现 ADR-001 选定的三方向（A 复用 Cline Compact + B' 自动分级 Handoff + D' 可版本化索引层）中，#5 compact 双产物自动化的架构设计与实现路径。

**核心思路**：以 Cline Plugin 形态，通过 `registerMessageBuilder` 挂钩 Cline 原生 compact 事件。compact 是 Cline 会话内唯一能重置上下文的机制，plugin 借此时机写入 context snapshot（结构化会话摘要），compact 后通过 `rules` 动态注入回上下文，实现窗口内无缝续作。以 [custom-compaction.ts](https://github.com/cline/cline/blob/main/sdk/examples/plugins/custom-compaction.ts) 为直接模板。

**前置门控已全部通过**（Capability Probe 5 + U12 解决 + ARCHITECTURE.md 确认），本设计可作为实现阶段的直接输入。

---

## 2. Background

### 2.1 原始问题（ADR-001）

- 73% 任务为 resumed——跨会话续作是主流场景
- 自研 compact 机制的 `compaction_count = 0`，从未触发
- Handoff 设计已验证有效，但纯手工，自动化缺失
- Cline 原生已具备自动上下文压缩能力，存在可挂钩的扩展点

### 2.2 Capability Probe 结果

| Probe | 结果 | 关键证据 |
|-------|------|---------|
| Probe 5（plugin 自动发现）| ✅ VS Code 扩展 4.0.0 通过 Customize marketplace 加载全局 plugin store，setup() 执行 | 用户实测 Customize UI 显示已装 plugin |
| Probe 5（workspace 级 `.cline/plugins/`）| ⏳ 优先级降低——全局 store 已是更优路径 | investigation-note-probe-5.md |
| `registerMessageBuilder` 介入点 | ✅ 确认——custom-compaction.ts 6.3KB 源码，0 截断 | GitHub API WebFetch 确认 |
| Cline 原生 compact 架构 | ✅ ARCHITECTURE.md §9 Design Seam：core 拥有 compaction policy，agents 拥有 turn-preparation seam | sdk/ARCHITECTURE.md |
| #6 session_start hook | ✅ 已实证触发（CLI 3.0.30 实跑），结论保留 | run-p5-capability-spike.md §6 |

### 2.3 ADR-004 恢复条件检查

| 条件 | 状态 | 说明 |
|------|------|------|
| ① CLI 载体稳定性恢复 | ⏳ 未验证（不再需要）| #5 已确认可在 VS Code 扩展直接可用 |
| ② 实验环境-生产环境对齐 | **✅ 满足** | Probe 5 证实 VS Code 扩展 4.0.0 通过全局 plugin store 加载 plugin |
| ③ #5 仍为未解问题 | ✅ 是（本设计要解决）|  |

### 2.4 Architecture Recon 核心发现

[ARCHITECTURE.md §9](https://github.com/cline/cline/blob/main/sdk/ARCHITECTURE.md) "Context Compaction" Design Seam：

- `@cline/agents`：turn-preparation seam——运行 lifecycle hooks，**允许 hosts 在 provider 调用前改写消息历史**
- `@cline/core`：compaction policy——**为 root sessions 注入 prepare-turn pipeline**
- Core 在 plugin messageBuilder 之后运行内置的 API-safety message builder（最终保护）

这意味着 `registerMessageBuilder` 注册的 builder 在 compact 判断之后、API 安全层之前被调用——是最佳介入时机。

---

## 3. Functional Design

### 3.1 核心流程（2026-06-29 源码探查修正）

```
Cline Agent Turn
    ↓
SessionRuntimeOrchestrator.executeRunInternal()
    ↓
  composeSystemPrompt()              ← rules 注入（每 turn 重新解析）
    ↓
  AgentRuntime.run()
    ↓
  prepareTurnForModelRequest()
    ↓
  prepareTurn 闭包（orchestrator.createRuntimePrepareTurn）
    ↓
    prepareProviderMessagesForApi(messages)
      ↓
      plugin messageBuilder.build()  ← registerMessageBuilder 在此介入（compact 前！）
      ↓
      API-safety buildForApi()       ← core 最终保护（truncation/repair）
    ↓
    compact 策略判定（用 apiMessages 做 token 估算）
      ↓
      if needsCompact → compact → 替换 state.messages
    ↓
  hooks.beforeModel 循环             ← #4 beforeModel 在此注入
    ↓
  provider 调用
```

**关键发现（§6 Task A）**：plugin messageBuilder 在 compact 判定**之前**执行。plugin build() 修改消息内容会影响 compact 的 token 估算。compact-observer 的 build() 收到的是 compact 前的原始消息，需自行判断是否写 snapshot。

### 3.2 触发条件

与 custom-compaction.ts 一致：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `MAX_INPUT_TOKENS` | 120,000 | 模型最大输入 token（与 provider 对齐） |
| `COMPACT_AT_RATIO` | 0.75 | 当前 token 达到 max 的 75% 时触发 |
| `PRESERVE_RECENT_TOKENS` | 24,000 | 保留的最近消息 token 量 |

仅在 `totalTokens >= MAX_INPUT_TOKENS * COMPACT_AT_RATIO` 时触发写入。低于阈值时直接返回消息不变。

### 3.3 双产物输出

#### 3.3.1 context snapshot（窗口内会话摘要）

输出路径：`<snapshotDir>/<sessionId>.md`

结构（继承本项目 handoff.md 格式，ADR-005 重命名为 context snapshot）：

```yaml
# Context Snapshot — <会话标题>

## 本会话决策
| 决策 | 状态 |
|------|------|

## 本会话净变化
（关键发现、文件改动）

## 未完成项 / 后续动作
| 方向 | 说明 | 优先级 |

## 权威源
（引用关键证据文件）
```

填充来源：
- **决策**：从消息历史中提取的明确定义的决策点
- **净变化**：`file` block 和 `tool_use` 中检测到的文件改动
- **未完成项**：从上下文推断的未完成的 todo 项
- **权威源**：引用在本会话中被确认的官方文档/源码

#### 3.3.2 index.jsonl（已废弃 — ADR-005）

> **⚠️ DEPRECATED（2026-06-28，[ADR-005](../decisions/ADR-005-split-compact-from-handoff.md)）**
>
> index.jsonl 已被 ADR-005 废弃，不再维护。理由：
> 1. Cline SQLite DB 已存储会话元数据，自建索引与原生存储职责重叠
> 2. 待 Cline 暴露稳定查询接口后可直接接入，无需自建索引层
> 3. Compaction 与 Handoff 拆分后，索引层的定位不再清晰
>
> 以下内容保留作为历史设计记录，**不再作为实现依据**。Phase 3（index.jsonl 集成）已取消。

输出路径：`<snapshotDir>/index.jsonl`

每条 compact 事件追加一行 JSON：

```jsonl
{"schema_version":1,"source":"context-snapshot","session_id":"...","timestamp":"2026-06-27T12:00:00Z","snapshot_path":"<snapshotDir>/<sessionId>.md","summary":"<会话一句话摘要>","key_terms":["<term1>","<term2>"],"file_count":5,"decision_count":2}
```

schema 定义：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `schema_version` | int | ✅ | 当前为 1 |
| `source` | string | ✅ | 固定 `"context-snapshot"` |
| `session_id` | string | ✅ | Cline session 标识 |
| `timestamp` | string (ISO 8601) | ✅ | compact 触发时间 |
| `snapshot_path` | string | ✅ | 同一事件产出的 snapshot 相对路径 |
| `summary` | string | ❌ | AI 生成的一句话摘要 |
| `key_terms` | string[] | ❌ | 本会话涉及的关键概念 |
| `file_count` | int | ❌ | 本会话修改/创建的文件数 |
| `decision_count` | int | ❌ | 本会话记录的决策数 |

设计意图（继承 ADR-001 D' 方案）：
- JSONL 为 append-only，不覆盖，可版本化
- `schema_version` 支持未来迁移
- 索引可重建（从 snapshot 文件重新生成不是灾难），不做死基础设施

#### 3.3.3 存储路径

根据 ARCHITECTURE.md `@cline/shared` 的 `storage path helpers` + 全局 plugin store 实践：

```
~/.cline/data/snapshot/
└── <project_hash>-<timestamp>-<uuid>.md  ← context snapshot（ADR-005 命名规范）
```

> **注**：`index.jsonl` 已废弃（ADR-005），不再写入。

首选全局路径（`~/.cline/data/snapshot/`）——与 `~/.cline/data/{settings,db}/` 一致，跨 workspace 可见。具体路径通过 `@cline/shared` 的 `getStoragePath` 或类似 helper 确定。

### 3.4 降级行为

| 场景 | 行为 |
|------|------|
| snapshot 写入失败（权限/磁盘满）| 记录错误到 console，不影响消息返回 |
| ~~index.jsonl 写入失败~~ | ~~已废弃（ADR-005），不再写入~~ |
| messageBuilder.build() 抛出异常 | **（2026-06-29 修正）** sandbox 层 catch + retry + 返回原始 messages；API-safety builder 在 plugin builder 之后，plugin 异常不会到达它。见 §6 Task C 发现 3 |
| 路径不存在 | 尝试创建目录（`mkdirSync` recursive），失败后跳过写入 |
| VS Code 扩展不扫描全局 store | 退回 workspace 级 `.cline/plugins/` 路径（待实测） |

### 3.5 与 #6 的关系

> **ADR-005 更新**：#6 不再读取 `index.jsonl`（已废弃），改为通过 `rules` 动态注入 snapshot 内容。

#6（rules 注入）检测新 session 启动时读取最新 snapshot 文件，通过 `rules.content()` 函数注入到新会话上下文。二者关系：

- **#5**：compact 触发 → **写入** context snapshot
- **#6**：新 session 启动 → **读取**最新 snapshot → 通过 rules 注入

#5 是 #6 的数据前提。#6 需等待 #5 产出至少一个 snapshot 文件后才能验证。

---

## 4. Architecture

### 4.1 Plugin 结构

```
context-snapshot/
├── package.json             ← manifest（声明 messageBuilders + rules + hooks capabilities）
├── src/
│   ├── index.ts             ← plugin 入口 + setup() 注册三类能力
│   ├── compaction.ts        ← 消息压缩逻辑（基于 custom-compaction.ts，保留给 compact-observer）
│   ├── tool-recorder.ts     ← 统一工具调用记录器（beforeTool/afterTool 数据源）
│   ├── rules-injector.ts    ← context snapshot 动态注入（rules.content 函数）
│   └── types.ts             ← 类型定义
└── README.md
```

### 4.2 模块职责

| 模块 | 职责 | Cline 能力 | 对应候选 |
|------|------|-----------|----------|
| `compact-observer` | 观察 compact 事件，写入 context snapshot | messageBuilders | #5 |
| `rules-injector` | 动态读取最新 snapshot 注入新会话 rules | rules | #6 |
| `tool-recorder` | 统一采集工具调用 (name, args, duration, success, timestamp) | hooks (beforeTool + afterTool) | #1 + #4 |
| `compaction.ts` | token 估算 + shouldCompact 判定（保留，供 compact-observer 使用） | — | — |

### 4.3 文件命名规范

snapshot 文件名格式：`{project_hash}-{timestamp}-{uuid}.md`
- `project_hash`：工作区路径 SHA256 前 4 字符，防止跨项目串味
- `timestamp`：ISO 8601 精确到秒（文件名安全字符）
- `uuid`：6 位随机字符，防并发冲突

`findLatestSnapshot()` 按 project hash + 最近 mtime 选取。

### 4.4 集成点

| 层 | 集成方式 | 说明 |
|----|---------|------|
| Plugin manifest | `capabilities: ["messageBuilders"]` | 声明需要消息构建能力 |
| API 注册 | `api.registerMessageBuilder({ name, build })` | 挂钩 compact 流程 |
| 存储 | Node.js `fs.writeFileSync` / `fs.mkdirSync` | 同步写入（build() 应为同步）|
| 路径 | `@cline/shared` storage helpers 或硬编码 `~/.cline/data/snapshot/` | 跨会话可见 |

### 4.5 与 Cline 分层架构的对齐

```
@cline/core — plugin 发现/加载 → 本 plugin
    ↓
@cline/core — compaction policy → 决定何时 compact
    ↓
@cline/agents — turn-preparation seam → 调用 plugin messageBuilder
    ↓
本 plugin — build() 执行双产物写入
    ↓
@cline/core — API-safety message builder（最终保护）
```

### 4.6 与现有系统的冲突分析

| 现有系统 | 冲突 | 缓解 |
|---------|------|------|
| ARC Agent（Agents Squad handoff store）| Agent Squad 用 Blackboard pattern 做 subagent 间共享，本 plugin 做 self-continuity | 重叠度低，应作为独立 plugin 共存 |
| 自研提示词层 compact | 如果用户还在用提示词版 compact，plugin 版会重复执行 | plugin 版输出更完整，提示词版应逐步淘汰 |

---

## 5. Implementation Plan

### Phase 1：最小可运行 plugin（基于 custom-compaction.ts 模板）

**目标**：验证在 VS Code 扩展 4.0.0 中，通过全局 plugin store 安装的 plugin 的 `registerMessageBuilder` 能正常介入 compact 流程。

**步骤**：
1. Fork `custom-compaction.ts` → 保留原有的消息压缩逻辑
2. 在 `build()` 末尾追加写文件测试：`fs.writeFileSync(<path>, JSON.stringify({triggered: true}))`
3. 通过 CLI `cline plugin install <url>` 安装到全局 store
4. 用户在 VS Code 扩展中确认 plugin 已加载（Customize 面板）
5. 触发一次 compact（长对话），检查写文件是否成功

**通过标准**：compact 触发时，build() 被调用，写入文件成功。

### Phase 2：context snapshot 生成

**目标**：从消息历史提取结构化信息，生成 context snapshot。

**步骤**：
1. 实现 `snapshot-writer.ts`
2. 从 `messages` 数组中提取：
   - 决策信号（用户明确的 yes/no 表述、文件路径、工具调用结果）
   - 文件改动（`file` type content blocks）
   - 未完成任务（`tool_use` 中的 TODO 模式）
3. 组合为 context snapshot 模板
4. 写入 `<snapshotDir>/<sessionId>.md`

**通过标准**：compact 触发时，snapshot 写入成功，内容结构完整，至少包含本会话决策和净变化两节。

### Phase 3：index.jsonl 集成（已取消 — ADR-005）

> **⚠️ DEPRECATED**：index.jsonl 已被 ADR-005 废弃，本 Phase 取消。待 Cline 暴露稳定的会话元数据查询接口后再评估替代方案。

### Phase 4：VS Code 扩展端验证闭环

**目标**：确认在真实 VS Code 扩展工作流中，全链路正常工作。

**步骤**：
1. 用户在 VS Code 扩展中正常使用 Cline
2. 长对话触发 compact
3. 检查 `~/.cline/data/snapshot/` 下是否产出 snapshot
4. 新任务启动时，通过 #6（rules 注入）验证是否能读取到历史 snapshot

**通过标准**：用户工作流中 compact 自动触发 → snapshot 写入 → 新任务可通过 rules 注入恢复上下文。

---

## 6. Risks

| 风险 | 可能性 | 影响 | 缓解 |
|------|--------|------|------|
| VS Code 扩展 4.0.0 的 Customize 按钮实际是 marketplace 入口，非 `registerMessageBuilder` 入口 | 低 | 高——Phase 1 无法通过 | Probe 5 已确认全局 store plugin 被加载，但 messageBuilder 实际生效需实测验证 |
| `build()` 要求同步，fs.writeFileSync 可能阻塞主流程 | 低 | 中——影响对话响应速度 | snapshot 写入量很小（<10KB），同步阻塞可接受 |
| snapshot 质量取决于从 messages 中提取结构化信息的准确性 | 中 | 中——产出可能噪音大 | Phase 2 做提取精度的迭代，可先输出最小可用版本 |
| 自定义 compact 策略与 Cline 原生策略冲突 | 低 | 低 | 本 plugin 不改变 compact 策略，只在 compact 发生时写产物 |

---

## 7. 与本项目文档体系的关系

| 文档 | 关系 |
|------|------|
| [ADR-001](../decisions/ADR-001-handoff-compact-memory.md) | 上游方向决策（Accepted），本设计落实其 Implementation-level 细节 |
| [ADR-004](../decisions/ADR-004-p5-spike-pause.md) | 上游暂停决策（deferred），本设计的重启满足其恢复条件 2 |
| [mechanism-candidates.md](../mechanism-candidates.md) #5 | 本设计对应的机制候选，完成后标"已机制化" |
| [investigation-note-probe-5.md](../archive/decisions/investigation-note-probe-5.md) | 前置验证证据 |
| [sdk/ARCHITECTURE.md](https://github.com/cline/cline/blob/main/sdk/ARCHITECTURE.md) | 系统架构权威源，本设计与之对齐 |
| [custom-compaction.ts](https://github.com/cline/cline/blob/main/sdk/examples/plugins/custom-compaction.ts) | 直接模板，设计模式母本 |

---

## 8. Open Questions

| # | 问题 | 状态 | 如何解决 |
|---|------|------|---------|
| Q1 | VS Code 扩展 4.0.0 中 `registerMessageBuilder` 注册的 builder 是否在 compact 时被调用？ | ✅ 已验证（源码探查）| **是，但在 compact 判定之前**。调用链：prepareTurn 闭包 → prepareProviderMessagesForApi → plugin MB.build() → API-safety buildForApi() → compact 策略判定。plugin MB 收到的是 compact 前的原始消息。|
| Q2 | 全局 store `~/.cline/plugins/installed/local/` 的安装路径是否对 VS Code 扩展和 CLI 共用？ | ✅ 已确认（Probe 5）| 是——p5-spike-plugin 安装后 VS Code 扩展可见 |
| Q3 | `build()` 中写文件是否需考虑并发安全（多个 plugin builder 同时执行）？ | ✅ 已验证（源码探查）| **单 session 内无并发**：messageBuilder 串行执行（for...of + await）。跨 session 写同一 snapshot 文件因含 uuid 后缀不会冲突（ADR-005 后已无 index.jsonl 共享写）。|
| Q4 | 存储路径首选 `~/.cline/data/snapshot/` 是否已由 `@cline/shared` 的 storage helper 支持？ | 待确认 | 落地时从 `@cline/shared` 源码确认或硬编码 |
| Q5 | #6 session_start hook 是否在 VS Code 扩展中工作？ | 待验证 | 与 #5 验证解耦，#6 需 #5 产出数据后才能验证 |

---

## 9. 不在此设计范围内

- 体验对比实验（手写 handoff vs plugin 自动 snapshot）
- Resume 自动化（需要 #6 工作后才能设计）
- 边界讨论（如 token 预算、会话老化策略）
- #1–#4 机制候选（维持"等待 Runtime 能力"暂缓标记）
- #6 session_start hook 实现（仅依赖其概念完成 #5 设计）
