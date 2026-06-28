## Cline Plugin Development: Practical Guide & VS Code Extension Fix

> **Audience**: Developers who want to build plugins for [Cline](https://github.com/cline/cline).
>
> **Scope**: Architecture facts discovered from source code analysis + hands-on testing with Cline CLI 3.0.31 and VS Code extension 4.0.0. This guide fills gaps left by the [official plugin docs](https://docs.cline.bot/customization/plugins).
>
> **Date**: 2026-06-28

---

## TL;DR

1. Cline plugins run inside a **Node.js subprocess** — not a filesystem sandbox. Your `fs.writeFileSync()` writes to the host filesystem directly.
2. **VS Code extension 4.0.0 has a bug**: `plugin-sandbox-bootstrap.js` is missing from the build output. Plugins silently fail to load. A one-command patch fixes this (see §4).
3. `build()` in a messageBuilder is called on **every turn**, not just during compaction. Keep it fast.
4. TypeScript works out of the box via [jiti](https://github.com/unjs/jiti) — no build step needed.
5. `console.log()` from your plugin **does not appear** in VS Code DevTools. Use file-based markers for debugging.

---

## 1. Plugin Sandbox Architecture

### 1.1 It's Just a Node Subprocess

The `SubprocessSandbox` (`core/src/runtime/tools/subprocess-sandbox.ts`) is a plain `child_process.spawn("node", [bootstrapFile])`. There is **no filesystem sandbox** — no seccomp, no AppArmor, no Windows sandbox.

```
VS Code Extension / CLI
  → loadSandboxedPlugins()           ← plugin-sandbox.ts
  → SubprocessSandbox.spawn()        ← child_process.spawn("node", bootstrap)
  → plugin-sandbox-bootstrap.ts      ← subprocess entry point
  → importPluginModule(pluginPath)   ← plugin-module-import.ts
  → jiti.import(pluginPath)          ← real-time TS→JS transpilation
  → plugin.setup(api, ctx)           ← your code runs here
```

> 中文注：sandbox 不是文件系统沙箱。如果你在 setup() 里写文件失败，原因几乎一定是目录不存在，而不是被拦截。用 `mkdirSync({ recursive: true })` 解决。

### 1.2 What Happens at Startup

| Phase | What happens |
|-------|-------------|
| Discovery | `discoverPluginModulePaths()` scans `~/.cline/plugins/` for `package.json` with `cline` field |
| Sandbox spawn | `SubprocessSandbox` starts a `node` subprocess with `plugin-sandbox-bootstrap.js` |
| Import | [jiti](https://github.com/unjs/jiti) transpiles your `.ts` plugin to JS in real time |
| Setup | `plugin.setup(api, ctx)` is called — register your builders, tools, hooks here |

### 1.3 Plugin Lifecycle

```
Session start → Plugin discovery → Sandbox spawn → setup()
  → Each turn: messageBuilders.build(messages) → security layer → provider
```

**Critical fact**: `build()` is called on **every turn preparation**, not just when compaction happens. Your `build()` function should be fast (< 100ms). If you need to do heavy work, gate it behind a condition check.

---

## 2. Plugin Project Structure

### 2.1 Minimum Viable Plugin

```
my-plugin/
├── package.json          # Must have "cline" field
├── src/
│   └── index.ts          # Plugin object with setup()
└── README.md
```

### 2.2 package.json

```json
{
  "name": "my-cline-plugin",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "cline": {
    "plugins": [{
      "paths": ["./src/index.ts"],
      "capabilities": ["messageBuilders"]
    }]
  },
  "peerDependencies": {
    "@cline/core": "*",
    "@cline/shared": "*"
  },
  "peerDependenciesMeta": {
    "@cline/core": { "optional": true },
    "@cline/shared": { "optional": true }
  }
}
```

> 中文注：`peerDependencies` 设为 optional — 运行时由宿主（CLI 或扩展）解析，插件不需要 `npm install`。

### 2.3 Capabilities

| Capability | API Method | Sync/Async |
|-----------|-----------|------------|
| `tools` | `api.registerTool(tool)` | async execute |
| `commands` | `api.registerCommand(command)` | sync or async |
| `rules` | `api.registerRule(rule)` | sync or async |
| `messageBuilders` | `api.registerMessageBuilder({ name, build })` | **sync** build |
| `hooks` | plugin.hooks field | async |

**Important**: `build()` is awaited at the RPC layer but the function itself should be **synchronous**. Use `writeFileSync` for file I/O.

### 2.4 Sandbox RPC Protocol

Plugin communicates with the main process via IPC (`child_process.send/on`):

| RPC Method | Direction | Purpose |
|-----------|-----------|---------|
| `initialize` | main→sandbox | Load plugins |
| `buildMessages` | main→sandbox | Execute messageBuilder |
| `invokeHook` | main→sandbox | Execute hook |
| `executeTool` | main→sandbox | Execute tool |

The sandbox auto-reinitializes on process exit or RPC timeout. You don't need to manage connection state.

---

## 3. Installation

### 3.1 CLI (Works Out of the Box)

```bash
cline plugin install ./my-plugin --cwd .
```

Or copy manually to `~/.cline/plugins/installed/local/my-plugin/`.

### 3.2 VS Code Extension (Requires Patch)

> ⚠️ **VS Code extension 4.0.0 does NOT support plugins out of the box** despite having the plugin loading code in its bundle. See §4 for the root cause and fix.

After applying the patch (§4), install via:
1. Place your plugin in `~/.cline/plugins/installed/local/my-plugin/`
2. Open the Customize panel (Cline sidebar → gear icon) — your plugin should appear
3. Reload VS Code window

---

## 4. VS Code Extension Plugin Support Patch

### 4.1 Root Cause

VS Code extension 4.0.0's esbuild pipeline bundles all plugin loading code (`loadSandboxedPlugins`, `SubprocessSandbox`, `registerMessageBuilder`) into `dist/extension.js`, but **does not emit `plugin-sandbox-bootstrap.js` as a standalone file**.

The loading chain fails at `resolveBootstrap()` — it searches 5 candidate paths for the bootstrap file, all of which are missing in the extension environment. The jiti fallback also fails because jiti is inlined and cannot be `require()`d from a subprocess.

**Result**: Sandbox subprocess never starts → 4-second timeout → `setup()` never executes.

The official docs say: *"This feature is not applicable on VSCode and JetBrains Extension for now."* However, the code is fully present — it's a build pipeline oversight, not an intentional omission.

> 中文注：UI 的 Customize 面板能发现插件（显示"已加载"），但这只是文件发现（`discoverPluginModulePaths`），不等于 sandbox 激活。两者是独立的代码路径。

### 4.2 The Fix

The CLI distribution correctly includes `plugin-sandbox-bootstrap.js`. The patch copies it (and required dependencies) into the VS Code extension.

**What the patch does**:
1. Locates your VS Code extension directory (`saoudrizwan.claude-dev-*`)
2. Locates your CLI installation (`@cline/core`)
3. Copies `plugin-sandbox-bootstrap.js` → extension's `dist/extensions/`
4. Copies `@cline/shared`, `@cline/core`, `jiti` → extension's `node_modules/`
5. Sets `CLINE_PLUGIN_IMPORT_TIMEOUT_MS=30000` (Windows only; the default 4s timeout is too short on Windows per [Issue #11065](https://github.com/cline/cline/issues/11065))

**Patch scripts** (in `scripts/` directory):
- **Windows**: `patch-vscode-plugin-support.ps1`
- **macOS/Linux**: `patch-vscode-plugin-support.sh`

### 4.3 Manual Patch Steps

If you prefer not to run scripts:

**Windows**:
```powershell
$ext = "$env:USERPROFILE\.vscode\extensions\saoudrizwan.claude-dev-4.0.0"
$cli = "$env:APPDATA\npm\node_modules\cline\node_modules"

# 1. Create target directories
New-Item -ItemType Directory -Force "$ext\dist\extensions"
New-Item -ItemType Directory -Force "$ext\node_modules\@cline"

# 2. Copy bootstrap
Copy-Item "$cli\@cline\core\dist\extensions\plugin-sandbox-bootstrap.js" "$ext\dist\extensions\"

# 3. Copy dependencies
Copy-Item -Recurse "$cli\@cline\shared" "$ext\node_modules\@cline\shared"
Copy-Item -Recurse "$cli\@cline\core"   "$ext\node_modules\@cline\core"
Copy-Item -Recurse "$cli\jiti"          "$ext\node_modules\jiti"

# 4. Increase timeout (Windows-specific fix for Issue #11065)
[Environment]::SetEnvironmentVariable("CLINE_PLUGIN_IMPORT_TIMEOUT_MS", "30000", "User")

# 5. Reload VS Code
# Ctrl+Shift+P → "Developer: Reload Window"
```

**macOS/Linux**:
```bash
EXT="$HOME/.vscode/extensions/saoudrizwan.claude-dev-4.0.0"
# Find CLI path — adjust if installed differently
CLI=$(dirname $(which cline))/../lib/node_modules/cline/node_modules

mkdir -p "$EXT/dist/extensions"
mkdir -p "$EXT/node_modules/@cline"

cp "$CLI/@cline/core/dist/extensions/plugin-sandbox-bootstrap.js" "$EXT/dist/extensions/"
cp -r "$CLI/@cline/shared" "$EXT/node_modules/@cline/shared"
cp -r "$CLI/@cline/core"   "$EXT/node_modules/@cline/core"
cp -r "$CLI/jiti"          "$EXT/node_modules/jiti"
```

### 4.4 Verification

After patching, install any plugin and check:

1. **Customize panel**: Plugin appears and shows as loaded
2. **Marker file**: If your plugin writes a marker in `setup()`, check it exists
3. **Console output**: Plugin `console.log()` does NOT appear in VS Code DevTools — use file-based debugging

> 中文注：调试插件最可靠的方式是在 setup() 和 build() 里写 marker 文件（带时间戳），而不是依赖 console.log。

---

## 5. Development Tips

### 5.1 Debugging

| Method | Works in CLI | Works in VS Code |
|--------|-------------|-----------------|
| `console.log()` | ✅ stdout | ❌ swallowed by bridge |
| `ctx.logger.log()` | ✅ | ✅ (appears in Cline output channel) |
| File-based markers | ✅ | ✅ |
| VS Code DevTools Console | N/A | ❌ (plugin runs in separate process) |

### 5.2 Compaction Thresholds

| Parameter | Default | Meaning |
|-----------|---------|---------|
| `MAX_INPUT_TOKENS` | 120,000 | Model's max input tokens |
| `COMPACT_AT_RATIO` | 0.75 | Trigger compaction at 75% |
| `PRESERVE_RECENT_TOKENS` | 24,000 | Keep recent messages intact |

Your `build()` function receives the full message array. Use `shouldCompact()`-style logic to check token count before doing heavy work.

### 5.3 Plugin Discovery Paths

Cline scans for plugins in:
- `<workspace>/.cline/plugins/` (workspace-local)
- `~/.cline/plugins/` (global)
- System Plugins folder

Subdirectories are scanned recursively. A valid plugin needs a `package.json` with the `cline` field.

### 5.4 Known Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Bootstrap missing (VS Code) | `setup()` never runs | Apply §4 patch |
| Directory doesn't exist | `writeFileSync` throws EPERM silently | `mkdirSync({ recursive: true })` in `setup()` |
| `console.log` invisible | No output in DevTools | Use file markers or `ctx.logger` |
| Windows 4s timeout | Plugin times out on Windows | Set `CLINE_PLUGIN_IMPORT_TIMEOUT_MS=30000` |
| `build()` too slow | Conversation feels sluggish | Gate heavy work behind conditions |
| No error handling | Plugin fails silently | Wrap everything in try-catch |

---

## 6. Quick Start Checklist

- [ ] Read the [official plugin docs](https://docs.cline.bot/customization/plugins)
- [ ] Create `package.json` with `cline.plugins[]` field (§2.2)
- [ ] Create `src/index.ts` with `setup()` + capability registration (§2.3)
- [ ] Test in CLI first: `cline plugin install ./my-plugin --cwd .`
- [ ] If targeting VS Code: apply the bootstrap patch (§4)
- [ ] Use file-based markers for debugging (§5.1)
- [ ] Wrap all I/O in try-catch (§5.4)
- [ ] Keep `build()` synchronous and fast (§1.3)

---

## Appendix: Source Code References

| Component | Path in Cline repo |
|-----------|-------------------|
| Plugin Sandbox | `sdk/packages/core/src/extensions/plugin/plugin-sandbox.ts` |
| Bootstrap | `sdk/packages/core/src/extensions/plugin/plugin-sandbox-bootstrap.ts` |
| Module Import | `sdk/packages/core/src/extensions/plugin/plugin-module-import.ts` |
| Plugin Loader | `sdk/packages/core/src/extensions/plugin/plugin-loader.ts` |
| Plugin Install | `sdk/packages/core/src/services/plugin-install.ts` |
| Plugin Discovery | `sdk/packages/shared/src/storage/paths.ts` |
| Subprocess Sandbox | `sdk/packages/core/src/runtime/tools/subprocess-sandbox.ts` |
| Custom Compaction Example | `sdk/examples/plugins/custom-compaction.ts` |

---

*This guide was written after analyzing the Cline 4.0.0 codebase (22.5MB minified bundle + SDK source), testing with CLI 3.0.31, and verifying the VS Code extension workaround with 7 real compaction events. Last updated: 2026-06-28.*
