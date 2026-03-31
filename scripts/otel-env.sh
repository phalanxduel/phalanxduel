#!/bin/bash
# ── OpenTelemetry Environment Setup ──────────────────────────────────
# Source this file to point telemetry to the local OTel collector.
# Supports both gRPC (4317) and OTLP/HTTP (4318).
# Usage: source scripts/otel-env.sh

# Default to gRPC for CLI/Server (port 4317)
export OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:4317"
export OTEL_EXPORTER_OTLP_PROTOCOL="grpc"
export OTEL_CONSOLE_LOGS_ENABLED="1"

# Set service name if not already set
if [ -z "$OTEL_SERVICE_NAME" ]; then
  export OTEL_SERVICE_NAME="phx-cli"
fi

echo "✅ OTel Environment configured (Dual-Protocol):"
echo "   Endpoint: $OTEL_EXPORTER_OTLP_ENDPOINT"
echo "   Protocol: $OTEL_EXPORTER_OTLP_PROTOCOL"
echo "   Service:  $OTEL_SERVICE_NAME"
