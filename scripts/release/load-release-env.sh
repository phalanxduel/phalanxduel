#!/bin/bash

set -euo pipefail

load_release_env() {
  local script_dir repo_root parent_root
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  repo_root="$(cd "$script_dir/../.." && pwd)"
  parent_root="$(cd "$repo_root/.." && pwd)"

  local candidates=()
  if [ -n "${SENTRY_ENV_FILE:-}" ]; then
    candidates+=("$SENTRY_ENV_FILE")
  fi

  candidates+=(
    "$repo_root/.env.release.local"
    "$repo_root/.env.release"
    "$parent_root/.env.release.local"
    "$parent_root/.env.release"
    "$repo_root/.env"
    "$parent_root/.env"
  )

  local env_file
  for env_file in "${candidates[@]}"; do
    if [ -f "$env_file" ]; then
      echo "env: Loading $env_file..."
      set -a
      # shellcheck disable=SC1090
      . "$env_file"
      set +a
      export PHALANX_RELEASE_ENV_FILE="$env_file"
      return 0
    fi
  done

  return 1
}
