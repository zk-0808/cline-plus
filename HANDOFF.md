# Handoff - Phase 1 Tracing + Phase 2 Staleness

> Session handoff file. Overwrite each session.

---

## Decisions

| id | decision | confidence | depends_on |
|----|------|-----------|------------|
| tracing-first | Phase 1 Tracing before Phase 2 Staleness, staleness validation needs tracing data | Verified | - |
| staleness-tier-decay | Tier decay: fresh 1.0 -> aging 0.5 -> stale 0.1 -> expired | Likely | tracing-first |
| delete-default-off | sweeper physical delete default off, needs ruleBlock=true | Verified | staleness-tier-decay |
| phase-not-priority | Use Phase 1/2 not P0/P1 to avoid priority ambiguity | Verified | - |
| open-problem | Competitors acknowledge staleness but did not sink to governance hook layer | Verified | - |

## Net Changes

### Code

- NEW .governance/capabilities/tracer/types.ts
- NEW .governance/capabilities/tracer/index.ts - trace() + traceSync() + estTokens()
- NEW .governance/plugin/staleness-utils.ts - calcStalenessWeight() + processStaleness()
- NEW .governance/capabilities/staleness-sweeper/index.ts
- MOD .governance/plugin/index.ts - 3 tracing points + staleness on HANDOFF read
- MOD .governance/plugin/types.ts - PluginState adds tracePath/traceEnabled
- MOD .governance/capabilities/rule-appender/index.ts - table adds ttl/last_validated/weight
- MOD .governance/hooks/config.json - tracing config section
- NEW scripts/trace-stats.js

### Docs

- MOD .governance/rules/lifecycle.md - staleness mechanism documented
- MOD .governance/plugin/tsconfig.json - include new files

### Key Learnings

- Phase 1/2 better than P0/P1: Phase=sequence, P=priority
- staleness delete=archive not physical: irreversible risk
- competitor claim=open problem not ignored: mem0 acknowledges but not implemented

## TODO

### Unfinished

| id | item | confidence | depends_on |
|----|----|-----------|------------|
| staleness-refresh | Design last_validated refresh mechanism | Verified | staleness-tier-decay |
| stale-injection | Decide if weight=0.1 entries still injected or filtered | Verified | staleness-tier-decay |

### Completed (2026-07-09 smoke tests)

| id | item | result | evidence |
|----|----|--------|----------|
| smoke-tracing | mock 3 hook events, verify traces.jsonl, run trace-stats.js | PASS | docs/experiments/smoke-tracing-result.json |
| smoke-staleness | age=30/60/95/185 days test data, verify processStaleness() | PASS | docs/experiments/smoke-staleness-result.json |
| smoke-sweeper | sweeper 默认不删除 / ruleBlock=true 删除 / writeError | PASS | docs/experiments/smoke-sweeper-result.json |
| smoke-refresh-entry | refreshEntry 刷新 last_validated，权重基准统一 | PASS | docs/experiments/smoke-refresh-entry-result.json |
| smoke-sessionstart-e2e | HANDOFF → processStaleness → staleness summary → 注入 | PASS | docs/experiments/smoke-sessionstart-e2e-result.json |
| bug-fix-sweeper-weight | 修 sweeper 权重不一致（换用 calcStalenessWeight） | FIXED | .governance/capabilities/staleness-sweeper/index.ts |
| doc-lifecycle-align | lifecycle.md 补充 'injection = annotate not filter' 设计决策 | UPDATED | .governance/rules/lifecycle.md |

### Optional

- sub-agent context isolation (needs SDK hook confirmation)
- long conversation snapshot recovery (waiting PR #12032)
- A/B experiment framework (tracing before/after)

## Blockers

| blocker | impact | mitigation |
|--------|------|-----------|
| (无) | runtime artifacts 已生成，测试通过 | 见 Completed 表 |

## Key Resources

```
Tracing:     .governance/capabilities/tracer/index.ts
Staleness:   .governance/plugin/staleness-utils.ts
Sweeper:     .governance/capabilities/staleness-sweeper/index.ts
Stats:       scripts/trace-stats.js
Config:      .governance/hooks/config.json
Lifecycle:   .governance/rules/lifecycle.md
Competitors: yantrikdb(164), memwatch(33), MemGuard(3), memharness(4), mnemos(9)
```

## Pending Experience

> Auto-appended by rule-appender, promote to rules/ or delete after review.

| id | experience | source | date | status | ttl(days) | last_validated | weight |
|----|------|------|---------|------|---------|---------|------|
| exp-tracing-first | Lay tracing before governance strategy, validate with before/after data | this session | 2026-07-08 | pending review | 90 | 2026-07-08T13:30:00.000Z | 1.0 |
| exp-phase-label | Use Phase 1/2 not P0/P1 to avoid priority ambiguity | Claude feedback | 2026-07-08 | pending review | 90 | 2026-07-08T13:30:00.000Z | 1.0 |
| exp-delete-to-archive | Auto-governance delete=archive, default off, irreversible risk | Claude feedback | 2026-07-08 | pending review | 90 | 2026-07-08T13:30:00.000Z | 1.0 |
| exp-staleness-wording | Say open problem not ignored for competitor positioning | Claude feedback | 2026-07-08 | pending review | 90 | 2026-07-08T13:30:00.000Z | 1.0 |

## Next Session First Actions

1. Read .governance/core/constitution.md
2. Read this file
3. Read .governance/rules/ active entry rules
4. Do smoke-tracing then smoke-staleness, save to docs/experiments/

---

## Handoff

```text
Read .governance/core/constitution.md + HANDOFF.md + .governance/rules/.
Then do smoke-tracing and smoke-staleness verification.
```



