# 机制落地评估 — Mechanism Candidates 可行性分析

> **日期**：2026-06-28
> **关联**：[mechanism-candidates.md](../mechanism-candidates.md)、[ADR-005](../decisions/ADR-005-split-compact-from-handoff.md)
> **方法**：Cline 源码分析（7 份本地文档）+ 主流 Agent 调研（Claude Code / Cursor / Windsurf / Copilot / Devin / OpenClaw / AgentMemory-Pro）

---

## 1. Cline Plugin API 能力汇总

| 能力 | 可用性 | 关键限制 | 影响的候选 |
|------|--------|---------|-----------|
| **rules** | ✅ `api.registerRule(rule)` | rule 内容支持动态函数解析；但 setup() 只调用一次，运行时不可修改已注册的 rule | #6 注入机制 |
| **hooks** | ✅ 7 种：beforeRun / afterRun / beforeModel / afterModel / beforeTool / afterTool / onEvent | `session_start` **不在** plugin hooks 中；File Hooks 支持 TaskStart 事件 | #1 watchdog、#4 loop-guard |
| **afterTool** | ✅ 已确认存在 | 参数含 success/failure 状态；可用于计时和日志；**不能**直接检测超时（工具已返回） | #1 watchdog |
| **messageBuilder** | ✅ `build(messages) → messages` | 同步、每轮调用、**无 session metadata**（无 session_id） | #5 handoff |
| **SQLite** | ❓ 未找到文档 | `~/.cline/sessions/`（SQLite）schema 未公开，plugin 无法稳定访问 | 索引层 |
| **File Hooks** | ⚠️ 官方确认 6 种（PreToolUse / PostToolUse / UserPromptSubmit / TaskStart / TaskResume / TaskCancel） | 文件名精确匹配 hook 类型、**不带扩展名**；路径为 `.clinerules/hooks/`（项目级）或 `~/Documents/Cline/Rules/Hooks/`（全局）；Windows `.ps1` 支持查无实据 | #6 session start、#7 Windows |
| **session_id** | ❌ plugin API 不暴露 | 无替代方案；可用 `randomUUID()` 自生成（当前做法） | #5 索引 |

### 关键发现

1. **`session_start` 不在 plugin hooks 中**——但 File Hooks 的 `TaskStart` 事件可以替代（文件名 `TaskStart`，无扩展名，放 `.clinerules/hooks/`）
2. **rules 支持动态函数**——`content` 字段可以是函数，每次注入时动态解析，这是 #6 注入的可行路径
3. **afterTool 有时间戳**——可用于 #1 watchdog 的"工具调用耗时统计"，但不能中断正在运行的工具
4. **SQLite 不可用**——schema 未公开，plugin 不应依赖；handoff 检索退化为文件遍历，需定义 "latest" 语义

---

## 2. 主流 Agent 方案调研

### Q1: Terminal Watchdog（#1 终端命令假死）

| 系统 | 方案 | 关键机制 |
|------|------|---------|
| **Claude Code** | 双层超时 | Stream Watchdog（默认 5min 无输出 → 杀进程）+ Bash 硬超时（`BASH_DEFAULT_TIMEOUT_MS` 默认 120s，`BASH_MAX_TIMEOUT_MS` 默认 600s；⚠️ 社区报告这些变量在某些版本不生效，存在 ~73s/48s 硬上限） |
| **Cursor** | Hooks 子进程模型 | `beforeShellExecution` hook（v1.7 引入）返回 `permission: allow/deny` 拦截/改写/审计命令；非「容器隔离+strace」（那是 background agents 沙箱，与 hooks 不同） |
| **Devin** | subprocess timeout | `subprocess.run(timeout=...)` + `TimeoutExpired` 捕获 |

**共同模式**：硬超时不可绕过，可配置但有上限，进程生命周期三段式管理（启动 → 监控 → 清理）。

**对 #1 的结论**：Cline 原生已有终端执行框架（VS Code terminal API），超时应在 Cline 层实现。Plugin 层可通过 `afterTool` 做**耗时统计和告警**，但不能中断正在运行的工具。建议 #1 从"terminal-watchdog plugin"降级为"afterTool 耗时监控"——记录超长工具调用供分析，不试图替代 Cline 的进程管理。

### Q2: Loop Guard（#4 重复循环）

| 系统 | 方案 | 关键机制 |
|------|------|---------|
| **OpenClaw** | 四维检测器 | 通用重复 / 轮询无进展 / 全局熔断 / 乒乓检测，按 Agent 差异化配置 |
| **Claude Code** | Hooks + 模型能力 | 自定义 hooks 检测 + 依赖模型自身识别循环 |
| **学术方案** | 三层分类 | 句法重复（N-gram）/ 语义振荡（状态 Hash）/ 顽固性错误（错误指纹归一化） |

**共同模式**：多维度检测 + 分级处置（Prompt 注入 → 升温 → 回退 → 人工介入）。

