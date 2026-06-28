# Run #9c — P5 Output Schema 双盲 + 非结构化证据集验证

> **前身**：[run-9b-p5-output-schema-v2.md](run-9b-p5-output-schema-v2.md)（3/5 有条件，外部评审决策 C）
> **触发条件**：外部评审要求"Run #9c 必须同时引入双盲设计 + 非结构化证据集"
> **降回 proposed 触发条件**：双盲条件下 Conflict ID Δ < +15%

---

## 1. 实验目标

验证 P5 Output Schema 在以下条件下的 Conflict Identification 收益：

1. **双盲**：Run A / Run B 执行者不知道 Ground Truth 的冲突点列表
2. **非结构化证据集**：P3 证据不按"框架 × 维度"预组织，而是混合多源的扁平 claim 列表

### 1.1 与 Run #9b 的差异

| 维度 | Run #9b | Run #9c |
|------|---------|---------|
| 证据集结构 | 按 sub-question × 5 维度预组织 | **扁平混合**：claim 不按框架/维度分组 |
| 执行盲态 | 非双盲（执行者已知 GT） | **双盲**：执行者不知道 GT 冲突点 |
| Conflict ID 量化 | +40%（不可采信） | 须 ≥ +15% 才维持 active |
| 实体数量 | 3（Gin/Echo/Fiber） | 3~4（可复用 Run #9b 证据或新搜） |

### 1.2 执行主体声明（designated_executor）

> **约束来源**：project-rules.md §约束 5

| 步骤 | designated_executor | 理由 |
|------|---------------------|------|
| Phase 0 证据收集（若需新搜） | **Cline + SKILL** | 需要 Goggle / P3 / 三档模式 |
| Phase 0 证据重构（非结构化化） | **TRAE agent** | 将已有 P3 三元组打乱重组，不涉及搜索 |
| Phase 0 GT 标注 | **TRAE agent**（但结果对 Run A/B 执行者不可见） | 基于证据集做事实标注 |
| Phase 1 Run A | **用户在 Cline 中执行**（盲态） | 双盲要求：执行者不知道 GT |
| Phase 1 Run B | **用户在 Cline 中执行**（盲态） | 双盲要求：执行者不知道 GT |
| 评分 | **TRAE agent**（解封 GT 后） | 对照 GT 计算指标 |

---

## 2. Phase 0：证据集 + Ground Truth

### 2.1 非结构化证据集构造

**方案 A（复用 Run #9b 证据）**：将 [run-9b-phase0-evidence.md](run-9b-phase0-evidence.md) 的 22 条 claim 打乱顺序，移除"SQ1/SQ2/SQ3"和"2.1.1 路由性能"等维度分组标签，输出为扁平列表。

**方案 B（新搜）**：用 Cline + SKILL 执行新搜索，但 Phase 3 P3 抽取时不按维度分组，直接输出扁平 claim 列表。

**推荐方案 A**：复用已有证据避免搜索成本，且 Run #9b 证据集已通过自检。非结构化化只需重组格式，不需新数据。

#### 非结构化证据集格式

```
## Evidence Pool（非结构化）

E1. Claim: 基础路由 benchmark 第1, 121.7 ns/op, 零分配
    Quote: "Rank 1 — Gin — 121.7 ns/op — 0 B/op — 0 allocs/op"
    Source: gin-gonic.com/en/docs/benchmarks/, [文档] T1

E2. Claim: 基于 fasthttp 非 net/http, 丧失标准库兼容性
    Quote: "Use Fiber when raw throughput is the primary constraint..."
    Source: gofaq.org, [社区] T3

E3. Claim: 内置 25+ 中间件 (CORS/JWT/rate-limit/gzip/recover)
    Quote: "Batteries-included Middleware — 25+ built in."
    Source: echo.labstack.com, [文档] T1

E4. Claim: 参数路由 47.94 ns/op, 排名第4, 1 alloc
    Quote: "Rank 4 — Echo — 47.94 ns/op — 8 B/op — 1 allocs/op"
    Source: gin-gonic.com/en/docs/benchmarks/, [文档] T1

E5. Claim: TechEmpower Plaintext 1198万 rps
    Quote: "Fiber — 11,987,976 responses per second..."
    Source: docs.gofiber.io/extra/benchmarks/, [文档] T1

[... 全部 22 条 claim，打乱顺序，不按框架/维度分组 ...]
```

