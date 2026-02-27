#!/bin/bash
set -euo pipefail

APP_NAME="${APP_NAME:-phalanxduel}"
LOG_DIR="${LOG_DIR:-tmp/deploy}"
TS="$(date -u +"%Y%m%dT%H%M%SZ")"

mkdir -p "$LOG_DIR"

DEPLOY_LOG="$LOG_DIR/deploy-$TS.log"
FLY_LOG="$LOG_DIR/fly-$TS.log"
LATEST_LINK="$LOG_DIR/latest.log"

echo "Writing deploy output to: $DEPLOY_LOG"
echo "Writing Fly runtime logs to: $FLY_LOG"

ln -sf "$(basename "$DEPLOY_LOG")" "$LATEST_LINK"

cleanup() {
  if [ -n "${LOG_PID:-}" ] && kill -0 "$LOG_PID" >/dev/null 2>&1; then
    kill "$LOG_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

# Capture runtime/service logs in parallel so hangs can be diagnosed.
fly logs --app "$APP_NAME" >"$FLY_LOG" 2>&1 &
LOG_PID=$!

# Run the existing production deploy flow and tee output to a file for tailing.
bash scripts/release/deploy-fly.sh 2>&1 | tee "$DEPLOY_LOG"
