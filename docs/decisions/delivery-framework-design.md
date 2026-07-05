# 交付框架设计：分发形态 + 目录契约

> **生命周期**：版本绑定 — v1.0 框架定型后归档，后续变更走 ADR。
>
> **身份**：GV-7 决策产出。本文档是 GV-1 / GV-6 / EX-* 的填空模板——契约一旦定下，后续填充无返工。
>
> **修订记录**：v1.0 初版；v1.1 吸收三份外部建议（EX-1 拆分 / .clinerules 补位 / runtime 条件式可删 / Capability 接口约定 / .governance 命名空间包裹 / rule-appender 最小追加回路 / handoff 待沉淀区 / README 默认引导方向）；v1.2 冻结前检查清单修复（lifecycle.md 登记 / 薄入口量化 / 软依赖升级为硬前置 / examples 假设清单 / 接口类型范围锁定 / post-tool 交付边界明确 / 删除矩阵副作用点明）。

---

## 一、分发形态锁定

**决策**：git template repo（本次唯一形态）

| 维度 | 选择 | 理由 |
|------|------|------|
| 形态 | git template repo | `git clone` 即用，可 fork 定制 |
| 不做 | CLI plugin 打包 / npm 包 / VS Code 扩展 | 不在收尾阶段开双形态实现坑 |
| 版本管理 | git tag（v1.0 / v1.1 ...）| 无需 npm registry |
| 用户获取 | `git clone <repo>` 或 `Use this template` | 零依赖，零安装工具链 |

**CLI plugin 作为后续扩展**：Runtime/Hook 功能（RT-1~5 / HK-1~4）在 CLI 端已部分可跑，但本次不把 CLI plugin 作为独立分发形态——它作为 capabilities/ + hooks/ 的实现代码存在于 template repo 中，用户自行决定是否启用。

---

## 二、安装落位映射（repo 结构 → 用户项目）

> **核心问题**：用户不是拿 template repo 当独立项目，而是叠加到自己已有代码的项目里。8 个顶层条目平铺会污染用户工作目录根部。
>
> **解决方案**：框架自有物收进 `.governance/` 命名空间（点前缀，与 `.git` / `.vscode` 同语义——"工具的，不是你项目内容的"）。

### 2.1 repo 结构（template repo 本身）

```
governance-template/
├── .governance/
│   ├── core/
│   │   └── constitution.md
│   ├── rules/
│   │   ├── handoff-entry.md
│   │   └── lifecycle.md
│   ├── examples/
│   │   ├── dev-rules.md
│   │   ├── evidence-governance.md
│   │   ├── reviewer-personas.md
│   │   └── handoff-example.md
│   ├── capabilities/
│   │   ├── git-checker/
│   │   ├── snapshot-writer/
│   │   ├── handoff-provider/
│   │   └── rule-appender/
│   ├── hooks/
│   │   ├── session-start/
│   │   ├── pre-tool/
│   │   ├── post-tool/
│   │   └── pre-compact/
│   └── runtime/
│       └── snapshot.json
├── .clinerules                    # Cline 加载入口（薄入口，指向 .governance/）
├── HANDOFF.md                     # 高频人工交互文件，可见放根部
├── README.md                      # 安装 + 使用说明
└── LICENSE
```

### 2.2 安装后落位（用户项目里）

```
用户的项目/
├── src/                           ← 用户自己的
├── package.json                   ← 用户自己的
├── docs/                          ← 用户自己的
├── .git/                          ← git 的
├── .vscode/                       ← VS Code 的
├── .clinerules                    ← 框架入口（Cline 机制要求根部，薄入口）
├── HANDOFF.md                     ← 框架活文件（高频人工交互，可见放根部）
└── .governance/                   ← 框架自有物，一个目录收完
    ├── core/
    ├── rules/
    ├── examples/
    ├── capabilities/
    ├── hooks/
    └── runtime/
        └── snapshot.json
```

**根部污染**：从平铺 8 项降到 2 项（`.clinerules` + `HANDOFF.md`），且 `.governance/` 点前缀在大多数文件浏览器和 `ls` 里默认隐藏。

### 2.3 为什么 HANDOFF.md 留根部而非埋进 .governance/

| 候选位置 | 整洁性 | 可发现性 | 判定 |
|---------|--------|---------|------|
| `.governance/runtime/handoff.md` | 高（隐藏）| 低（埋深 + 点前缀）| ✗ 活文件不该藏 |
| `HANDOFF.md`（根部）| 中（多一个根条目）| 高（用户每次会话读写）| ✓ 选用 |

