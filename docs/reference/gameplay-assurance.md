---
title: "Gameplay Assurance Charter"
description: "Scope, evidence vocabulary, traceability, and gap lifecycle for scientific gameplay assurance."
status: active
updated: "2026-07-13"
audience: contributor
related:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/quality/gameplay-rule-evidence.md
  - docs/quality/combat-reference-proof.md
  - docs/architecture/principles.md
---

# Gameplay Assurance Charter

Phalanx Duel treats correctness as a relationship between a versioned claim,
an authoritative rule, an implementation, and independently inspectable
evidence. A green test suite is necessary but does not by itself prove that the
implemented game is the intended game.

## Authority Model

The authority model remains the one locked by ADR-001:

1. `docs/gameplay/rules.md` is normative gameplay authority.
2. `shared/src/schema.ts` is contract authority.
3. `engine/src/state-machine.ts` is runtime transition authority.
4. Descriptive documentation must agree with those authorities.

The rule-evidence registry does not replace any authority. It assigns stable
identifiers to normative claims and records the current evidence attached to
them. The independent combat reference model is a verification adapter, not
runtime authority.

## Assurance Scope

The assurance program covers:

- configuration acceptance and rejection;
- legal and illegal state transitions;
- combat arithmetic and modifier ordering;
- card, HP, LP, phase, and identity invariants;
- determinism, event derivation, hashing, and replay equivalence;
- match liveness and terminal outcomes;
- observer-relative information integrity;
- rating settlement correctness and isolation;
- reproducible statistical claims about shuffle, initiative, suits, and bots;
- player-facing mathematical explanations derived from authoritative evidence.

Availability, rendering aesthetics, network latency, and population-wide game
balance are not formal gameplay proofs. They receive operational or statistical
evidence under separately stated hypotheses.

## Evidence Levels

Evidence levels describe what has actually been established. They are not a
maturity score and must not be silently promoted.

| Level | Name | Establishes |
|---|---|---|
| `E0` | Assertion | Normative or descriptive intent only |
| `E1` | Example | One or more representative cases |
| `E2` | Generated property | A quantified property over generated inputs or action sequences |
| `E3` | Exhaustive finite check | Every member of a declared finite domain was checked |
| `E4` | Formal argument | A proof or model-check result under explicit axioms |
| `E5` | Statistical experiment | A preregistered empirical claim with uncertainty and effect thresholds |
| `E6` | Operational observation | Production or staging drift and incident evidence |

Determinism is not semantic correctness. Coverage is not proof. Replay
self-consistency does not establish that the replayed rule is the normative
rule. Statistical evidence cannot prove a universal invariant.

## Assurance Status

Each rule has one current status:

- `aligned`: inspected implementation and listed evidence agree with the claim;
- `partial`: only part of the claim or supported domain is covered;
- `divergent`: a reproducible implementation or documentation disagreement exists;
- `unverified`: the normative claim is registered but lacks independent evidence.

`aligned` is always qualified by its evidence level. An `E1 aligned` rule has
example support; it is not exhaustively proved.

## Stable Rule Identifiers

Normative claims use identifiers `PD-RULE-001` through `PD-RULE-071`. The
machine-readable registry is `docs/gameplay/rule-evidence.json`. Identifiers are
never recycled. A changed claim retains its identifier only when its meaning is
compatible; otherwise a new identifier and rules-version decision are required.

The generated view at `docs/quality/gameplay-rule-evidence.md` is disposable.
Edit the JSON registry or normative rules, then regenerate it. Archived audit
reports are historical evidence and never determine current status.

## Calculation Provenance

Competitive v3.0 combat records a schema-versioned arithmetic witness in each
attack transaction. The witness is not prose and is not reconstructed by the
client: it is an ordered sequence of integer operators, named operands with
explicit origins, results, target quantities, visibility labels, and stable
rule identifiers. `verifyCalculationProvenance` independently re-evaluates
every operator and verifies exact prior-step continuity. The authoritative
engine performs that verification before committing the transaction.

The stored combat resolution carries the same witness through live events,
preview, and replay. Historical v1.0/v2.0 transactions keep their original
shape and use an explicit compatibility derivation. Event-log fingerprints
commit to the complete event payload, including calculation provenance.

## Observer Knowledge and Noninterference

Raw `GameState` is internal authority, not a client or bot input. The engine's
observer projection defines the authorized information set for each player,
competitive bot, live spectator, completed replay, and explicitly internal
research adapter. Negative noninterference tests perturb hidden hands, draw-pile
order, deck seeds, state hashes, and liveness witnesses, then require byte-for-
byte-equivalent projections and competitive bot decisions.

Live spectators consume deterministic replay frames at least two turns behind
the authority (three by default). Reconstruction failure is fail-closed.
Completed replay unlock is explicit and terminal-only. Calculation evidence uses
closure-preserving prefix projection, so a hidden intermediate cannot be inferred
from a later visible step.

## Gap Lifecycle

Every detected discrepancy receives a stable gap identifier and records:

- affected rule identifiers;
- minimal counterexample or reproduction;
- severity: `critical`, `high`, `medium`, or `low`;
- current evidence level;
- impact such as determinism, integrity, exploit risk, UX, or maintainability;
- disposition;
- replay and compatibility implications;
- closure evidence.

Allowed dispositions are:

1. correct the implementation;
2. correct the specification;
3. constrain the supported domain;
4. introduce versioned behavior;
5. accept explicitly with quantified risk;
6. defer with an owner and review condition.

No failing test, silence, or an archived status label is a disposition.

## Completion Semantics

A claim is complete only relative to its declared scope. Formalizable finite
claims should reach `E3` or `E4`. Stateful invariants should have `E2` evidence
and mutation resistance. `pnpm verify:mutation:gameplay` targets
fairness-critical combat arithmetic and liveness predicates with a 90% break
threshold. It excludes syntax-shape mutators that do not represent the declared
arithmetic/predicate threat model; the reviewed v3.0 baseline kills all 204
included semantic mutants. Balance claims require `E5`. Production drift is
monitored with `E6` but cannot replace lower-level semantic evidence.

A release assurance manifest may say “proved” only for `E3` or `E4` claims and
must name the finite domain or axioms. All other claims use “observed”,
“property-tested”, or “statistically supported”.

## Verification Workflow

Run:

```bash
rtk pnpm rules:check
```

The rule-evidence verifier rejects malformed registries, duplicate or missing
identifiers, missing normative source markers, missing referenced files, and a
stale generated traceability view. The same gate runs the independent combat
model checker and rejects implementation coupling, unexplained differential
mismatches, proof-count drift, and result-digest drift. Its precise finite
domain and composition argument are documented in
`docs/quality/combat-reference-proof.md`.

Regenerate the view intentionally with:

```bash
rtk pnpm rules:evidence:write
```
