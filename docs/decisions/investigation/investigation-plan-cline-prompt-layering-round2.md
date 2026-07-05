# 源码探查规划 — Cline 提示词分层注入机制(第二轮:穿透到应用层)

> **生命周期**:Hypothesis(待执行验证)
> **创建日期**:2026-07-05
> **required_verification_date**:2026-07-19(两周内执行,逾期降级)
> **逾期处置**:若两周内未派 subagent 执行,降级为"保守策略"——框架 runtime-plugin 按"长度类根因成立"假设设计,constitution ≤800 token 硬约束 + 行为指令前缀("DO NOT RE-READ")+ 注入位置尽量靠前,接受应用层源码层面的不确定性
> **依赖**:第一轮探查(已完成,见 [investigation-note-cline-prompt-layering.md](investigation-note-cline-prompt-layering.md))
> **前置状态**:第一轮 5 subagent 任务(A-E)已完成,但停在 SDK runtime 层,未穿透到 cline 应用层

## 一、背景与动机

### 1.1 第一轮探查的盲点

第一轮 5 个 subagent 任务**仅穿透到 SDK runtime 层**(`session-runtime-orchestrator.ts` 的 `composeSystemPrompt()`),回答了:

- ✅ registerRule 注入到 `config.systemPrompt` **之后**(SDK 层 append)
- ✅ registerRule 不被内置 RULES 段落覆盖(SDK 层无覆盖逻辑)
- ✅ SDK 层无长度截断(由 API 层兜底)

**未回答**的关键问题:

- ❌ `config.systemPrompt` 这个 base 字符串**内部是怎么拼起来的**——即 cline 应用层 `src/core/prompts/system.ts` 的 `buildSystemPrompt()` 如何分层拼装
- ❌ cline 内置 TOOL USE 格式 / 工具列表 / EDITING FILES / RULES / CAPABILITIES / 系统信息 / 目标 等段落的**精确顺序与 token 量级**
- ❌ "rule 注入不能生效"的**真实根因**——是位置(被覆盖)?还是长度(被截断)?还是语气(优先级弱)?还是时序(注入晚于 model 首次请求)?
- ❌ cline 内置 RULES 段落的**强约束力来自哪里**——是位置靠前?是格式(标题层级)?是措辞(MUST/MUST NOT)?

### 1.2 用户原问题

> "cline 自己是怎么实现提示词分层注入的,之前的开发里发现 cline 内部系统提示词的影响格外大,大到 rule 注入都不能生效。"

第一轮探查**未回答**这个原问题——只回答了"registerRule 注入到哪",没回答"cline 内部提示词怎么分层"和"为什么影响大到 rule 不生效"。

### 1.3 探查价值

| 维度 | 不探查的代价 | 探查后的收益 |
|------|------------|------------|
| "rule 不生效"根因定位 | 无法区分位置类/长度类/语气类/时序类根因 | 给出诊断决策树,精准规避 |
| Constitution 长度上限 | 不知 base prompt 占用多大,≤800 token 是否合理 | 基于 token 量级估算调优 |
| Rule 措辞策略 | 不知强约束力来源,可能用错语气 | 基于 RULES 段落格式选 MUST/SHALL |
| 注入时序 | 不知 registerRule 是否晚于 model 首次请求 | 决定是否改用 registerMessageBuilder |
| 框架 runtime-plugin 设计 | 保守策略可能过度约束 | 基于源码精确设计 |

## 二、已知信息(避免 subagent 重复探查)

### 2.1 第一轮已确认的(SDK runtime 层)

- `composeSystemPrompt()` 位于 `sdk/packages/core/src/runtime/orchestration/session-runtime-orchestrator.ts:657-666`
- `mergeSystemPromptRules(base, rules)` 纯字符串 append,`${base}\n\n${additional}`
- `config.systemPrompt` 是**已构造好的字符串**,SDK runtime 不关心它怎么来
- `registerRule` content 支持 lazy function `() => string | Promise<string>`
- Rule 失效 5 场景:显式禁用 / 解析失败 / 目录未加载 / 同名覆盖 / Prompt 过长(详见 [investigation-note §四](investigation-note-cline-prompt-layering.md))

### 2.2 第二轮要穿透的(cline 应用层)

- `config.systemPrompt` 的构造链路(谁调用 `buildSystemPrompt()`,在哪个文件)
- `buildSystemPrompt()` 内部分层拼装顺序
- cline 内置 RULES 段落的定义源码与内容
- 各 section 的字符数 / token 估算
- 与第一轮 registerRule 注入点的相对位置关系

### 2.3 已知线索(来自 [juejin 源码浅析](https://juejin.cn/post/7515378780371419162))

