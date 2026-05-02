# QA Simulation Runners

The project includes automated simulation tools to validate game balance, perform regression testing, and verify protocol parity.

## `bin/qa/simulate-ui.ts`

This runner performs automated gameplay using headed or headless Playwright browsers.

### Usage
```bash
pnpm qa:playthrough:ui [OPTIONS]
```

### Key Tournament Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--mini-tournament` | Enables the ranked mini-tournament runner | `false` |
| `--tournament-players NUMBER` | Number of players to register (min: 3) | `5` |
| `--tournament-starting-lp NUMBER` | Override LP for tournament matches | `3` |
| `--headed` | Open visible browsers for matches | `headless` |

### UI Options
- `--scenario guest-pvp|auth-pvp|guest-pvb|auth-pvb`
- `--bot-opponent bot-random|bot-heuristic`
- `--window-width/height/gap`
- `--devtools`
- `--spectator`
- `--quick-start`
