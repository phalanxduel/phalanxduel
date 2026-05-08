import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { WebSocket } from 'ws';
import { client } from '../src/db/index.js';
import { randomUUID } from 'node:crypto';

describe('Production Failover & Recovery', () => {
  let appA: Awaited<ReturnType<typeof buildApp>>;
  let appB: Awaited<ReturnType<typeof buildApp>>;
  let portA: number;
  let portB: number;

  beforeAll(async () => {
    if (client) await client`TRUNCATE matches CASCADE`;

    appA = await buildApp();
    await appA.ready();
    await appA.listen({ port: 0, host: '127.0.0.1' });
    const addressA = appA.server.address();
    portA = typeof addressA === 'string' ? 0 : (addressA?.port ?? 0);

    appB = await buildApp();
    await appB.ready();
    await appB.listen({ port: 0, host: '127.0.0.1' });
    const addressB = appB.server.address();
    portB = typeof addressB === 'string' ? 0 : (addressB?.port ?? 0);
  });

  afterAll(async () => {
    await appA.close();
    await appB.close();
  });

  async function connect(port: number) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    await new Promise((resolve) => ws.on('open', resolve));
    return ws;
  }

  function waitForMessage(ws: WebSocket, type: string) {
    return new Promise<Record<string, unknown>>((resolve) => {
      const listener = (data: Buffer) => {
        const msg = JSON.parse(data.toString()) as Record<string, unknown>;
        if (msg.type === type) {
          ws.off('message', listener);
          resolve(msg);
        }
      };
      ws.on('message', listener);
    });
  }

  it('should allow a match started on Node A to be resumed on Node B after Node A "fails"', async () => {
    console.log('--- Step 1: Alice creates match on Node A');
    const wsA = await connect(portA);
    const aliceCreatedPromise = waitForMessage(wsA, 'matchCreated');
    wsA.send(
      JSON.stringify({
        type: 'createMatch',
        playerName: 'Alice',
        msgId: randomUUID(),
      }),
    );
    const { matchId, playerId: alicePlayerId } = await aliceCreatedPromise;
    console.log('--- Match created:', matchId);

    console.log('--- Step 2: Bob joins Node A');
    const wsA2 = await connect(portA);
    const bobJoinedPromise = waitForMessage(wsA2, 'matchJoined');
    wsA2.send(
      JSON.stringify({
        type: 'joinMatch',
        matchId,
        playerName: 'Bob',
        msgId: randomUUID(),
      }),
    );
    await bobJoinedPromise;
    console.log('--- Bob joined');

    console.log('--- Step 3: Wait for game start on Node A');
    const state1Promise = waitForMessage(wsA, 'gameState');
    const state1 = await state1Promise;
    console.log('--- Game started on Node A, phase:', state1.result.postState.phase);

    console.log('--- Step 4: Failing Node A');
    wsA.terminate();
    wsA2.terminate();
    await appA.close();

    console.log('--- Step 5: Alice reconnects to Node B');
    const wsB = await connect(portB);
    const rejoinedPromise = waitForMessage(wsB, 'matchJoined');
    const state2Promise = waitForMessage(wsB, 'gameState');

    wsB.send(
      JSON.stringify({
        type: 'rejoinMatch',
        matchId,
        playerId: alicePlayerId,
        msgId: randomUUID(),
      }),
    );

    await rejoinedPromise;
    console.log('--- Alice rejoined on Node B');

    console.log('--- Step 6: Verify game state on Node B');
    const state2 = await state2Promise;
    console.log('--- Game state received from Node B, phase:', state2.result.postState.phase);
    expect(state2.result.postState.phase).toBe('DeploymentPhase');
  }, 60000);
});
