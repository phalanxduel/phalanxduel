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

- [ ] **P1** Heroical swap UI — the engine supports `heroicalSwap` actions but the client has no button to trigger it during combat. Players cannot use the Heroical hand-swap ability in the browser.
- [ ] **P1** Vite proxy for WebSocket — the client hardcodes `ws://hostname:3001/ws` in `client/src/main.ts`. Should add a Vite proxy config so the client dev server proxies `/ws` to the server, removing the hardcoded port.
- [ ] **P2** Player name display in waiting room — the waiting screen shows the Match ID but not the creating player's name.
- [ ] **P2** Mobile responsive polish — the grid layout works but has not been tested or tuned for small screens.

---

## Engine — Deferred Rules (12 todo test stubs)

These rules were intentionally deferred during implementation. Each has a
`.todo()` test stub in `engine/tests/rules.test.ts` and a corresponding entry
in `docs/RULES.md`.

### PHX-CARDS-003 — Face-down cards (3 stubs)

- [ ] **P2** Face-down card on battlefield occupies its grid position
- [ ] **P2** Face-down card can be targeted by attacks
- [ ] **P2** Face-down card is flipped face-up when damaged or revealed

Blocked on: no game mechanic currently places cards face-down on the
battlefield. Needs a trigger definition before implementation.

### PHX-CARDS-004 — Joker card (3 stubs)

- [ ] **P2** Joker has 0 attack and 0 defense
- [ ] **P2** Joker has no suit and receives no suit bonuses
- [ ] **P2** Joker is excluded from base ruleset deck

Blocked on: Joker "Wild" mechanic is undefined. Excluded from base rules.

### PHX-CARDS-002 — Joker value (1 stub)

- [ ] **P2** Joker has value 0

Same blocker as PHX-CARDS-004 above.

### PHX-SUIT-004 — Spade direct player damage (2 stubs)

- [ ] **P2** Spade bonus applies when attacking and opponent battlefield is empty
- [ ] **P2** Spade attack that clears last opponent card ends the game

Blocked on: no player HP pool in base rules. The victory condition is
"clear all opponent cards" — Spade's "damage to player" bonus has no
mechanical effect without a player health system.

### PHX-HEROICAL-001 — Heroical swap timing (2 stubs)

- [ ] **P1** Swap activates at start of opponent turn before attacker/target selection
- [ ] **P1** Opponent declares attacker/target after swap completes

The swap mechanic itself works, but the interrupt window timing (heroical
window phase) is not fully enforced. The server accepts swaps during combat
but does not enforce the "before attacker selection" timing.

### PHX-TURNS-001 — Heroical interrupt window (1 stub)

- [ ] **P1** Heroical interrupt window exists at start of each turn

Related to the timing stubs above. The `heroicalWindow` game phase exists in
the schema but is not used in the turn flow.

---

## Server Gaps

- [ ] **P1** Match cleanup — finished matches remain in server memory forever. Should remove matches in `gameOver` phase after a timeout.
- [ ] **P2** Rate limiting — no protection against rapid message spam from clients.

---

## Housekeeping

- [ ] **P2** Clean up pre-existing uncommitted files: `scripts/demo.ts` (untracked), `package.json` demo script addition, `.claude/settings.local.json` (local tool permissions).
- [ ] **P2** Add `scripts/demo.ts` to `.gitignore` or commit it properly.
