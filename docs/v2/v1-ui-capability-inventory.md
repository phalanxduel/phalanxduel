# v1 UI Capability Inventory

This inventory records the browser/reference UX that Godot v2 must port as
closely as practical. The browser client remains the visual and interaction
oracle; Godot must consume authoritative TypeScript engine/server state rather
than duplicating rules.

Primary sources:

- `client/src/lobby.tsx`
- `client/src/waiting.tsx`
- `client/src/game.tsx`
- `client/src/game-over.tsx`
- `client/src/state.ts`
- `bin/qa/simulate-headless.ts`
- `artifacts/playthrough-head2head/2026-06-15T21-42-30-179Z_20260615_classic_lp3/manifest.json`

## Launch And Lobby

The first screen is the tactical lobby at `data-testid="lobby-layout"`.
Automation waits for `data-testid="lobby-name-input"` plus
`.lobby-status-card--ready`.

Capabilities to port:

| Browser surface | Current selector or state | Portable Godot source |
|---|---|---|
| Guest operative name | `data-testid="lobby-name-input"` | Local client profile/operative name field |
| Connection readiness | `.lobby-status-card--ready`, `connectionState` | WebSocket connection state |
| Auth entry | `data-testid="userbar-authorize-btn"` | local auth navigation |
| Auth form | `auth-gamertag-input`, `auth-email-input`, `auth-password-input`, `auth-submit-btn` | auth REST/WS bootstrap state |
| Quick match | `data-testid="lobby-quick-match-btn"` | `createMatch` with quick match path |
| Bot match | `data-testid="lobby-bot-btn-easy"`, `lobby-bot-btn-med`, MCTS variants | `createMatch.opponent` and optional `botDifficulty` |
| Private match | `data-testid="lobby-create-btn"` | `createMatch.visibility=private` |
| Public match toggle | `data-testid="list-publicly-toggle"` | `createMatch.visibility=public_open` |
| Public lobby | `data-testid="lobby-open-match-btn"` and open match cards | REST lobby list plus `joinMatch` |
| Spectator lobby | `data-testid="lobby-spectator-lobby-btn"` | REST spectator list plus `watchMatch` |
| Join by match ID | `data-testid="lobby-join-input"`, `lobby-join-btn` | `joinMatch` |
| Watch by match ID | `data-testid="lobby-watch-input"`, `lobby-watch-btn` | `watchMatch` |
| Damage mode | `data-testid="lobby-damage-mode"` | `createMatch.gameOptions.damageMode` |
| Starting LP | `data-testid="lobby-starting-lp"` | `createMatch.gameOptions.startingLifepoints` |
| Grid size | `advanced-rows-input`, `advanced-columns-input` | `createMatch.matchParams` |
| Active match recovery | `active-match-panel`, `active-match-resume-btn` | REST active matches plus `rejoinMatch` |
| Ranked queue | `lobby-ranked-queue-btn` | `joinQueue` and `leaveQueue` |

Godot parity target: the lobby should expose the same match creation, join,
watch, and configuration affordances. Marketing/footer/profile panels are
secondary; the automation-critical controls above are required before parity
can advance.

## Waiting Room

After private match creation, the browser enters `screen="waiting"` and renders
the shareable match identifiers.

Capabilities to port:

| Browser surface | Current selector | Portable Godot source |
|---|---|---|
| Player invitation match ID | `data-testid="waiting-match-id"` | `matchCreated.matchId` |
| Observer invitation match ID | `data-testid="waiting-watch-match-id"` | `matchCreated.matchId` |
| Return/cancel affordance | `.btn-cancel` | Local navigation state |

Automation uses `waiting-match-id` to drive the second player and spectator.
Godot must expose the match ID as machine-readable text or an equivalent
automation checkpoint.

## Game Layout

The browser game root is `data-testid="game-layout"`. It carries:

- `data-phase`
- `data-phase-tone`
- `data-match-id`
- `data-spectator`

Capabilities to port:

| Browser surface | Current selector or class | Portable Godot source |
|---|---|---|
| Phase announcement | `data-testid="phase-indicator"` | `GameState.phase`, reinforcement column |
| Turn counter | `.phx-match-meta span` with `Tn` | `GameState.turnNumber` |
| Turn status | `data-testid="turn-indicator"` | `GameState.activePlayerIndex`, `viewerIndex` |
| Spectator banner | `data-testid="spectator-banner"` | `viewerIndex=null` |
| Spectator count | `data-testid="spectator-count"` | `gameState.spectatorCount` message field |
| Player/opponent stats | `data-testid="player-stats"`, `opponent-stats` | player LP, hand/deck/discard counts |
| Help/onboarding overlays | `HelpDialog`, `OnboardingBriefing` | optional parity after core playability |

Godot parity target: render the same phase, turn, active player, match ID,
viewer role, and LP/hand/deck/discard data from the server projection.

## Battlefield And Hand

The browser battlefield is grid-based and selector-driven:

- `data-testid="player-battlefield"`
- `data-testid="opponent-battlefield"`
- `data-testid="player-cell-r{row}-c{col}"`
- `data-testid="opponent-cell-r{row}-c{col}"`
- `data-testid="hand-container"`
- `data-testid="hand"`
- `data-testid="hand-card-{index}"`

DOM classes encode interaction state:

| Browser class or attribute | Meaning | Portable Godot source |
|---|---|---|
| `occupied` | Battlefield cell has a card | `GameState.players[*].battlefield` |
| `selected` / `active-attacker` | Local selection | local input state |
| `valid-target` | Can receive selected deploy/attack/reinforce | `validActions` |
| `playable` | Hand card can deploy | `validActions` deploy entries |
| `reinforce-playable` | Hand card can reinforce | `validActions` reinforce entries |
| `reinforce-col` | Current reinforcement column | `GameState.reinforcement.column` |
| `attack-playable` | Own front-row card can attack | `validActions` attack entries |
| `data-action-preview` | Attack preview verdict | engine `simulateAttack` or server view data |
| `phx-action-preview-chip` | Visible verdict chip | combat preview data |
| `phx-card-hp-bar`, `phx-card-hp-text` | Unit HP | `BattlefieldCard.currentHp` |

Godot parity target: use stable node names or automation metadata equivalent to
these selectors so deployment, attack, reinforce, pass, and game-over flows can
be driven without visual scraping.

Legacy automation selectors such as `player-grid-col-*`,
`player-battlefield-card-col-*`, `opponent-battlefield-card-col-*`, and
`pass-btn` are not emitted by the current renderer. The current authority for
parity is `game-layout`, `hand-card-*`, `player-cell-*`, `opponent-cell-*`,
command buttons, and the state/class selectors listed above.

## Player Actions

Current browser actions are submitted through `getConnection().send({ type:
"action", matchId, action })`.

Required input capabilities:

| Action | Browser interaction | Authoritative payload |
|---|---|---|
| Deploy | click playable hand card, click own empty valid cell | `Action.type="deploy"` |
| Attack | click own front-row attackable card, click opponent valid target | `Action.type="attack"` |
| Reinforce | click reinforce-playable hand card, click reinforce column | `Action.type="reinforce"` |
| Pass | `data-testid="combat-pass-btn"` | `Action.type="pass"` |
| Skip reinforce | `data-testid="combat-skip-reinforce-btn"` | `Action.type="pass"` |
| Forfeit | `data-testid="combat-forfeit-btn"` | `Action.type="forfeit"` |
| Cancel selection | `#phx-command-cancel` | local input state only |

Godot must not recalculate action legality. It should render and submit only
the actions made available by the server projection or committed scenario data.

## Combat Feedback And Log

The browser renders combat state from transaction log and shared combat
derivation helpers.

Capabilities to port:

| Browser surface | Current selector or class | Portable Godot source |
|---|---|---|
| Combat feedback banner | `data-testid="combat-feedback-banner"` | latest attack transaction detail plus `deriveCombatResolution` |
| Cause tags | `.phx-cause-tag` | `combat.causeLabels` |
| Engagement log | `.phx-log-entry` | `GameState.transactionLog` attack entries |
| Play-by-play | `.phx-play-by-play-entry` | transaction log entries |
| Column highlight | `col-highlight-attacker`, `target`, `reinforce`, `resolution` | selection, valid actions, last transaction |