### 2.2 Ground Truth（密封，Run A/B 执行者不可见）

GT 与 Run #9b 相同（若复用方案 A）：
- 15 字段槽（3 框架 × 5 维度）
- 5 个冲突点
- 22 条 distinct claim

**密封方式**：GT 写入 run-9c-ground-truth-sealed.md，Run A / Run B 的执行提示词中不包含此文件路径，也不包含"5 个冲突点"的任何提示。

### 2.3 双盲执行设计

**Run A 提示词**（给用户在 Cline 执行）：

```
基于以下证据集，生成一份 Go Web 框架对比答案（Gin / Echo / Fiber）。

【输出文件位置】将结果保存至：
docs/search-orchestrator/experiments/run-9c-run-a-output.md

要求：
- 自由文本格式，不要使用表格或 schema
- 覆盖你认为重要的维度
- 指出框架间的冲突与权衡

证据集：
[粘贴非结构化证据集]
```

**Run B 提示词**（给用户在 Cline 执行，与 Run A 在不同会话中）：

```
基于以下证据集，先按 schema 抽字段，再生成综合答案。

【输出文件位置】将结果保存至：
docs/search-orchestrator/experiments/run-9c-run-b-output.md

Step 1 — Schema 抽取：
按以下 schema 从证据中抽字段：
[粘贴 schema 模板，同 Run #9b §4.2]

Step 2 — 综合答案：
基于 schema 生成自由文本答案，覆盖你认为重要的维度，指出框架间的冲突与权衡。

证据集：
[粘贴同一份非结构化证据集]
```

**双盲保证**：
- 两个提示词都不包含 GT 冲突点列表
- 两个提示词都不包含"5 个冲突"的提示
- Run A 和 Run B 在不同 Cline 会话中执行
- 执行者（Cline + 模型）不知道有几个冲突点、有哪些维度

---

## 3. 核心指标

| 指标 | 定义 | Run #9b | Run #9c |
|------|------|---------|---------|
| Conflict ID Rate（口径 B） | Conflicts 段落显式命中的冲突数 / GT 5 个 | 3/5 vs 5/5（非双盲） | 待测（双盲） |
| Field Alignment Rate | 跨实体可对齐字段数 / 15 | 15/15 = 100%（天花板） | 待测（非结构化证据集） |
| Schema 幻觉字段数 | 无证据支撑的字段数 | 0 | 待测 |
| ~~Output Length~~ | 已排除（评审 L3） | — | 不测 |

### 3.1 评分尺度

| 分数 | 条件 |
|------|------|
| 5/5 | Conflict ID Δ ≥ +30%（双盲），Field Alignment 有差异，无幻觉 |
| 4/5 | Conflict ID Δ ≥ +20%（双盲），无幻觉 |
| 3/5 | Conflict ID Δ ≥ +15%（双盲），无幻觉 |
| 2/5 | Conflict ID Δ < +15%，但无幻觉 |
| 1/5 | 无改善 / 引入 schema 幻觉 |

**降回 proposed 触发条件**：Conflict ID Δ < +15%（即 ≤ 2/5）

---

## 4. 执行流程

```
Phase 0a  TRAE agent 构造非结构化证据集（复用 Run #9b 22 条 claim 打乱）
Phase 0b  TRAE agent 标注 GT（密封，写入独立文件）
Phase 0c  TRAE agent 交付 Run A / Run B 提示词给用户

Phase 1a  用户在 Cline 会话 1 执行 Run A（盲态）
Phase 1b  用户在 Cline 会话 2 执行 Run B（盲态）
Phase 1c  用户将两份输出贴回给 TRAE agent

Phase 2   TRAE agent 解封 GT，对照评分
Phase 3   TRAE agent 填入结果记录区 + 同步 survey / mechanism-candidates
```

