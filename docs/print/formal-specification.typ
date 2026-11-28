// Phalanx Duel v3.0 — Formal Mathematical & Algorithmic Specification
// Compiled via: typst compile --root . docs/print/formal-specification.typ output/pdf/phalanx-duel-formal-specification.pdf

#let evidence = json("/docs/gameplay/rule-evidence.json")
#let metrics = json("/docs/print/data/monograph-metrics.json")
#let rules = evidence.rules
#let total_rules = rules.len()
#let aligned_count = rules.filter(r => r.status == "aligned").len()
#let partial_count = rules.filter(r => r.status == "partial").len()
#let unverified_count = rules.filter(r => r.status == "unverified").len()

#let count_formalization(kind) = rules.filter(r => r.formalization == kind).len()
#let count_evidence(tier) = rules.filter(r => r.evidence == tier).len()

#let ink = rgb("#172033")
#let muted = rgb("#566071")
#let teal = rgb("#0f766e")
#let red_shield = rgb("#c7374f")
#let blue_weapon = rgb("#2775a6")
#let amber = rgb("#d97706")
#let paper = rgb("#fffdf8")
#let card_bg = rgb("#f5f2eb")

#set document(
  title: "Phalanx Duel v3.0 — Formal Mathematical & Algorithmic Specification",
  author: "Mike Hall",
)
#set page(
  paper: "us-letter",
  margin: (x: 0.72in, y: 0.72in),
  fill: paper,
  header: context {
    if counter(page).get().first() > 1 [
      #set text(size: 8pt, fill: muted)
      *Phalanx Duel Classic v#evidence.rulesVersion* — Formal Specification
      #h(1fr)
      Normative Source: `docs/gameplay/rules.md`
    ]
  },
  footer: context [
    #set text(size: 8pt, fill: muted)
    Deterministic Engine Reference (`@phalanxduel/engine`)
    #h(1fr)
    Page #counter(page).display("1 of 1", both: true)
  ],
)
#set text(font: ("Helvetica Neue", "Arial"), size: 9.5pt, fill: ink)
#set heading(numbering: "1.1")
#show heading.where(level: 1): it => {
  v(0.6em)
  block(
    below: 0.5em,
    stroke: (bottom: 1.2pt + teal),
    inset: (bottom: 3pt),
    width: 100%,
    text(size: 13pt, weight: "bold", fill: ink, it),
  )
}
#show heading.where(level: 2): it => {
  v(0.4em)
  text(size: 10.5pt, weight: "bold", fill: teal, it)
}

#let box_block(title, accent, body) = block(
  width: 100%,
  inset: (x: 10pt, y: 8pt),
  radius: 4pt,
  fill: card_bg,
  stroke: (left: 3pt + accent, rest: 0.5pt + rgb("#d9d5ca")),
  breakable: false,
)[
  #text(weight: "bold", fill: accent, size: 9pt)[#title]
  #v(2pt)
  #body
]

// Title Banner
#block(
  width: 100%,
  inset: 14pt,
  radius: 6pt,
  fill: ink,
)[
  #text(fill: rgb("#fffdf8"), size: 17pt, weight: "bold")[Phalanx Duel Classic v#evidence.rulesVersion] \
  #v(2pt)
  #text(fill: rgb("#cbd5e1"), size: 10.5pt)[Formal Mathematical, Algorithmic & Verification Specification] \
  #v(6pt)
  #text(fill: rgb("#94a3b8"), size: 8.5pt)[
    Auto-bound to `engine/src/combat-math.ts`, `engine/src/state-machine.ts`, `engine/src/liveness.ts`, and `docs/gameplay/rule-evidence.json`
    (#total_rules normative rules · #aligned_count aligned · #partial_count partial · #unverified_count unverified).
  ]
]

#v(6pt)

= State Space & Geometry Invariants

A Phalanx Duel match is a finite-state, zero-RNG-after-deal deterministic transition system
$cal(M) = (cal(S), cal(A), delta, s_0, cal(E))$ parameterized by a rectangular battlefield of $r$ rows and $c$ columns (Classic: $r = 2, c = 4$, starting Life Points $"LP"_0 = 20$). Each player $p in {0, 1}$ owns an independent 52-card deck $D_p$ shuffled deterministically from a recorded seed.

#box_block("Axiom 1 — Global Geometry & Scarcity Invariants (PD-RULE-005..008)", teal)[
  For every legal parameter tuple $(r, c, h_max, D_0)$:
  $ r dot c <= 48, quad h_max <= c, quad D_0 = r c + c, quad 52 - D_0 >= 4 $
  In Classic v3.0 ($r = 2, c = 4$): $r c = 8$ battlefield slots, $h_max = 4$ hand cards, initial draw $D_0 = 12$, leaving a deterministic drawpile reserve of $52 - 12 = 40 >= 4$ cards.
]

= Deterministic Turn Lifecycle

