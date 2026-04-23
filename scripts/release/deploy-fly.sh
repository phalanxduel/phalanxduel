#!/usr/bin/env bash
set -euo pipefail

# Phalanx Multi-Environment Deployment Script
# Usage:
#   APP_ENV=staging bash scripts/release/deploy-fly.sh
#   APP_ENV=production bash scripts/release/deploy-fly.sh

APP_ENV="${APP_ENV:-staging}"
FLY_CONFIG="fly.staging.toml"
if [ "$APP_ENV" == "production" ]; then
    FLY_CONFIG="fly.production.toml"
fi

RELEASE_VERIFY="${RELEASE_VERIFY:-}"
PRE_DEPLOY_MIGRATE="${PRE_DEPLOY_MIGRATE:-1}"
POST_DEPLOY_HEALTHCHECK="${POST_DEPLOY_HEALTHCHECK:-1}"

if [ -z "$RELEASE_VERIFY" ]; then
    if [ "$APP_ENV" == "production" ]; then
        RELEASE_VERIFY=1
    else
        RELEASE_VERIFY=0
    fi
fi

sanitize_database_url() {
    if [ -z "${DATABASE_URL:-}" ]; then
        echo "<unset>"
        return 0
    fi

    printf '%s\n' "$DATABASE_URL" \
        | sed -E 's#(postgres(ql)?://)([^:]+):[^@]+@([^/]+)/([^?]+)(.*)#\1\3:***@\4/\5\6#'
}

require_release_env() {
    if [ -z "${DATABASE_URL:-}" ]; then
        echo "❌ DATABASE_URL is not set for $APP_ENV"
        exit 1
    fi
}

probe_database() {
    echo "🔎 Database target: $(sanitize_database_url)"

    if command -v psql >/dev/null 2>&1; then
        echo "🔎 Verifying database connectivity..."
        PGPASSWORD='' psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'select 1' >/dev/null
        echo "✅ Database connectivity verified"
    else
        echo "⚠️  psql not found; skipping direct connectivity probe"
    fi
}

run_release_verification() {
    if [ "$RELEASE_VERIFY" != "1" ]; then
        return 0
    fi

    echo "🧪 Running release verification..."
    pnpm verify:release
    echo "✅ Release verification passed"
}

run_pre_deploy_migrate() {
    if [ "$PRE_DEPLOY_MIGRATE" != "1" ]; then
        echo "⏭️  Skipping pre-deploy migration check"
        return 0
    fi

    echo "🗃️  Running pre-deploy database migration..."
    pnpm --filter @phalanxduel/server db:migrate
    echo "✅ Pre-deploy migration completed"
}

run_post_deploy_healthcheck() {
    if [ "$POST_DEPLOY_HEALTHCHECK" != "1" ]; then
        echo "⏭️  Skipping post-deploy health check"
        return 0
    fi

    echo "🏥 Running post-deploy health check..."
    pnpm tsx scripts/health-check.ts "$APP_ENV"
    echo "✅ Post-deploy health check passed"
}

echo "🏁 Starting $APP_ENV deployment using $FLY_CONFIG..."

# Load correct environment variables
# Fail-closed: we no longer use `load_release_env || true`. If loading fails, abort.
# shellcheck source=scripts/release/load-release-env.sh
. "$(dirname "$0")/load-release-env.sh"
load_release_env

require_release_env
probe_database
run_release_verification
run_pre_deploy_migrate

echo "🚀 Executing Fly.io deployment for $APP_ENV..."
fly deploy --config "$FLY_CONFIG"

run_post_deploy_healthcheck

echo "✅ Deployment successful: $APP_ENV"
