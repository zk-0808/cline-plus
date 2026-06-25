# Run #11 — P4 语义场景去重增益验证（LLM vs SimHash/Jaccard 基线）

> **前身**：Run #7（P4 逐字镜像验证，Merge Precision 100%）
> **变更说明**：Run #7 只验证了逐字/近逐字镜像场景。survey.md §10.2 裁决指出 P4 唯一有价值的窗口是**语义级同源合并**（改写/翻译/摘要式转载），需补评测。本实验对比 P4 LLM 与 SimHash/Jaccard + URL 规范化算法基线在语义场景下的去重增益。
>
> **v2 变更（2026-06-25）**：Phase 0 第一次尝试用 "Go 1.22 loop variable semantic change" 主题，因中文站点 fetch 失败（知乎 403）导致可验证的语义同源对样本量为 0，无法支撑 Phase 1-3。换 query 为 "K8s 1.30 sidecar containers 新特性"，并在提示词中明确要求 fetch 多个中文站点（掘金/腾讯云/CSDN/博客园），不依赖知乎。第一次尝试的产出归档于 §9。
> **降级触发条件**：P4 LLM Semantic Merge Recall < 40% 或 Net Gain < +20% → P4 标注"仅逐字场景有效"
> **升级触发条件**：P4 LLM Semantic Merge Recall ≥ 60% 且 Net Gain ≥ +30% 且 False Merge = 0 → survey.md §10.2 补"语义场景已验证"

---

## 1. 实验目标

验证 P4 Same-Source Merge 在**语义级同源**场景下，相对 SimHash/Jaccard + URL 规范化算法基线的去重增益。

### 1.1 背景

| 项 | 内容 |
|---|---|
| Run #7 覆盖范围 | 逐字镜像（标题相同 + 摘要开头完全相同），Merge Precision 100% |
| Run #7 未覆盖 | 语义改写、跨语言翻译、摘要式转载 |
| survey.md §10.2 裁决 | 逐字场景 P4 是 overkill 但功能等价；语义场景 P4 有真正价值但需补评测 |
| 现成结论依据 | Manning IR Book §19.6 + Manku/Google WWW'07：SimHash/shingling 明确"做不好"语义相似度 |

### 1.2 核心假设

| 假设 | 内容 | 预期 |
|------|------|------|
| H1 | P4 LLM 在语义同源对上的 Merge Recall 显著高于 SimHash/Jaccard 基线 | Run B > Run A |
| H2 | P4 LLM 的 False Merge Rate 仍为 0（不误合并无关内容） | = 0 |
| H3 | SimHash/Jaccard 在跨语言语义同源对上 Recall ≈ 0（无法检测翻译） | Run A ≈ 0 |

### 1.3 为什么需要基线对比

survey.md §10.2 要求："给出相对'SimHash/Jaccard + URL 规范化'基线的、可复现的语义去重增益证据"。单独测 P4 LLM 的 Recall 无法证明"LLM 比算法强"——必须同集对比。

---

## 2. 执行主体声明（designated_executor）

> **约束来源**：project-rules.md §约束 5

| 步骤 | designated_executor | 理由 |
|------|---------------------|------|
| Phase 0 搜索 + fetch + P4 合并 | **Cline + SKILL** | 需要 Goggle / P3 / P4 全流程 |
| Phase 1 Ground truth 标注 | **TRAE agent** | 读取 fetch 全文，逐对判断语义同源性，不需 SKILL |
| Phase 1b 用户抽检 | **用户** | 抽检 20% 验证 TRAE agent 标注质量 |
| Phase 2 SimHash/Jaccard 基线 | **TRAE agent** | 写 Python 代码，算法层执行 |
| Phase 3 指标计算与对比 | **TRAE agent** | 对比两 arm 与 ground truth |

---

## 3. Phase 0：搜索 + fetch + P4 合并（Cline 执行）

### 3.1 测试 Query

**主问题**：K8s 1.30 sidecar containers 新特性 — 解决了什么问题，怎么用

**Sub-questions**：
- Q1: K8s 1.30 sidecar containers 的具体机制（与普通 container / init container 的区别）
- Q2: sidecar containers 解决了什么历史问题（Job 不退出、init container 顺序依赖、sidecar 重启导致主容器失败）
- Q3: 迁移影响与兼容性（如何启用，是否破坏现有 Pod 定义，beta 状态）

