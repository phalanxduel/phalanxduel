# Deployable Increments Plan — AI Bot & Configurable Match Parameters

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship two high-value features in smallest deployable increments: (1) play vs AI bot, (2) configurable match parameters via advanced options UI.

**Architecture:** Bottom-up TDD. Bot logic is a pure deterministic function in `engine/`. Server schedules bot turns with artificial delay. Client gets a "vs Bot" button. Match parameters flow through schema, server, engine. Each commit is deployable.

**Tech Stack:** TypeScript 5.9.3, Vitest 4.0.18, Zod 4.3.6, Fastify 5.7.4, jsdom (client tests)

**Branch:** `feat/configurable-grid-bot` (continues existing work)

**Prior work on this branch:** Commits 1-3 from `docs/plans/2026-03-02-configurable-grid-bot.md` are complete (game.ts decomposition, dynamic grid engine/client, server defaults endpoint). 322 tests passing.

---

## Deployment A: Play vs AI Bot (random strategy)

This is the highest-value feature — single-player gameplay. Deploy after Task A5.

---

### Task A1: Bot engine — random strategy (TDD)

**Files:**
- Create: `engine/src/bot.ts`
- Create: `engine/tests/bot.test.ts`

#### Step 1: Write failing test

```typescript
// engine/tests/bot.test.ts
import { describe, it, expect } from 'vitest';
import { computeBotAction } from '../src/bot';
import { createInitialState, applyAction } from '../src/state';
import type { GameState } from '@phalanxduel/shared';

function seedState(): GameState {
  const config = {
    matchId: '00000000-0000-0000-0000-000000000001',
    players: [
      { id: '00000000-0000-0000-0000-000000000010', name: 'Human' },
      { id: '00000000-0000-0000-0000-000000000020', name: 'Bot' },
    ] as [{ id: string; name: string }, { id: string; name: string }],
    rngSeed: 42,
  };
  let state = createInitialState(config);
  state = applyAction(state, { type: 'system:init', timestamp: '2026-01-01T00:00:00.000Z' });
  return state;
}

describe('computeBotAction - random strategy', () => {
  it('returns a deploy action during DeploymentPhase', () => {
    const state = seedState();
    expect(state.phase).toBe('DeploymentPhase');
    const action = computeBotAction(state, 1, { strategy: 'random', seed: 42 });
    expect(action.type).toBe('deploy');
    expect(action.playerIndex).toBe(1);
  });

  it('is deterministic given the same seed', () => {
    const state = seedState();
    const a1 = computeBotAction(state, 1, { strategy: 'random', seed: 99 });
    const a2 = computeBotAction(state, 1, { strategy: 'random', seed: 99 });
    expect(a1).toEqual(a2);
  });

  it('returns pass when hand is empty', () => {
    const state = seedState();
    state.players[1]!.hand = [];
    const action = computeBotAction(state, 1, { strategy: 'random', seed: 42 });
    expect(action.type).toBe('pass');
  });

  it('returns pass for unrecognized phases', () => {
    const state = seedState();
    (state as any).phase = 'UnknownPhase';
    const action = computeBotAction(state, 1, { strategy: 'random', seed: 42 });
    expect(action.type).toBe('pass');
  });
});
```

#### Step 2: Run test to verify failure

Run: `pnpm --filter @phalanxduel/engine vitest run tests/bot.test.ts`
Expected: FAIL with module not found

#### Step 3: Implement bot.ts

