# Game Log Viewer (TASK-45.6) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the match event log in the client: a "View Log" link on the game-over screen and a "Past Games" history panel in the lobby.

**Architecture:** Two independent additions to the client. Task 1 adds a single anchor to `game-over.ts`. Task 2 adds a new `match-history.ts` module rendered as a collapsible panel in `renderLobby`. No new routes or server changes needed — TASK-45.5 already provides `GET /matches/completed` and `GET /matches/:id/log`.

**Tech Stack:** TypeScript, vitest + jsdom, `el()` helper from `renderer.ts`, native `fetch`

---

## Chunk 1: "View Log" link on game-over screen

### Task 1: "View Log" link in game-over

**Files:**
- Modify: `client/src/game-over.ts`
- Modify: `client/tests/game-over.test.ts`

#### Step 1: Write failing tests

Add to `client/tests/game-over.test.ts` inside the existing `describe('renderGameOver', ...)` block:

```typescript
it('renders "View Log" link with data-testid="view-log-link" when matchId is set', () => {
  const state = makeState({});
  // makeState sets matchId: 'test-match'
  renderGameOver(container, state);
  const link = container.querySelector('[data-testid="view-log-link"]');
  expect(link).toBeTruthy();
  expect(link!.tagName).toBe('A');
});

it('View Log link href points to /matches/:matchId/log', () => {
  const state = makeState({});
  renderGameOver(container, state);
  const link = container.querySelector('[data-testid="view-log-link"]') as HTMLAnchorElement;
  expect(link).toBeTruthy();
  expect(link.href).toContain('/matches/test-match/log');
});

it('View Log link opens in a new tab (target="_blank")', () => {
  const state = makeState({});
  renderGameOver(container, state);
  const link = container.querySelector('[data-testid="view-log-link"]') as HTMLAnchorElement;
  expect(link.target).toBe('_blank');
});

it('does not render View Log link when matchId is null', () => {
  const state = makeState({});
  state.matchId = null;
  renderGameOver(container, state);
  const link = container.querySelector('[data-testid="view-log-link"]');
  expect(link).toBeNull();
});
```

- [ ] **Step 1: Add the 4 tests above to `client/tests/game-over.test.ts`**

- [ ] **Step 2: Run tests to confirm they fail**

```bash
rtk pnpm --filter @phalanxduel/client test -- --reporter=verbose game-over
```

Expected: 4 new tests FAIL (element not found / null)

#### Step 2: Implement the "View Log" link

In `client/src/game-over.ts`, after line 69 (`wrapper.appendChild(playAgainBtn);`), add:

```typescript
if (state.matchId) {
  const logLink = el('a', 'btn btn-secondary view-log-link') as HTMLAnchorElement;
  logLink.href = `/matches/${state.matchId}/log`;
  logLink.target = '_blank';
  logLink.rel = 'noopener noreferrer';
  logLink.textContent = 'View Match Log';
  logLink.setAttribute('data-testid', 'view-log-link');
  wrapper.appendChild(logLink);
}
```

- [ ] **Step 3: Add the "View Log" link to `client/src/game-over.ts`**

- [ ] **Step 4: Run tests to confirm they pass**

```bash
rtk pnpm --filter @phalanxduel/client test -- --reporter=verbose game-over
```

Expected: all tests PASS (including the 4 new ones)

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/game-over.ts client/tests/game-over.test.ts
rtk git commit -m "feat(client): add View Log link to game-over screen (TASK-45.6 AC#1)"
```

---

## Chunk 2: Match history panel in lobby

### Task 2: `match-history.ts` — fetch and render completed match list

**Files:**
- Create: `client/src/match-history.ts`
- Create: `client/tests/match-history.test.ts`

The server endpoint `GET /matches/completed` returns an array of:
```typescript
{
  matchId: string;
  playerIds: string[];
  playerNames: string[];
  winnerIndex: number;
  victoryType: string;
  turnCount: number;
  fingerprint: string;
  createdAt: string;
  completedAt: string;
}
```

#### Step 1: Write failing tests

Create `client/tests/match-history.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderMatchHistory } from '../src/match-history';

const SAMPLE_MATCHES = [
  {
    matchId: 'match-aaa',
    playerIds: ['p1', 'p2'],
    playerNames: ['Alice', 'Bob'],
    winnerIndex: 0,
    victoryType: 'lpDepletion',
    turnCount: 12,
    fingerprint: 'abc123',
    createdAt: '2026-03-15T10:00:00.000Z',
    completedAt: '2026-03-15T10:05:00.000Z',
  },
  {
    matchId: 'match-bbb',
    playerIds: ['p3', 'bot'],
    playerNames: ['Carol', 'Bot'],
    winnerIndex: 1,
    victoryType: 'forfeit',
    turnCount: 3,
    fingerprint: 'def456',
    createdAt: '2026-03-15T11:00:00.000Z',
    completedAt: '2026-03-15T11:02:00.000Z',
  },
];

