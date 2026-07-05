# Task D: Cline System Prompt 拼装流程分析

## composeSystemPrompt 代码

```typescript
// session-runtime-orchestrator.ts, line 657
private async composeSystemPrompt(): Promise<string> {
    const rules: string[] = [];
    for (const rule of this.contributionRegistry.getRegisteredRules()) {
        const content = await resolveRuleContent(rule);
        if (content) {
            rules.push(content);
        }
    }
    return mergeSystemPromptRules(this.config.systemPrompt, rules);
}
```

其中 `mergeSystemPromptRules` 和 `resolveRuleContent` 是顶层辅助函数：

```typescript
// line 86
async function resolveRuleContent(
    rule: AgentExtensionRule,
): Promise<string | undefined> {
    const content =
        typeof rule.content === "function" ? await rule.content() : rule.content;
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

// line 93
function mergeSystemPromptRules(
    systemPrompt: string,
    rules: ReadonlyArray<string>,
): string {
    const base = systemPrompt.trim();
    const additional = rules
        .map((rule) => rule.trim())
        .filter(Boolean)
        .join("\n\n");
    if (base && additional) {
        return `${base}\n\n${additional}`;
    }
    return base || additional;
}
```

## systemPrompt 拼装顺序

1. **`config.systemPrompt`**（基础 prompt）— 来自构造函数传入的 `AgentConfig.systemPrompt`
2. **`registerRule` 内容**（追加）— 来自 `contributionRegistry.getRegisteredRules()`，逐个 resolve 后用 `\n\n` 拼接，追加到 base 之后

在 `executeRunInternal` 中的调用链：

```typescript
// line 741
const systemPrompt = await this.composeSystemPrompt();
// ...
// line 802 — 传入 runtime config
const runtimeConfig = createAgentRuntimeConfig({
    // ...
    systemPrompt,
});
```

## getRegisteredRules 代码

```typescript
// contribution-registry.ts, ContributionRegistry class
getRegisteredRules(): AgentExtensionRule[] {
    return [...this.registry.rules];
}
```

`registry.rules` 在 `setup()` 阶段由各 extension 通过 `api.registerRule(rule)` 填充：

```typescript
registerRule: (rule) => {
    if (!entry.manifest.capabilities.has("rules")) {
        throw new Error(
            `Invalid setup for extension "${extensionName}": registerRule requires the "rules" capability`,
        );
    }
    pending.rules.push(rule);
},
```

## 关键发现

- **registerRule 注入位置：在 `config.systemPrompt` 之后（追加）**
- `mergeSystemPromptRules` 明确将 `config.systemPrompt` 作为 `base`，rules 作为 `additional`，最终输出 `${base}\n\n${additional}`
- 如果 `config.systemPrompt` 为空，则只返回 rules 内容；如果 rules 为空，则只返回 base
- rules 的注册顺序与 extension 在 `setup()` 中的调用顺序一致（按 `extensions` 数组顺序遍历）
- `AgentExtensionRule.content` 支持 string 或 `() => string | Promise<string>`（惰性求值）
