---
title: "Production Support Contract"
description: "Canonical inventory, ownership, health semantics, and release evidence for every supported Phalanx Duel production subsystem."
status: active
updated: "2026-07-14"
audience: operator
authoritative_source: ".github/workflows/pipeline.yml, fly.production.toml"
related:
  - docs/ops/runbook.md
  - docs/ops/deployment-checklist.md
  - docs/deployment.md
  - docs/architecture/principles.md
  - docs/reference/environment-variables.md
---

# Production Support Contract

This document defines what “Phalanx Duel production” includes. It is the
canonical scope for releases, operational audits, incidents, and claims that
the whole system is operational.

Production is the only deployed game environment. Staging is retired and is
not a release prerequisite, fallback, health target, or supported endpoint.

## Classification

- **Required** — must be healthy before the whole system may be certified
  operational.
- **Optional** — supported for users or developers, but its absence does not
  make the production game unavailable.
- **Retired** — intentionally unsupported and forbidden from active release or
  health workflows.

## Supported System Matrix

| ID | Class | Subsystem | Production path | Owner | Required proof |
| --- | --- | --- | --- | --- | --- |
| `PD-PROD-001` | Required | Browser client and static assets | `https://play.phalanxduel.com/` | Client | HTML and hashed JS/CSS assets return `200`; browser smoke and accessibility checks pass |
| `PD-PROD-002` | Required | REST and WebSocket game server | `https://play.phalanxduel.com`, `wss://play.phalanxduel.com/ws` | Server | `/health` is live, OpenAPI loads, WebSocket upgrades, and a controlled match completes |
| `PD-PROD-003` | Required | PostgreSQL persistence and event bus | Private `DATABASE_URL` | Server/Ops | `/ready` performs a bounded database query; match snapshot and event log persist |
| `PD-PROD-004` | Required | Deterministic engine, replay, spectator, and reconnect | Game server APIs and WebSocket protocol | Engine/Server | CI trust gates pass; production synthetic evidence verifies fingerprint, replay, visibility, and rejoin semantics |
| `PD-PROD-005` | Required | Operator admin surface | Authenticated production-private or protected path defined by the active admin architecture | Server/Admin | Anonymous access is rejected; an authenticated harmless read succeeds; mutations are audited |
| `PD-PROD-006` | Required | OpenTelemetry collector and centralized LGTM path | Private OTLP collector boundary | Ops | Collector is reachable, export succeeds, and a correlated gameplay trace is queryable in LGTM |
| `PD-PROD-007` | Required | Public MCP agent gateway | `https://phalanxduel-mcp-public.fly.dev/mcp` | MCP/Ops | Health succeeds and the public tool inventory contains no admin mutations |
| `PD-PROD-008` | Required | Private MCP admin gateway | Fly private network or operator proxy only | MCP/Ops | No public route exists; missing or invalid bearer tokens are rejected; authorized read succeeds |
| `PD-PROD-009` | Required | Transactional email | Postmark through the server email provider | Server/Ops | Provider configuration is present and a controlled test message reaches the operator test inbox |
| `PD-PROD-010` | Required | Public product site and operational documentation | `https://phalanxduel.com/` and the GitHub wiki | Docs/Ops | Site deployment is green, public version context matches the game, and links resolve |
| `PD-PROD-011` | Required | Generated Go and TypeScript SDK artifacts | GitHub Actions artifacts for the release SHA | SDK/Release | Compatibility tests pass and both artifacts publish from the released contract |
| `PD-PROD-012` | Required | Immutable release, rollback, and recovery path | GHCR image promoted to `phalanxduel-production` | Release/Ops | CI, security, build, promotion, health, rollback, and reconnect evidence refer to the same release SHA |
| `PD-PROD-013` | Optional | Go duel CLI | `clients/go/duel-cli/` | Clients | Compatibility and local client checks pass against the published API contract |
| `PD-PROD-014` | Retired | Staging deployment | None | Release/Ops | No active job, endpoint probe, approval gate, or operator prerequisite targets staging |
| `PD-PROD-015` | Retired | Sentry runtime and release tooling | None | Ops | Active runtime, workflow, secret, and documentation surfaces contain no Sentry dependency |
| `PD-PROD-016` | Retired | Fly source deployment | None | Release/Ops | Production promotion deploys the tested GHCR image, never a second source build |

## Health Semantics

Health claims use four states:

| State | Meaning |
| --- | --- |
| `PASS` | Direct evidence satisfies the subsystem's required proof. |
| `DEGRADED` | The subsystem serves some function but has a known dependency, correctness, or observability failure. |
| `FAIL` | Direct evidence shows the subsystem cannot satisfy its supported contract. |
| `NOT_TESTED` | No current direct evidence exists. Configuration alone is not evidence of health. |

Endpoint roles remain distinct:

- `/health` proves that the web process is alive.
- `/ready` proves that the game can accept traffic and that required persistence
  is reachable.
- Dependency assurance proves actual connectivity and recent successful work;
  the presence of an environment variable is never sufficient.

The whole system may be described as operational only when every **Required**
row is `PASS`. Optional rows must be reported but do not block certification.
Retired rows must remain absent from active workflows.

## Release Contract

The canonical production path is:

1. CI builds, tests, audits, and generates contracts from one Git SHA.
2. CI builds and pushes a content-addressed GHCR image for that SHA.
3. The production environment gate authorizes promotion.
4. Fly deploys that tested image to `phalanxduel-production`.
5. Operators verify release identity, health, readiness, gameplay, persistence,
   and required external services.

Production must not rebuild from source during promotion. Rollback selects a
known-good image that remains compatible with live schema and persisted match
state; rollback never rewinds the database.

## Current Remediation Boundary

This contract defines required outcomes; it does not hide current gaps.
`TASK-345` owns remediation and final certification. Until its dependent tasks
are complete, OTel, admin, MCP, and email may remain `DEGRADED`, `FAIL`, or
`NOT_TESTED`, and the system must not be described as entirely operational.

### Temporary OTel containment (2026-07-14)

`PD-PROD-006` is currently `FAIL` and deliberately isolated from gameplay:

- the production collector rejected its configuration because the bundled
  collector no longer supports the deprecated `logging` exporter
- a redacted connectivity probe showed the configured LGTM upstream was not
  reachable from the Fly runtime
- the `otel` Fly process group is scaled to zero and absent from
  `fly.production.toml`
- server export is disabled with `OTEL_SDK_DISABLED=true`; production browser
  telemetry is also disabled by default
- `/health` and `/ready` remain gameplay liveness/readiness signals and must not
  fail solely because telemetry is unavailable

Re-enable OTel only when all of these are directly proven:

1. the collector configuration validates against the exact bundled binary
2. Fly can reach an authenticated, centralized LGTM OTLP endpoint
3. the receiver is private and the collector has passing health/restart checks
4. a correlation-stable synthetic gameplay trace is queryable in LGTM
5. the kill switch is removed during a controlled zero-active-match deployment,
   followed by release-identity, health, readiness, and trace verification

Containment makes the game playable; it does not make the whole-system
operational claim true. `TASK-345.11` owns containment and `TASK-345.02` owns
the eventual collector restoration.

## Verification

Run the executable drift check with:

```bash
rtk pnpm verify:production-contract
```

The verifier binds this document to the active pipeline, Fly app identity,
health paths, and published API origins so configuration drift fails CI.
