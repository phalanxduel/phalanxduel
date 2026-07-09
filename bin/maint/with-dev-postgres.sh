#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=bin/maint/postgres-bootstrap.sh
. "$(dirname "${BASH_SOURCE[0]}")/postgres-bootstrap.sh"

# Check if host Postgres is already running on standard port
if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  HOST_POSTGRES=true
  # Always use phalanxduel_development on the local machine regardless of any
  # ambient DATABASE_URL that may be set in the shell profile.
  DEFAULT_DATABASE_URL="postgresql://phalanx_dev:phx_dev_local@localhost:5432/phalanxduel_development" # secretlint-disable-line
else
  HOST_POSTGRES=false
  # In Docker/CI the container sets DATABASE_URL explicitly — trust it.
  DEFAULT_DATABASE_URL="${DATABASE_URL:-postgresql://phalanx_dev:phx_dev_local@127.0.0.1:5432/phalanxduel_development}" # secretlint-disable-line
fi

ORIGINAL_DATABASE_URL="${DATABASE_URL:-}"
WAIT_SECONDS="${PHALANX_DEV_POSTGRES_WAIT_SECONDS:-30}"

# Hard stop: refuse to run against any database other than phalanxduel_development.
# Extracts the database name from the URL (last path segment, before any ?query).
_assert_dev_db() {
  local url="$1"
  local no_query db_name
  no_query="${url%%[?#]*}"
  db_name="${no_query##*/}"
  if [ "$db_name" != "phalanxduel_development" ]; then
    echo "❌ SAFETY GUARD: with-dev-postgres.sh resolved to database '${db_name}'" >&2
    echo "   Expected: phalanxduel_development" >&2
    echo "   URL: ${url}" >&2
    echo "   Dev commands must only run against phalanxduel_development." >&2
    exit 1
  fi
}

_assert_dev_db "$DEFAULT_DATABASE_URL"

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "Usage: $0 <command> [args...]"
  echo ""
  echo "Wraps a command with the development database environment."
  echo "Ensures postgres is running, migrations are applied, and test/dev seeds are present."
  exit 0
fi

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <command> [args...]" >&2
  exit 64
fi

ensure_postgres() {
  if [ -n "$ORIGINAL_DATABASE_URL" ]; then
    return 0
  fi

  if [ "$HOST_POSTGRES" = "true" ]; then
    return 0
  fi

  ensure_local_postgres_server
  wait_for_postgres "$WAIT_SECONDS"
  ensure_project_database phalanxduel_development phalanx_dev phx_dev_local
}

ensure_migrations() {
  (
    cd "$REPO_ROOT"
    DATABASE_URL="$DEFAULT_DATABASE_URL" pnpm --filter @phalanxduel/server db:migrate >/dev/null
  )
}

ensure_dev_admin_seed() {
  if [ -n "$ORIGINAL_DATABASE_URL" ]; then
    return 0
  fi

  (
    cd "$REPO_ROOT"
    DATABASE_URL="$DEFAULT_DATABASE_URL" pnpm admin:seed-dev:raw >/dev/null
  )
}

ensure_postgres
ensure_migrations
ensure_dev_admin_seed
export DATABASE_URL="$DEFAULT_DATABASE_URL"
exec "$@"
