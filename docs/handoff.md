# Handoff — 项目健康度审查四档执行闭环

> **生命周期**：每次覆写，无归档——会话交接文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `audit-baseline` | 项目健康度审查报告基线建立（56 项 + 5 根因 + 四档优先级） | Verified | — |
| `tier1-subtraction` | 第一档减法 + 项目级规则补全（K1-K3 + B1-B4 + C2-C5） | Verified | `audit-baseline` |
| `tier2-hemostasis` | 第二档止血（A1-A4 + G1 + C1 + E4 + H4-H5） | Verified | `audit-baseline` |
| `tier3-mechanism` | 第三档机制缺口（F2 + F3 + D2 + G2-G3） | Verified | `tier2-hemostasis` |
| `tier4-batch1` | 第四档第一批（退休机制 + Hypothesis 生命周期执行 + 外部评审归档） | Verified | `tier3-mechanism` |
| `tier4-batch2` | 第四档第二批（工作流可操作化 + 评审经验沉淀） | Verified | `tier4-batch1` |
| `tier4-batch3` | 第四档第三批（规则退役流程 + 定期审查退出条件 + 源码快照时效 + Confidence 正交） | Verified | `tier4-batch2` |

## 本会话净变化

### 1. 审查报告基线（commit `37b5bc0` 前置）

[project-health-audit-2026-07-02.md](project-health-audit-2026-07-02.md) 20 章节审查报告：56 项问题（13 高-系统性 + 43 高-局部性）+ 5 方法论根因 + 四档优先级（减法 → 止血 → 机制缺口 → 元规则）+ 严重度分级 + 审查退出条件。

### 2. 第一档（commit `3449f50`）

- K1-K3：补全 [plugin/project-rules.md](plugin/project-rules.md) §3 治理类章节（P 级 handoff 触发器 + 教训沉淀位置 + handoff schema 特化）
- B1-B3：dev-rules §1.5-§1.8 改为指针层（删除本地表格/阈值，统一引用 evidence-governance）
- B4：dev-rules §2 handoff 触发器特化部分下沉到 plugin/project-rules.md
- C5：§1.14 删除对 search/project-rules.md 的硬引用
- C2-C3：reviewer-personas 角色审计——5 个角色降级为"建议"
- 顶层冻结声明：dev-rules.md 头部加 🔴 冻结中标注（context-snapshot 开发期不新增规则）

### 3. 第二档（commit `0d359f9`，14 files）

- A1-A4：4 项文档一致性修复（V6 描述 registerRule → messageBuilder / F1 状态 Likely → Verified / design Probe 5 标"已推翻" / review-closure-report 统计 104% → 100%）
- C1：4 份 ADR（ADR-001/002/004/005）补 `evidence_as_of` + `expires_if_unchanged` frontmatter
- E4：[evidence-governance.md §19](evidence-governance.md) 新增 Hypothesis 生命周期管理（声明日 / 必须补证日 14 天外部 / 30 天源码 / 补证路径 / 超期处置 + 存量补登清单）
- H4-H5：[docs/README.md](README.md) 顶层布局图更新（plugin/ 从 3 份扩展到 15+ 份）+ [decisions/README.md](decisions/README.md) 新增 Investigation Notes(7) / Draft Issues(2) / Observations(1) 索引

### 4. 第三档（commit `79ba6fd`，6 files）

- F2：[dev-rules.md §1.15](dev-rules.md) 补 7 步不可抗力解除流程 + 部分解除条件 + 3 条禁止条款
- F3：[plugin/project-rules.md §3.7](plugin/project-rules.md) 跨会话续作读取门控（4 步首动作 + 门控判据 + 会话结束必写）
- D2：[evidence-governance.md §20](evidence-governance.md) 子代理协作证据规则（单源降级 / 同源检测 URL/文档/推理链三维度 / 日期异常 / 综合 5 步流程）
- G2-G3：[review-closure-report.md §6.2](plugin/claude-external-review/review-closure-report.md) B1-B5 跟踪表（加"当前状态"+"最后更新"列 + 30 天复查节奏）+ §6.1 A5 registerRule → messageBuilder 修正
- [external-review-round2-handoff.md §7](plugin/external-review-round2-handoff.md) 项目方第 2 轮回应（采纳"单一语义对象模型+双投影" / Q1-Q8 逐条回应 / 暂不采纳 Q4 lifecycle.kind / 收束判断）

