---
title: Degraded Connectivity Fallback Proposal
description: Draft backlog-owned proposal for handling unreliable live-game connectivity beyond the current WebSocket reconnect path.
status: superseded
updated: "2026-04-02"
audience: team
related:
  - backlog/tasks/task-120 - Automate-SDK-Client-Stub-Generation-from-Specs.md
  - docs/api/asyncapi.yaml
  - docs/system/SITE_FLOW.md
  - clients/AGENTS.md
---

# Degraded Connectivity Fallback Proposal

## Purpose

Capture the current transport limitations and outline realistic fallback
options for live play when WebSocket connectivity is persistently unreliable.

This proposal is superseded by
[DEC-2B-003 - WebSocket-first degraded connectivity fallback](/Users/mike/github.com/phalanxduel/game/backlog/decisions/decision-027%20-%20DEC-2B-003%20-%20WebSocket-first%20degraded%20connectivity%20fallback.md).
Keep this document only as the pre-decision option analysis that informed the
accepted direction.

## Current State

The browser client now has a resilient WebSocket transport layer:

- dual-sided heartbeat
- exponential backoff with jitter
- ACK-based reliable outbound queue
- `rejoinMatch` session recovery
- replay of pending reliable messages after reconnect
- surfaced `CONNECTING` / `OPEN` / `DISCONNECTED` state

The server supports that recovery model with:

- application-level `ping` / `pong`
- native WebSocket control-frame liveness checks
- cached response replay for duplicate `msgId` deliveries
- `rejoinMatch` support and a reconnect grace window

## Problem Statement

This improves recoverability, but it does not provide a step-down transport.

If the network is unstable enough that the socket cannot stay open long enough
to complete reconnect and resynchronization:

- the browser continues reconnect attempts with backoff
- the UI can show reconnecting/offline state
- pending reliable messages remain queued until ACKed
- the match becomes effectively unplayable if `rejoinMatch` and fresh state
  cannot complete
- the disconnected player can still lose by forfeit after the server-side
  reconnect window expires

There is currently no backup live-play transport.

## Explicit Non-Features Today

The repo does not currently implement:

- HTTP long-poll fallback for live match state
- SSE fallback for live match state
- REST write fallback for authoritative live actions
- transport-agnostic session recovery for active matches
- degraded-mode product semantics such as explicit pause/resume of a live match

Existing REST endpoints such as match creation or simulation are not a backup
gameplay transport.

## Architectural Assessment

Adding real degraded-network support is a substantial feature, not a transport
patch.

The blast radius crosses:

- public protocol design
- server authority and idempotency
- client state management
- SDK/spec generation
- integration testing
- gameplay product semantics

Why this is structurally significant:

- real-time state is currently pushed over WebSocket
- reconnect semantics are currently socket-centric
- duplicate delivery protection exists on the WebSocket path, not on a general
  transport-agnostic command layer
- clients currently assume one authoritative live channel for both writes and
  read-side state updates

## Options

## Option A: Harden WebSocket Only

Keep WebSocket as the sole live-play transport and continue improving recovery.

Pros:

- smallest near-term change
- aligns with the existing architecture
- preserves current AsyncAPI-centered contract model

Cons:

- does not help users whose networks cannot sustain WebSocket long enough to
  recover
- still leaves live play single-transport

## Option B: REST Writes + Polling or SSE Reads

Keep WebSocket as primary, but add a degraded mode:

- clients submit authoritative actions over HTTP
- clients receive state via polling or SSE when WebSocket is unstable

Pros:

- smallest meaningful fallback path
- reuses HTTP infrastructure already present in the repo
- allows step-down behavior without replacing WebSocket-first live play

Cons:

- requires new session-rebind and action endpoints
- requires idempotent action submission over HTTP
- creates a dual-transport state model and a larger test matrix

## Option C: Full REST Live-Play Transport

Provide full transport parity for live play over HTTP-based APIs.

Pros:

- clearest fallback story
- most transport-agnostic architecture

Cons:

- largest implementation and specification change
- would materially expand the OpenAPI surface
- likely requires redesign of how server push, spectator state, and session
  lifecycle are modeled

## Option D: Productized Pause/Resume Instead of Fallback Transport

Acknowledge unstable connectivity as a product-level interruption instead of
trying to preserve uninterrupted live play.

Pros:

- smaller than building a true fallback transport
- more honest than pretending continuous real-time play is always achievable

Cons:

- changes product semantics
- does not help players who expect uninterrupted live turn flow

## Recommended Staging

If degraded connectivity support becomes a priority, the lowest-risk sequence
is:

1. Finish hardening the current WebSocket path.
2. Make reliable client `msgId` semantics mandatory in the canonical schema.
3. Bring the Go duel CLI up to the same reconnect/ACK/replay contract as the
   browser client.
4. Introduce REST action submission plus polling or SSE read fallback as the
   first degraded-mode transport.
5. Only then evaluate whether a full transport-agnostic live-play API is worth
   the added complexity.

## Known Gaps To Close Before Transport Fallback

- `msgId` is still optional in the shared machine-validated client message
  schema, even though reliable-delivery semantics now depend on it.
- The browser client is the only client that currently implements the resilient
  transport manager end to end.
- The Go duel CLI is a first-class runnable client, but it still lacks:
  automatic reconnect, ACK replay, pending reliable queue, and automatic
  `rejoinMatch`.
- The current test suite does not yet prove behavior under repeated reconnect
  failure across multiple reconnect windows.

## Questions For A Future Decision

- Is uninterrupted live play under unstable consumer networks a product
  requirement, or is graceful interruption acceptable?
- Should fallback semantics preserve the same turn latency expectations as
  WebSocket play, or is degraded mode allowed to be slower?
- Is spectator mode part of the fallback requirement, or only player actions?
- Should transport fallback be automatic, user-selected, or only available to
  specific clients?
- Is the desired long-term model "WebSocket-first with degraded fallback" or
  "transport-agnostic command/state architecture"?
