#!/usr/bin/env bash

# Phalanx Duel - Issue Diagnostics Script
# Generates a Markdown report for GitHub issues.

echo "### 🔍 Diagnostic Report"
echo ""

echo "#### 💻 System Environment"
echo "- **OS**: $(sw_vers -productName) $(sw_vers -productVersion) ($(sw_vers -buildVersion))"
echo "- **Architecture**: $(uname -m)"
echo "- **Shell**: $SHELL ($($SHELL --version 2>/dev/null | head -n 1 || echo "version unknown"))"
echo "- **Node.js**: $(node -v 2>/dev/null || echo "Not installed")"
echo "- **pnpm**: $(pnpm -v 2>/dev/null || echo "Not installed")"
echo "- **Git**: $(git --version | awk '{print $3}' 2>/dev/null || echo "Not installed")"
echo "- **Docker**: $(docker --version 2>/dev/null | head -n 1 || echo "Not installed")"
echo "- **TypeScript**: $(npx tsc -v 2>/dev/null || echo "Not installed")"
echo ""

echo "#### 📦 Project Context"
if [ -f "package.json" ]; then
    VERSION=$(jq -r '.version // "unknown"' package.json)
    echo "- **Root Version**: $VERSION"
fi

if [ -f "mise.toml" ]; then
    REQUIRED_NODE=$(awk -F'"' '/^node *=/ {print $2}' mise.toml)
    if [ -n "$REQUIRED_NODE" ]; then
        echo "- **Required Node**: $REQUIRED_NODE (from mise.toml)"
    fi
fi

if [ -f "pnpm-workspace.yaml" ]; then
    echo "- **Workspaces**: $(pnpm m ls --depth -1 --json | jq -r '.[].name' | tr '
' ',' | sed 's/,$//')"
fi
echo ""

echo "#### 🌳 Git State"
if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "- **Branch**: $(git rev-parse --abbrev-ref HEAD)"
    echo "- **Commit**: $(git rev-parse --short HEAD)"
    echo "- **Status**: $(git status --porcelain | wc -l | xargs) untracked/modified files"
else
    echo "- **Git**: Not a git repository"
fi
echo ""

echo "#### ⚙️ Resource Usage"
echo "- **Disk Space (Root)**: $(df -h . | awk 'NR==2 {print $4 " available (" $5 " used)"}')"
echo "- **Memory**: $(sysctl -n hw.memsize | awk '{print $1/1024/1024/1024 " GB Total"}')"
echo ""

echo "---"
echo "_Generated on $(date)_"
