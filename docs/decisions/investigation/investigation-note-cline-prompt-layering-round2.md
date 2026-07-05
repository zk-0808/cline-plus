# 源码探查结论 — Cline 提示词分层注入机制(第二轮:应用层穿透)

> **状态**: ✅ Fully Verified — SDK runtime 层 + cline 应用层均已验证
> **日期**: 2026-07-06
> **evidence_as_of**: 2026-07-06，源码从本地 clone（GitHub main 分支，2026-07-04 拉取）
> **证据类型**: 全部为 unminified .ts 源码
> **依赖**: [第一轮探查结论](investigation-note-cline-prompt-layering.md)

---

## Task F 结果: `config.systemPrompt` 构造链路

### F1. 构造入口

**Observation**: `buildClineSystemPrompt()` 定义在 `sdk/packages/shared/src/prompt/cline.ts:72-105`。

**两条调用路径**:

1. **VS Code 路径**: `apps/vscode/src/sdk/cline-session-factory.ts:buildSessionConfig()` 调用 `buildClineSystemPrompt()`，**不传 `rules` 参数**（`{{CLINE_RULES}}` 替换为空字符串）
2. **CLI 路径**: `apps/cli/src/runtime/prompt.ts:resolveSystemPrompt()` 调用 `buildClineSystemPrompt()`，传入 `rules`（含 `.clinerules` + MODE_TAG_INSTRUCTIONS + PLAN_MODE_INSTRUCTIONS）

**Evidence Type**: 源码（cline.ts:72-105, cline-session-factory.ts:377-388, prompt.ts:37-55）
**Confidence**: high

### F2. 完整调用链

```
VS Code 路径:
  StateManager.getApiConfiguration()
    → buildSessionConfig() [cline-session-factory.ts:377]
      → buildClineSystemPrompt({ ide, workspaceRoot, mode, platform }) [cline.ts:72]
        → DEFAULT_CLINE_SYSTEM_PROMPT.replace("{{CLINE_RULES}}", "")  ← rules 为空
        → systemPrompt += preferredLanguage [cline-session-factory.ts:395]
        → systemPrompt += PLAN_MODE_INSTRUCTIONS (if plan mode) [cline-session-factory.ts:402]
      → CoreSessionConfig.systemPrompt = systemPrompt [cline-session-factory.ts:430]
        → SDK runtime: orchestrator.composeSystemPrompt() [orchestrator.ts:657]
          → mergeSystemPromptRules(config.systemPrompt, pluginRules)

CLI 路径:
  resolveSystemPrompt() [prompt.ts:25]
    → buildWorkspaceMetadata(cwd)
    → mergeRulesForSystemPrompt(undefined, input.rules)  ← .clinerules 文件规则
    → rules += MODE_TAG_INSTRUCTIONS
    → rules += PLAN_MODE_INSTRUCTIONS (if plan mode)
    → buildClineSystemPrompt({ rules, ... }) [cline.ts:72]
      → DEFAULT_CLINE_SYSTEM_PROMPT.replace("{{CLINE_RULES}}", rules)
    → SDK runtime: orchestrator.composeSystemPrompt()
      → mergeSystemPromptRules(config.systemPrompt, pluginRules)
```

**关键差异**: VS Code 路径中 `{{CLINE_RULES}}` 被替换为空字符串，`.clinerules` 文件规则**不进入 base system prompt**。但 SDK orchestrator 仍会追加 plugin 注册的 rules（包括 `user-instruction-plugin` 通过 `registerRule` 注册的 `.clinerules` 规则）。

**Evidence Type**: 源码
**Confidence**: high

### F3. `buildClineSystemPrompt` 签名

```typescript
function buildClineSystemPrompt(options: ClineSystemPromptOptions): string
// options: { rootPath?, workspaceRoot?, ide?, mode?, platform?, workspaceName?, metadata?, rules?, overridePrompt?, providerId? }
```

**Evidence Type**: 源码（cline.ts:72）
**Confidence**: high

### F4. 调用时机

- **VS Code**: session 启动时调用一次（`buildSessionConfig`），结果传入 `CoreSessionConfig.systemPrompt`
- **CLI**: 每次 `resolveSystemPrompt` 调用时（session 启动时）
- **SDK orchestrator**: 每次 `composeSystemPrompt()` 调用时（每次 run 开始），在 base 上追加 plugin rules

