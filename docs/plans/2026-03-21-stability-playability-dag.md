# Stability & Playability Improvement Plan

**Created:** 2026-03-21
**Milestone:** v0.5.0 — Stability & Playability
**Status:** Active

## Context

The distributed ledger architecture (TASKs 95–99, TASK-94) has been moved to
`feat/distributed-ledger` branch and a worktree at `../.worktrees/distributed-ledger`.
Main is restored to `6cb7eb32` — stable single-node with all game features intact.

This plan focuses on what most improves the game experience for players and the
development workflow for operators.

## Task DAG

```text
                    ┌──────────────────────────────────┐
                    │ TASK-100: WebSocket Reconnection  │  CRITICAL
                    │ Fix disconnect → rejoin flow      │
                    └────────┬────────────┬────────────┘
                             │            │
                    ┌────────▼──┐    ┌────▼─────────────────┐
                    │ TASK-101  │    │ TASK-102              │
                    │ Fix       │    │ Docker Local Dev      │
                    │ Floating  │    │ & Debug Environment   │
                    │ Promises  │    │                       │
                    └────┬──────┘    └────┬─────────────────┘
                         │                │
              ┌──────────▼────┐           │
              │ TASK-103      │           │
              │ QA Safety     │           │
              │ (TASK-35 + 36 │           │
              │  + test matrix│           │
              │  expansion)   │           │
              └──────┬────────┘           │
                     │                    │
          ┌──────────▼──────────┐         │
          │ TASK-104            │◄────────┘
          │ Merge Bot Play      │
          │ feat/configurable-  │
          │ grid-bot → main     │
          └──────┬──────────────┘
                 │
        ┌────────▼────────┐    ┌─────────────────────┐
        │ TASK-105        │    │ TASK-107             │
        │ Fast Deploy     │    │ ESLint/TS Strict     │
        │ Phase for QA    │    │ Enforcement          │
        └────────┬────────┘    └─────────────────────┘
                 │                        ▲
        ┌────────▼────────┐               │
        │ TASK-106        │───────────────┘
        │ Durable Audit   │
        │ Trail           │
        └─────────────────┘
```

## Dependency Rationale

| Edge | Reason |
|------|--------|
| 100 → 101 | Floating promise fixes touch same WS handlers as reconnect |
| 100 → 102 | Reconnect needs integration testing; Docker gives the environment |
| 101 → 103 | Clean async handling before trusting QA results |
| 103 → 104 | QA safety before merging a diverged branch — need trustworthy tests |
| 102 → 104 | Bot play should be testable via Docker after merge |
| 104 → 105 | Fast deploy benefits from bot play being available |
| 105 → 106 | Audit trail relies on stable match lifecycle; fast deploy speeds testing |
| 106 → 107 | Enforce strict linting after churn settles |

## QA Test Matrix

After TASK-103 and TASK-104 are complete, the QA simulator must support all
game mode combinations:

| Player 1 | Player 2 | Mode |
|----------|----------|------|
| Human | Human | PvP — two browser sessions |
| Human | Bot (random) | SP — player vs random bot |
| Human | Bot (heuristic) | SP — player vs heuristic bot |
| Bot (random) | Bot (random) | Auto — random vs random |
| Bot (random) | Bot (heuristic) | Auto — random vs heuristic |
| Bot (heuristic) | Bot (random) | Auto — heuristic vs random |
| Bot (heuristic) | Bot (heuristic) | Auto — heuristic vs heuristic |

All 7 combinations must complete a full game to `gameOver` phase without error.
