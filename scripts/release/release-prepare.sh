#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "Usage: scripts/release/release-prepare.sh"
  echo ""
  echo "Prepares a release by syncing version numbers and building docs."
  exit 0
fi

echo "🏁 Preparing release..."
bash bin/maint/sync-version.sh

pnpm docs:build
pnpm docs:dash

NEW_VER=$(grep '"version":' shared/package.json | head -n 1 | awk -F '"' '{print $4}')
echo "✅ Preparation complete for v$NEW_VER. Next: pnpm release:tag"
