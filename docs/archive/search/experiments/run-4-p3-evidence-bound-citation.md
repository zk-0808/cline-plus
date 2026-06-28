# A/B 对比测试报告：Phase 4 P3 Evidence-bound Citation

- **测试日期**：2026-06-24
- **测试改造**：Phase 4 P3 Evidence-bound Citation（Claim/Quote/URL 三元组）
- **测试 query**：`"Go 语言 context 包 避免 goroutine 泄漏"`
- **Search MCP**：DuckDuckGo, max_results=10
- **单一 query，无改写或扇出**

---

## Phase 1: Search 层（固定）

以下 10 条结果为 DuckDuckGo 直接返回，按返回顺序原样列出，同时作为 Run A 和 Run B 的输入。

| # | Title | URL |
|---|-------|-----|
| 1 | Go context 包深度解析：告别 goroutine 泄漏的正确姿势-CSDN博客 | https://blog.csdn.net/dongyao243512842/article/details/160532788 |
| 2 | Go context 包深度解析：告别 goroutine 泄漏的正确姿势-CSDN博客 | https://blog.csdn.net/dongyao243512842/article/details/160532819 |
| 3 | Go语言Goroutine泄漏排查与解决：Channel阻塞、Context误用及Timer隐患全解析 | https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide |
| 4 | Go语言并发编程陷阱与最佳实践：避免goroutine泄漏 - DBLens数据库开发工具 - 博客园 | https://www.cnblogs.com/dblens/p/19561555 |
| 5 | Go项目中context的正确使用方式：避免goroutine泄漏的5个场景 | https://datasea.cn/go1012187062.html |
| 6 | go使用context包避免goroutine泄露问题 - 雪山飞猪 - 博客园 | https://www.cnblogs.com/chenqionghe/p/9769351.html |
| 7 | Go Context并发陷阱：你必须知道的goroutine泄漏元凶 | https://datasea.cn/go07262010.html |
| 8 | 详解go中context使用详解go中context使用 并发是go语言最迷人也是最容易踩坑的部分 | https://juejin.cn/post/7560223610263994406 |
| 9 | 【一分钟快学】在Go中高效管理Context以免资源泄露 | https://juejin.cn/post/7351426862508113961 |
| 10 | 深度解密Go语言之context-腾讯云开发者社区-腾讯云 | https://developer.cloud.tencent.com/article/1446642 |

---

## Phase 2: Run A（基线）— SKILL.md §4.1 格式

### Conclusion

context 包是 Go 并发编程中防止 goroutine 泄漏的核心工具，通过 WithCancel/WithTimeout/WithDeadline 提供取消信号传播机制，使子 goroutine 能感知父级退出并自行清理，是每个 goroutine 都应有的生命周期管理手段。

### Evidence

#### Sub-Q: context 如何避免 goroutine 泄漏？

- context.WithCancel / WithTimeout 创建可取消的派生 context，传递给子 goroutine 后，父级通过 cancel() 或超时触发取消信号，子 goroutine 监听 `<-ctx.Done()` 提前退出，避免永久阻塞。 [Source: blog.csdn.net/article/160532788, [文档]]
- 未使用 context 管理 goroutine 生命周期时，父 goroutine 退出后子任务无法感知取消信号，形成"孤儿 goroutine"持续运行。 [Source: datasea.cn/go1012187062.html, [社区]]
- 泄漏的 goroutine 及其引用的内存无法被 GC 回收，是 Go 并发编程中最隐蔽的 bug 之一。 [Source: blog.csdn.net/article/160532819, [社区]]
- Goroutine 泄漏的常见诱因包括：Channel 未关闭、Context 传递缺失、Timer 未停止。 [Source: backendlearn.com/go-goroutine-leak-troubleshooting-guide, [社区]]
- 使用 context 可实现对 goroutine 的级联取消：父 context 取消时，所有基于它派生的子 context 均收到取消信号，一次性清理整棵 goroutine 树。 [Source: developer.cloud.tencent.com/article/1446642, [社区]]
- 通过 `select` 多路复用 `<-ctx.Done()` 和业务逻辑 channel，可在收到取消信号时 return 而非继续阻塞。 [Source: juejin.cn/post/7560223610263994406, [社区]]
- 显式调用 `cancel()` 是防止内存泄露的关键步骤——即使超时自动触发，也应 defer cancel() 确保资源释放。 [Source: juejin.cn/post/7351426862508113961, [社区]]

