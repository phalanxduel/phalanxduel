---
id: TASK-382
title: Unlockable dual-loop card cosmetic set
status: In Progress
assignee:
  - Codex
created_date: '2026-07-31 03:56'
updated_date: '2026-07-31 04:16'
labels:
  - client
  - cosmetics
  - multiplayer
  - visual-design
dependencies: []
documentation:
  - docs/testing.md
  - docs/reference/qa-runners.md
  - docs/system/UI_COMPONENT_TAXONOMY.md
priority: medium
type: feature
ordinal: 249800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create an original unlockable card-back and card-theme cosmetic inspired by microtonal math-rock, looping structures, dual anonymous identities, and Saguenay’s industrial landscape. Each participant’s equipped cosmetic must be visible to the opposing player in the appropriate public/redacted card surfaces without copying existing Angine de Poitrine artwork, logos, or protected visual marks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authenticated players can unlock and equip the new cosmetic set, and the selection persists across sessions.
- [ ] #2 An opponent sees the equipped card-back design on the owner’s redacted hand cards during a match.
- [ ] #3 Each participant’s equipped card theme is rendered consistently on public card surfaces for both players without revealing hidden card identities.
- [ ] #4 Players without the cosmetic, guests, and legacy match data continue to use the default theme safely.
- [ ] #5 The artwork is original and evokes the requested dual-loop microtonal/math-rock concept without reproducing existing artist artwork or logos.
- [ ] #6 Automated protocol, client, and end-to-end tests cover ownership, selection, opponent visibility, redaction, fallback behavior, and playable match flow.
- [ ] #7 Relevant player-facing and developer documentation describes the cosmetic and its unlock/equip behavior.
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
1. Establish the original Dual Loop visual language and reusable cosmetic registry. 2. Use the existing entitlement system to award the card set after an authenticated player's first completed match. 3. Persist a validated equipped card-skin selection on the user account. 4. Project both players' public cosmetic identifiers beside, but outside, deterministic GameState. 5. Render the owner's theme on public battlefield cards and their hidden opponent-hand backs without exposing card identity. 6. Add settings UX, protocol/server/client tests, deterministic captures, and documentation. 7. Run the playability gate and full repository verification.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-07-31 04:16
---
Implementation decision: Dual Loop is an earned cosmetic unlocked after the first completed match, not a paid SKU. This uses the existing cosmetic product and entitlement tables while avoiding an unrequested monetization decision. Equipped cosmetic IDs are public presentation metadata and remain outside GameState hashes/replays.
---
<!-- COMMENTS:END -->
