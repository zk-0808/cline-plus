# cline-plus — Cline AI Agent 治理框架

> 一套围绕 **Cline** 构建的 AI agent 治理框架：把「会话交接 / 证据治理 / 评审纪律 / 经验沉淀」从一次性操作变成可复用机制。
>
> 本仓库同时是**完整工程记录**——不只是成果，也包括被推翻的设计、实测阻塞，以及一次自查纠错。

---

## 这个仓库想说明什么

框架本身不难写。难的是：**在信息不全、上游不可控的条件下，怎么判断该做什么、怎么知道自己错了、怎么留下可复核的证据。**

所以这里刻意保留了完整过程：决策链（含回滚与取代关系）、双盲实验原始数据、被证伪的方案、以及实测遇到的阻塞。所有量化结论都能沿引用链追到具体文件与行号。

如果你只想用框架，直接跳到 [快速开始](#快速开始)；如果想看工程过程，从下面三处入手。

---

## 三处最值得看的地方

### 1. 搜索能力：14 轮双盲 A/B，有量化结论也有被证伪项

先做「把免费网络搜索能力交给 AI agent」这条相对独立的线，用双盲 A/B 迭代。

| 机制 | 结论 | 证据 |
|---|---|---|
| P5 Gap Ledger | Gap Detection Recall **33.3% → 88.9%**（Δ+55.6%），隐性缺口 +40%（40%→80%），篇幅成本 +36% | `docs/search/search-orchestrator/survey.md:329` |
| P4 同源合并 | 逐字 Merge Precision **100%**，False Merge 0，Info Loss 0 | `survey.md:310` |
| P4 translation 子类 | Baseline R=0.20 → LLM **1.00**（Net Gain **+0.80**） | `survey.md:327` |
| P6 提取保真 | Extractive Fidelity **92.3%**（24/26），Untraceable 0 | `survey.md:331` |
| P5 结构化表示 v1 | **被双盲证伪**：Conflict ID Δ **−20%** | `survey.md:314` |
| P5 Evidence Map | **未达阈值**：Material Relation Recall Δ+6.3% < 目标 +15% | `survey.md:318` |

38 份实验原始记录在 `docs/archive/search/experiments/`（含 ground-truth 密封文件、盲态 Run A/B 输出）。
被回退的决策（如 DiversityPenalty）在 `docs/decisions/search/` 保留 `rolled-back` 终态，不删。

### 2. 上下文压缩：先证明「原生机制不够用」，再决定自己做什么

ADR-001（2026-06-23）原本判定「复用 Cline 原生 compact」，依据是自研机制 `compaction_count = 0`（**从未真正触发**）。

之后实测发现原生压缩不够无缝，四项可核验依据：

1. 自研 compact `compaction_count = 0`，从未触发 — `docs/decisions/adr/ADR-001-handoff-compact-memory.md:18`
2. 原生 condense 六字段（id/kind/exit_when/confidence/depends_on/blocker_ref）**全部无结构化对应** — `investigation-note-native-condense-a-docs.md:136-146`
3. 原生 condense 语义**覆盖率 ~5%** — `native-condense-b-source.md:154-163`
4. compaction 策略仅 `basic|agentic`、**无 `off`**，CLI 亦无 `--compaction` — `native-condense-a-docs.md:39-54`

**关键点：转向不是换机制，而是换挂载点。** ADR-004 → 005 → 006 每个只取代前者的**一部分**，`ADR-006:190-192` 明确「不 Supersede ADR-001」。最终落到 `registerRule` 静态注入（ADR-007）。

这段弯道的价值在于：**中途出现过相反的结论，而且都在活跃文档里。**

### 3. 上游阻塞：不绕过，记录并等

框架依赖的 Cline 侧有两个真实阻塞：

| 阻塞 | 状态 | 实测 |
|---|---|---|
| BL-1 `cline/cline#11944` | Open | VS Code 扩展 4.0.x 缺 `plugin-sandbox-bootstrap.js`，`setup()` 永不执行；2026-07-20 nightly 复核仍「**未修复**」 |
| BL-2 `cline/cline#12032` | Open | CLI codec bug（`n.content.map is not a function`），`beforeModel` 注入 string content 即触发 |

处理方式不是打补丁绕过，而是：声明不可抗力 → 记录触发路径 → 改用 `ContentBlock[]` → **等上游合并**。
两条阻塞在 `README 已知局限`、`docs/dev-rules.md §1.15`、`docs/handoff.md` 三处交叉登记。

---

## 工程证据索引

| 材料 | 位置 | 说明 |
|---|---|---|
| ADR 决策链 | `docs/decisions/adr/` | 6 份；含 supersede / rolled-back 迁移记录 |
| 调研记录 | `docs/decisions/investigation/` | 25 份 investigation note（含原生压缩机制逆向、时序验证、codec bug 定位） |
| 运营决策 | `docs/decisions/search/` | 9 份 `D-*`，含每条机制的最终状态 |
| 实验原始数据 | `docs/archive/search/experiments/` | 38 份（14 轮双盲 A/B + 密封 ground truth） |
| 调研报告 | `docs/archive/search/research/` | 8 份（背景/方法/机制/实验/结果/引用） |
| 方法论 | `docs/dev-rules.md`、`docs/evidence-governance.md` | 防漂移规则、证据生命周期状态机（Level 1 元规则） |
| 插件实现 | `context-snapshot/`（子模块 → [cline-plugin-install](https://github.com/zk-0808/cline-plugin-install)） | 独立可分发的 snapshot 插件 |
| 薄 wrapper | `search-mcp-wrapper/` | 节流 + 熔断（1h 窗口 3 次失败）+ 指数退避，11/11 集成测试 |
| 搜索 skill | `skills/search-orchestrator/` | Phase 0 门控、fanout、Goggles、Gap Ledger |

---

## 已知局限与自我纠错

**局限（不隐藏）**

| 局限 | 缓解 |
|---|---|
| 框架仅在 2 个项目 dogfood 过（本项目 + task-tracker CLI） | `examples/` 降低自建门槛；D1–D5 通用性验证通过 |
| VS Code 端 Hook 全部阻塞（BL-1） | CLI 端 S1–S5 全通过，VS Code 恢复后即插即用 |
| Core Constitution 通用化未经验证 | 保留判定动作而非空泛原则，降低过拟合风险 |
| Compaction 实测阻塞（BL-2） | snapshot 写入设计完成，等 PR #12032 合并后端到端验证 |

**自我纠错记录**

本项目做过一次全量文档审计（8 分片 / 204 个 markdown / 全部带 `路径:行号` 证据），结果包括：

- 修掉 **186 处**失效相对链接（861 个链接现全部可解析）
- 订正文档中「8 个 ADR / 12 个 D 决策」的错误声明（实为 6 / 13）
- 发现同一事实被写 5 次、Capability 计数存在 4/6/7 三个口径
- **审计自身被证伪的 5 条结论也一并记录**，未粉饰

---

## 框架结构

五层架构，按变更频率分层：

| 层 | 目录 | 生命周期 | 职责 |
|----|------|---------|------|
| L1 Core | `.governance/core/` | 年/月 | 跨项目通用宪法（≤800 token 判定动作） |
| L2 Rules | `.governance/rules/` | 周 | 装好即生效的薄入口（每份 ≤50 行） |
| L3 Capability | `.governance/capabilities/` | 月 | 「怎么做」的代码模块（pass/block/inject） |
| L4 Hooks | `.governance/hooks/` | 天 | 「什么时候调用」的事件驱动检查 |
| L5 Runtime | `HANDOFF.md` + `.governance/runtime/` | 每次 session | 动态状态文件 |

设计依据：[`docs/decisions/delivery-framework-design.md`](docs/decisions/delivery-framework-design.md)（GV-7 v1.2 冻结契约）。

---

## 快速开始

### 安装

**方式 1 · GitHub Template**：点右上 `Use this template` → 创建项目 → `git clone`

**方式 2 · clone 后重建**

```bash
git clone https://github.com/zk-0808/cline-plus.git your-project
cd your-project
rm -rf .git docs/          # 删除源项目历史与本仓库专属文档
git init
```

**方式 3 · 叠加到已有项目**

```bash
cd your-existing-project
git remote add template https://github.com/zk-0808/cline-plus.git
git fetch template main
git checkout template/main -- .governance/ .clinerules HANDOFF.md
git remote remove template
```

### 接入后第一步：改参数

打开 [`.governance/core/constitution.md`](.governance/core/constitution.md) 底部「项目可调参数」区，只改取值，判定动作不动：

| 参数 | 本仓库取值 | 含义 |
|------|-----------|------|
| `independent_evidence_count` | 2 | 关键结论独立证据类型最小数 |
| `uncommitted_file_threshold` | 5 | handoff 触发器 b 文件堆积阈值 |

### 新会话首动作

每次新会话把这句贴给 AI：

```text
读 .governance/core/constitution.md + HANDOFF.md + .governance/rules/。
```

AI 按 [`rules/handoff-entry.md`](.governance/rules/handoff-entry.md) 的读取门控执行：先读宪法 → 再读交接文件 → 再读活跃入口规则。**读完前不启动任何开发动作。**

### 三种使用路径

- **路径 A（默认）**：保留 `.governance/examples/` 全部 4 份示例包，照着改——每份头部含「本项目特定假设」区块与修改提示
- **路径 B**：删 `.governance/rules/` 入口规则，保留 `core/` + 自建 rules/ + `HANDOFF.md`
- **路径 C（最小）**：删 `examples/` + `hooks/` + `capabilities/`，仅留 `core/` + `rules/` + `runtime/` + `.clinerules`——纯文档治理，无自动化

完整删除矩阵见 [delivery-framework-design.md §五](docs/decisions/delivery-framework-design.md)。

### 启用 Hook（可选）

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File scripts\sync-governance-plugin.ps1
# macOS / Linux
bash scripts/sync-governance-plugin.sh
```

配置 `.governance/hooks/config.json` → `cline -i` 验证 `.governance/runtime/plugin-loaded.marker` 是否创建。
触发时的动作：**SessionStart** 注入上下文 / **PreToolUse** 未 commit 堆积达阈值则阻断 / **PreCompact** 写 snapshot / **PostToolUse** 占位。
不用 Hook 时，上述动作由人工触发。详见 [开发者指南](docs/developer-guide/development-guide.md)。

---

## 经验沉淀最小回路

```
人判断「这值得沉淀」
  ↓  capabilities/rule-appender
追加到 HANDOFF.md 待沉淀区（结构化）
  ↓  人工 review
晋升到 rules/ 或删除
```

**判断由人做，追加由机器做，晋升由人做。** 见 [`rules/lifecycle.md`](.governance/rules/lifecycle.md)。

---

## 框架契约

- **分发形态**：git template repo
- **版本管理**：git tag（`v1.0` / …）
- **目录契约**：[`delivery-framework-design.md`](docs/decisions/delivery-framework-design.md)（GV-7 v1.2 冻结）
- **接口契约**：Capability 三态 pass/block/inject，见 [`capabilities/README.md`](.governance/capabilities/README.md)

---

## License

MIT
