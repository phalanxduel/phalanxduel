# Phalanx — Game Rules

**Ruleset Version:** 0.2.0-draft

This document is the authoritative source of game rule definitions. Each rule
has a unique ID (`PHX-<CATEGORY>-<NNN>`) that maps to one or more tests. The CI
gate `pnpm rules:check` ensures every rule ID listed here is referenced in at
least one test file.

> **Convention:** Do not implement a rule in the engine without first adding its
> ID here and a corresponding test stub.

---

## Overview

Phalanx is a head-to-head combat card game for two players using a standard
52-card deck. Each player has their own deck. Players
deploy cards to a battlefield grid and take turns attacking the opponent's
cards. When cards are destroyed, defenders reinforce from hand and drawpile.
The game ends when one player has no cards remaining anywhere.

---

## Deployment

### PHX-DEPLOY-001 — Initial battlefield deployment

Each player shuffles their deck face-down. The shuffled deck becomes the
player's **drawpile**. Each player draws 12 cards from the top of their
drawpile into their hand, then deploys 8 cards face-up in a 2×4 grid
(2 rows, 4 columns). The remaining 4 cards stay in the player's hand.

The grid layout per player:

```
  col0   col1   col2   col3
╭───╮  ╭───╮  ╭───╮  ╭───╮   ← front row (row 0, closer to opponent)
│   │  │   │  │   │  │   │
╰───╯  ╰───╯  ╰───╯  ╰───╯
╭───╮  ╭───╮  ╭───╮  ╭───╮   ← back row (row 1, closer to player)
│   │  │   │  │   │  │   │
╰───╯  ╰───╯  ╰───╯  ╰───╯
```

### PHX-DEPLOY-002 — Alternating card placement

A coin flip (or equivalent random method) determines which player deploys
first. Players then alternate placing one card at a time, face-up, filling
positions left-to-right, front row first, then back row. Deployment alternates
between players until both grids are full (8 cards each, 16 total).

---

## Cards

### PHX-CARDS-001 — Deck composition

Each player uses a standard 52-card deck. The deck consists of four suits
(Spades, Hearts, Diamonds, Clubs), each with 13 ranks: Ace, 2–10, Jack,
Queen, King.

### PHX-CARDS-002 — Card values

Every card has a numeric value used for both attack and defense:

| Rank | Value |
|------|-------|
| Ace | 1 |
| 2–10 | Face value |
| Jack, Queen, King | 11 |

A card's **current HP** starts equal to its value. Damage reduces current HP.
When current HP reaches 0, the card is destroyed and sent to the discard pile.

---

## Combat

### PHX-COMBAT-001 — Basic combat resolution

On a player's turn, they select one of their **front-row** cards as the
attacker. The attacker strikes the opponent's column directly across
(same column). Damage flows through the column via overflow (see
PHX-OVERFLOW-001): front card → back card → player LP.

Back-row cards cannot attack. Back-row cards cannot be targeted directly;
they are only hit by overflow damage that passes through the front row.

If the opponent has no front-row card in that column, the damage flows
directly to the back-row card (if any), then to player LP.

The attacker deals damage equal to its card value, modified by suit bonuses
(see suit rules). If a card's current HP reaches 0, it is destroyed
and moved to the discard pile. The attacker is not consumed by attacking;
it remains on the battlefield.

---

## Suits

### PHX-SUIT-001 — Diamonds: doubled defense (front row)

A Diamond-suited card has a defensive bonus when deployed in the **front row**.
When a Diamond card is in the front row and is hit by overflow damage, its
effective HP for absorption purposes is **doubled** (×2). For example, a
Diamond 5 in the front row absorbs 10 damage before being destroyed. This
bonus only applies when the Diamond card is in the front row.

### PHX-SUIT-002 — Hearts: halve overflow to player LP

A Heart-suited card protects the player's life points. When the **last card**
in the damage path (the last card destroyed or surviving in the column) is a
Heart, any remaining overflow damage to the player's LP is **halved** (÷2,
rounded down). This represents the Heart card shielding the player behind it.

> **Design note:** The original rule states "blocks twice if in front of a
> player." This is interpreted as the Heart halving overflow to the player,
> which is the reciprocal of "blocking twice."

### PHX-SUIT-003 — Clubs: doubled overflow to back card

A Club-suited attacker has an offensive bonus against **back-row** cards.
When a Club card's attack overflows from the front card to the back card,
the overflow damage entering the back card step is **doubled** (×2). This
bonus only applies to overflow into the back card, not to the initial front
card hit or to player LP overflow.

### PHX-SUIT-004 — Spades: doubled overflow to player LP

