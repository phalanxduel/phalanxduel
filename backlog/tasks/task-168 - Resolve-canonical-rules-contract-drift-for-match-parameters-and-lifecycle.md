---
id: TASK-168
title: Resolve canonical rules contract drift for match parameters and lifecycle
status: Human Review
assignee: []
created_date: '2026-04-02 15:47'
updated_date: '2026-04-02 16:10'
labels: []
dependencies: []
priority: high
ordinal: 1500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Context
The rules audit found multiple contradictions between the canonical rules docs, shared schema descriptions, and implemented runtime surface. The highest-signal drift points are:
- Card ID format in the rules docs uses `[CardType]`, while the shared schema comment uses `[DrawIndex]` and the engine emits draw-index-based IDs.
- The rules docs call out `deckCount == 0` as an invalid configuration even though the public/shared match configuration shape has no `deckCount` field.
- The rules docs describe an 8-step lifecycle in §4 but a 7-phase lifecycle in the event model sections.
- Runtime-only surfaces such as `modeQuickStart`, `gameOptions.damageMode`, and `startingLifepoints` are present in code/schema but not coherently classified in the canonical rules.

## Evidence
- Rule IDs: R-2.1, R-3.1, R-3.2, R-3.3, R-4, R-17, R-18
- Audit sections: Phase 1, Phase 7, Phase 8
- Docs: `docs/RULES.md`, `docs/api/media/RULES.md`
- Code: `shared/src/schema.ts`, `engine/src/state.ts`, `engine/src/replay.ts`

## Impact
- maintainability
- consistency
- determinism

## Metadata
- Surface: docs, shared, engine, server
- Type: rules-gap, consistency, documentation
- Priority: high
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `docs/RULES.md` and `docs/api/media/RULES.md` explicitly agree on the canonical card ID shape, supported mode surface, and turn/event lifecycle terminology.
- [x] #2 The canonical contract either documents or removes unsupported runtime-only behavior such as `modeQuickStart`, `startingLifepoints`, and any non-authoritative `gameOptions` fields.
- [x] #3 Invalid configuration conditions only reference fields that actually exist in the supported config surface.
- [x] #4 Shared schema descriptions and generated API/schema artifacts match the resolved rules wording with no contradictory rule text left behind.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-02: Started implementation pass to align canonical rules contract and glossary with schema/runtime evidence before downstream tasks.
2026-04-02: Aligned the canonical rules, glossary, shared schema descriptions, generated JSON schemas, and server OpenAPI snapshot around the same contract: draw-index card IDs, 8-phase terminology, compatibility-only `gameOptions` inputs, and v1 battlefield visibility semantics.

## Verification

- `rtk pnpm --filter @phalanxduel/shared schema:gen`
- `rtk pnpm --filter @phalanxduel/shared build`
- `rtk pnpm --filter @phalanxduel/server exec vitest run tests/openapi.test.ts -u`
- `rtk pnpm exec tsx scripts/ci/verify-doc-fsm-consistency.ts`

## Verification Notes

- `rtk bash scripts/ci/verify-schema.sh` confirmed the generated schema artifacts now match the updated contract, but it reported expected uncommitted changes until those artifacts are committed.
- `rtk pnpm docs:check` reached full artifact generation when run outside the sandbox, but the final check still reported an unrelated pre-existing `docs/system/KNIP_REPORT.md` drift tied to `server/src/db/match-repo.ts`.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Rules documents updated
- [x] #2 Generated schema or API artifacts refreshed
- [x] #3 Tests or verification updated
- [x] #4 Cross-surface alignment verified
<!-- DOD:END -->
