# Handoff — 代码卫生 + 机制清单瘦身

> **生命周期**：每次覆写，无归档——会话交接文件。

## 本会话决策

- **search-mcp-wrapper 重构方向**：采纳 GPT review 建议，拆分为 3 文件（config / circuit-breaker / index），引入显式三态状态机（Closed / HalfOpen / Open），HalfOpen 探测逻辑独立封装。
- **coder-persona 模板改进**：触发条件增加量化门槛（≥2 文件或 ≥30 行），启动必读改为三选一（架构决策 / ADR / 评审报告）。
- **P5 spike 归档策略**：选择就地归档（添加 DEPRECATED.md），不移动文件，避免破坏 15 处交叉引用。ADR-004 状态改为 superseded。
- **mechanism-candidates #4/#5 退休**：两者均依赖 VS Code 扩展 plugin 系统（受 §1.15 阻塞），暂时退休移入归档区，代码和设计文档保留。

## 本会话净变化

### 1. search-mcp-wrapper 3 文件重构（commit `67d8acd`）

346 行单文件拆分为：
- `config.ts`（73 行）：配置接口 + 环境变量解析，零项目依赖
- `circuit-breaker.ts`（183 行）：显式三态状态机，6 种状态转换，`checkAndAllow()` / `recordFailure()` / `recordSuccess()` / `completeProbe()` 四操作
- `index.ts`（310 行）：瘦编排层，向后兼容 API 不变

11/11 集成测试通过（337ms）。

### 2. coder-persona 模板改进（commit `1b5856d`）

触发条件：从模糊的"代码需要重构"改为量化门槛（≥2 文件或 ≥30 行改动）。启动必读：从泛泛的"相关规划文档"改为三选一（架构决策 / ADR 路径 / 评审报告），并补入"现有测试文件"作为实现输入。

### 3. P5 spike 就地归档（commit `a0e6a7f`）

- 新增 `experiments/p5-spike/DEPRECATED.md`：状态 superseded（2026-06-28），能力映射表指向 context-snapshot
- ADR-004 状态 `deferred` → `superseded`，添加 Superseded-by 字段指向 ADR-005
- decisions/README.md ADR-004 行同步更新
- mechanism-candidates #14 状态改为"已实现"

### 4. Python 基线脚本去重（commit `aa90ec5`）

提取 `_baseline_common.py`（173 行）：SimHash、Jaccard、shingles、URL 规范化、union-find。run-11 和 run-12b 改为导入使用，保留各自的 hash 函数偏好（MD5 vs Blake2b）和规范化粒度。run-11 运行验证评分 5/5 与原版一致。

### 5. mechanism-candidates #4/#5 暂时退休（commit `1f4ca36`）

#4（loop-guard）和 #5（compaction/handoff 拆分）均依赖 VS Code 扩展 plugin 系统，受 §1.15 阻塞。移入归档区，标注"暂时退休"，代码实现和 ADR-005 设计文档保留。

## Commits

| Hash | Message |
|------|---------|
| `1b5856d` | refactor(coder-persona): 触发条件量化门槛 + 启动必读三选一 + 补测试文件 |
| `67d8acd` | refactor(search-mcp-wrapper): 3文件拆分 + 配置外提 + 显式三态状态机 |
| `a0e6a7f` | docs: p5-spike 就地归档 — DEPRECATED.md + ADR-004 superseded + #14 已实现 |
| `aa90ec5` | refactor(baselines): 提取 _baseline_common.py 消除实验脚本重复算法 |
| `1f4ca36` | docs: mechanism-candidates #4/#5 暂时退休（依赖 VS 扩展 plugin 系统） |

**注**：以上 5 个 commit 均未 push（GitHub 连接持续被重置）。网络恢复后执行 `git push cline-plus main`。

## 未完成项

