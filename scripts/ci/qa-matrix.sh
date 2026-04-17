#!/bin/bash
# scripts/ci/qa-matrix.sh — Run batch QA scenario matrices

set -euo pipefail

TYPE="${1:-full}" # engine, api, full
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR" || exit

echo "==> 🏁 Running QA Matrix: $TYPE"

case "$TYPE" in
  engine)
    tsx bin/qa/simulate-headless.ts --p1 bot-random --p2 bot-random --batch 2 --max-turns 200
    tsx bin/qa/simulate-headless.ts --p1 bot-random --p2 bot-heuristic --batch 2 --max-turns 200
    tsx bin/qa/simulate-headless.ts --p1 bot-heuristic --p2 bot-random --batch 2 --max-turns 200
    tsx bin/qa/simulate-headless.ts --p1 bot-heuristic --p2 bot-heuristic --batch 2 --max-turns 200
    ;;
  api)
    bash scripts/ci/check-server.sh
    tsx bin/qa/api-playthrough.ts --damage-modes classic,cumulative --starting-lps 1,20,100 --batch 2 --max-turns 300
    ;;
  full)
    # Engine Matrix
    bash "$0" engine
    # Human Scenarios (Headless simulation of human behavior patterns)
    tsx bin/qa/simulate-headless.ts --p1 human --p2 human --batch 1 --max-turns 180
    tsx bin/qa/simulate-headless.ts --p1 human --p2 bot-random --batch 1 --max-turns 180
    tsx bin/qa/simulate-headless.ts --p1 human --p2 bot-heuristic --batch 1 --max-turns 180
    ;;
  *)
    echo "Unknown QA matrix type: $TYPE"
    exit 1
    ;;
esac

echo "==> ✅ QA Matrix ($TYPE) passed!"