describe('renderMatchHistory', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a loading state immediately', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {})); // never resolves
    renderMatchHistory(container);
    expect(container.textContent).toContain('Loading');
  });

  it('renders match rows after fetch resolves', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_MATCHES,
    } as Response);
    renderMatchHistory(container);
    await vi.waitFor(() => {
      expect(container.querySelectorAll('[data-testid="match-row"]').length).toBe(2);
    });
  });

  it('each row shows player names', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_MATCHES,
    } as Response);
    renderMatchHistory(container);
    await vi.waitFor(() => {
      const rows = container.querySelectorAll('[data-testid="match-row"]');
      expect(rows[0]!.textContent).toContain('Alice');
      expect(rows[0]!.textContent).toContain('Bob');
    });
  });

  it('each row has a View Log link pointing to /matches/:id/log', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_MATCHES,
    } as Response);
    renderMatchHistory(container);
    await vi.waitFor(() => {
      const link = container.querySelector(
        '[data-testid="match-row"] [data-testid="match-log-link"]',
      ) as HTMLAnchorElement;
      expect(link).toBeTruthy();
      expect(link.href).toContain('/matches/match-aaa/log');
    });
  });

  it('shows empty state message when no matches returned', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);
    renderMatchHistory(container);
    await vi.waitFor(() => {
      expect(container.textContent).toContain('No completed matches');
    });
  });

  it('shows error message when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
    renderMatchHistory(container);
    await vi.waitFor(() => {
      expect(container.textContent).toContain('Failed to load');
    });
  });
});
```

- [ ] **Step 1: Create `client/tests/match-history.test.ts` with the content above**

- [ ] **Step 2: Run tests to confirm they fail (module not found)**

```bash
rtk pnpm --filter @phalanxduel/client test -- --reporter=verbose match-history
```

Expected: all 6 tests FAIL (cannot find module `../src/match-history`)

#### Step 2: Implement `match-history.ts`

Create `client/src/match-history.ts`:

```typescript
import { el } from './renderer';

interface MatchSummary {
  matchId: string;
  playerNames: string[];
  winnerIndex: number;
  victoryType: string;
  turnCount: number;
  completedAt: string;
}

const VICTORY_LABELS: Record<string, string> = {
  lpDepletion: 'LP Depletion',
  cardDepletion: 'Card Depletion',
  forfeit: 'Forfeit',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function clearContainer(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function renderRow(match: MatchSummary): HTMLElement {
  const row = el('div', 'match-row');
  row.setAttribute('data-testid', 'match-row');

  const players = match.playerNames.join(' vs ');
  const winner = match.playerNames[match.winnerIndex] ?? `Player ${match.winnerIndex + 1}`;
  const outcome = VICTORY_LABELS[match.victoryType] ?? match.victoryType;

  const info = el('span', 'match-info');
  info.textContent = `${formatDate(match.completedAt)} · ${players} · ${winner} wins (${outcome}) · ${match.turnCount} turns`;
  row.appendChild(info);

  const link = el('a', 'btn btn-secondary match-log-link') as HTMLAnchorElement;
  link.href = `/matches/${match.matchId}/log`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'View Log';
  link.setAttribute('data-testid', 'match-log-link');
  row.appendChild(link);

  return row;
}

export function renderMatchHistory(container: HTMLElement): void {
  clearContainer(container);

  const loading = el('p', 'match-history-loading');
  loading.textContent = 'Loading past games\u2026';
  container.appendChild(loading);

  fetch('/matches/completed')
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<MatchSummary[]>;
    })
    .then((matches) => {
      clearContainer(container);
      if (matches.length === 0) {
        const empty = el('p', 'match-history-empty');
        empty.textContent = 'No completed matches yet.';
        container.appendChild(empty);
        return;
      }
      for (const match of matches) {
        container.appendChild(renderRow(match));
      }
    })
    .catch(() => {
      clearContainer(container);
      const err = el('p', 'match-history-error');
      err.textContent = 'Failed to load match history.';
      container.appendChild(err);
    });
}
```

- [ ] **Step 3: Create `client/src/match-history.ts` with the content above**

- [ ] **Step 4: Run tests to confirm they pass**

```bash
rtk pnpm --filter @phalanxduel/client test -- --reporter=verbose match-history
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/match-history.ts client/tests/match-history.test.ts
rtk git commit -m "feat(client): add renderMatchHistory component with tests (TASK-45.6 AC#2-5)"
```

---

### Task 3: "Past Games" button and panel in lobby

**Files:**
- Modify: `client/src/lobby.ts`
- Modify: `client/tests/lobby.test.ts`

The "Past Games" button goes between `wrapper.appendChild(watchRow)` and the `helpToggle` section. Clicking it toggles a `match-history` panel (lazy-loaded on first open).

#### Step 1: Write failing tests

Add to `client/tests/lobby.test.ts` inside `describe('renderLobby', ...)`:

```typescript
it('renders "Past Games" button with data-testid="past-games-btn"', async () => {
  const { renderLobby } = await import('../src/lobby');
  renderLobby(container);
  const btn = container.querySelector('[data-testid="past-games-btn"]');
  expect(btn).toBeTruthy();
  expect(btn!.textContent).toBe('Past Games');
});
```

- [ ] **Step 1: Add the test above to `client/tests/lobby.test.ts` inside the `renderLobby` describe block**

- [ ] **Step 2: Run tests to confirm it fails**

```bash
rtk pnpm --filter @phalanxduel/client test -- --reporter=verbose lobby
```

Expected: new test FAILS (element not found)

#### Step 2: Add Past Games button to `renderLobby`

In `client/src/lobby.ts`:

1. Add import at the top of the file alongside existing imports:

```typescript
import { renderMatchHistory } from './match-history';
```

1. After `wrapper.appendChild(watchRow);` (the line that appends watchRow), insert:

```typescript
const historyDivider = el('div', 'lobby-divider');
historyDivider.textContent = 'browse past games?';
wrapper.appendChild(historyDivider);

