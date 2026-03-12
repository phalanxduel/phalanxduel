# Production Readiness Review

- Reviewer: Codex
- Model: GPT-5
- Date: 2026-03-10
- Repository: `phalanxduel/game`

## Review Method

I reviewed `docs/RULES.md`, `docs/system/ARCHITECTURE.md`, `docs/system/DECISIONS.md`, the `shared`, `engine`, `server`, and `client` packages, and the current test/verification scripts.

Validation run on 2026-03-10:

- `pnpm check:quick`
  - Failed at `markdownlint-cli2` because existing files under `docs/review/` and `docs/review/PRODUCTION_READINESS_REVIEW.md` already violate markdown rules.
- `pnpm test`
  - `shared`, `engine`, and `client` passed.
  - `server` failed inside the sandbox because several tests need to bind local listeners.
- `pnpm --filter @phalanxduel/server test`
  - Re-ran outside the sandbox.
  - Passed: 24 files, 157 tests.

I also ran three direct runtime probes against the built server/engine artifacts:

- A player received the opponent's hidden hand in `result.preState`.
- A player successfully submitted an action on behalf of the opponent by spoofing `action.playerIndex`.
- Replay from persisted `config + actionHistory` failed on the first deploy with `Card not found in hand`.

## 1. Executive Assessment

Overall judgment: strong architecture and rule-oriented intent, but not ready for production.

Readiness status: not ready for production.

Why:

- The codebase already has the right package split, explicit schemas, deterministic shuffle/hash primitives, and a meaningful automated test suite.
- The current server still violates core competitive-game requirements around authority, hidden information, and replayability.
- Those are launch blockers for any environment where fairness, disputes, or public trust matter.

Top 5 risks:

1. Critical: hidden-state leakage to players and spectators. `server/src/match.ts:544-583` sends filtered `postState` but the raw authoritative state as `preState`.
1. Critical: action spoofing across players. `server/src/match.ts:440-498` trusts client-supplied `action.playerIndex`, and `engine/src/turns.ts:119-196` validates only against that field.
1. Critical: persisted replay is not trustworthy. `server/src/match.ts:404-415` does not persist `drawTimestamp`, but `engine/src/state.ts:126-170` uses it to generate card IDs and `engine/src/replay.ts:24-43` depends on reconstructing those IDs.
1. High: the canonical event model in the rules is not implemented. `shared/src/schema.ts:102-110` and `shared/src/schema.ts:462-468` define event support, but `server/src/match.ts:558-564` and `server/src/match.ts:576-582` always emit `events: []`.
1. High: production fail-closed controls are incomplete. `server/src/app.ts:165-172` falls back to a known JWT secret, and `server/src/db/match-repo.ts:34-55` logs persistence failures instead of failing the authoritative command path.

## 2. Architecture and System Boundaries

Strengths:

- The package boundaries are good:
  - `shared/` holds schemas and hashing.
  - `engine/` is mostly pure deterministic game logic.
  - `server/` is the authority and transport layer.
  - `client/` largely renders server state instead of simulating rules locally.
- `docs/system/ARCHITECTURE.md` correctly describes a server-authoritative shape.
- `engine/src/state-machine.ts` gives the turn loop an explicit transition model.

Boundary problems:

- `MatchManager` carries too many responsibilities at once: match lifecycle, connection tracking, action authorization, audience projection, persistence, telemetry hooks, and bot orchestration all live in one class.
- Canonical state and audience-facing state are not cleanly separated. The hidden-state leak in `server/src/match.ts:544-583` exists because the same payload object is serving both audit and projection purposes.
- Persistence is not modeled as a first-class authoritative boundary. The server stores `state`, `actionHistory`, and `transactionLog` together, but without an append-only canonical record or hard durability guarantees.
- The rules and schemas describe an event model that the runtime does not actually own. In practice the canonical record is a transaction log plus out-of-band telemetry, not the event model the docs advertise.

Recommendations:

- Split `MatchManager` into at least three concerns:
  - authoritative command handler,
  - audience projection/redaction layer,
  - persistence/replay service.
- Introduce an explicit `ActorContext` derived from socket/session and stop treating `Action.playerIndex` as authoritative input.
- Separate canonical match records from player/spectator projections. A client payload should never include raw authoritative state unless it has already been filtered for that audience.
- Decide which artifact is authoritative for match reconstruction:
  - append-only transaction/event log,
  - or full snapshots plus log.
  Today it is an unstable hybrid.

## 3. Determinism and Rule Fidelity

