# Run #9b — P5 Output Schema 多实体对比验证

- **日期**：2026-06-25（实验框架落地，执行待启动）
- **主题**：P5 Output Schema 结构化抽取 — 多实体对比型证据集
- **前身**：[run-9-p5-output-schema.md](run-9-p5-output-schema.md)（1/5 设计失败，单源列表型证据集无法触发 P5 核心收益）
- **背景决策**：[D-2026-06-24-search-evaluate-p5-output-schema.md](../../decisions/D-2026-06-24-search-evaluate-p5-output-schema.md)（proposed，维持）
- **改造项**：Phase 4 由「证据 → 自由文本答案」改为「证据 → 结构化中间表示（schema）→ 自由文本答案」

---

## 0. Run #9 失败诊断与 Run #9b 修正

### 0.1 Run #9 失败根因

| 问题 | Run #9 表现 | Run #9b 修正 |
|------|------------|-------------|
| 证据集单源 | 1 个 URL × 4 条同源 claim | 3 个独立框架 × 多个独立来源 |
| 问题类型不触发 schema 收益 | 列表型（"有哪些做法"） | 对比型（"A vs B vs C 跨维度差异"） |
| Claim Coverage 天花板已满 | Run A 自由文本 100% 覆盖 | 多实体跨维度，自由文本难以对齐全部字段 |
| Conflict ID 分母为 0 | E1~E4 同源无冲突 | 3 框架在不同维度有自然性能冲突 |
| 无跨源字段对齐指标 | 未设计 | 新增 Field Alignment Rate |

### 0.2 核心设计变更

| 维度 | Run #9 | Run #9b |
|------|--------|---------|
| sub-question | "Go context 包如何防止 goroutine 泄漏" | "对比 Gin、Echo、Fiber 三个 Go web 框架" |
| 问题类型 | 列表型 | 对比型 |
| 实体数 | 1（context 包） | 3（Gin / Echo / Fiber） |
| 维度数 | 1（防泄漏做法） | 5（路由性能 / 中间件 / 生态 / 上下文 / 错误处理） |
| 字段槽 | 15（单实体展开） | 15（3 实体 × 5 维度） |
| 证据来源 | 复用 Run #6（单源） | 新跑搜索（多源） |
| 冲突 ground truth | 无（分母 0） | 有（框架间自然性能冲突） |
| 新增指标 | — | Field Alignment Rate |

---

## 1. 实验设计

### 1.1 严格单变量

| 维度 | Run A（Control） | Run B（Treatment） |
|------|-----------------|-------------------|
| Phase 1 plan | 标准（无 schema 声明） | 标准（无 schema 声明） |
| Phase 2 search/fetch | **执行**（同一份 query 集 + 同一份证据） | **不重复执行**（复用 Run A 的证据集） |
| Phase 3 P3 三档 | 不动（沿用 Run A 抽出的 Claim/Quote） | 不动 |
| **Phase 4 综合** | **直接生成自由文本答案** | **先按 schema 抽字段（4.1）→ 再综合（4.2）** |
| schema 声明位置 | N/A | Phase 4 内嵌（执行提示词中给出） |
| 证据集 | Phase 0 收集的同一份 | 同一份 |
| 其他变量 | 不引入 P6 / M-22 | 同 |

### 1.1.1 执行主体声明（designated_executor）

> **约束来源**：project-rules.md §约束 5（执行主体边界）+ mechanism-candidates #23

| 步骤 | designated_executor | 理由 |
|------|---------------------|------|
| Phase 0 §2.1 搜索执行（Phase 1~3） | **Cline + SKILL** | 需要 Goggle 过滤 / P3 三元组抽取 / 三档模式，TRAE agent 的 WebSearch/WebFetch 无法替代 |
| Phase 0 §2.2 Ground Truth 标注 | **TRAE agent** | 基于已产出的 P3 证据集做事实标注，不涉及 SKILL 机制 |
| Phase 1 Run A（自由文本综合） | **TRAE agent** | 输入已固定的 P3 证据集，只改 Phase 4 综合方式，不涉及搜索 |
| Phase 1 Run B（schema 抽取 + 综合） | **TRAE agent** | 同上 |
| 评分 | **TRAE agent** | 对照 Ground Truth 计算指标 |

**违反时的回滚规则**：若 TRAE agent 在 designated_executor = Cline + SKILL 的步骤中直接使用了 WebSearch/WebFetch，产出的证据全部作废，必须交付提示词给用户在 Cline 中重新执行。

### 1.2 Schema 位置决策

沿用 Run #9 决策：Phase 4 单点改造，不动 Phase 1。严格单变量。

### 1.3 多实体对比型问题设计

**sub-question**：

> Compare Gin, Echo, and Fiber as Go web frameworks across the following 5 dimensions:
> 1. Routing performance (benchmark / radix tree / memory)
> 2. Middleware mechanism (chain model / execution order)
> 3. Ecosystem maturity (community size / plugins / maintenance)
> 4. Context propagation (request-scoped state / context.Context integration)
> 5. Error handling (recovery / error grouping / HTTP error mapping)

**为什么选这个问题**：

| 设计意图 | 如何触发 |
|---------|---------|
| 多实体（3 框架） | 每个框架有独立官方文档 + 社区来源 → 跨源对齐 |
| 多维度（5 维度） | 同一框架在不同维度有不同表现 → 字段槽密集 |
| 自然性能冲突 | Gin 路由快但中间件不如 Echo 灵活；Fiber 基于 fasthttp 不兼容 net/http | Conflict ID 分母 > 0 |
| 英文 query | 避免中文 fetch Tier C 瓶颈干扰（Run #8a 已证明） | 基础设施层不拖后腿 |