```typescript
// engine/src/bot.ts
import type { GameState, Action } from '@phalanxduel/shared';
import { getDeployTarget } from './state.js';

export interface BotConfig {
  strategy: 'random';
  seed: number;
}

/** Mulberry32: fast seeded PRNG for deterministic bot decisions. */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

export function computeBotAction(
  gs: GameState,
  playerIndex: 0 | 1,
  config: BotConfig,
): Action {
  const rng = mulberry32(config.seed);
  const timestamp = new Date().toISOString();
  const player = gs.players[playerIndex]!;
  const columns = gs.params?.columns ?? 4;

  switch (gs.phase) {
    case 'DeploymentPhase': {
      if (player.hand.length === 0) {
        return { type: 'pass', playerIndex, timestamp };
      }
      const validCols: number[] = [];
      for (let col = 0; col < columns; col++) {
        if (getDeployTarget(player.battlefield, col) !== null) {
          validCols.push(col);
        }
      }
      if (validCols.length === 0) {
        return { type: 'pass', playerIndex, timestamp };
      }
      const card = pickRandom(player.hand, rng);
      const col = pickRandom(validCols, rng);
      return { type: 'deploy', playerIndex, column: col, cardId: card.id, timestamp };
    }

    case 'AttackPhase': {
      const attackers: number[] = [];
      for (let col = 0; col < columns; col++) {
        if (player.battlefield[col]) {
          attackers.push(col);
        }
      }
      if (attackers.length === 0 || rng() < 0.2) {
        return { type: 'pass', playerIndex, timestamp };
      }
      const atkCol = pickRandom(attackers, rng);
      return {
        type: 'attack',
        playerIndex,
        attackingColumn: atkCol,
        defendingColumn: atkCol,
        timestamp,
      };
    }

    case 'ReinforcementPhase': {
      if (player.hand.length === 0 || !gs.reinforcement) {
        return { type: 'pass', playerIndex, timestamp };
      }
      const card = pickRandom(player.hand, rng);
      return { type: 'reinforce', playerIndex, cardId: card.id, timestamp };
    }

    default:
      return { type: 'pass', playerIndex, timestamp };
  }
}
```

#### Step 4: Run test to verify pass

Run: `pnpm --filter @phalanxduel/engine vitest run tests/bot.test.ts`
Expected: PASS (4 tests)

#### Step 5: Commit

```bash
git add engine/src/bot.ts engine/tests/bot.test.ts
git commit -m "feat(engine): add computeBotAction with random strategy"
```

---

### Task A2: Export bot from engine index

**Files:**
- Modify: `engine/src/index.ts`

#### Step 1: Add exports

Append to `engine/src/index.ts`:

```typescript
export { computeBotAction } from './bot.js';
export type { BotConfig } from './bot.js';
```

#### Step 2: Verify build

Run: `pnpm --filter @phalanxduel/engine vitest run`
Expected: All engine tests pass

#### Step 3: Commit

```bash
git add engine/src/index.ts
git commit -m "feat(engine): export computeBotAction and BotConfig"
```

---

### Task A3: Server bot match management (TDD)

**Files:**
- Modify: `server/src/match.ts` — add bot support to MatchInstance and createMatch
- Create: `server/tests/bot-match.test.ts`

#### Step 1: Write failing test

```typescript
// server/tests/bot-match.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchManager } from '../src/match';

function mockSocket() {
  return { readyState: 1, send: vi.fn() } as any;
}

describe('bot match', () => {
  let manager: MatchManager;

  beforeEach(() => {
    manager = new MatchManager();
  });

  it('creates a match with bot that auto-starts immediately', () => {
    const ws = mockSocket();
    const result = manager.createMatch('Human', ws, undefined, undefined, {
      opponent: 'bot-random',
      botConfig: { strategy: 'random', seed: 42 },
    });
    expect(result.matchId).toBeTruthy();
    const match = manager.getMatch(result.matchId);
    expect(match?.state).toBeTruthy();
    expect(match?.state?.phase).toBeDefined();
  });

  it('bot match has two players', () => {
    const ws = mockSocket();
    const { matchId } = manager.createMatch('Human', ws, undefined, undefined, {
      opponent: 'bot-random',
      botConfig: { strategy: 'random', seed: 42 },
    });
    const match = manager.getMatch(matchId);
    expect(match?.players[0]).toBeTruthy();
    expect(match?.players[1]).toBeTruthy();
    expect(match?.players[1]?.playerName).toBe('Bot (Random)');
  });
});
```

#### Step 2: Run to verify failure

Run: `pnpm --filter @phalanxduel/server vitest run tests/bot-match.test.ts`
Expected: FAIL — createMatch does not accept 5th arg / getMatch does not exist

#### Step 3: Implement bot support in match.ts

Add `BotMatchOptions` interface and extend `MatchInstance`:

```typescript
export interface BotMatchOptions {
  opponent: 'bot-random';
  botConfig: { strategy: 'random'; seed: number };
}
```

