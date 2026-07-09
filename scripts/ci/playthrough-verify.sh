#!/bin/bash
# scripts/ci/playthrough-verify.sh — Playthrough cycle: Clean -> Run -> Verify

set -euo pipefail

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "Usage: scripts/ci/playthrough-verify.sh"
  echo ""
  echo "Executes the Playthrough cycle: Clean -> Run -> Verify."
  exit 0
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR" || exit

echo "==> Cleaning old logs..."
rm -f logs/server.log

echo "==> Running playthrough matrix..."
pnpm qa:playthrough:matrix

echo "==> Verifying anomalies..."
tsx scripts/ci/verify-playthrough-anomalies.ts --latest 12 --fail-on-warn
