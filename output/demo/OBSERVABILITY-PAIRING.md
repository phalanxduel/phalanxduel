# Phalanx Duel demo observability packet

Use this packet during rehearsal and recording. It is intentionally local-only:
all links target `*.localhost`, and the generated cockpit is the launch point.

## Launch surfaces

- Cockpit: <https://phalanxduel.localhost/demo/>
- Game: <https://play.phalanxduel.localhost/?telemetry=on>
- OpenObserve dashboard: <https://o2.localhost/web/dashboards/view?org_identifier=default&dashboard=7501905489362419712&folder=default&tab=default&refresh=Off&period=15m&print=false>
- OpenObserve logs: <https://o2.localhost/web/logs?stream_type=logs&stream=default&period=15m&refresh=0&org_identifier=default>
- OpenObserve traces/service catalog: <https://o2.localhost/web/traces?org_identifier=default>
- Jaeger Search: <https://jaeger.localhost/search>
- Jaeger Deep Dependency Graph: <https://jaeger.localhost/dependencies>
- Jaeger Monitor: <https://jaeger.localhost/monitor>

## What each backend proves

| Question | OpenObserve | Jaeger |
| --- | --- | --- |
| Did the browser see the interaction? | RUM, replay, Web Vitals, browser logs | Browser spans, if present |
| What did the app emit? | Logs, metrics, dashboard panels | Span timing and errors |
| Did the request cross the game boundary? | Trace context and service inventory | `phx-client` → `phx-server` trace and graph |
| What happened around a match? | Log and metric window | Match/request spans filtered by correlation tags |

## Five-minute walkthrough

1. Run `phx-demo-ctl up` and open the game with `?telemetry=on`.
2. Perform one lobby action and one gameplay action. Keep the match ID if one
   is visible; keep the QA run ID when this is a harness run.
3. In O2, show the dashboard or logs. If Logs says “Select a stream,” choose
   `default` and run the query.
4. In Jaeger Search, choose `phx-client` or `phx-server`, find recent traces,
   and open a trace that lists both services.
5. Use Deep Dependency Graph from the trace result. Explain that the same
   collector fan-out makes O2 the broad signal hub and Jaeger the span/edge
   investigation surface.
6. Open Jaeger Monitor for service-level RED trends, then return to O2 for RUM
   replay, logs, metrics, dashboards, and SLO panels.

## Correlation keys

Use these as trace/search filters, not metric dimensions:

- `match.id` — one game
- `qa.run_id` — one automated walkthrough
- `ws.session_id` — one browser connection lifecycle
- `game.match` — stable match root span

Pavel's identity trail maps these across strata, always returning to the
scenario runner identifier as the scenario spine and then to the trace:

```text
qa.run_id -> browser trace -> ws.session_id -> match.id
  -> action sequence -> PVL trace_id/span_id -> ledger evidence
```

If one edge is absent, call it an evidence gap. Do not guess or substitute a
player ID, email address, token, or secret.

Never put tokens, email addresses, or player IDs into the packet, a dashboard
dimension, or a recording.

## Recovery cue

If O2 is unavailable, continue with the game and Jaeger Search/Monitor only if
Jaeger has fresh traces and span metrics; otherwise use the fallback video. If
Jaeger is unavailable, use O2 trace context and logs, then say the dependency
graph is a secondary operator view. Do not start Docker or Colima to repair the
host-native demo.
