---
name: production-verification
description: Execute and analyze head-to-head automated PvP matches against the production environment. Use when validating production game stability, confirming playthrough automation, or extracting tactical event insights (e.g. causes for combat outcomes) from live matches.
---

# Production Verification

## Quick start

Run a single head-to-head game against production using heuristic bots:

```bash
APP_ENV=production pnpm exec tsx bin/qa/api-playthrough.ts --base-url wss://phalanxduel-production.fly.dev/ws --strategy heuristic --batch 1
```

## Workflows

### 1. Execute Playthrough
- Always use `APP_ENV=production` to enable non-fatal state drift handling.
- Production randomized seeds mean local engine hashes will drift; this is normal.
- The command generates a timestamped directory in `artifacts/playthrough-api/`.

### 2. Evaluate Event Insights
To extract tactical "why" information from the game outcome, use the built-in analysis script:

```bash
tsx .agents/skills/production-verification/scripts/analyze-production-game.ts
```

This script automatically:
1. Locates the latest artifact in `artifacts/playthrough-api/`.
2. Inspects the final game state.
3. Prints a summarized timeline of tactical causes:
   - `HEART SHIELD`: Damage was blocked by a Heart card.
   - `REINFORCEMENT`: A card was buffed/healed.
   - `COLUMN_DESTRUCTION`: A front-line card was removed.

## Troubleshooting
- **Timeout (30s)**: If connection drops, verify Fly.io status or check if `MAX_WS_PER_IP` (currently 100) is being exceeded by concurrent runs.
- **Unauthorized (401)**: Automation uses anonymous connections. If 401 occurs on `/api/auth/me`, ensure the browser-based `simulate-headless.ts` has valid credentials or `APP_ENV=production` is set to handle public paths.