### 1.4 Schema 模板（Run B 专用）

```yaml
frameworks:
  - name: <Gin / Echo / Fiber>
    dimensions:
      - dimension: routing_performance
        value: <一句话结论>
        evidence_quality: <verbatim / paraphrased / unknown>
        source: [<Ei>, ...]
      - dimension: middleware_mechanism
        value: <一句话结论>
        evidence_quality: <verbatim / paraphrased / unknown>
        source: [<Ei>, ...]
      - dimension: ecosystem_maturity
        value: <一句话结论>
        evidence_quality: <verbatim / paraphrased / unknown>
        source: [<Ei>, ...]
      - dimension: context_propagation
        value: <一句话结论>
        evidence_quality: <verbatim / paraphrased / unknown>
        source: [<Ei>, ...]
      - dimension: error_handling
        value: <一句话结论>
        evidence_quality: <verbatim / paraphrased / unknown>
        source: [<Ei>, ...]
```

字段填空规则：
- 字段无证据 → 留空或标 `unknown`（禁止编造）
- `value` 允许在 Quote 范围内轻度改写以提取语义
- `source` 必须指向至少一条 P3 id
- `evidence_quality` 标注该字段是 verbatim 引用还是改写

---

## 2. 执行流程

### Phase 0：证据收集 + Ground Truth 标注

**目标**：跑一次完整搜索（Phase 1~3），产出 P3 三元组证据集，并固定 ground truth。

#### 2.1 Phase 0 搜索执行

按 search-orchestrator SKILL.md L2 流程执行：

1. **Phase 1 Plan**：分解为 3 个 sub-question（每个框架一个），每个 sub-question 覆盖 5 个维度
2. **Phase 2 Search/Fetch**：
   - 每个框架搜 2~3 路 query（官方文档 + benchmark + 社区对比）
   - fetch_content top 2~3 条
3. **Phase 3 P3**：按三档模式抽取 Claim / Quote / Source 三元组

#### 2.2 Phase 0 Ground Truth 标注

证据收集完成后、Phase 1 A/B 测试前，固定以下 ground truth：

##### 2.2.1 字段槽全集（3 实体 × 5 维度 = 15 槽）

| 框架 | routing | middleware | ecosystem | context | error_handling |
|------|---------|------------|-----------|---------|----------------|
| Gin | G-R | G-M | G-E | G-C | G-H |
| Echo | E-R | E-M | E-E | E-C | E-H |
| Fiber | F-R | F-M | F-E | F-C | F-H |

每个槽位的 ground truth 值在 Phase 0 证据收集后填入（基于证据中可抽出的事实）。

##### 2.2.2 Conflict Ground Truth

预声明框架间的自然冲突点（基于先验知识，Phase 0 证据收集后校正）：

| 冲突点 | 预期冲突 |
|--------|---------|
| 路由性能 | Fiber (fasthttp) 声称最快 vs Gin/Echo (net/http) 基准测试差异 |
| 中间件 | Gin 线性链 vs Echo 灵活分组 vs Fiber 兼容 fasthttp 中间件 |
| 生态 | Gin 最成熟 vs Fiber 最新但增长快 |
| 上下文 | Gin 用自定义 Context vs Echo 用标准 context.Context vs Fiber 用 fasthttp.RequestCtx |
| 错误处理 | 三者 recovery 中间件实现差异 |

##### 2.2.3 Distinct Claim 全集

Phase 0 证据收集后，从 P3 三元组中抽取全部 distinct claim 并编号。每个 claim 标注归属框架和维度。

### Phase 1：A/B 测试

**前置条件**：Phase 0 完成，证据集与 ground truth 已固定。

#### 2.3 Run A（Control）— 自由文本综合

输入：Phase 0 产出的 P3 三元组证据集（只读）。
任务：按当前 SKILL.md §4.1 / §4.3 生成自由文本答案。
禁止：schema / 表格 / 二阶段中间表示。

#### 2.4 Run B（Treatment）— schema 抽取 + 综合

输入：与 Run A 完全相同的 P3 三元组证据集（只读）。
任务：
- Step 4.1：按 §1.4 schema 模板抽字段
- Step 4.2：基于 schema 生成自由文本答案

---

## 3. 核心指标（5 项）

| 指标 | 定义 | 计算方式 | Run A | Run B |
|------|------|---------|-------|-------|
| **Claim Coverage** | 答案中 distinct claim 数 / 证据中可抽出 distinct claim 总数 | 审阅人对比 | — | — |
| **Field Alignment Rate** | 答案中跨实体可对齐字段数 / 15 字段槽 | 审阅人检查每个框架是否覆盖每个维度 | — | — |
| **Conflict Identification Rate** | 答案中显式指出的框架间冲突数 / ground truth 冲突数 | 审阅人对照 §2.2.2 | — | — |
| **Information Loss Rate** | 证据中存在但答案中未提及的字段槽数 / 15 | 同上 | — | — |
| **Output Length Delta** | Run B 最终答案 token 数 / Run A 最终答案 token 数 | **仅比较 Step 4.2 综合答案，排除 Step 4.1 YAML 中间表示** | 基线 (1×) | — |

### 3.1 Field Alignment Rate 详解

**为什么这个指标是 Run #9b 的核心**：

