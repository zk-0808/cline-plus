# Plugin Dev Planning Framework — 写代码前的思考框架

> **定位**：模型在**规划阶段**（写代码前 / debug 前）的自检框架，不是逐步执行清单。
>
> **目标**：前置思考，减少后期多轮对话弥补。核心问题：v0.6.0 开发散漫，4 处契约违反靠用户多轮排查才定位；console.log 不可见绕大圈诊断。
>
> **用法**：不要求严格打勾，但规划时**大致覆盖**下面的思考点。每步出口是"答得上来吗"——答不上来就是没到位，动作清单可以表演，答不上来表演不了。

---

## 0. 触发时机

| 信号 | 该思考什么 |
|------|----------|
| "改 / 修 / 加 plugin 的 X" | 走 §1 规划（先定档位）|
| "验证 plugin 的 Y" | 走 §2 debug 前置 |
| 用户报错（含 `Error:` / `undefined` / `not a function`）| **先走 §2 debug 前置**，再决定改不改代码 |
| 写 instrument / 加 console.log | 指向 §2.3 边界——先读源码，读不懂再 instrument |

**不触发**：纯文档 / README / 注释 / 问答类任务 → 直接回答，不走本框架。

---

## 1. 写代码前的规划（按档位路由）

### 档位路由（先定强度，再规划）

| 改动性质 | §1 规划强度 | 对应验证档 |
|---------|------------|-----------|
| 纯本地 / 常量 / 文案，无契约影响 | 三步心算，可直接写 | 🟢 A |
| 单模块内部逻辑，不动接口 | Step1+Step2 必做，Step3 简化 | 🟢 A / 🟡 B |
| 动接口契约 / 跨模块 / 改依赖 | 三步全做，Step3 必须显式列"调用方影响" | 🟡 B / 🔴 C |

**定死的是判断走哪档的规则**，不是"每次必须走满三步"。日常小改不被拖慢，僵的地方只在动契约时。档位字母与 §4 验证档对齐，减少认知负担。

### Step 1: 边界与契约

**问自己**：这次改的东西，契约在哪？

- [ ] 涉及哪些能力？（messageBuilders / rules / hooks / tools / commands / providers / mcp）
- [ ] 对应的 `.d.ts` 契约文件路径是什么？（见下表）
- [ ] 插件入口位置？（setup 里 `api.register*` vs `plugin.hooks` 字段）

**契约速查表**（不用每次找）：

| 能力 | 契约文件 | 入口 |
|------|---------|------|
| hooks | `@cline/shared/dist/agent.d.ts` `AgentRuntimeHooks` + `Agent*Context` | `plugin.hooks` 字段（**不在** setup 里）|
| rules | `@cline/shared/dist/extensions/contribution-registry.d.ts` `AgentExtensionRule` | `api.registerRule()` — 字段是 `id` 不是 `name` |
| messageBuilders | 同上 `AgentExtensionMessageBuilder` | `api.registerMessageBuilder()` |
| setup ctx | 同上 `PluginSetupContext` | `ctx.workspaceInfo.rootPath`（不是 `workspacePath`）|

**出口判据**：*我能说出这次改动触达的契约文件路径和入口形式，不用再翻文档。* 答不上来 → 回到契约速查表。

**跳过代价**：v0.6.0 没读契约 → 4 处违反 → toolName=undefined → 用户多轮排查。

### Step 2: 通读

**问自己**：现有代码长什么样？我真的看过了吗？

- [ ] 读取要改的 `src/*.ts` 文件**全文**（不读片段）
- [ ] 读取对应 `.d.ts` 的**相关段落**（不 Grep、不读 minified）
- [ ] 核对：现有字段名 / 参数结构 / 返回类型，与契约一致吗？

**禁止**：
- ❌ "看起来应该这样" → 读契约
- ❌ Grep minified 推断语义 → 读 unminified 或 .d.ts
- ❌ 只读片段 → 通读

**出口判据**：*我能说出现有实现里最可能因这次改动而出问题的 1–2 个点（哪个字段 / 哪个分支），而不只是"我读过了"。* 答不上来 → 重读，或用 §2.3 instrument 验证假设。

### Step 3: 方案

**问自己**：改哪里？怎么改？会不会破坏别的？

