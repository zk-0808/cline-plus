# Handoff — SKILL 未加载重大发现 + P6 实验框架待重设计

## 本会话总账

### 会话起点

上会话完成 P5 Output Schema 三轮验证终态（Run #9c 2/5 双盲证伪，P5 降回 proposed）。handoff 列出下次动作：从 P6 / M-22 / #20 / #21 中选一项推进。

### 本会话决策

| 决策 | 状态 |
|------|------|
| 修复 project-rules.md 标题漂移（"四条"→"五条"） | ✅ 已落地 |
| 选择 P6 Highlights 作为下一步方向（收益最高且能一次性推进） | ✅ 已选 |
| 写 Run #10 完整双盲 A/B 实验框架 | ✅ 已写，后作废 |
| 文献调研发现 P6 设计落在研究安全区 | ✅ 完成（RECOMP / Perplexity / LongLLMLingua / LLMLingua / EMNLP 2025） |
| Run #10 重写为轻量版（只验抽取保真度） | ✅ 已写 |
| **发现 Cline 从未加载 SKILL** | ✅ 确认（可能 B 成立） |
| 写 handoff | ✅ 本文件 |

### 关键发现

```
重大发现：Cline 从未加载 search-orchestrator SKILL

现象：
  用户在 Cline 执行 Run #10 Phase 0 时，模型思考链显示：
  "Let me first read the SKILL file"
  但实际读取的是 run-10-phase0-evidence.md（证据文件），不是 SKILL.md

根因：
  项目根目录无 .clinerules 或任何 Cline 配置文件
  所有历史 Run（#1~#9c）的提示词都是自然语言引用：
    "请用 search-orchestrator SKILL 执行"
    "按 SKILL.md L2 流程执行"
  没有任何一次 Run 用过 @search-orchestrator 或类似语法调用
  提示词"请用 X SKILL"不等于 SKILL 被加载

影响范围（可能 B 成立）：
  所有历史 Run 的"SKILL 执行产出"可信度存疑
  模型可能从未读过 SKILL.md，只是按自己对"搜索调研"的理解执行
  产出"符合 SKILL 流程"的假象可能源于：
    ① 模型本身能力 + 提示词里散落的 SKILL 术语（Phase 1/Goggle/P3）
    ② 模型对"调研方法论"的通用理解，恰好与 SKILL.md 部分重合

与约束 5 的关系：
  约束 5 解决的是"TRAE agent 越界用 WebSearch 替代 Cline SKILL"
  本次发现的是更底层问题：
    即使执行主体正确（Cline），SKILL 本身从未被加载
  约束 5 的前提"designated executor 是 Cline + SKILL"中的"SKILL"部分从未成立
```

### P6 文献调研结论（本会话唯一有价值的产出）

```
P6 Highlights 设计落在研究安全区内，完整 ablation 与现成结论重复：

| 研究 | 关键结论 |
|------|---------|
| RECOMP (ICLR'24) | 压到 5-11% token，EM 仅掉 2-4 分；oracle 压缩反超全文 |
| Perplexity (生产) | query-aware 抽取式，BrowseComp +4-4.81pp，token 降 10-70% |
| LongLLMLingua | RAG 4x 压缩提升最多 21.4 分，绕开 lost-in-the-middle |
| LLMLingua | 20x 压缩仅掉 1.5 分，25-30x 才断崖 |
| EMNLP 2025 | 仅 input 变长就掉 13.9-85% 性能，7K token 内即显著 |
| BRIEF (NAACL'25) | 学习式抽取 19x 压缩，HotpotQA 仅掉 1.6 EM |

P6 设计要素全部命中安全区：
  - query-aware 压缩 ✅
  - ≤500 token 远在断崖前 ✅
  - 抽取式非生成式 ✅
  - 缩短 context 本身就是收益 ✅

唯一未覆盖风险：
  Perplexity 用专门训练的 snippet 模型保证抽取保真
  P6 用提示词层指令，LLM 可能把"抽取"理解成"改写"
  → 但此风险因 SKILL 未加载问题，尚未验证
```

### 本会话产生的文件

| 文件 | 说明 |
|------|------|
| `docs/search-orchestrator/experiments/run-10-p6-highlights.md` | Run #10 实验框架（轻量版，待重设计） |

### 本会话修改的文件

| 文件 | 改动 |
|------|------|
| `docs/project-rules.md` | 标题"四条"→"五条"（修复漂移） |
| `docs/mechanism-candidates.md` | #17 候选 → 实验中（Run #10 轻量版），附文献调研依据 |
| `docs/handoff.md` | 本文件 |

