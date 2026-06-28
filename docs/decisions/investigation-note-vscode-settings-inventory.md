## Investigation Note: VS Code 扩展 4.0.0 可设置选项完整盘点
日期：2026-06-27

> **框架**：按 [evidence-governance.md §10](../evidence-governance.md) Investigation Note 模板记录。
>
> **关联**：
> - [investigation-note-probe-5.md](../archive/decisions/investigation-note-probe-5.md) — Probe 5 实测发现 VS Code 扩展有 plugin 装载入口，催生本盘点
> - [ADR-002 Update 3](ADR-002-project-shape.md) — 之前的 VS Code 扩展原生能力调研（仅覆盖 commands/skills/hooks/plugin 结构）
> - [ADR-002 Update 4](ADR-002-project-shape.md) — 路径与 manifest 修正
>
> **研究对象**（§4 方向启动门控已通过）：
> - **载体**：VS Code 扩展 4.0.0（`C:\Users\19936\.vscode\extensions\saoudrizwan.claude-dev-4.0.0`）
> - **范围**：所有用户可操作的设置/能力入口（VS Code Settings / 侧边栏 UI / 命令面板 / Customize marketplace / 文件系统）
> - **排除**：CLI / SDK / Kanban / JetBrains
> - **成功标准**：清单 + 关键入口实测

### 核心问题

**VS Code 扩展 4.0.0 在 IDE 里有哪些可设置/可操作入口？**

起因：Probe 5 实测时用户在 Customize 按钮发现 plugin marketplace，直接证伪 ADR-002 Update 1 的"VS Code 扩展未集成 plugin 装载入口"结论。需要完整盘点所有 IDE 内入口，避免再次遗漏。

---

## Observation

> 直接观察的事实，无解释。证据来源：package.json（权威源）+ PowerShell 文件核查（实测）+ 用户观察（Customize UI）。

### A. VS Code Settings 面板配置项（`contributes.configuration`）

**Observation A1**：package.json 第 343-346 行：
```json
"configuration": {
    "title": "Cline",
    "properties": {}
}
```
`properties` 为空对象——VS Code 扩展 4.0.0 **不通过 VS Code 标准配置系统暴露任何设置项**。

**Evidence**：VS Code Settings 面板搜索 "cline" 零结果（`properties: {}` 决定）。所有 Cline 设置在 webview 内部的 Settings 按钮里，存储在 `~/.cline/data/settings/*.json` 文件中。

### B. 命令面板 cline.* 命令（`contributes.commands` + `menus.commandPalette`）

**Observation B1**：package.json 注册 20 个命令，但 `menus.commandPalette` 只暴露 2 个：

| 命令 | 标题 | commandPalette 可见 | 实际触发方式 |
|------|------|-------------------|-------------|
| `cline.plusButtonClicked` | New Task | ❌ | 侧边栏顶部按钮 |
| `cline.mcpButtonClicked` | MCP Servers | ❌ | 侧边栏/Settings 内部 |
| `cline.marketplaceButtonClicked` | Customize | ❌ | 侧边栏顶部按钮 |
| `cline.historyButtonClicked` | History | ❌ | 侧边栏顶部按钮 |
| `cline.accountButtonClicked` | Account | ❌ | 侧边栏顶部按钮 |
| `cline.settingsButtonClicked` | Settings | ❌ | 侧边栏顶部按钮 |
| `cline.addToChat` | Add to Cline | ❌ | 编辑器右键（editorHasSelection）/ `Ctrl+'` |
| `cline.addTerminalOutputToChat` | Add to Cline | ❌ | 终端右键 |
| `cline.focusChatInput` | Jump to Chat Input | ❌ | `Ctrl+'`（!editorHasSelection）|
| `cline.generateGitCommitMessage` | Generate Commit Message with Cline | ✅ | 命令面板 / Git 面板 |
| `cline.abortGitCommitMessage` | Generate Commit Message with Cline - Stop | ✅ | 命令面板 / Git 面板 |
| `cline.explainCode` | Explain with Cline | ❌ | 编辑器右键（推测）|
| `cline.improveCode` | Improve with Cline | ❌ | 编辑器右键（推测）|
| `cline.jupyterGenerateCell` | Generate Jupyter Cell with Cline | ❌ | Jupyter toolbar |
| `cline.jupyterExplainCell` | Explain Jupyter Cell with Cline | ❌ | Jupyter cell 标题栏 |
| `cline.jupyterImproveCell` | Improve Jupyter Cell with Cline | ❌ | Jupyter cell 标题栏 |
| `cline.openWalkthrough` | Open Walkthrough | ❌ | 命令面板（推测，未在 commandPalette menu 注册）|
| `cline.reconstructTaskHistory` | Reconstruct Task History | ❌ | 命令面板（推测）|
| `cline.dev.createTestTasks` | Create Test Tasks | ❌ | 仅 dev mode（`when: cline.isDevMode`）|
| `cline.dev.expireMcpOAuthTokens` | Expire MCP OAuth Tokens | ❌ | 仅 dev mode |

