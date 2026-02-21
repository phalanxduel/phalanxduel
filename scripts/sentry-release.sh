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
export SENTRY_ORG=${SENTRY_ORG:-"phalanxduel"}
export SENTRY_PROJECT=$PROJECT

# Ensure SENTRY_AUTH_TOKEN is available
if [ -z "$SENTRY_AUTH_TOKEN" ] && [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$SENTRY_AUTH_TOKEN" ]; then
    echo "❌ ERROR: SENTRY_AUTH_TOKEN is not set."
    exit 1
fi

echo "🚀 Creating Sentry release: $VERSION for project: $SENTRY_PROJECT"

# Workflow to create releases
sentry-cli releases new "$VERSION"
sentry-cli releases set-commits "$VERSION" --auto
sentry-cli releases finalize "$VERSION"

echo "✅ Sentry release $VERSION finalized."
