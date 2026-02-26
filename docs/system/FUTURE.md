# Phalanx Duel — Future Enhancements

Ideas and deferred mechanics that are **not part of v1**. These are captured
here so they are not lost, but none of them should block the core game from
being playable and testable.

---

## PHX-SERVER-Backlog-001 — Server Integrity & Hardening Pass (Post-Evaluation) [Completed 2026-02-26]

Captured and resolved the highest-priority server-side issues identified during
codebase evaluation. This was a focused reliability/hardening task, not a
feature expansion.

**Status:** Completed on `2026-02-26`

**Implemented:**
- Fixed REST `POST /matches` -> WS `joinMatch` contract mismatch by supporting
  typed pending matches and safe first-join slot assignment.
- Fixed `system:init` phase telemetry to record the actual phase transition
  (`pre` -> `post`) instead of hardcoding `StartTurn -> AttackPhase`.
- Hardened admin auth defaults to fail closed outside `development`/`test`
  unless explicit admin credentials are configured.
- Gated `/debug/error` to `development`/`test` by default (or explicit
  `PHALANX_ENABLE_DEBUG_ERROR_ROUTE=1`).
- Added regression coverage for REST-created match -> two WS joins -> game
  start broadcast.

**Problem summary:**
- `POST /matches` pre-registers a placeholder match with `players: [null, null]`
  and stores it with a type cast, but `MatchManager.joinMatch()` assumes player
  slot 0 exists. A REST-created match can fail/crash on first WS join.
- `system:init` phase telemetry in `server/src/match.ts` is hardcoded as
  `StartTurn -> AttackPhase`, but engine init can transition to
  `DeploymentPhase` in classic deployment mode.
- Admin Basic Auth falls back to default credentials (`phalanx/phalanx`) when
  env vars are absent.
- `/debug/error` is registered unconditionally and should be gated outside
  development/test.
- Tests cover `POST /matches` and feeds, but do not assert the full REST-create
  -> WS-join path.

**Scope (completed):**
- Fix the REST create/join contract mismatch (either create a valid host slot or
  redesign/remove the placeholder route pattern).
- Derive init phase telemetry from actual state transition (`pre`/`post`)
  instead of hardcoding.
- Require explicit admin credentials in non-dev environments (fail closed).
- Gate `/debug/error` to development/test (or admin-only with explicit env
  flag).
- Add tests covering REST-created match -> first join -> second join ->
  successful game start broadcast.

**Acceptance criteria (met):**
- A match created via `POST /matches` can be joined without runtime error.
- Telemetry reports the actual `system:init` phase transition in both classic
  and cumulative modes.
- Production startup/requests do not expose usable default admin credentials.
- `/debug/error` is unavailable by default in production.
- A regression test fails on current behavior and passes after the fix.

**Implementation touch points (actual):**
- `server/src/app.ts`
- `server/src/match.ts`
- `server/tests/ws.test.ts`
- `server/tests/hardening.test.ts`
- `server/tests/match.test.ts`

**Notes:**
- Keep changes isolated to server package unless a contract change requires
  explicit shared schema updates.
- Preserve existing in-progress local edits in the repo root.

**Optional follow-up (separate task if desired):**
- Add startup warning/error logging when `NODE_ENV=production` and admin
  credentials are missing (currently requests fail closed, but startup signal
  could be clearer).
- Add a dedicated test that asserts the exact `system:init` telemetry phase in
  both classic and cumulative modes (requires telemetry test seam/mocking).

---

## Joker Card

The Joker has 0 attack and 0 defense value, no suit, and no suit bonuses. It
is considered a "Wild" card. The specific Wild mechanic is undefined.

Ideas for the Wild mechanic:
- Copy the suit/rank of an adjacent card
- Act as a wildcard during deployment (player chooses its effective suit)
- Sacrifice to draw additional cards
- Absorb one lethal hit then discard itself

The Joker is excluded from the 52-card deck in v1. Games use a standard deck
without Jokers.

**Related rule IDs:** PHX-CARDS-004, PHX-CARDS-002 (Joker value 0)

---

## Face-Down Cards

