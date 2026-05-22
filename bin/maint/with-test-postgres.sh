#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

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
POSTGRES_CONTAINER="${PHALANX_DEV_POSTGRES_CONTAINER:-phalanx-postgres}"
WAIT_SECONDS="${PHALANX_DEV_POSTGRES_WAIT_SECONDS:-30}"

# Hard stop: refuse to run against any database other than phalanxduel_test.
# Extracts the database name from the URL (last path segment, before any ?query).
_assert_test_db() {
  local url="$1"
  local no_query db_name
  no_query="${url%%[?#]*}"
  db_name="${no_query##*/}"
  if [ "$db_name" != "phalanxduel_test" ]; then
    echo "❌ SAFETY GUARD: with-test-postgres.sh resolved to database '${db_name}'" >&2
    echo "   Expected: phalanxduel_test" >&2
    echo "   URL: ${url}" >&2
    echo "   Test commands must only run against phalanxduel_test." >&2
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

  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is required for local test Postgres bootstrapping" >&2
    exit 1
  fi

  if docker inspect "$POSTGRES_CONTAINER" >/dev/null 2>&1; then
    local status
    status="$(docker inspect -f '{{.State.Status}}' "$POSTGRES_CONTAINER" 2>/dev/null || true)"
    if [ "$status" != "running" ]; then
      docker compose up -d postgres >/dev/null
    fi
  else
    docker compose up -d postgres >/dev/null
  fi

  local elapsed=0
  while [ "$elapsed" -lt "$WAIT_SECONDS" ]; do
    if docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo "postgres did not become ready within ${WAIT_SECONDS}s" >&2
  exit 1
}

ensure_test_db() {
  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    psql "postgresql://localhost:5432/postgres" -c "
      DO \$\$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'phalanx_test') THEN
          CREATE USER phalanx_test WITH LOGIN PASSWORD 'phx_test_local';
        END IF;
      END
      \$\$;
    " 2>/dev/null || true
    psql "postgresql://localhost:5432/postgres" -c "CREATE DATABASE phalanxduel_test;" 2>/dev/null || true
    psql "postgresql://localhost:5432/phalanxduel_test" -c "
      CREATE EXTENSION IF NOT EXISTS vector;
      CREATE SCHEMA IF NOT EXISTS public;
      ALTER SCHEMA public OWNER TO phalanx_test;
      GRANT CONNECT ON DATABASE phalanxduel_test TO phalanx_test;
      GRANT CREATE ON DATABASE phalanxduel_test TO phalanx_test;
      GRANT CREATE, USAGE ON SCHEMA public TO phalanx_test;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO phalanx_test;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO phalanx_test;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO phalanx_test;
      GRANT TEMP ON DATABASE phalanxduel_test TO phalanx_test;
    " 2>/dev/null || true
  fi
}

ensure_migrations() {
  (
    cd "$REPO_ROOT"
    DATABASE_URL="$DEFAULT_DATABASE_URL" pnpm --filter @phalanxduel/server db:migrate >/dev/null
  )
}

ensure_postgres
ensure_test_db
ensure_migrations
export DATABASE_URL="$DEFAULT_DATABASE_URL"
exec "$@"
