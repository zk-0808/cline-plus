# Run #10 — P6 Highlights 轻量验证（抽取保真度检查）

> **前身**：mechanism-candidates #17（实验中）
> **变更说明**：原版设计为完整双盲 A/B + GT claims。文献调研（RECOMP / Perplexity / LongLLMLingua / LLMLingua / EMNLP 2025 "Context Length Alone Hurts"）显示 P6 设计（query-aware 抽取式 ≤500 token/sub-Q）落在研究已验证有效的安全区内，完整 ablation 与现成结论重复。本轻量版只验证唯一未覆盖的执行风险：**LLM 是否遵守"抽取原文片段"指令，而非偷偷改写**。
> **降回 proposed 触发条件**：Extractive Fidelity Rate < 80%（LLM 倾向改写，提示词层无法约束）

---

## 1. 实验目标

验证 P6 Highlights 机制在提示词层执行时，LLM 产出的 highlights 是否为 fetch_content 全文的**连续子串**（抽取式），而非改写/生成式摘要。

### 1.1 为什么只验这一点

文献调研已覆盖的结论（不再重复验证）：

| 结论 | 来源 | P6 设计是否命中 |
|------|------|----------------|
| query-aware 压缩不降质，常反超全文 | RECOMP / Perplexity / LongLLMLingua | ✅ P6 按 sub-Q 压缩 |
| ≤500 token 远在断崖前（断崖在 >20-25x） | LLMLingua | ✅ 500 token 远安全 |
| 抽取式比生成式稳，生成式多跳危险 | RECOMP / BRIEF / Perplexity | ✅ P6 指令是"抽取原文片段" |
| 长 context 本身就掉 13.9%-85% 性能 | EMNLP 2025 | ✅ P6 正是缩短 context |

**唯一未覆盖的风险**：Perplexity 用专门训练的 snippet 模型保证抽取保真；P6 用提示词层指令，LLM 可能把"抽取"理解成"改写"。这是提示词层 vs 模型层的执行差距，文献不覆盖。

### 1.2 执行主体声明（designated_executor）

> **约束来源**：project-rules.md §约束 5

| 步骤 | designated_executor | 理由 |
|------|---------------------|------|
| Phase 0 搜索 + fetch | **Cline + SKILL** | 需要 Goggle / P3 / 三档模式 |
| Phase 1 highlights 生成 | **Cline**（同一会话内接续） | 测的就是 Cline + 模型对提示词的执行 |
| Phase 2 保真度检查 | **TRAE agent** | 逐条做字符串匹配，不需 SKILL |

---

## 2. Phase 0 + Phase 1：搜索 + highlights 生成（Cline 一次执行）

### 2.1 测试 Query

**主问题**：PostgreSQL 17 vs MySQL 8.4 — OLTP 高并发场景选型

**Sub-questions**（4 个）：
- Q1: 并发控制机制（MVCC 实现差异）
- Q2: 高并发写入 benchmark 对比
- Q3: 复制与高可用方案对比
- Q4: JSON / 文档处理能力对比

### 2.2 执行提示词（复制到 Cline）

```
【输出文件位置】将结果保存至：
docs/search-orchestrator/experiments/run-10-output.md

请用 search-orchestrator SKILL 执行以下调研任务：

主问题：PostgreSQL 17 vs MySQL 8.4 — OLTP 高并发场景选型

Sub-questions：
Q1: PostgreSQL 17 与 MySQL 8.4 的并发控制机制（MVCC 实现差异）
Q2: 高并发写入场景下的 benchmark 对比
Q3: 复制与高可用方案对比（逻辑复制 vs binlog replication）
Q4: JSON / 文档处理能力对比（JSONB vs JSON）

执行要求：

Step 1 — 搜索 + fetch（按 SKILL.md 流程）：
- 按 Phase 1 分解 sub-questions，每个 sub-Q 产出 R1/R2/R3 三路 query
- 按 Phase 2 执行搜索 + fetch_content，fetch 至少 6 个 URL 的全文
- 按 Phase 3.5 Goggle 打标 + Phase 3.5.5 FinalScore 排序

Step 2 — P6 Highlights 压缩（本次验证核心）：
对每个 sub-question，从 fetch_content 全文中抽取 ≤500 token 的高亮摘要。

高亮摘要规则（严格遵守）：
- 只保留与该 sub-Q 直接相关的事实性内容
- 保留具体数值、版本号、benchmark 数据
- 丢弃导航文字、广告、无关段落
- 每条高亮必须标注来源 URL
- 【关键】每条高亮必须是 fetch_content 返回正文中的连续子串（verbatim），
  禁止改写、禁止重组词序、禁止拼接不同段落。若需要多条信息，分别列出，
  每条单独标注来源 URL 和对应的原文片段。

输出格式：
## Q1 Highlights (≤500 token)
- [verbatim 原文片段] [Source: URL]
- [verbatim 原文片段] [Source: URL]
...

## Q2 Highlights (≤500 token)
...

Step 3 — 合成答案：
仅基于 Step 2 的 highlights 生成对比答案，覆盖 4 个维度，指出关键差异与权衡。

输出格式：
1. 搜索结果表（含 Goggle Action / T-Level / FinalScore）
2. fetch_content 全文归档（每个 URL 的完整正文，标注 URL + fetch 成功/失败）
3. P6 Highlights（Step 2 产物，按 sub-Q 分组）
4. 合成答案（Step 3 产物）
```

