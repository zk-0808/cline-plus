# Investigation Note: CLI 3.0.34 `agent-message-codec.ts` content.map 崩溃

日期：2026-06-30

> **框架**：按 [evidence-governance.md §10](../evidence-governance.md) Investigation Note 模板执行。
>
> **关联**：
> - [dev-rules.md §1.15](../dev-rules.md) — 不可抗力声明（本次新增 codec bug 行）
> - [investigation-note-cli-plugin-verification.md](investigation-note-cli-plugin-verification.md) — CLI 3.0.30+ plugin 链路验证（前置，证明插件代码本身正常）
> - [investigation-note-vscode-bootstrap-missing.md](investigation-note-vscode-bootstrap-missing.md) — VS Code 4.0.x plugin 系统缺失（另一条不可抗力，本 bug 进一步缩窄可用运行环境）

---

## 核心问题

**`cline -i`（CLI 3.0.34）长对话或异常 MCP tool_result 后，为何报 `Error: n.content.map is not a function. (In 'n.content.map(eK)', 'n.content.map' is undefined)`？**

用户三次遭遇此错误（2026-06-30）：
1. `duckduckgo__search` MCP 超时后
2. `run_commands` 输出 843+ 行后
3. `read E:\cline++\docs` 后

共同特征：错误发生在 tool 执行完成、Cline 渲染 tool_result 时。

---

## Observation

> 直接看到的事实，无解释。

### O1. 错误形态分析

错误信息 `Error: n.content.map is not a function. (In 'n.content.map(eK)', 'n.content.map' is undefined)` 的格式特征：

- `(In '...', '...' is undefined)` 后缀是 **JavaScriptCore (JSC)** 的错误格式
- V8 报 `TypeError: ... is not a function`，无此后缀
- 参数名 `n` / `eK` 是 **minified JS** 形态

### O2. CLI 入口 resolver 注释

`E:\node-global\node_modules\cline\bin\cline`（cline.ps1 调用的 resolver）注释明示：

```js
// This script runs with Node.js (available everywhere npm is) and finds the
// correct platform-specific compiled binary to execute. The compiled binary
// has Bun embedded, so users don't need Bun installed.
```

**Bun runtime 用 JSC** — 与 O1 的错误格式吻合。

### O3. cline.exe 内嵌 JS bundle 定位

二进制文件 `E:\node-global\node_modules\.cline-mysker53\node_modules\@cline\cli-windows-x64\bin\cline.exe`（129.1 MB）内嵌 JS bundle。

以 Latin1 读取后 grep `\.content\.map\(`，命中 23 处。其中 **Match 3 (index 121467336)** + **Match 4 (index 121467598)** 与错误信息精确对应：

```js
// Match 3 (index 121467336) — 函数 afi:
function afi(i){let e=i.content.map(eK).filter((n)=>n!==void 0);return{id:i.id,role:i.role==="tool"?"user":i.role,content:e,ts:i.createdAt,metadata:i.metadata,modelInfo:i.modelInfo,metrics:cfi(i.metrics)}}

// Match 4 (index 121467598) — 函数 Nd:
function Tc(i){return i.map(afi)}
function Nd(i){let e=[];for(let n of i){let t=n.content.map(eK).filter((r)=>r!==void 0),a=n.role==="tool"?"user":n.role,u=e[e.length-1];if(a==="user"&&t.length>0&&t.every((r)=>r.type==="tool_result")&&u?.role==="user"&&Array.isArray(u.content)&&u.content.every((r)=>r.type==="tool_result")){u.content.push(...t);continue}e.push({role:a,content:t})}return e}

// eK 函数定义（4 处，相关的是 index 121468751）:
function eK(i){switch(i.type){case"text":return{type:"text",text:i.text};case"reasoning":{if(i.redacted===!0)return{type:"redacted_thinking",data:i.metadata?.data??""};let e=i.metadata;return{type:"thinking",thinking:i.text,signature:e?.signature,details:e?.details}}case"image":return typeof i.image...}}
```

**关键匹配点**：
- `n.content.map(eK)` — 参数名 `eK` 与错误信息完全一致
- `Nd` 函数里 `let n of i` 遍历，`n.content.map(eK)` — 变量 `n` 也完全匹配

### O4. 同 bundle 内其他 `.content.map(` 调用均有守卫

对比同 bundle 内 Match 6/7/8/9（其他 content.map 调用），均有类型守卫：

