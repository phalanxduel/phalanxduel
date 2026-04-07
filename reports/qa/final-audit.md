---
title: "Phalanx Duel — Competitive-Grade QA Final Audit"
date: "2026-04-06"
auditor: "Claude Code (automated static analysis)"
status: "FAIL"
---

# Phalanx Duel — Final QA Audit Report

## 1. EXECUTIVE SUMMARY

| Dimension | Result |
|-----------|--------|
| **System Status** | FAIL |
| **Determinism** | CONDITIONAL — engine is deterministic for canonical paths; `getValidActions` uses wall-clock; simulation tests use live timestamps |
| **Replay Fidelity** | CONDITIONAL — replay module itself is correct; `matchActions` ledger is not wired; full-game authoritative replay depends on `matches.actionHistory` + `matches.config` columns |
| **Release Readiness** | NO — 1 P0 gameplay regression (Classic mode HP never resets), 2 P0 infrastructure gaps (no adversarial CI gate, ledger not wired) |
| **Competitive Readiness** | NO |

**This system is not safe for competitive play.**

Primary blockers:
1. Classic mode HP is never reset between turns — every Classic game silently runs as Cumulative. All production matches are played under incorrect rules.
2. Hearts stack (front + back shield summed) — violates the "Hearts do not stack" hard invariant.
3. Club doubling applies without a confirmed destruction — attacker advantage inflated incorrectly.
4. Ace-vs-ace destruction is not gated on `targetIndex == 0` for back-rank aces.
5. No adversarial or authority tests exist anywhere in the CI pipeline.
6. The append-only `match_actions` ledger table is defined but never written to in production.

---

## 2. RULE TRACEABILITY MATRIX

See `reports/qa/rule-traceability.md` for the full 54-rule matrix.

Critical gaps:

| Rule | Status | Finding |
|------|--------|---------|
| RULE-033 | MISSING | Classic mode HP reset never executed |
| RULE-024/RULE-025 | DIVERGENT | Club applied without destruction condition |
| RULE-026/RULE-027 | DIVERGENT | Hearts stack (front + back summed) |
| RULE-029 | DIVERGENT | Ace-vs-ace not gated on targetIndex==0 |
| RULE-042 | MISSING | PhaseHopTrace emitted, not span_started/span_ended pairs |
| RULE-052 | MISSING | Graveyard opponent-view redaction not in engine |

---

## 3. DEFECT REPORTS

### DEF-001 — Classic Mode HP Never Resets Between Turns
- **Severity:** P0
- **Subsystem:** Engine (combat)
- **File:** `engine/src/combat.ts:347`, `engine/src/turns.ts` (no call site)
- **Setup:** Classic mode game. Card survives first attack with reduced HP. Observe HP on second turn.
- **Expected:** Card HP restored to face value at start of turn (RULES.md §12).
- **Actual:** Card retains reduced HP from previous turn. `resetColumnHp` is exported but never called.
- **Reproducibility:** 100% — affects every Classic mode game.
- **Impact:** All Classic mode gameplay is factually incorrect. Replay is deterministically wrong.
- **Recommendation:** Call `resetColumnHp` for active player's defending column at the end of `AttackResolution` or start of `CleanupPhase`, scoped to Classic mode.

### DEF-002 — Club Doubling Without Destruction Condition
- **Severity:** P1
- **Subsystem:** Engine (combat)
- **File:** `engine/src/combat.ts:123-128`
- **Setup:** Club attacker (value 10) vs front card (value 20). Overflow > 0 but front card survives.
- **Expected:** Club doubling does NOT apply — no destruction occurred (RULES.md §9.2).
- **Actual:** `if (backCard && attacker.card.suit === 'clubs') { overflow *= 2 }` — no destruction check.
- **Impact:** Club attackers gain unintended advantage when carryover exists but front card is not destroyed.

### DEF-003 — Hearts Stack Violation
- **Severity:** P1
- **Subsystem:** Engine (combat)
- **File:** `engine/src/combat.ts:183`
- **Setup:** Two Hearts in target column. Both destroyed in same attack.
- **Expected:** Only `lastDestroyedCard` heart value shields LP. Hearts do not stack (RULES.md §9.3, §19).
- **Actual:** `heartShield = frontHeartShield + backHeartShield` — both values summed.
- **Impact:** Two Hearts in same column provide double shield — direct violation of hard invariant.

### DEF-004 — Back-Rank Ace Destroyed by Ace Attacker
- **Severity:** P1
- **Subsystem:** Engine (combat)
- **File:** `engine/src/combat.ts:262-289`
- **Setup:** Ace attacker with carryover. Target column has non-Ace front card (destroyed) and Ace back card.
- **Expected:** Back-rank Ace is NOT destroyed — rule requires `targetIndex == 0` (RULES.md §10).
- **Actual:** `aceVsAce` path does not check `isFrontRow`. Back-rank Ace is destroyed.
- **Impact:** Ace invulnerability in back rank is bypassed by Ace attackers.