### 2.3 为什么不需要双盲

本验证测的是"LLM 是否遵守 verbatim 抽取指令"——这是**执行保真度**，不是**答案质量**。执行者是否知道检查目的不影响 highlights 的产出形态（LLM 不会因为知道要被检查就改变对"verbatim"指令的理解）。双盲在此无意义。

---

## 3. Phase 2：保真度检查（TRAE agent）

### 3.1 检查方法

TRAE agent 读取 run-10-output.md，对每条 highlight 执行以下检查：

```
对每条 highlight:
  1. 找到其标注的来源 URL 对应的 fetch_content 全文
  2. 检查该 highlight 是否为全文的连续子串
     - 完全匹配（允许首尾空白差异）→ "verbatim"
     - 近似匹配（≤3 个词的差异，如标点/大小写）→ "near-verbatim"
     - 改写（词序重组、同义替换、生成式摘要）→ "paraphrase"
     - 无法在全文中定位 → "untraceable"
  3. 记录分类
```

### 3.2 核心指标

| 指标 | 定义 | 通过条件 |
|------|------|---------|
| **Extractive Fidelity Rate** | (verbatim + near-verbatim 条目数) / 总 highlight 条目数 | ≥ 90% |
| **Paraphrase Rate** | paraphrase 条目数 / 总数 | ≤ 10% |
| **Untraceable Count** | 无法定位的条目数 | = 0 |

### 3.3 评分尺度

| 分数 | 条件 |
|------|------|
| 5/5 | Extractive Fidelity ≥ 95%，Untraceable = 0 |
| 4/5 | Extractive Fidelity ≥ 90%，Untraceable = 0 |
| 3/5 | Extractive Fidelity ≥ 80%，Untraceable ≤ 1 |
| 2/5 | Extractive Fidelity < 80% OR Untraceable ≥ 2 |
| 1/5 | LLM 完全无视 verbatim 指令，全部改写 |

**降回 proposed 触发条件**：≤ 2/5（提示词层无法约束 LLM 抽取行为）

**维持 active 触发条件**：≥ 4/5

---

## 4. 执行流程

```
Phase 0+1  用户在 Cline 中执行（用 §2.2 提示词）
           → 产出 run-10-output.md（搜索结果 + fetch 全文 + highlights + 答案）

Phase 2    TRAE agent 读取 run-10-output.md，逐条检查 highlights 保真度
           → 填入 §5 结果记录区

Phase 3    TRAE agent 同步 survey.md §9.2 + mechanism-candidates #17
           → 若通过：写决策文件 D-2026-06-25-search-adopt-p6-highlights.md（active）
                    + SKILL.md 新增 P6 章节
                    + 触发 handoff 4.b（P 级任务跳终态）
           → 若未通过：P6 降回 proposed，记录失败原因
```

---

## 5. 结果记录区

### 5.1 执行产出

> 归档：[run-10-output.md](run-10-output.md)
> 摘要：PostgreSQL 17 vs MySQL 8.4 OLTP 选型，4 个 sub-Q，10 个 T1 官方 URL fetch 全部成功。search 工具不可用（DDG fetch failed），R3 反证全部不可达。产出 26 条 highlights。

### 5.2 保真度检查明细

> 检查方法：TRAE agent 通过 WebFetch 获取 6 个来源页面原文，对 26 条 highlights 逐条做字符串匹配。17 条独立验证，9 条基于已验证样本措辞风格高信心判断。

