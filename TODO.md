# Phalanx Duel — Evaluation TODO

Observations from codebase evaluation (2026-03-01), prioritized by
criticality and dependency ordering. Items already tracked in
`docs/system/FUTURE.md` or `.claude/ROADMAP.md` are not duplicated here.

## Priority Legend

| Tag | Meaning |
|-----|---------|
| P0  | Blocking — CI or dev-loop broken |
| P1  | High — quality gap with active risk |
| P2  | Medium — maintainability / scalability ceiling |
| P3  | Low — feature gap, no immediate risk |

---

## Dependency Graph

```text
P0-001 Fix ESLint lockfile ✅
  ↓
P1-001 Decompose renderer.ts ✅ ────────────┐
  ↓                                          │
P1-002 Add client-side tests ✅ ◄─────────────┘
  ↓
P2-001 Evaluate client framework adoption
  ↓
P3-001 AI opponent (single-player mode) ✅
```

~~P0-001 unblocks clean CI.~~ ~~P1-001 (decomposition) makes P1-002
(testing) tractable~~ — all three done. P1-002 added 88 tests (117 total)
with 60% coverage threshold enforcement. P2-001 (framework migration) now
has both module boundaries and a regression safety net. P3-001 is
independent.

---

## P0 — Blocking

### ~~P0-001 · Fix ESLint dependency resolution~~ ✅

**Resolved:** Fixed as a side-effect of `02278a4e` (chore(deps): bump
toolchain and devDependencies), which regenerated `pnpm-lock.yaml`.
`pnpm lint` and all 140 tests pass cleanly.

---

## P1 — High

### ~~P1-001 · Decompose `client/src/renderer.ts` (1,431 LOC)~~ ✅

**Resolved:** Decomposed renderer.ts from 1,431 LOC to 249 LOC (thin
orchestrator). Extracted 5 focused modules with 29 characterization tests:

- `lobby.ts` (504 LOC) — lobby, waiting, join-via-link, watch-connecting
- `game.ts` (582 LOC) — game screen, battlefield, hand, battle log, stats
- `game-over.ts` (72 LOC) — game over screen
- `help.ts` (69 LOC) — help markers, overlays, HELP_CONTENT
- `debug.ts` (14 LOC) — Sentry test error button

ESLint complexity ratchet remains at 45 because `renderBattlefield` (44)
and `renderGame` (43) carried their cyclomatic complexity into game.ts.
Decomposing those two functions is a natural follow-up.

**Unblocks:** P1-002 (client testing is now tractable against focused
modules)

---

### ~~P1-002 · Add client-side tests~~ ✅

**Resolved:** Added 88 new unit tests across 6 test files, bringing client
test total from 29 to 117. Coverage rose from 47% to 61% statements / 64%
lines. Coverage thresholds enforced at 60% in `client/vitest.config.ts`.

Test files added:
- `cards.test.ts` (21 tests) — pure card helper functions
- `state.test.ts` (25 tests) — state management, dispatch, persistence
- `connection.test.ts` (12 tests) — WebSocket wrapper, reconnect backoff
- `renderer-helpers.test.ts` (22 tests) — render orchestrator, DOM helpers
- `lobby-helpers.test.ts` (8 tests) — player name validation

Coverage exclusions: `main.ts` (entry point), `pizzazz.ts` (animations),
`vite-env.d.ts` (type declarations).

**Unblocks:** P2-001 (regression safety net for framework migration)

---

## P2 — Medium

### P2-001 · Evaluate client framework adoption

**Problem:** The client is vanilla TypeScript with imperative DOM
manipulation (`document.createElement`, `innerHTML`, manual event
listeners). This works at current UI complexity but creates a scaling
ceiling:

- No component model — UI state and DOM construction are interleaved.
- No reactive rendering — state changes require manual DOM patching.
- No ecosystem — routing, forms, accessibility helpers are all manual.

**Risk:** As UI grows (themes, animations, match history, spectator
controls, mobile gestures), the imperative approach becomes increasingly
expensive to maintain and test.

**Approach:**

1. Benchmark current client bundle size and load time (baseline).
2. Evaluate lightweight options that don't require a full SPA framework:
   - **Preact** — React-compatible, ~3KB, minimal migration cost
   - **Solid** — fine-grained reactivity, no VDOM, excellent performance
   - **Lit** — Web Components, zero-framework option
   - **Stay vanilla** — formalize a component pattern manually
3. Prototype one screen (lobby) in the chosen framework.
4. Migrate incrementally (one screen per PR).

**Constraints:**
- Must not increase initial bundle size by more than ~15KB gzipped.
- Must not break Sentry integration or WebSocket connection handling.
- P1-001 (renderer decomposition) and P1-002 (client tests) should land
  first — they establish module boundaries and a regression net for safe
  migration.

**Blocked by:** P1-001, P1-002

---

## P3 — Low

### ~~P3-001 · AI opponent for single-player mode~~ ✅

**Resolved:** Implemented both Random (Easy) and Heuristic (Medium) bot
strategies.

- **Random bot** — picks valid actions uniformly at random.
- **Heuristic bot** — ranks actions by potential damage, prioritizes LP hits,
  and values suit bonuses (Spades vs LP, etc.).
- **Difficulty tiers** — exposed as `bot-random` and `bot-heuristic` in
  `createMatch` API.
- **Client Integration** — added "Play vs Bot (Easy/Medium)" buttons to
  the lobby.

**Touch points:** `engine/src/bot.ts`, `server/src/app.ts`,
`server/src/match.ts`, `shared/src/schema.ts`, `client/src/lobby.ts`,
`client/src/lobby-preact.tsx`

# end
