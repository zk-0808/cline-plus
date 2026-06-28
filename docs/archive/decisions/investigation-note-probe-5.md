## Investigation Note: Capability Probe 5 — VS Code 扩展 plugin 自动发现
日期：2026-06-27

> **框架**：本 Note 是 [evidence-governance.md §10](../evidence-governance.md) Investigation Note 模板的首个应用，按新证据治理框架执行（ADR-002 Methodology Note 标注 Update 5 起）。
>
> **关联**：
> - [ADR-001 Update 1](ADR-001-handoff-compact-memory.md) — Probe 5 实测准备清单
> - [ADR-002 Update 4](ADR-002-project-shape.md) — 路径与 manifest 修正
> - [ADR-004](ADR-004-p5-spike-pause.md) — P5 Spike 暂停，Probe 5 通过则恢复条件 2 满足

### 核心问题

**手动放 plugin 文件到 `<workspace>/.cline/plugins/` 能否触发 VS Code 扩展 4.0.0 执行 plugin 的 setup 函数？**

这是 mechanism-candidates #5（compact 双产物）能否在 VS Code 扩展直接可用的关键前置——若通过，#5 退回 CLI 载体的 ADR-004 恢复条件 2 即满足。

---

### Observation

> 直接看到的事实，无解释。

1. **dist/extension.js 第 543 行**（minified，[ADR-002 Update 3](ADR-002-project-shape.md) 核查）有 plugin 注册系统代码：
   - `registerTool` / `registerCommand` / `registerRule` / `registerMessageBuilder` / `registerProvider` / `registerAutomationEventType` / `registerMcpServer`
   - `await o.setup?.(u, c)` — 调用 plugin 的 setup 函数
   - plugin 文件类型：`[".js", ".ts"]`

