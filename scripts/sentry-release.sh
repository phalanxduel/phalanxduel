#!/bin/bash
set -e

# Configuration (fallback to environment variables if not set)
export SENTRY_ORG=${SENTRY_ORG:-"mike-hall"}
export SENTRY_PROJECT=${SENTRY_PROJECT:-"aged-shape-8962"}

# Propose version if not provided
if [ -z "$VERSION" ]; then
  VERSION=$(sentry-cli releases propose-version)
fi

echo "🚀 Creating Sentry release: $VERSION"

# Workflow to create releases
sentry-cli releases new "$VERSION"
sentry-cli releases set-commits "$VERSION" --auto
sentry-cli releases finalize "$VERSION"

echo "✅ Sentry release $VERSION finalized."
