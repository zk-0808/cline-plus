# Run #9 — P5 Output Schema 首轮验证

- **日期**：2026-06-24（实验框架已落地，执行待启动）
- **主题**：P5 Output Schema 结构化抽取 — Phase 4 二阶段（4.1 抽 schema → 4.2 综合）
- **改造项**：Phase 4 由「证据 → 自由文本答案」改为「证据 → 结构化中间表示（schema）→ 自由文本答案」
- **背景决策**：[D-2026-06-24-search-evaluate-p5-output-schema.md](../../decisions/D-2026-06-24-search-evaluate-p5-output-schema.md)（proposed）
- **触发条件**：Run #8a 否决 TLS 指纹假设后，基础设施层边际收益急剧下降；P5 是当前唯一既不依赖已失败假设、又对全部三档 Tier 同时受益、且实验成本低的候选

---

## 1. 实验设计

### 1.1 严格单变量

| 维度 | Run A（Control） | Run B（Treatment） |
|------|-----------------|-------------------|
| Phase 1 plan | 不动（无 schema 声明） | 不动（无 schema 声明） |
| Phase 2 search/fetch | **不执行**（直接复用 Run #6 已有证据） | **不执行**（复用同一份） |
| Phase 3 P3 三档 | 不动（沿用 Run #6 已抽出的 Claim/Quote） | 不动 |
| **Phase 4 综合** | **直接生成自由文本答案** | **先按 schema 抽字段（4.1）→ 再综合（4.2）** |
| schema 声明位置 | N/A | Phase 4 内嵌（执行提示词中给出） |
| 证据集 | Run #6 同一份 | Run #6 同一份 |
| 其他变量 | 不引入 P6 / M-22 | 同 |

### 1.2 Schema 位置决策

按 P5 决策草案 §「潜在风险 - Prompt 复杂度」明确建议：

> 先做最小实现（Phase 4 抽 schema 内嵌于 synthesize），不动 Phase 1；如效果好再外移到 Phase 1。

理由：Phase 4 单点改造 → 可回滚 → 严格单变量。若同时改 Phase 1 + Phase 4，Run #9 一次性双处改造会让变量耦合，难以判定收益来自哪一处。

### 1.3 证据集复用 Run #6 的依据

| 维度 | Run #6 实测 | 对 Run #9 的价值 |
|------|------------|------------------|
| 单 sub-question | "Go 语言 context 包 避免 goroutine 泄漏" | 符合决策草案 §Q3 "先单 sub-Q 独立" |
| Tier 分布 | 1 个 Tier A（backendlearn.com，~5000 字正文，4 条 verbatim Quote）+ 4 个 snippet-only（CSDN/datasea.cn/cnblogs/juejin） | **同时覆盖** P5 决策草案 §Q1 痛点 #4（Tier C 信息密度低）与 §Q2 联动（"三档 Tier 都适用"） |
| Run A 既有产物 | Run #6 §「Phase 2: Run A（基线）」自由文本答案（6 条 finding，平铺中文段落） | Run #9 Run A 等价基线，可直接对照 |
| Run B 既有产物 | Run #6 §「Phase 3: Run B（P3 规则）」4 条 Claim/Quote/Source 三元组 + 4 个 ⛔ [无法引证] | Run #9 输入证据（Phase 4 前态） |
| 评分零波动 | 同一份证据下 schema 收益直接归因于 Phase 4 改造 | 实验内部效度高 |

> **注**：Run #6 中 Run A 不严格等同本次 Run #9 Run A——Run #6 Run A 用搜索摘要 + 标题推断，没有 P3 三元组输入；Run #9 Run A/B 均以 Run #6 §3「Run B」抽出的 P3 三元组（含 ⛔ 标记）作为 Phase 4 输入。即：
>
> ```
> Run #9 输入  = Run #6 Run B 的 P3 三元组集合（5 条候选 URL，1 条 verbatim 多 Claim，4 条 ⛔ [无法引证]）
> Run #9 Run A = 该输入 → 当前 SKILL §4.1 自由文本答案
> Run #9 Run B = 该输入 → schema 抽取 → 自由文本答案
> ```

---

## 2. Schema 声明（Run B 专用）

