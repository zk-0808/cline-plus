# 源码探查结论 — Cline 提示词分层注入机制

> **状态**：Verified（5 个并行子任务完成，源码验证）
> **日期**：2026-07-05
> **前置决策**：ADR-007 registerRule 静态注入

---

## 一、System Prompt 拼装总流程

```
┌─────────────────────────────────────────────────────────┐
│ 1. Base System Prompt (模板 + 占位符替换)                │
│    {{PLATFORM_NAME}} / {{CWD}} / {{CURRENT_DATE}} 等    │
│    {{CLINE_RULES}} → 文件级规则（如有）                   │
│    {{CLINE_METADATA}} → 工作区元数据（如有）              │
├─────────────────────────────────────────────────────────┤
│ 2. registerRule 规则 (追加在 base 之后)                  │
│    由 mergeSystemPromptRules 拼接，\n\n 分隔             │
│    格式: # Rules → ## rule-name → instructions           │
├─────────────────────────────────────────────────────────┤
│ 3. registerMessageBuilder (每次 model request 前执行)    │
│    对整个 Message[] 做 transform，不限于 system prompt    │
└─────────────────────────────────────────────────────────┘
```

### 关键代码

```typescript
// session-runtime-orchestrator.ts:657-666
private async composeSystemPrompt(): Promise<string> {
    const rules: string[] = [];
    for (const rule of this.contributionRegistry.getRegisteredRules()) {
        const content = await resolveRuleContent(rule);
        if (content) { rules.push(content); }
    }
    return mergeSystemPromptRules(this.config.systemPrompt, rules);
}

// :95-106
function mergeSystemPromptRules(systemPrompt: string, rules: ReadonlyArray<string>): string {
    const base = systemPrompt.trim();
    const additional = rules.map(r => r.trim()).filter(Boolean).join("\n\n");
    if (base && additional) return `${base}\n\n${additional}`;
    return base || additional;
}
```

---

## 二、registerRule vs registerMessageBuilder 对比

| 维度 | registerRule | registerMessageBuilder |
|------|-------------|----------------------|
| **注入位置** | system prompt 字符串 | 整个 Message[] 数组 |
| **执行时机** | 每次 run 开始（composeSystemPrompt） | 每次 model request 前（beforeModel hook） |
| **执行频率** | 1 次 / run | N 次 / run（每个 iteration） |
| **作用范围** | 仅 system prompt | 可修改所有角色所有消息 |
| **能力范围** | 静态文本注入 | 动态消息变换（增删改查） |
| **典型用途** | 注入规则、指令、上下文 | 消息压缩、历史改写、context 管理 |

---

## 三、.clinerules 加载机制

### 搜索路径（7 个，按优先级）

| # | 路径 | 说明 |
|---|------|------|
| 1 | `${workspace}/AGENTS.md` | 工作区 AGENTS.md |
| 2 | `${workspace}/.clinerules/` | 旧版规则目录 |
| 3 | `${workspace}/.cline/rules/` | 新版规则目录 |
| 4 | `~/.agents/AGENTS.md` | 全局 AGENTS.md |
| 5 | `~/.cline/rules/` | 全局规则目录 |
| 6 | `~/Documents/Cline/Rules/` | Documents 下 |
| 7 | `${workspace}/.cline/` | 管理插件目录 |

### 格式化输出

```typescript
// rules.ts:10-21
function formatRulesForSystemPrompt(rules: RuleConfig[]): string {
    const renderedRules = rules
        .map((rule) => `## ${rule.name}\n${rule.instructions}`)
        .join("\n\n");
    return `\n\n# Rules\n${renderedRules}`;
}
```

---

## 四、Rule 失效场景

| 场景 | 触发条件 | 表现 |
|------|----------|------|
| ① 显式禁用 | frontmatter `disabled: true` 或 `enabled: false` | rule 不出现 |
| ② 解析失败 | YAML 格式错误、空 body、缺 name | 静默消失 |
| ③ 目录未加载 | 文件不在 watcher 监控目录 | rule 不存在 |
| ④ 同名覆盖 | 多目录同名 rule，后者覆盖前者 | 静默替换 |
| ⑤ Prompt 过长 | 总量超出 context window | API 层截断 |

---

## 五、对框架设计的结论

### ✅ ADR-007 源码验证通过

1. **registerRule 注入在 base system prompt 之后**，独立段落，不被 `{{CLINE_RULES}}` 占位符覆盖
2. **无内置 RULES 段落覆盖风险** — `mergeSystemPromptRules` 是纯 append，不替换
3. **无长度截断** — Cline 不主动截断 system prompt，由 API 层 context window 兜底
4. **content 支持 lazy function** — 每次 run 时实时读取，支持热更新

### ⚠️ 需注意

1. **同名覆盖**：框架 rule name 需唯一，避免与用户规则冲突
2. **无优先级机制**：多 rule 按 name 字母序排列，无法控制顺序
3. **Constitution ≤800 token 上限合理**：无源码强制截断，但需考虑 API context window 总量

### 框架 runtime-plugin 设计指引

- **注入方式**：使用 `registerRule`（确认可行）
- **Rule 命名**：使用唯一前缀（如 `governance:`）避免与用户规则冲突
- **Lazy content**：利用 `content: () => ...` 实现运行时动态加载
- **长度控制**：Constitution ≤800 token 上限是合理的自约束（非源码强制）

---

## 六、引用

- Task A 结果: `result-task-a.md`
- Task B 结果: `result-task-b.md`
- Task C 结果: `result-task-c.md`
- Task D 结果: `result-task-d.md`
- Task E 结果: `result-task-e.md`
- ADR-007: `docs/decisions/adr/ADR-007-snapshot-registerRule-static-injection.md`
