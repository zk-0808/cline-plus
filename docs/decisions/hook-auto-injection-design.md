# Hook 自动注入架构设计（#6 + #25 统一方案）

> **生命周期**：版本绑定 — context-snapshot v0.8.0，实现完成后归档
>
> **状态**：Proposed — 待 beforeRun hook 契约验证后进入实现

---

## §1 设计目标

将 mechanism-candidates #6（Continue Previous Project）和 #25（未 commit 阻断）统一为 context-snapshot 插件的 hook 自动注入体系，覆盖项目状态的全生命周期：

```
会话启动                     会话过程中                    会话结束
   │                            │                            │
   ▼                            ▼                            ▼
 beforeRun hook             beforeTool hook              snapshot 写入
 (#6 状态加载)              (#25 commit 守卫)            (已有，compaction 触发)
   │                            │
   ▼                            ▼
 检测 workspace              检测 git status
 加载 handoff + snapshot     未 commit ≥ 5 → 阻断
 注入 context                提示写 handoff + commit
```

**核心哲学**（来自 GPT 设计建议）：消费（consume）handoff，而非隐藏（hide）handoff。handoff 是 Human + AI 共享的项目资产——用户可查看、修改、Git 管理；插件只负责自动消费，不替代人工维护。

---

## §2 Hook 选型

| 能力 | Hook 名 | 类型 | 触发时机 | 已有实现 |
|------|---------|------|---------|---------|
| #6 状态加载 | `beforeRun` | plugin runtime hook | 会话/任务启动时 | ❌ 待实现 |
| #25 commit 守卫 | `beforeTool` | plugin runtime hook | 每次工具调用前 | ✅ 已有（toolRecorder） |
| snapshot 写入 | `beforeModel` | plugin runtime hook | 每次 model request 前 | ✅ 已有（compaction 检测） |

**为什么用 `beforeRun` 而不是 `registerRule`**：CLI 3.0.34 的 `registerRule` content 函数只在 session 启动时求值一次（rule-eval.log 已验证），无法动态加载文件内容。`beforeRun` 是 runtime hook，每次任务启动触发，可以读取当前文件状态。

**为什么用 `beforeRun` 而不是文件 hook `TaskStart`**：文件 hook 需要在 `.clinerules/hooks/` 放置可执行脚本，与 plugin 是两套独立系统。plugin runtime hook 统一管理在 context-snapshot 插件内，部署和版本控制更简单。

---

## §3 #6 beforeRun：项目状态加载

### 3.1 流程

```
beforeRun(context)
    │
    ├─ workspacePath = context.workspaceInfo?.rootPath
    │
    ├─ Provider 链（可扩展）:
    │   ├─ handoff.md → read docs/handoff.md
    │   ├─ snapshot → read latest from getSnapshotDir()
    │   └─ (future: ADR / TODO / decisions)
    │
    ├─ 生成 state summary
    │   ├─ "✓ 检测到 handoff.md（最近更新: YYYY-MM-DD HH:MM）"
    │   ├─ "✓ 发现 N 个未完成事项"
    │   └─ handoff 内容摘要
    │
    └─ 注入方式（待验证）:
        ├─ 方式 A: return { contextModification: summary }
        ├─ 方式 B: 写入 module state → messageBuilder 注入
        └─ 方式 C: return { messages: [systemMsg + summary] }
```

### 3.2 注入方式验证清单

| 方式 | 需要验证 | 风险 |
|------|---------|------|
| A: contextModification | beforeRun 返回值是否支持此字段 | 高 — 仅 TaskStart 文件 hook 文档明确支持 |
| B: module state → messageBuilder | 已有模式（loop-guard-injector），可行 | 低 — 但 messageBuilder 在 beforeRun 之后执行 |
| C: messages 注入 | beforeRun 返回 messages 是否生效 | 中 — beforeModel 支持此模式，beforeRun 未验证 |

**优先验证方式 A**，若不可用退回方式 B（已验证模式）。

### 3.3 Provider 架构

```typescript
interface StateProvider {
    name: string;
    detect(workspacePath: string): boolean;  // 检测是否存在
    load(workspacePath: string): string;     // 加载内容
    summarize(content: string): string;      // 生成摘要（给用户的通知）
}

const providers: StateProvider[] = [
    handoffProvider,    // docs/handoff.md
    snapshotProvider,   // ~/.cline/data/snapshot/latest.md
    // future: adrProvider, todoProvider, decisionsProvider
];
```

