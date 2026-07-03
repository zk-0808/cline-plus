# Investigation Note: Native Condense 文档面探查 (Task A)

> 调查日期: 2026-07-03
> 结论摘要: cline CLI **没有** `--compaction` 公开选项。compaction 策略是 VS Code SDK 设置（`basic` | `agentic`），非 CLI flag。原生 condense 产物是纯文本摘要消息，不包含任何结构化语义字段。

---

## 1. cline compaction 三模式语义

### 1.1 事实澄清：不存在 `--compaction` CLI 选项

**证据来源**: https://docs.cline.bot/cli/cli-reference (2026-07-02 更新)

cline CLI 的完整 `--help` 输出中**没有** `--compaction` 选项。CLI 全局选项包括：

```
-V, --version
-p, --plan
--json
--auto-approve <boolean>
-t, --timeout <seconds>
-m, --model <model-id>
-v, --verbose
-c, --cwd <path>
--config <path>
--data-dir <path>
--thinking <level>          # none|low|medium|high|xhigh
--retries <count>
--hooks-dir <path>
--acp
-i, --tui
--id <session-id>
-k, --key <api-key>
-P, --provider <id>
-s, --system <system-prompt>
-z, --zen
```

**没有** `--compaction` 或任何类似选项。

### 1.2 实际的 compaction 策略设置

compaction 策略是 **VS Code SDK 级别的持久化设置**，不是 CLI flag。

