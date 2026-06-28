# Run #9c Ground Truth（密封文件）

> **密封要求**：此文件在 Run A / Run B 执行完成前不可向执行者展示。
> Run A / Run B 的执行提示词中不包含此文件的任何内容。
> 评分阶段（Phase 2）由 TRAE agent 解封使用。

---

## 1. 字段槽全集（3 实体 × 5 维度 = 15 槽）

| 框架 | routing | middleware | ecosystem | context | error_handling |
|------|---------|------------|-----------|---------|----------------|
| Gin | Radix-tree, 121.7 ns/op 第1, 27.65 ns/op 参数路由第2, 零分配; 与 Go 1.22+ 原生 mux 持平 | c.Next() 链式, 不调用则链终止 | GitHub 最受欢迎, 最大中间件生态 | gin.Context 封装 http.Request + 自行管理键值, 不等价标准 context.Context | c.Error() 收集错误链 + 全局错误中间件 |
| Echo | Radix-tree, 127.5 ns/op 第2 零分配, 47.94 ns/op 参数路由第4(1 alloc); v5 零动态分配 | 25+ 内置中间件, root/group/route 级别 | v5.2.1, 32.5k stars, 官方 echo-jwt/echo-contrib/echo-swagger | echo.Context 单一抽象, c.Request().Context() 互操作标准 context | handler 返回 error, echo.NewHTTPError() |
| Fiber | Gin benchmark 第5(466.1 ns/op); TechEmpower 1198万 rps; 基于 fasthttp | Express.js 风格 c.Next(), 30+ contrib; fasthttp 不兼容 net/http handler | contrib/storage/template/recipes; v3.x breaking changes | fiber.Ctx, 需显式配置标准 context; HTTP/2 需显式配置 | panic-recover, Recover 中间件; v3 ErrorHandler |

## 2. Conflict Ground Truth（5 个冲突点）

| # | 冲突点 | ground truth |
|---|--------|-------------|
| 1 | 路由性能排名 vs 总吞吐 | Gin 基础路由第1(121.7 ns/op), Fiber 第5(466.1 ns/op); 但 Fiber TechEmpower 1198万 rps 远超两者 — 路由查找 ≠ 总吞吐 |
| 2 | 中间件兼容性 | Gin/Echo 基于 net/http 可复用标准中间件; Fiber 基于 fasthttp 不兼容 net/http handler 签名 |
| 3 | 上下文与标准库集成 | Gin gin.Context 不等价标准 context; Echo 通过 c.Request().Context() 互操作; Fiber 需显式配置 |
| 4 | 错误处理模式 | Gin c.Error() 收集 + c.Next() 传递; Echo return error; Fiber panic/recover |
| 5 | HTTP/2 支持 | Gin/Echo 继承 net/http 原生 HTTP/2/3; Fiber 需显式配置 |

## 3. Distinct Claim 全集（20 条，非结构化编号 E1~E20）

| E# | 对应 Run #9b Claim | 归属框架 | 维度 |
|----|-------------------|---------|------|
| E1 | C17+C18 | Fiber | routing |
| E2 | C4 | Gin | middleware |
| E3 | C13 | Echo | ecosystem |
| E4 | C20 | Fiber | middleware |
| E5 | C8 | Echo | routing |
| E6 | C1+C2 | Gin | routing |
| E7 | C22 | Fiber | error_handling |
| E8 | C14 | Echo | context |
| E9 | C19 | Fiber | routing/ecosystem |
| E10 | C5 | Gin | ecosystem |
| E11 | C11+C12 | Echo | middleware |
| E12 | C16 | Fiber | routing |
| E13 | C7 | Gin | error_handling |
| E14 | C21 | Fiber | context |
| E15 | C3 | Gin | routing |
| E16 | C10 | Echo | routing |
| E17 | C9 | Echo | routing |
| E18 | C6 | Gin | context |
| E19 | (Fiber 生态补充) | Fiber | ecosystem |
| E20 | C15 | Echo | error_handling |

## 4. 评分口径

- **Conflict ID Rate（口径 B）**：信息在 Conflicts & Trade-offs 段落中显式出现才算命中
- **Field Alignment Rate**：答案中明确覆盖的字段槽数 / 15
- **Schema 幻觉字段数**：无 P3 证据支撑的字段数
- **降回 proposed 触发条件**：Conflict ID Δ < +15%
