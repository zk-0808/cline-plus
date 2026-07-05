# Handoff Entry — 交接机制薄入口

> **生命周期**：永久保留 — 框架机制入口。
>
> **身份**：L2 Project Rules 薄入口。装好即生效,指向 handoff 机制完整内容。
>
> **加载机制**：Cline Rules 条件加载(按路径触发)。

---

## 触发条件

新会话首动作 / 用户明确要求交接 / 未 commit 文件堆积达阈值 / 对话过长 + 话题跳转。

具体阈值与触发器列表见 [`.governance/core/constitution.md`](../core/constitution.md) §4。

## 读取门控

新会话开始时**必须**按序读取:

1. `.governance/core/constitution.md`
2. `HANDOFF.md`(根目录)
3. `.governance/rules/` 下当前活跃的入口规则
4. `.governance/examples/` 下被复制到本项目的参考实现(如有)

读完前**禁止**启动任何开发动作。

## 写入门控

只在 constitution §4 三触发器命中时覆盖写 `HANDOFF.md`。写入内容只保留:

- 本会话决策(含 confidence / depends_on)
- 本会话净变化
- 未完成项表(强制三字段:`id` / `confidence` / `depends_on`)
- 下次会话第一句话

## 机制承接

- **写入**:`HANDOFF.md` 由人/hook 写,见 constitution §5 经验机制化
- **读取**:`capabilities/handoff-provider`(GV-6)在 SessionStart hook 触发时读取并注入
- **快照**:`.governance/runtime/snapshot.json` 由 `capabilities/snapshot-writer`(GV-6)在 PreCompact hook 写入

## 引用

- 触发器:[`core/constitution.md` §4](../core/constitution.md)
- 待沉淀区晋升:[`lifecycle.md`](lifecycle.md)
- 交接文件模板:仓库根 `HANDOFF.md`