---

## 5. 结果记录区（待执行后填入）

### 5.1 非结构化证据集

> 来源：Run #9b Phase 0 证据集（22 条 claim）打乱重组，移除框架/维度分组标签。
> 归档：[run-9c-phase0-evidence-unstructured.md](run-9c-phase0-evidence-unstructured.md)

```
## Evidence Pool

E1. Claim: TechEmpower Plaintext 测试中达到 1198 万 rps, JSON 序列化 236 万 rps
    Quote: "Fiber — 11,987,976 responses per second with an average latency of 1.0 ms."
    Source: docs.gofiber.io/extra/benchmarks/, [文档] T1

E2. Claim: 中间件链基于 c.Next() 调用机制, 若不调用则链终止
    Quote: "Gin expects you to call c.Next() in middleware or the chain stops."
    Source: gofaq.org, [社区] T3

E3. Claim: v5.2.1 最新版, GitHub 32.5k stars, 官方维护 echo-jwt/echo-contrib(Prometheus/Casbin/Jaeger/pprof/Zipkin)/echo-swagger
    Quote: "32.5k on GitHub"
    Source: echo.labstack.com, [文档] T1

E4. Claim: 中间件 API 仿 Express.js 设计, 使用 c.Next() 链式调用; 30+ contrib 中间件; 但 fasthttp 不兼容 net/http 标准 handler 签名
    Quote: "Fiber panics if you try to read the request body after the connection is recycled."
    Source: gofaq.org, [社区] T3

E5. Claim: Radix-tree 路由, 基础路由 benchmark 127.5 ns/op, 零分配, 排名第二
    Quote: "Rank 2 — Echo — 127.5 ns/op — 0 B/op — 0 allocs/op"
    Source: gin-gonic.com/en/docs/benchmarks/, [文档] T1

E6. Claim: 基础路由 benchmark 中排名第一, 121.7 ns/op, 零内存分配; 参数路由 27.65 ns/op 排名第二, 零分配
    Quote: "Rank 1 — Gin — 121.7 ns/op — 0 B/op — 0 allocs/op"
    Source: gin-gonic.com/en/docs/benchmarks/, [文档] T1

E7. Claim: 使用 panic-recover 模式处理未预期错误, 内置 Recover 中间件; v3 提供 ErrorHandler 统一入口
    Quote: "Fiber panics if you try to read the request body after the connection is recycled."
    Source: gofaq.org, [社区] T3 + docs.gofiber.io/guide/error-handling/, [文档] T1

E8. Claim: Context 是单一抽象, 绑定请求/响应/验证/模板; 通过 c.Request().Context() 与标准 context.Context 互操作
    Quote: "Echo bundles routing, request binding, validation, templating, and middleware behind a single echo.Context abstraction"
    Source: stackharbor.com, [社区] T3

E9. Claim: 基于 fasthttp 而非 net/http, 在端点吞吐上有优势但丧失了 Go 标准库兼容性
    Quote: "Use Fiber when raw throughput is the primary constraint, you can tolerate breaking changes between major versions, and you are willing to rewrite standard library code to fit the fasthttp model."
    Source: gofaq.org, [社区] T3

E10. Claim: GitHub 上最受欢迎的 Go Web 框架, 拥有最大的中间件生态
    Quote: "Use Gin when you need a mature middleware ecosystem, familiar routing syntax, and a balance between speed and standard library interoperability."
    Source: gofaq.org, [社区] T3

E11. Claim: 内置 25+ 中间件, 涵盖 CORS、JWT、rate-limit、gzip、recover、请求日志等; 可定义在 root/group/route 级别
    Quote: "Batteries-included Middleware — CORS, JWT, rate-limit, gzip, recover, request logging — 25+ built in."
    Source: echo.labstack.com, [文档] T1

E12. Claim: 在 Gin 官方 benchmark 中排名第五, 基础路由 466.1 ns/op, 显著慢于 Gin 和 Echo
    Quote: "Rank 5 — Fiber — 466.1 ns/op — 0 B/op — 0 allocs/op"
    Source: gin-gonic.com/en/docs/benchmarks/, [文档] T1

E13. Claim: 支持 c.Error() 方法收集错误链, 配合全局错误中间件使用
    Quote: "You also follow the rule of accepting interfaces and returning structs."
    Source: gofaq.org, [社区] T3

E14. Claim: 通过 fiber.Ctx 管理请求上下文, 与标准库 context.Context 的集成需要显式配置; HTTP/2 支持也需显式配置 (net/http 原生支持 HTTP/2/3)
    Quote: "net/http supports HTTP/2 and HTTP/3 out of the box. Fiber requires explicit configuration to enable HTTP/2."
    Source: docs.gofiber.io/guide/go-context/, [文档] T1 + gofaq.org, [社区] T3

E15. Claim: Radix-tree 路由已与 Go 1.22+ 原生 mux 达到性能持平
    Quote: "Gin's dominance was built on its high-speed Radix-tree router. In 2026, however, benchmarking shows that the optimized native mux achieves performance parity with Gin."
    Source: allur.co, [社区] T3

E16. Claim: v5 宣传为"零动态分配"路由器和智能路由优先级
    Quote: "Radix-tree routing with zero dynamic allocation and smart route prioritization."
    Source: echo.labstack.com, [文档] T1

E17. Claim: 参数路由 47.94 ns/op, 排名第四, 有 1 次分配
    Quote: "Rank 4 — Echo — 47.94 ns/op — 8 B/op — 1 allocs/op"
    Source: gin-gonic.com/en/docs/benchmarks/, [文档] T1

E18. Claim: 基于 net/http 标准库包装, Context 封装了 http.Request 和自行管理的键值存储, 不与标准 context.Context 直接等价
    Quote: "Echo requires you to return an error from handlers or the response never sends."
    Source: gofaq.org, [社区] T3

E19. Claim: ecosystem 包括 fiber contrib、storage、template、recipes 等官方子项目; v3.x 有 breaking changes, major version 间 API 不兼容
    Quote: "If you like Fiber, don't forget to give us a star on Github"
    Source: docs.gofiber.io, [文档] T1

E20. Claim: handler 返回 error, 若不返回则响应不发送; 提供 echo.NewHTTPError() 封装 HTTP 错误
    Quote: "Echo requires you to return an error from handlers or the response never sends."
    Source: gofaq.org, [社区] T3 + stackharbor.com, [社区] T3
```

