# Handoff — GV-1 + EX-1a/1b + EX-2~4 + GV-6 框架填充完成

> **生命周期**：每次覆写，无归档——会话交接文件。
> **进入规则**：会话开始时先读 `plugin/project-rules.md`（若未归档），再读本文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `gv1-rubric-defined` | GV-1 rubric 五维判定清单（触发条件/执行门控/失败动作/证据类型/沉淀位置）确立，作为 EX-* 通用化蒸馏的硬前置工具 | Verified | `gv7-contract-frozen` |
| `gv1-constitution-frozen` | GV-1 Core Constitution v1.0 冻结：7 章节（执行主体/证据治理/方向门控/handoff触发器/经验机制化/文档生命周期/规则演进）+ 8 项项目可调参数。≤800 token 判定动作 + 项目取值分离 | Verified | `gv1-rubric-defined` |
| `ex-1a-thin-entries` | EX-1a 两个薄入口完成：`rules/handoff-entry.md` + `rules/lifecycle.md`，每份 ≤50 行，只含路径引用+触发条件+机制说明 | Verified | `gv1-constitution-frozen` |
| `ex-1b-2-3-distilled` | EX-1b/EX-2/EX-3 三个 examples/ 通用化完成（dev-rules / evidence-governance / reviewer-personas），每个含 cline++ 假设清单区块（≥5 项）+ 修改提示区 | Verified | `gv1-rubric-defined` |
| `ex-4-handoff-example` | EX-4 handoff-example.md 完成：四区结构填充示例（决策/净变化/未完成项/待沉淀经验）+ 假设清单 + 修改提示 | Verified | `gv1-constitution-frozen` |
| `gv7-attached-outputs` | GV-7 附带产出完成：`.clinerules` 薄入口 + 根 `HANDOFF.md` 空模板（含待沉淀区）+ `.governance/runtime/snapshot.json` JSON Schema 空结构 | Verified | `gv7-contract-frozen` |
| `gv6-capability-design` | GV-6 4 个 Capability 综合设计完成：共用类型（SessionContext/HookEvent）补齐 + git-checker/snapshot-writer/handoff-provider/rule-appender 完整接口+算法+失败模式+复用矩阵 | Verified | `gv7-contract-frozen` |
| `project-rules-repositioned` | dev-rules.md 与 plugin/project-rules.md 状态从"功能绑定"调整为"示例包参考实现（冻结追加）"；plugin/project-rules.md §3.7 保留活跃至 GV-6 handoff-provider 落地 | Verified | `delivery-positioning-pivot` |

## 本会话净变化

### 治理层（父仓库）

- **修改 [docs/dev-rules.md](dev-rules.md)**：当前状态段从"🟢 解冻"调整为"📖 示例包参考实现（冻结追加）"，新规则改沉淀到 `.governance/rules/`，加复查触发条件
- **修改 [docs/plugin/project-rules.md](plugin/project-rules.md)**：生命周期从"功能绑定"调整为"示例包参考实现"，§3.7 跨会话续作读取门控保留活跃至 GV-6 handoff-provider 落地

### 框架产物（新建 `.governance/` 命名空间）

```
.governance/
├── core/
│   ├── constitution.md          ← GV-1 Core Constitution v1.0
│   └── rubric.md                 ← GV-1 通用化判定清单
├── rules/
│   ├── handoff-entry.md          ← EX-1a 交接机制薄入口
│   └── lifecycle.md              ← EX-1a 生命周期+待沉淀区晋升薄入口
├── examples/
│   ├── dev-rules.md              ← EX-1b 通用化执行边界规则示例包
│   ├── evidence-governance.md   ← EX-2 通用化证据状态机示例包
│   ├── reviewer-personas.md     ← EX-3 通用化评审角色示例包
│   └── handoff-example.md        ← EX-4 HANDOFF.md 填写示例
├── capabilities/
│   └── README.md                 ← GV-6 4 Capability 综合设计文档
└── runtime/
    └── snapshot.json             ← 空 JSON Schema 模板
```

- **新建 [.clinerules](.clinerules)**：Cline 加载入口（薄入口，指向 `.governance/`）
- **新建 [HANDOFF.md](HANDOFF.md)**：根目录空模板（含待沉淀经验区结构化区块）

### 关键经验

