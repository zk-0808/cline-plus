# Handoff — 会话交接

> **生命周期**：每次覆写,无归档——会话交接文件。
>
> **进入规则**：会话开始时先读 `.governance/core/constitution.md` 与 `.governance/rules/`,再读本文件。
>
> **使用方式**：本文件为空模板。新会话开始时按 `.governance/rules/handoff-entry.md` 读取门控执行;会话结束按 constitution §4 触发器覆盖写。填写示例见 `.governance/examples/handoff-example.md`。

---

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
|（待填）|

## 本会话净变化

### 代码

-（待填）

### 文档

-（待填）

### 关键经验

-（待填）

## 待办

### 未完成项

| id | 项 | confidence | depends_on |
|----|----|-----------|------------|
|（待填）|

### 后续可选

- 🔲（待填）

## 阻塞项

| 阻塞点 | 影响 | 缓解 |
|--------|------|------|
|（待填）|

## 关键资源

```
（待填）
```

## 待沉淀经验

> 此区由 rule-appender 自动追加,人工 review 后晋升到 rules/ 或删除。
> 晋升流程见 .governance/rules/lifecycle.md。

| id | 经验 | 来源 | 沉淀日期 | 状态 |
|----|------|------|---------|------|
|（空,rule-appender 追加）|

## 新会话首动作

1. 读 `.governance/core/constitution.md`
2. 读本文件
3. 读 `.governance/rules/` 下当前活跃入口规则
4.（待填:按本会话未完成项推进顺序）

---

## Handoff（推荐下次会话开局交接语句）

```text
读 .governance/core/constitution.md + HANDOFF.md + .governance/rules/。
```
