# Run #9b 外部评审材料：P5 Output Schema 多实体对比验证

> **提交日期**：2026-06-25
> **实验文件**：[run-9b-p5-output-schema-v2.md](experiments/run-9b-p5-output-schema-v2.md)
> **证据集**：[run-9b-phase0-evidence.md](experiments/run-9b-phase0-evidence.md)
> **评分**：3/5（有条件 active）
> **请求评审焦点**：实验有效性、评分可信度、下一步决策

---

## 一、实验背景

### 1.1 P5 Output Schema 是什么

search-orchestrator SKILL 的 Phase 4（综合）当前是自由文本生成。P5 提议改为二阶段：

1. **Step 4.1**：先按预声明 schema 从 P3 证据中抽字段（YAML 结构化）
2. **Step 4.2**：基于 schema 生成最终自由文本答案

**预期收益**：跨实体字段对齐、冲突识别、信息丢失防护。

### 1.2 为什么做 Run #9b

Run #9（前身）用单源列表型证据集（1 URL × 4 同源 claim），评分 1/5 设计失败——自由文本基线已顶满指标天花板，schema 无提升空间。

Run #9b 改用多实体对比问题（Gin/Echo/Fiber × 5 维度 = 15 字段槽），3 实体间有自然性能冲突，预期自由文本会出现字段遗漏和冲突遗漏，给 schema 留出提升空间。

### 1.3 实验设计

| 维度 | Run A（Control） | Run B（Treatment） |
|------|-----------------|-------------------|
| 输入 | P3 证据集（只读） | 同一份（只读） |
| Phase 4 | 直接生成自由文本 | 先抽 schema → 再综合 |
| 禁止 | schema / 表格 / 中间表示 | — |

Ground Truth 在 Phase 0 证据收集后固定：15 字段槽 + 5 个冲突点 + 22 条 distinct claim。

---

## 二、实验结果

### 2.1 指标实测

| 指标 | Run A | Run B | Δ |
|------|------:|------:|--:|
| Claim Coverage | 22/22 = 100% | 22/22 = 100% | 0% |
| Field Alignment Rate（/ 15） | 15/15 = 100% | 15/15 = 100% | 0% |
| Conflict ID Rate | 3/5 = 60% | 5/5 = 100% | +40% |
| Information Loss Rate（/ 15） | 0/15 = 0% | 0/15 = 0% | 0% |
| Output Length（token，排除 YAML） | ~1100 | ~940 | 0.85× |
| Schema 幻觉字段数 | N/A | 0 | 护栏 ✅ |

### 2.2 评分

3/5 — Conflict ID 显著提升（+40%），但 Field Alignment 和 Info Loss 达天花板。

### 2.3 结论

P5 Output Schema proposed → active（有条件）：多实体对比场景（≥3 实体）可激活，需 Run #9c（5+ 实体）验证 Field Alignment 收益。

---

## 三、已识别的方法论问题（自评）

我们在实验过程中识别出四个可能影响结论可信度的问题，提交评审重点关注：

### 问题 1：Run A / Run B 非双盲（最严重）

**事实**：Run A 和 Run B 由同一执行者（TRAE agent / Kimi-K2.7）基于同一份证据集生成。执行者在写 Run B 时已经知道：
- Run A 的完整输出
- Ground Truth 的 5 个冲突点
- 评分标准

**影响**：Run B 的 Conflict ID 100% 可能不是因为 schema 机制帮助了冲突识别，而是因为执行者已经知道该写哪些冲突。+40% 的提升可能被严重高估。

**无法自行修复的原因**：单一模型无法对自己做双盲。修复需要引入第二个模型或第二个会话（无 GT 上下文）执行 Run B。

**请求评审**：在非双盲条件下，Conflict ID +40% 的结论是否可采信？如果不能采信，Run #9b 的核心收益是否归零？

### 问题 2：Conflict ID 评分标准的人为偏差

**事实**：Run A 被判遗漏的 2 个冲突是"上下文与标准库集成"和"HTTP/2 支持"。但回看 Run A 文本：

> "HTTP/2 支持也需要显式配置，而 Gin 和 Echo 继承 net/http 原生支持 HTTP/2/3"

这条信息**在 Run A 答案中存在**，只是出现在 Fiber 段落里，没有被提升到 Conflicts & Trade-offs 段落作为独立冲突点。

**影响**：如果"信息存在但未被标注为冲突"算遗漏，那 Conflict ID 评分取决于审阅者对"什么算显式冲突"的判定——这个判定标准是模糊的。Run B 把信息放到 Conflicts 段落可能只是格式差异，不是机制收益。

**请求评审**：Conflict ID 的计算口径是否需要收紧为"信息在 Conflicts 段落中显式出现"才算命中？如果是，Run A 的 3/5 是否需要重新评定？

### 问题 3：Field Alignment 天花板的归因

**事实**：3 实体 × 5 维度 = 15 槽，Run A 和 Run B 均 100% 覆盖。

