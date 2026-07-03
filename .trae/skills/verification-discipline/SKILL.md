---
name: verification-discipline
description: "Task lifecycle runtime control: prevent goal drift, enforce stop conditions, balance evidence priority. Invoke when about to claim a feature 'untested/failed/not verified', when chasing diagnostic output instead of checking the artifact itself, when expanding investigation scope beyond original goal, or when about to cite sub-agent findings as verified fact."
---

# Verification Discipline

> Runtime control mechanism for task lifecycle. Addresses three recurring failure modes: (1) goal-function drift, (2) missing stop conditions, (3) evidence priority imbalance.

## When to Invoke

Invoke this skill **immediately** when any of these signals appear:

| # | Signal | Example from real failure |
|---|--------|--------------------------|
| 1 | About to conclude "feature not verified / function failed / cannot confirm" | "snapshot write not triggered" — but never checked if artifact files were produced |
| 2 | Chasing visibility of diagnostic output instead of checking the artifact itself | Ran 6+ rounds hunting `console.log` output while `.md` files were already on disk |
| 3 | About to cite a single-source sub-agent finding as verified fact | PR #5246 cited as "independent source" when it came from one sub-agent only |
| 4 | Investigation scope expanding beyond original verification goal | Goal: verify snapshot write. Drift: investigate `plugin-loaded.log` authorship, dual-setup architecture, console.log redirection |
| 5 | About to change a constant/parameter without scanning all its usage sites | Lowered `MAX_INPUT_TOKENS` but missed `PRESERVE_RECENT_TOKENS` (24K > 750 new threshold) |
| 6 | Reading logs/output and only looking at lines matching current hypothesis | Saw `setup() called` twice in log but didn't notice until 6 rounds later |
| 7 | About to give user a command sequence without first verifying the prefix/hash/format matches | Created `test-snapshot.md` (prefix `test-`) that matches no hash |

## Pre-Conclusion Checklist

Before stating any of these conclusions, run this checklist:

### A. "Feature X not verified / function failed"

- [ ] **Artifact check**: What is the most direct evidence that Feature X works? Have I checked it?
  - Example: For "snapshot write" — check `~/.cline/data/snapshot/*.md` exists, NOT check `console.log` visibility
- [ ] **Positive control**: Is there a known-should-succeed case I can run to confirm my verification method itself works?
  - If the known-good case also fails → verification method is broken, not the feature
  - If the known-good case succeeds → then the negative conclusion is meaningful
- [ ] **Means-ends separation**: Am I checking the feature's actual definition, or just my familiar diagnostic channel?
  - Feature definition = "file written to disk"
  - Diagnostic channel = "console.log appears in terminal"
  - Channel invisible ≠ feature failed

### B. "Sub-agent finding Z confirms X"

- [ ] **Source count**: How many independent sources produced this finding?
  - 1 source → Hypothetical only, cannot be cited as Verified
  - 2+ sources with different evidence types → Verified
- [ ] **Evidence type diversity**: Are the sources truly independent, or the same evidence type restated?
  - Two sub-agents both reading the same source file = 1 source, not 2
  - One sub-agent reads source + another runs experiment = 2 independent types
- [ ] **Re-classification**: When synthesizing multiple sub-agent reports, explicitly re-label each finding's evidence level

### C. "I need to investigate Y to verify X"

- [ ] **Goal relevance**: Is investigating Y actually required to verify X, or am I drifting?
  - Goal: verify snapshot write
  - Drift: investigate why console.log doesn't appear (interesting but not required)
- [ ] **Stop condition**: What specific finding would let me stop investigating Y and return to X?
  - If no stop condition → investigation has no exit, will drift indefinitely
- [ ] **Time-box**: If Y cannot be resolved quickly, can X be verified by another path?
  - Alternative path: check artifact files directly, defer console.log mystery

### D. "I'm changing constant/parameter K"

- [ ] **Usage scan**: Search all code that reads K. Does any of it assume K's original value range?
- [ ] **Dependent constants**: Are there other constants derived from K or paired with K?
  - `MAX_INPUT_TOKENS` pairs with `PRESERVE_RECENT_TOKENS` and `COMPACT_AT_RATIO`
- [ ] **Invariant check**: After change, do all invariants still hold?
  - `PRESERVE_RECENT_TOKENS < MAX_INPUT_TOKENS * COMPACT_AT_RATIO` must hold

## Execution Discipline

### Reading logs/output

- Scan for **anomaly patterns** in parallel, not just lines matching current hypothesis
- Common anomalies: duplicated entries, timestamps out of order, unexpected field values, count mismatches
- If you see the same pattern N times, flag it immediately — don't defer to "I'll look at it later"

### Delivering command sequences to user

- **Pre-verify**: Run any computation you can (hash, prefix, format match) before delivering the command
- **Known-good reference**: Include expected output format so user can detect mismatches
- **Failure branches**: For each command, state what different outcomes mean and the next step for each

### Sub-agent synthesis

When aggregating findings from multiple sub-agents:
- Explicitly tag each finding: `[source: A only | type: source-read]` vs `[source: A+B | type: source+experiment]`
- Single-source findings → Hypothetical
- Multi-source with same type → Corroborated but not Verified (could share bias)
- Multi-source with different types → Verified

## Anti-Patterns to Reject

1. **"Diagnostic channel = feature"** — "console.log doesn't appear, so the feature doesn't work" is invalid reasoning. The feature works iff its defined output exists.

2. **"Single source = verified"** — A sub-agent's confident assertion is still one source. Confidence ≠ independence.

3. **"Investigation without exit"** — Starting an investigation without defining what finding would end it leads to indefinite drift.

4. **"Constants are isolated"** — Changing one constant without scanning dependents breaks invariants silently.

5. **"Logs are linear"** — Reading logs line-by-line looking for matches misses parallel anomalies. Scan for patterns, not just matches.

## Reference

This skill operationalizes `docs/dev-rules.md §1.3` (negative-conclusion gating) and `docs/evidence-governance.md §6` (conflict registry) without modifying them. It is an execution aid, not a new rule. When this skill's checklist conflicts with project rules, project rules win.
