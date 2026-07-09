#!/bin/bash
# scripts/ci/lint.sh — Orchestrated linting logic

set -uo pipefail # don't exit on failure so we can run all lint tools

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "Usage: scripts/ci/lint.sh [code|typed|tools]"
  echo ""
  echo "Orchestrates linting logic across the project."
  exit 0
fi

TYPE="${1:-code}" # code, typed, tools
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR" || exit

export ESLINT_SKIP_PROJECT_SERVICE=1

EXIT=0

if [[ "$TYPE" == "code" ]]; then
  echo "==> Running standard lint..."
  if ! npx eslint . -f json -o eslint-report.json; then
    EXIT=1
    npx eslint . || true
  fi
elif [[ "$TYPE" == "typed" ]]; then
  echo "==> Running typed lint..."
  unset ESLINT_SKIP_PROJECT_SERVICE
  if ! npx eslint . -f json -o eslint-report.json; then
    EXIT=1
    npx eslint . || true
  fi
fi

echo "==> Running auxiliary tools (shellcheck, actionlint)..."
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