**判据**：`handoff.md` 是高频人工交互文件，可发现性 > 整洁性。`snapshot.json` 是机器写、人不读，埋进 `.governance/runtime/` 无妨。

---

## 三、各目录契约

### `.clinerules` — Cline 加载入口

| 维度 | 约定 |
|------|------|
| **存什么** | 薄入口文件。内容只指向 `.governance/core/` 和 `.governance/rules/`，不承载治理内容本身 |
| **加载机制** | Cline 原生机制自动读取根部 `.clinerules` |
| **可删?** | ❌ 不可删——Cline 加载链起点 |
| **为什么在根部** | Cline 硬约束：加载入口不在根部不生效 |
| **填空项** | `.clinerules` ← GV-7 附带产出（依赖 rules/ 与 examples/ 边界确定）|

### `.governance/core/` — L1 Core Constitution

| 维度 | 约定 |
|------|------|
| **存什么** | ≤800 token 跨项目通用治理原则。只保留判定动作（"检查什么"），去掉项目特定取值（"用哪个数"）|
| **加载机制** | registerRule 静态注入（SessionStart 时求值一次，永久存在）|
| **可删?** | ❌ 不可删——框架基石 |
| **用户动作** | 可编辑（改写为自己的原则），不可删除文件 |
| **填空项** | `core/constitution.md` ← GV-1 |

### `.governance/rules/` — L2 Project Rules（薄入口）

| 维度 | 约定 |
|------|------|
| **存什么** | 框架**必需**的加载入口规则。只放"装好即生效"的薄规则（如 handoff 机制入口），不放完整治理内容 |
| **与 examples/ 的边界** | rules/ = 装好即生效的机制入口；examples/ = 需手动复制才生效的完整参考实现 |
| **加载机制** | Cline Rules 条件加载（按路径 / 按任务类型触发）|
| **可删?** | ⚠️ 入口规则不建议删（框架机制依赖）；用户自加的规则可删 |
| **用户动作** | 修改入口规则；从 examples/ 复制完整规则进来；加自己的规则 |
| **薄度量化** | 每份入口规则 ≤ 50 行，只含路径引用 + 触发条件 + 一句话机制说明，禁止承载完整治理内容。与 core/ 的 ≤800 token 形成一致的防膨胀纪律 |
| **填空项** | `rules/handoff-entry.md`（薄入口，指向 handoff 机制）← EX-1a；`rules/lifecycle.md`（待沉淀区晋升流程 + 文档生命周期标注）← EX-1a |

### `.governance/examples/` — 可选参考实现包

| 维度 | 约定 |
|------|------|
| **存什么** | 从 cline++ 三周实战蒸馏的通用化规则参考实现。不是空模板，是"填好的例子" |
| **加载机制** | **不自动加载**——用户手动参考或复制到 rules/ 后才生效 |
| **可删?** | ✅ 整个目录可删——删了框架照跑 |
| **用户动作** | 照着改 / 复制到 rules/ / 直接删 |
| **填空项** | `examples/dev-rules.md` ← EX-1b，`examples/evidence-governance.md` ← EX-2，`examples/reviewer-personas.md` ← EX-3，`examples/handoff-example.md` ← EX-4 |
| **README 引导** | **保留 examples/ 照着改是推荐路径**；"删 examples/ 得纯骨架"只是老手可选项，不作默认推荐 |
| **假设清单强制** | 每个 example 文件头部**必须**含一个"cline++ 特定假设清单"区块，显式暴露通用化的漏网之鱼（如"本规则假设存在 evidence/ 目录" / "本规则假设 PowerShell 环境"）。让第二个项目接入时能一眼看到需要改什么，而不是等 dogfood 撞上 |

### `HANDOFF.md` + `.governance/runtime/` — L5 Runtime State

| 维度 | 约定 |
|------|------|
| **存什么** | 动态状态文件。`HANDOFF.md` 用户填（含交接笔记 + **待沉淀经验区**）；`snapshot.json` Hook 写 |
| **加载机制** | SessionStart hook 读取 → additionalContext 注入；PreCompact hook 写入 snapshot.json |
| **可删性（条件式）** | **启用 Hook 时**：不可删（Hook 依赖）；**不用 Hook 时**：`HANDOFF.md` 可保留为手工笔记，`snapshot.json` 可删（无写入者，成死文件）|
| **HANDOFF.md 结构** | 必须包含"待沉淀经验"结构化区块（不只是自由文本），供 rule-appender 追加 |
| **填空项** | 空 `HANDOFF.md` 模板（含待沉淀区）+ 空 `snapshot.json` 结构 |

