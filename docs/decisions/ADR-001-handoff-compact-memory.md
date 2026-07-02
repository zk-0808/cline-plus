# ADR-001: Handoff / Compact / Memory 架构方向

- **Status**: Accepted
- **Date**: 2026-06-23
- **Deciders**: 项目所有者
- **Supersedes**: 无
- **Related**: 后续 Capability Probe / Handoff-v2 Design Doc
- **Evidence as of**: 2026-06-23
- **Expires if unchanged**: 2026-07-23（官方文档/版本号类，30 天）

---

## Context

本项目定位为 Cline 扩展层。在做 Handoff / Compact / Memory 三层模型的实际数据复盘后，得到以下事实：

- 任务分析样本中 `resumed = 73%`（24 / 33），跨会话续作是主流场景
- 自研 Compact 机制的 `compaction_count = 0`，从未实际触发
- Cline 原生已具备自动上下文压缩能力，与本项目 Compact 层职责重叠
- 用户主要工作流位于 Cline 内，跨 IDE 迁移不是当前优先级
- Handoff 设计已被验证有效，承担了主要的状态交接职责

候选方案曾经被展开为 A-F 六种，详见下方 Alternatives 摘要。

---

## Alternatives

| ID | 方案 | 关键特征 |
|----|------|---------|
| A | Handoff 复用 Cline 原生 Compact | 依赖 Cline 能力，零自研压缩 |
| B' | 自动分级 Handoff（inline / crosswindow / silent） | 命中 73% resumed，自动判定 |
| C | 摘要压缩 + 滑动窗口结合 | 精细控制但与 Cline 冲突风险高 |
| D' | 可版本化索引层（JSONL + schema_version + source） | 索引可重建、不做死基础设施 |
| E | 分层记忆 + 短期工作集（Letta/MemGPT 风格） | 与 Cline 模型冲突 |
| F | Cline-native compact 事件钩子 | 自动化的能力前提 |

---

## Decision

```text
采用：
  A   复用 Cline Compact
  B'  自动分级 Handoff
  D'  可版本化索引层

并以前置能力探测（F）确定自动化路径。

暂缓：
  C   摘要压缩 + 滑动窗口（待 A+B'+D' 实测不足时再启动）

拒绝：
  E   分层记忆（与 Cline 模型冲突，违背差异化定位）
```

实现细节（inline commit 策略、session 判定、index schema、source 字段、`/where`、stash 规则、fallback、freshness、task template 分化等）属于 Implementation-level，不在本 ADR 范围，进入后续 Handoff-v2 Design Doc。

---

## Consequences

### 正面

- 删除自研 Compact 路线，消除"零次触发"的死代码债务
- 针对 73% resumed 场景做主线优化，体感改进直接
- 保留 git 可追溯性，符合 "handoff into git" 的差异化哲学
- 与 Cline 原生能力协作而非竞争，长期维护成本下降

### 负面

- 对 Cline 能力边界形成依赖，Cline 接口变化会冲击实现
- 自动化程度取决于 hook / session_id 等能力的可获得性，存在降级风险
- 跨 IDE 迁移成本上升，本项目越来越像 Cline 专属扩展

### 退休条件

- 整体方向：当 Cline 原生提供同等的"分级 handoff + 索引 + 状态可见性"时
- A：当 Cline Compact 接口出现破坏性变更且没有等价替代时
- B'：当 Cline 暴露 session 语义级 hook 让 inline 判定无需启发式时
- D'：当 Cline 原生提供 task slug + 时间戳 + commit 引用的索引能力时

---

## Next Steps

1. **Capability Probe**（ADR 的直接后续任务）
   - 探测 Cline 是否暴露 PostCompact / 等价 hook
   - 探测 Cline 是否暴露 session_id 或等价标识
   - 探测 Cline 的 compact 是否可程序化调用
   - 探测 Cline 的 condense 消息是否可被外部 watcher 检测
2. **Handoff-v2 Design Doc**
   - 基于 Probe 结果落实所有 Implementation-level 决策

```text
ADR-001 (Accepted)
        ↓
Capability Probe
        ↓
Handoff-v2 Design Doc
        ↓
Implementation
```

---

## Update 1 (2026-06-27): Capability Probe 实测计划（承接 ADR-002 Update 3 发现）

### 触发背景

ADR-002 Update 3（2026-06-27）完整调研 VS Code 扩展 4.0.0 原生能力后发现：VS Code 扩展代码层有完整 plugin 注册系统（`registerMessageBuilder` 等 7 个接口）+ 文件 Hook 系统（Windows `.ps1`）+ Skill 装载（6 路径）。这颠覆了 ADR-002 Update 2 发现 3「registerMessageBuilder 仍未在 VS Code 扩展实现」的错误结论，使本 ADR §Next Steps 列出的 4 项 Capability Probe 重新具备实测条件，且追加第 5 项（plugin setup 触发验证）。

### 实测环境

- **载体**：VS Code 扩展 4.0.0（`C:\Users\19936\.vscode\extensions\saoudrizwan.claude-dev-4.0.0`）
- **工作区**：`e:\cline++`（或独立实验仓）
- **执行方式**：遵循 dev-rules.md §1.2，需用户在真实终端执行 VS Code 命令；TRAE agent 负责准备文件、判读结果

### Probe 项（5 项，前 4 项为本 ADR §Next Steps 原始项，第 5 项为 ADR-002 Update 3 追加）

