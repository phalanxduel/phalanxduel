# Procfile for Fly.io - Runs both app and OTel collector as processes in the same machine
# Fly.io supports multiple processes per machine using this format.
# Both processes will be managed by the Fly.io VM and restarted if they crash.

# Main application
web: node server/dist/index.js

# OpenTelemetry Collector sidecar
# Runs on port 4318 (HTTP) and 4317 (gRPC)
# Health check available on port 13133
otel: /app/otel-collector/otelcol-contrib --config=/app/otel-collector-config.yaml