**HANDOFF.md 待沉淀区格式**：

```markdown
## 待沉淀经验

> 此区由 rule-appender 自动追加，人工 review 后晋升到 rules/ 或删除。
> 晋升流程见 .governance/rules/lifecycle.md。

| id | 经验 | 来源 | 沉淀日期 | 状态 |
|----|------|------|---------|------|
|（空，rule-appender 追加）|
```

### `.governance/capabilities/` — L3 Capability Modules

| 维度 | 约定 |
|------|------|
| **存什么** | 可复用能力模块。每个模块是"怎么做"的代码实现，不含"什么时候调用"（那是 Hook 的职责）|
| **加载机制** | Hook 调用——Hook 决定时机，Capability 决定执行 |
| **可删?** | ❌ 不可删（Hook 依赖）；可扩展（用户加自己的 Capability）|
| **用户动作** | 不改（除非 fork 定制）；加自己的 Capability |
| **填空项** | 4 个 Capability 设计 ← GV-6 |

**Capability 清单**：

| Capability | 职责 | 调用方 |
|-----------|------|-------|
| `git-checker` | git status 检测 | pre-tool（阻断）/ session-start（注入）|
| `snapshot-writer` | 快照写入 | pre-compact |
| `handoff-provider` | handoff 读取 + 注入 | session-start |
| `rule-appender` | 经验追加到 HANDOFF.md 待沉淀区 | 手动触发 / post-tool（未来）|

### `.governance/capabilities/` — Capability 接口约定

> **源由**：同一个 Capability 可被多个 Hook 复用（如 git-checker 既被 pre-tool 调用做阻断，也被 session-start 调用做注入）。这要求 Capability 有统一调用接口，否则返回值语义（阻断信号 vs 注入文本）无法区分。

**最小接口契约**：

```typescript
interface CapabilityResult {
  intent: "pass" | "block" | "inject";
  data?: string | object;          // block 时附 reason；inject 时附 additionalContext
  metadata?: Record<string, any>;  // 诊断信息（如检测到的文件数）
}

interface CapabilityInput {
  context: SessionContext;         // 会话状态（cwd / git branch / 已加载 rules）
  trigger: HookEvent;              // 触发此调用的 Hook 事件
  args?: any;                      // Capability 特定参数
}

type Capability = (input: CapabilityInput) => Promise<CapabilityResult>;
```

**本契约锁定范围**：仅 `CapabilityResult` 的三态语义（pass/block/inject）是本契约锁定的结构性约束。`SessionContext` 与 `HookEvent` 两个类型的完整字段定义由 GV-6 补齐，本契约不锁定——避免过早约束 GV-6 的设计空间。

**intent 语义**：

| intent | 含义 | 调用方动作 | 适用 Hook |
|--------|------|-----------|----------|
| `pass` | 不干预 | 继续工具调用 | 所有 |
| `block` | 阻断 | 取消工具调用，附 reason 给模型 | PreToolUse |
| `inject` | 注入上下文 | additionalContext 注入 | SessionStart / PreToolUse / PreCompact |

**调用方（Hook）根据 intent 决定动作**，Capability 不直接干预——它只表达意图，Hook 执行。这保证了同一个 Capability 被不同 Hook 调用时行为一致。

### `.governance/hooks/` — L4 Hook Definitions

| 维度 | 约定 |
|------|------|
| **存什么** | 事件驱动检查/注入/阻断。每个 Hook 绑定一个生命周期事件，调用 Capability 执行 |
| **加载机制** | Cline Hooks 生命周期自动触发 |
| **可删?** | ⚠️ 单个 Hook 可删（不用就删），目录结构保留 |
| **用户动作** | 启用/禁用单个 Hook；加自己的 Hook |

---

## 四、加载顺序

