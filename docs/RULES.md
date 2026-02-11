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

On a player's turn, they select one of their deployed cards as the
**attacker** and one of the opponent's deployed cards as the **target**.
The attacker deals damage equal to its card value, modified by suit bonuses
(see suit rules). If the target's current HP reaches 0, it is destroyed
and moved to the discard pile. The attacker is not consumed by attacking;
it remains on the battlefield.

Attacking cards can only target opponent cards that are **in the front row**,
unless the front row column in front of the target is empty (no card blocking).
If a front-row position is empty, the card behind it in the back row becomes
targetable.

---

## Suits

### PHX-SUIT-001 — Diamonds: shield cards

A Diamond-suited card has a defensive bonus when deployed on the battlefield.
When a Diamond card is in the **front row** and is the target of an attack,
its effective defense (current HP for damage calculation purposes) is
**doubled** (×2). This bonus only applies when the Diamond card is in the
front row.

### PHX-SUIT-002 — Hearts: shield player

A Heart-suited card has a defensive bonus related to protecting the player.
When a Heart card is the **last remaining card** on a player's battlefield
(i.e., the final line of defense), its effective defense is **doubled** (×2).

> **Design note:** The original rule states "blocks twice if in front of a
> player." In the 2×4 grid, the back row is "in front of" the player. This
> rule interprets the bonus as activating when the Heart is the player's last
> card standing, representing the final shield before the player is exposed.

### PHX-SUIT-003 — Clubs: attack cards

A Club-suited card has an offensive bonus against **back-row** cards.
When a Club card attacks a target that is in the opponent's **back row**,
the attacker's damage is **doubled** (×2).

### PHX-SUIT-004 — Spades

Spade-suited cards have no special bonus in the base rules. They function as
normal combat cards. See `docs/FUTURE.md` for planned Spade enhancements.

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

---

## Victory

### PHX-VICTORY-001 — Win condition

A player wins when the opponent has **no cards remaining anywhere**: no cards
on the battlefield, no cards in hand, and no cards in the drawpile. This
accounts for the reinforcement mechanic (PHX-REINFORCE-005).

If both players are somehow fully depleted simultaneously (which cannot
happen in normal play since only one player attacks per turn), the attacking
player wins.

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

## Design Decisions Log

Decisions made during Phase 0 rules formalization, derived from the original
game design notes:

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Win condition | Last card standing | Most natural for grid combat; no player HP pool in base rules |
| 2 | Deck model | One deck per player | Original design says "designed around each player having their own deck" |
| 3 | Suit bonus math | ×2 multiplier, integer math | "blocks twice" and "doubles damage" both mean ×2 |
| 4 | Front/back row | Row 0 = front (closer to opponent), Row 1 = back (closer to player) | Matches "in front of a card" and "backrow" language |
| 5 | Face cards (J/Q/K) | Value 11, no special ability in v1 | Heroical swap mechanic deferred to `docs/FUTURE.md` |
| 6 | Joker | Excluded from base rules | No mechanic defined; deferred to `docs/FUTURE.md` |
| 7 | Face-down cards | Excluded from base rules | No trigger defined; deferred to `docs/FUTURE.md` |
| 8 | Hand card usage | Used during reinforcement phase | Deployed to damaged columns after combat destruction |
| 9 | Damage persistence | Damage persists across turns | "remaining value reaches zero" implies persistent damage tracking |
| 10 | Multi-player | 2-player only in base rules | Grid layout is designed for head-to-head; "two or more" deferred to expansion |

---

## Deferred Rules

Several rule IDs exist in the engine test stubs for future mechanics that are
not part of v1. These are documented in [`docs/FUTURE.md`](./FUTURE.md) and
include: Heroical swap, Heroical defeats Ace, Joker, face-down cards, and
Spade direct player damage.