### 5. 第四档第一批（commit `a49c6a4`，5 files）

- J1：[mechanism-candidates.md](mechanism-candidates.md) §状态约定表加权威源声明（dev-rules §3 中文枚举为权威，o/p/r 简写仅内部参考）+ 新增 Stale entry 清理规则（候选>90天标stale / 已机制化>30天启动退休倒计时）+ #17/#19/#24 标注"已机制化（退休倒计时中，2026-08-01 移入归档）"
- E1-E3：3 份 Investigation Note（codec-note / dual-setup / vscode-settings）按 §19 模板补登 Hypothesis 生命周期表
- H7：[ARCHIVE.md](ARCHIVE.md) 追加"外部评审文档闭环状态"章节（7 份已闭环 + 1 份活跃）

### 6. 第四档第二批（commit `d22835b`，3 files）

- F4：[dev-rules.md §2](dev-rules.md) 触发器 c③ 70% 阈值可操作化——补代理信号估算方式（4 类压力信号：输出截断 / 遗忘决策 / 重复生成 / 用户提示）
- H7：[reviewer-personas.md §6](reviewer-personas.md) 补 2026-07-02 评审经验映射（56 项 + 5 根因 + K 类违反 → 文档健康度审查 + 治理预算 + 分层治理 + 严重度分级 + 审查退出条件）
- F5-F6：[plugin/project-rules.md §3.5/§3.6](plugin/project-rules.md) 外部依赖版本变化重测流程（5 步）+ 通用报错处理工作流（4 步 + 4 类报错分类）

### 7. 第四档第三批（commit `9048461`，3 files）

- D5：[evidence-governance.md §15](evidence-governance.md) 新增"源码快照（main 分支）"时效类别（7 天，短于外部生态 14 天）+ `evidence_source_kind` frontmatter 字段 + 判别要点（main vs release tag）+ 成熟实践映射（VCS pinned commit vs rolling branch + Reproducible Build）
- D8：[evidence-governance.md §4.1](evidence-governance.md) Confidence 与状态机正交关系（5×3 矩阵 + 三含义：升降不互触 / 门槛借用 + 3 反例 + 成熟实践映射 Bug 状态机 vs 严重度）
- 根因5：[dev-rules.md §6.4](dev-rules.md) 规则退役流程（5 条退役判据 + 禁止退役情形 + 5 步引用清理清单 + 退役归档 + 与 mechanism-candidates 退休机制正交说明 + 成熟实践映射法律废止程序 + dead code 清理）
- J4：[dev-rules.md §6.5](dev-rules.md) 定期审查机制与退出条件（触发条件 定期/事件/手动 + 4 条退出条件 <10 降季度 / <3 降半年度 / >50 治理膨胀 / 6 月未执行退役 + 与 §6.4 联动 + 自指修复声明 + 成熟实践映射 SLO 错误预算 + PDCA Check 退出判据）
- 衍生：[project-health-audit-2026-07-02.md](project-health-audit-2026-07-02.md) 第四档表重构为 5 列表（+状态列）+ 补全前三批 commit 标注 + 暂缓清单

## Commits

