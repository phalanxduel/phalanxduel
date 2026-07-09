#!/usr/bin/env bash
# Note for Agents: This file intentionally omits `set -e` and `set -euo pipefail` 
# because it primarily exports functions meant to be sourced by other scripts 
# (like with-dev-postgres.sh), preventing premature exits in the parent shell.

ensure_docker_host() {
  if [ -n "${DOCKER_HOST:-}" ]; then
    return 0
  fi

  local colima_socket="${HOME}/.colima/default/docker.sock"
  if [ -S "$colima_socket" ]; then
    export DOCKER_HOST="unix://${colima_socket}"
  fi
}

ensure_local_postgres_server() {
  local container_name="${PHALANX_DEV_POSTGRES_CONTAINER:-phalanx-postgres}"
  local image="${PHALANX_POSTGRES_IMAGE:-pgvector/pgvector:pg17}"
  local volume="${PHALANX_POSTGRES_VOLUME:-phalanx-postgres-data}"

  ensure_docker_host

  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    return 0
  fi

  if ! command -v docker >/dev/null 2>&1 || ! command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose is required for local Postgres bootstrapping" >&2
    exit 1
  fi

  if docker inspect "$container_name" >/dev/null 2>&1; then
    local status
    status="$(docker inspect -f '{{.State.Status}}' "$container_name" 2>/dev/null || true)"
    if [ "$status" != "running" ]; then
      docker start "$container_name" >/dev/null
    fi
    return 0
  fi

  local compose_dir compose_file
  local temp_dir="${PHALANX_POSTGRES_TMPDIR:-/private/tmp}"
  compose_dir="$(mktemp -d "${temp_dir}/phalanx-postgres.XXXXXX")"
  compose_file="${compose_dir}/docker-compose.yml"
  cat >"$compose_file" <<YAML
services:
  postgres:
    image: ${image}
    container_name: ${container_name}
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    ports:
      - '5432:5432'
    volumes:
      - ${volume}:/var/lib/postgresql/data
volumes:
  ${volume}:
YAML

  docker-compose -f "$compose_file" up -d postgres >/dev/null
  rm -rf "$compose_dir"
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
