# Runtime CLI 测试计划

> **生命周期**：任务绑定 — `runtime-cli-test` 完成后归档。
>
> **身份**：Governance Plugin CLI 端集成测试指南。验证 Plugin 在真实 Cline CLI 3.0.37 环境中的加载、Hook 触发、Rule 注入行为。
>
> **前置条件**：
> - Cline CLI 3.0.37 已安装（`cline --version` 确认）
> - `.governance/plugin/` 目录存在且 tsc 通过
> - `npx tsx .governance/plugin/verify-governance.ts` 50 测试全过

---

## 测试层级

| 层级 | 脚本 | 执行方 | 验证什么 |
|------|------|--------|---------|
| **L1 离线逻辑** | `verify-governance.ts` | agent 自动 | Capability + dispatcher 核心逻辑（已完成 50 passed） |
| **L2 CLI 集成** | 本文档 S1-S5 | 用户手动 | Plugin 加载 / Hook 触发 / Rule 注入 / git-checker block |
| **L3 长对话** | S6 | 用户手动 | Compaction 检测 + snapshot 写入（受 BL-2 阻塞） |

---

## S1: Plugin 发现阶段

**目的**：验证 Cline CLI 3.0.37 能否发现 `.governance/plugin/package.json` 并加载 plugin。

**前提**：`.governance/plugin/package.json` 含 `cline.plugins` 字段。

**步骤**：

```powershell
# 1. 确认 package.json 格式正确
Get-Content .governance\plugin\package.json | ConvertFrom-Json | Select-Object -ExpandProperty cline

# 2. 删除旧 marker（如果存在）
Remove-Item .governance\runtime\plugin-loaded.marker -ErrorAction SilentlyContinue

# 3. 启动短对话（在真实终端执行）
cline -v "hello"
```

**验证**：

| 检查项 | 方法 | 预期 |
|--------|------|------|
| marker 文件创建 | `Test-Path .governance\runtime\plugin-loaded.marker` | `True` |
| marker 内容 | `Get-Content .governance\runtime\plugin-loaded.marker` | `loaded at <ISO时间>` |
| stdout 含 setup 日志 | cline 输出 | `[governance] setup() called` |
| stdout 含 preload 日志 | cline 输出 | `[governance] session context preloaded (N chars)` |
| stdout 含 setup done | cline 输出 | `[governance] setup() done` |

**失败排查**：

- marker 未创建 → plugin 未被发现。检查 `package.json` 的 `cline.plugins.paths` 是否指向 `./index.ts`
- setup() 未调用 → Cline CLI 可能不扫描 `.governance/plugin/`。尝试复制到 `.cline/plugins/governance/`
- preload 报错 → 检查 `config.json` 路径是否正确

---

## S2: Rule 注入验证

**目的**：验证 `registerRule` 注入的 session context 内容是否出现在模型的系统提示词中。

**步骤**：

```powershell
# 在真实终端执行
cline -v "你看到了哪些 governance 规则？列出 Core Constitution 的标题"
```

**验证**：

| 检查项 | 预期 |
|--------|------|
| 模型回复含 "Core Constitution" | 说明 constitution.md 已注入 |
| 模型回复含 "执行主体边界" | 说明 constitution 内容已注入 |
| 模型回复含 "Git Status" | 说明 git-checker SessionStart inject 生效 |
| 模型回复含 branch 名 | 说明 git rev-parse 执行成功 |

**失败排查**：

- 模型说"没看到规则" → registerRule 未生效。检查 ADR-007：registerRule content 在 CLI 3.0.37 只在 session 启动时求值一次。确认 content() 返回非空字符串
- 注入内容为空 → preloadSessionContext 可能失败。检查 stdout 的 `[governance] preload errors:` 日志

---

## S3: Git-checker 阈值阻断

**目的**：验证 `beforeTool` hook 在未 commit 文件 >= 5 时阻断写入类工具调用。

**步骤**：

```powershell
# 1. 创建 5 个临时文件（触发阈值）
1..5 | ForEach-Object { Set-Content "test-block-$_.tmp" "dummy" }

# 2. 确认 dirty count
git status --porcelain | Measure-Object | Select-Object -ExpandProperty Count
# 预期: >= 5

# 3. 启动 cline，要求它写文件（在真实终端执行）
cline -v "在当前目录创建一个文件叫 block-test.txt，内容是 hello"

# 4. 清理
Remove-Item test-block-*.tmp -ErrorAction SilentlyContinue
Remove-Item block-test.txt -ErrorAction SilentlyContinue
```

**验证**：

| 检查项 | 预期 |
|--------|------|
| stdout 含 COMMIT GUARD | `[governance] COMMIT GUARD: 未 commit 文件 >= 5` |
| 写入工具被 skip | 模型收到 skip reason，不执行写入 |
| 模型提示用户先 commit | 模型回复中含"请先 commit"或类似 |
| block-test.txt 未创建 | `Test-Path block-test.txt` 为 `False` |

**失败排查**：

- 未阻断 → 检查 `config.json` 的 `pre-tool.gitChecker.enabled` 是否为 `true`，`threshold` 是否为 `5`
- 阻断但文件仍创建 → `skip` 返回值可能未被 Cline 尊重。检查 `beforeTool` 返回 `{ skip: true, reason }` 格式
- 读写工具都阻断 → `skipTools` 白名单可能未生效。检查 `config.json` 的 `skipTools` 数组

