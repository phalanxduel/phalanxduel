import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import WebSocket from 'ws';

async function sendAndWait(ws: WebSocket, msg: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const onMessage = (data: any) => {
      ws.off('message', onMessage);
      resolve(JSON.parse(data.toString()));
    };
    ws.on('message', onMessage);
    ws.send(JSON.stringify(msg), (err) => {
      if (err) reject(err);
    });

    setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error('Timed out waiting for response'));
    }, 5000);
  });
}

function waitForMessageType<T>(ws: WebSocket, type: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const onMessage = (data: any) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === type) {
        ws.off('message', onMessage);
        resolve(parsed);
      }
    };
    ws.on('message', onMessage);

    const timeout = setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error(`Timed out waiting for message type ${type}`));
    }, 5000);
  });
}

async function connect(url: string): Promise<WebSocket> {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  return ws;
}

describe('WebSocket integration', () => {
  let app: any;
  let url: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    url = `ws://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('should create a match and return matchId', async () => {
    const ws = await connect(url);

    const response = (await sendAndWait(ws, {
      type: 'createMatch',
      playerName: 'Alice',
    })) as { type: string; matchId: string };

    expect(response.type).toBe('matchCreated');
    expect(response.matchId).toBeTruthy();

    ws.close();
  });

  it('should receive matchError for invalid JSON', async () => {
    const ws = await connect(url);

    const responsePromise = new Promise((resolve) => {
      ws.on('message', (data) => resolve(JSON.parse(data.toString())));
    });

    ws.send('invalid json');
    const response = (await responsePromise) as { type: string; code: string };
    expect(response.type).toBe('matchError');
    expect(response.code).toBe('INVALID_JSON');

    ws.close();
  });

  it('should allow deploy action in DeploymentPhase', async () => {
    const ws1 = await connect(url);
    const ws2 = await connect(url);

    const created = (await sendAndWait(ws1, {
      type: 'createMatch',
      playerName: 'Alice',
    })) as { matchId: string };
    const matchId = created.matchId;

    await sendAndWait(ws2, { type: 'joinMatch', matchId, playerName: 'Bob' });

    // Wait for gameState on ws2 (Bob)
    const initialMsg = (await waitForMessageType(ws2, 'gameState')) as any;
    const cardId = initialMsg.result.postState.players[1].hand[0].id;

    const deployResult = (await sendAndWait(ws2, {
      type: 'action',
      matchId,
      action: {
        type: 'deploy',
        playerIndex: 1,
        column: 0,
        cardId,
        timestamp: new Date().toISOString(),
      },
    })) as any;

    expect(deployResult.type).toBe('gameState');
    expect(deployResult.result.action.type).toBe('deploy');

    ws1.close();
    ws2.close();
  });

  it('should initialize game state with createMatch matchParams from websocket', async () => {
    const ws1 = await connect(url);
    const ws2 = await connect(url);

    const created = (await sendAndWait(ws1, {
      type: 'createMatch',
      playerName: 'Alice',
      matchParams: { rows: 1, columns: 2 },
    })) as { matchId: string };
    const matchId = created.matchId;

    await sendAndWait(ws2, { type: 'joinMatch', matchId, playerName: 'Bob' });

    const msg = (await waitForMessageType(ws1, 'gameState')) as any;
    expect(msg.result.postState.params.rows).toBe(1);
    expect(msg.result.postState.params.columns).toBe(2);

    ws1.close();
    ws2.close();
  });

  it('should allow two WS joins on a REST-created match and start the game', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/matches',
    });
    const matchId = res.json().matchId;

    const ws1 = await connect(url);
    const ws2 = await connect(url);

    await sendAndWait(ws1, {
      type: 'joinMatch',
      matchId,
      playerName: 'Alice',
    });

    const ws1GameStatePromise = waitForMessageType<{ type: 'gameState'; matchId: string }>(
      ws1,
      'gameState',
    );
    const ws2GameStatePromise = waitForMessageType<{
      type: 'gameState';
      matchId: string;
      result: { postState: { phase: string } };
    }>(ws2, 'gameState');

    ws2.send(JSON.stringify({
        type: 'joinMatch',
        matchId,
        playerName: 'Bob',
    }));
    
    const secondJoin = await waitForMessageType(ws2, 'matchJoined') as any;
    expect(secondJoin.type).toBe('matchJoined');
    expect(secondJoin.playerIndex).toBe(1);

    const [ws1GameState, ws2GameState] = await Promise.all([
      ws1GameStatePromise,
      ws2GameStatePromise,
    ]);
    expect(ws1GameState.matchId).toBe(matchId);
    expect(ws2GameState.matchId).toBe(matchId);
    expect(['DeploymentPhase', 'AttackPhase']).toContain(ws2GameState.result.postState.phase);

    ws1.close();
    ws2.close();
  });
});
