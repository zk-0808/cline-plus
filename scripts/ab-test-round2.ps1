# ab-test-round2.ps1 — Prefix decomposition experiment
# 3 variants × n=10, complex question, binary metric + redundant/reasonable labeling
#
# Variants:
#   R2-A1: factual only ("auto-loaded context", no DO NOT RE-READ)
#   R2-A2: imperative only ("DO NOT RE-READ FILES", no factual framing)
#   R2-A3: both (current B+prefix, full 5-rule prefix)

$ErrorActionPreference = "Stop"
$pluginSrc = "E:\cline++\.governance\plugin\index.ts"
$syncScript = "E:\cline++\scripts\sync-governance-plugin.ps1"
$clinerules = "E:\cline++\.clinerules"
$n = 10
$question = "What are all the governance rules for this project? List them comprehensively."

# Injected file paths (redundant if re-read)
$injectedFiles = @(
    "constitution.md",
    "handoff-entry.md",
    "lifecycle.md",
    "HANDOFF.md",
    "snapshot.json"
)

# ── Prefix variants ──

$variantA1 = @'
    const md: string[] = [
      "# Governance Session Context",
      "",
      "The following project context is auto-loaded by the governance plugin.",
      "",
      "--- CONTEXT START ---",
      "",
    ];
'@

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

# ── Marker for replacement ──
$markerStart = "    // Behavioral instruction prefix"
$markerEnd = '"--- CONTEXT START ---",'
# The block between markerStart and the line after markerEnd is what we replace

function Set-PrefixVariant {
    param([string]$variant)

    $content = Get-Content $pluginSrc -Raw -Encoding UTF8

    # Find the block from the marker to "--- CONTEXT START ---" line (inclusive)
    $pattern = "(    // Behavioral instruction prefix.*?""--- CONTEXT START ---"",\s*\n)"
    $replacement = ($variant + "`n")

    $newContent = [regex]::Replace($content, $pattern, $replacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)

    if ($newContent -eq $content) {
        Write-Host "WARNING: Pattern not matched, trying alternate approach..."
        # Find start and end indices
        $startIdx = $content.IndexOf($markerStart)
        if ($startIdx -lt 0) {
            Write-Host "ERROR: Cannot find marker start"
            return $false
        }
        $endIdx = $content.IndexOf($markerEnd, $startIdx)
        if ($endIdx -lt 0) {
            Write-Host "ERROR: Cannot find marker end"
            return $false
        }
        $endIdx = $content.IndexOf("`n", $endIdx) + 1
        $newContent = $content.Substring(0, $startIdx) + $variant + "`n" + $content.Substring($endIdx)
    }

    Set-Content $pluginSrc -Value $newContent -Encoding UTF8 -NoNewline
    return $true
}

function Run-SingleTest {
    param([int]$runNum)

    $output = cline $question --json --auto-approve true -t 60 -c "e:\cline++" 2>&1
    $outputStr = $output -join "`n"

    # Extract tool call info
    $toolCalls = @()
    $toolMatches = [regex]::Matches($outputStr, '"toolName"\s*:\s*"([^"]+)"')
    foreach ($m in $toolMatches) {
        $toolName = $m.Groups[1].Value
        $toolCalls += $toolName
    }

    # Extract file paths from tool inputs
    $filePaths = @()
    $pathMatches = [regex]::Matches($outputStr, '"path"\s*:\s*"([^"]+)"')
    foreach ($m in $pathMatches) {
        $filePaths += $m.Groups[1].Value
    }

    # Also check search queries
    $searchQueries = @()
    $queryMatches = [regex]::Matches($outputStr, '"queries"\s*:\s*\[([^\]]+)\]')
    foreach ($m in $queryMatches) {
        $searchQueries += $m.Groups[1].Value
    }

    # Count iterations with/without tools
    $iterationsWithTools = ([regex]::Matches($outputStr, '"hadToolCalls":true')).Count
    $iterationsWithoutTools = ([regex]::Matches($outputStr, '"hadToolCalls":false')).Count

    # Label tool calls: redundant vs reasonable
    $redundantReads = 0
    $reasonableReads = 0
    foreach ($fp in $filePaths) {
        $isRedundant = $false
        foreach ($inj in $injectedFiles) {
            if ($fp -like "*$inj*") {
                $isRedundant = $true
                break
            }
        }
        if ($isRedundant) {
            $redundantReads++
        } else {
            $reasonableReads++
        }
    }

    # Search calls that search for injected file paths
    foreach ($sq in $searchQueries) {
        foreach ($inj in $injectedFiles) {
            if ($sq -like "*$inj*") {
                $redundantReads++
            }
        }
    }

    $hasRedundantRead = $redundantReads -gt 0
    $hasAnyToolCall = $iterationsWithTools -gt 0

    return @{
        run = $runNum
        iterationsWithTools = $iterationsWithTools
        iterationsWithoutTools = $iterationsWithoutTools
        toolCalls = $toolCalls
        filePaths = $filePaths
        redundantReads = $redundantReads
        reasonableReads = $reasonableReads
        hasRedundantRead = $hasRedundantRead
        hasAnyToolCall = $hasAnyToolCall
    }
}

