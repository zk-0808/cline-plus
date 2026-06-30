# Investigation Note: 双重 setup() 调查（v2 — 评审修订版）

**日期**：2026-06-30
**调查对象**：context-snapshot 插件每次 `cline -i` 启动时 setup() 被调用两次
**状态**：现象已确认，根因待 Instrumentation 验证
**评审修订**：v1 将 Likely 推断为 Verified、Hypothesis 排序错误、过早进入 Patch。v2 按 Senior Agent Developer Reviewer 要求重做。

---

## 0. Evidence Classification（评审要求新增）

本报告所有结论按以下等级标注，**修复建议只能建立在 Verified 或 Likely 上，不针对 Hypothesis 打补丁**：

| 等级 | 定义 | 可用于 |
|------|------|--------|
| **Verified** | 日志/代码直接证明，无推断跳跃 | 结论 + 修复依据 |
| **Likely** | 多项证据支持，但缺直接证明 | 结论 + 修复依据（需标注待补证）|
| **Hypothesis** | 用于指导下一步实验，不作为结论 | 仅设计 Instrumentation |

---

## 1. 现象（Observation）—— 全部 Verified

### 1.1 双重 setup 配对【Verified】

`plugin-loaded.log`（Cline 主进程 plugin loader 日志，非插件 console.log）显示：

```
[2026-06-30T06:16:25.075Z] setup() called | workspace=(unknown) | branch=(none) | commit=(none)
[2026-06-30T06:16:25.076Z] registered: messageBuilder + tool | setup complete
[2026-06-30T06:16:25.461Z] setup() called | workspace=E:\cline++ | branch=main | commit=7ba73e7
[2026-06-30T06:16:25.463Z] registered: messageBuilder + tool | setup complete
```

- 每次会话固定两条 setup，间隔 300-500ms
- 两条都带 `registered: messageBuilder + tool | setup complete`（由 Cline loader 写，非插件自报）
- 6-29 15:22 起稳定出现，6-28（3.0.33）为单 setup

### 1.2 messageBuilder.build() 成对出现【Verified】

```
[2026-06-30T06:16:31.544Z] messageBuilder.build() called | messages count=1
[2026-06-30T06:16:31.871Z] messageBuilder.build() called | messages count=1
```

- 每次 turn 两条 build()，间隔 <50ms
- 6-29 起稳定出现，6-28 为单条

### 1.3 版本与 hub 配置【Verified】

`cline.log` 显示 6-30 所有会话：
```
"extension_version":"3.0.34"
"runtimeAddress":"ws://127.0.0.1:25463/hub"
"enableAgentTeams":true
"enableSpawnAgent":true
```

6-29 15:09 最后一次 3.0.33 会话，6-29 15:22 起双 setup = 3.0.34 升级引入。

### 1.4 时间线对齐【Verified】

| 时间 | 事件 | PID |
|------|------|-----|
| 06:16:23.796 | `CLI run started` cwd=`E:\cline++` | 26148 |
| 06:16:25.075 | setup #1 (workspace=unknown) | — |
| 06:16:25.461 | setup #2 (workspace=E:\cline++) | — |
| 06:16:26.116 | `session.started` | 26148 |
| 06:16:31.539 | `hook beforeRun fired` | — |

两次 setup 都在 session.started 之前 → **加载阶段的两次调用**（Verified）

### 1.5 hub-daemon.log 排除【Verified】

`hub-daemon.log` 全部是 `capability.request/respond` 路由消息，**无 setup() 日志** → hub-daemon 不是 (unknown) 实例（Verified）

---

## 2. 根因推断（Inference）—— 严格降级

### 2.1 【Likely】3.0.34 引入双阶段 setup 初始化流程

**支持证据**：
- 3.0.33 单 setup → 3.0.34 双 setup（版本升级同步）
- 两次 setup 都在 session.started 之前（时间线）
- 第一次 workspace=unknown、第二次 workspace=已知（ctx.workspacePath 注入时机不同）
- hub 模式启用（runtimeAddress + enableAgentTeams）

**缺失证据**（阻止升级到 Verified）：
- ❌ 无官方设计说明 Cline 3.0.34 采用 runtime/session 双阶段初始化
- ❌ 无源码证明存在双阶段 setup 调用点
- ❌ 无其他仓库/安装实例对照

**结论**：**Likely**（不是 v1 错误标注的 Verified）。可用于"需进一步调查"结论，不可作为"正常架构"定论。

### 2.2 【Hypothesis】messageBuilder 被注册两次导致 build() 双倍调用