### 2.1 子问题类型识别

Run #6 的 sub-question 是「Go 语言 context 包 避免 goroutine 泄漏」——属 P5 决策草案 Q2 §「Schema 来源」表中的 **列表型**（X 有哪些做法）。

### 2.2 本次实验使用的 schema 模板

```yaml
techniques:
  - name: <技术 / 做法名称>
    mechanism: <为什么有效（一句话原理）>
    when_to_apply: <适用场景 / 触发条件>
    code_pattern: <对应代码模式（如有 verbatim Quote 则使用）>
    pitfall: <若不遵守的后果>
    source: [<E1>, <E2>, ...]    # 对接 P3 引文（id 见 §2.3）
```

字段填空规则：
- 字段无证据 → 留空或标 `unknown`（与决策草案 §潜在风险「Schema 幻觉」要求一致，禁止编造）
- `code_pattern` 必须为 P3 Quote 的连续子串（若 Quote 含代码块则原样保留）
- `source` 必须指回某一条 P3 三元组 id

### 2.3 证据 id 约定（Phase 4 输入）

将 Run #6 §3 的 P3 三元组重新编号为本次 Run #9 的统一 id：

| id | URL | Claim（来自 Run #6） | Quote 状态 |
|----|-----|---------------------|----------|
| E1 | backendlearn.com/.../go-goroutine-leak-troubleshooting-guide | 无缓冲 channel 无接收方时发送方永久阻塞 | ✅ verbatim |
| E2 | 同上 | I/O/channel/循环 goroutine 需监听 ctx.Done() | ✅ verbatim |
| E3 | 同上 | select + ctx.Done() 是正确退出模式 | ✅ verbatim |
| E4 | 同上 | Timer/Ticker 必须显式 Stop() 否则 goroutine 泄漏 | ✅ verbatim |
| E5 | blog.csdn.net/.../160532819 | — | ⛔ [无法引证] |
| E6 | datasea.cn/go1012187062 | — | ⛔ [无法引证] |
| E7 | cnblogs.com/chenqionghe/p/9769351 | — | ⛔ [无法引证] |
| E8 | juejin.cn/post/7363584550595772467 | — | ⛔ [无法引证] |

---

## 3. 核心指标（按 D-2026-06-24-search-evaluate-p5-output-schema §Q3）

| 指标 | 定义 | 计算方式 | Run A | Run B |
|------|------|---------|-------|-------|
| **Claim Coverage** | 答案中 distinct claim 数 / 证据中可抽出的 distinct claim 总数 | 审阅人对比 Run A 文本 vs Run B schema 字段 | — | — |
| **Conflict Identification Rate** | 答案中显式指出的证据冲突数 / 证据集中实际存在的冲突数 | 审阅人提前标注冲突 ground truth | — | — |
| **Information Loss Rate** | 证据中存在但答案中未提及的关键字段数 / 关键字段总数 | 同上 | — | — |
| **Output Length Delta** | Run B 答案 token 数 / Run A 答案 token 数 | 直接 token 计数 | 基线 (1×) | — |

### 3.1 Ground Truth 预声明（执行前固定）

为避免事后构造 ground truth，本节在执行前固定 Run #6 证据中**可抽出的 distinct claim 全集**与**关键字段全集**。两次执行结束后对照评分，不再修改。

#### 3.1.1 Distinct Claim 全集（共 4 条，全部来自 E1~E4）

| Claim ID | 内容 |
|---------|------|
| C1 | 无缓冲 channel 无接收方时发送方永久阻塞导致泄漏 |
| C2 | 涉及 I/O、channel 读写或循环等待的 goroutine 必须接收 ctx 并监听 `ctx.Done()` |
| C3 | `select { case <-ctx.Done(): return; default: doSomething() }` 是标准退出模式 |
| C4 | Timer/Ticker 必须显式 `Stop()`，否则运行时持有 goroutine 不回收 |

E5~E8 因 ⛔ [无法引证] 不贡献 distinct claim（snippet-only 不可作为 verbatim 来源进入 ground truth）。

#### 3.1.2 关键字段全集（共 5 项）

