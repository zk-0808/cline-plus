# Snapshot Writer 提取器数据模型设计（v0.7.0 起点）

> **状态**：proposed（设计草案）
> **日期**：2026-07-01
> **目标版本**：v0.7.0
> **前置版本**：v0.6.0（当前，正则提取）
> **关联**：[design.md §3.3.1](design.md) · [snapshot-writer.ts](../../context-snapshot/src/snapshot-writer.ts) · [evidence-governance.md](../evidence-governance.md)

---

## 1. 背景与动机

### 1.1 v0.6.0 现状

[snapshot-writer.ts](../../context-snapshot/src/snapshot-writer.ts) 当前使用 4 个正则函数提取信息：

| 函数 | 提取对象 | 方法 | 局限 |
|------|---------|------|------|
| `extractDecisions` | 决策 | 匹配 user 消息中 `accept/reject/adopt/defer/rollback` 关键词 | 只扫 user 消息；"用户要求 accept" ≠ "决策被 accept"；无上下文 |
| `extractUnfinished` | 未完成项 | 匹配 user 消息中 `todo/next/remaining` 关键词 | 误报高；无优先级推断 |
| `extractSources` | 权威源 | 匹配文件扩展名 `.md/.txt/.json` | 无语义判断；.md 不等于权威源 |
| `deriveSessionTitle` | 标题 | 取首条 user 消息前 60 字符 | 无语义提取 |

### 1.2 核心问题

1. **数据模型缺失**：`ExtractedDecision` / `ExtractedUnfinished` 是松散 interface，无统一类型层
2. **只扫 user 消息**：assistant 消息中的决策声明、文件改动、工具结果全部忽略
3. **无置信度**：正则命中即收录，无法区分"高置信决策"和"可能是决策"
4. **无证据链**：提取结果不记录来源消息索引，无法回溯

### 1.3 设计目标

- 建立统一的 `SnapshotData` 数据模型
- 每类提取器实现 `Extractor` 接口，产出带置信度的结构化结果
- 提取范围扩展到全部消息（user + assistant）
- 保留 v0.6.0 的 5 节模板作为渲染层，数据模型与渲染解耦

---

## 2. 数据模型

### 2.1 顶层模型

```typescript
/**
 * Snapshot 顶层数据模型。
 * 由各 Extractor 协作填充，Renderer 负责渲染为 Markdown。
 */
interface SnapshotData {
  meta: SnapshotMeta;
  decisions: DecisionRecord[];
  changes: ChangeRecord[];
  todos: TodoRecord[];
  sources: SourceRecord[];
}

interface SnapshotMeta {
  title: string;
  timestamp: string;        // ISO 8601
  messageCount: number;
  toolCount: number;
  fileCount: number;
}
```

### 2.2 共享基础类型

```typescript
/**
 * 置信度词汇表——对接 evidence-governance.md §4
 */
type Confidence = "high" | "medium" | "low";

/**
 * 证据引用——记录提取来源，支持回溯
 */
interface EvidenceRef {
  messageIndex: number;     // 消息在 messages 数组中的位置
  role: "user" | "assistant";
  excerpt: string;          // 命中的原文片段（≤100 字符）
}

/**
 * 提取器产出基类
 */
interface ExtractedRecord {
  confidence: Confidence;
  evidence: EvidenceRef[];  // 至少 1 条
}
```

### 2.3 四类记录类型

```typescript
/**
 * 决策记录
 * 对应模板 §1「本会话决策」
 */
interface DecisionRecord extends ExtractedRecord {
  text: string;             // 决策内容（一句话）
  status: "accepted" | "rejected" | "deferred" | "rolled-back" | "decided";
  category?: "architecture" | "process" | "tooling" | "scope";
}

/**
 * 变更记录
 * 对应模板 §2「本会话净变化」
 */
interface ChangeRecord extends ExtractedRecord {
  kind: "file-created" | "file-modified" | "file-deleted" | "tool-used";
  path?: string;            // 文件路径（file-* 类型）
  toolName?: string;        // 工具名（tool-used 类型）
}

/**
 * 未完成项记录
 * 对应模板 §3「未完成项 / 后续动作」
 */
interface TodoRecord extends ExtractedRecord {
  direction: string;        // 方向描述
  priority: "high" | "medium" | "low" | "tbd";
  blockerRef?: string;      // 阻塞项引用（指向稳定 ID，预留 v0.8+）
}

/**
 * 权威源记录
 * 对应模板 §4「权威源」
 */
interface SourceRecord extends ExtractedRecord {
  path: string;             // 文件路径或 URL
  kind: "doc" | "source-code" | "config" | "external";
}
```

