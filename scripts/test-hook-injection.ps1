# test-hook-injection.ps1 — Phase 3 CLI integration test prep
#
# Usage: .\scripts\test-hook-injection.ps1
# Purpose: sync latest plugin code + verify beforeRun/beforeTool hook routing

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$src = "e:\cline++\context-snapshot\src"
$dst = "$env:USERPROFILE\.cline\plugins\installed\local\context-snapshot\src"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Phase 3 - Hook Injection CLI Integration Test" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# --- Step 1: Sync latest plugin code ---
Write-Host "`n[1/3] Sync latest plugin code to install dir..." -ForegroundColor Yellow

if (-not (Test-Path "$dst\providers")) {
    New-Item -ItemType Directory -Force -Path "$dst\providers" | Out-Null
}

Copy-Item "$src\providers\handoff-provider.ts" "$dst\providers\handoff-provider.ts" -Force
Copy-Item "$src\git-status-checker.ts" "$dst\git-status-checker.ts" -Force
Copy-Item "$src\index.ts" "$dst\index.ts" -Force

Write-Host "  [OK] handoff-provider.ts" -ForegroundColor Green
Write-Host "  [OK] git-status-checker.ts" -ForegroundColor Green
Write-Host "  [OK] index.ts (beforeRun + handoff-injector + commit guard)" -ForegroundColor Green

# Verify
$hasBeforeRun = Select-String -Path "$dst\index.ts" -Pattern "beforeRun" -Quiet
$hasHandoffInjector = Select-String -Path "$dst\index.ts" -Pattern "handoff-injector" -Quiet
$hasCommitGuard = Select-String -Path "$dst\index.ts" -Pattern "COMMIT GUARD" -Quiet
Write-Host "  [OK] beforeRun=$hasBeforeRun | handoff-injector=$hasHandoffInjector | commit-guard=$hasCommitGuard" -ForegroundColor Green

# --- Step 2: Clear old marker ---
Write-Host "`n[2/3] Clear old marker..." -ForegroundColor Yellow
$marker = "$env:USERPROFILE\.cline\data\snapshot\plugin-loaded.marker"
if (Test-Path $marker) {
    Remove-Item $marker -Force
    Write-Host "  [OK] old marker deleted" -ForegroundColor Green
} else {
    Write-Host "  [-] no marker (first run)" -ForegroundColor Gray
}

# --- Step 3: Test steps for user ---
Write-Host "`n[3/3] CLI integration test steps:" -ForegroundColor Yellow
Write-Host "  1. Start CLI:" -ForegroundColor White
Write-Host "     cd e:\cline++; cline -i" -ForegroundColor White
Write-Host ""
Write-Host "  2. Expected console.log on startup:" -ForegroundColor White
Write-Host "     [context-snapshot] setup() called" -ForegroundColor White
Write-Host "     [context-snapshot] setup() done - capabilities: messageBuilders, rules, hooks" -ForegroundColor White
Write-Host "     [context-snapshot] handoff loaded:" -ForegroundColor White
Write-Host "     (summary with handoff.md mtime + unfinished count)" -ForegroundColor White
Write-Host ""
Write-Host "  3. Input any prompt (e.g. 'hello'), expected:" -ForegroundColor White
Write-Host "     - first model request: handoff-injector injects handoff content" -ForegroundColor White
Write-Host "     - subsequent requests: no repeat injection" -ForegroundColor White
Write-Host ""
Write-Host "  4. Verify commit guard (need >=5 uncommitted files):" -ForegroundColor White
Write-Host "     - manually create 5 temp files without commit" -ForegroundColor White
Write-Host "     - trigger write-class tools 3 times in cline" -ForegroundColor White
Write-Host "     - expected: [context-snapshot] COMMIT GUARD: ..." -ForegroundColor White
Write-Host ""
Write-Host "  5. Check marker after exit:" -ForegroundColor White
Write-Host "     Test-Path `"$marker`"" -ForegroundColor White

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host " Ready - run CLI test per steps above" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
