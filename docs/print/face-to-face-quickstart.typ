// Phalanx Duel Classic v3.0 — Printable 2-Page Face-to-Face Tabletop Quickstart
// Compiled via: typst compile --root . docs/print/face-to-face-quickstart.typ output/pdf/phalanx-duel-face-to-face-quickstart.pdf

#let ink = rgb("#172033")
#let muted = rgb("#566071")
#let teal = rgb("#0f766e")
#let red_shield = rgb("#c7374f")
#let blue_weapon = rgb("#2775a6")
#let amber = rgb("#d97706")
#let paper = rgb("#fffdf8")
#let card_bg = rgb("#f5f2eb")
#let border = rgb("#d9d5ca")

#set document(
  title: "Phalanx Duel — Face-to-Face Tabletop Quickstart (Classic v3.0)",
  author: "Mike Hall",
)
#set page(
  paper: "us-letter",
  margin: (x: 0.55in, y: 0.5in),
  fill: paper,
  footer: context [
    #set text(size: 7.5pt, fill: muted)
    Phalanx Duel Classic v3.0 · Play online & verify combat math at *phalanxduel.com*
    #h(1fr)
    Page #counter(page).display("1 of 2", both: true)
  ],
)
#set text(font: ("Helvetica Neue", "Arial"), size: 9.2pt, fill: ink)

#let badge(label, bg) = box(
  fill: bg,
  inset: (x: 5pt, y: 2pt),
  radius: 3pt,
  text(fill: paper, size: 7.5pt, weight: "bold", label),
)

#let panel(title, accent, body) = block(
  width: 100%,
  inset: 9pt,
  radius: 5pt,
  fill: card_bg,
  stroke: (top: 2.5pt + accent, rest: 0.5pt + border),
)[
  #text(size: 10pt, weight: "bold", fill: accent, title)
  #v(3pt)
  #body
]

// ========================== PAGE 1: SETUP & TURN LOOP ==========================
#block(
  width: 100%,
  inset: 12pt,
  radius: 6pt,
  fill: ink,
)[
  #grid(
    columns: (1fr, auto),
    align: (left, right),
    [
      #text(fill: paper, size: 16pt, weight: "bold")[PHALANX DUEL] #h(6pt) #badge("CLASSIC v3.0", teal) \
      #text(fill: rgb("#cbd5e1"), size: 9.5pt)[Face-to-Face Tabletop Quickstart · 2 Players · 2 Standard 52-Card Decks · 10–15 Min]
    ],
    [
      #text(fill: rgb("#f59e0b"), size: 9pt, weight: "bold")[20 LP · 4×2 Grid] \
      #text(fill: rgb("#94a3b8"), size: 8pt)[Zero RNG after deal]
    ],
  )
]

#v(6pt)

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  panel("1. Setup & Formation-First Deployment", teal)[
    - *Decks & Life:* Each player brings one shuffled 52-card deck and starts at *20 LP*.
    - *Opening Draw:* Each player draws *12 cards* (leaving 40 in drawpile).
    - *4×2 Battlefield:* Four columns, each with a *Front Rank* (faces opponent) and a *Back Rank* (reserve).
    - *Alternating Deploy:* *P2 deploys first.* Alternate placing 1 card face-up into any open slot until both players have *8 battlefield cards* and *4 cards in hand*.
    - *First Strike:* *P1 attacks first.*
  ],
  panel("2. Card Values & Special Eligibility", amber)[
    - *Number Cards (2–10):* Face value = Attack & HP.
    - *Face Cards:* *J = 11*, *Q = 11*, *K = 11* (or Classic rank hierarchy):
      - A *Jack* can destroy only a *Jack* (or number card).
      - A *Queen* can destroy *Jack / Queen*.
      - A *King* can destroy *Jack / Queen / King*.
      - *Ineligible face target:* Survives; attack stops with *0 carryover*.
    - *Aces (Value 1):* Only a *front-rank Ace* can destroy another Ace. Against any non-Ace attacker, an Ace absorbs 1 damage, *cannot be destroyed*, and passes remaining carryover through!
  ],
)

#v(6pt)

#panel("3. The Turn Sequence (Repeat Until 0 LP)", ink)[
  #grid(
    columns: (1fr, 1fr, 1fr, 1fr, 1fr),
    gutter: 6pt,
    [*1. Attack or Pass* \ Strike with one of your *Front-Rank* cards into the matching or chosen opponent column (or Pass).],
    [*2. Cascade* \ Damage flows *Front → ♦/♣ → Back → ♥/♠ → Opponent LP*. A surviving card stops the cascade.],
    [*3. Cleanup* \ Destroyed cards go to discard. If Front fell and Back survived, *Back advances* to Front.],
    [*4. Reinforce* \ Defender may place 1 hand card into the *attacked column* (or pass reinforcement).],
    [*5. Draw & Swap* \ Defender refills hand up to *4 cards*. Empty deck is *not* a loss. Roles swap!],
  )
]

#v(6pt)

