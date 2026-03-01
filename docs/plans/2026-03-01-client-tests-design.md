# P1-002: Client-Side Tests Design

**Date:** 2026-03-01
**Status:** Approved
**Scope:** Add unit tests for `cards.ts`, `state.ts`, `connection.ts`; enforce 60% coverage threshold

## Problem

The client package (2,293 LOC) has 29 characterization tests from P1-001 but only
47% statement coverage. Three modules with high test-value-to-effort ratio are
essentially untested: `cards.ts` (22%), `state.ts` (6%), `connection.ts` (0%).

## Approach: Bottom-up by purity

Test in order of decreasing purity. Each module builds on mock patterns from the
previous. Add coverage threshold enforcement as the final step.

## Testing Order

| Order | Module | LOC | Pure % | Mock Needs | Est. Tests |
|-------|--------|-----|--------|------------|------------|
| 1 | cards.ts | 40 | 100% | None | ~15 |
| 2 | state.ts | 264 | 85% | sessionStorage, window.history | ~18 |
| 3 | connection.ts | 70 | 20% | WebSocket, Sentry, timers | ~12 |
| 4 | Coverage config | — | — | — | 0 |

## Test Patterns

- Each test file is self-contained with its own mocks
- `vi.stubGlobal` for `sessionStorage` and `WebSocket`
- `vi.useFakeTimers()` for connection reconnect tests
- Card/state factory helpers live in each test file (no shared test utils)

## Coverage Targets

| Metric | Current | Target |
|--------|---------|--------|
| Statements | 47% | 60% |
| Lines | 49% | 60% |
| Branches | 26% | (no threshold yet) |
| Functions | 18% | (no threshold yet) |

## Constraints

- TDD: write failing test first, then make it pass
- No behavior changes to source modules
- All existing 169 tests must remain green
- Coverage thresholds enforced in `client/vitest.config.ts`
