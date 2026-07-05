# Handoff — GV-7 目录契约 v1.2 冻结 + 交付定位校准

> **生命周期**：每次覆写，无归档——会话交接文件。
> **进入规则**：会话开始时先读 `plugin/project-rules.md`（若未归档），再读本文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `delivery-positioning-pivot` | 交付定位校准：从"优化 cline++ 自身治理"转向"交付可复用治理脚手架"。治理文档（dev-rules 15 子条款 / evidence-governance 9 章节 / reviewer-personas 6 角色）降级为示例包参考实现，而非交付主体 | Verified | - |
| `five-layer-architecture` | 五层架构确立：L1 Core Constitution / L2 Project Rules / L3 Capability / L4 Hooks / L5 Runtime State。对应不同生命周期（年/月/周/天/每次Session）| Verified | `delivery-positioning-pivot` |
| `gv7-contract-frozen` | **GV-7 目录契约 v1.2 冻结**：git template repo 为唯一分发形态；`.governance/` 命名空间包裹框架自有物；HANDOFF.md 留根部（可发现性）；Capability 接口三态（pass/block/inject）；rule-appender 最小追加回路；GV-1 rubric 为 EX-* 硬前置 | Verified | `five-layer-architecture` |
| `governance-namespace` | `.governance/` 点前缀命名空间收口框架自有物，根部污染从 8 项降到 2 项（`.clinerules` + `HANDOFF.md`）。判据：人读活文件重可发现性留根部，机器写文件重整洁性埋深 | Verified | `gv7-contract-frozen` |
| `capability-hook-orthogonal` | Capability（怎么做）与 Hook（什么时候调用）正交。Capability 只表达意图（pass/block/inject），Hook 执行动作。同一 Capability 可被多 Hook 复用 | Verified | `gv7-contract-frozen` |
| `rule-appender-minimal-loop` | 经验沉淀最小回路：人判断"该不该沉淀" → rule-appender 机械追加到 HANDOFF.md 待沉淀区 → 人工 review 晋升到 rules/。完整治理引擎（自动判断/退役/路由）留阻塞后续集 | Verified | `gv7-contract-frozen` |
| `rubric-hard-prerequisite` | GV-1 通用化 rubric 从软依赖升级为 EX-* 硬前置。理由：原 v1.1 填空表 EX-1a/EX-4 标"无依赖"、EX-1b/EX-2/EX-3 标"软依赖"，执行时风格会漂。统一：rubric 未定，EX-* 不开工 | Verified | `gv7-contract-frozen` |

## 本会话净变化

### 治理层（父仓库）

- **新建 [docs/decisions/delivery-framework-design.md](decisions/delivery-framework-design.md)**（GV-7 v1.2 冻结）：
  - §一 分发形态锁定：git template repo（唯一）
  - §二 安装落位映射：repo 结构 → 用户项目落位（`.governance/` 包裹 + `.clinerules`/`HANDOFF.md` 留根部）
  - §三 各目录契约：6 目录 + .clinerules 入口 + Capability 接口约定（pass/block/inject 三态）
  - §四 加载顺序：SessionStart → constitution → handoff/snapshot 注入 → rules 按场景加载 → pre-tool/post-tool → pre-compact
  - §五 删除矩阵：5 场景（完整示例/自建规则/最小安装/不用 Hook/只用宪法）+ runtime 条件式可删 + rule-appender 丢失副作用
  - §六 填空映射：13 填空项 + 依赖标注 + 执行顺序（GV-7 → GV-1 → EX-* 并行 → GV-6）
  - §七 经验沉淀最小回路：人判断机器追加，完整引擎留阻塞后续
  - §八 已知局限：5 项（dogfood 一次 / VS Code 阻塞 / 通用化未验证 / hooks 非可跑代码 / 完整引擎未交付）
  - §九 交付边界：本次可交付（契约 + 宪法 + 示例包 + Capability 设计 + CLI hooks，post-tool 纯占位）vs 阻塞后续

### 关键经验

- **定位校准要趁早**：从"优化本项目治理"转向"交付治理脚手架"后，"治理产出远大于功能产出"的尴尬自动消解——治理产出转化为框架设计依据，功能产出（Capability + Hook + Runtime）才是交付物
- **外部建议的吸收节奏**：三份外部建议逐轮吸收，每轮补掉具体裂缝（EX-1 双落点 / .clinerules 缺位 / runtime 矛盾 / Capability 接口缺失 / 包裹 / 最小回路 / 检查清单 4 项）。契约经三轮打磨才达冻结质量
- **软依赖要诚实升级**：原 v1.1 把 GV-1 与 EX-* 标为"软依赖"但执行时极易返工，统一升级为硬前置（rubric 未定不开工）更安全
- **反向提醒的价值**：用 ADR / conventional commits"低自动化、高约定却好用"压制过度工程冲动，把判断权留给人、机器只做机械追加

## 待办

### 未完成项

| id | 项 | confidence | depends_on |
|----|----|-----------|------------|
| `gv1-ex` | GV-1 Core Constitution 模板（≤800 token + 通用化 rubric）+ EX-1a/1b + EX-2~4 示例包通用化 | Hypothesis | `gv7-contract-frozen` |
| `gv6` | GV-6 Capability 抽象设计（git-checker / snapshot-writer / handoff-provider / rule-appender 4 模块，落到 capabilities/ 目录）| Hypothesis | `gv7-contract-frozen` |

### 后续可选

- 🔲 第二个项目 dogfood 验证框架通用性
- 🔲 README.md 编写（安装 + 使用说明，引导"保留 examples/ 照着改"为推荐路径）
- 🔲 .clinerules 薄入口实现（指向 .governance/core/ 和 .governance/rules/）
- 🔲 HANDOFF.md 空模板（含待沉淀经验区结构化区块）

## 阻塞项

| 阻塞点 | 影响 | 缓解 |
|--------|------|------|
| BL-1 VS Code 扩展 plugin 系统不可用（issue #11944）| VS Code 端全部 Hook | CLI 端先跑通，VS Code 恢复后即插即用 |
| BL-2 CLI codec bug（PR #12032 Open）| RT-2 snapshot 实测 + HK-1 循环检测实测 | 持续监控 PR 进展 |

## 关键资源

```
GV-7 契约:     docs/decisions/delivery-framework-design.md（v1.2 冻结）
执行顺序:      GV-1（rubric + 宪法）→ EX-1a/1b + EX-2~4 并行 → GV-6
本会话前置:    docs/handoff.md 上一版（commit 0e8feb2）
```

### 已知事实

- 契约版本：v1.2 冻结（2026-07-05）
- 分发形态：git template repo（唯一）
- 目录结构：`.governance/` 包裹 + `.clinerules` + `HANDOFF.md` 留根部
- Capability 接口：pass/block/inject 三态，本契约只锁 CapabilityResult，SessionContext/HookEvent 留给 GV-6
- 硬前置：GV-1 rubric 未定，EX-* 不开工

## 新会话首动作

1. 读 [plugin/project-rules.md](plugin/project-rules.md)（若未归档）
2. 读本文件
3. 读 [delivery-framework-design.md](decisions/delivery-framework-design.md)（GV-7 契约 v1.2）
4. 按 GV-1（rubric + 宪法）→ EX-* 并行 → GV-6 顺序推进

## 引用

- GV-7 契约：[delivery-framework-design.md](decisions/delivery-framework-design.md)
- 上一会话 handoff：commit `0e8feb2`
- 项目定位：[PROJECT_DEV_OUTLINE.md](PROJECT_DEV_OUTLINE.md)
