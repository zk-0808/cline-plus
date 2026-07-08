# Lifecycle — 文档生命周期与待沉淀区晋升流程

> **生命周期**：永久保留 — 框架机制入口。
>
> **身份**：L2 Project Rules 薄入口。定义文档生命周期标注格式与待沉淀区晋升流程。
>
> **加载机制**：Cline Rules 条件加载。

---

## 文档生命周期标注

所有 `.governance/` 下文档**必须**在文件头标注生命周期,格式:

| 类型 | 格式 |
|------|------|
| 永久保留 | `永久保留 — <理由>` |
| 版本绑定 | `版本绑定 — <版本>,<归档条件>` |
| 任务绑定 | `任务绑定 — <任务>,<归档条件>` |
| 事件绑定 | `事件绑定 — <事件>,<归档条件>` |
| 会话绑定 | `每次覆写,无归档` |

归档条件**必须**具体可判定(如"v1.0 实现完成后"),禁止"以后""适时"。

## 待沉淀区格式

`HANDOFF.md` 必须包含"待沉淀经验"结构化区块:

```markdown
## 待沉淀经验

> 此区由 rule-appender 自动追加,人工 review 后晋升到 rules/ 或删除。
> 晋升流程见本文件下方。

| id | 经验 | 来源 | 沉淀日期 | 状态 | ttl(天) | 最后验证 | 权重 |
|----|------|------|---------|------|---------|---------|------|
|（空,rule-appender 追加）|
```

## 晋升流程

1. **追加**:人判断"这值得沉淀" → 调用 `rule-appender` 能力机械追加到 `HANDOFF.md` 待沉淀区
2. **Review**:人工 review,决定晋升 / 删除 / 改写
3. **晋升**:移动到 `.governance/rules/`(若装好即生效)或 `.governance/examples/`(若需手动复制)
4. **删除**:从待沉淀区移除,不晋升

**判断由人做,追加由机器做,晋升由人做**。

## 规则退役流程

每条规则满足退役判据之一即触发评估:场景消失 / 被覆盖 / 长期未触发 / 重叠度过高 / 治理膨胀警报。

退役保留期 `<rule_retire_keep_days>` 天(见 constitution 项目可调参数),便于误退役回滚。物理删除时登记到 `docs/ARCHIVE.md`(若存在)。

**禁止退役**:执行门控类规则仅因"长期未触发"退役——未触发恰证明其有效。

## Memory Staleness

待沉淀区经验条目随时间衰减,避免过时经验误导决策。实现见 `plugin/staleness-utils.ts` 和 `capabilities/staleness-sweeper/index.ts`。

### 衰减分级

默认 TTL = 90 天。rule-appender 追加时写入 `ttl(天)` 和 `最后验证` 列。

| 年龄 (age) | 权重 (weight) | 状态 |
|-------------|---------------|------|
| age < ttl * 0.5 | 1.0 | fresh |
| age < ttl | 0.5 | aging |
| age >= ttl | 0.1 | stale |
| age >= ttl * 2 | sweeper 删除 | expired |

### SessionStart 注入时处理

`handoff-provider` 在 SessionStart 读取 HANDOFF.md 后,调用 `processStaleness()` 对待沉淀区表格行计算权重:

- **stale** (weight <= 0.1): 行尾追加 `<!-- STALE weight=0.1 -->` 标注
- **aging** (weight < 1.0): 行尾追加 `<!-- AGING weight=0.5 -->` 标注
- **fresh** (weight = 1.0): 不标注

处理后在 HANDOFF.md 末尾追加 staleness 摘要。Tracer 记录 `stale_count` 和 `filtered_count` 指标。

### Staleness Sweeper

`staleness-sweeper` 扫描 HANDOFF.md,更新权重列和最后验证列:

- **默认** (`ruleBlock=false`): 仅更新权重和状态,不物理删除
- **ruleBlock=true**: `age > ttl * 2` 的 expired 条目被物理删除

**物理删除默认关闭**——删除是不可逆操作,需显式 `ruleBlock=true` 才执行。

### 设计决策

- **delete = archive not physical**: 物理删除默认关闭,避免不可逆风险
- **competitor claim = open problem**: mem0 等框架承认 staleness 但未下沉到 governance hook 层
- **tracing before staleness**: Phase 1 Tracing 先于 Phase 2 Staleness,staleness 验证需要 tracing 数据

## 引用

- 退役判据详表:[`core/constitution.md` §7](../core/constitution.md)
- 待沉淀区所在:`HANDOFF.md`(根目录)
- 追加能力:`capabilities/rule-appender`(GV-6)
- Staleness 工具:`plugin/staleness-utils.ts`
- Sweeper 能力:`capabilities/staleness-sweeper/index.ts`
- Tracer 能力:`capabilities/tracer/index.ts`


