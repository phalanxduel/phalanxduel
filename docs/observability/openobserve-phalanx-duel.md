---
title: "Phalanx Duel OpenObserve Dashboard"
description: "Local OpenTelemetry routing, HTTPS browser ingress, and the O2 dashboard contract."
status: active
updated: "2026-09-05"
---

# Phalanx Duel OpenObserve dashboard

The versioned dashboard manifest lives at
`config/openobserve/phalanx-duel-dashboard.json`. It is the source of truth
for the local O2 view and is intentionally scoped to
`service_namespace = 'phalanxduel'`.

## Signal path

```text
browser at https://play.phalanxduel.localhost
  -> same-origin /otel/v1/{traces,metrics}
  -> nginx HTTPS boundary
  -> host OTel collector :4318
  -> OpenObserve default stream
  -> o2.localhost dashboard
```

The browser uses `phx-client`; the game server uses `phx-server`. Both carry
the `phalanxduel` namespace, so the service map can join browser HTTP and
WebSocket activity with server spans. The collector's spanmetrics connector
also derives rate, error, and duration data from those spans.

The current O2 topology surface is the Service Catalog:

```text
https://o2.localhost/web/traces?org_identifier=default&tab=services-catalog
```

It is a service inventory with RED health data rather than a dedicated graph.
The cockpit links directly to the catalog and trace search. A future graph can
be built from the same spans once `peer.service` edges are consistently
available for browser, server, Postgres, and Redis dependencies.

OpenObserve's Logs page does not select a stream from the bare organization
URL. Use the `default` stream explicitly:

```text
https://o2.localhost/web/logs?stream_type=logs&stream=default&period=15m&refresh=0&org_identifier=default
```

If the page says “Select a stream,” choose `default` and run the query. Fresh
Phalanx Duel filelog records then appear; the receiver starts at the end of the
local file and does not backfill older lines.

## Development-only loading boundary

Browser telemetry is enabled only when the client is a Vite development build
running on `localhost`, a loopback address, or a `*.localhost` hostname. This
covers `play.phalanxduel.localhost`, `admin.phalanxduel.localhost`, and direct
loopback development without allowing a production build to opt in.

The `telemetry=on` query parameter is an explicit local debugging hint; it
cannot override the development-build or local-host checks. Production builds
do not register browser fetch/XHR instrumentation and do not export RUM data.
Use `telemetry=off` or `localStorage.phx_telemetry_disabled = "1"` for a local
session-level opt out.

## Local HTTPS contract

The project vhost owns the application route and exposes `/otel/` only on the
Phalanx play host. The collector remains loopback-only. The local certificate
must include `play.phalanxduel.localhost` in its SAN list. After installing or
changing the vhost, run the zdots certificate regeneration workflow, then
reload nginx and verify:

```bash
rtk nginx -t
rtk curl -k -sS https://play.phalanxduel.localhost/health
rtk curl -k -sS -o /dev/null -w '%{http_code}\n' https://play.phalanxduel.localhost/otel/v1/traces
```

The last request is expected to be `400` or `405` without an OTLP payload. A
TLS or proxy error is a failure.

## Dashboard workflow

1. Start the shared services with `rtk zsvc start otel` and `rtk zsvc start o2`.
2. Start Phalanx with `rtk bin/phx-demo-ctl up`.
3. Open `https://play.phalanxduel.localhost/?telemetry=on` and exercise the
   lobby, WebSocket connection, and one match flow.
4. Open the local dashboard at
   `https://o2.localhost/web/dashboards/view?org_identifier=default&dashboard=7501905489362419712&folder=default&tab=default&refresh=Off&period=15m&print=false`,
   select the `default` stream if prompted, and import or reproduce the panels
   in the manifest.
5. Use `match.id`, `ws.session_id`, or `qa.run_id` for trace drill-downs.

Do not put player IDs, tokens, email addresses, or match IDs into metric
dimensions. Those are trace correlation fields, not dashboard aggregation
keys.

## Platinum signal contract

The dashboard is organized around the four golden signals plus gameplay
health:

| Signal | Instrumentation | Local target |
| --- | --- | --- |
| Throughput | HTTP spans, `system.actions_total`, match lifecycle | No unexplained drops during a demo |
| Errors | error spans/logs, `game.action.results`, `slo.violations` | <1% failed gameplay actions |
| Latency | HTTP duration, action duration, match duration, browser ACK latency | p95 action ACK <1s |
| Saturation | active matches, WebSocket connections, collector/O2 health | No sustained queue or connection growth |
| Gameplay | match outcomes, turns, features, Web Vitals | Every recorded match has a terminal outcome or explicit abandonment |

The server now emits accepted/rejected action outcomes, completed-match
duration and turn histograms, outcome counters, feature events, and explicit
SLO-violation counters. The browser emits feature events, WebSocket message
events, action acknowledgement latency, and a Web Vitals hook for local
instrumentation. These are all low-cardinality dimensions; IDs remain trace
correlation fields.

Postgres spans are available from the server database instrumentation. Redis
and nginx should be added as separate local signals only when those host
services are active; they are not assumed to be game dependencies. Any
localhost-LLM analysis should consume these local O2/OTel records read-only,
fail open, and never fall back to a cloud provider.
