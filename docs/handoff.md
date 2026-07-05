# Handoff — CLI 端插件加载验证通过

> **生命周期**：每次覆写，无归档——会话交接文件。
> **进入规则**：会话开始时先读 `plugin/project-rules.md`（若未归档），再读本文件。

## 本会话决策

| id | 决策 | confidence | depends_on |
|----|------|-----------|------------|
| `runtime-plugin-newbuild` | ✅ 已完成。框架 CLI 端运行时新造完成,4 个开放问题全部回答并落地实现。单 plugin + 静态导入 + config 驱动分发 + Raw TS 无预编译 + `.governance/plugin/` 目录。tsc 零错误,rule-appender 33 测试零回归 | Verified | `cline-prompt-layering-research` |
| `capability-impl-git-checker` | ✅ 已完成。git-checker Capability 实现(index.ts + types.ts),借鉴 context-snapshot/src/git-status-checker.ts 新造为零依赖纯函数。tsc 通过 | Verified | `runtime-plugin-newbuild` |
| `capability-impl-snapshot-writer` | ✅ 已完成。snapshot-writer Capability 实现(index.ts + types.ts),借鉴 context-snapshot/src/snapshot-writer.ts 设计,配置驱动 + 提取器模式。tsc 通过 | Verified | `runtime-plugin-newbuild` |
| `hooks-config-json-created` | `.governance/hooks/config.json` 创建:4 Hook 配置入口(session-start/pre-tool/post-tool/pre-compact),用户可改 enabled/args | Verified | `runtime-plugin-newbuild` |
| `gv6-readme-updated` | `.governance/capabilities/README.md` + `.governance/hooks/README.md` 实现状态更新:4 Capability 全部 ✓ 实现 + Plugin 运行时 ✓ | Verified | `runtime-plugin-newbuild` |

## 本会话净变化

### 框架 CLI 端运行时新造（`.governance/plugin/`）

- **4 个开放问题回答**:
  - Q1 单一/多 plugin → **单一 plugin**（所有 hooks 在一个入口）
  - Q2 dynamic/static 加载 → **静态导入 + config 驱动分发**（enabled 标志控制）
  - Q3 预编译方式 → **Raw TypeScript, 无预编译**（Cline CLI 原生加载 .ts）
  - Q4 目录位置 → **`.governance/plugin/`**（框架命名空间内）

- **产出文件**:
  ```
  .governance/plugin/
  ├── index.ts              ← Plugin 入口（setup + hooks 注册）
  ├── config-loader.ts      ← 读取 hooks/config.json + 深合并默认配置
  ├── types.ts              ← 配置类型 + PluginState + 默认配置
  ├── hooks/
  │   ├── session-start.ts  ← SessionStart dispatcher（handoff-provider + git-checker）
  │   ├── pre-tool.ts       ← PreToolUse dispatcher（git-checker commit guard）
  │   ├── post-tool.ts      ← PostToolUse dispatcher（占位）
  │   └── pre-compact.ts    ← PreCompact dispatcher（compaction 检测 + snapshot-writer）
  ├── package.json          ← Cline plugin discovery（cline.plugins 配置）
  ├── tsconfig.json         ← TypeScript 类型检查配置
  └── .gitignore            ← 排除 node_modules/
  ```

- **架构特点**（与 context-snapshot 的差异）:
  - context-snapshot: 直接内联逻辑,cline++ 专属（codec bug workaround / V6 Loop Guard / cline++ 路径）
  - 框架: 配置驱动 + Capability 模块化 + Hook dispatcher 分离,通用可移植
  - setup() 同步预加载（借鉴 context-snapshot ADR-007 模式）,beforeTool 同步 git-checker,beforeModel 异步 fire-and-forget snapshot-writer

### 新增 Capability 实现

- `git-checker/` (index.ts 100 行 + types.ts 60 行): git status 检测,PreToolUse → block,SessionStart → inject
- `snapshot-writer/` (index.ts 120 行 + types.ts 70 行): PreCompact 写 snapshot.json,默认 4 提取器 + 提取器接口

