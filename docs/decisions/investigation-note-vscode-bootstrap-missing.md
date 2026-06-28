# Investigation Note: VS Code 扩展 4.0.0 Plugin Sandbox Bootstrap 缺失

日期：2026-06-28

> **框架**：按 [evidence-governance.md §10](../evidence-governance.md) Investigation Note 模板执行。
>
> **关联**：
> - [investigation-note-probe-5.md](../archive/decisions/investigation-note-probe-5.md) — 前置调查（本 Note 修正其 V3 结论）
> - [ADR-002 Update 5](ADR-002-project-shape.md) — Probe 5 修正后的结论
> - [handoff.md](../handoff.md) — 上次会话遗留的"setup() 不执行"未解问题
> - [handoff-plugin-architecture.md](../archive/plugin-refs/handoff-plugin-architecture.md) §9 — Plugin 加载失败的已记录症状

---

## 核心问题

**VS Code 扩展 4.0.0 中 Handoff Plugin 的 `setup()` 为什么始终不执行？**

上次会话（handoff.md 记录）完成了 Phase 2 代码实现（146 行），Customize UI 可以发现 Plugin（显示"已加载"），但 `setup()` 从未执行——debug log 和 marker 文件均不出现。安装了 `_installed/` 和 `installed/` 两条路径、toggle 手动开关也无效。

---

## Observation

> 直接看到的事实，无解释。

1. **VS Code 扩展 bundle `dist/extension.js`（22.5MB）** 包含以下字符串（grep 命中数）：
   - `plugin-sandbox`：4 处（sandbox spawn、bootstrap 路径解析、debug role 分支）
   - `registerMessageBuilder`：5 处（API 注册、sandbox 消息转发、stub 回退）
   - `CLINE_PLUGIN_IMPORT_TIMEOUT_MS`：1 处（超时环境变量字符串）
   - `pluginPaths`：8 处（插件路径处理）
   - `_installed`：2 处（`jvn="_installed"` + `P2e="_installed"` 常量赋值）
   - `loadSandboxedPlugins`：0 处（被 minifier 重命名为 `ivn`）
   - `SubprocessSandbox`：0 处（被 minifier 重命名为 `Xmn`）
   - `discoverPluginModulePaths` / `resolvePluginConfigSearchPaths`：0 处（被 minifier 重命名）

2. **`plugin-sandbox-bootstrap.js` 文件不存在于扩展目录**：
   - `find saoudrizwan.claude-dev-4.0.0 -name "plugin-sandbox*"` → 零命中
   - `find saoudrizwan.claude-dev-4.0.0 -name "bootstrap*"` → 零命中
   - 扩展 `dist/` 目录仅含 `extension.js` 一个文件

3. **同一 bootstrap 文件存在于 CLI 发行包**：
   - `E:\node-global\node_modules\cline\node_modules\@cline\core\dist\extensions\plugin-sandbox-bootstrap.js`（14KB）
   - `E:\node-global\node_modules\cline\node_modules\@cline\cli-windows-x64\extensions\plugin-sandbox-bootstrap.js`（14KB）

4. **CLI 3.0.31 实测 `setup()` 成功执行**：
   - `C:\handoff-plugin-debug.log` 内容：`[1] setup() called at 2026-06-28T02:22:57.440Z`
   - `~/.cline/data/handoff/plugin-loaded.marker` 内容：`loaded at 2026-06-28T02:22:57.451Z`
   - 两个 marker 时间差 11ms

5. **扩展 `package.json` 的依赖声明**：
   - `@cline/core`、`@cline/shared`、`@cline/agents`、`@cline/llms`：`workspace:*`（构建时依赖，不安装到 `node_modules/`）
   - `jiti`：未声明（被内联打包进 `extension.js`）

6. **ALo 特性门控**（bundle 中 `ALo(k, "plugins")` 保护插件加载）：
   - `ALo(t, e)` → `f0t(t, e)` → `new Set(t ?? ZVu).has(e)`
   - `ZVu = rqi = ["rules", "skills", "workflows", "plugins"]`
   - 默认包含 `"plugins"`，门控通过

