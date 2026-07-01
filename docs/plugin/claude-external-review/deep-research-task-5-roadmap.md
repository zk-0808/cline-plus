# cline-plus 整体技术演进路线图

**文件**: `docs/plugin/deep-research-task-5-roadmap.md`
**状态**: active
**evidence_as_of**: 2026-07-01
**背景依据**: `docs/plugin/design.md §5`（Plugin Phase 1-4）、`docs/PROJECT_DEV_OUTLINE.md §5`（能力验证清单）、`docs/plugin/snapshot-extractor-design.md §6`（v0.7.0计划）、`docs/mechanism-candidates.md`（机制候选清单）

---

## 1. 路线图设计原则与不可抗力对齐

本路线图采用**两层分离、依赖解耦**的设计模式。将纯 Plugin 系统的工程迭代（L1）与 cline-plus 运行时生态建设（L2）分离，并显式标注两大不可抗力（VS Code 插件系统恢复、Upstream CLI codec bug）的阻塞边界。

**关键约束**：
- **不给出具体时间估计**：依据 `PROJECT_DEV_OUTLINE.md` 规则，避免时间预测，完全以"依赖满足"和"退出标准"作为里程碑推进门控。
- **定位为技术演进建议**：本路线图为演进建议，不作为最终执行决策。任何具体特性的立项和架构调整仍需通过正式的 ADR（架构决策记录）流程。

---

## 2. L1 层 — Plugin 纯技术演进（已整合）

L1 聚焦于 `context-snapshot` 插件自身的数据结构精度、契约合规性、以及语义抽象能力的提升。

### 里程碑 v0.6.x (收尾)
- **状态**：✅ **已完成**（evidence: `docs/handoff.md`）
- **目标**：全面落实 ADR-005 命名重构（handoff → snapshot），完成 4 处 API 契约修复，实现 P0 snapshot-writer 磁盘落盘与 Loop Guard 检测层验证。
- **依赖**：无
- **阻塞**：无
- **退出标准**：CLI 3.0.30+ 环境下 setup 执行、compact 检测、rules 注入、以及 1000 tokens 阈值下的快照写入全部实测通过。TypeScript 编译零错误。
- **风险**：无（已平稳落地）。

### 里程碑 v0.7.0 (提取器升级)
- **状态**：**proposed**（已设计，待实现）
- **目标**：实现 `snapshot-extractor` 提取器，将 snapshot 的生成从简单正则匹配升级为基于标记或轻量 AST 的高精度提取。
- **依赖**：`docs/plugin/snapshot-extractor-design.md`
- **阻塞**：无直接阻塞。但在真实 90K+ 长对话下验证受 codec bug 阻塞（需采用 V1-A 梯度阈值进行降级验证）。
- **退出标准**：完成 4 个 Extractor 编写；提取的决策表和未完成项表在 low-token 场景下无噪声、无遗漏落盘。
- **风险**：Extractor 逻辑可能在复杂格式下产生解析毛刺，增加运行时 CPU 负担。

### 里程碑 v0.8.0 (Schema 标准化)
- **状态**：**待定**（根据任务 4 优先级矩阵建议启动）
- **目标**：实现 handoff.md 的 Schema 化定义，将快照文件规范化为会话标题、决策表、未完成项表、权威源 4 节固定结构，并支持 JSON/YAML 序列化导出。
- **依赖**：v0.7.0 提取器 + 任务 4 优先级矩阵建议
- **阻塞**：无。
- **退出标准**：输出格式符合 `external-review-handoff-foundation.md` 约定的 Schema 校验；提供自动化 validator 脚本。
- **风险**：过度结构化可能降低模型自然语言生成的灵活性。

### 里程碑 v0.9.0 (语义对象模型 & 双投影)
- **状态**：**待定**
- **目标**：实现物理视图（人类可读 Markdown）与逻辑语义视图（结构化 JSON 对象）的双投影模型，使 snapshot 支持跨 Agent 联邦通信和程序级导入。
- **依赖**：v0.8.0 + 外部评审结论（`external-review-round2-handoff.md`）
- **阻塞**：无。
- **退出标准**：在 Plugin 加载时，能无缝将上一会话的逻辑 Schema 解析并注入为当前会话的动态 Rules。
- **风险**：工程实现成本极高，认知负担重，可能引入不必要的间接抽象层。

---

## 3. L2 层 — cline-plus Agent Runtime 建设

L2 聚焦于通过 Plugin 机制介入，填补 Cline 原生能力在 8 维度 Runtime 中的空白，推进机制候选清单中的 A 类代码化项。

### 里程碑 L2-M1：控制流与安全网建设（Control Flow & Tooling）
- **目标**：实现基于工具调用相似度的 Loop Guard 注入层端到端闭环，并在 `beforeTool` 钩子中建立命令安全网（Tool Safety Harness），对高危/低效命令进行确定性拦截。
- **候选项推进**：**Candidate #4 (Loop Guard)** 状态从"候选"升级为"已机制化"；**Candidate #1 (Terminal Watchdog)**、**Candidate #2 (PowerShell Safe-exec)** 进入设计。
- **依赖**：L1-v0.6.0 + 任务 3 映射结论
- **阻塞**：**Loop Guard 注入层端到端验证受 Upstream CLI codec bug 阻塞**（可通过降级方案 V2-B 尝试部分验证）。
- **退出标准**：
  1. 当 `detectRepetition` 返回 true 时，beforeModel 能够正确修改 messages 数组并注入循环警告。
  2. 在 low-message-count 场景下，模型接收到注入警告后主动退出循环。
  3. beforeTool 能够正确拦截危险/假死命令。