| Hash | Repo | Message |
|------|------|---------|
| `37b5bc0` | cline-plus | refactor: 顶层规则减法整理 + 项目健康度审查报告 |
| `3449f50` | cline-plus | feat: 补全项目级规则 + handoff 交接语句恢复 + 顶层冻结声明（K1-K3） |
| `0d359f9` | cline-plus | docs: 第二档止血 - 文档一致性 + ADR 时效 + Hypothesis 生命周期机制 |
| `79ba6fd` | cline-plus | docs: 第三档机制缺口 - 工作流退出/读取机制化 + 子代理证据规则 + 外部评审闭环 |
| `a49c6a4` | cline-plus | docs: 第四档第一批 - 退休机制 + Hypothesis 生命周期执行 + 外部评审归档 |
| `d22835b` | cline-plus | docs: 第四档第二批 - 工作流可操作化 + 评审经验沉淀 |
| `9048461` | cline-plus | docs: 第四档第三批 - 规则退役流程 + 定期审查退出条件 + 源码快照时效 + Confidence 正交 |

## 未完成项

| id | 方向 | 说明 | 优先级 | confidence | depends_on |
|----|------|------|--------|-----------|------------|
| `tier4-deferred` | 第四档暂缓项 | D1/D3/D4/D6/D7（Investigation Note 模板细化）+ G4-G5（外部评审 SOP + Claude vs GPT 对比）+ H3/H6（A/B 方法论跨功能沉淀 + outline §5 修正）+ I1-I3（SKILL 治理）+ 根因4（阶段性收缩机制化） | 🟢 低 | Hypothesis | — |
| `issue-11944` | GitHub #11944 跟进 | SDK 迁移时间线（影响 VS Code 扩展 plugin 系统恢复） | 🟡 中 | Verified | — |
| `pr-12032` | PR #12032 合并监控 | CLI codec bug 修复 PR（Open），合并 + CLI 发版后触发 §1.15 解除流程 7 步 | 🟡 中 | Verified | — |
| `vscode-monitor` | 监控 VS Code release | 关键词 Plugins / registerMessageBuilder | 🟢 低 | Verified | `issue-11944` |
| `mech-retirement` | mechanism-candidates 退休执行 | 2026-08-01 到期将 #17/#19/#24 移入归档 | 🟢 低 | Verified | — |
| `h2-h3-evidence` | 补证 H2/H3 | image 分支 undefined 丢弃（受 §1.15 阻塞，等 PR #12032） | 🟢 低 | Hypothesis | `pr-12032` |
| `next-audit` | 下次文档健康度审查 | 2026-08-02（30 天后），按 §6.5 触发条件执行 | 🟢 低 | Verified | — |

## 权威源

[dev-rules.md](dev-rules.md) · [evidence-governance.md](evidence-governance.md) · [plugin/project-rules.md](plugin/project-rules.md) · [reviewer-personas.md](reviewer-personas.md) · [project-health-audit-2026-07-02.md](project-health-audit-2026-07-02.md) · [mechanism-candidates.md](mechanism-candidates.md)

> **新会话首动作**：除读 dev-rules.md + handoff.md 外，必须读 [plugin/project-rules.md](plugin/project-rules.md) §3 治理类规则——context-snapshot 开发期项目级规则承载位。如需推进暂缓项，先读 [project-health-audit-2026-07-02.md §12 第四档](project-health-audit-2026-07-02.md) 暂缓清单。

---

## Handoff

```text
项目健康度审查四档执行闭环完成（7 commits，56 项问题中可执行项全部完成或显式暂缓）。剩余项均为中/低优先级（监控 + 暂缓项 + 受阻塞项）。读 docs/dev-rules.md §1.15 了解 codec bug 现状，§6.4/§6.5 了解规则退役与审查退出机制。
```

**后续动作**（无紧急项）：
1. **🟡 中：跟进 GitHub #11944** — SDK 迁移时间线（影响 VS Code 扩展 plugin 系统恢复）
2. **🟡 中：监控 PR #12032** — CLI codec bug 修复 PR，合并 + 发版后触发 §1.15 解除流程 7 步
3. **🟢 低：2026-08-01 到期** — mechanism-candidates #17/#19/#24 移入归档
4. **🟢 低：2026-08-02 下次审查** — 按 dev-rules §6.5 触发条件执行
5. **🟢 低：第四档暂缓项** — D1/D3/D4/D6/D7 + G4-G5 + H3/H6 + I1-I3 + 根因4（需新建文档或大改，下一会话评估）
