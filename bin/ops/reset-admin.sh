#!/usr/bin/env bash
set -euo pipefail

EMAIL=$1

if [ -z "$EMAIL" ]; then
  echo "Usage: ./bin/ops/reset-admin.sh <email>"
  echo "Example: ./bin/ops/reset-admin.sh mike@phalanxduel.com"
  exit 1
fi

echo "Connecting to production environment (phalanxduel-production) via Fly.io..."
fly console -a phalanxduel-production -C "node server/dist/ops/reset-admin-password.js $EMAIL"
