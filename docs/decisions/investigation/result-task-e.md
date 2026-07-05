# Task E: Cline Rule 失效场景分析

## 源码定位

- `sdk/packages/core/src/runtime/safety/rules.ts` — `isRuleEnabled` + `formatRulesForSystemPrompt`
- `sdk/packages/core/src/extensions/config/user-instruction-config-loader.ts` — `RuleConfig` 接口 + `parseRuleConfigFromMarkdown`

---

## 1. Rule 在什么条件下会被跳过

### 1.1 `disabled` 字段（唯一硬性跳过条件）

`isRuleEnabled` 的实现极其简单：

```ts
export function isRuleEnabled(rule: RuleConfig): boolean {
    return rule.disabled !== true;
}
```

**只有 `disabled === true` 时 rule 才被跳过。** 没有其他条件判断（无 frontmatter 条件、无环境变量、无 when/condition 逻辑）。

### 1.2 `disabled` 的两种设置方式（frontmatter）

在 `parseRuleConfigFromMarkdown` 中：

```ts
disabled:
    parseBooleanField(data.disabled, "disabled") ??
    (parseBooleanField(data.enabled, "enabled") === false ? true : undefined),
```

即 rule 的 Markdown 文件 frontmatter 中：
- `disabled: true` → 跳过
- `enabled: false` → 也等效跳过（`disabled` 为 `undefined` 时 fallback 到 `enabled === false`）
- 两者都未设置 → `disabled` 为 `undefined` → `isRuleEnabled` 返回 `true` → **启用**

### 1.3 过滤链路

```
文件加载 → parseRuleConfigFromMarkdown (解析 disabled/enabled)
         → watcher snapshot
         → listEnabledRulesFromWatcher: .filter(isRuleEnabled)  // 只过滤 disabled !== true
         → formatRulesForSystemPrompt  // 拼接到 system prompt
```

以及 Hub 贡献链路：
```ts
.filter((rule) => rule.disabled !== true)  // hub-client-contributions.ts:404
```

### 1.4 解析失败 → rule 不存在

`parseRuleConfigFromMarkdown` 在以下情况直接抛异常（不会产生 `RuleConfig` 对象）：
- YAML frontmatter 解析失败
- instructions body 为空
- 缺少 rule name

**这类 rule 不是"被跳过"，而是根本不会进入列表。** 表现为 rule 静默消失，无用户提示。

---

## 2. System Prompt 是否有长度截断逻辑

### 结论：**无 system prompt 截断**

- `rules.ts` 中 `formatRulesForSystemPrompt` 和 `mergeRulesForSystemPrompt` 是纯字符串拼接，**无长度限制、无 token 截断**。
- 搜索 `system.*truncat`、`system.*slice`、`maxTokens.*system`、`systemPrompt.*limit` 均无结果。
- `basic-compaction.ts` 中的截断逻辑（`truncateMessageToTokens`、`truncateMessageText`）只作用于 **conversation messages**，不触及 system prompt。

### 潜在风险

如果 rule 数量极多或单条 rule 内容极长，system prompt 会无限膨胀。最终由 **LLM API 的 context window 限制**来截断（通常是在 API 层报错或隐式截断），而非 Cline 主动管理。

---

## 3. 多个 Rule 冲突时的优先级

### 结论：**无冲突解决机制，按字母序排列**

```ts
// listEnabledRulesFromWatcher
.sort((a, b) => a.name.localeCompare(b.name))
```

- 所有启用的 rule 按 `name` 字母序（`localeCompare`）排列后拼接。
- **先注册/后注册无影响**，完全取决于 rule name 的字母顺序。
- **无覆盖机制**：如果两条 rule 给出矛盾指令，两者都会出现在 system prompt 中，由 LLM 自行判断。
- **无优先级字段**：`RuleConfig` 接口中没有 `priority`、`weight`、`order` 等字段。

### 冲突时的实际行为

所有 rule 以 `## {name}\n{instructions}` 格式拼接为一个连续文本块，注入 system prompt。LLM 会看到所有规则，对于矛盾指令，通常倾向于**后出现的指令**（recency bias），但这完全取决于模型行为，非 Cline 控制。

---

## 总结：Rule 失效的 5 种场景

| 场景 | 触发条件 | 表现 | 可排查性 |
|------|----------|------|----------|
| ① 显式禁用 | frontmatter `disabled: true` 或 `enabled: false` | rule 不出现在 system prompt | ✅ 明确 |
| ② 解析失败 | YAML 格式错误、空 body、缺 name | rule 静默消失 | ⚠️ 无用户提示 |
| ③ 目录未加载 | rule 文件不在 watcher 监控的目录中 | rule 不存在 | ⚠️ 需检查目录配置 |
| ④ 同名覆盖 | 多个目录存在同名 rule（`normalizeName(name)` 相同），`records.set(id, ...)` 后者覆盖前者 | 静默替换，无警告 | ⚠️ 需检查多目录加载顺序 |
| ⑤ System prompt 过长 | rule 总量超出 context window | API 层截断或报错，rule 可能被截断 | ❌ Cline 无主动管理 |

**关键发现**：Cline 的 rule 系统没有 frontmatter 条件逻辑（无 `when:`、`condition:`、环境变量判断等），是纯静态的 enabled/disabled 开关。