### DEF-005 — Deck Exhaustion Throws Instead of Stopping
- **Severity:** P1
- **Subsystem:** Engine (state)
- **File:** `engine/src/state.ts:192-194`
- **Setup:** `createInitialState` called with `initialDraw` > deck size.
- **Expected:** Silent stop at deck boundary (RULES.md §15: "empty deck does not cause loss").
- **Actual:** `drawCards` throws `Error('Not enough cards in drawpile...')`.
- **Impact:** Non-canonical configurations crash initialization hard.

### DEF-006 — validateAction Returns valid:true for No-Attacker Attack
- **Severity:** P1
- **Subsystem:** Engine (turns)
- **File:** `engine/src/turns.ts:171-174`
- **Expected:** `validateAction` returns `{ valid: false }` or a distinct result indicating "will be pass" when there is no front-row attacker.
- **Actual:** Returns `{ valid: true }` then silently converts to pass inside `applyAttack`.
- **Impact:** Clients cannot distinguish a legal attack from an implicit pass using the validation contract alone.

### DEF-007 — matchActions Ledger Not Wired
- **Severity:** P0 (infrastructure)
- **Subsystem:** Server (persistence)
- **File:** `server/src/db/ledger-store.ts`, `server/src/match.ts`
- **Expected:** Every game action is written to the `match_actions` append-only table.
- **Actual:** `appendAction` is never called from `handleAction` or any production path. Table is empty in production.
- **Impact:** The append-only audit trail designed for tamper detection and dispute resolution does not exist.

### DEF-008 — No Adversarial Tests in CI
- **Severity:** P0 (infrastructure)
- **Subsystem:** CI/QA
- **File:** `.github/workflows/pipeline.yml`
- **Expected:** CI gates on: wrong-player action, duplicate action, malformed payload, out-of-phase action, invalid card ID.
- **Actual:** The api-playthrough CI tool only sends valid actions from `validActions`. No adversarial cases are exercised.
- **Impact:** A regression in `assertAuthorizedPlayer`, `validateAction`, or JSON parsing would not be caught before reaching staging.

### DEF-009 — Front Heart Shield Semantics Incorrect
- **Severity:** P2
- **Subsystem:** Engine (combat)
- **File:** `engine/src/combat.ts:110-113`
- **Setup:** Front Heart card destroyed, back non-Heart card also destroyed.
- **Expected:** Heart shield applies (front Heart was last destroyed before player) — RULES.md §9.3.
- **Actual:** `frontHeartShield` only set when `!newBf[column + ctx.columns]` (no back card exists). If back card exists and is also destroyed, front Heart shield is not applied.
- **Impact:** Heart shield fails in front-Heart-destroyed + back-card-also-destroyed scenarios.

### DEF-010 — getValidActions Uses Wall-Clock Timestamp
- **Severity:** P2
- **Subsystem:** Engine (turns)
- **File:** `engine/src/turns.ts:627`
- **Expected:** Action objects from `getValidActions` use deterministic/injected timestamps.
- **Actual:** `new Date().toISOString()` used — timestamps differ across calls.
- **Impact:** Breaks replay determinism for callers who use these action objects verbatim.

### DEF-011 — Simulation Tests Non-Reproducible Due to Live Timestamps
- **Severity:** P2
- **Subsystem:** Tests
- **File:** `engine/tests/simulation.test.ts:201,227,243,264,286`
- **Expected:** Card IDs in simulation tests use fixed timestamps for reproducibility.
- **Actual:** `new Date().toISOString()` used for card IDs — failures cannot be replayed from the captured action log.

### DEF-012 — Local Drift Config Missing classicDeployment/quickStart
- **Severity:** P1
- **Subsystem:** QA tooling
- **File:** `bin/qa/api-playthrough.ts:396-398`
- **Expected:** Local engine shadow uses exact same GameConfig as server.
- **Actual:** `classicDeployment` and `quickStart` are not passed to local config, causing potential systematic drift.

### DEF-013 — Silent DB Failure Allows State/Log Divergence
- **Severity:** P1
- **Subsystem:** Server (persistence)
- **File:** `server/src/db/match-repo.ts:349-351`, `server/src/match.ts:963`
- **Expected:** DB write failure alerts and prevents state advancement.
- **Actual:** Exceptions swallowed with `console.error`. Game advances in memory without audit trail.

### DEF-014 — LP Step absorbed Field Incorrect
- **Severity:** P2
- **Subsystem:** Engine (combat)
- **File:** `engine/src/combat.ts:197`
- **Expected:** `absorbed` reflects shield reduction applied; `incomingDamage` reflects pre-shield overflow.
- **Actual:** `absorbed` is set to `lpDamage` (final damage), making the field circular/misleading.

---

## 4. COVERAGE GAPS

