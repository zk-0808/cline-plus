# Handoff — Run #11 P4 语义场景补评测 + fetch_content 全文归档 Iron Law

## 本会话总账

### 会话起点

上会话完成 P6 Highlights 升级 active、SKILL 加载机制修复与 5 条现成结论归档。本会话按 handoff 的可选方向继续，优先推进 **P4 语义场景评测补充**，随后修复 Run #10/Run #11 暴露的 **fetch_content 归档问题**。

### 本会话决策

| 决策 | 状态 |
|------|------|
| Run #11：P4 语义场景去重增益验证 | ✅ 完成，评分 4/5 |
| Run #11 v1 query（Go 1.22 loop variable） | ❌ 数据不足，中文 fetch 失败（知乎 403），可验证语义同源对为 0 |
| Run #11 v2 query（K8s 1.30 sidecar containers） | ✅ 完成，产生 3 个 translation 对 + 2 个 verbatim 对 |
| P4 active 状态 | ✅ 获语义场景证据支撑（仅 translation 子类，样本量 3 对，方向性有效） |
| Baseline 结论表述 | ✅ 修订为 P/R/F1 + 混淆矩阵；区分算法边界 vs 数据限制 |
| fetch_content 全文归档问题 | ✅ 已机制化为 SKILL.md §2.1 Iron Law |
| 写 handoff | ✅ 用户显式要求，触发 project-rules.md 4.a |

---

## 关键成果 1：Run #11 P4 语义场景补评测

权威文件：
- [run-11-p4-semantic-merge.md](search-orchestrator/experiments/run-11-p4-semantic-merge.md)
- [run-11-output.md](search-orchestrator/experiments/run-11-output.md)
- [run-11-ground-truth.md](search-orchestrator/experiments/run-11-ground-truth.md)
- [run-11-baseline.py](search-orchestrator/experiments/run-11-baseline.py)
- [run-11-baseline-output.md](search-orchestrator/experiments/run-11-baseline-output.md)

### 实验设计

目标：补齐 survey.md §10.2 对 P4 的缺口——逐字场景 Run #7 已验证，但语义同源（改写/翻译/摘要式转载）需补评测。

对比：
- Run A：lexical baseline（URL normalization + SimHash + Jaccard）
- Run B：P4 LLM Same-Source Merge

执行主体：
- Phase 0 搜索 + fetch + P4 合并：Cline + SKILL
- Phase 1 ground truth 标注：TRAE agent
- Phase 2 baseline 脚本：TRAE agent
- Phase 3 指标计算：TRAE agent

### v1 失败记录

第一次 query：`Go 1.22 loop variable semantic change`

失败原因：
- 中文站点结果少，知乎 fetch 403
- fetch 成功的 8 个 URL 全为英文
- 唯一 translation 标注（知乎 → go.dev/blog）无法验证
- 可验证语义同源对样本量为 0

已记录在 run-11-p4-semantic-merge.md §9。

### v2 结果

第二次 query：`K8s 1.30 sidecar containers 新特性`

Ground truth：

| 类别 | 对数 |
|------|------|
| semantic-translation | 3（1-3, 1-8, 4-6） |
| verbatim | 2（2-7, 3-8） |
| different | 23 |
| 总配对 | 28 |

Baseline 仅合并 2-7，因此混淆矩阵：

|           | GT Positive | GT Negative |
|-----------|------------:|------------:|
| Merge     | 1 | 0 |
| Not Merge | 4 | 23 |

指标：

| 指标 | Baseline | P4 LLM |
|------|----------|--------|
| Precision | 1.00 | 1.00 |
| Recall | 0.20 | 1.00 |
| F1 | 0.33 | 1.00 |
| Semantic Merge Recall | 0.00 | 1.00 |
| False Merge | 0 | 0 |

评分：**4/5**。

### 重要解释边界

用户指出并已同步入文档的关键修订：

1. **translation Miss = 算法边界**
   - 1-3、1-8、4-6 全部 miss
   - 正确定性：lexical dedup 不具备跨语言能力，符合文献预期
   - 不应写成“算法失效”

2. **3-8 verbatim Miss = 数据限制**
   - Run #11 §2 仅存 fetch 摘要，不是完整正文
   - 测到的是“摘要级指纹”，不是“文档级指纹”
   - 不应推论 “SimHash 无法识别 verbatim mirror”

3. **Baseline 最重要性质是 FP=0**
   - 23 个 different 对无误合并
   - baseline 性质：高精度、低召回，宁漏杀不误杀

4. **Net Gain +0.80 是上界估计**
   - 摘要数据限制低估 baseline 的真实 verbatim 检测能力
   - 若用完整正文，baseline verbatim recall 可能更高，Net Gain 可能收窄

### 同步状态

已同步：
- survey.md §9.2：新增 Run #11 实验行
- survey.md §9.3：P4 状态行补 Run #11 结果
- survey.md §10.2：P4 现成结论影响补语义场景评测
- mechanism-candidates.md #19：状态更新为“已机制化（逐字 + 语义场景均验证通过）”

---

## 关键成果 2：fetch_content 全文归档 Iron Law

### 背景

Run #10 与 Run #11 都暴露同一问题：

