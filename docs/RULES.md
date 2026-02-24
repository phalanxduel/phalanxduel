# Phalanx Duel — Canonical Rules Specification v1.0 (Final)

This document defines the authoritative deterministic rules for match configuration, deployment, turn sequencing, attack resolution, suit effects, Classic Aces, Classic Face Cards, cumulative damage behavior, event logging, and replay verification.

This version includes:

* Classic schema binding (live-card-game mapping)
* Explicit ClassicDeploymentMode
* Explicit SpecialStartMode
* Deterministic replay guarantees
* No narrative-only exceptions

If any implementation produces different output for identical inputs under this spec, that implementation is invalid.

---

# 1. Scope

## 1.1 In-Scope

* Match configuration validation
* Classic schema enforcement
* Deterministic turn lifecycle
* Classic deployment algorithm
* Attack resolution (boundary-defined)
* Suit effects (♦ ♥ ♣ ♠)
* Classic Aces and Classic Face Cards
* Cumulative vs Classic persistence
* Cleanup and column collapse
* Reinforcement and draw
* Pass logic
* Event emission model
* Replay hash guarantees

## 1.2 Explicit Non-Scope

* UI rendering or animations
* Network transport protocol
* Ranking / ladder calculations
* Bot AI logic
* Post-game abuse adjudication

---

# 2. Canonical Vocabulary

Player — `P1` (inviting) or `P2` (invited)

Card — immutable:

```
{
  id,
  suit ∈ {♠,♣,♦,♥},
  face,
  value,
  type ∈ {number, ace, jack, queen, king, joker}
}
```

Rank — position index inside column (0 = front)

Column — ordered list of `rows` ranks

Board — `columns` columns per player

Target Chain — ordered list:
`[Rank0Card, Rank1Card, …, RankN-1Card, Player]`

Boundary — transition between adjacent targets

Carryover — remaining damage after resolving a target

Origin Attacker — immutable attacking card

LastDestroyedCard — most recent destroyed card in current attack

Destroyed (queued) — card eligible and scheduled for removal

Cleanup — post-resolution removal + collapse

---

# 3. Match Parameters (Authoritative Schema)

All matches must include:

```json
{
  "specVersion": "1.0",

  "classic": {
    "enabled": true,

    "battlefield": { "rows": 2, "columns": 4 },
    "hand": { "maxHandSize": 4 },
    "start": { "initialDraw": 12 },

    "modes": {
      "classicAces": true,
      "classicFaceCards": true,
      "damagePersistence": "classic"
    },

    "initiative": {
      "deployFirst": "P2",
      "attackFirst": "P1"
    },

    "passRules": {
      "maxConsecutivePasses": 3,
      "maxTotalPassesPerPlayer": 5
    }
  },

  "rows": 2,
  "columns": 4,
  "maxHandSize": 4,
  "initialDraw": 12,

  "modeClassicAces": true,
  "modeClassicFaceCards": true,
  "modeDamagePersistence": "classic",

  "modeClassicDeployment": true,

  "modeSpecialStart": {
    "enabled": false,
    "noAttackCountsAsPassUntil": "bothPlayersCompletedFirstForcedReinforcement"
  },

  "initiative": {
    "deployFirst": "P2",
    "attackFirst": "P1"
  },

  "modePassRules": {
    "maxConsecutivePasses": 3,
    "maxTotalPassesPerPlayer": 5
  }
}
```

## 3.1 Classic Schema Binding Rules

If `classic.enabled == true`:

* All overlapping top-level parameters MUST equal the values in `classic.*`.
* Any mismatch invalidates match configuration.

If `classic.enabled == false`:

* Top-level parameters govern behavior.
* Classic block may exist but must not override top-level values.

## 3.2 Invalid Configuration Conditions

Match creation MUST be rejected if:

* Any player starts with `deckCount == 0`
* `classic.enabled == true` and overlapping parameters differ
* `modeClassicDeployment == true` but `rows*columns + maxHandSize` exceeds deck size
* Required parameters missing
* `specVersion != "1.0"`

---

# 4. Turn Lifecycle (Deterministic)

Each turn executes all phases:

1. StartTurn
2. AttackPhase
3. AttackResolution
4. CleanupPhase
5. ReinforcementPhase
6. DrawPhase
7. EndTurn

Phases always emit events, even if no state changes.

---

# 5. Classic Deployment Mode

If `modeClassicDeployment == true`:

1. Each player draws `initialDraw` (default 12).
2. Players alternate deploying exactly one card to their own board.
3. Each player must deploy until:

   * exactly `rows * columns` slots are filled, AND
   * exactly `maxHandSize` cards remain in hand.
4. Deployment ends when the second player completes their final required deployment.

Other deployment models require version bump.

---

# 6. Attack Declaration

Valid attack requires:

* Active player has a card at rank 0 of attacking column.
* Defending column index valid.
* Origin Attacker = card at attackingColumn.rank0.

