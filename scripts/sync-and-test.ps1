# sync-and-test.ps1 — sync index.ts + clear log + run cline + show debug log
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$src = "e:\cline++\context-snapshot\src\index.ts"
$dst = "$env:USERPROFILE\.cline\plugins\installed\local\context-snapshot\src\index.ts"
$log = "$env:USERPROFILE\.cline\data\snapshot\handoff-inject-debug.log"

Write-Host "=== [1/4] sync index.ts ===" -ForegroundColor Cyan
Copy-Item $src $dst -Force
Write-Host "synced, size: $((Get-Item $dst).Length)" -ForegroundColor Green

Write-Host "=== [2/4] clear old debug log ===" -ForegroundColor Cyan
if (Test-Path $log) { Remove-Item $log -Force; Write-Host "old log cleared" } else { Write-Host "no old log" }

Write-Host "=== [3/4] run cline (non-TUI) ===" -ForegroundColor Cyan
Write-Host "cmd: cline `"`"" -ForegroundColor Gray
cline "hi, short answer: do you see project state info at the top?" 2>&1 | Select-Object -First 50

Write-Host "=== [4/4] debug log ===" -ForegroundColor Cyan
if (Test-Path $log) {
    Get-Content $log
} else {
    Write-Host "NO LOG FILE — setup() not called, plugin not loaded" -ForegroundColor Red
}
