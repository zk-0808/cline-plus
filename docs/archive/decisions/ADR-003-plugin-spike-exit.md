# ADR-003: P5 Plugin Capability Spike 退出（运行时能力缺失）

- **Status**: ~~Accepted~~ → **rolled-back（2026-06-26）**
- **Date**: 2026-06-26
- **Deciders**: 项目所有者
- **Supersedes**: 无（承接 ADR-002 Validation Plan §实验结束硬性出口）
- **Related**: ADR-002（项目承载形态，Validation Plan / P5 实验）、ADR-002-p5-experiment-exit-review（三轮外部评审）、experiments/p5-spike/run-p5-capability-spike.md（实跑记录 §5 修正 + §7 教训）

---

## ⚠️ ROLLED-BACK（2026-06-26 当日撤销）

**本 ADR 的 No-Go 结论是误判，已于同日撤销。保留全文用于审计（证明"曾经基于错误验证方法下过错误结论"）。**

**撤销原因**：No-Go 的核心证据（`config plugins` 报 "No plugins found"，含"官方样例也加载不了"）是用 `cline -c <dir> config plugins` 取得的**假阴性**——`config plugins` 只扫描真实 cwd 的 `.cline/plugins`，不理会 `-c` 参数，而当时真实 cwd 不含插件。用户用正确方式（先 `cd` 进目录再 `cline config plugins`）复测后，插件被正常发现；进一步实跑确认 `beforeRun`（session_start 类）hook **实证触发**（`handoff/session-start.log` 写入成功）。

**修正后事实**：Plugin 在 **CLI 3.0.30 运行时可用**——发现 → 加载 → hook 执行链路打通。本 ADR 全部 No-Go 论据被证伪。详见 [run-p5-capability-spike.md §5（修正后）](../../experiments/p5-spike/run-p5-capability-spike.md) 与 §7 教训 1。

**后续**：P5 Spike 状态回到 partial Go（#6 已确认，#5 待 compact 实证）。最终决策待 #5 实证补完后另开 ADR-004。mechanism-candidates #1–#6/#14 的暂缓标记已撤销恢复。

---

> 以下为已撤销的原始内容，仅供审计。

---

## Context

ADR-002 将 Plugin 定位为「实验线 + 未来迁移线」，并在 Validation Plan 中要求以一个最小 Capability Spike 回答唯一问题：

> Plugin 独占的 `registerMessageBuilder` 能力，是否足以支撑 compact → handoff → index 的自动化闭环，并且其维护成本是否合理？

经三轮外部评审（GPT × 2 + GLM-5.2）收敛为「C（最小验证）→ B（暂停）」共识。用户确认 Spike 参数：范围 #5 + #6、时间窗口 0.5–1 天、CLI 全局安装方式、产物落在 `experiments/p5-spike/`。

本 ADR 记录该 Spike 的执行结果与退出决策。

---

## Problem

在不违反 ADR-002「实验必须形成明确结论、避免无限观望」约束的前提下，依据**技术事实**（而非主观价值判断）决定 P5 Plugin Spike 的去留。

---

## Evidence（实跑证据链）

完整记录见 [experiments/p5-spike/run-p5-capability-spike.md §5](../../experiments/p5-spike/run-p5-capability-spike.md)。关键事实：

### 环境事实

| 项 | 值 | 来源 |
|----|----|------|
| Cline CLI 版本 | **3.0.30**（npm `cline` 包 `latest`，已是最新版） | registry.npmjs.org/cline/latest |
| CLI 依赖 SDK | @cline/sdk@0.0.52 / @cline/core@0.0.52 | 同上 |
| VS Code 扩展版本 | 3.89.2（与 CLI 是独立版本号体系） | VS Code Marketplace |
| 官方文档声明 | "plugins not applicable on VSCode and JetBrains Extension for now" | docs.cline.bot/customization/plugins |

> 修正记录：前期会话曾误判「CLI 落后 89 版需升级」。实际 `cline`（CLI）与 `saoudrizwan.claude-dev`（VS Code 扩展）是两套独立版本号，3.0.30 即 CLI 最新版，无需也无法升级。"更新后还是 3.0.30" 属正常现象。

### 四重独立验证（全部失败）

