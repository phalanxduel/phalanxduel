---
id: TASK-45
title: 'Workstream: Event Log'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-03-15 18:09'
updated_date: '2026-03-15 17:30'
labels:
  - event-log
  - hardening
  - observability
  - audit
dependencies: []
references:
  - backlog/tasks/task-45.1 - Engine-Event-Derivation.md
  - backlog/tasks/task-45.2 - Server-Event-Wiring.md
  - backlog/tasks/task-45.3 - Match-Lifecycle-Events.md
  - backlog/tasks/task-45.4 - Event-Log-Persistence.md
  - backlog/tasks/task-45.5 - Event-Log-HTTP-API.md
  - backlog/tasks/task-45.6 - Game-Log-Viewer.md
  - backlog/tasks/task-45.7 - Event-Log-Verification.md
  - docs/RULES.md
  - shared/src/schema.ts
  - engine/src/turns.ts
  - server/src/match.ts
priority: high
ordinal: 250
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Phalanx event log is the backbone of the system's claim to being trustworthy,
deterministic, and auditable. Right now, `server/src/match.ts` emits `events: []`
at every broadcast despite a fully specified `PhalanxEventSchema` and rich runtime
data already present in `TransactionLogEntry`. This workstream closes that gap
end to end.

### Why the event log is critical

1. **Replay verification.** A clean, deterministic event log proves that two
   independent replays of the same action sequence produce bit-for-bit identical
   outcomes. Without it, the determinism guarantee is asserted but unverifiable
   at the event level.

2. **Auditability and anti-cheat.** Each match produces a fingerprinted,
   hash-chained log that can be independently validated by any party. This is
   the foundation of fair-play enforcement, dispute resolution, and future
   ranked-mode integrity.

3. **Development virtuous circle.** A shared, queryable event log lets developers,
   QA automation, and AI agents inspect actual gameplay to catch rule regressions,
   validate new features against real match histories, and correlate game events
   with server-side telemetry (latency, errors, Sentry breadcrumbs). Today those
   signals are siloed; a common event log connects them.

4. **AI-assisted development.** The HTTP endpoint (TASK-45.5) exposes a compact,
   content-negotiated view that lets an AI agent query "what happened in match X"
   with a fraction of the tokens needed to parse the full JSON. This makes the
   event log a first-class artifact in the dev loop, not just a runtime concern.

5. **Future feature foundation.** Ranked matchmaking, spectator replay, player
   stat aggregation, and heuristic bot improvement all require a trustworthy
   record of what happened. Building the log now means those features inherit
   correctness rather than patching it in later.

### Full lifecycle this workstream captures

```text
match.created          → matchId, params (rows/cols/etc.), createdAt
player.joined (P1)     → playerId, playerIndex, isBot=false
player.joined (P2)     → playerId, playerIndex, isBot=true|false
game.initialized       → system:init applied, initial stateHash recorded

  DeploymentPhase (per deploy action)
    span_started       → phase hop recorded (from → trigger → to)
    functional_update  → card deployed: playerIndex, gridIndex, cardId, face, suit
    span_ended         → phase exits

  AttackPhase (per attack action)
    span_started       → phase hop recorded
    functional_update  → attack declared: attackerCol, defenderCol, baseDamage
    functional_update  × N → CombatLogStep: target, damage, hpBefore/After, bonuses, destroyed
    functional_update  → reinforcement triggered (if applicable)
    span_ended

  pass / forfeit       → functional_update with reason and pass counters

game.completed         → outcome: winner, victoryType, turnNumber, finalLp[], duration
log.fingerprint        → SHA-256 of the ordered event array (TurnHash per RULES.md §20.2)
```

### End goal

A self-verifying, hash-chained `MatchEventLog` that:

- Is populated by the engine's pure deterministic derivation function (not ad hoc
  server-side logging), so it is always consistent with the authoritative game state
- Covers every state transition from match creation through final result
- Is stored durably per match in the database
- Is queryable via HTTP with content negotiation:
  - `application/json` → full structured log (developer and tooling use)
  - `application/json?format=compact` → minimal narrative JSON (AI use, token-efficient)
  - `text/html` → human-readable rendered view in the browser
- Is accessible from the game client via a "View Log" link on the game-over screen
- Can be fingerprinted (SHA-256 of the ordered event array) and independently
  verified offline from the DB record alone
- Creates the shared observability surface that connects game logic, server metrics,
  and future analytics into one queryable place
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every match from creation to game-over produces a non-empty, schema-valid
  `PhalanxEvent[]` covering all phases and actions. ✓ TASK-45.1/45.2/45.3
- [x] #2 Event IDs are deterministic: replaying the same action sequence produces
  identical event IDs and payloads. ✓ TASK-45.7 PHX-EV-002 tests
- [x] #3 The full event log is stored durably in the database per match. ✓ TASK-45.4
- [x] #4 `GET /matches/:id/log` returns the event log in three representations
  controlled by content negotiation: full JSON, compact JSON (`?format=compact`),
  and HTML. ✓ TASK-45.5
- [ ] #5 The game-over screen provides a "View Log" link to the match log. TASK-45.6
- [x] #6 The event log can be independently fingerprinted (SHA-256 of the ordered
  event array) and that fingerprint matches the value stored in the DB. ✓ TASK-45.7
- [x] #7 `pnpm rules:check` validates that any match with a completed
  `transactionLog` has a non-empty corresponding event log. ✓ TASK-45.7
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Child tasks in dependency order. Each is independently deployable to main.

1. **TASK-45.1** — Engine: `deriveEventsFromEntry` pure function + unit tests.
   No server changes. Purely additive.
2. **TASK-45.2** — Server: wire `deriveEventsFromEntry` through `handleAction`
   and `broadcastState`; `PhalanxTurnResult.events` becomes non-empty.
   Resolves TASK-44.3.
3. **TASK-45.3** — Server: match lifecycle events (created, joined, initialized,
   completed) assembled alongside turn events into a unified `MatchEventLog`.
4. **TASK-45.4** — Persistence: store `MatchEventLog` in DB per match;
   `match-repo.ts` save/load; DB migration.
5. **TASK-45.5** — HTTP API: `GET /matches` list + `GET /matches/:id/log`
   with content negotiation (full JSON / compact JSON / HTML).
6. **TASK-45.6** — UI: game log viewer accessible from game-over screen;
   list of past games with metadata.
7. **TASK-45.7** — Verification: hash-chain fingerprinting, `pnpm rules:check`
   integration, CI validation of log completeness.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 TASK-45.1 through TASK-45.7 are completed with verification evidence
  recorded on each child task. (45.6 remaining)
- [x] #2 At least one full match log (creation to game-over) is present in the
  database and queryable via the HTTP endpoint. ✓ TASK-45.4/45.5
- [x] #3 The log fingerprint is validated by CI on every merge. ✓ TASK-45.7
- [x] #4 TASK-44.3 (Event Model Docs-Code Alignment) is closed Done once
  TASK-45.2 lands. ✓ Already Done
- [ ] #5 Do not mark TASK-45 Done until Human Review is complete.
<!-- DOD:END -->