**对 #4 的结论**：Cline 原生依赖模型自身能力识别循环，没有专门的 loop-guard 机制。Plugin 层可通过 `beforeTool` + `afterTool` 记录工具调用序列，检测重复模式。但**处置手段有限**——plugin 只能注入提示词（通过 `beforeModel` hook 修改 messages），不能直接中断 agent 循环。建议 #4 实现为"检测 + 提示词注入"：检测到重复时在下一轮 messages 中注入警告提示词。

### Q3: Shell Wrapper（#2-3 编码/Profile/交互式）

| 系统 | 方案 | 关键机制 |
|------|------|---------|
| **Claude Code** | AST 级命令解析 | `BARE_SHELL_PREFIXES` 黑名单、危险 builtin 覆盖、引号拼接检测 |
| **Cursor** | Hooks 子进程模型 | `beforeShellExecution` hook 返回 `permission` 决策拦截命令；非「容器+strace」 |

**共同模式**：沙箱隔离是基础，非交互式 shell 默认，Hook 拦截点。

**对 #2-3 的结论**：Shell 包装应在命令执行层实现（Cline 的 terminal manager），plugin 层很难介入。但可以通过 `beforeTool` hook 拦截 `execute_command` 类工具调用，注入安全参数（如 PowerShell `-NoProfile -NonInteractive -Command`）。建议 #2-3 从"shell-wrapper plugin"改为"beforeTool 命令改写"——在工具调用前修改命令参数。

### Q4: Cross-session Memory Injection（#6 跨会话记忆注入）

| 系统 | 方案 | 关键机制 |
|------|------|---------|
| **Claude Code** | 四层架构 | CLAUDE.md（项目级）→ .claude/rules/（路径级）→ Auto Memory（自动提取）→ Subagent Memory（隔离） |
| **Cursor** | .cursorrules | 文件即配置，项目根目录放规则文件 |
| **Windsurf** | .windsurfrules | 同上 |
| **AgentMemory-Pro** | 统一注入映射 | 一套记忆适配多 Agent（CLAUDE.md / .cursorrules / copilot-instructions.md） |

**共同模式**：分层注入（全局 → 项目 → 个人 → 自动），按需加载减少上下文浪费。所有系统都采用"文件即配置"范式。

**对 #6 的结论**：Cline 的 `rules` capability 支持动态函数解析——`content` 可以是函数，每次注入时读取最新 handoff.md 内容。这是 #6 的可行路径。实现方式：

```typescript
api.registerRule({
    name: "handoff-context",
    content: () => {
        // 动态读取最新 handoff.md
        const handoffPath = findLatestHandoff();
        return handoffPath ? readFileSync(handoffPath, "utf-8") : "";
    }
});
```

**但有一个限制**：setup() 只调用一次，所以 rule 注册是一次性的。动态指的是 content 函数每次被调用时重新执行，不是 rule 本身可以增删。

**"latest"语义定义**（评审补充）：

handoff 文件命名格式：`{project_hash}-{timestamp}-{uuid}.md`
- `project_hash`：工作区路径的短 hash（4 字符），防止跨项目串味
- `timestamp`：ISO 8601 精确到秒
- `uuid`：防并发冲突

`findLatestHandoff()` 按 project + 最近 timestamp 选取，解决多 task 并发写 handoff 时的归属问题。

---

## 3. 机制落地评估汇总

| 候选 # | 名称 | Cline 可用性 | 主流方案 | 能否落地 | 建议 |
|--------|------|-------------|---------|---------|------|
| **#1** | Terminal Watchdog | afterTool 可计时，不能中断 | Claude Code 双层超时 | ⚠️ 降级 | 从"watchdog plugin"降为"afterTool 耗时监控"——记录超长调用供分析，不替代 Cline 进程管理 |
| **#2** | PowerShell NoProfile | beforeTool 可改写命令 | Cursor 容器隔离 | ✅ 可落地 | beforeTool hook 拦截 execute_command，注入 `-NoProfile -NonInteractive` |
| **#3** | UTF-8 编码注入 | beforeTool 可改写命令 | Claude Code AST 解析 | ✅ 可落地 | beforeTool hook 注入 `chcp 65001`（Windows）或 `export LANG=en_US.UTF-8` |
| **#4** | Loop Guard | beforeTool+afterTool 可记录序列 | OpenClaw 四维检测 | ⚠️ 部分 | 检测 + 提示词注入（beforeModel）；**顽固性错误兜底**：N 次注入无效后交由 Cline max iterations 兜底，plugin 不越界 |
| **#5** | Handoff（拆分后） | messageBuilder 可观察 compact | — | ✅ 已验证 | 按 ADR-005 重构：compact-observer + 独立触发器 |
| **#6** | 记忆注入 | rules 动态函数 + File Hooks TaskStart | Claude Code 四层架构 | ✅ 可落地 | rules.content 函数动态读 handoff.md；File Hooks TaskStart 做额外初始化 |
| **#7** | Windows Hook | File Hooks 支持 TaskStart（无扩展名） | — | ❓ 待验证 | 官方 hook 文件无扩展名、放 `.clinerules/hooks/TaskStart`；`.ps1` / `.cline/Hooks/` 写法与官方不符，Windows 支持查无实据 |
| **#14** | 自研 compact 已失败 | — | — | ✅ 已转向 | 接入 Cline messageBuilder，ADR-005 确认不再自研 |
| **#20** | 反证检索 | — | — | ❌ 不可代码化 | 检索策略问题，需换后端（Tavily/Exa），暂缓 |
| **#21** | 多样性排序 | — | — | ❌ 不可代码化 | 排序后处理代码，需独立实现，暂缓 |
| **#22** | Browser Fetch | — | — | ❌ 不可代码化 | 需 Playwright 等外部依赖，暂缓 |