**Evidence**：20 个命令注册，但 `menus.commandPalette` 数组只含 2 项（generateGitCommitMessage / abortGitCommitMessage）。其他命令通过 `menus.view/title` / `menus.editor/context` / `menus.terminal/context` / `menus.scm/title` / `menus.notebook/*` 触发。

### C. Cline 侧边栏 UI（`viewsContainers` + `views` + `menus.view/title`）

**Observation C1**：活动栏 1 个容器：
```json
"viewsContainers": {
    "activitybar": [{
        "id": "claude-dev-ActivityBar",
        "title": "Cline",
        "icon": "assets/icons/icon.svg"
    }]
}
```

**Observation C2**：1 个 webview view：
```json
"views": {
    "claude-dev-ActivityBar": [{
        "type": "webview",
        "id": "claude-dev.SidebarProvider",
        "name": "",
        "icon": "assets/icons/icon.svg"
    }]
}
```
整个侧边栏是**单一 webview**——所有 UI（对话/MCP/Customize/History/Account/Settings）都在这个 webview 内部切换，不走 VS Code 原生 view。

**Observation C3**：侧边栏顶部 5 个按钮（`menus.view/title`）：

| 顺序 | 命令 | 标题 | 图标 | group |
|------|------|------|------|-------|
| 1 | `cline.plusButtonClicked` | New Task | `$(add)` | navigation@1 |
| 2 | `cline.marketplaceButtonClicked` | Customize | `$(wrench)` | navigation@2 |
| 3 | `cline.historyButtonClicked` | History | `$(history)` | navigation@3 |
| 4 | `cline.accountButtonClicked` | Account | `$(account)` | navigation@5 |
| 5 | `cline.settingsButtonClicked` | Settings | `$(settings-gear)` | navigation@6 |

**注**：`cline.mcpButtonClicked`（MCP Servers）在 commands 注册但**不在** `menus.view/title`——可能通过 Settings 内部或对话界面触发。

### D. 编辑器/终端/Jupyter/Git 右键菜单（`menus.*`）

**Observation D1**：

| 菜单位置 | 命令 | 触发条件 |
|---------|------|---------|
| `editor/context` | `cline.addToChat` | editorHasSelection |
| `terminal/context` | `cline.addTerminalOutputToChat` | 无条件 |
| `scm/title` | `cline.generateGitCommitMessage` | config.git.enabled && scmProvider == git && !cline.isGeneratingCommit |
| `scm/title` | `cline.abortGitCommitMessage` | config.git.enabled && scmProvider == git && cline.isGeneratingCommit |
| `notebook/toolbar` | `cline.jupyterGenerateCell` | notebookType == 'jupyter-notebook' |
| `notebook/cell/title` | `cline.jupyterExplainCell` | notebookType == 'jupyter-notebook' |
| `notebook/cell/title` | `cline.jupyterImproveCell` | notebookType == 'jupyter-notebook' |

### E. 快捷键（`contributes.keybindings`）

**Observation E1**：

| 快捷键 | 命令 | 触发条件 |
|--------|------|---------|
| `Ctrl+'`（Win/Linux）/ `Cmd+'`（Mac）| `cline.addToChat` | editorHasSelection |
| `Ctrl+'`（Win/Linux）/ `Cmd+'`（Mac）| `cline.focusChatInput` | !editorHasSelection |
| （无快捷键）| `cline.generateGitCommitMessage` | config.git.enabled && scmProvider == git |

### F. Walkthrough（`contributes.walkthroughs`）

