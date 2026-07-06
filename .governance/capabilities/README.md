# Capability Modules — L3 能力模块设计

> **生命周期**：版本绑定 — v1.0 框架定型后归档,后续变更走 ADR。
>
> **身份**：GV-6 产出。4 个 Capability 的综合设计文档——回答"怎么做"。
>
> **接口契约**：CapabilityResult 三态(pass/block/inject)由 GV-7 §三锁定,本文件补齐 SessionContext / HookEvent 完整字段定义。
>
> **正交原则**：Capability 只表达**意图**(intent),Hook 执行**动作**。同一 Capability 可被多 Hook 复用。
>
> **开发新 Capability**：按 [`SOP.md`](SOP.md) 7 步流程执行。

---

## 一、共用类型定义(GV-6 补齐)

> GV-7 §三仅锁定 CapabilityResult 三态。本节定义 SessionContext / HookEvent,锁定后 GV-6 各 Capability 实现以此为契约。

```typescript
/**
 * 会话状态——Capability 调用时的运行时上下文
 */
interface SessionContext {
  cwd: string;                          // 当前工作目录
  gitBranch?: string;                   // 当前 git 分支(若 git 仓库)
  gitDirtyCount: number;                 // 未 commit 文件数
  sessionId: string;                    // 会话唯一标识
  startedAt: string;                    // ISO 8601 时间戳
  loadedRules: string[];                 // 已加载的 rules/ 文件路径列表
  compactCount: number;                  // 本次会话已发生的 compact 次数
  recentDecisions: DecisionRef[];        // 本次会话已确立的决策(id + confidence)
  pendingTodos: TodoRef[];               // 当前未完成项表
}

interface DecisionRef {
  id: string;
  confidence: "Verified" | "Likely" | "Hypothesis";
}

interface TodoRef {
  id: string;
  summary: string;
  status: "pending" | "in_progress" | "completed";
}

/**
 * Hook 事件——触发 Capability 调用的来源
 */
interface HookEvent {
  type: "SessionStart" | "PreToolUse" | "PostToolUse" | "PreCompact";
  timestamp: string;                     // ISO 8601
  toolName?: string;                     // PreToolUse/PostToolUse 时填充
  toolArgs?: unknown;                    // PreToolUse/PostToolUse 时填充
  additionalContext?: string;             // 当前已累积的注入上下文(只读)
}
```

**设计原则**:
- `SessionContext` 只读——Capability 不修改会话状态,只读后返回 intent
- `HookEvent` 描述触发源——Capability 据此判断要不要干预
- 字段渐进填充——`gitBranch` 可选(非 git 仓库时 undefined)

---

## 二、git-checker — git 状态检测

### 职责

检测工作目录 git 未 commit 文件堆积,触发 handoff 写入门控(constitution §4 触发器 b)。

### 调用方

| Hook | intent | 动作 |
|------|--------|------|
| PreToolUse | `block` | 文件堆积达阈值 → 取消工具调用,提示写 handoff |
| SessionStart | `inject` | 注入当前 git dirty count 到会话上下文 |

### 接口

```typescript
interface GitCheckerInput extends CapabilityInput {
  args: {
    threshold: number;                  // 触发 block 的阈值(来自 constitution 项目可调参数)
    excludePatterns?: string[];          // 排除路径(如 node_modules/ / dist/ / .gitignore 命中项)
  };
}

interface GitCheckerResult {
  intent: "pass" | "block" | "inject";
  data?: {
    dirtyCount: number;                 // 当前未 commit 文件数
    dirtyFiles?: string[];              // 文件路径列表(前 N 项,防超长)
    threshold: number;
    reason?: string;                    // block 时附阻断理由
  };
  metadata?: {
    gitBranch?: string;
    lastCommitHash?: string;
  };
}
```

### 算法

1. 执行 `git status --porcelain`(失败 → 返回 `pass`,不阻断——避免非 git 仓库误伤)
2. 按行计数,排除 `args.excludePatterns` 命中项
3. 若 count ≥ `threshold` → `intent=block`,附 `reason="未 commit 文件堆积 ≥ N,触发 handoff 写入门控。请先 commit 或写 HANDOFF.md"`
4. 若 count < threshold 且 `HookEvent.type=SessionStart` → `intent=inject`,附当前 dirtyCount 让模型感知
5. 若 count < threshold 且 `HookEvent.type=PreToolUse` → `intent=pass`

### 失败模式

- 非 git 仓库(`git status` 退出非 0)→ `pass`(不阻断)
- git 命令超时 → `pass` + `metadata.error`
- 文件路径含特殊字符 → 截断到前 20 项

---

## 三、snapshot-writer — 快照写入

### 职责

在 PreCompact 触发时,把会话关键状态(decisions / pendingTodos / files_changed / next_actions)写入 `.governance/runtime/snapshot.json`,供下次 SessionStart 读取注入。

