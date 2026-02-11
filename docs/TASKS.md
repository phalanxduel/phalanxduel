# Phalanx — Outstanding Tasks

Tracked work items for the project. Items are grouped by category and marked
with priority. Check items off as they are completed.

**Priority:** `P0` = blocking QA, `P1` = should fix before release, `P2` = nice to have

---

## Bugs & Vulnerabilities

- [x] **P0** Upgrade esbuild to >= 0.25.0 (Dependabot alert: dev server request read vulnerability). Fixed by upgrading vitest 2.x -> 3.x.

---

## Documentation Gaps

- [ ] **P1** Update `docs/PROTOCOL.md` — still has placeholder TODOs (`POST /matches`, `join`, `action`, `state`, `error`) despite the WS protocol being fully implemented in code. Should document the actual message types from `shared/src/schema.ts`.
- [x] **P1** Create `docs/HOWTOPLAY.md` — step-by-step guide for starting the server and playing a game in development.
- [ ] **P2** Update `CLAUDE.md` — client package description says "Placeholder only; no gameplay" but the client is fully implemented (Phase 9 complete).

---

## Client Gaps

- [ ] **P1** Vite proxy for WebSocket — the client hardcodes `ws://hostname:3001/ws` in `client/src/main.ts`. Should add a Vite proxy config so the client dev server proxies `/ws` to the server, removing the hardcoded port.
- [ ] **P2** Player name display in waiting room — the waiting screen shows the Match ID but not the creating player's name.
- [ ] **P2** Mobile responsive polish — the grid layout works but has not been tested or tuned for small screens.

---

## Engine — Deferred Rules

12 `.todo()` test stubs remain in `engine/tests/rules.test.ts` for future
mechanics (Heroical swap, Joker, face-down cards, Spade direct damage). These
are documented in [`docs/FUTURE.md`](./FUTURE.md) and are not part of v1.

---

## Server Gaps

- [ ] **P1** Match cleanup — finished matches remain in server memory forever. Should remove matches in `gameOver` phase after a timeout.
- [ ] **P2** Rate limiting — no protection against rapid message spam from clients.

---

## Housekeeping

- [ ] **P2** Clean up pre-existing uncommitted files: `scripts/demo.ts` (untracked), `package.json` demo script addition, `.claude/settings.local.json` (local tool permissions).
- [ ] **P2** Add `scripts/demo.ts` to `.gitignore` or commit it properly.
