#!/bin/bash
# Stop hook: logs session summary for audit trail.
set -euo pipefail

LOG_DIR="/Users/mike/github.com/phalanxduel/game/.claude/logs"
mkdir -p "$LOG_DIR"

INPUT=$(cat)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LOG_FILE="$LOG_DIR/session-$(date -u +"%Y-%m-%d").log"

echo "[$TIMESTAMP] Session ended" >> "$LOG_FILE"

exit 0