**Observation F1**：1 个 walkthrough，5 步：
1. `welcome` — Start with a Goal, Not Just a Prompt
2. `learn` — Let Cline Learn Your Codebase
3. `advanced-features` — Always Use the Best AI Models
4. `mcp` — Extend with Powerful Tools (MCP)
5. `getting-started` — You're Always in Control

### G. 文件系统入口——全局（`~/.cline/`）

**Observation G1**（PowerShell `Get-ChildItem -Recurse` 核查）：

| 路径 | 类型 | 用途 | 可设置性 |
|------|------|------|---------|
| `~/.cline/data/settings/global-settings.json` | JSON | 全局设置（`autoUpdateEnabled` / `telemetryOptOut`）| ✅ 可编辑 |
| `~/.cline/data/settings/cline_mcp_settings.json` | JSON | MCP 服务器配置（mcpServers 对象）| ✅ 可编辑 |
| `~/.cline/data/settings/providers.json` | JSON | AI Provider 配置（含 apiKey/model/baseUrl）| ✅ 可编辑（⚠️ 含明文 apiKey）|
| `~/.cline/data/settings/models.json` | JSON | 模型配置 | ✅ 可编辑 |
| `~/.cline/data/settings/cli-notices.json` | JSON | CLI 通知 | ❌ 自动管理 |
| `~/.cline/data/cache/feature-flags.json` | JSON | 功能开关（当前 `ext-cline-pass: true`）| ❌ 自动管理（服务端下发）|
| `~/.cline/data/cache/user_input_history.jsonl` | JSONL | 用户输入历史 | ❌ 自动管理 |
| `~/.cline/data/db/sessions.db` | SQLite | 会话数据库（better-sqlite3）| ❌ 自动管理 |
| `~/.cline/data/db/teams.db` | SQLite | 团队数据库 | ❌ 自动管理（新发现）|
| `~/.cline/data/db/cron.db` | SQLite | 定时任务数据库 | ❌ 自动管理（新发现）|
| `~/.cline/data/logs/cline.log` | LOG | Cline 主日志 | ❌ 自动写入 |
| `~/.cline/data/logs/hooks.jsonl` | JSONL | Hook 执行日志 | ❌ 自动写入 |
| `~/.cline/data/logs/hub-daemon.log` | LOG | Hub daemon 日志 | ❌ 自动写入（新发现）|
| `~/.cline/data/sessions/<ts>_<id>/` | 目录 | 会话存储（.json + .messages.json）| ❌ 自动管理 |
| `~/.cline/data/workspaces/<hash>/workspaceState.json` | JSON | 工作区状态 | ❌ 自动管理 |
| `~/.cline/data/locks/hub/production.json` | JSON | Hub 锁 | ❌ 自动管理 |
| `~/.cline/data/globalState.json` | JSON | 全局状态 | ❌ 自动管理 |
| `~/.cline/data/secrets.json` | JSON | 密钥存储 | ❌ 自动管理（⚠️ 敏感）|
| `~/.cline/cron/` | 目录 | 定时任务（与 cron.db 对应）| ❓ 待实测 |
| `~/.cline/plugins/_installed/{local,remote}/` | 目录 | 全局 plugin store | ✅ CLI install 管理 / VS Code 扩展读取 |
| `~/.cline/skills/` | 目录 | 全局 skill 目录 | ✅ 放 SKILL.md 即可发现 |

### H. 文件系统入口——workspace 级

**Observation H1**（部分来自 ADR-002 Update 3，部分待实测）：

| 路径 | 用途 | 可设置性 | 验证状态 |
|------|------|---------|---------|
| `.cline/plugins/` | workspace 级 plugin | ✅ 放文件（待验证自动扫描）| ⚠️ Probe 5 U6 未验证 |
| `.cline/plugins/_installed/{local,remote}/` | CLI install workspace 级 | ✅ CLI 管理 | ✅ 已存在（`experiments/p5-spike/`）|
| `.cline/skills/` | workspace 级 skill | ✅ 放 SKILL.md 即可发现 | ✅ ADR-002 Update 3 确认 |
| `.clinerules/skills/` | workspace 级 skill（备用）| ✅ 放 SKILL.md | ✅ ADR-002 Update 3 确认 |
| `.claude/skills/` | workspace 级 skill（备用）| ✅ 放 SKILL.md | ✅ ADR-002 Update 3 确认 |
| `.agents/skills/` | workspace 级 skill（备用）| ✅ 放 SKILL.md | ✅ ADR-002 Update 3 确认 |
| `~/.agents/skills/` | 全局 skill（备用）| ✅ 放 SKILL.md | ✅ ADR-002 Update 3 确认 |
| `.cline/hooks/` | 文件 Hook（Windows `.ps1`）| ✅ 放 `<eventName>.ps1` | ✅ ADR-002 Update 3 确认 |
| `/cline/Hooks/`（全局，路径匹配）| 全局文件 Hook | ✅ 放 `<eventName>.ps1` | ✅ ADR-002 Update 3 确认 |

