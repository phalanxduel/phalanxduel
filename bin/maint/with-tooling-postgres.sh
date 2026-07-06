#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${CI:-}" = "true" ] || [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  exec bash "$SCRIPT_DIR/with-test-postgres.sh" "$@"
fi

exec bash "$SCRIPT_DIR/with-dev-postgres.sh" "$@"
