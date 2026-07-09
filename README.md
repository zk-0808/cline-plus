# Governance Framework

> AI agent 治理脚手架——把"会话交接 / 证据治理 / 评审纪律 / 经验沉淀"从一次性脚本变成可复用框架。
>
> 从 [cline++](https://github.com/zk-0808/cline-plus) 项目三周实战蒸馏。本仓库是 **git template repo**——`Use this template` 或 `git clone` 即用。

---

## 这是什么

一套 **Cline AI agent 治理框架**,用五层架构组织:

| 层 | 目录 | 生命周期 | 职责 |
|----|------|---------|------|
| L1 Core | `.governance/core/` | 年/月 | 跨项目通用宪法(≤800 token 判定动作) |
| L2 Rules | `.governance/rules/` | 周 | 装好即生效的薄入口(每份 ≤50 行) |
| L3 Capability | `.governance/capabilities/` | 月 | "怎么做"的代码模块(pass/block/inject) |
| L4 Hooks | `.governance/hooks/` | 天 | "什么时候调用"的事件驱动检查 |
| L5 Runtime | `HANDOFF.md` + `.governance/runtime/` | 每次 session | 动态状态文件 |

完整设计依据见 [`docs/decisions/delivery-framework-design.md`](docs/decisions/delivery-framework-design.md)(GV-7 v1.2 冻结契约)。

**想用本框架治理你的 Cline AI agent?** 读 [开发者指南](docs/developer-guide/README.md)——30 分钟从 clone 到跑通。

---

## 安装

### 方式 1: GitHub Template

```
点本仓库右上 "Use this template" → 创建你的项目 → git clone
```

### 方式 2: git clone

```bash
git clone https://github.com/zk-0808/cline-plus.git your-project
cd your-project
rm -rf .git docs/  # 删除源项目历史与 cline++ 专属文档
git init
```

### 方式 3: 叠加到已有项目

```bash
cd your-existing-project
git remote add template https://github.com/zk-0808/cline-plus.git
git fetch template main
git checkout template/main -- .governance/ .clinerules HANDOFF.md
git remote remove template
```

---

## 接入后第一步: 改参数

打开 [`.governance/core/constitution.md`](.governance/core/constitution.md) 底部"项目可调参数"区,按你的项目调整:

```markdown
| 参数 | 本仓库取值 | 含义 |
|------|-----------|------|
| `independent_evidence_count` | 2 | 关键结论独立证据类型最小数 |
| `uncommitted_file_threshold` | 5 | handoff 触发器 b 文件堆积阈值 |
| ... |
```

判定动作不动,只改取值。

---

## 三种使用路径

按你的需求选一条:

### 路径 A: 完整示例(推荐默认)

保留 `.governance/examples/` 全部 4 份示例包,照着改:

- [`examples/dev-rules.md`](.governance/examples/dev-rules.md) — 执行边界规则(含 cline++ 假设清单 + 修改提示)
- [`examples/evidence-governance.md`](.governance/examples/evidence-governance.md) — 证据状态机
- [`examples/reviewer-personas.md`](.governance/examples/reviewer-personas.md) — 评审角色配置
- [`examples/handoff-example.md`](.governance/examples/handoff-example.md) — HANDOFF.md 填写示例

每份示例头部含"cline++ 特定假设"区块——按表格修改建议改你的项目即可。

### 路径 B: 自建规则

删除 `.governance/rules/` 入口规则,保留 `core/` + 自建 rules/ + `HANDOFF.md`。骨架 + 自定义。

### 路径 C: 最小安装

删除 `.governance/examples/` 与 `.governance/hooks/` + `.governance/capabilities/`,仅保留 `core/` + `rules/` + `runtime/` + `.clinerules`。纯文档治理,无自动化。

完整删除矩阵见 [delivery-framework-design.md §五](docs/decisions/delivery-framework-design.md)。

---

## 新会话首动作(给 AI 的指令)

每次新会话开始时,把下面这句贴给 AI:

```text
读 .governance/core/constitution.md + HANDOFF.md + .governance/rules/。
```

AI 会按 [`rules/handoff-entry.md`](.governance/rules/handoff-entry.md) 的读取门控执行:先读宪法,再读交接文件,再读活跃入口规则。读完前不会启动任何开发动作。

---

## 启用 Hook(可选)

若你用 Cline CLI 且想启用自动化:

1. 运行同步脚本将 `.governance/plugin/` + `.governance/capabilities/` 同步到 CLI 发现路径:
   ```powershell
   # Windows
   powershell -ExecutionPolicy Bypass -File scripts\sync-governance-plugin.ps1
   
   # macOS/Linux
   bash scripts/sync-governance-plugin.sh
   ```
2. 配置 `.governance/hooks/config.json`（阈值、路径等）
3. 启动 `cline -i` 验证: 检查 `.governance/runtime/plugin-loaded.marker` 是否创建
4. Hook 触发时调用 Capability,实现:
   - **SessionStart**: 自动读 HANDOFF.md + snapshot.json + constitution + rules 注入上下文
   - **PreToolUse**: 检测未 commit 文件堆积达阈值 → 阻断工具调用
   - **PreCompact**: 写 snapshot.json
   - **PostToolUse**: 纯占位,可自加 lint/test

详细步骤见 [开发者指南 §2-§4](docs/developer-guide/development-guide.md)。

不用 Hook 时,上述动作由人工触发(读 HANDOFF.md / 检查 git status)。

---

## 经验沉淀最小回路

框架内置"经验可沉淀"承诺:

```
人判断"这值得沉淀"
  ↓
调用 capabilities/rule-appender
  ↓
追加到 HANDOFF.md 待沉淀区(结构化)
  ↓
人工 review → 晋升到 rules/ 或删除
```

**判断由人做,追加由机器做,晋升由人做**。完整治理引擎(自动判断/退役/路由)留阻塞后续集。

详见 [`rules/lifecycle.md`](.governance/rules/lifecycle.md)。

---

## 框架契约

- **分发形态**: git template repo(唯一)
- **版本管理**: git tag(v1.0 / v1.1 ...)
- **目录契约**: [`docs/decisions/delivery-framework-design.md`](docs/decisions/delivery-framework-design.md) (GV-7 v1.2 冻结)
- **接口契约**: Capability 三态(pass/block/inject),见 [`capabilities/README.md`](.governance/capabilities/README.md)

---

## 已知局限

| 局限 | 缓解 |
|------|------|
| 框架在 2 个项目 dogfood 过(cline++ + task-tracker CLI) | `examples/` 示例包降低自建门槛;D1-D5 通用性验证通过 |
| VS Code 端 Hook 全部阻塞(BL-1) | CLI 端 S1-S5 全通过,VS Code 恢复后即插即用 |
| Core Constitution 通用化未经验证 | 保留判定动作而非空泛原则,降低过拟合风险 |
| Compaction 实测阻塞(BL-2) | snapshot 写入设计完成;等 PR #12032 合并后端到端验证 |

---

## License

MIT
