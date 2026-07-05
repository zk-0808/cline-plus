# 源码探查规划 — Cline 提示词分层注入机制

> **生命周期**：Hypothesis（待执行验证）
> **创建日期**：2026-07-05
> **required_verification_date**：2026-07-19（两周内执行,逾期降级）
> **逾期处置**：若两周内未派 subagent 执行,降级为"以实测经验为准"——继续按 ADR-007 registerRule 注入策略推进框架 runtime-plugin,接受源码层面的不确定性
> **依赖**：无（独立研究任务）

## 一、背景与动机

### 1.1 问题来源

在 context-snapshot/ 开发中实测发现：

> "cline 内部系统提示词的影响格外大,大到 rule 注入都不能生效"

ADR-007 已通过实测推翻方式 B（messageBuilder 注入静态资产）,选 registerRule 静态注入路径。但该决策基于**行为观察**（模型最终引用了 registerRule 内容）,未在源码层面验证注入点的精确位置与优先级。

### 1.2 风险

框架 runtime-plugin 将重度依赖 `registerRule` 注入 constitution / handoff / snapshot。若源码层面存在以下未发现的机制,框架设计可能失效：

- **位置类风险**：registerRule 内容被 cline 内置 RULES 段落（强约束）覆盖或挤到无效位置
- **长度类风险**：cline 对 system prompt 有长度截断,registerRule 内容超过阈值被丢弃
- **优先级类风险**：registerRule 优先级低于 `.clinerules/` 文件,框架注入被用户规则覆盖
- **时序类风险**：registerRule 在 setup() 求值,但 system prompt 在更晚阶段重建时丢失 registerRule 内容

### 1.3 探查价值

| 维度 | 不探查的代价 | 探查后的收益 |
|------|------------|------------|
| 框架 runtime-plugin 设计 | 盲选注入方式,返工概率上升 | 基于 prompt 分层图精确选位 |
| Constitution ≤800 token 上限 | 不知是否真有长度截断 | 验证上限是否合理,可调 |
| 强约束力设计 | 不知是否被内置 RULES 覆盖 | 决定是否要"再次注入"机制 |
| 跨模型兼容性 | 不知是否有模型特化路径 | 预判 Claude4 / Sonnet 等差异 |

## 二、已知信息（避免 subagent 重复探查）

### 2.1 system.ts 装配顺序（来自 [juejin 源码浅析](https://juejin.cn/post/7515378780371419162)）

```
1. TOOL USE 格式
2. 工具列表
3. 工具调用示例
4. 工具使用指引
5. MCP Server
6. EDITING FILES
7. Act Mode / Plan Mode
8. CAPABILITIES
9. RULES（cline 内置强约束）
10. 系统信息（OS/Shell/CWD）
11. 目标
12. 自定义 System Prompt（addUserInstructions 方法,追加 .clinerules / Cursor Rules / Windsurf Rules）
```

**关键观察**：`.clinerules/` 在 `addUserInstructions` 中追加,位于内置 RULES 之后。但 `registerRule` 的注入点未知——可能是 `addUserInstructions` 内、之前、之后,或独立段落。

### 2.2 实测经验（context-snapshot/ ADR-007）

- `registerRule` content 只在 session 启动求值一次（CLI 3.0.34 实测）
- `registerMessageBuilder` 每次 model 请求都被调用
- ADR-007 验证：registerRule 优先级高于 messageBuilder（系统提示词顶层 > 上下文消息）
- 模型最终引用了 registerRule 注入的 handoff/snapshot 内容

### 2.3 SDK 路径变更线索

- 旧路径 `sdk/packages/core/src/runtime/extension/extension-rule-registry.ts` 已 404
- 当前 SDK 结构位于 `sdk/`（已知存在 `sdk/packages/core/`）
- Subagent 需重新定位 rule registry 实现位置

## 三、5 个并行 Subagent 任务

### Task A: registerRule 注入点定位

**目标**：找到 `registerRule` 注册的 content 在最终 system prompt 中的精确位置

