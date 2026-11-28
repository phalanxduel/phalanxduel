// Phalanx Duel Classic v3.0 — Printable Poker-Sized (2.5" x 3.5") Reference Card Sheet
// 9 cut-out cards on one US Letter sheet for SCMC workshops, LAN tournaments & tabletop kits.
// Compiled via: typst compile --root . docs/print/suit-reference-cards.typ output/pdf/phalanx-duel-suit-reference-cards.pdf

#let ink = rgb("#172033")
#let muted = rgb("#566071")
#let teal = rgb("#0f766e")
#let red_shield = rgb("#c7374f")
#let blue_weapon = rgb("#2775a6")
#let amber = rgb("#d97706")
#let paper = rgb("#fffdf8")
#let card_bg = rgb("#f5f2eb")
#let crop = rgb("#94a3b8")

#set document(
  title: "Phalanx Duel v3.0 — Poker-Sized Tabletop Reference Cards",
  author: "Mike Hall",
)
#set page(
  paper: "us-letter",
  margin: (x: 0.5in, y: 0.25in),
  fill: white,
)
#set text(font: ("Helvetica Neue", "Arial"), size: 8pt, fill: ink)

#let ref_card(tag, title, accent, body) = box(
  width: 2.5in,
  height: 3.4in,
  inset: 9pt,
  fill: paper,
  stroke: (paint: crop, thickness: 0.5pt, dash: "dashed"),
)[
  #block(
    width: 100%,
    inset: (x: 6pt, y: 5pt),
    radius: 3pt,
    fill: accent,
  )[
    #text(fill: paper, size: 7pt, weight: "bold", tracking: 0.6pt, upper(tag)) \
    #text(fill: paper, size: 10pt, weight: "bold", title)
  ]
  #v(5pt)
  #body
  #v(1fr)
  #line(length: 100%, stroke: 0.4pt + rgb("#d9d5ca"))
  #v(2pt)
  #text(size: 6.5pt, fill: muted)[Phalanx Duel Classic v3.0 · phalanxduel.com]
]

#align(center)[
  #grid(
    columns: (2.5in, 2.5in, 2.5in),
    rows: (3.4in, 3.4in, 3.4in),
    gutter: 0pt,
    ref_card("Red Shield · Card Boundary", "♦ DIAMONDS", red_shield)[
      *Role:* Formation Shield. \
      *When:* Fires only when a *Diamond* is *destroyed* and carryover is headed to the *Back card*. \
      *Effect:* Subtract the Diamond's own value from carryover *before* Clubs can double it:
      $ c' = max(0, c - v_"♦") $
      *Tip:* A 4♦ stops up to 4 carryover cold—denying a Club attacker's ×2 trigger.
    ],
    ref_card("Blue Weapon · Card Boundary", "♣ CLUBS", blue_weapon)[
      *Role:* Breakthrough Weapon. \
      *When:* Fires *once* when a *Club attacker* destroys a card and carryover crosses to the *next card*. \
      *Effect:* Doubles post-Diamond carryover:
      $ c' = 2 dot max(0, c - v_"♦") $
      *Tip:* Pair high Clubs against low non-Diamond fronts to shatter back ranks.
    ],
    ref_card("Red Shield · Player Boundary", "♥ HEARTS", red_shield)[
      *Role:* Life-Point Ward. \
      *When:* Fires only when the *last card destroyed* before Opponent LP is a *Heart*. \
      *Effect:* Subtract the Heart's value from carryover *before* Spades can double it:
      $ "LP" = max(0, c - v_"♥") $
      *Rule:* Hearts *never stack*—only the final destroyed card shields LP.
    ],
    ref_card("Blue Weapon · Player Boundary", "♠ SPADES", blue_weapon)[
      *Role:* Finishing Blow. \
      *When:* Fires when a *Spade attacker* carries damage across the final boundary into *Opponent LP*. \
      *Effect:* Doubles post-Heart LP loss:
      $ "LP" = 2 dot max(0, c - v_"♥") $
      *Tip:* Empty columns or non-Heart back ranks turn high Spades into lethal finishers.
    ],
    ref_card("Core Law · Classic v3.0", "SHIELD BEFORE WEAPON", ink)[
      At *every* boundary, Shields resolve *before* Weapons:
      - *Card Boundary:* `♦` subtracts first, then `♣` doubles remainder.
      - *Player Boundary:* `♥` subtracts first, then `♠` doubles remainder.

      *Example (9♣ → 4♦ → 5♠):* \
      1. `9 - 4 = 5` carryover \
      2. *♦ Shield:* `5 - 4 = 1` \
      3. *♣ Weapon:* `1 × 2 = 2` \
      4. `5♠` survives at 3 HP (`0 LP`).
    ],
    ref_card("Special Eligibility", "FACE CARDS (J · Q · K)", amber)[
      Face cards can only destroy face cards of *equal or lower rank*:
      - *Jack:* destroys *J* (or 2–10)
      - *Queen:* destroys *J, Q* (or 2–10)
      - *King:* destroys *J, Q, K* (or 2–10)

      *Ineligible Target:* \
      Target survives untouched and carryover drops to *0*.
    ],
    ref_card("Special Eligibility", "ACE DUALITY", amber)[
      *Front-Rank Ace vs. Ace:* \
      Standard lethal combat (`1 vs 1`, Ace is destroyed).

      *Any Non-Ace vs. Ace:* \
      The Ace absorbs *1* damage, *cannot be destroyed* (stays at 1 HP), and passes *all remaining carryover* straight through to the next target!
    ],
    ref_card("Turn Sequence", "5-STEP TURN LOOP", teal)[
      1. *Attack or Pass:* Strike with one *Front-Rank* card into an opponent column.
      2. *Cascade:* Front → `♦/♣` → Back → `♥/♠` → LP.
      3. *Cleanup:* Discard destroyed cards; surviving Back advances to Front.
      4. *Reinforce:* Defender may place 1 hand card into the *attacked column*.
      5. *Draw & Swap:* Defender refills hand to *4 cards*. Swap active player.
    ],
    ref_card("End Conditions", "VICTORY & LIVENESS", ink)[
      *Immediate Win:*
      - Reduce opponent to *0 LP*.
      - Opponent forfeits or exceeds pass limit.

      *Empty Deck:* *Not* a loss!

      *v3.0 Draw Liveness:*
      - *3×* exact position repetition
      - *50* turns without irreversible progress
      - *200*-turn hard cap
    ],
  )
]
