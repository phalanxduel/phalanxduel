#!/usr/bin/env bash
set -e

echo '--- [PHASE 0: Build Identity] ---'
pnpm infra:metadata

echo '--- [PHASE 1: Host Artifacts] ---'
pnpm build

echo '--- [PHASE 2: Environment Sync] ---'
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    echo "Stopping fallback bare-metal server (PID: $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if ! docker compose --profile dev up --build -d app-dev; then
  echo '⚠️ Docker unavailable, falling back to bare-metal server...'
  # Clean up existing processes safely instead of kill -9 arbitrarily
  lsof -ti:3001 | xargs kill -15 2>/dev/null || true
  sleep 2
  
  pnpm --filter @phalanxduel/server start > server.log 2>&1 &
  SERVER_PID=$!
fi

tsx scripts/check-build-sync.ts
pnpm exec tsx bin/qa/api-playthrough.ts --until-failure --max-runs 20 --out-dir artifacts/playthrough-api
