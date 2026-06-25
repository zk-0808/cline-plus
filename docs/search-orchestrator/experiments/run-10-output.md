# Run #10 — 完整输出: PostgreSQL 17 vs MySQL 8.4 — OLTP 高并发场景选型

> **输出时间**：2026-06-25
> **搜索引擎**：DuckDuckGo（搜索 API 暂不可用，直接 fetch 已知权威 URL）

---

## 1. 搜索结果表

| # | Query | Route | Goggle Action | T-Level | FinalScore |
|---|-------|-------|---------------|---------|------------|
| Q1-R1 | PostgreSQL 17 vs MySQL 8.4 MVCC implementation differences | R1 | N/A（搜索不可用） | T1（直接 fetch 官方文档） | 9 |
| Q1-R2 | MVCC PostgreSQL heap table vs MySQL InnoDB undo log | R2 | N/A | T1（官方文档 pg doc / mysql doc） | 9 |
| Q1-R3 | PostgreSQL MVCC problems vacuum bottleneck | R3 | N/A | T1（官方 doc vacuuming） | 8 |
| Q2-R1 | PostgreSQL vs MySQL high concurrency write benchmark 2024 2025 | R1 | N/A（搜索不可用） | —（未 fetch 到 benchmark 数据） | — |
| Q2-R2 | PostgreSQL MySQL sysbench tpc-c benchmark comparison | R2 | N/A（搜索不可用） | —（未 fetch 到 benchmark 数据） | — |
| Q2-R3 | PostgreSQL high concurrency performance problem | R3 | N/A（搜索不可用） | —（未 fetch 到 benchmark 数据） | — |
| Q3-R1 | PostgreSQL logical replication vs MySQL binlog replication comparison | R1 | N/A（搜索不可用） | T1（官方 doc pg logical repl / mysql repl） | 9 |
| Q3-R2 | PostgreSQL streaming replication MySQL Group Replication | R2 | N/A | T1（官方 doc pg HA / mysql group repl） | 9 |
| Q3-R3 | PostgreSQL replication failover problems | R3 | N/A | T1（官方 doc failover） | 8 |
| Q4-R1 | PostgreSQL JSONB vs MySQL JSON performance comparison 2024 | R1 | N/A（搜索不可用） | —（未 fetch 到 benchmark 数据） | — |
| Q4-R2 | PostgreSQL JSONB index GIN MySQL JSON | R2 | N/A | T1（官方 doc pg json / mysql json） | 9 |
| Q4-R3 | PostgreSQL JSONB problems limitations | R3 | N/A | T1（官方 doc pg json） | 8 |

> **标注说明**：
> - 「搜索不可用」= DuckDuckGo search API 返回 fetch failed，无法执行 query；仅通过直接 fetch 已知 URL 获取内容
> - T-Level=T1 表示来源为官方文档（PostgreSQL.org / dev.mysql.com）
> - FinalScore=9 或 8，基于来源权威性 + 内容相关度
> - Q2（Benchmark）因搜索不可用，未能获取到 benchmark 数据

---

## 2. fetch_content 全文归档

### URL #1: PostgreSQL 17 MVCC Introduction
**URL**: https://www.postgresql.org/docs/17/mvcc-intro.html
**Fetch**: ✅ 成功
**状态码**: 200
**正文（核心片段）**：
"PostgreSQL provides a rich set of tools for developers to manage concurrent access to data.
Internally, data consistency is maintained by using a multiversion model (Multiversion Concurrency Control, MVCC).
This means that each SQL statement sees a snapshot of data (a database version) as it was some time ago,
regardless of the current state of the underlying data. This prevents statements from viewing inconsistent
data produced by concurrent transactions performing updates on the same data rows, providing transaction
isolation for each database session. MVCC, by eschewing the locking methodologies of traditional database
systems, minimizes lock contention in order to allow for reasonable performance in multiuser environments.
The main advantage of using the MVCC model of concurrency control rather than locking is that in MVCC
locks acquired for querying (reading) data do not conflict with locks acquired for writing data,
and so reading never blocks writing and writing never blocks reading. PostgreSQL maintains this guarantee
even when providing the strictest level of transaction isolation through the use of an innovative
Serializable Snapshot Isolation (SSI) level."

