#!/bin/bash
set -e

# Phalanx Production Deployment Script
# This script orchestrates the full release process with version synchronization.

echo "🏁 Starting production deployment..."

# 1. Bump version and revision
bash bin/maint/sync-version.sh

# 2. Extract the NEW version for tagging
NEW_VER=$(grep '"version":' shared/package.json | head -n 1 | awk -F '"' '{print $4}')
echo "📦 Target version: v$NEW_VER"

# 3. Build documentation
pnpm docs:build
pnpm docs:dash

# 4. Load Environment Variables (for SENTRY_AUTH_TOKEN)
for env_file in .env ../.env; do
    if [ -f "$env_file" ]; then
        echo "env: Loading $env_file..."
        export $(grep -v '^#' "$env_file" | xargs)
        break
    fi
done

if [ -z "$SENTRY_AUTH_TOKEN" ]; then
    echo "❌ ERROR: SENTRY_AUTH_TOKEN is not set. Please set it in your environment or .env file."
    exit 1
fi

# 5. Git Commit
git add .
git commit -m "chore: deploy v$NEW_VER" || echo "⚠️ No changes to commit"

# 5. Git Tag
if git tag -l "v$NEW_VER" | grep -q "v$NEW_VER"; then
    echo "⚠️ Tag v$NEW_VER already exists locally. Deleting and recreating..."
    git tag -d "v$NEW_VER"
fi
git tag -a "v$NEW_VER" -m "Production release v$NEW_VER"

# 6. Push to origin
echo "🚀 Pushing code and tags to origin..."
git push origin main && git push origin --tags

# 7. Deploy to Fly.io
echo "🚀 Executing Fly.io deployment..."
fly deploy \
  --build-arg SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
  --build-arg VITE_SENTRY__CLIENT__SENTRY_DSN=$SENTRY__CLIENT__SENTRY_DSN \
  --env SENTRY_RELEASE="phalanxduel-server@$NEW_VER"

# 8. Sentry Releases
echo "🚀 Creating Sentry releases..."
bash scripts/release/track-sentry.sh "phalanxduel-server" "phalanxduel-server@$NEW_VER"
bash scripts/release/track-sentry.sh "phalanxduel-client" "phalanxduel-client@$NEW_VER"

echo "✅ Deployment successful: v$NEW_VER"
