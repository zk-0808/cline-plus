# Investigation Note: CLI 端 Plugin 全链路验证

日期：2026-06-29

> **关联**：[handoff.md](../handoff.md)、[design.md](../plugin/design.md)、[investigation-note-vscode-bootstrap-missing.md](investigation-note-vscode-bootstrap-missing.md)

---

## 核心问题

**CLI 3.0.33 中 handoff-plugin v0.5.0 的三类能力（messageBuilders / rules / hooks）是否正常工作？**

---

## Observation

1. **setup() 执行确认**：每次 CLI 启动，`plugin-loaded.marker` 写入新时间戳，延迟 <100ms。

2. **build() 调用确认**：compact-observer 的 `build()` 在每次 turn 被调用（4 消息会话 = 4 次调用）。

3. **compact 检测失败（初始）**：shouldCompact() 返回 `needsCompact=false`，即使对话内容约 16K 字符（应超 2,400 token 阈值）。

4. **Token 估算异常**：
   - `@cline/shared` 的 `estimateTokensFromChars(text.length)` 对 16K 字符返回 **297 tokens**
   - 同一内容的 `Math.ceil(text.length / 4)` 返回 **~4,000 tokens**
   - 差异：~13 倍

5. **serializeMessage 内容丢失**：
   - Cline 实际消息的 block type 不匹配代码中的 `text / thinking / tool_use / tool_result / file`
   - 所有 block 落入 `default` 分支，只输出 `[role type block]` 标签（不含内容）
   - 修复后 `default` 改为 `JSON.stringify(block).slice(0, 2000)`，token 估算恢复正常

---

## Evidence

| # | 证据 | 来源类型 | 置信度 | 结论 |
|---|------|---------|--------|------|
| E1 | plugin-loaded.marker 时间戳 = CLI 启动时间 | 实测 | 高 | setup() 正常执行 |
| E2 | build-debug.marker: 4 次调用，3 消息，~4K tokens | 实测（调试 marker）| 高 | build() 每 turn 被调用 |
| E3 | shouldCompact 原始：totalTokens=297（@cline/shared）| 实测 | 高 | estimateTokensFromChars 返回值异常低 |
| E4 | shouldCompact 修复后：totalTokens=4007，needsCompact=true | 实测 | 高 | compact 检测逻辑正确，问题在 token 估算 |
| E5 | compact-triggered.marker: triggered at 15:51:41Z, tools: read_files | 实测 | 高 | compact-observer 全链路通过 |

---

## Verified

**V1（高置信度）**：CLI 3.0.33 + handoff-plugin v0.5.0 的 compact-observer（messageBuilder）正常工作。

- setup() → build() 每 turn 调用 → shouldCompact() 判定 → compact 事件检测
- 前提：修复 `estimateTokens` 和 `serializeMessage` 两个 bug

**V2（高置信度）**：`@cline/shared` 的 `estimateTokensFromChars` 返回值异常低，不可用于 token 估算。

- 证据：16K 字符 → 297 tokens（预期 ~4,000）
- 替代方案：`Math.ceil(text.length / 4)` 标准英文近似

**V3（高置信度）**：`serializeMessage` 的 block type 枚举不完整，Cline 实际消息使用非标准 type。

- 证据：修复前 totalTokens=222，修复后 totalTokens=4007
- 修复：`default` 分支改为 `JSON.stringify(block).slice(0, 2000)`

---

## Bug 修复记录

### Bug 1: estimateTokensFromChars 异常

**文件**：`compaction.ts`
**根因**：`@cline/shared` 的 `estimateTokensFromChars` 对大文本返回异常低值
**修复**：改用 `Math.ceil(text.length / 4)` 标准近似
**影响**：compact 阈值判定永远不触发

### Bug 2: serializeMessage block type 不匹配

**文件**：`compaction.ts`
**根因**：Cline 实际消息的 block type 不在 `text / thinking / tool_use / tool_result / file` 枚举中
**修复**：`default` 分支从空标签改为 `JSON.stringify(block).slice(0, 2000)`
**影响**：token 估算丢失全部内容，shouldCompact 始终返回 false

---

## Remaining Unknown

1. **rules-injector 是否实际注入**：test-handoff.md 已就位，但无法从外部观察 sandbox 内部的 rule 评估结果。需从模型回答中判断。
2. **beforeModel hook 是否触发**：需要模型产生重复 tool call 场景才能验证。
3. **beforeTool / afterTool hooks 是否记录**：无外部可观察产出（仅 console.warn 对 >30s 慢调用）。

---

## Decision

**D1**：compact-observer 验证通过，可进入 snapshot 内容生成设计阶段。

**D2**：`@cline/shared` 的 token 估算不可靠，插件应使用自有估算方法。已在代码中标注并注释原 import。

**D3**：serializeMessage 的 block type 枚举需根据 Cline SDK 更新持续维护。default 分支的 JSON.stringify fallback 是必要的安全网。
