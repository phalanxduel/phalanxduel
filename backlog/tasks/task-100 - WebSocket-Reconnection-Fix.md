---
id: TASK-100
title: WebSocket Reconnection Fix
status: Done
assignee:
  - '@claude'
created_date: '2026-03-21'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies: []
priority: critical
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players who lose their WebSocket connection during a match cannot rejoin. The
server treats every `joinMatch` as a new player (new UUID), the original player
slot is still occupied (socket nulled but player object retained), so the server
rejects with `MATCH_FULL`. The client auto-reconnect logic only fires when
`screen === 'lobby'`, so during gameplay no rejoin is even attempted.

This is the most severe playability defect — any brief network interruption
permanently breaks a match for both players.
<!-- SECTION:DESCRIPTION:END -->

## Root Cause Analysis

1. **Client** (`client/src/main.ts:159`): Reconnect guard checks
   `getState().screen === 'lobby'` — always false during gameplay.
2. **Server** (`server/src/match.ts:529`): `joinMatch` always calls
   `randomUUID()` for the playerId — no mechanism to reclaim an existing slot.
3. **Server** (`server/src/match.ts:600-631`): `handleDisconnect` nulls the
   socket but keeps the player object in the slot — slot appears full.
4. **Dead code**: `opponentReconnected` message type is handled in the client
   state machine but never emitted by the server.

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 New `rejoinMatch` ClientMessage type: `{ type: 'rejoinMatch', matchId, playerId }`.
- [ ] #2 Server accepts `rejoinMatch`: verifies playerId exists in match with
      null socket, swaps in new socket, sends full game state to reconnected
      player.
- [ ] #3 Server emits `opponentReconnected` to the other player on successful
      rejoin.
- [ ] #4 Client auto-reconnect sends `rejoinMatch` when `screen === 'game'`
      using stored `matchId` and `playerId` from sessionStorage.
- [ ] #5 Reconnect window: player has 2 minutes to reconnect before their slot
      is forfeited.
- [ ] #6 Tests: disconnect/reconnect scenario — player disconnects, reconnects
      within window, reclaims slot, game continues.
- [ ] #7 Tests: reconnect timeout — player fails to reconnect within window,
      opponent wins by forfeit.
- [ ] #8 Tests: reconnect with wrong playerId is rejected.
<!-- AC:END -->

## Verification

```bash
# Unit tests
pnpm --filter @phalanxduel/server test -- --grep reconnect

# Integration: start server, create match via WS, disconnect P1, reconnect P1
# Verify game state is restored and opponent sees reconnection message
pnpm -r test

# Full verification
pnpm verify:all
```

## Plan Reference

See `docs/plans/2026-03-21-stability-playability-dag.md` — this is the root
node of the DAG (no dependencies, everything else follows).