7. **GitHub Issue #11065**（CLOSED，2026-05-26）：
   - "Plugin sandbox times out at 4000ms on Windows — official example fails to load"
   - 修复：暴露 `CLINE_PLUGIN_IMPORT_TIMEOUT_MS` 环境变量覆盖默认 4000ms 超时

---

## Evidence

| # | 证据 | 来源类型 | 置信度 | 支持的假设 |
|---|------|---------|--------|-----------|
| E1 | bundle 含 `plugin-sandbox` 字符串（sandbox spawn + bootstrap 路径解析）| 源码（minified）| 高 | Plugin sandbox 加载代码被打包进了扩展 |
| E2 | bundle 不含 `plugin-sandbox-bootstrap.js` 文件 | 实测（find）| 高 | Bootstrap 文件未随扩展发布 |
| E3 | CLI 发行包含 `plugin-sandbox-bootstrap.js`（@cline/core + @cline/cli-windows-x64）| 实测（find）| 高 | CLI 正确输出了 bootstrap，扩展未输出 |
| E4 | CLI 实测 `setup()` 成功 | 实测（marker 文件）| 高 | Plugin 代码正确，bootstrap 可用时插件正常 |
| E5 | 扩展 `package.json` 无 `jiti` 依赖声明，`@cline/*` 为 `workspace:*` | 源码（package.json）| 高 | 扩展不安装运行时依赖（全部内联打包）|
| E6 | ALo 门控默认开启 `"plugins"` | 源码（minified）| 高 | 特性门控不是阻塞原因 |
| E7 | Issue #11065：Windows 4s 超时，已修复 | Issue | 高 | 超时是已知问题，有环境变量 workaround |
| E8 | `resolveBootstrap()` 有 5 个候选路径 + jiti fallback | SDK 源码 | 高 | 所有候选路径在扩展环境中均不可用 |

---

## Hypothesis

> 基于证据的解释，明确标注 Inference。

**H1（根因假设，置信度：高）**：VS Code 扩展 4.0.0 的打包流程遗漏了 `plugin-sandbox-bootstrap.js`。

- **Inference**：E1（代码在）+ E2（文件不在）+ E3（CLI 有）→ 扩展的 esbuild 把 plugin loading 代码打进了 bundle，但未将 bootstrap 作为独立文件输出到 `dist/`
- **因果链**：`loadSandboxedPlugins()` → `resolveBootstrap()` → 5 个 `.js` 候选路径全部失败 → fallback 到 `node -e "<jiti script>"` → script 需要 `require("jiti")`（E5：jiti 被内联，子进程无法解析）+ `plugin-sandbox-bootstrap.ts`（不存在）→ 子进程启动失败 → 4000ms 超时 → `setup()` 永不执行

**H2（备选，已排除）**：ALo 特性门控阻止了插件加载。

- **排除依据**：E6 — 门控默认包含 `"plugins"`

**H3（备选，已排除）**：Plugin 发现路径为空，导致 `pluginPaths` 为空。

- **排除依据**：bundle 中 `lvn()` 函数通过 `tQo(workspacePath)` 搜索 Cline home 目录，`plugins/_installed/` 和 `plugins/installed/` 均有插件文件。且 CLI 使用相同发现逻辑成功加载。

---

## Conflict Registry

| 字段 | 内容 |
|------|------|
| **冲突问题** | VS Code 扩展是否"支持" Plugin |
| **来源 A（官方文档）** | "This feature is not applicable on VSCode and JetBrains Extension for now." |
| **来源 B（Probe 5 实测）** | Customize UI 显示 Plugin "已加载"（investigation-note-probe-5.md V3）|
| **来源 C（本调查实测）** | `setup()` 从未执行（debug marker 不存在）；CLI 同一 Plugin 正常执行 |
| **当前置信度** | 高——来源 B 的"已加载"是 UI 发现（discover），不等于 sandbox 激活（load）|
| **裁决** | 代码在 bundle 中（来源 B 部分正确），但 bootstrap 文件缺失导致 sandbox 无法启动（来源 C 确认）|

---

## Verified

> 实测于 2026-06-28。

