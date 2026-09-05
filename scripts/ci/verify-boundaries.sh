#!/usr/bin/env bash
# scripts/ci/verify-boundaries.sh — Enforce architecture boundaries and domain purity

set -euo pipefail

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "Usage: scripts/ci/verify-boundaries.sh"
  echo ""
  echo "Enforces architecture boundaries and domain purity."
  exit 0
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "==> 🏗️ Verifying architecture boundaries..."

# Analyze source modules only. Generated bundles under package dist/ directories
# are deployment artifacts, not source architecture, and bundlers can introduce
# legitimate runtime cycles between split chunks.
SOURCE_DIRS=(engine/src server/src client/src shared/src admin/src)
if ! npx dependency-cruiser \
  --config .dependency-cruiser.json \
  --include-only '^(engine|server|client|shared|admin)/src' \
  --do-not-follow '(^|/)dist/' \
  "${SOURCE_DIRS[@]}"; then
  echo ""
  echo "❌ ERROR: Architecture boundary violation detected."
  echo "Check .dependency-cruiser.json for rule definitions."
  exit 1
fi

echo "✅ Architecture boundaries are clean."
