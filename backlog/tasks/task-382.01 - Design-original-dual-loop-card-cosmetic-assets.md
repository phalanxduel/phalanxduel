---
id: TASK-382.01
title: Design original dual-loop card cosmetic assets
status: In Progress
assignee:
  - Codex
created_date: '2026-07-31 03:56'
updated_date: '2026-07-31 04:07'
labels:
  - client
  - assets
  - visual-design
dependencies: []
parent_task_id: TASK-382
priority: medium
type: task
ordinal: 250800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Produce the original card-back artwork and visual theme specification for the dual-loop cosmetic. The design should translate microtonal geometry, intertwined loop structures, two anonymous creative identities, and Saguenay industrial atmosphere into a readable competitive-card treatment without copying existing artist artwork or logos.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A production-ready card-back asset and theme specification are added in the repository’s established asset formats and dimensions.
- [ ] #2 The card back remains recognizable at opponent-hand size and across desktop and mobile layouts.
- [ ] #3 The theme defines a coherent treatment for public card surfaces while preserving suit, face, value, health, and interaction readability.
- [ ] #4 The assets and design are original and do not reproduce existing Angine de Poitrine artwork, logos, typography, or photographs.
- [ ] #5 A deterministic design-baseline capture documents the new cosmetic in representative match states.
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
1. Preserve the generated original 5:7 card-back source as an optimized project asset under `client/public/images/card-backs/`.
2. Define the stable cosmetic identifier, visual palette, surface tokens, scale/readability rules, and originality constraints in the canonical cosmetics reference.
3. Reuse the existing layered `PhxCard` structure and CSS custom-property system; do not fork card markup or alter gameplay semantics.
4. Validate the optimized asset dimensions/format and inspect it at full and opponent-hand scale.
5. Complete deterministic design-baseline capture after the consuming multiplayer rendering slice is wired, so the capture exercises the actual `CardView` rather than a disposable mock.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Playability gate baseline: `rtk pnpm qa:playthrough:verify` passed 12/12 scenarios on 2026-07-30 local time (classic/cumulative, LP 1/20/100), with zero warnings, errors, or missing manifests. UI/design work is unblocked.

Context Hunter L2 brief — reviewed `client/src/game.tsx`, `client/src/style.css`, `client/src/cards.ts`, `client/src/manifest.ts`, the UI component taxonomy, QA/design-capture docs, `server/src/routes/store.ts`, entitlement/profile schemas, observer projection, Rules §21, ADR-017, and production card proportions. Closest analog: the layered `PhxCard` with semantic `data-component="CardView"` markers and CSS custom properties. Reusable surfaces: existing cosmetic product/entitlement tables, public `handCount`, observer projection, and design-baseline tooling. Main risks: opponent hands currently render only as counts; cosmetics must remain presentation metadata outside deterministic `GameState` hashes; unknown/legacy values need safe fallback; the requested artist inspiration must remain original and avoid copied masks, logos, photographs, or album compositions. No existing `artifacts/design-baseline/` directory was present. Generated asset source used built-in image generation and was optimized to 1000×1400 WebP.
<!-- SECTION:NOTES:END -->