### I. webview 内部入口（待用户实测）

> 侧边栏是单一 webview，5 个顶部按钮各自打开一个内部面板。这些面板的具体选项无法从 package.json 推断，需用户在 VS Code 里逐一打开记录。

| 按钮 | 已知信息 | 待实测项 |
|------|---------|---------|
| **New Task**（`plusButtonClicked`）| 新建对话 | 对话界面的 slash commands / 模型切换 / 模式切换 / 上下文文件附加等 |
| **Customize**（`marketplaceButtonClicked`）| plugin marketplace（Installed + Marketplace 两栏）| marketplace 完整 plugin 列表 / 分类 / 安装/卸载/启用/禁用操作 / plugin 详情页 |
| **History**（`historyButtonClicked`）| 任务历史 | 历史列表 / 搜索 / 恢复 / 删除 / 导出 / task metadata |
| **Account**（`accountButtonClicked`）| 账户 | 登录/登出 / 订阅 / API key 管理 / 用量统计 |
| **Settings**（`settingsButtonClicked`）| 设置，5 个 tab | ✅ 已实测，见 §J |
| **MCP Servers**（`mcpButtonClicked`）| MCP 服务器管理 | MCP 服务器列表 / 添加/编辑/删除 / 启用/禁用 / OAuth |

### J. Settings 面板内部（实测 2026-06-27，用户截图，5 个 tab）

> 来源：用户提供 5 张 Settings 截图（实测，高置信度）。Settings 面板是 webview 内部 UI，左侧 5 个 tab。

**Observation J1 — API Configuration tab**

| 选项 | 当前值 | 类型 | 说明 |
|------|--------|------|------|
| 子模式 tab | Plan Mode / Act Mode | tab 切换 | 两模式独立配置 API/模型 |
| API Provider | DeepSeek | 下拉 | |
| DeepSeek API Key | （密码框）| 密码输入 | "stored locally and only used to make API requests" |
| Model | deepseek-v4-flash | 下拉 | |
| Reasoning Effort | Medium | 下拉 | "Higher effort improves depth, but uses more tokens" |
| 成本显示 | Context 1M / Input $0.14/M / Output $0.28/M | 只读 | |
| ADVANCED | （折叠未展开）| 折叠区 | 待展开记录 |
| ☑ Use different models for Plan and Act modes | 勾选 | 复选框 | Plan/Act 模式可用不同模型，强模型规划+廉价模型执行 |

**Observation J2 — Features tab**

| 分组 | 选项 | 当前值 | 说明 |
|------|------|--------|------|
| AGENT | **Auto Compact** | **关** | ⭐ "Automatically compress conversation history" — 直接关联 #5 |
| EDITOR | Feature Tips | 开 | thinking 阶段显示提示 |
| EDITOR | Background Edit | 关 | "Allow edits without stealing editor focus" |
| EDITOR | Checkpoints | 开 | "Save progress at key points for easy rollback" |
| EXPERIMENTAL | Yolo Mode | 关 | 无确认执行，自动 Plan→Act，禁用 ask question 工具 |
| ADVANCED | **Hooks** | **开** | ⭐ "Enable lifecycle and tool hooks" — 对应 ADR-002 Update 3 文件 Hook |
| ADVANCED | MCP Display Mode | Markdown | 下拉，控制 MCP 响应显示 |

**Observation J3 — Terminal tab**

| 选项 | 当前值 | 说明 |
|------|--------|------|
| Default Terminal Profile | Default | "uses your VSCode global setting" |
| Shell integration timeout (seconds) | 4 | shell 集成激活等待时长 |
| ☑ Enable aggressive terminal reuse | 勾选 | 复用非当前工作目录的终端窗口 |
| **Terminal Execution Mode** | **VS Code Terminal** | ⭐ VS Code Terminal vs background process — 关联 p5-spike `cline -i` 终端行为 |