**搜索关键词**：`registerRule`、`ExtensionRule`、`extensionRuleRegistry`、`getExtensionRules`、`extensionRules`

**候选文件路径**：
- `sdk/packages/core/src/runtime/extension/`（找 rule-registry 实现）
- `src/core/prompts/system.ts`（找 customInstructions 拼装末尾）
- `src/core/extension/` 或 `src/services/extensions/`

**任务步骤**：
1. Grep `registerRule` 找到 SDK 中类型定义和实现
2. 找到 rule content 的消费方（谁调用 registry 的 getAll / getContent）
3. 追踪消费方在 system.ts 中的注入位置
4. 给出最终 prompt 中 registerRule 段落的精确位置（在 RULES 之前/之后？在 customInstructions 之前/之后？）

**产出格式**：
```
- registerRule 注入点源码位置: <file:line>
- 注入方式: <拼接字符串 / 替换占位符 / 独立段落>
- 在最终 prompt 中的相对位置: <在 X 之前,Y 之后>
- 关键代码片段: <3-5 行核心代码>
```

---

### Task B: .clinerules 文件加载与拼装

**目标**：搞清楚 `.clinerules/` 文件夹加载顺序,以及与 `registerRule` 的相对优先级

**搜索关键词**：`.clinerules`、`localClineRules`、`localCursorRules`、`localWindsurfRules`、`addUserInstructions`、`getRulesForWorkspace`

**候选文件路径**：
- `src/core/prompts/system.ts`（addUserInstructions 方法）
- `src/core/config.ts` 或 `src/services/rules/`
- `src/integrations/` 下找文件读取

**任务步骤**：
1. 找到 `.clinerules/` 文件夹扫描逻辑
2. 找到单文件 `.clinerules` 加载逻辑
3. 找到 Cursor Rules / Windsurf Rules 加载逻辑（已知存在）
4. 给出 `addUserInstructions` 中三者的拼装顺序
5. **关键对比**：这个 customInstructions 与 Task A 找到的 registerRule 注入点的相对位置

**产出格式**：
```
- .clinerules 扫描逻辑位置: <file:line>
- 加载顺序: <Cline Rules → Cursor → Windsurf / 其他>
- addUserInstructions 拼装顺序: <顺序列表>
- 与 registerRule 的相对位置: <在前/在后/同级>
```

---

### Task C: registerMessageBuilder 注入机制

**目标**：搞清楚 `registerMessageBuilder` 注册的 builder 在哪一步执行、注入到什么消息

**搜索关键词**：`registerMessageBuilder`、`MessageBuilder`、`messageBuilder`、`buildMessages`、`transformMessages`

**候选文件路径**：
- `sdk/packages/core/src/runtime/extension/`（找 messageBuilder 注册）
- `src/core/` 下找 message 构建调用点
- `src/api/` 下找发请求前的 transform

**任务步骤**：
1. 找到 `registerMessageBuilder` SDK 类型定义
2. 找到 builder 的执行调用点（每次 model request？每次消息转换？）
3. 找到 builder 输出的注入目标（系统消息？用户消息？工具结果？）
4. 给出 builder 注入与 registerRule 注入的本质区别

**产出格式**：
```
- registerMessageBuilder 类型定义: <file:line>
- 执行调用点: <file:line>
- 执行时机: <每次 model request / 一次性 / 其他>
- 注入目标: <system message / user message / tool result>
- 与 registerRule 的本质区别: <对比表>
```

---

### Task D: 系统提示词拼装总流程

**目标**：从 `system.ts` 入口开始,把整个 system prompt 拼装调用链搞清楚,产出完整顺序图

**搜索关键词**：`buildSystemPrompt`、`SYSTEM_PROMPT`、`getSystemPrompt`、`assembleSystemPrompt`

**候选文件路径**：
- `src/core/prompts/system.ts`（主入口）
- `src/core/prompts/sections/`（若存在分段）
- `src/core/prompts/model_prompts/`（Claude4 等模型特化）