### URL #2: PostgreSQL 17 Transaction Isolation
**URL**: https://www.postgresql.org/docs/17/transaction-iso.html
**Fetch**: ✅ 成功
**状态码**: 200
**正文（核心片段）**：
"Read Committed is the default isolation level in PostgreSQL. When a transaction uses this isolation level,
a SELECT query (without a FOR UPDATE/SHARE clause) sees only data committed before the query began;
it never sees either uncommitted data or changes committed by concurrent transactions during the query's
execution. In effect, a SELECT query sees a snapshot of the database as of the instant the query begins
to run. ...UPDATE, DELETE, SELECT FOR UPDATE, and SELECT FOR SHARE commands behave the same as SELECT
in terms of searching for target rows: they will only find target rows that were committed as of the
command start time. However, such a target row might have already been updated (or deleted or locked)
by another concurrent transaction by the time it is found. In this case, the would-be updater will wait
for the first updating transaction to commit or roll back (if it is still in progress). If the first
updater rolls back, then its effects are negated and the second updater can proceed with updating the
originally found row. If the first updater commits, the second updater will ignore the row if the first
updater deleted it, otherwise it will attempt to apply its operation to the updated version of the row."

### URL #3: MySQL 8.4 InnoDB Multi-Versioning
**URL**: https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html
**Fetch**: ✅ 成功
**状态码**: 200
**正文（核心片段）**：
"InnoDB is a multi-version storage engine. It keeps information about old versions of changed rows
to support transactional features such as concurrency and rollback. This information is stored in
undo tablespaces in a data structure called a rollback segment. ...InnoDB uses the information in the
rollback segment to perform the undo operations needed in a transaction rollback. It also uses the
information to build earlier versions of a row for a consistent read.
...Internally, InnoDB adds three fields to each row stored in the database: A 6-byte DB_TRX_ID field
indicates the transaction identifier for the last transaction that inserted or updated the row.
...A 7-byte DB_ROLL_PTR field called the roll pointer. The roll pointer points to an undo log record
written to the rollback segment. If the row was updated, the undo log record contains the information
necessary to rebuild the content of the row before it was updated.
...Undo logs in the rollback segment are divided into insert and update undo logs. Insert undo logs
are needed only in transaction rollback and can be discarded as soon as the transaction commits.
Update undo logs are used also in consistent reads, but they can be discarded only after there is no
transaction present for which InnoDB has assigned a snapshot that in a consistent read could require
the information in the update undo log to build an earlier version of a database row.
...In the InnoDB multi-versioning scheme, a row is not physically removed from the database immediately
when you delete it with an SQL statement. InnoDB only physically removes the corresponding row and its
index records when it discards the update undo log record written for the deletion. This removal
operation is called a purge."
"Multi-Versioning and Secondary Indexes: InnoDB multiversion concurrency control (MVCC) treats
secondary indexes differently than clustered indexes. Records in a clustered index are updated in-place,
and their hidden system columns point undo log entries from which earlier versions of records can be
reconstructed. Unlike clustered index records, secondary index records do not contain hidden system
columns nor are they updated in-place."

### URL #4: MySQL 8.4 Consistent Nonlocking Reads
**URL**: https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html
**Fetch**: ✅ 成功
**状态码**: 200
**正文（核心片段）**：
"A consistent read means that InnoDB uses multi-versioning to present to a query a snapshot of the
database at a point in time. The query sees the changes made by transactions that committed before
that point in time, and no changes made by later or uncommitted transactions.
...If the transaction isolation level is REPEATABLE READ (the default level), all consistent reads
within the same transaction read the snapshot established by the first such read in that transaction.
...With READ COMMITTED isolation level, each consistent read within a transaction sets and reads
its own fresh snapshot. Consistent read is the default mode in which InnoDB processes SELECT statements
in READ COMMITTED and REPEATABLE READ isolation levels. A consistent read does not set any locks on
the tables it accesses."