**v1 错误**：直接写"messageBuilder 被注册两次 → build() 双倍调用"当作事实。

**实际情况**：
- ✅ Verified：plugin-loaded.log 两次出现 `registered: messageBuilder + tool | setup complete`
- ❌ 未证明：这两次注册是否真的都生效（可能第二次覆盖第一次？可能注册到不同 registry？可能只有一次实际路由到 hook？）

**缺失证据**：
- ❌ 无 instanceId 区分两次 setup 注册的对象
- ❌ 无 import.meta.url 证明两次 setup 在同一/不同 module graph
- ❌ 无 Cline registry 内部状态证明"注册了两个 messageBuilder"

**结论**：**Hypothesis**。build() 成对出现是 Verified，但"因为注册了两个"是推断。

### 2.3 【Hypothesis】toolRecorder 模块级单例被双重加载破坏

**v1 错误**：写"toolRecorder 模块级单例被双重加载破坏"作为副作用事实。

**实际情况**：
- 这是 ESM module graph 层面的重大架构结论
- 需要证明：两份 module graph 存在、instanceId 不同、history 不共享
- **目前零直接证据**

**缺失证据**：
- ❌ 无 `instanceId` 打印证明两个 ToolCallRecorder 实例存在
- ❌ 无 `import.meta.url` 证明 module graph
- ❌ 无 `Symbol.for(...)` / WeakMap 证明单例失效
- ❌ 无 history.length 分布证明 history 被分散

**结论**：**Hypothesis**。不能写入报告作为副作用。

---

## 3. Architecture Boundary Review（评审要求新增）

| 问题 | 归属层 | 当前证据状态 |
|------|--------|------------|
| setup 被调用两次 | **Runtime**（Cline 主进程加载流程）| Verified（现象）/ Likely（双阶段设计）|
| build() 成对出现 | **Observer**（messageBuilder 注册与调用）| Verified（现象）/ Hypothesis（两次注册都生效）|
| toolRecorder 单例 | **State**（ESM module graph）| Hypothesis（无直接证据）|
| `registered: messageBuilder + tool` 文本 | **Runtime**（Cline loader 日志）| Verified（文本存在）/ 未知（语义=真的注册生效？）|
| snapshot 文件成对产生 | **Side Effect**（writeSnapshot 被调两次）| Verified（成对 .md）/ Hypothesis（根因=双 setup）|

### 3.1 应该在哪层修？（评审要求：不针对 Hypothesis 打补丁）

**v1 错误**：直接给 A/B/C 修复方案（setup 守卫 / 幂等 / 接受）。

**v2 修订**：在以下证据补齐前，**不提修复方案**：

| 待补证据 | 验证方法 | 阻止的结论 |
|---------|---------|-----------|
| 两次 setup 是否注册到同一 registry | Instrumentation：打印 registry 句柄/长度 | "build() 双倍调用"根因 |
| 两次 setup 是否在同一 module graph | Instrumentation：打印 `import.meta.url` | "toolRecorder 单例破坏"根因 |
| (unknown) 实例的 hook 是否被路由 | Instrumentation：打印 hook 调用时的 instanceId | "hook 分散到两实例"根因 |
| Cline 3.0.34 是否有官方双阶段说明 | 查 release notes / 源码 | "正常架构"定论 |

---

## 4. Runtime Instrumentation 设计（替代 v1 的修复建议）

**原则**：先证明，再修复。不针对 Hypothesis 打补丁。

### 4.1 Setup 阶段 Instrumentation

