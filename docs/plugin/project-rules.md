# Project Rules — Plugin (context-snapshot) 开发期约束

> **生命周期**：功能绑定 — context-snapshot plugin 开发，功能冻结后删除（跨功能通用规则迁入 dev-rules.md）。

---

## 1. 构建产物约束（E 盘零散落）

扩展开发过程中产生的**非源码文件**必须遵守以下 confinement 规则：

### 1.1 编译输出

- tsc 编译输出**必须**指定 `--outDir` 到子项目内部目录（如 `context-snapshot/dist/`）
- `dist/` 已在 `.gitignore` 中，不入库
- **禁止**在 E 盘根目录或其他子项目目录生成编译产物
- 若需要覆盖 `package.json` 的 `"type": "module"` 以支持 CommonJS 编译，在 `dist/` 内放置 `package.json` override（`{"type": "commonjs"}`），不修改主 `package.json`

### 1.2 临时测试脚本

- 验证脚本（.cjs / .mjs / .ps1）**必须**放在对应子项目目录内（如 `context-snapshot/verify-extractors.cjs`）
- 验证脚本**必须**能自包含运行（不依赖外部路径）
- 纯临时脚本（一次性使用后不再需要）**必须**在验证完成后立即删除
- **禁止**在 E 盘根目录创建测试脚本

### 1.3 测试日志与 debug 标记

- 插件运行时产生的 debug 日志（hook-debug.log / detection.log / rule-eval.log）**必须**写入 `~/.cline/data/snapshot/`（插件数据目录），不写入源码目录
- debug 标记代码（appendFileSync 等）**必须**带 `// ── DEBUG MARKER (temporary)` 注释，提醒后续清理
- 验证完成后**必须**移除所有 debug 标记代码
- `.log` 文件已在 `.gitignore` 中，不入库

### 1.4 插件安装目录

- 安装目录为 `~/.cline/plugins/installed/local/context-snapshot/`
- 安装方式是 **COPY**（非 symlink）——子模块更新后**必须**手动 `Copy-Item -Recurse -Force` 同步
- **禁止**直接在安装目录编辑源码（源码在子项目 `context-snapshot/src/` 中维护）
- 安装目录中的 `package.json.disabled` 备份文件不影响插件加载，但应保持清理

### 1.5 Cline 工作区临时文件

- Cline CLI 在 `E:\cline++` 下可能产生的临时文件（如 `.cline-tmp/`、`cline.log`）由 CLI 自行管理
- agent 不得在 `E:\cline++` 根目录创建 `.log` / `.tmp` / `.bak` 等临时文件
- 若工具脚本需要输出中间结果，使用 `context-snapshot/dist/` 或 `~/.cline/data/snapshot/`

---

## 2. 扩展编写工作流约束

### 2.1 源码修改 → 安装同步 → 测试 三步流程

每次修改插件源码后，**必须**按顺序执行：

1. 编辑 `E:\cline++\context-snapshot\src\*.ts`
2. `Copy-Item -Recurse -Force` 同步到安装目录
3. 用户在真实终端执行 `cline -v` 测试（§1.2 TTY 约束）

**禁止**跳过步骤 2 直接测试（安装目录可能是旧版本）。

### 2.2 类型声明查阅

