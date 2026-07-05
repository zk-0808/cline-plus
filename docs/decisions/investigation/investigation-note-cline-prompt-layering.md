# 源码探查结论 — Cline 提示词分层注入机制

> **状态**：⚠️ Partially Verified — SDK runtime 层已验证,cline 应用层未覆盖(详见 §七 盲点纠偏)
> **日期**：2026-07-05(初版) / 2026-07-05(盲点纠偏)
> **前置决策**：ADR-007 registerRule 静态注入

---

## ⚠️ 重要局限声明(2026-07-05 盲点纠偏)

本次探查 5 个 subagent 任务**仅穿透到 SDK runtime 层**(`session-runtime-orchestrator.ts` 的 `composeSystemPrompt()`),回答了:

- ✅ registerRule 注入到 `config.systemPrompt` **之后**(SDK 层 append)
- ✅ registerRule 不被内置 RULES 段落覆盖(SDK 层无覆盖逻辑)
- ✅ SDK 层无长度截断(由 API 层兜底)

**未回答**的关键问题:

- ❌ `config.systemPrompt` 这个 base 字符串**内部是怎么拼起来的**——即 cline 应用层 `src/core/prompts/system.ts` 的 `buildSystemPrompt()` 如何分层拼装
- ❌ cline 内置 TOOL USE 格式 / 工具列表 / EDITING FILES / RULES / CAPABILITIES / 系统信息 / 目标 等段落的**精确顺序与 token 量级**
- ❌ "rule 注入不能生效"的**真实根因**——是位置(被覆盖)?还是长度(被截断)?还是语气(优先级弱)?还是时序(注入晚于 model 首次请求)?
- ❌ cline 内置 RULES 段落的**强约束力来自哪里**——是位置靠前?是格式(标题层级)?是措辞(MUST/MUST NOT)?

**对结论的影响**:

§13.12 "registerRule 不被覆盖"在 **SDK 层是对的**,但在**应用层可能错**——若 cline 内部 prompt 占用过大导致 registerRule 内容被 context window 挤出,表现为"不生效",与"被覆盖"难以区分。

§13.13 "Rule 失效 5 场景"**漏了第 6 场景**:cline 内部 prompt 占用过大导致 registerRule 内容被 context window 挤出。

**纠偏动作**:见 §七 盲点纠偏计划(第二轮探查)。

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

---

## 七、盲点纠偏计划(第二轮探查)

### 7.1 盲点根因

第一轮探查停在 **SDK runtime 层**(`session-runtime-orchestrator.ts`),只回答了 "registerRule 注入到 `config.systemPrompt` 之后"——但 `config.systemPrompt` 本身是 cline 应用层拼好的字符串,内部如何分层**未探查**。

### 7.2 第二轮探查任务设计

**目标文件**:`src/core/prompts/system.ts`(cline 应用层,非 SDK)

**5 个并行 subagent 任务**:

#### Task F: `config.systemPrompt` 构造链路

**目标**:找到 SDK runtime 接收的 `config.systemPrompt` 是在 cline 应用层哪一处构造的

**搜索关键词**:`buildSystemPrompt`、`createClineRunConfig`、`agentConfig.systemPrompt`、`new AgentConfig`

**任务步骤**:
1. 在 cline 仓库 `src/` 下找到 `AgentConfig` / `agentConfig` 的构造点
2. 追踪 `systemPrompt` 字段的赋值来源
3. 找到 `buildSystemPrompt()` 或等价函数的入口
4. 给出从 cline UI → AgentConfig → SDK runtime 的完整调用链

**产出格式**:
```
- 构造入口: <file:line>
- 调用链: UI → ... → buildSystemPrompt() → ... → AgentConfig.systemPrompt
- buildSystemPrompt 签名: <参数 + 返回值>
```

#### Task G: base system prompt 内部分层

**目标**:搞清楚 `buildSystemPrompt()` 内部各段落的拼装顺序

**搜索关键词**:`buildSystemPrompt`、`getSystemPrompt`、`SYSTEM_PROMPT_TEMPLATE`、`sections`、`promptSections`