**Observation J4 — General tab**

| 选项 | 当前值 | 说明 |
|------|--------|------|
| Preferred Language | Simplified Chinese - 简体中文 | 下拉，Cline 通信语言 |
| ☑ Allow error and usage reporting | 勾选 | 对应 `global-settings.json` 的 `telemetryOptOut` |

**Observation J5 — About tab**

- 版本：**Cline v4.0.0**
- 描述："An AI assistant that can use your CLI and Editor"（⭐ 官方自我定位含 **CLI** — 印证 VS Code 扩展与 CLI 共享内核）
- 社区：X / Discord / r/cline
- 开发：GitHub / Issues / Feature Requests
- 资源：Documentation / https://cline.bot

**Observation J6 — 存储位置不一致**

`global-settings.json`（实测）仅含 `autoUpdateEnabled` / `telemetryOptOut` 两项，但 Settings UI 暴露 ~15 项设置。说明 Reasoning Effort / Auto Compact / Hooks / Terminal Execution Mode 等设置存储在别处（推测 `globalState.json` 或 `workspaceState.json`），非 `global-settings.json`。

---

### K. Customize 面板内部（实测 2026-06-27，用户截图）

> 来源：用户提供 6 张 Customize 截图（实测，高置信度）。Customize 面板是 webview 内部 UI，**三个子 tab：Skills / MCP / Plugins**，每个 tab 有 Installed / Marketplace 两栏。

**Observation K1 — Customize 顶层结构**

Customize 按钮（`marketplaceButtonClicked`，图标 `$(wrench)`）打开的面板含三个子 tab：

| 子 tab | 图标 | 用途 | Installed / Marketplace |
|--------|------|------|------------------------|
| **Skills** | ✦ | 按需加载的可复用指令集 | 双栏 |
| **MCP** | 🔌 | 连接外部 API/本地工具/托管服务 | 双栏 |
| **Plugins** | 🧩 | 比单个 MCP/skill 更复杂的扩展（custom tools/hooks/rules/slash commands/bundled skills）| 双栏 |

**Observation K2 — Skills tab**

- **Installed**：1 个 — `search-orchestrator`（Global，`C:\Users\19936\.cline\skills\search-orchestrator\SKILL.md`，已启用，带启用开关 + 删除按钮）
- **Marketplace**：分类标签 — business 4 / creative 5 / data 9 / databases 6 / marketing 2 / memory 1 / productivity 4 / research 4 / sales 2 / security 1 / software 25
- Marketplace 部分可见 skill（每个带下载按钮）：Amazon Location Service / AWS Amplify Gen2 Workflow / Attorney Assist / Building Pydantic AI Agents / **Cline SDK**（"Reference documentation for the Cline SDK: the Agent runtime, ClineCore sessions, custom tools, plugins, events, LLM providers, scheduling, multi-agent teams"）/ Convex Design / Cosmos DB / Data Analyst / Dataproc / Desktop Commander / Dr. Bedrock / Aurora DSQL / Endor Setup / Exa Search / Firestore Data / Frontend Design / GCP to AWS Migration / Knowledge Catalog / Linear SDK Scripting / **Math Olympiad** / Mintlify / Oracle DB / Playground / **Review Team**（"Launches focused review agents for correctness, security, architecture, conventions, simplicity, UX, reliability, telemetry, testing, compatibility, documentation review"）/ SAP Fiori / Save to Spotify / Searching Sourcegraph

**Observation K3 — MCP tab**

- **Installed**：3 个 MCP 服务器（带刷新/删除/启用开关/状态灯）：
  - `playwright`（禁用，红灯）
  - `duckduckgo`（启用，绿灯）— 对应 search-orchestrator 后端
  - `skills-mcp-server`（启用，绿灯）— skill 加载机制的 MCP 后端
- 底部操作：`+ Add Remote Server` / `Edit Configuration`（编辑 `cline_mcp_settings.json`）/ `Advanced MCP Settings`
- **Marketplace**：分类 — business 16 / creative 9 / data 56 / databases 4 / finance 7 / marketing 5 / productivity 19 / research 24 / sales 5 / security 11 / software 74
- 部分可见：Adobe / Aikido / Airtable / Amazon S3 / Amplitude / Apify / Apollo / Appwrite / Asana / Atlan / Atlassian / Aurora DSQL / AWS Data Analytics / AWS Serverless / AWS IaC / AWS Knowledge / AWS Pricing / Azure / Bigdata.com / Box / BrowserBase / Buildkite / Carta / SAP CDS / Chrome DevTools / Circle / Circleback / ClickHouse（多个标 `Requires XXX_TOKEN` 环境变量）

