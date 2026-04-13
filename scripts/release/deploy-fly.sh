#!/usr/bin/env bash
set -euo pipefail

# Phalanx Multi-Environment Deployment Script
# Usage:
#   APP_ENV=staging bash scripts/release/deploy-fly.sh
#   APP_ENV=production bash scripts/release/deploy-fly.sh

APP_ENV="${APP_ENV:-staging}"
FLY_CONFIG="fly.staging.toml"
if [ "$APP_ENV" == "production" ]; then
    FLY_CONFIG="fly.production.toml"
fi

echo "🏁 Starting $APP_ENV deployment using $FLY_CONFIG..."

# Load correct environment variables
# Fail-closed: we no longer use `load_release_env || true`. If loading fails, abort.
# shellcheck source=scripts/release/load-release-env.sh
. "$(dirname "$0")/load-release-env.sh"
load_release_env

echo "🚀 Executing Fly.io deployment for $APP_ENV..."
fly deploy --config "$FLY_CONFIG"

echo "✅ Deployment successful: $APP_ENV"
