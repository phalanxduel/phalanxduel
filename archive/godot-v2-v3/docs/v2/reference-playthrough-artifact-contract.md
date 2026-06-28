# Reference Playthrough Artifact Contract

This contract defines the v1/browser reference artifact that Godot v2 parity
work must compare against. It is the UX oracle for the Godot migration, but it
is not proof that Godot is complete. A browser run proves the reference lane;
Godot parity requires a Godot run to emit equivalent evidence and pass
comparison.

## Canonical Reference Command

Use this command for a fast complete local head-to-head reference run:

```bash
rtk pnpm qa:playthrough -- --p1 human --p2 human --starting-lp 3 --screenshot-mode action --max-turns 120 --seed 20260615 --out-dir artifacts/playthrough-head2head
```

Parameters are intentional:

| Parameter | Contract value | Reason |
|---|---|---|
| `--p1 human` | `human` | Drives player one through browser automation |
| `--p2 human` | `human` | Drives player two through browser automation |
| `--starting-lp` | `3` | Completes quickly for local parity proof |
| `--screenshot-mode` | `action` | Captures every action transition |
| `--max-turns` | `120` | Fails stalled runs instead of hanging |
| `--seed` | `20260615` | Stable deterministic reference |
| `--out-dir` | `artifacts/playthrough-head2head` | Shared local reference location |

Use LP 20 only for full-length pacing gates. The LP 3 run is the default
implementation target for screen-by-screen parity work.

## Artifact Directory

Each browser run writes one timestamped directory:

```text
artifacts/playthrough-head2head/<timestamp>_<seed>_<damageMode>_lp<startingLifepoints>/
```

Required files:

| File | Required | Purpose |
|---|---|---|
| `manifest.json` | yes | Structured run result and terminal evidence |
| `events.ndjson` | yes | Ordered state/action/error progress events |
| `screenshots/` | yes for browser visual runs | Full-page visual evidence |
| `console-errors.log` | failure only | Browser diagnostics |

## Required Manifest Fields

Every reference-compatible artifact must provide these fields:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `seed` | number | yes | deterministic run seed |
| `startAt` | ISO datetime | yes | run start |
| `endAt` | ISO datetime | yes | run end |
| `durationMs` | number | yes | wall-clock runtime |
| `baseUrl` | string | yes | target browser origin |
| `damageMode` | string | yes | `classic` or `cumulative` |
| `startingLifepoints` | number | yes | configured starting LP |
| `status` | string | yes | `success` or `failure` |
| `failureReason` | string | on failure | stable failure category |
| `failureMessage` | string | on failure | diagnostic text |
| `turnCount` | number | yes | final turn count |
| `actionCount` | number | yes | submitted action count |
| `screenshotCount` | number | yes | number of screenshots |
| `screenshots` | string[] | yes | paths relative to artifact dir |
| `outcomeText` | string or null | yes | terminal result text |
| `winnerName` | string | success expected | parsed winner |
| `victorySummaryText` | string | success expected | victory type and turn |
| `lifepointsText` | string | success expected | terminal LP summary |
| `finalLifepoints` | object | success expected | final LP by player name |
| `screenshotMode` | string | yes | `turn`, `action`, or `phase` |
| `p1` | string | yes | player one driver type |
| `p2` | string | yes | player two driver type |

Comparator and Godot emitter tasks should preserve these field names. Add
Godot-specific data under namespaced fields rather than renaming the shared
contract.

## Recommended Extension Fields

Future artifact emitters and comparators should add these fields when the data
is available:

- `runId`
- `matchId`
- `scenarioId`
- `scenarioPath`
- `finalStateHash`
- `viewport`
- `perspective`
- `headed`
- `client`

These are not required for the current browser reference artifact, but they
should become required once both browser and Godot emitters support them.

## Screenshot Contract

Screenshots are full-page PNGs under `screenshots/`.

File naming:

```text
t{turn4}_{phase-kebab}_{shot4}_{label}.png
```

Examples:

- `screenshots/t0000_deployment_0001_start.png`
- `screenshots/t0001_combat_0017_action.png`
- `screenshots/t0000_unknown_0019_game-over.png`

Required semantic labels:

| Label | Meaning |
|---|---|
| `start` | first visible game layout |
| `state-change` | phase or turn transition |
| `action` | after an automated player action |
| `game-over` | terminal result screen |
| `failure-final` | final visible state after failure |

Godot parity artifacts should follow the same naming information even if the
exact renderer implementation differs.

## Event Stream Contract

`events.ndjson` is newline-delimited JSON. Current browser events include:

- `at`
- `type`: `state`, `action`, `result`, or `error`
- optional `actor`
- `detail`

Current `detail` is human-readable text. Comparator work should prefer or add
structured fields:

- `turn`
- `phase`
- `actor`
- `actionType`
- `checkpoint`
- `outcomeText`
- `winnerName`
- `lifepointsText`

Godot may emit these as `events.ndjson`, as checkpoint entries in
`manifest.json`, or both. The comparator must be able to read a stable ordered
progress stream without scraping screenshots.

## Known Reference Example

Current reproducible reference artifact:

```text
artifacts/playthrough-head2head/2026-06-15T21-42-30-179Z_20260615_classic_lp3/manifest.json
```

Expected terminal evidence from that run:

| Field | Value |
|---|---|
| `status` | `success` |
| `winnerName` | `Bot A` |
| `outcomeText` | `Bot A Wins!` |
| `victorySummaryText` | `LP Depletion on turn 1` |
| `lifepointsText` | `Bot A: 3 LP \| Bot B: 0 LP` |
| `turnCount` | `1` |
| `actionCount` | `17` |
| `screenshotCount` | `19` |

To find the latest local reference manifest:

```bash
rtk find artifacts/playthrough-head2head -maxdepth 2 -name manifest.json | sort | tail -1
```

To inspect it:

```bash
rtk sed -n '1,220p' artifacts/playthrough-head2head/2026-06-15T21-42-30-179Z_20260615_classic_lp3/manifest.json
```

## Godot Parity Use

Godot tasks should cite this document when implementing:

- `TASK-328.02`: Godot artifact emission
- `TASK-328.03`: reference-vs-Godot comparator
- `TASK-328.04` through `TASK-328.10`: screen parity slices
- `TASK-328.11`: complete deterministic Godot reference playthrough
- `TASK-328.17`: headed/headless full parity gate

Minimum Godot parity artifact fields:

| Browser field | Godot expectation |
|---|---|
| `status` | pass/fail from the Godot run |
| `winnerName` | derived from projected terminal state |
| `victorySummaryText` | derived from terminal outcome |
| `lifepointsText` | derived from final player LP |
| `finalLifepoints` | structured final LP |
| `turnCount` | terminal turn |
| `actionCount` | submitted or replayed actions |
| `screenshots` | Godot screenshot list |
| `events.ndjson` | Godot checkpoint/progress stream |

If Godot launches but cannot emit these fields from lobby through game-over,
the missing piece is automation infrastructure, not visual polish.
