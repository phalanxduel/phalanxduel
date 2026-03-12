#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

if command -v otelcol-contrib >/dev/null 2>&1; then
  exec otelcol-contrib --config config/otel/collector-console.yaml
fi

if command -v docker >/dev/null 2>&1; then
  IMAGE="${OTELCOL_CONTRIB_IMAGE:-otel/opentelemetry-collector-contrib:latest}"
  HOST_GRPC_PORT="${OTELCOL_HOST_OTLP_GRPC_PORT:-4317}"
  HOST_HTTP_PORT="${OTELCOL_HOST_OTLP_HTTP_PORT:-4318}"
  echo "otelcol-contrib not found; running collector via Docker image: $IMAGE"
  if command -v lsof >/dev/null 2>&1; then
    if lsof -nP -iTCP:"$HOST_HTTP_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "warning: host port $HOST_HTTP_PORT is already in use" >&2
    fi
    if lsof -nP -iTCP:"$HOST_GRPC_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "warning: host port $HOST_GRPC_PORT is already in use" >&2
    fi
  fi

  set +e
  docker run --rm \
    --name phalanx-otel-console \
    -v "$ROOT_DIR:/workspace" \
    -w /workspace \
    -p "$HOST_GRPC_PORT":4317 \
    -p "$HOST_HTTP_PORT":4318 \
    "$IMAGE" \
    --config config/otel/collector-console.yaml
  rc=$?
  set -e
  if [[ "$rc" -ne 0 ]]; then
    echo "Collector failed to start via Docker (exit $rc)." >&2
    echo "If ports are occupied, set OTELCOL_HOST_OTLP_HTTP_PORT / OTELCOL_HOST_OTLP_GRPC_PORT." >&2
    echo "Example: OTELCOL_HOST_OTLP_HTTP_PORT=4319 pnpm otel:console" >&2
    exit "$rc"
  fi
  exit 0
fi

echo "Error: neither 'otelcol-contrib' nor 'docker' is available on PATH." >&2
echo "Install OpenTelemetry Collector Contrib or Docker, then retry." >&2
exit 1
