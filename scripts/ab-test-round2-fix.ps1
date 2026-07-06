# ab-test-round2-fix.ps1 — Run R2-A2 and R2-A3 (A1 already completed)
# Uses regex replacement of `const md: string[] = [ ... ];` block

$ErrorActionPreference = "Stop"
$pluginSrc = "E:\cline++\.governance\plugin\index.ts"
$syncScript = "E:\cline++\scripts\sync-governance-plugin.ps1"
$n = 10
$question = "What are all the governance rules for this project? List them comprehensively."

$injectedFiles = @("constitution.md","handoff-entry.md","lifecycle.md","HANDOFF.md","snapshot.json")

# ── Prefix variants ──

$variantA2 = @'
    const md: string[] = [
      "# Governance Session Context (DO NOT RE-READ FILES)",
      "",
      "DO NOT call readFile/search/run_commands to re-read the files below.",
      "",
      "--- CONTEXT START ---",
      "",
    ];
'@

$variantA3 = @'
    const md: string[] = [
      "# GOVERNANCE SESSION CONTEXT (AUTO-INJECTED — DO NOT RE-READ FILES)",
      "",
      "The following project context is auto-loaded by the governance plugin.",
      "When answering questions about project state, constitution, rules, handoff, git status, or snapshots:",
      "1. USE the information below DIRECTLY — do NOT call readFile/search/run_commands to re-read these files",
      "2. If the user asks about constitution rules, quote from the 'Core Constitution' section below",
      "3. If the user asks about git status, quote from the 'Git Status' section below",
      "4. If the user asks about handoff or pending todos, quote from the 'Handoff' section below",
      "5. Only call tools if the requested information is NOT in the context below",
      "",
      "--- CONTEXT START ---",
      "",
    ];
'@

function Set-PrefixVariant {
    param([string]$variant)

    $content = Get-Content $pluginSrc -Raw -Encoding UTF8

    # Match `const md: string[] = [` ... `];` (first occurrence, non-greedy)
    $pattern = 'const md: string\[\] = \[.*?\];'
    $newContent = [regex]::Replace($content, $pattern, $variant.Trim(), [System.Text.RegularExpressions.RegexOptions]::Singleline)

    if ($newContent -eq $content) {
        Write-Host "ERROR: Pattern not matched"
        return $false
    }

    Set-Content $pluginSrc -Value $newContent -Encoding UTF8 -NoNewline
    return $true
}

function Run-SingleTest {
    param([int]$runNum)

    $output = cline $question --json --auto-approve true -t 60 -c "e:\cline++" 2>&1
    $outputStr = $output -join "`n"

    $iterationsWithTools = ([regex]::Matches($outputStr, '"hadToolCalls":true')).Count

    $filePaths = @()
    $pathMatches = [regex]::Matches($outputStr, '"path"\s*:\s*"([^"]+)"')
    foreach ($m in $pathMatches) { $filePaths += $m.Groups[1].Value }

    $searchQueries = @()
    $queryMatches = [regex]::Matches($outputStr, '"queries"\s*:\s*\[([^\]]+)\]')
    foreach ($m in $queryMatches) { $searchQueries += $m.Groups[1].Value }

    $redundantReads = 0
    $reasonableReads = 0
    foreach ($fp in $filePaths) {
        $isRedundant = $false
        foreach ($inj in $injectedFiles) {
            if ($fp -like "*$inj*") { $isRedundant = $true; break }
        }
        if ($isRedundant) { $redundantReads++ } else { $reasonableReads++ }
    }
    foreach ($sq in $searchQueries) {
        foreach ($inj in $injectedFiles) {
            if ($sq -like "*$inj*") { $redundantReads++ }
        }
    }

    return @{
        run = $runNum
        iterationsWithTools = $iterationsWithTools
        redundantReads = $redundantReads
        reasonableReads = $reasonableReads
        hasRedundantRead = ($redundantReads -gt 0)
        hasAnyToolCall = ($iterationsWithTools -gt 0)
    }
}

