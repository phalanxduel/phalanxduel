---
name: phalanx-o2-operator
description: Set up, configure, verify, and hand off the host-native OpenObserve/O2 environment for Phalanx Duel. Use when working on o2.localhost, local OTel intake, PHX dashboards, browser RUM, panel backups, or observability troubleshooting.
---

# Phalanx O2 Operator

Own the local observability path for Phalanx Duel:

```text
play.phalanxduel.localhost
  -> nginx /otel/
  -> host OTel collector :4318
  -> OpenObserve o2.localhost :5080
```

## Setup and health

1. Read `docs/observability/openobserve-phalanx-duel.md` and the database
   isolation instructions before running project commands.
2. Run `rtk zsvc health --json`; require `otel` and `o2` healthy before panel
   work. Check nginx and the local game health endpoint as needed.
3. Use `rtk bin/phx-demo-ctl up` for the host-native game/client flow. Use
   `https://play.phalanxduel.localhost/?telemetry=on` for local browser
   telemetry.
4. Verify the same-origin collector path with the documented `/otel/v1/*`
   checks. A payload-less trace request may return 400/405; TLS/proxy failure
   is not acceptable.

## Dashboard configuration

- Dashboard URL:
  `https://o2.localhost/web/dashboards/view?org_identifier=default&dashboard=7501905489362419712&folder=default&tab=default&refresh=Off&period=15m&print=false`
- Use the `default` stream and keep the canonical target scope
  `service_namespace = 'phalanxduel'` for OTel panels.
- O2 supports `histogram()`, not `histogram_interval()` in this installation.
- After SQL changes, explicitly map the result fields to X/Y axes, click
  **Apply**, verify the preview, then **Save**.
- Preserve the PHX naming convention (`PHX · request rate`, `PHX · …`) and the
  common live panel layout (`96×18` grid units).
- Record every live change in
  `config/openobserve/source/phalanx-duel-live-panels.json` and make a dated
  local snapshot under `config/openobserve/backups/`.

## Signal priorities

Build in this order: throughput, errors, latency, saturation/uptime, match
outcomes, WebSocket health, browser/RUM, database dependencies, feature
adoption, and SLO burn. A `No Data` result is a finding: inspect the stream,
time window, field spelling, and emitted telemetry before changing a query.

## Safe boundaries

- Never click dashboard export/download/reset/delete controls while probing.
- Never expose credentials, tokens, IDs, or raw telemetry in chat or source.
- Use the repository's annotated secret DSL and
  `scripts/maint/sync-secrets.ts`/`pnpm env:*` tooling for secret lifecycle
  work. Never read or print `.env.secrets*`; values belong only in the local
  environment or the intended managed secret target.
- Never install or enable RUM in production; use the local-RUM skill for token
  handling and replay privacy.
- Do not claim Redis, nginx, Postgres, or LLM panels are healthy unless the
  corresponding host signal is actually arriving in O2.

## Verification and handoff

Verify `rtk jq empty` for dashboard/source JSON, `rtk git diff --check`, the
relevant client/server typechecks or tests, and the visible live panel count.
Report what is live versus merely defined in the target manifest. Commit only
reviewed source definitions; keep recovery snapshots local unless explicitly
requested otherwise.

For panel editing details, read
[phalanx-openobserve-dashboard](../phalanx-openobserve-dashboard/SKILL.md).
For browser monitoring, read [phalanx-local-rum](../phalanx-local-rum/SKILL.md).
