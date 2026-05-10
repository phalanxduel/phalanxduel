#!/usr/bin/env bash
set -euo pipefail

ENV="local"
OUTPUT_DIR="./backups"

usage() {
  echo "Usage: $0 --env <local|staging|production> [--output-dir <path>]" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV="$2"; shift 2 ;;
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    *) usage ;;
  esac
done

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTFILE="${OUTPUT_DIR}/phalanx_${ENV}_${TIMESTAMP}.sql"

echo "Backing up $ENV database → $OUTFILE"

if ! pg_dump --no-owner --no-acl --format=plain "$DATABASE_URL" > "$OUTFILE" 2>/tmp/pg_dump_err; then
  echo "ERROR: pg_dump failed — connection or authentication error" >&2
  cat /tmp/pg_dump_err >&2
  rm -f "$OUTFILE"
  exit 1
fi

SIZE=$(wc -c < "$OUTFILE")
if [[ "$SIZE" -lt 10240 ]]; then
  echo "ERROR: dump file is only ${SIZE} bytes (< 10 KB) — likely empty or failed" >&2
  exit 1
fi

if ! head -3 "$OUTFILE" | grep -q "PostgreSQL database dump"; then
  echo "ERROR: dump does not contain expected PostgreSQL header" >&2
  exit 1
fi

TABLE_COUNT=$(grep -c "^CREATE TABLE" "$OUTFILE" || true)

echo "Output:      $OUTFILE"
echo "Size:        ${SIZE} bytes"
echo "Tables in dump: ${TABLE_COUNT}"