输出一个简短方案（对话里即可，不写文档）：
```
改 <文件> 的 <函数>
- 契约: <.d.ts 路径>
- 改: <什么>
- 不改: <什么>           ← 防过度改动
- 回滚: <如果错了怎么退>  ← 动契约时必填
- 影响: <会不会破坏现有调用方>
```

然后 `tsc --noEmit` 验证。零错误才动手。

**出口判据**：*我能明确说出"不改什么"和"会不会破坏现有调用方"，而不只是说"改 X 函数"。* 答不上来 → 回 Step 2。

---

## 2. Debug 前置：读源码优先于让用户跑命令

### 2.1 报错时的第一反应

**用户报错 → 第一步永远是读源码，不是让用户跑诊断命令。**

| 报错类型 | 第一动作 | **禁止**的第一动作 |
|---------|---------|------------------|
| `X is not a function` | 读源码找 X 的定义，看接收的参数结构 | 让用户 `console.log(X)` |
| `undefined` 字段 | 读契约看字段名 / 读取位置 | 让用户加 instrument 看值 |
| `not a function` 在 minified | 定位 unminified 对应函数，读源码 | 在 minified 里反复 Grep |
| 文件不存在 | PowerShell `Get-ChildItem -Recurse` | Glob / LS 工具（Windows 不可靠）|

**判断标准**：如果第一反应是"让用户跑命令"，**暂停**，先问自己：读源码能不能直接回答？答能 → 读源码；答不能 → 才让用户跑。

### 2.2 何时让用户跑命令

只在下列情况让用户执行命令：

1. **源码读完仍无法定位**——契约正确、逻辑正确，但行为仍异常
2. **需验证运行时实际值**——如 hook 是否被路由、参数实际值
3. **需触发特定场景**——如 Loop Guard 需 15 次工具调用

**让用户跑命令时的规范**：
- 明确目的（不是"看看有什么"）
- 明确预期结果（成功 / 失败各意味着什么）
- 一次性给完整命令，不挤牙膏（不要"先跑 A"→"再跑 B"→"再跑 C"）

### 2.3 instrument 的使用边界

**用 instrument.log 文件写入**（不用 console.log）：

```ts
const INSTRUMENT_LOG = join(homedir(), ".cline", "data", "snapshot", "debug.log");
function instrument(msg: string) {
    try { appendFileSync(INSTRUMENT_LOG, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
}
```

- ✅ 用于验证 hook 是否被调用 / 参数实际值 / 执行路径
- ❌ **不用于替代读源码**——先读源码，读不懂再 instrument
- 清理规范见 §3 红线（不保留到 commit）

---

## 3. 红线（硬约束）

| 红线 | 为什么 | 该怎么做 |
|------|--------|---------|
| 不假设 API 参数结构 | 静默失败，hook 不触发 / 字段 undefined | 读 `.d.ts` 契约 |
| 不用 minified 代码下语义结论 | 推断错误（运行时路径 ≠ 安装路径）| 需语义结论时读 unminified / `.d.ts` |
| 不跳过 `tsc --noEmit` | 类型错误进入运行时 | 改完立即编译验证 |
| 不保留 instrument 代码到 commit | 污染生产代码 | 验证后清理 + commit 前检查 |
| Windows 文件核查用 PowerShell | Glob / LS 在 Windows 不可靠（dev-rules §1.4）| `Get-ChildItem -Recurse` / `Test-Path` |

---

## 4. 验证档位（按风险，与 §1 档位对齐）

| 档 | 场景 | 动作 | codec bug 风险 |
|----|------|------|---------------|
| 🟢 A | setup / rule / manifest / 常量 | 1-2 次工具调用 | 低 |
| 🟡 B | hook 逻辑 / detectRepetition | 5-15 次工具调用 + instrument.log | 中（避 MCP + 避长输出）|
| 🔴 C | compact / snapshot 写入 / 端到端 | ≥90K tokens 长对话 | **高**（受 §1.15 阻塞，需 workaround）|

---

## 5. 与顶层文档的关系

- **dev-rules.md** = 永久治理规则（跨功能、跨任务）
- **本框架** = plugin 开发规划阶段的思考参考
- **handoff.md** = 跨会话交接

冲突时 dev-rules.md 优先。本框架未覆盖的（证据治理 / 评审角色 / 时效性门控）回退 dev-rules.md。
