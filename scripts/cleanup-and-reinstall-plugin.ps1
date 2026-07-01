#Requires -Version 5.1
<#
.SYNOPSIS
    Cleanup old auto-handoff plugin stray artifacts + reinstall new context-snapshot plugin + apply VS Code extension patch.

.DESCRIPTION
    Root cause (cline.log 2026-06-28T02:22:57 + source comparison):
    - VS Code extension was loading the OLD auto-handoff plugin (PLUGIN_NAME="auto-handoff", writes to ~/.cline/data/handoff/)
    - Current project e:\cline++\handoff-plugin\ has been refactored to context-snapshot (writes to ~/.cline/data/snapshot/), but was never installed
    - VS Code extension 4.0.1 patch (bootstrap + @cline/* + jiti) is completely missing, plugin sandbox cannot start
    - Two old copies override each other (auto-handoff vs handoff-plugin-01)

    This script does all 4 steps in one run: cleanup -> patch -> install new version -> verify.

.PARAMETER SkipPatch
    Skip the VS Code extension patch step (if already applied).

.PARAMETER SkipCleanup
    Skip the cleanup step (if already cleaned up).

.EXAMPLE
    .\scripts\cleanup-and-reinstall-plugin.ps1
#>

param(
    [switch]$SkipPatch,
    [switch]$SkipCleanup
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Step { param([string]$Message) Write-Host "`n>> $Message" -ForegroundColor Cyan }
function Write-OK    { param([string]$Message) Write-Host "   OK: $Message" -ForegroundColor Green }
function Write-Warn  { param([string]$Message) Write-Host "   WARN: $Message" -ForegroundColor Yellow }
function Write-Fail  { param([string]$Message) Write-Host "   FAIL: $Message" -ForegroundColor Red }

$projectRoot = "E:\cline++"
$pluginSource = Join-Path $projectRoot "context-snapshot"
$pluginDest = Join-Path $env:USERPROFILE ".cline\plugins\installed\local\context-snapshot"

# --- Step 1: Cleanup stray artifacts ---

if (-not $SkipCleanup) {
    Write-Step "Step 1: Cleanup old stray artifacts"

    $toDelete = @(
        "E:\handoff_tail.txt",
        (Join-Path $env:USERPROFILE ".cline\data\handoff\plugin-loaded.marker"),
        (Join-Path $env:USERPROFILE ".cline\data\handoff"),
        (Join-Path $env:USERPROFILE ".cline\plugins\installed\local\auto-handoff"),
        (Join-Path $env:USERPROFILE ".cline\plugins\_installed\local\handoff-plugin-01")
    )

    foreach ($p in $toDelete) {
        if (Test-Path $p) {
            try {
                Remove-Item -Path $p -Recurse -Force -ErrorAction Stop
                Write-OK "DELETED: $p"
            } catch {
                Write-Fail "FAILED: $p - $($_.Exception.Message)"
            }
        } else {
            Write-Warn "SKIP (not exists): $p"
        }
    }

    Write-Step "Step 1 verify: ~/.cline/plugins/installed/local/ remaining"
    $installedLocal = Join-Path $env:USERPROFILE ".cline\plugins\installed\local"
    if (Test-Path $installedLocal) {
        Get-ChildItem $installedLocal -Force -ErrorAction SilentlyContinue |
            Select-Object Name, LastWriteTime | Format-Table -AutoSize
    } else {
        Write-Warn "installed/local dir does not exist"
    }
}

# --- Step 2: Apply VS Code extension patch ---

if (-not $SkipPatch) {
    Write-Step "Step 2: Apply VS Code extension patch (plugin-sandbox-bootstrap missing fix)"

    $patchScript = Join-Path $projectRoot "scripts\patch-vscode-plugin-support.ps1"
    if (Test-Path $patchScript) {
        & $patchScript
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Patch script failed (exit code $LASTEXITCODE)"
            exit 1
        }
    } else {
        Write-Fail "Patch script not found: $patchScript"
        exit 1
    }
}

# --- Step 3: Install new context-snapshot plugin ---

Write-Step "Step 3: Install new context-snapshot plugin"

if (-not (Test-Path $pluginSource)) {
    Write-Fail "Plugin source dir not found: $pluginSource"
    exit 1
}

# Ensure destination parent dir exists
$destParent = Split-Path $pluginDest -Parent
if (-not (Test-Path $destParent)) {
    New-Item -ItemType Directory -Force -Path $destParent | Out-Null
}

# If destination already exists, remove it first (avoid stale files)
if (Test-Path $pluginDest) {
    Remove-Item -Path $pluginDest -Recurse -Force
    Write-OK "Removed old context-snapshot dir"
}

# Copy plugin source (exclude node_modules, test, .git)
$excludeDirs = @("node_modules", ".git", "test") | ForEach-Object { Join-Path $pluginSource $_ }
$robocopyArgs = @($pluginSource, $pluginDest, "/E", "/XF", "package-lock.json", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS", "/NP")
foreach ($d in $excludeDirs) {
    $robocopyArgs += @("/XD", $d)
}
& robocopy @robocopyArgs | Out-Null
if ($LASTEXITCODE -ge 8) {
    Write-Fail "robocopy failed (exit code $LASTEXITCODE)"
    exit 1
}
Write-OK "Copied plugin to $pluginDest"

# --- Step 4: Verify installation ---

Write-Step "Step 4: Verify installation"

$checks = @(
    @{ Path = (Join-Path $pluginDest "package.json"); Name = "package.json (new version)" },
    @{ Path = (Join-Path $pluginDest "src\index.ts"); Name = "src/index.ts (PLUGIN_NAME=context-snapshot)" },
    @{ Path = (Join-Path $pluginDest "src\compaction.ts"); Name = "src/compaction.ts" },
    @{ Path = (Join-Path $pluginDest "src\rules-injector.ts"); Name = "src/rules-injector.ts" },
    @{ Path = (Join-Path $pluginDest "src\tool-recorder.ts"); Name = "src/tool-recorder.ts" },
    @{ Path = (Join-Path $pluginDest "src\constants.ts"); Name = "src/constants.ts" },
    @{ Path = (Join-Path $pluginDest "src\snapshot-writer.ts"); Name = "src/snapshot-writer.ts" },
    @{ Path = (Join-Path $pluginDest "src\types.ts"); Name = "src/types.ts" }
)

$allOK = $true
foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-OK "$($check.Name) present"
    } else {
        Write-Fail "$($check.Name) MISSING"
        $allOK = $false
    }
}

# Verify package.json is the new version (0.6.0)
$pkgJsonPath = Join-Path $pluginDest "package.json"
if (Test-Path $pkgJsonPath) {
    $pkgJson = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
    if ($pkgJson.version -eq "0.6.0") {
        Write-OK "package.json version=$($pkgJson.version) (new version)"
    } else {
        Write-Fail "package.json version=$($pkgJson.version) (expected 0.6.0)"
        $allOK = $false
    }
    $caps = $pkgJson.cline.plugins[0].capabilities
    if ($caps -contains "messageBuilders" -and $caps -contains "rules" -and $caps -contains "hooks") {
        Write-OK "capabilities: messageBuilders + rules + hooks (new version, 3 capabilities)"
    } else {
        Write-Fail "capabilities incomplete: $($caps -join ', ')"
        $allOK = $false
    }
} else {
    Write-Fail "Cannot read package.json"
    $allOK = $false
}

# --- Done ---

Write-Host ""
if ($allOK) {
    Write-Host "=== Cleanup + patch + install ALL DONE ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "  1. Reload VS Code: Ctrl+Shift+P -> 'Developer: Reload Window'"
    Write-Host "  2. Open Cline sidebar -> Customize (gear icon) -> Plugins"
    Write-Host "  3. Confirm 'context-snapshot' plugin appears (not auto-handoff anymore)"
    Write-Host "  4. Trigger a long conversation compact, check ~/.cline/data/snapshot/ for .md files"
    Write-Host "  5. Check ~/.cline/data/snapshot/ for context snapshot .md files (index.jsonl is deprecated by ADR-005)"
    Write-Host ""
    Write-Host "If plugin still not visible:" -ForegroundColor Yellow
    Write-Host "  - Check VS Code Developer Console (Help > Toggle Developer Tools) for [context-snapshot] logs"
    Write-Host "  - Check ~/.cline/data/logs/cline.log for plugin load errors"
} else {
    Write-Host "=== Install INCOMPLETE - check errors above ===" -ForegroundColor Red
    exit 1
}