- 插件 API 类型声明位于 `E:\node-global\node_modules\cline\node_modules\@cline\shared\dist\`
- 关键文件：`agent.d.ts`（AgentRuntimeHooks）、`extensions/contribution-registry.d.ts`（AgentExtensionApi / PluginSetupContext）
- **禁止**猜测 API 字段名——必须先读 .d.ts 确认

### 2.3 registerRule vs registerMessageBuilder

| 机制 | CLI 3.0.34 行为 | 适用场景 |
|------|---------------|---------|
| `registerRule` content 函数 | **只在 session 启动时评估一次** | 静态内容（如 snapshot context） |
| `registerMessageBuilder` build 函数 | **每次 model request 都调用** | 动态内容（如 loop guard warning） |

**禁止**用 registerRule 做动态 per-turn 注入（已验证为死路径）。

---

## 3. 治理类规则（context-snapshot 开发期项目级承载）

> **定位**：本节承载 context-snapshot 开发期间不适合放入 dev-rules.md（顶层冻结，dev-rules §6 硬约束）的项目级治理规则。功能结束后按迁移判据评估是否迁入顶层。

### 3.1 P 级 handoff 触发器（context-snapshot 专属）

**触发条件**（满足任一即触发）：
- P0/P1 任务全部完成，或
- 单个 P0/P1 达到最终状态（Verified 实测通过 + 文档闭环）

**触发动作**：
1. 写入 handoff.md
2. confidence 字段必须标注（取值与 [evidence-governance.md §4](../evidence-governance.md) 一致：Verified / Likely / Hypothesis）
3. 未完成项必须列出（即使全部 P0/P1 完成，中/低优先级项也要列入"未完成项"表，三字段按 dev-rules §2.2 强制）

**context-snapshot 的 P 级定义**（开发期）：
- P0：codec bug 修复路径（A1 content type fix / V6 Loop Guard 实现）
- P1：v0.7.0 提取器完成（A4 Phase 4 验证通过）

**为什么属于项目级**：dev-rules §2 通用触发器（触发器 a 用户口头要求 / 触发器 c 对话过长 + 话题跳转）不含"P 级任务完成"——P 级定义因项目而异。context-snapshot 的 P 级是 codec bug 修复 / V6 实现 / 提取器完成，其他项目（如 search-orchestrator）的 P 级定义不同。通用层无法枚举所有项目的 P 级语义，故下沉到项目级。

### 3.2 教训沉淀位置约定（context-snapshot 开发期）

context-snapshot 开发期产生的教训按下列位置约定沉淀：

| 教训 ID | 内容 | 沉淀位置 | 层级归属理由 |
|---------|------|---------|------------|
| L1 | 契约优先（先读 .d.ts 确认 API 字段名） | plugin-dev-sop §1 Step1（已有） | 通用 plugin 开发流程，跨插件复用 |
| L2 | 死代码也要修（codec bug 同模式复发） | **本文件 §3.2（本表）** | context-snapshot 特有——codec bug 在 beforeModel / compaction.ts 等多处同模式复发 |
| L3 | workaround ≠ 环境可用 | dev-rules §1.15 禁止条款（已存在） | 通用约束——任何项目遇不可抗力都适用 |
| L4 | 单源声明降级 Hypothesis | evidence-governance §6（已存在） | 通用证据规则 |
| L5 | 日期异常是幻觉强信号 | evidence-governance §6（已存在） | 通用证据规则 |
| L6 | 命题三翻触发流程审查 | dev-rules §1.10 / project_memory 硬约束（已存在） | 跨项目通用 |
| L7 | minified 代码只用于定位 | dev-rules §1.7（已存在） | 通用约束 |
| L8 | 模型可能误读 SKILL 文件 | project_memory（已存在） | 跨项目 |

**新增规则**：本开发期内新教训优先沉淀到本文件 §3.2（本表），功能结束后再评估是否迁入顶层 dev-rules.md。评估判据：教训与 context-snapshot 特有的 codec bug / 提取器 / Loop Guard 强相关 → 留项目级；与具体功能无关且预期被下一个扩展项目复用 → 迁顶层。

**为什么属于项目级**：每个项目的教训集合不同（context-snapshot 的 L2 死代码同模式复发是其特有教训），沉淀位置需项目级约定。顶层 dev-rules 只承载已验证跨功能通用的教训（L3/L4/L5/L6/L7/L8），项目特有教训（L1/L2）留在项目级。

### 3.3 handoff schema 特化字段（context-snapshot 专属）

在 dev-rules §2.2 通用三字段（id / confidence / depends_on）基础上，context-snapshot handoff 的"未完成项"表增加以下项目特化字段：

| 特化字段 | 规则 | 示例 |
|---------|------|------|
| `blocker_ref` | 受 dev-rules §1.15 阻塞的项，引用不可抗力声明行（dev-rules §1.15 表中"环境"列） | `CLI 3.0.34 codec bug` |
| `codec_status` | codec bug 当前状态（PR 编号 + 状态） | `PR #12032 Open` |
| `verified_evidence` | 本会话 Verified 证据的 commit hash（context-snapshot 仓库） | `659dd1c` |

