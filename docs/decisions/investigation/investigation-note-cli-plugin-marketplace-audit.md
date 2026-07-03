# Investigation Note: CLI Plugin 市场扩展包探查

日期：2026-07-03

> **生命周期**：事件绑定 — ADR-006 §4.1 问题回答后归档（与 native-condense 系列同步）。
>
> **框架**：按 [evidence-governance.md §10](../evidence-governance.md) Investigation Note 模板执行。
>
> **关联**：
> - [ADR-006 §0 元原则](../adr/ADR-006-native-mechanism-first-principle.md) — "是不是又在造原生已有的轮子"自检
> - [investigation-note-native-condense-synthesis.md](investigation-note-native-condense-synthesis.md) — A/B/C 综合报告（本探查为其后续元原则自检）
> - [dev-rules.md §1.6](../dev-rules.md) — 双来源验证（本探查满足：官方仓库 README + 一手源码）

---

## 核心问题

**cline CLI 的 plugin 市场上，是否已有 plugin 做了"condense 时抽 semantic object 写 handoff.md"？**

按 ADR-006 §0 元原则——薄适配层设计前必须先自检"是不是又在造原生已有的轮子"。若有现成 plugin，薄适配层可能不需要自己写。

---

## Observation

### O1. cline plugin 市场结构

