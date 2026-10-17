# Memory Staleness — 待沉淀经验的衰减机制

> **生命周期**：永久保留——机制说明，跨版本保留。
>
> **定位**：`rules/lifecycle.md` 的**详版**。入口规则只留「有这个机制、去哪看」；本文件承载衰减分级、注入时处理、sweeper 行为与设计决策。
>
> **为什么要拆**：`delivery-framework-design.md §四` 的薄度量化要求每份**入口规则** ≤50 行（薄入口每次会话都被加载，承载完整治理内容会挤占上下文）。本条机制原先写在 `rules/lifecycle.md` 里，使该文件涨到 107 行，超出口径一倍。

---

## 衰减分级

待沉淀区经验条目随时间衰减，避免过时经验误导决策。实现见 `plugin/staleness-utils.ts` 和 `capabilities/staleness-sweeper/index.ts`。

默认 TTL = 90 天。rule-appender 追加时写入 `ttl(天)` 和 `最后验证` 列。

| 年龄 (age) | 权重 (weight) | 状态 |
|-------------|---------------|------|
| age < ttl * 0.5 | 1.0 | fresh |
| age < ttl | 0.5 | aging |
| age >= ttl | 0.1 | stale |
| age >= ttl * 2 | sweeper 删除 | expired |

## SessionStart 注入时处理

`handoff-provider` 在 SessionStart 读取 HANDOFF.md 后，调用 `processStaleness()` 对待沉淀区表格行计算权重：

- **stale** (weight <= 0.1): 行尾追加 `<!-- STALE weight=0.1 -->` 标注
- **aging** (weight < 1.0): 行尾追加 `<!-- AGING weight=0.5 -->` 标注
- **fresh** (weight = 1.0): 不标注

处理后在 HANDOFF.md 末尾追加 staleness 摘要。Tracer 记录 `stale_count` 和 `filtered_count` 指标。

## Staleness Sweeper

`staleness-sweeper` 扫描 HANDOFF.md，更新权重列和最后验证列：

- **默认** (`ruleBlock=false`): 仅更新权重和状态，不物理删除
- **ruleBlock=true**: `age > ttl * 2` 的 expired 条目被物理删除

**物理删除默认关闭**——删除是不可逆操作，需显式 `ruleBlock=true` 才执行。

## 设计决策

- **injection = annotate not filter**：weight<=0.1 的 stale 条目**仍注入到会话**，仅追加 HTML 注释标注（`<!-- STALE -->`）警告，而非删除或过滤。理由：保留边缘信息但降权提示，避免误删有价值经验。删除由 sweeper 按显式 `ruleBlock=true` 触发。
- **delete = archive not physical**：物理删除默认关闭，避免不可逆风险。
- **competitor claim = open problem**：mem0 等框架承认 staleness 但未下沉到 governance hook 层。
- **tracing before staleness**：Phase 1 Tracing 先于 Phase 2 Staleness，staleness 验证需要 tracing 数据。

## 实现位置

- 衰减与注入标注：`plugin/staleness-utils.ts`
- 清扫能力：`capabilities/staleness-sweeper/index.ts`（⚠️ 目前没有分发路径，逻辑已被内联复制进 `staleness-utils.ts`，见健康面板 `L3-ORPHAN`）
- 轨迹记录：`capabilities/tracer/index.ts`

## 引用

- 入口规则：[`../../.governance/rules/lifecycle.md`](../../.governance/rules/lifecycle.md)
- 薄度量化约定：[`delivery-framework-design.md` §四](../../docs/decisions/delivery-framework-design.md)
