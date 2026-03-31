/**
 * TASK-109: Player Index Spoofing Prevention
 *
 * Verifies that the server rejects actions where the playerIndex in the
 * action payload does not match the authenticated identity of the WebSocket
 * connection. Without this check, Player 0 could send actions claiming to
 * be Player 1 — and the engine would accept them during Player 1's turn.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import WebSocket from 'ws';
import { AddressInfo } from 'node:net';

describe('Security: Player Spoofing Prevention', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let baseUrl: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0 });
    const port = (app.server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  function connectWs(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const wsUrl = baseUrl.replace('http', 'ws') + '/ws';
      const ws = new WebSocket(wsUrl, {
        headers: { Origin: 'http://127.0.0.1:3001' },
      });
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  function sendAndReceive(
    ws: WebSocket,
    msg: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WebSocket timeout')), 2000);
      const listener = (data: WebSocket.Data) => {
        const parsed = JSON.parse(data.toString());
        if (
          parsed.type === 'matchError' ||
          parsed.type === 'actionError' ||
          parsed.type === 'matchCreated' ||
          parsed.type === 'matchJoined'
        ) {
          clearTimeout(timer);
          ws.off('message', listener);
          resolve(parsed);
        }
      };
      ws.on('message', listener);
      ws.send(JSON.stringify(msg));
    });
  }

  it('rejects actions where playerIndex does not match the connection identity', async () => {
    // 1. Alice creates a match
    const ws0 = await connectWs();
    const createMsg = await sendAndReceive(ws0, {
      type: 'createMatch',
      playerName: 'Alice',
    });
    const matchId = createMsg.matchId as string;

    // 2. Bob joins
    const ws1 = await connectWs();
    await sendAndReceive(ws1, {
      type: 'joinMatch',
      matchId,
      playerName: 'Bob',
    });

    // Wait for game state broadcast
    await new Promise((r) => setTimeout(r, 200));

    // 3. Alice (player 0) sends a deploy action claiming to be player 1.
    //    The server checks playerIndex against the connection identity BEFORE
    //    passing to the engine, so the action type/phase doesn't matter.
    const spoofedAction = {
      type: 'action',
      matchId,
      action: {
        type: 'deploy',
        playerIndex: 1, // Alice is 0, but claims to be Bob (1)
        column: 0,
        cardId: 'does-not-matter',
        timestamp: new Date().toISOString(),
      },
    };

    const result = await sendAndReceive(ws0, spoofedAction);

    expect(result.type).toBe('actionError');
    expect(result.code).toBe('UNAUTHORIZED_ACTION');

    ws0.close();
    ws1.close();
  });

  it('allows actions where playerIndex matches the connection identity', async () => {
    // Verify the spoofing check doesn't block legitimate actions
    const ws0 = await connectWs();
    const createMsg = await sendAndReceive(ws0, {
      type: 'createMatch',
      playerName: 'Alice',
    });
    const matchId = createMsg.matchId as string;

    const ws1 = await connectWs();
    await sendAndReceive(ws1, {
      type: 'joinMatch',
      matchId,
      playerName: 'Bob',
    });

    // Wait for game state broadcast
    await new Promise((r) => setTimeout(r, 200));

    // Alice (player 0) sends a legitimate action with correct playerIndex.
    // The deploy will fail for other reasons (invalid card), but it should
    // NOT fail with UNAUTHORIZED_ACTION.
    const legitimateAction = {
      type: 'action',
      matchId,
      action: {
        type: 'deploy',
        playerIndex: 0, // Correct — Alice IS player 0
        column: 0,
        cardId: 'invalid-card',
        timestamp: new Date().toISOString(),
      },
    };

    const result = await sendAndReceive(ws0, legitimateAction);

    expect(result.type).toBe('actionError');
    // Should fail for a game logic reason, NOT authorization
    expect(result.code).not.toBe('UNAUTHORIZED_ACTION');

    ws0.close();
    ws1.close();
  });
});
