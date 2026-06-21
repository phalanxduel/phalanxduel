# QA Simulation Runners

The project includes automated simulation tools to validate game balance, perform regression testing, and verify protocol parity.

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

## `bin/qa/godot-automation.ts`

This runner performs the first Godot-local parity automation lane. It generates
or loads deterministic TypeScript engine scenario data, launches the Godot
project headlessly, verifies automation checkpoints, and writes
browser-shaped artifacts for later comparison.

### Usage

```bash
pnpm qa:godot:automation [OPTIONS]
```

### Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--scenario PATH` | Load an existing deterministic scenario file | Generated |
| `--seed NUMBER` | Scenario RNG seed when generating | `1000` |
| `--damage-mode MODE` | Scenario damage mode: `classic` or `cumulative` | `classic` |
| `--starting-lp NUMBER` | Scenario starting LP | `20` |
| `--p1 STRATEGY` | P1 bot strategy: `bot-random`, `bot-heuristic`, or `bot-mcts` | `bot-heuristic` |
| `--p2 STRATEGY` | P2 bot strategy: `bot-random`, `bot-heuristic`, or `bot-mcts` | `bot-heuristic` |
| `--godot-bin PATH` | Godot binary override | `GODOT_BIN` or `godot` |
| `--out-dir PATH` | Artifact output root | `artifacts/godot-automation` |
| `--keep-temp` | Retain temporary Godot `HOME` | `false` |

### Outputs

Each run writes:

- `manifest.json`
- `events.ndjson`
- `screenshots/`
- `input.json`
- `result.json`
- `godot.log`

The manifest preserves the browser reference result fields from
`docs/v2/reference-playthrough-artifact-contract.md` and adds Godot checkpoint
history. The current headless harness does not yet populate visual screenshots
unless replay states or scene captures are supplied by later Godot parity
slices.

## `bin/qa/godot-playthrough.ts`

This runner launches the Godot client playback scene, writes browser-shaped
playthrough artifacts, and can attach to a live spectator/watch session when a
match URL and ID are supplied.

### Usage

```bash
pnpm qa:godot:playthrough [OPTIONS]
```

### Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--watch-url URL` | Live spectator WebSocket URL | Demo replay |
| `--match-id ID` | Match ID to watch; required with `--watch-url` | Demo replay |
| `--replay-speed NUMBER` | Demo replay speed | `1.5` |
| `--godot-bin PATH` | Godot binary override | `GODOT_BIN` or `godot` |
| `--artifact-dir PATH` | Exact artifact directory | Generated under `--out-dir` |
| `--out-dir PATH` | Artifact output root | `artifacts/godot-playthrough` |
| `--headless` | Run without opening a window | `false` |
| `--require-screenshots` | Fail when screenshot artifacts are missing | `false` |
| `--keep-temp` | Retain temporary Godot `HOME` | `false` |

Headless Godot runs use the dummy display renderer, so viewport screenshots are
not available there. A headless run with `--require-screenshots` exits cleanly
with a failure manifest instead of hanging; use a headed run for visual
screenshot evidence.

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

## `bin/qa/compare-snapshots.ts`

This tool compares playthrough artifacts generated by the TypeScript browser runner against the Godot client runner to prove functional and visual parity.

### Usage

```bash
pnpm qa:godot:compare-snapshots [OPTIONS]
```

### Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `-r, --ref PATH` | Exact path to the reference artifact directory | None (Required) |
| `-g, --godot PATH` | Exact path to the Godot artifact directory | None (Required) |
| `-p, --partial` | Partial mode. Skips missing screenshot checks (useful for headless runs) | `false` |

### Parity Gate Pipeline

To prove parity between the clients (e.g. for LP3 or LP20 matches):

```bash
# 1. Generate the TypeScript browser reference (e.g. LP3)
pnpm qa:playthrough --starting-lp 3 --p1 bot-heuristic --p2 bot-heuristic --out-dir artifacts/playthrough-head2head
# Identify the generated reference directory path <REF_DIR>

# 2. Run the Godot client playback (Headless) against the reference
pnpm qa:godot:playthrough --ref-dir <REF_DIR> --out-dir artifacts/godot-playthrough-lp3 --headless
# Identify the generated Godot directory path <GODOT_DIR>

# 3. Compare the playthrough manifests (Partial mode for headless)
pnpm qa:godot:compare-snapshots -r <REF_DIR> -g <GODOT_DIR> -p
```

For strict visual parity (headed mode), omit `--headless` and `-p`:

```bash
pnpm qa:godot:playthrough --ref-dir <REF_DIR> --out-dir artifacts/godot-playthrough-lp3
pnpm qa:godot:compare-snapshots -r <REF_DIR> -g <GODOT_DIR>
```