What is strong:

- `engine/src/deck.ts` uses seeded deterministic shuffle.
- `shared/src/hash.ts` sorts object keys before hashing.
- `engine/src/turns.ts` records `stateHashBefore`, `stateHashAfter`, and `phaseTrace`.
- Engine replay and state-machine tests are meaningful and currently pass.

What undermines determinism confidence:

- Persisted replay is currently broken for real matches. The server builds `GameConfig` without `drawTimestamp` in `server/src/match.ts:404-415`, but `engine/src/state.ts:126-170` uses that timestamp inside card IDs. Replaying a stored match regenerates different card IDs and fails on the first action.
- The code still relies on a few in-place nested mutations inside the reducer path, such as battlefield and reinforcement updates in `engine/src/turns.ts:330-360`. This does not automatically break determinism, but it makes formal reasoning and replay drift triage harder.
- There is no golden replay corpus with fixed hashes across versions. Current replay tests prove local behavior, not long-term compatibility.

Recommendations:

- Persist `drawTimestamp` as immutable match metadata and bind replay to it.
- Add a canonical replay fixture suite with fixed `config`, ordered actions, expected `stateHashAfter`, and expected `phaseTrace`.
- Add a replay test that reconstructs a match from the same shape the database stores, not just an in-memory test config.
- Continue moving engine state updates toward stricter immutability in the reducer path.

## 4. Event Model, Logging, Replay, and Auditability

Current state:

- The transaction log is a good base artifact. `shared/src/schema.ts:405-414` captures action, pre/post hash, timestamp, details, and optional phase trace.
- The canonical event model promised by the rules is not implemented. `docs/RULES.md:531-535` still promises `EventLog` and `TurnHash`, but `server/src/match.ts:558-564` and `server/src/match.ts:576-582` send empty `events` arrays.
- Operational telemetry exists through OpenTelemetry, Pino, and Sentry, but those are not the same thing as a canonical match record.
- `engine/src/turns.ts:535-549` records `system:init` with `details = { type: 'pass' }`, which blurs command semantics in the audit trail.
- `server/src/db/match-repo.ts:34-55` swallows write failures, which means the authoritative record can be lost after clients already observed the action as committed.

Assessment:

- Replay from persisted data alone is not reliable enough today.
- Command, decision, validation, outcome, and derived effects are not explicitly separated in a versioned canonical event envelope.
- Debugging/observability output is mixed conceptually with match-audit needs, but without the protections an actual event-sourced audit stream would provide.

Recommendations:

- Define a canonical event envelope and persist it, not just `events: []`.
- Add per-record version fields and a match-level verification profile.
- Add a hash chain or signed digest across canonical records if competitive integrity matters.
- Make persistence durable before an action is considered committed, or use an outbox/append-only write path that provides equivalent guarantees.
- Give `system:init` its own detail type instead of reusing `pass`.

## 5. Test Strategy and Correctness Guarantees

Strengths:

- `engine` tests are strong for a project at this stage and currently pass: 87 tests across replay, state machine, pass rules, combat, bot behavior, and simulation.
- `client` tests are extensive and currently pass: 193 tests.
- `server` tests are broader than expected and passed outside the sandbox: 157 tests.
- The repo already includes useful drift guards such as `pnpm rules:check` and schema generation checks.

Gaps:

- There is no regression test for the hidden-state leak in `preState`.
- There is no regression test proving a socket cannot submit an action for the opponent.
- There is no end-to-end replay test from the same persisted match shape used by `MatchRepository`.
- There is no golden hash fixture suite to prove replay stability across versions.
- `pnpm check:quick` is currently red because markdownlint fails on existing review artifacts and the review prompt itself. That weakens CI as a production gate even though the application code is healthier than that output suggests.

Recommendations:

- Add critical regression tests first:
  - reject mismatched `playerId` and `action.playerIndex`,
  - assert filtered payloads never leak hidden state in either `preState` or `postState`,
  - replay a persisted match record successfully,
  - verify the replay hash matches a golden fixture.
- Add a small golden-fixture suite for official canonical scenarios from `docs/RULES.md`.
- Consider property-based tests for combat overflow and suit interactions after the critical trust-boundary bugs are fixed.

## 6. Documentation as a Production Asset

Strengths:

- The repo makes it easy to find the canonical rules: `docs/RULES.md`.
- `docs/system/ARCHITECTURE.md`, `docs/system/FUTURE.md`, and `docs/system/DECISIONS.md` are unusually helpful and show real intent to prevent drift.
- The architecture and rules docs clearly state that determinism and authoritative replay matter.

