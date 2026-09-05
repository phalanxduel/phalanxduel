# Demo observability checklist template

Copy this template into a dated demo packet when a Phalanx Duel walkthrough
needs telemetry evidence. Keep it local and redact identifiers before sharing.

## Environment

- Date/time:
- Git SHA:
- Demo URL:
- Cockpit URL:
- O2 URL:
- Jaeger Search URL:
- Jaeger graph URL:
- Collector healthy: [ ]
- O2 healthy: [ ]
- Jaeger healthy: [ ]

## Trail

| Step | User action | O2 evidence | Jaeger evidence | Correlation key |
| --- | --- | --- | --- | --- |
| 1 | Load lobby | RUM/session or browser log | `phx-client` root span | `qa.run_id` |
| 2 | Connect WebSocket | browser/network signal | client/server span pair | `ws.session_id` |
| 3 | Submit action | feature event, log, metric | action/request span | `match.id` |
| 4 | Resolve turn | gameplay metric/log | `game.match` child spans | `match.id` |
| 5 | Finish or recover | outcome/SLO panel | trace error or terminal span | `qa.run_id` |

## Operator notes

- O2 result:
- Jaeger trace/service selection:
- Jaeger graph result:
- RUM/replay result:
- Missing or `No Data` panels:
- Follow-up:

## Safety

- [ ] No secrets or tokens copied into this packet.
- [ ] No player IDs or email addresses recorded.
- [ ] Local `*.localhost` links only.
- [ ] Production telemetry was not changed.
