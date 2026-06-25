# Run #10 — Phase 0 Evidence: PostgreSQL 17 vs MySQL 8.4 OLTP 高并发选型

> **实验目的**：执行 search-orchestrator SKILL 全流程，保留完整的 fetch_content 全文作为压缩输入，P3 三元组作为 GT 标注参考。
> **输出位置**：`docs/search-orchestrator/experiments/run-10-phase0-evidence.md`
> **执行日期**：2026-06-25

---

## Phase 0 — Complexity Gate (L2 Standard Research)

| 维度 | 评估 |
|------|------|
| **问题类型** | 多维度技术选型（并发控制、benchmark、复制、JSON） |
| **Trade-off 数量** | 4 个子问题，每维度有正向/负向两面 |
| **单一权威源可否回答** | ❌ 需要多源交叉验证 |
| **长期影响** | 数据库选型影响深远，但非不可逆转 |
| **结论** | **L2 Standard Research** — 完整执行 Plan→Search→Evaluate→Synthesize |

---

## Phase 1 — Plan & Fanout

### 1.1 主问题重述

> PostgreSQL 17 与 MySQL 8.4 在 OLTP 高并发场景下，哪个更优？涉及 MVCC 并发控制机制差异、高并发写入 benchmark 对比、复制与高可用方案对比、JSON/文档处理能力对比。

### 1.2 Sub-Questions

| 编号 | Sub-Question | 核心变量 |
|------|-------------|---------|
| **Q1** | PostgreSQL 17 vs MySQL 8.4 的并发控制机制（MVCC 实现差异） | MVCC 实现架构（堆表 vs 索引组织表）、undo 日志 vs 可见性映射、vacuum vs 回滚段、事务隔离等级实现 |
| **Q2** | 高并发写入场景下的 benchmark 对比 | TPC-C、pgbench/sysbench 对比、写冲突处理、死锁概率、性能拐点 |
| **Q3** | 复制与高可用方案对比（逻辑复制 vs binlog replication） | PG 逻辑复制 vs MySQL binlog-based replication、组复制、流复制、failover 机制 |
| **Q4** | JSON / 文档处理能力对比（JSONB vs JSON） | 存储效率、索引支持、查询性能、路径查询语法、文档操作性能 |

### 1.3 Hypotheses

| Sub-Q | Hypothesis | Status |
|-------|-----------|--------|
| Q1 | PostgreSQL 的堆表 MVCC（可见性映射 + vacuum）在长期运行的高写入负载下不如 MySQL 的 undo 回滚段方案稳定 | [未验证] |
| Q2 | PostgreSQL 在 >1000 连接数的高并发写入场景下扩缩性不如 MySQL | [未验证] |
| Q3 | PostgreSQL 的逻辑复制与 MySQL binlog 复制功能对等，但 PG 的流复制在高可用可靠性上优于 MySQL Group Replication | [未验证] |
| Q4 | PostgreSQL JSONB 在存储和索引性能上全面优于 MySQL JSON（因 JSONB 是二进制存储，MySQL JSON 是文本存储 + 无原生 GIN 式索引） | [未验证] |

### 1.4 Query Rewrite — 3-Way Fanout

#### Q1: MVCC 并发控制差异

| Route | Query | 预期信息增益 | 期望主要来源类型 |
|-------|-------|-------------|------------------|
| **R1** | `PostgreSQL 17 vs MySQL 8.4 MVCC implementation differences` | High | T2 社区 + T3 博客 |
| **R2** | `MVCC PostgreSQL heap table vs MySQL InnoDB undo log` site:postgresql.org OR site:dev.mysql.com OR site:highscalability.com OR site:pganalyze.com | High | T1 官方文档 |
| **R3** | `PostgreSQL MVCC problems high write workload vacuum` OR `MySQL MVCC limitations` OR `PostgreSQL vacuum becomes bottleneck` | Medium | T3 真实事故贴 |

#### Q2: 高并发写入 Benchmark

| Route | Query | 预期信息增益 | 期望主要来源类型 |
|-------|-------|-------------|------------------|
| **R1** | `PostgreSQL vs MySQL high concurrency write benchmark 2024 2025` | High | T2 社区 + T3 博客 |
| **R2** | `PostgreSQL MySQL sysbench tpc-c benchmark comparison` site:percona.com OR site:timescale.com OR site:benchmarksql | High | T2 半权威 |
| **R3** | `PostgreSQL high concurrency performance problem` OR `MySQL write conflict deadlock rate` OR `PostgreSQL connection scalability issue` | Medium | T3 真实事故 |

#### Q3: 复制与高可用

| Route | Query | 预期信息增益 | 期望主要来源类型 |
|-------|-------|-------------|------------------|
| **R1** | `PostgreSQL logical replication vs MySQL binlog replication comparison` | High | T2 社区 |
| **R2** | `PostgreSQL streaming replication MySQL Group Replication` site:postgresql.org OR site:dev.mysql.com OR site:severalnines.com OR site:crunchydata.com | High | T1 官方 + T2 |
| **R3** | `PostgreSQL replication failover problems` OR `MySQL Group Replication limitations` OR `logical replication broken` | Medium | T3 事故贴 |

#### Q4: JSON/文档处理

| Route | Query | 预期信息增益 | 期望主要来源类型 |
|-------|-------|-------------|------------------|
| **R1** | `PostgreSQL JSONB vs MySQL JSON performance comparison 2024` | High | T2 社区 |
| **R2** | `PostgreSQL JSONB index GIN MySQL JSON` site:postgresql.org OR site:dev.mysql.com OR site:crunchydata.com | High | T1 官方 |
| **R3** | `PostgreSQL JSONB problems limitations` OR `MySQL JSON performance worse than JSONB` | Medium | T3 实测 |

---

## Phase 2 — Search Execution