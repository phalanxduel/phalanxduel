#!/bin/bash
# UserPromptSubmit hook: injects active task context into every session start.
# Keeps Claude oriented without requiring the user to re-state context.
set -euo pipefail

PROJECT_ROOT="/Users/mike/github.com/phalanxduel/game"

# Only inject on first message of session (check for no prior assistant turns)
INPUT=$(cat)
# If not a UserPromptSubmit event, pass through
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty')
if [[ "$HOOK_EVENT" != "UserPromptSubmit" ]]; then
  exit 0
fi

# Read current priority from AGENTS.md
PRIORITY_LINE=$(grep -A3 "## Current Priority" "$PROJECT_ROOT/AGENTS.md" 2>/dev/null | tail -3 || echo "")

# Get in-progress tasks
IN_PROGRESS=$(cd "$PROJECT_ROOT" && backlog task list --plain --filter status=in-progress 2>/dev/null | head -5 || echo "none")

# Emit context injection as a system note
if [[ -n "$PRIORITY_LINE" ]]; then
  jq -n \
    --arg priority "$PRIORITY_LINE" \
    --arg in_progress "$IN_PROGRESS" \
    '{
      "hookSpecificOutput": {
        "additionalContext": ("Active priority:\n" + $priority + "\n\nIn-progress tasks:\n" + $in_progress)
      }
    }'
fi

exit 0