**Query 选择理由**：
- K8s 官方文档有英文原文（T1，kubernetes.io）
- 中文技术社区（掘金、腾讯云开发者社区、CSDN、博客园）覆盖好，有大量原创分析/翻译/摘要（T2/T3）
- 同一特性被多个中文博主撰写，rewrite/summary 同源对概率高
- 英文官方 + 中文翻译构成跨语言语义同源对
- 主题足够具体，同源内容概率高
- Run #1 已验证 K8s 主题在 DDG 搜索中返回中文结果质量可控

### 3.2 执行提示词（复制到 Cline）

```
【输出文件位置】将结果保存至：
docs/search-orchestrator/experiments/run-11-output.md

请用 search-orchestrator SKILL 执行以下调研任务：

主问题：K8s 1.30 sidecar containers 新特性 — 解决了什么问题，怎么用

Sub-questions：
Q1: K8s 1.30 sidecar containers 的具体机制（与普通 container / init container 的区别）
Q2: sidecar containers 解决了什么历史问题（Job 不退出、init container 顺序依赖、sidecar 重启导致主容器失败）
Q3: 迁移影响与兼容性（如何启用，是否破坏现有 Pod 定义，beta 状态）

执行要求：

Step 1 — 搜索 + fetch（按 SKILL.md 流程）：
- 按 Phase 1 分解 sub-questions，每个 sub-Q 产出 R1/R2/R3 三路 query
- 按 Phase 2 执行搜索 + fetch_content
- 【关键】刻意保留中文结果，至少 fetch 以下中文站点中的 3 个：
  * juejin.cn（掘金）
  * cloud.tencent.com/developer（腾讯云开发者社区）
  * blog.csdn.net（CSDN）
  * cnblogs.com（博客园）
  不依赖知乎（可能 403），但若返回也可尝试 fetch
- 同时 fetch 英文官方源（kubernetes.io）作为 T1 锚点
- fetch 总数至少 8 个 URL 的全文，其中中文站点至少 3 个
- 按 Phase 3.5 Goggle 打标 + Phase 3.5.5 FinalScore 排序

Step 2 — P4 同源内容合并（本次验证核心）：
按 SKILL.md §1.4.5 Step 3.bis 执行同源内容合并。
【关键】判断"同源转载"时，不仅判断逐字镜像，还要判断以下语义级同源：
  - 跨语言翻译（英文原文 + 中文翻译，内容实质相同但语言不同）
  - 摘要式转载（长文 + 短文摘要，核心信息相同但详略不同）
  - 改写/洗稿（同一内容不同措辞，核心论点相同）
若判断为同源，只保留权威分级最高的版本（T1 > T2 > T3 > T4）。

Step 3 — 输出格式（严格遵守，后续需要在原始数据上跑基线）：

## §1 原始搜索结果表（fetch 前，全部结果）
| # | Title | URL | Snippet | 来源路（R1/R2/R3） |
|---|-------|-----|---------|--------------------|
（所有结果都要列出，包括后续被 P4 合并的）

## §2 fetch_content 全文归档
### URL-1: <url>
fetch 状态：成功/失败
正文：<完整正文>
...
（每个 fetch 的 URL 都要归档完整正文，不是摘要）

## §3 P4 合并决策表
| 合并组 | 被合并 URL # | 保留 URL # | 判断依据 | 同源类型（verbatim/translation/summary/rewrite） |
|--------|-------------|------------|---------|------------------------------------------------|
（列出所有合并决策，标注同源类型）

## §4 合并后结果集 + Goggle/T-Level/FinalScore
| # | Title | URL | Goggle Action | T-Level | FinalScore |
|---|-------|-----|---------------|---------|-----------|

## §5 合成答案
（基于合并后结果集生成）
```

### 3.3 关键约束

- **§1 原始结果表必须包含所有结果**（含被合并的），后续 SimHash/Jaccard 基线在这份数据上跑
- **§2 fetch 全文必须归档完整正文**，不是摘要——Run #10 的归档问题（只存摘要）是前车之鉴
- **§3 P4 合并决策表必须标注同源类型**（verbatim/translation/summary/rewrite），这是后续 ground truth 对比的基础

