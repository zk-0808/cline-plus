# docs/

本项目所有文档的入口。

## 顶层布局

```
docs/
├── README.md                     ← 本文件
├── PROJECT_DEV_OUTLINE.md        全局工程纪律（A/B/C 分类 / 五问门控 / 停止条件 / 协作流程）
├── dev-rules.md                  跨功能通用防漂移规则（执行边界 / handoff 通用触发器 / 状态值约定，永久保留）
├── project-rules-search-orchestrator.md  search-orchestrator 开发期防漂移约束（功能冻结后删除）
├── handoff.md                    会话快照（本会话决策 / 净变化 / 下次第一句话）
├── mechanism-candidates.md       经验机制化清单（A 类未来代码化的候选）
│
├── decisions/                    所有决策：ADR-*（战略）+ D-*（运营）
│   └── README.md                 决策索引表
│
├── search-orchestrator/          功能 1：搜索编排
│   ├── README.md                 主题状态总览
│   ├── survey.md                 调研报告（§1–§8 事实层 + §9 Decision Outcome 跳转）
│   ├── search-research-results.md 调研原始证据
│   └── experiments/              A/B 实验数据
│
└── refs/                         全局参考（不属任何功能）
    ├── capability-probe.md
    └── plugin-dev-quick-reference.md
```

## 核心约定

> **功能文档负责记录事实**（调研、实验、参考、现状）；**决策文档负责记录结论**（采纳、回退、延期、替代）。

| 类型 | 命名 | 位置 |
|------|------|------|
| 战略决策 | `ADR-NNN-<slug>.md` | `decisions/` |
| 运营决策 | `D-YYYY-MM-DD-<功能短名>-<slug>.md` | `decisions/` |
| 实验数据 | `run-N-<改造短名>.md` | `<功能>/experiments/` |

### 决策状态五值

```
proposed      已起草，待验证（含实验 / 共识 / 试运行）
active        正在执行
deferred      暂缓
superseded    被新决策取代
rolled-back   已回退
```

`proposed` 是新决策的默认初始状态；通过验证后转 `active`，否则转 `rolled-back`。

**不要**引入其他状态（obsolete / deprecated / retired 等会让状态膨胀失控）。

### Evidence 引用风格

决策文件 frontmatter 的 `evidence` 字段使用 `file + section`，不要写行号：

```yaml
evidence:
  - file: search-orchestrator/survey.md
    section: "10.7 P2 收敛决策"
```

行号在文件改版后立即失效；标题更稳。

## 入口

| 我想… | 去哪 |
|------|------|
| 看项目工程纪律 | [PROJECT_DEV_OUTLINE.md](PROJECT_DEV_OUTLINE.md) |
| 看跨功能通用防漂移规则 | [dev-rules.md](dev-rules.md) |
| 看 search-orchestrator 开发期约束 | [project-rules-search-orchestrator.md](project-rules-search-orchestrator.md) |
| 看所有决策时间线 | [decisions/README.md](decisions/README.md) |
| 看搜索编排主题状态 | [search-orchestrator/README.md](search-orchestrator/README.md) |
| 看待机制化的 A 类清单 | [mechanism-candidates.md](mechanism-candidates.md) |