**V1（高置信度）**：Plugin 代码正确——CLI 3.0.31 中 `setup()` 成功执行，marker 文件在 11ms 内写入。

- 证据类型：实测（marker 文件）
- 独立验证：E4（CLI 实测）× E1（bundle 代码存在）× E3（CLI bootstrap 存在）

**V2（高置信度）**：VS Code 扩展 4.0.0 的 `setup()` 不执行的根因是 **`plugin-sandbox-bootstrap.js` 文件未随扩展发布**。

- 证据类型：实测（find 零命中）+ 源码（`resolveBootstrap()` 候选路径分析）+ 对照（CLI 有该文件）
- 独立验证：E2（文件不存在）× E3（CLI 存在）× E8（候选路径分析）

**V3 修正**：investigation-note-probe-5.md 的 V3 结论"VS Code 扩展**加载并执行**了全局 plugin store 中的 plugin"**过度推断**——UI 显示"Installed"仅表示 `discoverPluginModulePaths()` 发现了文件（UI 层发现），不等于 `loadSandboxedPlugins()` 成功启动了 sandbox 子进程（运行时加载）。

- 修正依据：本调查 V1/V2 + 上次会话 handoff.md 的"setup() 从未执行"事实

**V4（高置信度）**：ALo 特性门控（`ALo(k, "plugins")`）默认开启，不是阻塞原因。

- 证据类型：源码（minified bundle）
- 独立验证：E6

**V5（高置信度，Workaround 实测验证）**：手动复制 bootstrap + 依赖包到扩展目录后，`setup()` 成功执行。

- 步骤：复制 `plugin-sandbox-bootstrap.js` 到 `dist/extensions/` + `@cline/shared`/`@cline/core`/`jiti` 到 `node_modules/` + `setx CLINE_PLUGIN_IMPORT_TIMEOUT_MS=30000`
- 结果：setup() 执行确认，Phase 2 全链路 7 次 compact 事件均捕获
- **U1/U2 状态**：已验证（bootstrap + 依赖解析均正常工作）

---

## Remaining Unknown

1. ~~**U1（已验证）**：手动复制 bootstrap 后依赖解析~~ → V5 确认正常
2. ~~**U2（已验证）**：CLINE_WRAPPER_PATH workaround~~ → 未测试此路径，但 V5 的直接复制方案已验证
3. **U3（未验证）**：Cline 官方是否计划修复此问题？（Issue #11065 仅涉及超时，未涉及 bootstrap 缺失。）
4. ~~**U4（已验证）**：CLI 中 build()/registerMessageBuilder 是否在 compact 时被调用~~ → Phase 2 全链路验证确认（7 次 compact 事件）

---

## Decision

**D1**：investigation-note-probe-5.md V3 / D2 / D3 结论需修正：
- V3 "已加载" → 修正为"已发现（UI 层），未激活（sandbox 层）"
- D2 "VS Code 不可用硬约束解除" → 回退为"VS Code 扩展因 bootstrap 缺失不可用，CLI 可用；Workaround 后 VS Code 也可用"
- D3 "ADR-004 恢复条件 2 满足" → Workaround 下满足，但非官方支持路径

**D2**：Handoff Plugin Phase 1 + Phase 2 验证（CLI）通过——`setup()` 执行 + 7 次 compact 事件全捕获 + 双产物正确写入。

**D3**：VS Code 扩展通过 workaround 可用——bootstrap + 依赖复制方案已验证。

**D4**：mechanism-candidates #5 状态更新为"实验中（CLI 3.0.31 + VS Code workaround）"。

---

## 产源说明

本 Note 格式映射 [evidence-governance.md §14](../evidence-governance.md) 成熟实践：
- **Observation/Evidence/Hypothesis/Verified/Decision 状态机** → EBSE + 科学方法
- **Conflict Registry** → RCA 矛盾证据记录
- **Remaining Unknown** → 科学方法合法未知项
- **V3 修正** → §1.10 Core Proposition Flip 门控——核心命题"VS Code 扩展是否支持 Plugin"翻转历史：不支持(ADR-002) → 支持(Probe 5) → 不支持(本调查) → workaround 可用(本调查 V5)

无创新部分。
