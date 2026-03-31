---
id: TASK-116
title: Document Game Logic and State Machine Constraints in API Specs
status: Done
assignee:
  - '@antigravity'
created_date: '2026-03-29 18:12'
updated_date: '2026-03-31 13:51'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies: []
priority: medium
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A schema-valid message can still be semantically invalid (e.g., a 'deploy' action sent during 'AttackPhase'). This task formalizes the state machine constraints in the API documentation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add 'description' fields to each WebSocket action schema in shared/src/schema.ts or docs/api/asyncapi.yaml explaining valid phases and requirements.
- [x] #2 Add Zod constraints (min/max/regex) to numeric and string fields in action schemas so they appear in the OpenAPI/AsyncAPI outputs.
- [x] #3 Add a top-level OpenAPI description that formally links to docs/RULES.md as the authoritative logic source for clients.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
All three ACs were implemented across `shared/src/schema.ts`, `server/src/app.ts`, and `docs/api/asyncapi.yaml`:

### AC #1 — Description fields on WebSocket action schemas
- Every variant in `ActionSchema` (deploy, attack, pass, reinforce, forfeit, system:init) has `.describe()` explaining valid phases and requirements (schema.ts L419-486).
- Every variant in `ClientMessageSchema` and `ServerMessageSchema` has `.describe()` with protocol-level docs (schema.ts L784-835, L747-782).
- `asyncapi.yaml` includes an action-to-phase mapping table (lines 24-32) documenting which actions are valid in which phases.

### AC #2 — Zod constraints on numeric and string fields
- All numeric fields use `.int().min().max()` with appropriate bounds (e.g., `playerIndex: z.number().int().min(0).max(1)`, `column: z.number().int().min(0).max(11)`).
- String fields use `.min().max()` (e.g., `playerName: z.string().trim().min(1).max(50)`) or `.regex()` (e.g., `face: z.string().regex(/^[A2-9TJQK]$/)`).
- These constraints propagate to generated JSON schemas via `toJsonSchema()` with `target: 'openApi3'`.

### AC #3 — Top-level OpenAPI description linking to RULES.md
- OpenAPI `info.description` in `app.ts` (L249-265) formally links to RULES.md as the authoritative logic source, lists discovery endpoints, and documents state machine constraints.
- AsyncAPI `info.description` in `asyncapi.yaml` (L5-45) also links to RULES.md and includes the full action-to-phase mapping.

## Verification

- `npx tsc --noEmit` passes cleanly in `shared/`.
- Working tree is clean (no uncommitted changes).
- JSON schema files in `shared/schemas/` are up-to-date with description and constraint metadata.
<!-- SECTION:NOTES:END -->
