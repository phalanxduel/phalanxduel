#!/usr/bin/env sh
# scripts/ci/verify.sh — Orchestrated verification logic

set -eu

# Ensure corepack doesn't prompt for downloads
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

MODE="${1:-quick}" # quick, full, ci, release
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR" || exit

echo "==> 🏁 Starting verification: $MODE"

# --- HELPER: Phase Header ---
phase() {
  echo ""
  echo "--- [PHASE $1: $2] ---"
}

# --- Common Requirements ---
if [ "$MODE" = "quick" ] || [ "$MODE" = "full" ]; then
  phase 0 "Build Identity & Metadata"
  pnpm infra:metadata
  
  if [ "$MODE" = "quick" ]; then
    pnpm build
  fi
fi

# --- Linting ---
if [ "$MODE" != "release" ]; then
  phase 1 "Linting"
  pnpm lint
fi

# --- Type Checking ---
if [ "$MODE" != "release" ]; then
  phase 2 "Type Checking"
  pnpm typecheck
fi

# --- Unit Testing ---
if [ "$MODE" = "full" ] || [ "$MODE" = "ci" ]; then
  phase 3 "Testing"
  if [ "$MODE" = "ci" ]; then
    pnpm test:coverage:run
  else
    pnpm test:run:all
  fi
fi

# --- Tooling, Schema & QA Verification ---
if [ "$MODE" != "quick" ]; then
  phase 4 "Tooling & QA Verification"
  
  if [ "$MODE" = "full" ] || [ "$MODE" = "release" ]; then
    pnpm go:clients:check
    pnpm --filter @phalanxduel/shared schema:gen
    bash scripts/ci/verify-schema.sh
    node --import tsx scripts/ci/verify-doc-fsm-consistency.ts
    node --import tsx scripts/ci/verify-event-log.ts
    node --import tsx scripts/ci/verify-feature-flag-env.ts
    
    # Heavyweight simulations are isolated to local 'full' verification
    pnpm qa:replay:verify
    pnpm qa:playthrough:verify
  fi
  
  if [ "$MODE" = "ci" ]; then
    pnpm qa:replay:verify
    pnpm qa:playthrough:verify
  fi
  
  if [ "$MODE" = "release" ]; then
    pnpm qa:fairness:verify
    pnpm verify:integration:api
  fi
fi

# --- Documentation & Formatting ---
if [ "$MODE" != "release" ]; then
  phase 5 "Documentation & Formatting"
  pnpm docs:check
  pnpm lint:md
  prettier --check .
fi

echo ""
echo "==> ✅ Verification ($MODE) passed!"
