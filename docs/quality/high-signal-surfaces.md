# High-Signal Surfaces

This document tells AI agents which repository areas require the most caution,
which signals matter most, and which tests or checks should be treated as
non-optional before changes are marked complete.

Use this together with:

- [Quality Gap Adoption Plan](./quality-gap-adoption-plan.md)
- [AI Agent Workflow](../tutorials/ai-agent-workflow.md)
- [Definition of Done](../reference/dod.md)

## How To Use This Guide

Before changing one of the surfaces below:

1. identify the primary risk signal
2. identify the minimum verification set
3. preserve the existing contract or boundary unless the task explicitly changes it
4. stop if the change would force a broader architecture rewrite

If a task touches more than one surface, use the highest-risk surface as the
verification anchor.

## Surface Guide

### `shared/src/schema.ts`

Why it is high-signal:

- it is the canonical Zod contract source for cross-package data
- many generated artifacts depend on it directly or indirectly
- contract drift can cascade into client, server, SDK, and docs surfaces

Most important signals:

- schema stability
- generated JSON/schema parity
- replay and wire-contract compatibility
- no local redefinition of shared shapes

Required checks:

- `pnpm --filter @phalanxduel/shared schema:gen`
- `bash scripts/ci/verify-schema.sh`
- `pnpm typecheck`
- targeted schema/contract tests when the contract changes

Stop conditions:

- the change introduces a new contract shape that is not already justified by a
  cross-package consumer
- the change needs a package-surface redesign rather than a schema update

### `docs/api/asyncapi.yaml`

Why it is high-signal:

- it documents the WebSocket protocol boundary
- it must stay aligned with shared schemas and runtime transport validation
- external and generated consumers rely on it for protocol understanding

Most important signals:

- message shape parity with `shared/src/schema.ts`
- transport reliability semantics
- message type coverage
- request/response contract drift

Required checks:

- `bash scripts/ci/verify-schema.sh`
- `pnpm docs:check`
- WebSocket contract tests in `server/tests/`
- any schema-generation test already used for `shared/schemas/*.json`

Stop conditions:

- the change cannot be expressed as a contract update without also changing the
  runtime shape
- the document drifts from generated schemas or runtime validation

### `server/src/app.ts`

Why it is high-signal:

- it is the transport boundary for gameplay and session traffic
- it owns inbound WebSocket validation and socket lifecycle behavior
- it is the last place to reject malformed client messages before they reach
  match logic

Most important signals:

- inbound message validation
- reconnect/rejoin reliability
- redaction and visibility boundaries
- transport rate limiting and connection safety

Required checks:

- `pnpm --filter @phalanxduel/server test`
- `pnpm verify:quick` for broader boundary-sensitive changes
- focused WebSocket tests in `server/tests/ws.test.ts`
- any contract tests tied to `AsyncAPI` or `shared/src/schema.ts`

Stop conditions:

- the change blurs transport validation into engine legality checks
- the change requires a transport or socket architecture rewrite

### `server/src/db/migrations.ts` and `server/src/db/check-migrations.ts`

Why they are high-signal:

- they are the schema drift gate for production deploys
- they preserve migration checksum integrity
- they are the source of truth for whether the deployed DB still matches the
  repo

Most important signals:

- migration ordering
- checksum stability
- pending migration detection
- drift detection against applied SQL

Required checks:

- `bash scripts/ci/verify-schema.sh`
- `pnpm --filter @phalanxduel/server test`
- `pnpm verify:quick` if the migration path or schema contract changes

Stop conditions:

- the change requires moving domain logic into the database
- the migration format no longer matches the checksum-ledger workflow

### `server/src/db/schema.ts`

Why it is high-signal:

- it defines the persistence model for matches, ratings, and audit records
- it sits at the boundary between domain state and durable storage
- schema mistakes here can break ratings, match recovery, or replay integrity

Most important signals:

- constraint coverage
- idempotent match-result writes
- public/private match visibility fields
- rating persistence and replay audit fidelity

Required checks:

- `pnpm --filter @phalanxduel/server test`
- DB-focused tests around match creation, join, result writeback, and migrations
- `bash scripts/ci/verify-schema.sh`

Stop conditions:

- the change would be better represented as a service-layer or repository change
- the schema change weakens integrity just to simplify the implementation

## Preferred Agent Behavior

For these surfaces, AI agents should:

- read this document before editing
- restate the primary risk signal in their first progress update
- name the exact verification commands before implementation begins
- avoid unrelated refactors
- preserve existing contracts, generated artifacts, and drift checks
- stop and report if the task wants an architecture rewrite instead of a narrow fix

## Escalation Rule

If a task repeatedly touches one of these surfaces, add or update a Backlog
task that describes the signal, risk, and required checks explicitly. Do not
rely on memory or one-off chat context for recurring high-risk areas.
