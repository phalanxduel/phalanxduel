# Phalanx — Future Enhancements

Ideas and deferred mechanics that are **not part of v1**. These are captured
here so they are not lost, but none of them should block the core game from
being playable and testable.

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

## Multi-Player (3+ Players)

The grid layout is designed for head-to-head play. A future expansion could
support 3+ players with adjusted grid sizes or a shared battlefield.

---

## Heroical Mechanics (deferred — revisit when core game is stable)

Heroical is implemented (`PHX-HEROICAL-001`, `PHX-HEROICAL-002`) but is
considered **provisional**. The mechanic exists in the engine and can be
triggered during play, but it has not been balanced or extensively playtested
against the core combat loop.

**Current implementation:**
- `PHX-HEROICAL-001` — A face card (J/Q/K) in hand can be swapped onto the
  battlefield in place of an existing card during the combat phase
- `PHX-HEROICAL-002` — A Heroical swap targeting an Ace destroys the Ace
  instantly, bypassing Ace invulnerability

**Deferred work:**
- Balance review: does the hand-swap create solvable dominant strategies?
- Cost/restriction design: should Heroical consume the whole turn? Cost LP?
  Be limited to once per game?
- Interaction audit: Heroical + suit bonuses, Heroical into a reinforcement
  column, Heroical when opponent has no back row
- Exposing `heroicalSwap` as a `GameOptions` toggle (Phase 27 explicitly
  excludes this until the mechanic is stable)
- Additional rule IDs if cost/restriction mechanics are added

**Do not expand, tune, or add UI for Heroical until the core game (deployment,
combat, overflow, LP, reinforcement, victory) has been playtested and feels
right. Heroical is opt-in complexity, not a core loop dependency.**

---

## Other Ideas

- Player name display in waiting room *(done)*
- Mobile responsive layout *(done)*
- Match history / replay viewer *(Phase 25 — planned)*
- Spectator mode *(done — Phase 26)*
- Ranked matchmaking
- Card animations and sound effects
- Game feed (list of live matches in lobby)
