#!/bin/bash
# PostToolUse hook: runs ESLint --fix + Prettier on files touched by Edit/Write.
# Catches syntax errors and formatting drift immediately, not at commit time.
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Skip if no file path (shouldn't happen, but be safe)
if [[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Only lint source files this project cares about
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *.json)
    # Prettier only for JSON (no ESLint)
    npx prettier --write "$FILE_PATH" 2>/dev/null || true
    exit 0
    ;;
  *.md)
    # markdownlint for Markdown (MD040 code fence lang tags, etc.)
    npx markdownlint-cli2 "$FILE_PATH" 2>/dev/null || true
    exit 0
    ;;
  *)
    exit 0
    ;;
esac

# Resolve project root (find nearest package.json with workspaces or eslint config)
PROJECT_ROOT="$(cd "$(dirname "$FILE_PATH")" && git rev-parse --show-toplevel 2>/dev/null || echo "")"
if [[ -z "$PROJECT_ROOT" ]]; then
  exit 0
fi

ERRORS=""

# ESLint --fix: auto-fix what it can, capture remaining errors
ESLINT_OUT=$(cd "$PROJECT_ROOT" && npx eslint --fix "$FILE_PATH" 2>&1) || ERRORS="$ESLINT_OUT"

# Prettier --write: format in place
npx prettier --write "$FILE_PATH" 2>/dev/null || true

# If ESLint had unfixable errors, report them back to Claude
if [[ -n "$ERRORS" ]]; then
  # Output structured JSON so Claude sees the lint errors
  jq -n --arg reason "$ERRORS" '{
    "decision": "block",
    "reason": $reason
  }'
  exit 2
fi

exit 0
