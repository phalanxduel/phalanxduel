#!/usr/bin/env sh
# bin/maint/corepack-setup.sh
# Ensures corepack is enabled and pnpm is prepared non-interactively.

set -eu

# Ensure we are in the repo root
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

# Set non-interactive mode for corepack
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

echo "==> 📦 Ensuring Corepack is enabled..."
corepack enable

# Read packageManager from package.json
PACKAGE_MANAGER=$(node -p "require('./package.json').packageManager")

if [ -n "$PACKAGE_MANAGER" ]; then
  echo "==> 📦 Preparing $PACKAGE_MANAGER..."
  corepack prepare "$PACKAGE_MANAGER" --activate
else
  echo "⚠️  No packageManager specified in package.json"
fi

echo "==> ✅ Corepack and pnpm are ready!"