| Match | 位置（index） | 守卫代码 |
|-------|-------------|---------|
| 6 | 121488727 | `if(!Array.isArray(a.content)) return {...a}; return {...a, content:a.content.map(...)}` |
| 7 | 121490851 | `if(!Array.isArray(u.content)) return u; ... c = u.content.map(...)` |
| 8 | 121491198 | `if(i.type!=="tool_result" \|\| typeof i.content==="string") return i; ... a = i.content.map(...)` |
| 9 | 121493463 | `if(i.type!=="tool_result" \|\| typeof i.content==="string") return {...i}; return {...i, content:i.content.map(...)}` |

**`afi` (Match 3) 和 `Nd` (Match 4) 均无任何守卫**，直接 `i.content.map(eK)`。

### O5. unminified 源码定位（云端并行子代理 A 确认）

子代理 A 独立读取 cline/cline 仓库源码，映射如下：

| Minified | Unminified | 文件 |
|----------|-----------|------|
| `afi` | `agentMessageToMessageWithMetadata` | `sdk/packages/core/src/runtime/config/agent-message-codec.ts` ~L78 |
| `eK` | `agentPartToContentBlock` | 同上 ~L130 |
| `Tc` | `agentMessagesToMessagesWithMetadata` | 同上 ~L93 |
| `Nd` | `agentMessagesToMessages` | 同上 ~L97 |

**守卫状态（子代理 A 直接读源码确认）**：
- `agentMessageToMessageWithMetadata` — **❌ 无 Array.isArray 守卫**
- `agentMessagesToMessages` — **❌ 无 Array.isArray 守卫**
- `normalizeContentBlocks` — ⚠️ 部分（只查 string，不查 Array）
- `MessageBuilder.buildForApi()` — ✅ 有守卫（不同模块 `message-builder.ts`）

**Bug 仍在 main branch**（子代理 A 直接读源码确认）。

### O6. 与本插件代码无关

