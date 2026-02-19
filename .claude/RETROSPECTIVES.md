# Phalanx — Retrospective (Compacted)

Distilled from all sessions through Phase 24 (2026-02-10 → 2026-02-18).
Keep this lean. Add new entries only when a lesson materially changes the playbook.

---

## Execution Playbook

These are the standing rules for every implementation session:

1. **Schema-first dependency order.** For any change touching game state or protocol:
   schema → generated artifacts → engine → tests → server → client → docs.
   Running out of this order causes type drift and integration failures.

2. **Full-suite verification for gameplay changes.**
   `typecheck + lint + build + all tests` — not engine-only. Cross-package regressions
   (victory conditions, reinforcement flow) only appear in the full suite.

3. **Generated files are part of the source of truth.**
   After any schema edit: `pnpm schema:gen`, then stage the output before committing.
   `schema:check` compares committed files, not disk — it will fail on uncommitted changes.

4. **Docs are implementation-anchored.**
   RULES / HOWTOPLAY / PROTOCOL updates are required when user-visible behaviour,
   protocol semantics, or rule math changes. Stale docs are a recurring hazard.

5. **Deferred mechanics stay in FUTURE.md.**
   Joker, face-down cards, direct Spade damage — keep v1 scope clean.

6. **Security review on server-phase work.**
   State filtering / privacy, reconnect / re-auth, rate limiting, auth correctness.

7. **Tests cover integration effects, not just unit returns.**
   Include structured outcome assertions and state invariants. Pure engine tests
   miss server flow regressions.

8. **Commit in small chunks.**
   Large cross-cutting changes should be split into smaller committable units.
   Reduces context load and rollback risk.

9. **Read the full target file before editing.**
   One parallel read pass gives complete context. Prevents structural misplacement
   and naming mismatches (e.g. wrong class names in media queries).

10. **Run tests directly: `/usr/local/bin/pnpm test`**
    RTK's hook intercepts `pnpm test` and can fail on vitest output parsing.
    Always bypass RTK for test runs.

---

## Known Gotchas

| Situation | What happens | Fix |
|---|---|---|
| RTK + `pnpm test` | RTK intercepts, returns "command not found" | Use `/usr/local/bin/pnpm test` |
| `schema:check` after schema:gen | Fails because generated files aren't committed yet | Commit generated artifacts first |
| Background agents + Write tool | Agents hit write-permission wall for new files | Create new files in main context |
| phalanx-site push | Branch is `gh-pages`, not `main` | `git branch -vv` before cross-repo push |
| `@media` wrong class names | Selector silently doesn't match — no error | Grep class names against actual CSS before adding to media query |
| Suit + suit combo tests | Compounding bonuses (e.g. Spade attacker + Heart defender) produce non-obvious expected values | Write neutral-suit baseline test first, then add suit variants |
| `stateHashBefore/After` empty in browser | `hashFn` is not injected in browser context — strings are `""` | Expected: hash verification is server-side only; browser replay skips it |

---

## Architecture Decisions (Stable)

- **Server is authoritative.** Clients send intents; engine validates; server broadcasts.
- **Engine is pure/deterministic.** Same config + same actions = identical state every time.
- **Transaction log is the game record.** `(config, transactionLog[].action)` is sufficient to replay any game.
- **Hash chain proves integrity.** `stateHashAfter[N] === stateHashBefore[N+1]`. Hash excludes `transactionLog` to avoid circularity.
- **Per-player state filtering** is applied at broadcast time in `broadcastState`. Opponent `hand`/`drawpile` are redacted; counts are provided as `handCount`/`drawpileCount`.
- **Web client is the reference implementation.** The protocol is platform-agnostic JSON over WebSocket. Alternative clients (CLI, mobile, bots) are first-class.

---

## Open Risks

| Risk | Status |
|---|---|
| Docker build untested in CI | Open — `docker build` has never run in CI context |
| No E2E tests | Open — client UI changes have no Playwright coverage |
| tsx at runtime | Open — server runs TypeScript source via tsx; adds cold-start latency |
| Transaction log grows unbounded in broadcast | Open — for long games, every `gameState` message includes the full log since game start |

---

## Retrospective Notes by Phase

### Phases 0–12a (Engine + Server foundation)
- Schema-first sequencing was validated repeatedly. Every regression was caused by going out of order.
- Discriminated union pattern for `TransactionDetail` (5 variants) scales cleanly.
- Injecting `hashFn` into `applyAction` keeps the engine browser-safe while letting the server add crypto.
- Stress tests exposed transaction log overhead (~100 actions): needed 15s timeout.
- ESLint `no-unused-vars` fires on `const { field: _ } = ...` destructuring patterns. Use `eslint-disable` comment inline.

