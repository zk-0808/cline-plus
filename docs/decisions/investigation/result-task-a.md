# Task A: registerRule 注入位置分析

## 结论摘要

`registerRule` 注册的 content 在最终 system prompt 中位于 **整个 base prompt 之后**，作为独立段落追加。它不在 `{{CLINE_RULES}}` 占位符内部，而是在 `{{CLINE_RULES}}` 和 `{{CLINE_METADATA}}` 占位符替换完成之后，由 `mergeSystemPromptRules` 函数拼接。

---

## 详细分析

### 1. 注册阶段：`registerRule` 的定义与实现

**类型定义** — `sdk/packages/shared/src/extensions/contribution-registry.ts:126`
```typescript
registerRule: (rule: AgentExtensionRule) => void;
```

**接口** — `sdk/packages/shared/src/extensions/contribution-registry.ts:28-32`
```typescript
export interface AgentExtensionRule {
    id: string;
    content: string | (() => string | Promise<string>);
    source?: string;
}
```

**注册实现** — `sdk/packages/shared/src/extensions/contribution-registry.ts:505-510`
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

规则被 push 到 `ContributionRegistry.registry.rules: AgentExtensionRule[]` 数组中。

### 2. 消费阶段：谁读取 registry 中的 rules

**消费者** — `sdk/packages/core/src/runtime/orchestration/session-runtime-orchestrator.ts:657-666`
```typescript
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

`this.contributionRegistry.getRegisteredRules()` 返回所有通过 `registerRule` 注册的规则。

### 3. 注入方式：字符串拼接（append after base）

**拼接函数** — `sdk/packages/core/src/runtime/orchestration/session-runtime-orchestrator.ts:95-106`
```typescript
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

**注入方式**: 字符串拼接 — 将所有 registerRule 的 content 用 `\n\n` 连接后，追加到 `this.config.systemPrompt`（base prompt）之后。

### 4. Base Prompt 的构建

`this.config.systemPrompt` 来自宿主调用 `buildClineSystemPrompt()` 的返回值。

**模板定义** — `sdk/packages/shared/src/prompt/system.ts`

在 `DEFAULT_CLINE_SYSTEM_PROMPT` 模板中，`{{CLINE_RULES}}` 和 `{{CLINE_METADATA}}` 位于模板的 **最末尾**：
```
...（省略前文）...
If user asked a simple question without any coding context, answer it directly without using any tools.
{{CLINE_RULES}}
{{CLINE_METADATA}}
```

**模板替换** — `sdk/packages/shared/src/prompt/cline.ts:108-117`
```typescript
return basePrompt
    .replace("{{PLATFORM_NAME}}", platform)
    .replace("{{CWD}}", workspaceRoot)
    .replace("{{CURRENT_DATE}}", new Date().toLocaleDateString())
    .replace("{{IDE_NAME}}", ide)
    .replace("{{CLINE_METADATA}}", isCline ? buildWorkspaceMetadata(...) : "")
    .replace("{{CLINE_RULES}}", rules || "")
    .trim();
```

### 5. 最终 System Prompt 的完整结构

```
┌─────────────────────────────────────────────┐
│ Base System Prompt (模板 + 占位符替换)        │
│  - 环境信息、行为指令等                       │
│  - {{CLINE_RULES}} → 文件规则/模式指令(如有)  │
│  - {{CLINE_METADATA}} → 工作区元数据(如有)    │
├─────────────────────────────────────────────┤
│ registerRule 注册的规则 (由 mergeSystemPrompt │
│ Rules 拼接在 base prompt 之后)               │
│  - # Rules                                  │
│  - ## rule-name                             │
│  - rule instructions                        │
└─────────────────────────────────────────────┘
```

### 6. 关键代码片段（完整调用链）

```typescript
// 1. 注册 (user-instruction-plugin.ts:238)
api.registerRule({
    id: "cline-user-instructions:rules",
    source: "user-instruction-watcher",
    content: () => loadRulesForSystemPromptFromWatcher(options.watcher),
});

// 2. 格式化 (rules.ts:10-21)
export function formatRulesForSystemPrompt(rules: ReadonlyArray<RuleConfig>): string {
    const renderedRules = rules
        .map((rule) => `## ${rule.name}\n${rule.instructions}`)
        .join("\n\n");
    return `\n\n# Rules\n${renderedRules}`;
}

// 3. 消费 (session-runtime-orchestrator.ts:657-666)
private async composeSystemPrompt(): Promise<string> {
    const rules: string[] = [];
    for (const rule of this.contributionRegistry.getRegisteredRules()) {
        const content = await resolveRuleContent(rule);
        if (content) { rules.push(content); }
    }
    return mergeSystemPromptRules(this.config.systemPrompt, rules);
}

// 4. 拼接 (session-runtime-orchestrator.ts:95-106)
function mergeSystemPromptRules(systemPrompt: string, rules: ReadonlyArray<string>): string {
    const base = systemPrompt.trim();
    const additional = rules.map((rule) => rule.trim()).filter(Boolean).join("\n\n");
    if (base && additional) { return `${base}\n\n${additional}`; }
    return base || additional;
}
```

### 7. 验证：单元测试确认

**测试文件** — `sdk/packages/core/src/runtime/orchestration/session-runtime-orchestrator.test.ts:346-373`

```typescript
it("composes extension-registered rules into the runtime system prompt", async () => {
    const extension: AgentExtension = {
        name: "rules-ext",
        manifest: { capabilities: ["rules"] },
        setup: (api) => {
            api.registerRule({
                id: "rules-ext:primary",
                content: "Always preserve architectural boundaries.",
            });
        },
    };
    // ...
    expect(configs[0]?.systemPrompt).toBe(
        "Base prompt.\n\nAlways preserve architectural boundaries.",
    );
});
```

测试明确断言：registerRule 的 content 被追加在 base prompt 之后，用 `\n\n` 分隔。

---

## 最终答案

| 项目 | 值 |
|---|---|
| **registerRule 注入点源码位置** | `sdk/packages/core/src/runtime/orchestration/session-runtime-orchestrator.ts:657-666` (`composeSystemPrompt` 方法) |
| **注入方式** | 字符串拼接 — `mergeSystemPromptRules` 将所有 registerRule content 用 `\n\n` 连接后 append 到 base prompt 末尾 |
| **在最终 prompt 中的相对位置** | 在 `{{CLINE_RULES}}` 占位符之后，在 `{{CLINE_METADATA}}` 占位符之后，在整个 base system prompt 模板之后。即：**所有模板内容 → registerRule 规则** |
| **关键代码片段** | 见上方第 6 节 |
