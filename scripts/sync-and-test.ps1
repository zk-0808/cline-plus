# sync-and-test.ps1 - sync index.ts with dbgLog to install dir + run cline + show log
# Run in REAL PowerShell (not TRAE sandbox)
# Note: keep this file pure ASCII (PowerShell 5.x parses .ps1 as GBK without BOM)

$ErrorActionPreference = "Stop"

$srcIndex = "e:\cline++\context-snapshot\src\index.ts"
$dstIndex = "C:\Users\19936\.cline\plugins\_installed\local\context-snapshot\src\index.ts"
$logDir = "C:\Users\19936\.cline\data\snapshot"
$logFile = "$logDir\handoff-inject-debug.log"

Write-Host "=== [1/4] Sync index.ts ==="
Copy-Item $srcIndex $dstIndex -Force
Write-Host "  OK: index.ts synced"

Write-Host "=== [2/4] Clean old log ==="
if (Test-Path $logFile) {
    Remove-Item $logFile -Force
    Write-Host "  OK: old log removed"
} else {
    Write-Host "  OK: no old log"
}

Write-Host "=== [3/4] Run cline (non-TUI) ==="
Write-Host '  cmd: cline "what is the latest commit hash? what is the P0 todo in handoff? answer briefly"'
Push-Location e:\cline++
cline "what is the latest commit hash? what is the P0 todo in handoff? answer briefly" 2>&1 | Tee-Object -FilePath "$logDir\cline-stdout.log"
Pop-Location
Write-Host "  OK: cline finished"

Write-Host "=== [4/4] Debug log content ==="
if (Test-Path $logFile) {
    Write-Host "--- handoff-inject-debug.log ---"
    Get-Content $logFile
    Write-Host "--- end ---"
} else {
    Write-Host '  NO LOG FILE - dbgLog never called (setup failed before reaching dbgLog)'
}