### 配置文件

- `.governance/hooks/config.json`: 4 Hook 配置,默认全部启用（post-tool 除外）

### 文档更新

- `.governance/capabilities/README.md` §七: 4 Capability 全部标 ✓ 实现
- `.governance/hooks/README.md` §七: 4 Hook 全部标 ✓ CLI 实现

### 关键经验

- **setup() 同步约束**: Cline plugin setup() 是同步的,但 Capability 是 async。解决方案: 在 setup() 中用 readFileSync 同步预加载（借鉴 context-snapshot ADR-007 §5.1 预加载模式）,registerRule content() 只读预加载结果
- **beforeTool 同步约束**: beforeTool 需同步返回 { skip: true, reason },不能走 async dispatch。解决方案: 在 index.ts 中直接内联同步 git-checker 逻辑,dispatchPreTool 仅用于测试
- **beforeModel 返回 undefined**: 规避 CLI 3.0.34 codec bug——返回 undefined 不触发 content.map（借鉴 context-snapshot V6 经验）
- **registerRule 命名带前缀**: 使用 `governance:session-context` 前缀避免同名覆盖（ADR-007 验证发现的 5 个 Rule 失效场景之一）

## 待办

### 未完成项

| id | 项 | confidence | depends_on |
|----|----|-----------|------------|
| `runtime-cli-test` | ✅ **已完成（S1-S3 通过）**。CLI 端实测：plugin 加载 ✓ / setup() 执行 ✓（marker 文件创建）/ registerRule 注入 ✓（模型引用 constitution+rules+handoff+git status）/ git-checker 注入 ✓。未测项：beforeTool block（需 ≥5 个未 commit 文件）、compaction 检测（需 ≥180K tokens，受 BL-2 阻塞） | Verified | `runtime-plugin-newbuild` |
| `capability-sop-doc` | `.governance/capabilities/SOP.md` —— Capability 开发 7 步清单（读契约→读示例→定档位→写方案→实现→tsc→清理）,适配框架场景 | Hypothesis | - |
| `dogfood-second-project` | 第二个项目 dogfood 验证框架通用性 | Hypothesis | `runtime-cli-test` |
| `framework-v1.0-tag` | 框架版本号 v1.0 git tag（dogfood 验证后） | Hypothesis | `dogfood-second-project` |

### 后续可选

- 🔲 `.governance/decisions/adr/` 目录建立（首个 ADR：runtime-plugin-newbuild 决策归档）
- 🔲 ADR-007 迁入框架（snapshot registerRule 静态注入）
- 🔲 verify-hook-injection.cjs 通用化（剥离 cline++ 路径,作为框架 CLI 测试脚本）
- 🔲 `publish-developer-guide`（framework-v1.0-tag 之后）：把 quick-reference / sop / investigation-note / hook-auto-injection-design 整理成社区发布材料
- 🔲 Capability 类型统一:handoff-provider 用 ctx/event,rule-appender 用 context/trigger,应统一为单一命名

## 阻塞项

| 阻塞点 | 影响 | 缓解 | 追踪日 |
|--------|------|------|--------|
| BL-1 VS Code plugin 系统不可用（issue #11944）| VS Code 端全部 Hook | CLI 端先跑通;v4.0.1/v4.0.2 回滚到 pre-SDK,plugin 子系统代码完全不存在,7 天无官方回复 | 2026-07-05 |
| BL-2 CLI codec bug（PR #12032 Open）| RT-2 snapshot 实测 + HK-1 循环检测实测 | 短对话测试 workaround;PR Greptile 4/5 建议合并但作者未回应 review（空字符串处理 + 单对象/null 分支缺测试） | 2026-07-05 |

## 关键资源

