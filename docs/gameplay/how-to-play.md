---
title: "How to Play Phalanx Duel"
description: "A player-first guide to a complete Classic face-to-face duel."
status: active
updated: "2026-09-03"
audience: player
---

# How to Play Phalanx Duel

This is the player guide for a **Classic v3.0 Duel**. For the full normative
contract, see the [Canonical Rules Specification](./rules.md).

## The goal

Each player begins at **20 Life Points (LP)**. Attack through an opponent's
column and carry any remaining damage into their LP. Reduce the opponent to
zero to win.

## What you need

Each player uses a separate, shuffled standard 52-card deck. Keep your own
draw pile and hand private. The battlefield, including every deployed card, is
face-up.

## Set up the duel

1. Each player draws 12 cards.
2. Make a board with four columns and two ranks: a front rank nearest the
   opponent and a back rank behind it.
3. P2 deploys first. Players alternate placing one card face-up on their own
   board until each board has eight cards and each hand has four cards.
4. P1 takes the first attack turn.

## On your turn

Choose one of these actions:

- **Attack.** Choose one of your front-rank cards and an opponent column.
  Damage begins with that column's front card, continues to its back card, and
  then reaches the opponent's LP if damage remains.
- **Pass.** You may pass, but three consecutive passes or five total passes by
  one player forfeits the duel.

After an attack, the defender may reinforce **only the attacked column** by
playing cards from hand into its open ranks. When that response ends, the
defender draws until they have four cards (or their deck is empty) and becomes
the next attacker. After a pass, the passing player draws up to four cards and
the opponent becomes the next attacker.

An empty deck is not a loss. There is no reshuffle.

## Read combat in order

An attacking card's value is its starting damage. Numeric cards use their
printed value, Tens are 10, and Jacks, Queens, and Kings have value 11.

For every card hit in the target column:

1. Subtract the remaining damage from the defender's value.
2. If the defender survives, the attack stops.
3. If the defender is destroyed, carry the unused damage forward.
4. Apply any suit effect at the boundary to the next target.

In Classic mode, a card that survives an attack returns to its full printed
defense for a later turn. Damage does not persist between turns.

## The four suits

Suit effects describe a boundary in the attack chain, not a general card
keyword.

| Suit | What it does |
| --- | --- |
| **Diamonds (♦)** | When a Diamond is destroyed and the next target is a card, subtract the Diamond's value from carryover. |
| **Hearts (♥)** | If the final destroyed card before LP is a Heart, subtract its value from carryover before LP damage. Hearts do not heal or stack. |
| **Clubs (♣)** | A Club attacker doubles carryover once, on the first eligible card-to-card boundary after a destruction. |
| **Spades (♠)** | A Spade attacker doubles carryover when it crosses from cards to the opposing player's LP. |

When more than one effect is relevant, resolve in this order: shield,
weapon, then clamp at zero.

## Aces and face cards

Classic special cards change **what can be destroyed**:

| Attacker | Eligible target |
| --- | --- |
| Ace | Only a front-rank Ace |
| Jack | Jack |
| Queen | Jack or Queen |
| King | Jack, Queen, or King |

If a Classic Ace or face-card target is not eligible, it stops the attack.

## Ending the duel

You win immediately when your opponent reaches 0 LP. A duel can also end by a
pass-limit forfeit or by a deterministic draw condition in the full v3.0
rules, including threefold repetition, 50 no-progress turns, or the 200-turn
limit.

## Learn it at the table

For a compact print-ready teaching aid, use the
[face-to-face quickstart](./face-to-face-quickstart.md).