- 输出文件 §2 标题写“fetch_content 全文归档”
- 实际只存 2-3 句摘要
- Run #10：影响 P6 highlights 事后完整字符串匹配验证
- Run #11：影响 SimHash/Jaccard baseline，导致 3-8 verbatim 对在摘要级指纹条件下 Miss

根因：SKILL.md §3.6.1 写“fetch_content 全文不直接进合成 context，只进 highlights”，但没有明确说明全文仍须归档。执行者将“不进合成 context”误读成“全文可丢弃”。

### 已落地修复

修改 [SKILL.md](../skills/search-orchestrator/SKILL.md)：

1. 新增 §2.1 `fetch_content 全文归档（Iron Law）`
   - 每个 fetch_content 成功 URL 必须完整归档正文
   - 不能用摘要、highlights、snippet 代替
   - fetch 失败 URL 也要记录 URL + 失败原因
   - 归档章节位于搜索结果表之后、P6 highlights 之前

2. 修改 §3.6.1 P6 触发条件
   - 澄清：“不直接进合成 context” ≠ “全文丢弃”
   - 正确数据流：全文 → 归档到输出文件 §2 + 抽取 highlights → highlights 进 Phase 4 合成

同步记录：
- [.clinerules](../.clinerules) 教训 4：升级为“已明确为 Iron Law”
- survey.md §9.4：新增工程约定（Iron Laws）表

---

## 本会话产生的新文件

| 文件 | 说明 |
|------|------|
| `docs/search-orchestrator/experiments/run-11-p4-semantic-merge.md` | Run #11 实验框架与结果记录 |
| `docs/search-orchestrator/experiments/run-11-output.md` | Run #11 Phase 0 Cline + SKILL 输出 |
| `docs/search-orchestrator/experiments/run-11-ground-truth.md` | Run #11 ground truth 标注 |
| `docs/search-orchestrator/experiments/run-11-baseline.py` | SimHash/Jaccard baseline 脚本 |
| `docs/search-orchestrator/experiments/run-11-baseline-output.md` | baseline 输出与 P/R/F1 分析 |

---

## 本会话修改的文件

| 文件 | 改动 |
|------|------|
| `skills/search-orchestrator/SKILL.md` | 新增 §2.1 fetch_content 全文归档 Iron Law；§3.6.1 补 P6/归档关系澄清 |
| `.clinerules` | 教训 4 更新为归档 Iron Law；补 Run #11 摘要级指纹教训 |
| `docs/search-orchestrator/survey.md` | §9.2 新增 Run #11；§9.3 P4 状态补 Run #11；§9.4 新增工程约定；§10.2 更新 P4 现成结论影响 |
| `docs/mechanism-candidates.md` | #19 更新为“已机制化（逐字 + 语义场景均验证通过）”，补 Run #11 结果 |

> 注意：git status 还显示上会话未提交的文件（如 D-2026-06-25-search-adopt-p6-highlights.md、run-10-output.md、搜索结论.md 等）。project-rules.md §4 子条款要求 handoff 后立即 commit，且 commit 应包含本会话产生的所有新文件和修改文件。若执行 commit，请先确认是否把上会话遗留未提交文件也一并纳入本次 handoff commit。

---

## 当前路线图

> 不在此处重列长期清单。权威源：
> - [survey.md §9.3 最终路线状态](search-orchestrator/survey.md#L314)
> - [mechanism-candidates.md](mechanism-candidates.md)

本会话净变化：
- P4：从“逐字场景已验证、语义场景待补” → “逐字 + translation 语义场景均有证据支撑”
- #19：更新为已机制化（逐字 + 语义场景均验证通过）
- 新增工程 Iron Law：fetch_content 成功 URL 必须完整正文归档

---

## 未完成项 / 后续可选方向

| 方向 | 说明 | 优先级 |
|------|------|--------|
| Run #11 summary/rewrite 子类补评测 | Run #11 只验证了 translation 子类，无 summary/rewrite 样本。若要全面 5/5，需另设 query 或人工构造结果集 | 低 |
| P5 Output Schema 重设计 | 当前 proposed，Run #9c 双盲证伪。若推进需全新方向（非结构化证据集 + 非字段对齐 schema） | 低 |
| #22 Browser Fetch 启动评估 | 当前候选（暂缓）。触发条件：Tier C snippet-only 被证明严重影响答案质量 | 低 |
| 完成 handoff commit | project-rules.md §4 子条款要求。需决定是否纳入上会话遗留未提交文件 | 中 |

---

## Handoff（下次会话第一句话建议）

首句话提示词（复制到新会话开头使用）：

```text
先读 docs/project-rules.md 一次，遵守里面的三份文档职责划分与五条防漂移约束。
然后读 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：本会话完成 Run #11 P4 语义场景补评测（4/5，仅 translation 子类，P4 active 获方向性语义证据支撑），并将 Run #10/Run #11 暴露的 fetch_content 摘要归档问题修复为 SKILL.md §2.1 Iron Law。当前无紧急机制待办。若继续，可选方向是 Run #11 summary/rewrite 子类补评测、P5 Output Schema 重设计、#22 Browser Fetch 触发评估，或先处理 handoff commit。
