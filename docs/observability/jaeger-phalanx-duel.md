---
title: "Phalanx Duel Jaeger Pairing"
description: "Local Jaeger trace search, dependency graphs, and correlation with OpenObserve and RUM."
status: active
updated: "2026-09-05"
---

# Phalanx Duel Jaeger pairing

Jaeger is the trace-focused half of the local observability pairing. The host
OTel collector exports Phalanx Duel traces to Jaeger and OpenObserve. Logs,
metrics, RUM, dashboards, and replay remain O2 concerns; Jaeger is where an
operator follows span timing, service boundaries, and dependency edges.

## Operator links

| Surface | URL | Use it for |
| --- | --- | --- |
| Search | [`jaeger.localhost/search`](https://jaeger.localhost/search) | Find traces by service, operation, duration, tags, or errors. |
| Deep Dependency Graph | [`jaeger.localhost/dependencies`](https://jaeger.localhost/dependencies) | Visualize service relationships from selected traces. |
| Monitor | [`jaeger.localhost/monitor`](https://jaeger.localhost/monitor) | Service Performance Monitoring (RED rate, errors, and duration) from span metrics. |
| O2 trace context | [`o2.localhost traces`](https://o2.localhost/web/traces?org_identifier=default) | Move from trace context into the O2 signal hub. |
| O2 logs | [`o2.localhost logs`](https://o2.localhost/web/logs?stream_type=logs&stream=default&period=15m&refresh=0&org_identifier=default) | Correlate application/filelog records around the trace window. |

## Trace walkthrough

1. Exercise the local lobby or one match at
   `https://play.phalanxduel.localhost/?telemetry=on`.
2. In Jaeger Search, select `phx-client` or `phx-server` and click **Find
   Traces**.
3. Prefer a browser trace whose service list includes both `phx-client` and
   `phx-server`. This is direct evidence that browser and server spans were
   paired through the collector.
4. Open the trace and inspect the root request, child spans, errors, and
   duration. Use `match.id`, `qa.run_id`, `ws.session_id`, or `game.match` when
   narrowing a match-level incident.
5. Use **Deep Dependency Graph** from the trace result for the graphical
   service relationship. Open Jaeger Monitor for service-level RED trends,
   then return to O2 for RUM replay, browser errors, logs, metrics, and
   dashboard panels.

## Correlation contract

| Evidence | O2 | Jaeger |
| --- | --- | --- |
| Browser RUM, Web Vitals, replay | Primary | Not a replay surface |
| Browser/server traces | Trace context and related signals | Primary span search and graph |
| App/filelog records | Primary | Not a log store |
| Metrics, RED, SLO panels | Primary | Supporting span-derived context |
| `match.id`, `qa.run_id`, `ws.session_id` | Filter and drill-down context | Trace tags and search filters |

Do not put player IDs, tokens, email addresses, or match IDs into metric
dimensions. Match and run identifiers are correlation fields for traces and
local evidence, not aggregation keys.

## Identity mapping for PVL trails

Jaeger supplies the trace/span identity, which is the operational spine under
the scenario runner identifier; Phalanx Duel supplies the service-local
gameplay identity. Pavel maps them across strata rather than flattening them
into one opaque ID:

```text
qa.run_id -> browser trace -> ws.session_id -> match.id
  -> game.match / action sequence -> PVL trace_id + span_id -> ledger evidence
```

Use the native identifier at each layer when investigating, and map every
result back to `qa.run_id` through its trace/span anchor. Treat a missing edge
as an evidence gap and record it as such. Do not use player identity, email,
tokens, or secrets as a substitute for a technical mapping key.

## Local-only boundary

This pairing is for host-native development and `*.localhost` surfaces. The
browser instrumentation is development-only, and the collector and Jaeger
endpoints remain local. Do not use these URLs or local RUM configuration as a
production telemetry contract.
