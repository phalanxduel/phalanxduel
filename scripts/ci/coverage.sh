#!/bin/bash
# scripts/ci/coverage.sh — Run multi-package coverage

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR" || exit

pnpm --filter @phalanxduel/shared test:coverage
pnpm --filter @phalanxduel/engine test:coverage
pnpm --filter @phalanxduel/server test:coverage
pnpm test:coverage:report