Problems:

- `docs/RULES.md:531-535` still documents `EventLog` and `TurnHash`, while the runtime ships empty `events` arrays and uses transaction hashes instead.
- `CONTRIBUTING.md:1` points to `docs/system/CONTRIBUTING.md`, which does not exist.
- The root `CONTRIBUTING.md` content is malformed and appears as a literal escaped newline string instead of a normal Markdown document.
- The existing drift guard script checks for lowercase legacy hash terms, so the capitalized `TurnHash` wording in the rules slipped through.

Recommendations:

- Update `docs/RULES.md` so the published canonical audit/replay contract matches what the runtime actually emits, or update the runtime to meet the document.
- Restore a real contributor onboarding document and link it correctly.
- Add a short glossary/onboarding doc for the domain model. The canonical rules are strong, but they are not a substitute for a quick mental model for new engineers.
- Expand the drift guard so it catches casing variants and runtime/document mismatches outside the phase order.

## 7. Code Quality and Maintainability

What is helping:

- Strong package-level separation.
- Shared Zod schemas provide a useful contract center.
- The state machine and rules-specific tests keep the engine understandable.

What is hurting:

- `MatchManager` is a complexity hotspot and the source of multiple correctness/security bugs.
- `engine/src/turns.ts` is becoming a large monolithic reducer with several implicit invariants that are not encoded in types.
- The most important invariants are implicit instead of enforced:
  - a socket must only act for its own player slot,
  - hidden state must never cross an audience boundary,
  - replay requires immutable match metadata such as `drawTimestamp`.
- `engine/src/state.ts:120-123` still logs directly from the engine, which is noisy for a supposedly pure deterministic core.

Recommendations:

- Make actor identity and audience filtering explicit types/interfaces instead of conventions.
- Split authoritative turn application from audience projection and transport payload assembly.
- Replace ambient engine logging with structured server-side observability.
- Introduce stricter domain types for internal/system actions versus player actions.

## 8. Operational Readiness

What is already in place:

- Health endpoint, OpenAPI, WebSocket origin checks, rate limiting, OTel/Sentry instrumentation, Fly deployment scripts, and a database schema.
- The server test suite is broad and passes in an unrestricted environment.

What blocks operational confidence:

- `server/src/app.ts:165-172` uses a known fallback JWT secret instead of failing closed.
- `server/src/db/match-repo.ts:34-55` treats persistence failure as a console error instead of an authoritative failure.
- The replay endpoint exists, but real persisted replay is not reliable enough to support dispute handling.
- `pnpm check:quick` is not green, so the repo's own fast gate is not a trustworthy release control right now.

Recommendations:

- Fail startup in production if `JWT_SECRET` is unset.
- Make durable match-record writes part of the authoritative success path.
- Add a minimal production runbook for:
  - replay validation,
  - dispute investigation,
  - DB write failure handling,
  - hidden-state leak response.
- Treat `check:quick` as a required release gate and fix or isolate the current markdownlint noise.

## 9. Security and Fair Play Considerations

Assessment: this is the clearest blocker area.

Critical findings:

- Hidden information leaks to clients through `preState` in `server/src/match.ts:561-562` and `server/src/match.ts:579-580`.
- The server does not bind command authority to the connected player slot. `server/src/match.ts:446-466` trusts the socket only for `playerId`, while `engine/src/turns.ts:119-196` trusts `action.playerIndex`.
- A malicious client can therefore submit `pass`, `forfeit`, and likely `attack` actions on behalf of the opponent whenever the phase lines up.
- Replay/integrity records are not signed, version-profiled, or chained, so they do not yet support strong anti-tampering claims.

Minimum hardening before production:

- Derive acting `playerIndex` from server-side match membership and overwrite or reject the client field.
- Never send raw authoritative state to an audience payload. Redact both `preState` and `postState`, or stop sending `preState` to clients entirely.
- Persist immutable replay inputs required for card identity and deterministic reconstruction.
- Fail closed on missing JWT secret in production.
- Add explicit regression coverage for all of the above.

## Bottom Line

Phalanx Duel has a better-than-average foundation for a deterministic competitive game. The rules, engine shape, shared schemas, and automated tests show serious engineering intent.

The current server still breaks three production-critical promises:

- hidden information is not fully protected,
- authority is not fully server-enforced,
- replay from persisted records is not yet trustworthy.

Until those are fixed, the project should be treated as a strong pre-production system rather than a production-ready competitive platform.