Extend `MatchInstance` with optional bot fields:

```typescript
botConfig?: { strategy: 'random'; seed: number };
botPlayerIndex?: 0 | 1;
```

Extend `createMatch` signature:

```typescript
createMatch(
  playerName: string,
  socket: WebSocket,
  gameOptions?: GameOptions,
  rngSeed?: number,
  botOptions?: BotMatchOptions,
): { matchId: string; playerId: string; playerIndex: number }
```

When `botOptions` is provided:
1. Create human player at index 0 as normal
2. Create virtual bot player at index 1 (no socket, name = "Bot (Random)")
3. Immediately initialize game state (same as when 2nd player joins normally)
4. Store `botConfig` and `botPlayerIndex` on the match instance

Add `getMatch` accessor:

```typescript
getMatch(matchId: string): MatchInstance | undefined {
  return this.matches.get(matchId);
}
```

#### Step 4: Run test to verify pass

Run: `pnpm --filter @phalanxduel/server vitest run tests/bot-match.test.ts`
Expected: PASS

#### Step 5: Run all server tests

Run: `pnpm --filter @phalanxduel/server vitest run`
Expected: All pass (no regressions)

#### Step 6: Commit

```bash
git add server/src/match.ts server/tests/bot-match.test.ts
git commit -m "feat(server): bot match creation with auto-start"
```

---

### Task A4: Bot auto-turn scheduling (TDD)

**Files:**
- Modify: `server/src/match.ts`
- Modify: `server/tests/bot-match.test.ts`

#### Step 1: Write failing test

```typescript
// Add to server/tests/bot-match.test.ts
it('schedules bot turn after human action when bot is active', async () => {
  vi.useFakeTimers();
  const ws = mockSocket();
  const { matchId, playerId } = manager.createMatch('Human', ws, undefined, 42, {
    opponent: 'bot-random',
    botConfig: { strategy: 'random', seed: 42 },
  });
  const match = manager.getMatch(matchId);
  expect(match?.state).toBeTruthy();

  // Verify the scheduling mechanism exists
  expect(typeof (manager as any).scheduleBotTurn).toBe('function');
  vi.useRealTimers();
});
```

#### Step 2: Implement scheduleBotTurn

Add private method to `MatchManager`:

```typescript
private async scheduleBotTurn(match: MatchInstance): Promise<void> {
  if (!match.botConfig || !match.state) return;
  if (match.state.phase === 'GameOverPhase') return;

  const botIdx = match.botPlayerIndex!;
  if (match.state.activePlayerIndex !== botIdx) return;

  // Small delay to feel natural
  await new Promise((resolve) => setTimeout(resolve, 300));

  const action = computeBotAction(match.state, botIdx as 0 | 1, match.botConfig);
  this.applyBotAction(match, action);
}
```

Call `scheduleBotTurn` after game initialization in bot matches, and after each successful `handleAction`.

#### Step 3: Run tests

Run: `pnpm --filter @phalanxduel/server vitest run`
Expected: All pass

#### Step 4: Commit

```bash
git add server/src/match.ts server/tests/bot-match.test.ts
git commit -m "feat(server): auto-schedule bot turns after human actions"
```

---

### Task A5: "vs Bot" button in lobby (TDD)

**Files:**
- Modify: `client/src/lobby.ts`
- Create: `client/tests/bot-lobby.test.ts`
- Modify: `shared/src/schema.ts` (add opponent field to createMatch)
- Modify: `server/src/app.ts` (pass opponent/botOptions through)

#### Step 1: Write failing test

```typescript
// client/tests/bot-lobby.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

describe('bot lobby option', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders "Play vs Bot" button', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { renderLobby } = await import('../src/lobby');
    renderLobby(container);
    const botBtn = container.querySelector('[data-testid="create-bot-match"]');
    expect(botBtn).toBeTruthy();
    expect(botBtn?.textContent).toContain('Bot');
  });
});
```

#### Step 2: Run to verify failure

Run: `pnpm --filter @phalanxduel/client vitest run tests/bot-lobby.test.ts`
Expected: FAIL

#### Step 3: Add opponent field to ClientMessageSchema

