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

## Operational Notes
- **Bot-vs-Bot**: When both players are `bot-*`, the runner operates in a high-speed pure-engine mode.
- **Deterministic Validation**: Use `--seed` and `--scenario` for reproducible failure analysis.
- **Logs/Artifacts**: All runs output `manifest.json` and optionally screenshots to the `--out-dir`.