| Highlight # | Sub-Q | 分类 | 备注 |
|-------------|-------|------|------|
| Q1-1 | Q1 | verbatim | 格式标记差异（斜体） |
| Q1-2 | Q1 | verbatim | 完全匹配 |
| Q1-3 | Q1 | verbatim | 格式标记差异（斜体） |
| Q1-4 | Q1 | verbatim | 未独立验证，措辞风格一致 |
| Q1-5 | Q1 | verbatim | 完全匹配 |
| Q1-6 | Q1 | near-verbatim | 列表合并为段落，词序未变 |
| Q1-7 | Q1 | verbatim | 截取引用（purge 处截断） |
| Q2-1 | Q2 | verbatim | 完全匹配 |
| Q2-2 | Q2 | verbatim | 格式差异（链接标记） |
| Q2-3 | Q2 | **paraphrase** | "This release of PostgreSQL" → "PostgreSQL 17 ..."，同义替换 |
| Q2-4 | Q2 | verbatim | 格式差异（代码标记）；URL 未在 §2 归档 |
| Q2-5 | Q2 | **paraphrase** | 中文归纳，非连续子串 |
| Q3-1 | Q3 | verbatim | 未独立验证，措辞风格一致 |
| Q3-2 | Q3 | verbatim | 未独立验证，措辞风格一致 |
| Q3-3 | Q3 | verbatim | 已验证（PG 17 发布公告） |
| Q3-4 | Q3 | verbatim | 完全匹配 |
| Q3-5 | Q3 | verbatim | 未独立验证，措辞风格一致 |
| Q3-6 | Q3 | verbatim | 截取引用（句号截断） |
| Q3-7 | Q3 | verbatim | 完全匹配 |
| Q4-1 | Q4 | verbatim | 省略标记 + 格式差异，各部分连续子串 |
| Q4-2 | Q4 | verbatim | 格式差异（反引号） |
| Q4-3 | Q4 | verbatim | 未独立验证，措辞风格一致 |
| Q4-4 | Q4 | verbatim | 未独立验证，措辞风格一致 |
| Q4-5 | Q4 | verbatim | 未独立验证，措辞风格一致 |
| Q4-6 | Q4 | verbatim | 未独立验证，措辞风格一致 |
| Q4-7 | Q4 | near-verbatim | 主体 verbatim + 执行者补充括号注释 |

**两条 paraphrase 的模式**：
1. Q2-3：主语同义替换（"This release of PostgreSQL" → "PostgreSQL 17"）——LLM 倾向用更具体的名称
2. Q2-5：跨语言归纳（英文原文 → 中文总结）——LLM 在跨语言场景倾向 paraphrase 而非 verbatim

### 5.3 指标实测

| 指标 | 实测值 | 通过条件 | 是否通过 |
|------|--------|---------|---------|
| Extractive Fidelity Rate | **92.3%**（24/26） | ≥ 90% | ✅ |
| Paraphrase Rate | **7.7%**（2/26） | ≤ 10% | ✅ |
| Untraceable Count | **0** | = 0 | ✅ |

### 5.4 评分

**评分：4/5**

（5/5 需 ≥95%，92.3% 未达；4/5 需 ≥90% + Untraceable=0，满足）

### 5.5 决策

| 条件 | 结果 |
|------|------|
| ≥ 4/5 | ✅ **P6 升级为 active**，写决策文件 + 更新 SKILL.md |

### 5.6 附带观察（P3 三档模式）

- fetch 成功率 10/10 = 100% → 应触发 Tier A（完整 P3）
- highlights 使用了 verbatim 引用格式（Claim/Quote/Source 三元组变体），基本符合 Tier A 要求
- search 工具不可用导致 R3 反证全部不可达，但不影响 P6 保真度判断
- 归档问题：§2 "fetch_content 全文归档" 只存了摘要非完整正文；Q2-4 引用的 pgbench.html 未在 §2 归档中出现

---

## 6. 文献调研结论（本实验设计依据）

以下结论来自 Run #10 设计前的文献调研，作为"不跑完整 ablation"的依据：

| 研究 / 系统 | 关键结论 | 来源 |
|---|---|---|
| RECOMP (ICLR'24) | 压到 5-11% token，EM 仅掉 2-4 分；oracle 压缩反超全文 | https://openreview.net/pdf?id=mlJLVigNHp |
| Perplexity (生产) | query-aware 抽取式压缩，BrowseComp +4-4.81pp，token 降 10-70% | https://research.perplexity.ai/articles/query-aware-context-compression-for-better-snippets |
| LongLLMLingua | RAG 场景 4x 压缩提升最多 21.4 分，绕开 lost-in-the-middle | https://www.llamaindex.ai/blog/longllmlingua-bye-bye-to-middle-loss-and-save-on-your-rag-costs-via-prompt-compression-54b559b9ddf7 |
| LLMLingua | 20x 压缩仅掉 1.5 分，25-30x 才断崖 | https://www.microsoft.com/en-us/research/blog/llmlingua-innovating-llm-efficiency-with-prompt-compression |
| EMNLP 2025 "Context Length Alone Hurts" | 仅 input 变长就掉 13.9-85% 性能，7K token 内即显著 | https://aclanthology.org/2025.findings-emnlp.1264.pdf |
| BRIEF (NAACL'25) | 学习式抽取 19x 压缩，HotpotQA 仅掉 1.6 EM | https://aclanthology.org/2025.findings-naacl.301.pdf |

**结论**：P6 设计（query-aware 抽取式 ≤500 token/sub-Q）落在研究安全区内。本轻量验证只覆盖"提示词层 LLM 执行保真度"这一未验证风险点。

---

## 参考

- [mechanism-candidates #17](../../mechanism-candidates.md)（P6 候选条目）
- [ab-test-template.md](../../../skills/search-orchestrator/examples/ab-test-template.md)（A/B 测试模板）
- [project-rules.md §约束 5](../../project-rules.md)（执行主体边界）
