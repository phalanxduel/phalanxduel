# RISKS.md — Known Risks and Operational Hazards

Observed failure modes, environment hazards, and non-obvious gotchas discovered during development and QA. Each entry includes the symptom, root cause, and mitigation.

Actionable follow-up work belongs in `backlog/tasks/`. This document keeps the
operational context and links to canonical backlog tasks when a risk still has
open engineering work behind it.

---

## Stale worktree Vite server steals port 5173

**Severity:** High — causes all local testing to silently run against old code
**Discovered:** 2026-02-27 during Pizzazz QA session
**Backlog follow-up:** [TASK-35](../../backlog/tasks/task-35%20-%20PHX-QA-001%20-%20Prevent%20stale%20worktree%20dev%20servers%20from%20hijacking%20127.0.0.1%20QA.md) — `PHX-QA-001 - Prevent stale worktree dev servers from hijacking 127.0.0.1 QA`

### Symptom
Code changes have no visible effect in the browser. All Playwright bot runs appear to test the correct URL (`http://127.0.0.1:5173`) but show behavior from a previous code state. No error is reported; everything appears "working" but with old UI.

### Root Cause
macOS IPv6 socket binding precedence. When a Vite server is started in a worktree **without** `--host` (e.g. `pnpm dev:client`), it binds to `[::1]:5173` (IPv6 loopback, specific). When a second Vite server is later started **with** `--host` (e.g. `pnpm dev:client --host`), it binds to `[::]:5173` (IPv6 wildcard). The OS routes `http://127.0.0.1:5173` connections to the more-specific `[::1]` binding first, so the stale worktree server wins every connection.

This is silent — both `lsof -iTCP:5173` entries show `LISTEN`, and the browser connects successfully, just to the wrong process.

### Detection
```bash
lsof -iTCP:5173 | grep LISTEN
# Danger: two entries. Kill the one NOT in the main working tree.
# node  12474  IPv6  TCP  127.0.0.1:5173   ← stale worktree (specific)
# node  24206  IPv6  TCP  *:5173           ← main branch (wildcard, loses)
```

### Mitigation
- Before running any local QA, verify only one Vite process is listening on 5173.
- Kill stale worktree servers when switching away from a worktree:
  ```bash
  # Kill all worktree dev servers (adjust paths as needed)
  pkill -f ".worktrees/.*vite"
  pkill -f ".worktrees/.*tsx"
  ```
- Alternatively, always start worktree servers on a different port:
  ```bash
  VITE_PORT=5174 pnpm dev:client --host
  ```

---

## Stale `engine/dist` masks source changes in server tests

**Severity:** Medium — can make cross-package validation pass or fail against
old engine behavior
**Discovered:** 2026-02-24 during DeploymentPhase debugging
**Status:** Documented contributor hazard; no active backlog task.

### Symptom
An engine source change appears correct in `engine` tests, but `server` tests or
runtime behavior still reflect an older rules snapshot. There is no
module-not-found error; the wrong behavior is silent.

### Root Cause
The server consumes built engine output from `engine/dist`, and that output is
not rebuilt automatically during the normal fast inner loop. If `engine/dist`
was generated in an earlier session, it can lag behind `engine/src` and keep
feeding stale logic into cross-package tests.

### Detection
If engine-only tests and server tests disagree after an engine change, inspect
both the source file and the corresponding built artifact:
```bash
sed -n '1,160p' engine/src/state.ts
sed -n '1,160p' engine/dist/state.js
```

### Mitigation
- After engine source changes that affect server/runtime imports, run
  `pnpm --filter @phalanxduel/engine build` before `pnpm test:server` or use
  `pnpm check:ci`.
- Treat `pnpm check:quick` as lint/type/schema/docs validation only; it does not
  rebuild packages or run tests.
- When behavior differs across packages, inspect both `engine/src/*` and
  `engine/dist/*` before assuming the source edit is ineffective.

---

## simulate-ui.ts targets production by default

**Severity:** Medium — automated QA runs against prod, not local changes
**Discovered:** 2026-02-27
**Backlog follow-up:** [TASK-36](../../backlog/tasks/task-36%20-%20PHX-QA-002%20-%20Make%20simulate-ui%20target%20local%20QA%20safely%20by%20default.md) — `PHX-QA-002 - Make simulate-ui target local QA safely by default`

### Symptom
Running `pnpm tsx bin/qa/simulate-ui.ts` shows no effect from local code changes. The bot plays a full game but on the deployed production build.

### Root Cause
`BASE_URL` in `bin/qa/simulate-ui.ts` defaults to `https://play.phalanxduel.com`:
```ts
const BASE_URL = process.env.BASE_URL || 'https://play.phalanxduel.com';
```

### Mitigation
Always set `BASE_URL` when testing local changes:
```bash
BASE_URL=http://127.0.0.1:5173 pnpm tsx bin/qa/simulate-ui.ts
```
Consider making the local URL the default if the server is detected as running, or adding a pre-flight check that warns when targeting production.

