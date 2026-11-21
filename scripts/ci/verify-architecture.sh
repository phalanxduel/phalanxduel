#!/usr/bin/env bash
# scripts/ci/verify-architecture.sh — Verify Groma C4 model and Graphify knowledge graph sync.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

echo "==> Checking Groma architecture files..."
for required in groma/index.md groma/project.md groma/config.json; do
  if [ ! -f "$required" ]; then
    echo "ERROR: Missing required Groma file: $required" >&2
    exit 1
  fi
done

echo "==> Checking Graphify output artifacts..."
for required in graphify-out/graph.json graphify-out/graph.html graphify-out/GRAPH_REPORT.md; do
  if [ ! -s "$required" ]; then
    echo "ERROR: Missing or empty Graphify artifact: $required" >&2
    exit 1
  fi
done

run_groma_scan() {
  local cmd=("$@")
  local before after
  before="$(git status --porcelain -- groma/)"
  "${cmd[@]}"
  after="$(git status --porcelain -- groma/)"
  if [ "$before" != "$after" ]; then
    echo "ERROR: groma scan produced drift in groma/." >&2
    git status --short -- groma/ >&2
    exit 1
  fi
}

if command -v groma >/dev/null 2>&1; then
  echo "==> Running groma scan --plain..."
  run_groma_scan groma scan --plain
elif [ "${CI:-}" = "true" ]; then
  echo "==> Running npx groma.md@0.7.8 scan --plain (CI)..."
  run_groma_scan npx --yes groma.md@0.7.8 scan --plain
else
  echo "WARN: groma CLI not found; skipping live groma scan."
fi

if command -v graphify >/dev/null 2>&1; then
  echo "==> Validating graphify-out/graph.json..."
  graphify god-nodes --top 5 --graph graphify-out/graph.json >/dev/null
else
  echo "WARN: graphify CLI not found; skipping graphify CLI check."
fi

echo "==> ✅ Architecture & knowledge graph verification passed."
