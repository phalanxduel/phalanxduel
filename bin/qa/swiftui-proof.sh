#!/usr/bin/env bash
# One-command TASK-360.01 proof: drive the real native SwiftUI app through a
# complete bot match against a freshly started, uniquely ported local server,
# then extract and validate the evidence retained in the .xcresult bundle.
#
# The XCUITest runner cannot write files into the run directory directly
# (sandboxed writes silently fail), so evidence extraction MUST go through
# `xcrun xcresulttool export attachments` — handled by verify-swiftui-proof.ts.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SWIFTUI_DIR="${PHALANX_SWIFTUI_DIR:-$REPO_ROOT/../game-swiftui}"

HEADS_UP=false
ACTION_DELAY_MS=""
FINAL_HOLD_SECONDS=""
STARTING_LP=20
SEED=2026072401
PORT=""
TIMEOUT_SECONDS=300
RUN_DIR=""

usage() {
  cat <<'EOF'
SwiftUI Bot-Match Proof (TASK-360.01)

Usage:
  pnpm qa:swiftui:proof                 # fast proof run
  pnpm qa:swiftui:proof:watch           # heads-up mode: watchable, paced, held at game over
  bash bin/qa/swiftui-proof.sh [options]

Options:
  --watch                 Heads-up mode: keep the app frontmost, pace every
                          action (default 500ms), hold game over for 20s
  --lp N                  Starting lifepoints (default: 20)
  --seed N                Deterministic match seed (default: 2026072401)
  --port N                Server port (default: first free port from 3121)
  --timeout N             Proof timeout in seconds (default: 300)
  --action-delay-ms N     Override per-action pacing
  --final-hold N          Override seconds to hold the game-over screen
  --run-dir PATH          Artifact directory (default: /private/tmp/phalanx-swiftui-proof-<timestamp>)
  --swiftui-dir PATH      game-swiftui checkout (default: ../game-swiftui, or $PHALANX_SWIFTUI_DIR)
  --help, -h              Show this help

Artifacts written to the run directory:
  config.json, server.log, xcodebuild.log, native-debug.log, proof.xcresult,
  manifest.json, screenshots/*.png (extracted from the xcresult)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --watch) HEADS_UP=true; shift ;;
    --lp) STARTING_LP="$2"; shift 2 ;;
    --seed) SEED="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --timeout) TIMEOUT_SECONDS="$2"; shift 2 ;;
    --action-delay-ms) ACTION_DELAY_MS="$2"; shift 2 ;;
    --final-hold) FINAL_HOLD_SECONDS="$2"; shift 2 ;;
    --run-dir) RUN_DIR="$2"; shift 2 ;;
    --swiftui-dir) SWIFTUI_DIR="$2"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ "$HEADS_UP" == true ]]; then
  ACTION_DELAY_MS="${ACTION_DELAY_MS:-500}"
  FINAL_HOLD_SECONDS="${FINAL_HOLD_SECONDS:-20}"
else
  ACTION_DELAY_MS="${ACTION_DELAY_MS:-0}"
  FINAL_HOLD_SECONDS="${FINAL_HOLD_SECONDS:-0}"
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "❌ The SwiftUI proof requires a macOS host with Xcode." >&2
  exit 1
fi
if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "❌ xcodebuild not found. Install Xcode and its command-line tools." >&2
  exit 1
fi
if [[ ! -d "$SWIFTUI_DIR/PhalanxDuelClient.xcodeproj" ]]; then
  echo "❌ game-swiftui checkout not found at $SWIFTUI_DIR" >&2
  echo "   Pass --swiftui-dir or set PHALANX_SWIFTUI_DIR." >&2
  exit 1
fi

if [[ -z "$PORT" ]]; then
  PORT=3121
  while lsof -i tcp:"$PORT" >/dev/null 2>&1; do
    PORT=$((PORT + 1))
  done
elif lsof -i tcp:"$PORT" >/dev/null 2>&1; then
  echo "❌ Port $PORT is already in use; refusing to share a server the proof does not own." >&2
  exit 1
fi

RUN_DIR="${RUN_DIR:-/private/tmp/phalanx-swiftui-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$RUN_DIR"

SERVER_PID=""
cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  # The port was verified free before startup, so any remaining listener is ours.
  local listeners
  listeners="$(lsof -ti tcp:"$PORT" 2>/dev/null || true)"
  if [[ -n "$listeners" ]]; then
    # shellcheck disable=SC2086
    kill $listeners 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "▶ Run directory: $RUN_DIR"
echo "▶ Starting Phalanx server on 127.0.0.1:$PORT (log: $RUN_DIR/server.log)"
(
  cd "$REPO_ROOT"
  exec env -u DATABASE_URL PHALANX_SERVER_PORT="$PORT" HOST=127.0.0.1 \
    bash bin/maint/with-tooling-postgres.sh \
    pnpm --filter @phalanxduel/server exec tsx src/index.ts
) >"$RUN_DIR/server.log" 2>&1 &
SERVER_PID=$!

HEALTH_URL="http://127.0.0.1:$PORT/health"
for _ in $(seq 1 90); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "❌ Server exited during startup. Last log lines:" >&2
    tail -n 20 "$RUN_DIR/server.log" >&2
    exit 1
  fi
  sleep 1
done
if ! curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
  echo "❌ Server never became healthy at $HEALTH_URL. Last log lines:" >&2
  tail -n 20 "$RUN_DIR/server.log" >&2
  exit 1
fi
echo "▶ Server healthy at $HEALTH_URL"

cat >"$RUN_DIR/config.json" <<EOF
{
  "baseURL": "http://127.0.0.1:$PORT",
  "webSocketURL": "ws://127.0.0.1:$PORT/ws",
  "runDirectory": "$RUN_DIR",
  "seed": $SEED,
  "startingLifepoints": $STARTING_LP,
  "timeoutSeconds": $TIMEOUT_SECONDS,
  "botStrategy": "bot-random",
  "headsUp": $HEADS_UP,
  "actionDelayMilliseconds": $ACTION_DELAY_MS,
  "finalHoldSeconds": $FINAL_HOLD_SECONDS
}
EOF

if [[ "$HEADS_UP" == true ]]; then
  echo "▶ Heads-up mode: the SwiftUI app will stay visible, pace actions every ${ACTION_DELAY_MS}ms, and hold game over for ${FINAL_HOLD_SECONDS}s"
fi
echo "▶ Running the native proof test (this launches the real SwiftUI app)"

XCODE_STATUS=0
(
  cd "$SWIFTUI_DIR"
  xcodebuild test \
    -project PhalanxDuelClient.xcodeproj \
    -scheme PhalanxDuelClientUIProof \
    -destination platform=macOS \
    -only-testing:PhalanxDuelClientUITests/AutomationTests/testCompleteBotMatch \
    -resultBundlePath "$RUN_DIR/proof.xcresult" \
    PHALANX_QA_CONFIG_FILE="$RUN_DIR/config.json"
) >"$RUN_DIR/xcodebuild.log" 2>&1 || XCODE_STATUS=$?

if [[ "$XCODE_STATUS" -ne 0 ]]; then
  echo "❌ xcodebuild test failed (exit $XCODE_STATUS). Log: $RUN_DIR/xcodebuild.log" >&2
  grep -E 'error:|Failing tests|Test Case .* failed' "$RUN_DIR/xcodebuild.log" | tail -n 20 >&2 || true
fi

VERIFY_STATUS=0
if [[ -d "$RUN_DIR/proof.xcresult" ]]; then
  echo "▶ Extracting retained evidence from proof.xcresult"
  mkdir -p "$RUN_DIR/exported"
  xcrun xcresulttool export attachments \
    --path "$RUN_DIR/proof.xcresult" \
    --output-path "$RUN_DIR/exported" >/dev/null || VERIFY_STATUS=$?
  if [[ "$VERIFY_STATUS" -eq 0 ]]; then
    (
      cd "$REPO_ROOT"
      env -u DATABASE_URL pnpm exec tsx bin/qa/verify-swiftui-proof.ts "$RUN_DIR"
    ) || VERIFY_STATUS=$?
  fi
else
  echo "❌ No xcresult bundle was produced; nothing to extract." >&2
  VERIFY_STATUS=1
fi

if [[ "$XCODE_STATUS" -ne 0 || "$VERIFY_STATUS" -ne 0 ]]; then
  echo "❌ Proof run failed. Diagnostics: $RUN_DIR (server.log, xcodebuild.log, native-debug.log, proof.xcresult)" >&2
  exit 1
fi

echo "▶ Full run artifacts: $RUN_DIR"
echo "▶ To watch the recording: open $RUN_DIR/proof.xcresult (Xcode retains the screen capture)"