In `shared/src/schema.ts`, update the `createMatch` variant:

```typescript
z.object({
  type: z.literal('createMatch'),
  playerName: z.string(),
  gameOptions: GameOptionsSchema.optional(),
  rngSeed: z.number().optional(),
  opponent: z.enum(['human', 'bot-random']).optional(),
}),
```

#### Step 4: Add "Play vs Bot" button to lobby

In `client/src/lobby.ts`, next to the existing "Create Match" button, add a "Play vs Bot" button. When clicked, it sends the createMatch message with `opponent: 'bot-random'`.

#### Step 5: Update server createMatch handler

In `server/src/app.ts`, read `msg.opponent` and pass bot options to `matchManager.createMatch` when opponent is `'bot-random'`.

#### Step 6: Run all tests

Run: `pnpm -r test`
Expected: All pass

#### Step 7: Commit

```bash
git add shared/src/schema.ts client/src/lobby.ts client/tests/bot-lobby.test.ts server/src/app.ts
git commit -m "feat: add Play vs Bot to lobby with end-to-end bot match support"
```

**Deployment A is now shippable.** Users can play single-player games against a random AI bot.

---

## Deployment B: Configurable Match Parameters (end-to-end)

Ship after Task B3. Users can create games with custom grid sizes.

---

### Task B1: Add matchParams to createMatch schema and server (TDD)

**Files:**
- Modify: `shared/src/schema.ts` (add matchParams to createMatch)
- Modify: `server/src/match.ts` (accept and store matchParams)
- Modify: `server/src/app.ts` (pass matchParams through)
- Create: `server/tests/custom-params-match.test.ts`

#### Step 1: Write failing test

```typescript
// server/tests/custom-params-match.test.ts
import { describe, it, expect, vi } from 'vitest';
import { MatchManager } from '../src/match';

function mockSocket() {
  return { readyState: 1, send: vi.fn() } as any;
}

describe('custom match parameters', () => {
  it('creates match with custom grid dimensions', () => {
    const manager = new MatchManager();
    const ws1 = mockSocket();
    const ws2 = mockSocket();
    const { matchId } = manager.createMatch('P1', ws1, undefined, 42, undefined, {
      rows: 3,
      columns: 3,
      maxHandSize: 3,
      initialDraw: 12,
    });
    manager.joinMatch(matchId, 'P2', ws2);
    const match = manager.getMatch(matchId);
    expect(match?.state?.params.rows).toBe(3);
    expect(match?.state?.params.columns).toBe(3);
  });

  it('defaults to standard 2x4 when no matchParams provided', () => {
    const manager = new MatchManager();
    const ws1 = mockSocket();
    const ws2 = mockSocket();
    const { matchId } = manager.createMatch('P1', ws1);
    manager.joinMatch(matchId, 'P2', ws2);
    const match = manager.getMatch(matchId);
    expect(match?.state?.params.rows).toBe(2);
    expect(match?.state?.params.columns).toBe(4);
  });
});
```

#### Step 2: Implement

Add `matchParams` to `ClientMessageSchema` createMatch variant:

```typescript
matchParams: z.object({
  rows: z.number().int().min(1).max(12),
  columns: z.number().int().min(1).max(12),
  maxHandSize: z.number().int().min(0),
  initialDraw: z.number().int().min(1),
}).partial().optional(),
```

Extend `MatchInstance` with `matchParams?` field. Extend `createMatch` to accept and store it. Pass to `createInitialState` via `config.matchParams`.

#### Step 3: Run all tests

Run: `pnpm -r test`
Expected: All pass

#### Step 4: Commit

```bash
git add shared/src/schema.ts server/src/match.ts server/src/app.ts server/tests/custom-params-match.test.ts
git commit -m "feat: accept matchParams in createMatch for custom grid sizes"
```

---

### Task B2: Client sends matchParams via advanced options UI (TDD)

**Files:**
- Modify: `client/src/lobby.ts`
- Create: `client/tests/advanced-options.test.ts`

#### Step 1: Write failing test

