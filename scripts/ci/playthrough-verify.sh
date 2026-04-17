#!/bin/bash
# scripts/ci/playthrough-verify.sh — Playthrough cycle: Clean -> Run -> Verify

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR" || exit

echo "==> Cleaning old logs..."
rm -f logs/server.log

echo "==> Running playthrough matrix..."
pnpm qa:playthrough:matrix

echo "==> Verifying anomalies..."
tsx scripts/ci/verify-playthrough-anomalies.ts --latest 12 --fail-on-warn
