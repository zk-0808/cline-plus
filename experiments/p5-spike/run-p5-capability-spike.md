# Run #P5-Spike: Cline Plugin Capability Spike

**日期**：2026-06-26
**designated_executor**：TRAE agent（代码编写 + 框架文档）→ 用户手动（CLI 安装 + 实跑验证）
**时间窗口**：0.5–1 天工程量上限
**状态**：concluded — **No-Go**（2026-06-26）

---

## 1. 实验目的（经第三轮外部评审确认）

验证 Cline Plugin 独占的 `registerMessageBuilder` 能力是否足以支撑 compact → handoff → index 自动化闭环，且维护成本合理。

**实验定位**：Capability Spike（能力验证），非产品实验。只回答一个问题：
> Plugin 独占的 `registerMessageBuilder` 能力，是否足以支撑 compact → handoff → index 的自动化闭环，并且其维护成本是否合理？

**期权价值**（GPT 评审补充）：本次 Spike 是"购买未来选择权的小额投入"——验证成功获得唯一能力第一手知识 + 未来迁移低成本入口；验证失败则 ADR 可依据技术事实退出。不违反 ADR"实验结束必须形成明确结论、避免无限观望"约束。

---

## 2. 验证范围

| 项 | 包含 | 说明 |
|----|------|------|
| #5 compact + handoff 双产物 | ✅ | registerMessageBuilder 触发 compact 时同步写出 handoff.md + 追加 index.jsonl |
| #6 session_start hook | ✅ | 用户选择包含。GLM 评审建议不含（依赖未探测能力），若跑不通则降级为只验证 #5 |

**不包含**（两份评审一致建议删除）：
- 体验对比
- resume 自动化
- 边界讨论
- #1–#4（维持"等待 Runtime 能力"暂缓标记）

---

## 3. Go / No-Go 标准

### Go 标准（全部满足）

1. `registerMessageBuilder` 能稳定介入 model call 前的消息重写
2. compact 触发时自动生成 handoff.md
3. index.jsonl 自动追加（compact 事件记录）
4. （#6）session_start hook 能在 session 启动时触发（若跑不通则降级，不影响 #5 Go 判定）

### No-Go 标准（满足任一）

- API 无法稳定实现（registerMessageBuilder 不工作）
- SDK 修改量明显超过 ADR 原设想（需大量侵入修改）
- 无法形成稳定闭环（compact → handoff → index 链路断裂）
- Plugin 引入后维护复杂度明显高于自动化收益

**禁止**：不加入"感觉没有价值"等主观指标。价值判断发生在技术验证之后。

---

## 4. 执行步骤

### Phase 1: 代码准备（TRAE agent）

