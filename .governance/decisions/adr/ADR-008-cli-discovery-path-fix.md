# ADR-008: CLI Plugin Discovery Path Fix

- **Status**: Accepted
- **Date**: 2026-07-09
- **Deciders**: Framework maintainers
- **Evidence as of**: 2026-07-09
- **Expires if unchanged**: 2027-01-09 (6 months)

---

## Context

Cline CLI discovers plugins from ~/.cline/plugins/installed/local/ (user home directory), NOT from project-level .cline/plugins/. This means governance framework plugins placed in the project directory are invisible to the CLI.

The _installed/local/ directory is a junction to installed/local/. Both directories must be synced.

## Decision

Use scripts/sync-governance-plugin.ps1 (Windows) or scripts/sync-governance-plugin.sh (macOS/Linux) to copy .governance/plugin/ and .governance/capabilities/ to ~/.cline/plugins/installed/local/governance/.

Plugins must be self-contained: all dependencies (including cross-directory imports like capabilities/) must be copied together, and relative import paths adjusted accordingly.

## Rationale

1. **CLI design constraint**: Cline CLI only scans the user home directory for plugins. This is not configurable.
2. **Self-contained requirement**: The sandbox subprocess imports modules at runtime via jiti. Cross-directory imports that work in the project will break if the dependency is not copied.
3. **Dual directory**: CLI scans both installed/ and _installed/ (junction). Both must be synced to avoid stale plugin issues.

## Consequences

- Every code change in .governance/plugin/ or .governance/capabilities/ requires re-running the sync script
- The sync script must copy entire directories, not individual files, to preserve import chains
- Verification: check target file LastWriteTime and content, not just Copy-Item exit code

## Evidence

| Fact | Source |
|------|--------|
| CLI scans ~/.cline/plugins/installed/local/ | shared/src/storage/paths.ts source code |
| _installed/ is a junction to installed/ | File system inspection |
| jiti transpiles TS at runtime | plugin-module-import.ts source code |
| Cross-directory import breaks after sync | Manual testing (ADR-007 development) |