If no attacker exists:

* Outside SpecialStart window → counts as pass.
* Inside SpecialStart window → does not count as pass.

---

# 7. Special Start Mode

If `modeSpecialStart.enabled == true`:

* During initial zero-deployment condition,
  inability to attack due to no deployed cards does NOT count as pass.
* After both players complete first forced reinforcement,
  event `special_start_window_closed` emitted.
* After closure, normal pass rules apply.

---

# 8. Attack Resolution (Deterministic Algorithm)

Initialize:

```
remaining = attacker.value
clubApplied = false
lastDestroyedCard = null
destroyQueue = []
```

Build Target Chain:

* All non-null ranks in defending column front-to-back
* Then defender Player

For each target:

If Card:

1. Compute `defAfterTentative = defBefore - remaining`
2. If `defAfterTentative > 0`:

   * Survives
   * remaining = 0
3. If `defAfterTentative <= 0`:

   * Check DestructionEligibility()
   * If eligible:

     * Queue destruction
     * remaining = remaining - defBefore
     * lastDestroyedCard = target
   * Else:

     * Clamp (if cumulative)
     * remaining = 0
4. Evaluate boundary

If Player:

* Apply Card→Player boundary
* life -= remaining
* remaining = 0

---

# 9. Suit Boundary Semantics

Canonical ordering at every boundary:

1. Shield
2. Weapon
3. Clamp

## 9.1 Diamond (♦) — Card→Card

If current card is ♦ and next target is card:

```
remaining = max(remaining - currentCard.value, 0)
```

## 9.2 Club (♣) — Card→Card

If:

* remaining > 0
* next target is card
* attacker suit is ♣
* clubApplied == false
* boundary is first after first destruction

Then:

```
remaining = remaining * 2
clubApplied = true
```

Applies once per attack.

## 9.3 Heart (♥) — Card→Player

If:

* remaining > 0
* next target is player
* lastDestroyedCard.suit == ♥
* that heart was final destroyed before player

Then:

```
remaining = max(remaining - heart.value, 0)
```

Hearts do not stack.

## 9.4 Spade (♠) — Card→Player

If:

* remaining > 0
* attacker suit is ♠

Then:

```
remaining = remaining * 2
```

---

# 10. Classic Aces

If `modeClassicAces == true`:

Ace destroyed only if:

* attacker.type == ace
* AND targetIndex == 0

Otherwise not destroyable.

If disabled → behaves as normal value 1 card.

---

# 11. Classic Face Cards

If `modeClassicFaceCards == true`:

| Attacker | Can Destroy       |
| -------- | ----------------- |
| Jack     | Jack              |
| Queen    | Jack, Queen       |
| King     | Jack, Queen, King |

Damage origin immutable across chain.

If not eligible → clamp to 1 in cumulative mode and halt carryover.

---

# 12. Damage Persistence

Classic mode:

* No defense persists between turns.

Cumulative mode:

* Defense persists.
* Non-destroyable face/ace clamps to 1.

---

# 13. Cleanup

After resolution:

1. Remove all destroyed cards to graveyard (LIFO).
2. Collapse column (shift forward).

---

# 14. Reinforcement

After cleanup:

* Player may deploy cards from hand to back ranks.
* Limited by empty ranks and hand size.

---

# 15. Draw Phase

* Draw until hand.size == maxHandSize or deck empty.
* No reshuffle.
* Empty deck does not cause loss.

---

# 16. Pass Rules

Pass recorded when:

* Explicit pass action, OR
* Attack attempted but no valid attacker (outside SpecialStart window)

Limits:

* > maxConsecutivePasses → forfeit
* > maxTotalPassesPerPlayer → forfeit

Pass does not depend on “good attack availability”.

---

# 17. Event Emission Model

All phases emit events.

Every boundary emits:

```
{
  type: "boundary_evaluated",
  boundaryType,
  carryoverBefore,
  shield: {...},
  weapon: {...},
  carryoverAfter
}
```

SpecialStart closure emits:

```
{
  type: "special_start_window_closed"
}
```

---

# 18. Deterministic Replay & Hashing

Canonical serialization required.

Per turn:

```
preStateHash
eventLogHash
postStateHash
turnHash = sha256(specVersion + params + preStateHash + turnInput + eventLogHash + postStateHash)
```

Replay guarantee:

Identical:

* specVersion
* params (including classic block)
* preState
* turnInput

Must produce identical:

* events
* postState
* hashes

Otherwise invalid implementation.

---

# 19. Hard Invariants

* No randomness in resolution.
* Club applies at most once.
* Hearts do not stack.
* Destruction eligibility determined solely by origin attacker rank and modes.
* No reshuffle from graveyard.
* No silent parameter drift when Classic enabled.
* No automatic loss due solely to empty deck.

---

Phalanx Duel Rules Specification v1.0 — Final and Canonical.

Further changes require version bump.