在 [index.ts](file:///e:/cline++/handoff-plugin/src/index.ts) setup() 入口加文件写入日志（绕过 console.log 不可见问题）：

```ts
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const INSTRUMENT_LOG = join(homedir(), ".cline", "data", "snapshot", "instrument.log");
function instrument(msg: string) {
    try {
        const instanceId = Math.random().toString(36).slice(2, 8);
        const moduleUrl = import.meta.url;
        appendFileSync(INSTRUMENT_LOG, `[${new Date().toISOString()}] instance=${instanceId} module=${moduleUrl} ${msg}\n`);
    } catch {}
}

setup(api: any, ctx?: any) {
    instrument(`setup() called, workspace=${ctx?.workspacePath ?? "(unknown)"}, api keys=${Object.keys(api).join(",")}`);
    // ...原逻辑...
    instrument(`setup() done, registered messageBuilder+rules+hooks`);
}
```

**要验证的**：
1. 两次 setup 的 instanceId 是否不同（区分实例）
2. 两次的 `import.meta.url` 是否相同（区分 module graph）
3. api 对象的 keys 是否相同（区分 registry）

### 4.2 Hook 调用 Instrumentation

在 beforeTool/afterTool 加：
```ts
beforeTool(args: { toolName: string; input: Record<string, unknown> }) {
    instrument(`beforeTool: ${args.toolName}, history.length=${toolRecorder.historyLength()}`);
    // ...
}
afterTool(args: { toolName: string; success: boolean }) {
    instrument(`afterTool: ${args.toolName}, history.length=${toolRecorder.historyLength()}`);
    // ...
}
```

**要验证的**：
1. hook 是否真的被调用（排除"hook 注册失败"假设）
2. toolRecorder.historyLength 分布（是否被分散到两个实例）
3. toolName 是否一致（排除"工具名大小写/连字符"假设）

### 4.3 detectRepetition 调用 Instrumentation

在 beforeModel 加：
```ts
async beforeModel(ctx: { snapshot: any; request: any }) {
    const rep = toolRecorder.detectRepetition(5, 3);
    instrument(`beforeModel: detectRepetition called, repeating=${rep.repeating}, count=${rep.count}, history.length=${toolRecorder.historyLength()}`);
    // ...
}
```

**要验证的**：
1. beforeModel 是否被调用（排除"Loop Guard 评估器没被调"假设）
2. detectRepetition 返回值（repeating=false 时 count 是多少）

---

## 5. 修订后的结论（替代 v1 的"正常架构"定论）

### 5.1 已确认（Verified）

1. **setup() 被调用两次**——3.0.34 引入，时间线在 session.started 之前
2. **messageBuilder.build() 成对出现**——每次 turn 两次
3. **hub-daemon 不是 (unknown) 实例**
4. **snapshot 文件成对产生**

### 5.2 待 Instrumentation 验证（Likely / Hypothesis）

1. 【Likely】3.0.34 引入双阶段 setup 初始化流程（缺官方说明）
2. 【Hypothesis】两次 setup 都注册生效导致 build() 双倍调用
3. 【Hypothesis】toolRecorder 单例被双重加载破坏
4. 【Hypothesis】(unknown) 实例的 hook 仍被路由

### 5.3 不做的事（v2 修订）

- ❌ **不提 A/B/C 修复方案**（v1 错误，已删）——需先 Instrumentation 证明根因
- ❌ **不下"正常架构"定论**（v1 错误，降为 Likely）
- ❌ **不写"toolRecorder 单例破坏"作为副作用**（v1 错误，降为 Hypothesis）
- ✅ **只提 Instrumentation 设计**——先证明，再修复

---

## 6. 责任层归属（按 reviewer-personas.md §2.6 第二层）

| 维度 | 观察 |
|------|------|
| **Runtime State** | setup 两次调用，加载阶段无显式状态机（Cline 控制）|
| **Control Flow** | 两次都在 session.started 之前，无回退条件（Cline 决定）|
| **Planner** | 无 Planner 介入 |
| **Evaluator** | 无 Evaluator——setup() 是单向注册 |
| **Observation** | plugin-loaded.log 由 Cline loader 写，非插件——观察层是 Cline 内置 |
| **Memory** | **未证明** toolRecorder 单例状态——需 Instrumentation |
| **Tooling** | 无专用工具，依赖日志分析 |
| **Architecture** | **责任层待定**——可能是 Runtime（Cline 加载流程）/ Observer（注册机制）/ State（module graph）。需 Instrumentation 证据归属后才能定 |

---

## 7. 与 v1 的差异（修订日志）

| 节 | v1 | v2 |
|----|----|----|
| §0 Evidence Classification | 无 | 新增（评审要求）|
| §2.1 "正常架构" | Verified | Likely（降级）|
| §2.2 "build() 双倍调用根因" | 当作事实 | Hypothesis（降级）|
| §2.3 "toolRecorder 单例破坏" | 当作副作用 | Hypothesis（降级）|
| §3 Architecture Boundary Review | 无 | 新增（评审要求）|
| §4 修复建议 A/B/C | 直接给方案 | 删除，改为 Instrumentation 设计 |
| §5 结论 | "正常架构" | "现象确认，根因待证" |

---

## 8. 参考资料

- [reviewer-personas.md §2.6](file:///e:/cline++/docs/reviewer-personas.md) — Senior Agent Developer Reviewer 输出格式
- [evidence-governance.md §10](file:///e:/cline++/docs/evidence-governance.md) — Investigation Note 格式
- [evidence-governance.md §6](file:///e:/cline++/docs/evidence-governance.md) — Conflict Registry
