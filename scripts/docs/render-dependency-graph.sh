set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_FILE="$ROOT_DIR/docs/system/dependency-graph.svg"

if ! command -v dot >/dev/null 2>&1; then
  echo "Graphviz 'dot' is required to generate docs/system/dependency-graph.svg." >&2
  echo "Install Graphviz and re-run 'pnpm docs:dependency-graph'." >&2
  exit 1
fi

cd "$ROOT_DIR"

pnpm exec depcruise \
  --config .dependency-cruiser.json \
  --include-only '^(client|server|engine|shared)/src' \
  --output-type dot \
  . | dot -T svg > "$OUT_FILE"

echo "Generated: $OUT_FILE"
