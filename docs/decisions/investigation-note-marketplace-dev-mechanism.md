## Investigation Note: Cline Marketplace 扩展开发机制并行调查
日期：2026-06-27

> **框架**：按 [evidence-governance.md §10](../evidence-governance.md) Investigation Note 模板，配合 [reviewer-personas.md](../reviewer-personas.md) 固定角色集 + [dev-rules.md §1.12](../dev-rules.md) 多角色 subagent 并行调用规则。
>
> **关联**：
> - [investigation-note-vscode-settings-inventory.md](investigation-note-vscode-settings-inventory.md) — Customize 面板实测发现 Marketplace 规模（~50 Skills / ~200 MCP / ~22 Plugins）
> - 旧结论出处待 C 号 subagent 核查（推测在 [survey.md](../search/search-orchestrator/survey.md) 或 ADR-002 早期 Update）

### 核心问题

**Cline Marketplace 上的扩展（Skills / MCP / Plugins）是怎么开发的？由谁开发？通过什么渠道上架？**

起因：之前调查结论称"社区上没有开发记录"，但 Customize 实测发现 Marketplace 已有数百个扩展——结论与现状矛盾，需重新核查。

### 调查维度与角色映射

| # | 维度 | 角色 | 调查问题 | 主要证据来源 |
|---|------|------|---------|-------------|
| A | 官方开发渠道 | SE Reviewer | 官方文档/源码/示例仓库覆盖了哪些扩展类型的开发？契约是否清晰？| docs.cline.bot / GitHub cline/cline / SDK examples |
| B | 行业实践对照 | Best-Practice Mapper | VSCode/Cursor/Continue/Claude Code 等 marketplace 的扩展开发机制是什么？Cline 是否符合成熟模式？| VSCode Extension API / Cursor docs / Continue.dev docs / Anthropic docs |
| C | 旧结论证据核查 | Process Reviewer（RCA）| "无开发记录"结论的原始证据链是什么？时效性如何？是否过时？| docs/survey.md / docs/decisions/ / GitHub issues / Reddit / npm |
| D | Marketplace 实现探测 | SE Reviewer | Marketplace 后端 API/registry 在哪？数据结构如何？扩展如何上架？| dist/extension.js / GitHub 源码 / 网络探测 |

### 子代理任务规范

每个 subagent 收到：
1. 角色注入 prompt（从 reviewer-personas.md §3 复制）
2. 完整任务上下文（背景 + 调查对象 + 已知事实）
3. 调查问题清单
4. 证据来源建议
5. 交付物格式（Observation / Evidence / Hypothesis / Conflict / Remaining Unknown）

### 已知事实（所有 subagent 共享上下文）

1. VS Code 扩展 4.0.0 已安装，Customize 按钮打开 Marketplace UI
2. Marketplace 三个子 tab：Skills / MCP / Plugins，每个有 Installed + Marketplace 两栏
3. 已 Installed 的扩展：
   - Skills：search-orchestrator（Global）
   - MCP：playwright(禁) / duckduckgo(启) / skills-mcp-server(启)
   - Plugins：p5-spike-plugin（local 安装） / weather-metrics（remote URL 安装）
4. Plugin store 路径：`~/.cline/plugins/_installed/{local,remote}/<name>.ts-<hash>/<name>.ts`
5. 官方 plugin SDK 文档：https://docs.cline.bot/sdk/plugins
6. 官方 plugin examples：https://github.com/cline/cline/tree/main/sdk/examples/plugins
7. 官方 plugin 安装文档：https://docs.cline.bot/customization/plugins
8. Marketplace 上有官方 plugin：Agents Squad（含 handoff store）/ Background Terminal / Branch Protector / TypeScript LSP / Web Search 等

### 交付物汇总（4 个 subagent 已完成）

