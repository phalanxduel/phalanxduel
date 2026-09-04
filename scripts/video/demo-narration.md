---
format: read-aloud
kind: game-tutorial
lang: en-US
title: "Phalanx Duel. A three minute introduction."
source: "phalanxduel/game, docs/gameplay/face-to-face-quickstart.md and docs/gameplay/how-to-play.md"
voice: "Zoe (Premium)"
spoken_minutes: 3
pronunciation:
  Phalanx: "FAY lanks"
  phalanx: "FAY lanks"
  carryover: "carry over"
  Lifepoints: "life points"
sections:
  - "What it is"
  - "Setting up"
  - "Taking a turn"
  - "Resolving an attack"
  - "The four suits"
  - "Answering an attack"
  - "Winning the duel"
---

# Phalanx Duel, narrated demo

This file is the single source of the demo voiceover. Each cue below is one
spoken segment. The build pipeline reads a text-to-speech track from the prose,
renders a title card from the card fields, and cuts it against the matching
footage scene. Authored to the just3ws voice guide and the read-aloud rules:
short sentences, one idea each, everything spelled out, no symbols, no tables.

<!-- cue: intro | kicker: "PHALANX DUEL" | title: "A three minute introduction" | scene: title -->
Phalanx Duel is a tactical card game for two players.
Each player runs a standard deck of fifty two cards and starts with a pool of life points.
You win by breaking through a column of your opponent's cards and driving their life points to zero.
Everything you see here runs from one shuffled seed, so the same game plays the same way every time.

<!-- cue: setup | kicker: "STEP ONE" | title: "Build your formation" | scene: deployment -->
Each player shuffles their own deck and draws twelve cards.
You build four columns, each with a front card and a back card.
Players take turns placing one card face up until each board holds eight cards and each hand holds four.
The front card of every column faces the enemy. The back card waits behind it.

<!-- cue: turn | kicker: "STEP TWO" | title: "Take a turn" | scene: turn -->
On your turn you do one thing. You attack, or you pass.
To attack, pick one of your own front cards and point it at one enemy column.
A card's attack value is its printed number. Tens count as ten. Face cards count as eleven.
That value is the damage the attack starts with.

<!-- cue: attack | kicker: "STEP THREE" | title: "Follow the damage" | scene: attack -->
Damage moves through the target column in order. Front card, then back card, then life points.
Compare the damage to the front card. If the card's value is higher, it survives and the attack stops.
If the damage meets or beats the card, the card is destroyed. Subtract its value and carry the rest forward.
The leftover damage then hits the back card, and whatever remains after that reaches the opponent's life points.

<!-- cue: suits | kicker: "THE DETAIL" | title: "The four suits" | scene: suits -->
Each suit changes the math at one boundary in that chain. It is a timing rule, not a card power.
A destroyed Diamond subtracts its value from damage carrying on to another card.
A destroyed Heart subtracts its value from damage headed to life points.
A Club attacker doubles the carryover once, right after its first kill.
A Spade attacker doubles the damage that crosses from the cards into the player.

<!-- cue: reinforce | kicker: "STEP FOUR" | title: "Answer the attack" | scene: reinforce -->
After the attack resolves, the defender may reinforce, but only the column that was hit.
You play cards from your hand into the open ranks of that one column.
Then you draw back up to four cards, and now you are the attacker.
A card that survived a hit returns to its full value on your turn. Damage does not carry between turns.

<!-- cue: winning | kicker: "THE GOAL" | title: "Win the duel" | scene: winning -->
The duel ends when one player's life points reach zero.
Passing is legal, but three passes in a row, or five passes in a game, forfeits the duel.
Running out of cards to draw is not a loss. There is no reshuffle.
So every attack is a choice about which column to break, and when.

<!-- cue: outro | kicker: "PHALANX DUEL" | title: "Play a hand" | scene: outro -->
That is the whole game. Set up four columns, send one card at a time, and follow the damage through.
The printed rules and the face to face quickstart go deeper on special cards and edge cases.
Shuffle a deck and play a hand.