---

## 4. Phase 1：Ground truth 标注（TRAE agent）

### 4.1 标注方法

TRAE agent 读取 run-11-output.md 的 §1 原始结果表 + §2 fetch 全文，对结果集中所有两两配对（C(n,2) 对）执行以下分类：

| 类别 | 定义 | 示例 |
|------|------|------|
| **verbatim** | 逐字/近逐字镜像（标题相同或高度相似，内容 >90% 重叠） | 同一篇文章被多站转载 |
| **semantic-translation** | 跨语言翻译（一种语言的原文 + 另一种语言的翻译，核心内容相同） | 英文 Go 博客 + 中文翻译 |
| **semantic-summary** | 摘要式转载（长文 + 短文摘要，核心信息相同但详略不同） | 官方发布公告 + 博客摘要 |
| **semantic-rewrite** | 改写/洗稿（同一内容不同措辞，核心论点相同） | 内容农场改写 |
| **different** | 不同内容（主题不同，或同主题但不同文章/不同角度） | 两篇不同的 Go 1.22 分析 |

> **语义同源统称**：semantic-translation + semantic-summary + semantic-rewrite 三类合称"语义同源"。

### 4.2 输出格式

TRAE agent 产出 `run-11-ground-truth.md`：

```markdown
# Run #11 Ground Truth — 语义同源对标注

## 标注方法
（TRAE agent 读取 fetch 全文，逐对分类）

## 配对分类表
| #A | #B | 类别 | 判断依据（1 行） |
|----|----|-----|-----------------|
| 1 | 3 | semantic-translation | #1 英文 Go 博客，#3 中文翻译，核心内容相同 |
| 2 | 5 | different | 都是 Go 1.22 分析但角度不同（性能 vs 兼容性） |
| ... | ... | ... | ... |

## 统计
- verbatim 对数：N
- semantic-translation 对数：N
- semantic-summary 对数：N
- semantic-rewrite 对数：N
- different 对数：N
- 语义同源对总数（三类合计）：N
```

### 4.3 用户抽检

用户随机抽取 **20% 的配对**（至少 5 对）验证 TRAE agent 标注：
- 若不一致率 ≤ 20% → 信任 TRAE agent 标注，继续
- 若不一致率 > 20% → 全量人工复核

---

## 5. Phase 2：SimHash/Jaccard 基线（TRAE agent）

### 5.1 算法实现

TRAE agent 写 Python 脚本 `run-11-baseline.py`，对 run-11-output.md §1 原始结果集执行：

```python
# 输入：run-11-output.md §1 原始结果表（title + snippet + URL）+ §2 fetch 全文
# 输出：run-11-baseline-output.md（算法层合并决策表）

# 1. URL 规范化
#    - 去除 fragment、query 参数中的 tracking 参数（utm_*, fbclid 等）
#    - 统一 scheme、host 大小写、去除 trailing slash
#    - 若规范化后 URL 相同 → 判为同源

# 2. SimHash（对 title + snippet + fetch 正文前 500 字）
#    - 分词（中文用 jieba，英文按空格）→ hash → 64-bit 指纹
#    - 汉明距离 ≤ 3 → 判为同源

# 3. Jaccard（对 title + snippet 的 k-shingle, k=4）
#    - Jaccard 系数 ≥ 0.9 → 判为同源

# 任一方法判为同源 → 合并（保留 SearchRank 更高的）
```

### 5.2 参数选择依据

| 参数 | 值 | 来源 |
|------|---|------|
| SimHash Hamming threshold | 3 | Manku/Google WWW'07 实验值（precision/recall ≈ 0.75） |
| Jaccard threshold | 0.9 | Manning IR Book §19.6 推荐值 |
| k-shingle | 4 | Manning IR Book 默认值 |
| fetch 正文截取 | 前 500 字 | 对齐 P6 highlights 的 ≤500 token 上限，公平比较 |

### 5.3 输出格式

