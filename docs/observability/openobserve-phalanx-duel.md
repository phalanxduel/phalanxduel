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
2. Start Phalanx with `rtk bin/demo up`.
3. Open `https://play.phalanxduel.localhost/?telemetry=on` and exercise the
   lobby, WebSocket connection, and one match flow.
4. Open `https://o2.localhost`, select the `default` stream, and import or
   reproduce the panels in the manifest.
5. Use `match.id`, `ws.session_id`, or `qa.run_id` for trace drill-downs.

Do not put player IDs, tokens, email addresses, or match IDs into metric
dimensions. Those are trace correlation fields, not dashboard aggregation
keys.
