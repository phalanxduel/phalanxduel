#!/usr/bin/env bash
# reset-dev-admin.sh — Reset (or create) the local development admin account.
#
# Usage:
#   bin/maint/reset-dev-admin.sh [email] [password] [gamertag]
#
# Defaults (match the repo's canonical dev credentials):
#   email:    mike@just3ws.com
#   password: adminadmin
#   gamertag: Mike
#
# Wraps with-dev-postgres.sh — runs migrations, ensures the dev DB is up,
# then upserts the admin user via admin/scripts/seed-dev-admin.ts.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

EMAIL="${1:-${PHALANX_DEV_ADMIN_EMAIL:-mike@just3ws.com}}"
PASSWORD="${2:-${PHALANX_DEV_ADMIN_PASSWORD:-adminadmin}}"
GAMERTAG="${3:-${PHALANX_DEV_ADMIN_GAMERTAG:-Mike}}"

echo "🔑 Resetting dev admin: ${EMAIL} / gamertag: ${GAMERTAG}"
# ponytail: delegates all DB safety and migration checks to with-dev-postgres.sh
bash "${REPO_ROOT}/bin/maint/with-dev-postgres.sh" \
  pnpm admin:seed-dev:raw "${EMAIL}" "${PASSWORD}" "${GAMERTAG}"

echo "✅ Login with: ${EMAIL} / ${PASSWORD}"