```markdown
# Run #11 Baseline — SimHash/Jaccard + URL 规范化

## 算法参数
（列出实际使用的参数）

## 合并决策表
| #A | #B | URL 规范化 | SimHash 汉明距 | Jaccard 系数 | 合并决策 | 保留 |
|----|----|-----------|---------------|-------------|---------|------|
| 1 | 3 | 不同 | 28 | 0.05 | 不合并 | — |
| 2 | 5 | 不同 | 2 | 0.92 | 合并 | #2 |
| ... | ... | ... | ... | ... | ... | ... |

## 统计
- URL 规范化合并对数：N
- SimHash 合并对数：N
- Jaccard 合并对数：N
- 总合并对数（去重）：N
```

---

## 6. Phase 3：指标计算与对比（TRAE agent）

### 6.1 指标定义

| 指标 | 定义 | 计算方式 |
|------|------|---------|
| **Verbatim Merge Recall** | 逐字镜像对中被正确合并的比例 | 正确合并的 verbatim 对 / verbatim 对总数 |
| **Semantic Merge Recall** | 语义同源对中被正确合并的比例 | 正确合并的 semantic 对 / semantic 对总数 |
| **False Merge Count** | 被合并但 ground truth 为 different 的对数 | 误合并数 |
| **Information Loss** | 误合并导致丢失的独特 claim 数 | 人工核查 |
| **Net Gain** | P4 LLM 相对基线的语义召回增益 | Run B Semantic Recall − Run A Semantic Recall |

### 6.2 对比表

| 指标 | Run A（SimHash/Jaccard） | Run B（P4 LLM） | 差值 |
|------|--------------------------|------------------|------|
| Verbatim Merge Recall | __% | __% | __ |
| **Semantic Merge Recall** | __% | __% | **__** |
| └ translation 子类 | __% | __% | __ |
| └ summary 子类 | __% | __% | __ |
| └ rewrite 子类 | __% | __% | __ |
| False Merge Count | __ | __ | __ |
| Information Loss | __ | __ | __ |
| **Net Gain** | — | — | **__** |

### 6.3 评分尺度

| 分数 | 条件 |
|------|------|
| 5/5 | Semantic Recall ≥ 80% 且 Net Gain ≥ +50% 且 False Merge = 0 |
| 4/5 | Semantic Recall ≥ 60% 且 Net Gain ≥ +30% 且 False Merge = 0 |
| 3/5 | Semantic Recall ≥ 40% 且 Net Gain ≥ +20% |
| 2/5 | Semantic Recall < 40% 或 Net Gain < +20% |
| 1/5 | False Merge > 2 或 P4 LLM 无法识别任何语义同源对 |

### 6.4 决策规则

| 评分 | 决策 |
|------|------|
| ≥ 4/5 | ✅ P4 active 状态获语义场景证据支撑，survey.md §10.2 补"语义场景已验证" |
| 3/5 | ⚠️ 有条件通过——P4 语义能力存在但增益有限，记录但不升级 §10.2 措辞 |
| ≤ 2/5 | ❌ P4 标注"仅逐字场景有效"，survey.md §10.2 补"语义场景未通过" |

---

## 7. 执行流程

```
Phase 0   用户在 Cline 中执行（用 §3.2 提示词）
          → 产出 run-11-output.md（§1 原始结果 + §2 fetch 全文 + §3 P4 决策 + §4 合并后 + §5 答案）

Phase 1   TRAE agent 读取 run-11-output.md，标注 ground truth
          → 产出 run-11-ground-truth.md（两两配对分类表 + 统计）

Phase 1b  用户抽检 20% 配对，验证标注质量
          → 若不一致率 > 20% 则全量人工复核

Phase 2   TRAE agent 写 run-11-baseline.py，跑在 §1 原始结果 + §2 fetch 全文上
          → 产出 run-11-baseline-output.md（算法层合并决策表）

Phase 3   TRAE agent 对比 Run A / Run B / ground truth，计算指标
          → 填入 §8 结果记录区
          → 同步 survey.md §9.2 实验表 + mechanism-candidates #19
          → 若 ≥ 4/5：survey.md §10.2 补"语义场景已验证"
          → 若 ≤ 2/5：survey.md §10.2 补"语义场景未通过"，P4 标注"仅逐字场景有效"
```

---

## 8. 结果记录区

### 8.1 执行产出

| 产出 | 文件 |
|------|------|
| Phase 0（Cline + SKILL） | [run-11-output.md](run-11-output.md) |
| Phase 1（TRAE agent 标注） | [run-11-ground-truth.md](run-11-ground-truth.md) |
| Phase 2（基线脚本） | [run-11-baseline.py](run-11-baseline.py) |
| Phase 2（基线输出） | [run-11-baseline-output.md](run-11-baseline-output.md) |

