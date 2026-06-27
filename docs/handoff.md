# Handoff — VS Code 扩展可设置选项盘点 + Marketplace 开发机制并行调查

## 本会话决策

| 决策 | 状态 |
|------|------|
| Probe 5 实测：VS Code 扩展 4.0.0 已有 plugin 装载入口（Customize 按钮）| ✅ 已证实 |
| VS Code 扩展可设置选项完整盘点（Settings 5 tab + Customize 3 子 tab + 文件系统层）| ✅ 已写 |
| Marketplace 开发机制并行调查（4 subagent：SE/Best-Practice/Process/SE）| ✅ 已完成 |
| "无开发记录"结论证伪（RCA：调查方法缺陷 + 时间衰减 + 时效性门控缺失）| ✅ 已证伪 |
| Agents Squad handoff store 源码核查（与 #5 重叠度低，命题边界明确）| ✅ 已核查 |
| A 组：ADR-002 Update 5 + p5-exit-review §2.4 stale + quick-ref §0 stale | ✅ 已写 |
| B 组：evidence-governance §15/§16/§17/§18 + dev-rules §1.13/§1.14 + ADR-002 退休条件 | ✅ 已写 |
| 外源二手信息部分采纳（O-ext1~6 + C8/C9/C10 + U6）| ✅ 已写 |
| U12 resolved：messageBuilder 是 compact 正确介入点（custom-compaction.ts 源码 6.3KB 直接证实）| ✅ 已解决 |
| 确认 monorepo 结构：`apps/vscode`（VSCode 扩展）+ `sdk/`（SDK）+ `sdk/ARCHITECTURE.md`（26KB 架构文档，Architecture Recon 现成材料）| ✅ 已确认 |

> 本会话由用户"写handoff"明确触发（触发器 a）。主题为 **Cline 扩展能力盘点 + Marketplace 开发机制调查**，承接上一个 handoff 的 Probe 5 实测计划，并实际完成了 Probe 5 + 大幅扩展为 Marketplace 生态调查。

---

## 本会话净变化

### 1. Probe 5 实测结论（推翻 ADR-002 Update 1）

- **Observation**：用户在 VS Code Cline 扩展 4.0.0 的 Customize 按钮发现 plugin 管理面板，已装 p5-spike-plugin + weather-metrics
- **推翻** Update 1 "VS Code 扩展未集成 plugin 装载入口"——该结论仅基于 v3.89.2 CHANGELOG，遗漏 v4.0.0 的 Customize UI
- **ADR-004 恢复条件 2 满足**——#5 不再依赖 CLI 载体，VS Code 扩展直接可用

### 2. VS Code 扩展可设置选项盘点（investigation-note-vscode-settings-inventory.md）

- **Settings 5 tab**：API Configuration（Plan/Act 双模型）/ Features（**Auto Compact 开关**、Hooks 开关、Checkpoints、Yolo Mode）/ Terminal（执行模式 VS Code vs background）/ General（语言、遥测）/ About（v4.0.0）
- **Customize 3 子 tab**：Skills（search-orchestrator 已装）/ MCP（playwright禁/duckduckgo启/skills-mcp-server启）/ Plugins（p5-spike + weather-metrics）
- **文件系统层**：`~/.cline/data/{settings,db}/`（发现 teams.db / cron.db / hub-daemon）、`plugins/_installed/{local,remote}/`
- ⚠️ **安全发现**：providers.json 明文存 API key
- **关键发现**：Auto Compact 是 Cline 原生开关（当前关闭）——#5 的"compact"是原生能力，非自建

### 3. C3 hook 体系冲突解决（用户提供 `docs.cline.bot/customization/hooks` 入口）

> 用户在插件内部发现可跳转到 hooks 官方文档。该页为 stub，实际内容在 `sdk/plugins`。解答了困扰 subagent A 的 C3 冲突。

| 概念 | 数量 | 性质 |
|------|------|------|
| **Hook Stages**（底层）| 15 | agent 运行时底层事件流阶段 |
| **Lifecycle Hooks**（开发者接口）| 7 | plugin 在 `hooks: {}` 里可注册的 typed callback |

**关键发现**：`before_agent_start` stage 官方注明用途 **"Inject context or modify prompt/messages"**——#5 的潜在介入点。但引发了 U12：messageBuilder vs `before_agent_start` hook 哪个是 compact 流程的正确介入点？

### 4. U12 完全解决（WebFetch custom-compaction.ts 6.3KB 源码，官方一手，高置信度）

> **方法**：通过 GitHub API 直接定位 `sdk/examples/plugins/custom-compaction.ts`，WebFetch 获取完整源码（6,334 bytes，0 截断）。未走 minified 推断。按 [§1.6](dev-rules.md) 双来源验证（源码 + ARCHITECTURE.md 交叉）。

**Observation**：custom-compaction.ts manifest `capabilities: ["messageBuilders"]`，使用 `api.registerMessageBuilder({ name: "summarize-middle-history", build(messages) { ... } })`。build() 接收 `Message[]` 返回 `Message[]`——纯消息变换函数。核心逻辑：估算 token → 超 75% 阈值 → 保留首条 user message + 最近 24K token → 中间历史替换为一条摘要 message。**不写入文件系统**。