1. ✅ fork custom-compaction.ts 母本（来源：[cline/cline/sdk/examples/plugins/custom-compaction.ts](https://github.com/cline/cline/blob/main/sdk/examples/plugins/custom-compaction.ts)）
2. ✅ 改造为 p5-spike-plugin.ts：
   - registerMessageBuilder 触发 compact 时，同步写出 handoff.md
   - 追加 index.jsonl（compact 事件记录）
   - 添加 session_start hook（#6，尝试 beforeRun 或 onEvent）
3. ✅ 写 CLI 安装与实跑说明（README.md）

### Phase 2: CLI 实跑验证（用户手动）

1. `npm i -g cline`（全局安装 Cline CLI）
2. `cline plugin install ./p5-spike-plugin.ts --cwd experiments/p5-spike`
3. `cd experiments/p5-spike && cline -i "测试 prompt（足够长以触发 compact）"`
4. 检查 handoff/handoff.md 是否生成
5. 检查 handoff/index.jsonl 是否追加
6. 记录 Go/No-Go 结论

### Phase 3: 结论落地（TRAE agent）

1. 记录 Spike 结果到本文件 §5
2. Go → 写 ADR-003（Plugin 定位为 Runtime 自动化能力层）+ 同步 mechanism-candidates #5/#6 + survey.md §9.1
3. No-Go → 写 ADR-003（退出，工程性退出理由）+ 同步 mechanism-candidates #1-#6/#14（"等待 Runtime 能力"）+ survey.md §9.1

---

## 5. Spike 结果

**结论：No-Go**（2026-06-26）。根因为外部 CLI 运行时能力缺失，非我方实现缺陷。

### 环境事实

| 项 | 值 | 来源 |
|----|----|------|
| Cline CLI 版本 | 3.0.30（npm `cline` 包 `latest`，已是最新版） | registry.npmjs.org/cline/latest |
| CLI 依赖 SDK | @cline/sdk@0.0.52 / @cline/core@0.0.52 | 同上 |
| VS Code 扩展版本 | 3.89.2（独立版本号体系，与 CLI 无关） | VS Code Marketplace |
| 官方文档声明 | "plugins not applicable on VSCode and JetBrains Extension for now" | docs.cline.bot/customization/plugins |

> 修正记录：前期曾误判"CLI 落后 89 版需升级"。实际 `cline`（CLI）与 `saoudrizwan.claude-dev`（VS Code 扩展）是两套独立版本号，3.0.30 即 CLI 最新版，无需也无法升级。

### 实跑记录

| 步骤 | 结果 | 备注 |
|------|------|------|
| cline plugin install p5-spike-plugin.ts | ✅ 安装成功 | 落地 `.cline/plugins/_installed/local/p5-spike-plugin.ts-0e22232320f0/` |
| config plugins（我方插件） | ❌ No plugins found | 安装产物物理存在，但 CLI 不识别为有效插件 |
| 手动放到官方发现根路径 `.cline/plugins/` | ❌ No plugins found | 排除"发现路径错误"假设 |
| **官方样例 weather-metrics.ts** install + config plugins | ❌ **No plugins found** | **决定性：官方样例同样加载不了，排除我方文件问题** |
| cline -c 实跑 verbose 日志 | ❌ 仅内置 `[hook:agent_start/end]`，无 plugin 加载 | beforeRun 未触发 |
| handoff.md 生成 | ❌ 未生成 | registerMessageBuilder 未被装载 |
| index.jsonl 追加 | ❌ 未追加 | 同上 |
| session_start hook（session-start.log） | ❌ 未生成 | beforeRun 未触发 |

### 网络情况核查

- cline 官方 GitHub issues 搜索 "plugin + No plugins found"：**0 条**（无公开已知 bug）。
- 通用网络搜索：无相关命中。
- 判断：这不是孤立 bug，而是当前 CLI 分发版 plugin 运行时发现/装载链路尚未落地的自然结果，与官方文档"暂不适用"声明一致。

### Go/No-Go 判定

**No-Go**，命中以下 No-Go 标准：

1. **API 无法稳定实现**：`registerMessageBuilder` 在 CLI 3.0.30 上根本无法被装载，谈不上稳定介入。
2. **无法形成稳定闭环**：compact → handoff → index 链路从第一步（插件装载）即断裂。

**关键结论**：Plugin 独占能力（`registerMessageBuilder`）目前在所有可交付载体上都无法运行——
- VS Code 扩展：明确不支持 plugin 加载入口（ADR-002 必须载体约束）；
- CLI 3.0.30（最新版）：有 install 命令但运行时无法发现/装载，连官方样例亦然。

四重独立验证（文件写法 / 我方 install / 手动发现路径 / 官方样例）全部失败，已穷尽排查空间。退出理由为**工程性（外部能力缺失）**，非主观价值判断，符合 ADR-002 退出标准。

---

## 6. 评审依据

本 Spike 框架基于第三轮外部评审（GPT + GLM-5.2）共识：
- GPT：C-lite → B，0.5-1 天，仅 #5，期权价值分析
- GLM-5.2：C → B，2-3 天，仅 #5（建议不含 #6），触发条件清单

用户选择：#5 + #6，0.5-1 天，CLI 全局安装，cline++/experiments/p5-spike/

详见 [ADR-002-p5-experiment-exit-review.md](../../docs/decisions/ADR-002-p5-experiment-exit-review.md) 第三轮评审记录。
