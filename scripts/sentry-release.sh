#!/bin/bash
set -e

# Sentry Release Script
# Usage: ./scripts/sentry-release.sh <project_name> <version_string>

PROJECT=$1
VERSION=$2

if [ -z "$PROJECT" ] || [ -z "$VERSION" ]; then
  echo "❌ ERROR: Usage: ./scripts/sentry-release.sh <project_name> <version_string>"
  exit 1
fi

# Configuration
# Default to mike-hall as identified from the current auth token
export SENTRY_ORG=${SENTRY_ORG:-"mike-hall"}
export SENTRY_PROJECT=$PROJECT

# Ensure SENTRY_AUTH_TOKEN is available
if [ -z "$SENTRY_AUTH_TOKEN" ]; then
    ENV_PATH="/Users/mike/github.com/phalanxduel/.env"
    if [ -f "$ENV_PATH" ]; then
        # Use a more robust way to load the token, stripping quotes if present
        export SENTRY_AUTH_TOKEN=$(grep SENTRY_AUTH_TOKEN "$ENV_PATH" | cut -d '"' -f2 | cut -d "'" -f2 | cut -d '=' -f2)
    fi
fi

if [ -z "$SENTRY_AUTH_TOKEN" ]; then
    echo "❌ ERROR: SENTRY_AUTH_TOKEN is not set."
    exit 1
fi

echo "🚀 Creating Sentry release: $VERSION for project: $SENTRY_PROJECT in org: $SENTRY_ORG"

# Workflow to create releases (Sentry Setup Step 3.2 & 4)
sentry-cli releases new "$VERSION"
sentry-cli releases set-commits "$VERSION" --auto --ignore-missing
sentry-cli releases finalize "$VERSION"

# Notify Sentry of deployment
echo "🚀 Notifying Sentry of production deployment..."
sentry-cli releases deploys "$VERSION" new -e production

echo "✅ Sentry release $VERSION finalized and deployment recorded."
