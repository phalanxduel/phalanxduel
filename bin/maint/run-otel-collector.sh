#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--help" ]]; then
  cat <<'EOF'
Run a local OpenTelemetry Collector that forwards telemetry to the centralized collector intake on the LGTM path.

Defaults:
  - Collector intake (host): gRPC 4319, HTTP 4320
  - Centralized OTLP upstream endpoint:
      Docker collector: http://host.docker.internal:4318
      Local binary:     http://127.0.0.1:4318

Environment variables:
  OTELCOL_CONTRIB_IMAGE             Collector Docker image
  OTELCOL_HOST_OTLP_GRPC_PORT       Host gRPC intake port (default: 4319)
  OTELCOL_HOST_OTLP_HTTP_PORT       Host HTTP intake port (default: 4320)
  OTELCOL_INGEST_OTLP_GRPC_PORT     Collector gRPC port inside process/container (default: host gRPC port)
  OTELCOL_INGEST_OTLP_HTTP_PORT     Collector HTTP port inside process/container (default: host HTTP port)
  OTEL_UPSTREAM_OTLP_ENDPOINT       Centralized collector intake OTLP/HTTP endpoint
EOF
  exit 0
fi

CONFIG_FILE="config/otel/otel-collector.local.upstream.yaml"
IMAGE="${OTELCOL_CONTRIB_IMAGE:-otel/opentelemetry-collector-contrib:latest}"
HOST_GRPC_PORT="${OTELCOL_HOST_OTLP_GRPC_PORT:-4319}"
HOST_HTTP_PORT="${OTELCOL_HOST_OTLP_HTTP_PORT:-4320}"
INGEST_GRPC_PORT="${OTELCOL_INGEST_OTLP_GRPC_PORT:-$HOST_GRPC_PORT}"
INGEST_HTTP_PORT="${OTELCOL_INGEST_OTLP_HTTP_PORT:-$HOST_HTTP_PORT}"

export OTELCOL_INTAKE_OTLP_GRPC_ENDPOINT="0.0.0.0:${INGEST_GRPC_PORT}"
export OTELCOL_INTAKE_OTLP_HTTP_ENDPOINT="0.0.0.0:${INGEST_HTTP_PORT}"

if command -v docker >/dev/null 2>&1; then
  : "${OTEL_UPSTREAM_OTLP_ENDPOINT:=http://host.docker.internal:4318}"
else
  : "${OTEL_UPSTREAM_OTLP_ENDPOINT:=http://127.0.0.1:4318}"
fi
export OTEL_UPSTREAM_OTLP_ENDPOINT

echo "Collector config: $CONFIG_FILE"
echo "Collector intake (host): grpc=$HOST_GRPC_PORT http=$HOST_HTTP_PORT"
echo "Collector intake (internal): grpc=$INGEST_GRPC_PORT http=$INGEST_HTTP_PORT"
echo "OTLP upstream endpoint: $OTEL_UPSTREAM_OTLP_ENDPOINT"
echo "App OTLP endpoint: http://127.0.0.1:${HOST_HTTP_PORT}"

if command -v docker >/dev/null 2>&1; then
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
    --name phalanx-otel-collector \
    -e OTEL_UPSTREAM_OTLP_ENDPOINT \
    -e OTELCOL_INTAKE_OTLP_GRPC_ENDPOINT \
    -e OTELCOL_INTAKE_OTLP_HTTP_ENDPOINT \
    -v "$ROOT_DIR:/workspace" \
    -w /workspace \
    -p "$HOST_GRPC_PORT":"$INGEST_GRPC_PORT" \
    -p "$HOST_HTTP_PORT":"$INGEST_HTTP_PORT" \
    "$IMAGE" \
    --config "$CONFIG_FILE"
  rc=$?
  set -e
  if [[ "$rc" -ne 0 ]]; then
    echo "Collector failed to start via Docker (exit $rc)." >&2
    echo "Set OTELCOL_HOST_OTLP_HTTP_PORT / OTELCOL_HOST_OTLP_GRPC_PORT if ports are occupied." >&2
    echo "Example: OTELCOL_HOST_OTLP_HTTP_PORT=4330 pnpm infra:otel:collector" >&2
    exit "$rc"
  fi
  exit 0
fi

if command -v otelcol-contrib >/dev/null 2>&1; then
  exec otelcol-contrib --config "$CONFIG_FILE"
fi

echo "Error: neither 'docker' nor 'otelcol-contrib' is available on PATH." >&2
echo "Install Docker Desktop or OpenTelemetry Collector Contrib, then retry." >&2
exit 1
