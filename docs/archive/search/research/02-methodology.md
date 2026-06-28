# 02 — Methodology

> 本章回答 RQ2：提示词层机制能否经受双盲 A/B + 量化评分的严格验证？
>
> 完整可复用模板见 [ab-test-template.md](../../skills/search-orchestrator/examples/ab-test-template.md)。本文件是该模板的方法论说明。

---

## 1. 设计原则

### 1.1 双盲 A/B + 单变量隔离

**核心思想**：A 跑基线，B 跑改造，共用同一份输入数据，按预设评分阈值裁定升级 / 回退。

```
单一 query
   ↓
search MCP 返回 top N 结果
   ↓
┌──────────────┬──────────────┐
│  Run A 基线  │  Run B 改造  │
│  原样输出    │  应用新规则  │
└──────┬───────┴──────┬───────┘
       ↓              ↓
       共用同一份原始结果
       ↓              ↓
   指标计算 + 评分
       ↓
   promote / rollback / refactor
```

**关键约束**：Run B **不重新调 search**，只在 Run A 数据上做 LLM 处理。这样严格隔离"规则带来的差异"，避免搜索引擎波动污染评测。

### 1.2 为什么不做"同一 query 反复跑求平均"

| 反模式 | 为什么不用 |
|--------|-----------|
| 同一 query 反复跑求平均 | 浪费搜索配额，不增加信息——LLM 在同一输入上的随机性远小于搜索引擎在 query 上的波动 |
| 用人造 query 测试 | 看不见真实污染（如中文技术查询的 CSDN/toutiao 农场污染） |
| 用 BOOST 命中率作指标 | 偏向"扩白名单冲动"，长尾永远赶不上 |
| 不存档结果 | 下次改进无对照基线 |
| 改造未跑 A/B 就合并 | 违反五问门控 Q4 |

### 1.3 五条铁律（来自 ab-test-template.md §6）

1. **真实问题 query**：直接使用真实场景里最近会问的问题，禁用人工构造
2. **目标污染源**：该 query 在不加规则时**必然返回垃圾**
3. **结果可判分**：至少存在一个明确"高质量"答案站
4. **单一 query**：不做 query rewrite/fanout，避免多变量混淆
5. **存档**：每次跑完必存 `run-N-*.md` 独立存档 + survey.md §9 表格

---

## 2. 评分阈值体系

按改造类型分四种评分尺度，互不混用。

### 2.1 通用尺度（适用 P1 / P1.5 / P6 等）

| 分数 | 含义 |
|------|------|
| 5/5 | 垃圾站清除率 ≥ 80% **且** Top 5 中至少 2 条升入 T1/T2 |
| 4/5 | 垃圾站清除率 ≥ 80% **或** Top 5 中至少 1 条升入 T1/T2 |
| 3/5 | 垃圾站清除率 50%~80%，Top 5 排序有可见改善 |
| 2/5 | 垃圾站清除率 < 50%，Top 5 几乎无变化 |
| 1/5 | Run B 与 Run A 实质等同，规则失效 |

**升级条件**：4/5 或 5/5 升级 active；3/5 回炉调参；2/5 / 1/5 回退。

### 2.2 P3 双维度评分（机制分 + 基础设施分）

P3 引入 fetch 覆盖率作为环境依赖变量，与机制质量解耦：

| 机制分 (Mechanism) | 条件 |
|-------------------|------|
| 5/5 | Claim-Quote 绑定率 ≥ 80% 且 误引用 = 0 且 标签完整率 100% |
| 4/5 | Claim-Quote 绑定率 ≥ 60% 且 误引用 ≤ 1 且 标签完整率 ≥ 90% |
| 3/5 | Claim-Quote 绑定率 ≥ 50% 且 误引用 ≤ 2 |
| 2/5 | Claim-Quote 绑定率 < 50% 但无编造 |
| 1/5 | 误引用 > 2 或存在编造的 Quote |

| 基础设施分 (Infrastructure) | 条件 |
|---------------------------|------|
| 5/5 | fetch 成功率 ≥ 80% |
| 4/5 | fetch 成功率 ≥ 60% |
| 3/5 | fetch 成功率 ≥ 40% |
| 2/5 | fetch 成功率 ≥ 20% |
| 1/5 | fetch 成功率 < 20% |

**报告方式**：报告两个分数，不合并。例如 `机制 5/5 · 基础设施 1/5`。**机制分 ≥ 4/5 即说明规则可采纳**；基础设施分决定 Tier A/B/C 档位（见 [03-mechanisms.md §3](03-mechanisms.md)）。

### 2.3 P4 三层核心指标 + 一层观察

| 层级 | 指标 | 通过条件 |
|------|------|---------|
| 核心 | Merge Precision（同源合并率） | ≥ 90% |
| 核心 | False Merge Count（误合并数） | = 0 |
| 核心 | Information Loss Count（信息损失数） | = 0 |
| 观察 | Unique Domains Delta | 仅记录，不参与判定 |