P5 决策草案 §Q1 痛点 #1（claim 粒度不一致）和 #2（不同来源难比较）的核心表现是：自由文本答案中，不同框架的同一维度信息散落在不同段落，难以横向对齐。

Field Alignment Rate 衡量：
- Run A（自由文本）：答案中是否每个框架都覆盖了每个维度？还是某些框架只提了 2~3 个维度？
- Run B（schema）：schema 结构天然强制 3×5 矩阵完整性，每个槽位要么有值要么标 unknown

**计算口径**：
- 分母 = 15（3 框架 × 5 维度）
- 分子 = 答案中明确覆盖的字段槽数（自由文本中需找到对应框架+维度的论述；schema 中检查非空槽位）
- 满分 = 15/15 = 100%

**预期**：Run A 自由文本由于叙事流限制，大概率某些框架某些维度会被遗漏或一笔带过；Run B schema 结构强制覆盖。

### 3.2 评分尺度

| 分数 | 条件 |
|------|------|
| 5/5 | Field Alignment 提升 ≥ 20%，Conflict ID 提升 ≥ 30%，Info Loss 下降 ≥ 30%，长度 delta < 1.3× |
| 4/5 | Field Alignment 提升 ≥ 10% 且 Info Loss 下降 ≥ 20% |
| 3/5 | 任一主指标显著提升（≥ 15%），无明显退化 |
| 2/5 | 改善幅度 < 10%，但长度无失控 |
| 1/5 | 无改善 / Output Length 失控（≥ 2×）/ 抽 schema 引入幻觉字段 |

---

## 4. 执行提示词

### 4.1 Phase 0 搜索执行提示词

```
按 search-orchestrator SKILL.md L2 流程执行以下调研任务。

【输出文件位置】将完整调研结果保存至：
docs/search-orchestrator/experiments/run-9b-phase0-evidence.md

主问题：Compare Gin, Echo, and Fiber as Go web frameworks across
5 dimensions: routing performance, middleware mechanism, ecosystem
maturity, context propagation, error handling.

分解为 3 个 sub-question：
- SQ1: Gin 的路由性能、中间件、生态、上下文、错误处理
- SQ2: Echo 的同 5 个维度
- SQ3: Fiber 的同 5 个维度

每个 sub-question 搜 2~3 路 query（英文）：
1. 官方文档 / README
2. benchmark / performance comparison
3. 社区对比文章

fetch_content top 2~3 条。
Phase 3 按 P3 三档模式抽取 Claim / Quote / Source 三元组。
```

### 4.2 Run A（Control）提示词

```
Run #9b Run A — Phase 4 基线（自由文本综合）

不激活 search-orchestrator SKILL.md 中的任何 P5 schema 规则，仅按
§4.1 现有结构生成答案。

【输入】sub-question + P3 三元组证据集（Phase 0 产出，证据为只读）。

sub-question: Compare Gin, Echo, and Fiber as Go web frameworks
across 5 dimensions: routing performance, middleware mechanism,
ecosystem maturity, context propagation, error handling.

P3 三元组证据：
[Phase 0 产出后粘贴此处]

【任务】按当前 SKILL.md §4.1 / §4.3 输出格式生成最终回答。

【禁止】
- 禁止编造任何不在证据中的事实
- 禁止使用 schema / 表格 / 二阶段中间表示——本次为基线，直接综合
```

### 4.3 Run B（Treatment）提示词

```
Run #9b Run B — Phase 4 二阶段（schema 抽取 + 综合）

不动 Phase 1/2/3。仅 Phase 4 改造为二阶段：先抽 schema，再综合。

【输入】（与 Run A 完全相同，证据为只读）

sub-question: Compare Gin, Echo, and Fiber as Go web frameworks
across 5 dimensions: routing performance, middleware mechanism,
ecosystem maturity, context propagation, error handling.

P3 三元组证据：
[与 Run A 相同]

【任务】

Step 4.1 —— Schema 抽取（Treatment 新增步骤）

按以下 schema 模板，从证据中抽字段。每个框架对应一组 5 维度字段。

```yaml
frameworks:
  - name: <Gin / Echo / Fiber>
    dimensions:
      - dimension: routing_performance
        value: <一句话结论>
        evidence_quality: <verbatim / paraphrased / unknown>
        source: [<Ei>, ...]
      - dimension: middleware_mechanism
        value: <一句话结论>
        evidence_quality: <verbatim / paraphrased / unknown>
        source: [<Ei>, ...]
      - dimension: ecosystem_maturity
        value: <一句话结论>
        evidence_quality: <verbatim / paraphrased / unknown>
        source: [<Ei>, ...]
      - dimension: context_propagation
        value: <一句话结论>
        evidence_quality: <verbatim / paraphrased / unknown>
        source: [<Ei>, ...]
      - dimension: error_handling
        value: <一句话结论>
        evidence_quality: <verbatim / paraphrased / unknown>
        source: [<Ei>, ...]
```

抽取规则（必须遵守）：
1. 字段无证据 → 留空或标 unknown。禁止编造。
2. value 允许在 Quote 范围内轻度改写以提取语义。
3. source 必须指向至少一条 P3 id。
4. 不限定 frameworks 数量——证据里有几个独立框架就抽几个。
5. evidence_quality 标注该字段是 verbatim 引用还是改写。

Step 4.2 —— 综合答案

基于 Step 4.1 的 schema，生成最终自由文本答案：

输出结构：
## Conclusion
[1-3 句直接回答 sub-question]

## Framework Comparison
### Gin
- 路由性能：[value]
- 中间件：[value]
- 生态：[value]
- 上下文：[value]
- 错误处理：[value]

### Echo
...

### Fiber
...

## Conflicts & Trade-offs
[框架间的冲突与权衡]

## Sources by Credibility
[沿用 §4.1 现有格式]

## Confidence
[High / Medium / Low + 理由]

【禁止】
- 禁止编造 schema 字段
- 禁止在 schema 中表达证据集中不存在的"冲突"
```