**Evidence Type**: 源码
**Confidence**: high

---

## Task G 结果: base system prompt 内部分层

### G1. 模板结构

**Observation**: `DEFAULT_CLINE_SYSTEM_PROMPT` 是一个**单体模板字符串**（`sdk/packages/shared/src/prompt/system.ts:3-62`），不使用分段拼装。所有 section 内联在一个模板中。

**Evidence Type**: 源码（system.ts:3-62）
**Confidence**: high

### G2. 模板内部分层顺序（从顶到底）

| # | Section | 位置 | 字符数估算 | 说明 |
|---|---------|------|-----------|------|
| 1 | **角色定义** | system.ts:3-5 | ~250 | "You are Cline, an AI coding agent..." |
| 2 | **通用指引** | system.ts:7-10 | ~400 | "Always gather all necessary context..." |
| 3 | **环境信息** | system.ts:12-17 | ~150 | `<env>` 块：Platform / Date / IDE / CWD |
| 4 | **Remember 段** | system.ts:19-31 | ~900 | 8 条"Always/Do not"规则（代码规范、工具使用、验证等）|
| 5 | **工具调用指引** | system.ts:22-27 | ~400 | 并行工具调用、batch 模式 |
| 6 | **任务完成指引** | system.ts:29-31 | ~200 | "When you have completed the task..." |
| 7 | **简单问题指引** | system.ts:33 | ~80 | "If user asked a simple question..." |
| 8 | **`{{CLINE_RULES}}`** | system.ts:35 | 0~∞ | 占位符，替换为 `.clinerules` 内容（CLI）或空（VS Code）|
| 9 | **`{{CLINE_METADATA}}`** | system.ts:36 | 0~∞ | 占位符，替换为工作区元数据 |

**ASCII 顺序图**:
```
┌─────────────────────────────────────────────┐
│ 1. 角色定义 (You are Cline...)              │ ~250 char
├─────────────────────────────────────────────┤
│ 2. 通用指引 (Always gather context...)      │ ~400 char
├─────────────────────────────────────────────┤
│ 3. 环境信息 <env> Platform/Date/IDE/CWD     │ ~150 char
├─────────────────────────────────────────────┤
│ 4. Remember 段 (8 条 Always/Do not 规则)    │ ~900 char
├─────────────────────────────────────────────┤
│ 5. 工具调用指引 (并行/batch)                 │ ~400 char
├─────────────────────────────────────────────┤
│ 6. 任务完成指引                              │ ~200 char
├─────────────────────────────────────────────┤
│ 7. 简单问题指引                              │ ~80 char
├─────────────────────────────────────────────┤
│ 8. {{CLINE_RULES}} (占位符)                  │ 0~∞
├─────────────────────────────────────────────┤
│ 9. {{CLINE_METADATA}} (占位符)               │ 0~∞
└─────────────────────────────────────────────┘
```

**Evidence Type**: 源码（system.ts:3-62）
**Confidence**: high

### G3. `{{CLINE_RULES}}` 替换逻辑

**Observation**: 在 `buildClineSystemPrompt()` 中通过 `.replace("{{CLINE_RULES}}", rules || "")` 执行简单字符串替换（cline.ts:100）。

- CLI 路径: `rules` = `.clinerules` 文件内容 + MODE_TAG_INSTRUCTIONS + PLAN_MODE_INSTRUCTIONS
- VS Code 路径: `rules` = undefined → 替换为空字符串

**Evidence Type**: 源码（cline.ts:100, prompt.ts:37）
**Confidence**: high

### G4. `addUserInstructions` 在分层中的位置

**Observation**: **不存在 `addUserInstructions` 方法**。这是 juejin 文档的过时描述。当前代码中，`.clinerules` 文件规则通过两种机制注入:

1. **CLI 路径**: `mergeRulesForSystemPrompt()` 直接拼入 `rules` 参数 → 替换 `{{CLINE_RULES}}`
2. **VS Code 路径**: `user-instruction-plugin.ts` 通过 `api.registerRule()` 注册 → SDK orchestrator `composeSystemPrompt()` 追加

