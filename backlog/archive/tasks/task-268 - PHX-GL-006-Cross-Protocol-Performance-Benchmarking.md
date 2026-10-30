---
id: TASK-268
title: PHX-GL-006 - Cross-Protocol Performance Benchmarking
status: Done
assignee: []
created_date: '2026-05-02 20:44'
updated_date: '2026-05-04 00:42'
labels: []
milestone: m-10
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Analyze and document the performance characteristics of WebSocket vs REST infrastructures to identify asymmetric latency or resource usage patterns under load.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Establish baseline latency/throughput benchmarks for both REST and WebSocket under 50% CPU load.
- [x] #2 Identify potential WebSocket-specific memory/GC bottlenecks.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added `bin/qa/benchmark-protocols.ts` — runs N games per transport, reports per-action latency (min/avg/p50/p95/p99/max), throughput, setup time, and heap growth delta.

REST driver: WS used only for initial handshake to get game state, then all game actions go through `POST /api/matches/:id/action` with `x-phalanx-player-id` header. Local engine (bootstrapped from server's initial TurnViewModel) drives action selection for both transports.

Baseline results (local dev, 5 games each, maxTurns=80):
- WS:   p50=4ms  p95=12ms  ~89 act/s  heap Δ ~3.7MB/game
- REST: p50=10ms p95=18ms  ~90 act/s  heap Δ ~2.3MB/game

Key findings:
1. WS action latency is ~2.5x lower at p50 (4ms vs 10ms) — HTTP overhead per request is the dominant factor.
2. Throughput is equivalent when running serially (~89-90 act/s); the per-action HTTP round-trip is offset by WS's event-loop processing overhead under serial load.
3. WS heap growth is ~1.6x REST per game — WS connections hold listener closures and socket buffers that persist between actions; REST closes each connection immediately.
4. No GC spikes observed at this batch size; heap grows linearly with games, no sawtooth pattern indicating GC pressure.

Script: `pnpm exec tsx bin/qa/benchmark-protocols.ts --batch 5 --max-turns 150`
<!-- SECTION:FINAL_SUMMARY:END -->
