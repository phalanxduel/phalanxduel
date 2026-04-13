#!/usr/bin/env bash
set -euo pipefail

echo "🏁 Preparing release..."
bash bin/maint/sync-version.sh

pnpm docs:build
pnpm docs:dash

NEW_VER=$(grep '"version":' shared/package.json | head -n 1 | awk -F '"' '{print $4}')
echo "✅ Preparation complete for v$NEW_VER. Next: pnpm release:tag"
