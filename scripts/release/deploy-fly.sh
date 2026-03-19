#!/bin/bash
set -e

# Phalanx Multi-Environment Deployment Script
# This script orchestrates the release process for staging or production.
# Usage:
#   APP_ENV=staging bash scripts/release/deploy-fly.sh
#   APP_ENV=production bash scripts/release/deploy-fly.sh

# 1. Determine environment
APP_ENV="${APP_ENV:-staging}"
FLY_CONFIG="fly.staging.toml"
if [ "$APP_ENV" == "production" ]; then
    FLY_CONFIG="fly.production.toml"
fi

echo "🏁 Starting $APP_ENV deployment using $FLY_CONFIG..."

# 2. Bump version and revision (if production)
if [ "$APP_ENV" == "production" ]; then
    bash bin/maint/sync-version.sh
fi

# 3. Extract the version
NEW_VER=$(grep '"version":' shared/package.json | head -n 1 | awk -F '"' '{print $4}')
echo "📦 Version: v$NEW_VER"

# 4. Build documentation
pnpm docs:build
pnpm docs:dash

# 5. Load environment variables
. "$(dirname "$0")/load-release-env.sh"
load_release_env || true

if [ -z "$SENTRY_AUTH_TOKEN" ]; then
    echo "❌ ERROR: SENTRY_AUTH_TOKEN is not set. Set it in your environment or .env.release.local."
    exit 1
fi

if [ -z "$VITE_SENTRY_DSN" ]; then
    echo "❌ ERROR: VITE_SENTRY_DSN is not set. Set it in your environment or .env.release.local."
    exit 1
fi

# 6. Git Commit (only if production or explicitly requested)
if [ "$APP_ENV" == "production" ]; then
    git add .
    git commit -m "chore: deploy v$NEW_VER to production" || echo "⚠️ No changes to commit"

    if git tag -l "v$NEW_VER" | grep -q "v$NEW_VER"; then
        echo "⚠️ Tag v$NEW_VER already exists locally. Deleting and recreating..."
        git tag -d "v$NEW_VER"
    fi
    git tag -a "v$NEW_VER" -m "Production release v$NEW_VER"
    
    echo "🚀 Pushing code and tags to origin..."
    git push origin main && git push origin --tags
fi

# 7. Deploy to Fly.io
echo "🚀 Executing Fly.io deployment for $APP_ENV..."
fly deploy \
  --config "$FLY_CONFIG" \
  --build-secret SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
  --build-arg VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
  --env SENTRY_RELEASE="phalanxduel-server@$NEW_VER" \
  --env NODE_ENV=production \
  --env APP_ENV=$APP_ENV

# 8. Sentry Releases
echo "🚀 Creating Sentry releases for $APP_ENV..."
bash scripts/release/track-sentry.sh "phalanxduel-server" "phalanxduel-server@$NEW_VER"
bash scripts/release/track-sentry.sh "phalanxduel-client" "phalanxduel-client@$NEW_VER"

echo "✅ Deployment successful: $APP_ENV v$NEW_VER"
