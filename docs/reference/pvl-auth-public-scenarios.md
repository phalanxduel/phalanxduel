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

## Initial inventory

| Scenario | Surface | Coverage | Standard-user intent |
| --- | --- | --- | --- |
| `auth.signup.standard-user` | Authentication | Partially covered | Create an account and return to the lobby. |
| `auth.login.standard-user` | Authentication | Covered | Return, sign in, and restore the session. |
| `profile.view-own.standard-user` | Authenticated profile | Inventory | Read and update the player's own profile. |
| `public.lobby.standard-user` | Public lobby | Covered | Arrive, understand the entry points, and start guest play. |
| `public.browse-surfaces.standard-user` | Public lobby | Inventory | Browse public matches, spectator, ladder, achievements, and profiles. |

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