### URL #5: PostgreSQL 17 Routine Vacuuming
**URL**: https://www.postgresql.org/docs/17/routine-vacuuming.html
**Fetch**: ✅ 成功
**状态码**: 200
**正文（核心片段）**：
"PostgreSQL's VACUUM command has to process each table on a regular basis for several reasons:
To recover or reuse disk space occupied by updated or deleted rows. To update data statistics used
by the PostgreSQL query planner. To update the visibility map, which speeds up index-only scans.
To protect against loss of very old data due to transaction ID wraparound or multixact ID wraparound.
...In PostgreSQL, an UPDATE or DELETE of a row does not immediately remove the old version of the row.
This approach is necessary to gain the benefits of multiversion concurrency control (MVCC): the row
version must not be deleted while it is still potentially visible to other transactions. But eventually,
an outdated or deleted row version is no longer of interest to any transaction. The space it occupies
must then be reclaimed for reuse by new rows, to avoid unbounded growth of disk space requirements.
This is done by running VACUUM. ...The usual goal of routine vacuuming is to do standard VACUUMs often
enough to avoid needing VACUUM FULL. ...Using the autovacuum daemon alleviates this problem, since the
daemon schedules vacuuming dynamically in response to update activity."

### URL #6: PostgreSQL 17 JSON Types
**URL**: https://www.postgresql.org/docs/17/datatype-json.html
**Fetch**: ✅ 成功
**状态码**: 200
**正文（核心片段）**：
"PostgreSQL offers two types for storing JSON data: json and jsonb. ...The json data type stores an
exact copy of the input text, which processing functions must reparse on each execution; while jsonb
data is stored in a decomposed binary format that makes it slightly slower to input due to added
conversion overhead, but significantly faster to process, since no reparsing is needed. jsonb also
supports indexing, which can be a significant advantage.
...In general, most applications should prefer to store JSON data as jsonb, unless there are quite
specialized needs, such as legacy assumptions about ordering of object keys.
...jsonb does not preserve white space, does not preserve the order of object keys, and does not keep
duplicate object keys."
"jsonb also supports indexing": GIN indexes, jsonpath indexes (Section 8.14.4 jsonb Indexing).

### URL #7: MySQL 8.4 JSON Data Type
**URL**: https://dev.mysql.com/doc/refman/8.4/en/json.html
**Fetch**: ✅ 成功
**状态码**: 200
**正文（核心片段）**：
"MySQL supports a native JSON (JavaScript Object Notation) data type defined by RFC 8259 that enables
efficient access to data in JSON documents. The JSON data type provides these advantages over storing
JSON-format strings in a string column: Automatic validation of JSON documents stored in JSON columns.
Invalid documents produce an error. Optimized storage format. JSON documents stored in JSON columns
are converted to an internal format that permits quick read access to document elements. When the
server later must read a JSON value stored in this binary format, the value need not be parsed from
a text representation. The binary format is structured to enable the server to look up subobjects or
nested values directly by key or array index without reading all values before or after them in the
document. ...JSON columns, like columns of other binary types, are not indexed directly; instead,
you can create an index on a generated column that extracts a scalar value from the JSON column.
...The InnoDB storage engine supports multi-valued indexes on JSON arrays."

### URL #8: PostgreSQL 17 Logical Replication
**URL**: https://www.postgresql.org/docs/17/logical-replication.html
**Fetch**: ✅ 成功
**状态码**: 200
**正文（核心片段）**：
"Logical replication is a method of replicating data objects and their changes, based upon their
replication identity (usually a primary key). We use the term logical in contrast to physical
replication, which uses exact block addresses and byte-by-byte replication. PostgreSQL supports both
mechanisms concurrently. ...Logical replication uses a publish and subscribe model with one or more
subscribers subscribing to one or more publications on a publisher node. Subscribers pull data from
the publications they subscribe to and may subsequently re-publish data to allow cascading replication
or more complex configurations. ...Logical replication of a table typically starts with taking a
snapshot of the data on the publisher database and copying that to the subscriber. Once that is done,
the changes on the publisher are sent to the subscriber as they occur in real-time. The subscriber
applies the data in the same order as the publisher so that transactional consistency is guaranteed
for publications within a single subscription. ...The typical use-cases for logical replication are:
Sending incremental changes in a single database or a subset of a database to subscribers as they occur.
...Replicating between different major versions of PostgreSQL. Replicating between PostgreSQL instances
on different platforms (for example Linux to Windows)."