---

## 5. 结果记录区（待执行后填入）

### 5.1 Phase 0 证据集

证据集已归档至 [run-9b-phase0-evidence.md](run-9b-phase0-evidence.md)（Cline + SKILL 执行产出，2026-06-25）。

证据集摘要：
- 3 个 sub-question（Gin / Echo / Fiber），每个 5 个维度
- 共 22 条 distinct claim（含 Claim/Quote/Source 三元组）
- 7 个独立来源（3 个 T1 官方文档 + 4 个 T3 社区/博客）
- 4 个显式冲突点

### 5.2 Phase 0 Ground Truth

#### 5.2.1 字段槽全集（3 实体 × 5 维度 = 15 槽）

| 框架 | routing | middleware | ecosystem | context | error_handling |
|------|---------|------------|-----------|---------|----------------|
| Gin | Radix-tree, 121.7 ns/op 基础路由第1, 27.65 ns/op 参数路由第2, 零分配; 与 Go 1.22+ 原生 mux 持平 | c.Next() 链式, 不调用则链终止 | GitHub 最受欢迎, 最大中间件生态 | gin.Context 封装 http.Request + 自行管理键值存储, 不与标准 context.Context 直接等价 | c.Error() 收集错误链 + 全局错误中间件 |
| Echo | Radix-tree, 127.5 ns/op 基础路由第2, 47.94 ns/op 参数路由第4(1 alloc); v5 零动态分配 | 25+ 内置中间件(CORS/JWT/rate-limit/gzip/recover), root/group/route 级别 | v5.2.1, 32.5k stars, 官方 echo-jwt/echo-contrib/echo-swagger | echo.Context 单一抽象绑定请求/响应/验证/模板, 通过 c.Request().Context() 互操作标准 context | handler 返回 error, 不返回则响应不发送; echo.NewHTTPError() 封装 |
| Fiber | Gin benchmark 第5(466.1 ns/op); TechEmpower Plaintext 1198万 rps; 基于 fasthttp 非 net/http | Express.js 风格 c.Next(), 30+ contrib 中间件; fasthttp 不兼容 net/http handler 签名 | fiber contrib/storage/template/recipes 官方子项目; v3.x 有 breaking changes | fiber.Ctx 管理上下文, 需显式配置集成标准 context; HTTP/2 需显式配置(net/http 原生支持) | panic-recover 模式, 内置 Recover 中间件; v3 ErrorHandler 统一入口 |

#### 5.2.2 Conflict Ground Truth

| 冲突点 | ground truth |
|--------|-------------|
| 路由性能排名 vs 总吞吐 | Gin 基础路由第1(121.7 ns/op), Fiber 第5(466.1 ns/op); 但 Fiber TechEmpower 1198万 rps 远超两者 — 路由查找性能 ≠ 总吞吐 |
| 中间件兼容性 | Gin/Echo 基于 net/http 可复用标准中间件; Fiber 基于 fasthttp 不兼容 net/http handler 签名, 生态断层 |
| 上下文与标准库集成 | Gin gin.Context 不等价标准 context; Echo 通过 c.Request().Context() 互操作; Fiber 需显式配置 |
| 错误处理模式 | Gin 用 c.Error() 收集 + c.Next() 传递; Echo 用 return error; Fiber 用 panic/recover — 三者模式显著不同 |
| HTTP/2 支持 | Gin/Echo 继承 net/http 原生 HTTP/2/3; Fiber 需显式配置 |

#### 5.2.3 Distinct Claim 全集

| Claim ID | 内容 | 归属框架 | 维度 |
|---------|------|---------|------|
| C1 | Gin 基础路由 benchmark 第1, 121.7 ns/op, 零分配 | Gin | routing |
| C2 | Gin 参数路由第2, 27.65 ns/op, 零分配 | Gin | routing |
| C3 | Gin Radix-tree 与 Go 1.22+ 原生 mux 性能持平 | Gin | routing |
| C4 | Gin 中间件链基于 c.Next(), 不调用则链终止 | Gin | middleware |
| C5 | Gin GitHub 最受欢迎, 最大中间件生态 | Gin | ecosystem |
| C6 | gin.Context 封装 http.Request + 自行管理键值, 不等价标准 context.Context | Gin | context |
| C7 | Gin 支持 c.Error() 收集错误链 + 全局错误中间件 | Gin | error_handling |
| C8 | Echo 基础路由 127.5 ns/op, 零分配, 第2 | Echo | routing |
| C9 | Echo 参数路由 47.94 ns/op, 1 alloc, 第4 | Echo | routing |
| C10 | Echo v5 零动态分配路由器 + 智能路由优先级 | Echo | routing |
| C11 | Echo 内置 25+ 中间件 (CORS/JWT/rate-limit/gzip/recover) | Echo | middleware |
| C12 | Echo 中间件可定义在 root/group/route 级别 | Echo | middleware |
| C13 | Echo v5.2.1, 32.5k stars, 官方 echo-jwt/echo-contrib/echo-swagger | Echo | ecosystem |
| C14 | echo.Context 单一抽象, 通过 c.Request().Context() 互操作标准 context | Echo | context |
| C15 | Echo handler 返回 error, 不返回则响应不发送 | Echo | error_handling |
| C16 | Fiber Gin benchmark 第5, 466.1 ns/op | Fiber | routing |
| C17 | Fiber TechEmpower Plaintext 1198万 rps | Fiber | routing |
| C18 | Fiber JSON 序列化 236万 rps | Fiber | routing |
| C19 | Fiber 基于 fasthttp 非 net/http, 丧失标准库兼容性 | Fiber | routing/ecosystem |
| C20 | Fiber 中间件仿 Express.js, 30+ contrib; fasthttp 不兼容 net/http handler | Fiber | middleware |
| C21 | fiber.Ctx 管理上下文, 需显式配置集成标准 context; HTTP/2 需显式配置 | Fiber | context |
| C22 | Fiber panic-recover + 内置 Recover 中间件; v3 ErrorHandler 统一入口 | Fiber | error_handling |