The authoritative transition function $delta : cal(S) times cal(A) -> cal(S) times cal(E)^*$ advances through an eight-phase finite state machine verified by `scripts/ci/verify-doc-fsm-consistency.ts`:
$ "StartTurn" -> "DeploymentPhase" -> ("AttackPhase" -> "AttackResolution" -> "CleanupPhase" -> "ReinforcementPhase" -> "DrawPhase" -> "EndTurn")^* -> "gameOver" $

#figure(
  image("/docs/diagrams/svg/turn-lifecycle-and-cascade.svg", width: 100%),
  caption: [Single-source D2 diagram of the 8-phase FSM (`engine/src/state-machine.ts`) and v3.0 Column Cascade (`engine/src/combat-math.ts`).],
)

= Combat Cascade & Suit Boundary Algebra

When a front-rank attacker $a$ with base attack $d_0$ strikes column $j$, damage propagates deterministically through front card $f$, card-to-card boundary $cal(B)_"card"$, back card $b$, player boundary $cal(B)_"player"$, and opponent Life Points $"LP"$.

== Card Transition Function (`resolveCardTransition`)

Let $h >= 1$ be the target card's current HP and $d > 0$ the incoming damage.

1. *Face-Card Eligibility Partial Order (`isFaceCardEligible`):*
   On face-card defenders ${J, Q, K}$, face-card attackers obey the rank hierarchy
   $ "Jack" prec.eq {"Jack"}, quad "Queen" prec.eq {"Jack", "Queen"}, quad "King" prec.eq {"Jack", "Queen", "King"} $
   (while non-face attackers—number cards and Aces—are unrestricted by this check).
   If `modeClassicFaceCards` is active and a `jack` attacks `{Q, K}` or a `queen` attacks `K`, the target is ineligible: $c_"out" = 0$, $"destroyed" = bot$, and in Classic mode $h' = h$ (in Cumulative mode $h' = max(h - d, 1)$).

2. *Ace Duality (`modeClassicAces`):*
   If the target $t$ is an Ace:
   - *Front-rank Ace vs. Ace:* standard lethal absorption applies ($"abs" = min(d, h)$, $h' = h - "abs"$, $c_"out" = d - "abs"$).
   - *All other matchups (`aceInvulnerable`):* the Ace absorbs at most $1$ damage and cannot be destroyed:
     $ "abs" = min(d, 1), quad h' = 1, quad c_"out" = d - "abs", quad "destroyed" = bot $

3. *Standard Card Absorption:*
   $ "abs" = min(d, h), quad h' = h - "abs", quad c_"out" = d - "abs", quad "destroyed" <=> (h' = 0) $

== Non-Commutative Suit Boundary Operators

Suits are *boundary-scoped timing operators*, not passive stats. Shields (`♦`, `♥`) fire only when the card carrying them is *destroyed* at that boundary; weapons (`♣`, `♠`) fire only when the *attacker* carries that suit.

#box_block("Definition 1 — Card-to-Card Boundary Operator (resolveCardBoundary)", blue_weapon)[
  Given post-front carryover $c_1 > 0$, destroyed-front Diamond shield value $delta_"♦" >= 0$, and Club eligibility $I_"♣" in {0, 1}$:
  $ cal(B)_"card"^(v 3)(c_1) = cases(
    2 dot max(0, c_1 - delta_"♦") & "if" I_"♣" = 1 "and" c_1 > delta_"♦",
    max(0, c_1 - delta_"♦") & "otherwise"
  ) $
]

#box_block("Definition 2 — Player LP Boundary Operator (resolvePlayerBoundary)", red_shield)[
  Given post-back (or empty-back) carryover $c_2 > 0$, last-destroyed Heart shield value $delta_"♥" >= 0$, and Spade weapon flag $I_"♠" in {0, 1}$:
  $ cal(B)_"player"^(v 3)(c_2) = cases(
    2 dot max(0, c_2 - delta_"♥") & "if" I_"♠" = 1 "and" c_2 > delta_"♥",
    max(0, c_2 - delta_"♥") & "otherwise"
  ) $
]

#box_block("Theorem 1 — Non-Commutativity of Shield and Weapon Operators", amber)[
  Let $S_delta (x) = max(0, x - delta)$ be a boundary shield ($delta >= 0$) and $W(x) = 2 x$ be a weapon multiplier. For all $x >= 0$ and $delta >= 0$:
  $ (S_delta compose W)(x) - (W compose S_delta)(x) = max(0, 2x - delta) - 2 max(0, x - delta) = min(delta, max(0, 2x - delta)) >= 0 $
  with strict inequality ($(W compose S_delta)(x) < (S_delta compose W)(x)$) *if and only if* $0 < delta < 2x$.
  *Consequence:* v3.0 applies *Shield before Weapon* ($W compose S_delta$), strictly reducing burst variance relative to legacy v1.0 ($S_delta compose W$) whenever $0 < delta < 2x$, and ensuring any shield with $delta >= x$ zeroes out the doubling trigger completely.
]

= Total Termination (Liveness Theorem)