**任务步骤**：
1. 找到 system prompt 构建的主入口函数
2. 按顺序列出所有 section 的拼装调用
3. 标注每个 section 的位置（TOP / MIDDLE / BOTTOM）
4. 特别标注：cline 内置 RULES 段落、customInstructions、registerRule 三者的相对顺序
5. 给出一张 ASCII 顺序图

**产出格式**：
```
System Prompt 拼装顺序（从顶到底）:
1. <section A> — 来源 <file:line>
2. <section B> — 来源 <file:line>
...
N. <section N> — 来源 <file:line>

关键标注:
- 内置 RULES 段落: 第 X 位
- customInstructions（.clinerules 等）: 第 Y 位
- registerRule 注入: 第 Z 位（若 Task A 找到）
```

---

### Task E: rule 失效场景反例收集

**目标**：寻找 cline 源码或 GitHub issue 中关于"rule 注入不生效"的讨论,定位失效根因

**搜索关键词**：`rule not working`、`rule ignored`、`extension rule priority`、`rules not applied`、`registerRule` issue

**任务步骤**：
1. GitHub cline/cline issues 搜 "rule" + "not working"
2. GitHub cline/cline PRs 搜 "registerRule" 改动
3. cline 源码注释中搜 "rule" + "ignore" / "skip" / "truncate"
4. 寻找 prompt 长度截断逻辑（若 rule 内容太长是否被截断）
5. 寻找 rule 优先级覆盖逻辑（若内置 RULES 与 extension rule 冲突时谁胜）

**产出格式**：
```
- 已知失效场景列表: <3-5 个场景>
- 失效根因分类:
  - 位置类: <描述>
  - 长度类: <描述>
  - 优先级类: <描述>
  - 时序类: <描述>
- 关键 issue/PR 链接: <列表>
```

## 四、调度建议

- 5 个任务**全部并行**（无依赖）
- Task A/B/D 高度相关（都涉及 system.ts）,若 subagent 间能共享 Read 结果会更高效,但即使重复 Read 也无妨
- Task C 独立性最强（messageBuilder 在不同模块）
- Task E 是 issue/PR 检索,纯 WebFetch 工作,与其他 4 个完全隔离

## 五、复查触发条件（防教条化）

- **若 5 个任务结果矛盾**（例如 Task A 说 registerRule 在 customInstructions 之后,Task B 说在前）：回看 Task D 的总流程图仲裁
- **若 cline 源码与文档冲突**：以源码为准,文档标注为"宣传位"
- **若找不到 registerRule 注入点**（Task A 失败）：可能 SDK 路径变了,改搜 `extension` + `rule` 组合,或读 `sdk/packages/core/src/runtime/` 目录树
- **若探查完成后框架 runtime-plugin 返工 ≤ 1 次**：证明源码探查有效,可降级本规划为参考案例
- **若探查完成后返工 ≥ 2 次**：证明探查不充分,需补 Task F（runtime 实测验证）

## 六、汇总产出目标

5 个 subagent 完成后,汇总产出一张完整的 cline 提示词分层注入图,作为框架 runtime-plugin 设计的依据。特别要回答：

1. **框架应该用 `registerRule` 还是 `registerMessageBuilder` 注入 constitution？**（已知 ADR-007 选 registerRule,但需源码验证）
2. **内置 RULES 段落是否覆盖 registerRule？**（影响 constitution 的强约束力设计）
3. **是否存在长度截断风险？**（影响 constitution ≤800 token 上限是否合理）

汇总产出归档为 `docs/decisions/investigation/investigation-note-cline-prompt-layering.md`,并触发框架 runtime-plugin 设计文档的更新（若探查结果与 ADR-007 假设有冲突,启动 ADR-007 复审）。

## 七、引用

- [juejin 源码浅析](https://juejin.cn/post/7515378780371419162) — system.ts 装配顺序总览
- [ADR-007](../adr/ADR-007-snapshot-registerRule-static-injection.md) — registerRule 静态注入决策
- [hook-auto-injection-design.md](../hook-auto-injection-design.md) — Hook 化分层判据
- [context-snapshot/src/index.ts](../../../context-snapshot/src/index.ts) — hook 实现范本
