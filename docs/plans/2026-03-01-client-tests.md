# P1-002: Client-Side Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add unit tests for `cards.ts`, `state.ts`, and `connection.ts` and enforce 60% coverage threshold.

**Architecture:** Bottom-up by purity. Each module tested in isolation with its own mocks. Coverage enforced via vitest config. TDD throughout: write failing test, make it pass, commit.

**Tech Stack:** TypeScript, Vitest 4.0.18, jsdom, `vi.stubGlobal` for browser APIs, `vi.useFakeTimers` for reconnect logic

---

## Task 1: Test `cards.ts` — pure functions

The simplest module: 6 pure functions, zero side effects, zero mocks.

**Files:**
- Create: `client/tests/cards.test.ts`

#### Step 1: Write the test file

```typescript
import { describe, it, expect } from 'vitest';
import type { Card, BattlefieldCard, Suit } from '@phalanxduel/shared';
import { suitSymbol, suitColor, cardLabel, hpDisplay, isWeapon, isFace } from '../src/cards';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-card-1',
    suit: 'spades',
    face: 'K',
    type: 'king',
    value: 10,
    ...overrides,
  };
}

function makeBfCard(currentHp: number, value: number): BattlefieldCard {
  return {
    card: makeCard({ value }),
    currentHp,
    position: { row: 0, col: 0 },
    deployed: true,
  } as BattlefieldCard;
}

describe('suitSymbol', () => {
  it.each<[Suit, string]>([
    ['spades', '\u2660'],
    ['hearts', '\u2665'],
    ['diamonds', '\u2666'],
    ['clubs', '\u2663'],
  ])('returns %s → %s', (suit, expected) => {
    expect(suitSymbol(suit)).toBe(expected);
  });
});

describe('suitColor', () => {
  it('returns blue for spades', () => {
    expect(suitColor('spades')).toBe('#3a6ea8');
  });
  it('returns red for hearts', () => {
    expect(suitColor('hearts')).toBe('#e03030');
  });
  it('returns red for diamonds', () => {
    expect(suitColor('diamonds')).toBe('#e03030');
  });
  it('returns blue for clubs', () => {
    expect(suitColor('clubs')).toBe('#3a6ea8');
  });
});

describe('cardLabel', () => {
  it('returns face + suit symbol', () => {
    expect(cardLabel(makeCard({ face: 'K', suit: 'spades' }))).toBe('K\u2660');
  });
  it('works for number cards', () => {
    expect(cardLabel(makeCard({ face: '7', suit: 'hearts' }))).toBe('7\u2665');
  });
});

describe('hpDisplay', () => {
  it('returns currentHp/maxHp', () => {
    expect(hpDisplay(makeBfCard(3, 5))).toBe('3/5');
  });
  it('handles zero HP', () => {
    expect(hpDisplay(makeBfCard(0, 10))).toBe('0/10');
  });
});

describe('isWeapon', () => {
  it('returns true for spades', () => expect(isWeapon('spades')).toBe(true));
  it('returns true for clubs', () => expect(isWeapon('clubs')).toBe(true));
  it('returns false for hearts', () => expect(isWeapon('hearts')).toBe(false));
  it('returns false for diamonds', () => expect(isWeapon('diamonds')).toBe(false));
});

describe('isFace', () => {
  it.each(['jack', 'queen', 'king', 'ace'] as const)('returns true for %s', (type) => {
    expect(isFace(makeCard({ type }))).toBe(true);
  });
  it('returns false for number cards', () => {
    expect(isFace(makeCard({ type: 'number' }))).toBe(false);
  });
});
```

#### Step 2: Run tests to verify they pass

Run: `cd client && npx vitest run tests/cards.test.ts`
Expected: All ~17 tests PASS (these test existing code — characterization tests).

#### Step 3: Commit

```text
git add client/tests/cards.test.ts
git commit -m "test(client): add unit tests for cards.ts pure functions"
```

---

## Task 2: Test `state.ts` — state management

264 LOC state machine. Mostly pure mutations with sessionStorage and window.history
side effects. Requires module re-import between tests to reset module-scoped state.

**Files:**
- Create: `client/tests/state.test.ts`

**Key testing pattern:** `state.ts` has module-level `let state` and `const listeners`.
To isolate tests, call `resetToLobby()` in `beforeEach` to reset state, and manually
clear the listeners array by unsubscribing. Alternatively, use `vi.resetModules()` +
dynamic import for full isolation.

#### Step 1: Write the test file

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { ServerMessage, GameState } from '@phalanxduel/shared';

