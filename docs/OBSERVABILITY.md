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
| `OTEL_EXPORTER_OTLP_LOGS_HEADERS` | _(unset)_ | Optional logs-specific headers (overrides common OTLP headers). |
| `OTEL_LOGS_EXPORTER` | `otlp` | Logs exporter mode. Set to `none` to disable OTLP logs export while keeping stdout logs. |
| `OTEL_SERVICE_NAME` | `phalanx-server` | Service name in traces |
| `OTEL_SERVICE_VERSION` | `0.2.0` | Service version in traces |
| `FLY_MACHINE_ID` | _(set by Fly.io)_ | Used as `host.name` + `service.instance.id` when running on Fly. Falls back to `os.hostname()`. |
| `FLY_APP_NAME` | _(set by Fly.io)_ | When present, sets `cloud.provider=fly_io` on the resource. |
| `FLY_REGION` | _(set by Fly.io)_ | When present, sets `cloud.region` on the resource. |

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

### Grafana Cloud host-hours

Grafana Cloud requires a `host.name` resource attribute to count billable hosts.
The server sets this automatically:
- On Fly.io: uses `FLY_MACHINE_ID` (set by the platform)
- Locally: uses `os.hostname()`

No action needed — the attribute is emitted with every trace, metric, and log as part of the OTel Resource.

### Fly + Grafana Cloud dual logging

Fastify/Pino logs are still written to stdout/stderr (so Fly retains logs), and
are additionally mirrored to OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.

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