### ⚠️ 实验生效前置条件提醒（下次会话执行任何 Run 前必查）

> **本会话教训**：Run #1~#9c 全部在"SKILL 未加载"状态下执行，结论可信度存疑。下次会话执行任何新 Run 前，必须确认以下前置条件全部成立：

| # | 前置条件 | 验证方式 | 当前状态 |
|---|---------|---------|---------|
| 1 | **Cline 已加载 search-orchestrator SKILL** | 查 Cline 官方文档确认加载机制（`.clinerules` / `@skill-name` / 其他），修复项目配置后实测模型能读取到 SKILL.md 内容 | ❌ 未确认 |
| 2 | **提示词不依赖自然语言引用触发 SKILL 加载** | "请用 X SKILL"不等于 SKILL 被加载；必须用 Cline 实际支持的加载语法 | ❌ 未确认 |
| 3 | **搜索 MCP（duckduckgo）可用** | 在 Cline 中实测 search 工具调用成功 | ⚠️ 本会话末搜索限流 |
| 4 | **fetch_content MCP 可用** | 在 Cline 中实测 fetch 工具调用成功 | ❓ 未测 |
| 5 | **designated_executor 声明已写入实验框架** | 检查 run-N-*.md 的 §1.x 执行主体声明（约束 5 子条款） | ✅ Run #10 已写 |
| 6 | **双盲要求（若实验设计为双盲）** | 执行者不知道 GT；GT 文件密封；Run A/B 在不同会话执行 | 视实验设计而定 |

**任一前置条件未满足时，禁止执行 Run**。违反前置条件产出的实验数据不可信，会污染 survey.md §9.2 实验表与 mechanism-candidates 状态。

---

### 明确不做的事

- ✅ 不在 SKILL 加载机制确认前执行任何新 Run
- ✅ 不引用历史 Run（#1~#9c）的结论作为可信依据——需先回顾评估
- ✅ 不假设"请用 X SKILL"提示词能触发 SKILL 加载

### 当前路线图

> **不在此处展开**。权威源：[survey.md §9.3 最终路线状态](search-orchestrator/survey.md#L311-L321)。
>
> 本会话对路线的净变化：
> - `P6 Highlights`：候选 → 实验中（Run #10 轻量版）— 但因 SKILL 未加载问题，实验框架待重设计
> - **历史 Run #1~#9c 结论可信度全部存疑**（待回顾）

### 未完成项

> **不在此处展开**。权威源：
> - 机制候选清单：[mechanism-candidates.md](mechanism-candidates.md)
> - 决策与实验进度：[survey.md §9](search-orchestrator/survey.md#L277)
>
> 下次会话的**核心任务**：
>
> | 任务 | 说明 |
> |------|------|
> | 1. 确认 Cline SKILL 加载机制 | 查官方文档：是 `.clinerules` 引用？`@skill-name` 语法？还是别的？修复项目配置 |
> | 2. 回顾所有历史 Run 可信度 | Run #1~#9c 哪些结论可保留、哪些需重做、哪些可直接搜现成结论替代 |
> | 3. 重新设计实验框架 | 在 SKILL 加载机制修复后，重新设计 Run #10 及后续实验 |
> | 4. 评估"自实验 vs 搜现成结论" | 对每个候选机制判断：是否值得自实验，还是直接引用学术/工程结论 |
> | 5. P6 落地决策 | 基于文献调研结论 + SKILL 加载修复后的轻量验证，决定 P6 是否 active |

### Handoff（下次会话第一句话建议）

> **首句话提示词**（复制到新会话开头使用）：
>
> ```
> 先读 docs/project-rules.md 一次，遵守里面的三份文档职责划分与五条防漂移约束。
> 然后读 docs/handoff.md，按下面的工作内容继续。
> ```
>
> ---
>
> **接续上下文**：上会话发现重大问题——Cline 从未加载 search-orchestrator SKILL，所有历史 Run（#1~#9c）的"SKILL 执行产出"可信度存疑（可能 B 成立：模型从未读 SKILL.md，只按通用理解执行）。本会话另完成 P6 文献调研，确认 P6 设计落在研究安全区（RECOMP/Perplexity/LongLLMLingua/LLMLingua/EMNLP 2025），完整 ablation 与现成结论重复。Run #10 已写轻量版框架但因 SKILL 加载问题待重设计。**下一步**：① 确认 Cline SKILL 加载机制并修复项目配置；② 回顾所有历史 Run 可信度；③ 重新设计实验框架；④ 对每个候选评估"自实验 vs 搜现成结论"；⑤ P6 落地决策。
