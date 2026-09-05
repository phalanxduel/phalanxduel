#!/bin/bash

set -euo pipefail

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "Usage: source scripts/release/load-release-env.sh"
  echo ""
  echo "Loads unified environment variables for Phalanx deployments."
  exit 0
fi

# Phalanx Unified Environment Loader
# This script loads environment variables in the same hierarchy as the server.
#
# Usage:
#   APP_ENV=staging load_release_env
#

load_env_file() {
  local env_file override_existing key_prefix line key value
  env_file="$1"
  override_existing="$2"
  key_prefix="${3:-}"

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|'#'*)
        continue
        ;;
    esac

    if [[ "$line" != *=* ]]; then
      continue
    fi

    key="${line%%=*}"
    value="${line#*=}"

    key="$(printf '%s' "$key" | xargs)"

    if [ -n "$key_prefix" ] && [[ "$key" != "$key_prefix"* ]]; then
      continue
    fi

    if [ "${value#\"}" != "$value" ] && [ "${value%\"}" != "$value" ]; then
      value="${value#\"}"
      value="${value%\"}"
    elif [ "${value#\'}" != "$value" ] && [ "${value%\'}" != "$value" ]; then
      value="${value#\'}"
      value="${value%\'}"
    fi

    if [ "$override_existing" == "1" ] || [ -z "${!key+x}" ]; then
      export "$key=$value"
    fi
  done <"$env_file"
}

load_local_vite_env() {
  local script_dir repo_root secrets_file
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  repo_root="$(cd "$script_dir/../.." && pwd)"
  secrets_file="$repo_root/.env.secrets.local"

  if [ -f "$secrets_file" ]; then
    load_env_file "$secrets_file" 1 "VITE_"
  fi
}

load_local_demo_env() {
  local script_dir repo_root env_file defaults_file
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  repo_root="$(cd "$script_dir/../.." && pwd)"
  defaults_file="$repo_root/.env"
  env_file="$repo_root/.env.local"

  # Keep the same precedence as load_release_env: shared root defaults first,
  # then local presentation overrides. Only demo URL/settings are imported.
  if [ -f "$defaults_file" ]; then
    load_env_file "$defaults_file" 0 "PHALANX_DEMO_"
  fi
  if [ -f "$env_file" ]; then
    load_env_file "$env_file" 1 "PHALANX_DEMO_"
  fi
}

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
  
  # Local overrides are only safe for local runs unless explicitly allowed.
  if [ "$app_env" == "local" ] || [ "${ALLOW_LOCAL_ENV_OVERRIDES:-0}" == "1" ]; then
    candidates+=("$repo_root/.env.local")
    candidates+=("$repo_root/.env.${app_env}.local")
  fi

  # Explicit override if specified via ENV_FILE
  if [ -n "${ENV_FILE:-}" ]; then
    candidates=("$ENV_FILE")
  fi

  local env_loaded=0
  set -a
  for env_file in "${candidates[@]}"; do
    if [ -f "$env_file" ]; then
      echo "env: Loading $env_file..."
      load_env_file "$env_file" 1
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
