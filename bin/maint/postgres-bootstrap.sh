#!/usr/bin/env bash
# Note for Agents: This file intentionally omits `set -e` and `set -euo pipefail` 
# because it primarily exports functions meant to be sourced by other scripts 
# (like with-dev-postgres.sh), preventing premature exits in the parent shell.

ensure_local_postgres_server() {

  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    return 0
  fi

  echo "Postgres is not ready on localhost:5432." >&2
  echo "Start the host-native Postgres service, then rerun this command." >&2
  echo "Local development does not start Docker or Colima automatically." >&2
  exit 1
}

wait_for_postgres() {
  local wait_seconds="${1:-30}"
  local elapsed=0

  while [ "$elapsed" -lt "$wait_seconds" ]; do
    if pg_isready -h localhost -p 5432 -U postgres >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo "postgres did not become ready within ${wait_seconds}s" >&2
  exit 1
}

ensure_project_database() {
  local db_name="$1"
  local role_name="$2"
  local role_password="$3"

  psql "postgresql://postgres:postgres@localhost:5432/postgres" -c "
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${role_name}') THEN
        CREATE USER ${role_name} WITH LOGIN PASSWORD '${role_password}';
      END IF;
    END
    \$\$;
  " 2>/dev/null || true

  psql "postgresql://postgres:postgres@localhost:5432/postgres" -c "CREATE DATABASE ${db_name};" 2>/dev/null || true
  psql "postgresql://postgres:postgres@localhost:5432/${db_name}" -c "
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE SCHEMA IF NOT EXISTS public;
    ALTER SCHEMA public OWNER TO ${role_name};
    GRANT CONNECT ON DATABASE ${db_name} TO ${role_name};
    GRANT CREATE ON DATABASE ${db_name} TO ${role_name};
    GRANT CREATE, USAGE ON SCHEMA public TO ${role_name};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO ${role_name};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${role_name};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${role_name};
    GRANT TEMP ON DATABASE ${db_name} TO ${role_name};
  " 2>/dev/null || true
}