### Phases 13–16 (Filtering, Proxy, Hardening, Deployment)
- `tsx` must be a production dep (server runs TS source at runtime).
- Dockerfile needs every workspace `package.json` copied before `pnpm install`.
- Session storage (not local storage) for credentials: clears on tab close, preventing stale match references.

### Phases 17–21 (Lobby UX, Security, Observability)
- Phase 13 was fully implemented but ROADMAP checkboxes were not ticked. Always verify code reality against doc status.
- `timingSafeEqual` with fixed-length `Buffer.alloc(256)` avoids the length-mismatch throw and is more robust than hashing credentials.
- Background agents can't write new files — hits write-permission restriction. Delegate new file creation to main context.

### Phases 22–23 (Tactician's Table design)
- Three-font system (Cinzel / Crimson Pro / IBM Plex Mono) resolves legibility concerns across lobby, body, and game UI.
- CSS variable migration to `--gold`, `--bg`, `--text-muted` etc. made warm palette cohesive and easy to adjust.
- CSS gradient text on anchors needs `!important` overrides — browser specificity fights `-webkit-text-fill-color`.
- `el()` helper returns `HTMLElement`, not specific subtypes — cast to `HTMLAnchorElement` when setting `.href`.

### Phase 24 (Mobile responsive layout)
- Single breakpoint at 600px handled all portrait phones. Secondary at 380px was fine-tuning only.
- Game layout vertical stacking (sidebar → horizontal strip) required no JS changes — pure CSS `flex-direction: column`.
- Wrong class names in a `@media` block produce no error — selectors silently don't match. Verify with grep.

### Phase 26 — Live Spectator Mode (2026-02-19)

**What went well**
- Schema-first order (schema → gen → server → client → tests) held. No type drift.
- Tagged union for `SocketInfo` (`isSpectator: true | false`) gave clean TypeScript narrowing in app.ts — after `!socketInfo.isSpectator` early return, `socketInfo.playerId` was typed correctly with no cast needed.
- Sending `spectatorJoined` from app.ts BEFORE calling `broadcastMatchState` (rather than inside `watchMatch`) ensured the client sets `isSpectator: true` before the first `gameState` render — preventing a blank-render flash.
- Existing `renderBattlefield` required zero changes: the `gs.activePlayerIndex === state.playerIndex` guard (where playerIndex is null for spectators) naturally blocks all click handlers.
- 5 integration tests covered all key flows: join, live update, disconnect count, unknown match error, action rejection.

**What was surprising**
- `filterStateForSpectator` needed `as unknown as [...]` double-cast because `hand: []` infers `never[]` — the exact same as `filterStateForPlayer` but without an "own player pass-through" branch to help TypeScript. The existing function works only because the identity branch (`if (idx === playerIndex) return ps`) anchors the type.
- One existing test in `match.test.ts` asserted `{ matchId, playerId }` and broke because `socketMap` now stores `{ matchId, playerId, isSpectator: false }`. Small one-line fix.
- The `POST /matches` handler in app.ts creates a raw match object without going through `MatchManager.createMatch()` — so I had to add `spectators: []` there manually.

**What felt effective**
- Reading all 7 target files in parallel before writing any code — had complete context when implementing.
- Phased approach: fix schema → gen → server → client → CSS → tests → verify.
- `schema:gen` caught the `WatchMatchMessage` addition and emitted the right JSON Schema in one pass.

**What to do differently**
- When the POST /matches handler creates a raw match object, it bypasses MatchManager defaults. A factory function or MatchInstance default values would prevent this class of missed field. Worth noting for future MatchInstance additions.

### Phase 25-series setup (2026-02-18)
- Transaction log is chess-equivalent: `(config, transactionLog[].action)` → deterministic replay.
- Client already has all data for replay in final `gameState` — no server changes needed for Phase 25.
- `GET /matches/:matchId/replay` proves validity but doesn't return the game record — Phase 25a extends it.
- Lobby health indicator: fetch `/health` once on startup, store in AppState, render in lobby footer. One fetch is sufficient — WS connection success confirms server is up anyway.
- Structured/wide logging is the third pillar of observability alongside traces and metrics. Each log event should carry all relevant context fields (matchId, playerId, actionType, durationMs) as a single structured object.
