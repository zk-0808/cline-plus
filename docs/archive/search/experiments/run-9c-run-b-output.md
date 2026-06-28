# Run #9c — Run B 输出

> **实验**：[run-9c-p5-output-schema-v3.md](run-9c-p5-output-schema-v3.md)  
> **执行条件**：双盲（执行者不知道 GT 冲突点）  
> **证据来源**：§5.1 非结构化证据集（E1~E20）

---

## Step 1 — Schema 抽取

### Gin

| 维度 | value | evidence_quality | source |
|------|-------|------------------|--------|
| **routing_performance** | 基础路由 benchmark 排名第一（121.7 ns/op，零分配），参数路由排名第二（27.65 ns/op，零分配）；Radix-tree 路由已与 Go 1.22+ 原生 mux 达到性能持平 | paraphrased | [E6, E15] |
| **middleware_mechanism** | 中间件链基于 `c.Next()` 调用机制，若不调用则链终止；支持 `c.Error()` 收集错误链配合全局错误中间件 | verbatim | [E2, E13] |
| **ecosystem_maturity** | GitHub 上最受欢迎的 Go Web 框架，拥有最大的中间件生态 | verbatim | [E10] |
| **context_propagation** | 中间件链通过 `c.Next()` 传递控制权；错误通过 `c.Error()` 在链中收集——未明确提及与标准 `context.Context` 的集成机制 | paraphrased | [E2, E13] |
| **error_handling** | 支持 `c.Error()` 方法收集错误链，配合全局错误中间件使用；中间件链中不调用 `c.Next()` 则链终止，影响错误处理流程 | paraphrased | [E2, E13] |

### Echo

| 维度 | value | evidence_quality | source |
|------|-------|------------------|--------|
| **routing_performance** | Radix-tree 路由，基础路由 benchmark 127.5 ns/op（零分配，排名第二）；参数路由 47.94 ns/op（8 B/op，1 alloc，排名第四）；v5 宣传零动态分配路由器和智能路由优先级 | verbatim | [E5, E16, E17] |
| **middleware_mechanism** | 内置 25+ 中间件（CORS、JWT、rate-limit、gzip、recover、请求日志等），可在 root/group/route 级别定义；官方维护 echo-jwt/echo-contrib（Prometheus/Casbin/Jaeger/pprof/Zipkin）/echo-swagger | verbatim | [E3, E11] |
| **ecosystem_maturity** | v5.2.1 最新版，GitHub 32.5k stars，官方维护多个 contrib 组件 | verbatim | [E3] |
| **context_propagation** | Context 是单一抽象，绑定请求/响应/验证/模板；通过 `c.Request().Context()` 与标准 `context.Context` 互操作；但 Context 封装了 `http.Request` 和自行管理的键值存储，不与标准 `context.Context` 直接等价 | paraphrased | [E8, E18] |
| **error_handling** | handler 必须返回 error，否则响应不发送；提供 `echo.NewHTTPError()` 封装 HTTP 错误；同时 E18 引文也指向同一约束 | verbatim | [E18, E20] |

### Fiber

| 维度 | value | evidence_quality | source |
|------|-------|------------------|--------|
| **routing_performance** | 在 Gin 官方 benchmark 中基础路由排名第五（466.1 ns/op，零分配），显著慢于 Gin 和 Echo；但在 TechEmpower Plaintext 测试中达到 1198 万 rps（不同基准体系） | verbatim | [E1, E12] |
| **middleware_mechanism** | 中间件 API 仿 Express.js 设计，使用 `c.Next()` 链式调用；30+ contrib 中间件；但 fasthttp 不兼容 net/http 标准 handler 签名 | verbatim | [E4] |
| **ecosystem_maturity** | ecosystem 包括 fiber contrib、storage、template、recipes 等官方子项目；v3.x 有 breaking changes，major version 间 API 不兼容；基于 fasthttp 而非 net/http，生态相对独立 | paraphrased | [E9, E19] |
| **context_propagation** | 通过 `fiber.Ctx` 管理请求上下文，与标准库 `context.Context` 的集成需要显式配置；HTTP/2 支持也需显式配置 | verbatim | [E14] |
| **error_handling** | 使用 panic-recover 模式处理未预期错误，内置 Recover 中间件；v3 提供 ErrorHandler 统一入口；fasthttp 连接回收后读请求体会 panic | paraphrased | [E4, E7] |

---

## Step 2 — 综合答案

### 路由性能：框架间最显著的差距

三个框架在路由性能上呈现明确的梯度分化：