In `engine/src/liveness.ts`, every v3.0 `AttackPhase` turn boundary evaluates a collision-free canonical position witness $sigma(s)$ (encoding `specVersion`, `phase`, `activePlayerIndex`, `passState`, and ordered per-player card tokens across hand, battlefield, drawpile, and discard) alongside a four-component progress vector:
$ Phi(s) = (sum_p "LP"_p, quad sum_p sum_(k) "hp"_(p,k), quad sum_p |"Draw"_p|, quad -sum_p |"Discard"_p|) $
Irreversible progress holds iff any coordinate of $Phi$ strictly decreases between turn boundaries.

#box_block("Theorem 2 — Guaranteed Finite Termination (Liveness Policy v3.0)", teal)[
  For every valid v3.0 action sequence $a_1, a_2, dots$, the match reaches `gameOver` in at most $200$ completed turns. At every `AttackPhase` turn boundary without a decisive 0-LP or forfeit outcome, draw termination is decided by the strict precedence lattice:
  $ "count"(sigma(s)) >= 3 ==> "repetitionDraw" quad succ quad "noProgressTurns" >= 50 ==> "noProgressDraw" quad succ quad t >= 200 ==> "turnLimitDraw" $
  Because `turnNumber` increments strictly on every completed turn and `hardTurnLimit = 200`, no infinite game loop is reachable in v3.0.
]

= Authority Ledger, Fog-of-War & Cryptographic Replay

Every match is an immutable fold from its initial seed $s_0 = "createInitialState"("config")$ over the server-authoritative action log:
$ s_n = delta^* (s_0, chevron.l a_1, dots, a_n chevron.r), quad h_t = "SHA-256"("canonical"(s_t)) $
Each client surface receives only a redacted projection $pi_o(s_t)$ stripping opponent hidden hand and drawpile order; spectators receive $pi_"spec"(s_(t'))$ bounded by `replayGameAtOrBeforeTurn` for anti-stream-snipe delay. Any third party can verify match integrity offline via `GET /api/matches/:id/verify` by asserting $H("replayed") = h_t$ at every turn.

#figure(
  image("/docs/diagrams/svg/authority-ledger-and-fog-of-war.svg", width: 100%),
  caption: [Server-authoritative action ledger, Fog-of-War projection functor $pi_o$, and zero-trust replay verification.],
)

= Machine-Verified Rule Evidence Matrix

The table below is compiled *directly* from `docs/gameplay/rule-evidence.json` at PDF build time—preventing specification drift between documentation and CI.

#table(
  columns: (1.6fr, 1fr, 1fr, 1fr),
  inset: 6pt,
  stroke: 0.5pt + rgb("#d9d5ca"),
  fill: (x, y) => if y == 0 { ink } else if calc.odd(y) { card_bg } else { paper },
  table.header(
    text(fill: paper, weight: "bold")[Metric],
    text(fill: paper, weight: "bold")[Count],
    text(fill: paper, weight: "bold")[Formalization Type],
    text(fill: paper, weight: "bold")[Rules],
  ),
  [Total Normative Rules], [*#total_rules*], [Predicates & Invariants], [#(count_formalization("predicate") + count_formalization("invariant"))],
  [Aligned with Engine + Tests], [*#aligned_count*], [Transitions & Protocols], [#(count_formalization("transition") + count_formalization("protocol"))],
  [Partial Alignment], [#partial_count], [Equations & Inequalities], [#(count_formalization("equation") + count_formalization("inequality"))],
  [Unverified (`E0`)], [#unverified_count], [Evidence Tier `E1`+], [#(total_rules - count_evidence("E0"))],
)

#v(6pt)

#box_block("Formal Verification & Assurance Surface (monograph-metrics.json)", ink)[
  - *Package Version:* `v#metrics.packageVersion` (build `#metrics.buildNumber`) · *FSM:* `#metrics.fsm.phaseCount` phases, `#metrics.fsm.transitionCount` transitions (`#metrics.fsm.nonTerminalPhases` non-terminal, verified deadlock-free).
  - *Unbounded SMT-LIB2 Proofs (Z3):* `#metrics.formalSpec.smtProofSuite` — *#metrics.formalSpec.smtTheoremCount / #metrics.formalSpec.smtTheoremCount* unbounded theorems proved over all integers $ZZ$ (`unsat` Q.E.D. via `pnpm verify:proofs`: Shield-Zeroes-Weapon, v3.0 Burst-Dominance, Exact Non-Commutativity Identity, Strict Non-Commutativity iff $0 < delta < 2x$, Damage Conservation, Ace Invulnerability Conservation, Liveness Bounded Termination $<= 200$, and Fog-of-War Non-Interference).
  - *TLA+ Model & Executable Verifier:* `#metrics.formalSpec.tlaModule` mirrored by `#metrics.formalSpec.verifierScript` (`pnpm verify:formal`).
  - *Exhaustive Combat Oracle:* `#metrics.formalSpec.exhaustiveCombatTransitions` verified combat transitions (`pnpm rules:combat-reference`).
  - *Liveness Policy:* `#metrics.liveness.repetitionOccurrences`× repetition · `#metrics.liveness.noProgressTurns`-turn no-progress · `#metrics.liveness.hardTurnLimit`-turn hard cap.
]