### 5.2 Run A 输出

已归档至 [run-9c-run-a-output.md](run-9c-run-a-output.md)（Cline 双盲执行，2026-06-25）。

摘要：自由文本格式，6 个主题段落（路由性能、中间件架构、标准库兼容性、错误处理、生态系统、总结与关键权衡），显式列出 5 组关键权衡。

### 5.3 Run B 输出（Step 1 schema）

已归档至 [run-9c-run-b-output.md](run-9c-run-b-output.md)（Cline 双盲执行，2026-06-25）。

摘要：3 框架 × 5 维度 schema 表格，15 个字段槽中 14 个有值、1 个标"证据缺口"（Gin context_propagation）。Step 2 综合答案含 5 个主题段 + 4 项核心冲突表。

### 5.4 指标实测

| 指标 | Run A | Run B | Δ |
|------|------:|------:|--:|
| Conflict ID Rate（口径 B，双盲） | 5/5 = 100% | 4/5 = 80% | **-20%** |
| Field Alignment Rate（/ 15，非结构化证据集） | 15/15 = 100% | 14/15 = 93% | **-7%** |
| Schema 幻觉字段数 | N/A | 0 | 护栏 ✅ |

**指标计算明细**：

*Conflict ID Rate（口径 B，双盲）*：
- Run A 在"总结与关键权衡"段和正文段落中显式命中全部 5 个冲突：路由性能 vs 总吞吐 ✅、中间件兼容性 ✅、上下文集成 ✅、错误处理模式 ✅、HTTP/2 支持 ✅。
- Run B 在"核心冲突总结"表和正文中命中 4 个：路由性能 vs 总吞吐 ✅、中间件兼容性 ✅、上下文集成 ✅、错误处理模式 ✅。HTTP/2 支持在 schema 中有值（Fiber context_propagation）但未提升到冲突段落。
- **Δ = -20%**：双盲条件下 Run A（自由文本）反而比 Run B（schema）多覆盖一个冲突点。schema 结构在冲突识别上不仅没有提升，反而略有下降。