cline 应用层 system.ts 装配顺序(待源码验证):

```
1. TOOL USE 格式
2. 工具列表
3. 工具调用示例
4. 工具使用指引
5. MCP Server
6. EDITING FILES
7. Act Mode / Plan Mode
8. CAPABILITIES
9. RULES(cline 内置强约束)
10. 系统信息(OS/Shell/CWD)
11. 目标
12. 自定义 System Prompt(addUserInstructions 方法,追加 .clinerules / Cursor Rules / Windsurf Rules)
```

**待验证**:`{{CLINE_RULES}}` 占位符替换逻辑在哪、registerRule 注入与 `addUserInstructions` 的相对位置。

### 2.4 第一轮实测经验(context-snapshot/ ADR-007 + governance 框架)

- `registerRule` content 只在 session 启动求值一次(CLI 3.0.34 实测)
- 模型最终引用了 registerRule 注入的内容(实测)
- **但需行为指令前缀**("DO NOT RE-READ FILES")——不加前缀,模型先搜索文件不服从注入;加前缀,模型直接引用
- **`~/AGENTS.md` 干扰**:Cline 原生 `.clinerules` 加载用户主目录 AGENTS.md,与 governance registerRule 同时存在,问太泛的问题模型会混淆两个来源

## 三、5 个并行 Subagent 任务

### Task F: `config.systemPrompt` 构造链路

**目标**:找到 SDK runtime 接收的 `config.systemPrompt` 是在 cline 应用层哪一处构造的,给出完整调用链

**搜索关键词**:`buildSystemPrompt`、`createClineRunConfig`、`agentConfig.systemPrompt`、`new AgentConfig`、`systemPrompt =`、`SYSTEM_PROMPT`

**候选文件路径**:
- `src/core/prompts/system.ts`(主入口,buildSystemPrompt 定义)
- `src/core/`(AgentConfig 构造点)
- `src/api/`(发请求前的 config 组装)
- `src/services/`(cline 服务层)

**任务步骤**:
1. 在 cline 仓库 `src/` 下找到 `AgentConfig` / `agentConfig` 的构造点
2. 追踪 `systemPrompt` 字段的赋值来源
3. 找到 `buildSystemPrompt()` 或等价函数的入口
4. 给出从 cline UI/CLI → AgentConfig → SDK runtime 的完整调用链
5. 标注调用链中每一步的源码位置(file:line)

**产出格式**:
```
- 构造入口: <file:line>
- 调用链: UI/CLI → ... → buildSystemPrompt() → ... → AgentConfig.systemPrompt → composeSystemPrompt()
- buildSystemPrompt 签名: <参数 + 返回值>
- 调用时机: <session 启动时 / 每次 run / 每次模型请求>
- 关键代码片段: <3-5 行核心代码>
```

---

### Task G: base system prompt 内部分层

**目标**:搞清楚 `buildSystemPrompt()` 内部各段落的拼装顺序,产出完整的分层图

**搜索关键词**:`buildSystemPrompt`、`getSystemPrompt`、`SYSTEM_PROMPT_TEMPLATE`、`sections`、`promptSections`、`{{CLINE_RULES}}`、`{{CLINE_METADATA}}`、`addUserInstructions`

**候选文件路径**:
- `src/core/prompts/system.ts`(主入口)
- `src/core/prompts/sections/`(若存在分段实现)
- `src/core/prompts/model_prompts/`(Claude4 等模型特化)
- `src/core/prompts/templates/`(模板字符串)

**任务步骤**:
1. 找到 `buildSystemPrompt()` 函数体完整内容
2. 按顺序列出所有 section 的拼装调用(TOOL USE / 工具列表 / EDITING FILES / RULES / CAPABILITIES / 系统信息 / 目标 / 自定义)
3. 标注每个 section 的源码位置(file:line)
4. 特别标注 `{{CLINE_RULES}}` 占位符的替换逻辑——是字符串替换?还是模板插值?
5. 特别标注 `addUserInstructions()` 方法(.clinerules / Cursor Rules / Windsurf Rules)在分层中的位置
6. 给出一张 ASCII 顺序图(从顶到底)

**产出格式**:
```
base system prompt 拼装顺序(从顶到底):
1. <section A> — 来源 <file:line> — <字符数估算>
2. <section B> — 来源 <file:line> — <字符数估算>
...
N. <section N> — 来源 <file:line> — <字符数估算>

{{CLINE_RULES}} 替换逻辑: <file:line> — <机制描述>
addUserInstructions() 位置: <file:line> — <在分层中的位置>

ASCII 顺序图:
<图谱>
```

---

### Task H: cline 内置 RULES 段落内容与位置

