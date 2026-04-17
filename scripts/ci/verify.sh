#!/bin/bash
# scripts/ci/verify.sh — Orchestrated verification logic

set -euo pipefail

MODE="${1:-quick}" # quick, full, ci, release
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR" || exit

echo "==> 🏁 Starting verification: $MODE"

# --- HELPER: Phase Header ---
phase() {
  echo ""
  echo "--- [PHASE $1: $2] ---"
}

# --- Common Requirements ---
if [[ "$MODE" == "quick" || "$MODE" == "full" ]]; then
  phase 0 "Build Identity & Metadata"
  pnpm infra:metadata
  
  if [[ "$MODE" == "quick" ]]; then
    pnpm build
  fi
fi

# --- Linting ---
if [[ "$MODE" != "release" ]]; then
  phase 1 "Linting"
  pnpm lint
fi

# --- Type Checking ---
if [[ "$MODE" != "release" ]]; then
  phase 2 "Type Checking"
  pnpm typecheck
fi

# --- Unit Testing ---
if [[ "$MODE" == "full" || "$MODE" == "ci" ]]; then
  phase 3 "Testing"
  if [[ "$MODE" == "ci" ]]; then
    pnpm test:coverage:run
  else
    pnpm test:run:all
  fi
fi

# --- Tooling, Schema & QA Verification ---
if [[ "$MODE" != "quick" ]]; then
  phase 4 "Tooling & QA Verification"
  
  if [[ "$MODE" == "full" || "$MODE" == "release" ]]; then
    pnpm go:clients:check
    pnpm --filter @phalanxduel/shared schema:gen
    bash scripts/ci/verify-schema.sh
    tsx scripts/ci/verify-doc-fsm-consistency.ts
    tsx scripts/ci/verify-event-log.ts
    tsx scripts/ci/verify-feature-flag-env.ts
  fi
  
  if [[ "$MODE" == "ci" || "$MODE" == "release" ]]; then
    pnpm qa:replay:verify
    pnpm qa:playthrough:verify
  fi
  
  if [[ "$MODE" == "release" ]]; then
    pnpm qa:fairness:verify
    pnpm verify:integration:api
  fi
fi

# --- Documentation & Formatting ---
if [[ "$MODE" != "release" ]]; then
  phase 5 "Documentation & Formatting"
  pnpm docs:check
  pnpm lint:md
  prettier --check .
fi

echo ""
echo "==> ✅ Verification ($MODE) passed!"
