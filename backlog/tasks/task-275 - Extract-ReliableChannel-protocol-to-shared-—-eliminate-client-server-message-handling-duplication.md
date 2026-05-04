---
id: TASK-275
title: >-
  Extract ReliableChannel protocol to shared — eliminate client/server
  message-handling duplication
status: Done
assignee: []
created_date: '2026-05-04 03:22'
updated_date: '2026-05-04 14:02'
labels:
  - refactor
  - shared
  - server
  - client
  - architecture
  - protocol
milestone: m-12
dependencies: []
references:
  - client/src/connection.ts
  - server/src/match-actor.ts
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

The reliable-message protocol (deduplication by `msgId`, sequence enforcement via `expectedSequenceNumber`, retry flushing) is implemented twice:

- `client/src/connection.ts` (~557 lines) — client-side queuing, retry, and flush
- `server/src/match-actor.ts` `executeAction()` — server-side mirror verifying the same protocol invariants

Two adapters exist at an accidental seam with no shared interface. A protocol bug must be fixed in both places. Tests for either side require understanding the full duplex contract.

## Solution

Create `shared/src/reliable-channel.ts` exporting pure functions:

- `buildReliableMessage<T>(payload: T, msgId?: string): T & { msgId: string }`
- `isRetry(action: { msgId?: string }, lastEntry: { msgId?: string } | null): boolean`
- `isStale(action: { expectedSequenceNumber?: number }, currentSeq: number): boolean`
- `nextSequenceNumber(current: number): number`

Client and server import these instead of each owning independent implementations. The websocket transport wiring stays in each package; only the protocol logic moves to shared.

## Scope

- `shared/src/reliable-channel.ts` — new module
- `shared/src/index.ts` — re-export
- `client/src/connection.ts` — replace local protocol logic with shared functions
- `server/src/match-actor.ts` — replace local protocol logic with shared functions
- `shared/tests/reliable-channel.test.ts` — protocol unit tests
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 shared/src/reliable-channel.ts exports isRetry, isStale, buildReliableMessage, nextSequenceNumber as pure functions
- [x] #2 client/src/connection.ts and server/src/match-actor.ts both import from @phalanxduel/shared for protocol logic — no local copies
- [x] #3 Unit tests in shared cover: duplicate detection, stale sequence rejection, happy-path sequence advance
- [x] #4 pnpm check passes across all packages
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Created shared/src/reliable-channel.ts with isRetry, isStale, buildReliableMessage as pure functions. Replaced duplicated inline protocol logic in server/src/match-actor.ts (duplicate detection + freshness guard) and client/src/connection.ts (msgId stamping). 15 new unit tests cover all three functions. 145 shared tests pass, 236 engine tests pass, 326 server tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