### 5.3 Run A 输出

```
## Conclusion

Gin、Echo、Fiber 三个 Go Web 框架各有侧重：Gin 在路由性能和生态成熟度上占优，Echo 提供最全面的内置功能集，Fiber 基于 fasthttp 在纯吞吐场景有优势但牺牲了标准库兼容性。

## Framework Comparison

Gin 使用 Radix-tree 路由，在基础路由 benchmark 中以 121.7 ns/op 排名第一，参数路由 27.65 ns/op 排名第二，均为零内存分配。不过 Gin 的路由优势在 2026 年已被 Go 1.22+ 原生 mux 追平。Gin 的中间件链基于 c.Next() 调用机制，若不调用则链终止。作为 GitHub 上最受欢迎的 Go Web 框架，Gin 拥有最大的中间件生态。在上下文传播方面，gin.Context 封装了 http.Request 并自行管理键值存储，不与标准 context.Context 直接等价。错误处理上，Gin 支持 c.Error() 方法收集错误链，配合全局错误中间件使用。

Echo 同样使用 Radix-tree 路由，基础路由 127.5 ns/op 排名第二，零分配；但参数路由 47.94 ns/op 排名第四且有 1 次分配。Echo v5 宣传为零动态分配路由器并具备智能路由优先级。Echo 的中间件是其强项，内置 25+ 中间件涵盖 CORS、JWT、rate-limit、gzip、recover 和请求日志等，且可定义在 root、group 或 route 级别。Echo v5.2.1 在 GitHub 上有 32.5k stars，官方维护 echo-jwt、echo-contrib（含 Prometheus/Casbin/Jaeger/pprof/Zipkin）、echo-swagger 等包。echo.Context 是单一抽象，绑定请求/响应/验证/模板，可通过 c.Request().Context() 与标准 context.Context 互操作。Echo 要求 handler 返回 error，若不返回则响应不发送，并提供 echo.NewHTTPError() 封装 HTTP 错误。

Fiber 的情况比较矛盾。在 Gin 官方 benchmark 中 Fiber 排名第五，基础路由 466.1 ns/op，显著慢于 Gin 和 Echo。但在 TechEmpower Plaintext 测试中 Fiber 达到 1198 万 rps，JSON 序列化 236 万 rps，远超基于 net/http 的框架。这是因为 Fiber 基于 fasthttp 而非 net/http，在连接复用和纯吞吐场景有优势，但路由查找本身反而较慢。Fiber 的中间件 API 仿 Express.js 设计，使用 c.Next() 链式调用，拥有 30+ contrib 中间件。但 fasthttp 不兼容 net/http 标准 handler 签名，现有 net/http 中间件无法直接复用，造成生态断层。Fiber 的 ecosystem 包括 contrib、storage、template、recipes 等官方子项目，但 v3.x 存在 breaking changes。fiber.Ctx 管理请求上下文，与标准 context.Context 的集成需要显式配置。HTTP/2 支持也需要显式配置，而 Gin 和 Echo 继承 net/http 原生支持 HTTP/2/3。错误处理方面，Fiber 使用 panic-recover 模式，内置 Recover 中间件，v3 提供 ErrorHandler 统一入口。

## Conflicts & Trade-offs

最显著的冲突是路由性能排名与总吞吐的反差：Gin 在路由查找 benchmark 中第1，Fiber 第5，但 Fiber 在 TechEmpower 纯吞吐测试中远超两者。原因是路由查找性能 ≠ 总吞吐——Fiber 的 fasthttp 在连接复用场景有优势，但路由查找本身较慢。

第二个冲突是标准库兼容性：Gin 和 Echo 都基于 net/http，可复用标准中间件和 HTTP/2/3 支持；Fiber 基于 fasthttp，不兼容 net/http handler 签名，造成生态断层。

第三个冲突是错误处理模式的差异：Gin 用 c.Error() 收集 + c.Next() 传递，Echo 用 return error 模式，Fiber 用 panic/recover。三者模式显著不同但都是可工作的。

## Sources by Credibility

- gin-gonic.com/en/docs/benchmarks/ — 官方文档 T1
- docs.gofiber.io/extra/benchmarks/ — 官方文档 T1
- echo.labstack.com/ — 官方文档 T1
- gofaq.org/performance-comparison/ — 社区 T3
- allur.co/native-routing-vs-gin-and-fiber/ — 博客 T3
- stackharbor.com/golang-echo-router-pattern/ — 博客 T3

## Confidence

Medium-High — 路由 benchmark 和官方文档证据充分（T1 覆盖率高），但生态成熟度维度缺乏可量化指标，依赖社区来源。
```

