#!/bin/bash
set -e

# Sentry Release Script
# Usage: ./scripts/sentry-release.sh <project_name> <version_string>

PROJECT=$1
VERSION=$2
ENV=${3:-"production"}

if [ -z "$PROJECT" ] || [ -z "$VERSION" ]; then
  echo "❌ ERROR: Usage: ./scripts/sentry-release.sh <project_name> <version_string> [environment]"
  exit 1
fi

# Configuration
# Default to mike-hall as identified from the current auth token
export SENTRY_ORG=${SENTRY_ORG:-"mike-hall"}
export SENTRY_PROJECT=$PROJECT

# Ensure SENTRY_AUTH_TOKEN is available
if [ -z "$SENTRY_AUTH_TOKEN" ]; then
    . "$(dirname "$0")/load-release-env.sh"
    load_release_env || true
fi

if [ -z "$SENTRY_AUTH_TOKEN" ]; then
    echo "❌ ERROR: SENTRY_AUTH_TOKEN is not set. Set it in your environment or .env.release.local."
    exit 1
fi

echo "🚀 Creating Sentry release: $VERSION for project: $SENTRY_PROJECT in org: $SENTRY_ORG (Env: $ENV)"

# Workflow to create releases (Sentry Setup Step 3.2 & 4)
sentry-cli releases new "$VERSION"
sentry-cli releases set-commits "$VERSION" --auto --ignore-missing
sentry-cli releases finalize "$VERSION"

# Notify Sentry of deployment
echo "🚀 Notifying Sentry of $ENV deployment..."
sentry-cli releases deploys "$VERSION" new -e "$ENV"

echo "✅ Sentry release $VERSION finalized and deployment recorded."