**Observation K4 — Plugins tab（⭐ 关键）**

- **Installed**：2 个（与 Probe 5 实测一致）：
  - `p5-spike-plugin`（Global，`C:\Users\19936\.cline\plugins\_installed\local\p5-spike-plugin.ts-d7f2b02ac5d1\p5-spike-plugin.ts`，已启用）
  - `weather-metrics`（Global，`C:\Users\19936\.cline\plugins\_installed\remote\weather-metrics.ts-1770dbabbed0\weather-metrics.ts`，已启用）
- **Marketplace**：分类 — business 1 / creative 1 / data 1 / databases 1 / productivity 6 / research 1 / security 3 / software 9
- 完整可见 plugin 列表（官方）：

| Plugin | 注册的扩展点 | 关联 |
|--------|------------|------|
| **Agent Browser** | bundles `agent-browser` skill，驱动真实浏览器/Electron | |
| **⭐ Agents Squad** | tools: starting/listing/messaging/polling/coordinating background subagents + agent presets + bundled skills + **handoff store**（"so subagents can pass notes back to the parent session"）| **直接命中 #5 handoff 命题** |
| **⭐ Background Terminal** | tools: `start_background_command` / `get_background_command` / `delete_background_command`，jobs 写 metadata+logs 到 Cline data directory | 关联 p5-spike 长任务 |
| **Branch Protector** | `beforeTool` hook，拦截受保护分支的 `git push` | 对应 weather-metrics 母本逻辑 |
| **ClickHouse Data Analyst** | bundles `data-analyst` skill | |
| **Env Blocker** | `beforeTool` hook，拦截读取 `.env` 密钥文件 | |
| **Gitignore Read Files Guard** | `beforeTool` hook，跳过匹配 `.gitignore` 的文件读取 | |
| **Goal** | slash command + completion tool，保持 Cline 聚焦目标 | |
| **Intercom Support Triage** | tools: `fetch_intercom_conversations` / `post_slack_summary`（Requires INTERCOM_API_TOKEN, SLACK_BOT_TOKEN）| |
| **Linear** | bundles `linear-sdk-scripting` skill（Requires LINEAR_API_KEY）| |
| **Mac Notify** | `afterRun` hook，macOS 原生通知 | |
| **Nano Banana** | tool: `generate_image`（Gemini via OpenRouter，Requires OPENROUTER_API_KEY）| |
| **Speak** | conversational response rule + `afterRun` hook（ElevenLabs TTS，Requires ELEVENLABS_API_KEY）| |
| **TypeScript LSP** | tool: `goto_definition(file, line)` | |
| **Web Search** | tool: `web_search`（Exa backend，Requires EXA_API_KEY）| |

---

## Evidence

| # | 证据 | 来源类型 | 置信度 | 支持的结论 |
|---|------|---------|--------|-----------|
| E1 | `contributes.configuration.properties` 为空对象 | 源码（package.json，unminified）| 高 | VS Code 扩展不使用 VS Code Settings 面板 |
| E2 | 20 个命令注册，`commandPalette` menu 只暴露 2 个 | 源码（package.json）| 高 | 命令面板入口极少，大部分通过 UI 触发 |
| E3 | 侧边栏是单一 webview `claude-dev.SidebarProvider` | 源码（package.json）| 高 | 所有 UI 在 webview 内部，不走 VS Code 原生 view |
| E4 | `~/.cline/data/settings/*.json` 含 5 个配置文件 | 实测（PowerShell）| 高 | 实际配置存储在文件系统，非 VS Code Settings |
| E5 | `~/.cline/data/db/` 含 sessions/teams/cron 三个 SQLite | 实测（PowerShell）| 高 | 有团队和定时任务功能（之前未知）|
| E6 | `~/.cline/plugins/_installed/` 含 CLI 安装的 2 个 plugin | 实测（PowerShell）| 高 | VS Code 扩展读取 CLI 全局 plugin store |
| E7 | `feature-flags.json` 含 `ext-cline-pass: true` | 实测（Read）| 高 | 有服务端下发的功能开关机制 |
| E8 | `providers.json` 含明文 apiKey | 实测（Read）| 高 | ⚠️ 安全问题——API key 明文存储 |

