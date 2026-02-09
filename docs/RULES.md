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
52-card deck (plus optional Jokers). Each player has their own deck. Players
deploy cards to a battlefield grid and take turns attacking the opponent's
cards. The game ends when one player's battlefield is cleared.

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
Queen, King. Jokers are optional (see PHX-CARDS-004).

### PHX-CARDS-002 — Card values

Every card has a numeric value used for both attack and defense:

| Rank | Value |
|------|-------|
| Ace | 1 |
| 2–10 | Face value |
| Jack, Queen, King | 11 |
| Joker | 0 |

A card's **current HP** starts equal to its value. Damage reduces current HP.
When current HP reaches 0, the card is destroyed and sent to the discard pile.

### PHX-CARDS-003 — Face-down cards

Cards in the drawpile and discard pile are kept face-down. During gameplay,
certain effects may place cards face-down on the battlefield (neither player
can see the face value). A face-down card on the battlefield still occupies
its grid position and can be targeted. When a face-down card takes damage or
is otherwise revealed, it is flipped face-up before the effect resolves.

**TODO: finalize** — define which specific effects cause face-down placement
on the battlefield (future expansion rule).

### PHX-CARDS-004 — Joker card

The Joker has 0 attack and 0 defense value. It has no suit and therefore
receives no suit bonuses. The Joker is considered a **Wild** card.

**TODO: finalize** — define the Joker's Wild mechanic. The Joker is excluded
from the base ruleset until this is resolved. Games using the base ruleset
use a 52-card deck without Jokers.

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

### PHX-SUIT-004 — Spades: attack players

A Spade-suited card has an offensive bonus for **direct player damage**.
When a Spade card attacks and there is no valid target (opponent's battlefield
is empty), the Spade deals its value as direct damage to the opponent player.

> **Design note:** The original rule states "doubles damage dealt to player."
> Since there is no player HP pool in the base ruleset, this is interpreted
> as: Spade attacks that clear the last opponent card also deal overflow
> damage thematically. For the base ruleset, this bonus means Spades are
> the suit that triggers victory — if a Spade attacks and the battlefield
> would be cleared, the game ends immediately.

**TODO: finalize** — consider adding a player HP pool in a future expansion
so Spade's "doubles damage to player" has a concrete numeric effect.

---

## Special Cards

### PHX-ACE-001 — Ace invulnerability

The Ace card has a value of 1 for both attack and defense. It is
**invulnerable** to normal (non-Heroical) attacks — when attacked, it absorbs
up to 1 point of damage but its HP is never reduced below 1 by common attacks.
It cannot be destroyed by normal combat. The Ace still deals only 1 damage
when attacking. Suit bonuses apply normally to the Ace (e.g., a Diamond Ace
in the front row would have 2 effective defense).

The Ace **can** be removed from the battlefield by a Heroical swap
(see PHX-HEROICAL-001). When a Heroical swaps with an Ace, the Ace goes
to the player's hand (it is not destroyed).

---

## Heroicals (Face Cards)

### PHX-HEROICAL-001 — Heroical Trait: battlefield swap

Face cards (Jack, Queen, King) are called **Heroicals**. They have a value
of 11 for both attack and defense. Heroicals can be deployed to the
battlefield during the deployment phase like any other card.

Additionally, Heroicals have a **Heroical Trait** that can be activated from
the hand:

1. The Heroical must be in the player's hand (not deployed).
2. Activation timing: at the **start of the opponent's turn**, after the
   opponent declares their intent to attack but **before** they choose an
   attacker and target.
3. The player reveals the Heroical from their hand and **swaps** it with any
   one of their own deployed cards on the battlefield.
4. The swapped-out card goes to the player's hand.
5. After the swap completes, the opponent **then** declares their attacker
   and target. The opponent may choose any valid attacker/target — they are
   not locked into a pre-swap selection.

All three Heroicals (Jack, Queen, King) share the same Heroical Trait in the
base ruleset. They are mechanically identical.

- **Jack** — "Jeneral"
- **Queen** — "Qaos"
- **King** — "Karl"

### PHX-HEROICAL-002 — Heroical defeats Ace

A Heroical card (value 11) is the only card type that can destroy an Ace.
When a Heroical attacks an Ace, the Ace's invulnerability does not apply —
the Ace is destroyed and sent to the discard pile. This represents the
Heroical's special combat ability beyond their raw value.

---

## Turns

### PHX-TURNS-001 — Turn structure

After deployment is complete, players alternate turns. The player who deployed
their **last card second** (i.e., did not go first in deployment) takes the
first combat turn.

On each turn, the active player **must** perform exactly one action:

1. **Attack** — Select one of their deployed cards to attack one valid
   opponent target (see PHX-COMBAT-001 for targeting rules).

After the attack resolves, play passes to the opponent. There is a Heroical
interrupt window at the start of each turn (see PHX-HEROICAL-001).

---

## Victory

### PHX-VICTORY-001 — Win condition

A player wins when **all of the opponent's deployed battlefield cards are
destroyed**. The moment the last opponent card is removed from the battlefield,
the game ends and the attacking player is declared the winner.

If both players' battlefields are somehow cleared simultaneously (which cannot
happen in normal play since only one player attacks per turn), the attacking
player wins.

---

## Resources

### PHX-RESOURCES-001 — Hand card management

After deployment, each player holds 4 cards in hand. Hand cards cannot be
played to the battlefield during regular turns — they serve as reserves for
Heroical Trait activations (see PHX-HEROICAL-001). When a Heroical swaps
with a deployed card, the deployed card enters the player's hand.

Non-Heroical hand cards have no active use in the base ruleset.

**TODO: finalize** — consider future expansion rules allowing hand card play
(e.g., reinforcement: play a hand card to an empty grid slot on your turn
instead of attacking).

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
| 5 | Heroical differentiation | All identical in base rules | Original describes same swap ability for J/Q/K; names are flavor only |
| 6 | Joker Wild | Deferred (excluded from base rules) | No mechanic defined in original; avoid inventing rules |
| 7 | Face-down triggers | Deferred (concept documented) | Original mentions concept but defines no specific triggers |
| 8 | Hand card usage | Heroical swap only in base rules | Only described use is Heroical Trait activation |
| 9 | Damage persistence | Damage persists across turns | "remaining value reaches zero" implies persistent damage tracking |
| 10 | Multi-player | 2-player only in base rules | Grid layout is designed for head-to-head; "two or more" deferred to expansion |