| 字段 ID | 名称 | 在证据中的体现 |
|---------|------|----------------|
| F1 | **技术名称**（technique name） | "select + ctx.Done()", "Timer/Ticker Stop()", "channel 配对" 等 |
| F2 | **触发条件**（when_to_apply） | "无缓冲 channel 发送", "goroutine 含 I/O/循环", "Timer/Ticker 启动后" |
| F3 | **代码模式**（code_pattern） | E3 中的 `select { case <-ctx.Done(): return }` |
| F4 | **不遵守的后果**（pitfall） | "永久阻塞"、"断线风筝"、"运行时持有 goroutine" |
| F5 | **机制原理**（mechanism） | "channel 同步语义"、"取消信号传播"、"运行时 Timer 跟踪" |

**Information Loss Rate** 计算口径：
- 分母 = 5 个字段 × 4 个 Claim = 20 个字段槽（含 N/A）
- 实际可填字段数（去除 N/A）= 见下表，作为分母
- 答案未提及的「应填」字段数 = 分子

| Claim | F1 | F2 | F3 | F4 | F5 | 应填总数 |
|-------|----|----|----|----|----|--------:|
| C1 | ✓ | ✓ | (隐含) | ✓ | ✓ | 4 |
| C2 | ✓ | ✓ | (E3 共用) | ✓ | ✓ | 4 |
| C3 | ✓ | (与 C2 共用) | ✓ | (与 C2 共用) | ✓ | 3 |
| C4 | ✓ | ✓ | ✗ | ✓ | ✓ | 4 |
| **合计** | | | | | | **15** |

#### 3.1.3 Conflict Ground Truth

Run #6 证据集中**不存在显式冲突**——E1~E4 同源（backendlearn.com），E5~E8 ⛔ 无内容。

故 Conflict Identification Rate 在本实验中**分母为 0**：

| 处理 | 含义 |
|------|------|
| Run A/B 任一在答案中编造冲突 | 视为 Schema 幻觉，按 P5 决策草案 §潜在风险记一次扣分 |
| Run A/B 均未提冲突 | 该指标本次不参与评分（标 N/A） |

### 3.2 评分尺度（来自决策草案）

| 分数 | 条件 |
|------|------|
| 5/5 | Claim Coverage 提升 ≥ 20%，Conflict ID 提升 ≥ 30%（本实验 N/A）, Info Loss 下降 ≥ 30%，长度 delta < 1.3× |
| 4/5 | Claim Coverage 提升 ≥ 10% 且 Info Loss 下降 ≥ 20% |
| 3/5 | 任一主指标显著提升（≥ 15%），无明显退化 |
| 2/5 | 改善幅度 < 10%，但长度无失控 |
| 1/5 | 无改善 / Output Length 失控（≥ 2×）/ 抽 schema 引入幻觉字段 |

> **本实验 Conflict ID 不参评**：分母为 0；只用「编造冲突 → 1/5 直接降级」作为护栏。

---

## 4. 执行提示词（复制到 Cline 执行）

### 4.1 Run A（Control）—— 当前 Phase 4 自由文本综合

把以下内容**整段**复制到 Cline 对话框执行：

````
Run #9 Run A — Phase 4 基线（自由文本综合）

不激活 search-orchestrator SKILL.md 中的任何 P5 schema 规则，仅按 §4.1 现有结构生成答案。

【输入】sub-question + P3 三元组证据集（已 fetch 完成，证据为只读）。

sub-question: Go 语言 context 包如何防止 goroutine 泄漏？

P3 三元组证据（来自 Run #6 §3 Run B）：

E1 (URL: https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide, [社区])
   Claim: 无缓冲 channel 发送端若无对应接收方，发送方 goroutine 会永久阻塞导致泄漏。
   Quote: "如果向一个无缓冲的 Channel 发送数据，却没有任何 Goroutine 来接收，发送方就会永久阻塞。"

E2 (同上)
   Claim: 涉及 I/O 操作、channel 读写或循环等待的 goroutine，必须显式接收 context 并监听 ctx.Done() 信号。
   Quote: "只要 Goroutine 内部涉及 I/O 操作（如网络请求）、Channel 读写 或 循环等待，就必须显式接收 ctx 并监听 ctx.Done() 信号。"