---

## DeploymentPhase requires all 8 battlefield slots filled

**Severity:** Low — affects bot/test setup time only
**Discovered:** 2026-02-27 during Playwright bot development
**Backlog follow-up:** [TASK-37](../../backlog/tasks/task-37%20-%20PHX-QA-003%20-%20Add%20a%20fast-start%20path%20for%20DeploymentPhase%20QA.md) — `PHX-QA-003 - Add a fast-start path for DeploymentPhase QA`

### Symptom
After both players fill their 4 front-row slots, the game stays in `DeploymentPhase`. The phase does not advance to `AttackPhase`. No pass button appears.

### Root Cause
The engine transition `deploy:complete → AttackPhase` fires only when **both players have every battlefield slot occupied** — all 8 cells (4 front + 4 back) per player. See `engine/src/turns.ts`:
```ts
const p0Full = newState.players[0]!.battlefield.every((s) => s !== null);
const p1Full = newState.players[1]!.battlefield.every((s) => s !== null);
if (p0Full && p1Full) { /* → AttackPhase */ }
```

There is no pass/skip mechanism in `DeploymentPhase` — the only exit is filling all 16 slots.

### Mitigation
- Playwright bots must deploy 8 cards per player (4 front + 4 back) before AttackPhase is reachable.
- The `simulate-ui.ts` bot's deployment loop correctly handles this: it clicks `.hand-card.playable` which targets whatever valid cells exist (front row first, then back row once front is full).
- For fast test setup, consider a server-side "skip deployment" option (e.g. a test-only match param that pre-fills the board with random cards).

---

## CSS `translate(-50%, -50%)` breaks animations on block elements

**Severity:** Medium — caused phase splash overlay to appear off-screen
**Discovered:** 2026-02-27 during Pizzazz CSS debugging
**Status:** Documented implementation pitfall; no active backlog task.

### Symptom
Phase splash text (e.g. "BATTLE START") is invisible or appears at the far left edge of the screen instead of centered.

### Root Cause
Applying `transform: translate(-50%, -50%)` to an element with `width: 100%` (a block-level element) translates it by `-50vw` horizontally — pushing it half a viewport width to the left. The text appears at the left edge or fully off-screen.

This pattern is only safe when the element has `width: auto` / `display: inline-block` (so it shrinks to content width, and 50% of content-width is small).

**Wrong:**
```css
.pz-splash-text {
  display: block;  /* width: 100% */
  transform: translate(-50%, -50%) scale(0.5);  /* shifts 50vw left */
}
```

**Fixed:**
```css
.pz-splash-overlay {
  position: fixed;
  top: 50%;
  left: 0; right: 0;
  transform: translateY(-50%);  /* overlay centered vertically */
  text-align: center;
}
.pz-splash-text {
  display: inline-block;  /* shrinks to content; translateX(-50%) would be small */
  animation: pz-splash-entry ...;  /* uses only scale + translateY */
}
```

### Mitigation
When animating centered overlays, position the container with `left: 0; right: 0; text-align: center` and make the animated child `display: inline-block`. Only use `translateX(-50%)` when paired with `left: 50%` on an element with `width: auto`.

---

## Animation capture requires sub-200ms screenshot latency

**Severity:** Low — affects QA visibility only, not gameplay
**Discovered:** 2026-02-27 during Playwright visual verification
**Backlog follow-up:** [TASK-38](../../backlog/tasks/task-38%20-%20PHX-QA-004%20-%20Add%20a%20durable%20automation%20hook%20for%20short-lived%20battle%20animations.md) — `PHX-QA-004 - Add a durable automation hook for short-lived battle animations`

### Symptom
Playwright screenshot taken after a game action shows no visual animation overlays (splash, announcer, damage pops), even though the DOM snapshot at 300ms post-click confirms all `pz-*` elements were present and live.

### Root Cause
Short-lived animations:
- Phase splash: 1200ms display + 400ms fade = **1600ms total**
- Combat announcer entries: **2600ms** before `.remove()`
- Damage pops: removed on `animationend` (CSS animation ~600ms)
- Screen shake: **400ms**

Playwright MCP tool call overhead (JS eval round-trip + screenshot encode) can easily exceed 400–800ms, missing the damage pop window. The DOM snapshot via `page.evaluate()` is faster than `page.screenshot()` and more reliable for presence checks.

### Mitigation
- Use DOM presence checks (`querySelectorAll('[class*="pz-"]')`) rather than screenshots to verify animation firing in automated tests.
- For visual screenshots, trigger the attack and screenshot in a **single `page.evaluate` call** with no `waitForTimeout` in between to minimize round-trip delay.
- Consider adding a `data-pz-last-event` attribute to `document.body` that persists for 5s after the last Pizzazz trigger, giving screenshots a wider capture window.