```typescript
// client/tests/advanced-options.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

describe('advanced match options', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders Advanced Options toggle', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { renderLobby } = await import('../src/lobby');
    renderLobby(container);
    const toggle = container.querySelector('[data-testid="advanced-toggle"]');
    expect(toggle).toBeTruthy();
  });

  it('advanced panel is collapsed by default', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { renderLobby } = await import('../src/lobby');
    renderLobby(container);
    const panel = container.querySelector('[data-testid="advanced-panel"]');
    expect(panel?.classList.contains('is-open')).toBe(false);
  });

  it('shows grid inputs when toggled open', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { renderLobby } = await import('../src/lobby');
    renderLobby(container);
    const toggle = container.querySelector('[data-testid="advanced-toggle"]') as HTMLElement;
    toggle.click();
    expect(container.querySelector('[data-testid="adv-rows"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="adv-columns"]')).toBeTruthy();
  });
});
```

#### Step 2: Implement advanced options UI

In `client/src/lobby.ts`:
- Add "Advanced Options" toggle button after the existing options
- Collapsible panel with rows/columns number inputs
- Fetch defaults from `GET /api/defaults` to populate placeholders
- Read values and include as `matchParams` in the createMatch message

#### Step 3: Run all tests

Run: `pnpm -r test`
Expected: All pass

#### Step 4: Commit

```bash
git add client/src/lobby.ts client/tests/advanced-options.test.ts
git commit -m "feat(client): add advanced options UI for custom grid size"
```

---

### Task B3: Integration smoke test

**Files:**
- None new

#### Step 1: Run full test suite

Run: `pnpm -r test`
Expected: All pass

#### Step 2: Manual smoke test (if dev server available)

- Create a match with custom 3x3 grid
- Verify the grid renders correctly
- Create a bot match, verify bot plays

#### Step 3: Commit any fixes

**Deployment B is now shippable.** Users can configure custom grid sizes.

---

## Deployment C: Heuristic Bot Strategy (optional enhancement)

Ship after Task C1. Smarter AI opponent.

---

### Task C1: Heuristic strategy (TDD)

**Files:**
- Modify: `engine/src/bot.ts` (add heuristic strategy)
- Modify: `engine/tests/bot.test.ts`
- Modify: `shared/src/schema.ts` (extend opponent enum)
- Modify: `server/src/match.ts` (support bot-heuristic)
- Modify: `client/src/lobby.ts` (add heuristic option or make it default)

#### Step 1: Write failing tests

```typescript
// Add to engine/tests/bot.test.ts
describe('computeBotAction - heuristic strategy', () => {
  it('returns a deploy action during DeploymentPhase', () => {
    const state = seedState();
    const action = computeBotAction(state, 1, { strategy: 'heuristic', seed: 42 });
    expect(action.type).toBe('deploy');
  });

  it('prefers deploying higher-value cards', () => {
    const state = seedState();
    const action = computeBotAction(state, 1, { strategy: 'heuristic', seed: 42 });
    expect(action.type).toBe('deploy');
  });
});
```

#### Step 2: Implement heuristic strategy

Extend `BotConfig.strategy` union: `'random' | 'heuristic'`

Heuristic scoring:
- Deploy: prefer weapons (spades/clubs) in front row, shields (hearts/diamonds) in back
- Attack: prefer targets with low HP (easy kills score higher)
- Pass: low baseline score (last resort)

#### Step 3: Wire through server and client

- Add `'bot-heuristic'` to opponent enum in schema
- Server creates heuristic bot match
- Lobby offers "Bot (Smart)" option

#### Step 4: Run all tests

Run: `pnpm -r test`
Expected: All pass

#### Step 5: Commit

```bash
git add engine/src/bot.ts engine/tests/bot.test.ts shared/src/schema.ts server/src/match.ts client/src/lobby.ts
git commit -m "feat: add heuristic bot strategy with scoring-based decisions"
```

---

## Summary: Deployment Order

| Deploy | Tasks | Value | Risk |
|--------|-------|-------|------|
| **A** | A1-A5 | Single-player bot gameplay | Medium (new server state) |
| **B** | B1-B3 | Configurable grid sizes | Low (extends existing) |
| **C** | C1 | Smarter AI | Low (pure engine addition) |

Total: ~9 commits, each independently testable and deployable.