```
Session 启动
  ├─ 1. .clinerules 触发
  │     └─ Cline 原生机制读取根部 .clinerules
  ├─ 2. .governance/core/constitution.md
  │     └─ registerRule 静态注入（一次性，永久存在于系统提示词）
  ├─ 3. hooks/session-start/ 执行
  │     ├─ 调用 capabilities/handoff-provider
  │     ├─ 读 HANDOFF.md → additionalContext 注入
  │     └─ 读 .governance/runtime/snapshot.json → additionalContext 注入
  └─ 4. .governance/rules/ 按场景条件加载
        └─ Cline 原生 Rules 机制（按路径/任务类型触发）

Session 进行中
  ├─ 5. hooks/pre-tool/ 执行（每次工具调用前）
  │     └─ 调用 capabilities/git-checker（dirty 检测 ≥N → block）
  ├─ 6. hooks/post-tool/ 执行（每次工具调用后）
  │     └─ 【本次交付：纯占位，无可跑 Capability】用户可自加 lint/test；rule-appender 未来接入
  └─ 7. .governance/rules/ 按需加载
        └─ 如进入评审场景加载 review 规则（从 examples/ 复制后）

Session 压缩
  └─ 8. hooks/pre-compact/ 执行
        └─ 调用 capabilities/snapshot-writer → 写 .governance/runtime/snapshot.json

经验沉淀（手动触发 / 未来 post-tool 自动）
  └─ 调用 capabilities/rule-appender
        └─ 追加到 HANDOFF.md 待沉淀区 → 人工 review → 晋升到 rules/ 或删除
```

**关键分离**：
- **Capability（怎么做）与 Hook（什么时候调用）正交**——同一个 Capability 可被多个 Hook 复用
- **判断由人做，追加由机器做**——rule-appender 只负责机械追加，"该不该沉淀"的判断由人完成

---

## 五、删除矩阵

| 用户场景 | 删什么 | 保留什么 | 结果 |
|---------|--------|---------|------|
| **完整示例（推荐默认）** | 不删 | 全部 | 照着 examples/ 改 |
| **自建规则** | rules/ 入口规则删 | core/ + 自建 rules/ + HANDOFF.md + .governance/ | 骨架 + 自定义 |
| **最小安装** | examples/ 全删 | core/ + rules/ + runtime/ + capabilities/ + hooks/ | 纯骨架，用户自建规则 |
| **不用 Hook** | hooks/ 全删 + capabilities/ 全删 + snapshot.json 删 | core/ + rules/ + HANDOFF.md（手工维护）| 纯文档治理，无自动化。**副作用**：rule-appender 随 capabilities/ 删除而消失，HANDOFF.md 待沉淀区退化为纯手工表格，失去自动追加能力 |
| **只用宪法** | 其他全删 | .governance/core/constitution.md + .clinerules | 一页纸治理 |

**runtime/ 条件式可删性说明**：
- 启用 Hook 时：HANDOFF.md + snapshot.json 均不可删（Hook 依赖）
- 不用 Hook 时：HANDOFF.md 可保留为手工笔记；snapshot.json 无写入者，可删

---

## 六、填空映射

本契约是后续工作的填空模板，每个位置由对应积压项填充：

| 契约位置 | 填什么 | 积压项 | 依赖 |
|---------|--------|--------|------|
| `.clinerules` | 薄入口，指向 .governance/core/ 和 .governance/rules/ | GV-7 附带产出 | rules/ 与 examples/ 边界确定（已定）|
| `.governance/core/constitution.md` | ≤800 token 通用宪法（保留判定动作，去项目取值）+ "经验机制化"原则配手动触发动作 | GV-1 | 无 |
| `.governance/rules/handoff-entry.md` | 薄入口规则（指向 handoff 机制，装好即生效）| EX-1a | GV-1 rubric（硬前置）|
| `.governance/rules/lifecycle.md` | 待沉淀区晋升流程 + 文档生命周期标注 | EX-1a | GV-1 rubric（硬前置）|
| `.governance/examples/dev-rules.md` | 通用化后的执行边界规则（完整版）| EX-1b | GV-1 rubric（硬前置）|
| `.governance/examples/evidence-governance.md` | 通用化后的证据状态机 | EX-2 | GV-1 rubric（硬前置）|
| `.governance/examples/reviewer-personas.md` | 通用化后的评审角色 | EX-3 | GV-1 rubric（硬前置）|
| `.governance/examples/handoff-example.md` | 填写示例 | EX-4 | GV-1 rubric（硬前置）|
| `HANDOFF.md` | 空模板（含待沉淀经验区结构化区块）| — | 无 |
| `.governance/runtime/snapshot.json` | 空结构 | — | 无 |
| `.governance/capabilities/git-checker/` | git status 检测能力设计 | GV-6 | 本契约（接口约定）|
| `.governance/capabilities/snapshot-writer/` | 快照写入能力设计 | GV-6 | 本契约（接口约定）|
| `.governance/capabilities/handoff-provider/` | handoff 读取+注入能力设计 | GV-6 | 本契约（接口约定）|
| `.governance/capabilities/rule-appender/` | 经验追加到 HANDOFF.md 待沉淀区 | GV-6 | 本契约（接口约定）+ HANDOFF.md 待沉淀区格式 |

