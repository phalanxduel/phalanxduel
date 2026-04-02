---
id: TASK-171
title: Make engine runtime honor canonical rule modes and Special Start semantics
status: To Do
assignee: []
created_date: '2026-04-02 15:49'
updated_date: '2026-04-02 19:58'
labels: []
dependencies:
  - TASK-168
  - TASK-170
priority: high
ordinal: 4500
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
- [ ] #1 Rule-critical engine behavior is driven by the resolved canonical params surface, not a separate runtime-only override path.
- [ ] #2 `modeClassicAces=false` disables Ace invulnerability exactly as the canonical rules specify.
- [ ] #3 Damage persistence behavior follows the canonical contract for classic versus cumulative mode, including face-card clamp behavior.
- [ ] #4 No-attacker attack attempts and Special Start pass accounting behave exactly as the resolved rules contract specifies, with regression tests covering enabled and disabled paths.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code updated
- [ ] #2 Tests updated
- [ ] #3 Rules updated if needed
- [ ] #4 Cross-surface alignment verified
<!-- DOD:END -->