| # | Probe 项 | 实测方法 | 通过标准 | 失败处置 |
|---|---------|---------|---------|---------|
| 1 | VS Code 扩展是否暴露 PostCompact / 等价 hook | 在 `<workspace>/.cline/Hooks/` 或全局 hooks 目录放 `afterCompact.ps1`（Windows），触发一次 compact，检查 hook 是否执行 | hook 脚本写入日志文件 | 若文件 Hook 不支持 afterCompact 事件，检查 plugin automationEventTypes 是否含等价事件；若都不支持，#5 退回 CLI 路径 |
| 2 | VS Code 扩展是否暴露 session_id 或等价标识 | 启动一次 task，检查 task metadata / `better-sqlite3` 数据库 / globalState 是否含 session_id | 找到稳定可读取的 session 标识 | 若无 session_id，用 task_id 替代（`cline.reconstructTaskHistory` 命令暗示有 task 历史） |
| 3 | VS Code 扩展的 compact 是否可程序化调用 | 检查 commands 列表 / dist/extension.js 是否有触发 compact 的 API | 找到可程序化触发的方式 | 若不可程序化调用，#5 依赖 token 自然累积触发 compact（与 CLI 路径相同） |
| 4 | VS Code 扩展的 condense 消息是否可被外部 watcher 检测 | 用 `chokidar` 或 PowerShell `FileSystemWatcher` 监听 task 存储目录，触发 compact，检查是否产生可检测的文件变化 | watcher 能在 compact 发生时收到事件 | 若不可检测，#5 退回 plugin `registerMessageBuilder` 路径（Probe 5 验证） |
| 5 | **手动放 plugin 文件到 `<workspace>/.cline/<pluginName>/` 能否触发 VS Code 扩展执行 setup 函数** | 创建最小 plugin（`.js`/`.ts` + `managed.json` manifest 声明 capabilities），放 `<workspace>/.cline/test-plugin/`，重启 VS Code / reload window，检查 plugin 是否被发现并执行 setup（注册的 `registerMessageBuilder` / `registerTool` 等是否生效）| setup 函数执行（日志写入 / 注册的工具可用 / 注册的 messageBuilder 在 compact 时触发）| 若不触发，检查是否需要通过 `cline.marketplaceButtonClicked`（Customize 按钮）显式装载；若仍不触发，#5 退回 CLI 路径 |

### Probe 5 的关键性

Probe 5 是 ADR-002 Update 3 追加的核心验证项——若通过，则 #5（compact 双产物）可在 VS Code 扩展直接可用，无需 CLI 载体，ADR-004 的"实验环境-生产环境错位"问题解除。若失败，#5 维持 CLI 路径，ADR-004 恢复条件不变。

### Probe 执行顺序

1. **Probe 5 优先**（最高价值——直接决定 #5 能否在 VS Code 可用）
2. Probe 1（PostCompact hook）
3. Probe 2（session_id）
4. Probe 4（condense 消息 watcher）
5. Probe 3（compact 程序化调用）

### Probe 5 实测准备清单（TRAE agent 准备，用户执行）

> **路径与 manifest 格式已于 ADR-002 Update 4 修正**：plugin 文件放 `.cline/plugins/`（非 `.cline/<pluginName>/`），manifest 用 `package.json` 含 `cline` 字段（非 `managed.json`）。
> **生命周期**：永久保留——决策记录，状态由 status 枚举驱动。

1. 创建 `<workspace>/.cline/plugins/test-plugin/` 目录
2. 准备 `package.json`（manifest 声明 capabilities，参考官方文档格式）：
   ```json
   {
     "name": "test-plugin",
     "version": "0.0.1",
     "cline": {
       "plugins": [
         { "paths": ["./index.ts"], "capabilities": ["tools", "messageBuilders", "hooks"] }
       ]
     }
   }
   ```
3. 准备最小 `index.ts` plugin 文件（参考官方 [weather-metrics.ts](https://github.com/cline/cline/blob/main/sdk/examples/plugins/weather-metrics.ts) + [custom-compaction.ts](https://github.com/cline/cline/blob/main/sdk/examples/plugins/custom-compaction.ts) 母本），setup 函数：
   - 调用 `api.registerMessageBuilder(...)` 注册一个空 messageBuilder（验证注册接口可用，capabilities 含 `messageBuilders`）
   - 调用 `api.registerTool(...)` 注册一个测试工具（验证注册接口可用，capabilities 含 `tools`）
   - 写入日志文件 `plugin-loaded.log`（验证 setup 执行）
4. 用户在 VS Code 中 reload window（`Ctrl+Shift+P` → `Developer: Reload Window`）
5. 检查 `plugin-loaded.log` 是否生成
6. 在 Cline 对话中检查测试工具是否可用
7. 触发一次 compact（长对话），检查 messageBuilder 是否被调用

**注意**：官方文档明确"VS Code 扩展不支持 plugin"（"This feature is not applicable on VSCode and JetBrains Extension for now"），但 VS Code 扩展代码层有完整 plugin 注册系统（ADR-002 Update 3 确认）。Probe 5 实测的是"代码层有实现但 UI 层未暴露命令"的情况下，手动放文件到 `.cline/plugins/` 能否触发自动发现——这是官方文档未明确说明的灰色地带。

### 后续动作

- Probe 5 通过 → ADR-004 恢复条件 2 满足，P5 Spike 可重启（在 VS Code 扩展环境）
- Probe 5 失败 → 维持 ADR-004 deferred 状态，#5 退回 CLI 路径
- Probe 1-4 结果 → 更新 Handoff-v2 Design Doc 的实现细节

### 本 Update 不变更的内容

- ADR-001 整体方向（A 复用 Cline Compact + B' 自动分级 Handoff + D' 可版本化索引层）不变
- ADR-001 status 仍为 Accepted
- 本 Update 仅追加 Probe 实测计划，不构成方向调整