---

## 3. 提取器接口

### 3.1 统一接口

```typescript
/**
 * 提取器接口。
 * 每个提取器专注一类信息，独立可测。
 */
interface Extractor<T extends ExtractedRecord> {
  /** 提取器名称，用于日志 */
  name: string;

  /**
   * 从消息历史中提取结构化记录。
   * @param messages 完整消息历史（user + assistant）
   * @param tools 工具调用名列表
   * @param files 文件路径列表
   * @returns 提取到的记录数组，可能为空
   */
  extract(
    messages: Message[],
    tools: string[],
    files: string[],
  ): T[];
}
```

### 3.2 四个提取器

#### 3.2.1 DecisionExtractor

**职责**：提取会话中的显式决策

**v0.6.0 对比**：当前只匹配 user 消息关键词。v0.7.0 扩展到：

| 信号源 | 提取模式 | 置信度 |
|--------|---------|--------|
| user 消息含 `accept/reject/adopt/defer/rollback` + 明确对象 | 显式决策指令 | high |
| assistant 消息含「已决定」「采纳」「拒绝」+ 理由 | 决策声明 | medium |
| user 消息含 `accept/reject` 但无明确对象 | 可能是决策 | low |

**关键改进**：
- 扫描 user + assistant 消息
- 关键词命中后回溯上下文（前 1-2 条消息）判断是否有明确决策对象
- `confidence` 基于信号源 + 上下文明确度

#### 3.2.2 ChangeExtractor

**职责**：提取文件改动和工具使用

**v0.6.0 对比**：当前 `collectTouchedFiles` 只收集文件路径列表。v0.7.0 扩展为结构化记录：

| 信号源 | 提取模式 |
|--------|---------|
| `file` type content block | `file-created` / `file-modified`（按 block 子类型）|
| tool_use 中 write/edit 路径 | `file-modified` |
| tool_use 名 | `tool-used` |

**关键改进**：
- 区分文件创建 vs 修改（当前无法区分）
- 记录工具使用为独立 ChangeRecord，而非简单字符串列表
- 每条记录附 `EvidenceRef`（来源消息索引）

#### 3.2.3 TodoExtractor

**职责**：提取未完成项和后续动作

**v0.6.0 对比**：当前只匹配 user 消息关键词。v0.7.0 扩展到：

| 信号源 | 提取模式 | 置信度 |
|--------|---------|--------|
| user 消息含 `TODO/未完成/下一步` + 具体内容 | 显式待办 | high |
| assistant 消息含「下一步」「待跟进」「未完成」| 计划性待办 | medium |
| TodoWrite tool 调用 | 结构化待办 | high |

**关键改进**：
- 解析 TodoWrite tool 调用（如果存在）——这是最可靠的结构化待办源
- 优先级推断：`high` 来自显式声明，`tbd` 来自无优先级信息的匹配
- 预留 `blockerRef` 字段（v0.8+ 依赖图用）

#### 3.2.4 SourceExtractor

**职责**：提取权威源引用

**v0.6.0 对比**：当前只按文件扩展名匹配。v0.7.0 扩展为：

| 信号源 | kind |
|--------|------|
| `.md` 文件且出现在「详见」「参见」语境 | `doc` |
| `.ts` / `.js` 文件且被 Read/Grep 工具访问 | `source-code` |
| `package.json` / `tsconfig.json` | `config` |
| `https://` URL | `external` |

**关键改进**：
- 不再只按扩展名，增加语义上下文判断
- 区分 `source-code` 和 `config`（当前混为 `doc`）
- URL 单独归类为 `external`

---

## 4. 渲染层

### 4.1 数据与渲染解耦

v0.6.0 的 `generateSnapshotContent` 把提取和渲染耦合在一个函数里。v0.7.0 拆分：

```typescript
// 提取阶段：messages → SnapshotData
function extractSnapshotData(messages, tools, files): SnapshotData {
  return {
    meta: deriveMeta(messages, tools, files),
    decisions: decisionExtractor.extract(messages, tools, files),
    changes: changeExtractor.extract(messages, tools, files),
    todos: todoExtractor.extract(messages, tools, files),
    sources: sourceExtractor.extract(messages, tools, files),
  };
}

// 渲染阶段：SnapshotData → Markdown（5 节模板）
function renderSnapshot(data: SnapshotData): string {
  // 保留 v0.6.0 的 5 节模板结构
  // 渲染时按 confidence 排序（high 在前）
}
```

### 4.2 渲染规则

