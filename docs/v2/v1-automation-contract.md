# v1 Automation Contract

This document captures the battle-tested browser/reference automation that
Godot v2 must match. It is the input to the canonical parity artifact contract
owned by `TASK-328.01`.

Canonical comparison contract:
`docs/v2/reference-playthrough-artifact-contract.md`.

Primary sources:

- `bin/qa/simulate-headless.ts`
- `bin/qa/simulate-ui.ts`
- `bin/qa/scenario.ts`
- `bin/qa/godot-automation.ts`
- `bin/qa/godot-playthrough.ts`
- `docs/reference/qa-runners.md`
- `docs/reference/playthrough-scenarios.md`

## Reference Runner

Canonical local head-to-head reference command:

```bash
rtk pnpm qa:playthrough -- --p1 human --p2 human --starting-lp 3 --screenshot-mode action --max-turns 120 --seed 20260615 --out-dir artifacts/playthrough-head2head
```

Known good artifact:

```text
artifacts/playthrough-head2head/2026-06-15T21-42-30-179Z_20260615_classic_lp3/manifest.json
```

Result:

- winner: `Bot A`
- result text: `Bot A Wins!`
- victory summary: `LP Depletion on turn 1`
- final LP: `Bot A: 3 LP | Bot B: 0 LP`
- screenshots: 19 action screenshots

## Runner Map

| Runner | Command | Role |
|---|---|---|
| Headless/browser reference | `rtk pnpm qa:playthrough` | deterministic local match smoke and visual artifacts |
| Matrix truth gate | `rtk pnpm qa:playthrough:verify` | broad rules/replay regression gate |
| Browser UI scenarios | `rtk pnpm qa:playthrough:ui` | headed/headless guest/auth PvP/PvB plus spectator |
| Scenario generator | `bin/qa/scenario.ts` | deterministic bot action list and final hash |
| Godot harness | `rtk pnpm qa:godot:automation` | headless Godot checkpoint verifier |
| Godot visual runner | `rtk pnpm qa:godot:playthrough` | visible or headless Godot playback confirmation |

Godot parity must prove both:

1. deterministic machine-readable checkpoints, and
2. visible screenshots or recording for human confirmation.

## Browser Manifest Shape

`qa:playthrough` writes one `manifest.json` per run. Required fields:

| Field | Meaning |
|---|---|
| `seed` | deterministic run seed |
| `startAt`, `endAt`, `durationMs` | timing evidence |
| `baseUrl` | target client URL |
| `damageMode` | `classic` or `cumulative` |
| `startingLifepoints` | configured starting LP |
| `status` | `success` or `failure` |
| `failureReason`, `failureMessage` | non-success diagnostics |
| `turnCount` | final visible or engine turn |
| `actionCount` | submitted actions |
| `screenshotCount` | number of screenshots captured |
| `screenshots` | paths relative to run dir |
| `outcomeText` | terminal result text |
| `winnerName` | parsed winner |
| `victorySummaryText` | victory type and turn summary |
| `lifepointsText` | final LP summary text |
| `finalLifepoints` | structured final LP by player name |
| `screenshotMode` | `turn`, `action`, or `phase` |
| `p1`, `p2` | player strategy/input mode |

Godot artifact parity should use these fields first, then add Godot-specific
fields under a namespaced key if needed.

Comparator-friendly fields that should be added when `TASK-328.01` freezes the
canonical contract:

- `runId`
- `matchId`
- `scenarioId` or `scenarioPath`
- `finalStateHash`
- viewport width/height
- viewer perspective
- headed/headless mode

## Screenshots

Browser screenshots live under `screenshots/` inside the run directory.
Naming convention:

```text
t{turn}_{phase}_{sequence}_{label}.png
```

Examples:

- `t0000_deployment_0001_start.png`
- `t0001_combat_0017_action.png`
- `t0000_unknown_0019_game-over.png`

Godot screenshots should preserve the same information: turn, phase,
monotonic sequence, and semantic label. Exact rendering may differ only when a
documented parity gap is accepted.

## Event Stream

Browser runs write `events.ndjson` lines with:

