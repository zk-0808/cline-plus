# Hook 自动注入架构设计（#6 + #25 统一方案）

> **生命周期**：版本绑定 — context-snapshot v0.8.0，实现完成后归档
>
> **状态**：Phase 0 已完成 — beforeRun/beforeTool 契约验证通过（2026-07-04），待进入 Phase 1 实现

---

## §0 设计原则：Hook 化分层判据

> **源由**：2026-07-04 用户感受"多 hook 注入比提示词治理省事，但实现麻烦，少了灵活"。这个感受不该只停在感受，需固化为分层判据，防止未来把不该 hook 的东西硬塞进去（那才是真正"少了灵活"的坑）。
>
> **与 Phase 0 的关系**：本节是**哲学层判据**，不依赖 beforeRun/beforeTool 契约能力——无论契约返回什么字段，三分分类原则都成立。具体的"哪些规则适合 hook 化"映射表待 Phase 0 拿到契约实据后再写，避免哲学层被契约现实反向塑造。

治理条款按**可判定性**分三层，每层对应不同机制化方式：

| 层 | 判定特征 | 机制化方式 | 例子 |
|----|---------|-----------|------|
| **机械可判定** | 规则触发条件可用代码直接判定，无需上下文 | **Hook 直接阻断/执行** | 未 commit 文件 ≥5（#25）；secret 泄露拦截；git push 拦截 |
| **需上下文判断** | 规则触发需读文件状态/对话历史/调用链，但判定本身有明确判据 | **Hook 检测 + 提示人决策** | 证据冲突停机（§1.8）；方向偏离检测（§1.9）；核心命题翻转（§1.10）|
| **纯方法论** | 规则是思考方式/工作流约束，无机械触发条件 | **提示词治理** | ADR 编号连续（§5.1）；文档生命周期标注（§6.1）；评审角色注入（§1.12）|

**判据应用原则**：
1. **能机械判定的必须 hook 化**——提示词治理这类规则是性能浪费 + 不可靠（模型可能忘记检查）
2. **需上下文判断的走"检测+提示"**——hook 负责发现信号，阻断/纠正交给人决策，保留灵活
3. **纯方法论永远不 hook 化**——hook 无法判定"ADR 编号是否连续"这种需要语义理解的事

**反向约束**（防止过度 hook 化）：
- 不得把"纯方法论"层规则硬塞进 hook（如"评审角色必须注入"——hook 无法判定何时该注入）
- 不得把"需上下文判断"层规则做成"hook 直接阻断"（如"证据冲突"——hook 只能检测信号，是否停机由人判断）
- hook 化前必须回答：这条规则的触发条件能用代码判定吗？答不能 → 不 hook

**与 §7 不做的事的关系**：§7 列的是"不做"的事项（隐藏式 Memory / TaskComplete → Retain / 跨 Agent 同步 / CLI 子命令），本节列的是"如何判断该不该 hook 化"的判据。两者互补——§7 防止功能蔓延，§0 防止机制化越界。

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
    ├─ workspacePath = pluginWorkspacePath  // setup() 时闭包捕获，非来自 context
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
    └─ 注入方式（Phase 0 验证后定）:
        └─ 方式 B（唯一可行）: 写入 module state → messageBuilder 读取并注入
```

**契约约束**（Phase 0 验证）：
- `AgentRunLifecycleContext` 只有 `snapshot`，**无 workspacePath** → workspacePath 必须在 setup() 时从 `PluginSetupContext.workspaceInfo.rootPath` 闭包捕获
- `beforeRun` 返回类型是 `AgentStopControl`（仅 `stop`/`reason`），**不能注入 messages 或 contextModification** → 必须通过 module state 传给 messageBuilder

### 3.2 注入方式验证结果（Phase 0）

| 方式 | 验证结果 | 证据 |
|------|---------|------|
| A: contextModification | ❌ **不支持** | `agent.d.ts` L239 beforeRun 返回 `AgentStopControl \| undefined`，无 contextModification 字段 |
| B: module state → messageBuilder | ✅ **唯一可行** | 已有模式（loop-guard-injector / snapshot-source-saver）；messageBuilder 在 beforeRun 之后执行 |
| C: messages 注入 | ❌ **不支持** | beforeRun 返回类型无 messages 字段；只有 `beforeModel` 支持 messages（L192-198 `AgentBeforeModelResult.messages?`）|

**结论**：方式 B 是唯一可行路径。beforeRun 负责"检测+加载+写入 module state"，messageBuilder 负责"读取 module state+注入 context"。与 thin-adapter 的 messageBuilder+beforeModel 协作模式架构一致。

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

### 4.3 beforeTool 返回值验证结果（Phase 0）

`AgentBeforeToolResult`（`agent.d.ts` L210-216）字段全部确认：

| 字段 | 类型 | 用途 |
|------|------|------|
| `skip` | `boolean?` | ✅ 跳过本次工具调用（继续 run）—— commit 守卫用此字段 |
| `stop` | `boolean?` | 停止整个 run |
| `reason` | `string?` | 阻断/停止原因 |
| `input` | `unknown?` | 修改工具输入 |
| `policy` | `ToolPolicy?` | 设置工具策略 |

**结论**：commit 守卫用 `return { skip: true, reason: "未 commit 文件 ≥ 5，请先写 handoff + commit" }` 即可阻断工具调用，不影响后续 run。

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
| **Phase 0: 契约验证** ✅ | beforeRun 返回 `AgentStopControl`（无 contextModification/messages）；beforeTool `skip` 字段确认；workspacePath 须 setup 闭包捕获 | CLI 3.0.34 `@cline/shared/dist/agent.d.ts` |
| **Phase 1: handoff provider** | 实现 handoffProvider（检测 + 加载 + 摘要）+ beforeRun 写 module state + messageBuilder 注入 | Phase 0 ✅ |
| **Phase 2: commit 守卫** | 实现 beforeTool git status 检查 + `return { skip: true, reason }` 阻断 | Phase 0 ✅ |
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