### 5.4 Run B 输出（Step 4.1 schema）

```yaml
frameworks:
  - name: Gin
    dimensions:
      - dimension: routing_performance
        value: Radix-tree 路由, 基础路由 121.7 ns/op 排名第1, 参数路由 27.65 ns/op 排名第2, 零分配; 与 Go 1.22+ 原生 mux 性能持平
        evidence_quality: verbatim
        source: [gin-gonic.com/en/docs/benchmarks/, allur.co]
      - dimension: middleware_mechanism
        value: c.Next() 链式调用机制, 不调用则链终止
        evidence_quality: verbatim
        source: [gofaq.org]
      - dimension: ecosystem_maturity
        value: GitHub 最受欢迎的 Go Web 框架, 拥有最大的中间件生态
        evidence_quality: paraphrased
        source: [gofaq.org]
      - dimension: context_propagation
        value: gin.Context 封装 http.Request + 自行管理键值存储, 不与标准 context.Context 直接等价
        evidence_quality: paraphrased
        source: [gofaq.org]
      - dimension: error_handling
        value: c.Error() 方法收集错误链 + 全局错误中间件
        evidence_quality: paraphrased
        source: [gofaq.org]
  - name: Echo
    dimensions:
      - dimension: routing_performance
        value: Radix-tree 路由, 基础路由 127.5 ns/op 排名第2 零分配, 参数路由 47.94 ns/op 排名第4 有1次分配; v5 零动态分配路由器 + 智能路由优先级
        evidence_quality: verbatim
        source: [gin-gonic.com/en/docs/benchmarks/, echo.labstack.com]
      - dimension: middleware_mechanism
        value: 内置 25+ 中间件 (CORS/JWT/rate-limit/gzip/recover/请求日志), 可定义在 root/group/route 级别
        evidence_quality: verbatim
        source: [echo.labstack.com]
      - dimension: ecosystem_maturity
        value: v5.2.1, GitHub 32.5k stars, 官方维护 echo-jwt/echo-contrib(Prometheus/Casbin/Jaeger/pprof/Zipkin)/echo-swagger
        evidence_quality: verbatim
        source: [echo.labstack.com]
      - dimension: context_propagation
        value: echo.Context 单一抽象绑定请求/响应/验证/模板, 通过 c.Request().Context() 与标准 context.Context 互操作
        evidence_quality: paraphrased
        source: [stackharbor.com]
      - dimension: error_handling
        value: handler 返回 error, 不返回则响应不发送; echo.NewHTTPError() 封装 HTTP 错误
        evidence_quality: verbatim
        source: [gofaq.org, stackharbor.com]
  - name: Fiber
    dimensions:
      - dimension: routing_performance
        value: Gin benchmark 第5 (466.1 ns/op); TechEmpower Plaintext 1198万 rps, JSON 序列化 236万 rps; 基于 fasthttp 非 net/http
        evidence_quality: verbatim
        source: [gin-gonic.com/en/docs/benchmarks/, docs.gofiber.io/extra/benchmarks/]
      - dimension: middleware_mechanism
        value: Express.js 风格 c.Next() 链式调用, 30+ contrib 中间件; fasthttp 不兼容 net/http 标准 handler 签名
        evidence_quality: paraphrased
        source: [gofaq.org, docs.gofiber.io]
      - dimension: ecosystem_maturity
        value: fiber contrib/storage/template/recipes 官方子项目; v3.x 有 breaking changes, major version 间 API 不兼容
        evidence_quality: paraphrased
        source: [docs.gofiber.io]
      - dimension: context_propagation
        value: fiber.Ctx 管理上下文, 需显式配置集成标准 context; HTTP/2 需显式配置 (net/http 原生支持 HTTP/2/3)
        evidence_quality: paraphrased
        source: [docs.gofiber.io/guide/go-context/, gofaq.org]
      - dimension: error_handling
        value: panic-recover 模式, 内置 Recover 中间件; v3 提供 ErrorHandler 统一入口
        evidence_quality: verbatim
        source: [gofaq.org, docs.gofiber.io/guide/error-handling/]
```

### 5.5 Run B 输出（Step 4.2 综合）

