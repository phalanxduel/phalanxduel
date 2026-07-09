#!/bin/bash
set -e

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "Usage: scripts/ci/audit-gha-pinning.sh"
  echo ""
  echo "Audits GitHub action pinning to ensure all third-party actions are pinned to SHAs."
  exit 0
fi

# Audit script to ensure all third-party GitHub Actions are pinned to a 40-character SHA.
# Local actions (starting with ./) are exempted.

echo "🔍 Auditing GitHub Action pinning..."

UNPINNED=$(grep -r "uses:" .github/workflows | grep "@" | grep -v "[0-9a-f]\{40\}" || true)
UNVERSIONED=$(grep -r "uses:" .github/workflows | grep -v "@" | grep -v "\./" || true)

if [ -n "$UNPINNED" ]; then
  echo "❌ Found actions pinned to tags/branches instead of SHAs:"
  echo "$UNPINNED"
  exit 1
fi

if [ -n "$UNVERSIONED" ]; then
  echo "❌ Found actions with no version at all (excluding local):"
  echo "$UNVERSIONED"
  exit 1
fi

echo "✅ All third-party actions are pinned to SHAs."
exit 0