| 模板节 | 数据源 | 渲染规则 |
|--------|--------|---------|
| 标题 | `meta.title` | — |
| §1 决策 | `decisions[]` | 按 confidence 降序；low 置信度附 ⚠️ 标记 |
| §2 净变化 | `changes[]` | file-* 在前，tool-used 在后；去重 |
| §3 未完成项 | `todos[]` | priority 映射：high→🟡/🔴，medium→🟡，low/tbd→🟢 |
| §4 权威源 | `sources[]` | 按 kind 分组 |

---

## 5. 与外部评审建议的关系

本设计**不涉及**外部评审提议的「语义对象模型 + 双投影」——那是 handoff 机制化基石的方向，属于 v0.8+ 议题。

本设计聚焦于 **snapshot writer 的提取精度改进**，是 v0.6.0 正则方案的直接迭代。两者关系：

| 维度 | 本设计（v0.7.0）| 语义对象模型（v0.8+ 议题）|
|------|----------------|-------------------------|
| 范围 | snapshot writer 内部 | snapshot + handoff.md 共享语义层 |
| 字段 | `confidence` / `evidence` | `id` / `confidence` / `depends_on` / `lifecycle` |
| 目标 | 提取精度 | 跨 agent 状态协议 |
| 依赖 | 无外部依赖 | 需 handoff 正式开发启动 |

**v0.7.0 的 `confidence` 和 `EvidenceRef` 字段为 v0.8+ 的语义对象模型预留了对接点**——未来 handoff schema 化时，snapshot 侧的 confidence 词汇表已就绪，可直接对接 evidence-governance §4。

---

## 6. 实施计划

### Phase 1：数据模型 + 接口定义

**目标**：定义 `SnapshotData` / `Extractor` 类型，不改运行时行为

**步骤**：
1. 在 `types.ts` 中新增 v0.7.0 类型定义
2. 保留 v0.6.0 的 `ExtractedDecision` / `ExtractedUnfinished` 作为 deprecated
3. 新增 `extractors/` 目录

**通过标准**：TypeScript 编译通过，运行时行为不变。

### Phase 2：实现四个提取器

**目标**：每个提取器独立实现 + 独立可测

**步骤**：
1. `extractors/decision-extractor.ts`
2. `extractors/change-extractor.ts`
3. `extractors/todo-extractor.ts`
4. `extractors/source-extractor.ts`
5. 单元测试：用 v0.6.0 产出的 snapshot 作为 ground truth 对比

**通过标准**：新提取器对同一份消息历史产出的结果，精度 ≥ v0.6.0 正则方案，且包含 v0.6.0 遗漏的 assistant 消息决策。

### Phase 3：渲染层解耦 + 集成

**目标**：`generateSnapshotContent` 拆为 `extractSnapshotData` + `renderSnapshot`

**步骤**：
1. 实现 `renderSnapshot(data: SnapshotData): string`
2. `snapshot-writer.ts` 改为调用新管线
3. 对比 v0.6.0 和 v0.7.0 产出，确认 5 节模板结构不变

**通过标准**：workaround 路径（降阈值触发 compact）产出的 snapshot，5 节结构完整，精度高于 v0.6.0。

### Phase 4：精度验证

**目标**：用真实会话数据验证提取精度

**步骤**：
1. 取 3 份历史 handoff.md 作为 ground truth
2. 用 v0.7.0 提取器对相同会话消息历史提取
3. 对比：召回率（遗漏了多少决策）+ 精确率（误报多少）

**通过标准**：决策召回率 ≥80%，精确率 ≥70%（v0.6.0 正则方案基线待测）。

---

## 7. 风险

| 风险 | 可能性 | 影响 | 缓解 |
|------|--------|------|------|
| assistant 消息扫描引入噪音（模型生成内容非决策声明）| 中 | 中 | `confidence=medium` 标记，渲染时降序排列 |
| TodoWrite tool 调用解析依赖 tool input schema | 低 | 低 | tool input schema 已在 types.ts 中定义 |
| 提取精度达不到 80% 召回率 | 中 | 中 | Phase 4 验证后迭代正则/规则 |
| §1.15 codec bug 阻塞真实长对话路径验证 | 高 | 中 | Phase 3 用 workaround 路径验证，Phase 4 待 codec bug 修复 |

---

## 8. 不在本设计范围内

- handoff.md 的 schema 化（v0.8+ 议题，见 [external-review-handoff-foundation.md](external-review-handoff-foundation.md)）
- 语义对象模型定义（v0.8+ 议题）
- 依赖图 / blocker_ref 字段实现（v0.8+ 预留，本版本 TodoRecord 仅预留字段位）
- index.jsonl 恢复（已废弃，见 [design.md §3.3.2](design.md)）
