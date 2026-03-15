# Phalanx Duel — Canonical Rules Specification v1.0 (Final)

This document defines the authoritative deterministic rules for match configuration, deployment, turn sequencing, attack resolution, suit effects, Classic Aces, Classic Face Cards, cumulative damage behavior, event logging, and replay verification.

This version includes:

* Classic schema binding (live-card-game mapping)
* Explicit ClassicDeploymentMode
* Explicit SpecialStartMode
* Deterministic replay guarantees
* Structured Event Model (Span-based)
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
* Event emission model (Span-based)
* Replay hash guarantees
* Game DSL for cross-platform play

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

```json
{
  "id": "string",
  "suit": "spades | clubs | diamonds | hearts",
  "face": "string",
  "value": "number",
  "type": "number | ace | jack | queen | king | joker"
}
```

### 2.1 Deterministic Card ID Specification

To ensure a sortable audit trail while maintaining 100% determinism during replays, Card IDs are generated upon drawing using the following template:

`[Timestamp]::[MatchID]::[PlayerID]::[TurnNumber]::[CardType]`

-   **Timestamp:** The highest resolution wall-clock timestamp provided in the turn's `Action` input. This timestamp is "frozen" for the duration of the turn's execution.
-   **MatchID:** UUID of the current match.
-   **PlayerID:** Identifier of the player drawing the card.
-   **TurnNumber:** The current turn number.
-   **CardType:** A short code for the card definition (e.g., `SA` for Ace of Spades, `HK` for King of Hearts).

The server validates that no duplicate IDs exist in the active system (Hand, Battlefield, or Graveyard).

## 2.2 Canonical Vocabulary

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
    "mode": "strict",

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

### 3.1.1 Strict Mode
If `classic.enabled == true` and `classic.mode == "strict"`:
* The match configuration is a frozen template.
* All top-level parameters MUST exactly match the `classic.*` template values.
* Any attempt to override these values during initialization results in an immediate rejection.

### 3.1.2 Hybrid Mode
If `classic.enabled == true` and `classic.mode == "hybrid"`:
* Values defined in the `classic.*` template serve as defaults.
* Top-level parameters MAY override these defaults, provided they remain within the **Global System Constraints (3.3)**.

### 3.1.3 Manual Mode
If `classic.enabled == false`:
* Top-level parameters govern behavior entirely.
* Classic block may exist for reference but has no authority.

## 3.2 Invalid Configuration Conditions

Match creation MUST be rejected if:
* Any player starts with `deckCount == 0`.
* Required parameters are missing or `specVersion != "1.0"`.
* Configuration violates **Global System Constraints (3.3)**.
* Strict Mode parity is violated.

## 3.3 Global System Constraints

All Phalanx System formats (Duel, Arena, Siege) must adhere to these physical limits:

* **Board Geometry:** The battlefield must be a rectangle defined by `rows * columns`.
* **Dimension Limits:** `1x1` (minimum) to a maximum of **48 total slots** (e.g., 12x4).
* **Hand Size Limit:** `maxHandSize` cannot exceed the number of `columns` in a row.
* **Initial Draw Formula:** To ensure a viable starting hand after deployment, initial draw is calculated as:
  `initialDraw = (rows * columns) + columns`
* **Card Scarcity Invariant:** A game configuration is invalid if `initialDraw` exceeds the available deck size minus a reserve of 4 cards (ensuring at least 4 cards remain in the system after the first player draws).

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

```javascript
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

```javascript
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

```javascript
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

```javascript
remaining = max(remaining - heart.value, 0)
```

Hearts do not stack.

## 9.4 Spade (♠) — Card→Player

If:

* remaining > 0
* attacker suit is ♠

Then:

```javascript
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

# 17. Structured Event Model (Spans & Audit)

The Phalanx System uses a hierarchical event model inspired by OpenTelemetry. This ensures total observability and deterministic auditing.

### 17.1 Hierarchy
*   **Trace (Match):** The entire duration of a match from creation to termination.
*   **Span (Turn):** A single execution of the 7-phase turn lifecycle.
*   **Child Span (Phase):** One of the 7 deterministic phases.
*   **Event:** A functional update (e.g., `boundary_evaluated`, `card_destroyed`) emitted within a Phase Span.

### 17.2 Event Structure
All events MUST include:
*   `id`: Unique identifier for the event or span.
*   `parentId`: ID of the enclosing span (e.g., Turn ID or Phase ID).
*   `type`: `span_started` | `span_ended` | `functional_update` | `system_error`.
*   `name`: Label for the span or event (e.g., "AttackResolution").
*   `timestamp`: The "frozen" high-resolution timestamp provided in the turn input.
*   `payload`: Specific data fields relevant to the event.
*   `status`: `ok` | `unrecoverable_error`.

### 17.3 Unrecoverable Errors
Any error that disrupts the deterministic flow or violates a hard invariant MUST emit a `system_error` event with `status: "unrecoverable_error"`. This event immediately terminates the match span and records the disruption in the audit log.

---

# 18. Deterministic Replay & Hashing

Canonical serialization is required. All JSON objects must have keys sorted alphabetically with no extraneous whitespace before hashing.

Per applied action (transaction log entry):

```javascript
stateHashBefore = sha256(canonicalize(gameStateWithoutTransactionLog_before))
stateHashAfter = sha256(canonicalize(gameStateWithoutTransactionLog_after))
```

Replay guarantee:
Identical `specVersion`, `params`, `preState`, and `turnInput` MUST produce
identical `postState`, `stateHashAfter`, and phase-hop trace sequence.

Integrity metadata is recorded in `transactionLog` entries (`stateHashBefore`,
`stateHashAfter`, optional `phaseTrace`, optional `phaseTraceDigest`). It is not
modeled as top-level `GameState` hash fields.

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

# 20. Game DSL (Cross-Platform Play)

To support the goal of extreme cross-platform accessibility (from high-end Web to Nokia/WAP), the Phalanx System supports a Domain Specific Language (DSL) for turn description and state sync.

### 20.1 Turn Command DSL
Actions can be represented as compact strings for low-bandwidth environments:
*   `D:[col]:[cardID]` (Deploy card to column)
*   `A:[atkCol]:[defCol]` (Attack column from column)
*   `P` (Pass)
*   `R:[cardID]` (Reinforce current context)
*   `F` (Forfeit)

### 20.2 Atomic Turn Payload
For stateless (REST/WAP) clients, the server response to a Turn Command includes:
1.  **PostState:** The complete filtered game state.
2.  **EventLog:** An ordered array of all events (Spans + Functional) emitted during the 7-phase turn lifecycle.
3.  **TurnHash:** The deterministic signature of the transition. Computed as:

    ```text
    turnHash = SHA-256(stateHashAfter + ":" + eventIds.join(":"))
    ```

    Where:

    -   `stateHashAfter` is the SHA-256 state hash recorded in the transaction log entry
    -   `eventIds` is the ordered array of `id` fields from the `PhalanxEvent[]` derived for that turn
    -   The separator `:` ensures `stateHashAfter` and `eventIds` cannot be confused

    `turnHash` is included in the `PhalanxTurnResult` response (optional field). It is independently verifiable from the event log and state hash without replaying the match.

---

Phalanx Duel Rules Specification v1.0 — Final and Canonical.

Further changes require version bump.
