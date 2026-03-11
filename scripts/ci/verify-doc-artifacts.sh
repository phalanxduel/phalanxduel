set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT_DIR"

pnpm docs:artifacts

if ! git diff --exit-code -- dependency-graph.svg docs/system/KNIP_REPORT.md; then
  echo >&2
  echo "Documentation artifacts are out of date." >&2
  echo "Run 'pnpm docs:artifacts' and commit the updated files." >&2
  exit 1
fi
