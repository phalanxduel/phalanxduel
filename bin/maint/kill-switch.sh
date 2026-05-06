#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# kill-switch.sh
# Instant deployment revert for SEV-1 production incidents.
# -----------------------------------------------------------------------------

echo "🚨 INITIATING PRODUCTION KILL SWITCH 🚨"
echo "Rolling back phalanxduel-production to the previous known-good release..."

# The fly deploy --rollback command uses the remote builder to instantly
# revert the active image/config to the immediately preceding release.
fly deploy --rollback --app phalanxduel-production

echo ""
echo "✅ Rollback command issued."
echo "Verifying production health endpoints..."

sleep 5

echo "--> GET /health"
curl -s https://play.phalanxduel.com/health || echo "Failed to reach /health"

echo ""
echo "--> GET /ready"
curl -s https://play.phalanxduel.com/ready || echo "Failed to reach /ready"

echo ""
echo "⚠️  NOTE: If the incident involved destructive database migrations,"
echo "an application-level rollback is NOT sufficient. You must restore"
echo "from a point-in-time database backup."