| 仓库 | 性质 | 数量 | 权威性 |
|------|------|------|--------|
| [cline/plugins](https://github.com/cline/plugins) | 官方 curated plugin（`cline plugin install <slug>` 默认来源）| 15 个 plugin | 一手（官方仓库 README）|
| [cline/marketplace](https://github.com/cline/marketplace) | catalog.json 镜像（plugins + skills + mcps）| 202 entries（15 plugins + 38 skills + 149 mcps）| 一手（官方仓库 + GitHub Pages 发布的 [catalog.json](https://cline.github.io/marketplace/catalog.json)）|
| [cline/mcp-marketplace](https://github.com/cline/mcp-marketplace) | MCP 市场（独立）| — | 与本探查无关（MCP 不是 plugin）|

**证据来源**：WebFetch `https://github.com/cline` 组织页 + `cline/plugins` 仓库 README + `cline/marketplace` 仓库 README

### O2. `cline/plugins` 仓库 15 个 plugin 完整清单

来自 [cline/plugins README](https://github.com/cline/plugins)：

| Plugin | 功能 | 与薄适配层相关性 |
|--------|------|----------------|
| **agents-squad** | Background subagents + **shared handoffs** | ⚠️ 子代理间 handoff，非 session 间 |
| background-terminal | 长时 shell 作业 | ❌ 不相关 |
| branch-protector | hook 阻塞受保护分支推送 | ❌ 不相关（但是 hook 实现参考）|
| bundled-skills-demo | 打包 skill 发现示例 | ❌ 不相关 |
| **custom-compaction** | **Provider message compaction through plugin message builder** | ✅ **最相关**——触发机制参考 |
| clickhouse-data-analyst | ClickHouse 数据分析 skill | ❌ 不相关 |
| env-blocker | hook 阻塞 .env 读取 | ❌ 不相关 |
| gitignore-read-files-guard | hook 阻塞 gitignore 路径 | ❌ 不相关 |
| intercom-support-triage-slack | Intercom 工单分流 | ❌ 不相关 |
| linear | Linear SDK skill | ❌ 不相关 |
| mac-notify | macOS 通知 | ❌ 不相关 |
| nanobanana | 图片生成 | ❌ 不相关 |
| speak | ElevenLabs TTS | ❌ 不相关 |
| typescript-lsp | TypeScript goto_definition | ❌ 不相关（但是 plugin 实现参考）|
| weather-metrics | 天气工具 + runtime metrics hooks | ❌ 不相关 |
| web-search | Exa 搜索 | ❌ 不相关 |

**结论**：15 个 plugin 中，仅 `custom-compaction` 与薄适配层直接相关，`agents-squad` 含 handoff 概念但场景不同。

### O3. `custom-compaction` plugin 完整源码分析

**源码来源**：`https://raw.githubusercontent.com/cline/plugins/main/plugins/custom-compaction/index.ts`（WebFetch 完整读取）

#### O3.1 实现架构

- **插入点**：`registerMessageBuilder`（**不是** beforeModel hook）
- **不调 LLM**：纯本地模板拼接
- **capability**：`["messageBuilders"]`（仅 messageBuilder，无 hooks/tools/rules）

#### O3.2 常量（与 context-snapshot 对比）

| 常量 | custom-compaction | context-snapshot | 关系 |
|------|-------------------|------------------|------|
| `MAX_INPUT_TOKENS` | `120_000` | `1000`（测试用）| 量级不同但概念同 |
| `COMPACT_AT_RATIO` | `0.75` | `0.75` | **完全相同** |
| `PRESERVE_RECENT_TOKENS` | `24_000` | — | context-snapshot 无此概念 |
| `estimateTokens` | from `@cline/shared` | 自研 `estimateTokens` | **custom-compaction 用官方共享包** |

**关键发现**：context-snapshot 的 `COMPACT_AT_RATIO=0.75` 与 custom-compaction 完全相同——说明 context-snapshot 的常量是从 cline 生态抄来的，不是自创的。这印证 ADR-006 §2 审计点"context-snapshot 重造原生轮子"。

#### O3.3 产物结构（`buildCompactionSummary` 函数）

产物是一条 user role 消息，content 为纯文本：

```
Context summary:
## Compacted Range
- Messages compacted: <N>
- Estimated tokens before compaction: <N>
- Roles: user=N, assistant=N, ...
## Tool Activity
- <tool_name_1>
- <tool_name_2>
## Files Mentioned
- <path_1>
- <path_2>
## Recent Highlights From Compacted History
- [user]: <preview 500 chars>
- [assistant tool call]: <preview 500 chars>
- ...（最近 6 条）
Continue from this summary plus the preserved recent messages below.
```

#### O3.4 schema V2 六字段覆盖矩阵

| schema 字段 | custom-compaction 产物 | 对照原生 agentic 摘要 |
|---|---|---|
| `id` | ❌ 无 | ❌ 无 |
| `kind` | ❌ 无（仅 "Context summary" 文本前缀）| ⚠️ `metadata.kind="compaction_summary"` |
| `exit_when` | ❌ 无 | ❌ 无 |
| `confidence` | ❌ 无 | ❌ 无 |
| `depends_on` | ❌ 无 | ❌ 无 |
| `blocker_ref` | ❌ 无 | ❌ 无 |

#### O3.5 五类对象覆盖

| 对象 | custom-compaction | 原生 agentic |
|------|-------------------|--------------|
| Decision | ❌ 无（Recent Highlights 是纯文本 preview）| ❌ 无 |
| Change | ⚠️ Tool Activity + Files Mentioned（结构化列表）| ⚠️ `metadata.details.modifiedFiles` |
| Verification | ❌ 无 | ❌ 无 |
| Blocker | ❌ 无 | ❌ 无 |
| Handoff | ❌ 无 | ❌ 无 |

**覆盖率评估**：custom-compaction 比原生 agentic 摘要略好（多了 Tool Activity 结构化列表），但仍远低于 schema V2 六字段要求。

### O4. `agents-squad` plugin 性质判定

**源码来源**：[cline/plugins/plugins/agents-squad](https://github.com/cline/plugins/tree/main/plugins/agents-squad) README

- "handoff store so subagents can pass notes back to the parent session"
- 工具：`start_subagent` / `get_subagent` / handoff 工具
- **性质**：子代理间（parent↔subagent）handoff，不是 session 间（跨会话）handoff
- **与薄适配层关系**：场景不同，不适用——薄适配层要做的是"session 结束/compaction 时抽 semantic object 写 handoff.md 供下一 session 继承"

### O5. 本地已安装 plugin 检查

**检查方式**：PowerShell `Get-ChildItem $env:USERPROFILE\.cline\plugins -Recurse -Depth 3`（按 [dev-rules.md §1.4](../dev-rules.md) Windows 文件核查规范）

**结果**：
- `~/.cline/plugins/installed/local/context-snapshot` — 我们自己的 plugin（已安装）
- `~/.cline/plugins/_installed/{npm,git,remote,local}/` — 均为空，无第三方 plugin

**结论**：本地除 context-snapshot 外无其他 plugin 安装。

---

## Evidence → Conclusion

### C1（Verified）：无现成轮子做"condense 时抽 semantic object 写 handoff.md"

**证据**（3 独立来源，满足 [dev-rules.md §1.6](../dev-rules.md) 双来源门槛）：

| # | 证据 | 类型 | 来源 |
|---|------|------|------|
| 1 | `cline/plugins` 仓库 README 列出 15 个 plugin，无结构化 handoff/semantic object plugin | 官方仓库文档 | WebFetch `cline/plugins` README |
| 2 | `custom-compaction` 完整源码分析——纯模板拼接，不抽 semantic object，不写 handoff.md | 一手源码 | WebFetch raw index.ts |
| 3 | `cline/marketplace` catalog.json 202 entries，`memory` tag 仅 1 entry 且非 handoff 相关 | 官方市场镜像 | WebFetch catalog.json + Grep 过滤 |

**Verified 依据**：
- 来源 1（官方仓库 README）+ 来源 2（一手源码）双源一致
- 来源 3（catalog.json 镜像）作为第三源交叉验证
- 无单源声明（所有结论均有 ≥2 来源支撑）

### C2（Verified）：`custom-compaction` 提供薄适配层触发机制参考

**关键设计输入**：
1. **插入点用 `messageBuilder`**（不是 A/B/C 综合报告推荐的 `beforeModel` hook）
   - 理由 1：`custom-compaction` 官方示例用 messageBuilder
   - 理由 2：规避 codec bug（messageBuilder 是 plugin 层，不走 codec `Nd` 函数，见 [investigation-note-cli-codec-content-map-bug.md O3/O8](investigation-note-cli-codec-content-map-bug.md)）
   - 理由 3：C 子代理已标注 messageBuilder 为 "🔵 备选"，现在升级为首选
2. **不重造 compaction 触发逻辑**——参考/复用 `custom-compaction` 的 `estimateTokens`（from `@cline/shared`）/ `findRecentStartIndex` / `serializeMessage` 实现
3. **专注做 `custom-compaction` 没做的**：从 messages 抽 Decision/Change/Verification/Blocker/Handoff 五类对象 → 写 handoff.md（schema V2 六字段）

### C3（Verified）：context-snapshot 常量源自 cline 生态

`context-snapshot/src/compaction.ts` 的 `COMPACT_AT_RATIO=0.75` 与 `custom-compaction` 完全相同——印证 ADR-006 §2 审计点"context-snapshot 重造原生轮子"。`custom-compaction` 用 `@cline/shared` 的 `estimateTokens`，context-snapshot 自研同名函数。

---

## 决策

### D1：薄适配层插入点修正

**原方案**（A/B/C 综合报告 §5.3）：`beforeModel` runtime hook
**修正方案**：`messageBuilder`（registerMessageBuilder）

**修正理由**：
1. `custom-compaction` 官方示例用 messageBuilder（权威参考）
2. 规避 codec bug（messageBuilder 不走 codec `Nd` 函数）
3. `beforeModel` 在 compaction 后触发但返回修改的 messages 会触发 codec bug（[O8](investigation-note-cli-codec-content-map-bug.md)）
4. messageBuilder 在 model request 前触发，可重写 messages，且是 plugin 层原生能力

**影响**：`thin-adapter-layer` 未完成项的设计前提变更，需在设计阶段以 messageBuilder 为插入点。

### D2：薄适配层实现策略

**不重造**（参考 `custom-compaction`）：
- `estimateTokens` — 用 `@cline/shared` 官方共享包
- `findRecentStartIndex` — 保留近期消息的逻辑
- `serializeMessage` — 消息序列化（但需扩展为支持 semantic object 抽取）

**专注做**（`custom-compaction` 没做的）：
- 从 messages 抽 Decision/Change/Verification/Blocker/Handoff 五类对象
- 写 handoff.md（schema V2 §1.5 六字段）
- 复用 context-snapshot 现有的 extractors（todo-extractor / decision-extractor / change-extractor / source-extractor）

### D3：不安装 `custom-compaction` 实测

**理由**：
1. 源码已完整读取，产物形态明确（纯模板拼接，不调 LLM）
2. 实测需切 Anthropic provider 才能看到 agentic 模式对比，当前环境受限
3. A/B/C 综合报告已 Verified，市场探查是元原则自检补充，非必须实测
4. 按 [dev-rules.md §1.3](../dev-rules.md) 阴性结论门控——源码分析已满足双来源，无需实测补证

---

## 证据来源索引

| # | 来源 | URL / 路径 | 关键信息 |
|---|------|-----------|---------|
| 1 | cline 组织页 | https://github.com/cline | 发现 `cline/plugins` + `cline/marketplace` 仓库 |
| 2 | cline/plugins README | https://github.com/cline/plugins | 15 个 plugin 完整清单 |
| 3 | custom-compaction 源码 | https://raw.githubusercontent.com/cline/plugins/main/plugins/custom-compaction/index.ts | messageBuilder 实现 + 常量 + 产物结构 |
| 4 | agents-squad README | https://github.com/cline/plugins/tree/main/plugins/agents-squad | handoff store 性质（子代理间）|
| 5 | cline/marketplace README | https://github.com/cline/marketplace | catalog.json 机制 |
| 6 | catalog.json | https://cline.github.io/marketplace/catalog.json | 202 entries 统计 + memory tag 仅 1 entry |
| 7 | 本地 plugin 检查 | `~/.cline/plugins/` | 仅 context-snapshot 已安装 |

## 证据时效性（按 [dev-rules.md §1.13](../dev-rules.md)）

- `evidence_as_of`: 2026-07-03
- `expires_if_unchanged`: 2026-08-03（30 天后复查——cline/plugins 仓库可能新增 handoff 相关 plugin）
- 引用前需复查：`cline/plugins` 仓库是否新增结构化 handoff plugin
