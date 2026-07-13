---
title: "Combat Reference Model Proof Boundary"
description: "Finite domains, composition argument, evidence, and explicit limits for the independent combat verifier."
status: active
updated: "2026-07-13"
audience: contributor
related:
  - docs/gameplay/rules.md
  - docs/reference/gameplay-assurance.md
  - docs/reference/test-constitution.md
---

# Combat Reference Model Proof Boundary

`pnpm rules:combat-reference` differentially checks the production combat
resolver against an independently implemented interpretation of
`docs/gameplay/rules.md` §§8–12. The reference implementation imports only
shared data types; CI rejects imports of the production engine, deck generator,
or combat resolver from the reference modules.

## Proved Domain

The verifier establishes extensional equality over this finite domain:

- all 52 canonical cards: 4 suits × 13 faces;
- all generated competitive card types: number, ace, jack, queen, and king;
- every legal live HP value for every target card, producing 352 card states
  per rank (`sum(card.value)` over the 52-card manifest);
- both supported rules dispatches, v2.0 and historical v1.0;
- both values of Classic Aces and Classic Face Cards, and both classic and
  cumulative damage persistence, producing 16 mode configurations;
- card-transition incoming damage 0–22, a conservative superset of every
  reachable two-rank input including the historical v1.0 empty-front Club
  behavior;
- Card→Card boundary carryover 0–20, Diamond shield 0–11, both Club
  eligibility states, and both modifier orders;
- Card→Player carryover 0–40, Heart shield 0–11, both Spade states, and both
  modifier orders;
- every defender LP value 0–500 for direct player chains;
- every empty, front-only, and back-only physical chain state; and
- a deterministic two-rank orchestration basis spanning every suit, generated
  card type, low/full HP branch, mode, Ace/number/face attacker class, modifier
  interaction, discard ordering, combo counting, and final-Heart selection.

The machine-readable counts and SHA-256 domain/result digest are stored in
`docs/quality/combat-reference-proof.json`. CI recomputes both and fails on
unexplained domain drift.

## Why Composition Is Complete

Competitive combat is a deterministic composition of three pure transitions:

```text
CardTransition ∘ CardBoundary ∘ CardTransition ∘ PlayerBoundary
```

The first target may be absent and the second target may be absent, yielding
the shorter chain topologies. The verifier exhaustively proves equality of the
production and reference functions for every input in each transition's finite
integer domain. Equality is substitutive: if `P_i(x) = R_i(x)` for every input
to each stage `i`, then replacing stages one at a time proves
`P_n ∘ … ∘ P_1 = R_n ∘ … ∘ R_1`. End-to-end topology checks additionally
verify orchestration state, log mutation, discard ordering, combo counting,
and LP clamping.

This is bounded model checking plus a composition argument, not an unqualified
proof of every possible match.

## Explicit Non-Claims

This proof does not establish:

- generalized Hybrid or Manual combat with more than two ranks;
- deployment, turn legality, reinforcement, victory, replay, or transport
  correctness outside their separate evidence;
- future Joker gameplay (Joker is reserved but absent from the canonical
  52-card manifest);
- balance, strategy optimality, matchmaking fairness, or statistical fairness;
- correctness of prose outside the cited rules and evidence registry.

Failures are deterministic and emit the first lexicographically minimal
counterexample in domain order, including applicable `PD-RULE-*` identifiers,
input modes, cards, HP, and expected/actual structures.