- `at`
- `type`: `state`, `action`, `result`, or `error`
- optional `actor`
- `detail`

Automation uses these events to prove progress and diagnose stalls. Godot
should emit an equivalent event stream or embed equivalent ordered checkpoints
in its manifest.

The current `detail` field is free text. The canonical contract should add
structured keys for `turn`, `phase`, `actor`, `actionType`, checkpoint type,
and terminal result so the comparator does not have to parse prose.

## Automation Selectors

The browser runner drives gameplay through stable selectors and classes:

| Flow | Selector or class |
|---|---|
| Lobby ready | `[data-testid="lobby-name-input"]`, `.lobby-status-card--ready` |
| Configure match | `lobby-damage-mode`, `lobby-starting-lp` |
| Create PvP match | `lobby-create-btn`, `waiting-match-id` |
| Join PvP match | `lobby-join-input`, `lobby-join-btn` |
| Watch match | query `?watch=...`, `game-layout` |
| Deployment | `[data-testid^="hand-card-"].playable`, `player-battlefield .valid-target` |
| Attack | `[data-testid^="player-cell-r0-"].attack-playable`, `opponent-battlefield .valid-target` |
| Reinforce | `.reinforce-playable`, `.bf-cell.reinforce-col.valid-target` |
| Pass/skip | `combat-pass-btn`, `combat-skip-reinforce-btn` |
| Game over | `game-over`, `game-over-result`, `.lp-summary` |

Godot does not need DOM selectors, but it needs equivalent stable automation
handles for each row in this table.

## Scenario Contract

`bin/qa/scenario.ts` produces deterministic scenario files:

| Field | Meaning |
|---|---|
| `version` | scenario schema version, currently `1` |
| `id` | deterministic scenario ID |
| `seed` | RNG seed |
| `damageMode` | engine damage mode |
| `startingLifepoints` | initial LP |
| `p1`, `p2` | bot strategy |
| `actions` | canonical shared `Action[]` |
| `finalStateHash` | final deterministic hash |
| `turnCount` | final turn |

Scenario data is suitable for Godot automation only as an input/action oracle.
It is not a substitute for rendering the full v1 user journey.

Current scenario files are bot-only and quick-start oriented. They do not yet
express the browser reference command's `p1 human` / `p2 human` shape, guest
versus auth flow, PvB/PvP mode, spectator mode, viewport, or input mode. Those
dimensions belong in the parity artifact contract rather than in GDScript.

## Existing Godot Harness

`qa:godot:automation` currently:

- generates or loads a deterministic scenario,
- launches Godot headlessly with `AutomationHarness.gd`,
- writes `input.json`, `result.json`, and `godot.log`,
- verifies checkpoints `connected`, `hydrated`, and `animation_idle`.

Current result shape:

- `ok`
- `errors`
- `checkpoints[]`
- `scenario.id`
- `scenario.seed`
- `scenario.damageMode`
- `scenario.startingLifepoints`
- `scenario.actionCount`
- `scenario.turnCount`
- `scenario.finalStateHash`

Gap: the harness does not yet emit browser-equivalent manifests,
screenshots, winner text, final LP, or end-to-end two-player interaction
evidence. That work begins in `TASK-328.02` after `TASK-328.01`.

`qa:godot:playthrough` can launch visible or headless Godot playback, but it
does not yet create a durable artifact directory comparable to the browser
playthrough runner.

## Canonical Parity Artifact Requirements

The common browser-vs-Godot artifact contract should require:

| Requirement | Browser source | Godot source |
|---|---|---|
| deterministic seed/config | manifest | manifest |
| scenario/action source | scenario file or runner mode | same scenario/action source |
| ordered progress events | `events.ndjson` | checkpoint/event stream |
| screenshots | `screenshots[]` | `screenshots[]` |
| winner and score | game-over scrape or engine state | projected terminal state |
| final LP | `finalLifepoints` | projected terminal state |
| checkpoint coverage | implicit selectors/events | explicit checkpoint list |
| failure diagnostics | failure fields and console log | failure fields and Godot log |

The comparator should fail when Godot cannot prove the same journey, even if
the Godot scene launches successfully.
