# Decision Archive Summary

> 生成日期：2026-06-28
> 目的：评估 `docs/decisions/` 下所有决策文档与调查笔记的归档状态
> 规则：**不移动、不删除文件**——仅记录归档建议

---

## 状态约定

| 标记 | 含义 |
|------|------|
| **保留** | 文件仍有决策参考价值或处于活跃/暂缓状态 |
| **归档** | 状态为终态（superseded / rolled-back）且结论已被后续文档取代，仅保留审计价值 |
| **需人工判断** | 自动评估无法确定，需项目所有者确认 |

---

## ADR 文件

| 文件 | Status | 建议 | 原因 |
|------|--------|------|------|
| ADR-001-handoff-compact-memory.md | Accepted | **保留** | 战略方向仍然有效；ADR-005 仅 supersedes compact 双产物部分，整体架构方向（Handoff + 索引层）未变 |
| ADR-002-p5-experiment-exit-review.md | （评审输入材料） | **归档** | 外部评审输入，评审目标（是否舍弃 P5 Plugin 实验线）已被 ADR-003 rolled-back + ADR-004 deferred 事件序列取代；材料性质为"评审前置输入"而非决策，参考价值有限 |
| ADR-002-project-shape.md | Accepted (active) | **保留** | 项目形态核心决策，持续有 Update 追加，仍指导当前架构 |
| ADR-003-plugin-spike-exit.md | ~~Accepted~~ → rolled-back | **归档** | 状态为 rolled-back（当日撤销）；No-Go 结论系验证方法假阴性（`config plugins` 只扫真实 cwd），已被修正后事实证伪。全文保留用于审计 |
| ADR-004-p5-spike-pause.md | deferred | **保留** | 暂缓状态保留恢复条件；#6 已实证结论仍有参考价值；若 P5 恢复需参考此决策 |
| ADR-005-split-compact-from-handoff.md | Accepted | **保留** | 当前最新活跃决策，拆分 Compaction 与 Handoff 职责 |

---

## 搜索决策（D-* 文件）

| 文件 | Status | 建议 | 原因 |
|------|--------|------|------|
| D-2026-06-23-search-adopt-goggles.md | active | **保留** | 当前 SKILL.md §3.5 仍在执行 |
| D-2026-06-23-search-finalscore-coupling.md | active | **保留** | FinalScore 复合模型仍在 SKILL.md §3.5.5 中使用 |
| D-2026-06-24-search-adopt-p3.md | active | **保留** | Evidence-bound Citation 三档模式仍在 SKILL.md §4.3 中执行 |
| D-2026-06-24-search-adopt-p4-same-source-merge.md | active | **保留** | 同源内容合并仍在 SKILL.md Step 3.bis 中执行 |
| D-2026-06-24-search-defer-p2.md | deferred | **保留** | P2 搁置但保留恢复条件（反证检索 #20、多样性排序 #21） |
| D-2026-06-24-search-evaluate-p5-output-schema.md | superseded | **归档** | 已被 D-2026-06-25-search-redesign-p5-evidence-map 取代（frontmatter `superseded_by` 已标注） |
| D-2026-06-24-search-infra-mcp-upgrade.md | rolled-back | **归档** | Run #8a 实测否决核心假设（TLS 指纹非中文 fetch 失败主因），已回滚 MCP 配置；当前最强解释转为 Cloudflare JS Challenge + IP Reputation |
| D-2026-06-24-search-revise-p4-metrics.md | active | **保留** | P4 评估指标修订仍在执行 |
| D-2026-06-24-search-rollback-diversity.md | rolled-back | **归档** | DiversityPenalty 已从 SKILL.md 移除；Run #3 证实提示词层多样性约束不可行，属 A 类机制层问题。决策过程本身有参考价值（"提示词层能做什么、不能做什么"的边界划定） |
| D-2026-06-25-search-adopt-p6-highlights.md | active | **保留** | P6 Highlights 仍在 SKILL.md Phase 1.bis 中执行 |
| D-2026-06-25-search-redesign-p5-evidence-map.md | proposed | **保留** | P5 重设计方案，取代旧 Output Schema v1，待 Run #13 验证 |
| D-2026-06-26-search-adopt-mcp-throttle-wrapper.md | active | **保留** | MCP 反-bot 节流 wrapper 当前生效 |

---

## 调查笔记

| 文件 | 建议 | 原因 |
|------|------|------|
| investigation-note-marketplace-dev-mechanism.md | **保留** | 调查仍在进行中，纠正了"社区无开发记录"的旧结论 |
| investigation-note-probe-5.md | **归档** | Probe 5 V3 结论（VS Code 扩展 4.0.0 可发现 plugin）已被 investigation-note-vscode-bootstrap-missing.md 修正——plugin 可发现但 `setup()` 不执行（`plugin-sandbox-bootstrap.js` 未打包）。旧结论有误导风险 |
| investigation-note-vscode-bootstrap-missing.md | **保留** | 当前最新调查结论，修正了 probe-5 的 V3 结论；同时也是 draft-issue-bootstrap-missing.md 的证据基础 |
| investigation-note-vscode-settings-inventory.md | **保留** | VS Code 扩展 4.0.0 可设置选项完整盘点，当前仍有效 |

---

## 其他文件

| 文件 | 建议 | 原因 |
|------|------|------|
| README.md | **保留** | 决策索引，需定期维护（注意：ADR-003 标记为 rolled-back，ADR-002-p5-experiment-exit-review 未在索引中） |
| draft-issue-bootstrap-missing.md | **保留** | 草稿状态，待用户确认后提交 GitHub issue |

---

## 归档清单汇总

以下 5 个文件建议归档（不删除，仅标记为归档审计用途）：

| # | 文件名 | Status | 核心结论 | 归档原因 |
|---|--------|--------|---------|---------|
| 1 | ADR-002-p5-experiment-exit-review.md | 评审输入 | 倾向舍弃 P5 Plugin 实验线 | 评审目标被 ADR-003 rolled-back + ADR-004 deferred 事件序列取代；仅为外部评审前置输入 |
| 2 | ADR-003-plugin-spike-exit.md | rolled-back | P5 Plugin No-Go（误判） | No-Go 证据系假阴性（`config plugins` 扫描路径错误），同日撤销；全文保留用于审计 |
| 3 | D-2026-06-24-search-evaluate-p5-output-schema.md | superseded | P5 Output Schema v1 评估启动 | 被 D-2026-06-25-search-redesign-p5-evidence-map 取代 |
| 4 | D-2026-06-24-search-infra-mcp-upgrade.md | rolled-back | MCP 后端切换验证中文 fetch | Run #8a 否决核心假设（0/10 fetch），已回滚 |
| 5 | D-2026-06-24-search-rollback-diversity.md | rolled-back | 回退 DiversityPenalty + R1 保底 | Run #3 证实提示词层多样性约束不可行，已从 SKILL.md 移除 |
| 6 | investigation-note-probe-5.md | 结论已修正 | VS Code plugin 可发现（V3） | 结论被 vscode-bootstrap-missing 修正：可发现但 setup() 不执行 |

共 **6 个文件**建议归档，**18 个文件**建议保留。