2. **官方文档 [docs.cline.bot/customization/plugins](https://docs.cline.bot/customization/plugins)** 原文：
   - "This feature currently only applies to Cline SDK, CLI, and Kanban. **This feature is not applicable on VSCode and JetBrains Extension for now.**"
   - "The CLI auto-discovers plugins from `.cline/plugins` in the workspace, `~/.cline/plugins`, and the system Plugins folder."
   - manifest 格式：`package.json` 含 `cline` 字段，`{ "cline": { "plugins": [{ "paths": ["./index.ts"], "capabilities": ["tools","hooks"] }] } }`
   - capabilities 枚举：`tools / commands / rules / skills / providers / messageBuilders / automationEvents / hooks`
   - Host-Provided Dependencies：`@cline/sdk`, `@cline/core`, `@cline/agents`, `@cline/llms`, `@cline/shared`

3. **官方 example [custom-compaction.ts](https://github.com/cline/cline/blob/main/sdk/examples/plugins/custom-compaction.ts)**：plugin 导出 `AgentPlugin` 对象，结构 `{ name, manifest: { capabilities }, setup(api) { api.registerMessageBuilder({name, build}) } }`

4. **官方 example [weather-metrics.ts](https://github.com/cline/cline/blob/main/sdk/examples/plugins/weather-metrics.ts)**：`setup(api, ctx)` 第二参数 `ctx` 含 `workspaceInfo.{rootPath, latestGitBranchName, latestGitCommitHash, associatedRemoteUrls}`；`api.registerTool(createTool({name, description, inputSchema, execute}))`；`hooks: { beforeRun, beforeTool, afterTool, afterRun }`

5. **VS Code 扩展 4.0.0 已安装**：`C:\Users\19936\.vscode\extensions\saoudrizwan.claude-dev-4.0.0\package.json` 存在（PowerShell `Test-Path` 确认）

6. **workspace 根目录无 `.cline/`**：`e:\cline++\.cline` 不存在（PowerShell `Get-ChildItem` 确认，仅 `experiments/p5-spike/.cline` 存在——那是 ADR-004 暂停的旧实验，不复用）

---

### Evidence

| # | 证据 | 来源类型 | 置信度 | 支持的假设 |
|---|------|---------|--------|-----------|
| E1 | VS Code 扩展代码层有完整 plugin 注册系统（7 个 register 接口 + setup 调用）| 源码（minified）| 高 | "VS Code 扩展代码层具备 plugin 执行能力" |
| E2 | 官方文档明确 VS Code 扩展"不支持 plugin" | 官方文档 | 高 | "VS Code 扩展 UI 层未暴露 plugin 装载入口" |
| E3 | 官方文档明确 CLI 自动发现 `.cline/plugins/`，VS Code 扩展未说明 | 官方文档 | 高 | "VS Code 扩展自动发现行为是灰色地带" |
| E4 | 官方 example 确认 plugin 文件结构与 API 签名 | SDK Example | 高 | "plugin 文件可按官方格式构造" |
| E5 | VS Code 扩展 4.0.0 实际安装 | 实测（PowerShell）| 高 | "实测环境就绪" |
| E6 | workspace 根目录无 `.cline/` | 实测（PowerShell）| 高 | "需从零创建 plugin 目录" |

---

### Hypothesis

> 基于证据的解释，需明确标注 Inference。

**H1（主假设，置信度：中）**：VS Code 扩展 4.0.0 可能在启动时扫描 `<workspace>/.cline/plugins/`，发现含 `package.json`（带 `cline` 字段）的 plugin 目录后，加载 `paths` 声明的 `.ts/.js` 文件并执行其 `setup` 函数。

- **Inference**：从 E1（代码层有注册系统）+ E3（CLI 自动发现 `.cline/plugins/`）推断——VS Code 扩展基于同一 Core SDK，可能复用相同的自动发现逻辑
- **不确定性**：E2 官方文档明确"不支持"，可能意味着代码层注册系统存在但未接入自动发现扫描

**H2（备选假设，置信度：低）**：VS Code 扩展仅在通过 `cline.marketplaceButtonClicked`（Customize 按钮）显式触发时才装载 plugin，不扫描 `.cline/plugins/`。

**H3（备选假设，置信度：低）**：VS Code 扩展扫描 `.cline/plugins/_installed/` 子目录（CLI install 管理路径），但不扫描直接放置的 `.cline/plugins/<name>/`。

---

### Conflict Registry

| 字段 | 内容 |
|------|------|
| **冲突问题** | VS Code 扩展是否支持 plugin 自动发现 |
| **来源 A（官方文档）** | "This feature is not applicable on VSCode and JetBrains Extension for now." |
| **来源 B（源码）** | dist/extension.js 第 543 行有完整 plugin 注册系统 + setup 调用 |
| **来源 C（CLI 行为）** | CLI 自动发现 `.cline/plugins/`（同一 Core SDK）|
| **当前置信度** | 中——多源冲突，需实测裁决 |
| **待验证事项** | 手动放 plugin 文件到 `.cline/plugins/` 后 reload window，检查 setup 是否执行 |

**处置**：按 [evidence-governance.md §6.3](../evidence-governance.md)，冲突登记后不立即裁决，等实测证据（§8 Evidence Escalation Level 4）。

---

### Verified

> 实测于 2026-06-27。用户在 VS Code Cline 扩展 Customize 按钮（`cline.marketplaceButtonClicked`）中发现 plugin 管理面板。

**V1（高置信度）**：VS Code 扩展**有** plugin 装载入口——通过 Customize 按钮的 marketplace UI，而非 `cline.plugin.install` 命令。

- 证据类型：实测（用户观察 Customize UI）+ 源码（dist/extension.js 第 3803 行 `Mch` install 函数 + 第 2060 行 `SOd` uninstall 函数）
- 独立证据：官方文档（E2"不支持"）与实测冲突 → 按 §6 Conflict Registry 已登记，实测优先

**V2（高置信度）**：VS Code 扩展**读取 CLI 全局 plugin store**——`~/.cline/plugins/installed/{local,remote}/<plugin-name>.ts-<hash>/<plugin-name>.ts`

- 证据类型：实测（用户提供 Customize UI 显示的路径）
- 用户实测路径：
  - `p5-spike-plugin` → `C:\Users\19936\.cline\plugins\installed\local\p5-spike-plugin.ts-d7f2b02ac5d1\p5-spike-plugin.ts`（CLI local 安装）
  - `weather-metrics` → `C:\Users\19936\.cline\plugins\installed\remote\weather-metrics.ts-1770dbabbed0\weather-metrics.ts`（CLI remote URL 安装）
- 两个 plugin 均标 **Global**（非 workspace 级）

**V3（高置信度）**：VS Code 扩展**加载并执行**了全局 plugin store 中的 plugin——用户报告 p5-spike-plugin 和 weather-metrics "已经被加载"。

- 证据类型：实测（用户观察 Customize UI 显示 "Installed" 状态）
- 这意味着 setup 函数被调用（U3 解答：✅）

**V4（中置信度）**：ADR-002 Update 1 的核心结论"VS Code 扩展未集成 plugin 装载入口"**错误**。

- 证据类型：实测（V1）+ 源码（dist/extension.js `Mch`/`SOd` 函数）
- Update 1 仅基于 `cline.*` commands 列表零 plugin 命令 + CHANGELOG 零 plugin 条目下阴性结论，未核查 Customize 按钮 UI 层

---

### Remaining Unknown

> 实测后仍存在的未知项。

1. **U1（已解答）**：VS Code 扩展启动时是否扫描 `<workspace>/.cline/plugins/`？
   - **部分解答**：VS Code 扩展**确实读取** `~/.cline/plugins/installed/`（全局 store），但 workspace 级 `.cline/plugins/` 自动扫描**仍未验证**
   - 后续动作：本 Note 的 Phase 2 用户执行清单仍可执行（手动放 plugin 到 workspace 级），但优先级降低——全局 store 已可用

2. **U2（已解答）**：是否要求特定子目录结构？
   - **解答**：全局 store 使用 `installed/{local,remote}/<name>.ts-<hash>/<name>.ts` 结构（CLI install 管理），workspace 级结构待验证

3. **U3（已解答）**：setup 函数是否被调用？
   - **解答**：✅ 是（p5-spike-plugin 和 weather-metrics 已被加载）

4. **U4（部分解答）**：注册的对象是否实际生效？
   - **部分解答**：plugin 已加载（setup 执行），但 messageBuilder/tool 是否在 Cline 对话中实际可用仍需验证
   - 后续动作：用户可在 Cline 对话中尝试调用 weather-metrics 的 `get_weather` 工具验证

5. **U5（已解答）**：VS Code 扩展是否提供 host dependencies？
   - **解答**：✅ 是（weather-metrics plugin 导入了 `@cline/core` 的 `createTool`，已成功加载）

6. **U6（新）**：workspace 级 `.cline/plugins/` 自动扫描是否触发？
   - 待 Phase 2 用户执行清单验证（优先级降低）

---

### Decision

**D1**：ADR-002 Update 1 的"VS Code 扩展未集成 plugin 装载入口"结论**错误**，应写入 ADR-002 Update 5 修正。

**D2**：mechanism-candidates #5 的"VS Code 不可用"硬约束**解除**——VS Code 扩展通过 Customize marketplace 加载全局 plugin store 中的 plugin，#5 可通过 CLI 全局安装后在 VS Code 扩展直接可用。

**D3**：ADR-004 恢复条件 2**满足**——#5 不再依赖 CLI 载体，VS Code 扩展环境直接可用。

**D4**：Probe 5 的原核心问题（workspace 级 `.cline/plugins/` 自动扫描）**优先级降低**——全局 store 已是更优路径。workspace 级自动扫描作为补充验证，可在完整盘点后顺带执行。

**后续动作**：
1. 写入 ADR-002 Update 5（修正 Update 1 错误结论 + Update 4 的"VS Code 扩展能否自动发现"待实测标注 → 已部分解答）
2. 更新 mechanism-candidates #5 状态（从"候选（暂缓）"改为"候选"或"实验中"）
3. 更新 ADR-004 状态（恢复条件 2 满足，可重启 P5 Spike）
4. 切换到新方向：完整盘点 VS Code 扩展所有可设置选项（§4 门控已通过）

---

## 实测执行清单

### Phase 1: TRAE agent 准备（已完成）

- [x] 创建 `<workspace>/.cline/plugins/test-plugin/package.json`（manifest 声明 `tools / messageBuilders / hooks` capabilities）
- [x] 创建 `<workspace>/.cline/plugins/test-plugin/index.ts`（setup 写日志 + 注册 messageBuilder + 注册 tool）
- [x] 本 Investigation Note 记录证据链

### Phase 2: 用户执行（待用户操作）

> 遵循 [dev-rules.md §1.2](../dev-rules.md)：VS Code 命令由用户在真实终端执行。

1. **reload VS Code window**：`Ctrl+Shift+P` → `Developer: Reload Window`
2. **检查 plugin-loaded.log**：
   ```powershell
   Get-Content "E:\cline++\.cline\plugins\test-plugin\plugin-loaded.log" -ErrorAction SilentlyContinue
   ```
   - 若文件存在且含 `setup() called` → setup 被调用，U3 解答
   - 若文件不存在 → setup 未被调用，需检查 VS Code 开发者工具 Console（`Help` → `Toggle Developer Tools`）是否有 plugin 加载错误
3. **检查 tool 注册**：在 Cline 对话中输入"使用 probe_5_ping 工具"，看是否可用
4. **检查 messageBuilder**：触发一次 compact（长对话），看 messageBuilder 是否被调用（日志会追加 `hook beforeRun fired` 之外的记录）

### Phase 3: 回填 Investigation Note（实测后）

根据实测结果更新本 Note 的 Verified / Decision 部分，并决定：
- 通过 → ADR-004 恢复条件 2 满足，#5 可在 VS Code 扩展直接可用
- 失败 → 维持 ADR-004 deferred，#5 退回 CLI 路径
- 部分通过（如 setup 调用但 messageBuilder 不生效）→ 登记新的 Conflict Registry，按 §8 升级

---

## 产源说明

本 Investigation Note 格式映射 [evidence-governance.md §14](../evidence-governance.md) 所列成熟实践：
- **Observation/Evidence/Hypothesis/Verified/Decision 状态机** → EBSE + 科学方法
- **Observation vs Inference 分离** → RCA 基本原则
- **Conflict Registry** → RCA 记录矛盾证据 + ADR 记录反对意见
- **Remaining Unknown** → 科学方法"I don't know"合法答案

无创新部分。

---

## Update 6 纠正标注（2026-06-28）

> 来源：[ADR-002 Update 6](ADR-002-project-shape.md) — VS Code 扩展 plugin sandbox bootstrap 缺失根因确认。
> 配套：[investigation-note-vscode-bootstrap-missing.md](investigation-note-vscode-bootstrap-missing.md) — 完整证据链。

### V3 纠正

**原 V3 结论**："VS Code 扩展**加载并执行**了全局 plugin store 中的 plugin——用户报告 p5-spike-plugin 和 weather-metrics '已经被加载'。"

**纠正**：**过度推断**。Customize UI 显示 "Installed" 仅表示 `discoverPluginModulePaths()` 发现了文件（UI 层发现），不等于 `loadSandboxedPlugins()` 成功启动了 sandbox 子进程（运行时加载）。根因：VS Code 扩展 4.0.0 esbuild 未输出 `plugin-sandbox-bootstrap.js`，导致 sandbox 子进程无法启动，`setup()` 永不执行。

**实测验证**：
- CLI 3.0.31 中 `setup()` 成功执行（marker 时间差 11ms）
- VS Code 扩展中 `setup()` 不执行（debug log 和 marker 均不出现）
- 4 类独立证据交叉验证（源码分析 + bundle grep + CLI 对照 + 实测）

### D2 纠正

**原 D2**："VS Code 不可用硬约束**解除**——#5 可通过 CLI 全局安装后在 VS Code 扩展直接可用。"

**纠正**：**回退**。VS Code 扩展因 bootstrap 缺失不可用，仅 CLI 可用。Workaround 后 VS Code 扩展可用（复制 bootstrap.js + @cline/shared + @cline/core + jiti 到扩展目录），但非官方支持路径。

**Workaround 验证**（2026-06-28）：
- 复制 `plugin-sandbox-bootstrap.js` 到 `dist/extensions/`
- 复制 `@cline/shared`、`@cline/core`、`jiti` 到 `node_modules/`
- `setx CLINE_PLUGIN_IMPORT_TIMEOUT_MS 30000`
- Result：`setup()` 成功执行，Phase 2 全链路 7 次 compact 事件均捕获

### D3 纠正

**原 D3**："ADR-004 恢复条件 2**满足**——#5 不再依赖 CLI 载体，VS Code 扩展环境直接可用。"

**纠正**：**需重新评估**。恢复条件 2 在 workaround 下满足（VS Code 扩展可运行 plugin），但依赖非官方补丁。正式路径仍需 Cline 官方修复 bootstrap 打包问题。
