#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "Usage: $0 <command> [args...]"
  echo ""
  echo "Wraps a command with the appropriate Postgres database environment."
  echo "Uses the test database in CI environments, and the dev database otherwise."
  exit 0
fi

if [ "${CI:-}" = "true" ] || [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  exec bash "$SCRIPT_DIR/with-test-postgres.sh" "$@"
fi

exec bash "$SCRIPT_DIR/with-dev-postgres.sh" "$@"
