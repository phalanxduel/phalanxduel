# QA Simulation Runners

The project includes automated simulation tools to validate game balance, perform regression testing, and verify active browser-client behavior.

## `bin/qa/simulate-headless.ts`

This runner performs automated game simulations using Playwright (or pure-engine logic for bot-vs-bot runs).

### Usage
```bash
pnpm qa:playthrough [OPTIONS]
```

### Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--base-url URL` | Target environment URL | `http://127.0.0.1:5173` |
| `--seed NUMBER` | RNG seed for deterministic simulation | Random |
| `--batch NUMBER` | Number of games to run sequentially | 1 |
| `--damage-mode MODE` | Single damage mode: `classic` or `cumulative` | `classic` |
| `--damage-modes LIST` | Comma-separated list for permutation testing | `classic` |
| `--starting-lp NUMBER` | Set starting LP for all runs | 20 |
| `--starting-lps LIST` | Comma-separated list for permutation testing | `20` |
| `--max-turns NUMBER` | Max turns before stall detection | 140 |
| `--screenshot-mode` | Capture mode: `turn`, `action`, or `phase` | `turn` |
| `--out-dir PATH` | Log/screenshot output directory | `artifacts/playthrough` |
| `--p1` | P1 Type: `human`, `bot-random`, `bot-heuristic` | `human` |
| `--p2` | P2 Type: `human`, `bot-random`, `bot-heuristic` | `human` |
| `--quick-start` | Pre-deploy cards; skip `DeploymentPhase` | Auto-enabled for bot-vs-bot |
| `--scenario PATH` | Path to `scenario.json` to validate | N/A |
| `--headed` | Run browsers in visible mode | `headless` |

## `bin/qa/simulate-ui.ts`

This runner performs automated gameplay using headed or headless Playwright browsers, primarily for UI integration and tournament flow verification.

### Usage
```bash
pnpm qa:playthrough:ui [OPTIONS]
```

### Key Tournament Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--mini-tournament` | Enables the ranked mini-tournament runner | `false` |
| `--seed NUMBER` | Seeds run IDs, pairing, match options, and bot action choices | Random |
| `--tournament-players NUMBER` | Number of players to register (min: 3) | `5` |
| `--tournament-starting-lp NUMBER` | Override LP for tournament matches | `3` |
| `--headed` | Open visible browsers for matches | `headless` |

### UI Options
- `--scenario guest-pvp|auth-pvp|guest-pvb|auth-pvb`
- `--bot-opponent bot-random|bot-heuristic`
- `--window-width` / `--window-height` / `--window-gap`
- `--devtools` / `--no-devtools`
- `--spectator` / `--no-spectator`
- `--quick-start`
- `--api-base-url URL`
- `--max-games NUMBER`
- `--stall-threshold NUMBER`
- `--forfeit-chance NUMBER`
- `--slow-mo-ms NUMBER`
- `--internal-token TOKEN`

## Operational Notes

- **Bot-vs-Bot**: When both players are `bot-*`, the runner operates in a high-speed pure-engine mode.
- **Deterministic Validation**: Use `--seed` and `--scenario` for reproducible failure analysis.
- **Logs/Artifacts**: All runs output `manifest.json` and optionally screenshots to the `--out-dir`.
  Browser runs include structured result fields (`winnerName`, `victorySummaryText`,
  `lifepointsText`, `finalLifepoints`) plus relative screenshot paths under
  `screenshots`, so a completed run can be summarized without scraping images.

## Canonical trajectories

Generate a trajectory from a deterministic scenario and verify it offline:

```bash
pnpm qa:trajectory:record -- --scenario <scenario.json> --out <trajectory.json>
pnpm qa:trajectory:verify -- --trajectory <trajectory.json>
pnpm qa:trajectory:matrix
```

The verifier replays the exact action payloads through the engine and fails on
state-hash, observer-projection, phase/turn, event, terminal-state, or schema
drift. The trajectory is the input that network adapters should consume; it
does not permit a runner to silently choose a replacement bot strategy.

The API/WebSocket playthrough accepts the same trajectory with `--scenario`;
when a trajectory is supplied it preserves its action timestamps and compares
each server transaction hash with the recorded checkpoint:

```bash
pnpm qa:api:run -- --scenario <trajectory.json> --base-url ws://127.0.0.1:3001/ws
pnpm qa:api:run -- --transport rest --scenario <trajectory.json> --base-url ws://127.0.0.1:3001/ws
```

REST mode uses WebSocket only for match bootstrap and observer updates; action
submission goes through the HTTP `/api/matches/:id/action` route. Its evidence
sidecar records `transport: http`.

`qa:trajectory:matrix` validates the built-in deterministic fixture set. It
covers both damage modes, manual deployment, defensive/aggressive/random quick
deployment, mixed deployment policies, and explicit pass/forfeit terminals.
The matrix is an engine contract check; use the recorded trajectory commands
above when proving a fixture across live adapters.

Trajectory `match.specVersion` is optional for v1 trajectories so historical
rules versions can be replayed without changing current player-selected quick
deployment. The matrix includes a `1.0` compatibility fixture; compatibility
trajectories are verified through the pure replay path and remain isolated from
the live adapter bootstrap contract.

## Versioned run evidence

All supported runner manifests can be normalized into the shared
`phalanx-duel.run-evidence` v1 contract. The normalized record carries runner
and release identity, scenario inputs, adapter/transport, QA and match
correlation, ordered actions/events, phases, integrity counts and replay
reference, assertions, artifact references, outcome, and an explicit
redaction policy. Hidden state, private player data, credentials, and absolute
paths are rejected by the validator.

