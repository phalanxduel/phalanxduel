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