| 位置 | 代码 | 是否触发此错 |
|------|------|------|
| [compaction.ts:39](../context-snapshot/src/compaction.ts#L39) `serializeMessage` | `for (const block of message.content)` | ❌ 用 `for...of` 不是 `.map`，会报 "not iterable" 而非 "not a function" |
| [snapshot-writer.ts](../context-snapshot/src/snapshot-writer.ts) | 无 content.map | ❌ |
| [index.ts:41](../context-snapshot/src/index.ts#L41) `build()` | `return messages`（原样返回入参） | ❌ 不修改结构 |

### O7. 环境确认（§1.15）

VS Code 扩展 v4.0.2（继承 v4.0.1 回滚，pre-SDK 代码基，**无 plugin 系统**）— 我们的 context-snapshot 插件在 VS Code 端根本没加载。CLI 3.0.34 是当前唯一可用运行环境（见 [investigation-note-cli-plugin-verification.md](investigation-note-cli-plugin-verification.md)）。

---

## Evidence → Hypothesis → Verified

### H1（Verified）：错误源在 Cline 核心 `agent-message-codec.ts`，不在本插件

**证据**（3 独立来源，满足 [dev-rules.md §1.6](../dev-rules.md) 双来源门槛）：

| # | 证据 | 类型 | 来源 |
|---|------|------|------|
| 1 | minified cline.exe 锚点 `n.content.map(eK)`（Bun/JSC 错误格式 + 参数名精确匹配） | minified 源码 | 本地 binary grep |
| 2 | unminified `agentMessageToMessageWithMetadata` / `agentMessagesToMessages` 无 `Array.isArray` 守卫 | unminified 源码 | 子代理 A 直接读源码 |
| 3 | 同模块 `MessageBuilder.buildForApi()` 有守卫 — 证明作者知道该做守卫，codec 漏写 | unminified 源码 | 子代理 A + B 一致 |

**Hypothetical 根因链**（部分 Verified，部分待证）：

```
MCP tool_result (结构化数据)
  → anthropicContentBlockToSdkBlock (JSON.stringify 有损转换) [子代理 B 单源，Hypothetical]
    → AgentMessage.content 可能变成非数组
      → agentMessageToMessageWithMetadata (无 Array.isArray 守卫) [Verified]
        → .map() 崩溃: content.map is not a function [Verified]
```

### H2（Hypothetical，待证）：image 分支 `undefined` 静默丢弃

子代理 B 单源报告：`agentPartToContentBlock` 对 `typeof image !== "string"` 返回 `undefined` → `.filter()` 静默丢弃（`Uint8Array | ArrayBuffer | URL` 类型全部丢失）。

**降级原因**：单源未交叉验证。需补证：直接读 `agentPartToContentBlock` 完整 image 分支 + 调用链下游确认。

### H3（Hypothetical，待证）：下游两处无守卫连锁风险

子代理 B 单源报告：`agent-runtime.ts:621`（`.length`）、`runtime-event-adapter.ts:70`（`.filter()`）也无守卫。

**降级原因**：单源未交叉验证。需补证。

---

## Evidence Governance 复盘：PR #5246 幻觉事件

### 事件经过

1. 子代理 C 报告："最近相关 PR #5246：`fix: safely handle string message content`（2026-07-14 merge），但修复范围限于 `message-builder.ts`，未覆盖 `agent-message-codec.ts`"
2. 主 agent 在综合报告里把 PR #5246 当作"4 独立来源"之一引用
3. 主 agent 后续审查发现 PR #5246 是子代理 C 单源声明，未交叉验证
4. 主 agent 排除 PR #5246 为幻觉

### 根因

- **§1.6 双来源验证违反**：单源（子代理 C）只能到 Hypothesis，主 agent 直接采信进入 Verified 清单
- **§1.8 Evidence Collapse 风险**：主 agent 在综合时未对子代理产出做证据类型升级检查
- **日期异常未触发警觉**：报告日期 2026-07-14 比调查日期 2026-06-30 晚，主 agent 当时应质疑"未来日期的 PR 为何能在综合报告里被引用"

### 教训

- 子代理单源声明必须显式标注 "Hypothetical（待交叉验证）"
- 主 agent 综合多子代理报告时，必须按 §1.6 重新分类证据等级
- 日期异常（未来日期 / 超出知识截止）是幻觉的强信号，应立即触发反证

### Conflict Registry 登记

按 [evidence-governance.md §6](../evidence-governance.md) 登记冲突：

| 时间 | 冲突 | 证据 A | 证据 B | 处理 |
|------|------|--------|--------|------|
| 2026-06-30 | PR #5246 是否存在 | 子代理 C 单源声明存在（merge 2026-07-14） | 主 agent 审查发现日期异常 + 无独立佐证 | 排除为幻觉，不采信；本 Investigation Note 不引用 PR #5246 |

---

## 决策

### D1：登记 §1.15 不可抗力

已在 [dev-rules.md §1.15](../dev-rules.md) 不可抗力表添加 codec bug 行，并分层标注实测影响范围：
- 🔴 搁置：snapshot 写入实测（90K tokens 长对话）
- 🟡 带观察：Loop Guard 实测（避免 MCP + 避免长输出）
- 🟢 可推进：setup marker / rules 注入（短交互）

### D2：准备 issue 草稿

准备给 cline/cline 提 issue（见 `draft-issue-cli-codec-content-map-bug.md`，待写）。

### D3：未验证项跟进

| 项 | 状态 | 跟进动作 |
|----|------|---------|
| H2 image 分支 undefined 丢弃 | Hypothetical | 下次读源码时补证 `agentPartToContentBlock` 完整 image 分支 |
| H3 下游连锁风险 | Hypothetical | 下次读源码时验证 `agent-runtime.ts:621` / `runtime-event-adapter.ts:70` |
| 测试盲点 | 未验证 | 提 issue 时一并核查 codec 模块测试覆盖 |
| 是否有已知 issue | 未验证 | 提 issue 前先在 cline/cline 搜 `content.map is not a function` |

---

## 权威源

- [cline/cline 仓库](https://github.com/cline/cline) — `sdk/packages/core/src/runtime/config/agent-message-codec.ts`
- 本地 CLI 安装：`E:\node-global\node_modules\cline` v3.0.34
- 本地 cline.exe：`E:\node-global\node_modules\.cline-mysker53\node_modules\@cline\cli-windows-x64\bin\cline.exe` v3.0.34（129.1 MB，Bun-embedded）
- VS Code 扩展：`C:\Users\19936\.vscode\extensions\saoudrizwan.claude-dev-4.0.2` v4.0.2

## 子代理产出引用

- 子代理 A：函数定位 + 守卫状态（unminified 源码直接读取）
- 子代理 B：调用链分析（image 分支 + 上游 + 下游）— **单源声明已降级为 Hypothetical**
- 子代理 C：issue/PR 搜索 — **PR #5246 排除为幻觉，不采信**

## 证据时效性（按 [dev-rules.md §1.13](../dev-rules.md)）

- `evidence_as_of`: 2026-06-30
- `expires_if_unchanged`: 2026-07-14（14 天后）
- 引用前需复查：上游是否已修复 + CLI 版本是否已升级
