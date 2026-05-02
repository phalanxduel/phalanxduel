---
id: TASK-21
title: Ranked Matchmaking Queue
status: Done
assignee: []
created_date: ''
updated_date: '2026-05-02 02:50'
labels:
  - ranked
  - platform
  - networking
milestone: 'Future Roadmap: Modes & Customization'
dependencies:
  - TASK-19
priority: medium
ordinal: 9070
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The ranked stack can compute ratings and show leaderboards, but players still
have to arrange matches manually. This task adds the missing queue-based entry
point for ranked play so players can ask for an opponent and be paired through
server-side rating rules instead of side-channel coordination.

## Problem Scenario

Given a player wants a ranked match, when they enter the lobby today, then
there is no canonical queue or pairing flow that uses Elo or match mode to find
an opponent automatically.

## Planned Change

Introduce a server-owned matchmaking queue that stores waiting players, applies
rating-band rules, and notifies matched clients through the existing real-time
channel. The queue should live on the server because pairing needs a single
authoritative view of waiting players and acceptable Elo deltas.

## Delivery Steps

- Given a ranked player opts into matchmaking, when the request reaches the
  server, then the player is added to a queue with the data needed for
  eligibility and timeout handling.
- Given compatible players are waiting, when the server finds a pair within the
  current Elo rules, then it creates a match and notifies both clients.
- Given a player cancels, disconnects, or waits too long, when queue state is
  refreshed, then stale entries are removed safely.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- Given a ranked queue request, when a player joins, then the server tracks the
  waiting entry until match, cancellation, or timeout.
- Given two compatible waiting players, when their Elo bands overlap under the
  pairing rules, then they receive a match-found signal and a new match is
  created.
- Given no compatible opponent exists immediately, when the player keeps
  waiting, then the queue behavior is deterministic and documented for widening
  or timeout rules.

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add `joinQueue`/`leaveQueue` client messages + `queueJoined`/`queueLeft`/`queueMatchFound` server messages to shared schema\n2. Implement `MatchmakingQueueService` in `server/src/matchmaking-queue.ts`\n3. Wire queue service into app.ts WS handler (joinQueue, leaveQueue, disconnect cleanup)\n4. Add `queueStatus` to client AppState, handle new server messages\n5. Add "Find Ranked Match" UI in lobby.tsx\n6. Update OpenAPI snapshot if needed
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented server-owned ranked matchmaking queue (TASK-21).\n\n**New files:**\n- `server/src/matchmaking-queue.ts` — MatchmakingQueueService: join/leave/removeBySocket, 200-Elo band pairing, 5-min stale cleanup interval\n\n**Modified files:**\n- `shared/src/schema.ts` — added joinQueue/leaveQueue client messages; queueJoined/queueLeft/queueMatchFound server messages\n- `server/src/app.ts` — instantiates queue service, handles joinQueue/leaveQueue WS cases, removes player from queue on disconnect\n- `client/src/state.ts` — queueStatus: 'idle'|'searching' field, dispatch cases for all three server messages; fixed 4 pre-existing lint warnings\n- `client/src/lobby.tsx` — RANKED_OPERATIONS section with FIND_RANKED_MATCH/SEARCHING… button for authenticated users only\n- `shared/schemas/` — regenerated JSON schema artifacts
<!-- SECTION:FINAL_SUMMARY:END -->

## References

- `server/src/app.ts`
- `server/src/match.ts`
- `server/src/ladder.ts`

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [ ] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [ ] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [ ] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [ ] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [ ] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [ ] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->
