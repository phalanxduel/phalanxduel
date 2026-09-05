#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# Keep the local secret DSL out of Vite's automatic .env loading path. Only
# VITE_* values are exported, so unrelated local credentials (for example
# FLY_API_TOKEN) cannot reach the browser bundle.
# shellcheck source=scripts/release/load-release-env.sh
source scripts/release/load-release-env.sh
load_local_vite_env

exec pnpm dev:client
