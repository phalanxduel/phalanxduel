---
title: "Gameplay Panoramic View"
description: "A match-scoped view across player experience, game flows, and OpenTelemetry evidence."
status: active
updated: "2026-08-29"
audience: human
initiative: "Panoramic View Labs (PVL, pronounced Pavel)"
related:
  - docs/ops/runbook.md
  - docs/reference/environment-variables.md
  - docs/architecture/principles.md
---

# Gameplay Panoramic View

Panoramic View is the technique. Panoramic View Labs (`PVL`, pronounced
“Pavel”) is the initiative that develops it. The zdots platform is the root of
the local-system PVL capabilities: collector, context-engine, evidence seams,
and operator surfaces.

The panoramic view follows one match across the experience and the system:

```text
browser action
  ├─ phx-client: interaction, fetch, WebSocket, game.match
  ├─ phx-server: session, action, MatchActor, persistence
  ├─ engine result: phase, event/effect, state hash
  ├─ replay evidence: recorded action/state chain
  └─ O2: traces, metrics, and correlated structured logs
```

## Correlation keys

Start with the narrowest key available and carry it through every query:

| Key | Meaning |
| --- | --- |
| `match.id` / `game.match_id` | One match across client, server, and QA tooling |
| `qa.run_id` | One automated capture or verification run |
| `ws.session_id` / `game.session_id` | One browser or client session |
| `ws.reconnect_attempt` | Reconnect behavior for the session |
| `service.name` | `phx-client`, `phx-server`, or a QA runner |
| `service.namespace` | `phalanxduel` for the game domain |
| `deployment.environment` | Local, test, or production context; `local` for PVL filelog evidence |

## Discrete flows to show

### Match bootstrap

`lobby → match create/join → WebSocket open → initial state → game.match.bound`

Useful evidence: session spans, match ID, player seat, initial phase, and
whether the browser received a redacted or player-specific projection.

### Deployment and reinforcement

`card selected → target validated → action submitted → MatchActor apply →
state projection → phase transition`

Useful evidence: action type, column/row, turn number, action latency, and the
before/after state hash.

### Combat cascade

`attacker → boundary resolution → absorption/destruction → carryover →
Life Point damage → explanation/event log`

Useful evidence: combat span, suit/boundary effect, ordered calculation
steps, destroyed cards, carryover damage, and final state hash.

### Recovery and replay

`disconnect → reconnect attempt → session rejoin → state sync → replay check`

Useful evidence: `ws.reconnect_attempt`, session identity, sync result, and
whether the replayed state hash matches the authoritative result.

## Metrics worth deriving

The existing telemetry supports these directly or with small presentation-side
aggregation:

- action count and turn count per match;
- match duration and terminal outcome;
- action rejection count by code;
- action latency percentiles;
- reconnect attempts and successful rejoin;
- combat cascade depth and Life Point delta;
- suit/boundary effects used;
- replay/state-hash verification result;
- client/server trace coverage for the same match ID.

Do not interpret bot outcomes as human balance evidence, or missing production
telemetry as missing gameplay behavior.

## Marked trails

The renderer marks four causal trails across the five panoramic lanes. A trail
is an ordered set of observed event nodes, not an inferred span:

| Trail | Layer sequence | Purpose |
| --- | --- | --- |
| Match bootstrap | experience → server → engine → evidence | Proves that a user-visible start reached authoritative state and replay evidence. |
| Turn cascade | experience → server → engine | Shows the repeated action/state/engine wave through the match. |
| Terminal proof | experience → engine → evidence → diagnostics | Connects the final action to terminal replay and operational evidence. |
| Observability correlation | experience → evidence → diagnostics | Shows where the match capture meets replay and O2 correlation. |

The generated HTML draws each trail across the lane grid, marks its event
nodes, and lets the operator focus one trail at a time. Trail status is
`observed`, `unknown`, or `absence`; unknown O2 status is intentional when a
capture has telemetry emission but no attached O2 query result.

## Local collector policy