// Stub sessionStorage before importing state.ts
const store: Record<string, string> = {};
vi.stubGlobal('sessionStorage', {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
});

import {
  getState,
  subscribe,
  dispatch,
  selectAttacker,
  selectDeployCard,
  clearSelection,
  setPlayerName,
  setDamageMode,
  setStartingLifepoints,
  setServerHealth,
  toggleHelp,
  clearError,
  resetToLobby,
  getSavedSession,
  onTurnResult,
} from '../src/state';

function makeGameState(phase = 'AttackPhase'): GameState {
  return {
    phase,
    turnNumber: 1,
    activePlayerIndex: 0,
    players: [],
    gameOptions: { damageMode: 'classic', startingLifepoints: 20 },
    transactionLog: [],
  } as unknown as GameState;
}

describe('state', () => {
  let unsubs: (() => void)[];

  beforeEach(() => {
    unsubs = [];
    // Reset to clean state
    resetToLobby();
    // Clear sessionStorage mock state
    for (const key of Object.keys(store)) delete store[key];
    vi.clearAllMocks();
  });

  afterEach(() => {
    unsubs.forEach((fn) => fn());
  });

  // --- getState ---
  describe('getState', () => {
    it('returns initial lobby state', () => {
      const s = getState();
      expect(s.screen).toBe('lobby');
      expect(s.matchId).toBeNull();
      expect(s.playerIndex).toBeNull();
      expect(s.gameState).toBeNull();
      expect(s.damageMode).toBe('classic');
      expect(s.startingLifepoints).toBe(20);
    });
  });

  // --- subscribe ---
  describe('subscribe', () => {
    it('notifies listener on state change', () => {
      const listener = vi.fn();
      unsubs.push(subscribe(listener));
      setPlayerName('Alice');
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].playerName).toBe('Alice');
    });

    it('unsubscribe stops notifications', () => {
      const listener = vi.fn();
      const unsub = subscribe(listener);
      unsub();
      setPlayerName('Bob');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  // --- dispatch: matchCreated ---
  describe('dispatch matchCreated', () => {
    it('transitions to waiting screen and saves session', () => {
      setPlayerName('Alice');
      dispatch({
        type: 'matchCreated',
        matchId: 'm1',
        playerId: 'p1',
        playerIndex: 0,
      } as ServerMessage);

      const s = getState();
      expect(s.screen).toBe('waiting');
      expect(s.matchId).toBe('m1');
      expect(s.playerId).toBe('p1');
      expect(s.playerIndex).toBe(0);
      expect(sessionStorage.setItem).toHaveBeenCalled();
    });
  });

  // --- dispatch: matchJoined ---
  describe('dispatch matchJoined', () => {
    it('sets match info and saves session', () => {
      dispatch({
        type: 'matchJoined',
        matchId: 'm2',
        playerId: 'p2',
        playerIndex: 1,
      } as ServerMessage);

      const s = getState();
      expect(s.matchId).toBe('m2');
      expect(s.playerIndex).toBe(1);
      expect(sessionStorage.setItem).toHaveBeenCalled();
    });
  });

  // --- dispatch: spectatorJoined ---
  describe('dispatch spectatorJoined', () => {
    it('sets spectator mode and game screen', () => {
      dispatch({
        type: 'spectatorJoined',
        matchId: 'm3',
      } as ServerMessage);

      const s = getState();
      expect(s.screen).toBe('game');
      expect(s.isSpectator).toBe(true);
      expect(s.playerIndex).toBeNull();
    });
  });

  // --- dispatch: gameState ---
  describe('dispatch gameState', () => {
    it('updates game screen for non-gameOver phase', () => {
      const gs = makeGameState('AttackPhase');
      dispatch({
        type: 'gameState',
        matchId: 'm1',
        result: { postState: gs, preState: gs, matchId: 'm1', playerId: 'p1', action: null, events: [] },
        spectatorCount: 3,
      } as unknown as ServerMessage);

      const s = getState();
      expect(s.screen).toBe('game');
      expect(s.gameState).toBe(gs);
      expect(s.spectatorCount).toBe(3);
      expect(s.selectedAttacker).toBeNull();
      expect(s.selectedDeployCard).toBeNull();
    });

    it('transitions to gameOver screen for gameOver phase', () => {
      const gs = makeGameState('gameOver');
      dispatch({
        type: 'gameState',
        matchId: 'm1',
        result: { postState: gs, preState: gs, matchId: 'm1', playerId: 'p1', action: null, events: [] },
      } as unknown as ServerMessage);

      expect(getState().screen).toBe('gameOver');
    });

    it('invokes turnResultCallback if registered', () => {
      const cb = vi.fn();
      onTurnResult(cb);
      const gs = makeGameState();
      const result = { postState: gs, preState: gs, matchId: 'm1', playerId: 'p1', action: null, events: [] };
      dispatch({
        type: 'gameState',
        matchId: 'm1',
        result,
      } as unknown as ServerMessage);

      expect(cb).toHaveBeenCalledWith(result);
    });
  });

  // --- dispatch: errors ---
  describe('dispatch errors', () => {
    it('actionError sets error', () => {
      dispatch({ type: 'actionError', error: 'bad move' } as ServerMessage);
      expect(getState().error).toBe('bad move');
    });

    it('matchError sets error', () => {
      dispatch({ type: 'matchError', error: 'match full' } as ServerMessage);
      expect(getState().error).toBe('match full');
    });

    it('opponentDisconnected sets error', () => {
      dispatch({ type: 'opponentDisconnected' } as ServerMessage);
      expect(getState().error).toContain('disconnected');
    });

    it('opponentReconnected clears error', () => {
      dispatch({ type: 'opponentDisconnected' } as ServerMessage);
      dispatch({ type: 'opponentReconnected' } as ServerMessage);
      expect(getState().error).toBeNull();
    });
  });

  // --- Selection ---
  describe('selection', () => {
    it('selectAttacker sets position and clears error', () => {
      dispatch({ type: 'actionError', error: 'oops' } as ServerMessage);
      selectAttacker({ row: 0, col: 2 });
      const s = getState();
      expect(s.selectedAttacker).toEqual({ row: 0, col: 2 });
      expect(s.error).toBeNull();
    });

    it('selectDeployCard sets cardId and clears error', () => {
      selectDeployCard('card-42');
      expect(getState().selectedDeployCard).toBe('card-42');
    });

    it('clearSelection resets both', () => {
      selectAttacker({ row: 0, col: 0 });
      selectDeployCard('card-1');
      clearSelection();
      const s = getState();
      expect(s.selectedAttacker).toBeNull();
      expect(s.selectedDeployCard).toBeNull();
    });
  });

  // --- Settings ---
  describe('settings', () => {
    it('setPlayerName updates name', () => {
      setPlayerName('Charlie');
      expect(getState().playerName).toBe('Charlie');
    });

    it('setDamageMode updates mode', () => {
      setDamageMode('cumulative');
      expect(getState().damageMode).toBe('cumulative');
    });

    it('setStartingLifepoints clamps to [1, 500]', () => {
      setStartingLifepoints(0);
      expect(getState().startingLifepoints).toBe(1);
      setStartingLifepoints(501);
      expect(getState().startingLifepoints).toBe(500);
      setStartingLifepoints(3.7);
      expect(getState().startingLifepoints).toBe(3);
      setStartingLifepoints(50);
      expect(getState().startingLifepoints).toBe(50);
    });

    it('setServerHealth updates health', () => {
      const health = { color: 'green' as const, label: 'Connected', hint: 'v1.0' };
      setServerHealth(health);
      expect(getState().serverHealth).toEqual(health);
    });

    it('toggleHelp flips showHelp', () => {
      expect(getState().showHelp).toBe(false);
      toggleHelp();
      expect(getState().showHelp).toBe(true);
      toggleHelp();
      expect(getState().showHelp).toBe(false);
    });

    it('clearError sets error to null', () => {
      dispatch({ type: 'actionError', error: 'err' } as ServerMessage);
      clearError();
      expect(getState().error).toBeNull();
    });
  });

  // --- Session persistence ---
  describe('session persistence', () => {
    it('getSavedSession returns null when empty', () => {
      expect(getSavedSession()).toBeNull();
    });

    it('getSavedSession returns stored session after matchCreated', () => {
      setPlayerName('Alice');
      dispatch({
        type: 'matchCreated',
        matchId: 'm1',
        playerId: 'p1',
        playerIndex: 0,
      } as ServerMessage);

      // Simulate what loadSession does — read from our mock
      const stored = JSON.parse(store['phalanx_session']);
      expect(stored.matchId).toBe('m1');
      expect(stored.playerId).toBe('p1');
      expect(stored.playerName).toBe('Alice');
    });

    it('resetToLobby clears session', () => {
      dispatch({
        type: 'matchCreated',
        matchId: 'm1',
        playerId: 'p1',
        playerIndex: 0,
      } as ServerMessage);
      resetToLobby();
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('phalanx_session');
      expect(getState().screen).toBe('lobby');
      expect(getState().matchId).toBeNull();
    });
  });
});
```

#### Step 2: Run tests to verify they pass

Run: `cd client && npx vitest run tests/state.test.ts`
Expected: All ~22 tests PASS.

Note: Some tests may need minor adjustments if `window.history.replaceState` isn't
available in jsdom. If that happens, add `vi.stubGlobal('window', { ...window, history: { replaceState: vi.fn() } })` — but jsdom usually provides this.

#### Step 3: Commit

```text
git add client/tests/state.test.ts
git commit -m "test(client): add unit tests for state.ts state management"
```

---

## Task 3: Test `connection.ts` — WebSocket wrapper

70 LOC WebSocket factory with reconnect logic. Requires mocking `WebSocket` class
and `@sentry/browser`.

**Files:**
- Create: `client/tests/connection.test.ts`

**Key testing pattern:** Create a mock `WebSocket` class that captures event listeners,
then manually fire events to simulate open/message/close/error. Use `vi.useFakeTimers()`
for reconnect delay testing.

#### Step 1: Write the test file

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Sentry before importing connection
vi.mock('@sentry/browser', () => ({
  addBreadcrumb: vi.fn(),
}));

import * as Sentry from '@sentry/browser';
import { createConnection } from '../src/connection';

// --- Mock WebSocket ---
type WsListener = (event: unknown) => void;

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = MockWebSocket.OPEN;
  private listeners: Record<string, WsListener[]> = {};

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  addEventListener(event: string, cb: WsListener) {
    (this.listeners[event] ??= []).push(cb);
  }

  send = vi.fn();
  close = vi.fn();

  // Test helpers
  fire(event: string, data?: unknown) {
    for (const cb of this.listeners[event] ?? []) {
      cb(data ?? {});
    }
  }
}

// Expose OPEN/CLOSED as static on the stub
Object.defineProperty(MockWebSocket, 'OPEN', { value: 1 });
Object.defineProperty(MockWebSocket, 'CLOSED', { value: 3 });

describe('createConnection', () => {
  let onMessage: ReturnType<typeof vi.fn>;
  let onOpen: ReturnType<typeof vi.fn>;
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    onMessage = vi.fn();
    onOpen = vi.fn();
    onClose = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function lastWs(): MockWebSocket {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }

  it('creates a WebSocket with the given URL', () => {
    createConnection('ws://test:3001', onMessage);
    expect(lastWs().url).toBe('ws://test:3001');
  });

  it('returns object with send and close methods', () => {
    const conn = createConnection('ws://test:3001', onMessage);
    expect(typeof conn.send).toBe('function');
    expect(typeof conn.close).toBe('function');
  });

  it('calls onOpen when WebSocket opens', () => {
    createConnection('ws://test:3001', onMessage, onOpen);
    lastWs().fire('open');
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('parses JSON and calls onMessage on message event', () => {
    createConnection('ws://test:3001', onMessage);
    lastWs().fire('message', { data: JSON.stringify({ type: 'matchCreated', matchId: 'm1', playerId: 'p1', playerIndex: 0 }) });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'matchCreated', matchId: 'm1' }),
    );
  });

  it('ignores malformed JSON messages', () => {
    createConnection('ws://test:3001', onMessage);
    lastWs().fire('message', { data: 'not-json' });
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('calls onClose when WebSocket closes', () => {
    createConnection('ws://test:3001', onMessage, onOpen, onClose);
    lastWs().fire('close');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('send() serializes message and adds Sentry breadcrumb', () => {
    const conn = createConnection('ws://test:3001', onMessage);
    const ws = lastWs();
    ws.readyState = MockWebSocket.OPEN;
    const msg = { type: 'createMatch' as const, playerName: 'Alice', gameOptions: { damageMode: 'classic' as const, startingLifepoints: 20 } };
    conn.send(msg);
    expect(ws.send).toHaveBeenCalledWith(JSON.stringify(msg));
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'websocket' }),
    );
  });

  it('send() does nothing when WebSocket is not OPEN', () => {
    const conn = createConnection('ws://test:3001', onMessage);
    lastWs().readyState = MockWebSocket.CLOSED;
    conn.send({ type: 'createMatch' as const, playerName: 'Bob', gameOptions: { damageMode: 'classic' as const, startingLifepoints: 20 } });
    expect(lastWs().send).not.toHaveBeenCalled();
  });

  it('reconnects after close with exponential backoff', () => {
    createConnection('ws://test:3001', onMessage, onOpen, onClose);
    expect(MockWebSocket.instances).toHaveLength(1);

    // First close → reconnect after 1000ms
    lastWs().fire('close');
    vi.advanceTimersByTime(999);
    expect(MockWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(2);

    // Second close → reconnect after 2000ms (delay doubled inside setTimeout)
    lastWs().fire('close');
    vi.advanceTimersByTime(1999);
    expect(MockWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it('caps reconnect delay at 30 seconds', () => {
    createConnection('ws://test:3001', onMessage);

    // Close and reconnect repeatedly to escalate delay
    for (let i = 0; i < 20; i++) {
      lastWs().fire('close');
      vi.advanceTimersByTime(30000);
    }
    // Should still reconnect — delay capped, not infinite
    const count = MockWebSocket.instances.length;
    expect(count).toBeGreaterThan(10);
  });

  it('resets reconnect delay on successful open', () => {
    createConnection('ws://test:3001', onMessage);

    // Escalate delay
    lastWs().fire('close');
    vi.advanceTimersByTime(1000);

    // Open resets delay
    lastWs().fire('open');
    lastWs().fire('close');

    // Should reconnect after 1000ms (reset), not 2000ms
    vi.advanceTimersByTime(1000);
    const count = MockWebSocket.instances.length;
    expect(count).toBe(3);
  });

  it('close() prevents reconnection', () => {
    const conn = createConnection('ws://test:3001', onMessage);
    conn.close();

    // Fire close event — should NOT reconnect
    lastWs().fire('close');
    vi.advanceTimersByTime(60000);
    expect(MockWebSocket.instances).toHaveLength(1);
  });
});
```

#### Step 2: Run tests to verify they pass

Run: `cd client && npx vitest run tests/connection.test.ts`
Expected: All ~12 tests PASS.

Note: The reconnect backoff test may need adjustment depending on exact timer
behavior. The key insight is that `reconnectDelay` is doubled *inside* the setTimeout
callback (after the delay fires), so the first reconnect fires at 1000ms, but by the
time it fires the delay has been doubled to 2000ms for the *next* close.

#### Step 3: Commit

```text
git add client/tests/connection.test.ts
git commit -m "test(client): add unit tests for connection.ts WebSocket wrapper"
```

---

## Task 4: Add coverage threshold enforcement

**Files:**
- Modify: `client/vitest.config.ts`

#### Step 1: Add coverage config

Update `client/vitest.config.ts` to add v8 coverage thresholds:

```typescript
import { defineConfig } from 'vitest/config';
import { preferTsSourceImports } from '../scripts/build/resolve-source';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
  },
  plugins: [preferTsSourceImports()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/vite-env.d.ts', 'src/main.ts'],
      thresholds: {
        statements: 60,
        lines: 60,
      },
    },
  },
});
```

Notes:
- `main.ts` is excluded because it's a side-effect entry point (hard to test without
  major refactoring, and it's not where business logic lives).
- `vite-env.d.ts` is a type declaration file with no runtime code.
- No branch/function thresholds yet — those can be ratcheted later.

#### Step 2: Run coverage to verify threshold passes

Run: `cd client && npx vitest run --coverage`
Expected: All tests pass AND coverage report shows statements/lines >= 60%.

If coverage is below 60%, identify remaining gaps and add targeted tests
in a follow-up before committing.

#### Step 3: Commit

```text
git add client/vitest.config.ts
git commit -m "build(client): enforce 60% coverage threshold for statements and lines"
```

---

## Task 5: Update TODO.md and run full suite

**Files:**
- Modify: `TODO.md`

#### Step 1: Update P1-002 status

Add resolution notes under the P1-002 heading, similar to how P0-001 and P1-001
were marked complete.

#### Step 2: Run the full test suite from root

Run: `pnpm test`
Expected: All tests pass (shared: 13, engine: 60, client: ~80, server: 67).

Run: `pnpm lint && pnpm typecheck`
Expected: Both pass clean.

#### Step 3: Commit

```text
git add TODO.md
git commit -m "docs: mark P1-002 client-side tests as complete"
```

---

## Summary

| Task | Module | New Tests | Coverage Impact |
|------|--------|-----------|-----------------|
| 1 | cards.ts | ~17 | 22% → ~100% |
| 2 | state.ts | ~22 | 6% → ~85% |
| 3 | connection.ts | ~12 | 0% → ~90% |
| 4 | Coverage config | 0 | Threshold enforced |
| 5 | TODO update | 0 | — |

Expected final state: ~80 client tests, ~65-70% statement coverage (above 60% threshold).
