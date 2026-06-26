# Run #P5-Spike: Cline Plugin Capability Spike

**日期**：2026-06-26
**designated_executor**：TRAE agent（代码编写 + 框架文档）→ 用户手动（CLI 安装 + 实跑验证）
**时间窗口**：0.5–1 天工程量上限
**状态**：in experiment

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

（待 Phase 2 完成后填写）

### 实跑记录

| 步骤 | 结果 | 备注 |
|------|------|------|
| npm i -g cline | 待执行 | |
| cline plugin install | 待执行 | |
| cline -i 实跑 | 待执行 | |
| handoff.md 生成 | 待检查 | |
| index.jsonl 追加 | 待检查 | |
| session_start hook | 待检查 | |

### Go/No-Go 判定

（待填写）

---

## 6. 评审依据

本 Spike 框架基于第三轮外部评审（GPT + GLM-5.2）共识：
- GPT：C-lite → B，0.5-1 天，仅 #5，期权价值分析
- GLM-5.2：C → B，2-3 天，仅 #5（建议不含 #6），触发条件清单

用户选择：#5 + #6，0.5-1 天，CLI 全局安装，cline++/experiments/p5-spike/

详见 [ADR-002-p5-experiment-exit-review.md](../../docs/decisions/ADR-002-p5-experiment-exit-review.md) 第三轮评审记录。