For Godot, the safest path is to expose combat preview/result information in
the renderer-independent view state rather than recomputing rule decisions in
GDScript.

Additional browser-only presentation side channels exist in `pizzazz.ts`,
`narration-overlay.ts`, and `narration-ticker.ts`. Godot should replace these
with cue or event-driven equivalents for deploy, attack vector, damage pop,
suit bonus, phase announcement, game-over splash, and combat feed playback.

## Spectator And Live Director

Live spectator mode uses the normal game layout with `data-spectator="true"`.
The sidebar adds:

- `data-testid="spectator-live-panel"`
- `data-testid="spectator-banner"`
- `data-testid="spectator-count"`
- play-by-play entries

Portable state requirements:

- `viewerIndex=null`
- active player name
- phase label
- match ID
- damage mode
- spectator count
- transaction log / play-by-play feed

Godot parity target: the spectator surface must be automatable and suitable for
visual confirmation or recording before spectator scenario tasks are complete.

## Game Over

The game-over screen is the terminal evidence surface for playthrough parity.

Capabilities to port:

| Browser surface | Current selector | Portable Godot source |
|---|---|---|
| Game-over root | `data-testid="game-over"` | `GameState.phase="gameOver"` |
| Winner/result text | `data-testid="game-over-result"` | `GameState.outcome.winnerIndex` plus viewer role |
| Victory reason | first `.lp-summary` | `GameState.outcome.victoryType`, `turnNumber` |
| Final LP summary | second `.lp-summary` | `GameState.players[*].lifepoints` |
| Turning point | `data-testid="turning-point-summary"` | `selectTurningPoint(GameState)` |
| Copy result | `COPY_RESULT` button | optional after terminal evidence |
| Play again | `data-testid="play-again-btn"` | local navigation reset |

The canonical head-to-head reference run
`artifacts/playthrough-head2head/2026-06-15T21-42-30-179Z_20260615_classic_lp3/manifest.json`
ended with `Bot A Wins!`, `LP Depletion on turn 1`, and `Bot A: 3 LP | Bot B:
0 LP`.

## Replay And Rewatch

The browser rewatch screen uses REST replay endpoints and embeds the same game
and game-over renderers.

Automation-relevant surfaces:

- `data-testid="rewatch-match-header"`
- `data-testid="rewatch-action-label"`
- `data-testid="rewatch-step-label"`
- `data-testid="rewatch-step-scrubber"`
- `data-testid="rewatch-prev-btn"`
- `data-testid="rewatch-play-btn"`
- `data-testid="rewatch-next-btn"`
- `data-testid="rewatch-speed"`
- `data-testid="rewatch-board"`

Godot parity target: render deterministic replay frames from action logs or
scenario artifacts, with equivalent step, play/pause, speed, and viewpoint
controls before replay scenario parity is considered complete.

## DOM-Bound To Portable Mapping

Every DOM-bound v1 automation feature has a required portable equivalent:

| DOM-bound feature | Required portable feature |
|---|---|
| `data-testid` selectors | Godot automation checkpoint/node metadata |
| CSS classes for legal targets | `validActions` and local selection state |
| CSS classes for phase tone | `GameState.phase` and phase label mapping |
| Browser screenshot filenames | Godot screenshot paths with phase/turn/checkpoint labels |
| `.lp-summary` scraping | structured winner, victory reason, and final LP fields |
| `events.ndjson` state/action lines | Godot checkpoint/action event stream |
| Local storage overlay dismissal | deterministic automation mode that suppresses intercepting overlays |
| Browser confirm dialogs | explicit Godot command confirmation or automation bypass |
| Rewatch URL params | Godot replay input file or launch args |
| Clipboard and alert calls | explicit copy/share command result state |
| `navigator.vibrate` | haptic cue support or no-op fallback |
| `sessionStorage` match recovery | durable local session record for `rejoinMatch` |
| URL query routing | Godot launch args or in-app route state |

The parity build should treat missing portable equivalents as implementation
gaps, not as reasons to hand-roll rules or rely on image scraping.
