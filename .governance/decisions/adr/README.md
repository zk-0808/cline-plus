# Governance Framework ADRs

> **Lifecycle**: Permanent - Framework architectural decisions.
>
> ADRs in this directory are framework-level decisions that travel with the governance framework when cloned as a template. Project-specific ADRs live in docs/decisions/adr/.
>
> ⚠️ **Numbering is shared across both directories — do not count per-directory.** The framework and project ADR series use one continuous `ADR-NNN` sequence split by location, so a number is unique across the project but each directory holds only a subset. Measured 2026-10-14: `ADR-007` exists in both this directory and `docs/decisions/adr/` (same title, different bytes); `ADR-008` exists only here; `ADR-001/002/004/005/006` exist only in `docs/decisions/adr/`; `ADR-003` lives in neither (its file is at `docs/archive/decisions/ADR-003-plugin-spike-exit.md`, status rolled-back); a second `ADR-002` also appears at `docs/archive/decisions/ADR-002-p5-experiment-exit-review.md`. Any ADR count or cross-reference must therefore name its source directory.

---

## Index

| ADR | Date | Decision | Status |
|-----|------|----------|--------|
| [ADR-007](../../../docs/decisions/adr/ADR-007-snapshot-registerRule-static-injection.md) | 2026-07-04 | registerRule static injection (not messageBuilder) — **正文在 `docs/decisions/adr/`** | Accepted |
| [ADR-008](ADR-008-cli-discovery-path-fix.md) | 2026-07-09 | CLI plugin discovery path fix (sync script) | Accepted |

---

## 变更记录：ADR-007 的重复副本已清除（2026-10-17）

此前 ADR-007 在两棵树各有一份。用 git 历史判定原件：

- `09cf010`（2026-07-04）**创建** `docs/decisions/adr/ADR-007-snapshot-registerRule-static-injection.md`
- `94447e6`（2026-07-09）在本目录**新增**（`A`，不是 rename）`ADR-007-registerRule-static-injection.md` —— 这是复制件

两份逐行比对：94 行差异全部落在相对链接前缀上，**去掉链接目标后正文完全相同**。两份正文并存意味着改一份另一份不会跟着变。

处理：保留 `docs/decisions/adr/` 那份作为唯一正文（原件，也是其他 ADR 引用链指向的那份），删除本目录复制件。恢复方式：`git show 94447e6:.governance/decisions/adr/ADR-007-registerRule-static-injection.md`。

**尚未定的事**：本目录开头写「framework-level decisions that travel with the governance framework」，按这个定义 ADR-007（讲框架的 hook/snapshot 机制）更像框架级；但它的原件一直在 `docs/`，且是其他 ADR 的引用目标。「哪棵树是权威」需要一次正式判定，不宜由一次清理顺手决定 —— 现在只保证**一份正文**。

---

## ADR Format

Each ADR follows this structure:

`markdown
# ADR-NNN: Title

- **Status**: Accepted | Superseded | Deprecated
- **Date**: YYYY-MM-DD
- **Deciders**: Who decided
- **Evidence as of**: Date of last evidence verification
- **Expires if unchanged**: Date when conclusion should be re-verified

## Context
## Decision
## Rationale
## Consequences
## Evidence
`

## Lifecycle

- **Acceptance**: ADR is created with Status=Accepted
- **Supersession**: A new ADR references the old one and sets Status=Superseded
- **Expiration**: Check Expires if unchanged date. If expired, downgrade confidence and re-verify.
