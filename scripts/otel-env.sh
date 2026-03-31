#!/bin/bash
# ── OpenTelemetry Environment Setup ──────────────────────────────────
# Source this file to point telemetry to the local OTel collector.
# Usage: source scripts/otel-env.sh

export OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:4318"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"

# Set service name if not already set
if [ -z "$OTEL_SERVICE_NAME" ]; then
  export OTEL_SERVICE_NAME="phalanx-cli"
fi

echo "✅ OTel Environment configured: $OTEL_EXPORTER_OTLP_ENDPOINT ($OTEL_SERVICE_NAME)"
