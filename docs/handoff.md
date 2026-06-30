# Handoff — v0.6.0 重构完成：ADR-005 命名落地 + P0 Snapshot Writer + P1 修复

## 本会话决策

| 决策 | 状态 |
|------|------|
| 3-pass 子代理全量审查（架构 / 逻辑 / 设计一致性）| ✅ 发现 16 问题 |
| ADR-005 命名全面落地：handoff → snapshot | ✅ 源码零残留 |
| P0 修复：snapshot-writer.ts 实现（5 节模板 + 磁盘写入）| ✅ |
| P1 修复：统一路径 / Loop Guard 兜底 / beforeModel meta marker / afterTool LIFO | ✅ |
| 死代码清理 ~90 行 | ✅ |
| TypeScript 编译零错误 | ✅ |
| VS Code 扩展 4.0.x 不支持插件（回滚到 3.89.2 pre-SDK）| ✅ 已确认 |
| CLI 3.0.30+ 是当前唯一可用插件运行环境 | ✅ 已确认 |
| GitHub issue #11944 待跟进 | ⬜ |

## 本会话净变化

### 1. 3-Pass 代码审查

| Pass | 审查维度 | 核心发现 |
|------|---------|---------|
| Pass 1 | 架构 | 死代码 ~90 行、路径定义重复、PLUGIN_NAME 不一致 |
| Pass 2 | 逻辑 | afterTool 并发匹配 FIFO 错误、beforeModel 误判风险、空 catch |
| Pass 3 | 设计一致性 | ADR-005 命名对齐度 20%、snapshot 写入是死代码、Loop Guard 无兜底 |

### 2. 全量重构（v0.5.0 → v0.6.0）

**重命名**（全部 5 源文件）：
- `PLUGIN_NAME`: `"auto-handoff"` → `"context-snapshot"`
- 输出目录: `~/.cline/data/handoff/` → `~/.cline/data/snapshot/`
- 12+ 处函数/变量名: `*Handoff*` → `*Snapshot*`
- Rule 名: `handoff-context` → `snapshot-context`
- package name: `handoff-plugin` → `context-snapshot`

**新模块**：
- `constants.ts`（10 行）— 统一定义 `PLUGIN_NAME` + `getSnapshotDir()`
- `snapshot-writer.ts`（213 行）— P0 核心功能：5 节模板生成 + 磁盘写入
  - 模板：会话标题 / 决策表 / 净变化 / 未完成项表 / 权威源
  - compact-observer 在 `needsCompact=true` 时调用 `writeSnapshot()`

**P1 修复**：
- Loop Guard：`MAX_LOOP_WARNINGS=3`，超过后停止注入，交由 Cline max iterations
- beforeModel：`__plugin_loop_warning__` meta marker 替代字符串匹配
- afterTool：LIFO 搜索 + pending ID 随机后缀，修复并发匹配
- 错误处理：所有 catch 块添加 `console.error`，消除空 catch

**清理**：
- 移除 `generateHandoffContent()`、`writeHandoff()`、`getHistory()`、`getSlowCalls()`
- 移除 `SnapshotOptions`、tool-recorder 死导入、`DURATION_WARN_MS`
- 净变化：-52 行（91 增 / 143 删）

**基础设施**：
- 安装 `@types/node` + `typescript` 作为 devDependencies
- 创建 `@cline/core` + `@cline/shared` 类型声明 stub
- tsconfig.json: `types: ["node"]` + `paths` 映射

### 3. 不可抗力声明（上轮完成，本轮保留）

已写入 3 个活跃决策文档：
- `docs/plugin/design.md` — 证据链表格（v4.0.0→v4.0.1→v4.0.2→issue #11944→CLI 3.0.33）
- `docs/plugin/mechanism-landing-assessment.md` — 运行时约束声明
- `docs/dev-rules.md` — §1.15 执行环境可用性门控

### 4. CLI 验证结果（本轮更新）

| 验证项 | 结果 |
|--------|------|
| setup() 执行 | ✅ marker 文件写入（本轮重测通过）|
| messageBuilder.build() 调用 | ✅ 每 turn 执行（plugin-loaded.log 累积记录可见）|
| compact 检测 | ✅ shouldCompact 返回 needsCompact=true |
| token 估算 bug 修复 | ✅ Math.ceil(text.length/4) + default case JSON.stringify |
| rules 注入实测 | ✅ **通过** — 注入含 XYZ789 标记的 snapshot，Cline 新 session 正确答出决策表 |
| snapshot 文件写入实测 | ✅ **通过**（workaround 验证）— 临时降阈值到 1000 tokens 触发 compact，产出 12 个 .md 文件，5 节模板生成正确，文件名格式 `{hash}-{ts}-{uuid}.md` 正确。验证后已改回 120K tokens 原阈值。**注意**：真实 90K tokens 长对话触发路径仍受 §1.15 codec bug 阻塞，本次通过 workaround 验证功能可用性，不等同环境完整可用 |
| beforeModel (Loop Guard) 实测 | ⚠️ 未触发 — detectRepetition 阈值未达（需 15 次相同工具序列），非功能失败，待重新构造场景 |

### 5. 本轮新发现的问题（不影响核心验证）

| 问题 | 现象 | 影响 | 优先级 |
|------|------|------|--------|
| 双重 setup | 每次会话 setup() 被调两次（`workspace=(unknown)` + `workspace=E:\cline++`），snapshot 文件成对产生 | 重复写入 + 浪费 token，但功能正常 | 🟡 中（待确认是否 Cline hub 模式正常架构）|
| plugin console.log 不可见 | v0.6.0 的 `console.log` 输出未出现在 `plugin-loaded.log`，Cline 重定向到不可见位置 | 调试困难，后续需改用文件写入 | 🟢 低（不影响功能）|

