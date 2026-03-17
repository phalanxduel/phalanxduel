---
id: TASK-44.3
title: Event Model Docs-Code Alignment
status: Done
assignee:
  - '@claude'
created_date: '2026-03-14 04:00'
updated_date: '2026-03-15 20:12'
labels:
  - docs
  - trust-critical
  - code-alignment
dependencies: []
references:
  - docs/RULES.md
  - docs/system/ARCHITECTURE.md
  - server/src/match.ts
parent_task_id: TASK-44
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`docs/RULES.md` documents a rich event model including `EventLog`, `TurnHash`, `stateHashBefore`, `stateHashAfter`, and `phaseTrace`. `docs/system/ARCHITECTURE.md` references `phaseTrace` as a documented feature. However, `server/src/match.ts` currently emits `events: []` (empty array) at runtime. This is a trust-critical gap: replay verification, audit trails, and determinism validation all depend on consistent event capture. Multiple reviews flagged this as a blocker for production readiness.

**Concern sources:**
- **Gordon**: Identified this as a trust-critical drift: "Docs describe rich EventLog; runtime emits `events: []`" and classified it as **HIGH RISK** affecting replay verification. Recommended deciding whether the model is aspirational or implemented, and adding verification checks.
- **Gemini CLI**: Noted "some server-side components (like the empty `events` array in `match.ts`) have not yet caught up to the spec's promises" as an implementation drift concern.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A clear decision is documented: the event model sections in `RULES.md` and `ARCHITECTURE.md` are either (a) updated to match actual runtime behavior, or (b) marked with explicit "FUTURE" banners indicating aspirational status, with a backlog task tracking implementation.
- [ ] #2 If aspirational, `RULES.md` event model sections have visible "FUTURE" markers that prevent contributors from treating undocumented behavior as implemented.
- [ ] #3 If implemented, `server/src/match.ts` emits events consistent with the documented model and `pnpm rules:check` validates alignment.
- [ ] #4 `docs/system/ARCHITECTURE.md` references to `phaseTrace` and event logging are aligned with the decision.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read `docs/RULES.md` event model sections and `server/src/match.ts` to confirm the current gap.
2. Consult with the project owner to decide: aspirational vs. implemented.
3. If aspirational:
   - Add "FUTURE" banners to the relevant sections in `RULES.md`.
   - Update `ARCHITECTURE.md` to clarify `phaseTrace` is planned, not implemented.
   - Create a follow-up backlog task for event model implementation.
4. If implemented:
   - Update `server/src/match.ts` to emit events matching the documented model.
   - Add engine/server tests for event emission.
   - Extend `pnpm rules:check` to validate runtime event emission matches docs.
5. Verify alignment between `RULES.md`, `ARCHITECTURE.md`, and runtime.
<!-- SECTION:PLAN:END -->

## Notes

<!-- SECTION:NOTES:BEGIN -->
**Pending decision (2026-03-15):** Gap confirmed. `RULES.md §17` documents a full OTel-inspired
event model (spans, traces, functional events). `RULES.md §20.2` promises `EventLog` + `TurnHash`
in every turn response. `ARCHITECTURE.md:62` states "turn phases always emit events even with no
state change." `server/src/match.ts:557,575` emits `events: []` — empty at runtime.

Two paths presented to project owner; awaiting direction:

- **Option A — Mark as Future** (docs change only): Add `FUTURE` banners to `RULES.md §17` and
  `§20.2`, clarify `ARCHITECTURE.md`, create follow-up backlog task for implementation.
- **Option B — Implement Now** (code change): Build event emission in engine, wire through
  `match.ts`, add tests, extend `pnpm rules:check` to validate.

Given the complexity of a full OTel span/trace system, Option A is recommended unless there is an
immediate requirement for replay verification or audit trail features.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Spec alignment (DoD §1)**: Rules, schemas, docs, and implementation do not knowingly drift at merge time. The event model documentation matches runtime behavior or is explicitly marked as future work.
- [ ] #2 **Fair play and trust (DoD §3)**: Replay, hash-chain, and audit implications are reviewed. No change misleads contributors about the system's actual verification capabilities.
- [ ] #3 **Verification (DoD §2)**: `pnpm rules:check` passes; if event model is implemented, engine/server tests validate event emission; if aspirational, "FUTURE" banners are verified present in docs.
- [ ] #4 **Accessibility (DoD §6)**: The decision and its rationale are documented so future contributors understand whether event logging is real or planned.
<!-- DOD:END -->
