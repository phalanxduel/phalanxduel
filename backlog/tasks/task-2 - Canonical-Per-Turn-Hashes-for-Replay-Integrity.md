---
id: TASK-2
title: Canonical Per-Turn Hashes for Replay Integrity
status: To Do
assignee: []
created_date: '2026-03-12 01:31'
updated_date: '2026-03-13 14:50'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replay integrity already stores `stateHashBefore` and `stateHashAfter` on
transaction log entries, but there is still no single canonical turn digest
that external verifiers can compare or sign. This task closes that gap by
defining and emitting a deterministic per-turn hash derived from the full turn
record.

## Problem Scenario

Given a completed match, when an admin tool or dispute workflow needs to prove
that one specific turn is unchanged, then the current transaction log exposes
component hashes but not a single canonical digest for that turn.

## Planned Change

Extend the shared transaction-log schema and engine hashing pipeline so every
turn emits a deterministic `turnHash` plus any component digests required to
rebuild it. This plan builds on the existing `stateHashBefore` and
`stateHashAfter` fields instead of replacing them, which minimizes migration
risk for replay consumers that already rely on the current log structure.

## Delivery Steps

- Given the current transaction-log schema, when the shared types are updated,
  then the new digest fields are documented and available to engine, server, and
  replay tooling.
- Given an applied action, when the engine records the transaction-log entry,
  then it computes a deterministic turn digest from the pre-state, action/event
  payload, and post-state.
- Given replay and audit workflows, when they inspect a match, then they can
  compare canonical per-turn digests instead of rebuilding ad hoc hashes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

- Given a transaction-log entry, when it is serialized, then it includes a
  canonical deterministic per-turn digest.
- Given the same config and ordered actions, when the match is replayed twice,
  then the emitted per-turn digests are byte-for-byte identical.
- Given replay-verification tooling, when it inspects a turn, then it can read
  the digest from the canonical log format without recomputing hidden state.

## References

- `engine/src/turns.ts`
- `shared/src/schema.ts`
- `docs/RULES.md`
