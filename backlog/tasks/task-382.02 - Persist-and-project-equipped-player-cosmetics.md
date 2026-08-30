---
id: TASK-382.02
title: Persist and project equipped player cosmetics
status: To Do
assignee: []
created_date: '2026-07-31 03:56'
updated_date: '2026-07-31 04:16'
labels:
  - server
  - shared
  - cosmetics
  - visibility
dependencies: []
parent_task_id: TASK-382
priority: medium
type: task
ordinal: 251800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add the player-facing ownership and equipment behavior needed for unlockable card cosmetics. A participant’s equipped cosmetic must survive authentication/session boundaries and be projected to other match viewers only as public presentation metadata, with safe defaults for guests and legacy records.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An authenticated player can unlock and equip the dual-loop cosmetic through the supported player progression/customization surface.
- [ ] #2 Cosmetic ownership and the equipped selection persist across sessions and reject unowned selections.
- [ ] #3 Match projections expose each participant’s equipped public cosmetic identifier to players and spectators without exposing hidden-card data or private profile fields.
- [ ] #4 Guests, unequipped users, unknown cosmetic identifiers, and legacy persisted records resolve to the default cosmetic.
- [ ] #5 Shared schemas, generated contracts, migrations, server tests, and redaction tests cover the new behavior.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add stable shared cosmetic IDs and public player-cosmetic schemas. 2. Add a migration for the Dual Loop catalog row and equipped-card-skin user preference. 3. Award the entitlement idempotently after an authenticated player's first completed match. 4. Add authenticated loadout/inventory and equip endpoints that reject unowned skins. 5. Load equipped skins into match player metadata and attach them to every player/spectator TurnViewModel. 6. Preserve default behavior for guests, bots, legacy payloads, and unknown IDs. 7. Cover schema, API, award, projection, and redaction behavior with tests.
<!-- SECTION:PLAN:END -->
