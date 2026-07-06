# Governance Framework for Cline

> AI agent 治理脚手架——把"会话交接 / 证据治理 / 经验沉淀"从手动操作变成可复用的自动化框架。
>
> 从 [cline++](https://github.com/zk-0808/cline-plus) 项目三周实战蒸馏。

---

## 这是什么

一套 **Cline AI agent 治理框架**，用五层架构组织：

```
L1 Core          .governance/core/          跨项目通用宪法（判定动作）
L2 Rules         .governance/rules/         装好即生效的薄入口规则
L3 Capability    .governance/capabilities/  "怎么做"的代码模块（pass/block/inject）
L4 Hooks         .governance/hooks/         "什么时候调用"的事件驱动检查
L5 Runtime       HANDOFF.md + runtime/      动态状态文件（每次 session）
```

框架提供 4 个 Capability：

| Capability | 触发时机 | 作用 |
|-----------|---------|------|
| `handoff-provider` | SessionStart | 读 constitution + rules + handoff + snapshot，注入到会话上下文 |
| `git-checker` | SessionStart / PreToolUse | 检测未 commit 文件堆积，达阈值时阻断写入工具 |
| `snapshot-writer` | PreCompact | 写 snapshot.json，供下次会话恢复 |
| `rule-appender` | 手动触发 | 把经验机械追加到 HANDOFF.md 待沉淀区 |

---

## 快速开始

### 前置条件

- [Cline CLI](https://github.com/cline/cline) 3.0.37+（`npm install -g @anthropic-ai/cline`）
- Node.js 18+
- Git

### 1. 获取框架

```bash
# 方式 A: clone 作为新项目
git clone -b release/v1.0-alpha https://github.com/zk-0808/cline-plus.git your-project
cd your-project
rm -rf .git
git init

# 方式 B: 叠加到已有项目
cd your-existing-project
git remote add governance https://github.com/zk-0808/cline-plus.git
git fetch governance release/v1.0-alpha
git checkout governance/release/v1.0-alpha -- .governance/ .clinerules
git remote remove governance
```

### 2. 调整项目参数

打开 `.governance/core/constitution.md` 底部"项目可调参数"区，按你的项目调整：

```markdown
| `uncommitted_file_threshold` | 5 | handoff 触发器 b 文件堆积阈值 |
| `independent_evidence_count` | 2 | 关键结论独立证据类型最小数 |
```

判定动作不动，只改取值。同步更新 `.governance/hooks/config.json` 中的 `threshold`。

### 3. 同步插件到 CLI

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-governance-plugin.ps1
```

**macOS / Linux (Bash):**
```bash
bash scripts/sync-governance-plugin.sh
```

这会把 `.governance/plugin/` + `.governance/capabilities/` 复制到 `~/.cline/plugins/installed/local/governance/`。

### 4. 验证

```bash
cline "What is the title of section 1 in Core Constitution?" --json --auto-approve true -t 30
```

如果模型直接回答"执行主体边界"且不调工具——插件加载成功。

检查 marker 文件：
```bash
cat .governance/runtime/plugin-loaded.marker
# 应输出 "loaded at <timestamp>"
```

---

## 工作原理

### Session 启动时

```
Cline CLI 启动
  → 发现 ~/.cline/plugins/installed/local/governance/
  → 调用 plugin.setup()
  → preloadSessionContext():
      读 constitution.md + rules/*.md + HANDOFF.md + snapshot.json + git status
      拼装为 markdown 注入段
  → registerRule() 将注入段加入系统提示词
  → 模型在系统提示词中看到完整的会话上下文
```

### 写入工具调用时

```
模型调用 editor / write / execute_command
  → beforeTool hook 触发
  → git-checker 检查 git status
  → 未 commit 文件 ≥ threshold?
      → 是: 返回 { skip: true, reason: "未 commit 文件堆积..." }  → 工具被阻断
      → 否: 返回 undefined  → 工具正常执行
```

### 对话压缩时（PreCompact）

```
Cline 触发 compaction
  → beforeModel hook 触发
  → snapshot-writer 提取 decisions / todos / next_actions
  → 写入 .governance/runtime/snapshot.json
  → 下次 SessionStart 时 handoff-provider 读取并注入
```

---

## 自定义

### 添加新规则

在 `.governance/rules/` 下新建 `.md` 文件。规则会自动被 `handoff-provider` 读取并注入。

### 添加新 Capability

按 [`.governance/capabilities/SOP.md`](.governance/capabilities/SOP.md) 的 7 步流程开发。

### 配置 Hook

编辑 `.governance/hooks/config.json`：

```json
{
  "session-start": {
    "enabled": true,
    "capabilities": {
      "handoffProvider": { "enabled": true, "args": { ... } },
      "gitChecker": { "enabled": true, "args": { "threshold": 5 } }
    }
  },
  "pre-tool": { ... },
  "pre-compact": { ... }
}
```

---

## 已知局限

> 以下是 v1.0-alpha 的已知硬伤。使用前请评估是否影响你的场景。

### 1. Compaction/Snapshot 未实测

`snapshot-writer` 代码已实现且配置已启用，但因 Cline CLI 的 codec bug（[PR #12032](https://github.com/cline/cline/pull/12032)），从未在真实 compaction 中触发。

**影响**：框架承诺的"长对话不丢上下文"未经验证。短对话（不需要 compaction）不受影响。

**缓解**：等 PR 合并后实测。当前 snapshot.json 会被 handoff-provider 读取，但内容可能是空的。

### 2. 单模型验证

前缀服从度策略（"事实陈述 + 否定祈使"协同效应）仅在 `deepseek-v4-flash` 上通过 A/B 测试（n=10）。

**影响**：换用 Claude / GPT 等其他模型时，注入段可能被忽略，模型仍会冗余读文件。

**缓解**：前缀策略是"防御性"的——即使模型服从度高，加了前缀也不会变差。但如果模型服从度低，可能需要调整措辞。

### 3. 仅 CLI 端可用

VS Code 插件系统（[issue #11944](https://github.com/cline/cline/issues/11944)）不可用，所有 Hook 在 VS Code 端无效。

**影响**：VS Code 用户只能使用 `.governance/` 文档治理（人工读文件），无法使用自动化 Hook。

**缓解**：CLI 端全功能可用。VS Code 恢复后即插即用。

### 4. 仅 Windows/PowerShell 同步脚本

`sync-governance-plugin.ps1` 是 PowerShell 脚本。macOS/Linux 用户需使用 `sync-governance-plugin.sh`（已提供，但未在 macOS/Linux 上实测）。

### 5. 前缀策略不可拆分

A/B 测试发现，"事实陈述"单独使用 100% 无效，"否定祈使"单独使用 100% 无效，**两者组合后 20% 工具调用率**。这不是加性效应而是相变。不要尝试简化前缀（删掉任一组件会导致回到 100%）。

详见 [`docs/decisions/investigation/ab-test-clinerules-conflict.md`](docs/decisions/investigation/ab-test-clinerules-conflict.md)。

---

## 验证状态

| 测试 | 状态 | 说明 |
|------|------|------|
| S1 Plugin 发现 | ✅ PASS | marker 文件创建，setup() 执行 |
| S2 Rule 注入 | ✅ PASS | 模型直接回答 constitution 内容，0 工具调用 |
| S3 Git-checker 阻断 | ✅ PASS | 达阈值时 editor 工具被 skip |
| S4 只读不阻断 | ✅ PASS | readFile 正常工作 |
| S5 Codec 安全 | ✅ PASS | 多轮对话无崩溃 |
| S6 Compaction | 🔴 BLOCKED | CLI codec bug，等 PR #12032 |
| D1-D5 Dogfood | ✅ PASS | 第二项目（task-tracker CLI）全通过 |

测试环境：Cline CLI 3.0.37 + deepseek-v4-flash + Windows 11

---

## 目录结构

```
your-project/
├── .governance/
│   ├── core/
│   │   ├── constitution.md      # L1 宪法（判定动作 + 项目可调参数）
│   │   └── rubric.md            # 通用化判定标准
│   ├── rules/
│   │   ├── handoff-entry.md     # L2 交接机制入口
│   │   └── lifecycle.md         # L2 文档生命周期 + 晋升流程
│   ├── capabilities/
│   │   ├── SOP.md               # Capability 开发 7 步流程
│   │   ├── README.md            # 类型定义 + 复用矩阵
│   │   ├── git-checker/         # git 状态检测
│   │   ├── handoff-provider/    # 会话上下文注入
│   │   ├── snapshot-writer/     # 快照写入
│   │   └── rule-appender/       # 经验追加
│   ├── hooks/
│   │   ├── config.json          # Hook 配置（启用/禁用/参数）
│   │   └── README.md            # Hook 设计说明
│   ├── plugin/
│   │   ├── index.ts             # 插件入口（setup + hooks）
│   │   ├── config-loader.ts     # 配置加载器
│   │   ├── types.ts             # 插件类型定义
│   │   └── hooks/               # Hook 实现
│   ├── examples/                # 示例规则包
│   └── runtime/                 # 运行时产物（gitignore）
├── .clinerules                  # Cline 条件加载入口
├── HANDOFF.md                   # 会话交接文件
├── scripts/
│   ├── sync-governance-plugin.ps1   # Windows 同步脚本
│   └── sync-governance-plugin.sh    # macOS/Linux 同步脚本
└── docs/
    └── decisions/
        └── delivery-framework-design.md  # 框架契约文档
```

---

## License

MIT
