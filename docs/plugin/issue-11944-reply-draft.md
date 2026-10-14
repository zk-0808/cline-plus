# GitHub Issue #11944 回复草稿

> **用途**：回复 Saoud 的邮件/Issue 评论，告知已有深度调研，正在准备系统性测试
> **发布位置**：https://github.com/cline/cline/issues/11944

---

## 回复内容（英文）

Thanks for the update! I've done an in-depth investigation of this issue and have a root cause analysis with a verified workaround. I'll install the Nightly build and run a structured regression test.

### Root Cause Summary (from my investigation)

**Environment**: VS Code Extension 4.0.8 (stable, post-rollback) / Cline CLI 3.0.46 / @cline/core 0.0.65 / Windows 11

**Finding**: The VS Code extension's esbuild pipeline bundles all plugin loading code (`loadSandboxedPlugins`, `SubprocessSandbox`, `registerMessageBuilder`) into `dist/extension.js`, but does **not** emit `plugin-sandbox-bootstrap.js` as a standalone file.

The loading chain fails at `resolveBootstrap()` — it searches 5 candidate paths for the bootstrap file, all of which are missing in the extension environment. The jiti fallback also fails because jiti is inlined and cannot be `require()`d from a subprocess.

**Result**: Sandbox subprocess never starts → 4-second timeout → `setup()` never executes. The UI Customize panel shows plugins as "loaded" (file discovery via `discoverPluginModulePaths` works), but this is independent from sandbox activation.

### Verified Workaround

I've verified a workaround that copies `plugin-sandbox-bootstrap.js` and dependencies (`@cline/core`, `@cline/shared`, `jiti`) from the CLI installation into the extension directory. Tested with 7 real compaction events — plugins load and execute correctly.

I also identified a Windows-specific issue: the default 4-second plugin import timeout is too short on Windows (referenced in Issue #11065). Setting `CLINE_PLUGIN_IMPORT_TIMEOUT_MS=30000` resolves this.

### Current State (4.0.8)

I confirmed the issue **still persists** in VS Code extension 4.0.8:
- `dist/` contains only `extension.js` (21MB) and tree-sitter wasm files
- No `plugin-sandbox-bootstrap.js` anywhere in the extension directory
- No `dist/extensions/` directory

This is expected since 4.0.8 is the post-rollback version.

### Next Steps

1. Installing the Nightly build now
2. Will run a structured regression test covering:
   - Bootstrap file presence in Nightly's `dist/`
   - Plugin `setup()` execution (using a probe plugin)
   - All capabilities: `messageBuilders`, `tools`, `hooks`, `registerRule`
   - Windows default timeout behavior (without `CLINE_PLUGIN_IMPORT_TIMEOUT_MS`)
   - API backward compatibility (new SDK changes)
3. Will report results via the feedback form

Happy to hop on a call for a live demo — I can show the root cause analysis and the regression test in real-time.

---

## 中文翻译（仅供参考，发布时用英文）

感谢更新！我对这个问题做了深入调查，有根因分析和已验证的 workaround。我会安装 Nightly 构建并进行结构化回归测试。

**根因摘要**：VS Code 扩展的 esbuild 管道将所有插件加载代码打包进 `extension.js`，但没有将 `plugin-sandbox-bootstrap.js` 作为独立文件输出。`resolveBootstrap()` 搜索 5 个候选路径均未找到，jiti 回退也失败（因为 jiti 被内联，无法从子进程中 `require()`）。结果是 sandbox 子进程永远不启动 → 4 秒超时 → `setup()` 永远不执行。

**已验证 Workaround**：从 CLI 安装中复制 `plugin-sandbox-bootstrap.js` 和依赖到扩展目录。已用 7 次 compaction 事件验证。

**4.0.8 现状**：问题仍然存在——`dist/` 只有 `extension.js`，无 bootstrap 文件。这在预期之内，因为 4.0.8 是回滚后的版本。

**下一步**：安装 Nightly，运行结构化回归测试，通过反馈表单提交结果。愿意参加直播观察通话。
