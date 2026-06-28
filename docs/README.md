# docs/

本项目所有文档的入口。

## 顶层布局

```
docs/
├── README.md                     ← 本文件
├── PROJECT_DEV_OUTLINE.md        全局工程纪律（A/B/C 分类 / 五问门控 / 停止条件 / 协作流程）
├── dev-rules.md                  跨功能通用防漂移规则（执行边界 / handoff 通用触发器 / 状态值约定，永久保留）
├── search/                         search-orchestrator 功能文档
│   ├── project-rules.md            search-orchestrator 开发期防漂移约束（功能冻结后删除）
│   ├── blog/                       博客文章
│   ├── research/                   搜索质量研究
│   └── search-orchestrator/        搜索编排器文档 + 实验记录
│
├── plugin/                         Plugin 相关文档
│   ├── design.md                   设计文档（ADR-005 更新）
│   ├── mechanism-landing-assessment.md  机制落地评估（11 条候选可行性）
│   └── refs/                       全局参考（不属任何功能）
├── evidence-governance.md        证据治理框架（Level 1 元规则）
├── reviewer-personas.md          评审角色集（Level 1 元规则）
├── handoff.md                    会话快照（本会话决策 / 净变化 / 下次第一句话）
├── mechanism-candidates.md       经验机制化清单（A 类未来代码化的候选）
├── ARCHIVE.md                    根目录文档归档摘要
│
├── decisions/                    所有决策：ADR-*（战略）+ D-*（运营）
│   └── README.md                 决策索引表
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
| 看证据治理框架 | [evidence-governance.md](evidence-governance.md) |
| 看评审角色集 | [reviewer-personas.md](reviewer-personas.md) |
| 看 Plugin 设计文档 | [plugin/design.md](plugin/design.md) |
| 看机制落地评估 | [plugin/mechanism-landing-assessment.md](plugin/mechanism-landing-assessment.md) |
| 看 search-orchestrator 开发期约束 | [search/project-rules.md](search/project-rules.md) |
| 看所有决策时间线 | [decisions/README.md](decisions/README.md) |
| 看搜索编排主题状态 | [search-orchestrator/README.md](search/search-orchestrator/README.md) |
| 看待机制化的 A 类清单 | [mechanism-candidates.md](mechanism-candidates.md) |
| 看归档摘要 | [ARCHIVE.md](ARCHIVE.md) |