The local console and upstream collector configurations include a
`filter/gameplay` processor for traces and metrics. It retains signals whose
resource namespace is `phalanxduel` and drops unrelated traces/metrics at this
project boundary. Logs are intentionally not filtered: structured server logs
may contain the event or error detail needed to explain a match and correlate
it through `trace_id`/`span_id`.

Local checks:

```bash
rtk zsvc health --json
rtk curl -k -s https://o2.localhost/healthz
rtk pnpm infra:otel:console
```

For a single walkthrough, preserve the `qa.run_id` and `match.id` in the
recording manifest and use them as the O2 search anchors.

## Attach an O2 result to a capture

The playthrough manifest records the QA run ID and match ID. After querying O2
using those anchors, save the exported JSON and attach it to the run:

```bash
pnpm qa:o2:attach -- \
  --run artifacts/playthrough/<run-directory> \
  --input /path/to/o2-correlation.json
pnpm qa:panoramic -- --run artifacts/playthrough/<run-directory>
```

This writes `o2-correlation.json`, records the attachment in `manifest.json`,
and makes the O2 lane/report entry observed instead of unknown. The attachment
command treats the payload as opaque JSON so it can carry trace, metric, or log
query results from the local O2 installation without coupling the harness to a
particular dashboard API.

## Local JSONL filelog seam

The authoritative `MatchActor` writes match-scoped evidence after an action is
accepted by the ledger. Local daemon startup loads the ignored `.zdots.local`
override:

```bash
export ZDOTS_APP_LOG=/Users/mike/github.com/phalanxduel/game/logs/panoramic.jsonl
```

The collector's filelog/app pipeline consumes one JSON object per line. Each
record includes `timestamp`, `trace_id`, `span_id`, `match_id`, `lane`, `kind`,
`label`, `status`, `duration_ms`, `source`, and `confidence`, plus safe replay
metadata such as action type and state hashes. Match IDs are not request trace
IDs: the match UUID with dashes removed is the stable 32-character
`trace_id`, while the transaction sequence is the deterministic `span_id`.
Request spans remain available for HTTP/WebSocket causality.

The writer is local/development-only and non-blocking. It never writes player
names, credentials, tokens, raw game state, or private card collections. A
rejected action is represented as `status: down` with
`confidence: observed-failure`; a failed telemetry write cannot fail a turn.
PVL filelog records identify the emitting service as `phx-server` in the
`phalanxduel` namespace and carry the local deployment environment, allowing
O2 service catalog queries to group them with server traces. The collector may
still normalize resource fields according to the zdots platform policy.
After changing `.zdots.local`, restart the host collector with
`rtk otel-collector restart`.

## Identity across strata

Pavel's defining responsibility is identity continuity across the system's
strata. The scenario runner identifier, `qa.run_id`, is the scenario spine.
The trace ID is the operational spine beneath it and each span is the local
operation anchor. Every service, gameplay, persistence, and PVL identifier
must map back to the scenario runner identifier through its trace/span pair
while retaining its native meaning:

| Stratum | Native identity | Mapping key |
| --- | --- | --- |
| Browser/RUM | session, request, and replay context | `qa.run_id`, `ws.session_id`, trace ID |
| Collector | resource and span identity | `service.name`, `service.namespace`, trace/span ID |
| Service | HTTP/WebSocket request and connection state | trace ID, `ws.session_id` |
| Gameplay | match, turn, and action | `match.id`, `game.match`, action sequence |
| Persistence | ledger transaction and replay position | transaction ID, sequence number, state hashes |
| PVL evidence | lane, node, and observed outcome | `match_id`, `trace_id`, `span_id`, `source` |

When following a trail, start with the scenario runner identifier and map it
through the trace: `qa.run_id` → browser trace → `ws.session_id` → `match.id` →
transaction sequence/state hash → PVL evidence node. A missing mapping is an
explicit evidence gap, not permission to infer that two events are the same.
Never substitute player identity, email, token, or secret material for a
technical correlation key.