- **rubric 五维蒸馏有效**：触发条件/执行门控/失败动作/证据类型/沉淀位置五维足以拆解 dev-rules / evidence-governance / reviewer-personas 全部规则，未出现"五维不足以判定"的失效信号
- **subagent 并行通用化高效**：3 个 examples/ 蒸馏任务并行 subagent，单任务平均假设清单 7-10 项，删除 cline++ 专属内容（codec bug / V6 / 提取器 / PowerShell 等）一致
- **共用类型集中定义避免接口漂**：GV-6 把 SessionContext/HookEvent 集中在 capabilities/README.md §一统一锁定，避免 4 个 Capability 各自定义类型导致字段不一致
- **薄入口量化纪律有效**：rules/ 两份入口各 ≤50 行约束防膨胀，与 core/ ≤800 token 形成一致的"判定动作留 / 项目取值去"分层

## 待办

### 未完成项

| id | 项 | confidence | depends_on |
|----|----|-----------|------------|
| `dogfood-second-project` | 第二个项目 dogfood 验证框架通用性（rubric 五维是否足够 / 假设清单是否覆盖漏网之鱼） | Hypothesis | `gv6-capability-design` |
| `readme-install-guide` | README.md 编写（安装 + 使用说明，引导"保留 examples/ 照着改"为推荐路径） | Hypothesis | - |
| `hooks-implementation` | `.governance/hooks/` 4 个 Hook 实现设计文档（session-start / pre-tool / post-tool 占位 / pre-compact） | Hypothesis | `gv6-capability-design` |
| `capability-impl-handoff-provider` | handoff-provider 实现（无阻塞，纯文件读取） | Hypothesis | `gv6-capability-design` |
| `capability-impl-rule-appender` | rule-appender 实现（无阻塞，纯文件追加） | Hypothesis | `gv6-capability-design` |

### 后续可选

- 🔲 第二个项目 dogfood 验证框架通用性
- 🔲 `.governance/decisions/adr/` 目录建立（首个 ADR：GV-7 冻结决策归档）
- 🔲 框架版本号 v1.0 git tag（dogfood 验证后）

## 阻塞项

| 阻塞点 | 影响 | 缓解 |
|--------|------|------|
| BL-1 VS Code 扩展 plugin 系统不可用（issue #11944）| VS Code 端全部 Hook | CLI 端先跑通，VS Code 恢复后即插即用 |
| BL-2 CLI codec bug（PR #12032 Open）| RT-2 snapshot 实测 + HK-1 循环检测实测 | 持续监控 PR 进展 |

## 关键资源

```
GV-7 契约:     docs/decisions/delivery-framework-design.md（v1.2 冻结）
GV-1 宪法:      .governance/core/constitution.md
GV-1 rubric:    .governance/core/rubric.md
GV-6 设计:      .governance/capabilities/README.md
本会话前置:    docs/handoff.md 上一版（GV-7 冻结版）
```

### 已知事实

- 框架填充完成度：GV-1 + EX-1a/1b + EX-2~4 + GV-6 + GV-7 附带产出 = 100%（GV-7 §六填空映射表全部填完）
- 框架分发形态：git template repo（唯一）
- 目录结构：`.governance/` 包裹 + `.clinerules` + `HANDOFF.md` 留根部
- Capability 接口：pass/block/inject 三态 + SessionContext/HookEvent 完整字段定义（GV-6 补齐）
- 硬前置解除：GV-1 rubric 已定，EX-* 已完成
- 仍阻塞：hooks/ 实现设计 / capability 实现（受 BL-1/BL-2 部分影响）

## 新会话首动作

1. 读 [plugin/project-rules.md](plugin/project-rules.md)（若未归档）
2. 读本文件
3. 读 [.governance/](../.governance/) 目录树（本会话新建，下次会话首次完整存在）
4. 按优先级推进：`dogfood-second-project` / `readme-install-guide` / `hooks-implementation` / `capability-impl-handoff-provider` / `capability-impl-rule-appender`

## 引用

- GV-7 契约：[delivery-framework-design.md](decisions/delivery-framework-design.md)
- GV-1 宪法：[.governance/core/constitution.md](../.governance/core/constitution.md)
- GV-6 设计：[.governance/capabilities/README.md](../.governance/capabilities/README.md)
- 上一会话 handoff：GV-7 冻结版（本文件前一版本）
- 项目定位：[PROJECT_DEV_OUTLINE.md](PROJECT_DEV_OUTLINE.md)

---

## Handoff（推荐下次会话开局交接语句）

```text
读 docs/handoff.md + docs/dev-rules.md + docs/plugin/project-rules.md（若未归档）。
```