**目标**:找到 cline 内置的 RULES 段落内容,理解其强约束力来源

**搜索关键词**:`CLINE_RULES`、`RULES_SECTION`、`getRulesSection`、`# Rules`、`## Rules`、`builtInRules`、`defaultRules`

**候选文件路径**:
- `src/core/prompts/system.ts`(RULES 段落定义)
- `src/core/prompts/sections/rules.ts`(若独立分段)
- `src/core/prompts/templates/rules.ts`(模板)
- `src/core/config.ts`(内置规则常量)

**任务步骤**:
1. 找到 cline 内置 RULES 段落的定义源码(file:line)
2. 列出 RULES 段落的完整内容(或关键片段,若过长则摘要)
3. 判断强约束力来源:
   - 位置靠前?(在 system prompt 第几位)
   - 标题层级?(`# Rules` vs `## Rules`)
   - 措辞?(MUST / SHALL / MUST NOT / SHOULD)
   - 重复强化?(是否在多处出现)
4. 对比 registerRule 注入的格式(`## rule-name`),判断语气差异
5. 给出"框架 constitution 应该用什么措辞才能匹配 RULES 段落的强约束力"

**产出格式**:
```
- RULES 段落定义: <file:line>
- 内容摘要: <3-5 句,含关键措辞>
- 强约束力来源:
  - 位置: <第几位 / 是否靠前>
  - 格式: <标题层级>
  - 措辞: <MUST/SHALL/SHOULD 分布>
  - 重复: <是否在多处出现>
- 与 registerRule 格式对比:
  | 维度 | cline RULES | registerRule |
  |------|------------|--------------|
  | 标题 | <层级> | <层级> |
  | 措辞 | <语气> | <语气> |
  | 位置 | <第N位> | <第N位> |
- 框架 constitution 措辞建议: <3-5 条>
```

---

### Task I: token 量级估算

**目标**:估算 cline 内部 system prompt 各段落的 token 量级,判断是否接近 context window 上限

**任务步骤**:
1. 找到 base system prompt 的完整字符串(或各 section 字符串,基于 Task G 的分层)
2. 用 char/4 粗估 token 量级(中英文混合用 char/3,纯英文用 char/4)
3. 列出各 section 的字符数与 token 估算
4. 计算总 base token + registerRule 注入后的增量(假设 governance constitution 800 token)
5. 判断是否接近常见 context window:
   - Claude 4 / Opus: 200k
   - Sonnet: 200k
   - Haiku: 200k
   - 旧模型 / 第三方: 128k / 32k
6. 给出"registerRule 注入后是否会挤出 context window"的判断

**产出格式**:
```
| Section | 字符数 | Token 估算(char/4) | 占比 |
|---------|--------|-------------------|------|
| TOOL USE | ... | ... | ...% |
| 工具列表 | ... | ... | ...% |
| EDITING FILES | ... | ... | ...% |
| RULES | ... | ... | ...% |
| CAPABILITIES | ... | ... | ...% |
| 系统信息 | ... | ... | ...% |
| 目标 | ... | ... | ...% |
| 自定义(.clinerules) | ... | ... | ...% |

base 总量: <token>
registerRule 注入后增量(governance constitution 800 token): <token>
总量: <token>
距离 200k 上限: <百分比>
距离 32k 上限(旧模型): <百分比>

判断:
- 200k 模型: <安全 / 接近 / 超出>
- 32k 模型: <安全 / 接近 / 超出>
```

