---
id: decision-027
title: 'DEC-2B-003 - WebSocket-first degraded connectivity fallback'
owner: Project Owner + Platform
date: '2026-04-02 09:02'
status: accepted
---

# DEC-2B-003 - WebSocket-first degraded connectivity fallback

## Context

Phalanx Duel now has a materially stronger live-play transport than it did
earlier in the project:

- dual-sided heartbeat
- exponential backoff reconnect
- ACK-based reliable outbound queue
- `rejoinMatch` session recovery
- replay of pending reliable client messages after reconnect

That makes ordinary network drops survivable, but the production-readiness
review found a remaining structural gap:

- live play is still effectively single-transport
- if a client cannot keep WebSocket open long enough to recover, the match
  remains unplayable
- the current reconnect model is still anchored to live in-memory match/session
  state
- rolling deploys and process restarts can invalidate the reconnect path even
  if the client identity remains valid

The repo needed an explicit decision before implementing more partial fallback
mechanics, because three materially different models were still on the table:

- keep WebSocket as the only supported live transport
- add a degraded HTTP-based mode alongside WebSocket
- productize interruption via pause/resume rather than adding transport
  fallback

## Decision

Phalanx Duel will support a **WebSocket-first live-play model with degraded
HTTP fallback**.

This means:

- WebSocket remains the primary live transport for normal play.
- Clients should continue to prefer the resilient WebSocket path for match
  state, opponent events, and low-latency turn flow.
- When WebSocket cannot be held open reliably, the supported degraded mode will
  use:
  - authoritative action submission over HTTP
  - state recovery and read-side synchronization over HTTP polling first
  - SSE as an optional future optimization, not the first required fallback

Pause/resume semantics may still exist as product behavior for severe outages,
but they are **not** the primary degraded-connectivity answer.

WebSocket-only recovery is not sufficient for production readiness.

## Required Semantics

The supported degraded model must explicitly handle:

- high-latency networks
- repeated short disconnects
- ghost connections where one side believes the socket is alive and the other
  does not
- long disconnects where the socket cannot be re-established quickly
- reconnect during or after a server restart inside the supported reconnect
  window

The fallback contract must preserve these invariants:

- actions are idempotent and replay-safe across reconnect and fallback
- session recovery is transport-agnostic
- the authoritative server state can be re-read without depending on the
  original socket session surviving
- clients can surface `CONNECTING`, `OPEN`, and degraded/offline states
  explicitly to users

## Restart Survivability Requirement

Reconnect must survive server restarts and rolling deploys within the supported
reconnect window.

This decision therefore rejects any future design that depends only on
in-memory socket/session maps for recovery.

Implications:

- reconnect identity must be durable or derivable after restart
- match resume must become transport-agnostic, not socket-specific
- degraded-mode reads/writes and WebSocket rejoin must converge on the same
  authoritative recovery contract
- restart-aware integration tests are mandatory before claiming production
  readiness

## Consequences

- `TASK-160` is now clearly about durable, transport-agnostic match resume
  semantics rather than just better WebSocket bookkeeping
- `TASK-165` must verify compatibility across browser, Go, and generated SDK
  clients for:
  - matchmaking
  - join/rejoin
  - action submission
  - degraded-mode recovery expectations
- `TASK-161` should assume a `0.6.0` target only if the fallback surfaces and
  reconnect contract stay additive; breaking reconnect-handshake or message
  requirements still force a major bump
- the canonical specs will need additive HTTP recovery/fallback surfaces in
  OpenAPI while preserving WebSocket-first semantics in AsyncAPI

## Follow-on Direction

The next implementation sequence is:

1. `TASK-160` — make reconnect survive server restarts with a transport-agnostic
   resume contract
2. `TASK-162` — audit participant identity and action authorization boundaries
   against the new recovery model
3. `TASK-165` — verify first-class client compatibility across browser, Go, and
   generated SDKs
4. `TASK-161` — finalize the release/version-bump plan once the recovery and
   compatibility surface is stable

## Rejected Alternatives

### WebSocket-only recovery

Rejected because it does not solve the production-readiness requirement for
persistently unreliable networks and leaves no supported path when the socket
cannot remain healthy long enough to recover.

### Pause/resume as the primary answer

Rejected as the primary strategy because it treats transport instability as a
product interruption instead of providing a real degraded operational mode.
Pause/resume may still exist for exceptional outage handling.

### Full transport-parity REST live play as the first move

Rejected for now because it is a larger architectural jump than needed.
Polling-backed degraded reads plus HTTP writes is the smallest fallback that
materially improves reliability without replacing WebSocket-first live play.
