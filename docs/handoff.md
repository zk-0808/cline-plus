# Handoff — handoff-schema 第一阶段启动 + 文档聚类

> **生命周期**：每次覆写，无归档——会话交接文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `handoff-schema-bootstrap` | handoff.md 语义对象模型第一阶段正式启动：创建功能目录 + project-rules + design 文档，三项验收判据全通过 | Verified | `governance-procedure` |
| `trigger-b-guard` | dev-rules §2 新增触发器 b（未 commit 文件 ≥ 5 阻断守卫，强制）+ mechanism-candidates #25 候选 | Verified | — |
| `doc-clustering` | docs/decisions/ 按类型聚类（adr/search/investigation/draft-issue）+ docs/plugin/ 聚类（review/audit）+ dev-rules §5.1 命名规范 | Verified | — |
| `trae-exclusion` | .trae/ IDE 配置目录从 git 索引移除 + 加入 .gitignore | Verified | — |
| `dev-rules-trae-generalize` | dev-rules.md TRAE agent → 主 agent（跨多 agent 通用定位），加载方式不依赖单一 IDE | Verified | — |
| `context-snapshot-readme-sync` | context-snapshot README 同步 v0.7.0 + V6 改造（架构图 / beforeModel 移除 / 已知限制表）| Verified | — |
| `dev-rules-refreeze` | dev-rules 顶层 🔴 重新冻结（handoff-schema 开发期）| Verified | `handoff-schema-bootstrap` |

## 本会话净变化

### 1. handoff-schema 功能启动（commit `db4e8fb`）

按 dev-rules §4 门控 + §5 文件存放 + L487 维护节奏正式启动新功能：

- **新建 `docs/handoff-schema/project-rules.md`**：功能专属防漂移约束（§4 门控声明 + 三份文档职责划分 + 5 条约束 + 不做的事）
- **新建 `docs/handoff-schema/design.md`**：设计文档（映射规则 + 无损映射测试 9/9 通过 + 验收查询通过 + 三阶段演进路线 + 风险缓解 + 评审 Round 2 对齐表）
- **第一阶段验收**：✅ schema V1 草案（`docs/decisions/schema-semantic-object-model.md`）+ ✅ 无损映射测试（9/9 通过，2 处 V2 改进点已记录）+ ✅ 验收查询（`h2-h3-evidence` 依赖链可追溯）
- **dev-rules 顶层冻结**：🟢 解冻 → 🔴 冻结中（handoff-schema 第一阶段开发，解冻条件：验收通过）

### 2. 触发器 b 阻断守卫 + #25 候选（commit `6652c09`）

- **dev-rules §2 新增触发器 b**：未 commit 文件 ≥ 5（排除 gitignored）→ 强制阻断实质性代码修改，必须先写 handoff + commit。含 PowerShell/bash 检测命令 + 设计意图（阻断推进而非代替 agent 思考）+ #25 机制化候选引用
- **mechanism-candidates #25**：阻断守卫 plugin 候选（beforeTool hook，等 §1.15 解除后接入），当前由手工规则承载

### 3. 文档聚类 + 命名规范（commit `a95e615`）

- **docs/decisions/ 聚类**：24 文件 → 5 类（adr/4 + search/9 + investigation/7 + draft-issue/2 + 根目录 5）
- **docs/plugin/ 聚类**：review/（3 外部评审+回应）+ audit/（2 审计报告）
- **引用更新**：53 个文件 190 处引用批量更新 + 10 处跨目录相对链接修复，验证无遗漏
- **dev-rules §5 新增子条款 5.1**：`docs/decisions/` 命名规范与路径约束（6 类型格式 + 6 强制规则）
- **decisions/README.md 索引表**：链接同步更新

### 4. .trae/ 排除（commit `efa811c`）

`.trae/` IDE 配置目录从 git 索引移除 + 加入 .gitignore，本地文件保留。

### 5. context-snapshot README + package.json 同步（commit `ea9ec8f`）

- README v0.6.0 → v0.7.0（结构化提取器完成 + V6 改造说明 + 架构图更新 + 已知限制表对齐 + 开发期冻结声明）
- package.json version/description 同步
- dev-rules.md TRAE agent → 主 agent 泛化（4 处正文 + 加载方式）

## Commits

| Hash | Repo | Message |
|------|------|---------|
| `6b3d801` | cline-plus | handoff: 交界期收敛 - context-snapshot 开发期结束 + 顶层解冻 |
| `6652c09` | cline-plus | rules: handoff schema 第一阶段冻结 + 触发器 b 阻断守卫 + #25 候选 |
| `db4e8fb` | cline-plus | feat(handoff-schema): 功能启动 - project-rules + design 文档 |
| `a95e615` | cline-plus | refactor(docs): 文档聚类 + 命名规范约束 |
| `efa811c` | cline-plus | chore: 排除 .trae/ IDE 配置目录 |
| `ea9ec8f` | cline-plus | chore: context-snapshot README同步v0.7.0+V6改造 + dev-rules TRAE泛化 |

## 未完成项

