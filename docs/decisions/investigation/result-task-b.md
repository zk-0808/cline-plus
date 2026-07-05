# `.clinerules` 加载与拼装顺序分析

> 基于 Cline 源码 `sdk/packages/core/` + `sdk/packages/shared/` 分析

---

## 1. `.clinerules` 搜索路径列表

搜索路径由 `resolveRulesConfigSearchPaths()` 定义（`sdk/packages/shared/src/storage/paths.ts`），`createRulesConfigDefinition()` 还会额外追加 `.cline` 管理目录。

### 完整搜索路径（按优先级排列）

| # | 路径 | 说明 |
|---|------|------|
| 1 | `${workspacePath}/AGENTS.md` | 工作区根目录的 AGENTS.md |
| 2 | `${workspacePath}/.clinerules/` | **旧版**工作区规则目录（`DEPRECATED_CONFIG_DIR`） |
| 3 | `${workspacePath}/.cline/rules/` | **新版**工作区规则目录 |
| 4 | `~/.agents/AGENTS.md` | 全局 AGENTS.md（旧版兼容路径） |
| 5 | `~/.cline/rules/` | 全局规则目录 |
| 6 | `~/Documents/Cline/Rules/` | Documents 下的规则目录 |
| 7 | `${workspacePath}/.cline/` | **追加的管理插件目录**（由 `createRulesConfigDefinition` 额外添加） |

> **注意**：路径经 `dedupePaths()` 去重（基于字符串匹配），实际扫描时跳过不存在或无权限的目录。

### 文件发现逻辑（`discoverRulesLikeFiles`）

对于每个搜索目录：
1. 如果目录是 `.cline` 管理目录 → 扫描子目录中 `managed.json` 标识的插件，递归查找规则文件
2. 如果路径本身是文件 → 直接作为候选
3. 如果是目录 → 扫描其中所有 `.md`/`.markdown`/`.txt` 文件
4. **特殊处理**：工作区根目录还会额外检查 `AGENTS.md` 是否已包含

### 文件匹配条件（`includeFile`）

```
fileName === ".clinerules" || isMarkdownFile(fileName) || isMarkdownFile(filePath)
```

即：`.clinerules` 文件本身、或任何 `.md`/`.markdown`/`.txt` 扩展名的文件。

---

## 2. 规则文件内容格式化方式

### 解析流程

1. **读取文件内容** → 调用 `parseMarkdownFrontmatter()` 解析 YAML frontmatter
2. **提取字段**：
   - `name`：frontmatter 中的 `name` 字段，缺失时用文件名/目录名作为 fallback
   - `disabled`：frontmatter 中的 `disabled` 字段（或 `enabled: false`）
   - `instructions`：frontmatter 之后的 body 内容（`trim()` 后）
3. **过滤**：`isRuleEnabled()` 排除 `disabled === true` 的规则
4. **排序**：按 `rule.name` 字母序排列（`localeCompare`）

### 最终格式化（`formatRulesForSystemPrompt`）

```typescript
function formatRulesForSystemPrompt(rules: ReadonlyArray<RuleConfig>): string {
    if (rules.length === 0) return "";
    const renderedRules = rules
        .map((rule) => `## ${rule.name}\n${rule.instructions}`)
        .join("\n\n");
    return `\n\n# Rules\n${renderedRules}`;
}
```

**输出格式示例**：

```
\n\n# Rules
## rule-name-1
instructions content here...

## rule-name-2
instructions content here...
```

即：一级标题 `# Rules` 下，每个规则以 `## name` 二级标题 + 原始 instructions 内容拼接，规则之间空两行。

---

## 3. 最终拼装到 System Prompt 的位置

### 拼装链路

```
SessionRuntimeOrchestrator.composeSystemPrompt()
  ├── contributionRegistry.getRegisteredRules()  // 获取所有已注册的 rule
  ├── resolveRuleContent(rule)                     // 支持 string 或 async function
  └── mergeSystemPromptRules(config.systemPrompt, rules)
```

### `mergeSystemPromptRules` 逻辑

```typescript
function mergeSystemPromptRules(systemPrompt: string, rules: ReadonlyArray<string>): string {
    const base = systemPrompt.trim();
    const additional = rules.map(r => r.trim()).filter(Boolean).join("\n\n");
    if (base && additional) return `${base}\n\n${additional}`;
    return base || additional;
}
```

**拼装位置：追加在 system prompt 末尾**

```
┌─────────────────────────────────┐
│  config.systemPrompt (基础提示)  │
│  （来自 agent 配置的原始内容）    │
├─────────────────────────────────┤
│                                 │
│  \n\n                           │
│                                 │
├─────────────────────────────────┤
│  # Rules                        │  ← formatRulesForSystemPrompt 输出
│  ## rule-name-1                 │
│  instructions...                │
│                                 │
│  ## rule-name-2                 │
│  instructions...                │
└─────────────────────────────────┘
```

### 注册时机

在 `user-instruction-plugin.ts` 的 `createUserInstructionPlugin()` 中：

```typescript
api.registerRule({
    id: "cline-user-instructions:rules",
    source: "user-instruction-watcher",
    content: () => loadRulesForSystemPromptFromWatcher(options.watcher),
});
```

- `content` 是一个 **lazy function**，每次 `composeSystemPrompt` 时才调用
- `loadRulesForSystemPromptFromWatcher` = `formatRulesForSystemPrompt(listEnabledRulesFromWatcher(watcher))`
- 规则内容从 watcher 的 snapshot 中实时读取，支持热更新

### 多 Rule 合并

`contributionRegistry` 中所有 `registerRule()` 注册的 rule 会被收集到数组中，最终在 `composeSystemPrompt` 中按 **注册顺序** 逐个 `resolveRuleContent` 后用 `\n\n` 拼接，再整体追加到 system prompt 末尾。

---

## 总结

| 维度 | 结论 |
|------|------|
| **搜索范围** | 7 个路径，从工作区 AGENTS.md → 旧版 .clinerules → 新版 .cline/rules → 全局 → Documents |
| **文件格式** | 支持 YAML frontmatter（name/disabled/enabled），body 为 instructions |
| **输出格式** | `# Rules\n## name\ninstructions` 结构 |
| **拼装位置** | **system prompt 末尾追加**，在基础 prompt 之后 |
| **排序** | 规则按 name 字母序排列 |
| **更新机制** | 通过 file watcher 热更新，每次 run 时 lazy 读取最新内容 |
