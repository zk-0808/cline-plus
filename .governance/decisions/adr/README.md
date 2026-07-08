# Governance Framework ADRs

> **Lifecycle**: Permanent - Framework architectural decisions.
>
> ADRs in this directory are framework-level decisions that travel with the governance framework when cloned as a template. Project-specific ADRs live in docs/decisions/adr/.

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
