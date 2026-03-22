#!/bin/sh
# docker-entrypoint-dev.sh — Run migrations then start the app
# Used by Dockerfile.dev to ensure a fresh Postgres has the schema applied.

set -e

if [ -n "$DATABASE_URL" ]; then
  echo "⏳ Running database migrations..."
  node --enable-source-maps server/dist/db/migrate.js
  echo "✅ Migrations complete"
fi

# Replace shell with the app process (preserves PID 1 signal handling)
exec "$@"
