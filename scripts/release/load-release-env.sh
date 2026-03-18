#!/bin/bash

set -euo pipefail

# Phalanx Unified Environment Loader
# This script loads environment variables in the same hierarchy as the server.
#
# Usage:
#   APP_ENV=staging load_release_env
#

load_release_env() {
  local script_dir repo_root app_env
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  repo_root="$(cd "$script_dir/../.." && pwd)"
  
  # 1. Determine environment
  # If APP_ENV is explicitly set, use it.
  # Otherwise, if NODE_ENV is production, default to production.
  # Else, default to local.
  app_env="${APP_ENV:-}"
  if [ -z "$app_env" ]; then
    if [ "${NODE_ENV:-}" == "production" ]; then
      app_env="production"
    else
      app_env="local"
    fi
  fi

  echo "env: Loading for environment: $app_env"

  local candidates=()
  
  # Base .env (Defaults)
  candidates+=("$repo_root/.env")
  
  # Environment-specific (e.g. .env.staging, .env.production)
  if [ "$app_env" != "local" ]; then
    candidates+=("$repo_root/.env.${app_env}")
  fi
  
  # Local overrides
  candidates+=("$repo_root/.env.local")
  candidates+=("$repo_root/.env.${app_env}.local")

  # Explicit override if specified via ENV_FILE
  if [ -n "${ENV_FILE:-}" ]; then
    candidates=("$ENV_FILE")
  fi

  local env_loaded=0
  set -a
  for env_file in "${candidates[@]}"; do
    if [ -f "$env_file" ]; then
      echo "env: Loading $env_file..."
      # shellcheck disable=SC1090
      . "$env_file"
      env_loaded=1
    fi
  done
  set +a

  if [ "$env_loaded" -eq 1 ]; then
    return 0
  else
    return 1
  fi
}
