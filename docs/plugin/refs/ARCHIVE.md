# Plugin 参考文档归档摘要

> **日期**：2026-06-28
> **评估范围**：`docs/plugin/refs/` 目录 5 个参考文档 + `docs/plugin/` 2 个设计文档
> **原则**：不移动、不删除文件，仅记录归档建议

---

## 归档项

### `refs/capability-probe.md`

- **核心价值**：Phase 1 文档/社区调研结果（2026-06-23），验证 Cline Plugin SDK 可用性
- **归档原因**：
  - 调研日期为 2026-06-23，已被 2026-06-28 的 `mechanism-landing-assessment.md` 完整覆盖
  - 后者提供更全面的 API 能力汇总表（rules / hooks / afterTool / messageBuilder / SQLite / File Hooks / session_id）
  - 后者包含主流 Agent 方案调研（Claude Code / Cursor / Windsurf 等），信息量远超 Phase 1
  - Phase 2（源码补缺）实际已由 `cline-plugin-architecture-atlas.md` 和 `handoff-plugin-architecture.md` 完成
- **备注**：保留文件作为调研过程追溯，但不应作为当前 API 能力判断依据

### `refs/handoff-plugin-architecture.md`

- **核心价值**：早期架构参考，记录 Plugin Sandbox 加载链路和源码发现
- **归档原因**：
  - 核心架构信息已被 `design.md`（含 ADR-005 引用）覆盖——design.md 是当前唯一权威架构文档
  - Plugin Sandbox 架构发现已整合到 `cline-plugin-architecture-atlas.md`（更完整的 Repository Map + 生命周期导航）
  - 文件自身定位为"后续开发只需读此文档，不需再翻阅源码"——但 design.md 已承担此职责
  - 部分内容（如 `writeFileSync` 不自动创建父目录的踩坑）仍有历史价值，但不构成独立保留理由
- **备注**：保留文件作为源码探索历史，但新开发应以 design.md + architecture-atlas.md 为准

---

## 保留项

| 文件 | 保留原因 |
|------|---------|
| `refs/cline-plugin-architecture-atlas.md` | 排查指南，Repository Map + 生命周期导航，验证版本为最新（2026-06-28），独立参考价值 |
| `refs/cline-plugin-dev-guide.md` | 开发指南，含 VS Code Extension workaround 等实操内容，验证版本为最新（2026-06-28） |
| `refs/plugin-dev-quick-reference.md` | 快速参考，虽 §0 已标注 stale，但 §1+（最小 Plugin 骨架等）仍有实操价值 |
| `design.md` | 活跃设计文档，ADR-005 已更新引用，当前唯一权威架构文档 |
| `mechanism-landing-assessment.md` | 活跃评估文档，2026-06-28 创建，11 条候选落地可行性分析 |
