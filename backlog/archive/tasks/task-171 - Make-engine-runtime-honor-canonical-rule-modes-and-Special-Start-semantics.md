---
id: TASK-171
title: Make engine runtime honor canonical rule modes and Special Start semantics
status: Done
assignee:
  - '@codex'
created_date: '2026-04-02 15:49'
updated_date: '2026-04-02 20:30'
labels: []
dependencies:
  - TASK-168
  - TASK-170
priority: high
ordinal: 87000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Context
The engine currently applies several rule-critical behaviors without fully honoring the canonical match params surface. Ace invulnerability is always active regardless of `modeClassicAces`, cumulative behavior is keyed off `gameOptions.damageMode` instead of `params.modeDamagePersistence`, and attack attempts with no attacker are rejected before the pass / Special Start rules can run.

## Evidence
- Rule IDs: R-6, R-7, R-10, R-12, R-16, R-19
- Audit sections: Phase 3, Phase 4, Phase 5, Phase 6
- Code: `engine/src/combat.ts`, `engine/src/state.ts`, `engine/src/turns.ts`
- Runtime proof on 2026-04-02:
  - `modeClassicAces=false` still produced `aceInvulnerable` and left the Ace alive.
  - `params.modeDamagePersistence='cumulative'` still behaved as classic when `gameOptions` did not also say cumulative.
  - An attack with no front-row attacker threw `No card at attacker position` and left pass counters unchanged.

## Impact
- determinism
- integrity
- fairness
- exploit-risk

## Metadata
- Surface: engine, shared, tests
- Type: bug, determinism, consistency
- Priority: critical
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Rule-critical engine behavior is driven by the resolved canonical params surface, not a separate runtime-only override path.
- [x] #2 `modeClassicAces=false` disables Ace invulnerability exactly as the canonical rules specify.
- [x] #3 Damage persistence behavior follows the canonical contract for classic versus cumulative mode, including face-card clamp behavior.
- [x] #4 No-attacker attack attempts and Special Start pass accounting behave exactly as the resolved rules contract specifies, with regression tests covering enabled and disabled paths.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Make createInitialState() and downstream engine runtime decisions treat canonical matchParams as authoritative for rule-critical modes, keeping gameOptions only as compatibility input when canonical params are absent.
2. Update combat resolution so Ace invulnerability honors state.params.modeClassicAces, and cumulative/classic damage behavior keys off state.params.modeDamagePersistence instead of state.gameOptions.damageMode.
3. Update attack validation/execution so no-attacker attack attempts can flow through the canonical Special Start semantics instead of being rejected too early, while preserving the normal invalid-action behavior when Special Start is not active.
4. Add regression coverage for modeClassicAces=false, canonical cumulative damage persistence, and no-attacker attack/pass accounting under both Special Start enabled and disabled conditions.
5. Run targeted engine tests first (facecard, pass-rules, state-machine, and adjacent rules coverage), then broaden to engine build and additional impacted suites if the targeted pass is clean.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-02: Switched engine rule-critical mode authority to canonical `state.params` by deriving cumulative/classic damage behavior from `modeDamagePersistence`, honoring `modeClassicAces` in combat resolution, and only using `gameOptions` as compatibility input when canonical match params are absent during bootstrap.

2026-04-02: No-attacker `attack` now follows pass-flow semantics instead of failing validation early. Outside the Special Start window it increments pass counters like a pass; inside the Special Start window it advances turn flow without incrementing pass counters while the zero-deployment window remains open.

2026-04-02 verification: `rtk pnpm --filter @phalanxduel/engine exec vitest run tests/facecard.test.ts tests/pass-rules.test.ts tests/state-machine.test.ts tests/rules-coverage.test.ts`; `rtk pnpm --filter @phalanxduel/engine exec vitest run tests/quick-start.test.ts tests/simulation.test.ts`; `rtk pnpm --filter @phalanxduel/engine build`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned engine runtime behavior with canonical match params by making Ace invulnerability and damage persistence honor `state.params`, and by treating no-attacker attack attempts as pass-flow actions with Special Start-aware pass accounting. Added regression coverage for `modeClassicAces=false`, canonical cumulative damage persistence, and no-attacker attack behavior inside and outside the Special Start window.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code updated
- [ ] #2 Tests updated
- [ ] #3 Rules updated if needed
- [ ] #4 Cross-surface alignment verified
<!-- DOD:END -->