### 8.2 Ground Truth 统计

| 类别 | 对数 |
|------|------|
| verbatim | 2（对 2-7, 3-8） |
| semantic-translation | 3（对 1-3, 1-8, 4-6） |
| semantic-summary | 0 |
| semantic-rewrite | 0 |
| different | 23 |
| **语义同源合计**（translation + summary + rewrite） | **3** |
| **总配对数** | **28** |

### 8.3 指标实测

**混淆矩阵**（将 semantic-translation + verbatim 视为 GT Positive）：

|           | GT Positive | GT Negative |
| --------- | ----------: | ----------: |
| Merge     | TP          | FP          |
| Not Merge | FN          | TN          |

**Run A（SimHash/Jaccard 基线）**：

|           | GT Positive | GT Negative |
| --------- | ----------: | ----------: |
| Merge     | 1           | 0           |
| Not Merge | 4           | 23          |

| 指标 | Run A（基线） | Run B（P4 LLM） | 差值 |
|------|--------------|------------------|------|
| Precision | 1.00 (100%) | 1.00 (100%) | 0 |
| Recall | 0.20 (20%) | 1.00 (100%) | +0.80 |
| F1 | 0.33 | 1.00 | +0.67 |
| Verbatim Merge Recall | 50.0%（1/2，受摘要数据限制） | 100.0% | +50.0% |
| **Semantic Merge Recall** | **0.0%（3/3 Miss）** | **100.0%** | **+100.0%** |
| └ translation 子类 | 0.0%（算法边界） | 100.0% | +100.0% |
| └ summary 子类 | N/A（无样本） | N/A（无样本） | N/A |
| └ rewrite 子类 | N/A（无样本） | N/A（无样本） | N/A |
| False Merge Count (FP) | 0 | 0 | 0 |
| Information Loss | 0 | 0 | 0 |
| **Net Gain（Recall 差）** | — | — | **+0.80** |

**Baseline 失败归因细分**（关键——区分两类失败原因）：

| Miss 对 | GT 类型 | 失败原因 | 性质 |
|---------|---------|---------|------|
| 1-3 | translation | 跨语言 token 集合不重叠（J(A_en,A_zh)≈0） | **算法边界**（文献一致结论） |
| 1-8 | translation | 同上 | **算法边界** |
| 4-6 | translation | 同上 | **算法边界** |
| 3-8 | verbatim | §2 仅存摘要非完整正文，测到的是"摘要级指纹"而非"文档级指纹" | **数据限制**（非算法无能） |

**关键定性**（区分两类失败）：
1. **translation Miss = 算法边界**：lexical dedup 不具备跨语言能力。这是 SimHash/shingling 的已知范式边界，与 Manning IR Book §19.6、Manku/Google WWW'07 一致。**不能表述为**"SimHash 失效"——应表述为"lexical 方法范式上做不到跨语言"。
2. **3-8 verbatim Miss = 数据限制**：SimHash 本为全文近重复设计，摘要截断破坏了经典设定。**不能表述为**"SimHash 无法识别 verbatim mirror"——应表述为"在摘要替代正文条件下，verbatim mirror 未被检测到"。

**Baseline 性质定性**：高精度（P=1.00）、低召回（R=0.20）——"宁漏杀，不误杀"。FP=0 是 baseline 最值得强调的性质，与工业搜索引擎传统 dedup 配置一致。改进方向应聚焦提升召回，精度已无提升空间。

**P4 LLM 详细数据**：
- 4 个合并组：{1,3,8}, {4,6}, {2,7}, {5}（5 独立）
- 所有 3 个 translation 对 + 2 个 verbatim 对均被正确合并到同一组
- G3 类型标注为 rewrite，实际为 verbatim（同一作者跨平台发布，内容实质相同），类型标注有误但合并决策正确

### 8.4 评分

**评分：4/5**

**评分依据**（§6.3 尺度）：
- Semantic Recall 100% ≥ 60% ✅
- Net Gain +100% ≥ +30% ✅
- False Merge = 0 ✅
- → 数字上满足 5/5 条件（≥ 80% 且 ≥ +50% 且 = 0）

