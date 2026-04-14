#!/bin/bash
# Check if the Phalanx server is running on the specified port.
# Returns 0 if running, 1 with a helpful error if not.

PORT=${1:-${PHALANX_API_PORT:-3001}}
HOST=${2:-${PHALANX_API_HOST:-127.0.0.1}}
HEALTH_URL=${3:-${PHALANX_API_HEALTH_URL:-http://$HOST:$PORT/health}}

if command -v curl >/dev/null 2>&1; then
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    exit 0
  fi
fi

if command -v lsof >/dev/null 2>&1; then
  if lsof -i :"$PORT" >/dev/null 2>&1; then
    exit 0
  fi
fi

echo "❌ Phalanx server is not running on $HOST:$PORT."
echo "👉 Expected health endpoint: $HEALTH_URL"
echo "👉 Please start it in another terminal with: pnpm dev:server"
exit 1
