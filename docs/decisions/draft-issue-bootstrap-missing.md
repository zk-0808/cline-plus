# Draft: GitHub Issue — Plugin sandbox bootstrap not bundled in VS Code extension 4.0.0

> **Status**: Draft — 待用户确认后提交到 github.com/cline/cline/issues
> **表单来源**: https://github.com/cline/cline/issues/new?template=bug_report.yml

---

## 表单字段

### Title *

```
Plugin sandbox fails to initialize in VS Code extension 4.0.0 — `plugin-sandbox-bootstrap.js` not bundled
```

### Cline Surface *

```
VSCode Extension
```

### Cline Version *

```
4.0.0
```

### Beta version

不勾选

### What happened? *

```
Plugins installed via the global plugin store (`~/.cline/plugins/`) appear as "Installed" in the Customize UI, but their `setup()` never executes in the VS Code extension. The plugin sandbox subprocess fails to start because `plugin-sandbox-bootstrap.js` is not included in the extension's build output.

CLI 3.0.31 works correctly with the exact same plugin.

## Facts

**Fact 1**: The extension's `dist/` directory contains only `extension.js` (22.5MB). No standalone `plugin-sandbox-bootstrap.js` file exists.

```
> find saoudrizwan.claude-dev-4.0.0 -name "plugin-sandbox*"
(no results)

> ls saoudrizwan.claude-dev-4.0.0/dist/
extension.js
```

**Fact 2**: The bootstrap file exists in the CLI distribution:

```
> ls node_modules/@cline/core/dist/extensions/plugin-sandbox-bootstrap.js
14KB
```

**Fact 3**: The plugin code is correct — CLI 3.0.31 executes `setup()` successfully:

```
> type %USERPROFILE%\.cline\data\handoff\plugin-loaded.marker
loaded at 2026-06-28T02:22:57.451Z
```

**Fact 4**: `resolveBootstrap()` defines 5 candidate paths. All fail when the file doesn't exist in the extension directory. ([SDK source](https://github.com/cline/cline/blob/main/src/core/extensions/plugin-sandbox.ts))

**Fact 5**: After manually copying `plugin-sandbox-bootstrap.js` + dependencies to the extension directory, `setup()` executes successfully — confirming the plugin code is not the issue.

## Root Cause

1. `loadSandboxedPlugins()` → `resolveBootstrap()` → 5 candidate paths → **all fail** (file not in `dist/`)
2. Fallback: `node -e "<jiti script>"` → jiti is inlined by esbuild, unavailable to child process → **fallback fails**
3. Subprocess cannot start → timeout → `setup()` **never executes**
4. UI shows "Installed" because `discoverPluginModulePaths()` succeeds (file discovery), but `loadSandboxedPlugins()` fails silently (sandbox activation)

## Suggested Fix

Include `plugin-sandbox-bootstrap.js` (and its runtime dependencies) in the extension's esbuild output or as a separate file in `dist/`.

Related: #11065 (same subsystem — plugin sandbox timeout on Windows)
```

### Steps to reproduce

```
1. Install VS Code extension saoudrizwan.claude-dev 4.0.0
2. Create a minimal plugin with `setup()` that writes a marker file:

   export const plugin = {
     name: "test-plugin",
     manifest: { capabilities: ["messageBuilders"] },
     setup(api) {
       require("fs").writeFileSync(
         require("path").join(require("os").homedir(), ".cline", "data", "handoff", "marker.txt"),
         "setup called at " + new Date().toISOString()
       );
       api.registerMessageBuilder({
         name: "test",
         build(messages) { return messages; }
       });
     }
   };

3. Install the plugin:
   cline plugin install <plugin-url> --cwd .

4. Confirm it appears in Customize UI as "Installed"

5. Check for marker file:
   type %USERPROFILE%\.cline\data\handoff\marker.txt
   → File not found (setup() never executed)

6. Compare with CLI:
   cline "hello"
   → Marker file exists (setup() executed successfully)
```

### Provider / Model

```
N/A — this is a plugin sandbox infrastructure issue, not model-dependent.
```

### IDE / CLI Diagnostics

```
VS Code Extension:
  Extension: saoudrizwan.claude-dev 4.0.0
  VS Code: (user's version)
  dist/ contents: extension.js only (22.5MB)

CLI (working comparison):
  cline 3.0.31
  @cline/core/dist/extensions/plugin-sandbox-bootstrap.js: present (14KB)
```

### System Information

```
Operating System: Windows (also likely affects other platforms — esbuild config is shared)
Hardware: (user fills in)
```

---

## 提交前 Checklist

- [ ] 标题事实描述，不带指责语气
- [ ] What happened 包含 Facts + Root Cause + Suggested Fix
- [ ] Steps to reproduce 包含最小复现插件
- [ ] 提及 #11065 建立关联
- [ ] System Information 已填写
