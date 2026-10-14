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
| [ADR-007](ADR-007-registerRule-static-injection.md) | 2026-07-04 | registerRule static injection (not messageBuilder) | Accepted |
| [ADR-008](ADR-008-cli-discovery-path-fix.md) | 2026-07-09 | CLI plugin discovery path fix (sync script) | Accepted |

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
