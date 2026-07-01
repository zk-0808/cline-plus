# 优先矩阵与重构难点评估

**文件**: `docs/plugin/deep-research-task-4-priority-matrix.md`
**状态**: active
**evidence_as_of**: 2026-07-01
**背景依据**: `mechanism-landing-assessment.md §3`（#1-#7落地评估）、`plugin-dev-sop.md`（4处契约违反）、`ADR-005`（handoff拆分）、`external-review-round2-handoff.md`（双投影模型）、`snapshot-extractor-design.md §7`（v0.7.0风险表）

---

## 1. 统一优先级矩阵

根据价值、开发成本、阻塞依赖、技术风险 4 个维度，对所有候选工作项（W1-W14）进行量化评估：

| # | 工作项 | 来源来源 | 价值 | 成本 | 阻塞 | 风险 | 最终状态/排序 |
|---|--------|--------|------|------|------|------|--------------|
| **W1** | v0.7.0 提取器实现 | snapshot-extractor-design.md | high | medium | none | medium | **P0 - 核心落地** |
| **W2** | handoff.md schema 化（三字段）| external-review-handoff-foundation.md | high | low | none | low | **P0 - 核心落地** |
| **W3** | 语义对象模型 + 双投影 | external-review-round2-handoff.md | high | high | none | medium | **P1 - 演进重点** |
| **W4** | Loop Guard 注入层验证 | handoff.md 未完成项 | medium | low | codec-bug | low | **P2 - 待 bug 修复** |
| **W5** | 真实长对话 compact 验证 | handoff.md 未完成项 | high | low | codec-bug | low | **P2 - 待 bug 修复** |
| **W6** | dual-setup 根因升级到 Verified | investigation-note-dual-setup.md | low | low | external | low | **P3 - 依赖官方** |
| **W7** | design.md §3.3.2 废弃标注 | handoff.md 历史项 | — | — | — | — | **Completed** |
| **W8** | README 术语统一 | handoff.md 历史项 | — | — | — | — | **Completed** |
| **W9** | State Machine & Control Flow Center | 任务 3 映射结论 | high | medium | none | medium | **P1 - 演进重点** |
| **W10**| Evaluator / Deterministic Validator | 任务 3 映射结论 | high | medium | none | high | **P1 - 演进重点** |
| **W11**| Observation / Signal Priority Filter | 任务 3 映射结论 | medium | low | none | low | **P0 - 快速见效** |
| **W12**| Memory / High-fidelity Memory Injector | 任务 3 映射结论 | high | high | none | medium | **P1 - 演进重点** |
| **W13**| Tooling / Tool Safety Harness | 任务 3 映射结论 | medium | low | none | low | **P0 - 快速见效** |
| **W14**| Architecture / Clean Contract | 任务 3 映射结论 | high | medium | external | low | **P3 - 长期跟进** |

---

## 2. 维度定义与评价基准

* **价值**：
  * **high**：对跨 agent 的通用基石性能力有贡献（如记忆保留、防止死循环、确定性验证）。
  * **medium**：对单一功能鲁棒性或自动化质量有提升。
  * **low**：辅助性、诊断性或对核心机制无直接影响的改动。
* **成本**：
  * **high**：需要复杂的 AST 解析、多模型协同或大规模数据结构重构（工程量 > 1 人周）。
  * **medium**：需要编写跨模块 Hook 逻辑或精细的文本解析算法（3-5 天）。
  * **low**：纯粹的代码层微调、配置修改或静态文档更新（< 1 天）。
* **阻塞**：
  * **none**：当前 CLI 环境下可独立开发和验证，无外部依赖。
  * **external**：依赖上游官方（如 issue 回复、架构演进、VS Code 插件系统恢复）。
  * **codec-bug**：受 upstream CLI codec bug（#11944 同期 bug）阻塞，无法直接进行端到端验证。
* **风险**：
  * **high**：涉及严重契约违反（如修改内部核心属性），容易导致运行时崩溃或模型生成严重退化。
  * **medium**：文本解析精度可能不足，导致部分决策提取遗漏或噪声注入。
  * **low**：对执行流无破坏性影响，降级方案完善，错误处理健全。

---

## 3. 工作项深度分析与排序理由

### 阶段一：P0 — 核心落地与快速见效（立即启动，不受 codec bug 阻塞）