**填写约束**：
- `blocker_ref` 仅当 depends_on 含 `codec-bug-fix` 时填写
- `codec_status` 仅当 `blocker_ref` 非空时填写
- `verified_evidence` 仅当 confidence = Verified 时填写

**为什么属于项目级**：这些字段与 context-snapshot 的 codec bug 阻塞强相关（blocker_ref / codec_status 直接引用 dev-rules §1.15 不可抗力声明），其他项目无此阻塞场景，不需要这些字段。通用三字段（id/confidence/depends_on）已由 dev-rules §2.2 强制，项目级只追加特化字段。

### 3.4 项目级评审角色配置

从 reviewer-personas §2 降级的 5 个角色中，context-snapshot 开发期可能需要的：

| 角色 | 用途 | 当前状态 |
|------|------|---------|
| SE Reviewer | ADR 评审（context-snapshot 有 ADR-001~005） | 按需启用 |
| Senior Agent Developer Reviewer | agent 异常流程评审（如 codec bug 触发的 Loop Guard 重设计） | 已活跃 |
| Process Reviewer | 工作流触发-执行-退出全生命周期审查 / 流程闭环 / 根因分析 / 状态值约定一致性 | 按需启用（本次 §3 章节补全任务已启用） |
| Reliability Reviewer | 失败模式 / 长对话崩溃分析 | 按需启用 |
| Security/API Reviewer | 插件 API 边界 / hook 注入安全 | 按需启用 |

**启用规则**：遇 ADR 评审 → SE Reviewer；遇 agent 异常流程 → Senior Agent Developer Reviewer；遇工作流闭环问题 → Process Reviewer；遇失败模式分析 → Reliability Reviewer；遇 API 边界 → Security/API Reviewer。调用方式按 dev-rules §1.11 / §1.12 执行（角色提示词注入子代理 query）。

**为什么属于项目级**：不同项目需要的评审角色不同（如 search-orchestrator 不需要 SE Reviewer 评审 ADR，但需要 Reliability Reviewer 评审搜索质量）。reviewer-personas §2 提供全集，项目级按需配置子集。

### 3.5 外部依赖版本变化重测流程（F5，context-snapshot 开发期）

> **来源**：审查 F5——外部依赖版本变化工作流缺失（Cline 正常升级如何重测）。

**触发条件**：Cline CLI 版本升级（`cline --version` 变化）或 VS Code 扩展版本升级。

**重测流程**（按序执行）：
1. **记录版本变化**：在 handoff.md 或本文件记录旧版本 → 新版本号 + 升级日期
2. **核查 §1.15 不可抗力**：升级是否解除任何不可抗力项？（如 codec bug 修复 → 按 §1.15 解除流程执行）
3. **回归测试**：重跑上一个版本的 plugin 核心功能（setup 加载 / hook 触发 / messageBuilder 注入 / 提取器输出）
4. **核查 API 契约**：读新版本 `.d.ts` 类型声明，确认 plugin API 未 breaking change（按 §2.2 类型声明查阅规则）
5. **更新证据时效**：若升级影响 ADR 结论，按 [evidence-governance §15](../evidence-governance.md) 更新 `evidence_as_of`

**为什么属于项目级**：重测流程的"重跑哪些功能"因项目而异——context-snapshot 重跑 setup/hook/messageBuilder，其他项目重跑不同功能。通用层只规定"升级后必须重测"，项目级规定"重测什么"。

### 3.6 通用报错处理工作流（F6，context-snapshot 开发期）

> **来源**：审查 F6——通用报错处理工作流缺失（plugin-dev-sop §2 仅覆盖 plugin 开发报错，不覆盖运行时报错）。

