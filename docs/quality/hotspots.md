# Quality Hotspots

Generated: 2026-11-21 — last 90 days of git history

Score = churn × 0.4 + lines × 0.3 + fan-in × 0.3 (each normalized 0–1).
This report is informational only and does not gate CI.

## Top 25 Files

| Rank | File | Score | Commits | Lines | Fan-in |
|---|---|---|---|---|---|
| 1 | `client/src/lobby.tsx` | 0.714 | 13 | 3165 | 2 |
| 2 | `client/src/game.tsx` | 0.447 | 10 | 1241 | 3 |
| 3 | `shared/src/schema.ts` | 0.396 | 6 | 2077 | 2 |
| 4 | `shared/src/index.ts` | 0.302 | 0 | 19 | 42 |
| 5 | `server/src/db/schema.ts` | 0.298 | 3 | 811 | 18 |
| 6 | `server/src/match.ts` | 0.297 | 4 | 1611 | 3 |
| 7 | `client/src/state.ts` | 0.264 | 2 | 777 | 18 |
| 8 | `server/src/app.ts` | 0.254 | 3 | 1629 | 1 |
| 9 | `server/src/db/match-repo.ts` | 0.237 | 1 | 1648 | 7 |
| 10 | `client/src/connection.ts` | 0.192 | 4 | 577 | 2 |
| 11 | `server/src/routes/matches.ts` | 0.186 | 2 | 1236 | 1 |
| 12 | `server/src/match-actor.ts` | 0.168 | 3 | 724 | 1 |
| 13 | `server/src/routes/auth.ts` | 0.165 | 1 | 1343 | 1 |
| 14 | `client/src/components/HowToPlayDialog.tsx` | 0.152 | 4 | 230 | 1 |
| 15 | `client/src/instrument.ts` | 0.147 | 4 | 180 | 1 |
| 16 | `server/src/observability/panoramic.ts` | 0.145 | 4 | 151 | 1 |
| 17 | `engine/src/index.ts` | 0.142 | 2 | 94 | 10 |
| 18 | `client/src/renderer.ts` | 0.141 | 2 | 465 | 5 |
| 19 | `engine/src/turns.ts` | 0.140 | 1 | 852 | 4 |
| 20 | `shared/src/types.ts` | 0.139 | 4 | 171 | 0 |
| 21 | `server/src/db/index.ts` | 0.138 | 0 | 26 | 19 |
| 22 | `server/src/tracing.ts` | 0.121 | 1 | 203 | 10 |
| 23 | `client/src/cards.ts` | 0.120 | 2 | 94 | 7 |
| 24 | `admin/src/client/pages/Dashboard.tsx` | 0.119 | 3 | 208 | 1 |
| 25 | `client/src/cosmetics.ts` | 0.118 | 3 | 43 | 3 |

## How to use this report

High-score files benefit most from:
- additional unit tests targeting their branch coverage gaps
- property-based test coverage of their domain invariants
- complexity refactoring if ESLint max-complexity is near the cap
- reviewer attention on incoming PRs

Run `pnpm quality:hotspots` to refresh after merging a batch of PRs.