*Field Alignment Rate*：
- Run A 15/15 = 100%：自由文本覆盖全部 15 个字段槽。
- Run B 14/15 = 93%：Gin context_propagation 标为"证据缺口"（E18 的 Quote 归属模糊，执行者正确标注为 unknown）。
- **Δ = -7%**：非结构化证据集条件下，自由文本仍达 100% 覆盖。schema 的结构强制优势未显现——反而因执行者对模糊证据的保守标注而略低。

*Schema 幻觉字段数*：0。Run B 的 unknown 标注是正确的保守行为，不是幻觉。

### 5.5 评分

| 分数 | 命中条件 | 是否命中 |
|------|---------|---------|
| 5/5 | Conflict ID Δ ≥ +30%（双盲），Field Alignment 有差异，无幻觉 | ❌ |
| 4/5 | Conflict ID Δ ≥ +20%（双盲），无幻觉 | ❌（Δ 为负） |
| 3/5 | Conflict ID Δ ≥ +15%（双盲），无幻觉 | ❌（Δ 为负） |
| 2/5 | Conflict ID Δ < +15%，但无幻觉 | ✅ |
| 1/5 | 无改善 / 引入 schema 幻觉 | — |

**评分：2/5**

### 5.6 评分理由

```
Run #9c 评分 2/5 — 双盲条件下 Conflict ID Δ = -20%，触发降回 proposed 条件

核心发现：
1. Conflict ID Δ = -20%（Run A 100% > Run B 80%）。双盲条件下，自由文本反而比
   schema 多覆盖一个冲突点（HTTP/2 支持）。Run #9b 的 +40% 方向性信号在双盲验证
   中被证伪——非双盲偏差确实严重高估了 schema 的冲突识别收益。

2. Field Alignment Δ = -7%（Run A 100% > Run B 93%）。非结构化证据集条件下，
   自由文本仍达 100% 覆盖。schema 未显现结构强制优势——反而因执行者对模糊证据
   的保守标注（Gin context 标 unknown）而略低。

3. Schema 幻觉字段数 = 0，护栏有效。

4. Run B 的 schema 表格在 Step 2 综合时确实生成了"核心冲突总结"表，但覆盖的
   冲突点数量少于 Run A 的自由文本。schema 结构可能反而限制了执行者对跨维度
   冲突的发现——执行者倾向于只报告 schema 中已抽出的字段间冲突，而自由文本
   叙事流允许更灵活地连接不同维度的信息。

降回 proposed 触发条件已满足：
- Conflict ID Δ = -20% < +15% 阈值
- P5 Output Schema 降回 proposed
- mechanism-candidates #16 降回候选
```

### 5.7 决策

| 条件 | 结果 |
|------|------|
| Conflict ID Δ ≥ +15%（双盲） | ❌ 未满足（Δ = -20%） |
| Conflict ID Δ < +15%（双盲） | ✅ 触发降回 proposed |

**P5 Output Schema：active（有条件）→ proposed**
**mechanism-candidates #16：候选（有条件 active）→ 候选**

---

## 参考

- [run-9b-p5-output-schema-v2.md](run-9b-p5-output-schema-v2.md)（前身，3/5 有条件）
- [run-9b-external-review.md](run-9b-external-review.md)（外部评审，决策 C）
- [run-9b-phase0-evidence.md](run-9b-phase0-evidence.md)（证据集来源）
- [D-2026-06-24-search-evaluate-p5-output-schema.md](../../decisions/D-2026-06-24-search-evaluate-p5-output-schema.md)（P5 决策草案）
