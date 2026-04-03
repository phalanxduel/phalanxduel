---
title: Production Readiness Priorities and Version Bump Plan
description: Ordered backlog plan for production-readiness work, including degraded connectivity, restart survivability, and schema-version bump sequencing.
status: active
updated: "2026-04-02"
audience: team
related:
  - backlog/docs/doc-6 - Degraded Connectivity Fallback Proposal.md
  - backlog/tasks/task-129 - Establish-Continuous-API-Integration-Testing-Gate.md
  - backlog/tasks/task-160 - Make-match-reconnect-survive-server-restarts.md
  - backlog/tasks/task-161 - Plan-release-version-bump-for-expanded-external-client-surface.md
  - docs/system/VERSIONING.md
---

# Production Readiness Priorities and Version Bump Plan

## Goal

Shift the backlog toward the work required to make the game operationally
credible in production:

- resilient under unstable networks
- recoverable across server restarts and deploys
- contract-safe for external clients
- auditable at trust boundaries
- explicit about version compatibility

## Top-10 Production Readiness Order

1. `TASK-163` — Workstream: Production Readiness Hardening
2. `TASK-129` — Establish Continuous API Integration Testing Gate
3. `TASK-164` — Decide degraded-connectivity fallback model
4. `TASK-160` — Make match reconnect survive server restarts
5. `TASK-162` — Audit participant identity and action authorization boundaries
6. `TASK-165` — Verify first-class client compatibility across browser, Go, and generated SDKs
7. `TASK-161` — Plan release version bump for expanded external-client surface
8. `TASK-49` — Version Semantics Documentation for External Clients
9. `TASK-166` — Run production incident rollback and recovery readiness pass
10. `TASK-94` — Workstream: Horizontal Scaling Architecture

## Why This Order

- `TASK-129` comes first because new REST and WebSocket surfaces need a
  permanent compatibility gate before additional transport complexity lands.
- `TASK-164` must precede large transport work so the repo chooses one degraded
  connectivity direction instead of partially implementing several.
- `TASK-160` is explicitly elevated because reconnect that fails across server
  restarts is not production-ready session recovery.
- `TASK-162` and `TASK-165` harden the trust and compatibility boundaries that
  widened during external-client support.
- `TASK-161` and `TASK-49` ensure the release/version story is decided before
  transport or client-compatibility changes are announced as stable.
- `TASK-166` validates operational response after the contract and transport
  work are shaped.
- `TASK-94` remains important, but it should follow transport and contract
  hardening so scaling is built on stable semantics.

## Restart Survivability Observation

Production readiness now requires reconnect semantics to survive not just
client-side transport drops, but also:

- rolling server deploys
- process crashes
- cold restarts during an active reconnect window
- instances that lose in-memory socket/session state

This means "rejoin" can no longer depend solely on in-memory match state and
socket identity. Restart-safe recovery likely requires durable reconnect state,
transport-agnostic resume semantics, and recovery tests that include server
restart in the middle of a live match.

## Version Bump Plan

Versioning policy is governed by [docs/system/VERSIONING.md](/Users/mike/github.com/phalanxduel/game/docs/system/VERSIONING.md).

Current implementation version:

- `SCHEMA_VERSION = 0.5.0-rev.1`

Recommended target for the current production-readiness wave:

- `0.6.0` by default
- escalate to `1.0.0` only if restart-safe recovery or degraded fallback work
  introduces an incompatible external-client contract change

### Proposed sequencing

1. Planning and audit tasks do **not** bump `SCHEMA_VERSION`.
   This includes `TASK-161`, `TASK-162`, `TASK-163`, and `TASK-164` if they
   only produce decisions, docs, or tests without public contract changes.

2. Backward-compatible production-readiness additions should target a
   **MINOR bump**.
   Expected target: `0.6.0`.

   Examples:

   - additive REST fallback endpoints
   - additive reconnection metadata
   - additive compatibility/version fields in discovery surfaces
   - additive operator-facing diagnostics that do not break clients

3. Breaking transport or contract changes require a **MAJOR bump**.
   Expected target after `0.x`: `1.0.0`.

   Examples:

   - changing required fields in WebSocket or REST action payloads
   - changing reconnect handshake requirements incompatibly
   - removing or renaming public endpoints
   - invalidating existing external-client assumptions without compatibility mode

### External-client decision boundary

Treat the expanded external-client surface as one coordinated contract across:

- REST discovery and matchmaking endpoints in OpenAPI
- WebSocket join, rejoin, ACK, heartbeat, and message semantics in AsyncAPI
- generated REST SDKs under `sdk/go` and `sdk/ts/client`
- generated WebSocket message models under `sdk/go/ws` and `sdk/ts/ws`
- first-party runnable clients in `client/` and `clients/go/duel-cli/`

Version-bump guidance for that surface:

- choose `0.6.0` when recovery/fallback work stays additive, such as new
  optional metadata, additive HTTP recovery reads, additive REST action
  support, or new compatibility/version fields in discovery responses
- choose `1.0.0` when clients must change existing behavior incompatibly, such
  as a new required reconnect handshake field, renamed or removed endpoints,
  incompatible payload changes, or message semantics that older clients cannot
  safely ignore

### Coordinated release artifact set

When the bump is executed, update and ship these artifacts together:

- `shared/src/schema.ts` and every repo `package.json` version synchronized by
  `bin/maint/sync-version.sh`
- `CHANGELOG.md` for the release note boundary
- generated API contracts: `docs/api/openapi.json` and `docs/api/asyncapi.yaml`
- generated SDK outputs under `sdk/go`, `sdk/go/ws`, `sdk/ts/client`, and
  `sdk/ts/ws`
- external-client compatibility and versioning docs, including
  `docs/system/CLIENT_COMPATIBILITY.md` and `docs/system/VERSIONING.md`

### Release gate recommendation

Do not execute the version bump until these are true:

- `TASK-129` is complete so compatibility gating is permanent
- `TASK-160` is complete so reconnect survives restart/deploy scenarios
- `TASK-162` is complete or its findings are explicitly accepted
- `TASK-164` is complete so the degraded-connectivity direction is fixed
- `TASK-165` is complete so browser, Go, and generated SDK parity is verified
- `TASK-166` is complete or deferred explicitly by a human release decision
- `TASK-49` is complete before announcing the external-client surface as stable

### Practical recommendation

Treat the current production-readiness wave as a candidate `0.6.0` release by
default, and escalate to `1.0.0` only if the fallback/reconnect design forces
breaking external-client contract changes.
