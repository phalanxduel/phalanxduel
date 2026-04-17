---
title: "Phalanx Duel Test Constitution"
description: "Enforceable testing law for fairness-critical work in Phalanx Duel."
status: active
updated: "2026-04-13"
audience: contributor
related:
  - reports/qa/test-council-audit.md
  - docs/reference/dod.md
  - docs/reference/pnpm-scripts.md
---

# Phalanx Duel Test Constitution

## Core Principles

- Tests protect fair gameplay first.
- Green suite without rejection proof is not trusted.
- Coverage is telemetry, not proof.
- Replay proof must include semantic truth, not only self-consistency.
- Browser automation is smoke unless tied to authoritative state assertions.

## Fairness Protection Principles

- Illegal action must not mutate authoritative state.
- Rejected action must not advance turn or phase.
- Duplicate action must not change outcome twice.
- Stale or late action must not become legal through transport timing alone.
- Client-visible state drift from authoritative state must be detected or rejected.
- Replay must reconstruct authoritative truth from same config and action sequence.

## Repo Test Layer Model

1. Engine rule tests
   - prove combat legality, phase legality, invariants, replay semantics
2. Server authority tests
   - prove auth, session ownership, projection, rejection integrity
3. Protocol and session tests
   - prove duplicate, stale, late, out-of-order, reconnect behavior
4. Browser and QA smoke
   - prove runnable UX and evidence quality
5. CI governance
   - prove required gates ran and artifact evidence exists

## Verification Hierarchy: Smoke vs. Truth

Project verification is divided into two distinct tiers:

1. **Smoke Checks** (Fast, Non-Blocking for Dev)
   - Linting, Type checking, Unit tests, Basic build.
   - Required for local `pnpm check` and pre-commit.
   - Proves the codebase is "runnable" and "safe".

2. **Fairness Truth Gates** (Heavy, Blocking for CI/Release)
   - Replay verification, Anomaly detection, Coverage reporting.
   - Mandatory for Pull Requests and merges to `main`.
   - Proves the gameplay logic is "fair", "correct", and "replayable".

A change is not "verifiable" until it passes both Smoke Checks and the relevant Fairness Truth Gates.

## Required Test Categories By Domain

Engine changes:

- positive rule case
- negative or rejection mirror
- replay or hash-chain impact
- invariant coverage for changed surface

Server or protocol changes:

- happy path
- wrong-player rejection
- stale or duplicate delivery
- reconnect and replay behavior
- redaction and projection correctness

Client gameplay changes:

- authoritative visible outcome
- reconnect or offline behavior if touched
- accessibility or test-id selector contract for QA-facing UI

QA tooling changes:

- artifact completeness
- failure-path evidence
- cleanup on timeout or crash

## Forbidden Patterns

- fixed sleeps in truth-gating tests when event-driven waits exist
- CSS classes as browser control selectors
- shallow snapshots as primary proof for fairness-critical behavior
- copied fixture builders without package-local testkit reuse
- cross-package source imports outside explicit integration suites
- protocol changes without stale or duplicate negative tests
- silent retries in truth gates without first-failure mode

## Required Evidence On Failure

Truth-gating QA runs must emit:

- manifest
- event timeline
- failure reason
- match or run identifiers
- console error tail
- screenshots when browser path involved

## Fixture And Scenario Standards

- Prefer package-local testkit modules.
- Label characterization fixtures when they bypass normal construction.
- Do not fabricate impossible state without explicit reason in test name or comment.
- Scenario files must describe what rule or behavior they prove, not only seed and outcome hash.

## Timeout Standards

- Timer helpers must clear timers on success and failure.
- WebSocket tests must close sockets in `finally` or `afterEach`.
- QA runners must clean up browsers, sockets, and subprocesses in `finally`.
- Truth-gating tests use bounded waits on authoritative events, not stacked sleeps.

## Replay Verification Standards

- Replay tests must compare iterative execution against replay reconstruction.
- Replay verification must cover many prefixes or generated sequences, not only one full path.
- Replay CI must fail on hash-chain break or final-state mismatch.

## Negative-Path Standards

- Every new positive fairness-critical rule test needs one negative-path mirror.
- Every new action surface needs duplicate, stale, and out-of-order rejection tests where applicable.
- Rejection tests must assert state preservation, not only error code.

## CI Quality Gates

- Protected CI must state which gameplay trust gates ran.
- At least one protected lane must include adversarial authority coverage, replay verification, coverage reporting, and playthrough anomaly verification.
- Warnings from truth-gating anomaly verification fail CI by default.

## Review Checklist

- Does test prove player-visible truth or only implementation shape?
- Does change include negative-path mirror?
- Does protocol surface reject stale, duplicate, and out-of-order input?
- Does replay proof stay semantic, not only deterministic?
- Does QA emit usable evidence on failure?
- Does fixture remain honest and package-local?