| id | 方向 | 说明 | 优先级 | confidence | depends_on |
|----|------|------|--------|-----------|------------|
| `handoff-schema-v2` | schema V2 改进 | 补 `depends_on` 字段（Handoff 间依赖）+ 明确 `blocker_ref` vs `depends_on` 区分规则（`B-` 前缀 = Blocker）+ `kind`/`exit_when` 显式化 | 🟡 中 | Hypothesis | `pr-12032` |
| `schema-v2-snapshot` | snapshot schema 化（第二阶段）| context-snapshot plugin 产出的 snapshot 应用同一套语义对象模型 + frontmatter 显式化 | 🟡 中 | Hypothesis | `pr-12032` |
| `issue-11944` | GitHub #11944 跟进 | SDK 迁移时间线（影响 VS Code 扩展 plugin 系统恢复） | 🟡 中 | Verified | — |
| `pr-12032` | PR #12032 合并监控 | CLI codec bug 修复 PR（Open），合并 + CLI 发版后触发 §1.15 解除流程 7 步 | 🟡 中 | Verified | — |
| `vscode-monitor` | 监控 VS Code release | 关键词 Plugins / registerMessageBuilder | 🟢 低 | Verified | `issue-11944` |
| `mech-retirement` | mechanism-candidates 退休执行 | 2026-08-01 到期将 #17/#19/#24 移入归档 | 🟢 低 | Verified | — |
| `h2-h3-evidence` | 补证 H2/H3 | image 分支 undefined 丢弃（受 §1.15 阻塞，等 PR #12032）| 🟢 低 | Hypothesis | `pr-12032` |
| `next-audit` | 下次文档健康度审查 | 2026-08-02（30 天后），按 §6.5 触发条件执行 | 🟢 低 | Verified | — |
| `tier4-deferred` | 第四档暂缓项 | D1/D3/D4/D6/D7 + G4-G5 + H3/H6 + I1-I3 + 根因4（根因4 已由 governance-procedure.md 部分承载）| 🟢 低 | Hypothesis | — |
| `mech-stale-scan` | mechanism-candidates stale 扫描 | #1/#2/#3 长期候选无进展（>90 天），评估保留/降级/删除 | 🟢 低 | Verified | — |

## 权威源

[dev-rules.md](dev-rules.md)（🔴 冻结中）· [evidence-governance.md](evidence-governance.md) · [governance-procedure.md](governance-procedure.md) · [reviewer-personas.md](reviewer-personas.md) · [mechanism-candidates.md](mechanism-candidates.md) · [handoff-schema/project-rules.md](handoff-schema/project-rules.md)（功能专属，活跃执行）· [decisions/schema-semantic-object-model.md](decisions/schema-semantic-object-model.md) · [handoff-schema/design.md](handoff-schema/design.md)

> **新会话首动作**：读 [dev-rules.md](dev-rules.md)（🔴 冻结中）+ 本 handoff + [handoff-schema/project-rules.md](handoff-schema/project-rules.md)。dev-rules 冻结期间所有新规则沉淀在 handoff-schema/project-rules.md。handoff-schema 第一阶段三项验收判据已通过（schema V1 + 无损映射 + 验收查询），可推进 V2 改进（补 depends_on 字段 + blocker_ref 显式化）或等 PR #12032 合并后推进第二阶段 snapshot schema 化。

---

## Handoff

```text
handoff-schema 第一阶段已启动并验收通过（schema V1 + 无损映射 9/9 + 验收查询可回答依赖链）。dev-rules 🔴 冻结中（handoff-schema 开发期）。本会话完成：触发器 b 阻断守卫 + #25 候选 / 文档聚类（decisions 4 子目录 + plugin 2 子目录）+ 命名规范 §5.1 / .trae 排除 / context-snapshot README v0.7.0 同步。下一会话可推进 schema V2 改进（depends_on 字段 + blocker_ref 显式化）或等 PR #12032 合并后推进第二阶段 snapshot schema 化。读 docs/handoff-schema/project-rules.md 了解功能约束，读 docs/handoff-schema/design.md 了解设计详情。
```

**后续动作**（无紧急项）：
1. **🟡 中：schema V2 改进** — 补 `depends_on` 字段 + 明确 `blocker_ref` vs `depends_on` 区分规则（`B-` 前缀）
2. **🟡 中：跟进 GitHub #11944** — SDK 迁移时间线（影响 VS Code 扩展 plugin 系统恢复）
3. **🟡 中：监控 PR #12032** — CLI codec bug 修复 PR，合并 + 发版后触发 §1.15 解除流程 + 第二阶段 snapshot schema 化
4. **🟢 低：2026-08-01 到期** — mechanism-candidates #17/#19/#24 移入归档
5. **🟢 低：2026-08-02 下次审查** — 按 dev-rules §6.5 触发条件执行
6. **🟢 低：stale 扫描** — mechanism-candidates #1/#2/#3 长期候选评估
7. **🟢 低：第四档暂缓项** — D1/D3/D4/D6/D7 + G4-G5 + H3/H6 + I1-I3
