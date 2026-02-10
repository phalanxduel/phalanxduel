import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type { RawData } from 'ws';
import { SCHEMA_VERSION, ClientMessageSchema } from '@phalanx/shared';
import type { ServerMessage } from '@phalanx/shared';
import { MatchManager, MatchError, ActionError } from './match';
import { traceWsMessage, traceHttpHandler } from './tracing';
import { matchesActive, actionsTotal, actionsDurationMs, wsConnections } from './metrics';

export async function buildApp() {
  const app = Fastify({ logger: true });
  const matchManager = new MatchManager();

  await app.register(websocket);

  // ── Health endpoint ──────────────────────────────────────────────
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: SCHEMA_VERSION,
    };
  });

  // ── POST /matches — create match via REST ────────────────────────
  app.post('/matches', async (_request, reply) => {
    return traceHttpHandler('createMatch', (span) => {
      const matchId = randomUUID();
      span.setAttribute('match.id', matchId);

      // Pre-register match slot so joinMatch works via WS
      const match = {
        matchId,
        players: [null, null] as [null, null],
        state: null,
      };
      matchManager.matches.set(matchId, match as never);
      matchesActive.add(1);

      void reply.status(201);
      return { matchId };
    });
  });

  // ── WebSocket routing ────────────────────────────────────────────
  app.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (socket, _req) => {
      wsConnections.add(1);

      function sendMessage(msg: ServerMessage): void {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify(msg));
        }
      }

      socket.on('message', (raw: RawData) => {
        const messageStr = typeof raw === 'string' ? raw : raw.toString();

        let parsed: unknown;
        try {
          parsed = JSON.parse(messageStr);
        } catch {
          sendMessage({ type: 'matchError', error: 'Invalid JSON', code: 'PARSE_ERROR' });
          return;
        }

        const result = ClientMessageSchema.safeParse(parsed);
        if (!result.success) {
          sendMessage({
            type: 'matchError',
            error: 'Invalid message format',
            code: 'VALIDATION_ERROR',
          });
          return;
        }

        const msg = result.data;

        switch (msg.type) {
          case 'createMatch': {
            traceWsMessage('createMatch', {}, (span) => {
              try {
                const { matchId, playerId, playerIndex } = matchManager.createMatch(
                  msg.playerName,
                  socket,
                );
                span.setAttribute('match.id', matchId);
                matchesActive.add(1);
                sendMessage({ type: 'matchCreated', matchId, playerId, playerIndex });
              } catch (err) {
                const error = err instanceof Error ? err.message : 'Unknown error';
                sendMessage({ type: 'matchError', error, code: 'CREATE_FAILED' });
              }
            });
            break;
          }

          case 'joinMatch': {
            traceWsMessage('joinMatch', { 'match.id': msg.matchId }, (span) => {
              try {
                const { playerId, playerIndex } = matchManager.joinMatch(
                  msg.matchId,
                  msg.playerName,
                  socket,
                );
                span.setAttribute('player.id', playerId);
                // Send matchJoined to joining player BEFORE broadcasting state
                sendMessage({
                  type: 'matchJoined',
                  matchId: msg.matchId,
                  playerId,
                  playerIndex,
                });
                matchManager.broadcastMatchState(msg.matchId);
              } catch (err) {
                if (err instanceof MatchError) {
                  sendMessage({ type: 'matchError', error: err.message, code: err.code });
                } else {
                  const error = err instanceof Error ? err.message : 'Unknown error';
                  sendMessage({ type: 'matchError', error, code: 'JOIN_FAILED' });
                }
              }
            });
            break;
          }

          case 'action': {
            const socketInfo = matchManager.socketMap.get(socket);
            if (!socketInfo) {
              sendMessage({
                type: 'matchError',
                error: 'Not connected to a match',
                code: 'NOT_IN_MATCH',
              });
              return;
            }

            traceWsMessage(
              'action',
              {
                'match.id': msg.matchId,
                'player.id': socketInfo.playerId,
                'action.type': msg.action.type,
              },
              (_span) => {
                const start = performance.now();
                try {
                  matchManager.handleAction(msg.matchId, socketInfo.playerId, msg.action);
                  actionsTotal.add(1, { 'action.type': msg.action.type });
                  actionsDurationMs.record(performance.now() - start);
                } catch (err) {
                  actionsDurationMs.record(performance.now() - start);
                  if (err instanceof ActionError) {
                    sendMessage({
                      type: 'actionError',
                      matchId: err.matchId,
                      error: err.message,
                      code: err.code,
                    });
                  } else if (err instanceof MatchError) {
                    sendMessage({ type: 'matchError', error: err.message, code: err.code });
                  } else {
                    const error = err instanceof Error ? err.message : 'Unknown error';
                    sendMessage({
                      type: 'actionError',
                      matchId: msg.matchId,
                      error,
                      code: 'ACTION_FAILED',
                    });
                  }
                }
              },
            );
            break;
          }
        }
      });

      socket.on('close', () => {
        wsConnections.add(-1);
        matchManager.handleDisconnect(socket);
        app.log.info('WebSocket client disconnected');
      });
    });
  });

  // Expose matchManager for testing
  app.decorate('matchManager', matchManager);

  return app;
}