Cards in the drawpile and discard pile are face-down. A future mechanic could
place cards face-down on the battlefield (neither player sees the value). The
face-down card still occupies its grid position and can be targeted. When it
takes damage or is otherwise revealed, it flips face-up before the effect
resolves.

No specific trigger for face-down battlefield placement is defined yet.

Ideas:
- Deploy the last 1-2 cards face-down during deployment
- A special card ability that flips a card face-down
- Reinforcement from the drawpile arrives face-down

**Related rule ID:** PHX-CARDS-003

---

## Multi-Player (3+ Players)

The grid layout is designed for head-to-head play. A future expansion could
support 3+ players with adjusted grid sizes or a shared battlefield.

---

## Heroical Mechanics (deferred — revisit when core game is stable)

Heroical is implemented (`PHX-HEROICAL-001`, `PHX-HEROICAL-002`) but is
considered **provisional**. The mechanic exists in the engine and can be
triggered during play, but it has not been balanced or extensively playtested
against the core combat loop.

**Current implementation:**
- `PHX-HEROICAL-001` — A face card (J/Q/K) in hand can be swapped onto the
  battlefield in place of an existing card during the combat phase
- `PHX-HEROICAL-002` — A Heroical swap targeting an Ace destroys the Ace
  instantly, bypassing Ace invulnerability

**Deferred work:**
- Balance review: does the hand-swap create solvable dominant strategies?
- Cost/restriction design: should Heroical consume the whole turn? Cost LP?
  Be limited to once per game?
- Interaction audit: Heroical + suit bonuses, Heroical into a reinforcement
  column, Heroical when opponent has no back row
- Exposing `heroicalSwap` as a `GameOptions` toggle (Phase 27 explicitly
  excludes this until the mechanic is stable)
- Additional rule IDs if cost/restriction mechanics are added

**Do not expand, tune, or add UI for Heroical until the core game (deployment,
combat, overflow, LP, reinforcement, victory) has been playtested and feels
right. Heroical is opt-in complexity, not a core loop dependency.**

---

## Repeated Pass Auto-Loss Rule

A player who passes their turn N consecutive times without attacking should
automatically forfeit. This prevents stalling (a player who cannot win running
down the clock indefinitely) and keeps games moving.

**Proposed rule (PHX-TURNS-002):**
- A consecutive-pass counter is tracked per player in `GameState`.
- Each time a player submits a `pass` action during their combat turn, their
  counter increments. A successful attack resets the counter to 0.
- When the counter reaches the threshold (initially **3**), the `pass` action
  is treated as a forfeit: the opponent wins via `victoryType: 'forfeit'`.
- The threshold should be a `GameOptions` field (`maxConsecutivePasses`,
  default 3) so it can be tuned or disabled per match.

**Implementation touch points:**
- `shared/src/schema.ts` — add `consecutivePasses: [number, number]` to
  `GameStateSchema`; add `maxConsecutivePasses: z.number().int().min(1).default(3)`
  to `GameOptionsSchema`
- `engine/src/turns.ts` — increment counter on pass, reset on attack, trigger
  forfeit when threshold is reached
- `engine/src/state.ts` — initialise `consecutivePasses: [0, 0]` in
  `createInitialState`
- `docs/RULES.md` — add PHX-TURNS-002 rule ID before implementing
- Tests — existing pass tests still valid; add stall-detection tests

**Design notes:**
- The counter is per-player, not shared, so both players can pass independently.
- A player with no valid attacks is already in a losing position; the auto-loss
  formalises this without requiring the opponent to do anything.
- Reinforcement passes (passing during a reinforcement phase) should NOT count
  toward the stall counter — they are structurally forced.
- If `maxConsecutivePasses: 0` is set, the rule is disabled (unlimited passing).

**Related rule IDs (to be created):** PHX-TURNS-002

---

## Card UI — Font Size Pass (Readability)

The card value (rank) and suit symbol displayed on battlefield cards need a
readability pass. At current sizes they are legible on desktop but marginal on
smaller screens and in peripheral vision during rapid play.

