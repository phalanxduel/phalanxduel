---
id: TASK-32
title: JSON Schema for Public Event Envelopes
status: Done
assignee: []
created_date: ''
updated_date: '2026-03-18 23:30'
labels: []
dependencies: []
priority: high
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The repo has rich Zod schemas and event payloads, but external tooling still
lacks one published JSON-schema contract for the public event envelopes. This
task closes that gap so clients, integrations, and docs all reference the same
machine-readable contract.

## Problem Scenario

Given another tool or downstream consumer wants to validate public Phalanx Duel
events, when they inspect the repo today, then they see the internal shared
schema definitions but not a single published JSON-schema artifact or guide for
the public event envelope.

## Planned Change

Publish a JSON-schema representation of the public event envelopes and document
how it maps to the existing shared schema. The plan keeps the shared schema as
the canonical source while producing a consumer-facing artifact that external
tools can validate against directly.

## Delivery Steps

- Given the existing shared schema, when the public event surface is selected,
  then the canonical public envelopes are distinguished from internal telemetry
  or private admin payloads.
- Given schema generation or publication, when the artifact is produced, then it
  is linked from docs and easy to consume.
- Given future API changes, when the schema is updated, then its relationship to
  tests and documentation is explicit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- Given the public event model, when this task is complete, then there is a
  published JSON schema artifact or document that external consumers can use.
- Given internal telemetry and private payloads, when the schema is documented,
  then the public event contract is clearly separated from non-public data.
- Given future event-shape changes, when the schema is maintained, then the docs
  and validation path point to the same canonical contract.

## References
- `archive/ai-reports/2026-03-11/antigravity_sonnet_report/production_readiness_report.md` (L53)
- `archive/ai-reports/2026-03-11/cursor-gpt-5.2/2026-03-10__production-readiness-report.md` (L135)
- `shared/src/schema.ts`

- [x] #1 Standalone JSON Schema guide created in docs/api/EVENT_SCHEMAS.md
- [x] #2 Primary public envelopes (turn-result, match-event-log) explicitly documented
- [x] #3 Link to schema guide integrated into root docs and OpenAPI UI
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Created `docs/api/EVENT_SCHEMAS.md` guide for external consumers.
- Explicitly documented `turn-result.schema.json` and `match-event-log.schema.json` as the primary public contracts.
- Added a link to the schema guide in the root `docs/README.md`.
- Integrated the schema guide link into the Swagger/OpenAPI UI description in `server/src/app.ts`.
- Verified that `pnpm schema:gen` produces valid JSON Schemas for the targeted envelopes.
- All project-level quick checks passed.

Verification evidence:
- `pnpm check:quick` passed.
- `shared/schemas/turn-result.schema.json` and `shared/schemas/match-event-log.schema.json` are present and up-to-date.
- Link verified in OpenAPI UI configuration.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Behavior matches specified Rule IDs or Schema definitions
- [x] #2 pnpm check:quick passes locally
- [x] #3 Targeted tests cover the changed paths (N/A for docs/artifacts)
- [x] #4 No orphan TODO or FIXME comments remain without linked tasks
- [x] #5 Verification evidence recorded in task summary
- [x] #6 Operational docs and runbooks updated for surface changes
- [x] #7 Moved to Human Review for AI-assisted PR-backed work
<!-- DOD:END -->