| # | Scenario | Status |
|---|---------|--------|
| 1 | Numeric vs numeric basic damage | COVERED |
| 2 | No carryover when attacker ≤ defender | COVERED |
| 3 | Carryover front → back | COVERED |
| 4 | Carryover back → player LP | COVERED |
| 5 | Club only after first destruction | **MISSING** — divergence untested |
| 6 | Spade only at player boundary | COVERED |
| 7 | Diamond at card→card boundary | COVERED |
| 8 | Heart at card→player boundary | **MISSING** — no dedicated heart shield test |
| 9 | Face card destruction matrix | COVERED |
| 10 | Ace-vs-ace legality | COVERED (front-rank only — back-rank gap) |
| 11 | Out-of-phase action rejection | COVERED |
| 12 | Wrong-player action rejection | COVERED |
| 13 | Reinforcement correctness | COVERED |
| 14 | Draw phase correctness | COVERED (indirect) |
| 15 | Deck exhaustion silent stop | **MISSING** |
| 16 | Replay fidelity from event stream | COVERED |
| 17 | Duplicate action no state corruption | **MISSING** |
| 18 | Stale client action rejection | **MISSING** |
| 19 | Classic mode HP resets between turns | **MISSING** |
| 20 | Hearts do not stack | **MISSING** |
| 21 | Back-rank ace immune even to ace attacker | **MISSING** |

---

## 5. DETERMINISM FINDINGS

| Aspect | Status | Notes |
|--------|--------|-------|
| Engine state transitions | VERIFIED | Pure functions; no hidden mutable state |
| Shuffle RNG | VERIFIED | Seeded mulberry32 Fisher-Yates |
| Hash function | VERIFIED | Canonical JSON, sorted keys |
| Replay module | VERIFIED | Deterministic given same action log |
| `getValidActions` timestamps | BROKEN | Wall-clock `new Date()` |
| Simulation tests | BROKEN | Live timestamps make failures non-reproducible |
| Card ID generation | CONDITIONAL | Falls back to wall-clock if `drawTimestamp` not provided |

---

## 6. REPLAY FINDINGS

| Aspect | Status | Notes |
|--------|--------|-------|
| `replayGame` correctness | VERIFIED | Identical hash on re-run in replay.test.ts |
| Per-transaction stateHash | VERIFIED | Stored in both `transactionLogs` and `matchActions` tables |
| Event array per transaction | VERIFIED | In `transactionLogs`; not in `matchActions` |
| `matchActions` ledger | BROKEN | Never written to in production |
| Hash chain verification | IMPLEMENTED | `/matches/:matchId/replay` admin endpoint; not called in CI |
| Authoritative replay from DB | FUNCTIONAL | Requires `matches.actionHistory` + `matches.config` |
| Dispute-grade replay | BROKEN | `matchActions` ledger empty; only denormalized `matches` table available |

---

## 7. AUTHORITY FINDINGS

| Check | Result |
|-------|--------|
| Server validates action identity | PASS — socket-map binding, not client-supplied |
| Server enforces turn order | PASS — engine `validateAction` + socket identity |
| Server enforces phase rules | PASS — engine `validateAction` |
| Server rejects invalid card IDs | PASS — engine validates hand membership |
| Server has rate limiting | PASS — HTTP 100/min, WS 50msg/s, 10 IP connections |
| Client cannot forge player identity | CONDITIONAL — `rejoinMatch` accepts client-supplied `playerId` without token |
| Malformed JSON handled | PASS — try/catch returns `PARSE_ERROR` |
| Authentication required | FAIL (intentional) — guest play without auth is by design |
| Adversarial CI coverage | FAIL — none |

---

## 8. CI MERGE GATE STATUS

| Gate | Present | Notes |
|------|---------|-------|
| Lint | Yes | ESLint in verify:all |
| Typecheck | Yes | pnpm typecheck |
| Build | Yes | pnpm build |
| Unit tests | Yes | Vitest, 658 tests |
| Integration (real DB) | Yes | api-integration job |
| Deterministic scenario suite | Partial | api-playthrough with seed, no pre-generated fixture files |
| Replay validation in CI | Missing | Not called in CI pipeline |
| API contract test | Partial | check-server.sh + schema gen |
| Authority/adversarial | Missing | Zero adversarial tests |
| Nondeterminism detection | Partial | 100-run playthrough; wall-clock issue not caught |

---

## 9. RELEASE RECOMMENDATION

**DO NOT RELEASE for competitive play.**

Required before any competitive release:
1. Fix DEF-001 (Classic HP reset) — foundational correctness blocker
2. Fix DEF-002 (Club without destruction) — rules violation
3. Fix DEF-003 (Hearts stacking) — hard invariant violation
4. Fix DEF-004 (Back-rank Ace) — rules violation
5. Wire DEF-007 (matchActions ledger) — dispute resolution requires this
6. Add adversarial CI gate (DEF-008) — authority regression protection
7. Fix DEF-012 (drift config gap) — QA tool reliability
8. Fix DEF-013 (silent DB failure) — data integrity

All P1 issues should be resolved before any competitive use. P2 issues should be resolved before general release.