# ── Load A1 results from previous run ──
$a1Results = @()
$a1Data = @(
    @{run=1; iters=5; red=7; reason=31}
    @{run=2; iters=3; red=4; reason=9}
    @{run=3; iters=1; red=3; reason=7}
    @{run=4; iters=5; red=8; reason=14}
    @{run=5; iters=2; red=5; reason=6}
)
# Note: only 5 runs were captured in the log, but 10 were run. 
# The full results should be in the JSON if it was saved. Let's check.
Write-Host "R2-A1 was already run (10 runs, 100% tool rate, 100% redundant rate)"

# ── Run A2 and A3 ──

$variants = @(
    @{ name = "R2-A2-imperative"; block = $variantA2 }
    @{ name = "R2-A3-both";       block = $variantA3 }
)

$allResults = @()

foreach ($v in $variants) {
    Write-Host "`n========================================"
    Write-Host "Variant: $($v.name)"
    Write-Host "========================================"

    Write-Host "Setting prefix variant..."
    $success = Set-PrefixVariant -variant $v.block
    if (-not $success) {
        Write-Host "ERROR: Failed to set variant, skipping..."
        continue
    }

    Write-Host "Syncing to CLI..."
    & powershell -ExecutionPolicy Bypass -File $syncScript 2>&1 | Out-Null

    for ($i = 1; $i -le $n; $i++) {
        Write-Host "  Run $i/$n..." -NoNewline
        $result = Run-SingleTest -runNum $i
        $result.variant = $v.name
        $allResults += $result

        $status = if ($result.hasAnyToolCall) { "TOOLS($($result.iterationsWithTools))" } else { "NO-TOOLS" }
        $redundant = if ($result.hasRedundantRead) { "REDUNDANT" } else { "no-redundant" }
        Write-Host " $status $redundant [R:$($result.redundantReads) A:$($result.reasonableReads)]"
    }
}

# ── Print summary for A2 and A3 ──
Write-Host "`n`n========================================"
Write-Host "SUMMARY (R2-A2 + R2-A3)"
Write-Host "========================================"
Write-Host "| Variant | Runs | Runs with tools | Runs with redundant | Total redundant | Total reasonable |"
Write-Host "|---------|------|-----------------|---------------------|-----------------|------------------|"

foreach ($vname in @($variants.name)) {
    $vResults = $allResults | Where-Object { $_.variant -eq $vname }
    $runs = $vResults.Count
    $toolRuns = ($vResults | Where-Object { $_.hasAnyToolCall }).Count
    $redRuns = ($vResults | Where-Object { $_.hasRedundantRead }).Count
    $totalRed = ($vResults | Measure-Object -Property redundantReads -Sum).Sum
    $totalReason = ($vResults | Measure-Object -Property reasonableReads -Sum).Sum
    Write-Host "| $vname | $runs | $toolRuns | $redRuns | $totalRed | $totalReason |"
}

Write-Host "`n--- Per-run details ---"
Write-Host "| Variant | Run | Tool iters | Redundant | Reasonable |"
Write-Host "|---------|-----|------------|-----------|------------|"
foreach ($r in $allResults) {
    Write-Host "| $($r.variant) | $($r.run) | $($r.iterationsWithTools) | $($r.redundantReads) | $($r.reasonableReads) |"
}

# Save JSON
$resultsJson = $allResults | ConvertTo-Json -Depth 5
$resultsPath = "E:\cline++\docs\decisions\investigation\ab-test-round2-a2a3-results.json"
Set-Content $resultsPath -Value $resultsJson -Encoding UTF8
Write-Host "`nResults saved to: $resultsPath"

# Restore production config
Write-Host "`nRestoring production config (R2-A3)..."
Set-PrefixVariant -variant $variantA3
& powershell -ExecutionPolicy Bypass -File $syncScript 2>&1 | Out-Null
Write-Host "Done."