**评分尺度**：

| 分数 | 条件 |
|------|------|
| 5/5 | Merge Precision ≥ 90% 且 False Merge = 0 且 Info Loss = 0 |
| 4/5 | Merge Precision ≥ 80% 且 False Merge = 0 |
| 3/5 | Merge Precision ≥ 60% 且 False Merge ≤ 1 |
| 2/5 | Merge Precision < 60% 但无系统性误合并 |
| 1/5 | False Merge > 2 或存在系统性信息损失 |

**关键修订**：Run #7 发现"域名多样性 ≠ 内容多样性"——合并的 segmentfault.com 是转载站，释放的 slot 被同腾讯云其他文章填入。Top-5 域名多样性从 4→3 不是退化，是合并正确。详见 [D-2026-06-24-search-revise-p4-metrics](../decisions/D-2026-06-24-search-revise-p4-metrics.md)。

### 2.4 P5 评分（双盲 + 非结构化证据集）

P5 是最严格的评测，要求**双盲 + 非结构化证据集 + 多个 GT material relation**：

| 指标 | 通过方向 |
|------|---------|
| Material Conflict / Tradeoff Recall | Run B 高于 Run A，Δ ≥ +15% |
| Cross-Dimension Relation Recall | Run B 高于 Run A |
| Traceability Rate | Run B 不低于 Run A |
| False Conflict Count | Run B = 0 或不高于 Run A |
| Information Loss Count | Run B 不高于 Run A |

P5 Gap Ledger 派生指标（Run #14）：

| 指标 | Run A → Run B | Δ |
|------|--------------|---|
| Gap Detection Recall | 33.3% → 88.9% | **+55.6%** |
| Implicit Gap Recall | 40% → 80% | +40% |
| False Gap Count | 0 → 1 | +1（阻挡 5/5） |

**评分**：4/5 升级 active；5/5 需 Δ ≥ +30%（隐性的 +40% 满足）且 False Gap = 0。

---

## 3. Ground Truth 密封

### 3.1 为什么需要 GT 密封

```
不密封 GT：
  执行者看到 GT → 倾向只验证 GT 项 → 虚高 Recall
  ↓
密封 GT：
  执行者跑完 → 对照 GT 算分 → Recall 反映真实命中
```

### 3.2 密封流程（Run #13 / Run #14 采用）

```
Phase 0a  准备证据池（执行者可见）
   ↓ fetch 多源 evidence，归档到 experiments/run-N-phase0-evidence.md
   ↓
Phase 0b  续跑（如需要）
   ↓ 补足 evidence pool 至 gap 密集要求
   ↓
Phase 0c  GT 密封（独立文件）
   ↓ 独立观察者列举所有 GT gap + material relation
   ↓ 写入 run-N-ground-truth-sealed.md
   ↓ 执行者跑 Run A / Run B 时**看不到** GT 文件
   ↓
Phase 1a/1b  双盲 Run A / Run B
   ↓ 执行者按各自处理方式跑完
   ↓ 输出存档 run-N-run-{a,b}-output.md
   ↓
Phase 2  评分（揭开 GT）
   ↓ 对照 GT 计算 Recall / False Gap / Info Loss
   ↓ 给出分数与决策
```

### 3.3 GT 密封的失败模式（已观察）

| 失败 | 案例 | 缓解 |
|------|------|------|
| 单源列表型证据集天花板 | Run #9（1 URL × 4 同源 claim）→ Run A 基线 Claim Coverage 100%，Run B schema 抽取无提升空间 | 启动 Run #9b 改用多实体对比（Gin/Echo/Fiber × 5 维度） |
| 结构化证据集天花板 | Run #9b（P3 证据集已结构化）→ Field Alignment Δ=0 | 启动 Run #9c 改用非结构化证据集 |
| 自由文本天花板 | Run #13（Cross-Dimension 双方均 12/12）→ 自由文本叙事流同样能连接跨维度 | 衍生 Gap Ledger 最小机制，只验证追加枚举的增量 |

**教训**：评测设计本身就是迭代的——第一轮跑出天花板，要识别天花板归因，调整证据集 / 指标，再跑下一轮。**不要**只跑一轮就下结论。

---

## 4. 执行主体边界

### 4.1 Cline vs TRAE agent 职责划分

| 阶段 | 执行主体 | 理由 |
|------|---------|------|
| Phase 0a/0b 证据池采集 | **Cline + SKILL** | 需要 Goggle 过滤 / P3 三元组 / 三档模式 / 同源去重等 SKILL 层机制 |
| Phase 0c GT 密封 | **TRAE agent 或独立观察者** | 不依赖 SKILL 机制，只列 GT |
| Phase 1a/1b 双盲 Run A / Run B | **Cline + SKILL** | Run B 必须应用 SKILL 改造项 |
| Phase 2 评分 | **TRAE agent** | 揭开 GT 对照计算，不依赖 SKILL |