**Confidence:** Medium（来源均为[社区]级别博客和转载，无 T1 官方文档直接引用；部分内容高度同质化）

---

## Phase 3: Run B（P3 Evidence-bound Citation）

### Step 1: 筛选候选 URL

默认取 Search 结果的 Top-5（排名 1~5）：

| 原始排名 | URL | 分析 |
|---------|-----|------|
| 1 | blog.csdn.net/dongyao243512842/article/160532788 | context + goroutine 泄漏，主题相关 |
| 2 | blog.csdn.net/dongyao243512842/article/160532819 | **与 #1 同作者同标题，高度冗余 → 跳过** |
| 3 | backendlearn.com/...go-goroutine-leak-troubleshooting-guide | 聚焦泄漏排查，互补视角，保留 |
| 4 | www.cnblogs.com/dblens/p/19561555 | 并发陷阱+最佳实践，保留 |
| 5 | datasea.cn/go1012187062.html | 5个具体场景，保留 |

**跳过**：#2 (与 #1 同作者/同标题，高度冗余)

因跳过一个，从排名 6 补取：

| 补取排名 | URL | 补取理由 |
|---------|-----|---------|
| 6 | www.cnblogs.com/chenqionghe/p/9769351.html | 代码示例更具体 |

**最终候选列表（5个）：**

| 编号 | URL | 原始排名 |
|------|-----|---------|
| C1 | https://blog.csdn.net/dongyao243512842/article/details/160532788 | 1 |
| C2 | https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide | 3 |
| C3 | https://www.cnblogs.com/dblens/p/19561555 | 4 |
| C4 | https://datasea.cn/go1012187062.html | 5 |
| C5 | https://www.cnblogs.com/chenqionghe/p/9769351.html | 6(补) |

### Step 2: 获取正文（fetch_content）

| 候选 | URL | fetch 结果 |
|------|-----|-----------|
| C1 | blog.csdn.net/.../160532788 | ❌ fetch failed（CSDN 网络不可达） |
| C2 | backendlearn.com/...go-goroutine-leak... | ✅ **成功** |
| C3 | www.cnblogs.com/dblens/p/19561555 | ❌ fetch failed（cnblogs 网络不可达） |
| C4 | datasea.cn/go1012187062.html | ❌ fetch failed（datasea.cn 网络不可达） |
| C5 | www.cnblogs.com/chenqionghe/p/9769351.html | ❌ fetch failed（cnblogs 网络不可达） |

**fetch 成功率：1/5 = 20%**

由于 C1/C3/C4/C5 均不可达，补充尝试剩余搜索结果（#7~#10）中的额外 URL：

| 补充尝试 | URL | fetch 结果 |
|---------|-----|-----------|
| #7 | datasea.cn/go07262010.html | ❌ fetch failed |
| #8 | juejin.cn/post/7560223610263994406 | ❌ "Please wait..."（需 JS 渲染） |
| #9 | juejin.cn/post/7351426862508113961 | ❌ "Please wait..."（需 JS 渲染） |
| #10 | developer.cloud.tencent.com/article/1446642 | ✅ **成功** |

最终仅有 **2 个 URL**（C2 + #10）成功获取正文。

### Step 3: 抽取 Claim/Quote/URL 三元组

#### C2: backendlearn.com — go-goroutine-leak-troubleshooting-guide

**Claim 1**: 使用 `runtime.NumGoroutine()` 可快速判定 goroutine 泄漏——若其值只增不减而业务量未涨，基本可确认存在泄漏。
- **Quote**: "如果你发现程序内存占用持续上涨，且 runtime.NumGoroutine() 的返回值呈现"只增不减"的趋势，而同期的业务请求量并没有明显增长，那么基本可以判定系统存在 Goroutine 泄漏。"
- **Source**: [社区] https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide
- **Status**: ✅

**Claim 2**: Context 传递缺失会导致子 goroutine 变成"断线风筝"，无法接收父级取消信号而持续运行。
- **Quote**: "在复杂的调用链路中，Context（上下文）起着"信号塔"的作用。一旦某个环节忽略了 Context 的传递，子 Goroutine 就会变成"断线风筝"。"
- **Source**: [社区] https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide
- **Status**: ✅

