#!/bin/bash
# scripts/ci/lint.sh — Orchestrated linting logic

set -uo pipefail # don't exit on failure so we can run lint:tools

TYPE="${1:-code}" # code, typed, tools
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR" || exit

export ESLINT_SKIP_PROJECT_SERVICE=1

if [[ "$TYPE" == "code" ]]; then
  echo "==> Running standard lint..."
  eslint . -f json -o eslint-report.json || eslint .
elif [[ "$TYPE" == "typed" ]]; then
  echo "==> Running typed lint..."
  unset ESLINT_SKIP_PROJECT_SERVICE
  eslint . -f json -o eslint-report.json || eslint .
fi

echo "==> Running auxiliary tools (shellcheck, actionlint)..."
EXIT=0
if command -v shellcheck &>/dev/null; then
  shellcheck scripts/**/*.sh bin/**/*.sh || EXIT=1
else
  echo "  ⏭️  shellcheck not found (gated locally via pre-commit)"
fi
if command -v actionlint &>/dev/null; then
  actionlint || EXIT=1
else
  echo "  ⏭️  actionlint not found (gated locally via pre-commit)"
fi
exit "$EXIT"