A Spade-suited attacker has an offensive bonus against the **player directly**.
When a Spade card's attack overflows through the column to the player's LP,
the overflow damage entering the player LP step is **doubled** (×2). When
both Spade attacker and Heart last-card bonuses apply, Spade doubles first
then Heart halves: net = overflow × 2 / 2 = overflow (they cancel).

---

## Life Points

### PHX-LP-001 — Players start with 20 LP

Each player begins the game with **20 life points (LP)**. LP represents the
player's health and is reduced by overflow damage that passes through the
column's card defenses.

### PHX-LP-002 — LP depletion victory

When a player's LP reaches **0**, the game ends and their opponent wins. This
is an additional victory condition alongside the card depletion condition
(PHX-VICTORY-001). LP is clamped at 0 (cannot go negative).

---

## Overflow Damage

### PHX-OVERFLOW-001 — Column overflow damage

When an attacker targets a column, damage flows through the column
sequentially: **front card → back card → player LP**. Each card absorbs
damage up to its current HP. If the card is destroyed (HP reaches 0), any
remaining damage overflows to the next target in the chain. Suit bonuses
modify specific steps of this chain (see PHX-SUIT-001 through PHX-SUIT-004).

### PHX-OVERFLOW-002 — Ace overflow exception

An Ace card absorbs exactly **1 point** of damage (staying at 1 HP due to
invulnerability per PHX-ACE-001). All remaining damage overflows to the next
target. For example, Q(11) attacking an Ace: the Ace absorbs 1, overflow = 10.
The Ace-vs-Ace exception (PHX-ACE-001) still applies: when an Ace attacks
another Ace, invulnerability does not apply.

---

## Combat Log

### PHX-COMBATLOG-001 — Structured combat log

Each attack produces a structured combat log entry appended to the game state.
The entry records: turn number, attacker card (structured `{suit, rank}`),
target column, base damage, a list of resolution steps (one per target hit:
front card, back card, player LP), and total LP damage dealt. Each step
records: target type, card (structured `{suit, rank}` if applicable), damage
dealt, HP before/after (if applicable), whether the card was destroyed, and
any applicable bonuses. The combat log enables battle history display and
independent verification of combat math.

### PHX-COMBATLOG-002 — Self-verifiable combat log

Every combat log step must contain enough information to independently verify
the math without external state. For card steps: `absorbed = min(incomingDamage,
effectiveHp)`, `overflow = incomingDamage - absorbed`, `hpAfter = hpBefore -
damage`. For LP steps: `lpAfter = max(0, lpBefore - damage)`. The `bonuses`
array uses a closed enum of bonus types (`aceInvulnerable`, `aceVsAce`,
`diamondDoubleDefense`, `clubDoubleOverflow`, `spadeDoubleLp`, `heartHalveLp`)
rather than free-form strings, enabling programmatic verification.

---

## Special Cards

### PHX-ACE-001 — Ace invulnerability

The Ace card has a value of 1 for both attack and defense. It is
**invulnerable** — when attacked, its HP is never reduced below 1. It cannot
be destroyed by normal combat. The only exception is **Ace-vs-Ace**: when an
Ace attacks another Ace, invulnerability does not apply and the target Ace
is destroyed. The Ace still deals only 1 damage when attacking. Suit bonuses
apply normally to the Ace (e.g., a Diamond Ace in the front row would have
2 effective defense).

---

## Turns

### PHX-TURNS-001 — Turn structure

After deployment is complete, players alternate turns. The player who deployed
their **last card second** (i.e., did not go first in deployment) takes the
first combat turn.

On each turn, the active player **must** perform exactly one action:

1. **Attack** — Select one of their deployed cards to attack one valid
   opponent target (see PHX-COMBAT-001 for targeting rules).

After the attack resolves, play passes to the opponent.

### PHX-TURNS-002 — Pass increments turn number

When a player passes their turn, the turn number increments by 1 (same as
after an attack). This ensures the turn counter always reflects the number
of turns elapsed, regardless of the action taken.

---

## Victory

### PHX-VICTORY-001 — Win condition

A player wins when the opponent has **no cards remaining anywhere**: no cards
on the battlefield, no cards in hand, and no cards in the drawpile. This
accounts for the reinforcement mechanic (PHX-REINFORCE-005).

If both players are somehow fully depleted simultaneously (which cannot
happen in normal play since only one player attacks per turn), the attacking
player wins.

### PHX-VICTORY-002 — Forfeit

A player may forfeit during the **combat** or **reinforcement** phase on their
turn. When a player forfeits, the game ends immediately and the opponent wins.
The game outcome records the victory type as `forfeit` along with the turn
number at which the forfeit occurred.

---

## Reinforcement

### PHX-REINFORCE-001 — Auto front row advancement

When a front-row card is destroyed, any card in the same column's back row
automatically advances to fill the empty front-row position. This happens
immediately after destruction, before any other reinforcement steps.