E3 (同上)
   Claim: select { case <-ctx.Done(): return; default: doSomething() } 是监听取消信号的正确模式。
   Quote: "select {\ncase <-ctx.Done():\nreturn // 接收到取消信号，安全退出\ndefault:\ndoSomething()\n}"

E4 (同上)
   Claim: time.Ticker 和 time.Timer 必须显式调用 Stop()，否则 Go 运行时会一直持有对应 goroutine 进行计时。
   Quote: "它们启动后，Go 运行时系统会一直持有对应的 Goroutine 进行计时，除非显式调用 Stop() 方法。"

E5 (URL: https://blog.csdn.net/dongyao243512842/article/details/160532819)
   ⛔ [无法引证] — fetch 失败

E6 (URL: https://datasea.cn/go1012187062.html)
   ⛔ [无法引证] — fetch 失败

E7 (URL: https://www.cnblogs.com/chenqionghe/p/9769351.html)
   ⛔ [无法引证] — fetch 失败

E8 (URL: https://juejin.cn/post/7363584550595772467)
   ⛔ [无法引证] — fetch 返回 "Please wait..."

【任务】按当前 SKILL.md §4.1 / §4.3 Tier B 输出格式（混合模式：有正文 → P3；无正文 → [无法引证]）生成最终回答。

【禁止】
- 禁止编造任何不在 E1~E8 中的事实
- 禁止给 E5~E8 补充内容
- 禁止使用 schema / 表格 / 二阶段中间表示——本次为基线，直接综合
````

### 4.2 Run B（Treatment）—— Phase 4 二阶段（schema 抽取 + 综合）

把以下内容**整段**复制到 Cline 对话框执行：

````
Run #9 Run B — Phase 4 二阶段（schema 抽取 + 综合）

不动 Phase 1/2/3。仅 Phase 4 改造为二阶段：先抽 schema，再综合。

【输入】（与 Run A 完全相同，证据为只读）

sub-question: Go 语言 context 包如何防止 goroutine 泄漏？

P3 三元组证据：
[此处粘贴 Run A 中 E1~E8 完整列表，不删改]

【任务】

Step 4.1 —— Schema 抽取（Treatment 新增步骤）

按以下 schema 模板，从 E1~E8 中抽字段。每条记录对应 sub-question 下的一个独立技术做法。

```yaml
techniques:
  - name: <技术 / 做法名称>
    mechanism: <为什么有效（一句话原理）>
    when_to_apply: <适用场景 / 触发条件>
    code_pattern: <对应代码模式；必须为 P3 Quote 的连续子串>
    pitfall: <若不遵守的后果>
    source: [<Ei>, ...]    # 对接 P3 引文
```

抽取规则（必须遵守）：
1. 字段无证据 → 留空或标 unknown。**禁止编造**。
2. code_pattern 必须为某条 Quote 的连续子串。其它字段允许在 Quote 范围内进行轻度改写以提取语义。
3. source 必须指向至少一条 P3 id（E1~E8）。
4. E5~E8 (⛔ [无法引证]) 不可作为 source 进入任何 technique 记录。
5. 不限定 techniques 数量——证据里有几个独立 technique 就抽几个。

Step 4.2 —— 综合答案

基于 Step 4.1 的 schema，生成最终自由文本答案：

输出结构：
## Conclusion
[1-3 句直接回答 sub-question]

## Techniques（按 schema 顺序展开）
### [name 1]
- 机制：[mechanism]
- 适用：[when_to_apply]
- 代码模式：[code_pattern]
- 风险：[pitfall]
- 引用：[source]

### [name 2]
...

## Sources by Credibility（沿用 §4.1 现有格式）

## Confidence
[High / Medium / Low + 理由]

【禁止】
- 禁止编造 schema 字段
- 禁止给 E5~E8 补充 technique 记录
- 禁止在 schema 中表达 Run #6 证据集中不存在的"冲突"——若编造冲突则视为 Schema 幻觉
````

---

## 5. 结果记录区（待执行后填入）

### 5.1 Run A 输出

```
## Conclusion

Go 语言通过 context.Context 传递取消信号，让 goroutine 在失去接收方、
I/O 阻塞或循环等待时能监听 ctx.Done() 并安全退出；同时对 Timer/Ticker
显式调用 Stop() 释放运行时持有的计时 goroutine，从而避免泄漏。

## Evidence

### Sub-Q: Go 语言 context 包如何防止 goroutine 泄漏？

- **Claim**: 无缓冲 channel 发送端若无对应接收方，发送方 goroutine
  会永久阻塞导致泄漏。
  **Quote**: "如果向一个无缓冲的 Channel 发送数据，却没有任何 Goroutine
  来接收，发送方就会永久阻塞。"
  **Source**: https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide, [社区]

- **Claim**: 涉及 I/O 操作、channel 读写或循环等待的 goroutine，必须
  显式接收 context 并监听 ctx.Done() 信号。
  **Quote**: "只要 Goroutine 内部涉及 I/O 操作（如网络请求）、Channel 读写
  或 循环等待，就必须显式接收 ctx 并监听 ctx.Done() 信号。"
  **Source**: https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide, [社区]

- **Claim**: select { case <-ctx.Done(): return; default: doSomething() }
  是监听取消信号的正确退出模式。
  **Quote**: "select {\ncase <-ctx.Done():\nreturn // 接收到取消信号，安全退出\ndefault:\ndoSomething()\n}"
  **Source**: https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide, [社区]

- **Claim**: time.Ticker 和 time.Timer 必须显式调用 Stop()，否则
  Go 运行时会一直持有对应 goroutine 进行计时。
  **Quote**: "它们启动后，Go 运行时系统会一直持有对应的 Goroutine 进行计时，
  除非显式调用 Stop() 方法。"
  **Source**: https://backendlearn.com/backend-languages/go-goroutine-leak-troubleshooting-guide, [社区]

**Confidence:** Medium（全部证据来自单一社区来源，无官方文档/源码交叉验证）

## Contradictions & Uncertainty

- 证据集中无显式冲突（E1~E4 同源）
- 4 条 snippet-only 来源（E5~E8）fetch 失败，无法交叉验证
- 缺少官方文档（pkg.go.dev/context）佐证

## Sources by Credibility

| Source | Type | Credibility |
|--------|------|-------------|
| backendlearn.com/.../go-goroutine-leak-troubleshooting-guide | 社区博客 | [社区] Medium |
| blog.csdn.net/.../160532819 | — | [无法引证] fetch 失败 |
| datasea.cn/go1012187062.html | — | [无法引证] fetch 失败 |
| cnblogs.com/chenqionghe/p/9769351.html | — | [无法引证] fetch 失败 |
| juejin.cn/post/7363584550595772467 | — | [无法引证] fetch 返回 "Please wait..." |
```

自检：
- 每条 claim 是否关联至少一个 URL？              ☑ Yes
- [推测] 标签数 ≤ 总结论数 30%？                  ☑ Yes（0/4）
- Tier B：每条 claim 是否有 Quote？              ☑ Yes（4/4）
- fetch 失败的 URL 是否标 [无法引证]？            ☑ Yes（4/4）

### 5.2 Run B 输出（Step 4.1 schema）

```
[未执行 — Run #9 设计失败中止，详见 §5.6 / §6.1]
```

### 5.3 Run B 输出（Step 4.2 综合）

```
[未执行 — 同上]
```

### 5.4 指标实测

| 指标 | Run A | Run B | Δ |
|------|------:|------:|--:|
| Claim Coverage（命中 distinct claim 数 / 4） | 4 / 4 = 100% | 未执行 | — |
| Information Loss Rate（未提应填字段 / 15） | 0 / 15 = 0% | 未执行 | — |
| Output Length（token 数） | ~380 | 未执行 | — |
| Conflict ID Rate | N/A（分母 0） | 未执行 | — |
| Schema 幻觉字段数（仅 Run B） | N/A | 未执行 | — |

### 5.5 主观评分

| 分数 | 命中条件 | 是否命中 |
|------|---------|---------|
| 5/5 | Claim Coverage 提升 ≥ 20%，Info Loss 下降 ≥ 30%，长度 < 1.3× | ☐ |
| 4/5 | Claim Coverage 提升 ≥ 10% 且 Info Loss 下降 ≥ 20% | ☐ |
| 3/5 | 任一主指标显著提升（≥ 15%），无退化 | ☐ |
| 2/5 | 改善幅度 < 10%，长度无失控 | ☐ |
| **1/5** | **无改善 / 长度 ≥ 2× / 引入 schema 幻觉** | **☑ 设计失败** |

### 5.6 评分理由

```
Run #9 评分 1/5 — 设计失败（非机制失败）。

根因：实验证据集（Run #6 单源列表型）无法触发 P5 的核心收益场景。

具体表现：
1. Claim Coverage 在 Run A 已达 100%（4/4）——自由文本答案把 E1~E4 的
   全部 verbatim Quote 原样嵌入，4 条 claim 天然全覆盖。Run B 的 schema
   抽取无提升空间，指标天花板已被 Run A 顶满。
2. Information Loss Rate 在 Run A 已达 0%（0/15）——15 个应填字段槽
   全部以散文形式覆盖。自由文本并未丢失字段信息。
3. Conflict ID Rate 分母为 0（E1~E4 同源，无冲突可识别）。
4. 唯一有区分度的 Output Length Delta 只能反映"schema 是否带来冗余"，
   无法证明 P5 的核心价值（可审计性、跨源对齐、可比较性）。

设计缺陷诊断：
- Run #6 证据集是单源列表型问题（1 个 URL 产出 4 条同源 claim），
  天然不触发 P5 决策草案 §Q1 痛点 #1（claim 粒度不一致）和
  #2（不同来源难比较）。
- P5 的核心价值在于"跨源字段对齐"——需要多个独立来源对同一组实体
  给出可比较的字段。单源证据集无法验证这一价值。
- 这与 project_memory 中已记录的教训一致：
  "使用单源、列表型实验集无法触发核心 schema 收益
  （field alignment across sources）"。

结论：Run #9 无法评估 P5 机制有效性。需重新设计 Run #9b，
使用多实体对比型问题（多个独立来源 × 多个可比较维度）。
```

---

## 6. 实验结论

### 6.1 P5 Output Schema 可行性判定

> **Run #9 设计失败（1/5）— 无法评估 P5 机制有效性。**
>
> P5 决策草案 status 维持 `proposed`，不跳转。Run #9 不产生机制层面的
> 通过/否决结论，仅证明"单源列表型证据集不适合验证 P5"。
>
> 后续：启动 Run #9b，使用多实体对比型问题重新验证。

### 6.2 与 SKILL.md 的关系

| 改动 | 触发条件 | 本次状态 |
|------|---------|---------|
| SKILL.md §4 新增 §4.5「Phase 4 二阶段（P5 schema 抽取）」 | Run #9 ≥ 4/5 | ❌ 未达条件 |
| Phase 1 是否需要"预声明 schema" | 单独评估（依赖 Run #9 通过后才考虑） | ❌ 未达条件 |
| mechanism-candidates #16 状态 | 实验通过 → 已机制化；不通过 → 仍候选 | 仍候选（Run #9 设计失败，待 Run #9b） |

### 6.3 后续动作

| 动作 | 状态 |
|------|------|
| 本实验框架落地 | ✅ 上会话 |
| survey §9.2 增加 Run #9 占位行 | ✅ 上会话 |
| Run #9 Run A 执行 | ✅ 本会话 |
| Run #9 Run B 执行 | ❌ 中止（设计失败） |
| D-2026-06-24-search-evaluate-p5-output-schema status 跳转 | ❌ 维持 proposed |
| mechanism-candidates #16 状态 → 实验中 | ❌ 维持候选（注明 Run #9 设计失败） |
| **设计 Run #9b 多实体对比框架** | **本会话下一步** |

---

## 参考

- [D-2026-06-24-search-evaluate-p5-output-schema.md](../../decisions/D-2026-06-24-search-evaluate-p5-output-schema.md)（proposed 决策草案）
- [run-6-p3-zh-retry.md](run-6-p3-zh-retry.md)（证据集来源）
- [run-8a-mcp-backend.md](run-8a-mcp-backend.md)（基础设施层否决，催生 P5 优先级）
- [mechanism-candidates.md](../../mechanism-candidates.md) #16（Output Schema 候选条目）
