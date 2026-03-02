# Configurable Grid, AI Bot, and Advanced Match Creation — Design

**Date:** 2026-03-02
**Status:** Approved
**Depends on:** P1-001 (renderer decomposition), P1-002 (client tests)

## Overview

This design covers four interconnected deliverables:

1. **game.ts TDD decomposition** — reduce renderBattlefield (44) and renderGame
   (43) complexity below 20
2. **Dynamic grid rendering** — honor `params.rows`/`params.columns` end-to-end
   (engine + client), with simple combat rules (front row attacks, auto-promote
   reserves)
3. **Server defaults endpoint + advanced match creation screen** — expose all
   ~15 MatchParameters via `GET /api/defaults` and a collapsible lobby form
4. **AI bot (P3-001)** — server-side bot in `engine/src/bot.ts` with random and
   heuristic strategies, deterministic given a seed

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Grid configurability depth | Engine + client, simple combat model | Front-row-only attacks extend naturally to N rows |
| Combat promotion | Auto-promote (cleanup phase) | Predictable, no new player decisions |
| Bot runtime | Server-side only (engine/) | Simplest architecture, no client changes beyond lobby option |
| Config source of truth | Server endpoint `GET /api/defaults` | Single source of truth, reflects runtime config |
| Advanced screen UX | Collapsible "Advanced" section in lobby | Low friction for casual play, full power when needed |
| Work phasing | Separate commits, one branch | Incremental review, clean history |
| Ordering | Bottom-up (Approach A) | Each step builds on prior work |

## Section 1: game.ts TDD Decomposition

### Goal

Reduce `renderBattlefield` from complexity 44 to ~18 and `renderGame` from 43
to ~16. Lower ESLint complexity ratchet from 45 to ~20.

### Extractions from renderBattlefield (44 → ~18)

| Helper | Responsibility | Complexity removed |
|--------|---------------|-------------------|
| `applySuitAura(el, suit)` | Map suit → CSS class (deduplicated from 3 call sites) | -4 per site |
| `createBattlefieldCell(gs, pos, bCard, state, isOpponent)` | Create and style one grid cell — aura, HP, rank/pip, face marker | -10 |
| `attachCellInteraction(cell, gs, state, pos, bCard, isOpponent)` | Wire click handlers: attack target, attacker select, deploy, reinforce | -12 |
| `shouldShowMultiplier(gs, bCard, isOpponent)` | Pure predicate for weapon multiplier tag | -2 |

### Extractions from renderGame (43 → ~16)

| Helper | Responsibility | Complexity removed |
|--------|---------------|-------------------|
| `getPhaseLabel(gs)` | Lookup table: phase → display string | -2 |
| `getTurnIndicatorText(gs, state, myIdx)` | "Your turn" / "Opponent's turn" / spectator variant | -4 |
| `renderInfoBar(gs, state, myIdx)` | Info bar: phase label, turn indicator, action buttons | -12 |
| `getActionButtons(gs, state, myIdx)` | Button descriptors based on phase + turn state | -8 |

### File placement

- `applySuitAura` → `client/src/card-utils.ts` (shared across game.ts,
  renderer.ts)
- All other helpers → module-private in `client/src/game.ts`

### TDD approach

1. Write characterization tests for current behavior
2. Extract helper — existing tests still pass
3. Add targeted unit tests for extracted helper
4. Repeat

## Section 2: Dynamic Grid Rendering

### Goal

Honor `params.rows` and `params.columns` from GameState throughout engine and
client. Combat rule: only front row (row 0) can initiate attacks. Deeper rows
are reserves that auto-promote forward during cleanup.

### Engine changes

**`engine/src/state.ts`:**

- `emptyBattlefield(rows, columns)` → returns `Array(rows * columns).fill(null)`
- Grid index: `gridIndex = row * columns + col`
- `createInitialState()` reads rows/columns from incoming params

**`engine/src/combat.ts`:**

- `isValidTarget()` — parameterize by `params.columns`
- `collapseColumn()` — auto-promote: when row 0 card destroyed, row 1 slides
  to row 0, row 2 slides to row 1, etc.
- Attack validation: `row === 0` only (same as today, extends to N rows)

### Client changes

**`client/src/game.ts`:**

- `renderBattlefield()` loops `params.rows × params.columns` instead of
  hardcoded `2 × 4`
- CSS grid: `grid-template-columns: repeat(${cols}, 1fr)` and
  `grid-template-rows: repeat(${rows}, 1fr)`
- Column-based targeting unchanged (attacker col X → defender col X)

### Shared changes

**`shared/src/schema.ts`:**

- Export `DEFAULT_MATCH_PARAMS` constant with current 2×4 defaults
- Existing Zod validation already constrains rows/columns/initialDraw

### What doesn't change

- Card deck (52 cards), suit mechanics, face cards, aces
- Phase lifecycle (7 phases), action types
- State hashing, replay, event sourcing

## Section 3: Server Defaults Endpoint + Advanced Match Screen