```
## Conclusion

Gin、Echo、Fiber 三个 Go Web 框架各有侧重：Gin 在路由性能和生态成熟度上占优，Echo 提供最全面的内置功能集，Fiber 基于 fasthttp 在纯吞吐场景有优势但牺牲了标准库兼容性。

## Framework Comparison

### Gin
- 路由性能：Radix-tree 路由，基础路由 121.7 ns/op 排名第1，参数路由 27.65 ns/op 排名第2，零分配；与 Go 1.22+ 原生 mux 性能持平
- 中间件：c.Next() 链式调用机制，不调用则链终止
- 生态：GitHub 最受欢迎的 Go Web 框架，拥有最大的中间件生态
- 上下文：gin.Context 封装 http.Request + 自行管理键值存储，不与标准 context.Context 直接等价
- 错误处理：c.Error() 方法收集错误链 + 全局错误中间件

### Echo
- 路由性能：Radix-tree 路由，基础路由 127.5 ns/op 排名第2 零分配，参数路由 47.94 ns/op 排名第4 有1次分配；v5 零动态分配路由器 + 智能路由优先级
- 中间件：内置 25+ 中间件（CORS/JWT/rate-limit/gzip/recover/请求日志），可定义在 root/group/route 级别
- 生态：v5.2.1，GitHub 32.5k stars，官方维护 echo-jwt/echo-contrib（Prometheus/Casbin/Jaeger/pprof/Zipkin）/echo-swagger
- 上下文：echo.Context 单一抽象绑定请求/响应/验证/模板，通过 c.Request().Context() 与标准 context.Context 互操作
- 错误处理：handler 返回 error，不返回则响应不发送；echo.NewHTTPError() 封装 HTTP 错误

### Fiber
- 路由性能：Gin benchmark 第5（466.1 ns/op）；TechEmpower Plaintext 1198万 rps，JSON 序列化 236万 rps；基于 fasthttp 非 net/http
- 中间件：Express.js 风格 c.Next() 链式调用，30+ contrib 中间件；fasthttp 不兼容 net/http 标准 handler 签名
- 生态：fiber contrib/storage/template/recipes 官方子项目；v3.x 有 breaking changes，major version 间 API 不兼容
- 上下文：fiber.Ctx 管理上下文，需显式配置集成标准 context；HTTP/2 需显式配置（net/http 原生支持 HTTP/2/3）
- 错误处理：panic-recover 模式，内置 Recover 中间件；v3 提供 ErrorHandler 统一入口

## Conflicts & Trade-offs

路由性能排名与总吞吐的反差：Gin 路由查找第1（121.7 ns/op），Fiber 第5（466.1 ns/op），但 Fiber TechEmpower 1198万 rps 远超两者。路由查找性能 ≠ 总吞吐——Fiber 的 fasthttp 在连接复用场景有优势，但路由查找本身较慢。

标准库兼容性：Gin 和 Echo 基于 net/http，可复用标准中间件和 HTTP/2/3 支持；Fiber 基于 fasthttp，不兼容 net/http handler 签名，造成生态断层。

上下文与标准库集成：Gin gin.Context 不等价标准 context；Echo 通过 c.Request().Context() 互操作；Fiber 需显式配置。

错误处理模式：Gin 用 c.Error() 收集 + c.Next() 传递；Echo 用 return error；Fiber 用 panic/recover。三者模式显著不同但都是可工作的。

HTTP/2 支持：Gin/Echo 继承 net/http 原生 HTTP/2/3；Fiber 需显式配置。

## Sources by Credibility

- gin-gonic.com/en/docs/benchmarks/ — 官方文档 T1
- docs.gofiber.io/extra/benchmarks/ — 官方文档 T1
- echo.labstack.com/ — 官方文档 T1
- gofaq.org/performance-comparison/ — 社区 T3
- allur.co/native-routing-vs-gin-and-fiber/ — 博客 T3
- stackharbor.com/golang-echo-router-pattern/ — 博客 T3

## Confidence

Medium-High — 路由 benchmark 和官方文档证据充分（T1 覆盖率高），但生态成熟度维度缺乏可量化指标，依赖社区来源。
```

### 5.6 指标实测

| 指标 | Run A | Run B | Δ | 备注 |
|------|------:|------:|--:|------|
| Claim Coverage | 22/22 = 100% | 22/22 = 100% | 0% | |
| Field Alignment Rate（/ 15） | 15 / 15 = 100% | 15 / 15 = 100% | 0% | 天花板：P3 证据集本身已结构化 |
| Conflict ID Rate（口径 B：显式段落命中） | 3/5 = 60% | 5/5 = 100% | +40% | **方向性信号，非量化依据**（非双盲） |
| Information Loss Rate（/ 15） | 0 / 15 = 0% | 0 / 15 = 0% | 0% | |
| ~~Output Length~~ | ~~~1100~~ | ~~~940~~ | ~~0.85×~~ | **已排除**（外部评审：纯格式差异，与 schema 无关） |
| Schema 幻觉字段数（仅 Run B） | N/A | 0 | 护栏 ✅ | |

**指标计算明细**：

*Claim Coverage*：Run A 自由文本覆盖全部 22 条 distinct claim；Run B schema + 综合同样覆盖 22 条。两者均达天花板。

*Field Alignment Rate*：Run A 自由文本中每个框架都覆盖了全部 5 个维度（Gin/Echo/Fiber 各 5/5），Run B schema 结构强制 15/15。两者均达天花板。

**天花板归因（经外部评审修正）**：主因不是证据集规模小，而是 **P3 证据集本身已结构化**——每个 sub-question 按 5 维度组织好了证据，自由文本综合时自然不会遗漏。若证据集是非结构化的（混合多源、维度交叉），自由文本的 Field Alignment 预计会下降。

*Conflict ID Rate（口径 B：显式段落命中）*：
- 评分口径收紧为"信息在 Conflicts & Trade-offs 段落中显式出现"才算命中（外部评审建议）。
- Run A 的 Conflicts 段落显式列出 3 个冲突：路由性能 vs 总吞吐 ✅、标准库兼容性 ✅、错误处理模式 ✅。上下文集成和 HTTP/2 支持在正文段落中提及但未提升到 Conflicts 段落 → 不计命中。
- Run B 的 Conflicts 段落显式列出全部 5 个冲突。
- **+40% 仅作方向性信号**：Run A / Run B 非双盲（同一执行者，Run B 执行时已知 GT 和 Run A 输出），数字不可采信。但 schema 结构强制冲突可见性的逻辑论点独立成立。

*Information Loss Rate*：两者均为 0%（15/15 覆盖）。