**降级理由**（4/5 而非 5/5）：
1. **样本量限制**：语义同源对仅 3 对，统计显著性有限，结果仅作方向性参考
2. **子类覆盖不全**：3 对全部为 translation，无 summary/rewrite 子类样本，无法验证 P4 在这些子类上的表现
3. **数据限制影响 baseline 评测**：§2 仅存摘要非完整正文，导致 baseline 在 3-8 verbatim 对上也 Miss（"摘要级指纹"非"文档级指纹"，SimHash 经典设定被破坏）。这一数据限制使 baseline 的真实 verbatim 检测能力被低估——若用完整正文，baseline 对 verbatim 的 Recall 可能更高，Net Gain 可能收窄。**因此 Net Gain +0.80 是一个上界估计，不能作为 baseline 真实能力的定论**
4. **5/5 应意味着"全面验证"**，但实际只验证了 translation 子类，不足以支撑"全面"结论

### 8.5 决策

| 评分 | 决策 |
|------|------|
| 4/5 | ✅ P4 active 状态获语义场景证据支撑，survey.md §10.2 补"语义场景已验证（仅 translation 子类，样本量 3 对）" |

**核心结论**：

1. **Baseline 性质**：lexical baseline（URL 规范化 + SimHash + Jaccard）实现 perfect precision (1.00) 但 low recall (0.20)。所有跨语言 translation 对均 Miss，与 lexical similarity 方法的已知局限一致。一个额外的 verbatim 对也因仅有 fetch 摘要而非完整文档正文可用于指纹生成而未检出。在 23 个 non-duplicate 对中未观察到任何误合并。

2. **P4 LLM 优势**：在跨语言 translation 场景下，P4 LLM Semantic Recall 100% vs baseline 0%，Net Gain +0.80（Recall 差）。这是 lexical 方法范式上做不到的（J(A_en,A_zh)≈0），与 survey.md §10.2 现成结论的理论预期一致。

3. **局限**：样本量仅 3 对语义同源（全部 translation，无 summary/rewrite 子类），结论仅有方向性意义。Net Gain +0.80 是上界估计——摘要数据限制使 baseline 的真实 verbatim 检测能力被低估，若用完整正文，Net Gain 可能收窄。summary/rewrite 子类仍待验证。

### 8.6 用户抽检结果

| 抽检对数 | 一致对数 | 不一致对数 | 不一致率 | 决策 |
|---------|---------|-----------|---------|------|
| __ | __ | __ | __% | 待抽检 |

> **待用户抽检**：从 28 对中随机抽取 6 对（≈20%）验证 TRAE agent 标注。建议抽检包含至少 2 个同源对（如 1-3, 4-6）和 4 个 different 对。

---

## 9. Phase 0 第一次尝试失败记录（Go 1.22 loop variable）

> **归档说明**：本节记录 Phase 0 第一次尝试的产出与失败原因，供后续实验设计参考。产出文件 run-11-output.md 将被 v2（K8s 1.30 sidecar containers）覆盖。

### 9.1 第一次尝试 Query

**主问题**：Go 1.22 loop variable semantic change — 修复了什么问题，有什么影响

### 9.2 失败原因

| 问题 | 详情 |
|------|------|
| 中文站点 fetch 失败 | 知乎（zhuanlan.zhihu.com）HTTP 403 Forbidden；Medium 可能被限；dev.to 未 fetch |
| 语义同源对样本量为 0 | fetch 成功的 8 个 URL 全部是英文，无可验证的跨语言语义同源对 |
| 唯一的 translation 标注无法验证 | P4 LLM 标注 G4（知乎翻译 → go.dev/blog）为 translation，但知乎 fetch 失败，无法验证是否真为翻译 |
| 跨路由重复占大多数 | P4 LLM 识别的 7 组合并中，4 组是跨路由重复（同 URL 在不同搜索路由中出现），属于搜索结果去重范畴，非 P4 目标场景 |
| verbatim 镜像只有 2 组 | G1（HackerNoon → go.dev）、G2（zchee → go.dev/wiki），Run #7 已覆盖逐字场景 |

### 9.3 P4 LLM 识别的合并决策（第一次尝试）