---

## 4. 推荐实施顺序

### Phase 1：Handoff 重构（ADR-005 落地）

```
compact-observer（只观察 compact 事件，日志记录）
    +
独立 handoff 触发器（用户指令 / 决策信号 / File Hooks TaskStart）
    +
rules 动态注入（handoff.md 内容注入新会话）
```

**涉及候选**：#5（重构） + #6（注入） + #7（File Hooks 验证）

### Phase 2：tool-call-recorder + beforeTool 安全包装

```
tool-call-recorder（统一采集层，afterTool 单一数据源）
  → 产出 (tool_name, args, duration, success, timestamp) 序列
  → #1 消费：duration 超阈值 → 告警
  → #4 消费：序列 → N-gram/状态 Hash 检测重复

beforeTool hook：
  - 拦截 execute_command 类工具
  - #2：注入 PowerShell -NoProfile -NonInteractive
  - #3：注入 UTF-8 编码设置
```

**评审补充**：#1/#4 共用 afterTool 数据源，合并为单一 `tool-call-recorder`，避免重复采集。#4 的序列分析天然能用上 #1 的 duration 维度（「重复且每次都耗时长」是更强的循环信号）。

**涉及候选**：#1（降级为监控） + #2 + #3 + #4（部分）

### Phase 3：Loop Guard 检测 + 提示词注入 + 兜底

```
beforeModel hook：
  - 读取 tool-call-recorder 的工具调用历史
  - 检测重复模式（N-gram / 状态 Hash / 错误指纹）
  - 注入警告提示词到 messages

兜底层（评审补充）：
  - 三类 case 覆盖不均：
    - 句法重复（N-gram）：提示词注入可能有效
    - 语义振荡（A→B→A→B）：提示词注入效果存疑
    - 顽固性错误（同一错误指纹反复）：提示词注入基本无效
  - 兜底策略：同一提示词注入 N 次后仍重复 → 明确声明「此场景 plugin 无法处置，依赖 Cline 原生 max iterations 兜底」
  - plugin 不越界替代 Cline 的进程管理
```

**涉及候选**：#4（完整实现）

---

## 5. 关键结论

### 可以直接复用 Cline 原生能力的候选

- **#5** → messageBuilder（已验证）
- **#6** → rules 动态函数 + File Hooks TaskStart（路径和格式需按官方修正）
- **#14** → 已转向 Cline 原生 compact

### 需要 Plugin 层实现的候选

- **#1** → afterTool 监控（降级，不替代 Cline 进程管理）
- **#2-3** → beforeTool 命令改写
- **#4** → tool-call-recorder 记录 + beforeModel 提示词注入 + max iterations 兜底

### 待验证的候选

- **#7** → File Hooks Windows 支持待实测（官方文档无 `.ps1` 证据）

### 不可代码化 / 暂缓的候选

- **#20** → 需换检索后端，暂缓
- **#21** → 需独立排序代码，暂缓
- **#22** → 需外部依赖，暂缓

### 主流 Agent 的共同启示

1. **"文件即配置"是行业共识**——所有系统都用文件（CLAUDE.md / .cursorrules / .windsurfrules）作为记忆注入的载体，handoff.md 走这条路是对的
2. **Hook 是扩展的基础机制**——超时、循环检测、安全包装都通过 Hook 实现，Cline 的 7 种 plugin hooks + 6 种 file hooks 已经覆盖了大部分场景
3. **分层架构是标配**——轻量操作（统计/日志）在 Hook 层做，重量操作（摘要/注入）在独立机制做，不在同一层做两件事
4. **处置手段要分层**——检测（plugin 可做）和处置（Cline 原生负责）要分开，plugin 不能越界替代 Cline 的进程管理

---

## 产源说明

- Cline 源码分析：7 份本地文档（architecture-atlas / dev-guide / quick-reference / handoff-architecture / capability-probe / plugin 源码）
- 主流 Agent 调研：Claude Code（官方文档 + 源码分析）、Cursor（Hooks 文档）、Devin、OpenClaw（四维检测器）、AgentMemory-Pro
- 学术参考：N-gram 重复检测、状态 Hash 振荡检测、错误指纹归一化

## 修订记录

| 日期 | 修订内容 | 来源 |
|------|---------|------|

| 2026-06-28 | 3 处事实修正（变量名/Cursor 机制/File Hooks 事件名与路径）+ 3 处设计补丁（Loop Guard 兜底/handoff 命名语义/统一 tool-call-recorder）| 外部评审 |
