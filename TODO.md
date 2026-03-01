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
P0-001 Fix ESLint lockfile
  ↓
P1-001 Decompose renderer.ts ──────────────┐
  ↓                                         │
P1-002 Add client-side tests ◄──────────────┘
  ↓
P2-001 Evaluate client framework adoption
  ↓
P3-001 AI opponent (single-player mode)
```

P0-001 unblocks clean CI. P1-001 (decomposition) makes P1-002 (testing)
tractable — testing a 1,431-line monolith is harder than testing focused
modules. Both P1 items de-risk P2-001 (framework migration) by establishing
module boundaries and a regression safety net first. P3-001 is independent
of the others but benefits from a stable, well-tested engine.

---

## P0 — Blocking

### P0-001 · Fix ESLint dependency resolution

**Symptom:** `pnpm lint` fails with missing `debug` module in
`eslint@9.39.3` resolution chain.

**Root cause:** Transient pnpm lockfile corruption after dependency updates.

**Fix:** `pnpm install` to regenerate lockfile, verify `pnpm lint` passes,
commit updated `pnpm-lock.yaml`.

**Touch points:** `pnpm-lock.yaml`

**Effort:** Minutes.

---

## P1 — High

### P1-001 · Decompose `client/src/renderer.ts` (1,431 LOC)

**Problem:** Largest file in the codebase by a wide margin. Handles DOM
construction, event binding, state rendering, card layout, battlefield
rendering, lobby UI, game-over screen, and debug overlays in a single
module. High complexity ceiling already acknowledged by the ESLint override
(`max-complexity: 45` for client).

**Risk:** Difficult to test, review, or extend individual UI concerns.
Merge conflicts likely as UI features grow. The complexity override masks
real growth.

**Approach (incremental, no framework required):**

1. Extract lobby/waiting-room rendering → `lobby.ts`
2. Extract battlefield/card rendering → `battlefield.ts`
3. Extract game-over/result rendering → `game-over.ts`
4. Extract debug/dev overlays → `debug.ts`
5. Keep `renderer.ts` as a thin orchestrator that delegates to the above

**Constraints:**
- No behavior changes — pure extract-and-delegate refactor.
- Each extraction is independently shippable.
- Lower the client `max-complexity` ESLint override after each extraction.

**Touch points:** `client/src/renderer.ts`, new `client/src/` modules,
`eslint.config.js`

**Blocks:** P1-002 (client testing is impractical against a monolithic
renderer)

---

### P1-002 · Add client-side tests

**Problem:** The client package (`@phalanxduel/client`, 2,237 LOC) has
**zero test files**. It is the largest package by LOC and the only one
without tests. Every other package meets an 80% coverage threshold.

**Risk:** Regressions in rendering, state management, and connection
handling are only caught by manual QA or the Playwright bot simulations
(which test end-to-end, not unit behavior).

**Approach:**

1. Add `vitest.config.ts` to `client/` with jsdom environment.
2. Start with `state.ts` (264 LOC, pure logic, no DOM) — highest
   test-value-to-effort ratio.
3. Add tests for `connection.ts` (70 LOC, WebSocket mock).
4. After P1-001 lands, add tests for extracted renderer modules.
5. Set initial coverage threshold at 60%, ratchet to 80% over time.

**Constraints:**
- Renderer DOM tests require jsdom or happy-dom environment.
- `renderer.ts` decomposition (P1-001) should land first for testable
  modules.
- Canvas interactions may need mocking — scope those last.

**Touch points:** `client/vitest.config.ts` (new), `client/tests/` (new),
`client/package.json`, root `package.json` (test script)

**Blocked by:** P1-001 (for renderer tests; `state.ts` and
`connection.ts` tests can start immediately)

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

### P3-001 · AI opponent for single-player mode

**Problem:** The game is strictly PvP. A solo player has no way to learn
mechanics, practice strategies, or play without a second human. Bots exist
only for QA automation (`bin/qa/simulate-ui.ts`).

**Impact:** Limits onboarding and retention for new players. The game's
tactical depth (suit mechanics, face card eligibility, deployment strategy)
benefits from low-stakes practice against an AI.

**Approach (incremental):**

1. **Random bot** — picks valid actions uniformly at random. Reuse QA bot
   logic (`simulate-headless.ts`) as the engine-side opponent.
   Server-side only (no client changes beyond a "vs Bot" lobby option).
2. **Heuristic bot** — rank actions by simple evaluation (prefer high
   damage, shield positioning, avoid wasting aces). Pure engine-side.
3. **Difficulty tiers** — random (Easy), heuristic (Medium), lookahead
   (Hard). Exposed as `GameOptions.opponent: 'human' | 'bot-easy' | ...`.

**Constraints:**
- Bot logic lives in `engine/` or a new `bot/` package — never in
  `client/`.
- Bot must use the same `applyAction()` path as human players (no
  shortcuts).
- Bot actions must be deterministic given a seed (for replay integrity).
- Server manages bot turn timing (artificial delay for UX).

**Touch points:** `engine/src/bot.ts` or `bot/` package (new),
`server/src/match.ts`, `shared/src/schema.ts` (GameOptions extension),
`client/src/renderer.ts` (lobby "vs Bot" button)

**Independent of:** P1/P2 items (can proceed in parallel)