**运行时报错处理流程**（plugin 运行时遇到错误时）：
1. **记录完整错误**：错误消息 + 堆栈 + 触发场景（哪个 hook / 哪个工具调用）
2. **分类**：① plugin 代码 bug ② Cline API 契约变化 ③ 环境问题（§1.15 不可抗力）④ 模型行为
3. **按分类处理**：
   - ① plugin 代码 bug → 按 §2.1 三步流程修复
   - ② API 契约变化 → 按 §3.5 版本变化重测流程处理
   - ③ 环境问题 → 登记 §1.15 不可抗力 + 找 workaround
   - ④ 模型行为 → 记录为 Observation，纳入 mechanism-candidates
4. **沉淀教训**：若报错揭示新教训，按 §3.2 教训沉淀位置约定落入对应层级

**为什么属于项目级**：报错分类的"哪些属于 plugin bug vs 环境问题"因项目而异。通用层无法枚举所有项目的报错分类，项目级按本项目特点定义分类标准。

### 3.7 跨会话续作读取门控（context-snapshot 开发期）

> **来源**：mechanism-candidates #6 状态升级——读取流程从"建议"升级为"规则"。注入机制（plugin rules 自动注入 handoff 内容）仍候选，受 §1.15 阻塞。

**新会话首动作门控**（必须按序执行，不得跳过）：

1. 读 [dev-rules.md](../dev-rules.md) 全文——跨功能通用防漂移规则 + §1.15 不可抗力声明
2. 读 [handoff.md](../handoff.md) 全文——上一会话快照（决策 / 净变化 / 未完成项）
3. 读 [plugin/project-rules.md](project-rules.md) §3 治理类规则——context-snapshot 开发期项目级规则承载位
4. 读 [evidence-governance.md](../evidence-governance.md) §15 ADR 时效 + §19 Hypothesis 生命周期——检查引用的 ADR/Hypothesis 是否超期

**门控判据**（读完前 4 项前禁止启动任何开发动作）：

- 若 handoff.md 标注"P 级任务待续"→ 优先续作 P 级任务，不开启新方向
- 若 handoff.md 未完成项中 confidence = Verified 的项 → 可直接作为推理依据
- 若 handoff.md 未完成项中 confidence = Likely / Hypothesis 的项 → 需按 [evidence-governance §19](../evidence-governance.md) 检查是否超期，超期项降级为 Unknown 后不得作为依据
- 若引用的 ADR `expires_if_unchanged` 已超期 → 按 [evidence-governance §15](../evidence-governance.md) 降级为 Hypothesis，触发复查

**会话结束前必写**（与读取门控对偶）：

- handoff.md 必须更新（dev-rules §2 通用触发器 + 本文件 §3.1 P 级触发器）
- 未完成项三字段（id / confidence / depends_on）必须填齐（dev-rules §2.2 强制）
- 若有 P 级任务状态变更，§3.3 特化字段（blocker_ref / codec_status / verified_evidence）按条件触发填写

**为什么属于项目级**：读取门控的"读哪些文件"因项目而异——context-snapshot 需读 plugin/project-rules.md §3，其他项目（如 search-orchestrator）需读 search/project-rules.md。通用层（dev-rules §2）只规定"何时写 handoff"，不规定"新会话读哪些文件"——因项目级规则文件路径不同，无法在通用层枚举。读取门控的通用部分（读 dev-rules + handoff）已隐含在 dev-rules §1 各条款中，项目级追加项目专属文件（plugin/project-rules.md §3）。

**机制化状态**：
- ✅ 读取流程规则化（本节 + handoff.md 末尾"新会话首动作"提示）
- ⏳ 注入机制候选（plugin rules 自动注入 handoff 内容，受 §1.15 阻塞，待 codec bug 修复后评估）

---

## 本文件的生命周期

- 功能绑定 — context-snapshot plugin 开发
- 维护节奏：开发期间随发现随添加；功能冻结后，跨功能通用规则迁入 `dev-rules.md`，本文件删除
- 迁移判据：与具体 plugin 无关、且预期被下一个扩展项目复用的规则才迁入