```bash
pnpm qa:evidence:verify -- --run <capture-directory>
```

This writes `run-evidence.json` beside the historical `manifest.json`. The
validator accepts legacy engine/API/browser/SwiftUI-shaped manifests at this
boundary, but consumers should use the normalized record. A successful run
cannot contain skipped or failed assertions, and action/event counts must
match the ordered records.

The producers also emit the sidecar directly: headless browser and bot-vs-bot
runs write `run-evidence.json` in each capture directory, API batches write
`game-N.run-evidence.json` beside each `game-N.json`, and SwiftUI proof export
writes it beside the extracted proof manifest. Historical manifests remain
available for backwards-compatible readers.

## `bin/qa/swiftui-proof.sh`

One-command proof that the real native SwiftUI client (sibling `game-swiftui`
checkout) can play a complete automated bot match through user-visible controls
(TASK-360.01). The coordinator starts a wrapper-guarded local server on a
uniquely owned port, runs only the `AutomationTests/testCompleteBotMatch`
XCUITest via the `PhalanxDuelClientUIProof` scheme, extracts the retained
evidence from the `.xcresult` bundle, validates the run manifest, and tears
down only the processes it started.

Requires a macOS host with Xcode; the app launches visibly (XCUITest is
inherently headed).

### Usage
```bash
pnpm qa:swiftui:proof                  # fast proof run
pnpm qa:swiftui:proof:watch            # heads-up mode for human observation
bash bin/qa/swiftui-proof.sh [OPTIONS]
```

### Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--watch` | Heads-up mode: keep the app frontmost, pace actions, hold game over | off |
| `--lp N` | Starting lifepoints | `20` |
| `--seed N` | Deterministic match seed | `2026072401` |
| `--port N` | Server port (must be free; the proof owns it) | first free from `3121` |
| `--timeout N` | Proof timeout in seconds | `300` |
| `--action-delay-ms N` | Per-action pacing override | `0` (`500` with `--watch`) |
| `--final-hold N` | Seconds to hold the game-over screen | `0` (`20` with `--watch`) |
| `--run-dir PATH` | Artifact directory | `/private/tmp/phalanx-swiftui-proof-<timestamp>` |
| `--swiftui-dir PATH` | `game-swiftui` checkout (also `$PHALANX_SWIFTUI_DIR`) | `../game-swiftui` |

### Artifact contract

Each run directory contains:

- `config.json` — the exact `ProofConfiguration` handed to the XCUITest driver.
- `server.log`, `xcodebuild.log`, `native-debug.log` — server, Xcode, and
  in-app diagnostics (failure runs keep these for locating the blocked phase).
- `proof.xcresult` — full Xcode result bundle, including the automatic screen
  recording of the match (open in Xcode to watch).
- `manifest.json` — structured run manifest (match ID, players, winner,
  final lifepoints, victory type, turn/action counts, native action count,
  seed, timestamps), extracted from the xcresult attachments.
- `screenshots/*.png` — start, first deployment, first attack, and game over.

The XCUITest runner cannot write into the run directory itself (sandboxed
writes fail silently), so `bin/qa/verify-swiftui-proof.ts` extracts the
manifest and screenshots from the xcresult attachments via
`xcrun xcresulttool export attachments` and then validates the manifest:
status `success`, a real match ID, two named players, a consistent winner,
at least one native-driven deployment and attack,
`actionCount >= nativeActionCount > 0`, and all referenced screenshots present.
The command exits non-zero if the match did not complete or the evidence is
incomplete.

Note: `bot-random`'s action selection is not covered by `--seed` (only card
shuffling is), so match length and outcome vary between runs, including
occasional draws (`repetitionDraw`, `noProgressDraw`, `turnLimitDraw`). A draw
is a legitimate complete-match terminal state and passes validation with a
null `winnerIndex`/`winnerName`; only genuinely inconsistent evidence (e.g. a
decisive `winnerName` that matches neither rendered player) fails the run.

## `bin/qa/ladder-season.ts`

This runner performs an offline deterministic ladder exercise. It creates a
synthetic player population with latent skill, plays a fixed-seed season, applies
the server Elo constants, and writes ranking-depth evidence artifacts.

### Usage

```bash
pnpm qa:ladder:simulate [OPTIONS]
pnpm qa:ladder:verify [OPTIONS]
```

### Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--seed NUMBER` | RNG seed for deterministic season generation | `20260521` |
| `--players NUMBER` | Synthetic player count | `24` |
| `--matches NUMBER` | Season match count | `240` |
| `--top-n NUMBER` | Top-N overlap window | Top decile, minimum `3` |
| `--out-dir PATH` | Report output directory | `artifacts/ladder` |
| `--report-name NAME` | JSON/Markdown report basename | `ladder-season` |
| `--shadow-k-factors LIST` | Comma-separated K-factors for same-season policy comparison | N/A |
| `--verify` | Fail if sanity thresholds are missed | `false` |
| `--min-correlation NUMBER` | Spearman threshold for `--verify` | `0.72` |
| `--min-top-n-overlap NUMBER` | Top-N overlap threshold for `--verify` | `0.5` |

### Outputs

- `artifacts/ladder/ladder-season.json`
- `artifacts/ladder/ladder-season.md`

Use this runner before changing ranking formulas or eligibility policy. It is a
fast model-behavior exercise, not a product API or browser test.