### PHX-REINFORCE-002 — Reinforcement phase entry after destruction

After an attack destroys a card (and auto-advancement occurs), if the
defender has cards in hand AND the damaged column still has empty slots,
the game enters the **reinforcement** phase. The active player switches to
the defender, who must reinforce the damaged column.

### PHX-REINFORCE-003 — Mandatory deployment to damaged column

During the reinforcement phase, the defender **must** deploy a hand card to
fill an empty slot in the damaged column. The engine determines the position:
back row first, then auto-advance to front if back row is already occupied.
If the column is full or the hand is empty, reinforcement ends.

### PHX-REINFORCE-004 — Draw to 4 after reinforcement

When the reinforcement phase ends (column full or hand empty), the defender
draws from their drawpile until their hand has 4 cards (or the drawpile is
exhausted). Play then returns to combat with the turn passing to the next
player after the original attacker.

### PHX-REINFORCE-005 — Victory requires no battlefield + no hand + no drawpile

With the reinforcement mechanic active, a player wins only when the opponent
has **no cards remaining anywhere**: no cards on the battlefield, no cards in
hand, and no cards in the drawpile. This replaces the simpler "empty
battlefield" victory condition.

---

## Resources

### PHX-RESOURCES-001 — Hand card management

After deployment, each player holds 4 cards in hand. Hand cards are used
during the reinforcement phase (see PHX-REINFORCE-003) to fill empty
battlefield slots after combat destruction.

---

## Event Sourcing

### PHX-TXLOG-001 — Transaction log records every game action

Every game action (deploy, attack, pass, reinforce, forfeit) produces a
`TransactionLogEntry` that is appended to `gameState.transactionLog`. The entry
captures the action, a monotonically increasing sequence number, and
action-specific details. The log provides a complete, ordered history of the
game from initial state to current state.

### PHX-TXLOG-002 — Entries contain action, sequence number, state hashes

Each `TransactionLogEntry` includes `stateHashBefore` and `stateHashAfter`
fields computed from the game state (excluding the transaction log itself to
avoid circularity). When a hash function is provided, these form a hash chain:
`stateHashAfter[N] === stateHashBefore[N+1]`. This enables integrity
verification of the entire game history.

### PHX-TXLOG-003 — Game is replayable from initial config + ordered actions

Given the initial `GameConfig` and an ordered list of `Action` objects, the
`replayGame` function recreates the game by applying each action in sequence.
Because the engine is pure and deterministic, replay produces an identical
`GameState`. When hash verification is enabled, replay also validates the hash
chain for integrity.

---

## Damage Mode

### PHX-DAMAGE-001 — Optional per-turn HP reset

By default, damage to battlefield cards is **cumulative** across turns (a Queen
at 11 HP hit by 3 becomes 8, then hit by 2 becomes 6). An optional `damageMode`
setting (`'cumulative'` or `'per-turn'`) can be selected at match creation.

In **per-turn** mode (tabletop rules), after an attack resolves — including all
overflow damage, card destruction, and auto-advancement — every surviving card
in the attacked column resets to its full base HP (`RANK_VALUES[card.rank]`).
Destroyed cards are **not** restored. The combat log records actual damage
dealt before the reset. This setting is stored in `gameState.gameOptions` and
defaults to `{ damageMode: 'cumulative' }` when omitted.

---

## Design Decisions Log

Decisions made during Phase 0 rules formalization, derived from the original
game design notes:

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Win condition | LP depletion or card depletion | 20 LP pool per player; overflow damage flows through columns to LP |
| 2 | Deck model | One deck per player | Original design says "designed around each player having their own deck" |
| 3 | Suit bonus math | ×2 multiplier, integer math | "blocks twice" and "doubles damage" both mean ×2 |
| 4 | Front/back row | Row 0 = front (closer to opponent), Row 1 = back (closer to player) | Matches "in front of a card" and "backrow" language |
| 5 | Face cards (J/Q/K) | Value 11, no special ability in v1 | See `docs/FUTURE.md` for potential future mechanics |
| 6 | Joker | Excluded from base rules | No mechanic defined; deferred to `docs/FUTURE.md` |
| 7 | Face-down cards | Excluded from base rules | No trigger defined; deferred to `docs/FUTURE.md` |
| 8 | Hand card usage | Used during reinforcement phase | Deployed to damaged columns after combat destruction |
| 9 | Damage persistence | Damage persists across turns | "remaining value reaches zero" implies persistent damage tracking |
| 10 | Multi-player | 2-player only in base rules | Grid layout is designed for head-to-head; "two or more" deferred to expansion |

---

## Deferred Rules

Several rule IDs exist in the engine test stubs for future mechanics that are
not part of v1. These are documented in [`docs/FUTURE.md`](./FUTURE.md) and
include: Joker and face-down cards.
