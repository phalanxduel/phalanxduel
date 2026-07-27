#!/bin/bash

set -euo pipefail

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "Usage: scripts/release/generate-notes.sh <prev-ref-or-empty> <new-ref> [path-prefix]"
  echo ""
  echo "Generates release notes markdown from conventional-commit messages between"
  echo "two git refs, optionally scoped to commits touching a given path prefix."
  echo "Leave <prev-ref-or-empty> as an empty string to include all history up to <new-ref>."
  echo ""
  echo "Output is written to stdout."
  exit 0
fi

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "Usage: scripts/release/generate-notes.sh <prev-ref-or-empty> <new-ref> [path-prefix]" >&2
  exit 1
fi

PREV_REF="$1"
NEW_REF="$2"
PATH_PREFIX="${3:-}"

RANGE="$NEW_REF"
if [ -n "$PREV_REF" ]; then
  RANGE="$PREV_REF..$NEW_REF"
fi

LOG_ARGS=(log "$RANGE" --no-merges --pretty=format:'%s')
if [ -n "$PATH_PREFIX" ]; then
  LOG_ARGS+=(-- "$PATH_PREFIX")
fi

ADDED=()
FIXED=()
CHANGED=()

while IFS= read -r subject || [ -n "$subject" ]; do
  [ -z "$subject" ] && continue
  case "$subject" in
    feat*)
      ADDED+=("$subject")
      ;;
    fix*)
      FIXED+=("$subject")
      ;;
    *)
      CHANGED+=("$subject")
      ;;
  esac
done < <(git "${LOG_ARGS[@]}")

# Strips a leading "type(scope): " or "type: " conventional-commit prefix.
strip_prefix() {
  echo "$1" | sed -E 's/^[a-z]+(\([^)]*\))?!?: //'
}

print_section() {
  local heading="$1"
  shift
  local entries=("$@")
  [ "${#entries[@]}" -eq 0 ] && return 0
  echo "### $heading"
  echo ""
  for entry in "${entries[@]}"; do
    echo "- $(strip_prefix "$entry")"
  done
  echo ""
}

print_section "Added" "${ADDED[@]}"
print_section "Fixed" "${FIXED[@]}"
print_section "Changed" "${CHANGED[@]}"

if [ "${#ADDED[@]}" -eq 0 ] && [ "${#FIXED[@]}" -eq 0 ] && [ "${#CHANGED[@]}" -eq 0 ]; then
  echo "_No changes found in range $RANGE${PATH_PREFIX:+ under $PATH_PREFIX}._"
fi
