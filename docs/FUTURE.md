# Phalanx — Future Enhancements

Ideas and deferred mechanics that are **not part of v1**. These are captured
here so they are not lost, but none of them should block the core game from
being playable and testable.

---

## Heroical Trait (Hand Swap Mechanic)

Face cards (Jack, Queen, King) are nicknamed **Heroicals**: Jeneral, Qaos,
and Karl. In the core game they are simply strong cards with a value of 11.

A future version could add a **Heroical Trait** — an activated ability that
lets a player swap a Heroical from their hand onto the battlefield:

1. The Heroical must be in the player's hand (not deployed).
2. Activation timing: at the start of the opponent's turn, before the opponent
   chooses an attacker and target.
3. The player reveals the Heroical and swaps it with any of their own deployed
   cards. The swapped-out card goes to the player's hand.
4. The opponent then declares their attacker and target (not locked into a
   pre-swap selection).

All three Heroicals share the same trait. They are mechanically identical.

**Implementation notes:** The engine already has a `heroicalSwap()` function
and the schema has a `heroicalSwap` action type and `heroicalWindow` game
phase. These exist in the codebase but are not exposed in the client UI and
the interrupt window timing is not enforced in the turn flow. When this feature
is activated, the following work is needed:

- Client UI: add a "Swap" button for Heroical cards in hand during combat
- Turn flow: enforce the `heroicalWindow` phase at the start of each turn
- Test stubs to implement:
  - `PHX-HEROICAL-001`: swap activates at start of opponent turn before
    attacker/target selection
  - `PHX-HEROICAL-001`: opponent declares attacker/target after swap completes
  - `PHX-TURNS-001`: Heroical interrupt window exists at start of each turn

**Related rule IDs:** PHX-HEROICAL-001, PHX-HEROICAL-002

---

## Heroical Defeats Ace (Special Combat)

In the core game, Aces are invulnerable — their HP never drops below 1 from
any attack. A future version could add the rule that Heroical cards (J/Q/K)
bypass Ace invulnerability and destroy them outright.

**Implementation notes:** The engine already implements this in
`engine/src/combat.ts` (`calculateHpReduction` checks `isHeroical(attacker)`).
The tests for PHX-HEROICAL-002 already pass. This mechanic works today but is
a natural companion to the Heroical Trait above — both should ship together so
the Heroical cards feel distinct from regular high-value cards.

**Related rule ID:** PHX-HEROICAL-002

---

## Joker Card

The Joker has 0 attack and 0 defense value, no suit, and no suit bonuses. It
is considered a "Wild" card. The specific Wild mechanic is undefined.

Ideas for the Wild mechanic:
- Copy the suit/rank of an adjacent card
- Act as a wildcard during deployment (player chooses its effective suit)
- Sacrifice to draw additional cards
- Absorb one lethal hit then discard itself

The Joker is excluded from the 52-card deck in v1. Games use a standard deck
without Jokers.

**Related rule IDs:** PHX-CARDS-004, PHX-CARDS-002 (Joker value 0)

---

## Face-Down Cards

Cards in the drawpile and discard pile are face-down. A future mechanic could
place cards face-down on the battlefield (neither player sees the value). The
face-down card still occupies its grid position and can be targeted. When it
takes damage or is otherwise revealed, it flips face-up before the effect
resolves.

No specific trigger for face-down battlefield placement is defined yet.

Ideas:
- Deploy the last 1-2 cards face-down during deployment
- A special card ability that flips a card face-down
- Reinforcement from the drawpile arrives face-down

**Related rule ID:** PHX-CARDS-003

---

## Spade Direct Player Damage

Spades are thematically "attack player" cards. In v1 there is no player HP
pool, so this bonus has no mechanical effect. A future version could add:

- A player HP pool (e.g., 20 HP per player)
- Spade attacks that clear the last opponent card also deal overflow damage
  to the player
- Spade doubles damage dealt to the player directly
- Alternative win condition: reduce opponent player HP to 0

**Related rule ID:** PHX-SUIT-004

---

## Hand Card Reinforcement

After deployment, each player holds 4 cards in hand. In v1, non-Heroical hand
cards have no active use. A future version could allow:

- Playing a hand card to an empty grid slot on your turn instead of attacking
- Discarding a hand card to draw from the drawpile
- Using hand cards as one-time damage shields

**Related rule ID:** PHX-RESOURCES-001

---

## Multi-Player (3+ Players)

The grid layout is designed for head-to-head play. A future expansion could
support 3+ players with adjusted grid sizes or a shared battlefield.

---

## Other Ideas

- Player name display in waiting room
- Mobile responsive layout
- Match history / replay viewer
- Ranked matchmaking
- Card animations and sound effects
- Spectator mode