```
GV-7 契约:       docs/decisions/delivery-framework-design.md（v1.2 冻结）
GV-1 宪法:        .governance/core/constitution.md
GV-1 rubric:      .governance/core/rubric.md
GV-6 设计:        .governance/capabilities/README.md
Hook 设计:        .governance/hooks/README.md
Hook 配置:        .governance/hooks/config.json
Plugin 运行时:    .governance/plugin/index.ts
handoff-provider: .governance/capabilities/handoff-provider/
rule-appender:   .governance/capabilities/rule-appender/
git-checker:     .governance/capabilities/git-checker/
snapshot-writer: .governance/capabilities/snapshot-writer/
hook 实现范本:    context-snapshot/src/index.ts（beforeTool/beforeModel/afterTool/registerRule/registerMessageBuilder 全套）
hook 设计范本:    docs/decisions/hook-auto-injection-design.md（§0 三层判据 + §2 选型表 + §3 注入方式 Phase 0→3 验证）
ADR-007:         docs/decisions/adr/ADR-007-snapshot-registerRule-static-injection.md
源码探查结论:    docs/decisions/investigation/investigation-note-cline-prompt-layering.md（Verified,ADR-007 验证通过）
```

### 已知事实

- 框架填充完成度：GV-1 + EX-1a/1b + EX-2~4 + GV-6 + GV-7 附带产出 + hooks 设计 + 4 个 Capability 实现 + Plugin 运行时 = 100%
- 4 个 Capability 全部实现完成,tsc 零错误,rule-appender 33 测试零回归
- Plugin 运行时架构决策已定并落地:单 plugin + 静态导入 + config 驱动 + Raw TS + `.governance/plugin/`
- **setup() 同步预加载模式有效**:借鉴 context-snapshot ADR-007,registerRule content() 只读预加载结果
- **beforeTool 同步 git-checker 有效**:直接内联 execSync,不走 async dispatch
- **beforeModel 返回 undefined 规避 codec bug**:验证 V6 经验在框架层同样适用
- BL-1/BL-2 短期不解除,继续按"CLI 先跑"策略推进
- **CLI 端插件加载已验证（2026-07-05）**:governance 插件被 Cline CLI 正确发现和加载,setup() 执行,registerRule 注入生效,模型可读取 constitution/rules/handoff/git status。关键修复:插件必须安装到 `~/.cline/plugins/installed/local/`（非项目级 `.cline/plugins/`），且必须自包含（capabilities 依赖需一并复制，import 路径从 `../../capabilities/` 修正为 `../capabilities/`）。同步脚本：`scripts/sync-governance-plugin.ps1`

## 新会话首动作

1. 读 [plugin/project-rules.md](plugin/project-rules.md)（若未归档）
2. 读本文件
3. 读 [.governance/](../.governance/) 目录树（特别注意新增 `plugin/` 目录）
4. 读 [.governance/plugin/index.ts](../.governance/plugin/index.ts) 了解运行时架构
5. 读 [.governance/hooks/config.json](../.governance/hooks/config.json) 了解配置入口
6. 按优先级推进：`runtime-cli-test`（用户在真实终端 `cline -v` 测试）→ `capability-sop-doc` → `dogfood-second-project`

## 引用

- GV-7 契约：[delivery-framework-design.md](decisions/delivery-framework-design.md)
- GV-1 宪法：[.governance/core/constitution.md](../.governance/core/constitution.md)
- GV-6 设计：[.governance/capabilities/README.md](../.governance/capabilities/README.md)
- Hook 设计：[.governance/hooks/README.md](../.governance/hooks/README.md)
- Plugin 运行时：[.governance/plugin/index.ts](../.governance/plugin/index.ts)
- Hook 实现范本：[context-snapshot/src/index.ts](../context-snapshot/src/index.ts)
- Hook 设计范本：[hook-auto-injection-design.md](decisions/hook-auto-injection-design.md)
- ADR-007：[ADR-007-snapshot-registerRule-static-injection.md](decisions/adr/ADR-007-snapshot-registerRule-static-injection.md)
- 上一会话 handoff：GV-7 框架填充完成版（本文件前一版本）

---

## Handoff（推荐下次会话开局交接语句）

```text
读 docs/handoff.md + docs/dev-rules.md + docs/plugin/project-rules.md（若未归档）。
```
