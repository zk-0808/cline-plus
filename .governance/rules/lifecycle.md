# Lifecycle — 文档生命周期与待沉淀区晋升流程

> **生命周期**：永久保留 — 框架机制入口。
> **身份**：L2 Project Rules 薄入口，只定「必须有这个机制 + 判定格式」；完整流程与实现见文末引用。
> **加载机制**：Cline Rules 条件加载。薄度约束 ≤50 行（`delivery-framework-design.md §四` 薄度量化）。

---

## 文档生命周期标注

`.governance/` 下文档**必须**在文件头标注生命周期；归档条件必须具体可判定（如「v1.0 实现完成后」），禁止「以后」「适时」。

| 类型 | 格式 |
|------|------|
| 永久保留 | `永久保留 — <理由>` |
| 版本绑定 | `版本绑定 — <版本>,<归档条件>` |
| 任务绑定 | `任务绑定 — <任务>,<归档条件>` |
| 事件绑定 | `事件绑定 — <事件>,<归档条件>` |
| 会话绑定 | `每次覆写,无归档` |

## 待沉淀区格式

`HANDOFF.md` 必须含「待沉淀经验」结构化区块，列固定为
`id | 经验 | 来源 | 沉淀日期 | 状态 | ttl(天) | 最后验证 | 权重`；
格式以根目录 [`HANDOFF.md`](../../HANDOFF.md) 的现表格为准，本文件不重复贴模板。

## 晋升流程

1. **追加**：人判断「这值得沉淀」→ 调用 `rule-appender` 机械追加到待沉淀区
2. **Review**：人工 review，决定晋升 / 删除 / 改写
3. **晋升**：移到 `.governance/rules/`（装好即生效）或 `.governance/examples/`（需手动复制）
4. **删除**：从待沉淀区移除，不晋升

**判断由人做，追加由机器做，晋升由人做。**

## 规则退役流程

满足退役判据之一即触发评估：场景消失 / 被覆盖 / 长期未触发 / 重叠度过高 / 治理膨胀警报。退役保留期 `<rule_retire_keep_days>` 天（见 constitution 项目可调参数），便于误退役回滚。
**禁止退役**：执行门控类规则仅因「长期未触发」退役——未触发恰证明其有效。

## Memory Staleness

待沉淀条目随时间衰减（TTL / 权重分级 / 注入标注 / sweeper 清扫），详见 [`docs/developer-guide/staleness-internals.md`](../../docs/developer-guide/staleness-internals.md)。

## 引用

- 退役判据详表：[`core/constitution.md` §7](../core/constitution.md)
- 衰减机制详版与实现位置：[`staleness-internals.md`](../../docs/developer-guide/staleness-internals.md)
- 追加能力：[`capabilities/rule-appender`](../capabilities/rule-appender/index.ts)