**Scope:**
- Increase the font size of `.card-rank` and `.card-suit` elements in
  `client/src/style.css` — prioritise rank (the combat value) over suit label
- Consider making the suit a larger Unicode glyph (♠ ♥ ♦ ♣) as the primary
  suit indicator instead of or alongside the text label
- Verify at 375px mobile viewport — suit/rank must be legible at smallest
  battlefield cell size
- Check that HP numbers (`card-hp`) remain proportional and don't crowd rank
- No engine or server changes; pure CSS

**When to do it:** Any session, low risk. Takes 15–30 minutes. Can be batched
with any client-side visual polish session.

---

## Per-Player Card Skinning / Themes

Players should be able to customise the visual appearance of their cards
independently of their opponent. This is a value-add feature with a clear
monetisation path: default themes are free, premium themes are earned as prizes
or available for purchase.

### Design goals

1. **Pure client-side rendering.** The server never knows or transmits skin data.
   Card identity (`suit`, `rank`) is unchanged — only the visual presentation
   differs. This keeps the engine and server zero-touch.
2. **No gameplay impact.** Both players always know the opponent's card values
   (the server enforces hidden information; the skin does not add fog-of-war).
3. **Composable theme system.** A theme describes the card face, back, border,
   and colour palette. Players pick one theme for "my cards" independently.
4. **Prize / purchase distribution.** Theme IDs are unlocked tokens stored
   client-side (localStorage or account). Premium themes require a valid
   unlock token. The token is never validated server-side (cheat risk is
   cosmetic only — no gameplay advantage).

### Theme anatomy

A theme is a CSS class + optional asset bundle:

| Layer | Default | Customisable |
|---|---|---|
| Card face background | `--bg-card` (dark) | colour, gradient, texture image |
| Card border | `--border` (gold) | colour, width, corner radius |
| Rank glyph | IBM Plex Mono, white | font, size, colour |
| Suit glyph | Unicode ♠/♥/♦/♣ | glyph set, colour, icon |
| Card back (drawpile display) | solid `--bg` | pattern, colour, image |
| HP bar | amber | colour scheme |

### Implementation sketch

```javascript
client/src/themes/
  index.ts         — ThemeRegistry: { id, name, cssClass, unlockRequired }[]
  default.ts       — built-in free themes (Classic, Night, Parchment)
  premium.ts       — premium theme descriptors (no assets committed until purchased)
client/src/style.css
  .theme-classic   — current default (no change)
  .theme-night     — dark blue/silver palette
  .theme-parchment — warm cream, serif rank glyphs
  .theme-[prize]   — e.g. .theme-tournament-gold for event winners
```

Each player's chosen theme class is applied to their own battlefield container
only (`#player-battlefield` vs `#opponent-battlefield`), so both themes coexist
on screen simultaneously.

### Unlock / purchase flow (future)

- **Free themes:** always available, no token required.
- **Prize themes:** distributed as a unique code after a tournament or event.
  Code stored in `localStorage['phalanx_unlocked_themes']` as a JSON array of
  theme IDs. No server validation.
- **Purchasable themes:** integrate with a payment provider (Stripe, etc.).
  On successful payment, write the theme ID to localStorage (or a future
  player account). Same local storage mechanism as prize themes.
- **Account sync (future):** if a player account system is added, unlocked
  theme IDs become a server-side field, enabling cross-device sync.

### Milestones

1. CSS theme system + ThemeRegistry with 2–3 free themes — no unlock logic
2. Theme selector in lobby/settings panel (per-player independent picks)
3. Theme persistence in `localStorage` across sessions
4. Prize/unlock token mechanism
5. Purchase integration (separate from the game repo — payment service)

**When to do it:** After core gameplay is stable and playtested. Themes are
cosmetic and carry zero technical risk to game integrity.

**Related:** card font size pass (above) should be done first — readability
baseline before layering visual themes.

---

## Other Ideas

- Player name display in waiting room *(done)*
- Mobile responsive layout *(done)*
- Match history / replay viewer *(Phase 25 — planned)*
- Spectator mode *(done — Phase 26)*
- Ranked matchmaking
- Card animations and sound effects
- Game feed (list of live matches in lobby)