* **W1（v0.7.0 提取器） & W2（handoff.md schema 化）**：
  * **理由**：这是 context-snapshot plugin 的物理基石。W2 确立了语义 Schema 契约（会话标题、决策表、未完成项表、权威源），W1 负责高精度提取。两者合力解决"自动 compact 后记忆高保真留存"的痛点。虽然 V1 验证受 codec bug 阻塞，但其核心数据结构和提取代码可以在无长消息干扰下完全 Verified（通过 V1-A 梯度阈值降级验证）。
  * **成本/风险**：medium 成本（需要编写准确的 markdown 正则/AST 提取器），low 风险（不直接修改模型输入，只在后台写入快照）。
* **W11（Signal Priority Filter） & W13（Tool Safety Harness）**：
  * **理由**：属于**快速见效（Quick Wins）**项。W11 可将 search-mcp-wrapper 的反-bot 指数退避与熔断逻辑标准化为 Plugin 的 hook 机制；W13 则利用 `beforeTool` 建立命令安全网（如拦截危险的 shell 命令或死循环 ping）。两者实现简单，不改动核心架构，价值立竿见影。

### 阶段二：P1 — 架构演进与能力升维（核心突破，高工程量）

* **W3（语义对象模型 + 双投影）**：
  * **理由**：解决"多 Agent 跨会话协作时的数据异构问题"。双投影模型（物理视图 ↔ 逻辑语义视图）使 snapshot 不仅仅是人类可读的 md 文件，还是结构化的 API 语义对象。这是迈向 multi-agent 联邦架构的关键。
  * **重构难点**：需要定义高内聚的 JSON Schema 协议，并在 setup / load 时进行双向转换，认知负担极高。
* **W9（Control Flow Center） & W10（Deterministic Evaluator）**：
  * **理由**：真正填补 Cline 原生能力在 8 维度 Runtime 中的空白。W9 实现基于相似度的 Loop Guard 控制中心；W10 引入确定性校验器优先的 Maker-Checker 机制（拦截 "I completed the task" 字符串并强行跑测试）。
  * **技术风险**：**W10 风险为 high**，因为强行干预模型的完成宣告并注入驳回消息属于契约违反边缘，若模型生成能力退化，可能导致 Agent 产生逆反情绪或死锁。需要极其克制的提示词设计与退避机制。
* **W12（High-fidelity Memory Injector）**：
  * **理由**：由于 Compaction 本质上是 token 危机，W12 实现 `messageBuilder` 层面的 Relevance Compression（相关性压缩），剔除工具调用垃圾，只留关键证据。工程量大，需要精细的消息序列过滤。

### 阶段三：P2 — 挂档待命（受 codec bug 阻塞，代码已就绪）

* **W4（Loop Guard 注入层） & W5（真实 90K+ compact）**：
  * **理由**：两个工作项在逻辑上已接近完成，但运行时端到端验证受 codec bug 强力阻塞。
  * **执行策略**：不盲目降级代码质量。保持代码逻辑 Verified（静态审计），并运行方案二中的 V2-B（低 message 数量）尝试通过。在官方修复发布后，第一时间升级到完整 Verified。

### 阶段四：P3 — 长期监控（外部不确定性极高，不主动投入）

* **W6（dual-setup 根因升级） & W14（Clean Contract 架构对齐）**：
  * **理由**：W6（双重 setup 现象）已被证明属于 CLI 的 Hub 运行模式，无直接功能破坏，且根治需要官方底层修改；W14 则是 VS Code 插件系统恢复。这两者完全属于外部不可抗力。
  * **执行策略**：在路线图中显式标注为"长期挂起/监控"，每当 Cline 发布新 release（如 4.0.5+）时进行一次 diff 审计，不主动分配开发资源。

---

## 4. 推荐执行顺序

1. **W2 (Schema 化)** → 确立统一数据格式，作为一切提取和注入的数据契约。
2. **W1 (v0.7.0 提取器)** → 实现契约数据的物理落盘，采用 V1-A 方案验证。
3. **W13 (Tool Safety Harness) & W11 (Signal Filter)** → 低成本切入，通过 `beforeTool` 和 `afterTool` 建立安全与信号控制网。
4. **W9 (Control Flow Center / Loop Guard 注入)** → 实现高精度循环拦截，尝试 V2-B 方案突破 bug。
5. **W3 (双投影语义模型) & W12 (内存相关性压缩)** → 彻底解决长对话和多会话上下文丢失的重工程项。
6. **W10 (Evaluator / Tester Gate)** → 引入确定性测试退出机制。
7. **W5 (长对话验证) & W4 (注入层端到端)** → 待 codec bug 解决后全量回归测试。
8. **W6 & W14** → 长期监控，不主动执行。
