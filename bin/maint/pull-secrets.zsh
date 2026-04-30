#!/usr/bin/env zsh
# Pull live secrets from a Fly app and write the local .env.[environment] file.
# Usage: bin/maint/pull-secrets.zsh [staging|production]

set -euo pipefail

ENV="${1:-}"
if [[ -z "$ENV" ]]; then
  print -u2 "Usage: $0 [staging|production]"
  exit 1
fi

case "$ENV" in
  staging)    FLY_APP="phalanxduel-staging" ;;
  production) FLY_APP="phalanxduel-production" ;;
  *)
    print -u2 "Unknown environment: $ENV (must be staging or production)"
    exit 1
    ;;
esac

OUTFILE=".env.$ENV"
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_DIR"

echo "==> Pulling secrets from $FLY_APP into $OUTFILE"

# Fly-injected runtime vars that belong to the machine, not to us
SKIP=(
  FLY_ALLOC_ID FLY_APP_NAME FLY_IMAGE_REF FLY_MACHINE_ID
  FLY_MACHINE_VERSION FLY_PRIVATE_IP FLY_PUBLIC_IP FLY_PROCESS_GROUP
  FLY_REGION FLY_VM_MEMORY_MB FLY_SSH HOST PORT PATH HOME SHELL TERM
  PRIMARY_REGION OTEL_EXPORTER_OTLP_ENDPOINT OTEL_EXPORTER_OTLP_PROTOCOL
  OTEL_SERVICE_NAME OTEL_SERVICE_VERSION NODE_VERSION YARN_VERSION
)

# Build a grep pattern to exclude Fly-injected vars
SKIP_PATTERN="^($(IFS='|'; echo "${SKIP[*]}"))="

raw="$(fly ssh console --app "$FLY_APP" -C "printenv" 2>/dev/null)"

{
  while IFS= read -r line; do
    [[ "$line" =~ $SKIP_PATTERN ]] && continue
    [[ -z "$line" ]] && continue
    echo "$line"
  done <<< "$raw"
} > "$OUTFILE"

echo "==> Written to $OUTFILE ($(wc -l < "$OUTFILE") vars)"