### 4.2 边界规则（project-rules.md §约束5）

> 当某步骤的 designated executor 是 Cline + SKILL 时（即需要 Goggle 过滤 / P3 三元组抽取 / 三档模式 / 同源去重等 SKILL 层机制），TRAE agent 不得直接用 WebSearch / WebFetch 等通用工具替代执行。

**判定**：若实验框架（run-N-*.md）的执行提示词是"复制到 Cline 执行"，则该步骤的执行主体是 Cline。TRAE agent 的 WebSearch / WebFetch 等价于"裸 search"层，缺少 SKILL 层的全部机制处理。

**违反时**：回滚 TRAE agent 产出的证据，交付提示词给用户在 Cline 中执行。

### 4.3 产出归档路径（project-rules.md §约束5 子条款）

Cline 执行提示词必须在开头声明输出文件的建议存放位置：

```
输出文件路径：docs/search-orchestrator/experiments/run-N-phase*-*.md
```

若提示词未声明位置，Cline 执行模型会自主选择位置（如 `research/`），导致产出文件脱离实验目录治理。此规则把 ab-test-template.md:140 的提示性语句提升为硬规则。

---

## 5. 实验归档约定

### 5.1 文件命名

| 类型 | 命名 | 示例 |
|------|------|------|
| 实验框架 | `run-N-<改造短名>.md` | `run-14-p5-gap-ledger.md` |
| Phase 0 证据池 | `run-N-phase0-evidence.md` | `run-14-phase0-evidence.md` |
| GT 密封 | `run-N-ground-truth-sealed.md` | `run-14-ground-truth-sealed.md` |
| Run A 输出 | `run-N-run-a-output.md` | `run-14-run-a-output.md` |
| Run B 输出 | `run-N-run-b-output.md` | `run-14-run-b-output.md` |
| 子轮（如重跑） | `run-Nb-*.md` | `run-12b-p4-summary-rewrite.md` |

### 5.2 状态值约定

**决策 status** 五值（[docs/README.md](../README.md)）：

| status | 含义 |
|--------|------|
| `proposed` | 已起草，待验证 |
| `active` | 正在执行 |
| `deferred` | 暂缓 |
| `superseded` | 被新决策取代 |
| `rolled-back` | 已回退 |

**机制候选状态**五值（[mechanism-candidates.md](../mechanism-candidates.md)）：

| status | 含义 |
|--------|------|
| `候选` | 已识别，未开始 |
| `实验中` | 在某个实验里验证 |
| `已机制化` | 机制已实现，对应经验应删除 |
| `永久C类` | 治理思考方式，不可机制化 |
| `已退休` | 经验对应的痛点已被 Cline 原生解决 |

**不要**引入其他状态值（如 `obsolete / deprecated / retired` 等会让状态膨胀失控）。

### 5.3 决策与实验的同步关系

| 触发动作 | 同步目标 |
|---------|---------|
| 落地新决策（D-*.md） | survey.md §9.1 决策表加一行 |
| 决策 status 变更 | survey.md §9.1 该行同步 + mechanism-candidates 对应条状态改为已机制化 |
| 完成 A/B 实验 | survey.md §9.2 实验表加一行（含评分与结论） |

---

## 6. 方法学贡献

### 6.1 三个可复用产物

| 产物 | 位置 | 用途 |
|------|------|------|
| A/B 测试模板 | [ab-test-template.md](../../skills/search-orchestrator/examples/ab-test-template.md) | 验证任意提示词改造项的复用框架 |
| 评分阈值体系 | 本文件 §2 | 4 种尺度的通过 / 回退门槛 |
| GT 密封流程 | 本文件 §3 | 防止执行者向 GT 靠拢 |

### 6.2 与传统 prompt engineering 评测的差异

| 维度 | 传统做法 | 本框架 |
|------|---------|--------|
| 评测对象 | LLM 输出质量（主观） | 提示词改造的**净增量**（客观） |
| 评测方法 | 人打分 / LLM-as-a-Judge | A/B 双盲 + 量化指标 |
| 评测粒度 | 整体 impression | Recall / False Positive / Info Loss 等分项 |
| 评测门槛 | "看起来更好" | 预设阈值（如 Δ ≥ +15%）触发 promote |
| 失败处理 | 调提示词再试 | 跑下一轮，识别天花板归因 |

### 6.3 局限

- **样本量小**：每轮通常 1 个 query × 10-15 条结果。Run #11 仅 3 对 translation，Net Gain +0.80 是上界估计
- **执行者偏差**：同一执行者跑 Run A / Run B 可能产生 framing effect；Run #9c 起改用严格双盲
- **ground truth 主观**：GT 由人列举，可能漏；Run #14 GT 9 gap + 5 relation 已是密集集
- **后端波动**：DDG 反爬触发会污染 fetch 成功率，需用 wrapper 隔离（见 [03-mechanisms.md §7](03-mechanisms.md)）

详见 [05-results.md §4 局限](05-results.md)。
