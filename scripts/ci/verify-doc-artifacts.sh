#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT_DIR"

pnpm docs:artifacts

# 1. Check for modified artifacts
if ! git diff --exit-code -- \
  docs/system/dependency-graph.svg \
  docs/system/KNIP_REPORT.md; then
  echo >&2
  echo "ERROR: Documentation artifacts are out of date." >&2
  echo "Run 'pnpm docs:artifacts' and commit the updated files." >&2
  exit 1
fi

# 2. Check for untracked artifacts
UNTRACKED=$(git ls-files --others --exclude-standard -- \
  docs/system/dependency-graph.svg \
  docs/system/KNIP_REPORT.md || true)

if [ -n "$UNTRACKED" ]; then
  echo >&2
  echo "ERROR: Untracked generated documentation artifacts found:" >&2
  echo "$UNTRACKED" >&2
  echo "Run 'pnpm docs:artifacts' and commit the changes." >&2
  exit 1
fi

echo "Documentation artifacts are up to date."