### 调用方

| Hook | intent | 动作 |
|------|--------|------|
| PreCompact | `pass` | 写 snapshot.json 后 pass(不阻断 compact) |

### 接口

```typescript
interface SnapshotWriterInput extends CapabilityInput {
  args: {
    snapshotPath: string;               // 默认 `.governance/runtime/snapshot.json`
    extractors: SnapshotExtractor[];   // 提取器列表(见下)
  };
}

interface SnapshotExtractor {
  name: string;                         // 提取器名(如 "decisions" / "todos")
  extract: (ctx: SessionContext, event: HookEvent) => Promise<unknown>;
}

interface SnapshotWriterResult {
  intent: "pass";                       // 永不阻断 compact
  data?: {
    snapshotPath: string;
    bytesWritten: number;
    fieldsWritten: string[];
  };
  metadata?: {
    writeError?: string;                // 写入失败时填充
  };
}
```

### 算法

1. 遍历 `args.extractors`,逐个调用 `extract(ctx, event)`
2. 聚合结果到 `{ schema_version, session_id, compacted_at, ...extracted }`
3. 写入 `args.snapshotPath`(覆盖写)
4. 写入失败 → `intent=pass` + `metadata.writeError`(不阻断 compact)
5. 写入成功 → 返回 `data.bytesWritten` / `data.fieldsWritten`

### 失败模式

- 写入路径不存在 → 创建父目录后重试一次,仍失败则 `pass + metadata.writeError`
- 提取器抛异常 → 跳过该字段,记录到 `metadata.extractorErrors`,继续其他字段
- snapshot.json 损坏 → 覆盖写(不读旧值)

### 默认提取器清单

| 名 | 字段 | 提取逻辑 |
|----|------|---------|
| `decisions` | `decisions` | 从 `ctx.recentDecisions` 直接取 |
| `todos` | `active_todos` | 从 `ctx.pendingTodos` 取 status ≠ completed 项 |
| `files_changed` | `files_changed` | 从 `ctx` 或 hook 累积状态取(需 Hook 配合维护) |
| `next_actions` | `next_actions` | 从当前 HANDOFF.md "新会话首动作" 段解析 |

---

## 四、handoff-provider — handoff 读取与注入

### 职责

SessionStart 时读取 `HANDOFF.md` + `.governance/runtime/snapshot.json`,聚合后注入到会话上下文(additionalContext)。本 Capability 接管 plugin/project-rules.md §3.7 跨会话续作读取门控的职责(GV-6 落地后该门控迁入本 Capability)。

### 调用方

| Hook | intent | 动作 |
|------|--------|------|
| SessionStart | `inject` | 注入 HANDOFF.md + snapshot.json 聚合内容 |

### 接口

```typescript
interface HandoffProviderInput extends CapabilityInput {
  args: {
    handoffPath: string;                // 默认 `HANDOFF.md`(根目录)
    snapshotPath: string;               // 默认 `.governance/runtime/snapshot.json`
    constitutionPath: string;           // 默认 `.governance/core/constitution.md`
    rulesDir: string;                   // 默认 `.governance/rules/`
  };
}

interface HandoffProviderResult {
  intent: "inject";
  data: {
    additionalContext: string;          // 聚合后的注入文本(markdown 格式)
    sources: string[];                  // 引用的文件路径列表
  };
  metadata?: {
    handoffMissing?: boolean;            // HANDOFF.md 不存在时为 true
    snapshotMissing?: boolean;
    parseErrors?: string[];
  };
}
```

### 算法

1. 读 `args.handoffPath`——若不存在,注入 constitution + rules + 空白模板提示
2. 读 `args.snapshotPath`——若存在,解析 JSON 提取 `decisions` / `active_todos` / `next_actions`
3. 读 `args.constitutionPath`——必读,作为永久上下文
4. 读 `args.rulesDir` 下所有 `.md` 文件——按字典序聚合
5. 聚合格式:
   ```markdown
   # Session Context (auto-injected by handoff-provider)
   
   ## Core Constitution
   <constitution.md 内容>
   
   ## Active Rules
   <rules/*.md 聚合内容>
   
   ## Handoff
   <HANDOFF.md 内容>
   
   ## Snapshot
   <snapshot.json 关键字段渲染为 markdown 表>
   ```
6. 返回 `intent=inject` + `data.additionalContext`

### 失败模式

- HANDOFF.md 不存在 → `metadata.handoffMissing=true`,注入模板提示
- snapshot.json 解析失败 → 跳过 snapshot 段,记录 `metadata.parseErrors`
- 任何文件读取异常 → 跳过该文件,继续其他

---

## 五、rule-appender — 经验追加

### 职责

