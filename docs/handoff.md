# Handoff — GV-7 目录契约 v1.2 冻结 + 交付定位校准

> **生命周期**：每次覆写，无归档——会话交接文件。
> **进入规则**：会话开始时先读 `plugin/project-rules.md`（若未归档），再读本文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `delivery-positioning-pivot` | 交付定位校准：从"优化 cline++ 自身治理"转向"交付可复用治理脚手架"。治理文档降级为示例包参考实现，非交付主体 | Verified | - |
| `five-layer-architecture` | 五层架构：L1 Core Constitution / L2 Project Rules / L3 Capability / L4 Hooks / L5 Runtime State，对应年/月/周/天/每次Session 生命周期 | Verified | `delivery-positioning-pivot` |
| `gv7-contract-frozen` | GV-7 目录契约 v1.2 冻结：git template repo 唯一分发形态；`.governance/` 命名空间包裹；Capability pass/block/inject 三态；rule-appender 最小回路；GV-1 rubric 为 EX-* 硬前置 | Verified | `five-layer-architecture` |
| `governance-namespace` | `.governance/` 点前缀收口框架自有物，根部污染 8→2 项。判据：人读活文件留根部，机器写文件埋深 | Verified | `gv7-contract-frozen` |
| `capability-hook-orthogonal` | Capability（怎么做）与 Hook（什么时候调用）正交。Capability 只表达意图，Hook 执行 | Verified | `gv7-contract-frozen` |
| `rule-appender-minimal-loop` | 经验沉淀最小回路：人判断→rule-appender 机械追加→人工 review 晋升。完整治理引擎留阻塞后续 | Verified | `gv7-contract-frozen` |
| `rubric-hard-prerequisite` | GV-1 rubric 从软依赖升级为 EX-* 硬前置：rubric 未定 EX-* 不开工 | Verified | `gv7-contract-frozen` |
| `handoff-template-fixed` | dev-rules §2.3 新增 handoff 固定模板子条款，锁定 7 个一级标题结构，禁止格式漂移 | Verified | - |

## 本会话净变化

### 功能层（若有 submodule 变动）

（无）

### 治理层（父仓库）

- **新建 [docs/decisions/delivery-framework-design.md](decisions/delivery-framework-design.md)**（GV-7 v1.2 冻结）：9 节契约（分发形态 / 安装落位 / 目录契约 / 加载顺序 / 删除矩阵 / 填空映射 / 经验沉淀回路 / 已知局限 / 交付边界）
- **更新 [docs/dev-rules.md](dev-rules.md) §2.3**：新增 handoff 固定模板子条款

### 关键经验（若有）

- 定位校准要趁早：转向"交付脚手架"后，"治理产出远大于功能产出"自动消解
- 外部建议逐轮吸收，契约经三轮打磨才达冻结质量
- 软依赖要诚实升级：标"软依赖"但执行时易返工，统一升级为硬前置更安全

## 待办

### 未完成项

| id | 项 | confidence | depends_on |
|----|----|-----------|------------|
| `gv1-ex` | GV-1 Core Constitution 模板（≤800 token + 通用化 rubric）+ EX-1a/1b + EX-2~4 示例包通用化 | Hypothesis | `gv7-contract-frozen` |
| `gv6` | GV-6 Capability 抽象设计（git-checker / snapshot-writer / handoff-provider / rule-appender 4 模块）| Hypothesis | `gv7-contract-frozen` |

### 后续可选

- 第二个项目 dogfood 验证框架通用性
- README.md 编写（引导"保留 examples/ 照着改"为推荐路径）
- .clinerules 薄入口实现
- HANDOFF.md 空模板（含待沉淀经验区）

## 阻塞项

| 阻塞点 | 影响 | 缓解 |
|--------|------|------|
| BL-1 VS Code 扩展 plugin 系统不可用（issue #11944）| VS Code 端全部 Hook | CLI 端先跑通，VS Code 恢复后即插即用 |
| BL-2 CLI codec bug（PR #12032 Open）| RT-2 snapshot 实测 + HK-1 循环检测实测 | 持续监控 PR 进展 |

## 关键资源

```
GV-7 契约:  docs/decisions/delivery-framework-design.md（v1.2 冻结）
handoff 模板: dev-rules.md §2.3
执行顺序:   GV-1（rubric + 宪法）→ EX-1a/1b + EX-2~4 并行 → GV-6
契约版本:   v1.2 冻结（2026-07-05）
分发形态:   git template repo（唯一）
```

## 新会话首动作

1. 读 [plugin/project-rules.md](plugin/project-rules.md)（若未归档）
2. 读本文件
3. 读 [delivery-framework-design.md](decisions/delivery-framework-design.md)（GV-7 契约 v1.2）
4. 按 GV-1（rubric + 宪法）→ EX-* 并行 → GV-6 顺序推进
