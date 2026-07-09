#!/bin/bash
# scripts/ci/coverage.sh — Run multi-package coverage

set -euo pipefail

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "Usage: scripts/ci/coverage.sh"
  echo ""
  echo "Runs multi-package coverage."
  exit 0
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR" || exit

pnpm --filter @phalanxduel/shared test:coverage
pnpm --filter @phalanxduel/engine test:coverage
pnpm --filter @phalanxduel/server test:coverage
pnpm test:coverage:report
