---
id: TASK-168
title: Resolve canonical rules contract drift for match parameters and lifecycle
status: To Do
assignee: []
created_date: '2026-04-02 15:47'
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
- [ ] #1 `docs/RULES.md` and `docs/api/media/RULES.md` explicitly agree on the canonical card ID shape, supported mode surface, and turn/event lifecycle terminology.
- [ ] #2 The canonical contract either documents or removes unsupported runtime-only behavior such as `modeQuickStart`, `startingLifepoints`, and any non-authoritative `gameOptions` fields.
- [ ] #3 Invalid configuration conditions only reference fields that actually exist in the supported config surface.
- [ ] #4 Shared schema descriptions and generated API/schema artifacts match the resolved rules wording with no contradictory rule text left behind.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Rules documents updated
- [ ] #2 Generated schema or API artifacts refreshed
- [ ] #3 Tests or verification updated
- [ ] #4 Cross-surface alignment verified
<!-- DOD:END -->
