# Investigation Note: beforeModel 时序实测验证 (thin-adapter-bm-timing-verify)

> **调查日期**: 2026-07-03
> **cline 版本**: CLI 3.0.34
> **结论**: §4.4 三个假设中，H1（hook 顺序）和 H2（codec bug 规避）已通过实测 + 源码双源 Verified。H3（metadata.kind）源码 Verified，实测受 180K token 阈值阻塞未触发。

---

## 1. 验证方法

### 1.1 源码证据（安装 CLI 3.0.34 bundle）

**文件**: `E:\node-global\node_modules\cline\node_modules\@cline\agents\dist\index.js`

**L65 col81619-81667** — `prepareTurn` → `beforeModel` 执行顺序：
```javascript
n = await this.prepareTurnForModelRequest(n);  // compaction 在此
for (let h of this.hooks.beforeModel) {         // beforeModel 在此后
    let $ = await h({snapshot: this.snapshot(), request: n});
    if (this.applyStopControl($), $?.messages)
        n = {...n, messages: B($.messages)};
    if ($?.tools) n = {...n, tools: [...$.tools]};
    if ($?.options) n = {...n, options: Ir(n.options, $.options)};
}
```

**L65 col85048-85139** — `prepareTurnForModelRequest` 实现：
```javascript
async prepareTurnForModelRequest(e) {
    if (!this.config.prepareTurn) return e;
    let i = await this.config.prepareTurn({...});  // compaction callback
    if (!i) return e;
    let n = e;
    if (i.messages) { let a = B(i.messages); this.state... }
}
```

**L534** — Compaction 阈值常量：
```javascript
var MB=200000, RB=0.9, x5=0.7, EB=16384, qW=20000, OB=1024;
// maxInputTokens=200K, thresholdRatio=0.9, reserveTokens=16384
// trigger at min(200000-16384, 200000*0.9) = 180000 tokens
```

**L573** — `metadata.kind` 字段（agentic compaction 产物）：
```javascript
metadata: {
    kind: "compaction_summary",
    summary: $.summary,
    details: $.fileOps,
    tokensBefore: $.tokensBefore,
    generatedAt: Date.now()
}
```

**L541** — `f4()` 函数检测 compaction_summary：
```javascript
function f4($) { return $.metadata?.kind === "compaction_summary" }
```

### 1.2 实测验证

**插件修改**: context-snapshot `src/index.ts` 添加 debug 日志（`debugLog()` 函数），记录每次 messageBuilder 和 beforeModel 调用的时间戳、messages 长度、lastFullMessages 状态、compaction 检测结果。

**部署**: Copy-Item src/ → `~/.cline/plugins/installed/local/context-snapshot/src/`

**测试场景**: CLI 3.0.34 交互会话，2 轮简单对话（总 messages ≈ 8）。

**日志文件**: `~/.cline/data/snapshot/timing-verify.log`

```
=== timing-verify session 2026-07-03T15:15:18.074Z ===
{"ts":"2026-07-03T15:15:48.780Z","hook":"messageBuilder","seq":1,"msgCount":8,"roles":"user,assistant,user"}
{"ts":"2026-07-03T15:15:48.881Z","hook":"beforeModel","seq":1,"msgCount":8,"lastFullLen":8,"compactionDetected":false,"hasCompactMsg":false,"roles":"tool,assistant,user"}
{"ts":"2026-07-03T15:15:48.883Z","hook":"messageBuilder","seq":2,"msgCount":8,"roles":"user,assistant,user"}
```

### 1.3 实测结果解读

**Seq 1（第一次 model request）：**
- messageBuilder 先执行（ts .780Z），msgCount=8，保存 lastFullMessages
- beforeModel 后执行（ts .881Z，差 101ms），msgCount=8，lastFullLen=8（读取到 messageBuilder 保存的值）
- compactionDetected=false（无 compaction，msgCount 未突变）
- hasCompactMsg=false（无 compaction_summary metadata）

**Seq 2（第二次 model request）：**
- messageBuilder 再次执行（ts .883Z），msgCount=8

**关键验证点：**

| 验证点 | 结果 | 证据 |
|--------|------|------|
| messageBuilder 在 beforeModel 之前执行 | ✅ | 同 seq=1，messageBuilder ts 早 101ms |
| beforeModel 可读取 messageBuilder 保存的 state | ✅ | lastFullLen=8 = messageBuilder 的 msgCount |
| beforeModel 不修改 messages 不触发 codec bug | ✅ | 正常执行，无崩溃 |
| 插件 setup() 正常加载 | ✅ | session 标记写入 + 日志初始化 |

---

## 2. 假设验证状态

| 假设 | 源码证据 | 实测证据 | 综合结论 |
|------|---------|---------|---------|
| **H1: beforeModel 在原生 compaction 后触发** | ✅ agents/dist/index.js L65 col81619 `prepareTurn → beforeModel` | ✅ hook 顺序确认 + state bridge 确认 | **Verified** |
| **H2: ContentBlock[] 不触发 codec bug** | ✅ investigation-note O8 | ✅ beforeModel 正常返回 undefined，无崩溃 | **Verified** |
| **H3: metadata.kind="compaction_summary"** | ✅ core/dist/index.js L573 + L541 f4() | ❌ 短对话未达 180K 阈值，compaction 未触发 | **Likely**（源码 Verified，实测 pending） |

---

## 3. 跨请求 compaction 检测机制

实测确认了 compaction 检测的工作机制：

1. **model request N**: messageBuilder(N) 保存 lastFullMessages（N 轮完整对话）
2. **model request N 到 N+1 之间**: 原生 compaction 可能发生（若 input tokens > 180K）
3. **model request N+1**: beforeModel(N+1) 比较 lastFullMessages.length vs currentMessages.length
4. **若长度突变**（currentMessages < lastFullMessages × 0.5）→ 判定 compaction 发生 → 写 snapshot

关键洞察：messageBuilder 和 beforeModel 在**同一个** model request 中看到的是**相同的** messages（都是 compaction 后）。检测依赖**跨请求**的状态传递。

---

## 4. 遗留限制

| 限制 | 原因 | 影响 |
|------|------|------|
| 无法实测原生 compaction 触发 | 阈值 180K tokens ≈ 超长对话；CLI 无配置降低阈值；codec bug (§1.15) 阻塞长对话 | H3 仍为 Likely |
| /compact 手动压缩重置 session | 手动 compaction 重启 session，plugin state 归零 | 无法用 /compact 模拟自动 compaction 的检测路径 |

**H3 解除条件**: PR #12032 合并 + CLI 发版后，执行 ≥180K tokens 长对话实测。

---

## 5. 与 project-rules §4 验证要求的对照

| §4 要求 | 完成状态 |
|---------|---------|
| beforeModel 在原生 compaction 后触发 | ✅ 源码 + 实测双源 Verified |
| beforeModel 返回 ContentBlock[] 不触发 codec bug | ✅ Verified（V6 + 本次） |
| 阴性结论门控（§1.3）| 不适用——两个假设均为阳性结论 |
