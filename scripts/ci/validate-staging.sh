#!/bin/bash
# scripts/ci/validate-staging.sh
# Verifies the health and environment of the Phalanx Duel staging deployment.

STAGING_URL="https://phalanxduel-staging.fly.dev"

echo "🔎 Validating Staging Deployment: $STAGING_URL"

# 1. Basic Connectivity & Health
HEALTH=$(curl -sf "$STAGING_URL/health")
STATUS=$(echo "$HEALTH" | jq -r '.status')
if [ "$STATUS" == "ok" ]; then
  echo "✅ Health check passed: /health (Status: $STATUS)"
else
  echo "❌ Health check failed: $HEALTH"
  exit 1
fi

# 2. Readiness Check
READY=$(curl -sf "$STAGING_URL/ready")
IS_READY=$(echo "$READY" | jq -r '.ready')
if [ "$IS_READY" == "true" ]; then
  echo "✅ Readiness check passed: /ready (Ready: $IS_READY)"
else
  echo "❌ Readiness check failed: $READY"
  exit 1
fi

# 3. Environment Verification
# We can check the /health or a custom info endpoint if we have one.
# For now, we'll verify the site is responsive and reporting as intended.
echo "🚀 Staging deployment is LIVE and HEALTHY"