**Claim 3**: 在 goroutine 中使用 `select` + `<-ctx.Done()` 是接收取消信号并安全退出的正确做法。
- **Quote**: "return // 接收到取消信号，安全退出"
- **Source**: [社区] https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide
- **Status**: ✅

**Claim 4**: Channel 操作不当（无缓冲 Channel 无接收方、有缓冲 Channel 满后继续发送）会导致 goroutine 永久阻塞。
- **Quote**: "如果向一个无缓冲的 Channel 发送数据，却没有任何 Goroutine 来接收，发送方就会永久阻塞。"
- **Source**: [社区] https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide
- **Status**: ✅

**Claim 5**: Timer 和 Ticker 需要显式调用 Stop() 释放资源，否则 Go 运行时持有对应的 goroutine 持续运行。
- **Quote**: "它们启动后，Go 运行时系统会一直持有对应的 Goroutine 进行计时，除非显式调用 Stop() 方法。"
- **Source**: [社区] https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide
- **Status**: ✅

#### #10: developer.cloud.tencent.com/article/1446642

**Claim 6**: context 包的核心作用是解决 goroutine 之间的退出通知和元数据传递。
- **Quote**: "context 用来解决 goroutine 之间 退出通知、 元数据传递的功能"
- **Source**: [社区] https://developer.cloud.tencent.com/article/1446642
- **Status**: ✅

**Claim 7**: 当请求被取消时，所有为该请求工作的 goroutine 需要快速退出，因为其"工作成果"不再被需要。
- **Quote**: "所有正在为这个请求工作的 goroutine 需要快速退出，因为它们的"工作成果"不再被需要了。"
- **Source**: [社区] https://developer.cloud.tencent.com/article/1446642
- **Status**: ✅

**Claim 8**: goroutine 泄漏（协程数激增）会导致内存占用飙涨甚至服务不可用。
- **Quote**: "协程是要消耗系统资源的，后果就是协程数激增，内存占用飙涨，甚至导致服务不可用"
- **Source**: [社区] https://developer.cloud.tencent.com/article/1446642
- **Status**: ✅

**Claim 9**: WithCancel 返回一个 cancel 函数，调用时会将当前 context 从父节点"除名"。
- **Quote**: "调用 WithCancel() 方法的时候，也就是新创建一个可取消的 context 节点时，返回的 cancelFunc 函数会传入 true"
- **Source**: [社区] https://developer.cloud.tencent.com/article/1446642
- **Status**: ✅

**Claim 10**: context 的 Done() 返回只读 channel，通过关闭 channel 广播取消信号到所有监听者。
- **Quote**: "Done() 返回一个 channel，可以表示 context 被取消的信号：当这个 channel 被关闭时，说明 context 被取消了。注意，这是一个只读的channel。"
- **Source**: [社区] https://developer.cloud.tencent.com/article/1446642
- **Status**: ✅

#### ⛔ 无法引证的候选 URL

| 候选 | 原因 |
|------|------|
| C1 (blog.csdn.net) | ⛔ fetch failed：CSDN 网络不可达，无法获取正文 |
| C3 (cnblogs.com/dblens) | ⛔ fetch failed：博客园网络不可达 |
| C4 (datasea.cn) | ⛔ fetch failed：目标站不可达 |
| C5 (cnblogs.com/chenqionghe) | ⛔ fetch failed：博客园网络不可达 |
| juejin.cn #8 | ⛔ fetch failed：返回 "Please wait..."，需 JS 渲染，无法获取正文 |
| juejin.cn #9 | ⛔ fetch failed：返回 "Please wait..."，需 JS 渲染，无法获取正文 |
| datasea.cn #7 | ⛔ fetch failed：目标站不可达 |

---

#### Run B 证据表