| id | 方向 | 说明 | 优先级 | confidence | depends_on |
|----|------|------|--------|-----------|------------|
| `next-feature-direction` | 下一功能方向决策 | 候选：记忆系统 D' 索引层（ADR-001 预留）/ 经验机制化（mechanism-candidates A 类推进）/ 其他。需读 [external-review-round2-handoff.md](plugin/external-review-round2-handoff.md) 全文 + [response-to-external-review-handoff.md](plugin/response-to-external-review-handoff.md) 后决定 | 🟡 中 | Hypothesis | — |
| `issue-11944` | GitHub #11944 跟进 | SDK 迁移时间线（影响 VS Code 扩展 plugin 系统恢复，#4/#5 退休解除依赖） | 🟡 中 | Verified | — |
| `pr-12032` | PR #12032 合并监控 | CLI codec bug 修复 PR（Open），合并 + CLI 发版后触发 §1.15 解除流程 7 步 | 🟡 中 | Verified | — |
| `mech-stale-scan` | mechanism-candidates stale 扫描 | #1/#2/#3 长期候选无进展（>90 天），按 stale 规则标 ⚠️ 评估保留/降级/删除 | 🟡 中 | Verified | — |
| `tier4-deferred` | 第四档暂缓项 | D1/D3/D4/D6/D7 + G4-G5 + H3/H6 + I1-I3 + 根因4（根因4 已由 governance-procedure.md 部分承载） | 🟢 低 | Hypothesis | — |
| `vscode-monitor` | 监控 VS Code release | 关键词 Plugins / registerMessageBuilder | 🟢 低 | Verified | `issue-11944` |
| `mech-retirement` | mechanism-candidates 退休执行 | 2026-08-01 到期将 #17/#19/#24 移入归档 | 🟢 低 | Verified | — |
| `h2-h3-evidence` | 补证 H2/H3 | image 分支 undefined 丢弃（受 §1.15 阻塞，等 PR #12032） | 🟢 低 | Hypothesis | `pr-12032` |
| `next-audit` | 下次文档健康度审查 | 2026-08-02（30 天后），按 §6.5 触发条件执行 | 🟢 低 | Verified | — |

## 权威源

[dev-rules.md](dev-rules.md) · [evidence-governance.md](evidence-governance.md) · [governance-procedure.md](governance-procedure.md) · [reviewer-personas.md](reviewer-personas.md) · [project-health-audit-2026-07-02.md](project-health-audit-2026-07-02.md) · [mechanism-candidates.md](mechanism-candidates.md) · [plugin/project-rules.md](plugin/project-rules.md)（已冻结——参考样例）

> **新会话首动作**：读 [dev-rules.md](dev-rules.md)（🟢 解冻状态）+ 本 handoff + [governance-procedure.md §12 快速启动清单](governance-procedure.md)。context-snapshot 已冻结，[plugin/project-rules.md §3](plugin/project-rules.md) 不再活跃执行，仅作参考样例。如需推进暂缓项，先读 [project-health-audit-2026-07-02.md §12 第四档](project-health-audit-2026-07-02.md) 暂缓清单。

---

## Handoff

```text
读 docs/handoff.md + docs/dev-rules.md + docs/governance-procedure.md §12 快速启动清单。
```

**后续动作**（无紧急项）：
1. **🟡 中：下一功能方向决策** — 读 external-review-round2-handoff.md + response-to-external-review-handoff.md 后决定（候选：记忆系统 D' 索引层 / 经验机制化）
2. **🟡 中：跟进 GitHub #11944** — SDK 迁移时间线（#4/#5 退休解除依赖）
3. **🟡 中：监控 PR #12032** — CLI codec bug 修复 PR，合并 + 发版后触发 §1.15 解除流程
4. **🟡 中：mechanism-candidates stale 扫描** — #1/#2/#3 长期候选 >90 天无进展，评估保留/降级/删除
5. **🟢 低：2026-08-01 到期** — #17/#19/#24 移入归档
6. **🟢 低：2026-08-02 下次审查** — 按 dev-rules §6.5 触发条件执行
7. **🟢 低：第四档暂缓项** — D1/D3/D4/D6/D7 + G4-G5 + H3/H6 + I1-I3
