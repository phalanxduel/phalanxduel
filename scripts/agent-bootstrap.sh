#!/usr/bin/env bash
# Bootstrap a local agent account and export AGENT_TOKEN.
#
# Usage:
#   source scripts/agent-bootstrap.sh
#   source scripts/agent-bootstrap.sh --email agent@phalanxduel.local --password mypass
#
# The script registers the account if it does not exist yet, then logs in and
# exports AGENT_TOKEN into the current shell. Must be sourced (not executed) so
# the export survives into the caller's environment.
#
# Requires: curl, jq, local game server running at SERVER_URL (default: http://127.0.0.1:3001)

set -euo pipefail

SERVER_URL="${GAME_SERVER_URL:-http://127.0.0.1:3001}"
EMAIL="agent@phalanxduel.local"
PASSWORD=""
GAMERTAG="AgentOne"

# Parse named arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --email)    EMAIL="$2";    shift 2 ;;
    --password) PASSWORD="$2"; shift 2 ;;
    --gamertag) GAMERTAG="$2"; shift 2 ;;
    --server)   SERVER_URL="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$PASSWORD" ]]; then
  echo "Usage: source scripts/agent-bootstrap.sh --password <pass> [--email <e>] [--gamertag <g>]" >&2
  return 1 2>/dev/null || exit 1
fi

echo "→ Checking game server at $SERVER_URL ..."
if ! curl -sf "$SERVER_URL/health" >/dev/null 2>&1; then
  echo "✗ Game server not reachable at $SERVER_URL — run 'pnpm dev' first" >&2
  return 1 2>/dev/null || exit 1
fi

echo "→ Registering agent account ($EMAIL) ..."
REG=$(curl -s -X POST "$SERVER_URL/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"gamertag\":\"$GAMERTAG\"}" 2>&1)

# Registration may return 409 if account already exists — that is fine
if echo "$REG" | jq -e '.error' >/dev/null 2>&1; then
  CODE=$(echo "$REG" | jq -r '.code // ""')
  if [[ "$CODE" != "EMAIL_ALREADY_REGISTERED" ]]; then
    echo "✗ Registration failed: $(echo "$REG" | jq -r '.error')" >&2
    return 1 2>/dev/null || exit 1
  fi
  echo "  (account already exists, continuing to login)"
fi

echo "→ Logging in ..."
LOGIN=$(curl -s -X POST "$SERVER_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN" | jq -r '.token // empty')
if [[ -z "$TOKEN" ]]; then
  echo "✗ Login failed: $(echo "$LOGIN" | jq -r '.error // .message // "unknown error"')" >&2
  return 1 2>/dev/null || exit 1
fi

export AGENT_TOKEN="$TOKEN"
echo "✓ AGENT_TOKEN exported (${TOKEN:0:20}...)"
echo ""
echo "  Start Claude Code to begin an agentic game:"
echo "    claude"
echo ""
echo "  Or verify the MCP tools are live:"
echo "    TOOL_PROFILE=admin GAME_SERVER_URL=$SERVER_URL AGENT_TOKEN=\$AGENT_TOKEN \\"
echo "    node --import tsx/esm mcp/src/server.ts"
