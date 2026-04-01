#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$ROOT_DIR/docs/system"
SRC_GLOB="$OUT_DIR/*.mmd"
PUPPETEER_CONFIG="$ROOT_DIR/scripts/docs/puppeteer.mmdc.json"

if ! compgen -G "$SRC_GLOB" >/dev/null; then
  echo "No Mermaid source files found: $SRC_GLOB" >&2
  exit 1
fi

if pnpm exec mmdc --version >/dev/null 2>&1; then
  MMDC_BIN="pnpm exec mmdc"
elif command -v mmdc >/dev/null 2>&1; then
  MMDC_BIN="$(command -v mmdc)"
elif [[ -x "$HOME/.npm/_npx/668c188756b835f3/node_modules/.bin/mmdc" ]]; then
  MMDC_BIN="$HOME/.npm/_npx/668c188756b835f3/node_modules/.bin/mmdc"
else
  MMDC_BIN="npx -y @mermaid-js/mermaid-cli@11.12.0"
fi

for src in $SRC_GLOB; do
  out="${src%.mmd}.svg"
  if [[ "$MMDC_BIN" == npx* ]]; then
    npx -y @mermaid-js/mermaid-cli@11.12.0 -p "$PUPPETEER_CONFIG" -i "$src" -o "$out"
  elif [[ "$MMDC_BIN" == pnpm* ]]; then
    pnpm exec mmdc -p "$PUPPETEER_CONFIG" -i "$src" -o "$out"
  else
    "$MMDC_BIN" -p "$PUPPETEER_CONFIG" -i "$src" -o "$out"
  fi
  echo "Generated: $out"
done

ls -l "$OUT_DIR"/*.svg