把人判断"值得沉淀"的经验机械追加到 `HANDOFF.md` 的"待沉淀经验"区。**只追加,不判断**——判断由人完成。

### 调用方

| Hook | intent | 动作 |
|------|--------|------|
| 手动触发 | `pass` | 追加后 pass(不干预会话) |
| PostToolUse(未来) | `pass` | 未来接入自动判断(阻塞后续集) |

### 接口

```typescript
interface RuleAppenderInput extends CapabilityInput {
  args: {
    handoffPath: string;                // 默认 `HANDOFF.md`
    experience: {
      id: string;                       // 稳定短 ID
      content: string;                  // 经验描述
      source: string;                   // 来源(如 commit hash / 文件路径 / 会话 ID)
    };
    overwrite?: boolean;                // 默认 false——若 id 已存在则报错不覆盖
  };
}

interface RuleAppenderResult {
  intent: "pass";                       // 永不阻断
  data?: {
    appended: boolean;
    targetPath: string;
    appendedId: string;
    duplicateId?: string;               // 若 id 已存在且 overwrite=false
  };
  metadata?: {
    parseError?: string;                // HANDOFF.md 解析失败
    writeError?: string;
  };
}
```

### 算法

1. 读 `args.handoffPath`,定位 `## 待沉淀经验` section(若不存在,在文件末尾追加该 section)
2. 解析现有表格,检查 `args.experience.id` 是否已存在:
   - 已存在且 `overwrite=false` → 返回 `data.appended=false` + `data.duplicateId`
   - 已存在且 `overwrite=true` → 替换该行
   - 不存在 → 追加新行
3. 新行格式:
   ```
   | <id> | <content> | <source> | <ISO 8601 日期> | 待 review |
   ```
4. 写回 `args.handoffPath`(覆盖写)
5. 返回 `intent=pass` + `data.appended=true`

### 失败模式

- HANDOFF.md 不存在 → 创建空模板后追加
- "待沉淀经验" section 不存在 → 自动追加 section 头部
- 文件被其他进程占用 → 重试 3 次后返回 `metadata.writeError`
- id 含特殊字符(| / 换行)→ 转义或拒绝

### 晋升流程承接

追加后,人工 review 流程见 [`../rules/lifecycle.md`](../rules/lifecycle.md):

1. review 待沉淀区条目
2. 决定晋升路径:
   - 装好即生效 → 移到 `.governance/rules/`
   - 需手动复制生效 → 移到 `.governance/examples/`
   - 不通用 → 删除
3. 晋升后从待沉淀区移除

---

## 六、Capability 复用矩阵

| Capability | SessionStart | PreToolUse | PostToolUse | PreCompact | 手动 |
|-----------|:---:|:---:|:---:|:---:|:---:|
| git-checker | ✓ inject | ✓ block | — | — | — |
| snapshot-writer | — | — | — | ✓ pass | — |
| handoff-provider | ✓ inject | — | — | — | — |
| rule-appender | — | — | (未来) | — | ✓ pass |

**说明**:
- `git-checker` 在 PreToolUse 阻断文件堆积,在 SessionStart 注入感知
- `handoff-provider` 只在 SessionStart 注入,不参与会话内(防止 mid-session 重读已写文件)
- `rule-appender` 当前手动触发,PostToolUse 自动判断留阻塞后续集

---

## 七、实现状态

| Capability | 设计 | 实现 | 阻塞 |
|-----------|:---:|:---:|------|
| git-checker | ✓ GV-6 完成 | ✓ `git-checker/index.ts` (tsc 通过) | VS Code 端阻塞(BL-1)|
| snapshot-writer | ✓ GV-6 完成 | ✓ `snapshot-writer/index.ts` (tsc 通过) | CLI 长对话实测阻塞(BL-2)|
| handoff-provider | ✓ GV-6 完成 | ✓ `handoff-provider/index.ts` (tsc 通过) | 无 |
| rule-appender | ✓ GV-6 完成 | ✓ `rule-appender/index.ts` (33 测试过) | 无 |

**Plugin 运行时**:`.governance/plugin/index.ts` (tsc 通过) — 配置驱动 + Capability 静态导入 + Hook 分发

**后续推进**:
1. CLI 端实测(plugin 加载 / hook 触发 / rule 注入)
2. VS Code 端(BL-1 解除后)
3. snapshot-writer 长对话实测(BL-2 解除后)

---

## 引用

- 接口契约:[`../core/constitution.md`](../core/constitution.md) + GV-7 §三
- 框架目录契约:[`../../docs/decisions/delivery-framework-design.md`](../../docs/decisions/delivery-framework-design.md)
- 待沉淀区晋升:[`../rules/lifecycle.md`](../rules/lifecycle.md)
- handoff 机制:[`../rules/handoff-entry.md`](../rules/handoff-entry.md)