**执行顺序**：

```
GV-7（本契约，已完成）
  ↓
GV-1 先行：确立通用化 rubric（保留判定动作 / 去项目取值的判定清单）
  ↓        ← rubric 未定，EX-* 不开工（硬前置）
EX-1a + EX-1b + EX-2~4 并行（照 rubric 蒸馏，无返工）
  ↓
GV-6（依赖本契约的 capabilities/ 定义 + 接口约定）
```

**GV-1 作为 EX-* 硬前置的理由**：原 v1.1 把 GV-1 与 EX-* 的关系标为"软依赖"，但填空映射表里 EX-1a/EX-4 标"无依赖"、EX-1b/EX-2/EX-3 标"软依赖"，执行时极易因风格漂导致返工。统一升级为硬前置：**rubric 未定，EX-* 不开工**。rubric 本身是轻产出（一段判定清单），GV-1 半步即可确立，不会实质拖延 EX-* 启动。

---

## 七、经验沉淀最小回路

> **源由**：Core Constitution 写了"经验机制化"原则，但若无任何机制承接，就是宪法开空头支票。完整治理引擎（自动判断该不该沉淀）依赖被阻塞的 hook，不在本次交付范围。
>
> **方案**：交付"人判断、机器追加"的最小回路，兑现宪法承诺；完整治理判断留在阻塞后续集。

### 本次交付（种子）

```
人判断"这值得沉淀"
  ↓
调用 capabilities/rule-appender
  ↓
追加到 HANDOFF.md 待沉淀区（结构化）
  ↓
人工 review（rules/lifecycle.md 定义晋升流程）
  ↓
晋升到 .governance/rules/ 或删除
```

- **判断由人做**：用户/AI 判断"这值得沉淀"
- **追加由机器做**：rule-appender 机械追加到待沉淀区
- **晋升由人做**：review 后手动移动到 rules/，不自动晋升

### 阻塞后续集（完整机制）

- 自动判断"经验该不该沉淀"（需要 PostToolUse hook + 语义判断，等 BL-1 解除）
- 自动退役扫描（HK-4，等 BL-1 解除）
- 沉淀分层的自动路由（临时/正式/宪法级）

**反向提醒**：别让"难用"这个感觉推回过度工程。成熟治理体系（ADR、conventional commits）是低自动化、高约定的——好用是因为约定清晰、门槛低，不是因为有引擎自动帮你写。examples/ 示例包 + 一条手动追加回路，可能已足够让框架"不难用"。先交付最小回路，让第二个项目 dogfood 时用真实痛点告诉你到底还缺哪些自动化。

---

## 八、已知局限

| 局限 | 状态 | 缓解 |
|------|------|------|
| 框架仅在 cline++ 一个项目 dogfood 过 | 未验证通用性 | examples/ 示例包降低用户自建门槛；等第二个项目验证 |
| VS Code 端 Hook 全部阻塞 | 受 BL-1 阻塞 | CLI 端先跑通，VS Code 恢复后即插即用 |
| Core Constitution 通用化未经验证 | 设计意图非事实 | 保留判定动作而非空泛原则，降低过拟合风险 |
| hooks/ + capabilities/ 当前为设计文档 | 非可跑代码 | 本次交付设计 + CLI 端可跑部分；完整实现等 BL-1/BL-2 解除 |
| 完整治理引擎未交付 | 设计意图非事实 | 最小回路（rule-appender）兑现宪法承诺；完整引擎等阻塞解除 |

---

## 九、本次可交付 vs 阻塞后续

| 集合 | 内容 | 用户能立即用? |
|------|------|-------------|
| **本次可交付** | 本契约 + .clinerules 入口 + GV-1 宪法（含通用化 rubric）+ EX-1a/1b + EX-2~4 示例包 + GV-6 Capability 设计（含 rule-appender）+ CLI 端可跑的 hooks（session-start / pre-tool / pre-compact）+ HANDOFF.md 模板（含待沉淀区）。**post-tool hook 为纯占位，无可跑 Capability** | CLI 用户能；VS Code 用户用模板+示例 |
| **阻塞后续** | RT-2 snapshot 实测 + HK-1 循环检测实测 + VS Code 端全部 Hook + post-tool 可跑 Capability + 完整治理引擎（自动判断/退役/路由）| 等 BL-1/BL-2 解除 |