### URL #9: PostgreSQL 17 High Availability
**URL**: https://www.postgresql.org/docs/17/high-availability.html
**Fetch**: ✅ 成功
**状态码**: 200
**正文（核心片段）**：
"Database servers can work together to allow a second server to take over quickly if the primary server
fails (high availability), or to allow several computers to serve the same data (load balancing).
...Because there is no single solution that eliminates the impact of the sync problem for all use cases,
there are multiple solutions. ...Servers that can modify data are called read/write, master or primary
servers. Servers that track changes in the primary are called standby or secondary servers. A standby
server that cannot be connected to until it is promoted to a primary server is called a warm standby
server, and one that can accept connections and serves read-only queries is called a hot standby server.
...Some solutions are synchronous, meaning that a data-modifying transaction is not considered committed
until all servers have committed the transaction. ...Asynchronous solutions allow some delay between
the time of a commit and its propagation to the other servers."
Streaming replication, replication slots, cascading replication, synchronous replication all covered
in section 26.2.

### URL #10: MySQL 8.4 Replication Overview
**URL**: https://dev.mysql.com/doc/refman/8.4/en/replication.html
**Fetch**: ✅ 成功
**状态码**: 200
**正文（核心片段）**：
"Replication enables data from one MySQL database server (known as a source) to be copied to one or
more MySQL database servers (known as replicas). Replication is asynchronous by default; replicas do
not need to be connected permanently to receive updates from a source. ...MySQL 8.4 supports different
methods of replication. The traditional method is based on replicating events from the source's binary
log, and requires the log files and positions in them to be synchronized between source and replica.
The newer method based on global transaction identifiers (GTIDs) is transactional and therefore does
not require working with log files or positions within these files. ...MySQL 8.4 also supports
semisynchronous replication: a commit performed on the source blocks before returning to the session
that performed the transaction until at least one replica acknowledges that it has received and logged
the events for the transaction. ...There are two core types of replication format, Statement Based
Replication (SBR), which replicates entire SQL statements, and Row Based Replication (RBR), which
replicates only the changed rows. You can also use a third variety, Mixed Based Replication (MBR)."

### URL #11: MySQL 8.4 Group Replication
**URL**: https://dev.mysql.com/doc/refman/8.4/en/group-replication.html
**Fetch**: ✅ 成功
**状态码**: 200
**正文（核心片段）**：
"MySQL Group Replication enables you to create elastic, highly-available, fault-tolerant replication
topologies. Groups can operate in a single-primary mode with automatic primary election, where only
one server accepts updates at a time. Alternatively, groups can be deployed in multi-primary mode,
where all servers can accept updates, even if they are issued concurrently. There is a built-in group
membership service that keeps the view of the group consistent and available for all servers at any
given point in time. Servers can leave and join the group and the view is updated accordingly.
Sometimes servers can leave the group unexpectedly, in which case the failure detection mechanism
detects this and notifies the group that the view has changed. ...Group Replication guarantees that
the database service is continuously available. However, it is important to understand that if one of
the group members becomes unavailable, the clients connected to that group member must be redirected,
or failed over, to a different server in the group, using a connector, load balancer, router, or
some form of middleware. Group Replication does not have an inbuilt method to do this."

### URL #12: MySQL 8.4 Undo Logs
**URL**: https://dev.mysql.com/doc/refman/8.4/en/innodb-undo-logs.html
**Fetch**: ✅ 成功
**状态码**: 200
**正文（核心片段）**：
"An undo log is a collection of undo log records associated with a single read-write transaction.
An undo log record contains information about how to undo the latest change by a transaction to a
clustered index record. If another transaction needs to see the original data as part of a consistent
read operation, the unmodified data is retrieved from undo log records. Undo logs exist within undo
log segments, which are contained within rollback segments. Rollback segments reside in undo
tablespaces and in the global temporary tablespace."
"Each undo tablespace and the global temporary tablespace individually support a maximum of 128
rollback segments. The innodb_rollback_segments variable defines the number of rollback segments.
...A transaction is assigned up to four undo logs, one for each of the following operation types:
INSERT operations on user-defined tables, UPDATE and DELETE operations on user-defined tables,
INSERT operations on user-defined temporary tables, UPDATE and DELETE operations on user-defined
temporary tables."
"If each transaction performs either an INSERT or an UPDATE or DELETE operation, the number of
concurrent read-write transactions that InnoDB is capable of supporting is: (innodb_page_size / 16)
* innodb_rollback_segments * number of undo tablespaces"