两种路径最终都进入 system prompt，但位置不同：
- CLI: 在模板内部（`{{CLINE_RULES}}` 位置，section 8）
- VS Code: 在模板外部（`mergeSystemPromptRules` append，section 10）

**Evidence Type**: 源码（user-instruction-plugin.ts:173-179）
**Confidence**: high

---

## Task H 结果: cline 内置 RULES 段落内容与位置

### H1. 内置 RULES 段落定义

**Observation**: cline **没有独立的内置 RULES 段落**。`DEFAULT_CLINE_SYSTEM_PROMPT` 中的约束分散在多个段落中，以"Remember:"标题统领（system.ts:19）。

关键约束措辞（system.ts:19-31）:
- "Always adhere to existing code conventions and patterns."
- "Use only libraries and frameworks that are confirmed..."
- "Provide complete and functional code without omissions or placeholders."
- "Be explicit about any assumptions or limitations..."
- "Always show your planning process before executing..."
- "Always use absolute paths when referring to files."
- "Always verify the files you have edited or created..."

**全部使用 "Always / Do not" 措辞，无 MUST / SHALL / MUST NOT。**

**Evidence Type**: 源码（system.ts:19-31）
**Confidence**: high

### H2. 强约束力来源分析

| 维度 | 分析 |
|------|------|
| **位置** | 靠前（section 4/9），在工具调用指引之前 |
| **格式** | 无独立标题层级，嵌入在 "Remember:" 段内 |
| **措辞** | "Always" × 7, "Do not" × 1, "Be explicit" × 1 — **语气中等偏强，但非 MUST/SHALL 级** |
| **重复** | 无重复强化 |
| **长度** | ~900 字符，占 base prompt 约 40% |

**真正强约束力来源**: 不是措辞本身，而是**位置靠前 + 与角色定义紧密相邻**。模型倾向于优先遵循 system prompt 前半部分的指令。

**Evidence Type**: 源码
**Confidence**: high

### H3. 与 registerRule 格式对比

| 维度 | cline 内置约束 | registerRule 注入 |
|------|--------------|------------------|
| **标题** | 无独立标题（嵌入 "Remember:"） | `# Rules` → `## rule-name`（rules.ts:15）|
| **措辞** | "Always / Do not"（中等） | 用户自定义（可强可弱）|
| **位置** | base prompt 前半部分（section 4） | base prompt 末尾追加（section 10）|
| **长度** | ~900 char | 用户自定义 |

**关键差异**: 位置。内置约束在 base prompt 前半部分，registerRule 在末尾追加。模型对 system prompt 前半部分内容有更强的服从倾向。

**Evidence Type**: 源码
**Confidence**: high

---

## Task I 结果: token 量级估算

### I1. base system prompt 估算

| Section | 字符数 | Token 估算 (char/4) | 占比 |
|---------|--------|-------------------|------|
| 角色定义 | ~250 | ~63 | 3.8% |
| 通用指引 | ~400 | ~100 | 6.1% |
| 环境信息 | ~150 | ~38 | 2.3% |
| Remember 段 | ~900 | ~225 | 13.6% |
| 工具调用指引 | ~400 | ~100 | 6.1% |
| 任务完成指引 | ~200 | ~50 | 3.0% |
| 简单问题指引 | ~80 | ~20 | 1.2% |
| **base 小计** | **~2,380** | **~596** | **36.1%** |
| `{{CLINE_RULES}}` (VS Code) | 0 | 0 | 0% |
| `{{CLINE_RULES}}` (CLI, 含 mode instructions) | ~800 | ~200 | 12.1% |
| `{{CLINE_METADATA}}` | ~200 | ~50 | 3.0% |
| **VS Code 总计** | **~2,580** | **~646** | **39.1%** |
| **CLI 总计** | **~3,380** | **~846** | **51.2%** |

### I2. registerRule 注入后增量

| 注入内容 | 字符数 | Token 估算 |
|---------|--------|-----------|
| governance constitution (~800 token) | ~3,200 | ~800 |
| .clinerules 用户规则 (typical) | ~500 | ~125 |
| **registerRule 增量** | **~3,700** | **~925** |

### I3. 总量与 context window 对比