## 产出文件

| 文件 | 变更 |
|------|------|
| `handoff-plugin/src/constants.ts` | 🆕 共享常量 |
| `handoff-plugin/src/snapshot-writer.ts` | 🆕 P0 snapshot 生成 + 写入 |
| `handoff-plugin/src/index.ts` | 重写：接入 snapshot writer + Loop Guard 兜底 + meta marker |
| `handoff-plugin/src/rules-injector.ts` | 重写：全量重命名 + 统一路径 |
| `handoff-plugin/src/tool-recorder.ts` | 清理：移除死代码 + LIFO 匹配 |
| `handoff-plugin/src/types.ts` | 清理：移除 SnapshotOptions |
| `handoff-plugin/package.json` | 重命名 + devDeps |
| `handoff-plugin/tsconfig.json` | types + paths 配置 |
| `docs/handoff.md` | 本文件 |

## Commits

### 本会话新增

| Hash | Repo | Message |
|------|------|---------|
| `565968a` | handoff-plugin | refactor: ADR-005 full rename + P0 snapshot writer + P1 bug fixes |
| `16b6660` | cline++ (parent) | chore: update handoff-plugin to context-snapshot v0.6.0 |

### 历史（上轮）

| Hash | Repo | Message |
|------|------|---------|
| `6db3a68` | handoff-plugin | fix: token estimation bugs in compact-observer |
| `8e10507` | cline++ | verify: CLI plugin chain verified + token estimation bugs fixed |
| `623d700` | cline++ | docs: add force majeure declaration — VS Code ext 4.0.x plugin unavailable |

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **提交 cline/cline issue** | codec bug issue 草稿已就绪（[draft-issue-cli-codec-content-map-bug.md](decisions/draft-issue-cli-codec-content-map-bug.md)），待用户确认后提交 | 🟡 中 |
| **CLI 实测 Loop Guard 兜底** | 重新构造场景：需 15 次完全相同工具序列，避免 MCP / 避免长输出 | 🟡 中 |
| **调查双重 setup** | 每次 setup() 被调两次（workspace=(unknown) + workspace=E:\cline++），snapshot 成对产生。待确认是否 Cline hub 模式正常架构 | 🟡 中 |
| **GitHub issue #11944 跟进** | 等作者回复 SDK 迁移时间线（影响 §1.15 第一条不可抗力恢复）| 🟡 中 |
| **README.md 同步** | ~15 处 handoff 引用待更新 | 🟢 低 |
| **design.md §3.3.2 标注废弃** | index.jsonl 已被 ADR-005 废弃，文档未标注 | 🟢 低 |
| **Snapshot 模板精度迭代** | 当前决策/未完成项提取基于简单正则，精度有限 | 🟢 低 |
| **补证 H2/H3** | image 分支 undefined 丢弃 + 下游连锁风险（子代理 B 单源 Hypothetical，待交叉验证）| 🟢 低 |

## 本轮新增产出

| 文件 | 内容 |
|------|------|
| [docs/decisions/investigation-note-cli-codec-content-map-bug.md](decisions/investigation-note-cli-codec-content-map-bug.md) | 🆕 codec bug 完整证据链（O1-O7 + H1-H3 + PR #5246 幻觉复盘 + Conflict Registry）|
| [docs/decisions/draft-issue-cli-codec-content-map-bug.md](decisions/draft-issue-cli-codec-content-map-bug.md) | 🆕 cline/cline issue 草稿（Facts/Reproduction/Suggested Fix/Test Cases/Impact）|
| [docs/dev-rules.md §1.15](dev-rules.md) | 不可抗力表新增 codec bug 行 + 影响分层（🔴/🟡/🟢）|

## 权威源

[dev-rules.md](dev-rules.md) · [design.md](plugin/design.md) · [ADR-005](decisions/ADR-005-split-compact-from-handoff.md) · [mechanism-landing-assessment.md](plugin/mechanism-landing-assessment.md) · [investigation-note-cli-plugin-verification.md](decisions/investigation-note-cli-plugin-verification.md) · [investigation-note-cli-codec-content-map-bug.md](decisions/investigation-note-cli-codec-content-map-bug.md)

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意 §1.15 不可抗力门控）与 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：context-snapshot plugin v0.6.0 全部核心功能实测通过——setup marker ✅ + rules 注入 ✅ + snapshot 写入 ✅（workaround 验证）。Loop Guard 未触发（场景构造问题，非功能 bug）。codec bug 已定位到 `agent-message-codec.ts` 的 `agentMessageToMessageWithMetadata` / `agentMessagesToMessages` 无 `Array.isArray` 守卫，issue 草稿已就绪待提交。新发现双重 setup 问题（snapshot 成对产生），待确认是否 Cline hub 模式正常架构。

**下次首要动作**：
1. **提交 codec bug issue**：用户确认 [draft-issue-cli-codec-content-map-bug.md](decisions/draft-issue-cli-codec-content-map-bug.md) 后提交到 cline/cline
2. **重新构造 Loop Guard 场景**：让 Cline 连续 15 次完全相同工具调用（避免 MCP / 避免长输出，规避 codec bug）
3. **调查双重 setup**：检查是否 Cline hub 模式正常架构（daemon + 主实例），若是则加守卫跳过 `workspace=(unknown)` 实例的 messageBuilder 注册
4. **跟进 GitHub issue #11944**：等作者回复 SDK 迁移时间线（影响 §1.15 第一条不可抗力恢复）