**注意**:若 Task G 未完成,本任务可基于 [juejin 源码浅析](https://juejin.cn/post/7515378780371419162) 的 12 段分层做粗估,但需标注"基于文档非源码"。

---

### Task J: "rule 不生效"真实根因分析

**目标**:基于 Task F-I 的结果,回答"为什么 rule 注入不能生效",给出诊断决策树

**任务步骤**:
1. 综合分析 4 类根因:
   - **位置类**:registerRule 被内置 RULES 覆盖?(Task F+G+H 验证)
   - **长度类**:base prompt 占用过大,registerRule 被 context window 挤出?(Task I 验证)
   - **语气类**:registerRule 措辞弱于内置 RULES,模型优先服从内置?(Task H 验证)
   - **时序类**:registerRule 注入晚于 model 首次请求?(Task F 验证调用时机)
2. 对照第一轮 §13.13 的 5 场景,补第 6 场景(context window 挤出)
3. 给出"rule 不生效"的诊断决策树(ASCII)
4. 给出 framework runtime-plugin 的规避策略(3-5 条)
5. 对照实测经验("DO NOT RE-READ" 前缀有效),验证哪类根因成立

**产出格式**:
```
"rule 不生效" 根因分类:
1. 位置类: <描述 + 证据 + 是否成立>
2. 长度类: <描述 + 证据 + 是否成立>
3. 语气类: <描述 + 证据 + 是否成立>
4. 时序类: <描述 + 证据 + 是否成立>

诊断决策树:
<ASCII 图谱>

框架规避策略:
1. <策略 1>
2. <策略 2>
3. <策略 3>

实测验证:
- "DO NOT RE-READ" 前缀有效 → 支持 <哪类根因>
- 模型最终引用了 registerRule 内容 → 反驳 <哪类根因>
```

## 四、调度建议

- 5 个任务**全部并行**(无依赖)
- Task F/G/H 高度相关(都涉及 system.ts),若 subagent 间能共享 Read 结果会更高效,但即使重复 Read 也无妨
- Task I 依赖 Task G 的分层结果,但可基于 juejin 文档先做粗估,Task G 完成后校准
- Task J 依赖 Task F-I,但可先搭诊断框架,等 Task F-I 结果填入

**推荐调度**:
- 第一波(并行):Task F + Task G + Task H + Task I(基于文档粗估)
- 第二波(Task F-I 完成后):Task J(综合分析)

## 五、复查触发条件(防教条化)

- **若 Task F 找不到 buildSystemPrompt()**:可能 cline 应用层用了不同函数名,改搜 `systemPrompt =` 赋值语句,或读 `src/core/prompts/` 目录树
- **若 Task G 显示 base prompt 内部分层与 juejin 文档不一致**:以源码为准,文档标注为"宣传位"
- **若 Task I 显示 base prompt < 10k token**:长度类根因排除,重点查语气和时序
- **若 Task I 显示 base prompt > 50k token**:长度类根因成立,框架需考虑长度控制策略
- **若 Task J 结论与第一轮冲突**:以第二轮为准(更深入),更新 §13.12/§13.13 为 Fully Verified
- **若 5 个任务结果矛盾**:回看 Task G 的总流程图仲裁

## 六、汇总产出目标

5 个 subagent 完成后,汇总产出更新到 [investigation-note-cline-prompt-layering.md](investigation-note-cline-prompt-layering.md),状态从 ⚠️ Partially Verified → ✅ Fully Verified。特别要回答:

1. **`config.systemPrompt` 是谁构造的?调用链是什么?**(Task F)
2. **base system prompt 内部怎么分层?各 section 顺序?**(Task G)
3. **cline 内置 RULES 段落强约束力来自哪里?**(Task H)
4. **base prompt 占用多少 token?是否接近 context window 上限?**(Task I)
5. **"rule 不生效"真实根因是什么?框架如何规避?**(Task J)

汇总产出归档后,触发:
- §13.12/§13.13 从 Partially Verified → Fully Verified
- 框架 runtime-plugin 设计文档更新(若探查结果与假设冲突,启动 ADR-007 复审)
- dev-rules §1.16 "穿透边界判据"作为成功案例固化

## 七、与第一轮的衔接

| 维度 | 第一轮(Task A-E) | 第二轮(Task F-J) |
|------|------------------|------------------|
| 探查层级 | SDK runtime 层 | cline 应用层 |
| 核心问题 | registerRule 注入到哪? | config.systemPrompt 怎么构造? |
| 关键文件 | `session-runtime-orchestrator.ts` | `src/core/prompts/system.ts` |
| 结论状态 | ✅ Verified(SDK 层) | ⚠️ Partially Verified(待第二轮) |
| 对框架设计的影响 | 确认 registerRule 可用 | 确认注入策略(长度/语气/时序) |

第二轮探查完成后,两轮结果合并,形成完整的 cline 提示词分层注入图(SDK 层 + 应用层)。

## 八、引用

- [investigation-note-cline-prompt-layering.md](investigation-note-cline-prompt-layering.md) — 第一轮探查结论(含 §七 盲点纠偏计划)
- [investigation-plan-cline-prompt-layering.md](investigation-plan-cline-prompt-layering.md) — 第一轮探查规划
- [juejin 源码浅析](https://juejin.cn/post/7515378780371419162) — system.ts 装配顺序总览(待源码验证)
- [ADR-007](../adr/ADR-007-snapshot-registerRule-static-injection.md) — registerRule 静态注入决策
- [hook-auto-injection-design.md](../hook-auto-injection-design.md) — Hook 化分层判据
- [context-snapshot/src/index.ts](../../../context-snapshot/src/index.ts) — hook 实现范本
- [plugin-dev-quick-reference.md §13.12/§13.13](../../plugin/refs/plugin-dev-quick-reference.md) — 源码探查成果固化(待第二轮更新为 Fully Verified)