---

## S4: skipTools 白名单验证

**目的**：验证 `read_file` / `list_dir` 等只读工具不被 git-checker 阻断。

**步骤**：

```powershell
# 1. 保持 5+ 个未 commit 文件
# (如果 S3 的文件还在就复用，否则重新创建)

# 2. 启动 cline，要求它只读文件（在真实终端执行）
cline -v "读取 .governance/core/constitution.md 的前 5 行"
```

**验证**：

| 检查项 | 预期 |
|--------|------|
| 读取工具未被阻断 | 模型成功读取文件内容 |
| stdout 无 COMMIT GUARD | read_file 在 skipTools 白名单中 |
| 模型回复含 constitution 内容 | 读取成功 |

---

## S5: MessageBuilder 注册验证

**目的**：验证 `registerMessageBuilder` 的 `pre-compact-saver` 被调用（每次 model request 保存 messages），且 beforeModel 不触发 codec bug。

**步骤**：

```powershell
# 启动一个多轮对话（在真实终端执行）
cline -v "先读取 constitution.md，然后告诉我它有多少章节"
```

**验证**：

| 检查项 | 预期 |
|--------|------|
| 对话正常进行 | 无崩溃（codec bug 规避：beforeModel 返回 undefined） |
| 无 `content.map is not a function` 错误 | beforeModel 不触发 codec bug |

**失败排查**：

- 出现 codec crash → beforeModel 返回了非 undefined 值。检查 `index.ts` 的 `beforeModel` 最后是否 `return undefined`

---

## S6: Compaction 检测 + Snapshot 写入（受 BL-2 阻塞）

> **受限测试**：CLI 3.0.34 codec bug 在长对话/异常 MCP tool_result 触发崩溃。此测试需构造长对话（>=90K tokens），正是 bug 触发场景。
>
> **缓解策略**：短对话测试 detectCompaction 逻辑（已在 L1 verify-governance.ts T5/T8 验证通过）。完整 compaction 实测等 BL-2 PR #12032 合并后执行。

**解除阻塞后步骤**：

```powershell
# 1. 升级 CLI 到含修复的版本
cline --version  # 确认版本已更新

# 2. 启动长对话（>=90K tokens，触发 compaction）
cline -i
# 在对话中持续交互直到 compaction 发生

# 3. 验证 snapshot
Get-Content .governance\runtime\snapshot.json | ConvertFrom-Json
```

**验证**：

| 检查项 | 预期 |
|--------|------|
| stdout 含 compaction detected | `[governance] compaction detected -- N msgs (pre) -> M msgs (post)` |
| stdout 含 snapshot written | `[governance] snapshot written successfully` |
| snapshot.json 更新 | `compacted_at` 为最新时间戳 |
| snapshot.json 含 decisions | `decisions` 数组（可能为空，取决于提取器） |
| snapshot.json 含 active_todos | `active_todos` 数组 |

---

## 测试结果记录

| 测试 | 状态 | 日期 | 备注 |
|------|------|------|------|
| L1 verify-governance.ts | 50 passed | 2026-07-06 | `npx tsx` 运行 |
| S1 Plugin 发现 | 待测 | — | |
| S2 Rule 注入 | 待测 | — | |
| S3 Git-checker 阻断 | 待测 | — | |
| S4 skipTools 白名单 | 待测 | — | |
| S5 MessageBuilder | 待测 | — | |
| S6 Compaction + Snapshot | 阻塞 | — | BL-2 PR #12032 未合并 |

---

## 快速测试脚本

```powershell
# 一键运行 L1 离线测试
Write-Host "=== L1: Offline Logic Tests ===" -ForegroundColor Cyan
cd e:\cline++
npx tsx .governance\plugin\verify-governance.ts
if ($LASTEXITCODE -ne 0) { Write-Host "L1 FAILED" -ForegroundColor Red; exit 1 }

# 一键准备 S3 阻断测试
Write-Host "`n=== Preparing S3: Git-checker Block Test ===" -ForegroundColor Cyan
1..5 | ForEach-Object { Set-Content "test-block-$_.tmp" "dummy" }
$dirty = git status --porcelain | Measure-Object | Select-Object -ExpandProperty Count
Write-Host "Dirty files: $dirty (threshold: 5)"
Write-Host "Run in real terminal: cline -v `"create a file called block-test.txt with content hello`""
Write-Host "After test, cleanup: Remove-Item test-block-*.tmp -ErrorAction SilentlyContinue"
```

---

## 引用

- Plugin 入口：[`.governance/plugin/index.ts`](../../.governance/plugin/index.ts)
- 离线测试脚本：[`.governance/plugin/verify-governance.ts`](../../.governance/plugin/verify-governance.ts)
- Hook 配置：[`.governance/hooks/config.json`](../../.governance/hooks/config.json)
- ADR-007（registerRule 静态注入）：[ADR-007](../decisions/adr/ADR-007-snapshot-registerRule-static-injection.md)
- Codec bug 阻塞：[dev-rules 1.15](../dev-rules.md)
