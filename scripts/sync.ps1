# sync.ps1 — 安全同步远端变更到本地（不丢本地改动）
#
# 用法: .\scripts\sync.ps1 [-Project "E:\cline++"]
# 默认项目路径: E:\cline++

param(
    [string]$Project = "E:\cline++"
)

$ErrorActionPreference = "Stop"
Push-Location $Project

Write-Host ""
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " sync — $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── 1. 记录本地状态 ──────────────────────────────────
$branch = (git branch --show-current).Trim()
$dirty = git status --porcelain 2>$null
$stashed = $false
$beforeHead = (git rev-parse HEAD).Trim()

Write-Host "[1/5] 检查本地状态" -ForegroundColor Yellow
Write-Host "  分支: $branch"

$unpushed = git log --oneline "@{upstream}..HEAD" 2>$null
if ($unpushed) {
    $count = @($unpushed).Count
    Write-Host "  本地未推送: $count 个 commit"
} else {
    Write-Host "  本地未推送: 无"
}

if ($dirty) {
    $fileCount = @($dirty).Count
    Write-Host "  未提交改动: $fileCount 个文件"
    Write-Host "  → 自动 stash" -ForegroundColor Gray
    git stash push -m "sync-auto-$(Get-Date -UFormat %s)" --quiet
    $stashed = $true
} else {
    Write-Host "  未提交改动: 无"
}
Write-Host ""

# ── 2. Fetch ──────────────────────────────────────────
Write-Host "[2/5] Fetch 远端..." -ForegroundColor Yellow
git fetch origin --quiet 2>$null
$afterFetch = (git rev-parse "origin/$branch" 2>$null)
if (-not $afterFetch) { $afterFetch = (git rev-parse FETCH_HEAD) }
Write-Host "  本地 HEAD: $($beforeHead.Substring(0,7))"
Write-Host "  远端 HEAD: $($afterFetch.Substring(0,7))"
Write-Host ""

# ── 3. 计算差异 ──────────────────────────────────────
Write-Host "[3/5] 分析差异" -ForegroundColor Yellow

if ($beforeHead -eq $afterFetch) {
    Write-Host "  ✓ 本地已是最新，无需同步" -ForegroundColor Green
    $newCount = 0
} else {
    $newCommits = git log --oneline "$beforeHead..$afterFetch" 2>$null
    if ($newCommits) {
        $newCount = @($newCommits).Count
        Write-Host "  远端新增 $newCount 个 commit:"
        foreach ($c in $newCommits) { Write-Host "    $c" }
    } else {
        $newCount = 0
    }

    if ($unpushed) {
        Write-Host "  → 本地有未推送 commit，执行 rebase..." -ForegroundColor Gray
        git rebase "origin/$branch" --quiet 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ⚠ Rebase 冲突！已中止，请手动处理" -ForegroundColor Red
            git rebase --abort 2>$null
        }
    } else {
        Write-Host "  → fast-forward 到远端..." -ForegroundColor Gray
        git merge --ff-only "origin/$branch" --quiet 2>$null
        if ($LASTEXITCODE -ne 0) {
            git reset --hard "origin/$branch" --quiet 2>$null
        }
    }
}
Write-Host ""

# ── 4. 恢复工作区 ────────────────────────────────────
Write-Host "[4/5] 恢复工作区" -ForegroundColor Yellow
if ($stashed) {
    Write-Host "  → 恢复 stash..." -ForegroundColor Gray
    git stash pop --quiet 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠ Stash pop 冲突！改动保留在 stash 中" -ForegroundColor Red
        Write-Host "  手动恢复: git stash list → git stash pop stash@{N}"
    }
}

# 子模块同步
$submodules = git submodule status --quiet 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  → 同步子模块..." -ForegroundColor Gray
    git submodule update --init --quiet 2>$null
}
Write-Host "  ✓ 工作区就绪" -ForegroundColor Green
Write-Host ""

# ── 5. 输出摘要 ──────────────────────────────────────
Write-Host "[5/5] 同步摘要" -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────"

if ($newCount -gt 0) {
    $handoffChanged = git diff --name-only $beforeHead HEAD 2>$null | Select-String "handoff.md"
    if ($handoffChanged) {
        Write-Host "  handoff.md 已更新 — 建议阅读" -ForegroundColor Magenta
    }
    $stat = git diff --stat "$beforeHead" HEAD 2>$null | Select-Object -Last 1
    if ($stat) {
        Write-Host "  $stat" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " sync 完成" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Pop-Location
