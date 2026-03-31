#!/bin/bash
# Check if the Phalanx server is running on the specified port.
# Returns 0 if running, 1 with a helpful error if not.

PORT=${1:-3001}
HOST=${2:-127.0.0.1}

if ! lsof -i :$PORT > /dev/null; then
  echo "❌ Phalanx server is not running on $HOST:$PORT."
  echo "👉 Please start it in another terminal with: pnpm dev:server"
  exit 1
fi

exit 0
