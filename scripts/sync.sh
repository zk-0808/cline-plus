#!/usr/bin/env bash
# sync.sh — 安全同步远端变更到本地（不丢本地改动）
#
# 用法: bash scripts/sync.sh [项目路径]
# 默认项目路径: E:/cline++
#
# 行为:
#   1. 检查本地未提交改动 → 自动 stash
#   2. fetch + 比较本地和远端的差异
#   3. rebase 本地未推送的 commit 到远端最新之上
#   4. 恢复 stash（如有）
#   5. 输出摘要：新 commit、handoff 变更、子模块状态

set -euo pipefail

PROJECT="${1:-E:/cline++}"
cd "$PROJECT"

echo "══════════════════════════════════════════"
echo " sync — $(date '+%Y-%m-%d %H:%M:%S')"
echo "══════════════════════════════════════════"
echo ""

# ── 1. 记录本地状态 ──────────────────────────────────
LOCAL_BRANCH=$(git branch --show-current)
LOCAL_UNPUSHED=$(git log --oneline @{upstream}..HEAD 2>/dev/null || echo "")
STASHED=false

echo "[1/5] 检查本地状态"
echo "  分支: $LOCAL_BRANCH"

if [ -n "$LOCAL_UNPUSHED" ]; then
    UNPUSHED_COUNT=$(echo "$LOCAL_UNPUSHED" | wc -l)
    echo "  本地未推送: $UNPUSHED_COUNT 个 commit"
else
    echo "  本地未推送: 无"
fi

DIRTY=$(git status --porcelain 2>/dev/null)
if [ -n "$DIRTY" ]; then
    echo "  未提交改动: $(echo "$DIRTY" | wc -l) 个文件"
    echo "  → 自动 stash"
    git stash push -m "sync-auto-$(date +%s)" --quiet
    STASHED=true
else
    echo "  未提交改动: 无"
fi
echo ""

# ── 2. Fetch ──────────────────────────────────────────
echo "[2/5] Fetch 远端..."
BEFORE_HEAD=$(git rev-parse HEAD)
git fetch origin --quiet 2>/dev/null || git fetch --quiet
AFTER_FETCH=$(git rev-parse origin/$LOCAL_BRANCH 2>/dev/null || git rev-parse FETCH_HEAD)
echo "  本地 HEAD: ${BEFORE_HEAD:0:7}"
echo "  远端 HEAD: ${AFTER_FETCH:0:7}"
echo ""

# ── 3. 计算差异 ──────────────────────────────────────
echo "[3/5] 分析差异"

if [ "$BEFORE_HEAD" = "$AFTER_FETCH" ]; then
    echo "  ✅ 本地已是最新，无需同步"
    NEW_COMMITS=""
    NEW_COUNT=0
else
    NEW_COMMITS=$(git log --oneline "$BEFORE_HEAD..$AFTER_FETCH" 2>/dev/null || echo "")
    if [ -n "$NEW_COMMITS" ]; then
        NEW_COUNT=$(echo "$NEW_COMMITS" | wc -l)
        echo "  远端新增 $NEW_COUNT 个 commit:"
        echo "$NEW_COMMITS" | while read -r line; do echo "    $line"; done
    else
        NEW_COUNT=0
        echo "  无新 commit"
    fi

    # 检查本地是否有未推送的 commit
    if [ -n "$LOCAL_UNPUSHED" ]; then
        echo "  → 本地有未推送 commit，执行 rebase..."
        git rebase "origin/$LOCAL_BRANCH" --quiet 2>/dev/null || {
            echo "  ⚠️  Rebase 冲突！中止 rebase，请手动处理"
            git rebase --abort 2>/dev/null
        }
    else
        echo "  → fast-forward 到远端..."
        git merge --ff-only "origin/$LOCAL_BRANCH" --quiet 2>/dev/null || \
        git reset --hard "origin/$LOCAL_BRANCH" --quiet 2>/dev/null || true
    fi
fi
echo ""

# ── 4. 恢复 stash ────────────────────────────────────
echo "[4/5] 恢复工作区"
if [ "$STASHED" = true ]; then
    echo "  → 恢复 stash..."
    git stash pop --quiet 2>/dev/null || {
        echo "  ⚠️  Stash pop 冲突！改动保留在 stash 中"
        echo "  手动恢复: git stash list → git stash pop stash@{N}"
    }
fi

# 子模块同步
if git submodule status --quiet 2>/dev/null; then
    echo "  → 同步子模块..."
    git submodule update --init --quiet 2>/dev/null || true
fi
echo "  ✅ 工作区就绪"
echo ""

# ── 5. 输出摘要 ──────────────────────────────────────
echo "[5/5] 同步摘要"
echo "──────────────────────────────────────────"

# handoff.md 是否变更
if [ "$NEW_COUNT" -gt 0 ] 2>/dev/null; then
    HANDOFF_CHANGED=$(git diff --name-only "$BEFORE_HEAD" HEAD 2>/dev/null | grep -c "handoff.md" || true)
    if [ "$HANDOFF_CHANGED" -gt 0 ]; then
        echo "  📋 handoff.md 已更新 — 建议阅读"
    fi

    # 列出变更的文件摘要
    CHANGED_FILES=$(git diff --stat "$BEFORE_HEAD" HEAD 2>/dev/null | tail -1)
    if [ -n "$CHANGED_FILES" ]; then
        echo "  📁 $CHANGED_FILES"
    fi
fi

echo ""
echo "══════════════════════════════════════════"
echo " sync 完成"
echo "══════════════════════════════════════════"
