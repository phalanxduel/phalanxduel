---
title: "Phalanx Duel — Rule Traceability Matrix"
date: "2026-04-06"
source: "docs/RULES.md v1.0 (Final)"
---

# Rule Traceability Matrix

Rules extracted from `docs/RULES.md` (54 distinct rules). Status: IMPLEMENTED / PARTIAL / MISSING / DIVERGENT.

| Rule ID | Summary | Source § | Implementation | Tests | Status | Notes |
|---------|---------|----------|---------------|-------|--------|-------|
| RULE-001 | Match must include `specVersion: "1.0"` and all canonical params | §3, §3.2 | `shared/src/schema.ts:496` | schema validation | IMPLEMENTED | |
| RULE-002 | Strict mode: all top-level params must match `classic.*` template exactly | §3.1.1 | `schema.ts:536-575` | No rejection test | PARTIAL | No test exercises strict-mode violation |
| RULE-003 | Hybrid mode: `classic.*` serves as defaults; top-level may override | §3.1.2 | `schema.ts:611` (`normalizeCreateMatchParams`) | No dedicated test | PARTIAL | Hybrid path untested |
| RULE-004 | Manual mode (`classic.enabled == false`): top-level params govern entirely | §3.1.3 | `createInitialState` with `classicDeployment:false` | `state-machine.test.ts:431` | IMPLEMENTED | |
| RULE-005 | Board geometry: `rows * columns ≤ 48` | §3.3 | `schema.ts:501-508` | No negative test | PARTIAL | |
| RULE-006 | `maxHandSize` cannot exceed `columns` | §3.3 | `schema.ts:510-515` | No dedicated test | PARTIAL | |
| RULE-007 | `initialDraw = (rows * columns) + columns` | §3.3 | `schema.ts:518-525` | No dedicated test | PARTIAL | |
| RULE-008 | Card scarcity: `initialDraw` ≤ deck size minus 4 reserve | §3.3 | `schema.ts:527-533` | No dedicated test | PARTIAL | |
| RULE-009 | 8-phase turn lifecycle (strict order) | §4 | `state-machine.ts:216-226` | `state-machine.test.ts` full lifecycle | IMPLEMENTED | |
| RULE-010 | Phases always emit events, even with no state changes | §4 | `turns.ts:524-531` | `state-machine.test.ts:243-536` | IMPLEMENTED | |
| RULE-011 | Classic deployment: alternate 1 card until board full and hand = maxHandSize | §5 | `turns.ts:287-328` (`applyDeploy`) | `state-machine.test.ts:286-311` | IMPLEMENTED | |
| RULE-012 | Deployment ends when second player completes final required deployment | §5 | `turns.ts:309` (`p0Full && p1Full` guard) | `state-machine.test.ts:310` | IMPLEMENTED | |
| RULE-013 | Valid attack: attacker at rank 0 of attacking column; defending column valid | §6 | `turns.ts:166-175` (`validateAction` attack) | `state-machine.test.ts:544-568` | PARTIAL | No test for non-front-row attacker rejection |
| RULE-014 | No attacker (outside SpecialStart) counts as pass | §6 | `turns.ts:337-349` (`applyAttack`→`applyPass`) | `state-machine.test.ts` pass tests | IMPLEMENTED | |
| RULE-015 | No attacker (inside SpecialStart) does NOT count as pass | §7 | `turns.ts:75-78`, `turns.ts:348` | No SpecialStart enabled test | PARTIAL | |
| RULE-016 | SpecialStart window closes after both players complete first forced reinforcement | §7 | `turns.ts:75-78` (`isSpecialStartWindowOpen`) | No test | MISSING | `special_start_window_closed` event not emitted |
| RULE-017 | Attack init: `remaining = attacker.value`, `clubApplied = false` | §8 | `combat.ts:90-91` | `facecard.test.ts`, `rules-coverage.test.ts` | PARTIAL | `destroyQueue` inlined, not explicit |
| RULE-018 | Target chain: all non-null ranks front-to-back then defender Player | §8 | `combat.ts:93-168` | Multiple tests | IMPLEMENTED | 2-row only — see NOTE |
| RULE-019 | Card survival: `defAfterTentative > 0` → survives, `remaining = 0` | §8 | `combat.ts:319-320` | `facecard.test.ts`, `rules-coverage.test.ts` | IMPLEMENTED | |
| RULE-020 | Card destruction: queue, `remaining -= defBefore`, `lastDestroyedCard = target` | §8 | `combat.ts:318-321` | `facecard.test.ts` | IMPLEMENTED | |
| RULE-021 | If not eligible (cumulative): clamp HP, `remaining = 0` | §8 | `combat.ts:234-257` | `facecard.test.ts:294-333` | IMPLEMENTED | |
| RULE-022 | Boundary evaluation order: Shield → Weapon → Clamp | §9 | `combat.ts:124-205` | `rules-coverage.test.ts` | IMPLEMENTED | |
| RULE-023 | Diamond (♦): Card→Card — `remaining = max(remaining - currentCard.value, 0)` | §9.1 | `combat.ts:107-144` | `rules-coverage.test.ts:446-511` | IMPLEMENTED | Functionally correct for 2-row |
| RULE-024 | Club (♣): Card→Card — doubles only at first boundary after first destruction | §9.2 | `combat.ts:123-128` | `rules-coverage.test.ts:513-577` | **DIVERGENT** | Club applies without destruction condition — see DEF-002 |
| RULE-025 | Club applies once per attack only | §9.2, §19 | `combat.ts:124` (`clubDoubled` flag) | `facecard.test.ts` chain test | IMPLEMENTED | |
| RULE-026 | Heart (♥): Card→Player — `remaining = max(remaining - lastDestroyedCard.value, 0)` | §9.3 | `combat.ts:110-113, 161-163` | No dedicated test | **DIVERGENT** | Front heart gated on no-back-card; `lastDestroyedCard` semantics not implemented |
| RULE-027 | Hearts do not stack | §9.3, §19 | `combat.ts:183` | No test | **DIVERGENT** | `heartShield = frontHeartShield + backHeartShield` — stacks — see DEF-003 |
| RULE-028 | Spade (♠): Card→Player — doubles damage | §9.4 | `combat.ts:179` | `rules-coverage.test.ts:579-627` | IMPLEMENTED | |
| RULE-029 | Classic Aces: destroyed only if attacker is Ace AND `targetIndex == 0` | §10 | `combat.ts:100,148,262-289` | `rules-coverage.test.ts:199-263` | **DIVERGENT** | Back-rank Ace-vs-Ace: no `isFrontRow` check — see DEF-004 |
| RULE-030 | Ace disabled → behaves as normal value-1 card | §10 | `combat.ts:262-312` | `rules-coverage.test.ts` | IMPLEMENTED | |
| RULE-031 | Classic face cards: Jack→Jack; Queen→J/Q; King→J/Q/K | §11 | `combat.ts:60-66` (`isFaceCardEligible`) | `facecard.test.ts:124-231` | IMPLEMENTED | |
| RULE-032 | Face card ineligible → clamp to 1 HP and halt carryover | §11 | `combat.ts:234-257` | `facecard.test.ts:293-334` | IMPLEMENTED | |
| RULE-033 | Classic mode: no HP persists between turns | §12 | `combat.ts:347` (`resetColumnHp`) | None | **MISSING** | `resetColumnHp` never called — see DEF-001 |
| RULE-034 | Cumulative mode: HP persists; ineligible face/ace clamps to 1 | §12 | `combat.ts` (`ctx.isCumulative`) | `facecard.test.ts` | PARTIAL | Classic reset not implemented |
| RULE-035 | Cleanup: destroyed cards → graveyard (LIFO), collapse column | §13 | `state.ts:284` (`advanceBackRow`); `combat.ts:105,159` | `rules-coverage.test.ts:630-756` | IMPLEMENTED | |
| RULE-036 | Reinforcement: deploy from hand to back ranks after cleanup | §14 | `turns.ts:208-283` (`applyReinforce`) | `state-machine.test.ts:360-400` | IMPLEMENTED | |
| RULE-037 | Draw: draw to maxHandSize or deck empty; no reshuffle; empty deck not a loss | §15 | `turns.ts:38-50` (`performDrawPhase`) | `replay.test.ts` (indirect) | **DIVERGENT** | `drawCards` throws on undercount at init — see DEF-005 |
| RULE-038 | Pass recorded on: explicit pass OR attack with no valid attacker (outside SpecialStart) | §16 | `turns.ts:337-349` | `state-machine.test.ts:575-667` | IMPLEMENTED | |
| RULE-039 | `consecutivePasses > maxConsecutivePasses` OR `totalPasses > maxTotalPassesPerPlayer` → forfeit | §16 | `turns.ts:99-108` (`checkVictory`) | `state-machine.test.ts:575-667` | IMPLEMENTED | |
| RULE-040 | Event model: hierarchical trace/span/child-span/event (OTel-inspired) | §17 | `engine/src/events.ts` | `events.test.ts` (partial) | PARTIAL | Span hierarchy not validated in read test files |
| RULE-041 | All events: id, parentId, type, name, timestamp, payload, status | §17.2 | `shared/src/schema.ts:194-202` | Not verified | PARTIAL | |
| RULE-042 | Phases produce `span_started`/`span_ended` pairs | §17.2 | `turns.ts:524-531` | None | **MISSING** | PhaseHopTrace emitted, not span pairs |
| RULE-043 | Deterministic replay: SHA-256 of canonicalized state | §18 | `shared/src/hash.ts:12-26` | `replay.test.ts:80` | IMPLEMENTED | |
| RULE-044 | Identical inputs → identical postState, stateHashAfter, phase-hop trace | §18 | `engine/src/replay.ts:30-64` | `replay.test.ts` | IMPLEMENTED | |
| RULE-045 | stateHashBefore/stateHashAfter in transactionLog, not top-level | §18 | `turns.ts:603-608` | `replay.test.ts` | IMPLEMENTED | |
| RULE-046 | No randomness in resolution | §19 | No `Math.random()` in engine | — | IMPLEMENTED | Seeded PRNG only |
| RULE-047 | No reshuffle from graveyard | §19 | No reshuffle logic | — | IMPLEMENTED | |
| RULE-048 | No silent parameter drift in Classic mode | §19 | `schema.ts:536-576` strict parity check | Partial | PARTIAL | Not tested for rejection |
| RULE-049 | Card ID format: `[Timestamp]::[MatchID]::[PlayerID]::[TurnNumber]::[DrawIndex]` | §2.1 | `state.ts:202` | `replay.test.ts:75` | IMPLEMENTED | |
| RULE-050 | Draw pile always hidden; only count public | §21.1 | Fog-of-war tests | Separate test files | PARTIAL | Not audited in engine scope |
| RULE-051 | Battlefield cards face-up in v1.0; `faceDown` reserved | §21.2 | `faceDown: false` on deploy | Several tests | IMPLEMENTED | |
| RULE-052 | Graveyard: owner sees full; opponent sees top + count | §21.3 | Not in engine | None | MISSING | No engine enforcement of graveyard redaction |
| RULE-053 | TurnHash: `SHA-256(stateHashAfter + ":" + eventIds.join(":"))` | §20.2 | `shared/src/hash.ts:34-38` | No dedicated test in audited files | PARTIAL | |
| RULE-054 | Destruction eligibility immutable across attack chain | §19 | `combat.ts:44-50` (`AttackContext`) | `facecard.test.ts:354-400` | IMPLEMENTED | |

**Summary:**
- IMPLEMENTED: 27
- PARTIAL: 16
- MISSING: 4
- DIVERGENT: 7
