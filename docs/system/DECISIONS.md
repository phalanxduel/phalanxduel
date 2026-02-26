# Phalanx Duel — System Decisions Register (Units 2A-2D)

## Purpose

This file is the canonical source of truth for implementation decisions in Units
`2A` through `2D`.

To avoid decision drift:
- record each decision here with a stable ID,
- track status and ownership explicitly,
- link implementation work back to these IDs.

## Status Legend

- `locked`: agreed and ready for implementation
- `open`: unresolved; decision still required
- `deferred`: intentionally postponed with no immediate implementation impact

## Decision Register

| ID | Unit | Status | Owner | Date | Decision |
| --- | --- | --- | --- | --- | --- |
| DEC-2A-001 | 2A | locked | Project Owner + Engine | 2026-02-26 | Authority model is explicit: `docs/RULES.md` is normative rules authority; `shared/src/schema.ts` is contract authority; `engine/src/state-machine.ts` is runtime transition authority; `docs/system/ARCHITECTURE.md` is descriptive and must match runtime/contracts. |
| DEC-2A-002 | 2A | locked | Project Owner + Engine | 2026-02-26 | Any runtime behavior change must update `docs/RULES.md` in the same unit or add a temporary divergence note linked to a follow-up unit. |
| DEC-2A-003 | 2A | locked | Engine | 2026-02-26 | Drift guardrails are CI-enforced (`pnpm rules:check`) for phase-order docs consistency and stale FSM doc references. |
| DEC-2B-001 | 2B | locked | Project Owner + Engine | 2026-02-26 | XState adoption path is engine-first and shadow/adapter-first; no big-bang authority switch. |
| DEC-2B-002 | 2B | locked | Project Owner + Engine | 2026-02-26 | Deterministic replay/hash compatibility is the primary migration constraint; design now as XState-forward without binding replay validity to framework internals. |
| DEC-2C-001 | 2C | locked | Project Owner + Engine | 2026-02-26 | Verification is policy-based with `standard` and `official` profiles; policy is immutable per match once play begins. |
| DEC-2C-002 | 2C | locked | Project Owner + Engine | 2026-02-26 | Machine binding in signatures is optional by policy: required for `official`, optional for `standard`/casual contexts. |
| DEC-2C-003 | 2C | locked | Project Owner + Platform | 2026-02-26 | `official` outputs must be verifiable offline by third parties; public-key distribution direction is JWKS-compatible metadata. |
| DEC-2C-004 | 2C | locked | Project Owner | 2026-02-26 | Official spectator delay policy minimum floor is `2` turns with default `3` turns; event-configurable override allowed. |
| DEC-2C-005 | 2C | locked | Project Owner | 2026-02-26 | Hidden-state reveal default is `endOfMatch`; `endOfRound` is a supported option; reveal delay may be configured and can be set to `0` when policy permits. |
| DEC-2D-001 | 2D | locked | Project Owner + Platform | 2026-02-26 | Event topology uses one private canonical ingress stream plus trusted derived streams split by audience; direct public read from ingress is disallowed. |
| DEC-2D-002 | 2D | locked | Project Owner + Platform | 2026-02-26 | Production analytics starts from a public-safe derived-feature stream (redacted hidden state by default). Local dev may opt into richer hidden-state visibility. |
| DEC-2D-003 | 2D | locked | Project Owner + Platform | 2026-02-26 | Public stream defaults to public-safe post-state payloads; hash+reference-only variants are future extensions. |
| DEC-2D-004 | 2D | locked | Project Owner + Platform | 2026-02-26 | Ranked-like mode may run with guest aliases but remains explicitly non-authoritative until auth/persistence exists. |
| DEC-2D-005 | 2D | locked | Project Owner + Platform | 2026-02-26 | Stable cross-match pseudonyms are treated as an auth-provider concern and stay decoupled from game rules/engine semantics. |
| DEC-2D-006 | 2D | locked | Project Owner | 2026-02-26 | Scope is Duel first; multi-format policy generalization is deferred to a later unit. |

## Mode Policy Matrix (Current Defaults)

| Mode | Verification Profile | Identity Mode | Hidden-State Exposure | Authority Level |
| --- | --- | --- | --- | --- |
| Casual | `standard` | match alias (ephemeral) | public-safe only in public streams; dev-local richer visibility allowed | non-authoritative |
| Ranked-like (pre-auth) | `standard` | guest alias (ephemeral) | public-safe only | explicitly non-authoritative |
| Official | `official` | policy-bound identity (alias now; auth-backed later) | redacted during live play, delayed reveal policy (`endOfMatch` default; `endOfRound` option) | authoritative/auditable |

## Open Choices (Non-Blocking for Current Unit)

| ID | Unit | Status | Owner | Date | Open Choice |
| --- | --- | --- | --- | --- | --- |
| DEC-OPEN-2C-001 | 2C | open | Platform + Security | 2026-02-26 | Final signing profile defaults: algorithm suite, key ID format, and concrete rotation/retirement/revocation/retention windows. |
| DEC-OPEN-2D-001 | 2D | open | Platform | 2026-02-26 | Long-term private ingress/audit storage backend once persistence is available (stream-only now). |
| DEC-OPEN-2D-002 | 2D | open | Platform + Auth | 2026-02-26 | Stable pseudonym provider implementation strategy once auth/persistence is introduced. |

## Update Protocol

When a decision changes:
1. Update this register first (status/date/decision text).
2. Update affected implementation/docs in the same PR.
3. Link the change in `docs/system/FUTURE.md` progress notes.
