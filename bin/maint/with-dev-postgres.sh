#!/usr/bin/env bash
set -euo pipefail

DEFAULT_DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/phalanxduel}" # secretlint-disable-line
ORIGINAL_DATABASE_URL="${DATABASE_URL:-}"
POSTGRES_CONTAINER="${PHALANX_DEV_POSTGRES_CONTAINER:-phalanx-postgres}"
WAIT_SECONDS="${PHALANX_DEV_POSTGRES_WAIT_SECONDS:-30}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <command> [args...]" >&2
  exit 64
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required for local dev Postgres bootstrapping" >&2
  exit 1
fi

ensure_postgres() {
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
