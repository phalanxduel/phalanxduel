#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$ROOT_DIR/docs/system"
SRC_GLOB="$OUT_DIR/site-flow-*.mmd"

if ! compgen -G "$SRC_GLOB" >/dev/null; then
  echo "No Mermaid source files found: $SRC_GLOB" >&2
  exit 1
fi

if command -v mmdc >/dev/null 2>&1; then
  MMDC_BIN="$(command -v mmdc)"
elif [[ -x "$HOME/.npm/_npx/668c188756b835f3/node_modules/.bin/mmdc" ]]; then
  MMDC_BIN="$HOME/.npm/_npx/668c188756b835f3/node_modules/.bin/mmdc"
else
  MMDC_BIN="npx -y @mermaid-js/mermaid-cli"
fi

for src in $SRC_GLOB; do
  out="${src%.mmd}.svg"
  if [[ "$MMDC_BIN" == npx* ]]; then
    npx -y @mermaid-js/mermaid-cli -i "$src" -o "$out"
  else
    "$MMDC_BIN" -i "$src" -o "$out"
  fi
  echo "Generated: $out"
done

ls -l "$OUT_DIR"/site-flow-*.svg