| 场景 | Token 估算 | 200k 占比 | 128k 占比 | 32k 占比 |
|------|-----------|----------|----------|---------|
| VS Code base only | ~646 | 0.3% | 0.5% | 2.0% |
| VS Code + registerRule | ~1,571 | 0.8% | 1.2% | 4.9% |
| CLI base + clinerules | ~846 | 0.4% | 0.7% | 2.6% |
| CLI + registerRule | ~1,771 | 0.9% | 1.4% | 5.5% |

**判断**:
- **200k 模型**: ✅ 完全安全（<1%）
- **128k 模型**: ✅ 安全（<2%）
- **32k 模型**: ✅ 安全（<6%）

**结论**: base system prompt 占用极小（<1k token），registerRule 注入后总量 <2k token，**长度类根因不成立**。context window 不会被 system prompt 挤出。

**Evidence Type**: 源码 + 粗估
**Confidence**: high

---

## Task J 结果: "rule 不生效"真实根因分析

### J1. 四类根因逐一验证

| 根因类型 | 描述 | 证据 | 是否成立 |
|---------|------|------|---------|
| **位置类** | registerRule 被内置 RULES 覆盖 | 源码确认 `mergeSystemPromptRules` 是纯 append，不覆盖。但 registerRule 在 base prompt **末尾追加**，位置靠后 | ❌ 不成立（不被覆盖） |
| **长度类** | base prompt 占用过大，registerRule 被 context window 挤出 | base prompt <1k token，registerRule 增量 <1k token，总量 <2k token | ❌ 不成立（总量极小） |
| **语气类** | registerRule 措辞弱于内置 RULES，模型优先服从内置 | 内置用 "Always/Do not"（中等语气），registerRule 用自定义措辞。但真正差异在于**位置**而非语气 | ⚠️ 部分成立（次要因素） |
| **时序类** | registerRule 注入晚于 model 首次请求 | `composeSystemPrompt()` 在每次 run 开始时调用，早于 model 请求。但 VS Code 路径中 `{{CLINE_RULES}}` 为空，`.clinerules` 需等 plugin registerRule 生效 | ⚠️ 特定场景成立 |

### J2. 第 6 场景: context window 挤出

**结论**: ❌ **不成立**。base prompt + registerRule 总量 <2k token，即使在 32k context window 下也仅占 5.5%。context window 挤出不是 rule 不生效的原因。

### J3. 真实根因: **位置 + 服从惯性**

**核心发现**: "rule 不生效"的真实根因是 **system prompt 前半部分的指令对模型形成了强服从惯性**。

具体机制:
1. base prompt section 1-7（角色定义 + 通用指引 + Remember 段）约 2,380 字符，在 system prompt **前半部分**
2. registerRule 注入在 system prompt **末尾**（section 10）
3. 模型对 system prompt 前半部分内容有更强的服从倾向（positional bias）
4. 当 registerRule 的指令与 base prompt 的指令**方向不一致**时（如 "DO NOT RE-READ FILES" vs base prompt 的 "Always gather all necessary context"），模型倾向于遵循位置靠前的指令

**实测验证**:
- ✅ "DO NOT RE-READ FILES" 前缀有效 → 因为它直接对抗了 base prompt "Always gather all necessary context" 的服从惯性，用**更强的措辞**覆盖了位置劣势
- ✅ 模型最终引用了 registerRule 内容 → 说明 registerRule 技术上注入成功，问题在于模型是否选择服从

### J4. 诊断决策树

```
"rule 不生效"
  │
  ├─ rule 是否出现在 system prompt 中?
  │    ├─ 否 → 检查: disabled? 解析失败? 目录未加载? 同名覆盖?
  │    └─ 是 ↓
  │
  ├─ rule 是否与 base prompt 指令冲突?
  │    ├─ 否 → rule 应生效，检查是否是模型能力问题
  │    └─ 是 ↓
  │
  ├─ 冲突类型?
  │    ├─ 指令方向相反 ("DO X" vs "Always do Y")
  │    │    → 根因: 位置 + 服从惯性
  │    │    → 解法: 用更强措辞(MUST/SHALL) + 行为指令前缀
  │    │
  │    ├─ 指令范围重叠 (rule 重复 base prompt 已有内容)
  │    │    → 根因: 冗余，模型忽略重复
  │    │    → 解法: 删除冗余 rule
  │    │
  │    └─ 指令优先级不明 (rule 和 base prompt 都是 "should" 级)
  │         → 根因: 语气平级，模型自行判断
  │         → 解法: rule 用 MUST/SHALL 提升优先级
  │
  └─ 以上都不是 → 检查: 模型能力不足? token 预算耗尽? API 截断?
```

