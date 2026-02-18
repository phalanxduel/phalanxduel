# Phalanx — Observability

OpenTelemetry is initialized at server startup. Every request and game action
produces traces and metrics.

## Setup

The server reads these environment variables:

| Variable | Default | Description |
|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | _(unset)_ | OTLP HTTP endpoint (e.g. `http://localhost:4318`). When unset, console exporters are used. |
| `OTEL_EXPORTER_OTLP_HEADERS` | _(unset)_ | Comma-separated OTLP headers (for Grafana Cloud auth), e.g. `Authorization=Basic ...`. |
| `OTEL_EXPORTER_OTLP_TRACES_HEADERS` | _(unset)_ | Optional trace-specific headers (overrides common OTLP headers). |
| `OTEL_EXPORTER_OTLP_METRICS_HEADERS` | _(unset)_ | Optional metric-specific headers (overrides common OTLP headers). |
| `OTEL_SERVICE_NAME` | `phalanx-server` | Service name in traces |
| `OTEL_SERVICE_VERSION` | `0.1.0` | Service version in traces |

### Local development (console output)

```bash
pnpm dev:server
# Trace and metric data is printed to stdout.
```

### Local development (full stack)

```bash
pnpm otel:up        # starts Collector + Jaeger + Prometheus + Grafana
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev:server
```

- **Jaeger UI** — http://localhost:16686 (traces)
- **Prometheus** — http://localhost:9090 (metrics)
- **Grafana** — http://localhost:3000 (dashboards, default user: admin/admin)

Stop the stack: `pnpm otel:down`

## Spans

### Automatic (via HTTP instrumentation)

| Span Name | Created By |
|---|---|
| `HTTP GET`, `HTTP POST`, ... | `@opentelemetry/instrumentation-http` |

### Manual

| Span Name | Created By | When |
|---|---|---|
| `ws.<message_type>` | `server/src/tracing.ts:traceWsMessage` | Every inbound WebSocket message |
| `http.<operation>` | `server/src/tracing.ts:traceHttpHandler` | Custom sub-spans in HTTP handlers |

## Required Span Attributes

All game-related spans should include these attributes when available:

| Attribute | Type | Description |
|---|---|---|
| `match.id` | string | UUID of the current match |
| `player.id` | string | UUID of the acting player |
| `action.type` | string | Game action type (e.g. `deploy`, `attack`) |
| `action.source_card` | string | Card performing the action |
| `action.target_card` | string | Card being targeted |
| `state.hash` | string | SHA-256 hash of resulting game state |

## Metrics (planned)

| Metric | Type | Description |
|---|---|---|
| `phalanx.matches.active` | UpDownCounter | Number of active matches |
| `phalanx.actions.total` | Counter | Total game actions processed |
| `phalanx.actions.duration_ms` | Histogram | Time to process a game action |
| `phalanx.ws.connections` | UpDownCounter | Active WebSocket connections |

## Architecture

```
┌──────────────┐   OTLP/HTTP   ┌───────────────┐
│ phalanx-     │ ──────────── > │  OTel         │
│ server       │                │  Collector    │
└──────────────┘                └──────┬────────┘
                                       │
                          ┌────────────┼────────────┐
                          │            │            │
                    ┌─────▼──┐   ┌─────▼──┐   ┌────▼───┐
                    │ Jaeger │   │ Prom   │   │ Grafana│
                    │ (trace)│   │ (metric│   │ (dash) │
                    └────────┘   └────────┘   └────────┘
```
