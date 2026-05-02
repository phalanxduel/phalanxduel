#!/bin/bash
# PreToolUse hook: block high-blast-radius Fly.io write operations.
# Deny list in settings.local.json covers `fly secrets set/import`; this
# hook adds belt-and-suspenders for production-state mutations that the
# deny list cannot express precisely.
set -euo pipefail

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only inspect Bash calls
if [[ "$TOOL" != "Bash" ]]; then
  exit 0
fi

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Block writes to production Fly.io state
if echo "$COMMAND" | grep -qE 'fly (secrets (set|import|unset)|scale [^-]|autoscale|certs add|volumes (create|destroy|extend))'; then
  jq -n --arg cmd "$COMMAND" \
    '{"decision": "block", "reason": ("Blocked: writes to production Fly.io state require explicit user confirmation. Command: " + $cmd)}'
  exit 2
fi

exit 0