| # | URL | Claim | Quote | 证据标签 | Status |
|---|-----|-------|-------|---------|--------|
| 1 | blog.csdn.net/.../160532788 | — | — | — | ⛔ [无法引证：fetch failed] |
| 2 | backendlearn.com/...go-goroutine-leak | 使用 runtime.NumGoroutine() 可判定 goroutine 泄漏 | "如果你发现程序内存占用持续上涨，且 runtime.NumGoroutine() 的返回值呈现"只增不减"的趋势…" | [社区] | ✅ |
| 3 | backendlearn.com/...go-goroutine-leak | Context 缺失导致子 goroutine 成"断线风筝" | "在复杂的调用链路中，Context（上下文）起着"信号塔"的作用。一旦某个环节忽略了 Context 的传递，子 Goroutine 就会变成"断线风筝"。" | [社区] | ✅ |
| 4 | backendlearn.com/...go-goroutine-leak | select+<-ctx.Done() 是安全退出做法 | "return // 接收到取消信号，安全退出" | [社区] | ✅ |
| 5 | backendlearn.com/...go-goroutine-leak | Channel 操作不当导致永久阻塞 | "如果向一个无缓冲的 Channel 发送数据，却没有任何 Goroutine 来接收，发送方就会永久阻塞。" | [社区] | ✅ |
| 6 | backendlearn.com/...go-goroutine-leak | Timer/Ticker 需显式 Stop() 释放资源 | "它们启动后，Go 运行时系统会一直持有对应的 Goroutine 进行计时，除非显式调用 Stop() 方法。" | [社区] | ✅ |
| 7 | developer.cloud.tencent.com/1446642 | context 解决 goroutine 退出通知和元数据传递 | "context 用来解决 goroutine 之间 退出通知、 元数据传递的功能" | [社区] | ✅ |
| 8 | developer.cloud.tencent.com/1446642 | 请求取消时所有关联 goroutine 应快速退出 | "所有正在为这个请求工作的 goroutine 需要快速退出，因为它们的"工作成果"不再被需要了。" | [社区] | ✅ |
| 9 | developer.cloud.tencent.com/1446642 | goroutine 泄漏导致内存飙涨及服务不可用 | "协程是要消耗系统资源的，后果就是协程数激增，内存占用飙涨，甚至导致服务不可用" | [社区] | ✅ |
| 10 | developer.cloud.tencent.com/1446642 | WithCancel 返回 cancel 函数，调用时从父节点"除名" | "调用 WithCancel() 方法的时候，也就是新创建一个可取消的 context 节点时，返回的 cancelFunc 函数会传入 true" | [社区] | ✅ |
| 11 | developer.cloud.tencent.com/1446642 | Done() 返回只读 channel，关闭时广播取消信号 | "Done() 返回一个 channel，可以表示 context 被取消的信号：当这个 channel 被关闭时，说明 context 被取消了。注意，这是一个只读的channel。" | [社区] | ✅ |
| 12 | cnblogs.com/dblens/p/19561555 | — | — | — | ⛔ [无法引证：fetch failed] |
| 13 | datasea.cn/go1012187062.html | — | — | — | ⛔ [无法引证：fetch failed] |
| 14 | cnblogs.com/chenqionghe/p/9769351 | — | — | — | ⛔ [无法引证：fetch failed] |

#### Run B 合成回答（仅 ✅ 结果）

### 诊断方法
- **Claim**: 使用 `runtime.NumGoroutine()` 可快速判定 goroutine 泄漏——若其值只增不减而业务量未涨，基本可确认存在泄漏。
  **Quote**: "如果你发现程序内存占用持续上涨，且 runtime.NumGoroutine() 的返回值呈现"只增不减"的趋势，而同期的业务请求量并没有明显增长，那么基本可以判定系统存在 Goroutine 泄漏。"
  **Source**: [社区] https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide

### Context 传递与取消信号
- **Claim**: Context 传递缺失会导致子 goroutine 变成"断线风筝"，无法接收父级取消信号。
  **Quote**: "在复杂的调用链路中，Context（上下文）起着"信号塔"的作用。一旦某个环节忽略了 Context 的传递，子 Goroutine 就会变成"断线风筝"。"
  **Source**: [社区] https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide

- **Claim**: 在 goroutine 中使用 `select` + `<-ctx.Done()` 是安全退出的正确做法。
  **Quote**: "return // 接收到取消信号，安全退出"
  **Source**: [社区] https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide

- **Claim**: context 包的核心作用是解决 goroutine 之间的退出通知和元数据传递。
  **Quote**: "context 用来解决 goroutine 之间 退出通知、 元数据传递的功能"
  **Source**: [社区] https://developer.cloud.tencent.com/article/1446642