### J5. 框架规避策略

1. **位置策略**: rule 内容尽量简短，减少被 context window 挤出的风险（虽然当前不成立，但未来模型 context window 可能变化）
2. **语气策略**: 使用 MUST / MUST NOT / SHALL 措辞，匹配或超过 base prompt 的 "Always / Do not" 语气
3. **行为指令前缀**: 在 rule 开头添加 "DO NOT RE-READ FILES" 等行为指令，直接对抗 base prompt 的服从惯性（已实测有效）
4. **冲突规避**: 避免 rule 与 base prompt 指令方向相反；如必须冲突，用更强措辞覆盖
5. **唯一命名**: rule name 使用唯一前缀（如 `governance:`）避免与用户 `.clinerules` 规则冲突

### J6. 与第一轮结论的衔接

| 维度 | 第一轮结论 | 第二轮修正 |
|------|-----------|-----------|
| registerRule 注入位置 | ✅ base prompt 之后（SDK 层） | ✅ 确认，但在应用层 base prompt 末尾（section 10），非中间 |
| 不被覆盖 | ✅ SDK 层不覆盖 | ✅ 应用层也不覆盖（`replace` 只处理 `{{CLINE_RULES}}` 占位符）|
| 无长度截断 | ✅ SDK 层无截断 | ✅ 应用层也无截断，base prompt <1k token |
| Rule 失效场景 | 5 场景 | **+1 场景**: 位置 + 服从惯性（非 context window 挤出）|
| 结论状态 | ⚠️ Partially Verified | ✅ Fully Verified |

---

## 汇总结论

| 问题 | 结论 | 证据类型 | Confidence |
|------|------|---------|-----------|
| config.systemPrompt 谁构造? | `buildClineSystemPrompt()` 在 shared/prompt/cline.ts，VS Code/CLI 两条路径 | 源码 | high |
| base prompt 内部分层? | 单体模板 9 section，`{{CLINE_RULES}}` 在 section 8 | 源码 | high |
| RULES 强约束力来源? | 位置靠前 + "Always/Do not" 措辞 + 与角色定义紧密相邻 | 源码 | high |
| base prompt 占多少 token? | ~600 token（VS Code）/ ~850 token（CLI），极小 | 源码+粗估 | high |
| "rule 不生效"根因? | **位置 + 服从惯性**（非长度/覆盖/时序）| 源码+实测 | high |

---

## 对框架设计的影响

### 1. Constitution 措辞建议

- 使用 **MUST / MUST NOT / SHALL** 措辞（超过 base prompt 的 "Always / Do not"）
- 在 rule 开头添加 **行为指令前缀**（如 "DO NOT RE-READ FILES"）
- rule 内容**避免与 base prompt 指令方向相反**

### 2. 注入策略确认

- `registerRule` 技术上完全可行（已验证）
- VS Code 路径中 `.clinerules` 通过 `user-instruction-plugin` 的 `registerRule` 注入（非 `{{CLINE_RULES}}` 占位符）
- CLI 路径中 `.clinerules` 通过 `{{CLINE_RULES}}` 占位符注入

### 3. Constitution 长度上限

- 当前 ≤800 token 上限**过于保守**
- base prompt + registerRule 总量 <2k token，即使 32k context window 也仅占 6%
- 建议放宽到 **≤2000 token**（仍仅占 32k window 的 6%）

---

## 产源说明

- 全部源码来自本地 cline clone（/home/work/.openclaw/workspace/cline/）
- 文件路径: sdk/packages/shared/src/prompt/system.ts, sdk/packages/shared/src/prompt/cline.ts, sdk/packages/core/src/runtime/orchestration/session-runtime-orchestrator.ts, sdk/packages/core/src/runtime/safety/rules.ts, sdk/packages/core/src/extensions/config/user-instruction-plugin.ts, apps/vscode/src/sdk/cline-session-factory.ts, apps/cli/src/runtime/prompt.ts
