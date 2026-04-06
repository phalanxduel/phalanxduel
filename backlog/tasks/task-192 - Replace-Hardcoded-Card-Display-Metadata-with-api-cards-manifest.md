---
id: TASK-192
title: Replace Hardcoded Card Display Metadata with /api/cards/manifest
status: To Do
assignee: []
created_date: '2026-04-06 13:30'
labels:
  - api
  - ui
  - refactor
milestone: m-1
dependencies:
  - TASK-121
references:
  - client/src/cards.ts
  - client/src/game.ts
  - client/src/game-preact.tsx
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The client currently hardcodes card display metadata — suit colours, suit symbols, face detection, weapon/defence classification, and card labels — in `client/src/cards.ts`. This was descoped from TASK-121 (which tackled move-legality gating via validActions) because display metadata is a separate concern.

The `/api/cards/manifest` endpoint already exists on the server and returns the full card catalogue with all metadata. The UI should fetch this manifest once at startup and use it as the single source of truth for all card display logic, eliminating the hardcoded `suitColor`, `suitSymbol`, `isFace`, `isWeapon`, and `cardLabel` helpers.

Key observations carried over from TASK-121:
- `isWeapon` is still used in `game-preact.tsx` (`CellContent`) for the ATK/DEF label and the x2 multiplier badge — these should derive from manifest data
- `isFace` is used in both renderers to add the `is-face` CSS class
- `suitColor` and `suitSymbol` are used extensively in cell and hand rendering
- `cardLabel` is used in the battle log and stats block
- The manifest fetch should happen once (on connection open or app init) and be stored in a module-level or AppState cache; subsequent renders read from cache with a synchronous fallback
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Fetch /api/cards/manifest once at startup (or on first connection open) and store the result in a client-side cache.
- [ ] #2 Replace suitColor, suitSymbol, isFace, isWeapon, and cardLabel in client/src/cards.ts with lookups against the manifest cache.
- [ ] #3 Both renderers (game.ts and game-preact.tsx) derive all card display metadata from the manifest — no hardcoded suit/face constants remain in rendering code.
- [ ] #4 If the manifest has not yet loaded, rendering falls back gracefully (e.g. empty strings / neutral colours) without throwing.
- [ ] #5 Add or update client tests to cover manifest-driven rendering paths.
<!-- AC:END -->