**任务步骤**:
1. 找到 `buildSystemPrompt()` 函数体
2. 按顺序列出所有 section 的拼装调用(TOOL USE / 工具列表 / EDITING FILES / RULES / CAPABILITIES / 系统信息 / 目标)
3. 标注每个 section 的源码位置
4. 特别标注 `{{CLINE_RULES}}` 占位符的替换逻辑

**产出格式**:
```
base system prompt 拼装顺序(从顶到底):
1. <section A> — 来源 <file:line>
2. <section B> — 来源 <file:line>
...

{{CLINE_RULES}} 替换逻辑: <file:line>
```

#### Task H: cline 内置 RULES 段落内容与位置

**目标**:找到 cline 内置的 RULES 段落内容,理解其强约束力来源

**搜索关键词**:`CLINE_RULES`、`RULES_SECTION`、`getRulesSection`、`# Rules`

**任务步骤**:
1. 找到 cline 内置 RULES 段落的定义源码
2. 列出 RULES 段落的完整内容(或关键片段)
3. 判断强约束力来源:位置靠前?标题层级?措辞(MUST/SHALL)?
4. 对比 registerRule 注入的格式(`## rule-name`),判断语气差异

**产出格式**:
```
- RULES 段落定义: <file:line>
- 内容摘要: <3-5 句>
- 强约束力来源: <位置 / 格式 / 措辞>
- 与 registerRule 格式对比: <差异点>
```

#### Task I: token 量级估算

**目标**:估算 cline 内部 system prompt 各段落的 token 量级,判断是否接近 context window 上限

**任务步骤**:
1. 找到 base system prompt 的完整字符串(或各 section 字符串)
2. 用 char/4 粗估 token 量级(中英文混合用 char/3)
3. 列出各 section 的 token 估算
4. 计算总 base token + registerRule 注入后的增量
5. 判断是否接近常见 context window(200k / 128k / 32k)

**产出格式**:
```
| Section | 字符数 | Token 估算 |
|---------|--------|-----------|
| TOOL USE | ... | ... |
| ...

base 总量: <token>
registerRule 注入后增量: <token>
距离 200k 上限: <百分比>
```

#### Task J: "rule 不生效"真实根因分析

**目标**:基于 Task F-I 的结果,回答"为什么 rule 注入不能生效"

**任务步骤**:
1. 综合分析 4 类根因:位置(被覆盖)、长度(被截断)、语气(优先级弱)、时序(注入晚)
2. 对照第一轮 §13.13 的 5 场景,补第 6 场景(context window 挤出)
3. 给出"rule 不生效"的诊断决策树
4. 给出 framework runtime-plugin 的规避策略

**产出格式**:
```
"rule 不生效" 根因分类:
1. 位置类: <描述 + 证据>
2. 长度类: <描述 + 证据>
3. 语气类: <描述 + 证据>
4. 时序类: <描述 + 证据>

诊断决策树: <ASCII>
框架规避策略: <3-5 条>
```

### 7.3 第二轮探查的复查触发条件

- **若 Task F 找不到 buildSystemPrompt()**:可能 cline 应用层用了不同函数名,改搜 `systemPrompt =` 赋值语句
- **若 Task I 显示 base prompt < 10k token**:长度类根因排除,重点查语气和时序
- **若 Task I 显示 base prompt > 50k token**:长度类根因成立,框架需考虑长度控制策略
- **若 Task J 结论与第一轮冲突**:以第二轮为准(更深入),更新 §13.12/§13.13

### 7.4 逾期处置

- 逾期日:2026-07-19(同第一轮)
- 逾期降级:若第二轮仍未完成,框架 runtime-plugin 开发按"长度类根因成立"假设设计(保守策略),constitution ≤800 token 硬约束 + 注入位置尽量靠前

### 7.5 对框架设计的影响

第二轮探查结果将直接影响:
1. **constitution 长度上限**:若 base prompt 已接近 context window,≤800 token 可能仍需进一步压缩
2. **注入策略**:若时序类根因成立(registerRule 注入晚于 model 首次请求),需改用 registerMessageBuilder 注入到第一条 user message
3. **rule 措辞**:若语气类根因成立,需用 MUST/SHALL 强约束措辞,而非描述性语言
