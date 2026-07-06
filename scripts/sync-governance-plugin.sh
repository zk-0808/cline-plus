#!/usr/bin/env bash
# sync-governance-plugin.sh — Sync governance plugin to Cline CLI discovery path
# Cline CLI scans ~/.cline/plugins/installed/local/ and ~/.cline/plugins/_installed/local/
#
# Usage: bash scripts/sync-governance-plugin.sh [project-path]
# Default project path: current working directory

set -euo pipefail

PROJECT="${1:-$(pwd)}"
SRC="$PROJECT/.governance/plugin"
CAP_SRC="$PROJECT/.governance/capabilities"
DST="$HOME/.cline/plugins/installed/local/governance"

echo "=== Governance Plugin Sync ==="
echo "Source: $SRC"
echo "Destination: $DST"
echo ""

# 1. Clean old installation
if [ -d "$DST" ]; then
    echo "[1/6] Cleaning old installation..."
    rm -rf "$DST"
else
    echo "[1/6] No old installation found."
fi

# 2. Create directory structure
echo "[2/6] Creating directory structure..."
mkdir -p "$DST/hooks"
mkdir -p "$DST/capabilities/snapshot-writer"
mkdir -p "$DST/capabilities/git-checker"
mkdir -p "$DST/capabilities/handoff-provider"
mkdir -p "$DST/capabilities/rule-appender"

# 3. Copy plugin files
echo "[3/6] Copying plugin files..."
cp "$SRC"/*.ts "$DST/"
cp "$SRC"/*.json "$DST/" 2>/dev/null || true
cp "$SRC"/hooks/*.ts "$DST/hooks/"

# 4. Copy capabilities (self-contained — must be in plugin dir)
echo "[4/6] Copying capabilities..."
for cap in snapshot-writer git-checker handoff-provider rule-appender; do
    if [ -d "$CAP_SRC/$cap" ]; then
        cp "$CAP_SRC/$cap"/*.ts "$DST/capabilities/$cap/" 2>/dev/null || true
    fi
done

# 5. Create _installed junction (CLI dual-directory requirement)
echo "[5/6] Creating _installed symlink..."
INSTALLED_DIR="$HOME/.cline/plugins/installed"
JUNCTION_DIR="$HOME/.cline/plugins/_installed"

if [ ! -d "$JUNCTION_DIR" ]; then
    mkdir -p "$JUNCTION_DIR"
fi

# Create symlink: _installed/local -> installed/local
if [ -L "$JUNCTION_DIR/local" ] || [ -d "$JUNCTION_DIR/local" ]; then
    rm -rf "$JUNCTION_DIR/local" 2>/dev/null || true
fi
ln -s "$INSTALLED_DIR/local" "$JUNCTION_DIR/local"

# 6. Verify
echo "[6/6] Verifying..."
if [ -f "$DST/index.ts" ]; then
    echo "  ✓ index.ts present"
else
    echo "  ✗ index.ts MISSING" >&2
    exit 1
fi

CAP_COUNT=$(find "$DST/capabilities" -name "*.ts" 2>/dev/null | wc -l)
echo "  ✓ $CAP_COUNT capability files synced"

echo ""
echo "=== Sync Complete ==="
echo "Plugin installed to: $DST"
echo "Restart Cline CLI to load the plugin."