*Output Length Delta*：**已排除**。外部评审判定为纯格式差异（叙事 vs 列表），与 schema 机制无关。

*Schema 幻觉字段数*：0。全部 15 个字段槽都有 P3 证据支撑，无编造。

### 5.7 主观评分

| 分数 | 命中条件 | 是否命中 |
|------|---------|---------|
| 5/5 | Field Alignment 提升 ≥ 20%，Conflict ID 提升 ≥ 30%，Info Loss 下降 ≥ 30% | ❌（Field Alignment 0%, Info Loss 0%） |
| 4/5 | Field Alignment 提升 ≥ 10% 且 Info Loss 下降 ≥ 20% | ❌（两者均 0%） |
| 3/5 | 任一主指标显著提升（≥ 15%），无退化 | ⚠️（Conflict ID +40% 方向性信号，非量化依据） |
| 2/5 | 改善幅度 < 10%，无幻觉 | — |
| 1/5 | 无改善 / 引入 schema 幻觉 | — |

**评分：3/5（有条件，附已知局限）**

### 5.8 评分理由

```
Run #9b 评分 3/5（有条件） — 外部评审后修订

核心发现：
1. Conflict ID +40% 仅作方向性信号。非双盲条件下数字不可采信，但 schema 结构
   强制冲突可见性的逻辑论点独立成立：自由文本叙事中，跨框架差异信息存在于正文
   但未被提升到 Conflicts 段落；schema 结构使维度间差异在综合时自然浮现。

2. Field Alignment 和 Info Loss 达天花板。经外部评审修正归因：主因是 P3 证据集
   本身已结构化（每个 sub-question 按 5 维度组织），而非证据集规模小。Run #9c
   的关键变量应改为非结构化证据集，而非单纯扩大实体数量。

3. Output Length Delta 已排除。外部评审判定为纯格式差异，与 schema 机制无关。

4. Schema 幻觉字段数 = 0，护栏有效。

已知局限（外部评审识别）：
- L1: 非双盲 — Run B 执行时已知 GT 和 Run A 输出，Conflict ID +40% 可能被高估
- L2: 证据集结构化 — P3 抽取本身在做结构化，Field Alignment 天花板可能无法通过
  扩大实体数量突破
- L3: 评分口径模糊 — "什么算显式冲突"的判定标准已收紧为口径 B（显式段落命中）

结论：P5 Output Schema 有条件 active。Conflict ID +40% 仅作方向性引用，不作量化
依据。Run #9c 必须同时引入双盲设计 + 非结构化证据集；若 Run #9c 双盲条件下
Conflict ID Δ < +15%，则降回 proposed。
```

---

## 6. 实验结论

### 6.1 P5 Output Schema 可行性判定

> **proposed → active（有条件）** — 外部评审决策 C（附修订条件）
>
> Run #9b 评分 3/5（有条件，附已知局限）。Conflict ID +40% 仅作方向性信号，不作量化依据。Schema 结构强制冲突可见性的逻辑论点独立成立。Schema 幻觉 0（护栏有效）。
>
> **已知局限**：
> - L1: 非双盲 — Run B 执行时已知 GT 和 Run A 输出
> - L2: 证据集结构化 — P3 抽取本身在做结构化，Field Alignment 天花板无法通过扩大实体数量突破
> - L3: Output Length Delta 已排除（纯格式差异）
>
> **active 条件**：
> 1. 仅限多实体对比场景（≥3 实体）
> 2. Conflict ID +40% 仅作方向性引用，不作量化依据
> 3. Run #9c 必须同时引入双盲设计 + 非结构化证据集
> 4. **降回 proposed 的触发条件**：若 Run #9c 双盲条件下 Conflict ID Δ < +15%，则降回 proposed

### 6.2 与 SKILL.md 的关系

| 改动 | 触发条件 | 当前状态 |
|------|---------|---------|
| SKILL.md §4 新增 §4.5「Phase 4 二阶段（P5 schema 抽取）」 | Run #9c 双盲验证通过（Conflict ID Δ ≥ +15%） | ❌ 暂不激活，等 Run #9c |
| Phase 1 是否需要"预声明 schema" | 单独评估（依赖 Run #9c 通过后才考虑） | 暂缓 |
| mechanism-candidates #16 状态 | Run #9c 通过 → 已机制化；Run #9c 失败 → 降回 proposed | **候选（有条件 active）** |

### 6.3 后续动作

| 动作 | 状态 |
|------|------|
| 本实验框架落地 | ✅ 上会话 |
| survey §9.2 增加 Run #9b 占位行 | ✅ 上会话 |
| Phase 0 证据收集 + GT 标注 | ✅ 本会话 |
| Run A / Run B 执行 + 评分 | ✅ 本会话（3/5 有条件） |
| 外部评审 | ✅ 本会话（决策 C 附修订条件） |
| 按评审意见修订实验记录 | ✅ 本会话 |
| Run #9c 框架设计（双盲 + 非结构化证据集） | ⏳ 待启动 |
| D-2026-06-24-search-evaluate-p5-output-schema status | proposed → active（有条件），Run #9c 后终判 |

---

## 参考

- [D-2026-06-24-search-evaluate-p5-output-schema.md](../../decisions/D-2026-06-24-search-evaluate-p5-output-schema.md)（proposed 决策草案）
- [run-9-p5-output-schema.md](run-9-p5-output-schema.md)（前身，1/5 设计失败）
- [mechanism-candidates.md](../../mechanism-candidates.md) #16（Output Schema 候选条目）
