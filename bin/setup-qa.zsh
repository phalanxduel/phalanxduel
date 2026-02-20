#!/usr/bin/env zsh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "==> QA setup: verifying toolchain"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is not installed."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "Error: pnpm is not installed."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(\".\")[0]')"
if [ "${NODE_MAJOR}" -lt 20 ]; then
  echo "Error: Node.js >= 20 is required (found $(node -v))."
  exit 1
fi

echo "==> Installing workspace dependencies"
pnpm install

echo "==> Ensuring Playwright is available"
if node -e "import('playwright').then(()=>process.exit(0)).catch(()=>process.exit(1))"; then
  echo "Playwright already installed."
else
  echo "Playwright missing. Installing dev dependency..."
  pnpm add -D playwright
fi

echo "==> Installing Playwright browser binaries"
pnpm exec playwright install

echo ""
echo "QA setup complete."
echo "Next steps:"
echo "  1) pnpm dev:server"
echo "  2) pnpm dev:client"
echo "  3) pnpm qa:playthrough -- --seed 20260220"