| 组 | 类型 | 可验证性 |
|----|------|---------|
| G1: HackerNoon → go.dev/blog | verbatim mirror | ✅ 两方 fetch 成功 |
| G2: zchee → go.dev/wiki | verbatim mirror | ✅ 两方 fetch 成功 |
| G3: go101.org 跨路由 | verbatim duplicate（跨 R1/R2/R3） | — 非 P4 目标 |
| G4: 知乎翻译 → go.dev/blog | translation | ⚠️ 知乎 403，无法验证 |
| G5: stackoverflow 跨路由 | verbatim duplicate | — 非 P4 目标 |
| G6: forum.golangbridge.org 跨路由 | verbatim duplicate | — 非 P4 目标 |
| G7: golang/go discussion 跨路由 | verbatim duplicate | — 非 P4 目标 |

### 9.4 教训

1. **英文主导话题不适合语义场景验证**：Go 1.22 是英文主导的技术话题，中文社区结果稀少，无法产生足够的语义同源对样本
2. **fetch 层瓶颈是结构性问题**：Run #8a 已确认中文场景永久 Tier C，知乎 403 是常见模式。实验设计不能依赖单一中文站点的 fetch 成功
3. **v2 改进**：换用中文社区覆盖更好的主题（K8s 1.30 sidecar containers），提示词明确要求 fetch 多个中文站点（掘金/腾讯云/CSDN/博客园），不依赖知乎

---

## 10. 设计依据

### 10.1 为什么选 K8s 1.30 sidecar containers（v2）

survey.md §10.2 现成结论指出："语义级同源（改写/洗稿/翻译/摘要式转载）"是 P4 唯一有价值的窗口。v1（Go 1.22）因英文主导导致中文结果稀少且 fetch 失败，无法产生语义同源对样本。v2 选 K8s 1.30 sidecar containers 因为：

- 中文技术社区（掘金、腾讯云、CSDN、博客园）覆盖好，多个博主撰写同一特性，rewrite/summary 同源对概率高
- 英文官方（kubernetes.io）+ 中文翻译构成跨语言 translation 同源对
- 不依赖知乎（403 风险），改用 fetch 稳定性更好的中文站点

SimHash/Jaccard 基于句法相似度，对跨语言对召回必然为 0，对同语言改写对召回也低（措辞不同则 shingle 集合不重叠）。这为 H3（基线语义召回低）提供了理论保证，也使 Net Gain 的测量有区分度。

### 10.2 为什么用 SimHash + Jaccard + URL 规范化三重基线

现成结论指出："结果级尺度（几条到上百条）下，朴素 SimHash/Jaccard + URL 规范化几行代码即可平替逐字去重。"三重基线对应三种检测路径：
- URL 规范化：检测同站 URL 变体
- SimHash：检测全文近重复（汉明距 ≤ 3）
- Jaccard：检测标题/摘要 k-shingle 重叠

三者任一命中即合并，是算法层能做到的"最宽松"配置，给基线最大优势。

### 10.3 为什么 Ground Truth 用 TRAE agent 辅助 + 用户抽检

全量人工标注成本高且不可复现；全量 TRAE agent 标注有循环论证风险（LLM 标注 LLM）。TRAE agent 辅助 + 20% 抽检是平衡点：用 LLM 的语义理解能力做初筛，用人工抽检控制标注质量。20% 阈值与 Run #10 的保真度检查思路一致（抽样验证而非全量）。

---

## 参考

- [mechanism-candidates #19](../../mechanism-candidates.md)（P4 候选条目，已机制化）
- [survey.md §10.2](../survey.md)（P4 现成结论裁决）
- [D-2026-06-24-search-adopt-p4-same-source-merge](../../decisions/D-2026-06-24-search-adopt-p4-same-source-merge.md)（P4 决策文件）
- [D-2026-06-24-search-revise-p4-metrics](../../decisions/D-2026-06-24-search-revise-p4-metrics.md)（P4 指标修订）
- [run-7-p4-dedup.md](run-7-p4-dedup.md)（Run #7 逐字镜像验证）
- [ab-test-template.md §2.6](../../../skills/search-orchestrator/examples/ab-test-template.md)（P4 专属指标体系）
- [project-rules.md §约束 5](../../project-rules.md)（执行主体边界）