---

## Hypothesis

**H1（主假设，置信度：中）**：VS Code 扩展 4.0.0 的所有用户可设置选项分布在三个层面：
1. **VS Code 层**：仅 2 个命令面板命令 + 5 个侧边栏按钮 + 右键菜单/快捷键（package.json 暴露的表面）
2. **webview 层**：5 个按钮内部的设置面板（Settings/Customize/MCP/History/Account 的 webview UI）
3. **文件系统层**：`~/.cline/data/settings/*.json` + workspace 级 `.cline/` 目录

**Inference**：从 E1（VS Code Settings 空）+ E3（单一 webview）+ E4（文件系统配置）推断——VS Code 扩展刻意绕过 VS Code 原生配置系统，所有设置自管。

**H2（置信度：低）**：`cron.db` + `cron/` 目录 + `teams.db` 暗示 VS Code 扩展有定时任务和团队协作功能，可能通过 Account 按钮或独立 UI 入口暴露。

---

## Conflict Registry

### C3-resolved（2026-06-27，官方 docs/sdk/plugins 实测）— Hook 15 stage vs 7 hook 关系澄清

> **来源**：用户在插件内部发现可跳转到 `docs.cline.bot/customization/hooks`（stub 页，指向 SDK Plugins 详情）。WebFetch `docs.cline.bot/sdk/plugins` 获得权威定义。

| 概念 | 官方定义 | 数量 |
|------|---------|------|
| **Hook Stages**（底层生命周期阶段）| `input / runtime_event / session_start / run_start / iteration_start / turn_start / before_agent_start / tool_call_before / tool_call_after / turn_end / stop_error / iteration_end / run_end / session_shutdown / error` | 15 |
| **Lifecycle Hooks**（plugin 可注册的 typed callback）| `beforeRun / afterRun / beforeModel / afterModel / beforeTool / afterTool / onEvent` | 7 |

**C3 处置（已解决）**：二者**不是同一层**，是粒度关系——
- 15 个 Hook Stages 是 agent 运行时的**底层事件流阶段**（系统内部）
- 7 个 Lifecycle Hooks 是 plugin 在 `hooks: {}` 对象里**可注册的 typed callback**（开发者接口）
- 映射示例（官方明确）：`before_agent_start` stage → 用于"Inject context or modify prompt/messages"；`tool_call_before` → `beforeTool`；`tool_call_after` → `afterTool`；`run_end` → `afterRun`

**关键引文（官方原文）**：
> "Hooks are defined inside the `hooks` object, not directly on the extension. The available lifecycle hooks are `beforeRun`, `afterRun`, `beforeModel`, `afterModel`, `beforeTool`, `afterTool`, and `onEvent`."

**对 #5 的影响（重要）**：
- `before_agent_start` stage 官方注明用途是 **"Inject context or modify prompt/messages"**——这正是 #5 想要的"compact 后注入持久化上下文"的潜在入口
- 但 **messageBuilder 仍是独立扩展点**（capabilities 数组里的 `messageBuilders`），与 7 个 lifecycle hooks 并列，非 hook 之一
- ⚠️ **未解决**：messageBuilder 与 `before_agent_start` hook 哪个才是 compact 流程的正确介入点，仍需源码核查（关系 P5 Spike 重启前提）

### 其余

（package.json 与文件系统核查一致，无其他冲突）

---

## Remaining Unknown

> 待用户实测 webview 内部入口后解答。Settings/Customize 已实测（J/K 段），hooks/scheduling 官方文档已读（L 段）。