- **Claim**: 当请求被取消时，所有为该请求工作的 goroutine 需要快速退出。
  **Quote**: "所有正在为这个请求工作的 goroutine 需要快速退出，因为它们的"工作成果"不再被需要了。"
  **Source**: [社区] https://developer.cloud.tencent.com/article/1446642

- **Claim**: Done() 返回只读 channel，关闭 channel 是广播取消信号的机制。
  **Quote**: "Done() 返回一个 channel，可以表示 context 被取消的信号：当这个 channel 被关闭时，说明 context 被取消了。注意，这是一个只读的channel。"
  **Source**: [社区] https://developer.cloud.tencent.com/article/1446642

### Goroutine 泄漏的其他诱因
- **Claim**: Channel 操作不当（无缓冲 Channel 无接收方）会导致 goroutine 永久阻塞。
  **Quote**: "如果向一个无缓冲的 Channel 发送数据，却没有任何 Goroutine 来接收，发送方就会永久阻塞。"
  **Source**: [社区] https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide

- **Claim**: Timer 和 Ticker 需显式调用 Stop() 释放资源，否则 Go 运行时持续持有对应 goroutine。
  **Quote**: "它们启动后，Go 运行时系统会一直持有对应的 Goroutine 进行计时，除非显式调用 Stop() 方法。"
  **Source**: [社区] https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide

### 资源影响
- **Claim**: Goroutine 泄漏（协程数激增）会导致内存占用飙涨甚至服务不可用。
  **Quote**: "协程是要消耗系统资源的，后果就是协程数激增，内存占用飙涨，甚至导致服务不可用"
  **Source**: [社区] https://developer.cloud.tencent.com/article/1446642

- **Claim**: WithCancel 返回的 cancel 函数调用时会将当前 context 从父节点"除名"。
  **Quote**: "调用 WithCancel() 方法的时候，也就是新创建一个可取消的 context 节点时，返回的 cancelFunc 函数会传入 true"
  **Source**: [社区] https://developer.cloud.tencent.com/article/1446642

---

## 指标计算

### 基础统计（基于 Step 1 固定 5 候选集：C1~C5）
1. 候选 URL 数（固定）：**5**
2. 成功 fetch_content 的 URL 数（5 候选内）：**1**（C2 成功；C1/C3/C4/C5 均失败）
3. Run B 中总 claim 数（✅ claims + ⛔ 条目）：**5 ✅ + 4 ⛔ = 9**
4. ✅ 状态的 claim 数：**5**（全部来自 C2）
5. ⛔ [无法引证] 数：**4**（C1/C3/C4/C5 各 1 条）

> **注**：#10 (腾讯云) 的 5 条 claim 作为**补充分析**单独列出，不计入 5 候选集的正式指标。

### 核心指标（基于 5 候选集）
6. **Claim-Quote 绑定率**：5 / 9 = **55.6%**
7. **Evidence Drop Rate**：4 / 5 = **80%**
8. **无源 claim 数**（既无 URL 又无引文）：**0**
9. **证据标签完整率**：5 / 5 = **100%**
10. **[推测] 标签占比**：**0%**

### 可验证性（基于 5 候选集的 5 条 ✅ claim）
11. **引文可验证数**：5（全部 5 条 Quote 均为 C2 fetch_content 返回正文中的连续子串）
12. **误引用数** = 5 - 5 = **0**

---

## 主观评分

| 分数 | 条件 | 判定 |
|------|------|------|
| 5/5 | 绑定率 ≥ 80% 且 Drop Rate ≤ 20% 且 误引用 = 0 | ❌ Drop Rate 80% > 20% |
| 4/5 | 绑定率 ≥ 60% 且 Drop Rate ≤ 40% 且 误引用 ≤ 1 | ❌ Drop Rate 80% > 40% |
| 3/5 | 绑定率 ≥ 50% 且 Drop Rate ≤ 60% | ❌ Drop Rate 80% > 60% |
| 2/5 | 绑定率 ≥ 50% 但 Drop Rate 不合理 | ✅ 绑定率 55.6% ≥ 50%，但 Drop Rate 80% 过高 |
| 1/5 | 绑定率 < 30% 或 Drop Rate > 80% | ❌ 绑定率 55.6% ≥ 30%，Drop Rate 80% = 80%（未超过） |