# ── Main experiment ──

$variants = @(
    @{ name = "R2-A1-factual";    block = $variantA1 }
    @{ name = "R2-A2-imperative"; block = $variantA2 }
    @{ name = "R2-A3-both";       block = $variantA3 }
)

$allResults = @()

foreach ($v in $variants) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Variant: $($v.name)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    # Set prefix variant
    Write-Host "Setting prefix variant..."
    $success = Set-PrefixVariant -variant $v.block
    if (-not $success) {
        Write-Host "ERROR: Failed to set variant, skipping..." -ForegroundColor Red
        continue
    }

    # Sync to CLI
    Write-Host "Syncing to CLI..."
    & powershell -ExecutionPolicy Bypass -File $syncScript 2>&1 | Out-Null

    # Run n tests
    for ($i = 1; $i -le $n; $i++) {
        Write-Host "  Run $i/$n..." -NoNewline
        $result = Run-SingleTest -runNum $i
        $result.variant = $v.name
        $allResults += $result

        $status = if ($result.hasAnyToolCall) { "TOOLS($($result.iterationsWithTools))" } else { "NO-TOOLS" }
        $redundant = if ($result.hasRedundantRead) { "REDUNDANT" } else { "no-redundant" }
        Write-Host " $status $redundant [R:$($result.redundantReads) A:$($result.reasonableReads)]" -ForegroundColor Yellow
    }
}

# ── Summary ──

Write-Host "`n`n========================================" -ForegroundColor Green
Write-Host "SUMMARY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$variantStats = @{}
foreach ($r in $allResults) {
    if (-not $variantStats.ContainsKey($r.variant)) {
        $variantStats[$r.variant] = @{
            runs = 0
            runsWithTools = 0
            runsWithRedundant = 0
            totalRedundant = 0
            totalReasonable = 0
            totalToolIterations = 0
        }
    }
    $s = $variantStats[$r.variant]
    $s.runs++
    if ($r.hasAnyToolCall) { $s.runsWithTools++ }
    if ($r.hasRedundantRead) { $s.runsWithRedundant++ }
    $s.totalRedundant += $r.redundantReads
    $s.totalReasonable += $r.reasonableReads
    $s.totalToolIterations += $r.iterationsWithTools
}

Write-Host "`n| Variant | Runs | Runs with tools | Runs with redundant read | Redundant rate | Total redundant | Total reasonable |"
Write-Host "|---------|------|-----------------|--------------------------|----------------|-----------------|------------------|"

foreach ($vname in @($variants.name)) {
    $s = $variantStats[$vname]
    $toolRate = [math]::Round(($s.runsWithTools / $s.runs) * 100, 1)
    $redundantRate = [math]::Round(($s.runsWithRedundant / $s.runs) * 100, 1)
    Write-Host "| $vname | $($s.runs) | $($s.runsWithTools) ($toolRate%) | $($s.runsWithRedundant) ($redundantRate%) | $($s.totalRedundant) | $($s.totalReasonable) |"
}

# ── Per-run details ──

Write-Host "`n--- Per-run details ---"
Write-Host "| Variant | Run | Tool iters | Redundant | Reasonable |"
Write-Host "|---------|-----|------------|-----------|------------|"
foreach ($r in $allResults) {
    Write-Host "| $($r.variant) | $($r.run) | $($r.iterationsWithTools) | $($r.redundantReads) | $($r.reasonableReads) |"
}

# ── Save results to JSON ──
$resultsJson = $allResults | ConvertTo-Json -Depth 5
$resultsPath = "E:\cline++\docs\decisions\investigation\ab-test-round2-results.json"
Set-Content $resultsPath -Value $resultsJson -Encoding UTF8
Write-Host "`nResults saved to: $resultsPath"

# ── Restore production config (R2-A3 = B+prefix) ──
Write-Host "`nRestoring production config (R2-A3)..."
Set-PrefixVariant -variant $variantA3
& powershell -ExecutionPolicy Bypass -File $syncScript 2>&1 | Out-Null
Write-Host "Done."