| Subagent | 状态 | 关键发现 |
|----------|------|---------|
| A（官方渠道 / SE Reviewer）| ✅ done | 官方有完整 4 registry 仓库（cline/marketplace 统一 catalog + cline/plugins 17 官方 + cline/mcp-marketplace issue-based + cline/skills cross-agent）；上架走 PR + schema 校验 + npm run validate；但 docs vs README 存在 5 处冲突（6 vs 8 capability / 15 vs 7 hook / 9 vs 11 examples / VSCode 支持矛盾 / MCP 渠道双轨）|
| B（行业对照 / Best-Practice Mapper）| ✅ done | Cline 是"成熟实践合规收敛实现"非创新；与 Cursor/Claude Code 高度同构（Skills/MCP/Plugins）；manifest 走 package.json + cline 字段（VSCode contributes 本地扩展）；hash 内容寻址是 npm/Nix 本地扩展；主要缺口：发布者身份（P0）/运行时信任（P0）/审核扫描（P1）/签名校验（P1）|
| C（旧结论核查 / Process Reviewer）| ✅ done | 原结论 5 处出处已定位；原证据单源（搜博客/踩坑记录，未记 query）；当前 5 类反证：npm @cline/sdk 周下载 23 万+ / GitHub abeatrix 7 个 plugin PR（2026-05-19~06-23 合并）/ 11 个官方 examples / 4 种 install 来源 / Marketplace ~22 Plugins；RCA 根因：调查方法缺陷（主）+ 时间衰减（次）+ 时效性门控缺失（结构性）|
| D（实现探测 / SE Reviewer）| ✅ done | 后端是 hybrid：公开 catalog（cline.github.io/marketplace/catalog.json，202 条：149 MCP + 15 plugin + 38 skill，未鉴权）+ 鉴权 API（api.cline.bot/v1/marketplace/*，401，WorkOS）；上架按类型分化（MCP=Issue+审核 / Plugin/Skill=PR+CI validate）；数据流：上架侧→cline.github.io CI 生成 catalog→extension host fetch→postMessage 注入 webview；安全模型偏弱（无 signature/hash，.ts 在 host 进程执行无沙箱）|

---

## 综合发现（4 subagent 交叉验证）

### 1. Marketplace 完整实现机制（D 主证，A 辅证）

**数据流**：
```
上架侧（三种分化机制）
  MCP:    GitHub Issue → cline/mcp-marketplace → 人工审核（4 维度）→ 后端 DB
  Plugin: PR → cline/plugins (plugins/<slug>/) → CONTRIBUTING review + npm run validate CI
  Skill:  PR → cline/skills (skills/<slug>/) → review
                ↓ 周期性 CI 构建（generatedAt 时间戳）
聚合层：cline/cline.github.io 仓库 (GitHub Pages)
  生成 /marketplace/catalog.json（202 条 entries：149 MCP + 15 plugin + 38 skill）
  生成 /marketplace/icons/{type}/{id}.svg
                ↓ 未鉴权公开 fetch
VS Code 扩展（4.0.0）
  extension host (Node) fetch(catalog.json) → postMessage → webview 渲染 3 tab
  "Requires API_KEY" 徽标 = install.env 字段 + 客户端正则 mch 双重产生
                ↓ 用户点击 install
执行侧（CLI/SDK，非 webview）
  cline mcp install <id>     → MCP 代理 api.cline.bot/v1/mcp/{server_id} 或本地 npx
  cline plugin install <slug> → git clone cline/plugins.git → plugins/<slug>/index.ts
  cline skill install cline/skills --skill <id>
  安装目标：~/.cline/plugins/_installed/{local,remote,npm,git}/
```

**鉴权 API**（`api.cline.bot/v1/marketplace/*`，401）：语义未验证（可能是个性化/安装记录/verified 同步），需登录态抓包。

### 2. "无开发记录"结论彻底证伪（C 主证，A/D 辅证）

**原结论 5 处出处**：
- `docs/plugin/refs/plugin-dev-quick-reference.md` §0（2026-06-23）+ 第 272 行
- `docs/decisions/ADR-002-project-shape.md` Context §5（第 29 行）+ Update 1（第 392 行）
- `docs/decisions/ADR-002-p5-experiment-exit-review.md` §2.4（第 77 行）

**原证据**：单源——"搜过 SDK plugin 开发的中英文社区经验、博客、踩坑记录"，未记录 query 列表。

**当前反证 5 类**（2026-06-27 实测）：
| 反证 | 数据 | 来源 |
|------|------|------|
| npm @cline/sdk 周下载 | 234,966 | npm registry |
| npm @cline/core 周下载 | 239,780 | npm registry |
| npm cline CLI 周下载 | 263,674 | npm registry |
| GitHub 外部贡献者 abeatrix | 7 个 plugin PR（2026-05-19~06-23 合并）| GitHub PR 历史 |
| 官方 plugin examples | 11 个（含 weather-metrics/custom-compaction/agents-squad 等）| GitHub sdk/examples/plugins |
| 独立官方 plugin 仓库 | typescript-lsp-plugin | GitHub cline/typescript-lsp-plugin |
| cline plugin install 来源 | 4 种（file URL/git/npm/local）| 官方文档 |
| Marketplace 上架 | ~22 Plugins / ~50 Skills / ~200 MCP | catalog.json + 用户实测 |

**反讽**：原结论形成日 2026-06-23 当天，abeatrix 的 #11731 / #11728 plugin development PR 刚好被合并。

**RCA 根因**：
- 一号根因（主）：调查方法缺陷——证据类型混淆（把"无 how-to 博客"误等同为"无开发活动"）+ 单源裁决
- 二号根因（次）：时间衰减——4 天内 SDK 升 2 patch / CLI 新增 marketplace uninstall / Marketplace 上架 ~22 plugin
- 三号根因（结构性）：结论时效性门控缺失——dev-rules.md §1.3-§1.12 与 evidence-governance.md 均未规定结论有时效期

### 3. Cline 是成熟实践收敛，非创新（B 主证，A/D 辅证）

**与对照产品同构**：
| 维度 | Cline | VSCode | Cursor | Claude Code | LangSmith Hub |
|------|-------|--------|--------|-------------|---------------|
| 扩展分类 | Skills/MCP/Plugins | contributes | Plugins/Rules/Skills/Subagents/Hooks/MCP | skills/subagents/plugins/hooks/MCP | prompts |
| Manifest | package.json + cline 字段 | package.json + contributes | — | — | — |
| 安装多源 | file URL/git/npm/local | VSIX/CLI/UI | — | — | pull/push API |
| Registry | cline/marketplace catalog.json | Azure DevOps Marketplace | — | claude-plugins-official | smith.langchain.com/hub |
| 审核 | PR + CI validate（plugin/skill）/ Issue + 人工审核（MCP）| 发布者问责 + 信任对话框 | — | 官方审核目录 | — |

**Cline 的本地扩展**（合理，非创新）：
- `cline` 厂商字段（VSCode contributes 模式本地扩展）
- 单文件 `.ts` + hash 内容寻址存储路径（npm cache / Nix 模式本地扩展）
- 业务域分类（VSCode 技术域分类的本地扩展）
- AI 专属扩展点（messageBuilders/automationEvents/providers）

**主要缺口**（按优先级）：
| 优先级 | 缺失项 | 对标 |
|--------|--------|------|
| P0 | 发布者身份/账号体系 | VSCode publisher + PAT |
| P0 | 运行时信任机制 | VSCode 1.97+ 信任对话框 |
| P1 | 审核/扫描流程 | Claude Code 官方审核目录 |
| P1 | 完整性/签名校验 | npm provenance / VSIX 签名 |
| P1 | API 稳定性政策 | VSCode Proposed/Stable API 双轨 |

### 4. Conflict Registry 汇总（5 处 + 4 处新增）

| # | 冲突 | 来源 A | 来源 B | 处置 |
|---|------|--------|--------|------|
| C1 | Plugin 是否支持 VSCode/JetBrains | docs: "not applicable for now" | GitHub README: "extends any Cline agent — VS Code, JetBrains" | 以 docs 为准（保守），README 为愿景/过度承诺。**未解决，需官方澄清** |
| C2 | 扩展点数量 | docs Extension Glossary: 6 个 | GitHub README Capabilities 表: 8 个 | 以仓库 README 为完整契约，docs 为简化版 |
| C3 | Hook 分类口径 | docs Hook Stages: 15 个阶段 | GitHub README Runtime hooks: 7 个 | 实为不同粒度（15 底层 stage vs 7 typed callback），docs 未明确关系 |
| C4 | MCP 提交渠道 | cline/mcp-marketplace: issue-based | cline/marketplace: PR-based | 两者并存未声明主从，可能造成提交者困惑 |
| C5 | examples 数量 | docs: 9 个 | GitHub README: 11 个 | docs 落后于仓库 |
| C6（新）| "无开发记录"结论 | plugin-dev-quick-reference.md §0 + ADR-002 Context §5 | npm 23 万周下载 + 7 个外部 PR + 11 个 examples + 22 个 Marketplace plugin | 来源 A 宽义结论作废，需修正 ADR-002 Update 5 + ADR-002-p5-experiment-exit-review §2.4 + plugin-dev-quick-reference.md §0 |
| C8（新）| Cline 版本号 | 外源二手博客（deployhq/apifox）："当前版本约 v3.81" | 实测：VS Code 扩展 4.0.0 + CLI 3.0.31（npm，2026-06-27）| 外源过时——二手博客时间衰减，**正好印证本项目 §15 结论时效性模型**。以实测版本为准 |
| C9（新）| monorepo 扩展目录 | 外源（CONTRIBUTING 博客转述）："VSCode 扩展位于 `apps/vscode`" | subagent A/D 引用 `sdk/examples/plugins/`（cline/cline 主仓）| 不冲突——monorepo 可同时有 `apps/vscode`（扩展宿主）+ `sdk/`（SDK+examples）。**但 `apps/vscode` 路径未经一手验证，标 Remaining Unknown U6** |
| C10（新）| 扩展开发的"正路" | 外源："MCP 是官方推荐的正路（add a tool that...）；另一条是源码贡献" | 我方实测：plugin 体系（package.json + cline 字段 + 8 capabilities）是独立于 MCP 的第三条路 | 外源**遗漏 plugin 体系**——写于 plugin 体系成熟前（v3.81 时代），只知 MCP + 源码贡献两条路。**强化推断**：plugin/marketplace 是 v4.0 前后才成熟的新事物，佐证 C6 "无开发记录作废"的 RCA（不是社区无活动，而是 plugin 体系太新，二手沉淀滞后）|

---

### 5. 外源二手信息部分采纳（2026-06-27 用户提供）

> **证据治理标注**：本节信息来自用户提供的二手博客/教程（deployhq.com / apifox.com / bilibili / runoob / zhaomenghuan blog）+ 官方一手（marketplace.visualstudio.com / github.com/cline/cline/CONTRIBUTING.md）。按 [evidence-governance.md §16](../evidence-governance.md)，二手博客为**低置信度**，不作为独立语义结论，仅与我方一手证据交叉后采纳增量部分。
>
> **层级说明**：外源主要覆盖"使用层 / MCP 自定义层 / 主仓贡献层 / fork 层"，**未触及 cline/marketplace catalog registry 上架机制**（本调查核心）。故仅采纳以下与本调查相邻的增量。

**采纳的增量（Observation，需注意置信度）**：

| # | 增量信息 | 来源 | 置信度 | 与本调查的关系 |
|---|---------|------|--------|--------------|
| O-ext1 | **主仓贡献流程**（区别于 cline/plugins registry 仓 CONTRIBUTING）：monorepo `apps/vscode`，关键命令 `npm run install:all` / `npm run protos`（gRPC/proto 通信）/ `npm run dev` / `npm run watch`；F5 启动扩展开发宿主；提交前跑 `npm run lint` / `npm run format` / `npm test` | github.com/cline/cline/CONTRIBUTING.md（官方一手，但经博客转述）| 中（一手文档，但路径未独立 fetch 验证）| 补充 subagent A——A 发现的是 cline/plugins registry 仓 CONTRIBUTING，这是**主仓**贡献流程，两套不同 |
| O-ext2 | **Playwright E2E 测试**：位于 `src/test/e2e/`（auth/chat/diff/editor.test.ts），Linux 需 libgtk-3-0/libnss3/xvfb 等 GUI 库 | 同上 | 中 | 主仓质量门控信息，本调查未覆盖 |
| O-ext3 | **功能性贡献必须先有获批 GitHub Issue**，否则 PR 可能被关闭（拼写/类型修正除外）；新手从 "good first issue" / "help wanted" 入手 | 同上 | 中 | 与 subagent C 发现的 abeatrix PR 流程呼应——印证 Cline 有 Issue-gated 贡献规范 |
| O-ext4 | **MCP 对话式生成**："add a tool that fetches Jira tickets" 等——Cline 让 LLM 自动创建 MCP server 并安装，零样板 | marketplace.visualstudio.com（官方一手）| 中 | 补充 subagent A——A 发现 MCP 走 `.cline/mcp.json` 配置，但未提这个**对话式生成入口** |
| O-ext5 | **Roo Code（前 Roo Cline）= Cline 的 fork** | runoob/blog（二手）| 低 | 生态背景，与本调查无直接关系，仅记录 |
| O-ext6 | 扩展 ID 仍为 `saoudrizwan.claude-dev`；Apache 2.0；GitHub 6 万+ star；安装量 500 万+ | marketplace（官方）| 中 | 印证 subagent B 的 63.9k star 数据（量级一致）|

**不采纳部分**：使用层信息（安装/Plan-Act/@上下文/模型配置）——与本调查（Marketplace 上架机制）无关，不录入。

**O-ext1 引发的认知更新**：Cline 存在**两套 CONTRIBUTING 流程**——
1. **主仓贡献**（`cline/cline` 的 `apps/vscode` + `sdk/`）：改 Cline 本体，走 Issue→PR→Playwright E2E（O-ext1/2/3）
2. **Registry 上架**（`cline/plugins` + `cline/skills` + `cline/marketplace`）：提交第三方扩展，走 PR + `npm run validate`（subagent A 发现）

这两套此前在本调查中未明确区分，O-ext1 补齐了"主仓贡献"这一维度。

---

## Decision

**D1（修正旧结论）**：ADR-002 Context §5 "社区目前无 Plugin 实战经验沉淀" 在 Update 5 显式修正为 "截至 2026-06-27，社区开发活动已显著存在（npm @cline/sdk 周下载 23 万+，外部贡献者 abeatrix 至少 7 个 plugin PR 合并，Marketplace 上架 ~22 Plugins）"。

**D2（修正 ADR-002-p5-experiment-exit-review §2.4）**：该节"社区无 Plugin 实战沉淀"论据作废，但 SDK 0.x 风险论据独立成立，§2.4 整体结论可能不变——需重新评估论据权重。

**D3（标注 plugin-dev-quick-reference.md §0 stale）**：加 stale 标注或重写，记录 query 列表（如可复现）。

**D4（项目规则补强）**：建议新增：
- `evidence-governance.md §15` 结论时效性模型（涉及外部生态的结论默认 14 天时效期，ADR frontmatter 加 `evidence_as_of` + `expires_if_unchanged`）
- `dev-rules.md §1.13` 结论时效性门控（引用超 14 天未复查的 ADR 结论触发"复查或降级为 Hypothesis"）
- `evidence-governance.md §16` 社区活动证据职责（补全 §3 表格未列的"社区实战沉淀"对应证据类型）
- `evidence-governance.md §17` 调研可复现性（调研类结论必须记录 query 列表 + 搜索引擎 + 时间戳）
- `dev-rules.md §1.14` "无 X"类结论门控（必须经 search-orchestrator SKILL 反证查询 + 至少 3 类独立证据类型一致）
- `ADR-002 §退休条件补充`（增加"Marketplace 上架 plugin 数 > 50"或"npm @cline/sdk 周下载 > 50 万"作为社区活动复查触发器）

**D5（Marketplace 实现机制已摸清）**：可写入 ADR-002 Update 5 作为 VS Code 扩展可设置选项盘点的核心发现——Marketplace 后端是 hybrid（GitHub 文件型 + 中央 API），上架机制按类型分化（MCP issue / Plugin PR / Skill PR），公开 catalog 在 cline.github.io/marketplace/catalog.json。

**D6（mechanism-candidates #5 影响）**：Agents Squad plugin 的 handoff store 是官方既有实现，#5 命题需重新表述——但 Agents Squad 的 handoff 是"子代理→父代理"单向传递，#5 想要的是"compact 时持久化上下文"，二者不完全重叠。需进一步核查 Agents Squad 源码确认。

**D7（外源二手信息部分采纳）**：已采纳 O-ext1~6 增量（见 §5），补充"主仓贡献流程"维度（区别于 registry 上架）。新增 C8/C9/C10 三处 Conflict。**Remaining Unknown U6**：外源称主仓 VSCode 扩展位于 `apps/vscode`，该路径未经一手 fetch 验证——若后续转向"主仓贡献"研究对象，需 git clone 或 GitHub fetch 确认 monorepo 实际目录结构（`apps/vscode` vs `sdk/` 的关系）。

---

## 产源说明

本调查按 [reviewer-personas.md §1](../reviewer-personas.md) 共享约束（best-practice mapper 定位）+ [dev-rules.md §1.12](../dev-rules.md) 多角色 subagent 并行调用规则执行。4 个 subagent 分别注入 SE Reviewer / Best-Practice Mapper / Process Reviewer / SE Reviewer 角色 prompt，独立输出后由父代理整合。无创新部分。