---

## 3. P6 Highlights

### Q1 Highlights: MVCC 并发控制机制差异 (≤500 token)

- "Internally, data consistency is maintained by using a multiversion model (Multiversion Concurrency Control, MVCC). This means that each SQL statement sees a snapshot of data (a database version) as it was some time ago, regardless of the current state of the underlying data." [Source: https://www.postgresql.org/docs/17/mvcc-intro.html]

- "locks acquired for querying (reading) data do not conflict with locks acquired for writing data, and so reading never blocks writing and writing never blocks reading. PostgreSQL maintains this guarantee even when providing the strictest level of transaction isolation through the use of an innovative Serializable Snapshot Isolation (SSI) level." [Source: https://www.postgresql.org/docs/17/mvcc-intro.html]

- "InnoDB is a multi-version storage engine. It keeps information about old versions of changed rows to support transactional features such as concurrency and rollback. This information is stored in undo tablespaces in a data structure called a rollback segment." [Source: https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html]

- "Internally, InnoDB adds three fields to each row stored in the database: A 6-byte DB_TRX_ID field indicates the transaction identifier for the last transaction that inserted or updated the row. A 7-byte DB_ROLL_PTR field called the roll pointer. The roll pointer points to an undo log record written to the rollback segment." [Source: https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html]

- "In PostgreSQL, an UPDATE or DELETE of a row does not immediately remove the old version of the row. This approach is necessary to gain the benefits of multiversion concurrency control (MVCC): the row version must not be deleted while it is still potentially visible to other transactions. But eventually, an outdated or deleted row version is no longer of interest to any transaction. The space it occupies must then be reclaimed for reuse by new rows, to avoid unbounded growth of disk space requirements. This is done by running VACUUM." [Source: https://www.postgresql.org/docs/17/routine-vacuuming.html]

- "An undo log record contains information about how to undo the latest change by a transaction to a clustered index record. If another transaction needs to see the original data as part of a consistent read operation, the unmodified data is retrieved from undo log records." [Source: https://dev.mysql.com/doc/refman/8.4/en/innodb-undo-logs.html]

- "In the InnoDB multi-versioning scheme, a row is not physically removed from the database immediately when you delete it with an SQL statement. InnoDB only physically removes the corresponding row and its index records when it discards the update undo log record written for the deletion. This removal operation is called a purge." [Source: https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html]

- "Read Committed is the default isolation level in PostgreSQL." / "If the transaction isolation level is REPEATABLE READ (the default level), all consistent reads within the same transaction read the snapshot established by the first such read in that transaction." [Source: https://www.postgresql.org/docs/17/transaction-iso.html] / [Source: https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html]

### Q2 Highlights: 高并发写入 Benchmark (≤200 token)

- **Benchmark 数据因 DuckDuckGo 搜索不可用未能获取到。** 此维度仅能基于架构分析进行推断（见合成答案）。
- 相关架构事实："InnoDB Records in a clustered index are updated in-place, and their hidden system columns point undo log entries from which earlier versions of records can be reconstructed." [Source: https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html]
- 相关架构事实："PostgreSQL's VACUUM command has to process each table on a regular basis...Using the autovacuum daemon alleviates this problem, since the daemon schedules vacuuming dynamically in response to update activity." [Source: https://www.postgresql.org/docs/17/routine-vacuuming.html]

### Q3 Highlights: 复制与高可用方案对比 (≤500 token)

- "Logical replication is a method of replicating data objects and their changes, based upon their replication identity (usually a primary key). We use the term logical in contrast to physical replication, which uses exact block addresses and byte-by-byte replication. PostgreSQL supports both mechanisms concurrently." [Source: https://www.postgresql.org/docs/17/logical-replication.html]

- "Logical replication uses a publish and subscribe model with one or more subscribers subscribing to one or more publications on a publisher node. Subscribers pull data from the publications they subscribe to and may subsequently re-publish data to allow cascading replication or more complex configurations." [Source: https://www.postgresql.org/docs/17/logical-replication.html]

- "The typical use-cases for logical replication are: Sending incremental changes in a single database or a subset of a database to subscribers as they occur. ...Replicating between different major versions of PostgreSQL. Replicating between PostgreSQL instances on different platforms (for example Linux to Windows)." [Source: https://www.postgresql.org/docs/17/logical-replication.html]

- "Replication enables data from one MySQL database server (known as a source) to be copied to one or more MySQL database servers (known as replicas). Replication is asynchronous by default." [Source: https://dev.mysql.com/doc/refman/8.4/en/replication.html]

- "MySQL 8.4 supports different methods of replication. The traditional method is based on replicating events from the source's binary log. The newer method based on global transaction identifiers (GTIDs) is transactional and therefore does not require working with log files or positions within these files." [Source: https://dev.mysql.com/doc/refman/8.4/en/replication.html]

- "MySQL 8.4 also supports semisynchronous replication: a commit performed on the source blocks before returning to the session that performed the transaction until at least one replica acknowledges that it has received and logged the events for the transaction." [Source: https://dev.mysql.com/doc/refman/8.4/en/replication.html]

- "MySQL Group Replication enables you to create elastic, highly-available, fault-tolerant replication topologies. Groups can operate in a single-primary mode with automatic primary election, where only one server accepts updates at a time. Alternatively, groups can be deployed in multi-primary mode, where all servers can accept updates, even if they are issued concurrently." [Source: https://dev.mysql.com/doc/refman/8.4/en/group-replication.html]

- "Group Replication guarantees that the database service is continuously available. However, it is important to understand that if one of the group members becomes unavailable, the clients connected to that group member must be redirected, or failed over, to a different server in the group, using a connector, load balancer, router, or some form of middleware. Group Replication does not have an inbuilt method to do this." [Source: https://dev.mysql.com/doc/refman/8.4/en/group-replication.html]

- "A standby server that cannot be connected to until it is promoted to a primary server is called a warm standby server, and one that can accept connections and serves read-only queries is called a hot standby server." / "Some solutions are synchronous, meaning that a data-modifying transaction is not considered committed until all servers have committed the transaction." [Source: https://www.postgresql.org/docs/17/high-availability.html]

- "There are two core types of replication format, Statement Based Replication (SBR), which replicates entire SQL statements, and Row Based Replication (RBR), which replicates only the changed rows." [Source: https://dev.mysql.com/doc/refman/8.4/en/replication.html]

### Q4 Highlights: JSON/文档处理能力对比 (≤500 token)

- "PostgreSQL offers two types for storing JSON data: json and jsonb. ...The json data type stores an exact copy of the input text, which processing functions must reparse on each execution; while jsonb data is stored in a decomposed binary format that makes it slightly slower to input due to added conversion overhead, but significantly faster to process, since no reparsing is needed. jsonb also supports indexing, which can be a significant advantage." [Source: https://www.postgresql.org/docs/17/datatype-json.html]

- "In general, most applications should prefer to store JSON data as jsonb, unless there are quite specialized needs, such as legacy assumptions about ordering of object keys." [Source: https://www.postgresql.org/docs/17/datatype-json.html]

- "MySQL supports a native JSON (JavaScript Object Notation) data type defined by RFC 8259 that enables efficient access to data in JSON documents. ...JSON documents stored in JSON columns are converted to an internal format that permits quick read access to document elements. When the server later must read a JSON value stored in this binary format, the value need not be parsed from a text representation. The binary format is structured to enable the server to look up subobjects or nested values directly by key or array index without reading all values before or after them in the document." [Source: https://dev.mysql.com/doc/refman/8.4/en/json.html]

- "JSON columns, like columns of other binary types, are not indexed directly; instead, you can create an index on a generated column that extracts a scalar value from the JSON column. ...The InnoDB storage engine supports multi-valued indexes on JSON arrays." [Source: https://dev.mysql.com/doc/refman/8.4/en/json.html]

- "jsonb data is stored in a decomposed binary format that makes it slightly slower to input due to added conversion overhead, but significantly faster to process, since no reparsing is needed. jsonb also supports indexing, which can be a significant advantage." [Source: https://www.postgresql.org/docs/17/datatype-json.html]

- "jsonb does not preserve white space, does not preserve the order of object keys, and does not keep duplicate object keys." [Source: https://www.postgresql.org/docs/17/datatype-json.html]

---

## 4. 合成答案

### Q1: MVCC 并发控制机制差异

| 维度 | PostgreSQL 17 | MySQL 8.4 (InnoDB) |
|------|--------------|-------------------|
| **存储模型** | 堆表（heap table），旧版本行留在原页面，新版本插入新位置 | 索引组织表（clustered index），行更新 in-place，旧版本存储在 undo log |
| **旧版本管理** | 旧版本行保留在数据页面中，通过 VACUUM 回收 | 旧版本存储在 rollback segment 的 undo log 中，通过 purge 线程回收 |
| **事务可见性** | 通过每行上的 xmin/xmax 系统列 + 可见性映射（Visibility Map）判断 | 通过每行的 DB_TRX_ID 6 字节事务 ID + DB_ROLL_PTR 指向 undo log 重建旧版本 |
| **默认隔离级别** | Read Committed | REPEATABLE READ |
| **Serializable 实现** | Serializable Snapshot Isolation (SSI) — 创新方案，使用谓词锁检测序列化冲突 | 通过 Gap Lock + Next-Key Lock 实现（锁定范围，非 SSI） |
| **清理机制开销** | VACUUM 必须定期运行以回收空间、更新可见性映射、防止事务 ID 回卷；高写入负载可能导致 VACUUM 成为瓶颈 | undo log purge 由后台线程自动处理，开销更可预测；但 undo tablespace 也可能膨胀 |
| **并发上限** | 连接数受 `max_connections` 限制，但每个连接消耗较多资源；可通过 PgBouncer 等连接池缓解 | InnoDB 有明确的可支持并发读写事务数公式：`(page_size/16) * innodb_rollback_segments * undo_tablespaces` |

**关键权衡**：PG 的 MVCC 实现更简洁（没有单独的 undo log 结构），但代价是 VACUUM 负担 — 高写入负载下必须精细调优 autovacuum 参数。MySQL InnoDB 的 undo log 方案在写入路径上更平滑（无 vacuum 式冻结），但增加了存储开销和行内系统列（每行多 13 字节）。SSI vs Gap Lock：PG 的 SSI 在 Serializable 级别下更高效（无大量锁冲突），但 SSI 对所有写入操作有额外序列化检测开销。

### Q2: 高并发写入 Benchmark（基于架构分析，缺乏 benchmark 数据）

**注意**：因 DuckDuckGo 搜索 API 不可用，未能获取具体的 benchmark 数据（TPC-C、sysbench 等）。以下为基于架构的分析：

- **短连接高并发场景**：MySQL 的线程模型（每个连接一个线程）在 >200 连接时开销显著；PG 同样为每个连接 fork 一个进程（更重）。两者都需要连接池介入。
- **写入吞吐稳定性**：MySQL InnoDB 的 undo log + purge 机制在高写入下比 PG 的 VACUUM 更平稳（无突然的 I/O 尖峰），但 PG 17 的 autovacuum 调优已大幅改善。
- **死锁概率**：PG 的堆表 MVCC 在 UPDATE 时若目标行已被修改会等待后重试（Read Committed 下会重新评估 WHERE），死锁概率较低；MySQL InnoDB 使用 Gap Lock（处理幻读），在 REPEATABLE READ 下死锁概率更高。

### Q3: 复制与高可用方案对比

| 维度 | PostgreSQL 17 | MySQL 8.4 |
|------|--------------|-----------|
| **物理复制** | Streaming Replication（WAL-based，字节级），支持同步/异步、cascading replication、replication slots | InnoDB Cluster/Group Replication（类同步，基于 Paxos），或传统的异步 binlog-based replication |
| **逻辑复制** | 内置 Logical Replication（发布/订阅模型），支持跨版本、跨平台、表级筛选、列筛选、DDL 变更复制有限 | 基于 binlog 的逻辑复制（SBR/RBR/MBR），支持 GTID，多源复制 |
| **组复制** | 内置物理流复制不支持多主写入；可通过第三方工具（Patroni + etcd）实现多主 | Group Replication 原生支持多主写入和单主自动选举模式（基于 Paxos） |
| **高可用故障转移** | Streaming Replication 支持 hot standby（只读查询），failover 需手动或通过 Patroni/stolon 实现；PG 17 新增 Logical Replication Failover 支持 | Group Replication 提供自动故障检测 + 成员变更；但客户端重定向需要 MySQL Router 或其他中间件 |
| **跨版本复制** | Logical Replication 支持不同大版本间复制 | MySQL binlog 复制支持小版本间兼容，大版本升级通常需要特定顺序 |

**关键权衡**：PG 的 Streaming Replication 在物理复制层面的成熟度和可靠性高于 MySQL 的传统异步复制（数据零丢失选项更成熟），但 PG 的逻辑复制起步较晚（PG10 引入），缺少 MySQL binlog 生态的丰富工具链（如 Canal/Debezium）的多年积累。MySQL Group Replication 的多主写入能力是 PG 官方版不具备的（需第三方方案），但 Group Replication 对网络延迟敏感且配置复杂度高。

### Q4: JSON/文档处理能力对比

| 维度 | PostgreSQL 17 (JSONB) | MySQL 8.4 (JSON) |
|------|----------------------|-----------------|
| **存储格式** | 二进制分解格式（decomposed binary），输入略慢但处理快（无需重解析） | 内部二进制格式（类似 BSON），允许通过 key 或 array index 直接访问子对象，无需扫描整个文档 |
| **索引支持** | GIN 索引（jsonb 路径操作符 `@>`, `?`, `?|`, `?&`），jsonpath 索引（表达式索引） | 不支持直接索引 JSON 列；通过 generated column + 普通索引间接索引；支持 multi-valued indexes（多值索引） |
| **路径查询** | `jsonpath` 类型 + `jsonb_path_query()` 等原生路径查询函数（SQL/JSON 标准路径语言） | `JSON_EXTRACT()` / `column->'$.path'` / `JSON_QUERY()` / `JSON_VALUE()` |
| **更新效率** | JSONB 更新需要重写整行（堆表特性）；部分更新无特殊优化 | 支持 partial update（JSON_SET/JSON_REPLACE/JSON_REMOVE 在特定条件下可原地更新），减少写放大 |
| **重复键/键序** | jsonb 不保留空格、键序、重复键（仅保留最后一个值） | MySQL JSON 解析后保持最后值，但原始文本在存储前已转为内部格式；不保证键序 |
| **文档大小限制** | 受页面大小限制(通常 8KB)，但 TOAST 机制可存储最大 1GB JSONB | 受 `max_allowed_packet` 限制，最大约 1GB |

**关键权衡**：PG JSONB 的最大优势是 GIN 索引 — 可以直接对 JSONB 文档的任意路径进行高效搜索（存在性查询、包含查询），这是 MySQL JSON 通过 generated column 间接索引无法匹敌的。MySQL JSON 的 partial update 优化（在 JSON_SET/JSON_REPLACE 时仅原地更新而非重写整个文档）在高频小范围 JSON 更新场景下可能是更优选择。PG 的 jsonpath 查询语言比 MySQL 的 `->`/`->>` 运算符更强大且符合 SQL/JSON 标准。

### 综合选型建议

- **MVCC 稳定性优先**（长期高写入负载、避免 VACUUM 调优）：**MySQL 8.4** — undo log + purge 的自动管理更省心
- **需要最高级别序列化隔离 + 读写互不阻塞**：**PostgreSQL 17** — SSI 实现更优雅，无 Next-Key Lock 开销
- **高可用要求严格（RPO=0 物理复制）**：**PostgreSQL 17** — 同步流复制更成熟
- **多主写入/弹性扩容**：**MySQL 8.4** — Group Replication 多主模式原生支持
- **JSON 文档数据库场景**：**PostgreSQL 17** — JSONB + GIN 索引 + jsonpath 的综合能力领先
- **变更有线协议监控/CDC 生态**：**MySQL 8.4** — binlog 生态更成熟（Debezium/Canal 等）

**最终建议**：如果团队已有 PG 运维经验且能接受 autovacuum 调优，PG 17 在 JSON 处理、物理复制的数据保护、SSI 方面有明显优势；如果希望更少的 DBA 介入（Auto vacuum/purge 自动管理）且有多主写入需求，MySQL 8.4 更合适。