#figure(
  image("/docs/diagrams/svg/turn-lifecycle-and-cascade.svg", width: 100%),
  caption: [Turn lifecycle and v3.0 Column Cascade flow (generated directly from `docs/diagrams/turn-lifecycle-and-cascade.d2`).],
)

#pagebreak()

// ========================== PAGE 2: SUIT BOUNDARIES & EXAMPLES ==========================
#block(
  width: 100%,
  inset: 9pt,
  radius: 5pt,
  fill: ink,
)[
  #text(fill: paper, size: 12pt, weight: "bold")[Suit Boundary Rules — Red Shields (`♦ ♥`), Blue Weapons (`♣ ♠`)] \
  #text(fill: rgb("#cbd5e1"), size: 8.5pt)[Suits are *timing rules*, not passive stats. In v3.0, *Shields always resolve before Weapons* at each boundary.]
]

#v(6pt)

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  panel("♦ DIAMONDS — Card-to-Card Shield", red_shield)[
    *Trigger:* Fires when a *Diamond* is *destroyed* and carryover is headed to the *Back card*. \
    *Effect:* Subtract the Diamond's own value from carryover *before* Clubs can double it:
    $ c' = max(0, c - v_"♦") $
  ],
  panel("♣ CLUBS — Breakthrough Weapon", blue_weapon)[
    *Trigger:* Fires *once* when a *Club attacker* destroys a card and carryover crosses to the *next card*. \
    *Effect:* Double the post-Diamond carryover:
    $ c' = 2 dot max(0, c - v_"♦") $
  ],
  panel("♥ HEARTS — Life-Point Ward", red_shield)[
    *Trigger:* Fires when the *last card destroyed* before Opponent LP is a *Heart*. Hearts do not stack. \
    *Effect:* Subtract the Heart's value from carryover *before* Spades can double it:
    $ "LP loss" = max(0, c - v_"♥") $
  ],
  panel("♠ SPADES — Finishing Blow Weapon", blue_weapon)[
    *Trigger:* Fires when a *Spade attacker* carries damage across the final boundary into *Opponent LP*. \
    *Effect:* Double the post-Heart LP damage:
    $ "LP loss" = 2 dot max(0, c - v_"♥") $
  ],
)

#v(8pt)

#panel("Worked Cascade Examples (Check Your Math)", teal)[
  #table(
    columns: (1.1fr, 1.2fr, 2.3fr, 0.8fr),
    inset: 6pt,
    stroke: 0.5pt + border,
    fill: (x, y) => if y == 0 { ink } else if calc.odd(y) { paper } else { card_bg },
    table.header(
      text(fill: paper, weight: "bold")[Attacker],
      text(fill: paper, weight: "bold")[Defending Column],
      text(fill: paper, weight: "bold")[Step-by-Step Resolution (v3.0)],
      text(fill: paper, weight: "bold")[LP Loss],
    ),
    [*9♣* (Club)], [Front *4♦*, Back *5♠*], [9 hits 4♦ → 4♦ destroyed, carryover 5. *♦ Shield first:* $5 - 4 = 1$. *♣ Doubles:* $1 times 2 = 2$. Hits 5♠ → 5♠ survives at 3 HP.], [*0 LP*],
    [*10♠* (Spade)], [Front *6♣*, Back *2♥*], [10 hits 6♣ → destroyed, carryover 4. 4 hits 2♥ → destroyed, carryover 2. *♥ Ward first:* $2 - 2 = 0$. *♠ Doubles:* $0 times 2 = 0$.], [*0 LP*],
    [*10♠* (Spade)], [Front *5♣*, Back *2♦*], [10 hits 5♣ → destroyed, carryover 5. 5 hits 2♦ → destroyed, carryover 3. No Heart at LP boundary. *♠ Doubles:* $3 times 2 = 6$.], [*6 LP*],
    [*8♥* (Heart)], [Front *A♦*, Back *3♣*], [Non-Ace vs Ace: A♦ absorbs 1, survives (`hp = 1`), carryover 7 hits 3♣ → destroyed, carryover 4 hits LP.], [*4 LP*],
  )
]

#v(8pt)

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  panel("Victory & Draw Conditions", ink)[
    - *Knockout:* Reduce opponent to *0 LP* immediately.
    - *Forfeit / Pass Limit:* Conceding or exceeding consecutive/total pass limits forfeits.
    - *Empty Deck:* *Not a loss* — keep playing with cards in hand and on board.
    - *Competitive Liveness (v3.0):* 3× exact position repetition, 50 turns with no irreversible progress, or 200-turn cap ends in a draw.
  ],
  panel("Tabletop Habits & Digital Companion", blue_weapon)[
    - *Damage Resets:* Surviving cards reset to full HP at end of turn (Classic mode).
    - *Open Information:* Both battlefields and discards are face-up; only hands and drawpiles are hidden.
    - *Combat Lab:* Verify tricky suit interactions live at *phalanxduel.com/tools/combat-lab*.
  ],
)
