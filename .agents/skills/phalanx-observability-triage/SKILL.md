---
name: phalanx-observability-triage
description: Diagnose Phalanx Duel telemetry, OpenTelemetry, LGTM, Tempo, Loki, Grafana, collector, trace correlation, reconnect/session spans, match-level incidents, QA run IDs, browser root spans, service topology, or local zdots/otelcol health. Use when Codex needs to interpret observability signals, validate telemetry semantics, or investigate production/staging/local behavior through traces and logs.
---

# Phalanx Observability Triage

Use this skill when telemetry is the evidence surface. Prefer match-scoped
signals over dashboard-level inference for one-match incidents.

## Start Here

Read:

1. `docs/ops/runbook.md`
2. `docs/reference/environment-variables.md`
3. `docs/architecture/principles.md` for observability topology
4. `AGENTS.md` for the LGTM/OTel operating model

For local zdots collector health, pair with `$zdots-local-ai` and run:

```bash
rtk agent-guide --json
rtk capabilities --json
rtk zsvc health --json
```

## Match-Level Trace Keys

For stuck matches, reconnect loops, replay divergence, or QA failures, preserve
and search by:

- `match.id`
- `qa.run_id`
- `ws.session_id`
- `ws.reconnect_attempt`
- span name `game.match`
- player ID or pseudonym when safe and available

Tempo span search is the authoritative surface for a single match. Grafana
dashboards and service graphs are useful supporting views, but may omit or
reshape edges.

## Local Checks

Use these to establish whether telemetry can flow locally:

```bash
rtk zsvc health --json
rtk pnpm infra:otel:console
rtk pnpm infra:otel:collector
rtk curl -s http://127.0.0.1:4318
```

For app checks, verify `/health` reports OTel status when that is the question.

## Triage Pattern

1. Identify the environment and exact symptom.
2. Capture identifiers before rerunning or refreshing.
3. Check health/readiness/logs.
4. Search trace/log evidence by stable IDs.
5. Map symptoms to likely surfaces: client reconnect, WebSocket session,
   MatchActor apply, ledger persistence, event derivation, or collector path.
6. Recommend the next narrow command or code surface to inspect.

## Safety

- Do not treat missing telemetry as proof of missing behavior.
- Do not expose tokens or private player data in prompts or summaries.
- Do not mutate production while diagnosing telemetry unless the user asks for
  an incident action and the production runbook supports it.

Report the identifiers used, the telemetry surface checked, and whether the
result is direct evidence or an inference.