handoff.md 是第一个 provider，后续可加 ADR / TODO / decisions / memory。每个 provider 独立检测、加载、摘要，互不依赖。

---

## §4 #25 beforeTool：commit 守卫

### 4.1 流程

```
beforeTool(context)
    │
    ├─ toolRecorder.beforeTool(...)  // 已有逻辑
    │
    ├─ gitStatusCount = execSync("git status --porcelain") 行数
    │
    └─ if gitStatusCount >= 5:
        ├─ 阻断本次工具调用
        ├─ 返回 { skip: true, message: "未 commit 文件 ≥ 5，请先写 handoff + commit" }
        └─ (可选) 自动写 handoff 骨架
```

### 4.2 执行约束

- **不能每次都跑 git status**：性能开销。改为每 N 次工具调用检查一次（如 N=3），或仅在文件写入类工具后检查。
- **git 不在 PATH 时降级**：跳过检查，不阻断。
- **workspace 不是 git repo 时跳过**：检测 `.git` 目录存在性。

### 4.3 beforeTool 返回值验证

当前 `beforeTool` 返回 `AgentBeforeToolResult`，需验证是否支持 `skip` / `cancel` 字段。从 investigation note §2.3：

> beforeTool: 可 `skip`/`stop` tool、修改 `input`

支持 skip，但需验证具体字段名。

---

## §5 与现有插件的集成

两个 hook 加入现有 context-snapshot 插件的 `hooks` 对象：

```typescript
hooks: {
    beforeRun(context: any) {       // ← 新增 #6
        // 项目状态加载
    },
    beforeTool(context: any) {      // ← 扩展已有
        toolRecorder.beforeTool(...);
        // commit 守卫逻辑
    },
    afterTool(context: any) {       // 已有
        ...
    },
    beforeModel(context: any) {     // 已有
        ...
    },
}
```

**共享状态**：
- `pluginWorkspacePath` — 已在 setup() 中从 `ctx.workspaceInfo.rootPath` 获取
- `getSnapshotDir()` — 已有

---

## §6 实现路线

| 阶段 | 内容 | 依赖 |
|------|------|------|
| **Phase 0: 契约验证** | 验证 beforeRun hook 参数 + 返回值（contextModification? messages?）；验证 beforeTool skip 字段 | CLI 3.0.34 源码 |
| **Phase 1: handoff provider** | 实现 handoffProvider（检测 + 加载 + 摘要）+ beforeRun 注入 | Phase 0 |
| **Phase 2: commit 守卫** | 实现 beforeTool git status 检查 + 阻断 | Phase 0 |
| **Phase 3: 实测验证** | CLI 短对话测试：新会话自动加载 handoff + commit 守卫触发 | Phase 1 + 2 |
| **Phase 4: Provider 扩展** | 加 snapshotProvider（最新快照）| Phase 1 |

---

## §7 不做的事

- **不做隐藏式 Memory**：不维护 AI 私有的记忆文件。handoff 对用户可见、可编辑、可 Git 管理。
- **不做 TaskComplete → Retain**：不在会话结束时自动保存状态。handoff 由人 + AI 协作维护（handoff.md 触发器 a/b/c），snapshot 由 compaction 触发自动写入。
- **不做跨 Agent 同步**：不在 Cline / TRAE / 其他 Agent 之间自动同步状态。handoff.md 是文件系统上的普通文件，任何 Agent 都可以读取。
- **不做 `cline handoff` CLI 子命令**：用户直接看 handoff.md 文件即可（VS Code / cat / less）。CLI 子命令增加维护成本但不增加信息量。

---

## §8 与 Hindsight for Cline 的区别

| 维度 | Hindsight | 本方案 |
|------|-----------|--------|
| 状态存储 | 隐藏式（AI 管理） | 显式文件（handoff.md，Human + AI 共享） |
| 用户感知 | 无感（全自动） | 有感（通知加载了什么，用户可干预） |
| 可编辑性 | 不可（AI 内部格式） | 可（Markdown，可 Git 管理） |
| 跨 Agent | 不跨（Hindsight 专属） | 跨（任何 Agent 可读 handoff.md） |
| 触发机制 | TaskStart + TaskComplete | beforeRun + beforeModel（compaction） |