### Server: `GET /api/defaults`

Returns the server's current default MatchParameters as JSON, plus `_meta`
with:

- Config source hint (file path)
- Which values are overridable via env vars
- Schema constraints (min/max per field)

```json
{
  "rows": 2, "columns": 4, "maxHandSize": 4, "initialDraw": 12,
  "modeClassicAces": true, "modeClassicFaceCards": true,
  "modeDamagePersistence": "classic", "modeClassicDeployment": true,
  "initiative": { "deployFirst": "P2", "attackFirst": "P1" },
  "modePassRules": { "maxConsecutivePasses": 3, "maxTotalPassesPerPlayer": 5 },
  "startingLifepoints": 20,
  "_meta": {
    "configSource": "engine/src/state.ts → createInitialState()",
    "envOverrides": ["PHALANX_STARTING_LP", "PHALANX_DAMAGE_MODE"],
    "constraints": {
      "rows": { "min": 1, "max": 12 },
      "columns": { "min": 1, "max": 4 },
      "maxHandSize": { "min": 0, "max": "columns" },
      "totalSlots": "rows * columns <= 48"
    }
  }
}
```

### Server: Extended createMatch message

Currently accepts `gameOptions: { damageMode, startingLifepoints }`. Extended
to accept optional `matchParams: Partial<MatchParameters>`. Server validates
with Zod and merges with defaults for any omitted fields.

### Client: Advanced Match Creation

Accessed via collapsible "Advanced Options" section in the existing lobby.

**Form sections:**

| Section | Fields |
|---------|--------|
| Grid | rows (1-12), columns (1-4) — live preview of grid layout |
| Hand | maxHandSize, initialDraw (auto-calculated but overridable) |
| Rules | ace rules, face cards, damage persistence, deployment toggle |
| Initiative | deploy first (P1/P2), attack first (P1/P2) |
| Pass rules | consecutive limit, total limit |
| Game | starting LP, damage mode |
| Opponent | Human / Bot-Random / Bot-Heuristic |

Each field shows server default as placeholder. Client-side Zod validation.
Form pre-populated from `GET /api/defaults` response.

## Section 4: AI Bot (P3-001)

### Architecture

**`engine/src/bot.ts`** — Pure function, no side effects:

```typescript
function computeBotAction(
  gs: GameState,
  playerIndex: 0 | 1,
  config: BotConfig,
): Action
```

Deterministic given a seed. Uses the same action types as human players.

### BotConfig

```typescript
interface BotConfig {
  strategy: 'random' | 'heuristic';
  seed?: number;
  thinkDelayMs?: number;    // Server-side artificial delay (200-1000ms)
  aggressiveness?: number;  // 0-1, heuristic tuning
}
```

### Strategies

**Random (`bot-random`):** Pick valid action uniformly at random. Deployment:
random card → random empty cell. Attack: random front-row card → same-column
target (or pass if none). Reinforcement: random eligible card or skip.

**Heuristic (`bot-heuristic`):** Score each valid action, pick highest:

- Prefer high-value attackers against low-HP defenders
- Prefer shields (diamonds/hearts) protecting valuable back-row cards
- Prefer weapons (spades/clubs) in front row for 2x multiplier
- Avoid passing unless no beneficial attacks
- Reinforce with highest-value eligible card

### Server integration (`server/src/match.ts`)

- `createMatch` accepts `opponent: 'human' | 'bot-random' | 'bot-heuristic'`
- Bot opponent → virtual player (no WebSocket connection)
- After human acts, server computes bot response after configurable delay
- Bot actions go through `applyAction()` — fully validated, logged, hashed
- Bot determinism: uses match rngSeed for reproducible replays

## Ordering (Approach A — Bottom-Up)

```text
Commit 1: game.ts TDD decomposition (renderBattlefield + renderGame)
  ↓
Commit 2: Dynamic grid (engine parameterization + client rendering)
  ↓
Commit 3: DEFAULT_MATCH_PARAMS export + GET /api/defaults endpoint
  ↓
Commit 4: Advanced match creation screen (collapsible lobby section)
  ↓
Commit 5: AI bot engine logic (random + heuristic strategies)
  ↓
Commit 6: Bot server integration + lobby "vs Bot" option
```

All commits on one feature branch, separately reviewable.

## Touch Points

| Package | Files modified | Files created |
|---------|---------------|---------------|
| client | game.ts, lobby.ts, renderer.ts, state.ts | card-utils.ts |
| engine | state.ts, combat.ts, deck.ts | bot.ts |
| server | app.ts, match.ts | — |
| shared | schema.ts | — |

## Constraints

- Must not increase initial bundle by more than ~15KB gzipped
- Must not break Sentry/OpenTelemetry integration
- Bot must use same `applyAction()` path (no shortcuts)
- Bot must be deterministic given a seed (replay integrity)
- Card deck stays at 52 cards regardless of grid size
- `rows × columns ≤ 48`, `maxHandSize ≤ columns`
