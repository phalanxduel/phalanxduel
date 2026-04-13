#!/usr/bin/env bash
set -euo pipefail

echo "🔄 Resetting local Docker stack..."
docker compose --profile dev down -v
docker compose --profile dev up --build -d

echo "✅ Stack reset complete. Tailing logs..."
docker compose --profile dev logs -f app-dev
