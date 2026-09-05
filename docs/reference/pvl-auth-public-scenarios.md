---
title: "PVL Authentication and Public Surface Scenarios"
description: "Standard-user scenario inventory for Phalanx Duel authentication and public website surfaces."
status: active
updated: "2026-09-05"
audience: contributor
initiative: "Panoramic View Labs (PVL, pronounced Pavel)"
related:
  - docs/observability/gameplay-panoramic-view.md
  - docs/reference/playthrough-scenarios.md
  - qa/scenarios/pvl-auth-public.json
---

# PVL authentication and public-surface scenarios

This is a development-only scenario inventory for a standard visitor/player.
It is deliberately honest about coverage: `covered` means an existing runner
can execute the flow, `partially-covered` means the runner exercises the path
as part of a larger journey, and `inventory` means the flow is defined but has
not yet been automated or observed in a local capture.

The source of truth is [`qa/scenarios/pvl-auth-public.json`](../../qa/scenarios/pvl-auth-public.json).
Validate it with:

```bash
rtk pnpm exec tsx bin/qa/validate-pvl-scenarios.ts
```

Plan the covered automode workflows without starting browsers:

```bash
rtk pnpm exec tsx bin/qa/pvl-workflow.ts --mode plan
```

Derive diagrams and a graph model from the same catalog:

```bash
rtk pnpm exec tsx bin/qa/pvl-diagrams.ts
```

This writes ignored development artifacts under `artifacts/pvl/`:
`pvl-diagrams.md` for Mermaid-renderable diagrams and `pvl-diagrams.json` for
PVL tooling. Catalog-derived edges are declared or unknown; a future evidence
merge can promote them to observed without changing the scenario definition.

Run one workflow when the local host-native server and client are already up:

```bash
rtk pnpm exec tsx bin/qa/pvl-workflow.ts --workflow standard-user-auth --mode run
```

Automode executes only commands on the runner allowlist. Inventory-only
scenarios are reported and skipped; they are never presented as passing.

## Initial inventory

| Scenario | Surface | Coverage | Standard-user intent |
| --- | --- | --- | --- |
| `auth.signup.standard-user` | Authentication | Partially covered | Create an account and return to the lobby. |
| `auth.login.standard-user` | Authentication | Covered | Return, sign in, and restore the session. |
| `profile.view-own.standard-user` | Authenticated profile | Inventory | Read and update the player's own profile. |
| `public.lobby.standard-user` | Public lobby | Covered | Arrive, understand the entry points, and start guest play. |
| `public.browse-surfaces.standard-user` | Public lobby | Inventory | Browse public matches, spectator, ladder, achievements, and profiles. |

## Workflows

The catalog currently defines two automode workflows:

- `standard-user-auth`: runs the covered signup/login journey and reports the
  profile scenario as inventory-only.
- `public-surface-smoke`: runs the public lobby smoke and reports the broader
  browse-surface journey as inventory-only.

This makes the executable boundary visible: Pavel can run the known-good
surface now, while the missing profile and browse automation remains an
explicit next slice rather than a green checkmark with no evidence.

## Recommended Pavel sequence

Run the visitor and player journey in this order:

1. Public lobby arrival.
2. Signup, then login and session restoration.
3. Own profile and settings.
4. Public lobby, public match join, and active-match resume.
5. Rankings, public profiles, achievements, and match history.
6. Live spectator mode.
7. Completed-match rewatch and shareable replay steps.
8. Admin read-only inspection.
9. Admin destructive actions only after audit evidence and explicit approval.

The machine-readable sequence is in the catalog's `sequence` array. This order
keeps the visitor path separate from privileged operations and makes spectator
and replay evidence follow the same match identity established by the player
journey.

## Spectator and rewatch PV review

The existing implementation has a good foundation: the spectator API returns
visitor-safe summaries, `watchMatch` uses the authoritative WebSocket path, and
rewatch reconstructs completed state through the deterministic engine instead
of trusting browser snapshots. Replay action and step endpoints, comments, and
social statistics are server-traced.

The next PV implementation slice should add explicit browser surface spans for
`spectator.watch` and `rewatch.open` / `rewatch.step`, carrying:

```text
qa.run_id → traceparent → session.id → spectator.id or viewer identity
         → match.id → replay.step → action/state hash → report evidence
```

The live spectator path should prove observer redaction and reconnect behavior.
The rewatch path should prove deterministic state reconstruction, step-link
reopening, and that social reads/writes remain separate from replay integrity.
Until those captures exist, the catalog intentionally labels both flows
`inventory`.

## Pavel mapping contract

Every scenario has a scenario runner spine even when the current runner is
manual or inventory-only:

```text
qa.run_id → traceparent → browser/session identity → player/profile/match identity
         → service operation → persistence operation → PVL evidence
```

The catalog names the layers and native identities that should be mapped. It
does not invent trace IDs, player IDs, SQL, Redis operations, or OpenObserve /
Jaeger results. Those remain `unknown_until_run` until a capture attaches
observed evidence. Credentials, emails, tokens, and raw profile data must never
be added to the catalog or telemetry.

For covered flows, run the command recorded in the JSON catalog. After a local
capture, attach O2 evidence and render its Panoramic View report:

```bash
rtk pnpm qa:o2:attach -- --run <capture-directory> --input <o2-correlation.json>
rtk pnpm qa:panoramic -- --run <capture-directory>
```

The gameplay capture inventory remains in the existing
[`playthrough-scenarios.md`](playthrough-scenarios.md) reference. This catalog
adds the business-facing standard-user journey without confusing planned
coverage with a completed playthrough.