| # | 验证项 | 结果 | 排除的假设 |
|---|--------|------|-----------|
| 1 | 我方 `p5-spike-plugin.ts` 写法符合官方模板（含 `export default`、`manifest.capabilities`） | ✅ 正确 | 排除「文件写法错误」 |
| 2 | `cline plugin install` 我方插件后 `config plugins` | ❌ No plugins found（产物物理存在于 `_installed/local/` 但不被识别） | — |
| 3 | 手动放到官方文档声明的发现根路径 `.cline/plugins/` | ❌ No plugins found | 排除「发现路径错误」 |
| 4 | **官方样例 `weather-metrics.ts`** install 后 `config plugins` | ❌ **No plugins found** | **决定性：官方样例同样加载不了，排除我方实现缺陷** |
| 5 | `cline -c` 实跑 verbose 日志 | ❌ 仅内置 `[hook:agent_start/end]`，无 plugin 加载、`beforeRun` 未触发、`session-start.log` 未生成 | — |

### 网络情况核查

- cline 官方 GitHub issues 搜索「plugin + No plugins found」：**0 条**（无公开已知 bug）。
- 通用网络搜索无相关命中。
- 判断：这不是孤立 bug，而是当前 CLI 分发版（3.0.30）plugin 运行时发现/装载链路尚未落地的自然结果，与官方文档「暂不适用」声明一致。

---

## Decision

### P5 Plugin Capability Spike 判定为 **No-Go**，即刻退出实验线。

命中 ADR-002 Validation Plan 的 No-Go 标准：
1. **API 无法稳定实现**：`registerMessageBuilder` 在 CLI 3.0.30 上根本无法被装载，谈不上稳定介入。
2. **无法形成稳定闭环**：compact → handoff → index 链路从第一步（插件装载）即断裂。

### 退出性质：工程性退出（外部能力缺失），非能力否定

Plugin 独占能力（`registerMessageBuilder`）**在能力设计上确实是唯一可行手段**（文件 Hook / Wrapper MCP / 外部 watcher 均无法介入 model call 前的消息重写层，见 ADR-002 Update 1 能力边界表）。问题不在 Plugin 概念，而在**目前没有任何可交付载体能真正运行它**：

- VS Code 扩展（v3.89.2）：明确不支持 plugin 装载入口——而 VS Code 是 ADR-002 确认的「必须载体」；
- CLI 3.0.30（最新版）：有 `install` 命令但运行时无法发现/装载，连官方样例亦然。

因此退出是**暂停等待外部能力成熟**，而非永久否决。Plugin 路线作为「未来迁移线」的定位（ADR-002）保留。

### 对 mechanism-candidates 的处置

依赖 Plugin 运行时能力的候选条目（#1–#6、#14）维持「候选（暂缓）」，触发条件统一为：**Cline Runtime（CLI 或扩展）开放 plugin 装载入口**。不从清单移除（保留为未来迁移入口），不改为「已退休/永久C类」。

---

## Consequences

### 正面

- 以小额投入（0.5–1 天）获得 Plugin 运行时可用性的第一手事实，避免基于过期/矛盾文档继续投入。
- 退出理由为可复核的技术事实（四重验证 + 版本核查），符合 ADR-002「避免无限观望」与「禁止主观价值指标」约束。
- 校正了前期「CLI 落后需升级」「VS Code 已支持」两处事实误判，文档与现实对齐。
- ADR-002 主方向（薄 Skills + 单点 WebSearch MCP + 经验文档 + Plugin 实验线）不受影响。

### 负面

- compact → handoff → index 自动化在可见周期内无法落地，相关经验（#5/#6 等）继续以提示词/Skill 形态承载（C 类补丁状态）。
- 需要持续观察 Cline Runtime 的 plugin 装载支持进展，存在「观望成本」——以「触发条件」而非「定期巡检」控制。

### 恢复条件 / Review Trigger

满足任一时重启 P5 Spike（复用 `experiments/p5-spike/` 现有产物）：

- Cline VS Code 扩展集成 plugin 装载入口（CHANGELOG 出现 plugin 条目）；
- Cline CLI 后续版本的 `config plugins` 能正确识别已安装插件（官方样例可加载）；
- 用户主工作流迁移到 CLI / Kanban（使 CLI 路径成为可接受的交付载体）。

---

## 后续动作

1. **experiments/p5-spike/run-p5-capability-spike.md**：§5 已填写实跑记录与 No-Go 判定，状态置为 `concluded — No-Go`。保留目录与产物作为未来迁移入口。
2. **mechanism-candidates.md**：#1–#6、#14 标记「候选（暂缓）— 触发条件：Cline Runtime 开放 plugin 装载入口」。
3. **decisions/README.md**：索引表新增 ADR-003 行。
4. **survey.md §9.1 同步**：§9.1 为 search-orchestrator 功能决策表（ADR-001/ADR-002 等全局 ADR 均不在其中，见 ADR-002 Update 1 §后续动作 同样判定）。ADR-003 为全局 Plugin 决策，与 search-orchestrator 无主题关联，按「三份文档各管一摊」原则**不加入 §9.1**，仅登记于 decisions/README.md 全局索引。
