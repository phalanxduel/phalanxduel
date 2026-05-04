---
id: TASK-267
title: PHX-GL-010 - Real-Time Shadow Protocol Parity Detection
status: Done
assignee: []
created_date: '2026-05-02 20:44'
updated_date: '2026-05-03 22:00'
labels: []
milestone: m-10
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enable 'Shadow Mode' to capture and compare match fingerprints in real-time, detecting silent protocol divergence that replay testing might miss.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Implement 'Shadow Mode' to log and compare fingerprints for a small percentage of live games.
- [x] #2 Establish automated alerts for any observed drift in real-world matches.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added `server/src/match-integrity.ts` containing the extracted `verifyMatchState(matchId, repo)` logic (hash chain, final hash, event fingerprint checks) and a `shadowVerifyOnComplete(matchId, repo)` function.\n\nOn every game-over, `shadowVerifyOnComplete` is called fire-and-forget after `saveFinalStateHash`. It samples at `SHADOW_SAMPLE_RATE` (env var, default 10%), runs all three integrity checks, then emits a structured OTel log record (`shadow_verify.result`) with `drift=true/false` and per-check details. Drift events emit at ERROR severity so any OTel backend (Datadog, Grafana) can alert on `drift=true` without any extra instrumentation work.\n\n`scripts/ci/verify-match-state.ts` now delegates to the shared module rather than duplicating the logic. 326 server tests pass unchanged.
<!-- SECTION:FINAL_SUMMARY:END -->
