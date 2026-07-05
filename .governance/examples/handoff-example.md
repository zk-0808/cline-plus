# Handoff Example — 交接文件填写示例

> **生命周期**：版本绑定 — v1.0 框架定型后归档。
>
> **身份**：EX-4 产出。HANDOFF.md 的填写示例,展示决策 / 净变化 / 未完成项 / 待沉淀区的标准格式。
>
> **使用方式**：用户复制仓库根 `HANDOFF.md` 空模板后,参考本文件填写。本文件本身不加载,仅作示例。

---

## cline++ 特定假设

> 本示例包从 cline++ 项目蒸馏。下列假设若不适用你的项目,需修改对应章节。

| 假设 | 影响章节 | 修改建议 |
|------|---------|---------|
| 假设使用 Confidence 模型(Verified/Likely/Hypothesis) | 全文 | 改为你的状态值体系,同步修改 constitution §2 |
| 假设使用 ADR 编号体系 | 决策表 | 改为你的决策编号体系 |
| 假设 handoff 写入后立即 git commit | 净变化区 | 若不用 git,改为你的版本控制流程 |
| 假设存在 mechanism-candidates.md 候选清单 | 待办表 | 删除该引用,或建你自己的候选清单 |
| 假设存在 evidence-governance.md 证据治理文件 | 决策表 confidence 列 | 改为你的证据规则文件 |

---

## 示例填充内容

下方为一段完整填充示例,展示四区结构:**决策 / 净变化 / 未完成项 / 待沉淀经验**。新会话用户读完本文件后,可按此结构填自己的 `HANDOFF.md`。

```markdown
# Handoff — <一句话主题>

> **生命周期**：每次覆写,无归档——会话交接文件。
> **进入规则**：会话开始时先读 `.governance/core/constitution.md` 与 `.governance/rules/`,再读本文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `feature-x-adopt` | 采纳 feature X 方案,理由:性能实测优于替代方案 Y 15% | Verified | `benchmark-run-1` |
| `api-contract-frozen` | API 契约 v1.0 冻结,后续变更走 ADR | Verified | `feature-x-adopt` |
| `legacy-deprecate` | legacy 模块标记 deprecated,6 个月后删除 | Likely | `api-contract-frozen` |

## 本会话净变化

### 代码

- 新增 `src/feature-x/` 模块(commit `<hash>`)
- 重构 `src/legacy/` 加 deprecated 标注

### 文档

- 新增 `.governance/decisions/adr/ADR-001-feature-x.md`
- 更新 `README.md` 安装步骤

### 关键经验

- **尽早冻结 API 契约**：契约未定时多线并行开发风格漂,统一升级为硬前置（rubric 未定不开工）
- **实测先于推论**：原推论"X 优于 Y"在实测中发现仅在 N≥100 时成立,推论需配边界条件

## 待办

### 未完成项

| id | 项 | confidence | depends_on |
|----|----|-----------|------------|
| `feature-x-doc` | feature X 用户文档 | Likely | `api-contract-frozen` |
| `legacy-migrate-1` | 模块 A 从 legacy 迁移到 feature X | Hypothesis | `api-contract-frozen` |
| `benchmark-scale` | 大规模场景 benchmark(≥1000 并发) | Hypothesis | - |

### 后续可选

- 🔲 第二个产品线 dogfood 验证 feature X 通用性
- 🔲 性能监控 dashboard

## 阻塞项

| 阻塞点 | 影响 | 缓解 |
|--------|------|------|
| BL-1 外部依赖 Z 版本不可用 | 完整集成测试 | 持续监控 Z 官方 release |

## 关键资源

```
API 契约:     .governance/decisions/adr/ADR-001-feature-x.md
benchmark:    experiments/benchmark-run-1.md
上一会话:     commit <hash>
```

## 待沉淀经验

> 此区由 rule-appender 自动追加,人工 review 后晋升到 rules/ 或删除。
> 晋升流程见 .governance/rules/lifecycle.md。

| id | 经验 | 来源 | 沉淀日期 | 状态 |
|----|------|------|---------|------|
| `exp-001` | 推论需配边界条件,实测发现 X 优于 Y 仅在 N≥100 时成立 | benchmark-run-1 | 2026-07-05 | 待 review |
|（rule-appender 追加）|

## 新会话首动作

1. 读 `.governance/core/constitution.md`
2. 读本文件
3. 读 `.governance/rules/` 下当前活跃入口规则
4. 按 `feature-x-doc` → `legacy-migrate-1` → `benchmark-scale` 顺序推进

---

## Handoff（推荐下次会话开局交接语句）

```text
读 .governance/core/constitution.md + HANDOFF.md + .governance/rules/。
```
```

---

## 修改提示

接入新项目时,替换下列项目取值:

| 项目取值 | 替换为 | 影响章节 |
|---------|--------|---------|
| `<一句话主题>` | 你的会话主题 | 标题 |
| `feature-x` / `legacy` 等具体模块名 | 你的模块名 | 决策表 / 净变化 |
| `<hash>` commit 引用 | 你的版本控制标识 | 净变化 / 关键资源 |
| ADR-001 编号 | 你的 ADR 编号 | 决策表 / 关键资源 |
| `2026-07-05` 沉淀日期 | 实际日期 | 待沉淀经验表 |
| `≥1000 并发` benchmark 阈值 | 你的性能阈值 | 未完成项表 |

## 引用

- 交接机制入口:[`../rules/handoff-entry.md`](../rules/handoff-entry.md)
- 待沉淀区晋升流程:[`../rules/lifecycle.md`](../rules/lifecycle.md)
- 触发器与字段定义:[`../core/constitution.md` §4](../core/constitution.md)
