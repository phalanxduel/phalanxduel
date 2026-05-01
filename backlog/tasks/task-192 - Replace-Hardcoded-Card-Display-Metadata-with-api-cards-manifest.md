---
id: TASK-192
title: Replace Hardcoded Card Display Metadata with /api/cards/manifest
status: In Progress
assignee: []
created_date: '2026-04-06 13:30'
updated_date: '2026-05-01 16:47'
labels:
  - api
  - ui
  - refactor
milestone: Post-Promotion Hardening
dependencies:
  - TASK-121
references:
  - client/src/cards.ts
  - client/src/game.ts
  - client/src/game-preact.tsx
priority: low
ordinal: 8110
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. **Audit call sites** — map every usage of `suitColor`, `suitSymbol`, `isFace`, `isWeapon`, `cardLabel` across `client/src/cards.ts`, `game.ts`, and `game-preact.tsx`. Confirm the full surface before touching any code.
2. **Fetch and cache manifest** — add a `fetchCardsManifest()` function in a new `client/src/manifest.ts` module. Call it once on app init (before first render). Store the result in a module-level cache; expose a synchronous `getManifest()` accessor that returns the cache or an empty fallback so renderers never throw on cold start.
3. **Replace helpers in cards.ts** — rewrite `suitColor`, `suitSymbol`, `isFace`, `isWeapon`, and `cardLabel` to delegate to `getManifest()` lookups. Keep the same exported function signatures so all call sites in `game.ts` and `game-preact.tsx` require zero changes at this step. Run `pnpm typecheck && pnpm test:run:all` after this step alone — no renderer changes yet.
4. **Verify renderers are unaffected** — because TASK-121 removed all phase/suit-based *gating* logic and the renderers now only call cards.ts helpers for *display*, step 3 should produce zero renderer diffs. Confirm with `git diff client/src/game.ts client/src/game-preact.tsx` — expect no changes.
5. **Update tests** — add unit tests for the manifest cache module and for each replaced helper (mock the manifest response; assert correct display values are returned). Update any existing tests in `client/tests/` that supply hardcoded suit/card expectations to use manifest-derived values.
6. **Graceful fallback test** — add a test that calls `suitColor` / `cardLabel` before the manifest loads and asserts neutral/empty values are returned without throwing.
7. **Full verification** — `pnpm build && pnpm typecheck && pnpm lint && pnpm test:run:all && pnpm docs:artifacts`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Regression risk from TASK-121**: TASK-121 removed hardcoded *gating* logic (phase checks, row checks, suit checks) from both renderers and replaced them with `validActions` lookups. The helpers in `cards.ts` (`isWeapon`, `isFace`, etc.) were intentionally left in place as *display-only* concerns. TASK-192 must not reintroduce any gating logic into `cards.ts` — it replaces the *data source* for display helpers only. The exported function signatures must remain identical so the renderers need no changes beyond step 3.

**Sequencing constraint**: Do not modify `game.ts` or `game-preact.tsx` until the manifest cache and updated `cards.ts` helpers are confirmed correct by tests. This ensures TASK-121's validActions gating is never disturbed.
<!-- SECTION:NOTES:END -->
