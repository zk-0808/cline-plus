# Project Rules — Plugin (context-snapshot) 开发期约束

> **生命周期**：功能绑定 — context-snapshot plugin 开发，功能冻结后删除（跨功能通用规则迁入 dev-rules.md）。

---

## 1. 构建产物约束（E 盘零散落）

扩展开发过程中产生的**非源码文件**必须遵守以下 confinement 规则：

### 1.1 编译输出

- tsc 编译输出**必须**指定 `--outDir` 到子项目内部目录（如 `context-snapshot/dist/`）
- `dist/` 已在 `.gitignore` 中，不入库
- **禁止**在 E 盘根目录或其他子项目目录生成编译产物
- 若需要覆盖 `package.json` 的 `"type": "module"` 以支持 CommonJS 编译，在 `dist/` 内放置 `package.json` override（`{"type": "commonjs"}`），不修改主 `package.json`

### 1.2 临时测试脚本

- 验证脚本（.cjs / .mjs / .ps1）**必须**放在对应子项目目录内（如 `context-snapshot/verify-extractors.cjs`）
- 验证脚本**必须**能自包含运行（不依赖外部路径）
- 纯临时脚本（一次性使用后不再需要）**必须**在验证完成后立即删除
- **禁止**在 E 盘根目录创建测试脚本

### 1.3 测试日志与 debug 标记

- 插件运行时产生的 debug 日志（hook-debug.log / detection.log / rule-eval.log）**必须**写入 `~/.cline/data/snapshot/`（插件数据目录），不写入源码目录
- debug 标记代码（appendFileSync 等）**必须**带 `// ── DEBUG MARKER (temporary)` 注释，提醒后续清理
- 验证完成后**必须**移除所有 debug 标记代码
- `.log` 文件已在 `.gitignore` 中，不入库

### 1.4 插件安装目录

- 安装目录为 `~/.cline/plugins/installed/local/context-snapshot/`
- 安装方式是 **COPY**（非 symlink）——子模块更新后**必须**手动 `Copy-Item -Recurse -Force` 同步
- **禁止**直接在安装目录编辑源码（源码在子项目 `context-snapshot/src/` 中维护）
- 安装目录中的 `package.json.disabled` 备份文件不影响插件加载，但应保持清理

### 1.5 Cline 工作区临时文件

- Cline CLI 在 `E:\cline++` 下可能产生的临时文件（如 `.cline-tmp/`、`cline.log`）由 CLI 自行管理
- agent 不得在 `E:\cline++` 根目录创建 `.log` / `.tmp` / `.bak` 等临时文件
- 若工具脚本需要输出中间结果，使用 `context-snapshot/dist/` 或 `~/.cline/data/snapshot/`

---

## 2. 扩展编写工作流约束

### 2.1 源码修改 → 安装同步 → 测试 三步流程

每次修改插件源码后，**必须**按顺序执行：

1. 编辑 `E:\cline++\context-snapshot\src\*.ts`
2. `Copy-Item -Recurse -Force` 同步到安装目录
3. 用户在真实终端执行 `cline -v` 测试（§1.2 TTY 约束）

**禁止**跳过步骤 2 直接测试（安装目录可能是旧版本）。

### 2.2 类型声明查阅

- 插件 API 类型声明位于 `E:\node-global\node_modules\cline\node_modules\@cline\shared\dist\`
- 关键文件：`agent.d.ts`（AgentRuntimeHooks）、`extensions/contribution-registry.d.ts`（AgentExtensionApi / PluginSetupContext）
- **禁止**猜测 API 字段名——必须先读 .d.ts 确认

### 2.3 registerRule vs registerMessageBuilder

| 机制 | CLI 3.0.34 行为 | 适用场景 |
|------|---------------|---------|
| `registerRule` content 函数 | **只在 session 启动时评估一次** | 静态内容（如 snapshot context） |
| `registerMessageBuilder` build 函数 | **每次 model request 都调用** | 动态内容（如 loop guard warning） |

**禁止**用 registerRule 做动态 per-turn 注入（已验证为死路径）。

---

## 本文件的生命周期

- 功能绑定 — context-snapshot plugin 开发
- 维护节奏：开发期间随发现随添加；功能冻结后，跨功能通用规则迁入 `dev-rules.md`，本文件删除
- 迁移判据：与具体 plugin 无关、且预期被下一个扩展项目复用的规则才迁入