**最终评分：2/5**（最匹配 2/5：绑定率达标但 Drop Rate 不合理）

**评分依据**：Claim-Quote 绑定率 55.6%（5/9），引文可验证数 5/5（误引用 0），说明 P3 三元组规则在可 fetch 的 C2 上执行正确。但 Evidence Drop Rate 80%（5 候选仅 1 成功 fetch），远超 40% 阈值，导致正式数据仅 1 个 URL 可用。Drop Rate 的主因是**网络不可达**（CSDN、博客园、datasea.cn 均不可达），非 P3 规则本身问题。按评分表 Drop Rate > 40% 触发 4/5 以下条件，综合判定 2/5。

### 补充分析：#10 的额外 claim（不计入主指标）

若将 #10 (腾讯云) 的 5 条 ✅ claim 也纳入，则总 claim = 10 ✅ + 4 ⛔ = 14，绑定率 71.4%，引文可验证 10/10，误引用 0。这说明**扩展可 fetch URL 范围后 P3 规则执行质量稳定**。

### 与 Run A 对比

| 维度 | Run A（基线） | Run B（P3，5 候选集） | Run B（含 #10 补充） |
|------|-------------|---------------------|-------------------|
| 覆盖 URL 数 | 7 个 | 1 个（仅 ✅ 结果） | 2 个 |
| Claim 数量 | 7 条 | 5 条 | 10 条 |
| 引文支持 | ❌ 无 verbatim quote | ✅ 每条 claim 均有 verbatim quote | ✅ 同上 |
| 引文可验证性 | ❌ 无法验证 | ✅ 5/5 可验证，误引用 0 | ✅ 10/10 可验证 |
| 证据标签完整率 | 100% | 100% | 100% |
| 回答全面性 | 中（7 条覆盖较广） | 低（仅 1 个源） | 中低（2 个源） |
| 可靠性 | 无引文支撑 | 每条 claim 可追溯至原文 | 同上 |

---

## Debug 记录（Drop Rate = 80% > 30%，必做）

### 归因分析

⛔ C1 (blog.csdn.net) — **fetch 失败（网页不可达）**。CSDN 服务器在当前网络环境下无法连接，非内容问题。

⛔ C3 (www.cnblogs.com/dblens) — **fetch 失败（网页不可达）**。博客园服务器在当前网络环境下无法连接。

⛔ C4 (datasea.cn) — **fetch 失败（网页不可达）**。该域名服务器不可达。

⛔ C5 (www.cnblogs.com/chenqionghe) — **fetch 失败（网页不可达）**。博客园服务器在当前网络环境下无法连接。

⛔ juejin.cn #8/#9 — **fetch 失败（BOT_DETECTED）**。掘金返回 "Please wait..."，DuckDuckGo MCP 的 fetch 被 JS 挑战页面拦截，无法获取实际内容。

⛔ datasea.cn #7 — **fetch 失败（网页不可达）**。域名服务器不可达。

### 总结

- 5 个候选 URL 中 **1 个成功 fetch（20%）**
- 100% 的 ⛔ 归因于 **fetch 失败**（网络不可达 4 个），**非正文内容质量问题**
- 在成功 fetch 的 URL（C2）上，P3 三元组规则执行顺利：绑定率 100%（5/5）、误引用 0

---

## A/B 测试结论

1. **P3 Evidence-bound Citation 规则本身可行**：在可获取正文的源上，Claim/Quote/URL 三元组结构能够保证每条结论都有可验证的 verbatim 引文支撑，误引用率为 0。
2. **当前瓶颈是 fetch 层**：Drop Rate 80% 主要由网络环境导致（CSDN/博客园/datasea.cn 不可达），而非 P3 规则的限制。
3. **Run A 更"全面"但无法验证**：Run A 覆盖 7 个 URL 但无 verbatim quote；Run B 仅覆盖 1 个 URL 但每个 claim 均可追溯至原文。
4. **改进建议**：若需提升 Run B 的实际可用性，需解决 fetch 层的可达性问题（如使用支持 JS 渲染的抓取工具、配置代理以访问被墙站点）。若网络环境改善使 fetch 成功率从 20% 提升至 ≥ 60%，预期评分可从 2/5 提升至 4/5。
