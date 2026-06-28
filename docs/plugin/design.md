# Handoff Plugin Design Doc

> **状态**：proposed（起草中）
> **日期**：2026-06-27
> **上游决策**：[ADR-001](../decisions/ADR-001-handoff-compact-memory.md)（Accepted，A+B'+D' 方向）、[ADR-004](../decisions/ADR-004-p5-spike-pause.md)（deferred，恢复条件 2 已满足）、**[ADR-005](../decisions/ADR-005-split-compact-from-handoff.md)**（Accepted，Compaction 与 Handoff 拆分）
> **前置验证**：Capability Probe 5（通过），custom-compaction.ts 源码确认，ARCHITECTURE.md §9 Design Seam 确认
> **本设计不替代 ADR-001**——ADR-001 仍为方向性决策，本 Doc 落实 Implementation-level 细节。**ADR-005 修正了实现方式**：Compaction 与 Handoff 拆分为独立机制。

---

## 1. Executive Summary

本设计文档实现 ADR-001 选定的三方向（A 复用 Cline Compact + B' 自动分级 Handoff + D' 可版本化索引层）中，#5 compact 双产物自动化的架构设计与实现路径。

**核心思路**：以 Cline Plugin 形态，通过 `registerMessageBuilder` 挂钩 Cline 原生 compact 事件，在 compact 发生时自动产出 handoff.md（结构化会话快照）+ index.jsonl（可搜索索引条目）。以 [custom-compaction.ts](https://github.com/cline/cline/blob/main/sdk/examples/plugins/custom-compaction.ts) 为直接模板，替换其摘要逻辑为双产物写入。

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

### 3.1 核心流程

```
Cline Agent Turn
    ↓
@cline/agents turn-preparation
    ↓
  run lifecycle hooks
    ↓
  allow message history rewrite  ←  registerMessageBuilder 在此介入
    ↓
    messageBuilder.build(messages)  →  compact 判定 → 双产物写入 → 返回修改后 messages
    ↓
@cline/core API-safety message builder（最终保护）
    ↓
provider 调用
```

### 3.2 触发条件

与 custom-compaction.ts 一致：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `MAX_INPUT_TOKENS` | 120,000 | 模型最大输入 token（与 provider 对齐） |
| `COMPACT_AT_RATIO` | 0.75 | 当前 token 达到 max 的 75% 时触发 |
| `PRESERVE_RECENT_TOKENS` | 24,000 | 保留的最近消息 token 量 |

仅在 `totalTokens >= MAX_INPUT_TOKENS * COMPACT_AT_RATIO` 时触发写入。低于阈值时直接返回消息不变。

### 3.3 双产物输出

#### 3.3.1 handoff.md（结构化会话快照）

输出路径：`<handoffDir>/<sessionId>.md`

结构（继承本项目 handoff.md 格式）：

```yaml
# Handoff — <会话标题>

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

#### 3.3.2 index.jsonl（可版本化索引层）

输出路径：`<handoffDir>/index.jsonl`

每条 compact 事件追加一行 JSON：

```jsonl
{"schema_version":1,"source":"handoff-plugin","session_id":"...","timestamp":"2026-06-27T12:00:00Z","handoff_path":"<handoffDir>/<sessionId>.md","summary":"<会话一句话摘要>","key_terms":["<term1>","<term2>"],"file_count":5,"decision_count":2}
```

schema 定义：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `schema_version` | int | ✅ | 当前为 1 |
| `source` | string | ✅ | 固定 `"handoff-plugin"` |
| `session_id` | string | ✅ | Cline session 标识 |
| `timestamp` | string (ISO 8601) | ✅ | compact 触发时间 |
| `handoff_path` | string | ✅ | 同一事件产出的 handoff.md 相对路径 |
| `summary` | string | ❌ | AI 生成的一句话摘要 |
| `key_terms` | string[] | ❌ | 本会话涉及的关键概念 |
| `file_count` | int | ❌ | 本会话修改/创建的文件数 |
| `decision_count` | int | ❌ | 本会话记录的决策数 |

设计意图（继承 ADR-001 D' 方案）：
- JSONL 为 append-only，不覆盖，可版本化
- `schema_version` 支持未来迁移
- 索引可重建（从 handoff 文件重新生成不是灾难），不做死基础设施

#### 3.3.3 存储路径

根据 ARCHITECTURE.md `@cline/shared` 的 `storage path helpers` + 全局 plugin store 实践：

```
~/.cline/data/handoff/
├── <sessionId>.md          ← handoff 快照
└── index.jsonl             ← 索引（append-only）

# 或 workspace 级（待确认 VS Code 是否扫描）：
<workspace>/.cline/handoff/
├── <sessionId>.md
└── index.jsonl
```

首选全局路径（`~/.cline/data/handoff/`）——与 `~/.cline/data/{settings,db}/` 一致，跨 workspace 可见。具体路径通过 `@cline/shared` 的 `getStoragePath` 或类似 helper 确定。

### 3.4 降级行为

| 场景 | 行为 |
|------|------|
| handoff.md 写入失败（权限/磁盘满）| 记录错误到 console，不影响消息返回 |
| index.jsonl 写入失败 | 同上，handoff.md 仍写入（部分产出 > 无产出）|
| messageBuilder.build() 抛出异常 | Cline core 的 API-safety builder 继续运行，不阻塞对话 |
| 路径不存在 | 尝试创建目录（`mkdirSync` recursive），失败后跳过写入 |
| VS Code 扩展不扫描全局 store | 退回 workspace 级 `.cline/plugins/` 路径（待实测） |

### 3.5 与 #6 的关系

#6（session_start hook）检测新 session 启动时读取 `index.jsonl`，找到与当前任务关联的历史 handoff，自动注入提示词。二者关系：

- **#5**：compact 触发 → **写入** handoff + index
- **#6**：session start → **读取** index → 注入相关 handoff

#5 是 #6 的数据前提。#6 需等待 #5 产出至少一条索引条目后才能验证。

---

## 4. Architecture

### 4.1 Plugin 结构

```
handoff-plugin/
├── package.json             ← manifest（声明 messageBuilders + rules + hooks capabilities）
├── src/
│   ├── index.ts             ← plugin 入口 + setup() 注册三类能力
│   ├── compaction.ts        ← 消息压缩逻辑（基于 custom-compaction.ts，保留给 compact-observer）
│   ├── tool-recorder.ts     ← 统一工具调用记录器（beforeTool/afterTool 数据源）
│   ├── rules-injector.ts    ← handoff.md 动态注入（rules.content 函数）
│   └── types.ts             ← 类型定义
└── README.md
```

### 4.2 模块职责

| 模块 | 职责 | Cline 能力 | 对应候选 |
|------|------|-----------|----------|
| `compact-observer` | 观察 compact 事件，仅日志记录，**不写 handoff** | messageBuilders | #5 |
| `rules-injector` | 动态读取最新 handoff.md 注入新会话 rules | rules | #6 |
| `tool-recorder` | 统一采集工具调用 (name, args, duration, success, timestamp) | hooks (beforeTool + afterTool) | #1 + #4 |
| `compaction.ts` | token 估算 + shouldCompact 判定（保留，供 compact-observer 使用） | — | — |

### 4.3 文件命名规范

handoff 文件名格式：`{project_hash}-{timestamp}-{uuid}.md`
- `project_hash`：工作区路径 SHA256 前 4 字符，防止跨项目串味
- `timestamp`：ISO 8601 精确到秒（文件名安全字符）
- `uuid`：6 位随机字符，防并发冲突

`findLatestHandoff()` 按 project hash + 最近 mtime 选取。

### 4.2 集成点

| 层 | 集成方式 | 说明 |
|----|---------|------|
| Plugin manifest | `capabilities: ["messageBuilders"]` | 声明需要消息构建能力 |
| API 注册 | `api.registerMessageBuilder({ name, build })` | 挂钩 compact 流程 |
| 存储 | Node.js `fs.writeFileSync` / `fs.mkdirSync` | 同步写入（build() 应为同步）|
| 路径 | `@cline/shared` storage helpers 或硬编码 `~/.cline/data/handoff/` | 跨会话可见 |

### 4.3 与 Cline 分层架构的对齐

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

### 4.4 与现有系统的冲突分析

| 现有系统 | 冲突 | 缓解 |
|---------|------|------|
| ARC Agent（Agents Squad handoff store）| Agent Squad 用 Blackboard pattern 做 subagent 间共享，本 plugin 做 self-continuity | 重叠度低，应作为独立 plugin 共存（已验证，见 handoff.md §5） |
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

### Phase 2：handoff.md 生成

**目标**：从消息历史提取结构化信息，生成符合本项目规范的 handoff.md。

**步骤**：
1. 实现 `handoff-writer.ts`
2. 从 `messages` 数组中提取：
   - 决策信号（用户明确的 yes/no 表述、文件路径、工具调用结果）
   - 文件改动（`file` type content blocks）
   - 未完成任务（`tool_use` 中的 TODO 模式）
3. 组合为 handoff.md 模板
4. 写入 `<handoffDir>/<sessionId>.md`

**通过标准**：compact 触发时，handoff.md 写入成功，内容结构完整，至少包含本会话决策和净变化两节。

### Phase 3：index.jsonl 集成

**目标**：每次 compact 事件追加一条索引条目。

**步骤**：
1. 实现 `index-writer.ts`
2. 从手写 handoff 中提取 `session_id`、`summary`、`key_terms`、`file_count`、`decision_count`
3. append-only 写入 `index.jsonl`
4. 验证：多次 compact 产生多条记录，文件有效 JSONL

**通过标准**：多次 compact 后，index.jsonl 包含多条可解析的 JSON 行。

### Phase 4：VS Code 扩展端验证闭环

**目标**：确认在真实 VS Code 扩展工作流中，全链路正常工作。

**步骤**：
1. 用户在 VS Code 扩展中正常使用 Cline
2. 长对话触发 compact
3. 检查 `~/.cline/data/handoff/` 下是否产出 handoff.md
4. 检查 `index.jsonl` 是否追加
5. 新任务启动时，通过 #6（session_start hook）验证是否能读取到历史 handoff

**通过标准**：用户工作流中 compact 自动触发 → 双产物写入 → 新任务可检索。

---

## 6. Risks

| 风险 | 可能性 | 影响 | 缓解 |
|------|--------|------|------|
| VS Code 扩展 4.0.0 的 Customize 按钮实际是 marketplace 入口，非 `registerMessageBuilder` 入口 | 低 | 高——Phase 1 无法通过 | Probe 5 已确认全局 store plugin 被加载，但 messageBuilder 实际生效需实测验证 |
| `build()` 要求同步，fs.writeFileSync 可能阻塞主流程 | 低 | 中——影响对话响应速度 | handoff.md/index.jsonl 写入量很小（<10KB），同步阻塞可接受 |
| handoff.md 质量取决于从 messages 中提取结构化信息的准确性 | 中 | 中——产出可能噪音大 | Phase 2 做提取精度的迭代，可先输出最小可用版本 |
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
| Q1 | VS Code 扩展 4.0.0 中 `registerMessageBuilder` 注册的 builder 是否在 compact 时被调用？ | 待验证 | Phase 1 实测 |
| Q2 | 全局 store `~/.cline/plugins/installed/local/` 的安装路径是否对 VS Code 扩展和 CLI 共用？ | ✅ 已确认（Probe 5）| 是——p5-spike-plugin 安装后 VS Code 扩展可见 |
| Q3 | `build()` 中写文件是否需考虑并发安全（多个 plugin builder 同时执行）？ | 待评估 | 不紧急——custom-compaction.ts 无并发处理，先保持一致 |
| Q4 | 存储路径首选 `~/.cline/data/handoff/` 是否已由 `@cline/shared` 的 storage helper 支持？ | 待确认 | 落地时从 `@cline/shared` 源码确认或硬编码 |
| Q5 | #6 session_start hook 是否在 VS Code 扩展中工作？ | 待验证 | 与 #5 验证解耦，#6 需 #5 产出数据后才能验证 |

---

## 9. 不在此设计范围内

- 体验对比实验（手写 handoff vs plugin 自动 handoff）
- Resume 自动化（需要 #6 工作后才能设计）
- 边界讨论（如 token 预算、会话老化策略）
- #1–#4 机制候选（维持"等待 Runtime 能力"暂缓标记）
- #6 session_start hook 实现（仅依赖其概念完成 #5 设计）
