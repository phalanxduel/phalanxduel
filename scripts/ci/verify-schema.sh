#!/usr/bin/env bash
set -euo pipefail

echo "==> Running schema generation..."
pnpm schema:gen

echo "==> Checking for uncommitted changes to generated files..."

if ! git diff --exit-code -- shared/src/types.ts shared/json-schema/; then
  echo ""
  echo "ERROR: Generated schema artifacts are out of date."
  echo "Run 'pnpm schema:gen' and commit the changes."
  exit 1
fi

# Check for untracked generated files
UNTRACKED=$(git ls-files --others --exclude-standard -- shared/json-schema/ || true)
if [ -n "$UNTRACKED" ]; then
  echo ""
  echo "ERROR: Untracked generated schema files found:"
  echo "$UNTRACKED"
  echo "Run 'pnpm schema:gen' and commit the changes."
  exit 1
fi

echo "Schema artifacts are up to date."