**证据来源**: `sdk/packages/core/src/services/global-settings.ts` (PR #11892, 2026-07-03 merged)

```typescript
const GlobalCompactionStrategySchema = z.enum(["basic", "agentic"]).catch("basic");
```

- **两个值**: `"basic"` (默认) | `"agentic"`
- **没有 `"off"` 值** — 要关闭 auto compact，需关闭整个功能开关，而非设置策略为 off
- 设置通过 `readCompactionStrategyGlobally()` / `setCompactionStrategyGlobally()` 读写
- 存储在 `~/.cline/data/settings/global-settings.json` 的 `compactionStrategy` 字段

**证据来源**: PR #11892 Summary:
> "add a persisted VS Code SDK compaction strategy setting"
> "keep Auto Compact as the existing on/off switch, defaulting strategy to basic"
> "pass basic/agentic into SDK session compaction config when auto compact is enabled"

### 1.3 两种模式的语义区别

从 PR #11892 和文档分析：

| 模式 | 说明 |
|------|------|
| `basic` | 默认模式。基于规则的上下文截断（rule-based context truncation）。当非 Anthropic 模型时，cline 回退到此模式。 |
| `agentic` | 增强模式。使用 LLM 生成结构化摘要。仅在 Anthropic 模型 + prompt cache 可用时生效。 |

**证据来源**: https://docs.cline.bot/features/auto-compact
> "With other models, Cline falls back to standard rule-based context truncation, even if Auto Compact is enabled."

### 1.4 触发方式

cline 有两种 compaction 触发方式：

1. **手动**: `/smol`（别名 `/compact`）— 用户主动触发
2. **自动**: Auto-Compact — 接近上下文上限时自动触发

**证据来源**: https://docs.cline.bot/core-workflows/using-commands
> `/smol` (or its alias `/compact`) compresses your conversation history while preserving essential context.

---

## 2. 原生 condense 产物数据结构

### 2.1 产物格式：纯文本摘要消息

cline 的 compaction 产物是**一条纯文本 assistant 消息**，替换原有的对话历史。它不是一个结构化数据对象。

**证据来源**: https://docs.cline.bot/features/auto-compact
> 1. Creates a comprehensive summary of everything that's happened
> 2. Preserves all technical details, code changes, and decisions
> 3. Replaces the conversation history with the summary
> 4. Continues exactly where it left off

### 2.2 摘要内容结构（basic 模式）

根据文档和第三方分析（腾讯技术工程 2026-06-08），basic 模式的摘要包含：

| 摘要段落 | 内容 |
|----------|------|
| 主要请求和意图 | 用户的所有明确请求 |
| 关键技术概念 | 重要的技术概念、技术和框架 |
| 文件和代码段 | 检查、修改或创建的特定文件和代码段 |
| 问题解决记录 | 已解决的问题和修复方案 |
| 待处理任务 | 未完成的工作项 |
| 当前工作状态 | 进度和状态 |
| 下一步建议 | 后续行动 |

**证据来源**: https://blog.gitcode.com/89f663c818accbeed20cbd8a3df7dbc3.html (Cline 实战指南)
> Auto Compact 生成的摘要包含以下关键部分：主要请求和意图、关键技术概念、文件和代码部分、问题解决、待处理任务、当前工作状态、下一步建议

### 2.3 Focus Chain 穿越 compaction

如果启用了 Focus Chain（v3.25 默认开启），**待办列表会穿越压缩存活下来**，作为进度锚点。

**证据来源**: 腾讯技术工程文章 (2026-06-08)
> "如果开启了 Focus Chain（v3.25 默认开启），待办列表会穿越压缩存活下来，作为进度锚点。"

### 2.4 产物数据结构（代码层面）

从 PR #11892 和 SDK 类型定义分析，compaction 产物在代码层面：

- **输入**: 当前对话的 `Message[]` 数组
- **输出**: 替换后的 `Message[]` 数组（摘要作为一条或多条 assistant 消息）
- **没有** `CompactionResult` / `CondenseResult` 等专用类型 — 产物直接替换消息历史
- **没有** 结构化元数据字段（如 id, kind, exit_when 等）

**证据来源**: `sdk/packages/core/src/index.ts` 导出类型中没有 `CompactionResult` 或类似类型

---

## 3. 与 handoff schema V2 §1.5 六字段对照

### 3.1 对照表

| handoff 字段 | 原生 condense 中有对应？ | 说明 |
|-------------|----------------------|------|
| **id** | ❌ 无 | 摘要消息没有唯一标识符，无法追踪或引用 |
| **kind** | ❌ 无 | 没有类型分类（如 task_handoff / context_snapshot 等） |
| **exit_when** | ❌ 无 | 没有退出条件定义 — 摘要只是"继续做"，没有明确的完成标准 |
| **confidence** | ❌ 无 | 没有置信度评估 — 不知道哪些信息是确定的、哪些是推测的 |
| **depends_on** | ❌ 无 | 没有依赖关系 — 不知道当前任务依赖哪些前置任务或资源 |
| **blocker_ref** | ❌ 无 | 没有阻塞引用 — 不知道什么在阻止任务推进 |

### 3.2 部分对应分析

虽然六字段全部缺失，但某些信息可能**隐式存在**于摘要文本中：

| 手动提取可能 | 摘要中的位置 |
|-------------|------------|
| id | 无 — 消息由 session + timestamp 隐式标识 |
| kind | 可从"待处理任务"段落推断，但非结构化 |
| exit_when | 可从"下一步建议"推断，但模糊且非机器可读 |
| confidence | 完全缺失 — 摘要不区分事实与推测 |
| depends_on | 完全缺失 — 摘要不记录资源依赖 |
| blocker_ref | 可从"问题解决记录"中部分推断已解决的 blocker，但活跃 blocker 无结构化引用 |

---

## 4. 结论

### 4.1 原生 condense 丢失了什么 handoff 需要的语义？

**核心结论：cline 原生 condense 是面向人类阅读的纯文本摘要，不是面向机器交接的结构化数据。**

丢失的关键语义：

1. **身份标识 (id)** — 无法精确引用一次 compaction 产物，无法建立 compaction 链
2. **类型分类 (kind)** — 无法区分"任务交接"、"上下文快照"、"错误恢复"等不同场景
3. **退出条件 (exit_when)** — 摘要告诉你"做了什么"和"下一步做什么"，但不定义"什么时候算完成"
4. **置信度 (confidence)** — 摘要不区分"我确认改了文件 X"和"我推测问题可能是 Y"
5. **依赖关系 (depends_on)** — 不记录"这个任务需要 API key 配好"或"需要 service Z 启动"
6. **阻塞引用 (blocker_ref)** — 不结构化记录"当前被 blocker B 阻塞"

### 4.2 额外发现

- **CLI 没有 `--compaction` 选项** — 任务前提中的"公开接口"描述不准确。compaction 策略是 VS Code SDK 设置。
- **只有两个策略值** — `basic` | `agentic`，没有 `off`。关闭需关闭 Auto Compact 功能开关。
- **Focus Chain 是唯一的结构化穿越机制** — 待办列表可以穿越 compaction，但这是任务进度追踪，不是 handoff 语义。
- **`/newtask` 比 `/smol` 更接近 handoff** — `/newtask` 明确打包"overall plan, work accomplished, relevant files, next steps"到新任务，但仍然是纯文本。

### 4.3 对 handoff 设计的启示

如果要基于 cline 的 compaction 机制构建 handoff，需要：
1. 在 compaction 触发时拦截，提取结构化字段
2. 在摘要 prompt 中要求 LLM 输出结构化 JSON（而非纯文本）
3. 将结构化数据与摘要消息一起持久化
4. 在恢复时解析结构化数据，注入到新 session 的上下文中

---

## 附录：证据来源索引

| # | 来源 | URL / 路径 | 关键信息 |
|---|------|-----------|---------|
| 1 | CLI Reference (官方文档) | https://docs.cline.bot/cli/cli-reference | 无 `--compaction` 选项 |
| 2 | Auto Compact 文档 | https://docs.cline.bot/features/auto-compact | 摘要机制、成本说明 |
| 3 | Using Commands 文档 | https://docs.cline.bot/core-workflows/using-commands | `/smol` `/compact` `/newtask` |
| 4 | global-settings.ts 源码 | `sdk/packages/core/src/services/global-settings.ts` | `GlobalCompactionStrategySchema` 定义 |
| 5 | PR #11892 | https://github.com/cline/cline/pull/11892 | VS Code SDK compaction strategy 设置 |
| 6 | 腾讯技术工程文章 | https://news.qq.com/rain/a/20260608A07HSX00 | 六大 Agent 压缩策略对比 |
| 7 | Cline 实战指南 | https://blog.gitcode.com/89f663c818accbeed20cbd8a3df7dbc3.html | Focus Chain + Auto Compact 详解 |
| 8 | cline/sdk index.ts | `sdk/packages/core/src/index.ts` | 导出类型中无 CompactionResult |