1. ~~**U1**：Settings 按钮内部有哪些设置项？~~ ✅ 已解答（J 段，5 tab）
2. ~~**U2**：Customize marketplace 有哪些 plugin？分类如何？~~ ✅ 已解答（K 段）
3. **U3**：MCP Servers 按钮内部的操作选项？（K3 部分覆盖，独立按钮待实测）
4. ~~**U4**：History 按钮内部的操作选项？~~ ✅ 已解答（L 段 Observation L3：Fuzzy search + 7 种排序）
5. **U5**：Account 按钮内部的操作选项？
6. **U6**：New Task 对话界面的 slash commands / 模式切换 / 上下文管理？
7. ~~**U7**：`cron.db` + `cron/` 目录对应的定时任务功能如何使用？~~ ✅ 已解答（L 段 L2：`cline schedule` wizard，但**仅 SDK/CLI/Kanban，VSCode 扩展不可用**）
8. **U8**：`teams.db` 对应的团队功能如何使用？
9. **U9**：`hub-daemon.log` 对应的 Hub daemon 是什么？（L 段 L2 部分解答：scheduling 依赖 hub，创建 schedule 时自动启动）
10. **U10**：`ext-cline-pass` feature flag 启用了什么功能？
11. **U11**：workspace 级 `.cline/plugins/` 自动扫描是否触发？（Probe 5 延续）
12. **U12（新）**：messageBuilder 扩展点 vs `before_agent_start` hook stage——哪个是 compact 流程的正确介入点？（P5 Spike 重启前提，需源码核查）

---

## L. Hooks + Scheduling 官方文档（实测 2026-06-27，用户提供入口）

> **来源**：用户在插件内部发现可跳转到 `docs.cline.bot/customization/hooks`。该页为 stub（"See details under SDK Hooks page / SDK Plugins"），实际内容在 `docs.cline.bot/sdk/plugins`。同时该 stub 页侧边栏暴露 **Scheduling** 入口（对应文件系统层发现的 `cron.db`）。

**Observation L1 — Hook 体系（官方一手，高置信度）**

详见上方 Conflict Registry C3-resolved。关键：
- 15 Hook Stages（底层）vs 7 Lifecycle Hooks（plugin 接口）是粒度关系
- Hook Policies（官方）：`mode`(blocking/async) / `timeoutMs` / `retries` / `retryDelayMs` / `failureMode`(fail_open/fail_closed) / `maxConcurrency` / `queueLimit`
- `fail_closed` 用于 policy-enforcement hook（绕过不安全时）
- `before_agent_start` 官方用途："Inject context or modify prompt/messages"——#5 潜在介入点

**Observation L2 — Scheduling 功能（官方一手，解答 U7）**

- `cron.db` / `cron/` 目录对应 `cline schedule` 命令（CLI cron 调度）
- ⚠️ **关键约束**：官方明确 "This feature currently only applies to Cline SDK, CLI, and Kanban. **This feature is not applicable on VSCode and JetBrains Extension for now.**"——与 plugin（C1，4.0.0 已支持）不同，scheduling 在 VSCode 扩展**不可用**
- 功能：`cline schedule` wizard（create/list/trigger/pause/resume/delete/executions/statistics）+ cron 表达式 + `--workspace` / `--model` flag
- **依赖 hub**（解释 `hub-daemon.log`，U9 部分解答）："Scheduling requires the hub. It starts automatically when you create a schedule." → hub daemon 是 scheduling 的后台进程
- 可配合 connectors 路由结果到 Telegram 等

**Observation L3 — History 面板（实测，用户截图，解答 U4）**

- Fuzzy search history 搜索框
- 7 种排序/筛选：Newest / Oldest / Most Expensive / Most Tokens / Most Relevant / **Workspace Only** / **Favorites Only**
- 每条历史显示：标题 + 时间 + 成本（如 $0.1254）+ 收藏星标
- 含 OLDER 分组

**Inference**：scheduling 的"VSCode 不可用"约束（L2）与 plugin 的"VSCode 已可用"（C1）形成对比——说明 Cline 不同功能对 VSCode 扩展的支持进度不一致，docs 的 "not applicable for now" 需逐功能核实，不能一概而论。这印证了 §15 时效性模型的必要性（功能支持矩阵随版本变化）。

---

## Decision

（待 webview 剩余内部入口实测后填写——将形成完整的 VS Code 扩展可设置选项清单，并更新 ADR-002 Update 5。本次新增：C3 hook 体系冲突已解决、U7 scheduling 已解答、U4 History 已解答、新增 U12 messageBuilder vs hook 介入点待源码核查）

---

## 产源说明

本 Investigation Note 沿用 [evidence-governance.md §14](../evidence-governance.md) 所列成熟实践：
- **Observation/Evidence/Hypothesis 状态机** → EBSE + 科学方法
- **多源交叉验证**（package.json + PowerShell + 用户观察）→ EBSE 证据分级
- **Remaining Unknown 显式列出** → 科学方法"I don't know"合法答案

无创新部分。