ARCHITECTURE.md §9 明确 compaction 职责分工：
- `@cline/agents`：turn-preparation seam，运行 lifecycle hooks + **允许 hosts rewrite message history before provider call**
- `@cline/core`：compaction policy + **"inject a prepare-turn pipeline for root sessions"**
- Core 在 plugin messageBuilder 之后运行内置的 API-safety message builder（最终保护）

**结论（U12）**：
- ✅ `registerMessageBuilder` 是 compact 流程的正确介入点——custom-compaction.ts 就是官方 example
- ❌ `before_agent_start` hook 不是 compact 正确答案（那是底层 stage，messageBuilder 是独立扩展点）
- ✅ build() 内可以做 fs.writeFileSync 写 handoff.md + index.jsonl（虽 example 无此例，但 plugin 运行在 Node.js 环境，fs 可用）
- **#5 可直接抄 custom-compaction.ts 的模式**，替换 build() 内摘要逻辑为：写 handoff.md + index.jsonl + 返回修改后消息

### 5. sdk/ARCHITECTURE.md 26KB — Architecture Recon 天降神兵

> 外部专家说的"先花一天画架构图"，这里已经有现成的 26KB ARCHITECTURE.md，含 mermaid 分层图、6 大 package 职责、4 种运行时流程（Local/Hub/Remote/CLI）、9 个 Design Seams（含 compaction 与 extension 系统）。**下次会话唯一应该做的第一件事就是读完这份文档。**

### 6. Marketplace 开发机制（investigation-note-marketplace-dev-mechanism.md，4 subagent）

**后端架构（hybrid）**：
- 公开 catalog：`https://cline.github.io/marketplace/catalog.json`（202 条：149 MCP + 15 plugin + 38 skill，未鉴权）
- 鉴权 API：`api.cline.bot/v1/marketplace/*`（401，WorkOS）
- 数据流：上架侧 → cline.github.io CI 生成 catalog → extension host fetch → postMessage 注入 webview

**上架机制按类型分化**：
- MCP：GitHub Issue + 人工审核（cline/mcp-marketplace）
- Plugin/Skill：PR + `npm run validate`（cline/plugins、cline/skills）

**两套 CONTRIBUTING**（外源 O-ext1 补齐）：
1. 主仓贡献（改 Cline 本体）：`cline/cline` 的 `apps/vscode` → Issue→PR→Playwright E2E
2. Registry 上架（提交第三方扩展）：cline/plugins + cline/skills + cline/marketplace → PR + validate

### 4. "无开发记录"结论证伪（C 号 RCA）

**5 类反证**：npm @cline/sdk 周下载 23.5万 / cline CLI 26.3万 / GitHub abeatrix 7 个 plugin PR（5-6月合并）/ 11 个官方 examples / Marketplace ~22 Plugins

**RCA 根因**：① 调查方法缺陷（把"无 how-to 博客"误等同为"无开发活动"，证据类型混淆 + 单源裁决，主）② 时间衰减（次）③ 时效性门控缺失（结构性）

**元发现（C10）**：外源二手博客停留在 v3.81 "只有 MCP + 源码贡献"，**遗漏 plugin 体系**——印证 plugin/marketplace 是 v4.0 前后新事物，二手沉淀滞后

### 5. Agents Squad handoff store vs #5（C 号 SE Review）

- Agents Squad `capabilities: ["tools"]`，**不用 messageBuilder**；handoff store 是 Blackboard pattern（subagent 间共享，LLM tool 触发）
- #5 是 self-continuity（compact 触发 messageBuilder 产出，自我恢复）
- **重叠度低**——应作为独立 plugin 共存
- #5 借鉴：路径方案 `~/.cline/data/plugins/<plugin>/handoffs/<conversationId>/` + 穿越防护
- #5 独有增量：messageBuilder 注册 + compact 触发 + **index.jsonl 检索索引**

---

## 本会话修改/新建文件

| 文件 | 改动 |
|------|------|
| `docs/decisions/investigation-note-probe-5.md` | 新建（Probe 5 实测）|
| `docs/decisions/investigation-note-vscode-settings-inventory.md` | 新建（可设置选项盘点）|
| `docs/decisions/investigation-note-marketplace-dev-mechanism.md` | 新建（4 subagent 调查 + 外源采纳 §5）|
| `docs/decisions/ADR-002-project-shape.md` | Update 5 + 退休条件补 2 条社区活动触发器 |
| `docs/decisions/ADR-002-p5-experiment-exit-review.md` | §2.4 stale 标注 |
| `docs/refs/plugin-dev-quick-reference.md` | §0 stale 标注 |
| `docs/evidence-governance.md` | 新增 §15 时效性模型 / §16 社区活动证据职责 / §17 调研可复现性 / §18 产源 |
| `docs/dev-rules.md` | 新增 §1.13 时效性门控 / §1.14 "无 X"结论门控 |
| `.cline/plugins/test-plugin/`（如存在）| Probe 5 plugin 文件 |

