# Handoff — ADR-005 Compaction 与 Handoff 拆分

## 本会话决策

| 决策 | 状态 |
|------|------|
| [ADR-005](decisions/ADR-005-split-compact-from-handoff.md) 拆分 Compaction 与 Handoff | ✅ Accepted |
| handoff-plugin 子模块 README.md 链接修正（docs/ 重组后路径） | ✅ 本地已提交（未推送） |
| GitHub Issue 草稿：VS Code bootstrap 缺失 | ✅ 已起草（`docs/decisions/draft-issue-bootstrap-missing.md`） |
| mechanism-candidates #5/#6 更新 | ✅ 已同步 |

## 跨会话累计成果

### Phase 1 — 搜索编排器（search-orchestrator）

14 轮 A/B 双盲实验，6 个机制 active（P1 Goggles / P1.5 FinalScore 联动 / P3 Citation / P4 Same-Source Merge / P6 Highlights / #24 MCP Throttle Wrapper），Gap Ledger Δ=+55.6%。成果沉淀于 `skills/search-orchestrator/SKILL.md`。

### Phase 2 — Handoff Plugin

- VS Code 扩展 4.0.0 bootstrap 缺失根因确认（esbuild 不输出独立 bootstrap 文件，4 类证据交叉验证）
- CLI 3.0.31 + VS Code workaround 验证通过
- 7 次 compact 事件全捕获，handoff.md + index.jsonl 双产物正确写入
- 代码改进：i18n 中文化 + file_count 修复 + FILEPATH_RE 质量修复

### Phase 3 — 文档与项目治理

- 社区文档（双语 plugin dev guide）+ 跨平台 patch 脚本（ps1 + sh）
- Architecture Atlas（7 层 Plugin 生命周期地图）
- Architecture Recon QoderWork Skill（可复用方法论）
- 文件存放规范（dev-rules.md §5）
- docs/ 按产品线重组
- **ADR-005：Compaction 与 Handoff 拆分**（本次）

## 当前项目结构

```
cline-plus/
├── docs/
│   ├── dev-rules.md              跨功能治理规则
│   ├── evidence-governance.md    证据状态机
│   ├── reviewer-personas.md      评审人格
│   ├── mechanism-candidates.md   机制候选清单（#5/#6 已更新）
│   ├── handoff.md                本文件
│   ├── decisions/                ADR + 调查笔记
│   │   ├── ADR-005-split-compact-from-handoff.md  ← 新增
│   │   └── draft-issue-bootstrap-missing.md       ← Issue 草稿
│   ├── search/                   搜索产品线
│   │   ├── project-rules.md      开发期防漂移约束
│   │   ├── search-orchestrator/  实验记录（40+ runs）
│   │   ├── research/             搜索质量研究（8 篇）
│   │   └── blog/                 社区博文
│   └── plugin/                   Plugin 产品线
│       ├── design.md             handoff-plugin 设计文档（已更新 ADR-005 引用）
│       └── refs/                 架构参考（5 篇）
├── scripts/                      patch 脚本（ps1 + sh）
├── handoff-plugin/               Plugin 源码（子模块，local commit 待推送）
├── search-mcp-wrapper/           MCP wrapper
├── skills/                       Cline skills
└── experiments/p5-spike/         P5 Spike 实验
```

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **handoff-plugin 重构** | 按 ADR-005 拆分：compact-observer（只观察）+ handoff-writer（独立触发） | 高 |
| **handoff-plugin 子模块推送** | README.md 链接修正 + 父仓库引用，需 GitHub 认证 | 高 |
| **GitHub Issue 提交** | VS Code bootstrap 缺失，草稿已就绪，需用户手动提交 | 中 |
| **#6 注入机制实测** | 验证 Cline rules capability 能否动态注入 handoff.md 内容 | 中 |
| **Plugin 功能迭代** | 新 message builder 类型（error-summary 等）| 低 |
| **测试产物清理** | `C:\handoff-plugin-debug.log` + 旧 handoff 记录 | 低 |

## 权威源

[dev-rules.md](dev-rules.md) · [evidence-governance.md](evidence-governance.md) · [ADR-005](decisions/ADR-005-split-compact-from-handoff.md) · [design.md](plugin/design.md) · [mechanism-candidates.md](mechanism-candidates.md)

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意 §1.5-§1.14 执行门控）与 docs/search/project-rules.md 各一次，遵守三份文档职责划分与防漂移约束。
然后读 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：ADR-005 已确定 Compaction 与 Handoff 拆分方向。handoff-plugin 需要重构——当前 compact 绑定的代码拆成 compact-observer（只观察）+ handoff-writer（独立触发器）。mechanism-candidates #5/#6 已同步更新。

**下次首要动作**：
1. handoff-plugin 重构：拆 `detect-compact` 为 `compact-observer` + 独立 handoff 触发机制
2. 验证 Cline rules capability 能否动态注入 handoff.md 内容（#6 注入机制）
3. 推送子模块 + 父仓库（需 GitHub 认证）