- **风险**：注入警告消息的格式若引起模型拒答，可能导致会话死锁或异常中断。

### 里程碑 L2-M2：确定性校验与信号过滤（Evaluator & Observation）
- **目标**：引入确定性校验优先的 "Checker-as-a-Tool" 机制（Evaluator），在模型宣告任务完成（"I have completed"）前强行插入编译/测试运行门控；在 `afterTool` 中建立 "Signal Priority Filter"，对底层 IO 报错、反-bot 节流信号进行确定性代码级退避。
- **候选项推进**：**Candidate #16 (Gap Ledger)** 标准化并进入 SKILL.md；**Candidate #24 (Anti-bot rate limiter)** 完全机制化。
- **依赖**：L2-M1
- **阻塞**：无。
- **退出标准**：
  1. 当模型输出 "completed" 语义时，Plugin 成功拦截并运行本地测试命令，测试失败时强行驳回完成声明。
  2. wrapper 层的 rate limit 逻辑成功转化为 Plugin hooks。
- **风险**：**高风险**。强行拦截并驳回模型的完成宣告属于契约边缘操作，可能导致逻辑退化严重的模型产生生成混乱。

### 里程碑 L2-M3：高保真内存与上下文优化（Memory & Planner）
- **目标**：实现 `messageBuilder` 钩子层面的相关性压缩（Relevance Compression）。在不破坏 message history 连贯性的前提下，过滤或压缩长工具输出，实现 "Dynamic Context Refiner"；将 snapshot 与 Dynamic Rules 深度结合，实现高保真记忆恢复。
- **候选项推进**：**Candidate #17 (Highlights/Relevance Compression)** 从"已机制化"推广到通用文件读取；**Candidate #19 (Same-source Merge)** 固化。
- **依赖**：L2-M2 + L1-v0.9.0（双投影模型）
- **阻塞**：**受真实 90K+ compact 崩溃 bug 阻塞**。必须在 codec bug 得到官方修复后才能在真实极限长对话下验证。
- **退出标准**：
  1. 在长对话中，Plugin 自动过滤冗余的 `read_file` 返回值，仅在上下文保留精简摘要。
  2. Compact 触发时，新 session 能够自动通过 rules 加载上一 session 的高精度双投影逻辑模型，决策答对率 100%。
- **风险**：文本压缩算法若过度精简，可能导致模型在推理阶段丢失关键物理证据。

---

## 4. 关键阻塞项与对策矩阵

路线图中涉及的两大硬性阻塞项及其长期应对策略如下：

| 阻塞项 | 影响范围 | 短期对策 | 长期解决标准 |
|-------|---------|---------|-------------|
| **Upstream CLI Codec Bug** | 阻塞 L1-v0.7.0/v0.8.0 真实 90K+ token 长对话验证；阻塞 L2-M1/L2-M3 注入层端到端回归 | 采用任务 2 设计的 **V1-A（梯度阈值验证）** 和 **V2-A/B（静态审计 + 低消息数量验证）** 作为降级门控 | 官方合并 bug 修复 PR 并发布 patch release；或 cline-plus 维护临时 fork 分支进行绕过验证 |
| **VS Code 4.0.x 不支持 Plugins (issue #11944)** | 阻塞所有 VS Code 端 Plugin 能力；限制运行环境为 CLI 3.0.x | 强制锁定 CLI 运行时，通过 Atlas Layer 7（Host 代理）保持跨平台契约一致性，等待 SDK 迁移完工 | `registerMessageBuilder` 等 plugin API 在 VS Code 4.x 稳定版回归，触发 VS Code 路径合并机制 |

---

## 5. 里程碑追溯表 (Traceability)

| 里程碑 | 追溯的 Runtime 组件 | 追溯的 Candidates 编号 | 核心依据文件 |
|-------|-------------------|----------------------|-------------|
| **L1-v0.7.0** | Memory | #5 Compaction | `snapshot-extractor-design.md` |
| **L1-v0.8.0** | Memory / Architecture | #6 Cross-session rules | `external-review-handoff-foundation.md` |
| **L1-v0.9.0** | Memory / Planner | #6 Cross-session rules | `external-review-round2-handoff.md` |
| **L2-M1** | Control Flow / Tooling | #1 Watchdog / #4 Loop Guard | `plugin-dev-sop.md` + `mode.ts` |
| **L2-M2** | Evaluator / Observation | #16 Gap Ledger / #24 Anti-bot | `mechanism-landing-assessment.md` + `loop-detection.ts` |
| **L2-M3** | Memory / Planner | #17 Highlights / #19 Merge | `ADR-005` + `best-practices/memory-bank.mdx` |