> ⚠️ **git 未提交**——本会话所有改动尚未 commit，用户未明确指示提交。下次会话或用户要求时执行 `handoff:` commit。

---

## 未完成项 / 后续动作

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **读 `sdk/ARCHITECTURE.md`**（26KB）| Architecture Recon 核心材料，含 mermaid 分层图 + 6 package 职责 + 4 运行时流程 + 9 Design Seams | **最高——下次会话第一件事** |
| **读 `custom-compaction.ts` 源码**（6.3KB）| U12 已解决——messageBuilder 是 compact 正确介入点，#5 的直接模板 | **高——重启 P5 Spike 前必读** |
| **git commit** | 本会话改动未提交，待用户指示 | 高 |
| **决定是否 git clone** | monorepo 仅 12.5 MB，clone 后 grep 源码不再需 WebFetch 截断 | 中 |
| **P5 Spike 重启** | ADR-004 满足 + U12 解决，可直接以 custom-compaction.ts 为模板重设计 | 中 |
| **Architecture Recon¹ ②-⑤** | 请求 Sequence Diagram / 测试入口 / Git History / 公共接口识别——但核心材料已有 ARCHITECTURE.md，2-5 可简化为"补读" | 中 |
| **同步 ARCHITECTURE.md 到 investigation notes** | sdk/ARCHITECTURE.md 是权威架构地图，与本项目的多层文档结构需对齐 | 中 |
| **剩余 VS Code 入口** | MCP Servers 独立按钮 / Account / New Task 对话界面 | 低 |
| **外网提示词 1/2** | U6（主仓结构已确认 `apps/vscode` 存在）/ Marketplace 上架流程 | 低 |

> ¹ **Architecture Recon（架构侦察）** 是外部专家建议的核心方法——在进入任何大型项目前，先花半天到一天建立系统地图，再定位功能入口。本会话被指出最大的问题就是"一直在找功能入口（Feature Entry），而非先画数据流（Data Flow）"。调查顺序应为：**功能流程 → 哪个模块负责 → 模块接口 → 实现**，而不是 `grep → 命中 → 猜语义`。详见 conv history 2026-06-27 尾段。

权威源：[evidence-governance.md（含新增 §15-§18）](evidence-governance.md)、[dev-rules.md（含新增 §1.13-§1.14）](dev-rules.md)、[reviewer-personas.md](reviewer-personas.md)、[ADR-002 Update 5](decisions/ADR-002-project-shape.md)、[investigation-note-marketplace-dev-mechanism.md](decisions/investigation-note-marketplace-dev-mechanism.md)、[investigation-note-vscode-settings-inventory.md](decisions/investigation-note-vscode-settings-inventory.md)、[investigation-note-probe-5.md](decisions/investigation-note-probe-5.md)、[ADR-004](decisions/ADR-004-p5-spike-pause.md)、[mechanism-candidates.md](mechanism-candidates.md)、[project-rules-search-orchestrator.md](project-rules-search-orchestrator.md)

---

## Handoff（下次会话第一句话建议）

```text
先读 docs/dev-rules.md（注意 §1.5-§1.14 执行门控）与 docs/project-rules-search-orchestrator.md 各一次，遵守三份文档职责划分与防漂移约束。
然后读 docs/handoff.md，按下面的工作内容继续。
```

接续上下文：本会话完成 **Cline 扩展能力盘点 + Marketplace 开发机制调查 + U12 关键问题解决**。Probe 5 实测证实 VS Code 扩展 4.0.0 已有 plugin 装载入口，ADR-004 恢复条件 2 满足。用 4 个并行 subagent 调查 Marketplace：后端 hybrid。"无开发记录"结论被 5 类反证证伪，新增 6 条治理规则。C3 hook 冲突通过 hooks 官方入口解决。

**会话末段的转折点**：用户提出"为什么不拉取到本地研究"——确认 monorepo 结构仅 12.5 MB，`apps/vscode` 存在，`sdk/` 存在。更关键的是 `sdk/ARCHITECTURE.md`（26KB）是现成的架构地图，**直接满足 Architecture Recon 的核心需求**。同时直接 WebFetch `sdk/examples/plugins/custom-compaction.ts`（6.3KB，0 截断），**完全解决了 U12**——`registerMessageBuilder` 是 compact 的正确介入点，#5 可直接抄其模式。

**会话末尾收到外部架构建议**：核心问题不是搜索能力，而是缺少 Architecture Recon 阶段。已拆解为 7 条待办（见下文）。

**下次首要动作（按顺序）**：
1. **读 `sdk/ARCHITECTURE.md`**（26KB）——完成 Architecture Recon 核心，不再从 0 画图
2. **读 `custom-compaction.ts` 源码**（6.3KB）——确认 #5 的直接模板
3. **确定是否 git clone 主仓**（12.5 MB，可大幅提速后续调查）
4. 输出外网搜索（提示词 1/2/3，但核心 U12 已解决，提示词 3 优先级下降）
5. 重启 P5 Spike（U12 已解决，#5 可复用 custom-compaction.ts 模式）

**注意**：所有改动尚未提交 git。建议在下次会话第一步 git commit 本会话所有改动，然后再读 ARCHITECTURE.md。