const historyToggle = el('button', 'btn btn-secondary');
historyToggle.textContent = 'Past Games';
historyToggle.setAttribute('data-testid', 'past-games-btn');
wrapper.appendChild(historyToggle);

const historyPanel = el('div', 'match-history-panel');
historyPanel.style.display = 'none';
wrapper.appendChild(historyPanel);

let historyLoaded = false;
historyToggle.addEventListener('click', () => {
  const isHidden = historyPanel.style.display === 'none';
  historyPanel.style.display = isHidden ? 'block' : 'none';
  if (isHidden && !historyLoaded) {
    historyLoaded = true;
    renderMatchHistory(historyPanel);
  }
});
```

- [ ] **Step 3: Add the `renderMatchHistory` import and the Past Games section to `client/src/lobby.ts`**

- [ ] **Step 4: Run tests to confirm they pass**

```bash
rtk pnpm --filter @phalanxduel/client test -- --reporter=verbose lobby
```

Expected: all lobby tests PASS (including the new "Past Games" test)

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/lobby.ts client/tests/lobby.test.ts
rtk git commit -m "feat(client): add Past Games panel to lobby (TASK-45.6 AC#2-3)"
```

---

## Chunk 3: Verification and task closure

### Task 4: Full verification and task closure

**Files:**
- Modify: `backlog/tasks/task-45.6 - Game-Log-Viewer.md`
- Modify: `backlog/tasks/task-45 - Workstream-Event-Log.md`

- [ ] **Step 1: Run full client test suite**

```bash
rtk pnpm --filter @phalanxduel/client test
```

Expected: all client tests PASS

- [ ] **Step 2: Run typecheck**

```bash
rtk pnpm typecheck
```

Expected: no TypeScript errors

- [ ] **Step 3: Run lint**

```bash
rtk pnpm lint
```

Expected: no ESLint errors

- [ ] **Step 4: Run full CI suite**

```bash
rtk pnpm check:ci
```

Expected: all checks PASS

- [ ] **Step 5: Mark TASK-45.6 Done**

In `backlog/tasks/task-45.6 - Game-Log-Viewer.md`:
- Set `status: Done`
- Check all ACs: #1 through #6

- [ ] **Step 6: Update TASK-45 parent**

In `backlog/tasks/task-45 - Workstream-Event-Log.md`:
- Check AC #5: "The game-over screen provides a 'View Log' link to the match log."
- Check DoD #1: "TASK-45.1 through TASK-45.7 are completed with verification evidence recorded on each child task."
- Add implementation note indicating TASK-45.6 is complete and the workstream awaits Human Review

- [ ] **Step 7: Commit task closure**

```bash
rtk git add "backlog/tasks/task-45.6 - Game-Log-Viewer.md" "backlog/tasks/task-45 - Workstream-Event-Log.md"
rtk git commit -m "docs(backlog): close TASK-45.6 Game Log Viewer — all ACs met"
```

- [ ] **Step 8: Push to remote**

```bash
git push https://github.com/phalanxduel/phalanxduel.git main
```