**我们的归因**：证据集规模小，自由文本叙事流足以覆盖。

**替代归因**：P3 证据集本身已经是结构化的——每个 sub-question 按 5 维度组织好了证据。如果证据集是非结构化的（混合来源、维度交叉），自由文本的 Field Alignment 可能会下降。天花板可能不是"规模小"导致的，而是"证据集结构化程度高"导致的。

**影响**：如果天花板是证据集结构化导致的，那扩大到 5+ 实体（Run #9c）可能仍无法触发 Field Alignment 差异——因为 P3 抽取本身就在做结构化。

**请求评审**：Run #9c 的设计是否需要改为"非结构化证据集"（如混合多源、维度交叉的 P3 输出）而非简单扩大实体数量？

### 问题 4：Output Length 0.85× 与 schema 无关

**事实**：Run A 是大段叙事，Run B 是列表格式——列表天然更短。

**影响**：长度差异与 schema 机制无关，只与输出格式有关。如果 Run A 也用列表格式，长度差异可能消失。0.85× 不应归因于 schema。

**请求评审**：Output Length Delta 指标是否需要控制输出格式？或者这个指标本身是否有意义？

---

## 四、决策选项

| 选项 | 描述 | 理由 |
|------|------|------|
| A | P5 proposed → active（有条件） | Conflict ID +40% 即使有偏差，schema 结构强制冲突可见性在逻辑上成立 |
| B | P5 维持 proposed，先修复非双盲问题再决策 | 非双盲使核心指标不可信，不应基于不可信数据做决策 |
| C | P5 proposed → active（有条件），同时记录非双盲为已知局限 | 接受局限但继续推进，在 Run #9c 中修复方法论 |
| D | P5 proposed → rolled-back | 如果 Conflict ID +40% 不可信，且 Field Alignment 无差异，当前无足够证据支持激活 |

---

## 五、评审请求

请重点回答：

1. 非双盲条件下的 Conflict ID +40% 是否可采信？
2. Run #9c 应该扩大实体数量，还是改为非结构化证据集？
3. 上述四个问题中，哪些是"实验设计缺陷"（需要重做），哪些是"已知局限"（可以接受并记录）？
4. 决策选项 A/B/C/D 你选哪个？

---

## 六、评审结论（2026-06-25 收到）

### 6.1 逐项回复

| 问题 | 评审结论 |
|------|---------|
| 1. Conflict ID +40% 可采信？ | **数字不可采信**（非双盲），但 schema 强制冲突可见性的逻辑论点独立成立，可作为**方向性信号** |
| 2. Run #9c 设计方向 | 关键变量应改为**非结构化证据集**，而非单纯扩大实体数量 |
| 3. 设计缺陷 vs 已知局限 | 问题 1（非双盲）= 设计缺陷，Run #9c 必须修复；问题 2（评分口径）= 已知局限，已收紧为口径 B；问题 3（证据集结构化）= 设计缺陷，Run #9c 必须改非结构化；问题 4（Output Length）= 已知局限，直接排除 |
| 4. 决策选项 | **C（附修订条件）** |

### 6.2 决策 C 附修订条件

- P5 有条件 active
- Conflict ID +40% 仅作方向性引用，不作量化依据
- Run #9c 必须同时引入**双盲设计 + 非结构化证据集**
- **降回 proposed 的触发条件**：若 Run #9c 双盲条件下 Conflict ID Δ < +15%，则降回 proposed

### 6.3 已落地修订

| 修订项 | 文件 | 状态 |
|--------|------|------|
| Conflict ID 降级为方向性信号 | run-9b §5.6/§5.8 | ✅ |
| 评分口径收紧为口径 B（显式段落命中） | run-9b §5.6 | ✅ |
| Output Length 排除 | run-9b §5.6/§5.7 | ✅ |
| Field Alignment 天花板归因修正 | run-9b §5.6/§5.8 | ✅ |
| 已知局限 L1/L2/L3 记录 | run-9b §5.8/§6.1 | ✅ |
| survey §9.2 Run #9b 行修订 | survey.md | ✅ |
| survey §9.3 P5 路线状态修订 | survey.md | ✅ |
| mechanism-candidates #16 修订 | mechanism-candidates.md | ✅ |

---

## 附：关键文件

- 实验框架：[run-9b-p5-output-schema-v2.md](experiments/run-9b-p5-output-schema-v2.md)
- P3 证据集：[run-9b-phase0-evidence.md](experiments/run-9b-phase0-evidence.md)
- 前身实验：[run-9-p5-output-schema.md](experiments/run-9-p5-output-schema.md)（1/5 设计失败）
- P5 决策草案：[D-2026-06-24-search-evaluate-p5-output-schema.md](decisions/D-2026-06-24-search-evaluate-p5-output-schema.md)
- 机制候选：[mechanism-candidates.md](mechanism-candidates.md) #16
- 调研总表：[survey.md](search-orchestrator/survey.md) §9.2