- **Gin** 在基础路由 benchmark 中保持第一（121.7 ns/op），参数路由也排第二（27.65 ns/op），两项均零分配。值得注意的是，E15 指出其 Radix-tree 路由已与 Go 1.22+ 原生 mux 达到性能持平，这暗示 Gin 的路由性能优势正在被标准库追赶。
- **Echo** 紧随其后，基础路由 127.5 ns/op（第二），参数路由 47.94 ns/op 但伴随 1 次分配（排名第四）。v5 版本宣传"零动态分配"路由器，说明其也在优化分配开销。
- **Fiber** 在 Gin 官方 benchmark 中排名第五（466.1 ns/op），显著落后于前两者。但 Fiber 的 TechEmpower Plaintext 数据（1198 万 rps）远高于 Gin 和 Echo 的同体系数据——这是一个关键冲突点：不同 benchmark 方法论导致结论不可直接比较。

**权衡**：如果你看重 Gin benchmark 体系下的路由层吞吐（`net/http` 生态），Gin ≥ Echo > Fiber；如果你看重端点级极限吞吐（TechEmpower），Fiber 借助 fasthttp 反超。

### 中间件机制：三种设计哲学

- **Gin** 采用 `c.Next()` 驱动链式调用，中间件若不调用该方法则链终止——这是最"侵入式"的控制模式。其最大优势是生态规模（E10 称"最大中间件生态"）。
- **Echo** 提供 25+ 内置中间件（覆盖 CORS、JWT、rate-limit、gzip 等常见需求），并允许在 root/group/route 三级定义，结构清晰。官方还维护 echo-jwt、echo-contrib 等组件。
- **Fiber** API 仿 Express.js，对 Node.js 背景开发者友好。30+ contrib 中间件，但受 fasthttp 限制无法兼容 `net/http` 标准 handler 签名——这是一个迁移成本。

### 上下文传播：标准兼容性的关键分歧

这是框架间最深层的架构差异：

- **Echo** 提供了最丰富的上下文互操作能力：`c.Request().Context()` 可与标准 `context.Context` 互操作，但其 Context 封装了 `http.Request` 和自行管理的键值存储（E18），"不与标准 `context.Context` 直接等价"——这暗示了潜在的语义不一致。
- **Fiber** 使用 `fiber.Ctx`，与标准 `context.Context` 集成需要显式配置；HTTP/2 同样需要显式配置（而 `net/http` 原生支持）。这是 fasthttp 架构的代价。
- **Gin** 的证据未明确提及与标准 `context.Context` 的集成方式，这是证据缺口（E2 和 E13 仅涉及中间件链中的控制流传递，不涉及标准上下文传播）。

### 错误处理：各框架的自洽模式

- **Echo** 是最严格的：handler 必须返回 error，否则响应不发送（E18/E20 两次确认），并提供 `echo.NewHTTPError()` 统一包装。
- **Gin** 通过 `c.Error()` 收集错误链，结合全局错误中间件集中处理；`c.Next()` 机制也影响错误在链中的传播路径。
- **Fiber** 采用 panic-recover 模式，内置 Recover 中间件，v3 引入 ErrorHandler 统一入口。但 fasthttp 的回收机制导致读请求体后 panic 是一个需要警惕的陷阱（E4/E7 双重提及）。

### 生态成熟度：声誉与风险的平衡

- **Gin** 拥有最大的中间件生态和社区热度（E10），但 Radix-tree 路由优势正在被标准库追赶（E15），这是一个"成熟但被追平"的信号。
- **Echo** 32.5k stars + 官方维护的 contrib 生态，生态结构最"规范"。
- **Fiber** 提供了完整的子项目体系（contrib/storage/template/recipes），但 v3.x breaking changes 和 major version 间 API 不兼容（E19），结合 fasthttp 的非标准架构（E9），使其迁移风险最高——采用 Fiber 意味着在一定程度上脱离 Go 标准库生态。

### 核心冲突总结

| 冲突主题 | 一方证据 | 冲突方证据 |
|----------|----------|------------|
| Fiber 性能定位 | E12：Gin benchmark 排名第五（466.1 ns/op） | E1：TechEmpower 1198 万 rps |
| Echo 的 context 标准兼容性 | E8：通过 `c.Request().Context()` 与标准 `context.Context` 互操作 | E18：Context 封装自行管理键值存储，"不与标准 `context.Context` 直接等价" |
| Gin 路由优势存续 | E6：基础路由第一（121.7 ns/op） | E15：已与 Go 1.22+ 原生 mux 性能持平 |
| Fiber 中间件生态规模 | E4：30+ contrib 中间件 | E9：fasthttp 不兼容 `net/http` 标准 handler 签名 → 生态隔离 |