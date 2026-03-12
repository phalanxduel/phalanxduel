# Phalanx Duel — Implementation Roadmap

> [!IMPORTANT]
> This roadmap has been migrated to **Backlog.md**.
> Active tasks are now located in `backlog/tasks/`.
> Use `rtk backlog` or `pnpm backlog board` to view current progress.

## Status Legend
- `[x]` Done
- `[>]` In Progress
- `[M]` Migrated to Backlog.md
- `[ ]` Pending

---

## Phase 0 — Project Scaffolding & Schema
- [x] pnpm monorepo with shared/, engine/, server/, client/
- [x] Zod schema pipeline (schema.ts → types.ts + JSON Schema snapshots)
- [x] CI gates: lint, typecheck, test, schema:check, rules:check
- [x] `pnpm build` step added to CI (engine/dist/ must be built before server tests)

## Phase 1 — Core Engine (Foundations)
- [x] `createInitialState` with deterministic card ID generation (`drawTimestamp` injection)
- [x] `DamageModeSchema` exported from `@phalanxduel/shared`
- [x] `modeClassicDeployment` derived from `damageMode === 'classic'`
- [x] DeploymentPhase / `system:init` action
- [x] AttackPhase / `player:attack` action
- [x] Suit effects: Diamond death shield, Club overflow doubling, Heart death shield, Spade LP doubling
- [x] Classic Aces: invulnerable unless attacked by another Ace at rank 0

## Phase 2 — Classic Face Card Destruction Eligibility
- [x] **PHX-FACECARD-001** — Classic Face Card Destruction Eligibility

### Rule Spec (RULES.md §11)

If `modeClassicFaceCards == true`:

| Attacker | Can Destroy       |
|----------|-------------------|
| Jack     | Jack              |
| Queen    | Jack, Queen       |
| King     | Jack, Queen, King |

- Number cards: always eligible to destroy any card
- Ineligible behavior:
  - Classic mode: halt carryover entirely (remaining = 0)
  - Cumulative mode: clamp target to 1 HP, halt carryover

**Damage origin is immutable across chain** — the original attacker's type determines eligibility at every step.

### Implementation Plan (TDD)

#### Step 1: Add rule ID to docs

```bash
# Add PHX-FACECARD-001 to docs/RULES.md rule ID list
# Add test stub to engine/tests/ (describe block with PHX-FACECARD-001)
```

**Step 2: Add `modeClassicFaceCards` flag to GameState**
- File: `shared/src/schema.ts` — add `modeClassicFaceCards: z.boolean().default(false)` to `GameStateSchema` (or derive from `damageMode === 'classic'` alongside `modeClassicDeployment`)
- Run `pnpm schema:gen` and commit artifacts
- File: `engine/src/state.ts` — set `modeClassicFaceCards: gameOptions.damageMode === 'classic'`

**Step 3: Write failing tests in `engine/tests/facecard.test.ts`**
- `describe('PHX-FACECARD-001: Classic Face Card Destruction Eligibility', ...)`
- Test cases:
  1. Jack attacker can destroy Jack defender
  2. Jack attacker CANNOT destroy Queen defender (halts, remaining=0)
  3. Jack attacker CANNOT destroy King defender (halts, remaining=0)
  4. Queen attacker can destroy Jack defender
  5. Queen attacker can destroy Queen defender
  6. Queen attacker CANNOT destroy King defender (halts, remaining=0)
  7. King attacker can destroy Jack, Queen, and King defenders
  8. Number card attacker can destroy any face card (Jack/Queen/King)
  9. Ineligible in cumulative mode: clamps to 1 HP instead of halting
  10. Face card ineligibility emits `'faceCardIneligible'` in `CombatLogStep.bonuses`

**Step 4: Add `'faceCardIneligible'` to CombatBonusTypeSchema**
- File: `shared/src/schema.ts` — add `'faceCardIneligible'` to `CombatBonusTypeSchema` enum
- Run `pnpm schema:gen`

**Step 5: Implement in `engine/src/combat.ts`**
- Modify `absorbDamage` signature to accept `attackerType: CardType` and `modeClassicFaceCards: boolean`
- Add eligibility check before the normal absorption path:
  ```typescript
  function isFaceCardEligible(attackerType: CardType, defenderType: CardType): boolean {
    if (defenderType !== 'jack' && defenderType !== 'queen' && defenderType !== 'king') return true;
    if (attackerType === 'king') return true;
    if (attackerType === 'queen') return defenderType === 'jack' || defenderType === 'queen';
    if (attackerType === 'jack') return defenderType === 'jack';
    return true; // number card: always eligible
  }
  ```
- If ineligible: classic mode → return `{ remainingHp: card.currentHp, overflow: 0, destroyed: false }` with bonus `'faceCardIneligible'`; cumulative mode → clamp to 1 HP (same as ace invulnerable path)
- Thread `attacker.card.type` + `modeClassicFaceCards` through `resolveColumnOverflow` → `absorbDamage`

#### Step 6: Thread flag through resolveAttack
- `resolveAttack` has access to `state.modeClassicFaceCards` and `attacker.card.type`
- Pass both down through `resolveColumnOverflow(baseDamage, attacker, ..., modeClassicFaceCards)`

#### Step 7: Rebuild and verify
```bash
pnpm --filter @phalanxduel/engine build
pnpm test
pnpm typecheck
pnpm lint
pnpm schema:check
pnpm rules:check
```

---

## Phase 3 — Pass Rules Enforcement [M]
- [M] **PHX-PASS-001** — Consecutive/total pass forfeit (RULES.md §16)
  - Migrated to: `backlog/tasks/task-1 - PHX-PASS-001-Consecutive-total-pass-forfeit.md`

## Phase 4 — Replay & Audit [M]
- [M] **PHX-REPLAY-001** — Per-turn hash computation
  - Migrated to: `backlog/tasks/task-2 - PHX-REPLAY-001-Per-turn-hash-computation.md`
- [M] **PHX-REPLAY-002** — Replay verification endpoint
  - Migrated to: `backlog/tasks/task-3 - PHX-REPLAY-002-Replay-verification-endpoint.md`

---

## Current State (as of 2026-02-24)

- All CI gates passing (lint, typecheck, test, schema:check, rules:check)
- 10/10 batch playthroughs pass (avgTurns=33)
- Default `damageMode` is `'classic'` (enables DeploymentPhase; empty battlefield loop fixed)
- Engine dist rebuilds correctly in CI (`pnpm build` step added)
- `drawTimestamp` injection ensures deterministic card IDs in replay tests

## Recommended Next Action

```text
/implement-rule PHX-FACECARD-001
```

Or manually: follow Phase 2 steps above in order, using `engine-dev` subagent.
