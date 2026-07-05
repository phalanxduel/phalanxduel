#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=bin/maint/postgres-bootstrap.sh
. "$(dirname "${BASH_SOURCE[0]}")/postgres-bootstrap.sh"

# Check if host Postgres is already running on standard port
if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  HOST_POSTGRES=true
  # Always use phalanxduel_test on the local machine regardless of any
  # ambient DATABASE_URL that may be set in the shell profile.
  DEFAULT_DATABASE_URL="postgresql://phalanx_test:phx_test_local@localhost:5432/phalanxduel_test" # secretlint-disable-line
else
  HOST_POSTGRES=false
  # In Docker/CI the container sets DATABASE_URL explicitly — trust it.
  DEFAULT_DATABASE_URL="${DATABASE_URL:-postgresql://phalanx_test:phx_test_local@127.0.0.1:5432/phalanxduel_test}" # secretlint-disable-line
fi

ORIGINAL_DATABASE_URL="${DATABASE_URL:-}"
WAIT_SECONDS="${PHALANX_DEV_POSTGRES_WAIT_SECONDS:-30}"

# Hard stop: refuse to run against any database other than a local/container
# phalanxduel_test database. This wrapper drops public tables before migrations.
_database_name_from_url() {
  local url="$1"
  local no_query
  no_query="${url%%[?#]*}"
  printf '%s\n' "${no_query##*/}"
}

_database_host_from_url() {
  local url="$1"
  local authority host_port host

  case "$url" in
    *://*)
      authority="${url#*://}"
      authority="${authority%%/*}"
      ;;
    *)
      printf '%s\n' ""
      return 0
      ;;
  esac

  # postgresql:///db has an empty authority and therefore no explicit host.
  if [ -z "$authority" ]; then
    printf '%s\n' ""
    return 0
  fi

  host_port="${authority##*@}"
  case "$host_port" in
    \[*\]*)
      host="${host_port%%]*}"
      host="${host#\[}"
      ;;
    *)
      host="${host_port%%:*}"
      ;;
  esac

  printf '%s\n' "$host"
}

_is_allowed_test_host() {
  case "$1" in
    localhost | 127.0.0.1 | ::1 | host.docker.internal | postgres)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

_assert_test_db() {
  local url="$1"
  local db_name db_host
  db_name="$(_database_name_from_url "$url")"
  if [ "$db_name" != "phalanxduel_test" ]; then
    echo "❌ SAFETY GUARD: with-test-postgres.sh resolved to database '${db_name}'" >&2
    echo "   Expected: phalanxduel_test" >&2
    echo "   URL: ${url}" >&2
    echo "   Test commands must only run against phalanxduel_test." >&2
    exit 1
  fi

  db_host="$(_database_host_from_url "$url")"
  if ! _is_allowed_test_host "$db_host"; then
    echo "❌ SAFETY GUARD: with-test-postgres.sh resolved to non-local host '${db_host:-<socket>}'" >&2
    echo "   Allowed hosts: localhost, 127.0.0.1, ::1, host.docker.internal, postgres" >&2
    echo "   URL: ${url}" >&2
    echo "   Refusing because this wrapper drops and recreates test tables." >&2
    exit 1
  fi
}

_assert_test_db "$DEFAULT_DATABASE_URL"

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
  ensure_project_database phalanxduel_test phalanx_test phx_test_local
}

ensure_test_db() {
  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    ensure_project_database phalanxduel_test phalanx_test phx_test_local
  fi
}

reset_test_tables() {
  DATABASE_URL="$DEFAULT_DATABASE_URL" psql "$DEFAULT_DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$
SQL
}

ensure_migrations() {
  (
    cd "$REPO_ROOT"
    DATABASE_URL="$DEFAULT_DATABASE_URL" pnpm --filter @phalanxduel/server db:migrate >/dev/null
  )
}

ensure_postgres
ensure_test_db
reset_test_tables
ensure_migrations
export DATABASE_URL="$DEFAULT_DATABASE_URL"
exec "$@"
