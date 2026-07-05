# sync-governance-plugin.ps1 — Sync governance plugin to Cline CLI discovery path
# Following quick-reference §15.5 pattern
# Cline CLI scans ~/.cline/plugins/installed/local/ and ~/.cline/plugins/_installed/local/

$ErrorActionPreference = "Stop"

$src = "E:\cline++\.governance\plugin"
$capSrc = "E:\cline++\.governance\capabilities"
$dst = Join-Path $env:USERPROFILE ".cline\plugins\installed\local\governance"

Write-Host "=== Governance Plugin Sync ==="
Write-Host "Source: $src"
Write-Host "Destination: $dst"
Write-Host ""

# 1. Clean old installation
if (Test-Path $dst) {
    Write-Host "[1/6] Cleaning old installation..."
    Remove-Item -Path $dst -Recurse -Force
} else {
    Write-Host "[1/6] No old installation found."
}

# 2. Create directory structure
Write-Host "[2/6] Creating directory structure..."
New-Item -ItemType Directory -Path $dst -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $dst "hooks") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $dst "capabilities\snapshot-writer") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $dst "capabilities\git-checker") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $dst "capabilities\handoff-provider") -Force | Out-Null

# 3. Copy plugin core files
Write-Host "[3/6] Copying plugin core files..."
Copy-Item (Join-Path $src "index.ts") (Join-Path $dst "index.ts") -Force
Copy-Item (Join-Path $src "config-loader.ts") (Join-Path $dst "config-loader.ts") -Force
Copy-Item (Join-Path $src "types.ts") (Join-Path $dst "types.ts") -Force
Copy-Item (Join-Path $src "tsconfig.json") (Join-Path $dst "tsconfig.json") -Force

# 4. Copy hooks with FIXED import paths (../../capabilities/ -> ../capabilities/)
Write-Host "[4/6] Copying hooks with fixed import paths..."

# pre-compact.ts: ../../capabilities/ -> ../capabilities/
$preCompact = Get-Content (Join-Path $src "hooks\pre-compact.ts") -Raw
$preCompact = $preCompact -replace '\.\./\.\./capabilities/', '../capabilities/'
Set-Content (Join-Path $dst "hooks\pre-compact.ts") $preCompact -Encoding UTF8

# session-start.ts: ../../capabilities/ -> ../capabilities/
$sessionStart = Get-Content (Join-Path $src "hooks\session-start.ts") -Raw
$sessionStart = $sessionStart -replace '\.\./\.\./capabilities/', '../capabilities/'
Set-Content (Join-Path $dst "hooks\session-start.ts") $sessionStart -Encoding UTF8

# pre-tool.ts: ../../capabilities/ -> ../capabilities/
$preTool = Get-Content (Join-Path $src "hooks\pre-tool.ts") -Raw
$preTool = $preTool -replace '\.\./\.\./capabilities/', '../capabilities/'
Set-Content (Join-Path $dst "hooks\pre-tool.ts") $preTool -Encoding UTF8

# post-tool.ts: no external deps, copy as-is
Copy-Item (Join-Path $src "hooks\post-tool.ts") (Join-Path $dst "hooks\post-tool.ts") -Force

# 5. Copy capabilities (only the 3 needed at runtime)
Write-Host "[5/6] Copying capabilities..."

# snapshot-writer
Copy-Item (Join-Path $capSrc "snapshot-writer\index.ts") (Join-Path $dst "capabilities\snapshot-writer\index.ts") -Force
Copy-Item (Join-Path $capSrc "snapshot-writer\types.ts") (Join-Path $dst "capabilities\snapshot-writer\types.ts") -Force

# git-checker
Copy-Item (Join-Path $capSrc "git-checker\index.ts") (Join-Path $dst "capabilities\git-checker\index.ts") -Force
Copy-Item (Join-Path $capSrc "git-checker\types.ts") (Join-Path $dst "capabilities\git-checker\types.ts") -Force

# handoff-provider (skip README.md)
Copy-Item (Join-Path $capSrc "handoff-provider\index.ts") (Join-Path $dst "capabilities\handoff-provider\index.ts") -Force
Copy-Item (Join-Path $capSrc "handoff-provider\types.ts") (Join-Path $dst "capabilities\handoff-provider\types.ts") -Force

# 6. Create package.json (matching context-snapshot format)
Write-Host "[6/6] Creating package.json..."
$pkgJson = @{
    name = "governance"
    version = "1.0.0"
    private = $true
    description = "Governance framework CLI runtime - config-driven hook dispatch + capability modules"
    type = "module"
    scripts = @{
        typecheck = "tsc --noEmit"
    }
    exports = @{
        "." = "./index.ts"
    }
    cline = @{
        plugins = @(
            @{
                paths = @("./index.ts")
                capabilities = @("messageBuilders", "rules", "hooks")
            }
        )
    }
    peerDependencies = @{
        "@cline/core" = "*"
        "@cline/shared" = "*"
    }
    peerDependenciesMeta = @{
        "@cline/core" = @{ optional = $true }
        "@cline/shared" = @{ optional = $true }
    }
    devDependencies = @{
        "@types/node" = "^22.0.0"
        "typescript" = "^5.5.0"
    }
}
$pkgJson | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $dst "package.json") -Encoding UTF8

# 7. Create junction for _installed (following §13.11 dual directory requirement)
$junctionPath = Join-Path $env:USERPROFILE ".cline\plugins\_installed\local\governance"
if (Test-Path $junctionPath) {
    # Could be a junction or real dir, remove either
    cmd /c rmdir "$junctionPath" 2>$null
    if (Test-Path $junctionPath) {
        Remove-Item -Path $junctionPath -Recurse -Force
    }
}
Write-Host ""
Write-Host "Creating junction: $junctionPath -> $dst"
cmd /c mklink /J "$junctionPath" "$dst"

# 8. Verify
Write-Host ""
Write-Host "=== Verification ==="
Write-Host "Installed files:"
Get-ChildItem -Path $dst -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($dst.Length)
    Write-Host "  $rel"
}

Write-Host ""
Write-Host "Junction check:"
$link = Get-Item $junctionPath
Write-Host "  Path: $($link.FullName)"
Write-Host "  Attributes: $($link.Attributes)"
if ($link.LinkType) {
    Write-Host "  LinkType: $($link.LinkType)"
    Write-Host "  Target: $($link.Target)"
}

# Check import path fix
Write-Host ""
Write-Host "Import path fix verification (pre-compact.ts):"
Select-String -Path (Join-Path $dst "hooks\pre-compact.ts") -Pattern "capabilities" | ForEach-Object {
    Write-Host "  $($_.Line.Trim())"
}

Write-Host ""
Write-Host "=== Sync Complete ==="
